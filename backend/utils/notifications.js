const { query } = require('../config/database');

// Create a notification
async function createNotification(userId, type, title, body, entityType = null, entityId = null) {
  try {
    const result = await query(`
      INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [userId, type, title, body, entityType, entityId]);
    
    return result.rows[0].id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// Create activity log entry
async function logActivity(actorUserId, action, entityType, entityId, metadata = {}) {
  try {
    await query(`
      INSERT INTO activity_log (actor_user_id, action, entity_type, entity_id, metadata)
      VALUES ($1, $2, $3, $4, $5)
    `, [actorUserId, action, entityType, entityId, JSON.stringify(metadata)]);
  } catch (error) {
    console.error('Error logging activity:', error);
    throw error;
  }
}

// Get user's team members (for managers)
async function getTeamMembers(managerId) {
  try {
    const result = await query(`
      SELECT u.id, u.first_name, u.last_name, u.email
      FROM users u
      JOIN team_members tm ON u.id = tm.user_id
      JOIN teams t ON tm.team_id = t.id
      JOIN team_management_history tmh ON t.id = tmh.team_id
      WHERE tmh.manager_id = $1 AND tmh.is_active = TRUE AND u.role = 'employee'
    `, [managerId]);
    
    return result.rows;
  } catch (error) {
    console.error('Error getting team members:', error);
    throw error;
  }
}

// Get user's manager (for employees)
async function getUserManager(userId) {
  try {
    const result = await query(`
      SELECT u.id, u.first_name, u.last_name, u.email
      FROM users u
      JOIN team_management_history tmh ON u.id = tmh.manager_id
      JOIN teams t ON tmh.team_id = t.id
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = $1 AND tmh.is_active = TRUE AND u.role = 'manager'
      LIMIT 1
    `, [userId]);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user manager:', error);
    throw error;
  }
}

// Notification types
const NOTIFICATION_TYPES = {
  SKILL_REQUEST_CREATED: 'skill_request_created',
  SKILL_REQUEST_APPROVED: 'skill_request_approved',
  SKILL_REQUEST_REJECTED: 'skill_request_rejected',
  OBJECTIVE_ASSIGNED: 'objective_assigned',
  OBJECTIVE_UPDATED: 'objective_updated',
  OBJECTIVE_COMPLETED: 'objective_completed',
  PROGRESS_UPDATE_PENDING: 'progress_update_pending',
  TEAM_ASSIGNED: 'team_assigned',
  TEAM_REMOVED: 'team_removed',
  DEPARTMENT_ASSIGNED: 'department_assigned',
  DEPARTMENT_REMOVED: 'department_removed',
  TEAM_MANAGER_CHANGED: 'team_manager_changed',
  DEPARTMENT_MANAGER_CHANGED: 'department_manager_changed',
  USER_ADDED_TO_TEAM: 'user_added_to_team',
  USER_REMOVED_FROM_TEAM: 'user_removed_from_team'
};

// Create notification for team manager change
async function notifyTeamManagerChange(teamId, oldManagerId, newManagerId, teamName) {
  try {
    // Notify old manager
    if (oldManagerId) {
      await createNotification(
        oldManagerId,
        NOTIFICATION_TYPES.TEAM_MANAGER_CHANGED,
        'Gestion d\'équipe modifiée',
        `Vous n'êtes plus manager de l'équipe "${teamName}"`,
        'team',
        teamId
      );
    }

    // Notify new manager
    if (newManagerId) {
      await createNotification(
        newManagerId,
        NOTIFICATION_TYPES.TEAM_MANAGER_CHANGED,
        'Nouvelle équipe à gérer',
        `Vous êtes maintenant manager de l'équipe "${teamName}"`,
        'team',
        teamId
      );
    }
  } catch (error) {
    console.error('Error notifying team manager change:', error);
  }
}

// Create notification for department manager change
async function notifyDepartmentManagerChange(departmentId, oldManagerId, newManagerId, departmentName) {
  try {
    // Notify old manager
    if (oldManagerId) {
      await createNotification(
        oldManagerId,
        NOTIFICATION_TYPES.DEPARTMENT_MANAGER_CHANGED,
        'Gestion de département modifiée',
        `Vous n'êtes plus manager du département "${departmentName}"`,
        'department',
        departmentId
      );
    }

    // Notify new manager
    if (newManagerId) {
      await createNotification(
        newManagerId,
        NOTIFICATION_TYPES.DEPARTMENT_MANAGER_CHANGED,
        'Nouveau département à gérer',
        `Vous êtes maintenant manager du département "${departmentName}"`,
        'department',
        departmentId
      );
    }
  } catch (error) {
    console.error('Error notifying department manager change:', error);
  }
}

// Create notification for user added to team
async function notifyUserAddedToTeam(userId, teamId, teamName, addedByUserId) {
  try {
    await createNotification(
      userId,
      NOTIFICATION_TYPES.USER_ADDED_TO_TEAM,
      'Ajouté à une équipe',
      `Vous avez été ajouté à l'équipe "${teamName}"`,
      'team',
      teamId
    );
  } catch (error) {
    console.error('Error notifying user added to team:', error);
  }
}

// Create notification for user removed from team
async function notifyUserRemovedFromTeam(userId, teamId, teamName, removedByUserId) {
  try {
    await createNotification(
      userId,
      NOTIFICATION_TYPES.USER_REMOVED_FROM_TEAM,
      'Retiré d\'une équipe',
      `Vous avez été retiré de l'équipe "${teamName}"`,
      'team',
      teamId
    );
  } catch (error) {
    console.error('Error notifying user removed from team:', error);
  }
}

module.exports = {
  createNotification,
  logActivity,
  getTeamMembers,
  getUserManager,
  notifyTeamManagerChange,
  notifyDepartmentManagerChange,
  notifyUserAddedToTeam,
  notifyUserRemovedFromTeam,
  NOTIFICATION_TYPES
};



