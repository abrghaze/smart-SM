const express = require('express');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

const router = express.Router();

// Test email configuration
router.get('/test-config', async (req, res) => {
  try {
    const isValid = await emailService.testEmailConfiguration();
    res.json({
      success: isValid,
      message: isValid ? 'Email configuration is valid' : 'Email configuration has errors'
    });
  } catch (error) {
    logger.error(`Test config error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error testing email configuration',
      error: error.message
    });
  }
});

// Send test email
router.post('/test', async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    
    if (!to || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, subject, message'
      });
    }

    await emailService.sendEmail({
      to,
      subject,
      html: `<p>${message}</p>`
    });

    res.json({
      success: true,
      message: 'Test email sent successfully'
    });
  } catch (error) {
    logger.error(`Test email error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error sending test email',
      error: error.message
    });
  }
});

// Send objective deadline reminder
router.post('/objective-deadline', async (req, res) => {
  try {
    const { userEmail, userName, objectiveData } = req.body;
    
    if (!userEmail || !userName || !objectiveData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userEmail, userName, objectiveData'
      });
    }

    await emailService.sendObjectiveDeadlineReminder(userEmail, userName, objectiveData);

    res.json({
      success: true,
      message: 'Objective deadline reminder sent successfully'
    });
  } catch (error) {
    logger.error(`Objective deadline email error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error sending objective deadline reminder',
      error: error.message
    });
  }
});

// Send manager notification
router.post('/manager-notification', async (req, res) => {
  try {
    const { managerEmail, managerName, employeeData, objectiveData } = req.body;
    
    if (!managerEmail || !managerName || !employeeData || !objectiveData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: managerEmail, managerName, employeeData, objectiveData'
      });
    }

    await emailService.sendManagerNotification(managerEmail, managerName, employeeData, objectiveData);

    res.json({
      success: true,
      message: 'Manager notification sent successfully'
    });
  } catch (error) {
    logger.error(`Manager notification email error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error sending manager notification',
      error: error.message
    });
  }
});

// Send skill request notification
router.post('/skill-request', async (req, res) => {
  try {
    const { userEmail, userName, requestData } = req.body;
    
    if (!userEmail || !userName || !requestData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userEmail, userName, requestData'
      });
    }

    await emailService.sendSkillRequestNotification(userEmail, userName, requestData);

    res.json({
      success: true,
      message: 'Skill request notification sent successfully'
    });
  } catch (error) {
    logger.error(`Skill request email error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error sending skill request notification',
      error: error.message
    });
  }
});

// Send objective assigned notification
router.post('/objective-assigned', async (req, res) => {
  try {
    const { userEmail, userName, objectiveData } = req.body;
    
    if (!userEmail || !userName || !objectiveData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userEmail, userName, objectiveData'
      });
    }

    await emailService.sendObjectiveAssignedNotification(userEmail, userName, objectiveData);

    res.json({
      success: true,
      message: 'Objective assigned notification sent successfully'
    });
  } catch (error) {
    logger.error(`Objective assigned email error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error sending objective assigned notification',
      error: error.message
    });
  }
});

