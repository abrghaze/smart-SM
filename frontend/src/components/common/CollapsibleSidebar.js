import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getProfilePictureUrl } from '../../utils/imageUtils';
import { 
  Bars3Icon, 
  XMarkIcon,
  ShieldCheckIcon,
  CogIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

const CollapsibleSidebar = ({ 
  navigation, 
  isCollapsed, 
  onToggle, 
  panelTitle, 
  panelIcon: PanelIcon,
  panelColor 
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/admin' || path === '/manager' || path === '/employee') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-gradient-to-r from-red-500 to-red-600';
      case 'manager':
        return 'bg-gradient-to-r from-emerald-500 to-emerald-600';
      case 'employee':
        return 'bg-gradient-to-r from-blue-500 to-blue-600';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrateur';
      case 'manager':
        return 'Manager';
      case 'employee':
        return 'Employé';
      default:
        return role;
    }
  };

  return (
    <div className="bg-white h-full w-full border-r border-gray-200 shadow-sm">
      {/* Clean Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center">
          <div className={`${panelColor} rounded-lg p-2.5 shadow-sm`}>
            <PanelIcon className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <span className="ml-3 text-lg font-semibold text-gray-900">{panelTitle}</span>
          )}
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-200"
        >
          {isCollapsed ? (
            <Bars3Icon className="w-5 h-5" />
          ) : (
            <XMarkIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* User Profile Section */}
      {!isCollapsed && user && (
        <div className="px-4 py-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="relative">
              {user.profilePictureUrl ? (
                <img
                  src={getProfilePictureUrl(user.profilePictureUrl)}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center border-2 border-gray-200">
                  <span className="text-white text-sm font-semibold">
                    {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${getRoleColor(user.role)}`}>
                <ShieldCheckIcon className="h-3 w-3 mr-1" />
                {getRoleLabel(user.role)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                isActive(item.href)
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className={`transition-colors duration-200 ${
                isActive(item.href) 
                  ? 'text-blue-600' 
                  : 'text-gray-400 group-hover:text-gray-600'
              } ${isCollapsed ? 'w-5 h-5' : 'w-5 h-5 mr-3'}`} />
              {!isCollapsed && (
                <span className="font-medium">{item.name}</span>
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* Account Info Section */}
      {!isCollapsed && user && (
        <div className="px-3 pb-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <h3 className="text-xs font-semibold text-gray-700 mb-3 flex items-center uppercase tracking-wide">
              <CalendarIcon className="h-3 w-3 mr-2 text-gray-500" />
              Informations du compte
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Membre depuis:</span>
                <span className="font-medium text-gray-900">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Button */}
      {!isCollapsed && (
        <div className="px-3 pb-4">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-3 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200 border border-gray-200 hover:border-gray-300"
          >
            <CogIcon className="w-4 h-4 mr-2" />
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
};

export default CollapsibleSidebar;
