const { query } = require('../config/database');
const { createNotification } = require('../utils/notifications');
const emailNotificationService = require('./emailNotificationService');

class LateObjectivesService {
  constructor() {
    this.checkInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.isRunning = false;
  }

  // Start the late objectives monitoring service
  start() {
    if (this.isRunning) {
      console.log('Late objectives service is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚨 Starting late objectives monitoring service...');
    
    // Run immediately on start
    this.checkLateObjectives();
    
    // Then run every 24 hours
    this.intervalId = setInterval(() => {
      this.checkLateObjectives();
    }, this.checkInterval);
  }

  // Stop the service
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Late objectives monitoring service stopped');
  }

  // Main method to check for late objectives
  async checkLateObjectives() {
    try {
      console.log('🔍 Checking for late objectives...');
      
      const today = new Date();
      const threeDaysFromNow = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000));
      
      // Get all active objectives that are approaching deadline or overdue
      const lateObjectivesQuery = `
        SELECT 
          o.id,
          o.title,
          o.description,
          o.deadline,
          o.progress,
          o.category,
          o.skill_id,
          o.target_level,
          o.created_at,
          oa.assignee_type,
          oa.user_id,
          oa.team_id,
          u.first_name as user_first_name,
          u.last_name as user_last_name,
          u.email as user_email,
          t.name as team_name,
          creator.first_name as creator_first_name,
          creator.last_name as creator_last_name,
          creator.email as creator_email
        FROM objectives o
        INNER JOIN objective_assignments oa ON o.id = oa.objective_id
        LEFT JOIN users u ON oa.user_id = u.id
        LEFT JOIN teams t ON oa.team_id = t.id
        LEFT JOIN users creator ON o.created_by = creator.id
        WHERE o.status = 'active'
        AND o.deadline IS NOT NULL
        AND (
          (o.deadline <= $1 AND o.progress < 100) OR -- Overdue
          (o.deadline <= $2 AND o.progress < 50) -- Approaching deadline (3 days) with low progress
        )
        ORDER BY o.deadline ASC
      `;
      
      const result = await query(lateObjectivesQuery, [today, threeDaysFromNow]);
      const lateObjectives = result.rows;
      
      console.log(`🔍 Found ${lateObjectives.length} late/approaching deadline objectives`);
      
      // Process each late objective
      for (const objective of lateObjectives) {
        await this.processLateObjective(objective);
      }
      