// Send team assignment notification
router.post('/team-assignment', async (req, res) => {
  try {
    const { userEmail, userName, teamData } = req.body;
    
    if (!userEmail || !userName || !teamData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userEmail, userName, teamData'
      });
    }

    await emailService.sendTeamAssignmentNotification(userEmail, userName, teamData);

    res.json({
      success: true,
      message: 'Team assignment notification sent successfully'
    });
  } catch (error) {
    logger.error(`Team assignment email error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error sending team assignment notification',
      error: error.message
    });
  }
});

// Generic send endpoint for different email types
router.post('/send', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    if (!type || !data) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, data'
      });
    }

    let result;
    
    switch (type) {
      // Skill Request Notifications
      case 'skill_request_created':
      case 'skill_request_submitted':
        result = await emailService.sendSkillRequestSubmittedNotification(
          data.recipientEmail,
          data.recipientName,
          data
        );
        break;
        
      case 'skill_request_approved':
        result = await emailService.sendSkillRequestApprovedNotification(
          data.recipientEmail,
          data.recipientName,
          data
        );
        break;
        
      case 'skill_request_rejected':
        result = await emailService.sendSkillRequestRejectedNotification(
          data.recipientEmail,
          data.recipientName,
          data
        );
        break;
        
      // Objective Notifications
      case 'objective_assigned':
        result = await emailService.sendObjectiveAssignedNotification(
          data.recipientEmail,
          data.recipientName,
          data
        );
        break;
        
      case 'objective_updated':
        result = await emailService.sendObjectiveUpdatedNotification(
          data.recipientEmail,
          data.recipientName,
          data
        );
        break;
        
      case 'objective_completed':
        result = await emailService.sendObjectiveCompletedNotification(
          data.recipientEmail,
          data.recipientName,
          data
        );
        break;
        
      case 'progress_update_pending':
        result = await emailService.sendProgressUpdatePendingNotification(
          data.recipientEmail,
          data.recipientName,
          data
        );
        break;
        
      case 'progress_update_approved':
        result = await emailService.sendProgressUpdateApprovedNotification(
          data.recipientEmail,
          data.recipientName,
          data
        );
        break;
        
      case 'progress_update_rejected':
        result = await emailService.sendProgressUpdateRejectedNotification(
          data.recipientEmail,
          data.recipientName,
          data
        );
        break;
        
      case 'objective_reminder':
        result = await emailService.sendObjectiveDeadlineReminder(
          data.recipientEmail,
          data.recipientName,
          data
        );
        break;
        
      case 'objective_overdue':
        result = await emailService.sendObjectiveOverdueNotification(
          data.recipientEmail,
          data.recipientName,
          data
        );
        break;
        
      case 'manager_late_objective':
        result = await emailService.sendManagerLateObjectiveNotification(
          data.recipientEmail,
          data.recipientName,
          data
        );
        break;
        
      case 'manager_deadline_missed':
        result = await emailService.sendManagerDeadlineMissedNotification(
          data.recipientEmail,
          data.recipientName,
          data
        );
        break;
        
      case 'job_title_objective_assigned':
        result = await emailService.sendJobTitleObjectiveAssigned(
          data.recipientEmail,
          data.recipientName,
          data
        );
        break;
        
      // Team Notifications
      case 'team_assigned':
      case 'user_added_to_team':
      case 'team_member_added':
        result = await emailService.sendTeamAssignmentNotification(
          data.recipientEmail,
          data.recipientName,
          data
        );
        break;
        
      case 'team_removed':
      case 'user_removed_from_team':
      case 'team_member_removed':
        result = await emailService.sendTeamRemovalNotification(
          data.recipientEmail,
          data.recipientName,
          data
        );
        break;
        
      case 'team_manager_changed':
        result = await emailService.sendTeamManagerChangedNotification(
          data.recipientEmail,
          data.recipientName,
          data
        );
        break;
        
      // Department Notifications
      case 'department_assigned':
        result = await emailService.sendDepartmentAssignmentNotification(
          data.recipientEmail,
          data.recipientName,
          data
        );
        break;
        
      case 'department_removed':
        result = await emailService.sendDepartmentRemovalNotification(
          data.recipientEmail,
          data.recipientName,
          data
        );
        break;
        
      case 'department_manager_changed':
        result = await emailService.sendDepartmentManagerChangedNotification(
          data.recipientEmail,
          data.recipientName,
          data
        );
        break;
        
      // System Notifications
      case 'weekly_summary':
        result = await emailService.sendWeeklySummaryNotification(
          data.recipientEmail,
          data.recipientName,
          data
        );
        break;
        
      case 'test':
        result = await emailService.sendEmail({
          to: data.recipientEmail,
          subject: 'Test Email from Smart Skill Matrix',
          html: `<p>Hello ${data.recipientName}, this is a test email from Smart Skill Matrix!</p>`
        });
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: `Unknown email type: ${type}`
        });
    }

    res.json({
      success: true,
      message: `${type} email sent successfully`,
      result
    });
  } catch (error) {
    logger.error(`Send email error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error sending email',
      error: error.message
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'email-service',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;


