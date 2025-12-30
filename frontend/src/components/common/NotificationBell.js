import React, { useState, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid';
import dataService from '../../services/dataService';

const NotificationBell = ({ onNotificationClick, refreshTrigger }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watch for refresh trigger from parent component
  useEffect(() => {
    if (refreshTrigger) {
      fetchUnreadCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const fetchUnreadCount = async () => {
    try {
      const response = await dataService.getUnreadNotificationCount();
      const newCount = response.unreadCount || 0;
      
      // Animate if count increased
      if (newCount > unreadCount) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 500);
      }
      
      setUnreadCount(newCount);
    } catch (error) {
      // Silent fail for notification count
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
      className={`relative p-2.5 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        unreadCount > 0 
          ? 'bg-red-50 text-red-600 hover:bg-red-100' 
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      } ${isAnimating ? 'animate-bounce' : ''}`}
    >
      {unreadCount > 0 ? (
        <BellIconSolid className="h-5 w-5" />
      ) : (
        <BellIcon className="h-5 w-5" />
      )}
      
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg shadow-red-500/30 animate-pulse">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;