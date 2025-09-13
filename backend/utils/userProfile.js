const { query } = require('../config/database');

/**
 * Get complete user profile with all relationships (teams, departments, skills)
 * @param {string} userId - The user ID to fetch profile for
 * @returns {Promise<Object>} Complete user object with all relationships
 */
async function getFullUserProfile(userId) {
  try {
    console.log('🔄 Getting full user profile for userId:', userId);

    // Query 1: Get user's main details
    const userResult = await query(`
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.role, u.job_title,
        u.profile_picture_url, u.created_at, u.status
      FROM users u 
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult.rows[0];

    // Query 2: Get user's departments (direct membership)
    const departmentsResult = await query(`
      SELECT d.id, d.name, d.description
      FROM departments d
      JOIN user_departments ud ON d.id = ud.department_id
      WHERE ud.user_id = $1
      ORDER BY d.name
    `, [userId]);

    // Query 2.5: Get user's departments through team memberships
    const teamDepartmentsResult = await query(`
      SELECT DISTINCT d.id, d.name, d.description
      FROM departments d
      JOIN department_teams dt ON d.id = dt.department_id
      JOIN teams t ON dt.team_id = t.id
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = $1
      ORDER BY d.name
    `, [userId]);

    // Query 3: Get user's teams (direct membership)
    const teamsResult = await query(`
      SELECT t.id, t.name, t.description, tm.role_in_team
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = $1
      ORDER BY t.name
    `, [userId]);

    // Query 4: Get teams where user is manager
    const managerTeamsResult = await query(`
      SELECT t.id, t.name, t.description, 'manager' as role_in_team
      FROM teams t
      WHERE t.manager_user_id = $1
      ORDER BY t.name
    `, [userId]);

    // Query 5: Get departments where user manages teams
    const managerDepartmentsResult = await query(`
      SELECT DISTINCT d.id, d.name, d.description
      FROM departments d
      JOIN department_teams dt ON d.id = dt.department_id
      JOIN teams t ON dt.team_id = t.id
      WHERE t.manager_user_id = $1
      ORDER BY d.name
    `, [userId]);

    // Query 6: Get user's skills
    const skillsResult = await query(`
      SELECT s.id as skill_id, s.name, s.type, s.category, us.level
      FROM skills s
      JOIN user_skills us ON s.id = us.skill_id
      WHERE us.user_id = $1 AND s.is_active = true
      ORDER BY s.name
    `, [userId]);

    // Combine all teams (membership + management)
    const allTeams = [
      ...teamsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        roleInTeam: row.role_in_team
      })),
      ...managerTeamsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        roleInTeam: row.role_in_team
      }))
    ];

    // Remove duplicates from teams (in case user is both member and manager)
    const uniqueTeams = allTeams.filter((team, index, self) => 
      index === self.findIndex(t => t.id === team.id)
    );

    // Combine all departments (direct membership + team membership + management)
    const allDepartments = [
      ...departmentsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description
      })),
      ...teamDepartmentsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description
      })),
      ...managerDepartmentsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description
      }))
    ];

    // Remove duplicates from departments
    const uniqueDepartments = allDepartments.filter((dept, index, self) => 
      index === self.findIndex(d => d.id === dept.id)
    );

    // Build complete user object
    const completeUser = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      jobTitle: user.job_title,
      profilePictureUrl: user.profile_picture_url,
      createdAt: user.created_at,
      status: user.status,
      teams: uniqueTeams,
      departments: uniqueDepartments,
      skills: skillsResult.rows.map(row => ({
        skillId: row.skill_id,
        name: row.name,
        type: row.type,
        category: row.category,
        level: row.level
      }))
    };

    console.log('✅ Full user profile retrieved:', {
      userId: user.id,
      teamsCount: uniqueTeams.length,
      departmentsCount: uniqueDepartments.length,
      skillsCount: skillsResult.rows.length
    });

    return completeUser;

  } catch (error) {
    console.error('❌ Error getting full user profile:', error);
    throw error;
  }
}

module.exports = {
  getFullUserProfile
};
