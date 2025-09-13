const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// Ensure only managers can access these routes
router.use(authenticateToken);
router.use(requireManager);

// Get manager's objectives (permission-based visibility)
router.get('/my-objectives', authenticateToken, requireManager, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('🔍 Manager /my-objectives endpoint called');
    console.log('👤 User ID:', userId);
    console.log('👤 User Role:', userRole);

    if (userRole !== 'manager' && userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // FIXED: Get objectives for teams managed by this manager
    // Show objectives for teams that this manager manages (not just teams they're a member of)
    const result = await query(`
      SELECT DISTINCT
        o.id, o.title, o.description, o.category, o.target_level, o.deadline, o.status, o.progress,
        o.created_at, o.updated_at, o.parent_objective_id, o.created_by,
        oa.assignee_type, oa.user_id, oa.team_id,
        u.first_name as assignee_first_name, u.last_name as assignee_last_name,
        t.name as team_name,
        s.name as skill_name, s.type as skill_type, s.category as skill_category,
        creator.first_name as creator_first_name, creator.last_name as creator_last_name
      FROM objectives o
      LEFT JOIN objective_assignments oa ON o.id = oa.objective_id
      LEFT JOIN users u ON oa.user_id = u.id
      LEFT JOIN teams t ON oa.team_id = t.id
      LEFT JOIN skills s ON o.skill_id = s.id
      LEFT JOIN users creator ON o.created_by = creator.id
      WHERE (
        -- Objectives created by this manager
        o.created_by = $1
        OR
        -- FIXED: Objectives assigned to users in teams that this manager manages
        oa.user_id IN (
          SELECT DISTINCT tm.user_id
          FROM team_members tm
          WHERE tm.team_id IN (
            SELECT DISTINCT tmh.team_id 
            FROM team_management_history tmh 
      WHERE tmh.manager_id = $1 AND tmh.is_active = TRUE
          )
        )
        OR
        -- FIXED: Objectives assigned to teams that this manager manages
        oa.team_id IN (
          SELECT DISTINCT tmh.team_id 
          FROM team_management_history tmh 
        WHERE tmh.manager_id = $1 AND tmh.is_active = TRUE
      )
      )
      ORDER BY o.created_at DESC
    `, [userId]);

    console.log('✅ Objectives query completed');
    console.log('📊 Total objectives found:', result.rows.length);

    // Process the results to match frontend expectations
    const objectives = result.rows.map(row => {
      const objective = {
      id: row.id,
        title: row.title,
      description: row.description,
        category: row.category,
        targetLevel: row.target_level,
        deadline: row.deadline,
        status: row.status,
        progress: row.progress,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
        parentObjectiveId: row.parent_objective_id,
        createdBy: row.created_by,
        assigneeType: row.assignee_type,
        teamId: row.team_id,
        userId: row.user_id,
        teamName: row.team_name,
        skillName: row.skill_name,
        skillType: row.skill_type,
        skillCategory: row.skill_category,
        creatorFirstName: row.creator_first_name,
        creatorLastName: row.creator_last_name
      };

      // Add assignee information
      if (row.assignee_type === 'TEAM') {
        objective.assignedTo = row.team_name ? {
          id: row.team_id,
          name: row.team_name
        } : null;
        objective.team = row.team_name ? {
          name: row.team_name
        } : null;
      } else if (row.assignee_type === 'USER') {
        objective.assignedTo = row.assignee_first_name ? {
        id: row.user_id,
        firstName: row.assignee_first_name,
        lastName: row.assignee_last_name
        } : null;
      }

      return objective;
    });

    console.log('✅ Objectives processed successfully');
    console.log('📊 Processed objectives count:', objectives.length);

    res.json({ 
      objectives: objectives,
      pagination: {
        page: 1,
        pageSize: 50,
        totalCount: objectives.length,
        totalPages: Math.ceil(objectives.length / 50)
      }
    });

  } catch (error) {
    console.error('❌ Manager objectives error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get manager's departments
router.get('/my-departments', authenticateToken, requireManager, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('🔍 Manager /my-departments endpoint called for user:', userId);

    // Get departments managed by this user (only official department managers)
    const managedDepartmentsResult = await query(`
      SELECT 
        d.id, d.name, d.description, d.manager_user_id, d.created_at,
        u.first_name as manager_first_name, u.last_name as manager_last_name, u.email as manager_email,
        (
          SELECT COUNT(DISTINCT t.id)
          FROM teams t
          INNER JOIN department_teams dt2 ON t.id = dt2.team_id
          WHERE dt2.department_id = d.id
        ) as teams_count,
        (
          SELECT COUNT(DISTINCT u2.id)
          FROM users u2
          INNER JOIN team_members tm ON u2.id = tm.user_id
          INNER JOIN department_teams dt3 ON tm.team_id = dt3.team_id
          WHERE dt3.department_id = d.id AND u2.status = 'active'
        ) as employees_count
      FROM departments d
      LEFT JOIN users u ON d.manager_user_id = u.id
      WHERE d.manager_user_id = $1
      ORDER BY d.name
    `, [userId]);

    // Get departments where user is a member (through user_departments OR through team management)
    // Use UNION to combine both cases instead of complex JOINs
    const memberDepartmentsResult = await query(`
      SELECT DISTINCT
        d.id, d.name, d.description, d.manager_user_id, d.created_at,
        u.first_name as manager_first_name, u.last_name as manager_last_name, u.email as manager_email,
        (
          SELECT COUNT(DISTINCT t.id)
          FROM teams t
          INNER JOIN department_teams dt2 ON t.id = dt2.team_id
          WHERE dt2.department_id = d.id
        ) as teams_count,
        (
          SELECT COUNT(DISTINCT u2.id)
          FROM users u2
          INNER JOIN team_members tm ON u2.id = tm.user_id
          INNER JOIN department_teams dt3 ON tm.team_id = dt3.team_id
          WHERE dt3.department_id = d.id AND u2.status = 'active'
        ) as employees_count
      FROM departments d
      LEFT JOIN users u ON d.manager_user_id = u.id
      WHERE d.id IN (
        SELECT ud.department_id FROM user_departments ud WHERE ud.user_id = $1
        UNION
        SELECT DISTINCT dt.department_id 
        FROM department_teams dt
        INNER JOIN team_management_history tmh ON dt.team_id = tmh.team_id
        WHERE tmh.manager_id = $1 AND tmh.is_active = TRUE
      )
      ORDER BY d.name
    `, [userId]);

    console.log('🔍 Member departments query result:', memberDepartmentsResult.rows);

    // This query is no longer needed since we include team-managed departments in managedDepartments
    const teamDepartmentsResult = { rows: [] };

    // Get departments where user is a member through team membership
    const memberTeamDepartmentsResult = await query(`
      SELECT DISTINCT
        d.id, d.name, d.description, d.manager_user_id, d.created_at,
        u.first_name as manager_first_name, u.last_name as manager_last_name, u.email as manager_email,
        (
          SELECT COUNT(DISTINCT t.id)
          FROM teams t
          INNER JOIN department_teams dt2 ON t.id = dt2.team_id
          WHERE dt2.department_id = d.id
        ) as teams_count,
        (
          SELECT COUNT(DISTINCT u2.id)
          FROM users u2
          INNER JOIN team_members tm2 ON u2.id = tm2.user_id
          INNER JOIN department_teams dt3 ON tm2.team_id = dt3.team_id
          WHERE dt3.department_id = d.id AND u2.status = 'active'
        ) as employees_count
      FROM departments d
      INNER JOIN department_teams dt ON d.id = dt.department_id
      INNER JOIN team_members tm ON dt.team_id = tm.team_id
      LEFT JOIN users u ON d.manager_user_id = u.id
      WHERE tm.user_id = $1 AND d.manager_user_id != $1
      ORDER BY d.name
    `, [userId]);

    const managedDepartments = managedDepartmentsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      managerUserId: row.manager_user_id,
      createdAt: row.created_at,
      teamsCount: parseInt(row.teams_count) || 0,
      employeesCount: parseInt(row.employees_count) || 0,
      manager: row.manager_user_id ? {
        id: row.manager_user_id,
        firstName: row.manager_first_name,
        lastName: row.manager_last_name,
        email: row.manager_email
      } : null
    }));

    // Combine member departments (avoid duplicates)
    const memberDepartmentsMap = new Map();
    
    memberDepartmentsResult.rows.forEach(row => {
      memberDepartmentsMap.set(row.id, {
      id: row.id,
      name: row.name,
      description: row.description,
        managerUserId: row.manager_user_id,
      createdAt: row.created_at,
        teamsCount: parseInt(row.teams_count) || 0,
        employeesCount: parseInt(row.employees_count) || 0,
        manager: row.manager_user_id ? {
          id: row.manager_user_id,
          firstName: row.manager_first_name,
          lastName: row.manager_last_name,
          email: row.manager_email
        } : null
      });
    });

    // Add departments from team management
    teamDepartmentsResult.rows.forEach(row => {
      if (!memberDepartmentsMap.has(row.id)) {
        memberDepartmentsMap.set(row.id, {
          id: row.id,
          name: row.name,
          description: row.description,
          managerUserId: row.manager_user_id,
          createdAt: row.created_at,
          teamsCount: parseInt(row.teams_count) || 0,
          employeesCount: parseInt(row.employees_count) || 0,
          manager: row.manager_user_id ? {
            id: row.manager_user_id,
            firstName: row.manager_first_name,
            lastName: row.manager_last_name,
            email: row.manager_email
          } : null
        });
      }
    });

    // Add departments from team membership
    memberTeamDepartmentsResult.rows.forEach(row => {
      if (!memberDepartmentsMap.has(row.id)) {
        memberDepartmentsMap.set(row.id, {
          id: row.id,
          name: row.name,
          description: row.description,
          managerUserId: row.manager_user_id,
          createdAt: row.created_at,
          teamsCount: parseInt(row.teams_count) || 0,
          employeesCount: parseInt(row.employees_count) || 0,
          manager: row.manager_user_id ? {
            id: row.manager_user_id,
            firstName: row.manager_first_name,
            lastName: row.manager_last_name,
            email: row.manager_email
          } : null
        });
      }
    });

    const memberDepartments = Array.from(memberDepartmentsMap.values());

    console.log('✅ Manager departments query completed');
    console.log('📊 Managed departments:', managedDepartments.length);
    console.log('📊 Member departments:', memberDepartments.length);
    console.log('🔍 Managed departments result:', managedDepartmentsResult.rows.length, 'rows');
    console.log('🔍 Member departments result:', memberDepartmentsResult.rows.length, 'rows');
    console.log('🔍 Member team departments result:', memberTeamDepartmentsResult.rows.length, 'rows');
    console.log('🔍 User ID:', userId);
    
    // Debug: Check if user manages any teams
    const debugTeamsResult = await query(`
      SELECT t.id, t.name, tmh.is_active
      FROM teams t
      INNER JOIN team_management_history tmh ON t.id = tmh.team_id
      WHERE tmh.manager_id = $1
    `, [userId]);
    console.log('🔍 User manages teams:', debugTeamsResult.rows);
    
    // Debug: Check if any of those teams are in departments
    if (debugTeamsResult.rows.length > 0) {
      const teamIds = debugTeamsResult.rows.map(row => row.id);
      const debugDeptResult = await query(`
        SELECT dt.team_id, t.name as team_name, dt.department_id, d.name as department_name
        FROM department_teams dt
        JOIN teams t ON dt.team_id = t.id
        JOIN departments d ON dt.department_id = d.id
        WHERE dt.team_id = ANY($1)
      `, [teamIds]);
      console.log('🔍 Teams in departments:', debugDeptResult.rows);
    }

    res.json({ 
      managedDepartments,
      memberDepartments,
      totalDepartments: managedDepartments.length + memberDepartments.length
    });

  } catch (error) {
    console.error('❌ Manager departments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get manager's team members
router.get('/my-team-members', authenticateToken, requireManager, async (req, res) => {
  try {
    const managerId = req.user.id;

    console.log('🔍 Manager /my-team-members endpoint called for user:', managerId);

    // Get teams managed by this manager
    const managedTeamsResult = await query(`
      SELECT team_id FROM team_management_history
      WHERE manager_id = $1 AND is_active = TRUE
    `, [managerId]);
    const managedTeamIds = managedTeamsResult.rows.map(row => row.team_id);

    if (managedTeamIds.length === 0) {
      console.log('⚠️ No managed teams found for this manager.');
      return res.json({
        teamMembers: []
      });
    }

    // Get all team members from managed teams
    const teamMembersResult = await query(`
      SELECT DISTINCT
        tm.user_id, tm.team_id, tm.joined_at,
        u.first_name, u.last_name, u.email, u.role, u.job_title, u.status,
        u.profile_picture_url, t.name as team_name
      FROM team_members tm
      INNER JOIN users u ON tm.user_id = u.id
      INNER JOIN teams t ON tm.team_id = t.id
      WHERE tm.team_id = ANY($1::uuid[])
      AND u.status = 'active'
      ORDER BY u.first_name, u.last_name
    `, [managedTeamIds]);

    const teamMembers = teamMembersResult.rows.map(row => ({
      id: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      role: row.role,
      jobTitle: row.job_title,
      status: row.status,
      profilePictureUrl: row.profile_picture_url,
      teamId: row.team_id,
      teamName: row.team_name,
      joinedAt: row.joined_at
    }));

    console.log('✅ Manager team members query completed');
    console.log('📊 Team members found:', teamMembers.length);

    res.json({
      teamMembers
    });

  } catch (error) {
    console.error('❌ Manager team members error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get manager's skill requests and progression requests
router.get('/my-skill-requests', authenticateToken, requireManager, async (req, res) => {
  try {
    const managerId = req.user.id;

    console.log('🔍 Manager /my-skill-requests endpoint called for user:', managerId);

    // Get teams managed by this manager
    const managedTeamsResult = await query(`
      SELECT team_id FROM team_management_history
      WHERE manager_id = $1 AND is_active = TRUE
    `, [managerId]);
    const managedTeamIds = managedTeamsResult.rows.map(row => row.team_id);

    if (managedTeamIds.length === 0) {
      console.log('⚠️ No managed teams found for this manager.');
      return res.json({
        skillRequests: [],
        progressionRequests: [],
        allRequests: []
      });
    }

    // Get skill requests from team members
    const skillRequestsResult = await query(`
      SELECT 
        sr.id, sr.type, sr.skill_id, sr.requested_skill_name, sr.current_level, 
        sr.target_level, sr.reason, sr.status, sr.created_at, sr.updated_at,
        sr.requester_user_id, sr.manager_id, sr.admin_id, sr.certificate_file_id,
        u.first_name, u.last_name, u.email, u.job_title,
        s.name as skill_name, s.type as skill_type, s.category as skill_category,
        f.id as file_id, f.original_name as file_original_name, f.mime_type as file_mime_type, 
        f.size_bytes as file_size_bytes, f.storage_key as file_storage_key
      FROM skill_requests sr
      INNER JOIN users u ON sr.requester_user_id = u.id
      LEFT JOIN skills s ON sr.skill_id = s.id
      LEFT JOIN files f ON sr.certificate_file_id = f.id
      WHERE sr.requester_user_id IN (
        SELECT user_id FROM team_members WHERE team_id = ANY($1::uuid[])
      )
      AND sr.status IN ('pending', 'pending_manager')
      ORDER BY sr.created_at DESC
    `, [managedTeamIds]);

    // Get progression requests from team members
    const progressionRequestsResult = await query(`
      SELECT 
        ou.id, ou.objective_id, ou.author_user_id, ou.progress as new_progress, 
        ou.notes as comment, ou.created_at, ou.status,
        u.first_name, u.last_name, u.email, u.job_title,
        o.title as objective_title, o.progress as current_progress
      FROM objective_updates ou
      INNER JOIN users u ON ou.author_user_id = u.id
      INNER JOIN objectives o ON ou.objective_id = o.id
      WHERE ou.author_user_id IN (
        SELECT user_id FROM team_members WHERE team_id = ANY($1::uuid[])
      )
      AND ou.status = 'pending'
      ORDER BY ou.created_at DESC
    `, [managedTeamIds]);

    const skillRequests = skillRequestsResult.rows.map(row => ({
        id: row.id,
        type: row.type,
      skillId: row.skill_id,
      requestedSkillName: row.requested_skill_name,
        currentLevel: row.current_level,
        targetLevel: row.target_level,
        reason: row.reason,
      status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      requesterUserId: row.requester_user_id,
      managerId: row.manager_id,
      adminId: row.admin_id,
      requester: {
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        jobTitle: row.job_title
      },
        skill: row.skill_id ? {
          id: row.skill_id,
        name: row.skill_name,
        type: row.skill_type,
        category: row.skill_category
      } : null,
      certificateFile: row.file_id ? {
        id: row.file_id,
        originalName: row.file_original_name,
        mimeType: row.file_mime_type,
        sizeBytes: row.file_size_bytes,
        storageKey: row.file_storage_key
      } : null
    }));

    const progressionRequests = progressionRequestsResult.rows.map(row => ({
      id: row.id,
      objectiveId: row.objective_id,
      authorUserId: row.author_user_id,
      newProgress: row.new_progress,
      comment: row.comment,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      author: {
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        jobTitle: row.job_title
      },
      objective: {
        id: row.objective_id,
        title: row.objective_title,
        currentProgress: row.current_progress
      }
    }));

    // Combine all requests for unified view
    const allRequests = [
      ...skillRequests.map(req => ({ ...req, requestType: 'skill' })),
      ...progressionRequests.map(req => ({ ...req, requestType: 'progression' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log('✅ Manager skill requests query completed');
    console.log('📊 Skill requests found:', skillRequests.length);
    console.log('📊 Progression requests found:', progressionRequests.length);
    console.log('📊 Total requests found:', allRequests.length);

    res.json({ 
      skillRequests,
      progressionRequests,
      allRequests
    });

  } catch (error) {
    console.error('❌ Manager skill requests error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get manager's teams
router.get('/my-teams', authenticateToken, requireManager, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('🔍 Manager /my-teams endpoint called for user:', userId);

    // Get teams managed by this user
    const managedTeamsResult = await query(`
      SELECT DISTINCT
        t.id, t.name, t.description, t.manager_user_id,
        tmh.assigned_at, tmh.reason
      FROM teams t
      INNER JOIN team_management_history tmh ON t.id = tmh.team_id
            WHERE tmh.manager_id = $1 AND tmh.is_active = TRUE
      ORDER BY tmh.assigned_at DESC
    `, [userId]);

    // Get teams where user is a member
    const memberTeamsResult = await query(`
      SELECT DISTINCT 
        t.id, t.name, t.description, t.manager_user_id
      FROM teams t
      INNER JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = $1
      ORDER BY t.name
    `, [userId]);

    // Get member counts and departments for managed teams
    const managedTeamsWithCounts = await Promise.all(managedTeamsResult.rows.map(async (team) => {
      const memberCountResult = await query(`
        SELECT COUNT(*) as count FROM team_members WHERE team_id = $1
      `, [team.id]);
      
      // Get departments for this team
      const departmentsResult = await query(`
        SELECT d.id, d.name, d.description
        FROM departments d
        INNER JOIN department_teams dt ON d.id = dt.department_id
        WHERE dt.team_id = $1
        ORDER BY d.name
      `, [team.id]);
      
      return {
        id: team.id,
        name: team.name,
        description: team.description,
        managerUserId: team.manager_user_id,
        assignedAt: team.assigned_at,
        reason: team.reason,
        isManaged: true,
        membersCount: parseInt(memberCountResult.rows[0].count) || 0,
        departments: departmentsResult.rows.map(dept => ({
          id: dept.id,
          name: dept.name,
          description: dept.description
        }))
      };
    }));

    // Get member counts and departments for member teams
    const memberTeamsWithCounts = await Promise.all(memberTeamsResult.rows.map(async (team) => {
      const memberCountResult = await query(`
        SELECT COUNT(*) as count FROM team_members WHERE team_id = $1
      `, [team.id]);
      
      // Get departments for this team
      const departmentsResult = await query(`
        SELECT d.id, d.name, d.description
        FROM departments d
        INNER JOIN department_teams dt ON d.id = dt.department_id
        WHERE dt.team_id = $1
        ORDER BY d.name
      `, [team.id]);
      
      return {
        id: team.id,
        name: team.name,
        description: team.description,
        managerUserId: team.manager_user_id,
        isManaged: false,
        membersCount: parseInt(memberCountResult.rows[0].count) || 0,
        departments: departmentsResult.rows.map(dept => ({
          id: dept.id,
          name: dept.name,
          description: dept.description
        }))
      };
    }));

    const managedTeams = managedTeamsWithCounts;
    const memberTeams = memberTeamsWithCounts;

    console.log('✅ Teams query completed');
    console.log('📊 Managed teams:', managedTeams.length);
    console.log('📊 Member teams:', memberTeams.length);

    res.json({
      managedTeams,
      memberTeams,
      totalTeams: managedTeams.length + memberTeams.length
    });

  } catch (error) {
    console.error('❌ Manager teams error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get monthly activity data
router.get('/monthly-activity', authenticateToken, requireManager, async (req, res) => {
  try {
    const userId = req.user.id;
    const { year, month } = req.query;

    console.log('🔍 Getting monthly activity data for manager:', userId, 'Year:', year, 'Month:', month);

    // Get the start and end dates for the month
    const startDate = new Date(year || new Date().getFullYear(), (month || new Date().getMonth()) - 1, 1);
    const endDate = new Date(year || new Date().getFullYear(), month || new Date().getMonth(), 0, 23, 59, 59);

    console.log('📅 Date range:', startDate, 'to', endDate);

    // Get teams managed by this manager
    const managedTeamsResult = await query(`
      SELECT DISTINCT t.id, t.name
      FROM teams t
      INNER JOIN team_management_history tmh ON t.id = tmh.team_id
      WHERE tmh.manager_id = $1 AND tmh.is_active = TRUE
    `, [userId]);

    const managedTeamIds = managedTeamsResult.rows.map(team => team.id);
    console.log('🏢 Managed teams:', managedTeamIds.length);

    if (managedTeamIds.length === 0) {
      return res.json({
        dailyActivity: [],
        summary: {
          totalRequests: 0,
          totalObjectives: 0,
          approvedRequests: 0,
          completedObjectives: 0
        }
      });
    }

    // Get daily activity data
    const dailyActivity = [];
    const daysInMonth = endDate.getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), day);
      const nextDate = new Date(startDate.getFullYear(), startDate.getMonth(), day + 1);

      // Count objectives created on this day
      const objectivesResult = await query(`
        SELECT COUNT(*) as count
      FROM objectives o
      LEFT JOIN objective_assignments oa ON o.id = oa.objective_id
        WHERE o.created_at >= $1 AND o.created_at < $2
        AND (
          o.created_by = $3
          OR oa.team_id = ANY($4)
          OR oa.user_id IN (
            SELECT tm.user_id
          FROM team_members tm
            WHERE tm.team_id = ANY($4)
          )
        )
      `, [currentDate, nextDate, userId, managedTeamIds]);

      // Count completed objectives on this day
      const completedObjectivesResult = await query(`
        SELECT COUNT(*) as count
          FROM objectives o
        LEFT JOIN objective_assignments oa ON o.id = oa.objective_id
        WHERE o.updated_at >= $1 AND o.updated_at < $2
        AND (o.status = 'completed' OR o.progress >= 100)
        AND (
          o.created_by = $3
          OR oa.team_id = ANY($4)
          OR oa.user_id IN (
            SELECT tm.user_id
            FROM team_members tm
            WHERE tm.team_id = ANY($4)
          )
        )
      `, [currentDate, nextDate, userId, managedTeamIds]);

      // Count progress update requests submitted on this day
      const requestsResult = await query(`
        SELECT COUNT(*) as count
        FROM objective_updates ou
        INNER JOIN objectives o ON ou.objective_id = o.id
        LEFT JOIN objective_assignments oa ON o.id = oa.objective_id
        WHERE ou.created_at >= $1 AND ou.created_at < $2
        -- Removed ou.status filter as column doesn't exist
        AND (
          o.created_by = $3
          OR oa.team_id = ANY($4)
          OR oa.user_id IN (
            SELECT tm.user_id
      FROM team_members tm
            WHERE tm.team_id = ANY($4)
          )
        )
      `, [currentDate, nextDate, userId, managedTeamIds]);

      // Count approved requests on this day (use created_at since there's no updated_at)
      const approvedRequestsResult = await query(`
        SELECT COUNT(*) as count
        FROM objective_updates ou
        INNER JOIN objectives o ON ou.objective_id = o.id
        LEFT JOIN objective_assignments oa ON o.id = oa.objective_id
        WHERE ou.created_at >= $1 AND ou.created_at < $2
        -- Removed ou.status filter as column doesn't exist
        AND (
          o.created_by = $3
          OR oa.team_id = ANY($4)
          OR oa.user_id IN (
            SELECT tm.user_id
        FROM team_members tm
            WHERE tm.team_id = ANY($4)
          )
        )
      `, [currentDate, nextDate, userId, managedTeamIds]);

      const dayData = {
        day: day,
        dayStr: currentDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        requests: parseInt(requestsResult.rows[0].count),
        objectives: parseInt(objectivesResult.rows[0].count),
        approvedRequests: parseInt(approvedRequestsResult.rows[0].count),
        completedObjectives: parseInt(completedObjectivesResult.rows[0].count),
        totalActivity: parseInt(requestsResult.rows[0].count) + parseInt(objectivesResult.rows[0].count)
      };

      dailyActivity.push(dayData);
    }

    // Calculate summary
    const summary = {
      totalRequests: dailyActivity.reduce((sum, day) => sum + day.requests, 0),
      totalObjectives: dailyActivity.reduce((sum, day) => sum + day.objectives, 0),
      approvedRequests: dailyActivity.reduce((sum, day) => sum + day.approvedRequests, 0),
      completedObjectives: dailyActivity.reduce((sum, day) => sum + day.completedObjectives, 0)
    };

    console.log('📊 Monthly activity summary:', summary);

    res.json({
      dailyActivity,
      summary,
      month: startDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    });

  } catch (error) {
    console.error('❌ Monthly activity error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get manager's recent activities
router.get('/recent-activities', authenticateToken, requireManager, async (req, res) => {
  try {
    const managerId = req.user.id;

    console.log('🔍 Manager /recent-activities endpoint called for user:', managerId);

    // Get teams managed by this manager
    const managedTeamsResult = await query(`
      SELECT team_id FROM team_management_history
      WHERE manager_id = $1 AND is_active = TRUE
    `, [managerId]);
    const managedTeamIds = managedTeamsResult.rows.map(row => row.team_id);

    if (managedTeamIds.length === 0) {
      console.log('⚠️ No managed teams found for this manager.');
      return res.json({ activities: [] });
    }

    // Get recent activities from multiple sources
    const activities = [];

    // 1. Recent objective updates (progress updates)
    const objectiveUpdatesResult = await query(`
          SELECT 
        ou.id, ou.objective_id, ou.author_user_id, ou.progress, ou.notes, 
        ou.created_at,
        u.first_name, u.last_name, u.email,
        o.title as objective_title, o.category, o.deadline
      FROM objective_updates ou
      INNER JOIN users u ON ou.author_user_id = u.id
      INNER JOIN objectives o ON ou.objective_id = o.id
      WHERE ou.author_user_id IN (
        SELECT user_id FROM team_members WHERE team_id = ANY($1::uuid[])
      )
        ORDER BY ou.created_at DESC
        LIMIT 5
    `, [managedTeamIds]);

    objectiveUpdatesResult.rows.forEach(row => {
      activities.push({
        id: `update_${row.id}`,
        type: 'progress_update',
        title: `Mise à jour de progression`,
        description: `${row.first_name} ${row.last_name} a mis à jour "${row.objective_title}" à ${row.progress}%`,
        user: {
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email
        },
        objective: {
          id: row.objective_id,
          title: row.objective_title,
        category: row.category,
          deadline: row.deadline
        },
        progress: row.progress,
        status: 'completed', // Default status for progress updates
        createdAt: row.created_at,
        icon: 'progress',
        color: 'green' // Default color for progress updates
      });
    });

    // 2. Recent skill requests
    const skillRequestsResult = await query(`
      SELECT 
        sr.id, sr.type, sr.requested_skill_name, sr.current_level, sr.target_level,
        sr.status, sr.created_at,
        u.first_name, u.last_name, u.email,
            s.name as skill_name
      FROM skill_requests sr
      INNER JOIN users u ON sr.requester_user_id = u.id
      LEFT JOIN skills s ON sr.skill_id = s.id
      WHERE sr.requester_user_id IN (
        SELECT user_id FROM team_members WHERE team_id = ANY($1::uuid[])
      )
        ORDER BY sr.created_at DESC
        LIMIT 5
    `, [managedTeamIds]);

    skillRequestsResult.rows.forEach(row => {
      activities.push({
        id: `skill_${row.id}`,
        type: 'skill_request',
        title: `Demande de compétence`,
        description: `${row.first_name} ${row.last_name} a demandé "${row.requested_skill_name || row.skill_name}" (niveau ${row.current_level} → ${row.target_level})`,
        user: {
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email
        },
        skill: {
          name: row.requested_skill_name || row.skill_name,
          currentLevel: row.current_level,
          targetLevel: row.target_level
        },
        status: row.status,
        createdAt: row.created_at,
        icon: 'skill',
        color: row.status === 'approved' ? 'green' : row.status === 'pending' ? 'yellow' : 'gray'
      });
    });

    // 3. Recent objective completions
    const completedObjectivesResult = await query(`
          SELECT 
        o.id, o.title, o.category, o.progress, o.updated_at,
        u.first_name, u.last_name, u.email
          FROM objectives o
      INNER JOIN users u ON o.created_by = u.id
      WHERE o.created_by IN (
        SELECT user_id FROM team_members WHERE team_id = ANY($1::uuid[])
      )
      AND o.status = 'completed'
      AND o.updated_at IS NOT NULL
        ORDER BY o.updated_at DESC
        LIMIT 5
    `, [managedTeamIds]);

    completedObjectivesResult.rows.forEach(row => {
      activities.push({
        id: `completed_${row.id}`,
        type: 'objective_completed',
        title: `Objectif terminé`,
        description: `${row.first_name} ${row.last_name} a terminé "${row.title}"`,
        user: {
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email
        },
        objective: {
          id: row.id,
          title: row.title,
          category: row.category,
          progress: row.progress
        },
        createdAt: row.updated_at,
        icon: 'completed',
        color: 'green'
      });
    });

    // 4. Recent team member additions
    const newMembersResult = await query(`
      SELECT 
        tm.user_id, tm.team_id, tm.joined_at,
        u.first_name, u.last_name, u.email,
        t.name as team_name
      FROM team_members tm
      INNER JOIN users u ON tm.user_id = u.id
      INNER JOIN teams t ON tm.team_id = t.id
      WHERE tm.team_id = ANY($1::uuid[])
        ORDER BY tm.joined_at DESC
        LIMIT 5
    `, [managedTeamIds]);

    newMembersResult.rows.forEach(row => {
      activities.push({
        id: `member_${row.user_id}_${row.team_id}`,
        type: 'member_joined',
        title: `Nouveau membre`,
        description: `${row.first_name} ${row.last_name} a rejoint l'équipe "${row.team_name}"`,
        user: {
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email
        },
        team: {
        id: row.team_id,
        name: row.team_name
        },
        createdAt: row.joined_at,
        icon: 'member',
        color: 'blue'
      });
    });

    // Sort all activities by creation date (most recent first) and take top 5
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const recentActivities = activities.slice(0, 5);

    console.log('✅ Manager recent activities query completed');
    console.log('📊 Recent activities found:', recentActivities.length);

    res.json({ activities: recentActivities });

  } catch (error) {
    console.error('❌ Manager recent activities error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get manager's upcoming deadlines (objectives behind schedule)
router.get('/upcoming-deadlines', authenticateToken, requireManager, async (req, res) => {
  try {
    const managerId = req.user.id;

    console.log('🔍 Manager /upcoming-deadlines endpoint called for user:', managerId);

    // Get teams managed by this manager
    const managedTeamsResult = await query(`
      SELECT team_id FROM team_management_history
      WHERE manager_id = $1 AND is_active = TRUE
    `, [managerId]);
    const managedTeamIds = managedTeamsResult.rows.map(row => row.team_id);

    if (managedTeamIds.length === 0) {
      console.log('⚠️ No managed teams found for this manager.');
      return res.json({ deadlines: [] });
    }

    // Get objectives that are behind schedule
    // Criteria: 80% of deadline time has passed but less than 80% progress completed
    const currentDate = new Date();
    
    const behindScheduleObjectivesResult = await query(`
      SELECT 
        o.id, o.title, o.category, o.progress, o.deadline, o.status, o.created_at,
        u.first_name, u.last_name, u.email, u.job_title,
        t.name as team_name
      FROM objectives o
      INNER JOIN users u ON o.created_by = u.id
      LEFT JOIN team_members tm ON o.created_by = tm.user_id
      LEFT JOIN teams t ON tm.team_id = t.id
      WHERE o.created_by IN (
        SELECT user_id FROM team_members WHERE team_id = ANY($1::uuid[])
      )
      AND o.deadline IS NOT NULL
      AND o.status IN ('in_progress', 'pending')
      AND o.deadline > $2
      AND (
        -- 80% of deadline time has passed
        (EXTRACT(EPOCH FROM ($2 - o.created_at)) / EXTRACT(EPOCH FROM (o.deadline - o.created_at))) >= 0.8
        AND
        -- But less than 80% progress completed
        (o.progress < 80)
      )
      ORDER BY o.deadline ASC
    `, [managedTeamIds, currentDate]);

    const deadlines = behindScheduleObjectivesResult.rows.map(row => {
      // Calculate how much time has passed vs total time
      const totalTime = new Date(row.deadline) - new Date(row.created_at);
      const timePassed = currentDate - new Date(row.created_at);
      const timeProgress = Math.min((timePassed / totalTime) * 100, 100);
      
      // Calculate days until deadline
      const daysUntilDeadline = Math.ceil((new Date(row.deadline) - currentDate) / (1000 * 60 * 60 * 24));
      
      return {
        id: row.id,
        title: row.title,
        category: row.category,
        progress: row.progress || 0,
        deadline: row.deadline,
        status: row.status,
        assignee: {
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          jobTitle: row.job_title
        },
        team: row.team_name,
        timeProgress: Math.round(timeProgress),
        daysUntilDeadline: daysUntilDeadline,
        isBehindSchedule: true
      };
    });

    console.log('✅ Manager upcoming deadlines query completed');
    console.log('📊 Behind schedule objectives found:', deadlines.length);

    res.json({ deadlines });

  } catch (error) {
    console.error('❌ Manager upcoming deadlines error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get team performance data
router.get('/team-performance/:teamId', authenticateToken, requireManager, async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamId } = req.params;

    console.log('🔍 Manager /team-performance endpoint called for team:', teamId, 'by user:', userId);

    // Verify the manager has access to this team
    const teamAccessResult = await query(`
      SELECT t.id, t.name, t.description, t.created_at
      FROM teams t
      INNER JOIN team_management_history tmh ON t.id = tmh.team_id
      WHERE t.id = $1 AND tmh.manager_id = $2 AND tmh.is_active = TRUE
    `, [teamId, userId]);

    if (teamAccessResult.rows.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à cette équipe' });
    }

    const team = teamAccessResult.rows[0];

    // Get team members
    const teamMembersResult = await query(`
      SELECT 
        u.id, u.first_name, u.last_name, u.email, u.status, u.job_title,
        tm.joined_at
      FROM team_members tm
      INNER JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = $1 AND u.status = 'active'
      ORDER BY u.first_name, u.last_name
    `, [teamId]);

    // Get team objectives (objectives assigned to the team)
    const teamObjectivesResult = await query(`
      SELECT 
        o.id, o.title, o.description, o.category, o.progress, o.status, 
        o.deadline, o.created_at, o.updated_at
      FROM objectives o
      INNER JOIN objective_assignments oa ON o.id = oa.objective_id
      WHERE oa.team_id = $1 AND oa.assignee_type = 'TEAM'
      ORDER BY o.created_at DESC
    `, [teamId]);

    // Get individual objectives for each team member (EXCLUDE partial team targets)
    const individualObjectivesResult = await query(`
      SELECT 
        o.id, o.title, o.description, o.category, o.progress, o.status, 
        o.deadline, o.created_at, o.updated_at, oa.user_id
      FROM objectives o
      INNER JOIN objective_assignments oa ON o.id = oa.objective_id
      WHERE oa.user_id IN (
        SELECT user_id FROM team_members WHERE team_id = $1
      ) 
      AND oa.assignee_type = 'USER'
      AND o.parent_objective_id IS NULL  -- EXCLUDE partial team targets
      ORDER BY oa.user_id, o.created_at DESC
    `, [teamId]);

    // Get team contributions (partial team targets) - ONLY for team objectives of this specific team
    const teamContributionsResult = await query(`
          SELECT 
        o.id, o.title, o.description, o.category, o.progress, o.status, 
        o.deadline, o.created_at, o.updated_at, oa.user_id, o.parent_objective_id,
        parent_obj.title as parent_title,
        u.first_name, u.last_name, u.email,
        t.name as team_name
          FROM objectives o
      INNER JOIN objective_assignments oa ON o.id = oa.objective_id
      INNER JOIN objectives parent_obj ON o.parent_objective_id = parent_obj.id
      INNER JOIN objective_assignments parent_oa ON parent_obj.id = parent_oa.objective_id
      INNER JOIN users u ON oa.user_id = u.id
      INNER JOIN teams t ON parent_oa.team_id = t.id
      WHERE oa.user_id IN (
        SELECT user_id FROM team_members WHERE team_id = $1
      ) 
      AND oa.assignee_type = 'USER' 
      AND o.parent_objective_id IS NOT NULL
      AND parent_oa.team_id = $1
      AND parent_oa.assignee_type = 'TEAM'
      ORDER BY oa.user_id, o.created_at DESC
    `, [teamId]);

    // Process team members with their objectives
    const teamMembers = teamMembersResult.rows.map(member => {
      const individualObjectives = individualObjectivesResult.rows
        .filter(obj => obj.user_id === member.id)
        .map(obj => ({
          id: obj.id,
          title: obj.title,
          description: obj.description,
          category: obj.category,
          progress: obj.progress || 0,
          status: obj.status,
          deadline: obj.deadline,
          createdAt: obj.created_at,
          updatedAt: obj.updated_at
        }));

      const teamContributions = teamContributionsResult.rows
        .filter(obj => obj.user_id === member.id)
        .map(obj => ({
          id: obj.id,
          title: obj.title,
          description: obj.description,
          category: obj.category,
          progress: obj.progress || 0,
          status: obj.status,
          deadline: obj.deadline,
          createdAt: obj.created_at,
          updatedAt: obj.updated_at,
          parentObjectiveId: obj.parent_objective_id,
          parentObjectiveTitle: obj.parent_title,
          employeeName: `${obj.first_name} ${obj.last_name}`,
          teamName: obj.team_name
        }));

        return {
          id: member.id,
          firstName: member.first_name,
          lastName: member.last_name,
          email: member.email,
        status: member.status,
          jobTitle: member.job_title,
        memberSince: member.joined_at,
        individualObjectives,
        teamContributions
      };
    });

    // Process team objectives
    const teamObjectives = teamObjectivesResult.rows.map(obj => ({
            id: obj.id,
            title: obj.title,
            description: obj.description,
            category: obj.category,
      progress: obj.progress || 0,
            status: obj.status,
      deadline: obj.deadline,
            createdAt: obj.created_at,
      updatedAt: obj.updated_at
    }));

    // Calculate performance metrics
    const totalObjectives = teamObjectives.length;
    const completedObjectives = teamObjectives.filter(obj => obj.status === 'completed' || obj.progress >= 100).length;
    const overallProgress = totalObjectives > 0 ? 
      Math.round(teamObjectives.reduce((sum, obj) => sum + (obj.progress || 0), 0) / totalObjectives) : 0;

    const performanceData = {
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        createdAt: team.created_at
      },
      performance: {
        overallProgress,
        completedObjectives,
        totalObjectives
      },
      teamMembers,
      teamObjectives,
      statistics: {
        totalMembers: teamMembers.length,
        totalObjectives,
        completedObjectives,
        inProgressObjectives: totalObjectives - completedObjectives,
        avgProgress: overallProgress
      }
    };

    console.log('✅ Team performance data loaded successfully');
    console.log('📊 Team:', team.name);
    console.log('📊 Members:', teamMembers.length);
    console.log('📊 Team objectives:', totalObjectives);
    console.log('📊 Overall progress:', overallProgress + '%');

    res.json(performanceData);
  } catch (error) {
    console.error('❌ Error in /team-performance:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des données de performance' });
  }
});

module.exports = router;
