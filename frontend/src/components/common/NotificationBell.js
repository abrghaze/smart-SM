import React, { useState, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid';
import dataService from '../../services/dataService';

const NotificationBell = ({ onNotificationClick, refreshTrigger }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Watch for refresh trigger from parent component
  useEffect(() => {
    if (refreshTrigger) {
      fetchUnreadCount();
    }
  }, [refreshTrigger]);

  const fetchUnreadCount = async () => {
    try {
      const response = await dataService.getUnreadNotificationCount();
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleClick = () => {
    if (onNotificationClick) {
      onNotificationClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full transition-colors"
      disabled={loading}
    >
      {unreadCount > 0 ? (
        <BellIconSolid className="h-6 w-6 text-red-500" />
      ) : (
        <BellIcon className="h-6 w-6" />
      )}
      
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;