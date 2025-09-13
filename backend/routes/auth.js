const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { userSchema } = require('../validation/schemas');
const { getFullUserProfile } = require('../utils/userProfile');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email
    const result = await query(
      'SELECT id, email, password_hash, first_name, last_name, role, job_title, profile_picture_url, status FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({ message: 'Account is inactive' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    // Store refresh token in database
    await query(
      'UPDATE users SET refresh_token = $1 WHERE id = $2',
      [refreshToken, user.id]
    );

    // Get complete user profile using the reusable function
    const completeUser = await getFullUserProfile(user.id);

    // Get user's job titles
    const jobTitleResult = await query(`
      SELECT jt.id, jt.title, jt.description
      FROM job_titles jt
      JOIN user_job_titles ujt ON jt.id = ujt.job_title_id
      WHERE ujt.user_id = $1 AND ujt.is_active = TRUE
      ORDER BY jt.title
    `, [user.id]);

    // Get official job title info
    const officialJobTitleResult = await query(`
      SELECT jt.id, jt.title, jt.description
      FROM job_titles jt
      WHERE jt.id = $1
    `, [completeUser.official_job_title_id]);

    // Add job titles to complete user object
    const userWithJobTitles = {
      ...completeUser,
      currentJobTitles: jobTitleResult.rows,
      officialJobTitle: officialJobTitleResult.rows[0] || null
    };

    // Return complete user object
    res.json({
      token: accessToken, // Frontend expects 'token' not 'accessToken'
      refreshToken,
      user: userWithJobTitles
    });

    console.log('✅ Login response:', {
      userId: completeUser.id,
      teamsCount: completeUser.teams.length,
      departmentsCount: completeUser.departments.length,
      skillsCount: completeUser.skills.length
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Register user (Admin only)
router.post('/register', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { error, value } = userSchema.create.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email, password, firstName, lastName, role, jobTitle } = value;

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const result = await query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, job_title)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, first_name, last_name, role, job_title, created_at
    `, [email, passwordHash, firstName, lastName, role, jobTitle]);

    const user = result.rows[0];

    res.status(201).json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      jobTitle: user.job_title,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Check if user exists and token matches
    const result = await query(
      'SELECT id, email, role, status FROM users WHERE id = $1 AND refresh_token = $2',
      [decoded.userId, refreshToken]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = result.rows[0];

    if (user.status !== 'active') {
      return res.status(401).json({ message: 'Account is inactive' });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Refresh token expired' });
    }
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
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

    // Add job titles to the response
    const response = {
      ...completeUser,
      jobTitleIds: jobTitleResult.rows.map(jt => jt.id),
      currentJobTitles: jobTitleResult.rows,
      officialJobTitle: officialJobTitleResult.rows[0] || null
    };

    console.log('✅ /auth/me response:', {
      userId: completeUser.id,
      teamsCount: completeUser.teams.length,
      departmentsCount: completeUser.departments.length,
      skillsCount: completeUser.skills.length,
      jobTitlesCount: jobTitleResult.rows.length
    });

    res.json(response);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current user's skills
router.get('/me/skills', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's skills with skill details
    const skillsResult = await query(`
      SELECT 
        s.id, s.name, s.type, s.category, s.description,
        us.level, us.last_updated_at as acquired_at
      FROM skills s
      JOIN user_skills us ON s.id = us.skill_id
      WHERE us.user_id = $1
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
      experienceYears: 0, // Default value since column doesn't exist
      certificateUrl: null, // Default value since column doesn't exist
      notes: null, // Default value since column doesn't exist
      acquiredAt: row.acquired_at
    }));

    res.json({ skills });
  } catch (error) {
    console.error('Get user skills error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current user's objectives
router.get('/me/objectives', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, category } = req.query;

    let whereConditions = ['oa.user_id = $1'];
    let queryParams = [userId];
    let paramCount = 1;

    // Status filter
    if (status && status !== 'all') {
      paramCount++;
      whereConditions.push(`o.status = $${paramCount}`);
      queryParams.push(status);
    }

    // Category filter
    if (category && category !== 'all') {
      paramCount++;
      whereConditions.push(`o.category = $${paramCount}`);
      queryParams.push(category);
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    // Get user's objectives
    const objectivesResult = await query(`
      SELECT 
        o.id, o.title, o.description, o.category,
        o.target_level, o.progress, o.status,
        o.deadline, o.created_at,
        s.name as skill_name,
        s.id as skill_id
      FROM objectives o
      JOIN objective_assignments oa ON o.id = oa.objective_id
      LEFT JOIN skills s ON o.skill_id = s.id
      ${whereClause}
      ORDER BY o.created_at DESC
    `, queryParams);

    const objectives = objectivesResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      type: 'skill_improvement', // Default value since column doesn't exist
      targetLevel: row.target_level,
      currentLevel: 0, // Default value since column doesn't exist
      progress: row.progress,
      status: row.status,
      deadline: row.deadline,
      createdAt: row.created_at,
      skillName: row.skill_name,
      skillId: row.skill_id
    }));

    res.json({ objectives });
  } catch (error) {
    console.error('Get user objectives error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current user's teams
router.get('/me/teams', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's teams (without department info to avoid duplicates)
    const teamsResult = await query(`
      SELECT DISTINCT
        t.id, t.name, t.description, t.created_at, t.updated_at,
        tm.role_in_team, tm.joined_at,
        u.id as manager_id, u.first_name as manager_first_name, u.last_name as manager_last_name
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      LEFT JOIN users u ON t.manager_user_id = u.id
      WHERE tm.user_id = $1
      ORDER BY tm.joined_at DESC
    `, [userId]);

    // Get team departments separately
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

    const teams = teamsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      roleInTeam: row.role_in_team,
      joinedAt: row.joined_at,
      departments: teamDepartmentsMap[row.id] || [],
      manager: row.manager_id ? {
        id: row.manager_id,
        firstName: row.manager_first_name,
        lastName: row.manager_last_name
      } : null
    }));

    res.json({ teams });
  } catch (error) {
    console.error('Get user teams error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current user's departments
router.get('/me/departments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's departments with transitive membership (direct + team-based)
    // First, get the department IDs using UNION
    const deptIdsResult = await query(`
      SELECT DISTINCT ud.department_id
      FROM user_departments ud
      WHERE ud.user_id = $1
      
      UNION
      
      SELECT DISTINCT dt.department_id
      FROM team_members tm
      JOIN department_teams dt ON tm.team_id = dt.team_id
      WHERE tm.user_id = $1
    `, [userId]);

    // If no departments found, return empty array
    if (deptIdsResult.rows.length === 0) {
      res.json({ departments: [] });
      return;
    }

    // Get the department IDs
    const deptIds = deptIdsResult.rows.map(row => row.department_id);

    // Now get the full department details
    const departmentsResult = await query(`
      SELECT 
        d.id, d.name, d.description, d.created_at, d.updated_at,
        u.id as manager_id, u.first_name as manager_first_name, u.last_name as manager_last_name,
        COUNT(DISTINCT dt.team_id) as teams_count,
        COUNT(DISTINCT ud2.user_id) as employees_count
      FROM departments d
      LEFT JOIN users u ON d.manager_user_id = u.id
      LEFT JOIN department_teams dt ON d.id = dt.department_id
      LEFT JOIN user_departments ud2 ON d.id = ud2.department_id
      WHERE d.id = ANY($1)
      GROUP BY d.id, d.name, d.description, d.created_at, d.updated_at, u.id, u.first_name, u.last_name
      ORDER BY d.name
    `, [deptIds]);

    const departments = departmentsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      manager: row.manager_id ? {
        id: row.manager_id,
        firstName: row.manager_first_name,
        lastName: row.manager_last_name
      } : null,
      teamsCount: parseInt(row.teams_count),
      employeesCount: parseInt(row.employees_count)
    }));

    res.json({ departments });
  } catch (error) {
    console.error('Get user departments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { error, value } = userSchema.changePassword.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { currentPassword, newPassword } = value;
    const userId = req.user.id;

    // Get current password hash
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, userId]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user's managers (for employees)
router.get('/me/managers', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all unique managers for teams that the user is a member of
    const result = await query(`
      SELECT DISTINCT 
        u.id, u.first_name, u.last_name, u.email, u.role, u.job_title
      FROM users u
      INNER JOIN teams t ON u.id = t.manager_user_id
      INNER JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = $1 AND u.status = 'active'
      ORDER BY u.first_name, u.last_name
    `, [userId]);

    const managers = result.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      role: row.role,
      jobTitle: row.job_title
    }));

    res.json({ managers });
  } catch (error) {
    console.error('Get user managers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get intelligent approvers for the current user
router.get('/me/approvers', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let approvers = [];

    if (userRole === 'employee') {
      // For employees: get their team managers
      const result = await query(`
        SELECT DISTINCT 
          u.id, u.first_name, u.last_name, u.email, u.role, u.job_title
        FROM users u
        INNER JOIN teams t ON u.id = t.manager_user_id
        INNER JOIN team_members tm ON t.id = tm.team_id
        WHERE tm.user_id = $1 AND u.status = 'active'
        ORDER BY u.first_name, u.last_name
      `, [userId]);

      approvers = result.rows.map(row => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        role: row.role,
        jobTitle: row.job_title
      }));
    } else if (userRole === 'manager') {
      // For managers: check if they are in any teams
      const teamMembershipResult = await query(`
        SELECT COUNT(*) as team_count
        FROM team_members
        WHERE user_id = $1
      `, [userId]);

      const teamCount = parseInt(teamMembershipResult.rows[0].team_count);

      if (teamCount > 0) {
        // Manager is in teams: get their team managers
        const result = await query(`
          SELECT DISTINCT 
            u.id, u.first_name, u.last_name, u.email, u.role, u.job_title
          FROM users u
          INNER JOIN teams t ON u.id = t.manager_user_id
          INNER JOIN team_members tm ON t.id = tm.team_id
          WHERE tm.user_id = $1 AND u.status = 'active'
          ORDER BY u.first_name, u.last_name
        `, [userId]);

        approvers = result.rows.map(row => ({
          id: row.id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          role: row.role,
          jobTitle: row.job_title
        }));
      } else {
        // Manager is not in any teams: get all admins
        const result = await query(`
          SELECT id, first_name, last_name, email, role, job_title
          FROM users
          WHERE role = 'admin' AND status = 'active'
          ORDER BY first_name, last_name
        `);

        approvers = result.rows.map(row => ({
          id: row.id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          role: row.role,
          jobTitle: row.job_title
        }));
      }
    } else if (userRole === 'admin') {
      // For admins: get all other admins
      const result = await query(`
        SELECT id, first_name, last_name, email, role, job_title
        FROM users
        WHERE role = 'admin' AND id != $1 AND status = 'active'
        ORDER BY first_name, last_name
      `, [userId]);

      approvers = result.rows.map(row => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        role: row.role,
        jobTitle: row.job_title
      }));
    }

    res.json({ approvers });
  } catch (error) {
    console.error('Get user approvers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Clear refresh token
    await query(
      'UPDATE users SET refresh_token = NULL WHERE id = $1',
      [userId]
    );

    res.status(204).send();
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /auth/me/sidebar-stats - Get role-specific sidebar statistics
router.get('/me/sidebar-stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('🔍 Sidebar stats request:', { userId, userRole });

    let stats = {};

    if (userRole === 'employee') {
      // For employees, get their skills, teams, and departments counts
      const employeeStatsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM user_skills WHERE user_id = $1) as skills_count,
          (SELECT COUNT(DISTINCT tm.team_id) FROM team_members tm WHERE tm.user_id = $1) as teams_count,
          (SELECT COUNT(DISTINCT dept_id) FROM (
            SELECT ud.department_id as dept_id FROM user_departments ud WHERE ud.user_id = $1
            UNION
            SELECT dt.department_id as dept_id FROM team_members tm
            JOIN department_teams dt ON tm.team_id = dt.team_id
            WHERE tm.user_id = $1
          ) combined_depts) as departments_count
      `;
      
      const employeeResult = await query(employeeStatsQuery, [userId]);
      const row = employeeResult.rows[0];
      
      stats = {
        skills: parseInt(row.skills_count) || 0,
        teams: parseInt(row.teams_count) || 0,
        departments: parseInt(row.departments_count) || 0
      };
    } else if (userRole === 'manager') {
      // For managers, get teams they manage and teams they're members of
      const managedTeamsQuery = `
        SELECT COUNT(DISTINCT t.id) as managed_teams
        FROM teams t
        WHERE t.manager_user_id = $1
      `;
      
      const memberTeamsQuery = `
        SELECT COUNT(DISTINCT t.id) as member_teams
        FROM teams t
        INNER JOIN team_members tm ON t.id = tm.team_id
        WHERE tm.user_id = $1 AND t.manager_user_id != $1
      `;

      const managedDepartmentsQuery = `
        SELECT COUNT(DISTINCT d.id) as managed_departments
        FROM departments d
        WHERE d.manager_user_id = $1
      `;

      const [managedTeamsResult, memberTeamsResult, managedDepartmentsResult] = await Promise.all([
        query(managedTeamsQuery, [userId]),
        query(memberTeamsQuery, [userId]),
        query(managedDepartmentsQuery, [userId])
      ]);

      stats = {
        managedTeams: parseInt(managedTeamsResult.rows[0]?.managed_teams) || 0,
        memberTeams: parseInt(memberTeamsResult.rows[0]?.member_teams) || 0,
        managedDepartments: parseInt(managedDepartmentsResult.rows[0]?.managed_departments) || 0
      };
    } else if (userRole === 'admin') {
      // For admins, return empty stats (they don't need sidebar stats)
      stats = {};
    }

    console.log('✅ Sidebar stats response:', { userRole, stats });

    res.json({ stats });
  } catch (error) {
    console.error('❌ Error fetching sidebar stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
