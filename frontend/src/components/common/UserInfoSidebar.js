import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  UserIcon, 
  CogIcon, 
  CalendarIcon, 
  UserGroupIcon, 
  BuildingOfficeIcon, 
  AcademicCapIcon, 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { getProfilePictureUrl } from '../../utils/imageUtils';
import dataService from '../../services/dataService';

const UserInfoSidebar = ({ isMainSidebarCollapsed = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sidebarStats, setSidebarStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSidebarStats = async () => {
      if (user) {
        try {
          setLoading(true);
          const stats = await dataService.getSidebarStats();
          setSidebarStats(stats);
        } catch (error) {
          setSidebarStats({});
        } finally {
          setLoading(false);
        }
      }
    };

    fetchSidebarStats();
  }, [user]);

  const handleSettingsClick = () => {
    const role = user?.role;
    if (role === 'admin') {
      navigate('/admin/profile');
    } else if (role === 'manager') {
      navigate('/manager/profile');
    } else if (role === 'employee') {
      navigate('/employee/profile');
    }
  };

  const getRoleConfig = (role) => {
    switch (role) {
      case 'admin':
        return {
          gradient: 'from-red-500 to-rose-600',
          bgLight: 'bg-red-50',
          text: 'text-red-600',
          label: 'Administrateur',
          icon: '👑'
        };
      case 'manager':
        return {
          gradient: 'from-emerald-500 to-teal-600',
          bgLight: 'bg-emerald-50',
          text: 'text-emerald-600',
          label: 'Manager',
          icon: '🎯'
        };
      case 'employee':
        return {
          gradient: 'from-blue-500 to-indigo-600',
          bgLight: 'bg-blue-50',
          text: 'text-blue-600',
          label: 'Employé',
          icon: '💼'
        };
      default:
        return {
          gradient: 'from-gray-500 to-gray-600',
          bgLight: 'bg-gray-50',
          text: 'text-gray-600',
          label: role,
          icon: '👤'
        };
    }
  };

  const StatCard = ({ icon: Icon, label, value, color, bgColor }) => (
    <div className={`group relative p-4 rounded-2xl ${bgColor} border border-gray-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden`}>
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${color} bg-opacity-10`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <span className="text-sm font-medium text-gray-600">{label}</span>
        </div>
        <span className={`text-lg font-bold ${color}`}>{value}</span>
      </div>
    </div>
  );

  const LoadingSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 rounded-2xl bg-gray-50 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-200 rounded-xl" />
              <div className="h-4 w-24 bg-gray-200 rounded" />
            </div>
            <div className="h-6 w-8 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  const renderStats = () => {
    if (loading) return <LoadingSkeleton />;

    const statsConfig = {
      admin: [
        { key: 'totalUsers', label: 'Utilisateurs', icon: UserIcon, color: 'text-blue-600', bgColor: 'bg-blue-50' },
        { key: 'totalTeams', label: 'Équipes', icon: UserGroupIcon, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
        { key: 'totalDepartments', label: 'Départements', icon: BuildingOfficeIcon, color: 'text-purple-600', bgColor: 'bg-purple-50' },
        { key: 'totalSkills', label: 'Compétences', icon: AcademicCapIcon, color: 'text-amber-600', bgColor: 'bg-amber-50' },
      ],
      manager: [
        { key: 'managedTeams', label: 'Équipes gérées', icon: UserGroupIcon, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
        { key: 'memberTeams', label: 'Équipes membres', icon: UserGroupIcon, color: 'text-blue-600', bgColor: 'bg-blue-50' },
        { key: 'managedDepartments', label: 'Départements', icon: BuildingOfficeIcon, color: 'text-purple-600', bgColor: 'bg-purple-50' },
      ],
      employee: [
        { key: 'skills', label: 'Compétences', icon: AcademicCapIcon, color: 'text-blue-600', bgColor: 'bg-blue-50' },
        { key: 'teams', label: 'Équipes', icon: UserGroupIcon, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
        { key: 'departments', label: 'Départements', icon: BuildingOfficeIcon, color: 'text-purple-600', bgColor: 'bg-purple-50' },
      ],
    };

    const config = statsConfig[user?.role] || statsConfig.employee;
    const visibleStats = config.filter(stat => (sidebarStats[stat.key] || 0) > 0);

    if (visibleStats.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
            <ChartBarIcon className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">Aucune statistique disponible</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {visibleStats.map((stat) => (
          <StatCard
            key={stat.key}
            icon={stat.icon}
            label={stat.label}
            value={sidebarStats[stat.key] || 0}
            color={stat.color}
            bgColor={stat.bgColor}
          />
        ))}
      </div>
    );
  };

  if (!user) return null;

  const roleConfig = getRoleConfig(user.role);

  return (
    <div className="w-80 bg-gradient-to-b from-white to-gray-50/50 border-r border-gray-100 flex flex-col h-full">
      {/* Header with gradient overlay */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${roleConfig.gradient} opacity-5`} />
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        
        {/* Profile content */}
        <div className="relative p-6">
          <div className="text-center">
            {/* Avatar */}
            <div className="relative inline-block mb-4">
              <div className={`absolute inset-0 bg-gradient-to-br ${roleConfig.gradient} rounded-2xl blur-lg opacity-30 scale-110`} />
              {user.profilePictureUrl ? (
                <img
                  src={getProfilePictureUrl(user.profilePictureUrl)}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="relative w-24 h-24 rounded-2xl object-cover ring-4 ring-white shadow-xl"
                />
              ) : (
                <div className={`relative w-24 h-24 bg-gradient-to-br ${roleConfig.gradient} rounded-2xl flex items-center justify-center ring-4 ring-white shadow-xl`}>
                  <span className="text-white text-2xl font-bold">
                    {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                  </span>
                </div>
              )}
              {/* Online indicator */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-lg border-4 border-white flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>
            
            {/* Name and email */}
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-sm text-gray-500 mb-1">{user.email}</p>
            {user.jobTitle && (
              <p className="text-xs text-gray-400 mb-3">{user.jobTitle}</p>
            )}
            
            {/* Role badge */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r ${roleConfig.gradient} text-white shadow-lg shadow-${roleConfig.gradient.split(' ')[1]}/20`}>
              <span>{roleConfig.icon}</span>
              {roleConfig.label}
            </span>
          </div>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="px-6 py-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-amber-50">
              <CalendarIcon className="h-4 w-4 text-amber-600" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Informations du compte</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Membre depuis</span>
            <span className="font-semibold text-gray-900">
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
              }) : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="flex-1 px-6 py-2 overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-indigo-50">
            <ArrowTrendingUpIcon className="h-4 w-4 text-indigo-600" />
          </div>
          <span className="text-sm font-semibold text-gray-700">Mes statistiques</span>
        </div>
        {renderStats()}
      </div>

      {/* Settings Button */}
      <div className="p-6 pt-2">
        <button
          onClick={handleSettingsClick}
          className="w-full group flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white font-semibold transition-all duration-300 shadow-lg shadow-gray-900/20 hover:shadow-xl hover:-translate-y-0.5"
        >
          <CogIcon className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90" />
          <span>Paramètres du profil</span>
          <SparklesIcon className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
    </div>
  );
};

export default UserInfoSidebar;
