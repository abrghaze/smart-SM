const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireAdmin, requireManager } = require('../middleware/auth');
const { skillSchema } = require('../validation/schemas');

const router = express.Router();

// Get all skills (with filters)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type, category, q, page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;

    let whereConditions = ['s.is_active = true'];
    let queryParams = [];
    let paramCount = 0;

    // Type filter
    if (type) {
      paramCount++;
      whereConditions.push(`s.type = $${paramCount}`);
      queryParams.push(type);
    }

    // Category filter
    if (category) {
      paramCount++;
      whereConditions.push(`s.category = $${paramCount}`);
      queryParams.push(category);
    }

    // Search query
    if (q) {
      paramCount++;
      whereConditions.push(`(s.name ILIKE $${paramCount} OR s.description ILIKE $${paramCount})`);
      queryParams.push(`%${q}%`);
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    // Get skills count
    const countQuery = `
      SELECT COUNT(*) 
      FROM skills s 
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get skills with user count
    paramCount++;
    const skillsQuery = `
      SELECT 
        s.id, s.name, s.type, s.category, s.description, s.is_active, s.created_at,
        COUNT(DISTINCT us.user_id) as users_count
      FROM skills s
      LEFT JOIN user_skills us ON s.id = us.skill_id
      ${whereClause}
      GROUP BY s.id
      ORDER BY s.name ASC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    queryParams.push(pageSize, offset);

    const skillsResult = await query(skillsQuery, queryParams);

    const skills = skillsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      category: row.category,
      description: row.description,
      maxLevel: 5, // Fixed max level
      isActive: row.is_active,
      createdAt: row.created_at,
      usersCount: parseInt(row.users_count)
    }));

    res.json({
      skills,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    });
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create skill (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { error, value } = skillSchema.create.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, type, category, description } = value;

    // Check if skill already exists
    const existingSkill = await query(
      'SELECT id FROM skills WHERE name = $1 AND type = $2',
      [name, type]
    );

    if (existingSkill.rows.length > 0) {
      return res.status(400).json({ message: 'Skill already exists' });
    }

    // Create skill with fixed max_level of 5
    const result = await query(`
      INSERT INTO skills (name, type, category, description, max_level)
      VALUES ($1, $2, $3, $4, 5)
      RETURNING id, name, type, category, description, is_active, created_at
    `, [name, type, category, description]);

    const skill = result.rows[0];

    res.status(201).json({
      id: skill.id,
      name: skill.name,
      type: skill.type,
      category: skill.category,
      description: skill.description,
      maxLevel: 5, // Fixed max level
      isActive: skill.is_active,
      createdAt: skill.created_at,
      usersCount: 0
    });
  } catch (error) {
    console.error('Create skill error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get skill by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        s.id, s.name, s.type, s.category, s.description, s.is_active, s.created_at,
        COUNT(DISTINCT us.user_id) as users_count
      FROM skills s
      LEFT JOIN user_skills us ON s.id = us.skill_id
      WHERE s.id = $1
      GROUP BY s.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    const skill = result.rows[0];

    res.json({
      id: skill.id,
      name: skill.name,
      type: skill.type,
      category: skill.category,
      description: skill.description,
      maxLevel: 5, // Fixed max level
      isActive: skill.is_active,
      createdAt: skill.created_at,
      usersCount: parseInt(skill.users_count)
    });
  } catch (error) {
    console.error('Get skill error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update skill (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = skillSchema.update.validate(req.body);
    
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, type, category, description, isActive } = value;

    // Check if skill exists
    const existingSkill = await query('SELECT id FROM skills WHERE id = $1', [id]);
    if (existingSkill.rows.length === 0) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    // Check for name/type conflict if name or type is being updated
    if (name || type) {
      const currentSkill = await query('SELECT name, type FROM skills WHERE id = $1', [id]);
      const newName = name || currentSkill.rows[0].name;
      const newType = type || currentSkill.rows[0].type;

      const conflictCheck = await query(
        'SELECT id FROM skills WHERE name = $1 AND type = $2 AND id != $3',
        [newName, newType, id]
      );

      if (conflictCheck.rows.length > 0) {
        return res.status(400).json({ message: 'Skill already exists' });
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

    if (type !== undefined) {
      paramCount++;
      updateFields.push(`type = $${paramCount}`);
      queryParams.push(type);
    }

    if (category !== undefined) {
      paramCount++;
      updateFields.push(`category = $${paramCount}`);
      queryParams.push(category);
    }

    if (description !== undefined) {
      paramCount++;
      updateFields.push(`description = $${paramCount}`);
      queryParams.push(description);
    }



    if (isActive !== undefined) {
      paramCount++;
      updateFields.push(`is_active = $${paramCount}`);
      queryParams.push(isActive);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    paramCount++;
    queryParams.push(id);

    const updateQuery = `
      UPDATE skills 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, type, category, description, is_active, created_at
    `;

    const result = await query(updateQuery, queryParams);

    const skill = result.rows[0];

    // Get updated user count
    const userCountResult = await query(
      'SELECT COUNT(DISTINCT user_id) as users_count FROM user_skills WHERE skill_id = $1',
      [id]
    );

    res.json({
      id: skill.id,
      name: skill.name,
      type: skill.type,
      category: skill.category,
      description: skill.description,
      maxLevel: 5, // Fixed max level
      isActive: skill.is_active,
      createdAt: skill.created_at,
      usersCount: parseInt(userCountResult.rows[0].users_count)
    });
  } catch (error) {
    console.error('Update skill error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete skill (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if skill exists
    const skillCheck = await query('SELECT id, name FROM skills WHERE id = $1', [id]);
    if (skillCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    const skillName = skillCheck.rows[0].name;

    // Check if skill is being used by any users
    const usageCheck = await query(
      'SELECT COUNT(*) as count FROM user_skills WHERE skill_id = $1',
      [id]
    );

    const userCount = parseInt(usageCheck.rows[0].count);

    // If skill is assigned to users, remove it from all user profiles first
    if (userCount > 0) {
      console.log(`🗑️ Admin deleting skill "${skillName}" that is assigned to ${userCount} users`);
      
      // Remove skill from all user profiles
      await query('DELETE FROM user_skills WHERE skill_id = $1', [id]);
      
      console.log(`✅ Removed skill "${skillName}" from ${userCount} user profiles`);
    }

    // Delete skill
    await query('DELETE FROM skills WHERE id = $1', [id]);
    console.log(`✅ Skill "${skillName}" deleted successfully`);

    res.json({ 
      message: `Skill "${skillName}" deleted successfully${userCount > 0 ? ` and removed from ${userCount} user profiles` : ''}`,
      usersAffected: userCount
    });
  } catch (error) {
    console.error('Delete skill error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get users with specific skill
router.get('/:id/users', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { level, page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;

    // Check if skill exists
    const skillCheck = await query('SELECT id FROM skills WHERE id = $1', [id]);
    if (skillCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    let whereConditions = ['us.skill_id = $1'];
    let queryParams = [id];
    let paramCount = 1;

    // Level filter
    if (level) {
      paramCount++;
      whereConditions.push(`us.level = $${paramCount}`);
      queryParams.push(parseInt(level));
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    // Get users count
    const countQuery = `
      SELECT COUNT(*) 
      FROM users u
      JOIN user_skills us ON u.id = us.user_id
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get users with skill level
    paramCount++;
    const usersQuery = `
      SELECT 
        u.id, u.first_name, u.last_name, u.email, u.role, u.job_title, u.profile_picture_url,
        us.level, us.last_updated_at
      FROM users u
      JOIN user_skills us ON u.id = us.user_id
      ${whereClause}
      ORDER BY us.level DESC, u.first_name ASC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    queryParams.push(pageSize, offset);

    const usersResult = await query(usersQuery, queryParams);

    const users = usersResult.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      role: row.role,
      jobTitle: row.job_title,
      profilePictureUrl: row.profile_picture_url,
      level: row.level,
      lastUpdatedAt: row.last_updated_at
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
    console.error('Get skill users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get skill analytics
router.get('/:id/analytics', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if skill exists
    const skillCheck = await query('SELECT id FROM skills WHERE id = $1', [id]);
    if (skillCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    // Get total users with this skill
    const totalUsersQuery = `
      SELECT COUNT(*) as total_users
      FROM user_skills
      WHERE skill_id = $1
    `;
    const totalUsersResult = await query(totalUsersQuery, [id]);
    const totalUsers = parseInt(totalUsersResult.rows[0].total_users);

    // Get level breakdown
    const levelBreakdownQuery = `
      SELECT level, COUNT(*) as count
      FROM user_skills
      WHERE skill_id = $1
      GROUP BY level
      ORDER BY level
    `;
    const levelBreakdownResult = await query(levelBreakdownQuery, [id]);

    // Get average level
    const averageLevelQuery = `
      SELECT AVG(level) as average_level
      FROM user_skills
      WHERE skill_id = $1
    `;
    const averageLevelResult = await query(averageLevelQuery, [id]);
    const averageLevel = parseFloat(averageLevelResult.rows[0].average_level) || 0;

    // Format level breakdown (fixed max level of 5)
    const levelBreakdown = {};
    for (let i = 1; i <= 5; i++) {
      levelBreakdown[i] = 0;
    }
    
    levelBreakdownResult.rows.forEach(row => {
      levelBreakdown[row.level] = parseInt(row.count);
    });

    res.json({
      totalUsers,
      averageLevel,
      levelBreakdown
    });
  } catch (error) {
    console.error('Get skill analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all user skills (for overview dashboards)
router.get('/user-skills/all', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;

    let sqlQuery = '';
    let queryParams = [];

    if (userRole === 'admin') {
      // Admin can see all user skills
      sqlQuery = `
        SELECT 
          us.id,
          us.user_id,
          us.skill_id,
          us.level,
          us.last_updated_at,
          u.first_name,
          u.last_name,
          u.email,
          s.name as skill_name,
          s.category as skill_category
        FROM user_skills us
        JOIN users u ON us.user_id = u.id
        JOIN skills s ON us.skill_id = s.id
        ORDER BY u.first_name, u.last_name, s.name
      `;
    } else if (userRole === 'manager') {
      // Manager can see skills of team members they manage
      // First check if manager has any teams
      const managerTeamsCheck = await query(`
        SELECT COUNT(*) as team_count 
        FROM teams 
        WHERE manager_user_id = $1
      `, [userId]);
      
      if (parseInt(managerTeamsCheck.rows[0].team_count) === 0) {
        // Manager has no teams, return empty array
        return res.json({ userSkills: [] });
      }
      
      sqlQuery = `
        SELECT 
          us.id,
          us.user_id,
          us.skill_id,
          us.level,
          us.last_updated_at,
          u.first_name,
          u.last_name,
          u.email,
          s.name as skill_name,
          s.category as skill_category
        FROM user_skills us
        JOIN users u ON us.user_id = u.id
        JOIN skills s ON us.skill_id = s.id
        JOIN team_members tm ON u.id = tm.user_id
        JOIN teams t ON tm.team_id = t.id
        WHERE t.manager_user_id = $1
        ORDER BY u.first_name, u.last_name, s.name
      `;
      queryParams = [userId];
    } else {
      // Employee can only see their own skills
      sqlQuery = `
        SELECT 
          us.id,
          us.user_id,
          us.skill_id,
          us.level,
          us.last_updated_at,
          u.first_name,
          u.last_name,
          u.email,
          s.name as skill_name,
          s.category as skill_category
        FROM user_skills us
        JOIN users u ON us.user_id = u.id
        JOIN skills s ON us.skill_id = s.id
        WHERE us.user_id = $1
        ORDER BY s.name
      `;
      queryParams = [userId];
    }

    let result;
    try {
      result = await query(sqlQuery, queryParams);
    } catch (queryError) {
      console.error('Query execution error:', queryError);
      // If query fails, return empty array instead of error
      return res.json({ userSkills: [] });
    }

    const userSkills = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      skillId: row.skill_id,
      level: row.level,
      lastUpdatedAt: row.last_updated_at,
      user: {
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email
      },
      skill: {
        name: row.skill_name,
        category: row.skill_category
      }
    }));

    res.json({ userSkills });
  } catch (error) {
    console.error('Get all user skills error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;





