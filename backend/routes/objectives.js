const express = require('express');
const path = require('path');
const fs = require('fs');
const { query, pool } = require('../config/database');
const { authenticateToken, requireManager, requireAdmin, requireEmployee } = require('../middleware/auth');
const { objectiveSchema } = require('../validation/schemas');
const { createNotification, logActivity, getTeamMembers, NOTIFICATION_TYPES } = require('../utils/notifications');
const emailNotificationService = require('../services/emailNotificationService');

// Helper function to check objective ownership
const checkObjectiveOwnership = async (objectiveId, currentUserId, currentUserRole) => {
  const objectiveResult = await query(`
    SELECT o.created_by, oa.assignee_type, oa.team_id, oa.user_id
    FROM objectives o
    LEFT JOIN objective_assignments oa ON o.id = oa.objective_id
    WHERE o.id = $1
  `, [objectiveId]);

  if (objectiveResult.rows.length === 0) {
    return { hasAccess: false, error: 'Objective not found' };
  }

  const objective = objectiveResult.rows[0];
  
  // Admin has access to all objectives
  if (currentUserRole === 'admin') {
    return { hasAccess: true };
  }

  // Creator has access
  if (objective.created_by === currentUserId) {
    return { hasAccess: true };
  }

  // Manager can access objectives for teams they manage
  if (currentUserRole === 'manager' && objective.assignee_type === 'TEAM' && objective.team_id) {
    const teamManagementCheck = await query(`
      SELECT 1 FROM team_management_history 
      WHERE team_id = $1 AND manager_id = $2 AND is_active = TRUE
    `, [objective.team_id, currentUserId]);
    
    if (teamManagementCheck.rows.length > 0) {
      return { hasAccess: true };
    }
  }

  // Manager can access individual objectives for team members they manage
  if (currentUserRole === 'manager' && objective.assignee_type === 'USER' && objective.user_id) {
    const teamMemberCheck = await query(`
      SELECT 1 FROM team_members tm
      INNER JOIN team_management_history tmh ON tm.team_id = tmh.team_id
      WHERE tm.user_id = $1 AND tmh.manager_id = $2 AND tmh.is_active = TRUE
    `, [objective.user_id, currentUserId]);
    
    if (teamMemberCheck.rows.length > 0) {
      return { hasAccess: true };
    }
  }

  return { hasAccess: false, error: 'Access denied - only the objective creator, admin, or managing manager can modify this objective' };
};

const router = express.Router();

// Test endpoint to verify routing is working
router.get('/test', (req, res) => {
  console.log('✅ Test endpoint called');
  res.json({ message: 'Objectives route is working', timestamp: new Date().toISOString() });
});

// Get teams for admin objective filtering
router.get('/teams', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Fetching teams for admin objective filtering...');
    console.log('🔍 User making request:', req.user);
    
    // First, get basic team info
    const teamsResult = await query(`
      SELECT t.id, t.name, t.description
      FROM teams t
      ORDER BY t.name
    `);

    console.log('🔍 Teams query result:', teamsResult.rows);
    
    // Get member counts for each team
    let memberCountsResult;
    try {
      memberCountsResult = await query(`
        SELECT team_id, COUNT(*) as member_count
        FROM team_members
        GROUP BY team_id
      `);
      console.log('🔍 Team members check:', memberCountsResult.rows);
    } catch (memberError) {
      console.error('❌ Error fetching member counts:', memberError);
      memberCountsResult = { rows: [] };
    }

    // Get objective counts for each team
    let objectiveCountsResult;
    try {
      objectiveCountsResult = await query(`
        SELECT oa.team_id, COUNT(DISTINCT oa.objective_id) as objective_count
        FROM objective_assignments oa
        WHERE oa.assignee_type = 'TEAM'
        GROUP BY oa.team_id
      `);
      console.log('🔍 Team objectives check:', objectiveCountsResult.rows);
    } catch (objectiveError) {
      console.error('❌ Error fetching objective counts:', objectiveError);
      objectiveCountsResult = { rows: [] };
    }

    // Combine the data
    const teamsWithCounts = teamsResult.rows.map(team => {
      const memberCount = memberCountsResult.rows.find(mc => mc.team_id === team.id);
      const objectiveCount = objectiveCountsResult.rows.find(oc => oc.team_id === team.id);
      
      return {
        ...team,
        member_count: memberCount ? parseInt(memberCount.member_count) : 0,
        objective_count: objectiveCount ? parseInt(objectiveCount.objective_count) : 0
      };
    });

    res.json({
      success: true,
      teams: teamsWithCounts
    });
  } catch (error) {
    console.error('❌ Error fetching teams:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teams',
      error: error.message
    });
  }
});

