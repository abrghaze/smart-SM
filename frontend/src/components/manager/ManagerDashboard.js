import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ChartBarIcon,
  UserCircleIcon,
  AcademicCapIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  FlagIcon,
  Bars3Icon,
  CogIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';
import NotificationBell from '../common/NotificationBell';
import NotificationPanel from '../common/NotificationPanel';
import Avatar from '../common/Avatar';
import UserInfoSidebar from '../common/UserInfoSidebar';
import CollapsibleSidebar from '../common/CollapsibleSidebar';
import ManagerOverview from './ManagerOverview';
import Profile from './Profile';
import ManagerSkills from './ManagerSkills';
import TeamManagement from './TeamManagement';
import MyDepartments from './MyDepartments';
import TargetManagement from './TargetManagement';
import JobTitleTargets from './JobTitleTargets';
import Requests from './Requests';

const ManagerDashboard = () => {
  const { user, logout } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationRefreshTrigger, setNotificationRefreshTrigger] = useState(0);

  const navigation = [
    { name: 'Vue d\'ensemble', href: '/manager', icon: ChartBarIcon },
    { name: 'Mon profil', href: '/manager/profile', icon: UserCircleIcon },
    { name: 'Mes compétences', href: '/manager/skills', icon: AcademicCapIcon },
    { name: 'Mes équipes', href: '/manager/teams', icon: UserGroupIcon },
    { name: 'Mes départements', href: '/manager/departments', icon: BuildingOfficeIcon },
    { name: 'Objectifs', href: '/manager/targets', icon: FlagIcon },
    { name: 'Objectifs de Titres', href: '/manager/job-title-targets', icon: BriefcaseIcon },
    { name: 'Demandes', href: '/manager/requests', icon: AcademicCapIcon },
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
          panelTitle="Manager Panel"
          panelIcon={UserGroupIcon}
          panelColor="from-green-600 to-emerald-600"
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
              <Route path="/" element={<ManagerOverview />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/skills" element={<ManagerSkills />} />
              <Route path="/teams" element={<TeamManagement />} />
              <Route path="/departments" element={<MyDepartments />} />
              <Route path="/targets" element={<TargetManagement />} />
              <Route path="/job-title-targets" element={<JobTitleTargets />} />
              <Route path="/requests" element={<Requests />} />
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

export default ManagerDashboard; 