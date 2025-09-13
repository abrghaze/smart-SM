const axios = require('axios');
const logger = require('./logger');

class NotificationIntegration {
  constructor() {
    this.mainAppUrl = process.env.MAIN_APP_API_URL || 'http://localhost:3000/api';
    this.emailServiceUrl = process.env.EMAIL_SERVICE_URL || 'http://localhost:3001/api/email';
  }

  // Send notification to main app and trigger email
  async sendNotificationWithEmail(notificationData) {
    try {
      // First, create notification in main app
      const notificationResult = await this.createMainAppNotification(notificationData);
      
      // Then, send email if user has email preferences enabled
      if (notificationResult.success && notificationData.sendEmail) {
        await this.triggerEmailNotification(notificationData);
      }

      return notificationResult;
    } catch (error) {
      logger.error(`Error in notification integration: ${error.message}`);
      throw error;
    }
  }

  // Create notification in main app
  async createMainAppNotification(notificationData) {
    try {
      const response = await axios.post(`${this.mainAppUrl}/notifications`, {
        userId: notificationData.userId,
        type: notificationData.type,
        title: notificationData.title,
        body: notificationData.body,
        entityType: notificationData.entityType,
        entityId: notificationData.entityId
      });

      return {
        success: true,
        notificationId: response.data.id
      };
    } catch (error) {
      logger.error(`Error creating main app notification: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Trigger email notification
  async triggerEmailNotification(notificationData) {
    try {
      const emailEndpoint = this.getEmailEndpoint(notificationData.type);
      if (!emailEndpoint) {
        logger.warn(`No email endpoint for notification type: ${notificationData.type}`);
        return;
      }

      const emailPayload = this.buildEmailPayload(notificationData);
      
      await axios.post(`${this.emailServiceUrl}${emailEndpoint}`, emailPayload);
      
      logger.info(`Email notification sent for type: ${notificationData.type}`);
    } catch (error) {
      logger.error(`Error sending email notification: ${error.message}`);
    }
  }

  // Get email endpoint based on notification type
  getEmailEndpoint(notificationType) {
    const endpointMap = {
      'objective_assigned': '/objective-assigned',
      'objective_updated': '/objective-deadline',
      'skill_request_approved': '/skill-request',
      'skill_request_rejected': '/skill-request',
      'user_added_to_team': '/team-assignment',
      'user_removed_from_team': '/team-assignment'
    };

    return endpointMap[notificationType] || null;
  }

  // Build email payload based on notification type
  buildEmailPayload(notificationData) {
    const basePayload = {
      userEmail: notificationData.userEmail,
      userName: notificationData.userName
    };

    switch (notificationData.type) {
      case 'objective_assigned':
        return {
          ...basePayload,
          objectiveData: {
            title: notificationData.objectiveTitle,
            description: notificationData.objectiveDescription || 'Aucune description fournie',
            deadline: notificationData.deadline ? new Date(notificationData.deadline).toLocaleDateString('fr-FR') : 'Aucune échéance définie',
            skillName: notificationData.skillName,
            targetLevel: notificationData.targetLevel,
            category: notificationData.category,
            managerName: notificationData.managerName,
            teamName: notificationData.teamName
          }
        };

      case 'objective_updated':
        return {
          ...basePayload,
          objectiveData: {
            title: notificationData.objectiveTitle,
            description: notificationData.objectiveDescription || 'Aucune description fournie',
            deadline: notificationData.deadline ? new Date(notificationData.deadline).toLocaleDateString('fr-FR') : 'Aucune échéance définie',
            progress: notificationData.progress,
            daysRemaining: notificationData.daysRemaining,
            skillName: notificationData.skillName,
            targetLevel: notificationData.targetLevel,
            category: notificationData.category,
            updatedBy: notificationData.updatedBy
          }
        };

      case 'skill_request_approved':
      case 'skill_request_rejected':
        return {
          ...basePayload,
          requestData: {
            skillName: notificationData.skillName,
            targetLevel: notificationData.targetLevel,
            status: notificationData.type === 'skill_request_approved' ? 'approved' : 'rejected',
            reason: notificationData.reason,
            requestDate: notificationData.requestDate ? new Date(notificationData.requestDate).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR'),
            approvedLevel: notificationData.approvedLevel,
            managerName: notificationData.managerName
          }
        };

      case 'user_added_to_team':
      case 'user_removed_from_team':
        return {
          ...basePayload,
          teamData: {
            teamName: notificationData.teamName,
            action: notificationData.type === 'user_added_to_team' ? 'added' : 'removed',
            assignmentDate: new Date().toLocaleDateString('fr-FR'),
            managerName: notificationData.managerName,
            departmentName: notificationData.departmentName,
            teamDescription: notificationData.teamDescription
          }
        };

      case 'objective_deadline_reminder':
        return {
          ...basePayload,
          objectiveData: {
            title: notificationData.objectiveTitle,
            description: notificationData.objectiveDescription || 'Aucune description fournie',
            deadline: notificationData.deadline ? new Date(notificationData.deadline).toLocaleDateString('fr-FR') : 'Aucune échéance définie',
            progress: notificationData.progress,
            daysRemaining: notificationData.daysRemaining,
            skillName: notificationData.skillName,
            targetLevel: notificationData.targetLevel,
            category: notificationData.category
          }
        };

      case 'objective_overdue':
        return {
          ...basePayload,
          objectiveData: {
            title: notificationData.objectiveTitle,
            description: notificationData.objectiveDescription || 'Aucune description fournie',
            deadline: notificationData.deadline ? new Date(notificationData.deadline).toLocaleDateString('fr-FR') : 'Aucune échéance définie',
            progress: notificationData.progress,
            daysOverdue: notificationData.daysOverdue,
            skillName: notificationData.skillName,
            targetLevel: notificationData.targetLevel,
            category: notificationData.category,
            managerName: notificationData.managerName
          }
        };

      default:
        return basePayload;
    }
  }

  // Get user data from main app
  async getUserData(userId) {
    try {
      const response = await axios.get(`${this.mainAppUrl}/users/${userId}`);
      return response.data;
    } catch (error) {
      logger.error(`Error fetching user data: ${error.message}`);
      return null;
    }
  }

  // Get manager data for a user
  async getUserManager(userId) {
    try {
      const response = await axios.get(`${this.mainAppUrl}/users/${userId}/manager`);
      return response.data;
    } catch (error) {
      logger.error(`Error fetching user manager: ${error.message}`);
      return null;
    }
  }
}

module.exports = new NotificationIntegration();



