import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import ConfirmationModal from '../common/ConfirmationModal';
import DepartmentDetailModal from './DepartmentDetailModal';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  UsersIcon,
  UserGroupIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const DepartmentManagement = () => {
  const { user, isAuthLoading } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDepartmentDetailModal, setShowDepartmentDetailModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [newDepartment, setNewDepartment] = useState({
    name: '',
    description: ''
  });
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

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
      const [departmentsData, usersData, teamsData] = await Promise.all([
        dataService.getDepartments(),
        dataService.getUsers({ pageSize: 1000, include_inactive: true }),
        dataService.getTeams()
      ]);
      
      setDepartments(departmentsData);
      setUsers(usersData);
      setTeams(teamsData);
      
      console.log('Loaded departments data:', { 
        departments: departmentsData.length, 
        users: usersData.length, 
        teams: teamsData.length 
      });
    } catch (error) {
      console.error('Error loading departments data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDepartment = async () => {
    try {
      setLoading(true);
      await dataService.createDepartment(newDepartment);
      toast.success('Département créé avec succès');
      setShowCreateModal(false);
      setNewDepartment({ name: '', description: '' });
      loadData(); // Reload data
    } catch (error) {
      console.error('Error creating department:', error);
      toast.error(error.message || 'Erreur lors de la création du département');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDepartment = async () => {
    try {
      setLoading(true);
      
      const departmentData = {
        name: selectedDepartment.name,
        description: selectedDepartment.description
      };
      
      await dataService.updateDepartment(selectedDepartment.id, departmentData);
      toast.success('Département mis à jour avec succès');
      setShowEditModal(false);
      setSelectedDepartment(null);
      loadData(); // Reload data
    } catch (error) {
      console.error('Error updating department:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour du département');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDepartment = async (deptId) => {
    setItemToDelete(deptId);
    setIsConfirmModalOpen(true);
  };

  const confirmDeleteDepartment = async () => {
    try {
      setLoading(true);
      await dataService.deleteDepartment(itemToDelete);
      toast.success('Département supprimé avec succès');
      setIsConfirmModalOpen(false);
      setItemToDelete(null);
      loadData(); // Reload data
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error(error.message || 'Erreur lors de la suppression du département');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDepartmentDetail = (department) => {
    setSelectedDepartment(department);
    setShowDepartmentDetailModal(true);
  };

  const handleDepartmentDetailClose = () => {
    setShowDepartmentDetailModal(false);
    setSelectedDepartment(null);
    // Refresh parent data when modal closes
    loadData();
  };

  const getManagerName = (managerId) => {
    const manager = users.find(u => u.id === managerId);
    return manager ? `${manager.firstName} ${manager.lastName}` : 'N/A';
  };

  const getEmployeeCount = (departmentId) => {
    return users.filter(user => user.departmentId === departmentId).length;
  };

  const getTeamCount = (departmentId) => {
    return teams.filter(team => team.departmentId === departmentId).length;
  };

  const getDepartmentTeams = (departmentId) => {
    return teams.filter(team => team.departmentId === departmentId);
  };

  if (loading && departments.length === 0) {
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Gestion des départements</h1>
            <p className="text-gray-600">Créez et gérez les départements de votre organisation</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Nouveau département
          </button>
        </div>
      </div>

      {/* Departments List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Départements ({departments.length})
          </h2>
        </div>
        
        {departments.length === 0 ? (
          <div className="text-center py-12">
            <BuildingOfficeIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Aucun département trouvé</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {departments.map((department) => (
              <div key={department.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <BuildingOfficeIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{department.name}</h3>
                      <p className="text-sm text-gray-600">{department.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {department.employeesCount || 0} employés
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">
                          {department.teamsCount || 0} équipes
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewDepartmentDetail(department)}
                      className="text-blue-600 hover:text-blue-700 p-2"
                      title="Voir les détails du département"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDepartment({ 
                          ...department,
                          managerId: department.manager?.id || ''
                        });
                        setShowEditModal(true);
                      }}
                      className="text-gray-600 hover:text-gray-700 p-2"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDepartment(department.id)}
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

      {/* Create Department Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Créer un nouveau département</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    value={newDepartment.name}
                    onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: IT, HR, Marketing"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newDepartment.description}
                    onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Description du département..."
                  />
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
                  onClick={handleCreateDepartment}
                  disabled={loading || !newDepartment.name}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {showEditModal && selectedDepartment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Modifier le département</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    value={selectedDepartment.name}
                    onChange={(e) => setSelectedDepartment({ ...selectedDepartment, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={selectedDepartment.description}
                    onChange={(e) => setSelectedDepartment({ ...selectedDepartment, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
                  onClick={handleEditDepartment}
                  disabled={loading || !selectedDepartment.name}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Mise à jour...' : 'Mettre à jour'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Department Detail Modal */}
      <DepartmentDetailModal
        department={selectedDepartment}
        isOpen={showDepartmentDetailModal}
        onClose={handleDepartmentDetailClose}
        onDepartmentUpdated={loadData}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDeleteDepartment}
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer ce département ?"
        confirmText="Supprimer"
        cancelText="Annuler"
        isLoading={loading}
      />
    </div>
  );
};

export default DepartmentManagement; 