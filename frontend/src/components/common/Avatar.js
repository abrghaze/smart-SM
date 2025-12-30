import React from 'react';
import { getProfilePictureUrl, getInitials } from '../../utils/imageUtils';

const Avatar = ({ size = 32, user, className = '', showStatus = false, status = 'online' }) => {
  let dimension;
  let fontSize;
  
  if (typeof size === 'number') {
    dimension = `${size}px`;
    fontSize = `${Math.max(size / 2.5, 10)}px`;
  } else if (size === 'xs') {
    dimension = '24px';
    fontSize = '10px';
  } else if (size === 'sm') {
    dimension = '32px';
    fontSize = '12px';
  } else if (size === 'md') {
    dimension = '40px';
    fontSize = '14px';
  } else if (size === 'lg') {
    dimension = '48px';
    fontSize = '16px';
  } else if (size === 'xl') {
    dimension = '64px';
    fontSize = '20px';
  } else if (size === '2xl') {
    dimension = '80px';
    fontSize = '24px';
  } else {
    dimension = size;
    fontSize = '14px';
  }
  
  const style = { width: dimension, height: dimension };
  const [imageError, setImageError] = React.useState(false);

  const getStatusColor = () => {
    switch (status) {
      case 'online': return 'bg-emerald-500';
      case 'away': return 'bg-amber-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getGradient = () => {
    const name = `${user?.firstName || ''}${user?.lastName || ''}`;
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradients = [
      'from-blue-500 to-indigo-600',
      'from-purple-500 to-pink-600',
      'from-emerald-500 to-teal-600',
      'from-orange-500 to-red-600',
      'from-cyan-500 to-blue-600',
      'from-rose-500 to-purple-600',
      'from-amber-500 to-orange-600',
      'from-green-500 to-emerald-600',
    ];
    return gradients[hash % gradients.length];
  };

  const renderAvatar = () => {
    if (user?.profilePictureUrl && !imageError) {
      const fullUrl = getProfilePictureUrl(user.profilePictureUrl);
      return (
        <img
          src={fullUrl}
          alt={`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'}
          className={`rounded-full object-cover ring-2 ring-white shadow-sm ${className}`}
          style={style}
          onError={() => setImageError(true)}
        />
      );
    }

    return (
      <div
        className={`rounded-full bg-gradient-to-br ${getGradient()} text-white flex items-center justify-center font-semibold ring-2 ring-white shadow-sm ${className}`}
        style={{ ...style, fontSize }}
      >
        {getInitials(user?.firstName, user?.lastName)}
      </div>
    );
  };

  if (showStatus) {
    return (
      <div className="relative inline-block">
        {renderAvatar()}
        <span 
          className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor()} rounded-full ring-2 ring-white`}
        ></span>
      </div>
    );
  }

  return renderAvatar();
};

export default Avatar;


