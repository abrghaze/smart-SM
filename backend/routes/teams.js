const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');
const { teamSchema } = require('../validation/schemas');
const { createNotification, logActivity, notifyTeamManagerChange, notifyUserAddedToTeam, notifyUserRemovedFromTeam, NOTIFICATION_TYPES } = require('../utils/notifications');
const emailNotificationService = require('../services/emailNotificationService');

const router = express.Router();

// Get all teams (role-based filtering)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { department, q, page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    const userRole = req.user.role;
    const userId = req.user.id;

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Role-based filtering
    if (userRole === 'manager' && !req.query.all_teams) {
      // Managers only see teams they manage (unless all_teams is requested)
      paramCount++;
      whereConditions.push(`EXISTS (
        SELECT 1 FROM team_management_history tmh 
        WHERE tmh.team_id = t.id AND tmh.manager_id = $${paramCount} AND tmh.is_active = TRUE
      )`);
      queryParams.push(userId);
    } else if (userRole === 'employee') {
      // Employees only see teams they are members of
      paramCount++;
      whereConditions.push(`EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.team_id = t.id AND tm.user_id = $${paramCount}
      )`);
      queryParams.push(userId);
    }
    // Admins see all teams (no additional filter)

    // Department filter
    if (department) {
      paramCount++;
      whereConditions.push(`EXISTS (
        SELECT 1 FROM department_teams dt 
        WHERE dt.team_id = t.id AND dt.department_id = $${paramCount}
      )`);
      queryParams.push(department);
    }

    // Search query
    if (q) {
      paramCount++;
      whereConditions.push(`(t.name ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`);
      queryParams.push(`%${q}%`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get teams count (unique teams, not team-department combinations)
    const countQuery = `
      SELECT COUNT(DISTINCT t.id) 
      FROM teams t
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get teams with details (allowing multiple departments per team)
    paramCount++;
    const teamsQuery = `
      SELECT 
        t.id, t.name, t.description, t.created_at, t.updated_at,
        d.id as department_id, d.name as department_name,
        tmh.manager_id as current_manager_id,
        u.first_name as manager_first_name, u.last_name as manager_last_name, u.email as manager_email,
        (SELECT COUNT(DISTINCT tm2.user_id) FROM team_members tm2 WHERE tm2.team_id = t.id AND tm2.user_id NOT IN (
          SELECT tmh2.manager_id FROM team_management_history tmh2 WHERE tmh2.team_id = t.id AND tmh2.is_active = TRUE
        )) as members_count
      FROM teams t
      LEFT JOIN department_teams dt ON t.id = dt.team_id
      LEFT JOIN departments d ON dt.department_id = d.id
      LEFT JOIN team_management_history tmh ON t.id = tmh.team_id AND tmh.is_active = TRUE
      LEFT JOIN users u ON tmh.manager_id = u.id
      ${whereClause}
      ORDER BY t.id, t.name ASC, d.name ASC
    `;

    const teamsResult = await query(teamsQuery, queryParams);

    // Group teams by ID to handle multiple departments
    const teamsMap = new Map();
    
    teamsResult.rows.forEach(row => {
      if (!teamsMap.has(row.id)) {
        teamsMap.set(row.id, {
          id: row.id,
          name: row.name,
          description: row.description,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          departments: [],
          manager: row.current_manager_id ? {
            id: row.current_manager_id,
            firstName: row.manager_first_name,
            lastName: row.manager_last_name,
            email: row.manager_email
          } : null,
          membersCount: parseInt(row.members_count)
        });
      }
      
      // Add department if it exists
      if (row.department_id) {
        const existingDept = teamsMap.get(row.id).departments.find(d => d.id === row.department_id);
        if (!existingDept) {
          teamsMap.get(row.id).departments.push({
            id: row.department_id,
            name: row.department_name
          });
        }
      }
    });
    
    const allTeams = Array.from(teamsMap.values());
    
    // Apply pagination after grouping
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const teams = allTeams.slice(startIndex, endIndex);

    res.json({
      teams,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create team (admin/manager only)
router.post('/', authenticateToken, requireManager, async (req, res) => {
  try {
    const { error, value } = teamSchema.create.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, description, departmentIds, managerId } = value;

    // Check if team already exists
    const existingTeam = await query('SELECT id FROM teams WHERE name = $1', [name]);
    if (existingTeam.rows.length > 0) {
      return res.status(400).json({ message: 'Team already exists' });
    }

    // Create team
    const result = await query(`
      INSERT INTO teams (name, description, manager_user_id)
      VALUES ($1, $2, $3)
      RETURNING id, name, description, manager_user_id, created_at
    `, [name, description, managerId]);

    const team = result.rows[0];

    // Add team to departments if specified
    if (departmentIds && departmentIds.length > 0) {
      for (const departmentId of departmentIds) {
        await query(`
          INSERT INTO department_teams (department_id, team_id)
          VALUES ($1, $2)
          ON CONFLICT (department_id, team_id) DO NOTHING
        `, [departmentId, team.id]);
      }
    }

    res.status(201).json({
      id: team.id,
      name: team.name,
      description: team.description,
      departmentIds: departmentIds || [],
      managerId: team.manager_user_id,
      createdAt: team.created_at
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get team by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get team details
    const result = await query(`
      SELECT 
        t.id, t.name, t.description, t.created_at, t.updated_at
      FROM teams t
      WHERE t.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const row = result.rows[0];

    // Get current active manager from team_management_history
    const managerResult = await query(`
      SELECT 
        u.id as manager_id, u.first_name as manager_first_name, 
        u.last_name as manager_last_name, u.email as manager_email,
        u.role as manager_role, u.job_title as manager_job_title,
        u.status as manager_status, u.profile_picture_url as manager_profile_picture_url
      FROM team_management_history tmh
      JOIN users u ON tmh.manager_id = u.id
      WHERE tmh.team_id = $1 AND tmh.is_active = TRUE
    `, [id]);

    const managerRow = managerResult.rows.length > 0 ? managerResult.rows[0] : null;

    // Get team departments
    const departmentsResult = await query(`
      SELECT 
        d.id, d.name, d.description
      FROM departments d
      JOIN department_teams dt ON d.id = dt.department_id
      WHERE dt.team_id = $1
      ORDER BY d.name ASC
    `, [id]);

    // Get team members (excluding the current active manager)
    const membersResult = await query(`
      SELECT DISTINCT
        tm.user_id, tm.role_in_team, tm.joined_at,
        u.first_name, u.last_name, u.email, u.role, u.job_title, u.status,
        u.profile_picture_url
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = $1
        AND u.id NOT IN (
          SELECT tmh.manager_id 
          FROM team_management_history tmh
          WHERE tmh.team_id = $1 AND tmh.is_active = TRUE
        )
      ORDER BY tm.joined_at ASC
    `, [id]);

    // Calculate member count (excluding current active manager)
    const memberCountResult = await query(`
      SELECT COUNT(*) as member_count
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = $1
        AND u.id NOT IN (
          SELECT tmh.manager_id 
          FROM team_management_history tmh
          WHERE tmh.team_id = $1 AND tmh.is_active = TRUE
        )
    `, [id]);
    
    const memberCount = parseInt(memberCountResult.rows[0].member_count);

    const response = {
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      departments: departmentsResult.rows.map(dept => ({
        id: dept.id,
        name: dept.name,
        description: dept.description
      })),
      manager: managerRow ? {
        id: managerRow.manager_id,
        firstName: managerRow.manager_first_name,
        lastName: managerRow.manager_last_name,
        email: managerRow.manager_email,
        role: managerRow.manager_role,
        jobTitle: managerRow.manager_job_title,
        status: managerRow.manager_status,
        profilePictureUrl: managerRow.manager_profile_picture_url
      } : null,
      membersCount: membersResult.rows.length,
      members: membersResult.rows.map(member => ({
        id: member.user_id,
        firstName: member.first_name,
        lastName: member.last_name,
        email: member.email,
        role: member.role,
        jobTitle: member.job_title,
        status: member.status,
        profilePictureUrl: member.profile_picture_url,
        roleInTeam: member.role_in_team,
        joinedAt: member.joined_at
      })),
      memberCount: memberCount
    };

    res.json(response);
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update team (admin/manager only)
router.put('/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔍 Team update request received:');
    console.log('   - Team ID:', id);
    console.log('   - Request body:', req.body);
    console.log('   - Request body type:', typeof req.body);
    console.log('   - departmentIds:', req.body.departmentIds);
    console.log('   - departmentIds type:', typeof req.body.departmentIds);
    console.log('   - All request body keys:', Object.keys(req.body));
    console.log('   - Content-Type header:', req.headers['content-type']);
    
    // Check if the schema is correctly imported
    console.log('🔍 Team schema check:');
    console.log('   - teamSchema exists:', !!teamSchema);
    console.log('   - teamSchema.update exists:', !!teamSchema?.update);
    console.log('   - teamSchema.update.validate exists:', !!teamSchema?.update?.validate);
    
    const { error, value } = teamSchema.update.validate(req.body);
    
    if (error) {
      console.log('❌ Validation failed:', error.details[0].message);
      console.log('❌ Full validation error:', error);
      return res.status(400).json({ message: error.details[0].message });
    }
    
    console.log('✅ Validation passed, value:', value);

    const { name, description, departmentIds, managerId } = value;

    // Check if team exists
    const existingTeam = await query('SELECT id FROM teams WHERE id = $1', [id]);
    if (existingTeam.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check for name conflict if name is being updated
    if (name) {
      const nameConflict = await query(
        'SELECT id FROM teams WHERE name = $1 AND id != $2',
        [name, id]
      );
      if (nameConflict.rows.length > 0) {
        return res.status(400).json({ message: 'Team name already exists' });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const queryParams = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updateFields.push(`name = $${paramCount}`);
      queryParams.push(name);
    }

    if (description !== undefined) {
      paramCount++;
      updateFields.push(`description = $${paramCount}`);
      queryParams.push(description);
    }

    if (departmentIds !== undefined) {
      // Handle department relationships through department_teams junction table
      // First, remove team from all current departments
      await query('DELETE FROM department_teams WHERE team_id = $1', [id]);
      
      // Then add team to the new departments if specified
      if (departmentIds && departmentIds.length > 0) {
        for (const departmentId of departmentIds) {
          await query(`
            INSERT INTO department_teams (department_id, team_id) 
            VALUES ($1, $2) 
            ON CONFLICT (department_id, team_id) DO NOTHING
          `, [departmentId, id]);
        }
      }
    }

    if (managerId !== undefined) {
      // Handle team management history manually (trigger is disabled)
      console.log('🔄 Updating team manager (manual history handling)...');
      console.log(`   Team ID: ${id}`);
      console.log(`   New Manager ID: ${managerId}`);
      
      // Delete all existing team management history entries to avoid constraint conflicts
      const deleteResult = await query(`
        DELETE FROM team_management_history 
        WHERE team_id = $1
      `, [id]);
      console.log(`✅ Cleared existing team management history for team: ${id} (deleted ${deleteResult.rowCount} rows)`);
      
      // Insert new active manager
      const insertResult = await query(`
        INSERT INTO team_management_history (team_id, manager_id, assigned_at, is_active, reason)
        VALUES ($1, $2, NOW(), TRUE, 'Manager changed via admin update')
      `, [id, managerId]);
      console.log(`✅ Added new manager: ${managerId} (inserted ${insertResult.rowCount} rows)`);
      
      // Update teams.manager_user_id
      paramCount++;
      updateFields.push(`manager_user_id = $${paramCount}`);
      queryParams.push(managerId);
      
      console.log('✅ Manager update completed');
    } else {
      console.log('⚠️ managerId is undefined, skipping manager update');
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    paramCount++;
    queryParams.push(id);

    const updateQuery = `
      UPDATE teams 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, description, manager_user_id, created_at
    `;

    const result = await query(updateQuery, queryParams);
    const team = result.rows[0];

    // Log activity
    await logActivity(req.user.id, 'team_updated', 'team', team.id, {
      name,
      description,
      departmentIds,
      managerId
    });

    // Get old manager ID for notifications
    const oldTeamResult = await query('SELECT manager_user_id FROM teams WHERE id = $1', [id]);
    const oldManagerId = oldTeamResult.rows[0]?.manager_user_id;

    // Notify manager change if applicable
    if (managerId !== undefined && oldManagerId !== managerId) {
      await notifyTeamManagerChange(id, oldManagerId, managerId, team.name);
    }

    res.json({
      id: team.id,
      name: team.name,
      description: team.description,
      managerId: team.manager_user_id,
      createdAt: team.created_at
    });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add member to team
router.post('/:id/members', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, roleInTeam = 'member' } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Check if team exists
    const teamCheck = await query('SELECT id FROM teams WHERE id = $1', [id]);
    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user exists
    const userCheck = await query('SELECT id FROM users WHERE id = $1 AND status = \'active\'', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found or inactive' });
    }

    // Add member to team
    await query(`
      INSERT INTO team_members (team_id, user_id, role_in_team)
      VALUES ($1, $2, $3)
      ON CONFLICT (team_id, user_id) 
      DO UPDATE SET role_in_team = $3
    `, [id, userId, roleInTeam]);

    // Get team name for notification
    const teamResult = await query('SELECT name FROM teams WHERE id = $1', [id]);
    const teamName = teamResult.rows[0]?.name || 'Équipe';

    // Notify user about team assignment
    await notifyUserAddedToTeam(userId, id, teamName, req.user.id);

    res.json({ message: 'Member added to team successfully' });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove member from team
router.delete('/:id/members/:userId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Check if team exists
    const teamCheck = await query('SELECT id FROM teams WHERE id = $1', [id]);
    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Get team name for notification
    const teamResult = await query('SELECT name FROM teams WHERE id = $1', [id]);
    const teamName = teamResult.rows[0]?.name || 'Équipe';

    // Remove member from team
    const result = await query(`
      DELETE FROM team_members 
      WHERE team_id = $1 AND user_id = $2
    `, [id, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Member not found in team' });
    }

    // Notify user about team removal
    await notifyUserRemovedFromTeam(userId, id, teamName, req.user.id);

    res.json({ message: 'Member removed from team successfully' });
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

 // Note: /my-teams endpoint moved to /api/manager/my-teams for better role-based organization

// Get team members
router.get('/:id/members', authenticateToken, requireManager, async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('🔍 Get team members endpoint called');
    console.log('👤 User ID:', userId);
    console.log('👤 User Role:', userRole);
    console.log('🏢 Team ID:', teamId);

    // Check if team exists
    const teamCheck = await query(`
      SELECT manager_user_id FROM teams WHERE id = $1
    `, [teamId]);

    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Allow any manager or admin to view team members
    if (userRole !== 'admin' && userRole !== 'manager') {
      return res.status(403).json({ message: 'Access denied - managers and admins only' });
    }

    // Get team members without department info to avoid duplicates
    const result = await query(`
      SELECT DISTINCT ON (u.id)
        u.id, u.email, u.first_name, u.last_name, u.role, u.job_title, u.status, u.created_at,
        u.profile_picture_url, tm.joined_at,
        COALESCE(
          json_agg(
            jsonb_build_object(
              'id', us.id,
              'skillId', us.skill_id,
              'name', s.name,
              'level', us.level,
              'type', s.type,
              'category', s.category
            ) ORDER BY s.name
          ) FILTER (WHERE us.id IS NOT NULL), 
          '[]'::json
        ) as skills
      FROM team_members tm
      INNER JOIN users u ON tm.user_id = u.id
      LEFT JOIN user_skills us ON u.id = us.user_id
      LEFT JOIN skills s ON us.skill_id = s.id
      WHERE tm.team_id = $1 
        AND u.status = 'active'
        AND u.id NOT IN (
          SELECT manager_user_id 
          FROM teams 
          WHERE id = $1 AND manager_user_id IS NOT NULL
        )
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.role, u.job_title, u.status, u.created_at,
               u.profile_picture_url, tm.joined_at
      ORDER BY u.id, u.first_name, u.last_name
    `, [teamId]);

    // Get department information for each user separately to avoid duplicates
    const userDepartmentsResult = await query(`
      SELECT DISTINCT
        ud.user_id,
        d.id as department_id,
        d.name as department_name
      FROM user_departments ud
      JOIN departments d ON ud.department_id = d.id
      WHERE ud.user_id IN (
        SELECT DISTINCT u.id
        FROM team_members tm
        INNER JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = $1 
          AND u.status = 'active'
          AND u.id NOT IN (
            SELECT manager_user_id 
            FROM teams 
            WHERE id = $1 AND manager_user_id IS NOT NULL
          )
      )
      ORDER BY ud.user_id, d.name
    `, [teamId]);

    console.log('✅ Team members query completed');
    console.log('📊 Number of team members found:', result.rows.length);

    // Group departments by user ID
    const userDepartmentsMap = new Map();
    userDepartmentsResult.rows.forEach(row => {
      if (!userDepartmentsMap.has(row.user_id)) {
        userDepartmentsMap.set(row.user_id, []);
      }
      userDepartmentsMap.get(row.user_id).push({
        id: row.department_id,
        name: row.department_name
      });
    });

    const members = result.rows.map(row => ({
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      jobTitle: row.job_title,
      status: row.status,
      profilePictureUrl: row.profile_picture_url,
      createdAt: row.created_at,
      joinedAt: row.joined_at,
      departments: userDepartmentsMap.get(row.id) || [],
      skills: row.skills || []
    }));

    res.json({ members });
  } catch (error) {
    console.error('❌ Get team members error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add team member
router.post('/:id/members', authenticateToken, requireManager, async (req, res) => {
  try {
    const teamId = req.params.id;
    const { userId: newMemberId } = req.body;
    const managerId = req.user.id;
    const userRole = req.user.role;

    console.log('🔍 Add team member endpoint called');
    console.log('👤 Manager ID:', managerId);
    console.log('👤 User Role:', userRole);
    console.log('🏢 Team ID:', teamId);
    console.log('👤 New Member ID:', newMemberId);

    if (!newMemberId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Check if user is manager of this team (or admin)
    if (userRole !== 'admin') {
      const teamCheck = await query(`
        SELECT manager_user_id FROM teams WHERE id = $1
      `, [teamId]);

      if (teamCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Team not found' });
      }

      if (teamCheck.rows[0].manager_user_id !== managerId) {
        return res.status(403).json({ message: 'Access denied - not manager of this team' });
      }
    }

    // Check if user exists (including inactive users)
    const userCheck = await query(`
      SELECT id, first_name, last_name, role, status FROM users WHERE id = $1
    `, [newMemberId]);

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userCheck.rows[0];
    let userReactivated = false;

    // If user is inactive, reactivate them
    if (user.status === 'inactive') {
      await query(`
        UPDATE users SET status = 'active' WHERE id = $1
      `, [newMemberId]);
      userReactivated = true;
      console.log('✅ User reactivated:', user.first_name, user.last_name);
    }

    // Check if user is the manager of this team (manager/member exclusivity rule) - check this FIRST
    const teamManagerCheck = await query(`
      SELECT manager_user_id FROM teams WHERE id = $1
    `, [teamId]);

    console.log('🔍 Manager/Member exclusivity check:');
    console.log('   Team ID:', teamId);
    console.log('   New Member ID:', newMemberId);
    console.log('   Team Manager ID:', teamManagerCheck.rows[0]?.manager_user_id);
    console.log('   Are they the same?', teamManagerCheck.rows[0]?.manager_user_id === newMemberId);

    if (teamManagerCheck.rows.length > 0 && teamManagerCheck.rows[0].manager_user_id === newMemberId) {
      console.log('❌ Manager/Member exclusivity rule triggered - returning 409');
      return res.status(409).json({ message: 'This user is already the manager of this team' });
    }

    // Check if user is already a member of this team
    const existingMember = await query(`
      SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2
    `, [teamId, newMemberId]);

    if (existingMember.rows.length > 0) {
      return res.status(400).json({ message: 'User is already a member of this team' });
    }

    // Check if user is an employee or manager (both can be added to teams, but with different restrictions)
    if (user.role !== 'employee' && user.role !== 'manager') {
      return res.status(400).json({ message: 'Only employees and managers can be added to teams' });
    }

    // Add user to team
    await query(`
      INSERT INTO team_members (team_id, user_id, joined_at)
      VALUES ($1, $2, NOW())
    `, [teamId, newMemberId]);

    console.log('✅ Team member added successfully');

    // Get team name for notification
    const teamInfo = await query(`
      SELECT name FROM teams WHERE id = $1
    `, [teamId]);

    // Create notification for the new member
    const { createNotification } = require('../utils/notifications');
    await createNotification(
      newMemberId,
      'TEAM_JOINED',
      'Nouvelle équipe',
      `Vous avez été ajouté à l'équipe "${teamInfo.rows[0].name}"`,
      'team',
      teamId
    );

    // Send email notification for team member addition
    try {
      const [memberResult, managerResult] = await Promise.all([
        query('SELECT id, email, first_name, last_name FROM users WHERE id = $1', [newMemberId]),
        query('SELECT id, email, first_name, last_name FROM users WHERE id = $1', [managerId])
      ]);
      
      if (memberResult.rows.length > 0 && managerResult.rows.length > 0) {
        const team = { id: teamId, name: teamInfo.rows[0].name };
        await emailNotificationService.sendTeamMemberAdded(
          memberResult.rows[0],
          team,
          managerResult.rows[0]
        );
      }
    } catch (emailError) {
      console.error('Failed to send team member addition email:', emailError);
    }

    res.json({ message: 'Team member added successfully' });
  } catch (error) {
    console.error('❌ Add team member error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove team member
router.delete('/:id/members/:userId', authenticateToken, requireManager, async (req, res) => {
  try {
    const teamId = req.params.id;
    const memberId = req.params.userId;
    const managerId = req.user.id;
    const userRole = req.user.role;

    console.log('🔍 Remove team member endpoint called');
    console.log('👤 Manager ID:', managerId);
    console.log('👤 User Role:', userRole);
    console.log('🏢 Team ID:', teamId);
    console.log('👤 Member ID to remove:', memberId);

    // Check if user is manager of this team (or admin)
    if (userRole !== 'admin') {
      const teamCheck = await query(`
        SELECT manager_user_id FROM teams WHERE id = $1
      `, [teamId]);

      if (teamCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Team not found' });
      }

      if (teamCheck.rows[0].manager_user_id !== managerId) {
        return res.status(403).json({ message: 'Access denied - not manager of this team' });
      }
    }

    // Check if member exists in team
    const memberCheck = await query(`
      SELECT tm.id, u.first_name, u.last_name
      FROM team_members tm
      INNER JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = $1 AND tm.user_id = $2
    `, [teamId, memberId]);

    if (memberCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Team member not found' });
    }

    // Remove user from team
    await query(`
      DELETE FROM team_members WHERE team_id = $1 AND user_id = $2
    `, [teamId, memberId]);

    console.log('✅ Team member removed successfully');

    // Get team name for notification
    const teamInfo = await query(`
      SELECT name FROM teams WHERE id = $1
    `, [teamId]);

    // Create notification for the removed member
    const { createNotification } = require('../utils/notifications');
    await createNotification(
      memberId,
      'TEAM_LEFT',
      'Retrait d\'équipe',
      `Vous avez été retiré de l'équipe "${teamInfo.rows[0].name}"`,
      'team',
      teamId
    );

    // Send email notification for team member removal
    try {
      const [memberResult, managerResult] = await Promise.all([
        query('SELECT id, email, first_name, last_name FROM users WHERE id = $1', [memberId]),
        query('SELECT id, email, first_name, last_name FROM users WHERE id = $1', [managerId])
      ]);
      
      if (memberResult.rows.length > 0 && managerResult.rows.length > 0) {
        const team = { id: teamId, name: teamInfo.rows[0].name };
        await emailNotificationService.sendTeamMemberRemoved(
          memberResult.rows[0],
          team,
          managerResult.rows[0]
        );
      }
    } catch (emailError) {
      console.error('Failed to send team member removal email:', emailError);
    }

    res.json({ message: 'Team member removed successfully' });
  } catch (error) {
    console.error('❌ Remove team member error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete team (admin only)
router.delete('/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if team exists
    const teamCheck = await query('SELECT id FROM teams WHERE id = $1', [id]);
    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Delete team (cascade will handle team members)
    await query('DELETE FROM teams WHERE id = $1', [id]);

    res.status(204).send();
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;


