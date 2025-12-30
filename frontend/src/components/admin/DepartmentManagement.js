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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-amber-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Chargement des départements...</p>
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
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <BuildingOfficeIcon className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestion des départements</h1>
                <p className="text-gray-600 mt-1">Créez et gérez les départements de votre organisation</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center space-x-2"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Nouveau département</span>
            </button>
          </div>
        </div>

        {/* Departments List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Liste des départements</h2>
              <span className="text-sm font-semibold text-amber-600 bg-amber-50 px-4 py-2 rounded-full">
                {departments.length} département{departments.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          {departments.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BuildingOfficeIcon className="h-10 w-10 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg font-medium">Aucun département trouvé</p>
              <p className="text-gray-400 text-sm mt-2">Créez votre premier département pour commencer</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {departments.map((department) => (
                <div key={department.id} className="p-6 hover:bg-gradient-to-r hover:from-gray-50 hover:to-amber-50/30 transition-all duration-200 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl group-hover:from-amber-200 group-hover:to-orange-200 transition-colors duration-200">
                        <BuildingOfficeIcon className="h-6 w-6 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-amber-600 transition-colors duration-200">{department.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{department.description}</p>
                        <div className="flex items-center flex-wrap gap-3 mt-3">
                          <span className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 rounded-lg text-xs font-semibold">
                            <UsersIcon className="w-3.5 h-3.5 mr-1.5" />
                            {department.employeesCount || 0} employé{(department.employeesCount || 0) !== 1 ? 's' : ''}
                          </span>
                          <span className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 rounded-lg text-xs font-semibold">
                            <UserGroupIcon className="w-3.5 h-3.5 mr-1.5" />
                            {department.teamsCount || 0} équipe{(department.teamsCount || 0) !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDepartmentDetail(department)}
                        className="p-3 text-blue-600 hover:bg-blue-100 rounded-xl transition-all duration-200 hover:shadow-md"
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
                        className="p-3 text-amber-600 hover:bg-amber-100 rounded-xl transition-all duration-200 hover:shadow-md"
                        title="Modifier le département"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDepartment(department.id)}
                        className="p-3 text-red-600 hover:bg-red-100 rounded-xl transition-all duration-200 hover:shadow-md"
                        title="Supprimer le département"
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
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowCreateModal(false)} />
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4">
                  <h3 className="text-xl font-bold text-white">Créer un nouveau département</h3>
                </div>
                
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nom du département</label>
                    <input
                      type="text"
                      value={newDepartment.name}
                      onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all duration-200"
                      placeholder="Ex: IT, HR, Marketing"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      value={newDepartment.description}
                      onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all duration-200 resize-none"
                      placeholder="Description du département..."
                    />
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
                    onClick={handleCreateDepartment}
                    disabled={loading || !newDepartment.name}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    {loading ? 'Création...' : 'Créer le département'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Department Modal */}
        {showEditModal && selectedDepartment && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowEditModal(false)} />
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4">
                  <h3 className="text-xl font-bold text-white">Modifier le département</h3>
                </div>
                
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nom du département</label>
                    <input
                      type="text"
                      value={selectedDepartment.name}
                      onChange={(e) => setSelectedDepartment({ ...selectedDepartment, name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all duration-200"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      value={selectedDepartment.description}
                      onChange={(e) => setSelectedDepartment({ ...selectedDepartment, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all duration-200 resize-none"
                    />
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
                    onClick={handleEditDepartment}
                    disabled={loading || !selectedDepartment.name}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
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
    </div>
  );
};

export default DepartmentManagement; 