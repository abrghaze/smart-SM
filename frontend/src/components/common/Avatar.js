import React from 'react';
import { getProfilePictureUrl, getInitials } from '../../utils/imageUtils';

const Avatar = ({ size = 32, user, className = '' }) => {
  let dimension;
  if (typeof size === 'number') {
    dimension = `${size}px`;
  } else if (size === 'sm') {
    dimension = '32px';
  } else if (size === 'md') {
    dimension = '40px';
  } else if (size === 'lg') {
    dimension = '48px';
  } else if (size === 'xl') {
    dimension = '64px';
  } else {
    dimension = size;
  }
  
  const style = { width: dimension, height: dimension };
  const [imageError, setImageError] = React.useState(false);

  if (user?.profilePictureUrl && !imageError) {
    const fullUrl = getProfilePictureUrl(user.profilePictureUrl);
    return (
      <img
        src={fullUrl}
        alt={`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'}
        className={`rounded-full object-cover ${className}`}
        style={style}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-r from-primary-600 to-primary-800 text-white flex items-center justify-center font-semibold ${className}`}
      style={style}
    >
      {getInitials(user?.firstName, user?.lastName)}
    </div>
  );
};

export default Avatar;


