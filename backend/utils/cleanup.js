const { query } = require('../config/database');

// Cleanup old finalized skill requests (runs every hour)
const cleanupFinalizedRequests = async () => {
  try {
    console.log('🧹 Starting cleanup of finalized skill requests...');
    
    // Delete requests that were finalized more than 24 hours ago
    const result = await query(`
      DELETE FROM skill_requests 
      WHERE finalized_at IS NOT NULL 
      AND finalized_at < NOW() - INTERVAL '24 hours'
    `);
    
    if (result.rowCount > 0) {
      console.log(`✅ Cleaned up ${result.rowCount} finalized skill requests older than 24 hours`);
    } else {
      console.log('ℹ️ No finalized skill requests to clean up');
    }
  } catch (error) {
    console.error('❌ Error cleaning up finalized skill requests:', error);
  }
};

// Cleanup old dismissed skill requests (runs every hour)
const cleanupDismissedRequests = async () => {
  try {
    console.log('🧹 Starting cleanup of dismissed skill requests...');
    
    // Delete dismissed requests that were dismissed more than 24 hours ago
    const result = await query(`
      DELETE FROM skill_requests 
      WHERE is_dismissed = true 
      AND updated_at < NOW() - INTERVAL '24 hours'
    `);
    
    if (result.rowCount > 0) {
      console.log(`✅ Cleaned up ${result.rowCount} dismissed skill requests older than 24 hours`);
    } else {
      console.log('ℹ️ No dismissed skill requests to clean up');
    }
  } catch (error) {
    console.error('❌ Error cleaning up dismissed skill requests:', error);
  }
};

// Main cleanup function that runs both cleanup tasks
const runCleanup = async () => {
  console.log('🚀 Starting scheduled cleanup tasks...');
  await cleanupFinalizedRequests();
  await cleanupDismissedRequests();
  console.log('✅ Scheduled cleanup tasks completed');
};

// Export functions for manual execution
module.exports = {
  cleanupFinalizedRequests,
  cleanupDismissedRequests,
  runCleanup
};