      console.log('✅ Late objectives check completed');
    } catch (error) {
      console.error('❌ Error checking late objectives:', error);
    }
  }

  // Process a single late objective
  async processLateObjective(objective) {
    try {
      const today = new Date();
      const deadline = new Date(objective.deadline);
      const isOverdue = deadline < today;
      const daysUntilDeadline = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
      
      if (objective.assignee_type === 'USER' && objective.user_id) {
        // Individual objective
        await this.notifyIndividualLateObjective(objective, isOverdue, daysUntilDeadline);
      } else if (objective.assignee_type === 'TEAM' && objective.team_id) {
        // Team objective
        await this.notifyTeamLateObjective(objective, isOverdue, daysUntilDeadline);
      }
    } catch (error) {
      console.error(`❌ Error processing late objective ${objective.id}:`, error);
    }
  }

  // Notify about individual late objective
  async notifyIndividualLateObjective(objective, isOverdue, daysUntilDeadline) {
    try {
      // Notify the employee
      await createNotification(
        objective.user_id,
        isOverdue ? 'objective_overdue' : 'objective_deadline_approaching',
        isOverdue ? 'Objectif en retard' : 'Échéance approchant',
        `Votre objectif "${objective.title}" ${isOverdue ? 'est en retard' : `arrive à échéance dans ${daysUntilDeadline} jour(s)`}. Progression actuelle: ${objective.progress}%`,
        'objective',
        objective.id
      );

      // Send email to employee
      await emailNotificationService.sendObjectiveDeadlineReminder(
        {
          id: objective.id,
          title: objective.title,
          description: objective.description,
          deadline: objective.deadline,
          progress: objective.progress,
          category: objective.category,
          skill_id: objective.skill_id,
          target_level: objective.target_level
        },
        {
          id: objective.user_id,
          email: objective.user_email,
          first_name: objective.user_first_name,
          last_name: objective.user_last_name
        }
      );

      // Notify the manager
      const managerResult = await query(`
        SELECT tmh.manager_id, m.first_name, m.last_name, m.email
        FROM team_members tm
        INNER JOIN team_management_history tmh ON tm.team_id = tmh.team_id
        INNER JOIN users m ON tmh.manager_id = m.id
        WHERE tm.user_id = $1 AND tmh.is_active = TRUE
        LIMIT 1
      `, [objective.user_id]);

      if (managerResult.rows.length > 0) {
        const manager = managerResult.rows[0];
        
        await createNotification(
          manager.manager_id,
          isOverdue ? 'employee_objective_overdue' : 'employee_deadline_approaching',
          isOverdue ? 'Objectif d\'employé en retard' : 'Échéance d\'employé approchant',
          `${objective.user_first_name} ${objective.user_last_name} a un objectif "${objective.title}" ${isOverdue ? 'en retard' : `qui arrive à échéance dans ${daysUntilDeadline} jour(s)`}. Progression: ${objective.progress}%`,
          'objective',
          objective.id
        );

        // Send email to manager
        await emailNotificationService.sendManagerLateObjective(
          {
            id: objective.id,
            title: objective.title,
            description: objective.description,
            deadline: objective.deadline,
            progress: objective.progress,
            category: objective.category,
            skill_id: objective.skill_id,
            target_level: objective.target_level,
            created_at: objective.created_at
          },
          {
            id: objective.user_id,
            first_name: objective.user_first_name,
            last_name: objective.user_last_name
          },
          {
            id: manager.manager_id,
            first_name: manager.first_name,
            last_name: manager.last_name,
            email: manager.email
          }
        );
      }

      console.log(`✅ Notified about individual late objective: ${objective.title}`);
    } catch (error) {
      console.error(`❌ Error notifying individual late objective ${objective.id}:`, error);
    }
  }

  // Notify about team late objective
  async notifyTeamLateObjective(objective, isOverdue, daysUntilDeadline) {
    try {
      // Get all team members
      const teamMembersResult = await query(`
        SELECT tm.user_id, u.first_name, u.last_name, u.email
        FROM team_members tm
        INNER JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = $1 AND u.status = 'active'
      `, [objective.team_id]);

      const teamMembers = teamMembersResult.rows;

      // Get team manager
      const managerResult = await query(`
        SELECT tmh.manager_id, m.first_name, m.last_name, m.email
        FROM team_management_history tmh
        INNER JOIN users m ON tmh.manager_id = m.id
        WHERE tmh.team_id = $1 AND tmh.is_active = TRUE
        LIMIT 1
      `, [objective.team_id]);

      // Notify all team members
      for (const member of teamMembers) {
        await createNotification(
          member.user_id,
          isOverdue ? 'team_objective_overdue' : 'team_deadline_approaching',
          isOverdue ? 'Objectif d\'équipe en retard' : 'Échéance d\'équipe approchant',
          `L'objectif d'équipe "${objective.title}" ${isOverdue ? 'est en retard' : `arrive à échéance dans ${daysUntilDeadline} jour(s)`}. Progression: ${objective.progress}%`,
          'objective',
          objective.id
        );

        // Send email to team member
        await emailNotificationService.sendObjectiveDeadlineReminder(
          {
            id: objective.id,
            title: objective.title,
            description: objective.description,
            deadline: objective.deadline,
            progress: objective.progress,
            category: objective.category,
            skill_id: objective.skill_id,
            target_level: objective.target_level,
            team_name: objective.team_name
          },
          {
            id: member.user_id,
            email: member.email,
            first_name: member.first_name,
            last_name: member.last_name
          }
        );
      }

      // Notify team manager
      if (managerResult.rows.length > 0) {
        const manager = managerResult.rows[0];
        
        await createNotification(
          manager.manager_id,
          isOverdue ? 'team_objective_overdue' : 'team_deadline_approaching',
          isOverdue ? 'Objectif d\'équipe en retard' : 'Échéance d\'équipe approchant',
          `L'objectif d'équipe "${objective.title}" ${isOverdue ? 'est en retard' : `arrive à échéance dans ${daysUntilDeadline} jour(s)`}. Progression: ${objective.progress}%`,
          'objective',
          objective.id
        );

        // Send email to manager
        await emailNotificationService.sendManagerLateObjective(
          {
            id: objective.id,
            title: objective.title,
            description: objective.description,
            deadline: objective.deadline,
            progress: objective.progress,
            category: objective.category,
            skill_id: objective.skill_id,
            target_level: objective.target_level,
            created_at: objective.created_at,
            team_name: objective.team_name
          },
          {
            id: null, // Team objective, no specific employee
            first_name: 'Équipe',
            last_name: objective.team_name
          },
          {
            id: manager.manager_id,
            first_name: manager.first_name,
            last_name: manager.last_name,
            email: manager.email
          }
        );
      }

      console.log(`✅ Notified about team late objective: ${objective.title}`);
    } catch (error) {
      console.error(`❌ Error notifying team late objective ${objective.id}:`, error);
    }
  }

  // Manual trigger for testing
  async triggerCheck() {
    console.log('🔍 Manual trigger of late objectives check...');
    await this.checkLateObjectives();
  }
}

module.exports = new LateObjectivesService();
