const { query } = require('../config/database');
const { createNotification } = require('../utils/notifications');
const emailNotificationService = require('./emailNotificationService');

class ObjectiveCompletionService {
  // Check if an objective was just completed and send notifications
  async checkAndNotifyCompletion(objectiveId, previousProgress, newProgress) {
    try {
      // Only proceed if objective just reached 100%
      if (previousProgress < 100 && newProgress >= 100) {
        console.log(`🎉 Objective ${objectiveId} just completed! Sending notifications...`);
        
        // Get objective details
        const objectiveResult = await query(`
          SELECT 
            o.id,
            o.title,
            o.description,
            o.deadline,
            o.progress,
            o.category,
            o.skill_name,
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
          WHERE o.id = $1
        `, [objectiveId]);

        if (objectiveResult.rows.length === 0) {
          console.log(`❌ Objective ${objectiveId} not found`);
          return;
        }

        const objective = objectiveResult.rows[0];
        
        if (objective.assignee_type === 'USER' && objective.user_id) {
          await this.notifyIndividualObjectiveCompletion(objective);
        } else if (objective.assignee_type === 'TEAM' && objective.team_id) {
          await this.notifyTeamObjectiveCompletion(objective);
        }
      }
    } catch (error) {
      console.error(`❌ Error checking objective completion ${objectiveId}:`, error);
    }
  }

  // Notify about individual objective completion
  async notifyIndividualObjectiveCompletion(objective) {
    try {
      // Notify the employee
      await createNotification(
        objective.user_id,
        'objective_completed',
        'Objectif terminé',
        `Félicitations ! Vous avez terminé l'objectif "${objective.title}" avec succès.`,
        'objective',
        objective.id
      );

      // Send email to employee
      await emailNotificationService.sendObjectiveCompleted(
        {
          id: objective.id,
          title: objective.title,
          description: objective.description,
          deadline: objective.deadline,
          progress: objective.progress,
          category: objective.category,
          skill_name: objective.skill_name,
          target_level: objective.target_level,
          team_name: objective.team_name
        },
        {
          id: objective.user_id,
          email: objective.user_email,
          first_name: objective.user_first_name,
          last_name: objective.user_last_name
        },
        {
          id: objective.created_by,
          first_name: objective.creator_first_name,
          last_name: objective.creator_last_name,
          email: objective.creator_email
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
          'employee_objective_completed',
          'Objectif d\'employé terminé',
          `${objective.user_first_name} ${objective.user_last_name} a terminé l'objectif "${objective.title}" avec succès.`,
          'objective',
          objective.id
        );

        // Send email to manager
        await emailNotificationService.sendObjectiveCompleted(
          {
            id: objective.id,
            title: objective.title,
            description: objective.description,
            deadline: objective.deadline,
            progress: objective.progress,
            category: objective.category,
            skill_name: objective.skill_name,
            target_level: objective.target_level,
            team_name: objective.team_name
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

      console.log(`✅ Notified about individual objective completion: ${objective.title}`);
    } catch (error) {
      console.error(`❌ Error notifying individual objective completion ${objective.id}:`, error);
    }
  }

  // Notify about team objective completion
  async notifyTeamObjectiveCompletion(objective) {
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
          'team_objective_completed',
          'Objectif d\'équipe terminé',
          `Félicitations ! L'objectif d'équipe "${objective.title}" a été terminé avec succès.`,
          'objective',
          objective.id
        );

        // Send email to team member
        await emailNotificationService.sendObjectiveCompleted(
          {
            id: objective.id,
            title: objective.title,
            description: objective.description,
            deadline: objective.deadline,
            progress: objective.progress,
            category: objective.category,
            skill_name: objective.skill_name,
            target_level: objective.target_level,
            team_name: objective.team_name
          },
          {
            id: member.user_id,
            email: member.email,
            first_name: member.first_name,
            last_name: member.last_name
          },
          {
            id: objective.created_by,
            first_name: objective.creator_first_name,
            last_name: objective.creator_last_name,
            email: objective.creator_email
          }
        );
      }

      // Notify team manager
      if (managerResult.rows.length > 0) {
        const manager = managerResult.rows[0];
        
        await createNotification(
          manager.manager_id,
          'team_objective_completed',
          'Objectif d\'équipe terminé',
          `L'objectif d'équipe "${objective.title}" a été terminé avec succès.`,
          'objective',
          objective.id
        );

        // Send email to manager
        await emailNotificationService.sendObjectiveCompleted(
          {
            id: objective.id,
            title: objective.title,
            description: objective.description,
            deadline: objective.deadline,
            progress: objective.progress,
            category: objective.category,
            skill_name: objective.skill_name,
            target_level: objective.target_level,
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

      console.log(`✅ Notified about team objective completion: ${objective.title}`);
    } catch (error) {
      console.error(`❌ Error notifying team objective completion ${objective.id}:`, error);
    }
  }
}

module.exports = new ObjectiveCompletionService();
