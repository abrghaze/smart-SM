const axios = require('axios');
const logger = require('../utils/logger');

class EmailNotificationService {
  constructor() {
    this.emailServiceUrl = process.env.EMAIL_SERVICE_URL || 'http://localhost:3001';
    this.enabled = process.env.EMAIL_NOTIFICATIONS_ENABLED !== 'false'; // Enable by default
  }

  // Helper method to format dates safely
  formatDate(dateInput) {
    if (!dateInput) {
      return new Date().toLocaleDateString('fr-FR');
    }
    
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      return new Date().toLocaleDateString('fr-FR');
    }
    
    return date.toLocaleDateString('fr-FR');
  }

  async sendEmail(type, data) {
    if (!this.enabled) {
      logger.info(`Email notifications disabled. Would send: ${type}`, data);
      return { success: true, message: 'Email notifications disabled' };
    }

    try {
      const response = await axios.post(`${this.emailServiceUrl}/api/email/send`, {
        type,
        data
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      logger.info(`Email sent successfully: ${type}`, { 
        recipient: data.recipientEmail,
        type,
        response: response.data 
      });
      
      return { success: true, data: response.data };
    } catch (error) {
      logger.error(`Failed to send email: ${type}`, {
        error: error.message,
        data: data
      });
      return { success: false, error: error.message };
    }
  }

  // Objective-related emails
  async sendObjectiveAssigned(objective, assignee, manager) {
    return this.sendEmail('objective_assigned', {
      recipientEmail: assignee.email,
      recipientName: assignee.first_name + ' ' + assignee.last_name,
      objectiveTitle: objective.title,
      objectiveDescription: objective.description || 'Aucune description fournie',
      deadline: objective.deadline ? this.formatDate(objective.deadline) : 'Aucune échéance définie',
      managerName: manager.first_name + ' ' + manager.last_name,
      objectiveId: objective.id,
      category: objective.category,
      skillName: objective.skill_name,
      targetLevel: objective.target_level,
      teamName: objective.team_name
    });
  }

  async sendObjectiveDeadlineReminder(objective, assignee) {
    return this.sendEmail('objective_reminder', {
      recipientEmail: assignee.email,
      recipientName: assignee.first_name + ' ' + assignee.last_name,
      objectiveTitle: objective.title,
      objectiveDescription: objective.description || 'Aucune description fournie',
      deadline: objective.deadline ? this.formatDate(objective.deadline) : 'Aucune échéance définie',
      daysRemaining: this.calculateDaysRemaining(objective.deadline),
      objectiveId: objective.id,
      category: objective.category,
      skillName: objective.skill_name,
      targetLevel: objective.target_level,
      progress: objective.progress || 0
    });
  }

  async sendObjectiveOverdue(objective, assignee, manager) {
    return this.sendEmail('objective_overdue', {
      recipientEmail: assignee.email,
      recipientName: assignee.first_name + ' ' + assignee.last_name,
      objectiveTitle: objective.title,
      objectiveDescription: objective.description || 'Aucune description fournie',
      deadline: objective.deadline ? this.formatDate(objective.deadline) : 'Aucune échéance définie',
      daysOverdue: this.calculateDaysOverdue(objective.deadline),
      managerName: manager.first_name + ' ' + manager.last_name,
      managerEmail: manager.email,
      objectiveId: objective.id,
      category: objective.category,
      skillName: objective.skill_name,
      targetLevel: objective.target_level,
      progress: objective.progress || 0
    });
  }

  async sendObjectiveCompleted(objective, assignee, manager) {
    return this.sendEmail('objective_completed', {
      recipientEmail: manager.email,
      recipientName: manager.first_name + ' ' + manager.last_name,
      employeeName: assignee.first_name + ' ' + assignee.last_name,
      objectiveTitle: objective.title,
      objectiveDescription: objective.description || 'Aucune description fournie',
      completionDate: this.formatDate(new Date()),
      objectiveId: objective.id,
      category: objective.category,
      skillName: objective.skill_name,
      targetLevel: objective.target_level,
      teamName: objective.team_name
    });
  }

  // Team-related emails
  async sendTeamMemberAdded(member, team, manager) {
    return this.sendEmail('team_member_added', {
      recipientEmail: member.email,
      recipientName: member.first_name + ' ' + member.last_name,
      teamName: team.name,
      managerName: manager.first_name + ' ' + manager.last_name,
      teamId: team.id,
      teamDescription: team.description,
      departmentName: team.department_name,
      assignmentDate: this.formatDate(new Date())
    });
  }

  async sendTeamMemberRemoved(member, team, manager) {
    return this.sendEmail('team_member_removed', {
      recipientEmail: member.email,
      recipientName: member.first_name + ' ' + member.last_name,
      teamName: team.name,
      managerName: manager.first_name + ' ' + manager.last_name,
      teamId: team.id,
      teamDescription: team.description,
      departmentName: team.department_name
    });
  }

  async sendNewManagerAssigned(team, newManager, members) {
    const emailPromises = members.map(member => 
      this.sendEmail('new_manager_assigned', {
        recipientEmail: member.email,
        recipientName: member.first_name + ' ' + member.last_name,
        teamName: team.name,
        newManagerName: newManager.first_name + ' ' + newManager.last_name,
        teamId: team.id
      })
    );
    
    return Promise.allSettled(emailPromises);
  }

  // Skill request emails
  async sendSkillRequestSubmitted(request, employee, manager) {
    return this.sendEmail('skill_request_submitted', {
      recipientEmail: manager.email,
      recipientName: manager.first_name + ' ' + manager.last_name,
      employeeName: employee.first_name + ' ' + employee.last_name,
      skillName: request.skill_name || request.requested_skill_name,
      targetLevel: request.target_level || request.requested_level,
      requestId: request.id,
      requestDate: this.formatDate(request.created_at),
      reason: request.reason || request.justification
    });
  }

  async sendSkillRequestApproved(request, employee) {
    return this.sendEmail('skill_request_approved', {
      recipientEmail: employee.email,
      recipientName: employee.first_name + ' ' + employee.last_name,
      skillName: request.skill_name || request.requested_skill_name,
      targetLevel: request.target_level || request.requested_level,
      approvedLevel: request.approved_level,
      requestId: request.id,
      requestDate: this.formatDate(request.created_at),
      managerName: request.approved_by_name
    });
  }

  async sendSkillRequestRejected(request, employee, reason) {
    return this.sendEmail('skill_request_rejected', {
      recipientEmail: employee.email,
      recipientName: employee.first_name + ' ' + employee.last_name,
      skillName: request.skill_name || request.requested_skill_name,
      targetLevel: request.target_level || request.requested_level,
      rejectionReason: reason,
      requestId: request.id,
      requestDate: this.formatDate(request.created_at),
      managerName: request.rejected_by_name
    });
  }

  // Weekly summary for managers
  async sendWeeklyManagerSummary(manager, summaryData) {
    return this.sendEmail('weekly_summary', {
      recipientEmail: manager.email,
      recipientName: manager.first_name + ' ' + manager.last_name,
      summaryData: summaryData
    });
  }

  // Utility methods
  calculateDaysRemaining(deadline) {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  calculateDaysOverdue(deadline) {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = today - deadlineDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Test email functionality
  async sendTestEmail(recipientEmail, recipientName) {
    return this.sendEmail('test', {
      recipientEmail,
      recipientName
    });
  }

  // Additional notification methods for all app notification types
  async sendObjectiveUpdated(objective, assignee, updatedBy) {
    return this.sendEmail('objective_updated', {
      recipientEmail: assignee.email,
      recipientName: assignee.first_name + ' ' + assignee.last_name,
      objectiveTitle: objective.title,
      objectiveDescription: objective.description || 'Aucune description fournie',
      updatedBy: updatedBy.first_name + ' ' + updatedBy.last_name,
      updateDetails: 'L\'objectif a été modifié',
      deadline: objective.deadline ? this.formatDate(objective.deadline) : 'Aucune échéance définie',
      progress: objective.progress || 0,
      category: objective.category,
      skillName: objective.skill_name,
      targetLevel: objective.target_level
    });
  }

  async sendProgressUpdatePending(objective, employee, manager) {
    return this.sendEmail('progress_update_pending', {
      recipientEmail: manager.email,
      recipientName: manager.first_name + ' ' + manager.last_name,
      objectiveTitle: objective.title,
      objectiveDescription: objective.description || 'Aucune description fournie',
      employeeName: employee.first_name + ' ' + employee.last_name,
      progress: 'En attente',
      notes: 'Demande de mise à jour de progression',
      deadline: objective.deadline ? this.formatDate(objective.deadline) : 'Aucune échéance définie',
      category: objective.category,
      skillName: objective.skill_name,
      targetLevel: objective.target_level
    });
  }

  async sendTeamManagerChanged(team, oldManager, newManager, isNewManager) {
    const recipient = isNewManager ? newManager : oldManager;
    return this.sendEmail('team_manager_changed', {
      recipientEmail: recipient.email,
      recipientName: recipient.first_name + ' ' + recipient.last_name,
      teamName: team.name,
      oldManagerName: oldManager ? oldManager.first_name + ' ' + oldManager.last_name : 'Aucun',
      newManagerName: newManager ? newManager.first_name + ' ' + newManager.last_name : 'Aucun',
      isNewManager
    });
  }

  async sendDepartmentAssignment(department, user, manager) {
    return this.sendEmail('department_assigned', {
      recipientEmail: user.email,
      recipientName: user.first_name + ' ' + user.last_name,
      departmentName: department.name,
      managerName: manager ? manager.first_name + ' ' + manager.last_name : 'Aucun'
    });
  }

  async sendDepartmentRemoval(department, user, manager) {
    return this.sendEmail('department_removed', {
      recipientEmail: user.email,
      recipientName: user.first_name + ' ' + user.last_name,
      departmentName: department.name,
      managerName: manager ? manager.first_name + ' ' + manager.last_name : 'Aucun'
    });
  }

  async sendDepartmentManagerChanged(department, oldManager, newManager, isNewManager) {
    const recipient = isNewManager ? newManager : oldManager;
    return this.sendEmail('department_manager_changed', {
      recipientEmail: recipient.email,
      recipientName: recipient.first_name + ' ' + recipient.last_name,
      departmentName: department.name,
      oldManagerName: oldManager ? oldManager.first_name + ' ' + oldManager.last_name : 'Aucun',
      newManagerName: newManager ? newManager.first_name + ' ' + newManager.last_name : 'Aucun',
      isNewManager
    });
  }

  // Manager notifications for late objectives
  async sendManagerLateObjective(objective, employee, manager) {
    const deadline = new Date(objective.deadline);
    const today = new Date();
    const timeDiff = deadline.getTime() - today.getTime();
    const daysUntilDeadline = Math.ceil(timeDiff / (1000 * 3600 * 24));
    const totalDays = Math.ceil((deadline.getTime() - new Date(objective.created_at).getTime()) / (1000 * 3600 * 24));
    const daysPassed = totalDays - daysUntilDeadline;
    const timeProgress = totalDays > 0 ? (daysPassed / totalDays) * 100 : 0;

    return this.sendEmail('manager_late_objective', {
      recipientEmail: manager.email,
      recipientName: manager.first_name + ' ' + manager.last_name,
      employeeName: employee.first_name + ' ' + employee.last_name,
      objectiveTitle: objective.title,
      objectiveDescription: objective.description || 'Aucune description fournie',
      deadline: objective.deadline ? this.formatDate(objective.deadline) : 'Aucune échéance définie',
      progress: objective.progress || 0,
      timeProgress: Math.round(timeProgress),
      status: 'En retard',
      objectiveId: objective.id,
      category: objective.category,
      skillName: objective.skill_name,
      targetLevel: objective.target_level,
      teamName: objective.team_name
    });
  }

  async sendManagerDeadlineMissed(objective, employee, manager) {
    const deadline = new Date(objective.deadline);
    const today = new Date();
    const timeDiff = today.getTime() - deadline.getTime();
    const daysOverdue = Math.ceil(timeDiff / (1000 * 3600 * 24));

    return this.sendEmail('manager_deadline_missed', {
      recipientEmail: manager.email,
      recipientName: manager.first_name + ' ' + manager.last_name,
      employeeName: employee.first_name + ' ' + employee.last_name,
      objectiveTitle: objective.title,
      objectiveDescription: objective.description || 'Aucune description fournie',
      deadline: objective.deadline ? this.formatDate(objective.deadline) : 'Aucune échéance définie',
      progress: objective.progress || 0,
      daysOverdue: Math.max(0, daysOverdue),
      objectiveId: objective.id,
      category: objective.category,
      skillName: objective.skill_name,
      targetLevel: objective.target_level,
      teamName: objective.team_name
    });
  }
}

module.exports = new EmailNotificationService();




