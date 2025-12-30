import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getProfilePictureUrl } from '../../utils/imageUtils';
import { 
  Bars3Icon, 
  ChevronLeftIcon,
  ArrowRightOnRectangleIcon,
  SparklesIcon
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
      // Silent error handling
    }
  };

  const getRoleConfig = (role) => {
    switch (role) {
      case 'admin':
        return {
          gradient: 'from-red-500 to-rose-600',
          bg: 'bg-red-500/10',
          text: 'text-red-600',
          label: 'Administrateur',
          ring: 'ring-red-500/20'
        };
      case 'manager':
        return {
          gradient: 'from-emerald-500 to-teal-600',
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-600',
          label: 'Manager',
          ring: 'ring-emerald-500/20'
        };
      case 'employee':
        return {
          gradient: 'from-blue-500 to-indigo-600',
          bg: 'bg-blue-500/10',
          text: 'text-blue-600',
          label: 'Employé',
          ring: 'ring-blue-500/20'
        };
      default:
        return {
          gradient: 'from-gray-500 to-gray-600',
          bg: 'bg-gray-500/10',
          text: 'text-gray-600',
          label: role,
          ring: 'ring-gray-500/20'
        };
    }
  };

  const roleConfig = user ? getRoleConfig(user.role) : {};

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl">
      {/* Logo/Header Section */}
      <div className="p-4">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3">
            <div className={`relative p-2.5 rounded-xl bg-gradient-to-br ${panelColor} shadow-lg`}>
              <PanelIcon className="w-6 h-6 text-white" />
              <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 hover:opacity-100 transition-opacity" />
            </div>
            {!isCollapsed && (
              <div className="animate-fade-in">
                <h1 className="text-lg font-bold text-white tracking-tight">{panelTitle}</h1>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <SparklesIcon className="w-3 h-3" />
                  <span>Smart Skill Matrix</span>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onToggle}
            className={`p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200 ${isCollapsed ? 'mt-3' : ''}`}
          >
            {isCollapsed ? (
              <Bars3Icon className="w-5 h-5" />
            ) : (
              <ChevronLeftIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* User Profile Card */}
      {!isCollapsed && user && (
        <div className="px-4 py-3 animate-fade-in">
          <div className="relative p-4 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-sm">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-50" />
            <div className="relative flex items-center gap-3">
              <div className="relative">
                {user.profilePictureUrl ? (
                  <img
                    src={getProfilePictureUrl(user.profilePictureUrl)}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/20 shadow-lg"
                  />
                ) : (
                  <div className={`w-12 h-12 bg-gradient-to-br ${roleConfig.gradient} rounded-xl flex items-center justify-center ring-2 ring-white/20 shadow-lg`}>
                    <span className="text-white text-sm font-bold">
                      {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-800" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <div className="mt-3">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gradient-to-r ${roleConfig.gradient} text-white shadow-sm`}>
                {roleConfig.label}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed User Avatar */}
      {isCollapsed && user && (
        <div className="px-3 py-3 flex justify-center">
          <div className="relative">
            {user.profilePictureUrl ? (
              <img
                src={getProfilePictureUrl(user.profilePictureUrl)}
                alt={`${user.firstName} ${user.lastName}`}
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/20"
              />
            ) : (
              <div className={`w-10 h-10 bg-gradient-to-br ${roleConfig.gradient} rounded-xl flex items-center justify-center ring-2 ring-white/20`}>
                <span className="text-white text-xs font-bold">
                  {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                </span>
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-800" />
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
        <div className="space-y-1">
          {navigation.map((item, index) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
                title={isCollapsed ? item.name : undefined}
              >
                {/* Active indicator */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg shadow-white/50" />
                )}
                
                <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
                  active ? 'text-white' : 'text-slate-400 group-hover:text-white group-hover:scale-110'
                }`} />
                
                {!isCollapsed && (
                  <span className="font-medium text-sm truncate">{item.name}</span>
                )}

                {/* Hover effect for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-3 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 border border-slate-700">
                    {item.name}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-700" />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer/Logout Section */}
      <div className="p-3 border-t border-slate-700/50">
        <button 
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Se déconnecter' : undefined}
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
          {!isCollapsed && (
            <span className="font-medium text-sm">Se déconnecter</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default CollapsibleSidebar;
