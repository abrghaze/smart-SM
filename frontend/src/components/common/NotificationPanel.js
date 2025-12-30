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
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-start justify-end animate-fade-in">
      <div 
        className="bg-white shadow-2xl w-full max-w-md h-full flex flex-col animate-slide-in-right"
        style={{ maxHeight: '100vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {notifications.filter(n => !n.is_read).length} non lue(s)
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {notifications.some(n => !n.is_read) && (
              <button
                onClick={markAllAsRead}
                disabled={markingAsRead}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
              >
                {markingAsRead ? 'Marquage...' : 'Tout marquer comme lu'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-gray-500">Chargement des notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔔</span>
              </div>
              <p className="text-gray-500 font-medium">Aucune notification</p>
              <p className="text-sm text-gray-400 mt-1">Vous êtes à jour !</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map((notification, index) => (
                <div
                  key={notification.id}
                  className={`p-4 border-l-4 ${getNotificationColor(notification.type, notification.is_read)} hover:bg-white transition-all duration-200 cursor-pointer`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-lg flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className={`text-sm font-semibold ${notification.is_read ? 'text-gray-500' : 'text-gray-900'}`}>
                            {notification.title}
                          </h3>
                          <p className={`text-sm mt-1 leading-relaxed ${notification.is_read ? 'text-gray-400' : 'text-gray-600'}`}>
                            {notification.body}
                          </p>
                          <p className="text-xs text-gray-400 mt-2 flex items-center">
                            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full mr-1.5"></span>
                            {formatDate(notification.created_at)}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="ml-2 p-2 hover:bg-blue-50 rounded-xl transition-colors group"
                            title="Marquer comme lu"
                          >
                            <CheckIcon className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;

