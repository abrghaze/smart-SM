import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ChartBarIcon,
  UserIcon,
  AcademicCapIcon,
  FlagIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  Bars3Icon,
  BriefcaseIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import NotificationBell from '../common/NotificationBell';
import NotificationPanel from '../common/NotificationPanel';
import UserInfoSidebar from '../common/UserInfoSidebar';
import CollapsibleSidebar from '../common/CollapsibleSidebar';
import EmployeeOverview from './EmployeeOverview';
import Profile from './Profile';
import Skills from './Skills';
import SkillDetails from './SkillDetails';
import Requests from './Requests';
import Targets from './Targets';
import JobTitleProgress from './JobTitleProgress';
import MyDepartments from './MyDepartments';
import MyTeams from './MyTeams';
import { getProfilePictureUrl } from '../../utils/imageUtils';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationRefreshTrigger, setNotificationRefreshTrigger] = useState(0);

  const navigation = [
    { name: 'Vue d\'ensemble', href: '/employee', icon: ChartBarIcon },
    { name: 'Mon profil', href: '/employee/profile', icon: UserIcon },
    { name: 'Mes compétences', href: '/employee/skills', icon: AcademicCapIcon },
    { name: 'Mes demandes', href: '/employee/requests', icon: FlagIcon },
    { name: 'Mes objectifs', href: '/employee/targets', icon: FlagIcon },
    { name: 'Objectifs de Titres', href: '/employee/job-title-progress', icon: BriefcaseIcon },
    { name: 'Mes départements', href: '/employee/departments', icon: BuildingOfficeIcon },
    { name: 'Mes équipes', href: '/employee/teams', icon: UserGroupIcon },
  ];

  const handleNotificationClick = () => {
    setShowNotifications(true);
  };

  const handleNotificationsUpdated = () => {
    setNotificationRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div className={`${isSidebarCollapsed ? 'w-20' : 'w-72'} transition-all duration-300 ease-in-out fixed left-0 top-0 h-full z-50`}>
        <CollapsibleSidebar
          navigation={navigation}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          panelTitle="Employee Panel"
          panelIcon={UserIcon}
          panelColor="from-blue-500 to-indigo-600"
        />
      </div>

      {/* User Info Sidebar - Hidden on smaller screens */}
      <div 
        className="hidden xl:block w-80 flex-shrink-0 fixed h-full z-40 transition-all duration-300" 
        style={{ left: isSidebarCollapsed ? '5rem' : '18rem' }}
      >
        <UserInfoSidebar />
      </div>

      {/* Main Content Area */}
      <div 
        className="flex-1 min-h-screen transition-all duration-300"
        style={{ marginLeft: isSidebarCollapsed ? '5rem' : '18rem' }}
      >
        {/* Modern Top Header */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-gray-100">
          <div className="flex items-center justify-between h-16 px-6 xl:pl-[21rem]">
            {/* Left side - Toggle & Search */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 xl:hidden"
              >
                <Bars3Icon className="w-5 h-5" />
              </button>
              
              {/* Search bar */}
              <div className="hidden md:flex items-center">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    className="w-64 pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Right side - Actions & User */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <NotificationBell 
                onNotificationClick={handleNotificationClick} 
                refreshTrigger={notificationRefreshTrigger}
              />

              {/* User Menu (visible on smaller screens) */}
              <div className="flex items-center gap-3 xl:hidden">
                <div className="h-8 w-px bg-gray-200" />
                <div className="flex items-center gap-3">
                  {user?.profilePictureUrl ? (
                    <img
                      src={getProfilePictureUrl(user.profilePictureUrl)}
                      alt={`${user?.firstName} ${user?.lastName}`}
                      className="w-9 h-9 rounded-xl object-cover ring-2 ring-gray-100"
                    />
                  ) : (
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center ring-2 ring-gray-100">
                      <span className="text-white text-xs font-bold">
                        {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-gray-500">Employé</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 xl:pl-[21rem]">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Routes>
              <Route path="/" element={<EmployeeOverview />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/skills" element={<Skills />} />
              <Route path="/skills/:skillId" element={<SkillDetails />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/targets" element={<Targets />} />
              <Route path="/job-title-progress" element={<JobTitleProgress />} />
              <Route path="/departments" element={<MyDepartments />} />
              <Route path="/teams" element={<MyTeams />} />
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

export default EmployeeDashboard;
