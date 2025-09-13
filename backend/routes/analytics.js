const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// Get recent activity feed (role-based filtering)
router.get('/recent-activity', authenticateToken, requireManager, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Query recent activities from multiple tables - separate queries approach
    const activities = [];
    
    // Get user activities - CRITICAL SECURITY FIX
    try {
      let userQuery = `
        SELECT 
          'user_created' as type,
          u.id as entity_id,
          COALESCE(u.first_name || ' ' || u.last_name, u.email) as entity_name,
          u.created_at as activity_date,
          'Nouvel utilisateur créé' as description,
          u.email as additional_info
        FROM users u
        WHERE u.created_at >= NOW() - INTERVAL '30 days'
      `;
      
      // Role-based filtering for user activities
      if (userRole === 'manager') {
        userQuery += ` AND EXISTS (
          SELECT 1 FROM teams t 
          JOIN team_members tm ON t.id = tm.team_id 
          WHERE tm.user_id = u.id AND t.manager_user_id = $2
        )`;
      }
      
      userQuery += ` ORDER BY u.created_at DESC LIMIT $1`;
      
      const userParams = userRole === 'manager' ? [parseInt(limit), userId] : [parseInt(limit)];
      const userResult = await query(userQuery, userParams);
      
      activities.push(...userResult.rows);
    } catch (error) {
      console.error('Error fetching user activities:', error);
    }
    
    // Get skill activities
    try {
      const skillResult = await query(`
        SELECT 
          'skill_created' as type,
          s.id as entity_id,
          s.name as entity_name,
          s.created_at as activity_date,
          'Compétence ajoutée' as description,
          COALESCE(s.category, '') as additional_info
        FROM skills s
        WHERE s.created_at >= NOW() - INTERVAL '30 days'
        ORDER BY s.created_at DESC
        LIMIT $1
      `, [parseInt(limit)]);
      
      activities.push(...skillResult.rows);
    } catch (error) {
      console.error('Error fetching skill activities:', error);
    }
    
    // Get team activities - CRITICAL SECURITY FIX
    try {
      let teamQuery = `
        SELECT 
          'team_created' as type,
          t.id as entity_id,
          t.name as entity_name,
          t.created_at as activity_date,
          'Équipe créée' as description,
          COALESCE(d.name, '') as additional_info
        FROM teams t
        LEFT JOIN departments d ON t.department_id = d.id
        WHERE t.created_at >= NOW() - INTERVAL '30 days'
      `;
      
      // Role-based filtering for team activities
      if (userRole === 'manager') {
        teamQuery += ` AND t.manager_user_id = $2`;
      }
      
      teamQuery += ` ORDER BY t.created_at DESC LIMIT $1`;
      
      const teamParams = userRole === 'manager' ? [parseInt(limit), userId] : [parseInt(limit)];
      const teamResult = await query(teamQuery, teamParams);
      
      activities.push(...teamResult.rows);
    } catch (error) {
      console.error('Error fetching team activities:', error);
    }
    
    // Get department activities - CRITICAL SECURITY FIX
    try {
      let deptQuery = `
        SELECT 
          'department_created' as type,
          d.id as entity_id,
          d.name as entity_name,
          d.created_at as activity_date,
          'Département créé' as description,
          '' as additional_info
        FROM departments d
        WHERE d.created_at >= NOW() - INTERVAL '30 days'
      `;
      
      // Role-based filtering for department activities
      if (userRole === 'manager') {
        deptQuery += ` AND EXISTS (
          SELECT 1 FROM teams t 
          JOIN department_teams dt ON t.id = dt.team_id 
          WHERE dt.department_id = d.id AND t.manager_user_id = $2
        )`;
      }
      
      deptQuery += ` ORDER BY d.created_at DESC LIMIT $1`;
      
      const deptParams = userRole === 'manager' ? [parseInt(limit), userId] : [parseInt(limit)];
      const deptResult = await query(deptQuery, deptParams);
      
      activities.push(...deptResult.rows);
    } catch (error) {
      console.error('Error fetching department activities:', error);
    }
    
    // Get skill request activities
    try {
      const srResult = await query(`
        SELECT 
          'skill_request_created' as type,
          sr.id as entity_id,
          COALESCE(u.first_name || ' ' || u.last_name, u.email) as entity_name,
          sr.created_at as activity_date,
          'Demande de compétence créée' as description,
          COALESCE(s.name, '') as additional_info
        FROM skill_requests sr
        JOIN users u ON sr.user_id = u.id
        LEFT JOIN skills s ON sr.skill_id = s.id
        WHERE sr.created_at >= NOW() - INTERVAL '30 days'
        ORDER BY sr.created_at DESC
        LIMIT $1
      `, [parseInt(limit)]);
      
      activities.push(...srResult.rows);
    } catch (error) {
      console.error('Error fetching skill request activities:', error);
    }
    
    // Sort all activities by date and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.activity_date) - new Date(a.activity_date))
      .slice(0, parseInt(limit));
    
    const formattedActivities = sortedActivities.map(row => ({
      id: `${row.type}_${row.entity_id}`,
      type: row.type,
      entityId: row.entity_id,
      entityName: row.entity_name,
      activityDate: row.activity_date,
      description: row.description,
      additionalInfo: row.additional_info,
      timeAgo: getTimeAgo(row.activity_date)
    }));

    res.json({ activities: formattedActivities });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user growth data (role-based filtering)
router.get('/user-growth', authenticateToken, requireManager, async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let interval;
    let groupBy;
    
    switch (period) {
      case '7days':
        interval = '7 days';
        groupBy = 'DATE(created_at)';
        break;
      case '30days':
        interval = '30 days';
        groupBy = 'DATE(created_at)';
        break;
      case '90days':
        interval = '90 days';
        groupBy = 'DATE(created_at)';
        break;
      case '1year':
        interval = '1 year';
        groupBy = 'DATE_TRUNC(\'month\', created_at)';
        break;
      default:
        interval = '30 days';
        groupBy = 'DATE(created_at)';
    }

    // CRITICAL SECURITY FIX - Role-based filtering
    let userFilter = '';
    let queryParams = [];
    
    if (userRole === 'manager') {
      userFilter = `AND EXISTS (
        SELECT 1 FROM teams t 
        JOIN team_members tm ON t.id = tm.team_id 
        WHERE tm.user_id = users.id AND t.manager_user_id = $1
      )`;
      queryParams.push(userId);
    }

    const result = await query(`
      SELECT 
        ${groupBy} as date,
        COUNT(*) as new_users
      FROM users 
      WHERE created_at >= NOW() - INTERVAL '${interval}'
        ${userFilter}
      GROUP BY ${groupBy}
      ORDER BY date ASC
    `, queryParams);

    const growthData = result.rows.map(row => ({
      date: row.date,
      newUsers: parseInt(row.new_users)
    }));

    // Calculate total users and growth percentage - CRITICAL SECURITY FIX
    const totalResult = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '${interval}' THEN 1 END) as new_users_period
      FROM users
      WHERE 1=1 ${userFilter}
    `, queryParams);

    const totalUsers = parseInt(totalResult.rows[0].total_users);
    const newUsersPeriod = parseInt(totalResult.rows[0].new_users_period);
    
    // Calculate growth percentage (comparing to previous period) - CRITICAL SECURITY FIX
    const previousPeriodResult = await query(`
      SELECT COUNT(*) as previous_period_users
      FROM users 
      WHERE created_at >= NOW() - INTERVAL '${interval}' * 2 
        AND created_at < NOW() - INTERVAL '${interval}'
        ${userFilter}
    `, queryParams);
    
    const previousPeriodUsers = parseInt(previousPeriodResult.rows[0].previous_period_users);
    const growthPercentage = previousPeriodUsers > 0 
      ? Math.round(((newUsersPeriod - previousPeriodUsers) / previousPeriodUsers) * 100)
      : newUsersPeriod > 0 ? 100 : 0;

    res.json({
      growthData,
      summary: {
        totalUsers,
        newUsers: newUsersPeriod,
        growthPercentage
      }
    });
  } catch (error) {
    console.error('Get user growth error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Helper function to calculate time ago
function getTimeAgo(date) {
  const now = new Date();
  const activityDate = new Date(date);
  const diffInSeconds = Math.floor((now - activityDate) / 1000);
  
  if (diffInSeconds < 60) {
    return 'À l\'instant';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `Il y a ${minutes} min`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `Il y a ${hours} h`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
  } else {
    const months = Math.floor(diffInSeconds / 2592000);
    return `Il y a ${months} mois`;
  }
}

module.exports = router;
