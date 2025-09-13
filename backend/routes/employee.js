const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireEmployee } = require('../middleware/auth');

const router = express.Router();

// Get employee's organization data (departments, teams, colleagues)
router.get('/my-organization', authenticateToken, requireEmployee, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('🔍 Getting organization data for employee:', userId);

    // Get employee's departments with transitive membership (direct + team-based)
    const departmentsResult = await query(`
      SELECT DISTINCT
        d.id, d.name, d.description
      FROM departments d
      WHERE d.status = 'active' AND d.id IN (
        -- Source 1: Direct department membership
        SELECT DISTINCT ud.department_id
        FROM user_departments ud
        WHERE ud.user_id = $1
        
        UNION
        
        -- Source 2: Team-based department membership
        SELECT DISTINCT dt.department_id
        FROM team_members tm
        JOIN department_teams dt ON tm.team_id = dt.team_id
        WHERE tm.user_id = $1
      )
      ORDER BY d.name
    `, [userId]);

    // Get employee's teams
    const teamsResult = await query(`
      SELECT DISTINCT
        t.id, t.name, t.description
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = $1
      ORDER BY t.name
    `, [userId]);

    // Get team departments separately to avoid duplicates
    const teamDepartmentsResult = await query(`
      SELECT 
        t.id as team_id,
        d.id as department_id, 
        d.name as department_name
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      LEFT JOIN department_teams dt ON t.id = dt.team_id
      LEFT JOIN departments d ON dt.department_id = d.id
      WHERE tm.user_id = $1
      ORDER BY t.id, d.name
    `, [userId]);

    // Get team members for each team
    const teamMembersResult = await query(`
      SELECT 
        t.id as team_id,
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.job_title,
        u.role,
        u.profile_picture_url,
        tm.role_in_team
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      JOIN users u ON tm.user_id = u.id
      WHERE t.id IN (
        SELECT DISTINCT t2.id 
        FROM teams t2 
        JOIN team_members tm2 ON t2.id = tm2.team_id 
        WHERE tm2.user_id = $1
      )
      ORDER BY t.id, u.first_name
    `, [userId]);

    // Get colleagues (users in same departments and teams)
    const colleaguesResult = await query(`
      SELECT DISTINCT
        u.id, u.first_name, u.last_name, u.email, u.job_title, u.role, u.status,
        u.profile_picture_url, u.created_at
      FROM users u
      WHERE u.id != $1 AND u.status = 'active' AND (
        -- Users in same departments
        EXISTS (
          SELECT 1 FROM user_departments ud1
          JOIN user_departments ud2 ON ud1.department_id = ud2.department_id
          WHERE ud1.user_id = u.id AND ud2.user_id = $1
        )
        OR
        -- Users in same teams
        EXISTS (
          SELECT 1 FROM team_members tm1
          JOIN team_members tm2 ON tm1.team_id = tm2.team_id
          WHERE tm1.user_id = u.id AND tm2.user_id = $1
        )
      )
      ORDER BY u.first_name, u.last_name
    `, [userId]);

    const departments = departmentsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description
    }));

    // Create a map of team departments
    const teamDepartmentsMap = {};
    teamDepartmentsResult.rows.forEach(row => {
      if (!teamDepartmentsMap[row.team_id]) {
        teamDepartmentsMap[row.team_id] = [];
      }
      if (row.department_id) {
        teamDepartmentsMap[row.team_id].push({
          id: row.department_id,
          name: row.department_name
        });
      }
    });

    // Create a map of team members
    const teamMembersMap = {};
    teamMembersResult.rows.forEach(row => {
      if (!teamMembersMap[row.team_id]) {
        teamMembersMap[row.team_id] = [];
      }
      teamMembersMap[row.team_id].push({
        id: row.user_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        jobTitle: row.job_title,
        role: row.role,
        profilePictureUrl: row.profile_picture_url,
        roleInTeam: row.role_in_team
      });
    });

    const teams = teamsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      departments: teamDepartmentsMap[row.id] || [],
      members: teamMembersMap[row.id] || []
    }));

    const colleagues = colleaguesResult.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      jobTitle: row.job_title,
      role: row.role,
      status: row.status,
      profilePictureUrl: row.profile_picture_url,
      createdAt: row.created_at
    }));

    console.log(`✅ Found ${departments.length} departments, ${teams.length} teams, ${colleagues.length} colleagues`);

    res.json({
      departments,
      teams,
      colleagues
    });
  } catch (error) {
    console.error('❌ Get organization data error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get employee's skills
router.get('/my-skills', authenticateToken, requireEmployee, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('🔍 Getting skills for employee:', userId);

    // Get user's skills with skill details
    const skillsResult = await query(`
      SELECT 
        s.id, s.name, s.type, s.category, s.description,
        us.level, us.last_updated_at as acquired_at
      FROM skills s
      JOIN user_skills us ON s.id = us.skill_id
      WHERE us.user_id = $1 AND s.is_active = true
      ORDER BY s.name
    `, [userId]);

    const skills = skillsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      category: row.category,
      description: row.description,
      maxLevel: 5, // Fixed max level
      level: row.level,
      acquiredAt: row.acquired_at
    }));

    console.log(`✅ Found ${skills.length} skills for employee ${userId}`);

    res.json({ skills });
  } catch (error) {
    console.error('❌ Get employee skills error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Test endpoint to verify contributionId is working - UPDATED 2025-09-07 12:30
router.get('/test-contribution-id', authenticateToken, requireEmployee, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🧪 TEST ENDPOINT: Testing contributionId for user:', userId);
    
    const result = await query(`
      SELECT DISTINCT
        o.id, o.title, o.category, o.parent_objective_id,
        oc.id as contribution_id
      FROM objectives o
      INNER JOIN objective_assignments oa ON o.id = oa.objective_id
      LEFT JOIN objective_contributions oc ON (
        (o.parent_objective_id IS NOT NULL AND o.parent_objective_id = oc.parent_objective_id AND oc.assignee_user_id = $1) OR
        (o.parent_objective_id IS NULL AND o.id = oc.parent_objective_id AND oc.assignee_user_id = $1)
      )
      WHERE (
        (oa.assignee_type = 'USER' AND oa.user_id = $1 AND o.parent_objective_id IS NULL) OR
        (oa.assignee_type = 'USER' AND oa.user_id = $1 AND o.parent_objective_id IS NOT NULL)
      )
      ORDER BY o.created_at DESC
    `, [userId]);
    
    console.log('🧪 TEST ENDPOINT: Query results:', result.rows.length);
    result.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.title} - Contribution ID: ${row.contribution_id || 'NULL'}`);
    });
    
    res.json({ 
      message: 'Test endpoint working',
      userId: userId,
      objectives: result.rows.map(row => ({
        id: row.id,
        title: row.title,
        category: row.category,
        parentObjectiveId: row.parent_objective_id,
        contributionId: row.contribution_id
      }))
    });
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    res.status(500).json({ message: 'Test endpoint error', error: error.message });
  }
});

// Get employee's objectives
router.get('/my-objectives', authenticateToken, requireEmployee, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('🔍 Employee /my-objectives endpoint called');
    console.log('👤 User ID:', userId);
    console.log('👤 User Role:', userRole);

    // Get objectives assigned to this specific user (both individual and team objectives)
    const result = await query(`
      SELECT DISTINCT
        o.id, o.title, o.description, o.category, o.target_level, o.deadline, o.status, o.progress,
        o.created_at, o.updated_at, o.objective_type, o.parent_objective_id,
        oa.assignee_type, oa.team_id, oa.user_id,
        CASE 
          WHEN o.parent_objective_id IS NOT NULL THEN parent_team.name
          ELSE t.name
        END as team_name,
        u.first_name as creator_first_name, u.last_name as creator_last_name,
        s.name as skill_name, s.type as skill_type,
        oc.id as contribution_id, oc.task_description as contribution_description,
        oc.progress as contribution_progress, oc.status as contribution_status,
        it.custom_title, it.custom_description, it.custom_deadline, it.custom_file_path
      FROM objectives o
      INNER JOIN objective_assignments oa ON o.id = oa.objective_id
      LEFT JOIN teams t ON oa.team_id = t.id
      LEFT JOIN users u ON o.created_by = u.id
      LEFT JOIN skills s ON o.skill_id = s.id
      LEFT JOIN objective_contributions oc ON (
        -- For team contributions: join where the parent objective is the parent of a contribution
        (o.parent_objective_id IS NOT NULL AND o.parent_objective_id = oc.parent_objective_id AND oc.assignee_user_id = $1) OR
        -- For individual objectives: join where this objective has contributions
        (o.parent_objective_id IS NULL AND o.id = oc.parent_objective_id AND oc.assignee_user_id = $1)
      )
      LEFT JOIN individual_targets it ON o.id = it.objective_id AND it.user_id = $1
      -- For team contributions, get team name from parent objective's team assignment
      LEFT JOIN objectives parent_obj ON o.parent_objective_id = parent_obj.id
      LEFT JOIN objective_assignments parent_oa ON parent_obj.id = parent_oa.objective_id AND parent_oa.assignee_type = 'TEAM'
      LEFT JOIN teams parent_team ON parent_oa.team_id = parent_team.id
      WHERE (
        -- Individual objectives assigned directly to this user (exclude partial targets from team objectives)
        (oa.assignee_type = 'USER' AND oa.user_id = $1 AND o.parent_objective_id IS NULL)
        OR
        -- Partial targets from team objectives (these are the individual contributions)
        (oa.assignee_type = 'USER' AND oa.user_id = $1 AND o.parent_objective_id IS NOT NULL)
      )
      ORDER BY o.created_at DESC
    `, [userId]);

    console.log('✅ Objectives query completed');
    console.log('📊 Number of objectives found:', result.rows.length);

    const objectives = result.rows.map(row => {
      const objective = {
        id: row.id,
        title: row.custom_title || row.title,
        description: row.custom_description || row.description,
        category: row.category,
        targetLevel: row.target_level,
        deadline: row.custom_deadline || row.deadline,
        status: row.status,
        progress: row.progress, // Will be overridden for partial targets below
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        objectiveType: row.objective_type || 'individual', // Use the new column
        assigneeType: row.assignee_type,
        skill: row.skill_name ? {
          name: row.skill_name,
          type: row.skill_type
        } : null,
        creator: {
          firstName: row.creator_first_name,
          lastName: row.creator_last_name
        }
      };

      // Handle partial targets (team contributions) vs individual objectives
      if (row.parent_objective_id) {
        // This is a partial target from a team objective
        objective.isTeamContribution = true;
        objective.parentObjectiveId = row.parent_objective_id;
        objective.contributionId = row.contribution_id;
        // ✅ FIX: Use the objective's own progress for partial targets (not contribution progress)
        objective.progress = row.progress || 0;
        objective.status = row.status;
        objective.assignedTo = {
          id: row.user_id
        };
        // Add team information for team contributions
        objective.team = {
          name: row.team_name
        };
      } else {
        // This is a regular individual objective
        objective.isTeamContribution = false;
        objective.assignedTo = {
          id: row.user_id
        };
      }

      return objective;
    });

    res.json({ objectives });
  } catch (error) {
    console.error('❌ Get employee objectives error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get employee's skill requests
router.get('/my-skill-requests', authenticateToken, requireEmployee, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('🔍 Employee /my-skill-requests endpoint called');
    console.log('👤 User ID:', userId);
    console.log('👤 User Role:', userRole);

    // Get skill requests created by this specific user
    const result = await query(`
      SELECT 
        sr.id, sr.type, sr.status, sr.current_level, sr.target_level, sr.reason,
        sr.created_at, sr.updated_at, sr.certificate_file_id, sr.requested_skill_name,
        s.id as skill_id, s.name as skill_name,
        f.id as file_id, f.original_name, f.mime_type, f.size_bytes, f.storage_key
      FROM skill_requests sr
      LEFT JOIN skills s ON sr.skill_id = s.id
      LEFT JOIN files f ON sr.certificate_file_id = f.id
      WHERE sr.requester_user_id = $1
      ORDER BY sr.created_at DESC
    `, [userId]);

    console.log('✅ Skill requests query completed');
    console.log('📊 Number of skill requests found:', result.rows.length);

    const skillRequests = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      status: row.status,
      currentLevel: row.current_level,
      targetLevel: row.target_level,
      reason: row.reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      certificateFileId: row.certificate_file_id,
      requestedSkillName: row.requested_skill_name,
      skill: row.skill_id ? {
        id: row.skill_id,
        name: row.skill_name
      } : null,
      certificateFile: row.file_id ? {
        id: row.file_id,
        originalName: row.original_name,
        mimeType: row.mime_type,
        sizeBytes: parseInt(row.size_bytes),
        storageKey: row.storage_key
      } : null
    }));

    res.json({ skillRequests });
  } catch (error) {
    console.error('❌ Get employee skill requests error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get employee's team information
router.get('/my-team', authenticateToken, requireEmployee, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('🔍 Employee /my-team endpoint called');
    console.log('👤 User ID:', userId);
    console.log('👤 User Role:', userRole);

    // Get team information for this specific user
    const result = await query(`
      SELECT 
        t.id, t.name, t.description, t.created_at, t.updated_at,
        d.id as department_id, d.name as department_name,
        u.id as manager_id, u.first_name as manager_first_name, u.last_name as manager_last_name,
        u.email as manager_email
      FROM team_members tm
      INNER JOIN teams t ON tm.team_id = t.id
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN users u ON t.manager_user_id = u.id
      WHERE tm.user_id = $1
      ORDER BY tm.joined_at DESC
      LIMIT 1
    `, [userId]);

    console.log('✅ Team query completed');
    console.log('📊 Number of teams found:', result.rows.length);

    if (result.rows.length === 0) {
      return res.json({ team: null });
    }

    const teamData = result.rows[0];
    const team = {
      id: teamData.id,
      name: teamData.name,
      description: teamData.description,
      createdAt: teamData.created_at,
      updatedAt: teamData.updated_at,
      department: teamData.department_id ? {
        id: teamData.department_id,
        name: teamData.department_name
      } : null,
      manager: teamData.manager_id ? {
        id: teamData.manager_id,
        firstName: teamData.manager_first_name,
        lastName: teamData.manager_last_name,
        email: teamData.manager_email
      } : null
    };

    res.json({ team });
  } catch (error) {
    console.error('❌ Get employee team error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