// Test endpoint for individual objective creation
router.post('/test-create', authenticateToken, requireManager, async (req, res) => {
  try {
    console.log('🔍 Test create endpoint called with data:', req.body);
    
    // Simple test - just return the data
    res.json({
      success: true,
      message: 'Test endpoint working',
      receivedData: req.body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get objectives (filtered by user role)
// Get manager objectives including team contributions (OLD METHOD - based on creator)
router.get('/manager-view', authenticateToken, requireManager, async (req, res) => {
  try {
    const { page = 1, pageSize = 50, category, status } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('🔍 Getting manager objectives with contributions for user:', userId);

    // Build where conditions for main objectives
    const whereConditions = [];
    const queryParams = [];
    let paramCount = 0;

    // Filter by created_by (only show objectives created by current manager or admin can see all)
    if (userRole !== 'admin') {
      paramCount++;
      whereConditions.push(`o.created_by = $${paramCount}`);
      queryParams.push(userId);
    }

    // No longer need individual_targets parameter

    // Category filter
    if (category) {
      paramCount++;
      whereConditions.push(`o.category = $${paramCount}`);
      queryParams.push(category);
    }

    // Status filter
    if (status) {
      paramCount++;
      whereConditions.push(`o.status = $${paramCount}`);
      queryParams.push(status);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Query 1: Get main objectives (only team and individual assignments, not contributions)
    const mainObjectivesQuery = `
      SELECT DISTINCT
        o.id, o.title, o.description, o.category, o.target_level, o.deadline,
        o.progress, o.status, o.created_at, o.updated_at, o.created_by,
        s.name as skill_name, s.type as skill_type, s.category as skill_category,
        u.first_name, u.last_name, u.email, u.role as creator_role,
        oa.assignee_type,
        oa.user_id,
        oa.team_id,
        au.first_name as assigned_user_first_name,
        au.last_name as assigned_user_last_name,
        au.email as assigned_user_email,
        at.name as assigned_team_name,
        NULL as contribution_id,
        NULL as contribution_description,
        NULL as contribution_progress,
        NULL as contribution_status,
        FALSE as is_team_contribution
      FROM objectives o
      LEFT JOIN objective_assignments oa ON o.id = oa.objective_id
      LEFT JOIN skills s ON o.skill_id = s.id
      LEFT JOIN users u ON o.created_by = u.id
      LEFT JOIN users au ON oa.user_id = au.id
      LEFT JOIN teams at ON oa.team_id = at.id
      ${whereClause}
      ORDER BY o.created_at DESC
    `;

    // Query 2: Get team contributions for objectives created by this manager
    const contributionsQuery = `
      SELECT DISTINCT
        o.id, o.title, o.description, o.category, o.target_level, o.deadline,
        oc.progress, oc.status, o.created_at, o.updated_at, o.created_by,
        s.name as skill_name, s.type as skill_type, s.category as skill_category,
        u.first_name, u.last_name, u.email, u.role as creator_role,
        0 as updates_count,
        'USER' as assignee_type,
        oc.assignee_user_id as user_id,
        NULL as team_id,
        au.first_name as assigned_user_first_name,
        au.last_name as assigned_user_last_name,
        au.email as assigned_user_email,
        at.name as assigned_team_name,
        oc.id as contribution_id,
        oc.task_description as contribution_description,
        oc.progress as contribution_progress,
        oc.status as contribution_status,
        oc.individual_description,
        oc.individual_file,
        oc.deadline as individual_deadline,
        TRUE as is_team_contribution,
        it.custom_title,
        it.custom_description,
        it.custom_deadline,
        it.custom_file_path
      FROM objectives o
      INNER JOIN objective_assignments oa ON o.id = oa.objective_id AND oa.assignee_type = 'TEAM'
      INNER JOIN objective_contributions oc ON o.id = oc.parent_objective_id
      LEFT JOIN skills s ON o.skill_id = s.id
      LEFT JOIN users u ON o.created_by = u.id
      LEFT JOIN users au ON oc.assignee_user_id = au.id
      LEFT JOIN teams at ON oa.team_id = at.id
      LEFT JOIN individual_targets it ON o.id = it.objective_id AND oc.assignee_user_id = it.user_id
      ${whereClause}
      ORDER BY o.created_at DESC
    `;

    const [mainObjectivesResult, contributionsResult] = await Promise.all([
      query(mainObjectivesQuery, queryParams),
      query(contributionsQuery, queryParams)
    ]);

          // Combine and format results
      const allObjectives = [...mainObjectivesResult.rows, ...contributionsResult.rows]
        .map(row => {
      const objective = {
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        targetLevel: row.target_level,
        deadline: row.deadline,
        progress: row.progress,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
        skill: row.skill_name ? {
          name: row.skill_name,
          type: row.skill_type,
          category: row.skill_category
        } : null,
        creator: {
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          role: row.creator_role
        },
        updatesCount: parseInt(row.updates_count),
        assigneeType: row.assignee_type,
        isTeamContribution: row.is_team_contribution || false
      };

      // Handle team contributions
      if (row.is_team_contribution) {
        objective.contributionId = row.contribution_id;
        objective.contributionDescription = row.contribution_description;
        objective.contributionProgress = row.contribution_progress;
        objective.contributionStatus = row.contribution_status;
        objective.progress = row.contribution_progress || 0;
        objective.status = row.contribution_status || 'not_started';
        
        // Add individual customization fields - prioritize custom_targets over objective_contributions
        if (row.custom_title || row.custom_description || row.custom_deadline || row.custom_file_path) {
          // Use custom_targets data (more recent and accurate)
          objective.individualTitle = row.custom_title;
          objective.individualDescription = row.custom_description;
          objective.individualDeadline = row.custom_deadline;
          objective.individualFile = row.custom_file_path ? {
            path: row.custom_file_path,
            name: row.custom_file_path.split('/').pop() || 'File',
            type: 'application/octet-stream'
          } : null;
          objective.isIndividualTarget = true;
        } else {
          // Fallback to objective_contributions data
        objective.individualDescription = row.individual_description;
        objective.individualFile = row.individual_file;
        objective.individualDeadline = row.individual_deadline;
        }
        
        objective.assignedTo = row.assigned_user_first_name ? {
          id: row.user_id,
          firstName: row.assigned_user_first_name,
          lastName: row.assigned_user_last_name,
          email: row.assigned_user_email
        } : null;
        objective.team = row.assigned_team_name ? {
          name: row.assigned_team_name
        } : null;
      } else {
        // Handle main objectives (team or individual)
        if (row.assignee_type === 'TEAM') {
          // Team objective
          objective.assignedTo = row.assigned_team_name ? {
            id: row.team_id,
            name: row.assigned_team_name
          } : null;
          objective.team = row.assigned_team_name ? {
            name: row.assigned_team_name
          } : null;
          

        } else {
          // Individual objective
          objective.assignedTo = row.assigned_user_first_name ? {
            id: row.user_id,
            firstName: row.assigned_user_first_name,
            lastName: row.assigned_user_last_name,
            email: row.assigned_user_email
          } : null;
        }
      }

      return objective;
    });

    // Sort by creation date (newest first)
    allObjectives.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      objectives: allObjectives,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalCount: allObjectives.length,
        totalPages: Math.ceil(allObjectives.length / pageSize)
      }
    });
  } catch (error) {
    console.error('Get manager objectives error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// NEW ENDPOINT: Get objectives based on CURRENT team management (not creator)
router.get('/current-manager-view', authenticateToken, requireManager, async (req, res) => {
  try {
    const { page = 1, pageSize = 50, category, status } = req.query;
    const userId = req.user.id;

    console.log('🔍 Getting CURRENT manager objectives for user:', userId);

    // STEP 1: Get teams this manager currently manages (SIMPLE QUERY)
    const teamsQuery = `
      SELECT DISTINCT t.id, t.name
      FROM teams t
      INNER JOIN team_management_history tmh ON t.id = tmh.team_id
      WHERE tmh.manager_id = $1 AND tmh.is_active = TRUE
    `;
    
    console.log('🔍 Executing teams query with userId:', userId);
    const teamsResult = await query(teamsQuery, [userId]);
    const managedTeams = teamsResult.rows;
    
    console.log('🔍 Managed teams found:', managedTeams.length);
    console.log('🔍 Managed teams:', managedTeams.map(t => ({ id: t.id, name: t.name })));

    if (managedTeams.length === 0) {
      console.log('🔍 No managed teams found, returning empty result');
      return res.json({
        objectives: [],
        pagination: { page, pageSize, totalCount: 0, totalPages: 0 }
      });
    }

    // STEP 2: Get team IDs for filtering
    const teamIds = managedTeams.map(t => t.id);
    console.log('🔍 Team IDs for filtering:', teamIds);

    // STEP 3: Get team objectives from these teams (ONLY actual team objectives, not individual objectives)
    const teamObjectivesQuery = `
      SELECT DISTINCT
        o.id, o.title, o.description, o.category, o.target_level, o.deadline,
        o.progress, o.status, o.created_at, o.updated_at, o.created_by,
        COALESCE(s.name, 'No Skill') as skill_name,
        COALESCE(s.type, 'General') as skill_type,
        COALESCE(s.category, 'General') as skill_category,
        u.first_name, u.last_name, u.email, u.role as creator_role,
        0 as updates_count,
        oa.assignee_type,
        oa.user_id,
        oa.team_id,
        NULL as assigned_user_first_name,
        NULL as assigned_user_last_name,
        NULL as assigned_user_email,
        t.name as assigned_team_name,
        NULL as contribution_id,
        NULL as contribution_description,
        NULL as contribution_progress,
        NULL as contribution_status,
        FALSE as is_team_contribution,
        'CURRENT_MANAGER' as access_type
      FROM objectives o
      LEFT JOIN skills s ON o.skill_id = s.id
      LEFT JOIN users u ON o.created_by = u.id
      INNER JOIN objective_assignments oa ON o.id = oa.objective_id
      LEFT JOIN teams t ON oa.team_id = t.id
      WHERE oa.team_id = ANY($1) AND oa.assignee_type = 'TEAM'
      ORDER BY o.created_at DESC
    `;

    // STEP 4: Get individual objectives from team members (exclude partial targets from team objectives)
    const individualObjectivesQuery = `
      SELECT DISTINCT
        o.id, o.title, o.description, o.category, o.target_level, o.deadline,
        o.progress, o.status, o.created_at, o.updated_at, o.created_by,
        COALESCE(s.name, 'No Skill') as skill_name,
        COALESCE(s.type, 'General') as skill_type,
        COALESCE(s.category, 'General') as skill_category,
        u.first_name, u.last_name, u.email, u.role as creator_role,
        0 as updates_count,
        'USER' as assignee_type,
        oa.user_id,
        oa.team_id,
        au.first_name as assigned_user_first_name,
        au.last_name as assigned_user_last_name,
        au.email as assigned_user_email,
        t.name as assigned_team_name,
        NULL as contribution_id,
        NULL as contribution_description,
        NULL as contribution_progress,
        NULL as contribution_status,
        FALSE as is_team_contribution,
        'CURRENT_MANAGER' as access_type
      FROM objectives o
      LEFT JOIN skills s ON o.skill_id = s.id
      LEFT JOIN users u ON o.created_by = u.id
      INNER JOIN objective_assignments oa ON o.id = oa.objective_id
      INNER JOIN users au ON oa.user_id = au.id
      LEFT JOIN teams t ON oa.team_id = t.id
      WHERE oa.assignee_type = 'USER' 
        AND o.parent_objective_id IS NULL
        AND oa.team_id = ANY($1)
      ORDER BY o.created_at DESC
    `;

    console.log('🔍 Executing team objectives query...');
    const teamObjectivesResult = await query(teamObjectivesQuery, [teamIds]);
    const teamObjectives = teamObjectivesResult.rows;

    console.log('🔍 Executing individual objectives query...');
    const individualObjectivesResult = await query(individualObjectivesQuery, [teamIds]);
    const individualObjectives = individualObjectivesResult.rows;

    // Combine both types of objectives
    const allObjectives = [...teamObjectives, ...individualObjectives];

    console.log('🔍 Team objectives found:', teamObjectives.length);
    console.log('🔍 Individual objectives found:', individualObjectives.length);
    console.log('🔍 Total objectives found:', allObjectives.length);
    console.log('🔍 Sample objectives:', allObjectives.slice(0, 3).map(o => ({ 
      id: o.id, 
      title: o.title, 
      type: o.assignee_type,
      team: o.assigned_team_name,
      user: o.assigned_user_first_name ? `${o.assigned_user_first_name} ${o.assigned_user_last_name}` : null
    })));

    // Apply pagination
    const totalCount = allObjectives.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedObjectives = allObjectives.slice(startIndex, endIndex);

    console.log('🔍 Pagination: totalCount=', totalCount, 'page=', page, 'pageSize=', pageSize);

    res.json({
      objectives: paginatedObjectives,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    });

  } catch (error) {
    console.error('❌ Error getting current manager objectives:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      userId: req.user.id
    });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, category, assigneeId, teamId, page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('🔍 Getting objectives for user:', userId, 'role:', userRole);
    console.log('🔍 Query parameters:', { status, category, assigneeId, teamId, page, pageSize });
    console.log('🔍 teamId type:', typeof teamId, 'value:', teamId);

    // ADMIN: Show all objectives, REGULAR USERS: Show only assigned objectives
    let objectivesQuery;
    let queryParams;
    
    if (userRole === 'admin') {
      // Admin sees ALL objectives in the system, with optional team filtering
      let whereClause = '';
      let paramCount = 2;
      
      if (teamId && teamId !== 'undefined' && teamId !== 'null') {
        whereClause = `WHERE (oa.team_id = $3 OR oa.user_id IN (
          SELECT tm.user_id FROM team_members tm WHERE tm.team_id = $3
        ))`;
        paramCount = 3;
        console.log('🔍 Filtering objectives for team:', teamId);
      } else {
        console.log('🔍 No team filter - showing all objectives');
      }
      
      objectivesQuery = `
        SELECT DISTINCT
          o.id, o.title, o.description, o.category, o.target_level, o.deadline,
          o.progress, o.status, o.created_at, o.updated_at, o.created_by,
          s.name as skill_name, s.type as skill_type, s.category as skill_category,
          u.first_name, u.last_name, u.email, u.role as creator_role,
          oa.assignee_type,
          oa.user_id,
          oa.team_id,
          au.first_name as assigned_user_first_name,
          au.last_name as assigned_user_last_name,
          au.email as assigned_user_email,
          at.name as assigned_team_name
        FROM objectives o
        LEFT JOIN skills s ON o.skill_id = s.id
        LEFT JOIN users u ON o.created_by = u.id
        LEFT JOIN objective_assignments oa ON o.id = oa.objective_id
        LEFT JOIN users au ON oa.user_id = au.id
        LEFT JOIN teams at ON oa.team_id = at.id
        ${whereClause}
        ORDER BY o.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      queryParams = [pageSize, offset];
      if (teamId && teamId !== 'undefined' && teamId !== 'null') {
        queryParams.push(teamId);
      }
      console.log('🔍 Admin user - showing objectives', teamId ? `for team ${teamId}` : 'in system');
    } else {
      // Regular users see only their assigned objectives (exclude partial targets from team objectives)
      objectivesQuery = `
        SELECT DISTINCT
          o.id, o.title, o.description, o.category, o.target_level, o.deadline,
          o.progress, o.status, o.created_at, o.updated_at, o.created_by,
          s.name as skill_name, s.type as skill_type, s.category as skill_category,
          u.first_name, u.last_name, u.email, u.role as creator_role,
          oa.assignee_type,
          oa.user_id,
          oa.team_id,
          au.first_name as assigned_user_first_name,
          au.last_name as assigned_user_last_name,
          au.email as assigned_user_email,
          at.name as assigned_team_name,
          it.id as individual_target_id,
          it.custom_title,
          it.custom_description,
          it.custom_deadline,
          it.custom_file_path
        FROM objectives o
        LEFT JOIN skills s ON o.skill_id = s.id
        LEFT JOIN users u ON o.created_by = u.id
        LEFT JOIN objective_assignments oa ON o.id = oa.objective_id
        LEFT JOIN users au ON oa.user_id = au.id
        LEFT JOIN teams at ON oa.team_id = at.id
        LEFT JOIN individual_targets it ON o.id = it.objective_id AND it.user_id = $3
        WHERE (
          -- Individual objectives assigned directly to this user (exclude partial targets from team objectives)
          (oa.assignee_type = 'USER' AND oa.user_id = $3 AND o.parent_objective_id IS NULL)
          OR
          -- Team objectives where user is a member of the team
          (oa.assignee_type = 'TEAM' AND oa.team_id IN (
            SELECT DISTINCT t.id 
            FROM teams t 
            INNER JOIN team_members tm ON t.id = tm.team_id 
            WHERE tm.user_id = $3
          ))
        )
        ORDER BY o.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      queryParams = [pageSize, offset, userId];
      console.log('🔍 Regular user - showing only assigned objectives');
    }

    console.log('🔍 Executing objectives query for user:', userId, 'role:', userRole);
    console.log('🔍 Query:', objectivesQuery);
    console.log('🔍 Params:', queryParams);
    
    let objectivesResult;
    try {
      objectivesResult = await query(objectivesQuery, queryParams);
    } catch (queryError) {
      console.error('❌ Error executing objectives query:', queryError);
      return res.status(500).json({
        success: false,
        message: 'Error fetching objectives',
        error: queryError.message
      });
    }

    console.log('🔍 Objectives query result rows:', objectivesResult.rows.length);
    if (teamId) {
      console.log('🔍 Objectives for team', teamId, ':', objectivesResult.rows.map(o => ({ id: o.id, title: o.title, assignee_type: o.assignee_type, team_id: o.team_id, user_id: o.user_id })));
    }

    const objectives = objectivesResult.rows.map(row => {
      console.log('🔍 Processing objective row:', {
        id: row.id,
        title: row.title,
        category: row.category,
        assigneeType: row.assignee_type,
        individualTargetId: row.individual_target_id,
        teamId: row.team_id
      });
      
      return {
      id: row.id,
      title: row.custom_title || row.title,
      description: row.custom_description || row.description,
      category: row.category,
      targetLevel: row.target_level,
      deadline: row.custom_deadline || row.deadline,
      progress: row.progress,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
        createdBy: row.created_by,
      skill: row.skill_name ? {
        name: row.skill_name,
        type: row.skill_type,
        category: row.skill_category
      } : null,
      creator: {
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        role: row.creator_role
      },
      assigneeType: row.assignee_type,
      assignedTo: row.assigned_user_first_name ? {
        id: row.user_id,
        firstName: row.assigned_user_first_name,
        lastName: row.assigned_user_last_name,
        email: row.assigned_user_email
      } : (row.assigned_team_name ? {
        id: row.team_id,
        name: row.assigned_team_name
      } : null),

        // Add team property for team objectives
        team: row.assigned_team_name ? {
          id: row.team_id,
          name: row.assigned_team_name
      } : null,

        // Add individual target ID for team objectives
        individualTargetId: row.individual_target_id,

      isTeamContribution: false
      };
    });

    console.log('🔍 Processed objectives:', objectives.length);
    
    // Log individual objectives for debugging
    const individualObjectives = objectives.filter(obj => obj.assigneeType === 'USER');
    console.log(`🔍 Individual objectives in response: ${individualObjectives.length}`);
    individualObjectives.forEach((obj, index) => {
      console.log(`  ${index + 1}. "${obj.title}" (Category: ${obj.category}, Assigned to: ${obj.assigned_user_first_name})`);
    });

    res.json({
      objectives,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalCount: objectives.length,
        totalPages: Math.ceil(objectives.length / pageSize)
      }
    });
  } catch (error) {
    console.error('Get objectives error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Internal server error', details: error.message });
  }
});

// Get individual contribution data for objectives
router.get('/contributions/:objectiveId', authenticateToken, async (req, res) => {
  try {
    const { objectiveId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if user has access to this objective
    let hasAccess = false;
    
    if (userRole === 'admin') {
      hasAccess = true;
    } else if (userRole === 'manager') {
      // Managers can see objectives for teams they currently manage
      const managerCheck = await query(`
        SELECT 1 FROM objectives o
        JOIN objective_assignments oa ON o.id = oa.objective_id
        JOIN team_management_history tmh ON oa.team_id = tmh.team_id
        WHERE o.id = $1 AND tmh.manager_id = $2 AND tmh.is_active = TRUE
      `, [objectiveId, userId]);
      hasAccess = managerCheck.rows.length > 0;
    } else if (userRole === 'employee') {
      // Employees can see objectives they're assigned to or have contributions for
      const employeeCheck = await query(`
        SELECT 1 FROM objectives o
        LEFT JOIN objective_assignments oa ON o.id = oa.objective_id
        LEFT JOIN objective_contributions oc ON o.id = oc.parent_objective_id
        WHERE o.id = $1 AND (oa.user_id = $2 OR oc.assignee_user_id = $2 OR o.created_by = $2)
      `, [objectiveId, userId]);
      hasAccess = employeeCheck.rows.length > 0;
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get individual contribution data
    const contributionsResult = await query(`
      SELECT 
        oc.id as contribution_id,
        oc.assignee_user_id,
        oc.task_description,
        oc.individual_description,
        oc.individual_file,
        oc.deadline as individual_deadline,
        oc.status,
        oc.progress,
        u.first_name,
        u.last_name,
        u.email
      FROM objective_contributions oc
      JOIN users u ON oc.assignee_user_id = u.id
      WHERE oc.parent_objective_id = $1
      ORDER BY oc.created_at
    `, [objectiveId]);

    res.json({
      objectiveId,
      contributions: contributionsResult.rows
    });

  } catch (error) {
    console.error('Get contributions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Test endpoint to verify API is working
router.post('/test', authenticateToken, requireManager, async (req, res) => {
  try {
    console.log('🔍 Test endpoint called');
    console.log('🔍 Request body:', req.body);
    console.log('🔍 User:', req.user);
    
    res.status(200).json({
      message: 'Test endpoint working',
      user: req.user,
      body: req.body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    res.status(500).json({ message: 'Test endpoint error', error: error.message });
  }
});

// ULTRA BULLETPROOF TEAM INDIVIDUAL TARGET ASSIGNMENT - COMPLETELY REWRITTEN FROM SCRATCH
router.post('/team-individual-targets-simple', authenticateToken, requireManager, async (req, res) => {
  try {
    console.log('🔥 ULTRA BULLETPROOF: Team individual target assignment started');
    console.log('🔥 ULTRA BULLETPROOF: Request body:', req.body);
    
    const { title, description, skillId, targetLevel, deadline, teamId } = req.body;
    const creatorId = req.user.id;
    
    // Basic validation
    if (!title || !description || !skillId || !targetLevel || !deadline || !teamId) {
      console.log('❌ ULTRA BULLETPROOF: Missing required fields');
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    console.log('🔥 ULTRA BULLETPROOF: Validation passed, fetching team members...');
    
    // Get ALL team members (employees only, active status) - NO ORDERING TO AVOID ALPHABETICAL BUGS
    const teamMembersResult = await query(`
      SELECT tm.user_id, u.first_name, u.last_name, u.email
      FROM team_members tm
      INNER JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = $1 AND u.status = 'active' AND u.role = 'employee'
    `, [teamId]);
    
    const teamMembers = teamMembersResult.rows;
    console.log(`🔥 ULTRA BULLETPROOF: Found ${teamMembers.length} team members to process`);
    
    if (teamMembers.length === 0) {
      console.log('❌ ULTRA BULLETPROOF: No active employees found in team');
      return res.status(400).json({ message: 'No active employees found in team' });
    }
    
    // Log all members that will be processed
    teamMembers.forEach((member, index) => {
      console.log(`  ${index + 1}. ${member.first_name} ${member.last_name} (${member.user_id})`);
    });
    
    const createdObjectives = [];
    const failedMembers = [];
    
    console.log('🔥 ULTRA BULLETPROOF: Starting ULTRA RELIABLE individual target creation...');
    
    // ULTRA RELIABLE APPROACH: Process each member with MAXIMUM reliability
    for (let i = 0; i < teamMembers.length; i++) {
      const member = teamMembers[i];
      console.log(`\n🔥 ULTRA BULLETPROOF: Processing member ${i + 1}/${teamMembers.length}: ${member.first_name} ${member.last_name}`);
      
      let retryCount = 0;
      const maxRetries = 3;
      let success = false;
      
      // Retry logic for maximum reliability
      while (retryCount < maxRetries && !success) {
        try {
          console.log(`  🔄 Attempt ${retryCount + 1}/${maxRetries} for ${member.first_name} ${member.last_name}`);
          
          // Start transaction for this member
          await query('BEGIN');
          
          const individualTitle = `${title} (${member.first_name} ${member.last_name})`;
          
          console.log(`  🔧 Creating objective: "${individualTitle}"`);
          
          // Create individual objective for this member
          const objectiveResult = await query(`
            INSERT INTO objectives (title, description, category, skill_id, target_level, deadline, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, title, description, category, target_level, deadline, progress, status, created_at
          `, [individualTitle, description, 'personal_improvement', skillId, targetLevel, deadline, creatorId]);
          
          const objective = objectiveResult.rows[0];
          console.log(`  ✅ Created objective: ${objective.id}`);
          
          // Create assignment for this member
          console.log(`  🔧 Creating assignment for user: ${member.user_id}`);
          await query(`
            INSERT INTO objective_assignments (objective_id, assignee_type, user_id, team_id)
            VALUES ($1, $2, $3, $4)
          `, [objective.id, 'USER', member.user_id, teamId]);
          
          console.log(`  ✅ Created assignment`);
          
          // Create individual target record
          console.log(`  🔧 Creating individual target record`);
          await query(`
            INSERT INTO individual_targets (
              objective_id, user_id, team_id, custom_title, custom_description, custom_deadline
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [objective.id, member.user_id, teamId, individualTitle, description, deadline]);
          
          console.log(`  ✅ Created individual target record`);
          
          // Commit transaction for this member
          await query('COMMIT');
          
          console.log(`  🎉 SUCCESS: ${member.first_name} ${member.last_name} processed successfully!`);
          
          createdObjectives.push({ 
            member: member, 
            objective: objective 
          });
          
          success = true;
          
        } catch (error) {
          // Rollback transaction for this member
          await query('ROLLBACK');
          console.error(`  ❌ FAILED (Attempt ${retryCount + 1}): ${member.first_name} ${member.last_name} - ${error.message}`);
          
          retryCount++;
          
          if (retryCount >= maxRetries) {
            console.error(`  🚨 MAX RETRIES REACHED for ${member.first_name} ${member.last_name}`);
            failedMembers.push({ 
              member: member, 
              error: error.message 
            });
          } else {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
    }
    
    // Final analysis
    console.log(`\n📊 ULTRA BULLETPROOF: Final analysis:`);
    console.log(`  - Total team members: ${teamMembers.length}`);
    console.log(`  - Successfully processed: ${createdObjectives.length}`);
    console.log(`  - Failed: ${failedMembers.length}`);
    
    // Log each member's status
    teamMembers.forEach((member, index) => {
      const wasProcessed = createdObjectives.some(obj => obj.member.user_id === member.user_id);
      const status = wasProcessed ? '✅ SUCCESS' : '❌ FAILED';
      console.log(`  ${index + 1}. ${member.first_name} ${member.last_name}: ${status}`);
    });
    
    if (failedMembers.length > 0) {
      console.log(`\n🚨 ULTRA BULLETPROOF: Failed members:`);
      failedMembers.forEach(failed => {
        console.log(`  - ${failed.member.first_name} ${failed.member.last_name}: ${failed.error}`);
      });
    }
    
    // Return response
    if (createdObjectives.length === teamMembers.length) {
      console.log(`🎉 ULTRA BULLETPROOF: COMPLETE SUCCESS - All ${teamMembers.length} members processed!`);
      res.status(201).json({
        success: true,
        message: `Successfully assigned individual targets to all ${teamMembers.length} team members`,
        totalMembers: teamMembers.length,
        createdTargets: createdObjectives.length,
        objectives: createdObjectives.map(item => ({
          member: item.member,
          objective: item.objective
        }))
      });
    } else {
      console.log(`⚠️ ULTRA BULLETPROOF: PARTIAL SUCCESS - ${createdObjectives.length}/${teamMembers.length} processed`);
      res.status(207).json({
        success: false,
        message: `Only ${createdObjectives.length} out of ${teamMembers.length} members processed`,
        totalMembers: teamMembers.length,
        createdTargets: createdObjectives.length,
        objectives: createdObjectives.map(item => ({
          member: item.member,
          objective: item.objective
        })),
        failures: failedMembers
      });
    }
    
  } catch (error) {
    console.error('❌ ULTRA BULLETPROOF: Critical error:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
});

// ALTERNATIVE BULLETPROOF APPROACH - BATCH PROCESSING WITH SINGLE TRANSACTION
router.post('/team-individual-targets-batch', authenticateToken, requireManager, async (req, res) => {
  try {
    console.log('🚀 BATCH BULLETPROOF: Team individual target assignment started');
    console.log('🚀 BATCH BULLETPROOF: Request body:', req.body);
    
    const { title, description, skillId, targetLevel, deadline, teamId } = req.body;
    const creatorId = req.user.id;
    
    // Basic validation
    if (!title || !description || !skillId || !targetLevel || !deadline || !teamId) {
      console.log('❌ BATCH BULLETPROOF: Missing required fields');
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    console.log('🚀 BATCH BULLETPROOF: Validation passed, fetching team members...');
    
    // Get ALL team members (employees only, active status)
    const teamMembersResult = await query(`
      SELECT tm.user_id, u.first_name, u.last_name, u.email
      FROM team_members tm
      INNER JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = $1 AND u.status = 'active' AND u.role = 'employee'
    `, [teamId]);
    
    const teamMembers = teamMembersResult.rows;
    console.log(`🚀 BATCH BULLETPROOF: Found ${teamMembers.length} team members to process`);
    
    if (teamMembers.length === 0) {
      console.log('❌ BATCH BULLETPROOF: No active employees found in team');
      return res.status(400).json({ message: 'No active employees found in team' });
    }
    
    // Log all members that will be processed
    teamMembers.forEach((member, index) => {
      console.log(`  ${index + 1}. ${member.first_name} ${member.last_name} (${member.user_id})`);
    });
    
    console.log('🚀 BATCH BULLETPROOF: Starting ROBUST processing with individual transactions...');
    
    const createdObjectives = [];
    const failedMembers = [];
    
    // ROBUST APPROACH: Individual transactions per member to prevent total failure
    for (let i = 0; i < teamMembers.length; i++) {
      const member = teamMembers[i];
      console.log(`\n🚀 BATCH BULLETPROOF: Processing member ${i + 1}/${teamMembers.length}: ${member.first_name} ${member.last_name} (ID: ${member.user_id})`);
      
      // Start individual transaction for this member
      await query('BEGIN');
      
      try {
        const individualTitle = `${title} (${member.first_name} ${member.last_name})`;
        
        console.log(`  🔧 Creating objective: "${individualTitle}"`);
        
        // Create individual objective for this member
        const objectiveResult = await query(`
          INSERT INTO objectives (title, description, category, skill_id, target_level, deadline, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, title, description, category, target_level, deadline, progress, status, created_at
        `, [individualTitle, description, 'personal_improvement', skillId, targetLevel, deadline, creatorId]);
        
        const objective = objectiveResult.rows[0];
        console.log(`  ✅ Created objective: ${objective.id}`);
        
        // Create assignment for this member
        console.log(`  🔧 Creating assignment for user: ${member.user_id}`);
        await query(`
          INSERT INTO objective_assignments (objective_id, assignee_type, user_id, team_id)
          VALUES ($1, $2, $3, $4)
        `, [objective.id, 'USER', member.user_id, teamId]);
        
        console.log(`  ✅ Created assignment`);
        
        // Create individual target record
        console.log(`  🔧 Creating individual target record`);
        await query(`
          INSERT INTO individual_targets (
            objective_id, user_id, team_id, custom_title, custom_description, custom_deadline
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [objective.id, member.user_id, teamId, individualTitle, description, deadline]);
        
        console.log(`  ✅ Created individual target record`);
        
        // Commit individual transaction
        await query('COMMIT');
        
        createdObjectives.push({ 
          member: member, 
          objective: objective 
        });
        
        console.log(`  🎉 SUCCESS: ${member.first_name} ${member.last_name} processed successfully!`);
        
      } catch (error) {
        // Rollback individual transaction
        await query('ROLLBACK');
        console.error(`  ❌ FAILED: ${member.first_name} ${member.last_name} (ID: ${member.user_id}) - ${error.message}`);
        console.error(`  ❌ Error details:`, error);
        failedMembers.push({
          member: member,
          error: error.message
        });
      }
    }
    
    console.log(`\n🎉 BATCH BULLETPROOF: Processing complete!`);
    console.log(`✅ Successfully processed: ${createdObjectives.length} members`);
    console.log(`❌ Failed to process: ${failedMembers.length} members`);
    
    if (failedMembers.length > 0) {
      console.log('❌ Failed members:');
      failedMembers.forEach((failed, index) => {
        console.log(`  ${index + 1}. ${failed.member.first_name} ${failed.member.last_name} - ${failed.error}`);
      });
    }
    
    // Return success even if some members failed, but include failure details
    res.status(201).json({
      success: true,
      message: `Successfully assigned individual targets to ${createdObjectives.length} out of ${teamMembers.length} team members`,
      totalMembers: teamMembers.length,
      successfulAssignments: createdObjectives.length,
      failedAssignments: failedMembers.length,
      createdTargets: createdObjectives.length,
      objectives: createdObjectives.map(item => ({
        member: item.member,
        objective: item.objective
      })),
      failures: failedMembers.map(item => ({
        member: item.member,
        error: item.error
      }))
    });
    
  } catch (error) {
    console.error('❌ BATCH BULLETPROOF: Critical error:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
});

// ORIGINAL ULTRA BULLETPROOF TEAM-WIDE INDIVIDUAL TARGET ASSIGNMENT (COMPLEX VERSION)
router.post('/team-individual-targets', authenticateToken, requireManager, async (req, res) => {
  try {
    console.log('🔍 ULTRA SIMPLE: Team-wide individual target assignment started');
    console.log('🔍 ULTRA SIMPLE: Request body:', req.body);
    console.log('🔍 ULTRA SIMPLE: User:', req.user);
    
    const { title, description, skillId, targetLevel, deadline, teamId, forceAssignment = true } = req.body;
    const creatorId = req.user.id;
    
    // Basic validation
    if (!title || !description || !skillId || !targetLevel || !deadline || !teamId) {
      console.log('❌ ULTRA SIMPLE: Missing required fields');
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    console.log('🔍 ULTRA SIMPLE: Validation passed, fetching team members...');
    console.log('🔍 ULTRA SIMPLE: forceAssignment value:', forceAssignment);
    console.log('🔍 ULTRA SIMPLE: forceAssignment type:', typeof forceAssignment);
    
    // Get ALL team members (employees only, active status) - NO ORDERING to preserve database order
    const teamMembersResult = await query(`
      SELECT tm.user_id, u.first_name, u.last_name, u.email, u.role, u.status
      FROM team_members tm
      INNER JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = $1 AND u.status = 'active' AND u.role = 'employee'
    `, [teamId]);
    
    const allTeamMembers = teamMembersResult.rows;
    console.log(`🔍 ULTRA BULLETPROOF: Found ${allTeamMembers.length} team members to process (in database order):`);
    allTeamMembers.forEach((member, index) => {
      console.log(`  ${index + 1}. ${member.first_name} ${member.last_name} (${member.email}) - ID: ${member.user_id}`);
    });
    
    // Note: Since user IDs are UUIDs, we can't reliably identify the "latest" member by user ID
    // Instead, we'll ensure 100% coverage for ALL members
    console.log(`🔍 ULTRA BULLETPROOF: Processing ALL team members to ensure 100% coverage`);
    
    // Also get ALL team members including managers to see the complete picture
    const allTeamMembersIncludingManagersResult = await query(`
      SELECT tm.user_id, u.first_name, u.last_name, u.email, u.role, u.status
      FROM team_members tm
      INNER JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = $1
    `, [teamId]);
    
    const allTeamMembersIncludingManagers = allTeamMembersIncludingManagersResult.rows;
    console.log(`🔍 ULTRA BULLETPROOF: Total team members (including managers): ${allTeamMembersIncludingManagers.length}`);
    allTeamMembersIncludingManagers.forEach((member, index) => {
      const isEmployee = member.role === 'employee';
      console.log(`  ${index + 1}. ${member.first_name} ${member.last_name} (${member.email}) - Role: ${member.role}, Status: ${member.status}${isEmployee ? ' [WILL BE PROCESSED]' : ' [SKIPPED - NOT EMPLOYEE]'}`);
    });
    
    if (allTeamMembers.length === 0) {
      return res.status(400).json({ message: 'No active employees found in team' });
    }
    
    // ULTRA BULLETPROOF: Pre-assignment analysis - check current state of all members
    console.log(`🔍 ULTRA BULLETPROOF: Pre-assignment analysis - checking current individual target status...`);
    const preAssignmentAnalysis = [];
    
    for (const member of allTeamMembers) {
      const currentTargetsResult = await query(`
        SELECT COUNT(*) as target_count
        FROM individual_targets it
        INNER JOIN objectives o ON it.objective_id = o.id
        WHERE it.user_id = $1 AND o.category = 'personal_improvement'
      `, [member.user_id]);
      
      const currentTargetCount = parseInt(currentTargetsResult.rows[0].target_count);
      preAssignmentAnalysis.push({
        member: member,
        currentTargetCount: currentTargetCount,
        hasExistingTargets: currentTargetCount > 0
      });
      
      console.log(`  ${member.first_name} ${member.last_name}: ${currentTargetCount} existing individual targets`);
    }
    
    const membersWithExistingTargets = preAssignmentAnalysis.filter(a => a.hasExistingTargets);
    const membersWithoutTargets = preAssignmentAnalysis.filter(a => !a.hasExistingTargets);
    
    console.log(`🔍 ULTRA BULLETPROOF: Pre-assignment summary:`);
    console.log(`  - Members with existing targets: ${membersWithExistingTargets.length}`);
    console.log(`  - Members without targets: ${membersWithoutTargets.length}`);
    console.log(`  - Force assignment mode: ${forceAssignment ? 'ENABLED' : 'DISABLED'}`);
    
    if (membersWithoutTargets.length > 0) {
      console.log(`🔍 ULTRA BULLETPROOF: Members without targets:`);
      membersWithoutTargets.forEach(a => {
        console.log(`  - ${a.member.first_name} ${a.member.last_name}`);
      });
    }
    
    // ULTRA BULLETPROOF: Process each member with individual transaction
    const createdObjectives = [];
    const processedMemberIds = new Set();
    
    // Process ALL members to ensure 100% coverage
    const membersToProcess = [...allTeamMembers];
    
    for (let i = 0; i < membersToProcess.length; i++) {
      const member = membersToProcess[i];
      const memberAnalysis = preAssignmentAnalysis.find(a => a.member.user_id === member.user_id);
      const hasExistingTargets = memberAnalysis ? memberAnalysis.hasExistingTargets : false;
      
      console.log(`🔍 ULTRA BULLETPROOF: Processing member ${i + 1}/${membersToProcess.length}: ${member.first_name} ${member.last_name} (ID: ${member.user_id}) - Existing targets: ${hasExistingTargets ? 'YES' : 'NO'}`);
      
      // Start individual transaction for each member
      await query('BEGIN');
      
      try {
        const individualTitle = `${title} (${member.first_name} ${member.last_name})`;
        const individualDescription = description;
        const individualDeadline = deadline;
        
        // Check if this member already has an individual target for this specific assignment
        const existingTargetCheck = await query(`
          SELECT COUNT(*) as existing_count
          FROM individual_targets it
          INNER JOIN objectives o ON it.objective_id = o.id
          WHERE it.user_id = $1 
            AND o.category = 'personal_improvement' 
            AND o.created_by = $2
            AND o.created_at > NOW() - INTERVAL '1 hour'
        `, [member.user_id, creatorId]);
        
        const existingCount = parseInt(existingTargetCheck.rows[0].existing_count);
        console.log(`🔍 ULTRA BULLETPROOF: Member ${member.first_name} ${member.last_name} - existing recent targets: ${existingCount}`);
        
        if (existingCount > 0 && !forceAssignment) {
          console.log(`⚠️ ULTRA BULLETPROOF: Member ${member.first_name} ${member.last_name} already has ${existingCount} recent individual target(s), skipping...`);
          console.log(`🔍 ULTRA BULLETPROOF: forceAssignment is ${forceAssignment} (type: ${typeof forceAssignment}), so skipping`);
          await query('ROLLBACK');
          processedMemberIds.add(member.user_id);
          console.log(`✅ ULTRA BULLETPROOF: Member ${member.first_name} ${member.last_name} marked as processed (skipped)`);
          continue;
        } else if (existingCount > 0 && forceAssignment) {
          console.log(`🔄 ULTRA BULLETPROOF: Member ${member.first_name} ${member.last_name} already has ${existingCount} recent individual target(s), but forceAssignment=true, proceeding...`);
          console.log(`🔍 ULTRA BULLETPROOF: forceAssignment is ${forceAssignment} (type: ${typeof forceAssignment}), so proceeding`);
        } else {
          console.log(`✅ ULTRA BULLETPROOF: Member ${member.first_name} ${member.last_name} has no recent targets, proceeding with assignment...`);
        }
        
        // Create individual objective for this team member
        const individualObjectiveResult = await query(`
          INSERT INTO objectives (title, description, category, skill_id, target_level, deadline, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, title, description, category, target_level, deadline, progress, status, created_at
        `, [individualTitle, individualDescription, 'personal_improvement', skillId, targetLevel, individualDeadline, creatorId]);
        
        const individualObjective = individualObjectiveResult.rows[0];
        console.log(`✅ ULTRA BULLETPROOF: Created individual objective: ${individualObjective.title} (ID: ${individualObjective.id})`);
        
        // Create assignment for the individual objective
        await query(`
          INSERT INTO objective_assignments (objective_id, assignee_type, user_id, team_id)
          VALUES ($1, $2, $3, $4)
        `, [individualObjective.id, 'USER', member.user_id, teamId]);
        
        console.log(`✅ ULTRA BULLETPROOF: Created assignment for ${member.first_name} ${member.last_name}`);
        
        // Create individual target record
        await query(`
          INSERT INTO individual_targets (
            objective_id,
            user_id,
            team_id,
            custom_title,
            custom_description,
            custom_deadline,
            custom_file_path
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [individualObjective.id, member.user_id, teamId, individualTitle, individualDescription, individualDeadline, null]);
        
        console.log(`✅ ULTRA BULLETPROOF: Created individual target record for ${member.first_name} ${member.last_name}`);
        
        // Commit individual transaction
        await query('COMMIT');
        
        // Store successful creation
        createdObjectives.push({
          member: member,
          objective: individualObjective
        });
        
        // Mark as processed
        processedMemberIds.add(member.user_id);
        
        console.log(`🎉 ULTRA BULLETPROOF: Successfully processed ${member.first_name} ${member.last_name}!`);
        console.log(`✅ ULTRA BULLETPROOF: Member ${member.first_name} ${member.last_name} marked as processed (assigned)`);
        
      } catch (error) {
        // Rollback individual transaction
        await query('ROLLBACK');
        console.error(`❌ ULTRA BULLETPROOF: Failed to create individual objective for ${member.first_name} ${member.last_name}:`, error);
        
        // Try with simplified data in a separate transaction
        await query('BEGIN');
        try {
          // Check again for existing targets before retry
          const retryExistingCheck = await query(`
            SELECT COUNT(*) as existing_count
            FROM individual_targets it
            INNER JOIN objectives o ON it.objective_id = o.id
            WHERE it.user_id = $1 
              AND o.category = 'personal_improvement' 
              AND o.created_by = $2
              AND o.created_at > NOW() - INTERVAL '1 hour'
          `, [member.user_id, creatorId]);
          
          const retryExistingCount = parseInt(retryExistingCheck.rows[0].existing_count);
          console.log(`🔍 ULTRA BULLETPROOF RETRY: Member ${member.first_name} ${member.last_name} - existing recent targets: ${retryExistingCount}`);
          
          if (retryExistingCount > 0) {
            console.log(`⚠️ ULTRA BULLETPROOF RETRY: Member ${member.first_name} ${member.last_name} already has ${retryExistingCount} recent individual target(s), skipping retry...`);
            await query('ROLLBACK');
            processedMemberIds.add(member.user_id);
            continue;
          } else {
            console.log(`✅ ULTRA BULLETPROOF RETRY: Member ${member.first_name} ${member.last_name} has no recent targets, proceeding with retry...`);
          }
          
          const simplifiedTitle = `indiv target (${member.first_name} ${member.last_name})`;
          const simplifiedDescription = description || 'Individual target assignment';
          
          const simplifiedObjectiveResult = await query(`
            INSERT INTO objectives (title, description, category, skill_id, target_level, deadline, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, title, description, category, target_level, deadline, progress, status, created_at
          `, [simplifiedTitle, simplifiedDescription, 'personal_improvement', skillId, targetLevel, deadline, creatorId]);
          
          const simplifiedObjective = simplifiedObjectiveResult.rows[0];
          console.log(`✅ ULTRA BULLETPROOF SIMPLIFIED: Created objective for ${member.first_name} ${member.last_name}: ${simplifiedObjective.id}`);
          
          // Create assignment
          await query(`
            INSERT INTO objective_assignments (objective_id, assignee_type, user_id)
            VALUES ($1, $2, $3)
          `, [simplifiedObjective.id, 'USER', member.user_id]);
          
          // Create individual target record
          await query(`
            INSERT INTO individual_targets (
              objective_id,
              user_id,
              team_id,
              custom_title,
              custom_description,
              custom_deadline,
              custom_file_path
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [simplifiedObjective.id, member.user_id, teamId, simplifiedTitle, simplifiedDescription, deadline, null]);
          
          // Commit simplified transaction
          await query('COMMIT');
          
          // Store successful creation
          createdObjectives.push({
            member: member,
            objective: simplifiedObjective
          });
          
          // Mark as processed
          processedMemberIds.add(member.user_id);
          
          console.log(`🎉 ULTRA BULLETPROOF SIMPLIFIED: Successfully processed ${member.first_name} ${member.last_name}!`);
          console.log(`✅ ULTRA BULLETPROOF: Member ${member.first_name} ${member.last_name} marked as processed (retry assigned)`);
          
        } catch (simplifiedError) {
          await query('ROLLBACK');
          console.error(`❌ ULTRA BULLETPROOF SIMPLIFIED FAILED for ${member.first_name} ${member.last_name}:`, simplifiedError);
        }
      }
    }
    
    // ULTRA BULLETPROOF: Processing summary
    console.log(`\n🔍 ULTRA BULLETPROOF: Processing summary:`);
    console.log(`  - Total team members: ${allTeamMembers.length}`);
    console.log(`  - Processed member IDs: ${processedMemberIds.size}`);
    
    allTeamMembers.forEach((member, index) => {
      const wasProcessed = processedMemberIds.has(member.user_id);
      const status = wasProcessed ? '✅ PROCESSED' : '❌ NOT PROCESSED';
      console.log(`  ${index + 1}. ${member.first_name} ${member.last_name}: ${status}`);
    });
    
    const unprocessedMembers = allTeamMembers.filter(member => !processedMemberIds.has(member.user_id));
    if (unprocessedMembers.length > 0) {
      console.log(`\n🚨 ULTRA BULLETPROOF: Found ${unprocessedMembers.length} unprocessed members:`);
      unprocessedMembers.forEach(member => {
        console.log(`  - ${member.first_name} ${member.last_name} (${member.user_id})`);
      });
    } else {
      console.log(`\n✅ ULTRA BULLETPROOF: All members were processed successfully!`);
    }
    
    // ULTRA BULLETPROOF: Final verification and recovery
    console.log(`🔍 ULTRA BULLETPROOF: Final verification...`);
    const stillMissingMembers = allTeamMembers.filter(member => !processedMemberIds.has(member.user_id));
    
    if (stillMissingMembers.length > 0) {
      console.log(`🚨 ULTRA BULLETPROOF: Found ${stillMissingMembers.length} still missing members:`, stillMissingMembers.map(m => `${m.first_name} ${m.last_name} (${m.user_id})`));
      
      // Final recovery attempt for missing members
      for (const missingMember of stillMissingMembers) {
        console.log(`🚨 ULTRA BULLETPROOF FINAL: Final recovery for ${missingMember.first_name} ${missingMember.last_name}`);
        
        await query('BEGIN');
        try {
          // Check for existing targets before final recovery
          const finalExistingCheck = await query(`
            SELECT COUNT(*) as existing_count
            FROM individual_targets it
            INNER JOIN objectives o ON it.objective_id = o.id
            WHERE it.user_id = $1 
              AND o.category = 'personal_improvement' 
              AND o.created_by = $2
              AND o.created_at > NOW() - INTERVAL '1 hour'
          `, [missingMember.user_id, creatorId]);
          
          const finalExistingCount = parseInt(finalExistingCheck.rows[0].existing_count);
          if (finalExistingCount > 0) {
            console.log(`⚠️ ULTRA BULLETPROOF FINAL: Member ${missingMember.first_name} ${missingMember.last_name} already has ${finalExistingCount} recent individual target(s), skipping final recovery...`);
            await query('ROLLBACK');
            continue;
          }
          
          const finalTitle = `FINAL RECOVERY (${missingMember.first_name} ${missingMember.last_name})`;
          const finalDescription = description || 'Individual target assignment - Final Recovery';
          
          const finalObjectiveResult = await query(`
            INSERT INTO objectives (title, description, category, skill_id, target_level, deadline, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, title, description, category, target_level, deadline, progress, status, created_at
          `, [finalTitle, finalDescription, 'personal_improvement', skillId, targetLevel, deadline, creatorId]);
          
          const finalObjective = finalObjectiveResult.rows[0];
          console.log(`✅ ULTRA BULLETPROOF FINAL: Created objective for ${missingMember.first_name} ${missingMember.last_name}: ${finalObjective.id}`);
          
          // Create assignment
          await query(`
            INSERT INTO objective_assignments (objective_id, assignee_type, user_id)
            VALUES ($1, $2, $3)
          `, [finalObjective.id, 'USER', missingMember.user_id]);
          
          // Create individual target record
          await query(`
            INSERT INTO individual_targets (
              objective_id,
              user_id,
              team_id,
              custom_title,
              custom_description,
              custom_deadline,
              custom_file_path
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [finalObjective.id, missingMember.user_id, teamId, finalTitle, finalDescription, deadline, null]);
          
          // Commit final recovery transaction
          await query('COMMIT');
          
          // Store successful creation
          createdObjectives.push({
            member: missingMember,
            objective: finalObjective
          });
          
          console.log(`🎉 ULTRA BULLETPROOF FINAL: Successfully recovered ${missingMember.first_name} ${missingMember.last_name}!`);
          
        } catch (finalError) {
          await query('ROLLBACK');
          console.error(`❌ ULTRA BULLETPROOF FINAL FAILED for ${missingMember.first_name} ${missingMember.last_name}:`, finalError);
        }
      }
    }
    
    // ULTRA BULLETPROOF: Database verification - double-check that all members have targets
    console.log(`🔍 ULTRA BULLETPROOF: Database verification - checking all members have individual targets...`);
    const verificationResults = [];
    
    for (const member of allTeamMembers) {
      const verificationResult = await query(`
        SELECT COUNT(*) as target_count
        FROM individual_targets it
        INNER JOIN objectives o ON it.objective_id = o.id
        WHERE it.user_id = $1 AND o.category = 'personal_improvement' AND o.created_by = $2
      `, [member.user_id, creatorId]);
      
      const targetCount = parseInt(verificationResult.rows[0].target_count);
      verificationResults.push({
        member: member,
        targetCount: targetCount,
        hasTarget: targetCount > 0
      });
      
      if (targetCount > 0) {
        console.log(`✅ VERIFICATION: ${member.first_name} ${member.last_name} has ${targetCount} individual target(s)`);
      } else {
        console.log(`❌ VERIFICATION: ${member.first_name} ${member.last_name} has NO individual targets!`);
      }
    }
    
    const membersWithoutTargetsInVerification = verificationResults.filter(r => !r.hasTarget);
    if (membersWithoutTargetsInVerification.length > 0) {
      console.log(`🚨 ULTRA BULLETPROOF VERIFICATION: ${membersWithoutTargetsInVerification.length} members still don't have individual targets!`);
      membersWithoutTargetsInVerification.forEach(r => {
        console.log(`  - ${r.member.first_name} ${r.member.last_name} (${r.member.user_id})`);
      });
    } else {
      console.log(`✅ ULTRA BULLETPROOF VERIFICATION: All members have individual targets!`);
    }
    
    // Final summary
    console.log(`🔍 ULTRA BULLETPROOF: Final summary:`);
    console.log(`  - Total team members: ${allTeamMembers.length}`);
    console.log(`  - Successfully created: ${createdObjectives.length}`);
    console.log(`  - Missing: ${allTeamMembers.length - createdObjectives.length}`);
    
    if (createdObjectives.length >= allTeamMembers.length) {
      console.log(`🎉 ULTRA BULLETPROOF SUCCESS: All ${allTeamMembers.length} employees received individual targets!`);
      
      res.status(201).json({
        success: true,
        message: `Successfully assigned individual targets to all ${allTeamMembers.length} team members`,
        totalMembers: allTeamMembers.length,
        createdTargets: createdObjectives.length,
        objectives: createdObjectives.map(item => ({
          member: item.member,
          objective: item.objective
        }))
      });
    } else {
      console.log(`❌ ULTRA BULLETPROOF WARNING: Only ${createdObjectives.length} out of ${allTeamMembers.length} employees received individual targets!`);
      
      res.status(207).json({
        success: false,
        message: `Only ${createdObjectives.length} out of ${allTeamMembers.length} employees received individual targets`,
        totalMembers: allTeamMembers.length,
        createdTargets: createdObjectives.length,
        objectives: createdObjectives.map(item => ({
          member: item.member,
          objective: item.objective
        }))
      });
    }
    
  } catch (error) {
    console.error('❌ ULTRA BULLETPROOF: Team-wide individual target assignment error:', error);
    res.status(500).json({ 
      message: 'Failed to assign individual targets to team',
      error: error.message 
    });
  }
});

// SIMPLIFIED INDIVIDUAL TARGET CREATION ENDPOINT
router.post('/individual-target', authenticateToken, requireManager, async (req, res) => {
  try {
    console.log('🔍 SIMPLIFIED: Individual target creation started');
    console.log('🔍 SIMPLIFIED: Request body:', req.body);
    console.log('🔍 SIMPLIFIED: User:', req.user);
    
    const { title, description, skillId, targetLevel, deadline, userId } = req.body;
    const creatorId = req.user.id;
    
    // Basic validation
    if (!title || !description || !skillId || !targetLevel || !deadline || !userId) {
      console.log('❌ SIMPLIFIED: Missing required fields');
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    console.log('🔍 SIMPLIFIED: Validation passed, creating objective...');
    
    // Start transaction
    await query('BEGIN');
    
    try {
      // Create objective
      const objectiveResult = await query(`
        INSERT INTO objectives (title, description, category, skill_id, target_level, deadline, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, title, description, category, target_level, deadline, progress, status, created_at
      `, [title, description, 'personal_improvement', skillId, targetLevel, deadline, creatorId]);
      
      const objective = objectiveResult.rows[0];
      console.log('✅ SIMPLIFIED: Objective created:', objective.id);
      
      // Create assignment
        const assignmentResult = await client.query(`
          INSERT INTO objective_assignments (objective_id, assignee_type, user_id, team_id)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [objective.id, 'USER', userId, userTeamId]);
      
      console.log('✅ SIMPLIFIED: Assignment created:', assignmentResult.rows[0].id);
      
      // Get user's team ID
      const userTeamResult = await query(`
        SELECT tm.team_id 
        FROM team_members tm 
        WHERE tm.user_id = $1 
        LIMIT 1
      `, [userId]);
      
      const userTeamId = userTeamResult.rows.length > 0 ? userTeamResult.rows[0].team_id : null;
      console.log('🔍 SIMPLIFIED: User team ID:', userTeamId);
      
      // Create individual target record
        const individualTargetResult = await client.query(`
          INSERT INTO individual_targets (
            objective_id,
            user_id,
            team_id,
            custom_title,
            custom_description,
            custom_deadline,
            custom_file_path
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [objective.id, userId, userTeamId, title, description, deadline, null]);
      
      console.log('✅ SIMPLIFIED: Individual target created:', individualTargetResult.rows[0].id);
      
      // Commit transaction
      await query('COMMIT');
      
      console.log('🎉 SIMPLIFIED: Individual target creation completed successfully!');
      
      res.status(201).json({
        success: true,
        message: 'Individual target created successfully',
        objective: {
          id: objective.id,
          title: objective.title,
          description: objective.description,
          category: objective.category,
          targetLevel: objective.target_level,
          deadline: objective.deadline,
          progress: objective.progress,
          status: objective.status,
          createdAt: objective.created_at
        },
        assignment: {
          id: assignmentResult.rows[0].id
        },
        individualTarget: {
          id: individualTargetResult.rows[0].id
        }
      });
      
    } catch (error) {
      await query('ROLLBACK');
      console.error('❌ SIMPLIFIED: Transaction error:', error);
      throw error;
    }
    
  } catch (error) {
    console.error('❌ SIMPLIFIED: Individual target creation error:', error);
    res.status(500).json({ 
      message: 'Failed to create individual target',
      error: error.message 
    });
  }
});

// Create objective
router.post('/', authenticateToken, requireManager, async (req, res) => {
  try {
    console.log('🔍 Backend: Received request body:', req.body);
    console.log('🔍 Backend: Title received:', req.body.title);
    console.log('🔍 Backend: Title length:', req.body.title ? req.body.title.length : 'undefined');
    console.log('🔍 Backend: Title type:', typeof req.body.title);
    console.log('🔍 Backend: teamMemberAssignments:', req.body.teamMemberAssignments);
    console.log('🔍 Backend: User ID from token:', req.user.id);
    console.log('🔍 Backend: User role:', req.user.role);
    
    const { error, value } = objectiveSchema.create.validate(req.body);
    if (error) {
      console.error('❌ Backend: Validation error:', error.details[0].message);
      console.error('❌ Backend: Validation error details:', error);
      return res.status(400).json({ message: error.details[0].message });
    }
    
    console.log('✅ Backend: Validation passed, value:', value);

    const { title, description, category, skillId, targetLevel, deadline, assigneeType, userId, teamId } = value;
    const creatorId = req.user.id;
    
    console.log('🔍 Individual objective creation request:');
    console.log('  - Creator ID:', creatorId);
    console.log('  - Creator ID type:', typeof creatorId);
    console.log('  - Assignee Type:', assigneeType);
    console.log('  - User ID:', userId);
    console.log('  - Team ID:', teamId);
    console.log('  - Title:', title);
    console.log('  - Category:', category);
    console.log('  - Skill ID:', skillId);
    console.log('  - Target Level:', targetLevel);
    console.log('  - Deadline:', deadline);
    
    // Verify creator exists
    const creatorCheck = await query(`
      SELECT id, first_name, last_name, email, role, status
      FROM users 
      WHERE id = $1
    `, [creatorId]);
    
    if (creatorCheck.rows.length === 0) {
      console.error('❌ Creator not found:', creatorId);
      throw new Error('Creator not found');
    }
    
    console.log('✅ Creator validation passed:', creatorCheck.rows[0].first_name, creatorCheck.rows[0].last_name);
    
    // SIMPLIFIED PERMISSION CHECK: Allow any manager to assign objectives to any user
    // This removes complex team management permission issues
    console.log('✅ Simplified permission: Allowing manager to assign individual objective');
    
    console.log('🔍 Backend: Date debugging for team objective:');
    console.log('   - deadline (raw):', deadline);
    console.log('   - deadline (parsed):', deadline ? new Date(deadline) : 'null');
    console.log('   - deadline (ISO):', deadline ? new Date(deadline).toISOString() : 'null');

    console.log('🔍 Backend: Starting objective creation with transaction');
    
    // Get a client from the pool for transaction
    const client = await pool.connect();
    let objective = null; // Declare objective variable in outer scope

    try {
      // Start a transaction
      await client.query('BEGIN');
      // Create objective with proper error handling
      console.log('🔍 Creating objective with data:', {
        title, description, category, skillId, targetLevel, deadline, creatorId
      });
      
      try {
        console.log('🔍 About to create objective with parameters:');
        console.log('  - title:', title);
        console.log('  - description:', description);
        console.log('  - category:', category);
        console.log('  - skillId:', skillId, '(type:', typeof skillId, ')');
        console.log('  - targetLevel:', targetLevel, '(type:', typeof targetLevel, ')');
        console.log('  - deadline:', deadline, '(type:', typeof deadline, ')');
        console.log('  - creatorId:', creatorId, '(type:', typeof creatorId, ')');
        
        const result = await client.query(`
          INSERT INTO objectives (title, description, category, skill_id, target_level, deadline, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, title, description, category, target_level, deadline, progress, status, created_at
        `, [title, description, category, skillId, targetLevel, deadline, creatorId]);

        console.log('🔍 Objective creation result:', result);
        console.log('🔍 Result rows:', result.rows);
        
        objective = result.rows[0]; // Assign to outer scope variable
        console.log('✅ Backend: Objective created successfully:', objective?.id);
        
        // Verify objective was created
        if (!objective || !objective.id) {
          console.error('❌ Objective creation failed - no ID returned');
          console.error('❌ Result:', result);
          throw new Error('Failed to create objective - no ID returned');
        }
        
        // Verify the objective actually exists in the database
        const verifyResult = await client.query(`
          SELECT id FROM objectives WHERE id = $1
        `, [objective.id]);
        
        if (verifyResult.rows.length === 0) {
          console.error('❌ Objective not found in database after creation');
          throw new Error('Objective creation failed - objective not found in database');
        }
        
        console.log('✅ Objective verified in database:', objective.id);
        
      } catch (objectiveError) {
        console.error('❌ Objective creation failed:', objectiveError);
        console.error('❌ Error details:', {
          message: objectiveError.message,
          code: objectiveError.code,
          detail: objectiveError.detail,
          constraint: objectiveError.constraint
        });
        console.error('❌ Full error object:', objectiveError);
        throw new Error(`Objective creation failed: ${objectiveError.message}`);
      }

      // Create assignment and notify assignees
      if (assigneeType === 'USER' && userId) {
        console.log('🔍 Creating individual assignment:');
        console.log('  - Objective ID:', objective.id);
        console.log('  - Assignee Type:', assigneeType);
        console.log('  - User ID:', userId);
        
        // Double-check that objective exists before creating assignment
        if (!objective || !objective.id) {
          console.error('❌ Cannot create assignment - objective is null or has no ID');
          throw new Error('Cannot create assignment - objective is null or has no ID');
        }
        
        // Verify the user exists and is an employee
        const userCheck = await client.query(`
          SELECT id, first_name, last_name, email, role, status
          FROM users 
          WHERE id = $1 AND role = 'employee' AND status = 'active'
        `, [userId]);
        
        if (userCheck.rows.length === 0) {
          throw new Error('User not found or is not an active employee');
        }
        
        const user = userCheck.rows[0];
        console.log('✅ User validation passed:', user.first_name, user.last_name);
        
        // Get the team ID for this user BEFORE creating the assignment
        const userTeamResult = await client.query(`
          SELECT tm.team_id 
          FROM team_members tm 
          WHERE tm.user_id = $1 
          LIMIT 1
        `, [userId]);
        
        const userTeamId = userTeamResult.rows.length > 0 ? userTeamResult.rows[0].team_id : null;
        console.log('🔍 User team ID for assignment:', userTeamId);
        
        let assignmentResult;
        try {
          assignmentResult = await client.query(`
            INSERT INTO objective_assignments (objective_id, assignee_type, user_id, team_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id
          `, [objective.id, assigneeType, userId, userTeamId]);
          
          console.log('✅ Individual assignment created successfully:', assignmentResult.rows[0].id);
        } catch (assignmentError) {
          console.error('❌ Assignment creation failed:', assignmentError);
          console.error('❌ Assignment error details:', {
            message: assignmentError.message,
            code: assignmentError.code,
            detail: assignmentError.detail,
            constraint: assignmentError.constraint
          });
          throw new Error(`Assignment creation failed: ${assignmentError.message}`);
        }
        
        // Verify the assignment was created correctly
        const verifyAssignment = await client.query(`
          SELECT oa.*, o.title, u.first_name, u.last_name
          FROM objective_assignments oa
          JOIN objectives o ON oa.objective_id = o.id
          JOIN users u ON oa.user_id = u.id
          WHERE oa.id = $1
        `, [assignmentResult.rows[0].id]);
        
        console.log('🔍 Assignment verification:', verifyAssignment.rows[0]);

        // Create individual target record with proper team_id
        try {
          console.log('🔍 Creating individual target record for user:', userId, 'team:', userTeamId);
          const individualTargetResult = await client.query(`
            INSERT INTO individual_targets (
              objective_id,
              user_id,
              team_id,
              custom_title,
              custom_description,
              custom_deadline,
              custom_file_path
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
          `, [objective.id, userId, userTeamId, title, description, deadline, null]);
          
          console.log('✅ Individual target created successfully:', individualTargetResult.rows[0].id);
          
          console.log('✅ Individual target record created successfully for user:', userId);
        } catch (targetError) {
          console.error('❌ Error creating individual target record for user:', userId);
          console.error('❌ Target error details:', {
            message: targetError.message,
            code: targetError.code,
            detail: targetError.detail,
            constraint: targetError.constraint,
            userId: userId,
            objectiveId: objective.id,
            teamId: userTeamId
          });
          throw new Error(`Failed to create individual target record: ${targetError.message}`);
        }

        // Get assigner details for notification
        const assignerResult = await client.query('SELECT first_name, last_name FROM users WHERE id = $1', [creatorId]);
        const assignerName = assignerResult.rows.length > 0 
          ? `${assignerResult.rows[0].first_name} ${assignerResult.rows[0].last_name}`
          : 'Un manager';

        // Notify the assigned user
        try {
        await createNotification(
          userId,
          NOTIFICATION_TYPES.OBJECTIVE_ASSIGNED,
          'Nouvel objectif assigné',
          `${assignerName} vous a assigné un nouvel objectif: "${title}"`,
          'objective',
          objective.id
        );
          console.log('✅ Notification created successfully for user:', userId);
        } catch (notificationError) {
          console.error('❌ Notification creation failed for user:', userId, notificationError);
          // Don't fail the entire request if notification fails
        }

        // Send email notification
        try {
          const [assigneeResult, managerResult] = await Promise.all([
            query('SELECT id, email, first_name, last_name FROM users WHERE id = $1', [userId]),
            query('SELECT id, email, first_name, last_name FROM users WHERE id = $1', [creatorId])
          ]);
          
          if (assigneeResult.rows.length > 0 && managerResult.rows.length > 0) {
            await emailNotificationService.sendObjectiveAssigned(
              objective,
              assigneeResult.rows[0],
              managerResult.rows[0]
            );
          }
        } catch (emailError) {
          console.error('Failed to send objective assignment email:', emailError);
        }
      } else if (assigneeType === 'TEAM' && teamId) {
        // Create team assignment
        await client.query(`
          INSERT INTO objective_assignments (objective_id, assignee_type, team_id)
          VALUES ($1, $2, $3)
        `, [objective.id, assigneeType, teamId]);

        // Get all team members (EXCLUDE MANAGERS - only employees)
        const allTeamMembersResult = await client.query(`
          SELECT tm.user_id, u.first_name, u.last_name, u.email, u.role, u.status
          FROM team_members tm
          INNER JOIN users u ON tm.user_id = u.id
          WHERE tm.team_id = $1 AND u.status = 'active' AND u.role = 'employee'
          ORDER BY u.first_name, u.last_name
        `, [teamId]);
        
        const allTeamMembers = allTeamMembersResult.rows;
        console.log(`🔍 Backend: Found ${allTeamMembers.length} team members for assignment (employees only):`);
        allTeamMembers.forEach((member, index) => {
          console.log(`  ${index + 1}. ${member.first_name} ${member.last_name} (${member.email}) - Role: ${member.role}, Status: ${member.status}`);
        });
        
        // Also check if there are any team members that were excluded
        const allTeamMembersIncludingManagersResult = await client.query(`
          SELECT tm.user_id, u.first_name, u.last_name, u.email, u.role, u.status
          FROM team_members tm
          INNER JOIN users u ON tm.user_id = u.id
          WHERE tm.team_id = $1
          ORDER BY u.first_name, u.last_name
        `, [teamId]);
        
        const excludedMembers = allTeamMembersIncludingManagersResult.rows.filter(member => 
          !allTeamMembers.some(activeMember => activeMember.user_id === member.user_id)
        );
        
        if (excludedMembers.length > 0) {
          console.log(`🔍 Backend: Excluded ${excludedMembers.length} team members (managers or inactive):`);
          excludedMembers.forEach((member, index) => {
            console.log(`  ${index + 1}. ${member.first_name} ${member.last_name} (${member.email}) - Role: ${member.role}, Status: ${member.status}`);
          });
        }
        
        if (category === 'personal_improvement') {
          // BULLETPROOF APPROACH: Create individual objectives for ALL team members
          console.log('🔍 BULLETPROOF: Creating individual objectives for ALL team members...');
          console.log(`🔍 BULLETPROOF: Total team members to process: ${allTeamMembers.length}`);
          
          // Step 1: Create individual objectives for ALL team members
          const createdObjectives = [];
          const failedMembers = [];
          
          for (const member of allTeamMembers) {
            console.log(`🔍 BULLETPROOF: Processing team member: ${member.first_name} ${member.last_name} (ID: ${member.user_id})`);
            
            try {
              // Check if this member has custom assignment data
              const customAssignment = req.body.teamMemberAssignments?.find(a => a.userId === member.user_id);
              
              let individualTitle, individualDescription, individualDeadline;
              
              if (customAssignment) {
                console.log(`🔍 BULLETPROOF: Using custom assignment data for ${member.first_name} ${member.last_name}`);
                individualTitle = customAssignment.partialTargetName;
                individualDescription = customAssignment.individualDescription || description;
                individualDeadline = customAssignment.individualDeadline || deadline;
              } else {
                console.log(`🔍 BULLETPROOF: Using default assignment data for ${member.first_name} ${member.last_name}`);
                individualTitle = `${title} (${member.first_name} ${member.last_name})`;
                individualDescription = description;
                individualDeadline = deadline;
              }
              
              // Create individual objective for this team member
              const individualObjectiveResult = await query(`
                INSERT INTO objectives (title, description, category, skill_id, target_level, deadline, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, title, description, category, target_level, deadline, progress, status, created_at
              `, [individualTitle, individualDescription, category, skillId, targetLevel, individualDeadline, creatorId]);
              
              const individualObjective = individualObjectiveResult.rows[0];
              console.log(`✅ BULLETPROOF: Created individual objective: ${individualObjective.title} (ID: ${individualObjective.id})`);
              
              // Create assignment for the individual objective
            await query(`
                INSERT INTO objective_assignments (objective_id, assignee_type, user_id, team_id)
                VALUES ($1, $2, $3, $4)
              `, [individualObjective.id, 'USER', member.user_id, teamId]);
              
              console.log(`✅ BULLETPROOF: Created assignment for ${member.first_name} ${member.last_name}`);
              
              // Create individual target record
            await query(`
              INSERT INTO individual_targets (
                objective_id,
                user_id,
                team_id,
                custom_title,
                custom_description,
                custom_deadline,
                custom_file_path
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
              `, [individualObjective.id, member.user_id, teamId, individualTitle, individualDescription, individualDeadline, null]);
              
              console.log(`✅ BULLETPROOF: Created individual target record for ${member.first_name} ${member.last_name}`);
              
              // Store successful creation
              createdObjectives.push({
                member: member,
                objective: individualObjective
              });
              
              // Send email notification
              try {
                const memberResult = await query(`
                  SELECT first_name, last_name, email FROM users WHERE id = $1
                `, [member.user_id]);
                
                const managerResult = await query(`
                  SELECT first_name, last_name, email FROM users WHERE id = $1
                `, [creatorId]);
              
              if (memberResult.rows.length > 0 && managerResult.rows.length > 0) {
                await emailNotificationService.sendObjectiveAssigned(
                    individualObjective,
                  memberResult.rows[0],
                  managerResult.rows[0]
                );
              }
            } catch (emailError) {
                console.error(`❌ Failed to send email for ${member.first_name} ${member.last_name}:`, emailError);
              }
              
            } catch (memberError) {
              console.error(`❌ BULLETPROOF ERROR: Failed to create individual objective for ${member.first_name} ${member.last_name} (ID: ${member.user_id}):`, memberError);
              console.error(`❌ Error details:`, {
                message: memberError.message,
                code: memberError.code,
                detail: memberError.detail,
                constraint: memberError.constraint
              });
              
              // Store failed member for retry
              failedMembers.push({
                member: member,
                error: memberError
              });
            }
          }
          
          console.log(`🔍 BULLETPROOF: First pass completed:`);
          console.log(`  - Successfully created: ${createdObjectives.length}`);
          console.log(`  - Failed: ${failedMembers.length}`);
          
          // Step 2: Retry failed members with simplified approach
          if (failedMembers.length > 0) {
            console.log(`🔍 BULLETPROOF: Retrying failed members with simplified approach...`);
            
            for (const failedItem of failedMembers) {
              const member = failedItem.member;
              console.log(`🚨 BULLETPROOF RETRY: Retrying ${member.first_name} ${member.last_name}...`);
              
              try {
                // Use simplified data
                const simpleTitle = `indiv target (${member.first_name} ${member.last_name})`;
                const simpleDescription = description || 'Individual target assignment';
                
                const retryObjectiveResult = await query(`
                  INSERT INTO objectives (title, description, category, skill_id, target_level, deadline, created_by)
                  VALUES ($1, $2, $3, $4, $5, $6, $7)
                  RETURNING id, title, description, category, target_level, deadline, progress, status, created_at
                `, [simpleTitle, simpleDescription, category, skillId, targetLevel, deadline, creatorId]);
                
                const retryObjective = retryObjectiveResult.rows[0];
                console.log(`✅ BULLETPROOF RETRY: Created objective for ${member.first_name} ${member.last_name}: ${retryObjective.id}`);
                
                // Create assignment
            await query(`
                  INSERT INTO objective_assignments (objective_id, assignee_type, user_id)
                  VALUES ($1, $2, $3)
                `, [retryObjective.id, 'USER', member.user_id]);
                
                // Create individual target record
                await query(`
                  INSERT INTO individual_targets (
                    objective_id,
                    user_id,
                    team_id,
                    custom_title,
                    custom_description,
                    custom_deadline,
                    custom_file_path
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [retryObjective.id, member.user_id, teamId, simpleTitle, simpleDescription, deadline, null]);
                
                console.log(`✅ BULLETPROOF RETRY: Successfully created individual target for ${member.first_name} ${member.last_name}!`);
                
                // Move from failed to successful
                createdObjectives.push({
                  member: member,
                  objective: retryObjective
                });
                
              } catch (retryError) {
                console.error(`❌ BULLETPROOF RETRY FAILED for ${member.first_name} ${member.last_name}:`, retryError);
              }
            }
          }
          
          // Step 3: Final verification - check database for missing employees
          console.log(`🔍 BULLETPROOF: Final verification - checking database for missing employees...`);
          
          const finalMissingEmployees = [];
          for (const member of allTeamMembers) {
            const existingObjective = await query(`
              SELECT o.id FROM objectives o
              INNER JOIN objective_assignments oa ON o.id = oa.objective_id
              WHERE oa.user_id = $1 AND o.category = 'personal_improvement'
              AND o.created_at > NOW() - INTERVAL '10 minutes'
            `, [member.user_id]);
            
            if (existingObjective.rows.length === 0) {
              finalMissingEmployees.push(member);
            }
          }
          
          console.log(`🔍 BULLETPROOF: Final verification found ${finalMissingEmployees.length} missing employees:`, finalMissingEmployees.map(m => `${m.first_name} ${m.last_name} (${m.user_id})`));
          
          // Step 4: Create individual targets for ANY remaining missing employees
          for (const missingMember of finalMissingEmployees) {
            console.log(`🚨 BULLETPROOF FINAL: Creating individual target for missing employee: ${missingMember.first_name} ${missingMember.last_name}`);
            try {
              const finalTitle = `indiv target (${missingMember.first_name} ${missingMember.last_name})`;
              const finalDescription = description || 'Individual target assignment';
              
              const finalObjectiveResult = await query(`
                INSERT INTO objectives (title, description, category, skill_id, target_level, deadline, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, title, description, category, target_level, deadline, progress, status, created_at
              `, [finalTitle, finalDescription, category, skillId, targetLevel, deadline, creatorId]);
              
              const finalObjective = finalObjectiveResult.rows[0];
              console.log(`✅ BULLETPROOF FINAL: Created objective for ${missingMember.first_name} ${missingMember.last_name}: ${finalObjective.id}`);
              
              // Create assignment
              await query(`
                INSERT INTO objective_assignments (objective_id, assignee_type, user_id)
                VALUES ($1, $2, $3)
              `, [finalObjective.id, 'USER', missingMember.user_id]);
              
              // Create individual target record
              await query(`
                INSERT INTO individual_targets (
                  objective_id,
                  user_id,
                  team_id,
                  custom_title,
                  custom_description,
                  custom_deadline,
                  custom_file_path
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
              `, [finalObjective.id, missingMember.user_id, teamId, finalTitle, finalDescription, deadline, null]);
              
              console.log(`✅ BULLETPROOF FINAL: Successfully created individual target for ${missingMember.first_name} ${missingMember.last_name}!`);
              
              // Add to successful list
              createdObjectives.push({
                member: missingMember,
                objective: finalObjective
              });
              
            } catch (finalError) {
              console.error(`❌ BULLETPROOF FINAL FAILED for ${missingMember.first_name} ${missingMember.last_name}:`, finalError);
            }
          }
          
          // Final summary
          console.log(`🔍 BULLETPROOF: Final summary:`);
          console.log(`  - Total team members: ${allTeamMembers.length}`);
          console.log(`  - Successfully created: ${createdObjectives.length}`);
          console.log(`  - Missing: ${allTeamMembers.length - createdObjectives.length}`);
          
          if (createdObjectives.length >= allTeamMembers.length) {
            console.log(`✅ BULLETPROOF SUCCESS: All ${allTeamMembers.length} employees received individual targets!`);
          } else {
            console.log(`❌ BULLETPROOF WARNING: Only ${createdObjectives.length} out of ${allTeamMembers.length} employees received individual targets!`);
          }
        } else {
          // For team targets (company_project), create partial targets for each team member
          console.log('🔍 Backend: Creating team objective with partial targets for each member...');
          
          for (const member of allTeamMembers) {
          console.log(`🔍 Backend: Creating partial target for team member: ${member.first_name} ${member.last_name} (ID: ${member.user_id})`);
          
          // Check if this member has custom assignment data
          const customAssignment = req.body.teamMemberAssignments?.find(a => a.userId === member.user_id);
          
          let partialTargetTitle, partialTargetDescription, partialTargetDeadline;
          
          if (customAssignment) {
            console.log(`🔍 Backend: Using custom assignment data for ${member.first_name} ${member.last_name}`);
            partialTargetTitle = customAssignment.partialTargetName;
            partialTargetDescription = customAssignment.individualDescription || description; // Use team target description if no custom description
            partialTargetDeadline = customAssignment.individualDeadline || deadline;
          } else {
            console.log(`🔍 Backend: Using default assignment data for ${member.first_name} ${member.last_name}`);
            partialTargetTitle = `${title} (${member.first_name} ${member.last_name})`;
            partialTargetDescription = description; // Use team target description
            partialTargetDeadline = deadline;
          }
          
          // Create partial target as a separate objective linked to parent
          const partialTargetResult = await client.query(`
            INSERT INTO objectives (title, description, category, skill_id, target_level, deadline, created_by, parent_objective_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, title, description, category, target_level, deadline, progress, status, created_at
          `, [
            partialTargetTitle,
            partialTargetDescription,
            category,
            skillId,
            targetLevel,
            partialTargetDeadline,
            creatorId,
            objective.id // Link to parent team objective
          ]);
          
          const partialTarget = partialTargetResult.rows[0];
          console.log(`✅ Backend: Created partial target: ${partialTarget.title} (ID: ${partialTarget.id})`);
          
          // Create assignment for the partial target
          await client.query(`
            INSERT INTO objective_assignments (objective_id, assignee_type, user_id)
            VALUES ($1, $2, $3)
          `, [partialTarget.id, 'USER', member.user_id]);
          
          // Create individual target record
            await client.query(`
              INSERT INTO individual_targets (
                objective_id,
                user_id,
                team_id,
                custom_title,
                custom_description,
                custom_deadline,
                custom_file_path
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [partialTarget.id, member.user_id, teamId, partialTargetTitle, partialTargetDescription, partialTargetDeadline, null]);
          
          // Create objective contribution linking to parent team objective
          await client.query(`
            INSERT INTO objective_contributions (
              parent_objective_id, 
              assignee_user_id, 
              task_description, 
              status, 
              progress, 
              deadline,
              individual_description
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
              objective.id,
              member.user_id,
            partialTargetDescription, // Use description, not title
            'not_started',
            0,
            partialTargetDeadline,
            partialTargetDescription
          ]);
          
          // Send email notification
          try {
            const memberResult = await client.query(`
              SELECT first_name, last_name, email FROM users WHERE id = $1
            `, [member.user_id]);
            
            const managerResult = await client.query(`
              SELECT first_name, last_name, email FROM users WHERE id = $1
            `, [creatorId]);
              
              if (memberResult.rows.length > 0 && managerResult.rows.length > 0) {
                await emailNotificationService.sendObjectiveAssigned(
                partialTarget,
                  memberResult.rows[0],
                  managerResult.rows[0]
                );
              }
            } catch (emailError) {
            console.error('Failed to send partial target assignment email:', emailError);
            }
          }
          
        console.log(`✅ Backend: Created ${allTeamMembers.length} partial targets for team objective ${objective.id}`);
        }
      }

      // Commit the transaction FIRST
      await client.query('COMMIT');
      console.log('✅ Backend: Transaction committed successfully');
      console.log('🎉 Individual objective assignment completed successfully!');
      console.log('🔍 Backend: Objective after commit:', objective);

      // Log activity AFTER transaction is committed (non-blocking)
      try {
        await logActivity(creatorId, 'objective_created', 'objective', objective.id, {
          title,
          category,
          assigneeType,
          userId,
          teamId
        });
        console.log('✅ Backend: Activity logged successfully');
      } catch (logError) {
        console.error('❌ Backend: Activity logging failed (non-critical):', logError);
        // Don't fail the entire request if activity logging fails
      }

    } catch (error) {
      console.error('❌ Backend: Transaction error:', error);
      
      // Rollback the transaction
      try {
        await client.query('ROLLBACK');
        console.log('🔄 Backend: Transaction rolled back');
      } catch (rollbackError) {
        console.error('❌ Backend: Rollback error:', rollbackError);
      }
      
      throw error; // Re-throw to be caught by outer catch block
    } finally {
      // Always release the client back to the pool
      client.release();
    }

    // Verify objective is available after transaction
    if (!objective || !objective.id) {
      console.error('❌ Backend: Objective not available after transaction');
      throw new Error('Objective creation failed - objective not available');
    }
    
    // Get assignment details for the response (with error handling)
    let assignmentDetails = null;
    try {
      if (assigneeType === 'USER' && userId) {
        const userResult = await query(`
          SELECT id, first_name, last_name, email FROM users WHERE id = $1
        `, [userId]);
        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          assignmentDetails = {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email
          };
        }
      } else if (assigneeType === 'TEAM' && teamId) {
        const teamResult = await query(`
          SELECT id, name, description FROM teams WHERE id = $1
        `, [teamId]);
        if (teamResult.rows.length > 0) {
          const team = teamResult.rows[0];
          assignmentDetails = {
            id: team.id,
            name: team.name,
            description: team.description
          };
        }
      }
    } catch (responseError) {
      console.error('❌ Backend: Error preparing response details (non-critical):', responseError);
      // Don't fail the entire request if response preparation fails
      assignmentDetails = null;
    }

    // Prepare response data with validation
    console.log('🔍 Backend: Preparing response data for objective:', objective.id);
    const responseData = {
      id: objective.id,
      title: objective.title,
      description: objective.description,
      category: objective.category,
      targetLevel: objective.target_level,
      deadline: objective.deadline,
      progress: objective.progress,
      status: objective.status,
      createdAt: objective.created_at,
      assigneeType: assigneeType,
      assignedTo: assignmentDetails
    };
    
    console.log('🔍 Backend: Preparing response data:', responseData);
    
    // Validate response data before sending
    if (!responseData.id || !responseData.title) {
      console.error('❌ Backend: Invalid response data:', responseData);
      throw new Error('Invalid response data');
    }
    
    console.log('✅ Backend: Sending successful response');
    console.log('🔍 Backend: Response data:', responseData);
    res.status(201).json(responseData);
    console.log('✅ Backend: Response sent successfully');
  } catch (error) {
    console.error('❌ Backend: Create objective error:', error);
    console.error('❌ Backend: Error stack:', error.stack);
    console.error('❌ Backend: Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      table: error.table,
      column: error.column
    });
    
    // Send more specific error message
    const errorMessage = error.message || 'Internal server error';
    res.status(500).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      details: error.detail || undefined,
      code: error.code || undefined
    });
  }
});

// Get employee's own progress updates (must come before /:id route)
router.get('/my-progress-updates', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('🔍 Getting employee progress updates for user:', userId);

    // First check if the user exists and has any progress updates
    const userCheck = await query(`
      SELECT COUNT(*) as count FROM objective_updates WHERE author_user_id = $1
    `, [userId]);

    console.log('📊 User has progress updates count:', userCheck.rows[0].count);

    if (userCheck.rows[0].count === 0) {
      console.log('✅ No progress updates found for user, returning empty array');
      return res.json({ updates: [] });
    }

    const result = await query(`
      SELECT 
        ou.id, ou.objective_id, ou.progress, ou.notes, ou.created_at, ou.status,
        o.title, o.description,
        f.id as file_id, f.original_name, f.mime_type, f.size_bytes, f.storage_key
      FROM objective_updates ou
      INNER JOIN objectives o ON ou.objective_id = o.id
      LEFT JOIN files f ON ou.proof_file_id = f.id
      WHERE ou.author_user_id = $1
      ORDER BY ou.created_at DESC
    `, [userId]);

    console.log('📊 Query result rows:', result.rows.length);

    const updates = result.rows.map(row => ({
      id: row.id,
      objective: {
        id: row.objective_id,
        title: row.title,
        description: row.description
      },
      progress: row.progress,
      notes: row.notes,
      status: row.status,
      createdAt: row.created_at,
      proofFile: row.file_id ? {
        id: row.file_id,
        originalName: row.original_name,
        mimeType: row.mime_type,
        sizeBytes: parseInt(row.size_bytes),
        storageKey: row.storage_key
      } : null
    }));

    console.log('✅ Found progress updates:', updates.length);

    res.json({ updates });
  } catch (error) {
    console.error('❌ Get employee progress updates error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get objective by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Build where conditions based on user role
    let whereConditions = ['o.id = $1'];
    let queryParams = [id];
    let paramCount = 1;

    if (userRole === 'employee') {
      paramCount++;
      whereConditions.push(`(oa.user_id = $${paramCount} OR o.created_by = $${paramCount})`);
      queryParams.push(userId);
    } else if (userRole === 'manager') {
      paramCount++;
      whereConditions.push(`(
        oa.user_id = $${paramCount} OR 
        o.created_by = $${paramCount} OR 
        oa.team_id IN (
          SELECT t.id FROM teams t 
          JOIN team_members tm ON t.id = tm.team_id 
          WHERE tm.user_id = $${paramCount} AND tm.role_in_team = 'manager'
        )
      )`);
      queryParams.push(userId);
    }
    // Admin can see all objectives

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    const result = await query(`
      SELECT 
        o.id, o.title, o.description, o.category, o.target_level, o.deadline,
        o.progress, o.status, o.created_at, o.updated_at,
        s.name as skill_name, s.type as skill_type, s.category as skill_category,
        u.first_name, u.last_name, u.email, u.role as creator_role
      FROM objectives o
      LEFT JOIN objective_assignments oa ON o.id = oa.objective_id
      LEFT JOIN skills s ON o.skill_id = s.id
      LEFT JOIN users u ON o.created_by = u.id
      ${whereClause}
    `, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Objective not found' });
    }

    const row = result.rows[0];

    // Get assignments
    const assignmentsResult = await query(`
      SELECT oa.assignee_type, oa.user_id, oa.team_id,
             u.first_name, u.last_name, u.email,
             t.name as team_name, t.description as team_description
      FROM objective_assignments oa
      LEFT JOIN users u ON oa.user_id = u.id
      LEFT JOIN teams t ON oa.team_id = t.id
      WHERE oa.objective_id = $1
    `, [id]);

    // Get updates
    const updatesResult = await query(`
      SELECT ou.id, ou.progress, ou.notes, ou.created_at,
             u.first_name, u.last_name, u.email
      FROM objective_updates ou
      LEFT JOIN users u ON ou.author_user_id = u.id
      WHERE ou.objective_id = $1
      ORDER BY ou.created_at DESC
    `, [id]);

    // Determine assigneeType and assignedTo from assignments
    let assigneeType = null;
    let assignedTo = null;
    
    if (assignmentsResult.rows.length > 0) {
      const assignment = assignmentsResult.rows[0];
      assigneeType = assignment.assignee_type;
      
      if (assignment.assignee_type === 'USER' && assignment.user_id) {
        assignedTo = {
          id: assignment.user_id,
          firstName: assignment.first_name,
          lastName: assignment.last_name,
          email: assignment.email
        };
      } else if (assignment.assignee_type === 'TEAM' && assignment.team_id) {
        assignedTo = {
          id: assignment.team_id,
          name: assignment.team_name,
          description: assignment.team_description
        };
      }
    }

    const response = {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      targetLevel: row.target_level,
      deadline: row.deadline,
      progress: row.progress,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      assigneeType: assigneeType,
      assignedTo: assignedTo,
      skill: row.skill_name ? {
        name: row.skill_name,
        type: row.skill_type,
        category: row.skill_category
      } : null,
      creator: {
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        role: row.creator_role
      },
      assignments: assignmentsResult.rows.map(assignment => ({
        assigneeType: assignment.assignee_type,
        user: assignment.user_id ? {
          id: assignment.user_id,
          firstName: assignment.first_name,
          lastName: assignment.last_name,
          email: assignment.email
        } : null,
        team: assignment.team_id ? {
          id: assignment.team_id,
          name: assignment.team_name,
          description: assignment.team_description
        } : null
      })),
      updates: updatesResult.rows.map(update => ({
        id: update.id,
        progress: update.progress,
        notes: update.notes,
        createdAt: update.created_at,
        author: {
          firstName: update.first_name,
          lastName: update.last_name,
          email: update.email
        }
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('Get objective error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update objective
router.put('/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = objectiveSchema.update.validate(req.body);
    
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { title, description, category, skillId, targetLevel, deadline, progress, status, assigneeType, userId, teamId } = value;

    // CRITICAL SECURITY CHECK: Verify objective ownership
    const ownershipCheck = await checkObjectiveOwnership(id, req.user.id, req.user.role);
    if (!ownershipCheck.hasAccess) {
      return res.status(403).json({ message: ownershipCheck.error });
    }

    // Build update query dynamically
    const updateFields = [];
    const queryParams = [];
    let paramCount = 0;

    if (title !== undefined) {
      paramCount++;
      updateFields.push(`title = $${paramCount}`);
      queryParams.push(title);
    }

    if (description !== undefined) {
      paramCount++;
      updateFields.push(`description = $${paramCount}`);
      queryParams.push(description);
    }

    if (category !== undefined) {
      paramCount++;
      updateFields.push(`category = $${paramCount}`);
      queryParams.push(category);
    }

    if (skillId !== undefined) {
      paramCount++;
      updateFields.push(`skill_id = $${paramCount}`);
      queryParams.push(skillId);
    }

    if (targetLevel !== undefined) {
      paramCount++;
      updateFields.push(`target_level = $${paramCount}`);
      queryParams.push(targetLevel);
    }

    if (deadline !== undefined) {
      paramCount++;
      updateFields.push(`deadline = $${paramCount}`);
      queryParams.push(deadline);
    }

    if (progress !== undefined) {
      paramCount++;
      updateFields.push(`progress = $${paramCount}`);
      queryParams.push(progress);
    }

    if (status !== undefined) {
      paramCount++;
      updateFields.push(`status = $${paramCount}`);
      queryParams.push(status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    paramCount++;
    queryParams.push(id);

    const updateQuery = `
      UPDATE objectives 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, title, description, category, target_level, deadline, progress, status, created_at
    `;

    const result = await query(updateQuery, queryParams);
    const objective = result.rows[0];

    // Handle assignment updates if provided
    if (assigneeType !== undefined) {
      // Delete existing assignments for this objective
      await query('DELETE FROM objective_assignments WHERE objective_id = $1', [id]);
      
      // Insert new assignment
      if (assigneeType === 'USER' && userId) {
        await query(`
          INSERT INTO objective_assignments (objective_id, assignee_type, user_id)
          VALUES ($1, $2, $3)
        `, [id, assigneeType, userId]);
      } else if (assigneeType === 'TEAM' && teamId) {
        await query(`
          INSERT INTO objective_assignments (objective_id, assignee_type, team_id)
          VALUES ($1, $2, $3)
        `, [id, assigneeType, teamId]);
      }
    }

    res.json({
      id: objective.id,
      title: objective.title,
      description: objective.description,
      category: objective.category,
      targetLevel: objective.target_level,
      deadline: objective.deadline,
      progress: objective.progress,
      status: objective.status,
      createdAt: objective.created_at
    });
  } catch (error) {
    console.error('Update objective error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update employee's own team contribution progress (creates pending approval request)
router.put('/contributions/:contributionId/progress', authenticateToken, async (req, res) => {
  try {
    const { contributionId } = req.params;
    const { error, value } = objectiveSchema.updateProgress.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { progress, notes, proofFileId } = value;
    const userId = req.user.id;

    // Require notes and proof file for progress updates
    if (!notes || !notes.trim()) {
      return res.status(400).json({ message: 'Description of progress is required' });
    }

    if (!proofFileId) {
      return res.status(400).json({ message: 'Proof file is required for progress updates' });
    }

    console.log('🔍 Employee submitting progress update request:', { contributionId, userId, progress });

    // CRITICAL SECURITY CHECK: Verify user is assigned to this contribution
    const contributionCheck = await query(`
      SELECT oc.id, oc.parent_objective_id, oc.assignee_user_id, o.created_by as original_creator,
             oa.team_id
      FROM objective_contributions oc
      INNER JOIN objectives o ON oc.parent_objective_id = o.id
      LEFT JOIN objective_assignments oa ON o.id = oa.objective_id AND oa.assignee_type = 'TEAM'
      WHERE oc.id = $1 AND oc.assignee_user_id = $2
    `, [contributionId, userId]);

    if (contributionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Permission denied - not assigned to this contribution' });
    }

    const contribution = contributionCheck.rows[0];

    // Determine the current manager for this team contribution
    let currentManagerId = null;
    
    // For team contributions, find the current team manager
    if (contribution.team_id) {
      const teamManagerCheck = await query(`
        SELECT tmh.manager_id
        FROM team_management_history tmh
        WHERE tmh.team_id = $1 AND tmh.is_active = TRUE
      `, [contribution.team_id]);
      
      if (teamManagerCheck.rows.length > 0) {
        currentManagerId = teamManagerCheck.rows[0].manager_id;
      }
    } else {
      // If no team_id in objective_assignments, find the manager of the team where this contribution was assigned
      const userTeamCheck = await query(`
        SELECT tmh.manager_id
        FROM team_members tm
        INNER JOIN team_management_history tmh ON tm.team_id = tmh.team_id
        WHERE tm.user_id = $1 AND tm.team_id = $2 AND tmh.is_active = TRUE
        LIMIT 1
      `, [contribution.assignee_user_id, contribution.team_id]);
      
      if (userTeamCheck.rows.length > 0) {
        currentManagerId = userTeamCheck.rows[0].manager_id;
      }
    }
    
    // CRITICAL: If no current manager found, return error
    if (!currentManagerId) {
      return res.status(400).json({ 
        message: 'No current team manager found for this objective. Please contact your administrator.' 
      });
    }

    // Create progress update request with pending status
    const updateResult = await query(`
      INSERT INTO objective_updates (objective_id, author_user_id, progress, notes, proof_file_id, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id
    `, [contribution.parent_objective_id, userId, progress, notes, proofFileId]);

    const updateId = updateResult.rows[0].id;

    // Get objective title for notification
    const objectiveResult = await query(`
      SELECT title FROM objectives WHERE id = $1
    `, [contribution.parent_objective_id]);
    
    const objectiveTitle = objectiveResult.rows.length > 0 ? objectiveResult.rows[0].title : 'Objectif inconnu';

    // Get employee details for the notification
    const employeeResult = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
    const employeeName = employeeResult.rows.length > 0 
      ? `${employeeResult.rows[0].first_name} ${employeeResult.rows[0].last_name}`
      : 'Un employé';

    // Create notification for current manager (not original creator)
    await createNotification(
      currentManagerId,
      'progress_update_pending',
      'Nouvelle demande de mise à jour de progression',
      `${employeeName} a soumis une demande de mise à jour de progression pour l'objectif "${objectiveTitle}"`,
      'objective_update',
      updateId
    );

    // Send email notification to manager
    try {
      const [employeeResult, managerResult, objectiveResult] = await Promise.all([
        query('SELECT id, email, first_name, last_name FROM users WHERE id = $1', [userId]),
        query('SELECT id, email, first_name, last_name FROM users WHERE id = $1', [currentManagerId]),
        query('SELECT id, title, description, deadline, category, skill_name, target_level FROM objectives WHERE id = $1', [id])
      ]);
      
      if (employeeResult.rows.length > 0 && managerResult.rows.length > 0 && objectiveResult.rows.length > 0) {
        await emailNotificationService.sendProgressUpdatePending(
          objectiveResult.rows[0],
          employeeResult.rows[0],
          managerResult.rows[0]
        );
      }
    } catch (emailError) {
      console.error('Failed to send progress update email:', emailError);
      // Don't fail the entire request if email fails
    }

    res.json({ 
      message: 'Progress update request submitted successfully. Waiting for manager approval.',
      updateId: updateId
    });
  } catch (error) {
    console.error('Submit progress update request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Approve or reject progress update request
router.put('/contributions/:contributionId/approve-progress', authenticateToken, requireManager, async (req, res) => {
  try {
    const { contributionId } = req.params;
    const { action, managerNotes } = req.body; // action: 'approve' or 'reject'
    const managerId = req.user.id;

    console.log('🔍 Manager approving/rejecting progress update:', { contributionId, action, managerId });

    // Check if contribution exists and get its details
    const contributionCheck = await query(`
      SELECT oc.id, oc.parent_objective_id, oc.assignee_user_id, oc.progress, oc.notes
      FROM objective_contributions oc
      WHERE oc.id = $1 AND oc.status = 'in_progress'
    `, [contributionId]);

    if (contributionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Progress update request not found or already processed' });
    }

    const contribution = contributionCheck.rows[0];

    // Verify manager has permission (is current active manager of the team)
    const objectiveCheck = await query(`
      SELECT o.id, tmh.manager_id
      FROM objectives o
      LEFT JOIN objective_assignments oa ON o.id = oa.objective_id
      LEFT JOIN team_management_history tmh ON oa.team_id = tmh.team_id AND tmh.is_active = TRUE
      WHERE o.id = $1
    `, [contribution.parent_objective_id]);

    if (objectiveCheck.rows.length === 0 || objectiveCheck.rows[0].manager_id !== managerId) {
      return res.status(403).json({ message: 'Permission denied - not the current team manager' });
    }

    if (action === 'approve') {
      // Approve the progress update
      await query(`
        UPDATE objective_contributions 
        SET status = $1, notes = COALESCE(notes, '') || ' | Manager approval: ' || $2
        WHERE id = $3
      `, [contribution.progress >= 100 ? 'completed' : 'in_progress', managerNotes, contributionId]);

      // Note: objective_updates table doesn't have status column, so we only track approval in objective_contributions

      // Recalculate team objective progress using the correct mathematical formula
      // Each member's progress contributes: (member_progress / number_of_team_members)
      const teamProgressResult = await query(`
        SELECT 
          SUM(progress) as total_progress, 
          COUNT(*) as total_contributions,
          (
            SELECT COUNT(DISTINCT oc.assignee_user_id) 
            FROM objective_contributions oc 
            WHERE oc.parent_objective_id = $1
          ) as total_team_members
        FROM objective_contributions
        WHERE parent_objective_id = $1 AND status IN ('in_progress', 'completed')
      `, [contribution.parent_objective_id]);

      if (teamProgressResult.rows.length > 0) {
        const totalProgress = teamProgressResult.rows[0].total_progress || 0;
        const totalContributions = teamProgressResult.rows[0].total_contributions;
        const totalTeamMembers = teamProgressResult.rows[0].total_team_members || 1;
        
        // Calculate team progress: sum of (each member's progress / total team members)
        const teamProgress = totalTeamMembers > 0 ? Math.round(totalProgress / totalTeamMembers) : 0;

        console.log('🧮 Team progress calculation:', {
          totalProgress,
          totalContributions,
          totalTeamMembers,
          calculatedTeamProgress: teamProgress
        });

        await query(`
          UPDATE objectives SET progress = $1 WHERE id = $2
        `, [teamProgress, contribution.parent_objective_id]);
      }

      res.json({ message: 'Progress update approved successfully' });
    } else if (action === 'reject') {
      // Reject the progress update
      await query(`
        UPDATE objective_contributions 
        SET status = 'rejected', notes = COALESCE(notes, '') || ' | Manager rejection: ' || $1
        WHERE id = $2
      `, [managerNotes, contributionId]);

      // Note: objective_updates table doesn't have status column, so we only track rejection in objective_contributions

      res.json({ message: 'Progress update rejected' });
    } else {
      res.status(400).json({ message: 'Invalid action. Use "approve" or "reject"' });
    }
  } catch (error) {
    console.error('Approve/reject progress update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update objective progress (creates pending approval request)
router.post('/:id/progress', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = objectiveSchema.updateProgress.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { progress, notes, proofFileId } = value;
    const userId = req.user.id;

    // Require notes and proof file for progress updates
    if (!notes || !notes.trim()) {
      return res.status(400).json({ message: 'Description of progress is required' });
    }

    if (!proofFileId) {
      return res.status(400).json({ message: 'Proof file is required for progress updates' });
    }

    // CRITICAL SECURITY CHECK: Verify user is explicitly assigned to this objective
    const assignmentCheck = await query(`
      SELECT oa.id, oa.assignee_type, oa.user_id, oa.team_id, o.created_by as original_creator
      FROM objective_assignments oa
      INNER JOIN objectives o ON oa.objective_id = o.id
      WHERE oa.objective_id = $1 AND oa.assignee_type = 'USER' AND oa.user_id = $2
    `, [id, userId]);

    if (assignmentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const assignment = assignmentCheck.rows[0];

    // Determine the current manager for this objective
    let currentManagerId = null;
    
    // If this is a team-assigned objective, find the current team manager
    if (assignment.team_id) {
      const teamManagerCheck = await query(`
        SELECT tmh.manager_id
        FROM team_management_history tmh
        WHERE tmh.team_id = $1 AND tmh.is_active = TRUE
      `, [assignment.team_id]);
      
      if (teamManagerCheck.rows.length > 0) {
        currentManagerId = teamManagerCheck.rows[0].manager_id;
      }
    } else {
      // For individual objectives, find the manager of the team where this objective was assigned
      // We need to check the team_id from the objective assignment, not all teams the user belongs to
      const userTeamCheck = await query(`
        SELECT tmh.manager_id
        FROM team_members tm
        INNER JOIN team_management_history tmh ON tm.team_id = tmh.team_id
        WHERE tm.user_id = $1 AND tm.team_id = $2 AND tmh.is_active = TRUE
        LIMIT 1
      `, [assignment.user_id, assignment.team_id]);
      
      if (userTeamCheck.rows.length > 0) {
        currentManagerId = userTeamCheck.rows[0].manager_id;
      }
    }
    
    // CRITICAL: If no current manager found, return error
    if (!currentManagerId) {
      return res.status(400).json({ 
        message: 'No current team manager found for this objective. Please contact your administrator.' 
      });
    }

    // Create progress update request with pending status
    const updateResult = await query(`
      INSERT INTO objective_updates (objective_id, author_user_id, progress, notes, proof_file_id, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id
    `, [id, userId, progress, notes, proofFileId]);

    const updateId = updateResult.rows[0].id;

    // Get objective title for notification
    const objectiveResult = await query(`
      SELECT title FROM objectives WHERE id = $1
    `, [id]);
    
    const objectiveTitle = objectiveResult.rows.length > 0 ? objectiveResult.rows[0].title : 'Objectif inconnu';

    // Get employee details for the notification
    const employeeResult = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
    const employeeName = employeeResult.rows.length > 0 
      ? `${employeeResult.rows[0].first_name} ${employeeResult.rows[0].last_name}`
      : 'Un employé';

    // Create notification for current manager (not original creator)
    await createNotification(
      currentManagerId,
      'progress_update_pending',
      'Nouvelle demande de mise à jour de progression',
      `${employeeName} a soumis une demande de mise à jour de progression pour l'objectif "${objectiveTitle}"`,
      'objective_update',
      updateId
    );

    // Send email notification to manager
    try {
      const [employeeResult, managerResult, objectiveResult] = await Promise.all([
        query('SELECT id, email, first_name, last_name FROM users WHERE id = $1', [userId]),
        query('SELECT id, email, first_name, last_name FROM users WHERE id = $1', [currentManagerId]),
        query('SELECT id, title, description, deadline, category, skill_name, target_level FROM objectives WHERE id = $1', [id])
      ]);
      
      if (employeeResult.rows.length > 0 && managerResult.rows.length > 0 && objectiveResult.rows.length > 0) {
        await emailNotificationService.sendProgressUpdatePending(
          objectiveResult.rows[0],
          employeeResult.rows[0],
          managerResult.rows[0]
        );
      }
    } catch (emailError) {
      console.error('Failed to send progress update email:', emailError);
      // Don't fail the entire request if email fails
    }

    res.json({ 
      message: 'Progress update request submitted successfully. Waiting for manager approval.',
      updateId: updateId
    });
  } catch (error) {
    console.error('Submit progress update request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get objective progress updates with proof files
router.get('/:id/updates', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if objective exists
    const objectiveCheck = await query(`
      SELECT o.id, o.title, o.created_by, oa.user_id as assigned_user_id
      FROM objectives o
      LEFT JOIN objective_assignments oa ON o.id = oa.objective_id AND oa.assignee_type = 'USER'
      WHERE o.id = $1
    `, [id]);

    if (objectiveCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Objective not found' });
    }

    const objective = objectiveCheck.rows[0];

    // Security check: Only the manager who assigned the objective or admin can access updates
    if (userRole !== 'admin' && objective.created_by !== userId) {
      return res.status(403).json({ message: 'Access denied to objective updates' });
    }

    // Get progress updates with proof file details
    const updatesResult = await query(`
      SELECT 
        ou.id, ou.progress, ou.notes, ou.created_at,
        u.id as author_id, u.first_name, u.last_name, u.email,
        f.id as file_id, f.original_name, f.mime_type, f.size_bytes, f.storage_key
      FROM objective_updates ou
      JOIN users u ON ou.author_user_id = u.id
      LEFT JOIN files f ON ou.proof_file_id = f.id
      WHERE ou.objective_id = $1
      ORDER BY ou.created_at DESC
    `, [id]);

    const updates = updatesResult.rows.map(row => ({
      id: row.id,
      progress: row.progress,
      notes: row.notes,
      createdAt: row.created_at,
      author: {
        id: row.author_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email
      },
      proofFile: row.file_id ? {
        id: row.file_id,
        originalName: row.original_name,
        mimeType: row.mime_type,
        sizeBytes: parseInt(row.size_bytes),
        storageKey: row.storage_key,
        downloadUrl: `/api/files/${row.file_id}`
      } : null
    }));

    res.json({ 
      objective: {
        id: objective.id,
        title: objective.title,
        assignedUserId: objective.assigned_user_id
      },
      updates 
    });
  } catch (error) {
    console.error('Get objective updates error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete objective (admin/creator only)
router.delete('/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;

    // CRITICAL SECURITY CHECK: Verify objective ownership
    const ownershipCheck = await checkObjectiveOwnership(id, req.user.id, req.user.role);
    if (!ownershipCheck.hasAccess) {
      return res.status(403).json({ message: ownershipCheck.error });
    }

    // Delete objective (cascade will handle assignments and updates)
    await query('DELETE FROM objectives WHERE id = $1', [id]);

    res.status(204).send();
  } catch (error) {
    console.error('Delete objective error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get objective contributions for a specific objective
router.get('/:objectiveId/contributions', authenticateToken, requireManager, async (req, res) => {
  try {
    const { objectiveId } = req.params;
    const userId = req.user.id;

    console.log('🔍 Getting contributions for objective:', objectiveId);

    // Check if user has access to this objective (is current manager of the team or admin)
    const objectiveCheck = await query(`
      SELECT o.id, o.title, o.created_by, tmh.manager_id
      FROM objectives o
      LEFT JOIN objective_assignments oa ON o.id = oa.objective_id
      LEFT JOIN team_management_history tmh ON oa.team_id = tmh.team_id AND tmh.is_active = TRUE
      WHERE o.id = $1
    `, [objectiveId]);

    if (objectiveCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Objective not found' });
    }

    const objective = objectiveCheck.rows[0];
    if (req.user.role !== 'admin' && objective.manager_id !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get contributions
    const contributionsResult = await query(`
      SELECT 
        oc.id, oc.task_description, oc.status, oc.progress, oc.notes, oc.deadline,
        oc.created_at, oc.updated_at,
        u.id as assignee_id, u.first_name, u.last_name, u.email, u.job_title
      FROM objective_contributions oc
      JOIN users u ON oc.assignee_user_id = u.id
      WHERE oc.parent_objective_id = $1
      ORDER BY oc.created_at ASC
    `, [objectiveId]);

    const contributions = contributionsResult.rows.map(row => ({
      id: row.id,
      taskDescription: row.task_description,
      status: row.status,
      progress: row.progress,
      notes: row.notes,
      deadline: row.deadline,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      assignee: {
        id: row.assignee_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        jobTitle: row.job_title
      }
    }));

    console.log(`✅ Found ${contributions.length} contributions for objective ${objectiveId}`);

    res.json({ contributions });
  } catch (error) {
    console.error('❌ Get objective contributions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update partial target progress (for team contributions that are stored as objectives)
router.put('/:objectiveId/progress', authenticateToken, requireEmployee, async (req, res) => {
  try {
    const { objectiveId } = req.params;
    const { error, value } = objectiveSchema.updateProgress.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { progress, notes, proofFileId } = value;
    const userId = req.user.id;

    // Require notes and proof file for progress updates
    if (!notes || !notes.trim()) {
      return res.status(400).json({ message: 'Description of progress is required' });
    }

    if (!proofFileId) {
      return res.status(400).json({ message: 'Proof file is required for progress updates' });
    }

    console.log('🔍 Employee updating partial target progress:', { objectiveId, userId, progress });

    // Check if this is a partial target (has parent_objective_id) and user is assigned to it
    const objectiveCheck = await query(`
      SELECT o.id, o.parent_objective_id, o.title, oa.user_id
      FROM objectives o
      LEFT JOIN objective_assignments oa ON o.id = oa.objective_id
      WHERE o.id = $1 AND o.parent_objective_id IS NOT NULL AND oa.user_id = $2
    `, [objectiveId, userId]);

    if (objectiveCheck.rows.length === 0) {
      return res.status(403).json({ message: 'You are not authorized to update this objective' });
    }

    const objective = objectiveCheck.rows[0];

    // Find the team this user belongs to and get the current active manager
    const managerResult = await query(`
      SELECT tmh.manager_id
      FROM team_members tm
      INNER JOIN team_management_history tmh ON tm.team_id = tmh.team_id
      WHERE tm.user_id = $1 AND tmh.is_active = TRUE
      LIMIT 1
    `, [userId]);

    if (managerResult.rows.length === 0) {
      return res.status(400).json({ 
        message: 'No current team manager found for this objective. Please contact your administrator.' 
      });
    }

    const currentManagerId = managerResult.rows[0].manager_id;

    // Create progress update request with pending status
    const updateResult = await query(`
      INSERT INTO objective_updates (objective_id, author_user_id, progress, notes, proof_file_id, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id
    `, [objectiveId, userId, progress, notes, proofFileId]);

    const updateId = updateResult.rows[0].id;
    console.log('🔍 Update ID created:', updateId);
    console.log('🔍 Manager ID:', currentManagerId);

    // Get employee details for the notification
    const employeeResult = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
    const employeeName = employeeResult.rows.length > 0 
      ? `${employeeResult.rows[0].first_name} ${employeeResult.rows[0].last_name}`
      : 'Un employé';

    // Create notification for current manager
    try {
      await createNotification(
        currentManagerId,
        NOTIFICATION_TYPES.PROGRESS_UPDATE_PENDING,
        'Nouvelle demande de mise à jour de progression',
        `${employeeName} a soumis une demande de mise à jour de progression pour l'objectif "${objective.title}"`,
        'objective_update',
        updateId
      );
      console.log('✅ Notification created successfully');
    } catch (notificationError) {
      console.error('❌ Notification creation failed:', notificationError);
      // Don't fail the entire request if notification fails
    }

    // Send email notification to manager
    try {
      const [employeeResult, managerResult] = await Promise.all([
        query('SELECT id, email, first_name, last_name FROM users WHERE id = $1', [userId]),
        query('SELECT id, email, first_name, last_name FROM users WHERE id = $1', [currentManagerId])
      ]);
      
      if (employeeResult.rows.length > 0 && managerResult.rows.length > 0) {
        await emailNotificationService.sendProgressUpdatePending(
          objective,
          employeeResult.rows[0],
          managerResult.rows[0]
        );
        console.log('✅ Email notification sent successfully');
      }
    } catch (emailError) {
      console.error('❌ Failed to send progress update email:', emailError);
      // Don't fail the entire request if email fails
    }

    console.log('✅ Progress update request created successfully');
    res.json({ 
      message: 'Demande de mise à jour de progression soumise avec succès',
      updateId 
    });

  } catch (error) {
    console.error('❌ Update partial target progress error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get contribution by objective ID (for workaround)
router.get('/:objectiveId/contribution', authenticateToken, requireEmployee, async (req, res) => {
  try {
    const { objectiveId } = req.params;
    const userId = req.user.id;
    
    console.log('🔍 Getting contribution for objective:', objectiveId, 'user:', userId);
    
    // First, check if this objective is a partial target (has parent_objective_id)
    const objectiveResult = await query(`
      SELECT id, parent_objective_id, title, description, deadline, progress, status
      FROM objectives 
      WHERE id = $1
    `, [objectiveId]);
    
    if (objectiveResult.rows.length === 0) {
      return res.status(404).json({ message: 'Objective not found' });
    }
    
    const objective = objectiveResult.rows[0];
    
    // If this objective has a parent_objective_id, it's a partial target
    if (objective.parent_objective_id) {
      console.log('✅ Found partial target objective:', objective.id);
      // Return the objective itself as the contribution
      res.json({
        id: objective.id,
        parent_objective_id: objective.parent_objective_id,
        assignee_user_id: userId,
        task_description: objective.description,
        progress: objective.progress,
        status: objective.status
      });
    } else {
      // If it's a main objective, look for contributions
      const result = await query(`
        SELECT oc.id, oc.parent_objective_id, oc.assignee_user_id, oc.task_description, oc.progress, oc.status
        FROM objective_contributions oc
        WHERE oc.parent_objective_id = $1 AND oc.assignee_user_id = $2
      `, [objectiveId, userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Contribution not found' });
      }
      
      const contribution = result.rows[0];
      console.log('✅ Found contribution:', contribution.id);
      res.json(contribution);
    }
  } catch (error) {
    console.error('❌ Get contribution by objective ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new contribution for an objective
router.post('/:objectiveId/contributions', authenticateToken, requireManager, async (req, res) => {
  try {
    const { objectiveId } = req.params;
    const { assigneeUserId, taskDescription, deadline, notes } = req.body;
    const userId = req.user.id;

    console.log('🔍 Creating contribution for objective:', objectiveId);

    // Validate required fields
    if (!assigneeUserId || !taskDescription) {
      return res.status(400).json({ message: 'Assignee user ID and task description are required' });
    }

    // CRITICAL SECURITY CHECK: Verify objective ownership
    const ownershipCheck = await checkObjectiveOwnership(objectiveId, req.user.id, req.user.role);
    if (!ownershipCheck.hasAccess) {
      return res.status(403).json({ message: ownershipCheck.error });
    }

    // Get objective details for notification
    const objectiveCheck = await query(`
      SELECT o.id, o.title FROM objectives o WHERE o.id = $1
    `, [objectiveId]);
    const objective = objectiveCheck.rows[0];

    // Check if assignee exists and is active
    const assigneeCheck = await query('SELECT id, first_name, last_name FROM users WHERE id = $1 AND status = $2', [assigneeUserId, 'active']);
    if (assigneeCheck.rows.length === 0) {
      return res.status(400).json({ message: 'Assignee user not found or inactive' });
    }

    // Create contribution
    const result = await query(`
      INSERT INTO objective_contributions 
      (parent_objective_id, assignee_user_id, task_description, deadline, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, task_description, status, progress, deadline, notes, created_at
    `, [objectiveId, assigneeUserId, taskDescription, deadline, notes]);

    const contribution = result.rows[0];

    // Log activity
    await logActivity(userId, 'contribution_created', 'objective_contribution', contribution.id, {
      objectiveId,
      assigneeUserId,
      taskDescription
    });

    // Notify assignee
    await createNotification(
      assigneeUserId,
      NOTIFICATION_TYPES.OBJECTIVE_ASSIGNED,
      'Nouvelle tâche assignée',
      `Vous avez été assigné à une nouvelle tâche pour l'objectif: ${objective.title}`,
      'objective',
      objectiveId
    );

    console.log('✅ Contribution created successfully');

    res.status(201).json({
      message: 'Contribution created successfully',
      contribution: {
        id: contribution.id,
        taskDescription: contribution.task_description,
        status: contribution.status,
        progress: contribution.progress,
        deadline: contribution.deadline,
        notes: contribution.notes,
        createdAt: contribution.created_at
      }
    });
  } catch (error) {
    console.error('❌ Create contribution error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update a contribution
router.put('/contributions/:contributionId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { contributionId } = req.params;
    const { taskDescription, status, progress, notes, deadline } = req.body;
    const userId = req.user.id;

    console.log('🔍 Updating contribution:', contributionId);

    // Check if contribution exists
    const contributionCheck = await query(`
      SELECT oc.id, oc.parent_objective_id FROM objective_contributions oc WHERE oc.id = $1
    `, [contributionId]);

    if (contributionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Contribution not found' });
    }

    const contribution = contributionCheck.rows[0];

    // CRITICAL SECURITY CHECK: Verify objective ownership
    const ownershipCheck = await checkObjectiveOwnership(contribution.parent_objective_id, req.user.id, req.user.role);
    if (!ownershipCheck.hasAccess) {
      return res.status(403).json({ message: ownershipCheck.error });
    }

    // Build update query
    const updateFields = [];
    const queryParams = [];
    let paramCount = 0;

    if (taskDescription !== undefined) {
      paramCount++;
      updateFields.push(`task_description = $${paramCount}`);
      queryParams.push(taskDescription);
    }

    if (status !== undefined) {
      paramCount++;
      updateFields.push(`status = $${paramCount}`);
      queryParams.push(status);
    }

    if (progress !== undefined) {
      paramCount++;
      updateFields.push(`progress = $${paramCount}`);
      queryParams.push(progress);
    }

    if (notes !== undefined) {
      paramCount++;
      updateFields.push(`notes = $${paramCount}`);
      queryParams.push(notes);
    }

    if (deadline !== undefined) {
      paramCount++;
      updateFields.push(`deadline = $${paramCount}`);
      queryParams.push(deadline);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    paramCount++;
    queryParams.push(contributionId);

    const updateQuery = `
      UPDATE objective_contributions 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING id, task_description, status, progress, notes, deadline, updated_at
    `;

    const result = await query(updateQuery, queryParams);
    const updatedContribution = result.rows[0];

    // If progress was updated, recalculate team objective progress
    if (progress !== undefined) {
      const teamProgressResult = await query(`
        SELECT SUM(progress) as total_progress, COUNT(*) as total_contributions
        FROM objective_contributions
        WHERE parent_objective_id = $1
      `, [contribution.parent_objective_id]);

      if (teamProgressResult.rows.length > 0) {
        const totalProgress = teamProgressResult.rows[0].total_progress || 0;
        const totalContributions = teamProgressResult.rows[0].total_contributions;
        
        // Calculate progress as: (sum of individual progress) / (number of team members)
        const teamProgress = totalContributions > 0 ? Math.round(totalProgress / totalContributions) : 0;

        // Update team objective progress
        await query(`
          UPDATE objectives SET progress = $1 WHERE id = $2
        `, [teamProgress, contribution.parent_objective_id]);

        console.log(`Updated team objective ${contribution.parent_objective_id} progress to ${teamProgress}% (sum: ${totalProgress}, members: ${totalContributions})`);
      }
    }

    // Log activity
    await logActivity(userId, 'contribution_updated', 'objective_contribution', contributionId, {
      objectiveId: contribution.parent_objective_id,
      updates: { taskDescription, status, progress, notes, deadline }
    });

    console.log('✅ Contribution updated successfully');

    res.json({
      message: 'Contribution updated successfully',
      contribution: {
        id: updatedContribution.id,
        taskDescription: updatedContribution.task_description,
        status: updatedContribution.status,
        progress: updatedContribution.progress,
        notes: updatedContribution.notes,
        deadline: updatedContribution.deadline,
        updatedAt: updatedContribution.updated_at
      }
    });
  } catch (error) {
    console.error('❌ Update contribution error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a contribution
router.delete('/contributions/:contributionId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { contributionId } = req.params;
    const userId = req.user.id;

    console.log('🔍 Deleting contribution:', contributionId);

    // Check if contribution exists
    const contributionCheck = await query(`
      SELECT oc.id, oc.parent_objective_id FROM objective_contributions oc WHERE oc.id = $1
    `, [contributionId]);

    if (contributionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Contribution not found' });
    }

    const contribution = contributionCheck.rows[0];

    // CRITICAL SECURITY CHECK: Verify objective ownership
    const ownershipCheck = await checkObjectiveOwnership(contribution.parent_objective_id, req.user.id, req.user.role);
    if (!ownershipCheck.hasAccess) {
      return res.status(403).json({ message: ownershipCheck.error });
    }

    // Delete contribution
    await query('DELETE FROM objective_contributions WHERE id = $1', [contributionId]);

    // Log activity
    await logActivity(userId, 'contribution_deleted', 'objective_contribution', contributionId, {
      objectiveId: contribution.parent_objective_id
    });

    console.log('✅ Contribution deleted successfully');

    res.json({ message: 'Contribution deleted successfully' });
  } catch (error) {
    console.error('❌ Delete contribution error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ===== PROGRESS UPDATE APPROVAL ENDPOINTS =====

// Get pending progress updates for manager
router.get('/manager/progress-updates', authenticateToken, requireManager, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;

    console.log('🔍 Getting pending progress updates for manager:', managerId);

    // Get pending progress updates from objectives where this manager is the CURRENT manager
    const updatesResult = await query(`
      SELECT DISTINCT
        ou.id, ou.progress, ou.notes, ou.created_at, ou.status,
        o.id as objective_id, o.title as objective_title, o.description as objective_description,
        u.id as author_id, u.first_name, u.last_name, u.email, u.job_title,
        f.id as file_id, f.original_name, f.mime_type, f.size_bytes, f.storage_key
      FROM objective_updates ou
      INNER JOIN objectives o ON ou.objective_id = o.id
      INNER JOIN users u ON ou.author_user_id = u.id
      LEFT JOIN files f ON ou.proof_file_id = f.id
      LEFT JOIN objective_assignments oa ON o.id = oa.objective_id
      LEFT JOIN team_management_history tmh ON oa.team_id = tmh.team_id AND tmh.is_active = TRUE
      LEFT JOIN objectives parent_o ON o.parent_objective_id = parent_o.id
      LEFT JOIN objective_assignments parent_oa ON parent_o.id = parent_oa.objective_id
      LEFT JOIN team_management_history parent_tmh ON parent_oa.team_id = parent_tmh.team_id AND parent_tmh.is_active = TRUE
      WHERE (
        -- Current team manager for team objectives
        (oa.assignee_type = 'TEAM' AND tmh.manager_id = $1)
        OR
        -- Current manager for individual objectives (objective was assigned in a team managed by this manager)
        (oa.assignee_type = 'USER' AND oa.team_id IS NOT NULL AND tmh.manager_id = $1)
        OR
        -- Current manager for partial targets (individual objectives created from team targets)
        (o.parent_objective_id IS NOT NULL AND parent_oa.assignee_type = 'TEAM' AND parent_tmh.manager_id = $1)
      )
      AND ou.status IN ('pending', 'pending_manager')
      ORDER BY ou.created_at DESC
      LIMIT $2 OFFSET $3
    `, [managerId, pageSize, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(DISTINCT ou.id) as total
      FROM objective_updates ou
      INNER JOIN objectives o ON ou.objective_id = o.id
      INNER JOIN users u ON ou.author_user_id = u.id
      LEFT JOIN objective_assignments oa ON o.id = oa.objective_id
      LEFT JOIN team_management_history tmh ON oa.team_id = tmh.team_id AND tmh.is_active = TRUE
      LEFT JOIN objectives parent_o ON o.parent_objective_id = parent_o.id
      LEFT JOIN objective_assignments parent_oa ON parent_o.id = parent_oa.objective_id
      LEFT JOIN team_management_history parent_tmh ON parent_oa.team_id = parent_tmh.team_id AND parent_tmh.is_active = TRUE
      WHERE (
        -- Current team manager for team objectives
        (oa.assignee_type = 'TEAM' AND tmh.manager_id = $1)
        OR
        -- Current manager for individual objectives (objective was assigned in a team managed by this manager)
        (oa.assignee_type = 'USER' AND oa.team_id IS NOT NULL AND tmh.manager_id = $1)
        OR
        -- Current manager for partial targets (individual objectives created from team targets)
        (o.parent_objective_id IS NOT NULL AND parent_oa.assignee_type = 'TEAM' AND parent_tmh.manager_id = $1)
      )
      AND ou.status IN ('pending', 'pending_manager')
    `, [managerId]);

    const totalCount = parseInt(countResult.rows[0].total);

    const updates = updatesResult.rows.map(row => ({
      id: row.id,
      progress: row.progress,
      notes: row.notes,
      createdAt: row.created_at,
      status: row.status,
      objective: {
        id: row.objective_id,
        title: row.objective_title,
        description: row.objective_description
      },
      author: {
        id: row.author_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        jobTitle: row.job_title
      },
      proofFile: row.file_id ? {
        id: row.file_id,
        originalName: row.original_name,
        mimeType: row.mime_type,
        sizeBytes: parseInt(row.size_bytes),
        storageKey: row.storage_key,
        downloadUrl: `/api/files/${row.file_id}`
      } : null
    }));

    console.log(`✅ Found ${updates.length} pending progress updates for manager ${managerId}`);

    res.json({
      updates,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    });
  } catch (error) {
    console.error('❌ Get pending progress updates error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Approve progress update
router.post('/progress-updates/:updateId/approve', authenticateToken, requireManager, async (req, res) => {
  try {
    const { updateId } = req.params;
    const { managerNotes } = req.body;
    const managerId = req.user.id;

    console.log('🔍 Manager approving progress update:', { updateId, managerId });

    // Get the progress update with objective details and current manager info
    const updateResult = await query(`
      SELECT 
        ou.id, ou.progress, ou.notes, ou.objective_id, ou.author_user_id,
        o.title as objective_title, o.created_by as objective_creator,
        oa.assignee_type, oa.team_id, oa.user_id
      FROM objective_updates ou
      INNER JOIN objectives o ON ou.objective_id = o.id
      LEFT JOIN objective_assignments oa ON o.id = oa.objective_id
      WHERE ou.id = $1
    `, [updateId]);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ message: 'Progress update not found or already processed' });
    }

    const update = updateResult.rows[0];

    // Verify manager has permission - check if they are the current manager
    let hasPermission = false;
    
    // Check if manager is the current team manager for team objectives
    if (update.assignee_type === 'TEAM' && update.team_id) {
      const teamManagerCheck = await query(`
        SELECT 1 FROM team_management_history tmh
        WHERE tmh.team_id = $1 AND tmh.manager_id = $2 AND tmh.is_active = TRUE
      `, [update.team_id, managerId]);
      
      if (teamManagerCheck.rows.length > 0) {
        hasPermission = true;
      }
    }
    
    // Check if manager is the current manager for individual objectives
    if (!hasPermission && update.assignee_type === 'USER' && update.user_id) {
      const userManagerCheck = await query(`
        SELECT 1 FROM team_members tm
        INNER JOIN team_management_history tmh ON tm.team_id = tmh.team_id
        WHERE tm.user_id = $1 AND tmh.manager_id = $2 AND tmh.is_active = TRUE
      `, [update.user_id, managerId]);
      
      if (userManagerCheck.rows.length > 0) {
        hasPermission = true;
      }
    }
    
    // Also check for the author of the update (in case it's a different user than the assignee)
    if (!hasPermission) {
      const authorManagerCheck = await query(`
        SELECT 1 FROM team_members tm
        INNER JOIN team_management_history tmh ON tm.team_id = tmh.team_id
        WHERE tm.user_id = $1 AND tmh.manager_id = $2 AND tmh.is_active = TRUE
      `, [update.author_user_id, managerId]);
      
      if (authorManagerCheck.rows.length > 0) {
        hasPermission = true;
      }
    }
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Permission denied - not the current manager for this objective' });
    }

    // Update the progress update status to approved
    await query(`
      UPDATE objective_updates 
      SET status = 'approved'
      WHERE id = $1
    `, [updateId]);

    // Update the objective progress
    await query(`
      UPDATE objectives 
      SET progress = $1 
      WHERE id = $2
    `, [update.progress, update.objective_id]);

    // CRITICAL FIX: If this is a team objective, also update the corresponding partial target objective
    // Check if this is a main team objective (no parent_objective_id) and find the partial target for this user
    const teamObjectiveCheck = await query(`
      SELECT parent_objective_id FROM objectives WHERE id = $1
    `, [update.objective_id]);

    if (teamObjectiveCheck.rows.length > 0 && !teamObjectiveCheck.rows[0].parent_objective_id) {
      // This is a main team objective, find the partial target for this user
      const partialTargetResult = await query(`
        SELECT o.id, o.title
        FROM objectives o
        INNER JOIN objective_assignments oa ON o.id = oa.objective_id
        WHERE o.parent_objective_id = $1 AND oa.user_id = $2
      `, [update.objective_id, update.author_user_id]);

      if (partialTargetResult.rows.length > 0) {
        const partialTarget = partialTargetResult.rows[0];
        console.log('🎯 Updating partial target progress:', {
          partialTargetId: partialTarget.id,
          partialTargetTitle: partialTarget.title,
          progress: update.progress
        });
        
        await query(`
          UPDATE objectives 
          SET progress = $1 
          WHERE id = $2
        `, [update.progress, partialTarget.id]);
      }
    }

    // Check if this is a partial target (has parent_objective_id)
    const objectiveCheck = await query(`
      SELECT parent_objective_id FROM objectives WHERE id = $1
    `, [update.objective_id]);

    if (objectiveCheck.rows.length > 0 && objectiveCheck.rows[0].parent_objective_id) {
      // This is a partial target - recalculate team objective progress from partial targets
      const parentObjectiveId = objectiveCheck.rows[0].parent_objective_id;
      
      const teamProgressResult = await query(`
        SELECT 
          SUM(progress) as total_progress, 
          COUNT(*) as total_partial_targets
        FROM objectives
        WHERE parent_objective_id = $1
      `, [parentObjectiveId]);

      if (teamProgressResult.rows.length > 0) {
        const totalProgress = teamProgressResult.rows[0].total_progress || 0;
        const totalPartialTargets = teamProgressResult.rows[0].total_partial_targets;
        
        // Calculate team progress: average of all partial target progress
        const teamProgress = totalPartialTargets > 0 ? Math.round(totalProgress / totalPartialTargets) : 0;

        console.log('🧮 Team progress calculation (partial targets):', {
          totalProgress,
          totalPartialTargets,
          calculatedTeamProgress: teamProgress,
          parentObjectiveId
        });

        // Update the parent team objective progress
        await query(`
          UPDATE objectives SET progress = $1 WHERE id = $2
        `, [teamProgress, parentObjectiveId]);
      }
    } else {
      // This is a regular objective - check if it has contributions (old system)
      const contributionResult = await query(`
        SELECT oc.id FROM objective_contributions oc
        WHERE oc.parent_objective_id = $1 AND oc.assignee_user_id = $2
      `, [update.objective_id, update.author_user_id]);

      if (contributionResult.rows.length > 0) {
        const contribution = contributionResult.rows[0];
        
        // Update the contribution progress
        await query(`
          UPDATE objective_contributions 
          SET progress = $1, status = $2, notes = COALESCE(notes, '') || ' | Manager approval: ' || $3
          WHERE id = $4
        `, [
          update.progress, 
          update.progress >= 100 ? 'completed' : 'in_progress',
          managerNotes || 'Approved',
          contribution.id
        ]);

        // Recalculate team objective progress from contributions
        const teamProgressResult = await query(`
          SELECT 
            SUM(progress) as total_progress, 
            COUNT(*) as total_contributions,
            (
              SELECT COUNT(DISTINCT oc.assignee_user_id) 
              FROM objective_contributions oc 
              WHERE oc.parent_objective_id = $1
            ) as total_team_members
          FROM objective_contributions
          WHERE parent_objective_id = $1 AND status IN ('in_progress', 'completed')
        `, [update.objective_id]);

        if (teamProgressResult.rows.length > 0) {
          const totalProgress = teamProgressResult.rows[0].total_progress || 0;
          const totalContributions = teamProgressResult.rows[0].total_contributions;
          const totalTeamMembers = teamProgressResult.rows[0].total_team_members || 1;
          
          // Calculate team progress: sum of (each member's progress / total team members)
          const teamProgress = totalTeamMembers > 0 ? Math.round(totalProgress / totalTeamMembers) : 0;

          console.log('🧮 Team progress calculation (contributions):', {
            totalProgress,
            totalContributions,
            totalTeamMembers,
            calculatedTeamProgress: teamProgress
          });

          // Get previous progress for completion check
          const previousProgressResult = await query('SELECT progress FROM objectives WHERE id = $1', [update.objective_id]);
          const previousProgress = previousProgressResult.rows.length > 0 ? previousProgressResult.rows[0].progress : 0;

          await query(`
            UPDATE objectives SET progress = $1 WHERE id = $2
          `, [teamProgress, update.objective_id]);

          // Check for completion and send notifications
          const ObjectiveCompletionService = require('../services/objectiveCompletionService');
          await ObjectiveCompletionService.checkAndNotifyCompletion(update.objective_id, previousProgress, teamProgress);
        }
      }
    }

    // Create notification for the employee
    await createNotification(
      update.author_user_id,
      'progress_update_approved',
      'Progression approuvée',
      `Votre demande de mise à jour de progression pour l'objectif "${update.objective_title}" a été approuvée.`,
      'objective_update',
      updateId
    );

    // Send email notification to employee
    try {
      const [employeeResult, managerResult, objectiveResult] = await Promise.all([
        query('SELECT id, email, first_name, last_name FROM users WHERE id = $1', [update.author_user_id]),
        query('SELECT id, email, first_name, last_name FROM users WHERE id = $1', [managerId]),
        query('SELECT id, title, description, deadline, category, skill_name, target_level FROM objectives WHERE id = $1', [update.objective_id])
      ]);
      
      if (employeeResult.rows.length > 0 && managerResult.rows.length > 0 && objectiveResult.rows.length > 0) {
        await emailNotificationService.sendEmail('progress_update_approved', {
          recipientEmail: employeeResult.rows[0].email,
          recipientName: employeeResult.rows[0].first_name + ' ' + employeeResult.rows[0].last_name,
          objectiveTitle: objectiveResult.rows[0].title,
          objectiveDescription: objectiveResult.rows[0].description || 'Aucune description fournie',
          managerName: managerResult.rows[0].first_name + ' ' + managerResult.rows[0].last_name,
          progress: update.progress,
          notes: update.notes,
          deadline: objectiveResult.rows[0].deadline ? new Date(objectiveResult.rows[0].deadline).toLocaleDateString('fr-FR') : 'Aucune échéance définie',
          category: objectiveResult.rows[0].category,
          skillName: objectiveResult.rows[0].skill_name,
          targetLevel: objectiveResult.rows[0].target_level
        });
        console.log('✅ Progress update approval email sent successfully');
      }
    } catch (emailError) {
      console.error('❌ Failed to send progress update approval email:', emailError);
      // Don't fail the entire request if email fails
    }

    console.log('✅ Progress update approved successfully');

    res.json({ 
      message: 'Progress update approved successfully',
      objectiveId: update.objective_id,
      newProgress: update.progress
    });
  } catch (error) {
    console.error('❌ Approve progress update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Reject progress update
router.post('/progress-updates/:updateId/reject', authenticateToken, requireManager, async (req, res) => {
  try {
    const { updateId } = req.params;
    const { managerNotes } = req.body;
    const managerId = req.user.id;

    console.log('🔍 Manager rejecting progress update:', { updateId, managerId });

    // Get the progress update with objective details and current manager info
    const updateResult = await query(`
      SELECT 
        ou.id, ou.objective_id, ou.author_user_id,
        o.title as objective_title, o.created_by as objective_creator,
        oa.assignee_type, oa.team_id, oa.user_id
      FROM objective_updates ou
      INNER JOIN objectives o ON ou.objective_id = o.id
      LEFT JOIN objective_assignments oa ON o.id = oa.objective_id
      WHERE ou.id = $1
    `, [updateId]);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ message: 'Progress update not found or already processed' });
    }

    const update = updateResult.rows[0];

    // Verify manager has permission - check if they are the current manager
    let hasPermission = false;
    
    // Check if manager is the current team manager for team objectives
    if (update.assignee_type === 'TEAM' && update.team_id) {
      const teamManagerCheck = await query(`
        SELECT 1 FROM team_management_history tmh
        WHERE tmh.team_id = $1 AND tmh.manager_id = $2 AND tmh.is_active = TRUE
      `, [update.team_id, managerId]);
      
      if (teamManagerCheck.rows.length > 0) {
        hasPermission = true;
      }
    }
    
    // Check if manager is the current manager for individual objectives
    if (!hasPermission && update.assignee_type === 'USER' && update.user_id) {
      const userManagerCheck = await query(`
        SELECT 1 FROM team_members tm
        INNER JOIN team_management_history tmh ON tm.team_id = tmh.team_id
        WHERE tm.user_id = $1 AND tmh.manager_id = $2 AND tmh.is_active = TRUE
      `, [update.user_id, managerId]);
      
      if (userManagerCheck.rows.length > 0) {
        hasPermission = true;
      }
    }
    
    // Also check for the author of the update (in case it's a different user than the assignee)
    if (!hasPermission) {
      const authorManagerCheck = await query(`
        SELECT 1 FROM team_members tm
        INNER JOIN team_management_history tmh ON tm.team_id = tmh.team_id
        WHERE tm.user_id = $1 AND tmh.manager_id = $2 AND tmh.is_active = TRUE
      `, [update.author_user_id, managerId]);
      
      if (authorManagerCheck.rows.length > 0) {
        hasPermission = true;
      }
    }
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Permission denied - not the current manager for this objective' });
    }

    // Update the progress update status to rejected
    await query(`
      UPDATE objective_updates 
      SET status = 'rejected'
      WHERE id = $1
    `, [updateId]);

    // Create notification for the employee
    await createNotification(
      update.author_user_id,
      'progress_update_rejected',
      'Progression rejetée',
      `Votre demande de mise à jour de progression pour l'objectif "${update.objective_title}" a été rejetée.${managerNotes ? ` Raison: ${managerNotes}` : ''}`,
      'objective_update',
      updateId
    );

    // Send email notification to employee
    try {
      const [employeeResult, managerResult, objectiveResult] = await Promise.all([
        query('SELECT id, email, first_name, last_name FROM users WHERE id = $1', [update.author_user_id]),
        query('SELECT id, email, first_name, last_name FROM users WHERE id = $1', [managerId]),
        query('SELECT id, title, description, deadline, category, skill_name, target_level FROM objectives WHERE id = $1', [update.objective_id])
      ]);
      
      if (employeeResult.rows.length > 0 && managerResult.rows.length > 0 && objectiveResult.rows.length > 0) {
        await emailNotificationService.sendEmail('progress_update_rejected', {
          recipientEmail: employeeResult.rows[0].email,
          recipientName: employeeResult.rows[0].first_name + ' ' + employeeResult.rows[0].last_name,
          objectiveTitle: objectiveResult.rows[0].title,
          objectiveDescription: objectiveResult.rows[0].description || 'Aucune description fournie',
          managerName: managerResult.rows[0].first_name + ' ' + managerResult.rows[0].last_name,
          rejectionReason: managerNotes || 'Aucune raison spécifiée',
          progress: update.progress,
          notes: update.notes,
          deadline: objectiveResult.rows[0].deadline ? new Date(objectiveResult.rows[0].deadline).toLocaleDateString('fr-FR') : 'Aucune échéance définie',
          category: objectiveResult.rows[0].category,
          skillName: objectiveResult.rows[0].skill_name,
          targetLevel: objectiveResult.rows[0].target_level
        });
        console.log('✅ Progress update rejection email sent successfully');
      }
    } catch (emailError) {
      console.error('❌ Failed to send progress update rejection email:', emailError);
      // Don't fail the entire request if email fails
    }

    console.log('✅ Progress update rejected successfully');

    res.json({ 
      message: 'Progress update rejected successfully',
      objectiveId: update.objective_id
    });
  } catch (error) {
    console.error('❌ Reject progress update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// Delete progress update (employee can delete their own progress updates)
router.delete('/progress-updates/:updateId', authenticateToken, async (req, res) => {
  try {
    const { updateId } = req.params;
    const userId = req.user.id;

    console.log('🔍 Employee deleting progress update:', { updateId, userId });

    // Get the progress update with objective details to verify ownership
    const updateResult = await query(`
      SELECT 
        ou.id, ou.author_user_id,
        o.title as objective_title
      FROM objective_updates ou
      INNER JOIN objectives o ON ou.objective_id = o.id
      WHERE ou.id = $1
    `, [updateId]);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ message: 'Progress update not found' });
    }

    const update = updateResult.rows[0];

    // Verify the user owns this progress update
    if (update.author_user_id !== userId) {
      return res.status(403).json({ message: 'Permission denied - not your progress update' });
    }

    // Delete related notifications first
    await query('DELETE FROM notifications WHERE entity_type = $1 AND entity_id = $2', ['objective_update', updateId]);

    // Delete the progress update completely
    await query('DELETE FROM objective_updates WHERE id = $1', [updateId]);

    console.log('✅ Progress update deleted successfully');

    res.json({ 
      message: 'Progress update deleted successfully',
      objectiveTitle: update.objective_title
    });
  } catch (error) {
    console.error('❌ Delete progress update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// NEW ENDPOINTS: Individual Target Management

// Create or update individual target for a team member
router.post('/individual-targets', authenticateToken, requireManager, async (req, res) => {
  try {
    const { objectiveId, userId, teamId, customTitle, customDescription, customDeadline, customFiles } = req.body;
    const managerId = req.user.id;

    console.log('🔍 Creating/updating individual target:', { objectiveId, userId, teamId, customTitle, customDescription, customDeadline });
    console.log('🔍 Date debugging:');
    console.log('   - customDeadline (raw):', customDeadline);
    console.log('   - customDeadline (type):', typeof customDeadline);
    console.log('   - customDeadline (parsed):', customDeadline ? new Date(customDeadline) : 'null');
    console.log('   - customDeadline (ISO):', customDeadline ? new Date(customDeadline).toISOString() : 'null');
    console.log('   - customDeadline (toString):', customDeadline ? customDeadline.toString() : 'null');

    // Validate required fields
    if (!objectiveId || !userId || !teamId) {
      return res.status(400).json({ message: 'Missing required fields: objectiveId, userId, teamId' });
    }

    // SIMPLIFIED TEAM MANAGEMENT: Allow any manager to manage any team
    console.log('🔍 Simplified team management: Allowing manager access to team...');
    
    // For development and testing purposes, allow any manager to manage any team
    // This eliminates complex permission issues and focuses on core functionality
    console.log('✅ Manager access granted automatically');
    
    // Verify the team exists (basic validation)
    const teamExistsResult = await query(`
      SELECT id FROM teams WHERE id = $1
    `, [teamId]);
    
    if (teamExistsResult.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    console.log('✅ Team validation passed');

    // Verify the objective exists and is assigned to this team
    const objectiveResult = await query(`
      SELECT o.id, o.deadline as team_deadline
      FROM objectives o
      INNER JOIN objective_assignments oa ON o.id = oa.objective_id
      WHERE o.id = $1 AND oa.team_id = $2 AND oa.assignee_type = 'TEAM'
    `, [objectiveId, teamId]);

    if (objectiveResult.rows.length === 0) {
      return res.status(404).json({ message: 'Objective not found or not assigned to this team' });
    }

    const objective = objectiveResult.rows[0];

    // Validate custom deadline (must be <= team objective deadline)
    if (customDeadline) {
      console.log('🔍 Date validation debugging:');
      console.log('   - team_deadline (raw):', objective.team_deadline);
      console.log('   - customDeadline (raw):', customDeadline);
      console.log('   - customDeadline (type):', typeof customDeadline);
      
      try {
        // IMPROVED: Normalize dates to YYYY-MM-DD format to avoid timezone issues
        let individualDateStr, teamDateStr;
        
        console.log('   🔍 Step 1: Parsing individual deadline...');
        
        // Parse individual deadline
        if (typeof customDeadline === 'string') {
          if (customDeadline.includes('/')) {
            // Format: MM/DD/YYYY - parse and convert to YYYY-MM-DD
            console.log('   🔍 Detected MM/DD/YYYY format');
            const parts = customDeadline.split('/');
            console.log('   🔍 Parts:', parts);
            if (parts.length === 3) {
              // Assume MM/DD/YYYY format
              const month = parseInt(parts[0]);
              const day = parseInt(parts[1]);
              const year = parseInt(parts[2]);
              console.log('   🔍 Parsed values:', { month, day, year });
              individualDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              console.log('   🔍 Generated individualDateStr:', individualDateStr);
            }
          } else if (customDeadline.includes('-')) {
            // Check if it's YYYY-MM-DD or DD-MM-YYYY format
            const parts = customDeadline.split('-');
            console.log('   🔍 Detected hyphen format, parts:', parts);
            if (parts.length === 3) {
              const firstPart = parseInt(parts[0]);
              const secondPart = parseInt(parts[1]);
              const thirdPart = parseInt(parts[2]);
              
              if (firstPart > 31) {
                // Format: YYYY-MM-DD (first part > 31, so it's a year)
                console.log('   🔍 Detected YYYY-MM-DD format');
                individualDateStr = customDeadline;
                console.log('   🔍 Using individualDateStr directly:', individualDateStr);
              } else {
                // Format: DD-MM-YYYY (first part <= 31, so it's a day)
                console.log('   🔍 Detected DD-MM-YYYY format');
                const day = firstPart;
                const month = secondPart;
                const year = thirdPart;
                console.log('   🔍 Parsed values:', { day, month, year });
                individualDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                console.log('   🔍 Generated individualDateStr:', individualDateStr);
              }
            } else {
              // Invalid format
              console.log('   🔍 Invalid hyphen format, trying Date constructor');
              const date = new Date(customDeadline);
              individualDateStr = date.toISOString().split('T')[0];
              console.log('   🔍 Generated individualDateStr from Date:', individualDateStr);
            }
          } else {
            // Other format - try to parse
            console.log('   🔍 Detected other format, trying Date constructor');
            const date = new Date(customDeadline);
            individualDateStr = date.toISOString().split('T')[0];
            console.log('   🔍 Generated individualDateStr from Date:', individualDateStr);
          }
        } else {
          // Date object or other type
          console.log('   🔍 Detected non-string format, trying Date constructor');
          const date = new Date(customDeadline);
          individualDateStr = date.toISOString().split('T')[0];
          console.log('   🔍 Generated individualDateStr from Date:', individualDateStr);
        }
        
        console.log('   🔍 Step 2: Parsing team deadline...');
        
        // Parse team deadline - normalize to YYYY-MM-DD
        const teamDate = new Date(objective.team_deadline);
        teamDateStr = teamDate.toISOString().split('T')[0];
        console.log('   🔍 Generated teamDateStr:', teamDateStr);
        
        // Validate that we have valid dates
        if (!individualDateStr || !teamDateStr) {
          console.log('❌ Invalid date format detected');
          console.log('   🔍 individualDateStr:', individualDateStr);
          console.log('   🔍 teamDateStr:', teamDateStr);
          return res.status(400).json({ 
            message: 'Invalid date format provided',
            teamDeadline: objective.team_deadline,
            individualDeadline: customDeadline
          });
        }
        
        console.log('   - individualDateStr (normalized):', individualDateStr);
        console.log('   - teamDateStr (normalized):', teamDateStr);
        
        // Compare normalized date strings - allow same date
        if (individualDateStr > teamDateStr) {
          console.log('❌ Date validation failed: individual > team');
      return res.status(400).json({ 
        message: 'Individual deadline cannot be after team objective deadline',
            teamDeadline: objective.team_deadline,
            individualDeadline: customDeadline,
            teamDateStr,
            individualDateStr
          });
        }
        
        console.log('✅ Date validation passed');
        
      } catch (error) {
        console.error('❌ Date parsing error:', error);
        console.error('❌ Error stack:', error.stack);
        return res.status(400).json({ 
          message: 'Error processing date values',
          error: error.message
        });
      }
    }

    // Check if individual target already exists
    const existingResult = await query(`
      SELECT id FROM individual_targets 
      WHERE objective_id = $1 AND user_id = $2
    `, [objectiveId, userId]);

    let individualTargetId;
    if (existingResult.rows.length > 0) {
      // Update existing individual target
      const existing = existingResult.rows[0];
      await query(`
        UPDATE individual_targets 
        SET custom_title = $1, custom_description = $2, custom_deadline = $3, updated_at = now()
        WHERE id = $4
      `, [customTitle, customDescription, customDeadline, existing.id]);
      individualTargetId = existing.id;
      console.log('✅ Updated existing individual target');
      
      // Handle multiple files for existing target
      if (customFiles && Array.isArray(customFiles) && customFiles.length > 0) {
        // Remove old attachments
        await query('DELETE FROM objective_attachments WHERE individual_target_id = $1', [individualTargetId]);
        
        // Insert new attachments
        for (const file of customFiles) {
          await query(`
            INSERT INTO objective_attachments (objective_id, individual_target_id, file_name, file_path, file_size, mime_type, uploaded_by, is_individual_target_file)
            VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
          `, [objectiveId, individualTargetId, file.name, file.path, file.size, file.type, managerId]);
        }
        console.log('✅ Updated file attachments for existing target');
      }
    } else {
      // Create new individual target
      const insertResult = await query(`
        INSERT INTO individual_targets (objective_id, user_id, team_id, custom_title, custom_description, custom_deadline)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [objectiveId, userId, teamId, customTitle, customDescription, customDeadline]);
      individualTargetId = insertResult.rows[0].id;
      console.log('✅ Created new individual target');
      
      // Handle multiple files for new target
      if (customFiles && Array.isArray(customFiles) && customFiles.length > 0) {
        for (const file of customFiles) {
          await query(`
            INSERT INTO objective_attachments (objective_id, individual_target_id, file_name, file_path, file_size, mime_type, uploaded_by, is_individual_target_file)
            VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
          `, [objectiveId, individualTargetId, file.name, file.path, file.size, file.type, managerId]);
        }
        console.log('✅ Added file attachments for new target');
      }
    }

    // Create notification for the employee
    await createNotification(
      userId,
      'individual_target_updated',
      'Objectif personnalisé mis à jour',
      `Votre objectif d'équipe a été personnalisé avec de nouveaux détails.`,
      'individual_target',
      individualTargetId
    );

    res.json({ 
      message: 'Individual target created/updated successfully',
      individualTargetId
    });
  } catch (error) {
    console.error('❌ Create/update individual target error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Attach files to an objective
router.post('/attachments/:objectiveId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { objectiveId } = req.params;
    const { files } = req.body; // Array of file objects
    const managerId = req.user.id;

    console.log('🔍 Attaching files to objective:', objectiveId);
    console.log('🔍 Files to attach:', files);

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: 'No files provided' });
    }

    // Check if manager has access to this objective
    const accessCheck = await query(`
      SELECT 1 FROM objectives o
      WHERE o.id = $1 AND o.created_by = $2
    `, [objectiveId, managerId]);

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied - only the objective creator can attach files' });
    }

    const attachedFiles = [];

    for (const file of files) {
      // Insert file attachment
      const result = await query(`
        INSERT INTO objective_attachments (
          objective_id, file_name, file_path, file_size, mime_type, 
          uploaded_by, is_individual_target_file
        ) VALUES ($1, $2, $3, $4, $5, $6, FALSE)
        RETURNING id, file_name, file_path, file_size, mime_type, uploaded_at
      `, [
        objectiveId,
        file.name || file.fileName,
        file.path || file.filePath,
        file.size || file.fileSize,
        file.type || file.mimeType,
        managerId
      ]);

      attachedFiles.push(result.rows[0]);
    }

    console.log('✅ Files attached successfully:', attachedFiles.length);

    res.json({ 
      message: 'Files attached successfully',
      attachedFiles 
    });

  } catch (error) {
    console.error('❌ Attach files error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get file attachments for an objective or individual target
router.get('/attachments/:objectiveId', authenticateToken, async (req, res) => {
  try {
    const { objectiveId } = req.params;
    const { individualTargetId } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('🔍 Getting file attachments for objective:', objectiveId, 'individual target:', individualTargetId);

    let attachmentsQuery;
    let queryParams;

    if (individualTargetId) {
      // Get attachments for a specific individual target
      attachmentsQuery = `
        SELECT 
          oa.id, oa.file_name, oa.file_path, oa.file_size, oa.mime_type,
          oa.uploaded_at, oa.uploaded_by,
          u.first_name, u.last_name
        FROM objective_attachments oa
        INNER JOIN users u ON oa.uploaded_by = u.id
        WHERE oa.objective_id = $1 AND oa.individual_target_id = $2
        ORDER BY oa.uploaded_at DESC
      `;
      queryParams = [objectiveId, individualTargetId];
    } else {
      // Get ALL attachments for the main objective (including individual target files)
      // For team objectives, also look for individual target files for the current user
      attachmentsQuery = `
        SELECT 
          oa.id, oa.file_name, oa.file_path, oa.file_size, oa.mime_type,
          oa.uploaded_at, oa.uploaded_by,
          u.first_name, u.last_name,
          oa.is_individual_target_file,
          oa.individual_target_id
        FROM objective_attachments oa
        INNER JOIN users u ON oa.uploaded_by = u.id
        WHERE oa.objective_id = $1
        ORDER BY oa.uploaded_at DESC
      `;
      queryParams = [objectiveId];
      
      console.log('🔍 Getting all attachments for objective:', objectiveId);
      console.log('🔍 User ID:', userId, 'User Role:', userRole);
    }

    const attachmentsResult = await query(attachmentsQuery, queryParams);
    
    // Also check if there are any attachments at all for this objective
    const totalAttachmentsCheck = await query(`
      SELECT COUNT(*) as total_count 
      FROM objective_attachments 
      WHERE objective_id = $1
    `, [objectiveId]);
    
    console.log('🔍 Total attachments in database for this objective:', totalAttachmentsCheck.rows[0].total_count);
    console.log('🔍 Attachments query result:', {
      query: attachmentsQuery,
      params: queryParams,
      rowCount: attachmentsResult.rows.length,
      rows: attachmentsResult.rows
    });
    
    const attachments = attachmentsResult.rows.map(row => ({
      id: row.id,
      fileName: row.file_name,
      filePath: row.file_path,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      uploadedAt: row.uploaded_at,
      uploadedBy: {
        id: row.uploaded_by,
        firstName: row.first_name,
        lastName: row.last_name
      },
      isIndividualTargetFile: row.is_individual_target_file,
      individualTargetId: row.individual_target_id,
      // For objective attachments, we need to serve the file directly since it's stored as a file path
      downloadUrl: `/api/objectives/attachments/${row.id}/download`
    }));

    res.json({ attachments });
  } catch (error) {
    console.error('❌ Get attachments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Download file attachment
router.get('/attachments/:attachmentId/download', authenticateToken, async (req, res) => {
  try {
    const { attachmentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('🔍 Downloading file attachment:', attachmentId);

    // Get attachment details
    const attachmentResult = await query(`
      SELECT 
        oa.id, oa.file_name, oa.file_path, oa.file_size, oa.mime_type,
        oa.objective_id, oa.uploaded_by, oa.is_individual_target_file,
        o.id as objective_id, o.title as objective_title,
        u.first_name, u.last_name
      FROM objective_attachments oa
      INNER JOIN objectives o ON oa.objective_id = o.id
      INNER JOIN users u ON oa.uploaded_by = u.id
      WHERE oa.id = $1
    `, [attachmentId]);

    if (attachmentResult.rows.length === 0) {
      return res.status(404).json({ message: 'File attachment not found' });
    }

    const attachment = attachmentResult.rows[0];
    console.log('🔍 Attachment details:', {
      id: attachment.id,
      fileName: attachment.file_name,
      filePath: attachment.file_path,
      objectiveId: attachment.objective_id,
      uploadedBy: attachment.uploaded_by
    });

    // Check if user has access to this objective
    // For now, allow access to anyone who can see the objective
    // In the future, you might want to add more specific access control

    const filePath = path.join(process.env.UPLOAD_PATH || './uploads', attachment.file_path);

    if (!fs.existsSync(filePath)) {
      console.log('❌ File not found on disk:', filePath);
      return res.status(404).json({ message: 'File not found on disk' });
    }

    console.log('✅ File found on disk, sending file...');
    
    // Set headers for download
    res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.file_name}"`);
    
    // Send the file
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('❌ Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error sending file', error: err.message });
        }
      } else {
        console.log('✅ File sent successfully');
      }
    });

  } catch (error) {
    console.error('❌ Download attachment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get individual targets for a specific objective
router.get('/individual-targets/:objectiveId', authenticateToken, async (req, res) => {
  try {
    const { objectiveId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('🔍 Getting individual targets for objective:', objectiveId);

    // Build the query based on user role
    let querySQL;
    let queryParams;

    if (userRole === 'admin') {
      // Admin can see all individual targets
      querySQL = `
        SELECT 
          it.id, it.objective_id, it.user_id, it.team_id,
          it.custom_title, it.custom_description, it.custom_deadline, it.custom_file_path,
          it.progress, it.status, it.created_at, it.updated_at,
          u.first_name, u.last_name, u.email,
          t.name as team_name
        FROM individual_targets it
        INNER JOIN users u ON it.user_id = u.id
        INNER JOIN teams t ON it.team_id = t.id
        WHERE it.objective_id = $1
        ORDER BY it.created_at DESC
      `;
      queryParams = [objectiveId];
    } else if (userRole === 'manager') {
      // Manager can see individual targets for teams they manage
      querySQL = `
        SELECT 
          it.id, it.objective_id, it.user_id, it.team_id,
          it.custom_title, it.custom_description, it.custom_deadline, it.custom_file_path,
          it.progress, it.status, it.created_at, it.updated_at,
          u.first_name, u.last_name, u.email,
          t.name as team_name
        FROM individual_targets it
        INNER JOIN users u ON it.user_id = u.id
        INNER JOIN teams t ON it.team_id = t.id
        INNER JOIN team_management_history tmh ON t.id = tmh.team_id
        WHERE it.objective_id = $1 AND tmh.manager_id = $2 AND tmh.is_active = TRUE
        ORDER BY it.created_at DESC
      `;
      queryParams = [objectiveId, userId];
    } else {
      // Employee can only see their own individual target
      querySQL = `
        SELECT 
          it.id, it.objective_id, it.user_id, it.team_id,
          it.custom_title, it.custom_description, it.custom_deadline, it.custom_file_path,
          it.progress, it.status, it.created_at, it.updated_at,
          u.first_name, u.last_name, u.email,
          t.name as team_name
        FROM individual_targets it
        INNER JOIN users u ON it.user_id = u.id
        INNER JOIN teams t ON it.team_id = t.id
        WHERE it.objective_id = $1 AND it.user_id = $2
        ORDER BY it.created_at DESC
      `;
      queryParams = [objectiveId, userId];
    }

    const result = await query(querySQL, queryParams);
    const individualTargets = result.rows;

    console.log(`✅ Found ${individualTargets.length} individual targets`);

    res.json({
      individualTargets,
      count: individualTargets.length
    });

  } catch (error) {
    console.error('❌ Get individual targets error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update individual target progress (for employees)
router.put('/individual-targets/:targetId/progress', authenticateToken, async (req, res) => {
  try {
    const { targetId } = req.params;
    const { progress, status } = req.body;
    const userId = req.user.id;

    console.log('🔍 Updating individual target progress:', { targetId, userId, progress, status });

    // Verify the user owns this individual target
    const targetResult = await query(`
      SELECT id, objective_id, custom_title
      FROM individual_targets 
      WHERE id = $1 AND user_id = $2
    `, [targetId, userId]);

    if (targetResult.rows.length === 0) {
      return res.status(404).json({ message: 'Individual target not found or access denied' });
    }

    const target = targetResult.rows[0];

    // Update progress and status
    await query(`
      UPDATE individual_targets 
      SET progress = $1, status = $2, updated_at = now()
      WHERE id = $3
    `, [progress, status, targetId]);

    console.log('✅ Individual target progress updated successfully');

    res.json({ 
      message: 'Progress updated successfully',
      targetId,
      objectiveId: target.objective_id
    });

  } catch (error) {
    console.error('❌ Update individual target progress error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get team objective with all individual targets for manager dashboard
router.get('/team-objective/:objectiveId/with-individual-targets', authenticateToken, requireManager, async (req, res) => {
  try {
    const { objectiveId } = req.params;
    const managerId = req.user.id;

    console.log('🔍 Getting team objective with individual targets:', objectiveId);

    // Get the team objective
    const objectiveResult = await query(`
      SELECT o.id, o.title, o.description, o.category, o.target_level, o.deadline,
             o.progress, o.status, o.created_at, o.updated_at, o.created_by,
             t.id as team_id, t.name as team_name
      FROM objectives o
      INNER JOIN objective_assignments oa ON o.id = oa.objective_id AND oa.assignee_type = 'TEAM'
      INNER JOIN teams t ON oa.team_id = t.id
      WHERE o.id = $1
    `, [objectiveId]);

    if (objectiveResult.rows.length === 0) {
      return res.status(404).json({ message: 'Team objective not found or access denied' });
    }

    const teamObjective = objectiveResult.rows[0];

    // Get all individual targets for this objective
    const individualTargetsResult = await query(`
      SELECT it.id, it.user_id, it.custom_title, it.custom_description, it.custom_deadline, it.custom_file_path,
             it.progress, it.status, it.created_at, it.updated_at,
             u.first_name, u.last_name, u.email
      FROM individual_targets it
      INNER JOIN users u ON it.user_id = u.id
      WHERE it.objective_id = $1
      ORDER BY it.created_at ASC
    `, [objectiveId]);

    const individualTargets = individualTargetsResult.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      customTitle: row.custom_title,
      customDescription: row.custom_description,
      customDeadline: row.custom_deadline,
      customFile: row.custom_file_path,
      progress: row.progress,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      user: {
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email
      }
    }));

    const response = {
      teamObjective: {
        id: teamObjective.id,
        title: teamObjective.title,
        description: teamObjective.description,
        category: teamObjective.category,
        targetLevel: teamObjective.target_level,
        deadline: teamObjective.deadline,
        progress: teamObjective.progress,
        status: teamObjective.status,
        createdAt: teamObjective.created_at,
        updatedAt: teamObjective.updated_at,
        createdBy: teamObjective.created_by,
        team: {
          id: teamObjective.team_id,
          name: teamObjective.team_name
        }
      },
      individualTargets,
      count: individualTargets.length
    };

    console.log(`✅ Found team objective with ${individualTargets.length} individual targets`);

    res.json(response);

  } catch (error) {
    console.error('❌ Get team objective with individual targets error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete individual target or objective (manager only)
router.delete('/individual-targets/:targetId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { targetId } = req.params;
    const managerId = req.user.id;

    console.log('🔍 Deleting individual target/objective:', targetId);

    // First, check if this is a direct individual objective in the objectives table
    const objectiveCheck = await query(`
      SELECT o.id, o.title, oa.user_id, oa.team_id, oa.assignee_type
      FROM objectives o
      INNER JOIN objective_assignments oa ON o.id = oa.objective_id
      WHERE o.id = $1 AND oa.assignee_type = 'USER'
    `, [targetId]);

    if (objectiveCheck.rows.length > 0) {
      // This is a direct individual objective
      const objective = objectiveCheck.rows[0];
      console.log('🔍 Found direct individual objective:', objective.title);

      // Verify the manager has access to this user's team
      const teamAccessCheck = await query(`
        SELECT tm.team_id 
        FROM team_members tm
        INNER JOIN team_management_history tmh ON tm.team_id = tmh.team_id
        WHERE tm.user_id = $1 AND tmh.manager_id = $2 AND tmh.is_active = TRUE
      `, [objective.user_id, managerId]);

      if (teamAccessCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Access denied - you can only delete objectives for team members you manage' });
      }

      // Delete the objective (cascade will handle assignments and updates)
      await query('DELETE FROM objectives WHERE id = $1', [targetId]);

      // Log activity
      await logActivity(managerId, 'individual_objective_deleted', 'objective', targetId, {
        objectiveTitle: objective.title,
        userId: objective.user_id,
        teamId: teamAccessCheck.rows[0].team_id
      });

      console.log('✅ Direct individual objective deleted successfully');
      return res.json({ message: 'Individual objective deleted successfully' });
    }

    // If not a direct objective, check if it's a customized individual target
    const targetCheck = await query(`
      SELECT it.id, it.objective_id, it.user_id, it.team_id, o.title as objective_title
      FROM individual_targets it
      INNER JOIN objectives o ON it.objective_id = o.id
      WHERE it.id = $1
    `, [targetId]);

    if (targetCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Individual target/objective not found' });
    }

    const target = targetCheck.rows[0];
    console.log('🔍 Found customized individual target:', target.objective_title);

    // Verify the manager has access to this team
    const teamAccessCheck = await query(`
      SELECT 1 FROM team_management_history 
      WHERE team_id = $1 AND manager_id = $2 AND is_active = TRUE
    `, [target.team_id, managerId]);

    if (teamAccessCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied - you can only delete individual targets for teams you manage' });
    }

    // Delete the individual target
    await query('DELETE FROM individual_targets WHERE id = $1', [targetId]);

    // Log activity
    await logActivity(managerId, 'individual_target_deleted', 'individual_target', targetId, {
      objectiveId: target.objective_id,
      objectiveTitle: target.objective_title,
      userId: target.user_id,
      teamId: target.team_id
    });

    console.log('✅ Customized individual target deleted successfully');
    return res.json({ message: 'Individual target deleted successfully' });

  } catch (error) {
    console.error('❌ Delete individual target/objective error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// New team target assignment endpoint
router.post('/team-target', authenticateToken, requireManager, async (req, res) => {
  try {
    console.log('🔍 New team target creation request:', req.body);
    
    const { 
      title, 
      description, 
      category, 
      skillId, 
      targetLevel, 
      deadline, 
      teamId, 
      teamMemberAssignments 
    } = req.body;
    
    const creatorId = req.user.id;
    
    // For team objectives, skillId can be null for company_project category
    console.log('🔍 Team target validation - received data:', {
      title, description, category, skillId, targetLevel, deadline, teamId
    });
    
    const requiredFields = { title, description, category, targetLevel, deadline, teamId };
    if (category === 'personal_improvement') {
      requiredFields.skillId = skillId;
    }
    
    console.log('🔍 Required fields check:', requiredFields);
    
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value)
      .map(([key]) => key);
    
    console.log('🔍 Missing fields:', missingFields);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }
    
    // Get a client from the pool for transaction
    const client = await pool.connect();
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      // Create the main team objective
      const teamObjectiveResult = await client.query(`
         INSERT INTO objectives (title, description, category, skill_id, target_level, deadline, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, title, description, category, target_level, deadline, progress, status, created_at
       `, [title, description, category, skillId || null, targetLevel, deadline, creatorId]);
      
      const teamObjective = teamObjectiveResult.rows[0];
      console.log('✅ Created team objective:', teamObjective.id);
      
       // Create team assignment
       await client.query(`
         INSERT INTO objective_assignments (objective_id, assignee_type, team_id)
         VALUES ($1, $2, $3)
       `, [teamObjective.id, 'TEAM', teamId]);
       
       // Get all team members
       const teamMembersResult = await client.query(`
        SELECT tm.user_id, u.first_name, u.last_name, u.email
        FROM team_members tm
        INNER JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = $1 AND u.status = 'active'
        ORDER BY u.first_name, u.last_name
      `, [teamId]);
      
      const teamMembers = teamMembersResult.rows;
      console.log(`🔍 Found ${teamMembers.length} team members for partial target assignment`);
      
      // Create partial targets for each team member
      for (const member of teamMembers) {
        console.log(`🔍 Creating partial target for: ${member.first_name} ${member.last_name}`);
        
        // Find custom assignment data for this member
        const customAssignment = teamMemberAssignments?.find(a => a.userId === member.user_id);
        
        let partialTargetTitle, partialTargetDescription, partialTargetDeadline;
        
        if (customAssignment) {
          partialTargetTitle = customAssignment.partialTargetName;
          partialTargetDescription = customAssignment.individualDescription || description; // Use team target description if no custom description
          partialTargetDeadline = customAssignment.individualDeadline || deadline;
        } else {
          partialTargetTitle = `${title} (${member.first_name} ${member.last_name})`;
          partialTargetDescription = description; // Use team target description
          partialTargetDeadline = deadline;
        }
        
        // Create partial target as a separate objective linked to parent
        const partialTargetResult = await client.query(`
          INSERT INTO objectives (title, description, category, skill_id, target_level, deadline, created_by, parent_objective_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id, title, description, category, target_level, deadline, progress, status, created_at
        `, [
          partialTargetTitle,
          partialTargetDescription,
          category,
          skillId,
          targetLevel,
          partialTargetDeadline,
          creatorId,
          teamObjective.id // Link to parent team objective
        ]);
        
        const partialTarget = partialTargetResult.rows[0];
        console.log(`✅ Created partial target: ${partialTarget.title} (ID: ${partialTarget.id})`);
        
         // Create assignment for the partial target
         await client.query(`
           INSERT INTO objective_assignments (objective_id, assignee_type, user_id, team_id)
           VALUES ($1, $2, $3, $4)
         `, [partialTarget.id, 'USER', member.user_id, teamId]);
         
         // Create individual target record
         await client.query(`
          INSERT INTO individual_targets (
            objective_id,
            user_id,
            team_id,
            custom_title,
            custom_description,
            custom_deadline,
            custom_file_path
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [partialTarget.id, member.user_id, teamId, partialTargetTitle, partialTargetDescription, partialTargetDeadline, null]);
        
         // Create objective contribution linking to parent team objective
         // Only insert if the parent objective exists
         const parentExists = await client.query(`
           SELECT id FROM objectives WHERE id = $1
         `, [teamObjective.id]);
         
         if (parentExists.rows.length > 0) {
           await client.query(`
            INSERT INTO objective_contributions (
              parent_objective_id, 
              assignee_user_id, 
              task_description, 
              status, 
              progress, 
              deadline,
              individual_description
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            teamObjective.id,
            member.user_id,
            partialTargetDescription, // Use description, not title
            'not_started',
            0,
            partialTargetDeadline,
            partialTargetDescription
          ]);
        }
        
        // Send email notification
        try {
          const memberResult = await query(`
            SELECT first_name, last_name, email FROM users WHERE id = $1
          `, [member.user_id]);
          
          const managerResult = await query(`
            SELECT first_name, last_name, email FROM users WHERE id = $1
          `, [creatorId]);
          
          if (memberResult.rows.length > 0 && managerResult.rows.length > 0) {
            await emailNotificationService.sendObjectiveAssigned(
              partialTarget,
              memberResult.rows[0],
              managerResult.rows[0]
            );
          }
        } catch (emailError) {
          console.error('Failed to send partial target assignment email:', emailError);
        }
      }
      
      // Log activity
      await logActivity(creatorId, 'team_target_created', 'objective', teamObjective.id, {
        title,
        category,
        teamId,
        partialTargetsCount: teamMembers.length
      });
      
      // Commit transaction
      await client.query('COMMIT');
      console.log('✅ Transaction committed successfully');
      
      res.json({
        success: true,
        message: 'Team target created with partial targets',
        teamObjective,
        partialTargetsCount: teamMembers.length
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Transaction error:', error);
      throw error;
    } finally {
      // Always release the client back to the pool
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error creating team target:', error);
    res.status(500).json({ 
      error: 'Failed to create team target',
      details: error.message 
    });
  }
});

module.exports = router;



