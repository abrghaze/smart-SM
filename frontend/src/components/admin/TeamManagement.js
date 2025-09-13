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
  XMarkIcon
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Gestion des équipes</h1>
            <p className="text-gray-600">Créez et gérez les équipes de votre organisation</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Nouvelle équipe
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
            <input
              type="text"
              placeholder="Rechercher par nom ou description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Département</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les départements</option>
              {departments.map(department => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Teams List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Équipes ({filteredTeams.length})
          </h2>
        </div>
        
        {filteredTeams.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Aucune équipe trouvée</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTeams.map((team) => (
              <div key={team.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <UserGroupIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{team.name}</h3>
                      <p className="text-sm text-gray-600">{team.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">
                          Départements: {team.departments && team.departments.length > 0 
                            ? team.departments.map(d => d.name).join(', ') 
                            : 'N/A'}
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">
                          Manager: {team.manager ? `${team.manager.firstName} ${team.manager.lastName}` : 'N/A'}
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">
                          {team.membersCount || 0} membres
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewTeamDetail(team)}
                      className="text-blue-600 hover:text-blue-700 p-2"
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
                      className="text-gray-600 hover:text-gray-700 p-2"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="text-red-600 hover:text-red-700 p-2"
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Créer une nouvelle équipe</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Team Frontend, Team Backend"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newTeam.description}
                    onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Description de l'équipe..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Départements</label>
                  <MultiSelect
                    options={departments}
                    value={newTeam.departmentIds}
                    onChange={(values) => setNewTeam({ ...newTeam, departmentIds: values })}
                    placeholder="Sélectionner des départements"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                  <select
                    value={newTeam.managerId}
                    onChange={(e) => setNewTeam({ ...newTeam, managerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner un manager</option>
                    {users.filter(user => user.role === 'manager').map(user => (
                      <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateTeam}
                  disabled={loading || !newTeam.name || newTeam.departmentIds.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditModal && selectedTeam && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Modifier l'équipe</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    value={selectedTeam.name}
                    onChange={(e) => setSelectedTeam({ ...selectedTeam, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={selectedTeam.description}
                    onChange={(e) => setSelectedTeam({ ...selectedTeam, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Départements</label>
                  <MultiSelect
                    options={departments}
                    value={selectedTeam.departmentIds || []}
                    onChange={(values) => setSelectedTeam({ ...selectedTeam, departmentIds: values })}
                    placeholder="Sélectionner des départements"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                  <select
                    value={selectedTeam.managerId}
                    onChange={(e) => setSelectedTeam({ ...selectedTeam, managerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner un manager</option>
                    {users.filter(user => user.role === 'manager').map(user => (
                      <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleEditTeam}
                  disabled={loading || !selectedTeam.name}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
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
  );
};

export default TeamManagement; 