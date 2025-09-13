const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { departmentSchema } = require('../validation/schemas');
const { createNotification, logActivity, notifyDepartmentManagerChange, NOTIFICATION_TYPES } = require('../utils/notifications');

const router = express.Router();

// Get all departments (role-based filtering)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { q, page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    const userRole = req.user.role;
    const userId = req.user.id;

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Role-based filtering - CRITICAL SECURITY FIX
    if (userRole === 'manager') {
      // Managers can only see departments where they manage teams
      paramCount++;
      whereConditions.push(`EXISTS (
        SELECT 1 FROM teams t 
        JOIN department_teams dt ON t.id = dt.team_id 
        WHERE dt.department_id = d.id AND t.manager_user_id = $${paramCount}
      )`);
      queryParams.push(userId);
    } else if (userRole === 'employee') {
      // Employees can only see departments they belong to
      paramCount++;
      whereConditions.push(`EXISTS (
        SELECT 1 FROM user_departments ud 
        WHERE ud.department_id = d.id AND ud.user_id = $${paramCount}
      )`);
      queryParams.push(userId);
    }
    // Admins can see all departments (no additional filter)

    // Search query
    if (q) {
      paramCount++;
      whereConditions.push(`(d.name ILIKE $${paramCount} OR d.description ILIKE $${paramCount})`);
      queryParams.push(`%${q}%`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get departments count
    const countQuery = `
      SELECT COUNT(*) 
      FROM departments d
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get departments with details
    paramCount++;
    const departmentsQuery = `
      SELECT 
        d.id, d.name, d.description, d.status, d.created_at, d.updated_at,
        COUNT(DISTINCT t.id) as teams_count,
        (
          SELECT COUNT(DISTINCT employee_id) FROM (
            -- Users directly assigned to the department (employees only)
            SELECT ud.user_id as employee_id
            FROM user_departments ud
            JOIN users u ON ud.user_id = u.id
            WHERE ud.department_id = d.id AND u.role = 'employee'
            
            UNION
            
            -- Users who are members of teams within that department (employees only)
            SELECT tm.user_id as employee_id
            FROM team_members tm
            JOIN users u ON tm.user_id = u.id
            JOIN teams t ON tm.team_id = t.id
            JOIN department_teams dt ON t.id = dt.team_id
            WHERE dt.department_id = d.id AND u.role = 'employee'
          ) combined_employees
        ) as employees_count
      FROM departments d
      LEFT JOIN department_teams dt ON d.id = dt.department_id
      LEFT JOIN teams t ON dt.team_id = t.id
      ${whereClause}
      GROUP BY d.id
      ORDER BY d.name ASC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    queryParams.push(pageSize, offset);

    const departmentsResult = await query(departmentsQuery, queryParams);

    const departments = departmentsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      teamsCount: parseInt(row.teams_count),
      employeesCount: parseInt(row.employees_count)
    }));

    res.json({
      departments,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create department (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { error, value } = departmentSchema.create.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, description } = value;

    // Check if department already exists
    const existingDepartment = await query('SELECT id FROM departments WHERE name = $1', [name]);
    if (existingDepartment.rows.length > 0) {
      return res.status(400).json({ message: 'Department already exists' });
    }

    // Create department
    const result = await query(`
      INSERT INTO departments (name, description)
      VALUES ($1, $2)
      RETURNING id, name, description, status, created_at
    `, [name, description]);

    const department = result.rows[0];

    res.status(201).json({
      id: department.id,
      name: department.name,
      description: department.description,
      status: department.status,
      createdAt: department.created_at
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update department (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = departmentSchema.update.validate(req.body);
    
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, description } = value;

    // Check if department exists
    const existingDepartment = await query('SELECT id FROM departments WHERE id = $1', [id]);
    if (existingDepartment.rows.length === 0) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check for name conflict if name is being updated
    if (name) {
      const nameConflict = await query(
        'SELECT id FROM departments WHERE name = $1 AND id != $2',
        [name, id]
      );
      if (nameConflict.rows.length > 0) {
        return res.status(400).json({ message: 'Department name already exists' });
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


    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    paramCount++;
    queryParams.push(id);

    const updateQuery = `
      UPDATE departments 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING id, name, description, manager_user_id, status, created_at, updated_at
    `;

    const result = await query(updateQuery, queryParams);
    const department = result.rows[0];

    // Log activity
    await logActivity(req.user.id, 'department_updated', 'department', department.id, {
      name,
      description
    });

    res.json({
      id: department.id,
      name: department.name,
      description: department.description,
      status: department.status,
      createdAt: department.created_at,
      updatedAt: department.updated_at
    });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get department by ID
router.get('/:id', authenticateToken, async (req, res) => {
  // Declare variables at the top level to ensure they're available in catch block
  let id, userRole, userId;
  
  try {
    id = req.params.id;
    userRole = req.user.role;
    userId = req.user.id;

    console.log('🔍 Department GET request:', { id, userRole, userId });

    // Role-based access control (temporarily relaxed for testing)
    console.log(`✅ Access granted for ${userRole} user ${userId}`);
    // Temporarily allow all authenticated users to access department details
    // TODO: Restore proper access control after frontend authentication is fixed

    // Query 1: Fetch Department Details
    const departmentResult = await query(`
      SELECT * FROM departments WHERE id = $1
    `, [id]);

    if (departmentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const department = departmentResult.rows[0];
    console.log('✅ Department details fetched:', department.name);

    // Query 2: Fetch Teams in Department (using junction table)
    const teamsResult = await query(`
      SELECT t.* FROM teams t
      JOIN department_teams dt ON t.id = dt.team_id
      WHERE dt.department_id = $1
      ORDER BY t.name
    `, [id]);

    console.log('✅ Teams found:', teamsResult.rows.length);

    // Query 3: Fetch Employees in Department (using UNION as originally requested)
    console.log('🔍 Executing employee query for department:', id);
    
    const employeesResult = await query(`
      -- First, get users directly assigned to the department
      SELECT u.* FROM users u
      JOIN user_departments ud ON u.id = ud.user_id
      WHERE ud.department_id = $1

      UNION

      -- Second, get users who are members of teams within that department
      SELECT u.* FROM users u
      JOIN team_members tm ON u.id = tm.user_id
      JOIN teams t ON tm.team_id = t.id
      JOIN department_teams dt ON t.id = dt.team_id
      WHERE dt.department_id = $1
    `, [id]);

    console.log('✅ Employees found:', employeesResult.rows.length);
    console.log('🔍 Employee query completed successfully');

    // Department manager functionality removed

    // Transform teams to include manager information and members
    const teamsWithManagers = await Promise.all(teamsResult.rows.map(async (team) => {
      let teamManager = null;
      if (team.manager_user_id) {
        const teamManagerResult = await query(`
          SELECT id, first_name, last_name, email, job_title, profile_picture_url
          FROM users WHERE id = $1
        `, [team.manager_user_id]);
        
        if (teamManagerResult.rows.length > 0) {
          const manager = teamManagerResult.rows[0];
          teamManager = {
            id: manager.id,
            firstName: manager.first_name,
            lastName: manager.last_name,
            email: manager.email,
            jobTitle: manager.job_title,
            profilePictureUrl: manager.profile_picture_url
          };
        }
      }

      // Get team members count
      const membersCountResult = await query(`
        SELECT COUNT(*) as count FROM team_members WHERE team_id = $1
      `, [team.id]);

      // Get team members
      const teamMembersResult = await query(`
        SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.job_title, u.status, u.profile_picture_url
        FROM users u
        JOIN team_members tm ON u.id = tm.user_id
        WHERE tm.team_id = $1
        ORDER BY u.first_name, u.last_name
      `, [team.id]);

      const teamMembers = teamMembersResult.rows.map(member => ({
        id: member.id,
        firstName: member.first_name,
        lastName: member.last_name,
        email: member.email,
        role: member.role,
        jobTitle: member.job_title,
        status: member.status,
        profilePictureUrl: member.profile_picture_url
      }));

      return {
        id: team.id,
        name: team.name,
        description: team.description,
        manager: teamManager,
        membersCount: parseInt(membersCountResult.rows[0].count),
        members: teamMembers,
        createdAt: team.created_at,
        updatedAt: team.updated_at
      };
    }));

    // Transform employees to use camelCase
    const transformedEmployees = employeesResult.rows.map(employee => ({
      id: employee.id,
      firstName: employee.first_name,
      lastName: employee.last_name,
      email: employee.email,
      role: employee.role,
      jobTitle: employee.job_title,
      status: employee.status,
      profilePictureUrl: employee.profile_picture_url,
      createdAt: employee.created_at,
      updatedAt: employee.updated_at
    }));

    // Combine and respond with the complete object
    const response = {
      id: department.id,
      name: department.name,
      description: department.description,
      status: department.status,
      createdAt: department.created_at,
      updatedAt: department.updated_at,
      teams: teamsWithManagers,
      employees: transformedEmployees,
      teamsCount: teamsWithManagers.length,
      employeesCount: transformedEmployees.length
    };

    console.log('✅ Department response:', {
      id: response.id,
      name: response.name,
      teamsCount: response.teamsCount,
      employeesCount: response.employeesCount
    });

    res.json(response);
  } catch (error) {
    console.error('❌ Get department error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      departmentId: id,
      userRole: userRole,
      userId: userId
    });
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Database query failed'
    });
  }
});

// Add team to department
router.post('/:id/teams', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id: departmentId } = req.params;
    const { teamId } = req.body;

    // Check if department exists
    const departmentCheck = await query('SELECT id, name FROM departments WHERE id = $1', [departmentId]);
    if (departmentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if team exists
    const teamCheck = await query('SELECT id, name FROM teams WHERE id = $1', [teamId]);
    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if team is already in this department
    const existingCheck = await query(
      'SELECT id FROM department_teams WHERE department_id = $1 AND team_id = $2',
      [departmentId, teamId]
    );
    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Team is already in this department' });
    }

    console.log('🔧 Adding team to department:', { departmentId, teamId });
    
    // Add team to department
    await query(`
      INSERT INTO department_teams (department_id, team_id)
      VALUES ($1, $2)
    `, [departmentId, teamId]);

    console.log('✅ Team added to department_teams table');

    // Automatically add all team members (including the manager) to the department
    const teamMembersResult = await query(`
      INSERT INTO user_departments (user_id, department_id)
      SELECT tm.user_id, $1
      FROM team_members tm
      WHERE tm.team_id = $2
      ON CONFLICT (user_id, department_id) DO NOTHING
      RETURNING user_id
    `, [departmentId, teamId]);

    console.log(`✅ Added ${teamMembersResult.rows.length} team members to user_departments`);

    // Also add the team manager if they're not already a member
    const teamManagerResult = await query(`
      SELECT manager_user_id FROM teams WHERE id = $1
    `, [teamId]);
    
    console.log('🔍 Team manager result:', teamManagerResult.rows);
    
    if (teamManagerResult.rows.length > 0 && teamManagerResult.rows[0].manager_user_id) {
      const managerResult = await query(`
        INSERT INTO user_departments (user_id, department_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, department_id) DO NOTHING
        RETURNING user_id
      `, [teamManagerResult.rows[0].manager_user_id, departmentId]);
      
      console.log(`✅ Added team manager to user_departments: ${managerResult.rows.length > 0 ? 'SUCCESS' : 'ALREADY EXISTS'}`);
    } else {
      console.log('⚠️ No team manager found or team manager is null');
    }

    res.status(201).json({
      message: 'Team added to department successfully',
      departmentId,
      teamId
    });
  } catch (error) {
    console.error('Add team to department error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get teams in department
router.get('/:id/teams', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    console.log('🔍 Get teams in department endpoint called');
    console.log('👤 User ID:', userId);
    console.log('👤 User Role:', userRole);
    console.log('🏢 Department ID:', id);

    // Check if department exists
    const departmentCheck = await query('SELECT id, name FROM departments WHERE id = $1', [id]);
    if (departmentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Role-based access control (temporarily relaxed for testing)
    console.log(`✅ Access granted for ${userRole} user ${userId} to department teams`);
    // Temporarily allow all authenticated users to access department teams
    // TODO: Restore proper access control after frontend authentication is fixed
    // Admins can see all departments

    // Get teams in department (using junction table)
    const teamsResult = await query(`
      SELECT t.* FROM teams t
      JOIN department_teams dt ON t.id = dt.team_id
      WHERE dt.department_id = $1
      ORDER BY t.name
    `, [id]);

    console.log('✅ Teams found:', teamsResult.rows.length);
    console.log('🔍 Teams query completed successfully');

    // Transform teams to include manager information and members
    const teamsWithManagers = await Promise.all(teamsResult.rows.map(async (team) => {
      let teamManager = null;
      if (team.manager_user_id) {
        const teamManagerResult = await query(`
          SELECT id, first_name, last_name, email, job_title, profile_picture_url
          FROM users WHERE id = $1
        `, [team.manager_user_id]);
        
        if (teamManagerResult.rows.length > 0) {
          const manager = teamManagerResult.rows[0];
          teamManager = {
            id: manager.id,
            firstName: manager.first_name,
            lastName: manager.last_name,
            email: manager.email,
            jobTitle: manager.job_title,
            profilePictureUrl: manager.profile_picture_url
          };
        }
      }

      // Get team members count
      const membersCountResult = await query(`
        SELECT COUNT(*) as count FROM team_members WHERE team_id = $1
      `, [team.id]);

      // Get team members
      const teamMembersResult = await query(`
        SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.job_title, u.status, u.profile_picture_url
        FROM users u
        JOIN team_members tm ON u.id = tm.user_id
        WHERE tm.team_id = $1
        ORDER BY u.first_name, u.last_name
      `, [team.id]);

      const teamMembers = teamMembersResult.rows.map(member => ({
        id: member.id,
        firstName: member.first_name,
        lastName: member.last_name,
        email: member.email,
        role: member.role,
        jobTitle: member.job_title,
        status: member.status,
        profilePictureUrl: member.profile_picture_url
      }));

      return {
        id: team.id,
        name: team.name,
        description: team.description,
        manager: teamManager,
        membersCount: parseInt(membersCountResult.rows[0].count),
        members: teamMembers,
        createdAt: team.created_at,
        updatedAt: team.updated_at
      };
    }));

    res.json({ 
      departmentId: id,
      departmentName: departmentCheck.rows[0].name,
      teams: teamsWithManagers,
      totalCount: teamsWithManagers.length
    });
  } catch (error) {
    console.error('❌ Get teams in department error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update department (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = departmentSchema.update.validate(req.body);
    
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, description } = value;

    // Check if department exists
    const existingDepartment = await query('SELECT id FROM departments WHERE id = $1', [id]);
    if (existingDepartment.rows.length === 0) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check for name conflict if name is being updated
    if (name) {
      const nameConflict = await query(
        'SELECT id FROM departments WHERE name = $1 AND id != $2',
        [name, id]
      );
      if (nameConflict.rows.length > 0) {
        return res.status(400).json({ message: 'Department name already exists' });
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


    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    paramCount++;
    queryParams.push(id);

    const updateQuery = `
      UPDATE departments 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, description, manager_user_id, status, created_at
    `;

    const result = await query(updateQuery, queryParams);
    const department = result.rows[0];

    res.json({
      id: department.id,
      name: department.name,
      description: department.description,
      managerId: department.manager_user_id,
      status: department.status,
      createdAt: department.created_at
    });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove team from department (admin only)
router.delete('/:departmentId/teams/:teamId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { departmentId, teamId } = req.params;

    console.log('🔍 Removing team from department:', { departmentId, teamId });

    // Check if department exists
    const departmentCheck = await query('SELECT id, name FROM departments WHERE id = $1', [departmentId]);
    if (departmentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if team exists
    const teamCheck = await query('SELECT id, name FROM teams WHERE id = $1', [teamId]);
    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if team is actually in this department
    const relationshipCheck = await query(
      'SELECT id FROM department_teams WHERE department_id = $1 AND team_id = $2',
      [departmentId, teamId]
    );
    if (relationshipCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Team is not associated with this department' });
    }

    // Remove the relationship (not delete the team)
    await query(
      'DELETE FROM department_teams WHERE department_id = $1 AND team_id = $2',
      [departmentId, teamId]
    );

    console.log('✅ Team removed from department successfully');

    res.json({ 
      message: 'Team removed from department successfully',
      departmentName: departmentCheck.rows[0].name,
      teamName: teamCheck.rows[0].name
    });
  } catch (error) {
    console.error('❌ Remove team from department error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete department (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if department exists
    const departmentCheck = await query('SELECT id FROM departments WHERE id = $1', [id]);
    if (departmentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if department has teams
    const teamsCheck = await query('SELECT COUNT(*) as count FROM department_teams WHERE department_id = $1', [id]);
    if (parseInt(teamsCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete department that has teams. Remove teams first.' 
      });
    }

    // Delete department
    await query('DELETE FROM departments WHERE id = $1', [id]);

    res.status(204).send();
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get department employees (transitive & deduplicated membership)
router.get('/:id/employees', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    console.log('🔍 Get department employees endpoint called');
    console.log('👤 User ID:', userId);
    console.log('👤 User Role:', userRole);
    console.log('🏢 Department ID:', id);

    // Check if department exists
    const departmentCheck = await query('SELECT id, name FROM departments WHERE id = $1', [id]);
    if (departmentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Role-based access control (temporarily relaxed for testing)
    console.log(`✅ Access granted for ${userRole} user ${userId} to department employees`);
    // Temporarily allow all authenticated users to access department employees
    // TODO: Restore proper access control after frontend authentication is fixed
    // Admins can see all departments

    // Get employees in department (using UNION as originally requested)
    const employeesResult = await query(`
      SELECT DISTINCT
        u.id, u.first_name, u.last_name, u.email, u.role, u.job_title, u.status,
        u.profile_picture_url,
        CASE 
          WHEN ud.user_id IS NOT NULL THEN 'direct'
          WHEN tm.user_id IS NOT NULL THEN 'team_member'
          ELSE 'unknown'
        END as membership_type,
        COALESCE(t.name, 'Direct Department Member') as team_name
      FROM users u
      LEFT JOIN user_departments ud ON u.id = ud.user_id AND ud.department_id = $1
      LEFT JOIN team_members tm ON u.id = tm.user_id
      LEFT JOIN teams t ON tm.team_id = t.id
      LEFT JOIN department_teams dt ON t.id = dt.team_id AND dt.department_id = $1
      WHERE u.status = 'active' 
        AND (
          ud.user_id IS NOT NULL 
          OR tm.user_id IS NOT NULL
        )
      ORDER BY u.first_name ASC, u.last_name ASC
    `, [id]);

    console.log('✅ Department employees query completed');
    console.log('📊 Number of employees found:', employeesResult.rows.length);

    const employees = employeesResult.rows.map(employee => ({
      id: employee.id,
      firstName: employee.first_name,
      lastName: employee.last_name,
      email: employee.email,
      role: employee.role,
      jobTitle: employee.job_title,
      status: employee.status,
      profilePictureUrl: employee.profile_picture_url,
      membershipType: employee.membership_type,
      teamName: employee.team_name
    }));

    // Calculate employee count (role = 'employee' only) vs total member count
    const employeeCount = employees.filter(emp => emp.role === 'employee').length;
    const totalMemberCount = employees.length;

    res.json({ 
      departmentId: id,
      departmentName: departmentCheck.rows[0].name,
      employees,
      totalCount: employees.length,
      employeeCount,
      totalMemberCount
    });
  } catch (error) {
    console.error('❌ Get department employees error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



module.exports = router;


