const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { authenticateToken, requireAdmin, requireManager } = require('../middleware/auth');
const { userSchema } = require('../validation/schemas');
const { createNotification, logActivity, NOTIFICATION_TYPES } = require('../utils/notifications');
const { getFullUserProfile } = require('../utils/userProfile');
const emailNotificationService = require('../services/emailNotificationService');

const router = express.Router();

// Get current user's profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get complete user profile using the reusable function
    const completeUser = await getFullUserProfile(userId);

    // Get user's job titles
    const jobTitleResult = await query(`
      SELECT jt.id, jt.title, jt.description
      FROM job_titles jt
      JOIN user_job_titles ujt ON jt.id = ujt.job_title_id
      WHERE ujt.user_id = $1 AND ujt.is_active = TRUE
      ORDER BY jt.title
    `, [userId]);

    // Get official job title info
    const officialJobTitleResult = await query(`
      SELECT jt.id, jt.title, jt.description
      FROM job_titles jt
      WHERE jt.id = $1
    `, [completeUser.official_job_title_id]);

    res.json({
      user: {
        ...completeUser,
        skillsCount: completeUser.skills.length,
        jobTitleIds: jobTitleResult.rows.map(jt => jt.id),
        currentJobTitles: jobTitleResult.rows,
        officialJobTitle: officialJobTitleResult.rows[0] || null
      }
    });

    console.log('✅ /users/profile response:', {
      userId: completeUser.id,
      teamsCount: completeUser.teams.length,
      departmentsCount: completeUser.departments.length,
      skillsCount: completeUser.skills.length,
      jobTitlesCount: jobTitleResult.rows.length,
      officialJobTitleId: completeUser.official_job_title_id
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Set user's official job title
router.put('/official-job-title', authenticateToken, async (req, res) => {
  try {
    const { job_title_id } = req.body;
    const userId = req.user.id;

    if (!job_title_id) {
      return res.status(400).json({ message: 'Job title ID is required' });
    }

    // Use the database function to set official job title
    const result = await query('SELECT set_user_official_job_title($1, $2) as success', [userId, job_title_id]);

    if (result.rows[0].success) {
      // Log activity
      await logActivity(userId, 'profile_update', `Official job title updated to job title ID: ${job_title_id}`);

      res.json({ 
        message: 'Official job title updated successfully',
        official_job_title_id: job_title_id
      });
    } else {
      res.status(400).json({ 
        message: 'Invalid job title or user does not have this job title assigned' 
      });
    }
  } catch (error) {
    console.error('Set official job title error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Check and auto-assign job titles based on skill requirements
router.post('/check-and-assign-job-titles', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const assignedJobTitles = [];

    // Get all job titles
    const jobTitlesResult = await query('SELECT id, title FROM job_titles ORDER BY title');
    
    for (const jobTitle of jobTitlesResult.rows) {
      // Check if user already has this job title
      const existingAssignment = await query(`
        SELECT id FROM user_job_titles 
        WHERE user_id = $1 AND job_title_id = $2 AND is_active = TRUE
      `, [userId, jobTitle.id]);

      if (existingAssignment.rows.length > 0) {
        continue; // User already has this job title
      }

      // Get job title requirements
      const requirementsResult = await query(`
        SELECT s.id as skill_id, s.name as skill_name, jtsr.required_level
        FROM job_title_skill_requirements jtsr
        JOIN skills s ON jtsr.skill_id = s.id
        WHERE jtsr.job_title_id = $1
      `, [jobTitle.id]);

      if (requirementsResult.rows.length === 0) {
        continue; // No requirements for this job title
      }

      // Check if user meets all requirements
      let meetsAllRequirements = true;
      for (const requirement of requirementsResult.rows) {
        const userSkillResult = await query(`
          SELECT level FROM user_skills 
          WHERE user_id = $1 AND skill_id = $2
        `, [userId, requirement.skill_id]);

        if (userSkillResult.rows.length === 0 || userSkillResult.rows[0].level < requirement.required_level) {
          meetsAllRequirements = false;
          break;
        }
      }

      // If user meets all requirements, assign the job title
      if (meetsAllRequirements) {
        await query(`
          INSERT INTO user_job_titles (user_id, job_title_id, is_active, created_at)
          VALUES ($1, $2, TRUE, now())
        `, [userId, jobTitle.id]);

        assignedJobTitles.push({
          id: jobTitle.id,
          title: jobTitle.title
        });

        // Log activity
        await logActivity(userId, 'job_title_assigned', `Automatically assigned job title: ${jobTitle.title}`);
      }
    }

    res.json({
      message: 'Job title check completed',
      assignedJobTitles: assignedJobTitles,
      count: assignedJobTitles.length
    });

  } catch (error) {
    console.error('Check and assign job titles error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update current user's profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { first_name, last_name, job_title, profile_picture_url } = req.body;

    const result = await query(
      'UPDATE users SET first_name = $1, last_name = $2, job_title = $3, profile_picture_url = $4 WHERE id = $5 RETURNING *',
      [first_name, last_name, job_title, profile_picture_url, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        jobTitle: user.job_title,
        profilePictureUrl: user.profile_picture_url
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all users (with filters)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { role, department, team, managerId, q, status, include_inactive, page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    const userRole = req.user.role;
    const userId = req.user.id;

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Role-based filtering - CRITICAL SECURITY FIX
    if (userRole === 'manager') {
      // Managers can only see users in teams they manage OR their own profile
      paramCount++;
      whereConditions.push(`(
        u.id = $${paramCount} OR
        EXISTS (
          SELECT 1 FROM teams t 
          JOIN team_members tm ON t.id = tm.team_id 
          WHERE tm.user_id = u.id AND t.manager_user_id = $${paramCount}
        )
      )`);
      queryParams.push(userId);
    }
    // Admins can see all users (no additional filter)

    // Status filter
    if (status) {
      paramCount++;
      whereConditions.push(`u.status = $${paramCount}`);
      queryParams.push(status);
    } else if (!include_inactive) {
      // If include_inactive is not specified, only show active users by default
      paramCount++;
      whereConditions.push(`u.status = $${paramCount}`);
      queryParams.push('active');
    }
    // If include_inactive is specified, show all users (both active and inactive)

    // Role filter
    if (role) {
      paramCount++;
      whereConditions.push(`u.role = $${paramCount}`);
      queryParams.push(role);
    }

    // Department filter
    if (department) {
      paramCount++;
      whereConditions.push(`d.id = $${paramCount}`);
      queryParams.push(department);
    }

    // Team filter
    if (team) {
      paramCount++;
      whereConditions.push(`t.id = $${paramCount}`);
      queryParams.push(team);
    }

    // Search query
    if (q) {
      paramCount++;
      whereConditions.push(`(u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`);
      queryParams.push(`%${q}%`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get users count - Fixed to prevent duplicates
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) 
      FROM users u
      LEFT JOIN (
        SELECT DISTINCT ON (tm.user_id) tm.user_id, tm.team_id
        FROM team_members tm
        ORDER BY tm.user_id, tm.joined_at DESC
      ) tm ON u.id = tm.user_id
      LEFT JOIN teams t ON tm.team_id = t.id
      LEFT JOIN (
        SELECT DISTINCT ON (dt.team_id) dt.team_id, dt.department_id
        FROM department_teams dt
        ORDER BY dt.team_id, dt.department_id
      ) dt ON t.id = dt.team_id
      LEFT JOIN departments d ON dt.department_id = d.id
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get users with details - Return all departments and teams
    paramCount++;
    const usersQuery = `
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.role, u.job_title, u.status, u.created_at,
        u.profile_picture_url, t.manager_user_id
      FROM users u
      LEFT JOIN (
        SELECT DISTINCT ON (tm.user_id) tm.user_id, tm.team_id
        FROM team_members tm
        ORDER BY tm.user_id, tm.joined_at DESC
      ) tm ON u.id = tm.user_id
      LEFT JOIN teams t ON tm.team_id = t.id
      ${whereClause}
      ORDER BY u.first_name ASC, u.last_name ASC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    queryParams.push(pageSize, offset);

    const usersResult = await query(usersQuery, queryParams);

    // Get departments and teams for each user
    const users = await Promise.all(usersResult.rows.map(async (row) => {
      // Get user's departments (direct + through teams)
      const deptResult = await query(`
        SELECT DISTINCT d.id, d.name
        FROM departments d
        WHERE d.id IN (
          SELECT ud.department_id FROM user_departments ud WHERE ud.user_id = $1
          UNION
          SELECT dt.department_id FROM team_members tm
          JOIN department_teams dt ON tm.team_id = dt.team_id
          WHERE tm.user_id = $1
        )
        ORDER BY d.name
      `, [row.id]);
      
      // Get user's teams
      const teamResult = await query(`
        SELECT t.id, t.name
        FROM teams t
        JOIN team_members tm ON t.id = tm.team_id
        WHERE tm.user_id = $1
        ORDER BY t.name
      `, [row.id]);
      
      // Get user's job titles
      const jobTitleResult = await query(`
        SELECT jt.id, jt.title
        FROM job_titles jt
        JOIN user_job_titles ujt ON jt.id = ujt.job_title_id
        WHERE ujt.user_id = $1 AND ujt.is_active = TRUE
        ORDER BY jt.title
      `, [row.id]);
      
      return {
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        role: row.role,
        jobTitle: row.job_title,
        jobTitleIds: jobTitleResult.rows.map(jt => jt.id), // Add job title IDs
        status: row.status,
        profilePictureUrl: row.profile_picture_url,
        createdAt: row.created_at,
        departments: deptResult.rows.map(dept => ({
          id: dept.id,
          name: dept.name
        })),
        teams: teamResult.rows.map(team => ({
          id: team.id,
          name: team.name
        })),
        // For backward compatibility, keep first department and team
        department: deptResult.rows[0] ? {
          id: deptResult.rows[0].id,
          name: deptResult.rows[0].name
        } : null,
        team: teamResult.rows[0] ? {
          id: teamResult.rows[0].id,
          name: teamResult.rows[0].name
        } : null,
        managerId: row.manager_user_id
      };
    }));

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create user (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { error, value } = userSchema.create.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email, password, firstName, lastName, role, jobTitleIds, profile_picture_url, departmentIds, teamIds } = value;

    // SECURITY: Prevent admin creation - only one admin allowed
    if (role === 'admin') {
      return res.status(403).json({ message: 'Admin creation is not allowed. Only one admin account is permitted.' });
    }

    // Check if email already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get job title names if jobTitleIds are provided
    let jobTitleNames = [];
    if (jobTitleIds && jobTitleIds.length > 0) {
      const jobTitleResult = await query('SELECT id, title FROM job_titles WHERE id = ANY($1)', [jobTitleIds]);
      jobTitleNames = jobTitleResult.rows.map(row => row.title);
    }

    // Create user (store first job title in the legacy field for backward compatibility)
    const result = await query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, job_title, profile_picture_url, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      RETURNING id, email, first_name, last_name, role, job_title, profile_picture_url, status, created_at
    `, [email, hashedPassword, firstName, lastName, role, jobTitleNames[0] || '', profile_picture_url]);

    const user = result.rows[0];

    // Assign multiple job titles to user if provided
    if (jobTitleIds && jobTitleIds.length > 0) {
      try {
        for (const jobTitleId of jobTitleIds) {
          // Insert into user_job_titles table
          await query(`
            INSERT INTO user_job_titles (user_id, job_title_id, assigned_by, is_active)
            VALUES ($1, $2, $3, TRUE)
            ON CONFLICT (user_id, job_title_id) DO NOTHING
          `, [user.id, jobTitleId, req.user.id]);

          console.log(`✅ Assigned job title ${jobTitleId} to user ${user.id}`);
        }

        // The database triggers will automatically assign skills from all job titles
        console.log(`✅ Assigned ${jobTitleIds.length} job titles to user ${user.id}`);
      } catch (error) {
        console.error('Error assigning job titles:', error);
        // Don't fail user creation if job title assignment fails
      }
    }

    // Add user to departments if specified
    if (departmentIds && departmentIds.length > 0) {
      for (const deptId of departmentIds) {
        await query(`
          INSERT INTO user_departments (user_id, department_id)
          VALUES ($1, $2)
          ON CONFLICT (user_id, department_id) DO NOTHING
        `, [user.id, deptId]);
        
        // Get department name for notification
        const deptResult = await query('SELECT name FROM departments WHERE id = $1', [deptId]);
        const deptName = deptResult.rows[0]?.name || 'Département';
        
        // Notify user about department assignment
        await createNotification(
          user.id,
          NOTIFICATION_TYPES.DEPARTMENT_ASSIGNED,
          'Nouvelle affectation de département',
          `Vous avez été affecté au département: ${deptName}`,
          'department',
          deptId
        );

        // Send email notification for department assignment
        try {
          const department = { id: deptId, name: deptName };
          await emailNotificationService.sendDepartmentAssignment(department, user, null);
        } catch (emailError) {
          console.error('Failed to send department assignment email:', emailError);
        }
      }
    }

    // Add user to teams if specified
    if (teamIds && teamIds.length > 0) {
      for (const teamId of teamIds) {
        await query(`
          INSERT INTO team_members (user_id, team_id, role_in_team, joined_at)
          VALUES ($1, $2, 'member', now())
        `, [user.id, teamId]);
        
        // Get team name for notification
        const teamResult = await query('SELECT name FROM teams WHERE id = $1', [teamId]);
        const teamName = teamResult.rows[0]?.name || 'Équipe';
        
        // Notify user about team assignment
        await createNotification(
          user.id,
          NOTIFICATION_TYPES.TEAM_ASSIGNED,
          'Nouvelle affectation d\'équipe',
          `Vous avez été affecté à l'équipe: ${teamName}`,
          'team',
          teamId
        );

        // Send email notification for team assignment
        try {
          const team = { id: teamId, name: teamName };
          // Get team manager for the email
          const managerResult = await query(`
            SELECT u.first_name, u.last_name, u.email 
            FROM team_management_history tmh
            JOIN users u ON tmh.manager_id = u.id
            WHERE tmh.team_id = $1 AND tmh.is_active = TRUE
            LIMIT 1
          `, [teamId]);
          const manager = managerResult.rows[0] || null;
          await emailNotificationService.sendTeamMemberAdded(user, team, manager);
        } catch (emailError) {
          console.error('Failed to send team assignment email:', emailError);
        }
      }
    }

    res.status(201).json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      jobTitle: user.job_title,
      profilePictureUrl: user.profile_picture_url,
      status: user.status,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get public profile by user ID
router.get('/:id/profile', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;

    console.log('🔍 Get public profile endpoint called');
    console.log('👤 Requesting user ID:', requestingUserId);
    console.log('👤 Target user ID:', id);

    // Get complete user profile using the reusable function
    const completeUser = await getFullUserProfile(id);

    // Check if user is active
    if (completeUser.status !== 'active') {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's job titles
    const jobTitleResult = await query(`
      SELECT jt.id, jt.title, jt.description
      FROM job_titles jt
      JOIN user_job_titles ujt ON jt.id = ujt.job_title_id
      WHERE ujt.user_id = $1 AND ujt.is_active = TRUE
      ORDER BY jt.title
    `, [id]);

    // Get official job title info
    const officialJobTitleResult = await query(`
      SELECT jt.id, jt.title, jt.description
      FROM job_titles jt
      WHERE jt.id = $1
    `, [completeUser.official_job_title_id]);

    const response = {
      id: completeUser.id,
      firstName: completeUser.firstName,
      lastName: completeUser.lastName,
      role: completeUser.role,
      jobTitle: completeUser.jobTitle,
      profilePictureUrl: completeUser.profilePictureUrl,
      createdAt: completeUser.createdAt,
      skills: completeUser.skills.map(skill => ({
        id: skill.skillId,
        name: skill.name,
        type: skill.type,
        category: skill.category,
        description: skill.description || '',
        level: skill.level,
        acquiredAt: skill.acquiredAt || null
      })),
      teams: completeUser.teams,
      departments: completeUser.departments,
      currentJobTitles: jobTitleResult.rows,
      officialJobTitle: officialJobTitleResult.rows[0] || null
    };

    console.log('✅ Public profile query completed');
    console.log('📊 Skills found:', response.skills.length);
    console.log('📊 Teams found:', response.teams.length);
    console.log('📊 Departments found:', response.departments.length);
    console.log('📊 Job titles found:', response.currentJobTitles.length);
    console.log('📊 Official job title:', response.officialJobTitle?.title || 'None');

    res.json(response);
  } catch (error) {
    console.error('❌ Get public profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user by ID (admin/manager only)
router.get('/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;

    // Get user details
    const userResult = await query(`
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.role, u.job_title,
        u.profile_picture_url, u.created_at
      FROM users u 
      WHERE u.id = $1 AND u.status = 'active'
    `, [id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get user's teams
    const teamsResult = await query(`
      SELECT t.id, t.name, t.description, tm.role_in_team
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = $1
    `, [id]);

    // Get user's skills
    const skillsResult = await query(`
      SELECT s.id as skill_id, s.name, s.type, s.category, us.level
      FROM skills s
      JOIN user_skills us ON s.id = us.skill_id
      WHERE us.user_id = $1 AND s.is_active = true
      ORDER BY s.name
    `, [id]);

    // Get user's departments (using many-to-many relationship)
    const departmentsResult = await query(`
      SELECT d.id, d.name, ud.assigned_at
      FROM departments d
      JOIN user_departments ud ON d.id = ud.department_id
      WHERE ud.user_id = $1
      ORDER BY ud.assigned_at DESC
    `, [id]);

    const response = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      jobTitle: user.job_title,
      profilePictureUrl: user.profile_picture_url,
      createdAt: user.created_at,
      teams: teamsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        roleInTeam: row.role_in_team
      })),
      skills: skillsResult.rows.map(row => ({
        skillId: row.skill_id,
        name: row.name,
        type: row.type,
        category: row.category,
        level: row.level
      })),
      departments: departmentsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        assignedAt: row.assigned_at
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user
router.put('/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = userSchema.update.validate(req.body);
    
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { firstName, lastName, jobTitleIds, role, status, profile_picture_url, departmentIds, teamIds } = value;

    // SECURITY: Prevent role change to admin - only one admin allowed
    if (role === 'admin') {
      return res.status(403).json({ message: 'Role cannot be changed to admin. Only one admin account is permitted.' });
    }

    // Check if user exists
    const existingUser = await query('SELECT id FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Build update query dynamically
    const updateFields = [];
    const queryParams = [];
    let paramCount = 0;

    if (firstName !== undefined) {
      paramCount++;
      updateFields.push(`first_name = $${paramCount}`);
      queryParams.push(firstName);
    }

    if (lastName !== undefined) {
      paramCount++;
      updateFields.push(`last_name = $${paramCount}`);
      queryParams.push(lastName);
    }

    if (jobTitleIds !== undefined) {
      // Get job title names if jobTitleIds are provided
      let jobTitleName = '';
      if (jobTitleIds && jobTitleIds.length > 0) {
        const jobTitleResult = await query('SELECT id, title FROM job_titles WHERE id = ANY($1)', [jobTitleIds]);
        jobTitleName = jobTitleResult.rows[0]?.title || '';
      }
      
      paramCount++;
      updateFields.push(`job_title = $${paramCount}`);
      queryParams.push(jobTitleName);
    }

    if (role !== undefined) {
      paramCount++;
      updateFields.push(`role = $${paramCount}`);
      queryParams.push(role);
    }

    if (status !== undefined) {
      paramCount++;
      updateFields.push(`status = $${paramCount}`);
      queryParams.push(status);
    }

    if (profile_picture_url !== undefined) {
      paramCount++;
      updateFields.push(`profile_picture_url = $${paramCount}`);
      queryParams.push(profile_picture_url);
    }

    if (updateFields.length === 0 && !departmentIds && !teamIds) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    // Update user basic info if there are fields to update
    if (updateFields.length > 0) {
      paramCount++;
      queryParams.push(id);

      const updateQuery = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, email, first_name, last_name, role, job_title, status, profile_picture_url, created_at
      `;

      const result = await query(updateQuery, queryParams);
      var user = result.rows[0];
    } else {
      // Get user info without updating
      const result = await query('SELECT id, email, first_name, last_name, role, job_title, status, profile_picture_url, created_at FROM users WHERE id = $1', [id]);
      var user = result.rows[0];
    }

    // Handle department assignments if provided
    if (departmentIds !== undefined) {
      // Get current departments for comparison
      const currentDeptsResult = await query('SELECT department_id FROM user_departments WHERE user_id = $1', [id]);
      const currentDeptIds = currentDeptsResult.rows.map(row => row.department_id);
      
      // Remove user from all current departments
      await query('DELETE FROM user_departments WHERE user_id = $1', [id]);
      
      // Add user to the new departments if specified
      if (departmentIds && departmentIds.length > 0) {
        // Reactivate user if they were inactive and are being assigned to a department
        if (user.status === 'inactive') {
          await query('UPDATE users SET status = \'active\' WHERE id = $1', [id]);
          user.status = 'active';
          console.log('✅ User reactivated due to department assignment:', user.first_name, user.last_name);
        }
        
        for (const deptId of departmentIds) {
          await query(`
            INSERT INTO user_departments (user_id, department_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, department_id) DO NOTHING
          `, [id, deptId]);
          
          // Notify if this is a new department assignment
          if (!currentDeptIds.includes(deptId)) {
            const deptResult = await query('SELECT name FROM departments WHERE id = $1', [deptId]);
            const deptName = deptResult.rows[0]?.name || 'Département';
            
            await createNotification(
              id,
              NOTIFICATION_TYPES.DEPARTMENT_ASSIGNED,
              'Nouvelle affectation de département',
              `Vous avez été affecté au département: ${deptName}`,
              'department',
              deptId
            );
          }
        }
      }
    }

    // Handle team assignments if provided
    if (teamIds !== undefined) {
      // Remove user from all current teams
      await query('DELETE FROM team_members WHERE user_id = $1', [id]);
      
      // Add user to the new teams if specified
      if (teamIds && teamIds.length > 0) {
        // Reactivate user if they were inactive and are being assigned to a team
        if (user.status === 'inactive') {
          await query('UPDATE users SET status = \'active\' WHERE id = $1', [id]);
          user.status = 'active';
          console.log('✅ User reactivated due to team assignment:', user.first_name, user.last_name);
        }
        
        for (const teamId of teamIds) {
          await query(`
            INSERT INTO team_members (user_id, team_id, role_in_team, joined_at)
            VALUES ($1, $2, 'member', now())
          `, [id, teamId]);
        }
      }
    }

    // Handle job title assignments if provided
    if (jobTitleIds !== undefined) {
      // Remove user from all current job titles
      await query('DELETE FROM user_job_titles WHERE user_id = $1', [id]);
      
      // Add user to the new job titles if specified
      if (jobTitleIds && jobTitleIds.length > 0) {
        for (const jobTitleId of jobTitleIds) {
          await query(`
            INSERT INTO user_job_titles (user_id, job_title_id, assigned_by, is_active)
            VALUES ($1, $2, $3, TRUE)
            ON CONFLICT (user_id, job_title_id) DO NOTHING
          `, [id, jobTitleId, req.user.id]);
        }
        
        console.log(`✅ Updated job titles for user ${id}: ${jobTitleIds.length} job titles assigned`);
      }
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      jobTitle: user.job_title,
      status: user.status,
      profilePictureUrl: user.profile_picture_url,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Assign skills from job titles to user (admin only)
router.post('/:id/assign-skills-from-job-titles', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get user's job titles
    const jobTitlesResult = await query(`
      SELECT jt.id, jt.title
      FROM user_job_titles ujt
      JOIN job_titles jt ON ujt.job_title_id = jt.id
      WHERE ujt.user_id = $1 AND ujt.is_active = true
    `, [id]);
    
    if (jobTitlesResult.rows.length === 0) {
      return res.status(400).json({ message: 'User has no active job titles' });
    }
    
    // Get all skill requirements for all job titles
    const allRequirements = new Map(); // skill_id -> max required level
    
    for (const jobTitle of jobTitlesResult.rows) {
      const requirements = await query(`
        SELECT skill_id, required_level
        FROM job_title_skill_requirements
        WHERE job_title_id = $1
      `, [jobTitle.id]);
      
      requirements.rows.forEach(req => {
        const currentMax = allRequirements.get(req.skill_id) || 0;
        allRequirements.set(req.skill_id, Math.max(currentMax, req.required_level));
      });
    }
    
    // Assign skills to user
    const assignedSkills = [];
    for (const [skillId, requiredLevel] of allRequirements) {
      try {
        await query(`
          INSERT INTO user_skills (user_id, skill_id, level, last_updated_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (user_id, skill_id) 
          DO UPDATE SET 
            level = GREATEST(user_skills.level, $3),
            last_updated_at = NOW()
        `, [id, skillId, requiredLevel]);
        
        // Get skill name for response
        const skillResult = await query('SELECT name FROM skills WHERE id = $1', [skillId]);
        const skillName = skillResult.rows[0]?.name || 'Unknown';
        
        assignedSkills.push({
          skillId,
          skillName,
          level: requiredLevel
        });
      } catch (error) {
        console.error(`Error assigning skill ${skillId}:`, error);
      }
    }
    
    console.log(`✅ Assigned ${assignedSkills.length} skills to user ${id}`);
    
    res.json({
      message: `Successfully assigned ${assignedSkills.length} skills`,
      assignedSkills
    });
  } catch (error) {
    console.error('Assign skills from job titles error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Fix skills for all users with job titles (admin only)
router.post('/fix-all-user-skills', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🔧 Starting bulk user skills fix...');
    
    // Get all users with job titles
    const usersWithJobTitles = await query(`
      SELECT DISTINCT u.id, u.first_name, u.last_name
      FROM users u
      JOIN user_job_titles ujt ON u.id = ujt.user_id
      WHERE ujt.is_active = true
    `);
    
    console.log(`Found ${usersWithJobTitles.rows.length} users with job titles`);
    
    const results = [];
    
    for (const user of usersWithJobTitles.rows) {
      try {
        // Get user's current skills
        const currentSkills = await query(`
          SELECT COUNT(*) as count
          FROM user_skills
          WHERE user_id = $1
        `, [user.id]);
        
        const hasSkills = parseInt(currentSkills.rows[0].count) > 0;
        
        if (!hasSkills) {
          // Get user's job titles
          const jobTitlesResult = await query(`
            SELECT jt.id, jt.title
            FROM user_job_titles ujt
            JOIN job_titles jt ON ujt.job_title_id = jt.id
            WHERE ujt.user_id = $1 AND ujt.is_active = true
          `, [user.id]);
          
          // Get all skill requirements
          const allRequirements = new Map();
          
          for (const jobTitle of jobTitlesResult.rows) {
            const requirements = await query(`
              SELECT skill_id, required_level
              FROM job_title_skill_requirements
              WHERE job_title_id = $1
            `, [jobTitle.id]);
            
            requirements.rows.forEach(req => {
              const currentMax = allRequirements.get(req.skill_id) || 0;
              allRequirements.set(req.skill_id, Math.max(currentMax, req.required_level));
            });
          }
          
          // Assign skills
          let assignedCount = 0;
          for (const [skillId, requiredLevel] of allRequirements) {
            await query(`
              INSERT INTO user_skills (user_id, skill_id, level, last_updated_at)
              VALUES ($1, $2, $3, NOW())
              ON CONFLICT (user_id, skill_id) 
              DO UPDATE SET 
                level = GREATEST(user_skills.level, $3),
                last_updated_at = NOW()
            `, [user.id, skillId, requiredLevel]);
            assignedCount++;
          }
          
          results.push({
            userId: user.id,
            name: `${user.first_name} ${user.last_name}`,
            action: 'assigned',
            skillsAssigned: assignedCount
          });
          
          console.log(`✅ Assigned ${assignedCount} skills to ${user.first_name} ${user.last_name}`);
        } else {
          results.push({
            userId: user.id,
            name: `${user.first_name} ${user.last_name}`,
            action: 'skipped',
            reason: 'already has skills'
          });
        }
      } catch (error) {
        console.error(`Error processing user ${user.first_name} ${user.last_name}:`, error);
        results.push({
          userId: user.id,
          name: `${user.first_name} ${user.last_name}`,
          action: 'error',
          error: error.message
        });
      }
    }
    
    const assignedCount = results.filter(r => r.action === 'assigned').length;
    const skippedCount = results.filter(r => r.action === 'skipped').length;
    const errorCount = results.filter(r => r.action === 'error').length;
    
    console.log(`✅ Bulk fix completed: ${assignedCount} assigned, ${skippedCount} skipped, ${errorCount} errors`);
    
    res.json({
      message: `Bulk fix completed: ${assignedCount} users assigned skills, ${skippedCount} skipped, ${errorCount} errors`,
      summary: {
        total: usersWithJobTitles.rows.length,
        assigned: assignedCount,
        skipped: skippedCount,
        errors: errorCount
      },
      results
    });
  } catch (error) {
    console.error('Bulk fix user skills error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user's skills
router.get('/:id/skills', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;

    // Check if user is requesting their own skills or is admin/manager
    if (id !== currentUserId && req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get user's skills with skill details
    const skillsResult = await query(`
      SELECT 
        s.id, s.name, s.type, s.category, s.description,
        us.level, us.last_updated_at as acquired_at
      FROM skills s
      JOIN user_skills us ON s.id = us.skill_id
      WHERE us.user_id = $1 AND s.is_active = true
      ORDER BY s.name
    `, [id]);

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

    res.json({ skills });
  } catch (error) {
    console.error('Get user skills error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user objectives
router.get('/:id/objectives', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 Getting objectives for user:', id);

    // Check if user exists
    const userCheck = await query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's objectives with details
    const objectivesResult = await query(`
      SELECT 
        o.id, o.title, o.description, o.category, o.deadline, o.status, o.progress,
        o.created_at, o.updated_at,
        s.name as skill_name
      FROM objective_assignments oa
      JOIN objectives o ON oa.objective_id = o.id
      LEFT JOIN skills s ON o.skill_id = s.id
      WHERE oa.user_id = $1
      ORDER BY o.deadline ASC
    `, [id]);

    const objectives = objectivesResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      deadline: row.deadline,
      status: row.status,
      progress: row.progress,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      skillName: row.skill_name
    }));

    console.log(`✅ Found ${objectives.length} objectives for user ${id}`);

    res.json({ objectives });
  } catch (error) {
    console.error('❌ Get user objectives error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// Update user status (activate/deactivate)
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Status must be either "active" or "inactive"' });
    }

    // Check if user exists
    const userCheck = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent self-deactivation
    if (id === req.user.id && status === 'inactive') {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    // Update user status
    const result = await query(
      'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    const updatedUser = result.rows[0];
    res.json({
      message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        role: updatedUser.role,
        status: updatedUser.status
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Cleanup duplicate users (admin only) - TEMPORARY ENDPOINT
router.post('/deduplicate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Starting duplicate user cleanup...');
    
    // Find duplicate users based on email
    const duplicatesQuery = `
      SELECT email, COUNT(*) as count, 
             array_agg(id ORDER BY created_at DESC) as user_ids,
             array_agg(created_at ORDER BY created_at DESC) as created_dates
      FROM users 
      GROUP BY email 
      HAVING COUNT(*) > 1
    `;
    
    const duplicatesResult = await query(duplicatesQuery);
    const duplicates = duplicatesResult.rows;
    
    console.log(`📊 Found ${duplicates.length} email addresses with duplicates`);
    
    let deletedCount = 0;
    const deletedUsers = [];
    
    for (const duplicate of duplicates) {
      const { email, user_ids, created_dates } = duplicate;
      const userIds = user_ids.slice(1); // Keep the most recent, delete the rest
      
      console.log(`🗑️  Cleaning up duplicates for email: ${email}`);
      console.log(`   Keeping user ID: ${user_ids[0]} (created: ${created_dates[0]})`);
      console.log(`   Deleting user IDs: ${userIds.join(', ')}`);
      
      // Delete duplicate users (keep the most recent one)
      for (const userId of userIds) {
        // Delete related records first
        await query('DELETE FROM user_skills WHERE user_id = $1', [userId]);
        await query('DELETE FROM objective_assignments WHERE user_id = $1', [userId]);
        await query('DELETE FROM team_members WHERE user_id = $1', [userId]);
        await query('DELETE FROM user_departments WHERE user_id = $1', [userId]);
        
        // Delete the user
        await query('DELETE FROM users WHERE id = $1', [userId]);
        deletedCount++;
        deletedUsers.push({ id: userId, email });
      }
    }
    
    console.log(`✅ Cleanup completed. Deleted ${deletedCount} duplicate users.`);
    
    res.json({
      message: 'Duplicate users cleanup completed successfully',
      deletedCount,
      deletedUsers,
      duplicatesProcessed: duplicates.length
    });
  } catch (error) {
    console.error('❌ Duplicate user cleanup error:', error);
    res.status(500).json({ message: 'Internal server error during cleanup' });
  }
});

// Delete user (hard delete)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 Attempting to delete user:', id);

    // Check if user exists
    const userCheck = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userToDelete = userCheck.rows[0];
    console.log('📋 User to delete:', userToDelete.email);

    // Prevent self-deletion
    if (id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Delete related records first to avoid foreign key constraint violations
    console.log('🗑️  Deleting related records...');
    
    // Delete user skill history
    await query('DELETE FROM user_skill_history WHERE user_id = $1 OR approved_by = $1', [id]);
    console.log('   ✅ User skill history deleted');
    
    // Delete user skills
    await query('DELETE FROM user_skills WHERE user_id = $1', [id]);
    console.log('   ✅ User skills deleted');
    
    // Delete skill requests (as requester, manager, or admin)
    await query('DELETE FROM skill_requests WHERE requester_user_id = $1 OR manager_id = $1 OR admin_id = $1', [id]);
    console.log('   ✅ Skill requests deleted');
    
    // Delete objective contributions
    await query('DELETE FROM objective_contributions WHERE assignee_user_id = $1', [id]);
    console.log('   ✅ Objective contributions deleted');
    
    // Delete objective assignments
    await query('DELETE FROM objective_assignments WHERE user_id = $1', [id]);
    console.log('   ✅ Objective assignments deleted');
    
    // Delete objective updates
    await query('DELETE FROM objective_updates WHERE author_user_id = $1', [id]);
    console.log('   ✅ Objective updates deleted');
    
    // Delete objectives created by user
    await query('DELETE FROM objectives WHERE created_by = $1', [id]);
    console.log('   ✅ Objectives created by user deleted');
    
    // Delete team members
    await query('DELETE FROM team_members WHERE user_id = $1', [id]);
    console.log('   ✅ Team members deleted');
    
    // Delete user departments
    await query('DELETE FROM user_departments WHERE user_id = $1', [id]);
    console.log('   ✅ User departments deleted');
    
    // Delete notifications
    await query('DELETE FROM notifications WHERE user_id = $1', [id]);
    console.log('   ✅ Notifications deleted');
    
    // Delete files
    await query('DELETE FROM files WHERE owner_user_id = $1', [id]);
    console.log('   ✅ Files deleted');
    
    // Delete activity log entries
    await query('DELETE FROM activity_log WHERE actor_user_id = $1', [id]);
    console.log('   ✅ Activity log entries deleted');
    
    // Update departments that have this user as manager
    await query('UPDATE departments SET manager_user_id = NULL WHERE manager_user_id = $1', [id]);
    console.log('   ✅ Department manager references cleared');
    
    // Update teams that have this user as manager
    await query('UPDATE teams SET manager_user_id = NULL WHERE manager_user_id = $1', [id]);
    console.log('   ✅ Team manager references cleared');
    
    // Finally, delete the user
    await query('DELETE FROM users WHERE id = $1', [id]);
    console.log('   ✅ User deleted successfully');

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
