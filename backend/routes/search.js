const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Global search
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { q, type, page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const searchTerm = `%${q.trim()}%`;
    const results = {};

    // Search users (filtered by role)
    if (!type || type === 'users') {
      let userWhereConditions = ['u.status = \'active\''];
      let userQueryParams = [searchTerm];

      if (userRole === 'employee') {
        userWhereConditions.push('u.id = $2');
        userQueryParams.push(userId);
      } else if (userRole === 'manager') {
        userWhereConditions.push(`
          (u.id = $2 OR u.id IN (
            SELECT tm.user_id FROM team_members tm 
            JOIN teams t ON tm.team_id = t.id 
            WHERE t.manager_user_id = $2
          ))
        `);
        userQueryParams.push(userId);
      }
      // Admin can see all users

      const usersQuery = `
        SELECT 
          u.id, u.first_name, u.last_name, u.email, u.role, u.job_title,
          COUNT(DISTINCT us.skill_id) as skills_count
        FROM users u
        LEFT JOIN user_skills us ON u.id = us.user_id
        WHERE (u.first_name ILIKE $1 OR u.last_name ILIKE $1 OR u.email ILIKE $1)
          AND ${userWhereConditions.join(' AND ')}
        GROUP BY u.id
        ORDER BY u.first_name ASC, u.last_name ASC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      const usersResult = await query(usersQuery, userQueryParams);
      results.users = usersResult.rows.map(row => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        role: row.role,
        jobTitle: row.job_title,
        skillsCount: parseInt(row.skills_count),
        type: 'user'
      }));
    }

    // Search skills
    if (!type || type === 'skills') {
      const skillsQuery = `
        SELECT 
          s.id, s.name, s.type, s.category, s.description,
          COUNT(DISTINCT us.user_id) as users_count
        FROM skills s
        LEFT JOIN user_skills us ON s.id = us.skill_id
        WHERE s.is_active = true 
          AND (s.name ILIKE $1 OR s.description ILIKE $1 OR s.category ILIKE $1)
        GROUP BY s.id
        ORDER BY s.name ASC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      const skillsResult = await query(skillsQuery, [searchTerm]);
      results.skills = skillsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        category: row.category,
        description: row.description,
        usersCount: parseInt(row.users_count),
        type: 'skill'
      }));
    }

    // Search teams
    if (!type || type === 'teams') {
      const teamsQuery = `
        SELECT 
          t.id, t.name, t.description,
          d.name as department_name,
          COUNT(DISTINCT tm.user_id) as members_count
        FROM teams t
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN team_members tm ON t.id = tm.team_id
        WHERE (t.name ILIKE $1 OR t.description ILIKE $1)
        GROUP BY t.id, d.name
        ORDER BY t.name ASC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      const teamsResult = await query(teamsQuery, [searchTerm]);
      results.teams = teamsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        departmentName: row.department_name,
        membersCount: parseInt(row.members_count),
        type: 'team'
      }));
    }

    // Search objectives (filtered by user role)
    if (!type || type === 'objectives') {
      let objectiveWhereConditions = [];
      let objectiveQueryParams = [searchTerm];

      if (userRole === 'employee') {
        objectiveWhereConditions.push('(oa.user_id = $2 OR o.created_by = $2)');
        objectiveQueryParams.push(userId);
      } else if (userRole === 'manager') {
        objectiveWhereConditions.push(`
          (oa.user_id = $2 OR o.created_by = $2 OR 
           oa.team_id IN (
             SELECT t.id FROM teams t 
             JOIN team_members tm ON t.id = tm.team_id 
             WHERE tm.user_id = $2 AND tm.role_in_team = 'manager'
           ))
        `);
        objectiveQueryParams.push(userId);
      }
      // Admin can see all objectives

      const objectivesQuery = `
        SELECT DISTINCT
          o.id, o.title, o.description, o.category, o.status, o.progress,
          s.name as skill_name
        FROM objectives o
        LEFT JOIN objective_assignments oa ON o.id = oa.objective_id
        LEFT JOIN skills s ON o.skill_id = s.id
        WHERE (o.title ILIKE $1 OR o.description ILIKE $1)
          ${objectiveWhereConditions.length > 0 ? 'AND ' + objectiveWhereConditions.join(' AND ') : ''}
        ORDER BY o.created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      const objectivesResult = await query(objectivesQuery, objectiveQueryParams);
      results.objectives = objectivesResult.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        status: row.status,
        progress: row.progress,
        skillName: row.skill_name,
        type: 'objective'
      }));
    }

    // Calculate total results
    const totalResults = Object.values(results).reduce((sum, items) => sum + items.length, 0);

    res.json({
      results,
      totalResults,
      query: q,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Search suggestions
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ suggestions: [] });
    }

    const searchTerm = `%${q.trim()}%`;
    const suggestions = [];

    // Skill suggestions
    const skillSuggestions = await query(`
      SELECT DISTINCT name, 'skill' as type
      FROM skills 
      WHERE is_active = true AND name ILIKE $1
      ORDER BY name ASC
      LIMIT 5
    `, [searchTerm]);

    suggestions.push(...skillSuggestions.rows);

    // User suggestions (filtered by role)
    const userRole = req.user.role;
    let userWhereConditions = ['u.status = \'active\''];
    let userQueryParams = [searchTerm];

    if (userRole === 'employee') {
      userWhereConditions.push('u.id = $2');
      userQueryParams.push(req.user.id);
    } else if (userRole === 'manager') {
      userWhereConditions.push(`
        (u.id = $2 OR u.id IN (
          SELECT tm.user_id FROM team_members tm 
          JOIN teams t ON tm.team_id = t.id 
          WHERE t.manager_user_id = $2
        ))
      `);
      userQueryParams.push(req.user.id);
    }

    const userSuggestions = await query(`
      SELECT DISTINCT 
        CONCAT(u.first_name, ' ', u.last_name) as name, 'user' as type
      FROM users u
      WHERE (u.first_name ILIKE $1 OR u.last_name ILIKE $1 OR u.email ILIKE $1)
        AND ${userWhereConditions.join(' AND ')}
      ORDER BY u.first_name ASC, u.last_name ASC
      LIMIT 5
    `, userQueryParams);

    suggestions.push(...userSuggestions.rows);

    // Team suggestions
    const teamSuggestions = await query(`
      SELECT DISTINCT name, 'team' as type
      FROM teams 
      WHERE name ILIKE $1
      ORDER BY name ASC
      LIMIT 5
    `, [searchTerm]);

    suggestions.push(...teamSuggestions.rows);

    res.json({ suggestions: suggestions.slice(0, 10) });
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;











