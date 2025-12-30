import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import ConfirmationModal from '../common/ConfirmationModal';
import TeamDetailModal from './TeamDetailModal';
import MultiSelect from '../common/MultiSelect';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ChartBarIcon,
  UserPlusIcon,
  UserMinusIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  UserIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

const TeamManagement = () => {
  const { user, isAuthLoading } = useAuth();
  const [teams, setTeams] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTeamDetailModal, setShowTeamDetailModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    departmentIds: [],
    managerId: ''
  });

  // Load data from database
  useEffect(() => {
    // Don't fetch data if auth is still loading
    if (isAuthLoading || !user) {
      return;
    }
    
    loadData();
  }, [isAuthLoading, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [teamsData, departmentsData, usersData] = await Promise.all([
        dataService.getTeams(),
        dataService.getDepartments(),
        dataService.getUsers({ pageSize: 1000, include_inactive: true })
      ]);
      
      setTeams(teamsData);
      setDepartments(departmentsData);
      setUsers(usersData);
      
      console.log('Loaded teams data:', { teams: teamsData.length, departments: departmentsData.length, users: usersData.length });
    } catch (error) {
      console.error('Error loading teams data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    try {
      setLoading(true);
      await dataService.createTeam(newTeam);
      toast.success('Équipe créée avec succès');
      setShowCreateModal(false);
      setNewTeam({ name: '', description: '', departmentIds: [], managerId: '' });
      loadData(); // Reload data
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error(error.message || 'Erreur lors de la création de l\'équipe');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTeam = async () => {
    try {
      setLoading(true);
      
      // Use the departmentIds and managerId that were set when opening the modal
      const teamData = {
        name: selectedTeam.name,
        description: selectedTeam.description,
        departmentIds: selectedTeam.departmentIds || [],
        managerId: selectedTeam.managerId || ''
      };
      
      await dataService.updateTeam(selectedTeam.id, teamData);
      toast.success('Équipe mise à jour avec succès');
      setShowEditModal(false);
      setSelectedTeam(null);
      loadData(); // Reload data
    } catch (error) {
      console.error('Error updating team:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour de l\'équipe');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    setItemToDelete(teamId);
    setIsConfirmModalOpen(true);
  };

  const confirmDeleteTeam = async () => {
    try {
      setLoading(true);
      await dataService.deleteTeam(itemToDelete);
      toast.success('Équipe supprimée avec succès');
      setIsConfirmModalOpen(false);
      setItemToDelete(null);
      loadData(); // Reload data
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error(error.message || 'Erreur lors de la suppression de l\'équipe');
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentName = (departmentId) => {
    const department = departments.find(d => d.id === departmentId);
    return department ? department.name : 'N/A';
  };

  const getManagerName = (managerId) => {
    const manager = users.find(u => u.id === managerId);
    return manager ? `${manager.firstName} ${manager.lastName}` : 'N/A';
  };

  const getMemberCount = (team) => {
    return team.members ? team.members.length : 0;
  };

  const handleViewTeamDetail = (team) => {
    setSelectedTeam(team);
    setShowTeamDetailModal(true);
  };

  const handleTeamDetailClose = () => {
    setShowTeamDetailModal(false);
    setSelectedTeam(null);
  };

  const handleTeamUpdated = (updatedTeam) => {
    // 1. Update the main list of teams
    setTeams(currentTeams =>
      currentTeams.map(team => (team.id === updatedTeam.id ? updatedTeam : team))
    );
    // 2. Explicitly update the selected team object to force the modal to re-render
    setSelectedTeam(updatedTeam);
  };

  // Filter teams based on search term and department filter
  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !departmentFilter || team.department?.id === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  if (loading && teams.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Chargement des équipes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <UserGroupIcon className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestion des équipes</h1>
                <p className="text-gray-600 mt-1">Créez et gérez les équipes de votre organisation</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center space-x-2"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Nouvelle équipe</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Rechercher</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher par nom ou description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-4 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-gray-50 hover:bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Département</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-gray-50 hover:bg-white appearance-none"
              >
                <option value="">Tous les départements</option>
                {departments.map(department => (
                  <option key={department.id} value={department.id}>{department.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl px-6 py-3 border-2 border-blue-100 w-full">
                <p className="text-sm font-semibold text-blue-700">
                  {filteredTeams.length} équipe{filteredTeams.length !== 1 ? 's' : ''} trouvée{filteredTeams.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Teams List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Liste des équipes</h2>
          </div>
          
          {filteredTeams.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UserGroupIcon className="h-10 w-10 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg font-medium">Aucune équipe trouvée</p>
              <p className="text-gray-400 text-sm mt-2">Essayez de modifier vos filtres ou créez une nouvelle équipe</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTeams.map((team) => (
                <div key={team.id} className="p-6 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50/30 transition-all duration-200 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl group-hover:from-blue-200 group-hover:to-indigo-200 transition-colors duration-200">
                        <UserGroupIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">{team.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{team.description}</p>
                        <div className="flex items-center flex-wrap gap-3 mt-3">
                          <span className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 rounded-lg text-xs font-semibold">
                            <BuildingOfficeIcon className="w-3.5 h-3.5 mr-1.5" />
                            {team.departments && team.departments.length > 0 
                              ? team.departments.map(d => d.name).join(', ') 
                              : 'Aucun département'}
                          </span>
                          <span className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-green-100 to-green-50 text-green-700 rounded-lg text-xs font-semibold">
                            <UserIcon className="w-3.5 h-3.5 mr-1.5" />
                            {team.manager ? `${team.manager.firstName} ${team.manager.lastName}` : 'Pas de manager'}
                          </span>
                          <span className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 rounded-lg text-xs font-semibold">
                            <UsersIcon className="w-3.5 h-3.5 mr-1.5" />
                            {team.membersCount || 0} membre{(team.membersCount || 0) !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewTeamDetail(team)}
                        className="p-3 text-blue-600 hover:bg-blue-100 rounded-xl transition-all duration-200 hover:shadow-md"
                        title="Voir les détails de l'équipe"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTeam({ 
                            ...team,
                            departmentIds: team.departments ? team.departments.map(d => d.id) : [],
                            managerId: team.manager?.id || ''
                          });
                          setShowEditModal(true);
                        }}
                        className="p-3 text-amber-600 hover:bg-amber-100 rounded-xl transition-all duration-200 hover:shadow-md"
                        title="Modifier l'équipe"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team.id)}
                        className="p-3 text-red-600 hover:bg-red-100 rounded-xl transition-all duration-200 hover:shadow-md"
                        title="Supprimer l'équipe"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Team Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowCreateModal(false)} />
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
                  <h3 className="text-xl font-bold text-white">Créer une nouvelle équipe</h3>
                </div>
                
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nom de l'équipe</label>
                    <input
                      type="text"
                      value={newTeam.name}
                      onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                      placeholder="Ex: Team Frontend, Team Backend"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      value={newTeam.description}
                      onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 resize-none"
                      placeholder="Description de l'équipe..."
                    />
                  </div>
                  
                  <div>
                    <MultiSelect
                      label="Départements"
                      options={departments}
                      value={newTeam.departmentIds}
                      onChange={(values) => setNewTeam({ ...newTeam, departmentIds: values })}
                      placeholder="Sélectionner des départements"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Manager</label>
                    <select
                      value={newTeam.managerId}
                      onChange={(e) => setNewTeam({ ...newTeam, managerId: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white"
                    >
                      <option value="">Sélectionner un manager</option>
                      {users.filter(user => user.role === 'manager').map(user => (
                        <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-100 transition-all duration-200"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleCreateTeam}
                    disabled={loading || !newTeam.name || newTeam.departmentIds.length === 0}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    {loading ? 'Création...' : 'Créer l\'équipe'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Team Modal */}
        {showEditModal && selectedTeam && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowEditModal(false)} />
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
                  <h3 className="text-xl font-bold text-white">Modifier l'équipe</h3>
                </div>
                
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nom de l'équipe</label>
                    <input
                      type="text"
                      value={selectedTeam.name}
                      onChange={(e) => setSelectedTeam({ ...selectedTeam, name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all duration-200"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      value={selectedTeam.description}
                      onChange={(e) => setSelectedTeam({ ...selectedTeam, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all duration-200 resize-none"
                    />
                  </div>
                  
                  <div>
                    <MultiSelect
                      label="Départements"
                      options={departments}
                      value={selectedTeam.departmentIds || []}
                      onChange={(values) => setSelectedTeam({ ...selectedTeam, departmentIds: values })}
                      placeholder="Sélectionner des départements"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Manager</label>
                    <select
                      value={selectedTeam.managerId}
                      onChange={(e) => setSelectedTeam({ ...selectedTeam, managerId: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all duration-200 bg-white"
                    >
                      <option value="">Sélectionner un manager</option>
                      {users.filter(user => user.role === 'manager').map(user => (
                        <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-6 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-100 transition-all duration-200"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleEditTeam}
                    disabled={loading || !selectedTeam.name}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    {loading ? 'Mise à jour...' : 'Mettre à jour'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Detail Modal */}
        <TeamDetailModal
          team={selectedTeam}
          isOpen={showTeamDetailModal}
          onClose={handleTeamDetailClose}
          onTeamUpdated={handleTeamUpdated}
        />

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => {
            setIsConfirmModalOpen(false);
            setItemToDelete(null);
          }}
          onConfirm={confirmDeleteTeam}
          title="Confirmer la suppression"
          message="Êtes-vous sûr de vouloir supprimer cette équipe ?"
          confirmText="Supprimer"
          cancelText="Annuler"
          isLoading={loading}
        />
      </div>
    </div>
  );
};

export default TeamManagement; 