import React, { useState, useEffect } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';

const NotificationPanel = ({ isOpen, onClose, onNotificationsUpdated }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await dataService.getNotifications();
      setNotifications(response.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await dataService.markNotificationAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        )
      );
      
      // Notify parent component to refresh unread count
      if (onNotificationsUpdated) {
        onNotificationsUpdated();
      }
      
      toast.success('Notification marquée comme lue');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Erreur lors de la mise à jour de la notification');
    }
  };

  const markAllAsRead = async () => {
    try {
      setMarkingAsRead(true);
      await dataService.markAllNotificationsAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({
          ...notification,
          is_read: true,
          read_at: new Date().toISOString()
        }))
      );
      
      // Notify parent component to refresh unread count
      if (onNotificationsUpdated) {
        onNotificationsUpdated();
      }
      
      toast.success('Toutes les notifications ont été marquées comme lues');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Erreur lors de la mise à jour des notifications');
    } finally {
      setMarkingAsRead(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'deadline_overdue':
        return '🚨';
      case 'progress_warning':
        return '⚠️';
      case 'objective_assigned':
        return '📋';
      case 'progress_update_pending':
        return '📝';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type, isRead) => {
    if (isRead) return 'bg-gray-50';
    
    switch (type) {
      case 'deadline_overdue':
        return 'bg-red-50 border-l-red-500';
      case 'progress_warning':
        return 'bg-yellow-50 border-l-yellow-500';
      case 'objective_assigned':
        return 'bg-blue-50 border-l-blue-500';
      case 'progress_update_pending':
        return 'bg-purple-50 border-l-purple-500';
      default:
        return 'bg-gray-50 border-l-gray-500';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInSeconds < 60) {
      return 'À l\'instant';
    } else if (diffInMinutes < 60) {
      return `Il y a ${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `Il y a ${diffInHours}h`;
    } else if (diffInDays < 7) {
      return `Il y a ${diffInDays}j`;
    } else {
      // Show actual date for older notifications
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          <div className="flex items-center space-x-2">
            {notifications.some(n => !n.is_read) && (
              <button
                onClick={markAllAsRead}
                disabled={markingAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {markingAsRead ? 'Marquage...' : 'Tout marquer comme lu'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              Chargement des notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Aucune notification
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-l-4 ${getNotificationColor(notification.type, notification.is_read)} hover:bg-gray-50 transition-colors`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-lg">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className={`text-sm font-medium ${notification.is_read ? 'text-gray-600' : 'text-gray-900'}`}>
                            {notification.title}
                          </h3>
                          <p className={`text-sm mt-1 ${notification.is_read ? 'text-gray-500' : 'text-gray-700'}`}>
                            {notification.body}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {formatDate(notification.created_at)}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="ml-2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                            title="Marquer comme lu"
                          >
                            <CheckIcon className="h-4 w-4 text-gray-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;

