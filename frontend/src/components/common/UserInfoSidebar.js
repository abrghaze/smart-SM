import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UserIcon, CogIcon, CalendarIcon, UserGroupIcon, BuildingOfficeIcon, AcademicCapIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { getProfilePictureUrl } from '../../utils/imageUtils';
import dataService from '../../services/dataService';

const UserInfoSidebar = ({ isMainSidebarCollapsed = false }) => {
  const { user, logout } = useAuth();
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
          console.error('Error fetching sidebar stats:', error);
          setSidebarStats({});
        } finally {
          setLoading(false);
        }
      }
    };

    fetchSidebarStats();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

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

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'manager':
        return 'bg-green-100 text-green-800';
      case 'employee':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const renderEmployeeStats = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      );
    }

    const { skills = 0, teams = 0, departments = 0 } = sidebarStats;
    
    // Only show sections that have non-zero counts
    const sections = [];
    
    if (skills > 0) {
      sections.push(
        <div key="skills" className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
          <div className="flex items-center">
            <AcademicCapIcon className="h-4 w-4 text-blue-600 mr-2" />
            <span className="text-sm text-gray-600">Compétences</span>
          </div>
          <span className="text-sm font-medium text-gray-900 bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{skills}</span>
        </div>
      );
    }
    
    if (teams > 0) {
      sections.push(
        <div key="teams" className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
          <div className="flex items-center">
            <UserGroupIcon className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-sm text-gray-600">Équipes</span>
          </div>
          <span className="text-sm font-medium text-gray-900 bg-green-100 text-green-800 px-2 py-1 rounded-full">{teams}</span>
        </div>
      );
    }
    
    if (departments > 0) {
      sections.push(
        <div key="departments" className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
          <div className="flex items-center">
            <BuildingOfficeIcon className="h-4 w-4 text-purple-600 mr-2" />
            <span className="text-sm text-gray-600">Départements</span>
          </div>
          <span className="text-sm font-medium text-gray-900 bg-purple-100 text-purple-800 px-2 py-1 rounded-full">{departments}</span>
        </div>
      );
    }

    if (sections.length === 0) {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">Aucune statistique disponible</p>
        </div>
      );
    }

    return <div className="space-y-3">{sections}</div>;
  };

  const renderManagerStats = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      );
    }

    const { managedTeams = 0, memberTeams = 0, managedDepartments = 0 } = sidebarStats;
    
    // Only show sections that have non-zero counts
    const sections = [];
    
    if (managedTeams > 0) {
      sections.push(
        <div key="managedTeams" className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
          <div className="flex items-center">
            <UserGroupIcon className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-sm text-gray-600">Équipes gérées</span>
          </div>
          <span className="text-sm font-medium text-gray-900 bg-green-100 text-green-800 px-2 py-1 rounded-full">{managedTeams}</span>
        </div>
      );
    }
    
    if (memberTeams > 0) {
      sections.push(
        <div key="memberTeams" className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
          <div className="flex items-center">
            <UserGroupIcon className="h-4 w-4 text-blue-600 mr-2" />
            <span className="text-sm text-gray-600">Équipes membres</span>
          </div>
          <span className="text-sm font-medium text-gray-900 bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{memberTeams}</span>
        </div>
      );
    }
    
    if (managedDepartments > 0) {
      sections.push(
        <div key="managedDepartments" className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
          <div className="flex items-center">
            <BuildingOfficeIcon className="h-4 w-4 text-purple-600 mr-2" />
            <span className="text-sm text-gray-600">Départements gérés</span>
          </div>
          <span className="text-sm font-medium text-gray-900 bg-purple-100 text-purple-800 px-2 py-1 rounded-full">{managedDepartments}</span>
        </div>
      );
    }

    if (sections.length === 0) {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">Aucune statistique disponible</p>
        </div>
      );
    }

    return <div className="space-y-3">{sections}</div>;
  };

  const renderAdminStats = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      );
    }

    const { totalUsers = 0, totalTeams = 0, totalDepartments = 0, totalSkills = 0 } = sidebarStats;
    
    // Only show sections that have non-zero counts
    const sections = [];
    
    if (totalUsers > 0) {
      sections.push(
        <div key="totalUsers" className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
          <div className="flex items-center">
            <UserIcon className="h-4 w-4 text-blue-600 mr-2" />
            <span className="text-sm text-gray-600">Utilisateurs</span>
          </div>
          <span className="text-sm font-medium text-gray-900 bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{totalUsers}</span>
        </div>
      );
    }
    
    if (totalTeams > 0) {
      sections.push(
        <div key="totalTeams" className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
          <div className="flex items-center">
            <UserGroupIcon className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-sm text-gray-600">Équipes</span>
          </div>
          <span className="text-sm font-medium text-gray-900 bg-green-100 text-green-800 px-2 py-1 rounded-full">{totalTeams}</span>
        </div>
      );
    }
    
    if (totalDepartments > 0) {
      sections.push(
        <div key="totalDepartments" className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
          <div className="flex items-center">
            <BuildingOfficeIcon className="h-4 w-4 text-purple-600 mr-2" />
            <span className="text-sm text-gray-600">Départements</span>
          </div>
          <span className="text-sm font-medium text-gray-900 bg-purple-100 text-purple-800 px-2 py-1 rounded-full">{totalDepartments}</span>
        </div>
      );
    }

    if (totalSkills > 0) {
      sections.push(
        <div key="totalSkills" className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
          <div className="flex items-center">
            <AcademicCapIcon className="h-4 w-4 text-orange-600 mr-2" />
            <span className="text-sm text-gray-600">Compétences</span>
          </div>
          <span className="text-sm font-medium text-gray-900 bg-orange-100 text-orange-800 px-2 py-1 rounded-full">{totalSkills}</span>
        </div>
      );
    }

    if (sections.length === 0) {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">Aucune statistique disponible</p>
        </div>
      );
    }

    return <div className="space-y-3">{sections}</div>;
  };

  if (!user) {
    return null;
  }

  // Hide profile sidebar when main sidebar is expanded (on smaller screens)
  if (isMainSidebarCollapsed && window.innerWidth < 1280) {
    return null;
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full shadow-lg">
      {/* User Profile Section */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="relative inline-block mb-4">
            {user.profilePictureUrl ? (
              <img
                src={getProfilePictureUrl(user.profilePictureUrl)}
                alt={`${user.firstName} ${user.lastName}`}
                className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-gray-100 shadow-sm"
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto border-4 border-gray-100 shadow-sm">
                <UserIcon className="w-12 h-12 text-white" />
              </div>
            )}
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            {user.firstName} {user.lastName}
          </h2>
          <p className="text-gray-600 mb-2">{user.email}</p>
          {user.jobTitle && (
            <p className="text-sm text-gray-500 mb-3">{user.jobTitle}</p>
          )}
          
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}>
            {getRoleLabel(user.role)}
          </span>
        </div>
      </div>

      {/* Account Information */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
          <CalendarIcon className="h-4 w-4 mr-2 text-orange-600" />
          Informations du compte
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
            <span className="text-sm text-gray-600">Membre depuis:</span>
            <span className="text-sm font-bold text-gray-900">
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* User Statistics */}
      <div className="p-6 flex-1">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
          <ChartBarIcon className="h-4 w-4 mr-2 text-blue-600" />
          Mes statistiques
        </h3>
        <div className="space-y-4">
          {user.role === 'admin' && renderAdminStats()}
          {user.role === 'manager' && renderManagerStats()}
          {user.role === 'employee' && renderEmployeeStats()}
        </div>
      </div>

      {/* Settings Button */}
      <div className="p-6 border-t border-gray-200">
        <button
          onClick={handleSettingsClick}
          className="w-full flex items-center justify-center px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-md"
        >
          <CogIcon className="h-4 w-4 mr-2" />
          Paramètres
        </button>
      </div>
    </div>
  );
};

export default UserInfoSidebar;
