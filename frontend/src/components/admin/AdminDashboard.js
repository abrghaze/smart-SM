import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  UsersIcon,
  AcademicCapIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  CogIcon,
  UserCircleIcon,
  Bars3Icon,
  InformationCircleIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';
import Avatar from '../common/Avatar';
import NotificationBell from '../common/NotificationBell';
import NotificationPanel from '../common/NotificationPanel';
import UserInfoSidebar from '../common/UserInfoSidebar';
import CollapsibleSidebar from '../common/CollapsibleSidebar';
import UserManagement from './UserManagement';
import SkillManagement from './SkillManagement';
import TeamManagement from './TeamManagement';
import DepartmentManagement from './DepartmentManagement';
import AdminOverview from './AdminOverview';
import ObjectiveManagement from './ObjectiveManagement';
import SkillApprovals from './SkillApprovals';
import JobTitleManagement from './JobTitleManagement';
import JobTitleObjectives from './JobTitleObjectives';
import Profile from './Profile';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationRefreshTrigger, setNotificationRefreshTrigger] = useState(0);

  const navigation = [
    { name: 'Vue d\'ensemble', href: '/admin', icon: ChartBarIcon },
    { name: 'Mon profil', href: '/admin/profile', icon: UserCircleIcon },
    { name: 'Utilisateurs', href: '/admin/users', icon: UsersIcon },
    { name: 'Compétences', href: '/admin/skills', icon: AcademicCapIcon },
    { name: 'Équipes', href: '/admin/teams', icon: UserGroupIcon },
    { name: 'Demandes de compétences', href: '/admin/skill-approvals', icon: AcademicCapIcon },
    { name: 'Départements', href: '/admin/departments', icon: BuildingOfficeIcon },
    { name: 'Objectifs', href: '/admin/objectives', icon: InformationCircleIcon },
    { name: 'Titres de Poste', href: '/admin/job-titles', icon: BriefcaseIcon },
    { name: 'Objectifs de Titres', href: '/admin/job-title-objectives', icon: BriefcaseIcon },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNotificationClick = () => {
    setShowNotifications(true);
  };

  const handleNotificationsUpdated = () => {
    setNotificationRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Column 1: Collapsible Navigation Sidebar */}
      <div className={`${isSidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 ease-in-out fixed left-0 top-0 h-full z-50`}>
        <CollapsibleSidebar
          navigation={navigation}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          panelTitle="Admin Panel"
          panelIcon={ChartBarIcon}
          panelColor="from-red-500 to-red-600"
        />
      </div>

      {/* Column 2: User Info Sidebar */}
      <div className="hidden xl:block w-80 flex-shrink-0" style={{ marginLeft: isSidebarCollapsed ? '4rem' : '16rem' }}>
        <UserInfoSidebar />
      </div>

      {/* Column 3: Main Content Area */}
      <div className="flex-1 w-0 min-w-0" style={{ marginLeft: isSidebarCollapsed ? '4rem' : '16rem' }}>
        {/* Top navigation */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-200"
              >
                <Bars3Icon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <NotificationBell 
                onNotificationClick={handleNotificationClick} 
                refreshTrigger={notificationRefreshTrigger}
              />

              {/* User menu - Simplified for mobile/tablet */}
              <div className="flex items-center space-x-3 xl:hidden">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-500">{user?.role}</p>
                </div>
                <Avatar user={user} size="sm" />
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200"
                >
                  <CogIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6 bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<AdminOverview />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/skills" element={<SkillManagement />} />
              <Route path="/teams" element={<TeamManagement />} />
              <Route path="/departments" element={<DepartmentManagement />} />
              <Route path="/skill-approvals" element={<SkillApprovals />} />
              <Route path="/objectives" element={<ObjectiveManagement />} />
              <Route path="/job-titles" element={<JobTitleManagement />} />
              <Route path="/job-title-objectives" element={<JobTitleObjectives />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Notification Panel */}
      <NotificationPanel 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)}
        onNotificationsUpdated={handleNotificationsUpdated}
      />
    </div>
  );
};

export default AdminDashboard; 