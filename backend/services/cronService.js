const cron = require('node-cron');
const NotificationService = require('./notificationService');

class CronService {
  static startScheduledJobs() {
    console.log('🕐 Starting scheduled jobs...');

    // Check objective deadlines every day at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
      console.log('🕐 Running daily deadline check...');
      try {
        const notificationsCreated = await NotificationService.checkObjectiveDeadlines();
        console.log(`✅ Daily deadline check completed. Created ${notificationsCreated} notifications.`);
      } catch (error) {
        console.error('❌ Error in daily deadline check:', error);
      }
    }, {
      scheduled: true,
      timezone: "Europe/Paris"
    });

    // Check objective deadlines every hour for more frequent monitoring
    cron.schedule('0 * * * *', async () => {
      console.log('🕐 Running hourly deadline check...');
      try {
        const notificationsCreated = await NotificationService.checkObjectiveDeadlines();
        if (notificationsCreated > 0) {
          console.log(`✅ Hourly deadline check completed. Created ${notificationsCreated} notifications.`);
        }
      } catch (error) {
        console.error('❌ Error in hourly deadline check:', error);
      }
    }, {
      scheduled: true,
      timezone: "Europe/Paris"
    });

    console.log('✅ Scheduled jobs started successfully');
  }

  static stopScheduledJobs() {
    console.log('🛑 Stopping scheduled jobs...');
    cron.destroy();
    console.log('✅ Scheduled jobs stopped');
  }
}

module.exports = CronService;

