const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');

const router = express.Router();

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    console.log(`🔍 Getting notifications for user: ${userId}`);

    const notifications = await NotificationService.getUserNotifications(
      userId, 
      parseInt(limit), 
      parseInt(offset)
    );

    const unreadCount = await NotificationService.getUnreadCount(userId);

    res.json({
      notifications,
      unreadCount,
      total: notifications.length
    });

  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log(`🔍 Marking notification ${id} as read for user: ${userId}`);

    const result = await NotificationService.markAsRead(id, userId);

    if (!result) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ 
      message: 'Notification marked as read',
      notification: result
    });

  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`🔍 Marking all notifications as read for user: ${userId}`);

    const result = await NotificationService.markAllAsRead(userId);

    res.json({ 
      message: 'All notifications marked as read',
      updatedCount: result.updated_count
    });

  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get unread count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const unreadCount = await NotificationService.getUnreadCount(userId);

    res.json({ unreadCount });

  } catch (error) {
    console.error('❌ Error getting unread count:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Trigger deadline check (for testing or manual execution)
router.post('/check-deadlines', authenticateToken, async (req, res) => {
  try {
    // Only allow admins or managers to trigger this
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied' });
    }

    console.log(`🔍 Manual deadline check triggered by user: ${req.user.id}`);

    const notificationsCreated = await NotificationService.checkObjectiveDeadlines();

    res.json({ 
      message: 'Deadline check completed',
      notificationsCreated
    });

  } catch (error) {
    console.error('❌ Error checking deadlines:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;