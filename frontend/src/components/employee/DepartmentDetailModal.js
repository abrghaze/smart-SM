import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import {
  XMarkIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import Avatar from '../common/Avatar';
import UserProfileModal from '../common/UserProfileModal';

const DepartmentDetailModal = ({ department, isOpen, onClose }) => {
  const { user } = useAuth();
  const [departmentData, setDepartmentData] = useState(null);
  const [departmentEmployees, setDepartmentEmployees] = useState([]);
  const [departmentTeams, setDepartmentTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [expandedTeamId, setExpandedTeamId] = useState(null);

  const loadDepartmentData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading department data for:', department.id);
      
      // Get fresh department details with all relationships
      const departmentDetails = await dataService.getDepartmentById(department.id);
      
      // Store the complete department data
      setDepartmentData(departmentDetails);
      
      // Extract teams and employees from department details
      const teamsData = departmentDetails.teams || [];
      const employeesData = departmentDetails.employees || [];
      
      setDepartmentTeams(teamsData);
      setDepartmentEmployees(employeesData);
      
      console.log('✅ Department detail data loaded:', {
        departmentId: department.id,
        teams: teamsData.length,
        employees: employeesData.length,
        manager: departmentDetails.manager ? 'Present' : 'None'
      });
    } catch (error) {
      console.error('❌ Error loading department detail data:', error);
      toast.error('Erreur lors du chargement des données du département');
    } finally {
      setLoading(false);
    }
  }, [department?.id]);

  useEffect(() => {
    if (isOpen && department) {
      loadDepartmentData();
    }
  }, [isOpen, department, loadDepartmentData]);

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setShowUserProfileModal(true);
  };

  const handleTeamClick = (team) => {
    // Toggle team expansion for drill-down functionality
    if (expandedTeamId === team.id) {
      setExpandedTeamId(null);
    } else {
      setExpandedTeamId(team.id);
    }
  };

  const handleUserProfileClose = () => {
    setShowUserProfileModal(false);
    setSelectedUser(null);
  };

  if (!isOpen || !department) return null;

  return (
    <>
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
        <div className="relative top-10 mx-auto p-8 border-0 w-11/12 max-w-4xl shadow-2xl rounded-3xl bg-white">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl">
                <BuildingOfficeIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {department.name}
                </h2>
                <p className="text-gray-600 mt-1 text-lg">
                  {department.description || 'Aucune description'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
            >
              <XMarkIcon className="h-6 w-6 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-8">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="text-gray-500">Chargement des données...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Department Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                        <UsersIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-600">Membres</p>
                        <p className="text-2xl font-bold text-green-900">{departmentEmployees.length}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                        <UserGroupIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-600">Équipes</p>
                        <p className="text-2xl font-bold text-blue-900">{departmentTeams.length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Department Manager Section - REMOVED */}

                {/* Two-Column Layout: Teams and Colleagues */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Teams Column */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mr-3">
                        <UserGroupIcon className="h-5 w-5 text-white" />
                      </div>
                      Équipes du département ({departmentTeams.length})
                    </h3>
                    
                    {departmentTeams.length === 0 ? (
                      <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
                        <div className="p-4 bg-gray-200 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <UserGroupIcon className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-lg">Aucune équipe dans ce département</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {departmentTeams
                          .sort((a, b) => {
                            // Put user's own teams first
                            const userTeams = user?.teams || [];
                            const aIsUserTeam = userTeams.some(userTeam => userTeam.id === a.id);
                            const bIsUserTeam = userTeams.some(userTeam => userTeam.id === b.id);
                            
                            if (aIsUserTeam && !bIsUserTeam) return -1;
                            if (!aIsUserTeam && bIsUserTeam) return 1;
                            
                            // Then sort alphabetically by name
                            return a.name.localeCompare(b.name);
                          })
                          .map((team) => {
                            const isUserTeam = user?.teams?.some(userTeam => userTeam.id === team.id);
                            
                            return (
                              <div 
                                key={team.id} 
                                className={`bg-white rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer ${
                                  isUserTeam 
                                    ? 'border-green-200 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50' 
                                    : 'border-gray-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50'
                                }`}
                                onClick={() => handleTeamClick(team)}
                              >
                                <div className="p-6">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                      <div className={`p-2 rounded-xl ${
                                        isUserTeam 
                                          ? 'bg-gradient-to-br from-green-500 to-green-600' 
                                          : 'bg-gradient-to-br from-blue-500 to-blue-600'
                                      }`}>
                                        <UserGroupIcon className="h-5 w-5 text-white" />
                                      </div>
                                      <h6 className={`font-bold text-lg ${
                                        isUserTeam ? 'text-green-900' : 'text-gray-900'
                                      }`}>
                                        {team.name}
                                      </h6>
                                      {isUserTeam && (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-400 to-green-600 text-white">
                                          Mon équipe
                                        </span>
                                      )}
                                    </div>
                                    <span className={`text-sm font-medium ${
                                      isUserTeam ? 'text-green-600' : 'text-gray-600'
                                    }`}>
                                      {team.membersCount || 0} membre(s)
                                    </span>
                                  </div>
                                  
                                  {team.description && (
                                    <p className={`text-gray-600 mb-4 leading-relaxed ${
                                      isUserTeam ? 'text-green-700' : 'text-gray-700'
                                    }`}>
                                      {team.description}
                                    </p>
                                  )}
                                  
                                  {team.manager && (
                                    <div className="mb-3">
                                      <p className={`text-xs mb-1 ${
                                        isUserTeam ? 'text-green-600' : 'text-gray-600'
                                      }`}>
                                        Manager:
                                      </p>
                                      <div 
                                        className={`flex items-center space-x-2 cursor-pointer p-2 rounded transition-colors ${
                                          isUserTeam ? 'hover:bg-green-200' : 'hover:bg-gray-200'
                                        }`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUserClick(team.manager);
                                        }}
                                      >
                                        <Avatar
                                          user={team.manager}
                                          size="sm"
                                        />
                                        <span className={`text-sm font-medium ${
                                          isUserTeam ? 'text-green-900 hover:text-green-700' : 'text-gray-900 hover:text-gray-700'
                                        }`}>
                                          {team.manager.firstName} {team.manager.lastName}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Expanded Team Members Section */}
                                  {expandedTeamId === team.id && team.members && team.members.length > 0 && (
                                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                                      <h6 className="font-medium text-gray-900 mb-3 flex items-center">
                                        <UsersIcon className="h-4 w-4 mr-2" />
                                        Membres de l'équipe ({team.members.length})
                                      </h6>
                                      <div className="space-y-2">
                                        {team.members
                                          .sort((a, b) => {
                                            // Put current user first
                                            if (a.id === user?.id) return -1;
                                            if (b.id === user?.id) return 1;
                                            // Then sort alphabetically by name
                                            const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
                                            const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
                                            return nameA.localeCompare(nameB);
                                          })
                                          .map((member) => (
                                            <div
                                              key={member.id}
                                              className="flex items-center justify-between p-2 bg-white rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleUserClick(member);
                                              }}
                                            >
                                              <div className="flex items-center space-x-3">
                                                <Avatar
                                                  user={member}
                                                  size="sm"
                                                />
                                                <div>
                                                  <div className="flex items-center space-x-2">
                                                    <p className="font-medium text-gray-900">
                                                      {member.firstName} {member.lastName}
                                                    </p>
                                                    {member.id === user?.id && (
                                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        (Moi)
                                                      </span>
                                                    )}
                                                  </div>
                                                  <p className="text-sm text-gray-500">{member.email}</p>
                                                  <p className="text-xs text-gray-400">
                                                    {member.jobTitle} • {member.role}
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="flex items-center space-x-2">
                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                  member.status === 'active' 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-red-100 text-red-800'
                                                }`}>
                                                  {member.status === 'active' ? 'Actif' : 'Inactif'}
                                                </span>
                                              </div>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Colleagues Column */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                      <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-xl mr-3">
                        <UsersIcon className="h-5 w-5 text-white" />
                      </div>
                      Membres du département ({departmentEmployees.length})
                    </h3>
                    
                    {departmentEmployees.length === 0 ? (
                      <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
                        <div className="p-4 bg-gray-200 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <UsersIcon className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-lg">Aucun employé dans ce département</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {departmentEmployees
                          .sort((a, b) => {
                            // Put current user first
                            if (a.id === user?.id) return -1;
                            if (b.id === user?.id) return 1;
                            // Then sort alphabetically by name
                            const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
                            const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
                            return nameA.localeCompare(nameB);
                          })
                          .map((employee) => (
                          <div
                            key={employee.id}
                            className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 p-6 cursor-pointer"
                            onClick={() => handleUserClick(employee)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <Avatar
                                  user={employee}
                                  size="lg"
                                />
                                <div>
                                  <div className="flex items-center space-x-3 mb-2">
                                    <h4 className="font-bold text-gray-900 text-lg">
                                      {employee.firstName} {employee.lastName}
                                    </h4>
                                    {employee.id === user?.id && (
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-400 to-blue-600 text-white">
                                        Moi
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-gray-600 mb-1">{employee.email}</p>
                                  <p className="text-sm text-gray-500">
                                    {employee.jobTitle} • {employee.role}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                                  employee.status === 'active' 
                                    ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800' 
                                    : 'bg-gradient-to-r from-red-100 to-red-200 text-red-800'
                                }`}>
                                  {employee.status === 'active' ? 'Actif' : 'Inactif'}
                                </span>
                                {employee.teamName && (
                                  <span className="text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full font-medium">
                                    {employee.teamName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        userId={selectedUser?.id}
        isOpen={showUserProfileModal}
        onClose={handleUserProfileClose}
        currentUserJobTitles={user?.currentJobTitles || []}
      />
    </>
  );
};

export default DepartmentDetailModal;
