import React from 'react';
import Avatar from './Avatar';

const ClickableUser = ({ user, onClick, showAvatar = true, showName = true, size = "sm", className = "", showMeBadge = false, currentUserId = null }) => {
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick && user) {
      onClick(user.id);
    }
  };

  if (!user) return null;

  return (
    <button
      onClick={handleClick}
      className={`flex items-center space-x-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors cursor-pointer ${className}`}
      title={`Voir le profil de ${user.firstName} ${user.lastName}`}
    >
      {showAvatar && (
        <Avatar user={user} size={size} />
      )}
      {showName && (
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
            {user.firstName} {user.lastName}
          </span>
          {showMeBadge && currentUserId && user.id === currentUserId && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              (Moi)
            </span>
          )}
        </div>
      )}
    </button>
  );
};

export default ClickableUser;
