const { query } = require('../config/database');

class NotificationService {
  /**
   * Create a notification for a user
   */
  static async createNotification(userId, type, title, body, entityType, entityId) {
    try {
      // Check if notification already exists to prevent duplicates
      const existingNotification = await query(`
        SELECT id FROM notifications 
        WHERE user_id = $1 AND type = $2 AND entity_type = $3 AND entity_id = $4
        AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'
      `, [userId, type, entityType, entityId]);

      if (existingNotification.rows.length > 0) {
        console.log(`⏭️ Notification already exists for user ${userId}: ${title}`);
        return existingNotification.rows[0];
      }

      const result = await query(`
        INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, created_at
      `, [userId, type, title, body, entityType, entityId]);

      console.log(`✅ Notification created for user ${userId}: ${title}`);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(userId, limit = 50, offset = 0) {
    try {
      const result = await query(`
        SELECT 
          n.id,
          n.type,
          n.title,
          n.body,
          n.entity_type,
          n.entity_id,
          n.read_at,
          n.created_at,
          CASE WHEN n.read_at IS NULL THEN false ELSE true END as is_read
        FROM notifications n
        WHERE n.user_id = $1
        ORDER BY n.created_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId, userId) {
    try {
      const result = await query(`
        UPDATE notifications 
        SET read_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING id, read_at
      `, [notificationId, userId]);

      return result.rows[0];
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId) {
    try {
      // First, get the count of unread notifications
      const countResult = await query(`
        SELECT COUNT(*) as unread_count
        FROM notifications 
        WHERE user_id = $1 AND read_at IS NULL
      `, [userId]);

      const unreadCount = parseInt(countResult.rows[0].unread_count);

      // Then update all unread notifications
      await query(`
        UPDATE notifications 
        SET read_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND read_at IS NULL
      `, [userId]);

      return { updated_count: unreadCount };
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count for a user
   */
  static async getUnreadCount(userId) {
    try {
      const result = await query(`
        SELECT COUNT(*) as unread_count
        FROM notifications
        WHERE user_id = $1 AND read_at IS NULL
      `, [userId]);

      return parseInt(result.rows[0].unread_count);
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Check for overdue and behind-schedule objectives and create notifications
   */
  static async checkObjectiveDeadlines() {
    try {
      console.log('🔍 Checking objective deadlines...');

      // Get all active objectives with deadlines
      const objectivesResult = await query(`
        SELECT 
          o.id,
          o.title,
          o.deadline,
          o.progress,
          o.status,
          o.created_by,
          o.created_at,
          oa.assignee_type,
          oa.user_id,
          oa.team_id,
          u.first_name as assignee_first_name,
          u.last_name as assignee_last_name,
          u.email as assignee_email,
          t.name as team_name,
          t.manager_user_id as team_manager_id,
          tm.first_name as team_manager_first_name,
          tm.last_name as team_manager_last_name,
          tm.email as team_manager_email
        FROM objectives o
        LEFT JOIN objective_assignments oa ON o.id = oa.objective_id
        LEFT JOIN users u ON oa.user_id = u.id
        LEFT JOIN teams t ON oa.team_id = t.id
        LEFT JOIN users tm ON t.manager_user_id = tm.id
        WHERE o.deadline IS NOT NULL 
        AND o.status NOT IN ('completed', 'cancelled')
        AND (o.deadline <= CURRENT_DATE + INTERVAL '7 days' OR o.deadline < CURRENT_DATE) -- Check objectives due within 7 days or overdue
      `);

      const objectives = objectivesResult.rows;
      console.log(`📊 Found ${objectives.length} objectives to check`);

      let notificationsCreated = 0;

      for (const objective of objectives) {
        const deadline = new Date(objective.deadline);
        const today = new Date();
        const timeDiff = deadline.getTime() - today.getTime();
        const daysUntilDeadline = Math.ceil(timeDiff / (1000 * 3600 * 24));
        const totalDays = Math.ceil((deadline.getTime() - new Date(objective.created_at).getTime()) / (1000 * 3600 * 24));
        const daysPassed = totalDays - daysUntilDeadline;
        const progressPercentage = objective.progress || 0;

        // Calculate if more than 80% of deadline has passed
        const deadlineProgress = totalDays > 0 ? (daysPassed / totalDays) * 100 : 0;

        console.log(`🔍 Checking objective: ${objective.title}`);
        console.log(`   - Progress: ${progressPercentage}%`);
        console.log(`   - Days until deadline: ${daysUntilDeadline}`);
        console.log(`   - Deadline progress: ${deadlineProgress.toFixed(1)}%`);

        // Case 1: Deadline has passed and objective is not completed
        if (daysUntilDeadline < 0 && objective.status !== 'completed') {
          await this.createOverdueNotification(objective);
          notificationsCreated++;
        }
        // Case 2: More than 80% of deadline has passed but progress is below 80%
        else if (deadlineProgress > 80 && progressPercentage < 80) {
          await this.createProgressWarningNotification(objective, deadlineProgress, progressPercentage);
          notificationsCreated++;
        }
      }

      console.log(`✅ Deadline check completed. Created ${notificationsCreated} notifications.`);
      return notificationsCreated;

    } catch (error) {
      console.error('❌ Error checking objective deadlines:', error);
      throw error;
    }
  }

  /**
   * Create notification for overdue objective
   */
  static async createOverdueNotification(objective) {
    const title = `🚨 Objectif en retard: ${objective.title}`;
    const body = `L'objectif "${objective.title}" a dépassé sa date limite et n'est pas encore terminé. Veuillez mettre à jour le statut ou la progression.`;

    const notificationPromises = [];
    const emailService = require('./emailNotificationService');

    // Notify the assignee
    if (objective.assignee_type === 'USER' && objective.user_id) {
      notificationPromises.push(
        this.createNotification(
          objective.user_id,
          'deadline_overdue',
          title,
          body,
          'objective',
          objective.id
        )
      );

      // Send email to assignee
      if (objective.assignee_email) {
        const assignee = {
          id: objective.user_id,
          first_name: objective.assignee_first_name,
          last_name: objective.assignee_last_name,
          email: objective.assignee_email
        };
        const manager = objective.created_by ? await this.getUserById(objective.created_by) : null;
        emailService.sendObjectiveOverdue(objective, assignee, manager);
      }
    }

    // Notify the manager (creator)
    if (objective.created_by) {
      notificationPromises.push(
        this.createNotification(
          objective.created_by,
          'deadline_overdue',
          title,
          body,
          'objective',
          objective.id
        )
      );

      // Send email to manager
      const manager = await this.getUserById(objective.created_by);
      if (manager && manager.email) {
        const assignee = {
          first_name: objective.assignee_first_name || 'Utilisateur',
          last_name: objective.assignee_last_name || 'Inconnu',
          email: objective.assignee_email || 'unknown@example.com'
        };
        emailService.sendManagerDeadlineMissed(objective, assignee, manager);
      }
    }

    // Notify team manager if different from creator
    if (objective.team_manager_id && objective.team_manager_id !== objective.created_by) {
      notificationPromises.push(
        this.createNotification(
          objective.team_manager_id,
          'deadline_overdue',
          title,
          body,
          'objective',
          objective.id
        )
      );

      // Send email to team manager
      if (objective.team_manager_email) {
        const teamManager = {
          id: objective.team_manager_id,
          first_name: objective.team_manager_first_name,
          last_name: objective.team_manager_last_name,
          email: objective.team_manager_email
        };
        const assignee = {
          first_name: objective.assignee_first_name || 'Utilisateur',
          last_name: objective.assignee_last_name || 'Inconnu',
          email: objective.assignee_email || 'unknown@example.com'
        };
        emailService.sendManagerLateObjective(objective, assignee, teamManager);
      }
    }

    // Notify all admins
    const admins = await this.getAllAdmins();
    for (const admin of admins) {
      notificationPromises.push(
        this.createNotification(
          admin.id,
          'deadline_overdue',
          title,
          body,
          'objective',
          objective.id
        )
      );
    }

    await Promise.all(notificationPromises);
    console.log(`📢 Created overdue notification for objective: ${objective.title}`);
  }

  /**
   * Create notification for behind-schedule objective
   */
  static async createProgressWarningNotification(objective, deadlineProgress, progressPercentage) {
    const title = `⚠️ Objectif en retard: ${objective.title}`;
    const body = `L'objectif "${objective.title}" est en retard. ${deadlineProgress.toFixed(0)}% du délai est écoulé mais seulement ${progressPercentage}% de progression.`;

    const notificationPromises = [];
    const emailService = require('./emailNotificationService');

    // Notify the assignee
    if (objective.assignee_type === 'USER' && objective.user_id) {
      notificationPromises.push(
        this.createNotification(
          objective.user_id,
          'progress_warning',
          title,
          body,
          'objective',
          objective.id
        )
      );

      // Send email to assignee
      if (objective.assignee_email) {
        const assignee = {
          id: objective.user_id,
          first_name: objective.assignee_first_name,
          last_name: objective.assignee_last_name,
          email: objective.assignee_email
        };
        const manager = objective.created_by ? await this.getUserById(objective.created_by) : null;
        emailService.sendObjectiveOverdue(objective, assignee, manager);
      }
    }

    // Notify the manager (creator)
    if (objective.created_by) {
      notificationPromises.push(
        this.createNotification(
          objective.created_by,
          'progress_warning',
          title,
          body,
          'objective',
          objective.id
        )
      );

      // Send email to manager
      const manager = await this.getUserById(objective.created_by);
      if (manager && manager.email) {
        const assignee = {
          first_name: objective.assignee_first_name || 'Utilisateur',
          last_name: objective.assignee_last_name || 'Inconnu',
          email: objective.assignee_email || 'unknown@example.com'
        };
        emailService.sendManagerLateObjective(objective, assignee, manager);
      }
    }

    // Notify team manager if different from creator
    if (objective.team_manager_id && objective.team_manager_id !== objective.created_by) {
      notificationPromises.push(
        this.createNotification(
          objective.team_manager_id,
          'progress_warning',
          title,
          body,
          'objective',
          objective.id
        )
      );

      // Send email to team manager
      if (objective.team_manager_email) {
        const teamManager = {
          id: objective.team_manager_id,
          first_name: objective.team_manager_first_name,
          last_name: objective.team_manager_last_name,
          email: objective.team_manager_email
        };
        const assignee = {
          first_name: objective.assignee_first_name || 'Utilisateur',
          last_name: objective.assignee_last_name || 'Inconnu',
          email: objective.assignee_email || 'unknown@example.com'
        };
        emailService.sendManagerLateObjective(objective, assignee, teamManager);
      }
    }

    // Notify all admins
    const admins = await this.getAllAdmins();
    for (const admin of admins) {
      notificationPromises.push(
        this.createNotification(
          admin.id,
          'progress_warning',
          title,
          body,
          'objective',
          objective.id
        )
      );
    }

    await Promise.all(notificationPromises);
    console.log(`📢 Created progress warning notification for objective: ${objective.title}`);
  }

  /**
   * Get all admin users
   */
  static async getAllAdmins() {
    try {
      const result = await query(`
        SELECT id, first_name, last_name, email
        FROM users 
        WHERE role = 'admin'
      `);
      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching admins:', error);
      return [];
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId) {
    try {
      const result = await query(`
        SELECT id, first_name, last_name, email
        FROM users 
        WHERE id = $1
      `, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error fetching user:', error);
      return null;
    }
  }
}

module.exports = NotificationService;
