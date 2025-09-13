import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import {
  XMarkIcon,
  UserPlusIcon,
  UserMinusIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import Avatar from '../common/Avatar';
import ConfirmationModal from '../common/ConfirmationModal';
import UserProfileModal from '../common/UserProfileModal';

const TeamDetailModal = ({ team, isOpen, onClose, onTeamUpdated }) => {
  const { user } = useAuth();
  const [teamData, setTeamData] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showChangeManager, setShowChangeManager] = useState(false);
  const [selectedNewManager, setSelectedNewManager] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);

  const loadTeamData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get fresh team details with all relationships
      const [teamDetails, usersData] = await Promise.all([
        dataService.getTeamById(team.id),
        dataService.getUsers({ include_inactive: true })
      ]);
      
      // Store the complete team data
      setTeamData(teamDetails);
      
      // Extract members from team details
      const membersData = teamDetails.members || [];
      setTeamMembers(membersData);
      setAllUsers(usersData);
      
      console.log('Team detail data loaded:', {
        teamMembers: membersData.length,
        allUsers: usersData.length,
        manager: teamDetails.manager ? 'Present' : 'None'
      });
    } catch (error) {
      console.error('Error loading team detail data:', error);
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

  const handleAddMember = async () => {
    if (!selectedUser) {
      toast.error('Veuillez sélectionner un utilisateur');
      return;
    }

    try {
      setLoading(true);
      await dataService.addTeamMember(team.id, selectedUser);
      toast.success('Membre ajouté à l\'équipe avec succès');
      setSelectedUser('');
      setShowAddMember(false);
      loadTeamData(); // Reload data
      if (onTeamUpdated) onTeamUpdated(team); // Pass current team since member count changed
    } catch (error) {
      console.error('Error adding team member:', error);
      toast.error(error.message || 'Erreur lors de l\'ajout du membre');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      setLoading(true);
      await dataService.removeTeamMember(team.id, userId);
      toast.success('Membre retiré de l\'équipe avec succès');
      loadTeamData(); // Reload data
      if (onTeamUpdated) onTeamUpdated(team); // Pass current team since member count changed
    } catch (error) {
      console.error('Error removing team member:', error);
      toast.error(error.message || 'Erreur lors du retrait du membre');
    } finally {
      setLoading(false);
    }
  };

  const confirmRemoveMember = (user) => {
    setUserToDelete(user);
    setShowDeleteConfirmation(true);
  };

  const handleUserClick = (userId) => {
    setSelectedProfileId(userId);
    setShowUserProfileModal(true);
  };

  const handleConfirmRemoveMember = async () => {
    if (userToDelete) {
      await handleRemoveMember(userToDelete.id);
      setShowDeleteConfirmation(false);
      setUserToDelete(null);
    }
  };

  const handleChangeManager = async () => {
    if (!selectedNewManager) {
      toast.error('Veuillez sélectionner un nouveau manager');
      return;
    }

    try {
      setLoading(true);
      const updatedTeamFromApi = await dataService.updateTeam(team.id, { managerId: selectedNewManager });
      toast.success('Manager de l\'équipe mis à jour avec succès');
      setSelectedNewManager('');
      setShowChangeManager(false);
      loadTeamData(); // Reload data
      if (onTeamUpdated) onTeamUpdated(updatedTeamFromApi); // Pass the full updated object back to the parent
    } catch (error) {
      console.error('Error changing team manager:', error);
      toast.error(error.message || 'Erreur lors du changement de manager');
    } finally {
      setLoading(false);
    }
  };

  // Filter users who are not already in the team and exclude the team manager
  const availableUsers = allUsers.filter(user => 
    user.role === 'employee' && 
    !teamMembers.some(member => member.id === user.id) &&
    user.id !== (team?.manager?.id || null) && // Exclude team manager (manager/member exclusivity rule)
    (searchTerm === '' || 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isOpen) return null;

  // Show loading state if team data is not yet available
  if (!team || loading) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
            <div className="bg-white px-6 py-4">
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <UserGroupIcon className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                    <p className="text-sm text-gray-500">
                      {team.department?.name && (
                        <span className="flex items-center">
                          <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                          {team.department.name}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="bg-white px-6 py-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Team Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Informations de l'équipe</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Description:</span>
                        <p className="text-gray-900">{team.description || 'Aucune description'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Départements:</span>
                        <p className="text-gray-900">
                          {teamData?.departments && teamData.departments.length > 0 
                            ? teamData.departments.map(d => d.name).join(', ')
                            : 'Non assigné'
                          }
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Membres:</span>
                        <p className="text-gray-900">{teamMembers.length} membre(s)</p>
                      </div>
                    </div>
                  </div>

                  {/* Team Manager Section */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-blue-900 mb-1">Manager de l'équipe</h4>
                        {teamData?.manager ? (
                          <div 
                            className="flex items-center space-x-3 cursor-pointer hover:bg-blue-100 p-2 rounded-lg transition-colors"
                            onClick={() => handleUserClick(teamData.manager.id)}
                            title="Cliquer pour voir le profil"
                          >
                            <Avatar
                              user={teamData.manager}
                              size="md"
                            />
                            <div>
                              <p className="font-medium text-blue-900">
                                {teamData.manager.firstName} {teamData.manager.lastName}
                              </p>
                              <p className="text-sm text-blue-600">{teamData.manager.email}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-3">
                            <Avatar
                              user={null}
                              size="md"
                            />
                            <div>
                              <p className="font-medium text-blue-900">Non assigné</p>
                            </div>
                          </div>
                        )}
                      </div>
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => setShowChangeManager(true)}
                          className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors flex items-center"
                        >
                          <PencilIcon className="h-4 w-4 mr-1" />
                          Changer le manager
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Team Members */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">Membres de l'équipe</h4>
                      <button
                        onClick={() => setShowAddMember(!showAddMember)}
                        className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 transition-colors flex items-center"
                      >
                        <UserPlusIcon className="h-4 w-4 mr-1" />
                        Ajouter un membre
                      </button>
                    </div>

                    {/* Add Member Section */}
                    {showAddMember && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <h5 className="font-medium text-blue-900 mb-3">Ajouter un nouveau membre</h5>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Rechercher un utilisateur
                            </label>
                            <div className="relative">
                              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Rechercher par nom ou email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                          
                          {searchTerm && availableUsers.length > 0 && (
                            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                              {availableUsers.map((user) => (
                                <div
                                  key={user.id}
                                  onClick={() => setSelectedUser(user.id)}
                                  className={`p-2 cursor-pointer hover:bg-gray-100 flex items-center space-x-3 ${
                                    selectedUser === user.id ? 'bg-blue-100' : ''
                                  }`}
                                >
                                  <Avatar
                                    src={user.profilePictureUrl}
                                    alt={`${user.firstName} ${user.lastName}`}
                                    size="sm"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <p className="font-medium text-sm">
                                        {user.firstName} {user.lastName}
                                      </p>
                                      {user.status === 'inactive' && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                          Inactif
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500">{user.email}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {searchTerm && availableUsers.length === 0 && (
                            <p className="text-sm text-gray-500">Aucun utilisateur trouvé</p>
                          )}
                          
                          {selectedUser && (
                            <div className="flex space-x-2">
                              <button
                                onClick={handleAddMember}
                                disabled={loading}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                              >
                                {loading ? 'Ajout...' : 'Ajouter'}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUser('');
                                  setSearchTerm('');
                                  setShowAddMember(false);
                                }}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-400"
                              >
                                Annuler
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Members List */}
                    <div className="space-y-2">
                      {teamMembers.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Aucun membre dans cette équipe</p>
                      ) : (
                        teamMembers
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
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div 
                              className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors flex-1"
                              onClick={() => handleUserClick(member.id)}
                              title="Cliquer pour voir le profil"
                            >
                              <Avatar
                                user={member}
                                size="md"
                              />
                              <div>
                                <div className="flex items-center space-x-2">
                                  <p className="font-medium">
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmRemoveMember(member);
                              }}
                              disabled={loading}
                              className="text-red-600 hover:text-red-800 p-2 rounded-md hover:bg-red-50 transition-colors"
                              title="Retirer de l'équipe"
                            >
                              <UserMinusIcon className="h-5 w-5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-3 flex justify-end">
              <button
                onClick={onClose}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Change Manager Modal */}
      {showChangeManager && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowChangeManager(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Changer le manager de l'équipe</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sélectionner un nouveau manager
                    </label>
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                      {allUsers
                        .filter(user => user.role === 'manager' && user.status === 'active' && user.id !== teamData?.manager?.id)
                        .map((user) => (
                          <div
                            key={user.id}
                            onClick={() => setSelectedNewManager(user.id)}
                            className={`p-3 cursor-pointer hover:bg-gray-100 flex items-center space-x-3 ${
                              selectedNewManager === user.id ? 'bg-blue-100' : ''
                            }`}
                          >
                            <Avatar
                              src={user.profilePictureUrl}
                              alt={`${user.firstName} ${user.lastName}`}
                              size="sm"
                            />
                            <div>
                              <p className="font-medium text-sm">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleChangeManager}
                      disabled={loading || !selectedNewManager}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Mise à jour...' : 'Changer le manager'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedNewManager('');
                        setShowChangeManager(false);
                      }}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-400"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => {
          setShowDeleteConfirmation(false);
          setUserToDelete(null);
        }}
        onConfirm={handleConfirmRemoveMember}
        title="Retirer le membre de l'équipe"
        message={`Êtes-vous sûr de vouloir retirer ${userToDelete ? `${userToDelete.firstName} ${userToDelete.lastName}` : 'ce membre'} de l'équipe ?`}
        confirmText="Retirer"
        cancelText="Annuler"
        confirmButtonColor="red"
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showUserProfileModal}
        onClose={() => {
          setShowUserProfileModal(false);
          setSelectedProfileId(null);
        }}
        userId={selectedProfileId}
        currentUserJobTitles={user?.currentJobTitles || []}
      />
    </>
  );
};

export default TeamDetailModal;
