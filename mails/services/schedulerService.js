const cron = require('node-cron');
const { query } = require('../config/database');
const emailService = require('./emailService');
const logger = require('../utils/logger');

class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.initializeScheduledTasks();
  }

  // Initialize all scheduled tasks
  initializeScheduledTasks() {
    // Check for objectives approaching deadlines every day at 9:00 AM
    this.scheduleTask('daily-deadline-check', '0 9 * * *', () => {
      this.checkApproachingDeadlines();
    });

    // Check for overdue objectives every day at 2:00 PM
    this.scheduleTask('overdue-check', '0 14 * * *', () => {
      this.checkOverdueObjectives();
    });

    // Weekly summary every Monday at 8:00 AM
    this.scheduleTask('weekly-summary', '0 8 * * 1', () => {
      this.sendWeeklySummary();
    });

    logger.info('📅 Scheduler service initialized with scheduled tasks');
  }

  // Schedule a task
  scheduleTask(name, cronExpression, taskFunction) {
    if (this.jobs.has(name)) {
      this.jobs.get(name).destroy();
    }

    const job = cron.schedule(cronExpression, taskFunction, {
      scheduled: false,
      timezone: 'Europe/Paris'
    });

    this.jobs.set(name, job);
    job.start();
    
    logger.info(`📅 Scheduled task '${name}' with expression: ${cronExpression}`);
  }

  // Check for objectives approaching deadlines
  async checkApproachingDeadlines() {
    try {
      logger.info('🔍 Checking for objectives approaching deadlines...');

      // Get objectives with deadlines in 1, 3, and 7 days
      const result = await query(`
        SELECT 
          o.id, o.title, o.description, o.deadline, o.progress,
          u.id as user_id, u.first_name, u.last_name, u.email,
          s.name as skill_name, s.type as skill_type,
          EXTRACT(DAYS FROM (o.deadline - CURRENT_DATE)) as days_remaining
        FROM objectives o
        INNER JOIN objective_assignments oa ON o.id = oa.objective_id
        INNER JOIN users u ON oa.user_id = u.id
        LEFT JOIN skills s ON o.skill_id = s.id
        WHERE oa.assignee_type = 'USER'
          AND o.status != 'completed'
          AND o.deadline IS NOT NULL
          AND EXTRACT(DAYS FROM (o.deadline - CURRENT_DATE)) IN (1, 3, 7)
          AND o.deadline > CURRENT_DATE
        ORDER BY o.deadline ASC
      `);

      logger.info(`📊 Found ${result.rows.length} objectives approaching deadlines`);

      for (const row of result.rows) {
        const objectiveData = {
          title: row.title,
          deadline: row.deadline,
          progress: row.progress || 0,
          daysRemaining: parseInt(row.days_remaining)
        };

        // Send reminder to employee
        await emailService.sendObjectiveDeadlineReminder(
          row.email,
          `${row.first_name} ${row.last_name}`,
          objectiveData
        );

        // Get employee's manager and send notification
        const managerResult = await query(`
          SELECT u.id, u.first_name, u.last_name, u.email
          FROM users u
          JOIN team_management_history tmh ON u.id = tmh.manager_id
          JOIN teams t ON tmh.team_id = t.id
          JOIN team_members tm ON t.id = tm.team_id
          WHERE tm.user_id = $1 AND tmh.is_active = TRUE AND u.role = 'manager'
          LIMIT 1
        `, [row.user_id]);

        if (managerResult.rows.length > 0) {
          const manager = managerResult.rows[0];
          const employeeData = {
            employeeName: `${row.first_name} ${row.last_name}`
          };

          await emailService.sendManagerNotification(
            manager.email,
            `${manager.first_name} ${manager.last_name}`,
            employeeData,
            objectiveData
          );
        }
      }

      logger.info('✅ Deadline check completed successfully');
    } catch (error) {
      logger.error(`❌ Error checking approaching deadlines: ${error.message}`);
    }
  }

  // Check for overdue objectives
  async checkOverdueObjectives() {
    try {
      logger.info('🔍 Checking for overdue objectives...');

      const result = await query(`
        SELECT 
          o.id, o.title, o.description, o.deadline, o.progress,
          u.id as user_id, u.first_name, u.last_name, u.email,
          s.name as skill_name, s.type as skill_type,
          EXTRACT(DAYS FROM (CURRENT_DATE - o.deadline)) as days_overdue
        FROM objectives o
        INNER JOIN objective_assignments oa ON o.id = oa.objective_id
        INNER JOIN users u ON oa.user_id = u.id
        LEFT JOIN skills s ON o.skill_id = s.id
        WHERE oa.assignee_type = 'USER'
          AND o.status != 'completed'
          AND o.deadline IS NOT NULL
          AND o.deadline < CURRENT_DATE
        ORDER BY o.deadline ASC
      `);

      logger.info(`📊 Found ${result.rows.length} overdue objectives`);

      for (const row of result.rows) {
        const objectiveData = {
          title: row.title,
          deadline: row.deadline,
          progress: row.progress || 0,
          daysRemaining: -parseInt(row.days_overdue) // Negative for overdue
        };

        // Send urgent reminder to employee
        await emailService.sendObjectiveDeadlineReminder(
          row.email,
          `${row.first_name} ${row.last_name}`,
          objectiveData
        );

        // Get employee's manager and send urgent notification
        const managerResult = await query(`
          SELECT u.id, u.first_name, u.last_name, u.email
          FROM users u
          JOIN team_management_history tmh ON u.id = tmh.manager_id
          JOIN teams t ON tmh.team_id = t.id
          JOIN team_members tm ON t.id = tm.team_id
          WHERE tm.user_id = $1 AND tmh.is_active = TRUE AND u.role = 'manager'
          LIMIT 1
        `, [row.user_id]);

        if (managerResult.rows.length > 0) {
          const manager = managerResult.rows[0];
          const employeeData = {
            employeeName: `${row.first_name} ${row.last_name}`
          };

          await emailService.sendManagerNotification(
            manager.email,
            `${manager.first_name} ${manager.last_name}`,
            employeeData,
            objectiveData
          );
        }
      }

      logger.info('✅ Overdue check completed successfully');
    } catch (error) {
      logger.error(`❌ Error checking overdue objectives: ${error.message}`);
    }
  }

  // Send weekly summary to managers
  async sendWeeklySummary() {
    try {
      logger.info('📊 Sending weekly summary to managers...');

      const managersResult = await query(`
        SELECT DISTINCT u.id, u.first_name, u.last_name, u.email
        FROM users u
        JOIN team_management_history tmh ON u.id = tmh.manager_id
        WHERE u.role = 'manager' AND tmh.is_active = TRUE
      `);

      for (const manager of managersResult.rows) {
        await this.sendManagerWeeklySummary(manager);
      }

      logger.info('✅ Weekly summary sent to all managers');
    } catch (error) {
      logger.error(`❌ Error sending weekly summary: ${error.message}`);
    }
  }

  // Send weekly summary to a specific manager
  async sendManagerWeeklySummary(manager) {
    try {
      // Get team statistics for this manager
      const statsResult = await query(`
        SELECT 
          COUNT(DISTINCT t.id) as total_teams,
          COUNT(DISTINCT tm.user_id) as total_members,
          COUNT(DISTINCT o.id) as total_objectives,
          COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END) as completed_objectives,
          COUNT(DISTINCT CASE WHEN o.deadline < CURRENT_DATE AND o.status != 'completed' THEN o.id END) as overdue_objectives
        FROM teams t
        JOIN team_management_history tmh ON t.id = tmh.team_id
        LEFT JOIN team_members tm ON t.id = tm.team_id
        LEFT JOIN objective_assignments oa ON tm.user_id = oa.user_id AND oa.assignee_type = 'USER'
        LEFT JOIN objectives o ON oa.objective_id = o.id
        WHERE tmh.manager_id = $1 AND tmh.is_active = TRUE
      `, [manager.id]);

      const stats = statsResult.rows[0];

      // Create weekly summary email
      const html = `
        <h2>📊 Résumé hebdomadaire - Vos équipes</h2>
        <p>Bonjour ${manager.first_name},</p>
        <p>Voici un résumé de l'activité de vos équipes cette semaine :</p>
        
        <div class="info-box">
          <strong>👥 Équipes gérées :</strong> ${stats.total_teams}<br>
          <strong>👤 Membres d'équipe :</strong> ${stats.total_members}<br>
          <strong>📋 Objectifs totaux :</strong> ${stats.total_objectives}<br>
          <strong>✅ Objectifs complétés :</strong> ${stats.completed_objectives}<br>
          <strong>⚠️ Objectifs en retard :</strong> ${stats.overdue_objectives}
        </div>
        
        <p>Continuez le bon travail !</p>
      `;

      await emailService.sendEmail({
        to: manager.email,
        subject: '📊 Résumé hebdomadaire - Smart Skill Matrix',
        html
      });

      logger.info(`Weekly summary sent to manager: ${manager.email}`);
    } catch (error) {
      logger.error(`Error sending weekly summary to ${manager.email}: ${error.message}`);
    }
  }

  // Stop all scheduled tasks
  stopAllTasks() {
    for (const [name, job] of this.jobs) {
      job.destroy();
      logger.info(`Stopped scheduled task: ${name}`);
    }
    this.jobs.clear();
  }
}

module.exports = new SchedulerService();



