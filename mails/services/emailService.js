const { createTransporter, emailConfig } = require('../config/email');
const templates = require('../templates/emailTemplates');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = createTransporter();
  }

  // Send objective deadline reminder
  async sendObjectiveDeadlineReminder(userEmail, userName, objectiveData) {
    try {
      const { title, deadline, progress, daysRemaining } = objectiveData;
      
      const urgencyClass = daysRemaining <= 1 ? 'deadline-urgent' : 
                          daysRemaining <= 3 ? 'deadline-warning' : '';
      
      const isUrgent = daysRemaining <= 1;
      
      const timeRemaining = daysRemaining === 0 ? 'Aujourd\'hui' :
                           daysRemaining === 1 ? 'Demain' :
                           `${daysRemaining} jours`;

      const html = templates.objectiveDeadline({
        title: 'Rappel d\'échéance - Objectif',
        userName,
        objectiveTitle: title,
        deadline: new Date(deadline).toLocaleDateString('fr-FR'),
        progress,
        timeRemaining,
        urgencyClass,
        isUrgent,
        mainAppUrl: emailConfig.mainAppUrl
      });

      await this.sendEmail({
        to: userEmail,
        subject: `⏰ Rappel d'échéance - ${title}`,
        html
      });

      logger.info(`Objective deadline reminder sent to ${userEmail} for objective: ${title}`);
    } catch (error) {
      logger.error(`Error sending objective deadline reminder: ${error.message}`);
      throw error;
    }
  }

  // Send manager notification about employee's late objective
  async sendManagerNotification(managerEmail, managerName, employeeData, objectiveData) {
    try {
      const { employeeName } = employeeData;
      const { title, deadline, progress, daysRemaining } = objectiveData;
      
      const urgencyClass = daysRemaining <= 1 ? 'deadline-urgent' : 
                          daysRemaining <= 3 ? 'deadline-warning' : '';
      
      const isUrgent = daysRemaining <= 1;
      
      const timeRemaining = daysRemaining === 0 ? 'Aujourd\'hui' :
                           daysRemaining === 1 ? 'Demain' :
                           `${daysRemaining} jours`;

      const html = templates.managerNotification({
        title: 'Notification Manager - Objectif en retard',
        managerName,
        employeeName,
        objectiveTitle: title,
        deadline: new Date(deadline).toLocaleDateString('fr-FR'),
        progress,
        timeRemaining,
        urgencyClass,
        isUrgent,
        mainAppUrl: emailConfig.mainAppUrl
      });

      await this.sendEmail({
        to: managerEmail,
        subject: `👥 ${employeeName} - Objectif en retard: ${title}`,
        html
      });

      logger.info(`Manager notification sent to ${managerEmail} about ${employeeName}'s objective: ${title}`);
    } catch (error) {
      logger.error(`Error sending manager notification: ${error.message}`);
      throw error;
    }
  }

  // Send skill request notification (for approved/rejected requests)
  async sendSkillRequestNotification(userEmail, userName, requestData) {
    try {
      const { skillName, targetLevel, status, reason, requestDate } = requestData;
      
      const isApproved = status === 'approved';

      const html = templates.skillRequest({
        title: 'Demande de compétence',
        userName,
        skillName,
        targetLevel,
        status: isApproved ? 'approuvée' : 'rejetée',
        reason,
        requestDate: new Date(requestDate).toLocaleDateString('fr-FR'),
        isApproved,
        mainAppUrl: emailConfig.mainAppUrl
      });

      const subject = isApproved ? 
        `🎉 Demande approuvée - ${skillName}` : 
        `❌ Demande rejetée - ${skillName}`;

      await this.sendEmail({
        to: userEmail,
        subject,
        html
      });

      logger.info(`Skill request notification sent to ${userEmail} for skill: ${skillName}`);
    } catch (error) {
      logger.error(`Error sending skill request notification: ${error.message}`);
      throw error;
    }
  }

  // Send skill request submitted notification (for managers when employee submits a request)
  async sendSkillRequestSubmittedNotification(userEmail, userName, requestData) {
    try {
      const { employeeName, skillName, targetLevel, reason, requestDate } = requestData;

      const html = templates.skillRequestSubmitted({
        title: 'Nouvelle demande de compétence',
        userName,
        employeeName,
        skillName,
        targetLevel,
        reason,
        requestDate: new Date(requestDate).toLocaleDateString('fr-FR'),
        mainAppUrl: emailConfig.mainAppUrl
      });

      await this.sendEmail({
        to: userEmail,
        subject: `📬 Nouvelle demande de ${employeeName} - ${skillName}`,
        html
      });

      logger.info(`Skill request submitted notification sent to ${userEmail} from ${employeeName} for skill: ${skillName}`);
    } catch (error) {
      logger.error(`Error sending skill request submitted notification: ${error.message}`);
      throw error;
    }
  }

  // Send progress update approved notification (for employees when manager approves)
  async sendProgressUpdateApprovedNotification(userEmail, userName, objectiveData) {
    try {
      const { objectiveTitle, objectiveDescription, managerName, progress, notes, deadline, category, skillName, targetLevel } = objectiveData;

      const html = templates.progressUpdateApproved({
        title: 'Progression approuvée',
        userName,
        objectiveTitle,
        objectiveDescription,
        managerName,
        progress,
        notes,
        deadline,
        category,
        skillName,
        targetLevel,
        mainAppUrl: emailConfig.mainAppUrl
      });

      await this.sendEmail({
        to: userEmail,
        subject: `✅ Progression approuvée - ${objectiveTitle}`,
        html
      });

      logger.info(`Progress update approved notification sent to ${userEmail} for objective: ${objectiveTitle}`);
    } catch (error) {
      logger.error(`Error sending progress update approved notification: ${error.message}`);
      throw error;
    }
  }

  // Send progress update rejected notification (for employees when manager rejects)
  async sendProgressUpdateRejectedNotification(userEmail, userName, objectiveData) {
    try {
      const { objectiveTitle, objectiveDescription, managerName, rejectionReason, progress, notes, deadline, category, skillName, targetLevel } = objectiveData;

      const html = templates.progressUpdateRejected({
        title: 'Progression rejetée',
        userName,
        objectiveTitle,
        objectiveDescription,
        managerName,
        rejectionReason,
        progress,
        notes,
        deadline,
        category,
        skillName,
        targetLevel,
        mainAppUrl: emailConfig.mainAppUrl
      });

      await this.sendEmail({
        to: userEmail,
        subject: `❌ Progression rejetée - ${objectiveTitle}`,
        html
      });

      logger.info(`Progress update rejected notification sent to ${userEmail} for objective: ${objectiveTitle}`);
    } catch (error) {
      logger.error(`Error sending progress update rejected notification: ${error.message}`);
      throw error;
    }
  }

  // Send objective assigned notification
  async sendObjectiveAssignedNotification(userEmail, userName, objectiveData) {
    try {
      const { title, description, deadline, skillName, targetLevel, category, managerName, teamName } = objectiveData;

      const html = templates.objectiveAssigned({
        title: 'Nouvel objectif assigné',
        userName,
        objectiveTitle: title,
        objectiveDescription: description || 'Aucune description fournie',
        deadline: deadline || 'Aucune échéance définie',
        skillName,
        targetLevel,
        category,
        managerName,
        teamName,
        mainAppUrl: emailConfig.mainAppUrl
      });

      await this.sendEmail({
        to: userEmail,
        subject: `📋 Nouvel objectif assigné - ${title}`,
        html
      });

      logger.info(`Objective assigned notification sent to ${userEmail} for objective: ${title}`);
    } catch (error) {
      logger.error(`Error sending objective assigned notification: ${error.message}`);
      throw error;
    }
  }

  // Send team assignment notification
  async sendTeamAssignmentNotification(userEmail, userName, teamData) {
    try {
      const { teamName, action, assignmentDate, managerName, departmentName, teamDescription } = teamData;
      
      const isAdded = action === 'added';

      const html = templates.teamAssignment({
        title: 'Affectation d\'équipe',
        userName,
        teamName,
        action: isAdded ? 'ajouté à' : 'retiré de',
        assignmentDate: assignmentDate || new Date().toLocaleDateString('fr-FR'),
        managerName,
        departmentName,
        teamDescription,
        isAdded,
        mainAppUrl: emailConfig.mainAppUrl
      });

      const subject = isAdded ? 
        `👥 Ajouté à l'équipe ${teamName}` : 
        `👥 Retiré de l'équipe ${teamName}`;

      await this.sendEmail({
        to: userEmail,
        subject,
        html
      });

      logger.info(`Team assignment notification sent to ${userEmail} for team: ${teamName}`);
    } catch (error) {
      logger.error(`Error sending team assignment notification: ${error.message}`);
      throw error;
    }
  }

  // Send skill request approved notification
  async sendSkillRequestApprovedNotification(userEmail, userName, requestData) {
    try {
      const { skillName, approvedLevel, targetLevel, requestDate, managerName } = requestData;
      
      const html = templates.skillRequestApproved({
        title: 'Demande de compétence approuvée',
        userName,
        skillName,
        targetLevel,
        approvedLevel,
        requestDate: requestDate || new Date().toLocaleDateString('fr-FR'),
        managerName,
        mainAppUrl: emailConfig.mainAppUrl
      });

      await this.sendEmail({
        to: userEmail,
        subject: `✅ Demande approuvée - ${skillName}`,
        html
      });

      logger.info(`Skill request approved notification sent to ${userEmail} for skill: ${skillName}`);
    } catch (error) {
      logger.error(`Error sending skill request approved notification: ${error.message}`);
      throw error;
    }
  }

  // Send skill request rejected notification
  async sendSkillRequestRejectedNotification(userEmail, userName, requestData) {
    try {
      const { skillName, rejectionReason, targetLevel, requestDate, managerName } = requestData;
      
      const html = templates.skillRequestRejected({
        title: 'Demande de compétence rejetée',
        userName,
        skillName,
        targetLevel,
        rejectionReason,
        requestDate: requestDate || new Date().toLocaleDateString('fr-FR'),
        managerName,
        mainAppUrl: emailConfig.mainAppUrl
      });

      await this.sendEmail({
        to: userEmail,
        subject: `❌ Demande rejetée - ${skillName}`,
        html
      });

      logger.info(`Skill request rejected notification sent to ${userEmail} for skill: ${skillName}`);
    } catch (error) {
      logger.error(`Error sending skill request rejected notification: ${error.message}`);
      throw error;
    }
  }

  // Send team removal notification
  async sendTeamRemovalNotification(userEmail, userName, teamData) {
    try {
      const { teamName, managerName } = teamData;
      
      const html = templates.teamRemoval({
        title: 'Retrait d\'équipe',
        userName,
        teamName,
        managerName,
        mainAppUrl: emailConfig.mainAppUrl
      });

      await this.sendEmail({
        to: userEmail,
        subject: `👥 Retrait de l'équipe - ${teamName}`,
        html
      });

      logger.info(`Team removal notification sent to ${userEmail} for team: ${teamName}`);
    } catch (error) {
      logger.error(`Error sending team removal notification: ${error.message}`);
      throw error;
    }
  }

  // Send new manager assigned notification
  async sendNewManagerNotification(userEmail, userName, managerData) {
    try {
      const { teamName, newManagerName } = managerData;
      
      const html = templates.newManagerAssigned({
        title: 'Nouveau manager assigné',
        userName,
        teamName,
        newManagerName,
        mainAppUrl: emailConfig.mainAppUrl
      });

      await this.sendEmail({
        to: userEmail,
        subject: `👨‍💼 Nouveau manager - ${teamName}`,
        html
      });

      logger.info(`New manager notification sent to ${userEmail} for team: ${teamName}`);
    } catch (error) {
      logger.error(`Error sending new manager notification: ${error.message}`);
      throw error;
    }
  }

  // Send objective overdue notification
  async sendObjectiveOverdueNotification(userEmail, userName, objectiveData) {
    try {
      const { objectiveTitle, deadline, daysOverdue, managerName, managerEmail } = objectiveData;
      
      const html = templates.objectiveOverdue({
        title: 'Objectif en retard',
        userName,
        objectiveTitle,
        deadline: new Date(deadline).toLocaleDateString('fr-FR'),
        daysOverdue,
        managerName,
        managerEmail,
        mainAppUrl: emailConfig.mainAppUrl
      });

      await this.sendEmail({
        to: userEmail,
        subject: `🚨 Objectif en retard - ${objectiveTitle}`,
        html
      });

      logger.info(`Objective overdue notification sent to ${userEmail} for objective: ${objectiveTitle}`);
    } catch (error) {
      logger.error(`Error sending objective overdue notification: ${error.message}`);
      throw error;
    }
  }

  // Send objective completed notification
  async sendObjectiveCompletedNotification(userEmail, userName, objectiveData) {
    try {
      const { employeeName, objectiveTitle, completionDate } = objectiveData;
      
      const html = templates.objectiveCompleted({
        title: 'Objectif terminé',
        userName,
        employeeName,
        objectiveTitle,
        completionDate,
        mainAppUrl: emailConfig.mainAppUrl
      });

      await this.sendEmail({
        to: userEmail,
        subject: `🎉 Objectif terminé - ${objectiveTitle}`,
        html
      });

      logger.info(`Objective completed notification sent to ${userEmail} for objective: ${objectiveTitle}`);
    } catch (error) {
      logger.error(`Error sending objective completed notification: ${error.message}`);
      throw error;
    }
  }

  // Send objective updated notification
  async sendObjectiveUpdatedNotification(userEmail, userName, objectiveData) {
    try {
      const { objectiveTitle, updatedBy, updateDetails } = objectiveData;
      
      const html = templates.objectiveUpdated({
        title: 'Objectif mis à jour',
        userName,
        objectiveTitle,
        updatedBy,
        updateDetails,
        mainAppUrl: emailConfig.mainAppUrl
      });

      await this.sendEmail({
        to: userEmail,
        subject: `📝 Objectif mis à jour - ${objectiveTitle}`,
        html
      });

      logger.info(`Objective updated notification sent to ${userEmail} for objective: ${objectiveTitle}`);
    } catch (error) {
      logger.error(`Error sending objective updated notification: ${error.message}`);
      throw error;
    }
  }

  // Send progress update pending notification
  async sendProgressUpdatePendingNotification(userEmail, userName, updateData) {
    try {
      const { objectiveTitle, employeeName, progress, notes } = updateData;
      
      const html = templates.progressUpdatePending({
        title: 'Demande de mise à jour de progression',
        userName,
        objectiveTitle,
        employeeName,
        progress,
        notes,
        mainAppUrl: emailConfig.mainAppUrl
      });

      await this.sendEmail({
        to: userEmail,
        subject: `⏳ Demande de progression - ${objectiveTitle}`,
        html
      });

      logger.info(`Progress update pending notification sent to ${userEmail} for objective: ${objectiveTitle}`);
    } catch (error) {
      logger.error(`Error sending progress update pending notification: ${error.message}`);
      throw error;
    }
  }

  // Send team manager changed notification
  async sendTeamManagerChangedNotification(userEmail, userName, teamData) {
    try {
      const { teamName, oldManagerName, newManagerName, isNewManager } = teamData;
      
      const html = templates.teamManagerChanged({
        title: isNewManager ? 'Nouvelle équipe à gérer' : 'Gestion d\'équipe modifiée',
        userName,
        teamName,
        oldManagerName,
        newManagerName,
        isNewManager,
        mainAppUrl: emailConfig.mainAppUrl
      });

      const subject = isNewManager ? 
        `👨‍💼 Nouvelle équipe à gérer - ${teamName}` : 
        `👥 Gestion d'équipe modifiée - ${teamName}`;

      await this.sendEmail({
        to: userEmail,
        subject,
        html
      });

      logger.info(`Team manager changed notification sent to ${userEmail} for team: ${teamName}`);
    } catch (error) {
      logger.error(`Error sending team manager changed notification: ${error.message}`);
      throw error;
    }
  }

  // Send department assignment notification
  async sendDepartmentAssignmentNotification(userEmail, userName, departmentData) {
    try {
      const { departmentName, managerName } = departmentData;
      
      const html = templates.departmentAssignment({
        title: 'Assignation à un département',
        userName,
        departmentName,
        managerName,
        mainAppUrl: emailConfig.mainAppUrl
      });

      await this.sendEmail({
        to: userEmail,
        subject: `🏢 Nouveau département - ${departmentName}`,
        html
      });

      logger.info(`Department assignment notification sent to ${userEmail} for department: ${departmentName}`);
    } catch (error) {
      logger.error(`Error sending department assignment notification: ${error.message}`);
      throw error;
    }
  }

  // Send department removal notification
  async sendDepartmentRemovalNotification(userEmail, userName, departmentData) {
    try {
      const { departmentName, managerName } = departmentData;
      
      const html = templates.departmentRemoval({
        title: 'Retrait d\'un département',
        userName,
        departmentName,
        managerName,
        mainAppUrl: emailConfig.mainAppUrl
      });

      await this.sendEmail({
        to: userEmail,
        subject: `🏢 Retrait du département - ${departmentName}`,
        html
      });

      logger.info(`Department removal notification sent to ${userEmail} for department: ${departmentName}`);
    } catch (error) {
      logger.error(`Error sending department removal notification: ${error.message}`);
      throw error;
    }
  }

  // Send department manager changed notification
  async sendDepartmentManagerChangedNotification(userEmail, userName, departmentData) {
    try {
      const { departmentName, oldManagerName, newManagerName, isNewManager } = departmentData;
      
      const html = templates.departmentManagerChanged({
        title: isNewManager ? 'Nouveau département à gérer' : 'Gestion de département modifiée',
        userName,
        departmentName,
        oldManagerName,
        newManagerName,
        isNewManager,
        mainAppUrl: emailConfig.mainAppUrl
      });

      const subject = isNewManager ? 
        `👨‍💼 Nouveau département à gérer - ${departmentName}` : 
        `🏢 Gestion de département modifiée - ${departmentName}`;

      await this.sendEmail({
        to: userEmail,
        subject,
        html
      });

      logger.info(`Department manager changed notification sent to ${userEmail} for department: ${departmentName}`);
    } catch (error) {
      logger.error(`Error sending department manager changed notification: ${error.message}`);
      throw error;
    }
  }

  // Send weekly summary notification
  async sendWeeklySummaryNotification(userEmail, userName, summaryData) {
    try {
      const html = templates.weeklySummary({
        title: 'Résumé hebdomadaire',
        userName,
        summaryData,
        mainAppUrl: emailConfig.mainAppUrl
      });

      await this.sendEmail({
        to: userEmail,
        subject: `📊 Résumé hebdomadaire - ${new Date().toLocaleDateString('fr-FR')}`,
        html
      });

      logger.info(`Weekly summary notification sent to ${userEmail}`);
    } catch (error) {
      logger.error(`Error sending weekly summary notification: ${error.message}`);
      throw error;
    }
  }

  // Generic email sending method
  async sendEmail({ to, subject, html, text }) {
    try {
      const mailOptions = {
        from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        replyTo: emailConfig.replyTo
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${to}: ${result.messageId}`);
      return result;
    } catch (error) {
      logger.error(`Error sending email to ${to}: ${error.message}`);
      throw error;
    }
  }

  // Test email configuration
  async testEmailConfiguration() {
    try {
      await this.transporter.verify();
      logger.info('Email configuration verified successfully');
      return true;
    } catch (error) {
      logger.error(`Email configuration error: ${error.message}`);
      return false;
    }
  }

  // Send manager notification for late objective
  async sendManagerLateObjectiveNotification(userEmail, userName, data) {
    try {
      const html = templates.managerLateObjective({
        title: 'Objectif en retard - Action requise',
        managerName: userName,
        employeeName: data.employeeName,
        objectiveTitle: data.objectiveTitle,
        objectiveDescription: data.objectiveDescription,
        deadline: data.deadline,
        progress: data.progress,
        timeProgress: data.timeProgress,
        status: data.status,
        skillName: data.skillName,
        targetLevel: data.targetLevel,
        category: data.category,
        teamName: data.teamName,
        mainAppUrl: emailConfig.mainAppUrl
      });

      await this.sendEmail({
        to: userEmail,
        subject: `🚨 Objectif en retard - ${data.objectiveTitle}`,
        html
      });

      logger.info(`Manager late objective notification sent to ${userEmail} for objective: ${data.objectiveTitle}`);
    } catch (error) {
      logger.error(`Error sending manager late objective notification: ${error.message}`);
      throw error;
    }
  }

  // Send manager notification for deadline missed
  async sendManagerDeadlineMissedNotification(userEmail, userName, data) {
    try {
      const html = templates.managerDeadlineMissed({
        title: 'Échéance dépassée - Objectif non terminé',
        managerName: userName,
        employeeName: data.employeeName,
        objectiveTitle: data.objectiveTitle,
        objectiveDescription: data.objectiveDescription,
        deadline: data.deadline,
        progress: data.progress,
        daysOverdue: data.daysOverdue,
        skillName: data.skillName,
        targetLevel: data.targetLevel,
        category: data.category,
        teamName: data.teamName,
        mainAppUrl: emailConfig.mainAppUrl
      });

      await this.sendEmail({
        to: userEmail,
        subject: `🚨 Échéance dépassée - ${data.objectiveTitle}`,
        html
      });

      logger.info(`Manager deadline missed notification sent to ${userEmail} for objective: ${data.objectiveTitle}`);
    } catch (error) {
      logger.error(`Error sending manager deadline missed notification: ${error.message}`);
      throw error;
    }
  }

  // Send job title objective assignment notification
  async sendJobTitleObjectiveAssigned(userEmail, userName, objectiveData) {
    try {
      const { jobTitle, assignerName, notes, objectiveId } = objectiveData;

      const html = templates.jobTitleObjectiveAssigned({
        title: 'Nouvel objectif de titre de poste assigné',
        userName,
        jobTitle,
        assignerName,
        notes,
        assignmentDate: new Date().toLocaleDateString('fr-FR'),
        mainAppUrl: emailConfig.mainAppUrl
      });

      await this.sendEmail({
        to: userEmail,
        subject: `🎯 Nouvel objectif de titre de poste: ${jobTitle}`,
        html
      });

      logger.info(`Job title objective assignment notification sent to ${userEmail} for job title: ${jobTitle}`);
    } catch (error) {
      logger.error(`Error sending job title objective assignment notification: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new EmailService();


