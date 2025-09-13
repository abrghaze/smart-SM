import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import {
  XMarkIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  UsersIcon,
  SparklesIcon,
  TrophyIcon,
  ShieldCheckIcon,
  UserIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import Avatar from '../common/Avatar';
import UserProfileModal from '../common/UserProfileModal';

const TeamDetailModal = ({ team, isOpen, onClose }) => {
  const { user } = useAuth();
  const [teamData, setTeamData] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);

  const loadTeamData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading team data for:', team.id);
      
      // Get fresh team details with all relationships
      const teamDetails = await dataService.getTeamById(team.id);
      
      // Store the complete team data
      setTeamData(teamDetails);
      
      // Extract members from team details
      const membersData = teamDetails.members || [];
      setTeamMembers(membersData);
      
      console.log('✅ Team detail data loaded:', {
        teamId: team.id,
        members: membersData.length,
        manager: teamDetails.manager ? 'Present' : 'None'
      });
    } catch (error) {
      console.error('❌ Error loading team detail data:', error);
      toast.error('Erreur lors du chargement des données de l\'équipe');
    } finally {
      setLoading(false);
    }
  }, [team?.id]);

  useEffect(() => {
    if (isOpen && team) {
      loadTeamData();
    }
  }, [isOpen, team, loadTeamData]);

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setShowUserProfileModal(true);
  };

  const handleUserProfileClose = () => {
    setShowUserProfileModal(false);
    setSelectedUser(null);
  };

  if (!isOpen || !team) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white/95 backdrop-blur-sm rounded-3xl text-left overflow-hidden shadow-2xl border border-white/20 transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
          {/* Modern Header */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-700"></div>
            <div className="absolute inset-0 bg-black opacity-10"></div>
            <div className="relative bg-white/10 backdrop-blur-sm px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <UserGroupIcon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <SparklesIcon className="h-5 w-5 text-yellow-300" />
                      <h3 className="text-2xl font-bold text-white">{team.name}</h3>
                    </div>
                    <p className="text-green-100">{team.description || 'Aucune description'}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 bg-white/20 backdrop-blur-sm rounded-xl text-white hover:bg-white/30 transition-all duration-300 transform hover:scale-110"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white/80 backdrop-blur-sm px-8 py-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Team Info */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl mr-3">
                      <ChartBarIcon className="h-5 w-5 text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900">Informations de l'équipe</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-white rounded-xl border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <UsersIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Membres</p>
                          <p className="text-lg font-bold text-gray-900">{teamMembers.length} membre(s)</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <UserIcon className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Manager</p>
                          <p className="text-lg font-bold text-gray-900">
                            {teamData?.manager ? 
                              `${teamData.manager.firstName} ${teamData.manager.lastName}` : 
                              'Aucun manager assigné'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team Manager Section */}
                {teamData?.manager && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                    <div className="flex items-center mb-4">
                      <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl mr-3">
                        <TrophyIcon className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-blue-900">Manager de l'équipe</h4>
                    </div>
                    <div 
                      className="group flex items-center space-x-4 cursor-pointer hover:bg-white/50 p-4 rounded-xl transition-all duration-300 transform hover:scale-105"
                      onClick={() => handleUserClick(teamData.manager)}
                    >
                      <Avatar
                        user={teamData.manager}
                        size="md"
                      />
                      <div className="flex-1">
                        <p className="font-bold text-blue-900 group-hover:text-blue-700 text-lg">
                          {teamData.manager.firstName} {teamData.manager.lastName}
                        </p>
                        <p className="text-sm text-blue-600">{teamData.manager.email}</p>
                        <p className="text-xs text-blue-500 font-medium">{teamData.manager.jobTitle}</p>
                      </div>
                      <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                        <UserIcon className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Team Departments Section */}
                {team.departments && team.departments.length > 0 && (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
                    <div className="flex items-center mb-4">
                      <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl mr-3">
                        <BuildingOfficeIcon className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-purple-900">Départements de l'équipe</h4>
                    </div>
                    <div className="space-y-3">
                      {team.departments.map((dept) => (
                        <div key={dept.id} className="flex items-center space-x-3 p-3 bg-white rounded-xl border border-purple-200">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <BuildingOfficeIcon className="h-4 w-4 text-purple-600" />
                          </div>
                          <span className="text-purple-900 font-medium">{dept.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team Members Section */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center mb-6">
                    <div className="p-2 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl mr-3">
                      <UsersIcon className="h-5 w-5 text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900">Membres de l'équipe ({teamMembers.length})</h4>
                  </div>
                  
                  {teamMembers.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl inline-block mb-4">
                        <UsersIcon className="h-16 w-16 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucun membre dans cette équipe</h3>
                      <p className="text-gray-500">Cette équipe n'a pas encore de membres assignés.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {teamMembers
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
                          className="group flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:shadow-lg hover:border-green-300 transition-all duration-300 transform hover:scale-105 cursor-pointer"
                          onClick={() => handleUserClick(member)}
                        >
                          <div className="flex items-center space-x-4">
                            <Avatar
                              user={member}
                              size="md"
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <p className="font-bold text-gray-900 text-lg">
                                  {member.firstName} {member.lastName}
                                </p>
                                {member.id === user?.id && (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                    (Moi)
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-1">{member.email}</p>
                              <p className="text-xs text-gray-500 font-medium">
                                {member.jobTitle} • {member.role}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              member.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {member.status === 'active' ? 'Actif' : 'Inactif'}
                            </span>
                            {member.roleInTeam && (
                              <span className="text-xs text-gray-600 bg-blue-100 px-3 py-1 rounded-full font-medium">
                                {member.roleInTeam}
                              </span>
                            )}
                            <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-green-100 transition-colors">
                              <UserIcon className="h-4 w-4 text-gray-600 group-hover:text-green-600" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modern Footer */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-4 flex justify-end border-t border-gray-200">
            <button
              onClick={onClose}
              className="group flex items-center px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <span className="font-semibold">Fermer</span>
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
    </div>
  );
};

export default TeamDetailModal;
