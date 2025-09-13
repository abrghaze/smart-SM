import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import ConfirmationModal from '../common/ConfirmationModal';
import UserProfileModal from './UserProfileModal';
import MultiSelect from '../common/MultiSelect';
import ClickableUser from '../common/ClickableUser';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  UsersIcon,
  FunnelIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const UserManagement = () => {
  const { user: currentUser, isAuthLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [loading, setLoading] = useState(true);


  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // Add status filter
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'employee',
    jobTitleIds: [],
    departmentIds: [],
    teamIds: []
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedEditFile, setSelectedEditFile] = useState(null);
  const [editPreviewImage, setEditPreviewImage] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState(null);

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load data from database
  useEffect(() => {
    // Don't fetch data if auth is still loading
    if (isAuthLoading || !currentUser) {
      return;
    }
    
    loadData();
  }, [isAuthLoading, currentUser, statusFilter, roleFilter, debouncedSearchTerm]); // Reload when auth or filters change



  const loadData = async () => {
    try {
      setLoading(true);
      
      // Prepare parameters for user fetching with all filters
      const userParams = {
        pageSize: 1000, // Request all users by setting a large page size
        include_inactive: true // Include all users regardless of status
      };
      
      // Status filter
      if (statusFilter === 'inactive') {
        userParams.status = 'inactive';
        delete userParams.include_inactive; // Don't include active users when filtering for inactive
      } else if (statusFilter === 'active') {
        userParams.status = 'active';
        delete userParams.include_inactive; // Don't include inactive users when filtering for active
      }
      
      // Role filter
      if (roleFilter) {
        userParams.role = roleFilter;
      }
      
      // Search filter
      if (debouncedSearchTerm) {
        userParams.q = debouncedSearchTerm;
      }
      
      const [usersData, departmentsData, teamsData, jobTitlesData] = await Promise.all([
        dataService.getUsers(userParams),
        dataService.getDepartments(),
        dataService.getTeams(),
        dataService.getJobTitles()
      ]);
      
      setUsers(usersData);
      setDepartments(departmentsData);
      setTeams(teamsData);
      setJobTitles(jobTitlesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      setLoading(true);
      
      let profilePictureUrl = null;
      
      // Check if a file has been selected
      if (selectedFile) {
        // First upload the file to get the URL
        const fileResponse = await dataService.uploadFile(selectedFile);
        profilePictureUrl = fileResponse.profileUrl || fileResponse.url;
      }
      
      // Create the final user creation payload object
      const userData = {
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        jobTitleIds: newUser.jobTitleIds || [], // Send array of job title IDs
        departmentIds: newUser.departmentIds,
        teamIds: newUser.teamIds
        // userSkills are automatically assigned by backend based on jobTitleIds
      };
      
      // Only include profile_picture_url if we have a URL
      if (profilePictureUrl) {
        userData.profile_picture_url = profilePictureUrl;
      }
      
      // Make the POST /users API call with the correctly constructed payload
      await dataService.createUser(userData);
      
      toast.success('Utilisateur créé avec succès');
      setShowCreateModal(false);
      setNewUser({ firstName: '', lastName: '', email: '', password: '', role: 'employee', jobTitleIds: [], departmentIds: [], teamIds: [] });
      setSelectedFile(null);
      setPreviewImage(null);
      loadData(); // Reload data
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Erreur lors de la création de l\'utilisateur');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async () => {
    try {
      setLoading(true);
      
      let profilePictureUrl = selectedUser.profilePictureUrl;
      
      // Check if a new file has been selected for the edit modal
      if (selectedEditFile) {
        // First upload the file to get the URL
        const fileResponse = await dataService.uploadFile(selectedEditFile);
        profilePictureUrl = fileResponse.profileUrl || fileResponse.url;
      }
      
      // Create the final user update payload object
      const updateData = {
        firstName: selectedUser.firstName,
        lastName: selectedUser.lastName,
        jobTitleIds: selectedUser.jobTitleIds || [], // Send array of job title IDs
        role: selectedUser.role,
        status: selectedUser.status || 'active',
        departmentIds: selectedUser.departmentIds || [],
        teamIds: selectedUser.teamIds || []
      };
      
      // Only include profile_picture_url if we have a new URL
      if (profilePictureUrl) {
        updateData.profile_picture_url = profilePictureUrl;
      }
      
      // Make the PUT /users/{id} API call with the correctly constructed payload
      await dataService.updateUser(selectedUser.id, updateData);
      
      toast.success('Utilisateur mis à jour avec succès');
      setShowEditModal(false);
      setSelectedUser(null);
      setSelectedEditFile(null);
      setEditPreviewImage(null);
      loadData(); // Reload data
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour de l\'utilisateur');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    setItemToDelete(userId);
    setIsConfirmModalOpen(true);
  };



  const handleUserProfileClose = () => {
    setShowUserProfileModal(false);
    setSelectedUserForProfile(null);
  };

  // Handle job title selection and show info about auto-assigned skills
  const handleJobTitleChange = async (jobTitleIds, isEdit = false) => {
    if (!jobTitleIds || jobTitleIds.length === 0) return;
    
    try {
      // Get job title details with requirements for all selected job titles
      const jobTitleDetailsPromises = jobTitleIds.map(id => dataService.getJobTitle(id));
      const jobTitleDetails = await Promise.all(jobTitleDetailsPromises);
      
      const totalSkills = jobTitleDetails.reduce((total, details) => {
        return total + (details.requirements ? details.requirements.length : 0);
      }, 0);
      
      if (isEdit) {
        // For edit mode, update selectedUser
        setSelectedUser(prev => ({
          ...prev,
          jobTitleIds: jobTitleIds
        }));
      } else {
        // For create mode, update newUser
        setNewUser(prev => ({
          ...prev,
          jobTitleIds: jobTitleIds
        }));
      }
      
      const jobTitlesText = jobTitleDetails.map(details => details.title).join(', ');
      toast.success(`Compétences assignées automatiquement pour ${jobTitlesText} (${totalSkills} compétences au total)`);
    } catch (error) {
      console.error('Error fetching job title requirements:', error);
      toast.error('Erreur lors du chargement des exigences du poste');
    }
  };

  const confirmDeleteUser = async () => {
    try {
      setLoading(true);
      await dataService.deleteUser(itemToDelete);
      toast.success('Utilisateur supprimé définitivement');
      setIsConfirmModalOpen(false);
      setItemToDelete(null);
      loadData(); // Reload data
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Erreur lors de la suppression de l\'utilisateur');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      setLoading(true);
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await dataService.updateUserStatus(userId, newStatus);
      loadData(); // Reload data to reflect changes
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error(error.message || 'Erreur lors de la modification du statut');
    } finally {
      setLoading(false);
    }
  };



  const getRoleBadge = (role) => {
    const colors = {
      admin: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-200',
      manager: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-200',
      employee: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-200'
    };
    const labels = {
      admin: 'Admin',
      manager: 'Manager',
      employee: 'Employé'
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${colors[role] || 'bg-gray-100 text-gray-800'}`}>
        {labels[role] || role}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-200',
      inactive: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-200'
    };
    const labels = {
      active: 'Actif',
      inactive: 'Inactif'
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Filter users based on search term and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = !debouncedSearchTerm || 
      user.firstName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      user.jobTitle?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesStatus = !statusFilter || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
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
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                  <UsersIcon className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestion des utilisateurs</h1>
                <p className="text-gray-600 mt-1">Gérez les utilisateurs, leurs rôles et leurs accès au système</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] flex items-center space-x-2"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Créer un utilisateur</span>
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
              />
            </div>

            {/* Role Filter */}
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white appearance-none"
              >
                <option value="">Tous les rôles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="employee">Employé</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white appearance-none"
              >
                <option value="">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-center">
              <span className="text-sm text-gray-600 font-medium">
                {filteredUsers.length} utilisateur{filteredUsers.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
            <h2 className="text-xl font-bold text-gray-900">
              Liste des utilisateurs
            </h2>
          </div>
          
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Chargement des utilisateurs...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16">
              <Cog6ToothIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">Aucun utilisateur trouvé</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <div key={user.id} className={`p-6 transition-all duration-200 hover:shadow-sm ${
                  user.status === 'inactive' 
                    ? 'bg-gray-50 hover:bg-gray-100 opacity-75' 
                    : 'hover:bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <ClickableUser
                        user={user}
                        onClick={(userId) => {
                          setSelectedUserForProfile(user);
                          setShowUserProfileModal(true);
                        }}
                        showName={false}
                        size="lg"
                        className="p-0"
                      />
                      <div>
                        <ClickableUser
                          user={user}
                          onClick={(userId) => {
                            setSelectedUserForProfile(user);
                            setShowUserProfileModal(true);
                          }}
                          showAvatar={false}
                          size="lg"
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                          showMeBadge={true}
                          currentUserId={currentUser.id}
                        />
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <div className="flex items-center space-x-3 mt-3">
                          {getRoleBadge(user.role)}
                          {getStatusBadge(user.status)}
                          <span className="text-sm text-gray-500">{user.jobTitle}</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-sm text-gray-500">
                            {user.departments && user.departments.length > 0 ? (
                              <span className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors" title="Cliquer pour voir tous les départements">
                                {user.departments[0].name}
                                {user.departments.length > 1 && ` (+${user.departments.length - 1})`}
                              </span>
                            ) : (
                              'Aucun département'
                            )}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-sm text-gray-500">
                            {user.teams && user.teams.length > 0 ? (
                              <span className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors" title="Cliquer pour voir toutes les équipes">
                                {user.teams[0].name}
                                {user.teams.length > 1 && ` (+${user.teams.length - 1})`}
                              </span>
                            ) : (
                              'Aucune équipe'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {/* Status Toggle */}
                      <button
                        onClick={() => handleToggleUserStatus(user.id, user.status)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                          user.status === 'active' 
                            ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-700 hover:from-green-200 hover:to-green-300 border border-green-200' 
                            : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 border border-gray-200'
                        }`}
                        disabled={loading}
                        title={user.status === 'active' ? 'Désactiver l\'utilisateur' : 'Activer l\'utilisateur'}
                      >
                        {user.status === 'active' ? 'Actif' : 'Inactif'}
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedUser({ 
                            ...user,
                            jobTitleIds: user.jobTitleIds || [], // Add job title IDs
                            departmentIds: user.departments ? user.departments.map(d => d.id) : [],
                            teamIds: user.teams ? user.teams.map(t => t.id) : []
                          });
                          setSelectedEditFile(null);
                          setEditPreviewImage(null);
                          setShowEditModal(true);
                        }}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
                        title="Modifier l'utilisateur"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedUserForProfile(user);
                          setShowUserProfileModal(true);
                        }}
                        className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all duration-200"
                        title="Voir le profil"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      
                      {/* Only show delete button if user is not the current admin */}
                      {user.id !== currentUser.id && (
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                          title="Supprimer l'utilisateur"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Créer un nouvel utilisateur</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Prénom</label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                    placeholder="Prénom"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Nom</label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                    placeholder="Nom"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  placeholder="email@exemple.com"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Mot de passe</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  placeholder="Mot de passe"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Rôle</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  >
                    <option value="employee">Employé</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Postes</label>
                  <MultiSelect
                    options={jobTitles || []}
                    value={newUser.jobTitleIds}
                    onChange={(values) => {
                      setNewUser({ ...newUser, jobTitleIds: values });
                      handleJobTitleChange(values, false);
                    }}
                    placeholder="Sélectionner des titres de poste"
                  />
                  {newUser.jobTitleIds && newUser.jobTitleIds.length > 0 && (
                    <p className="text-sm text-blue-600 mt-1">
                      💡 Les compétences requises pour ces postes seront automatiquement assignées à l'utilisateur
                    </p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Départements</label>
                <MultiSelect
                  options={departments}
                  value={newUser.departmentIds}
                  onChange={(values) => setNewUser({ ...newUser, departmentIds: values })}
                  placeholder="Sélectionner des départements"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Équipes</label>
                <MultiSelect
                  options={teams}
                  value={newUser.teamIds}
                  onChange={(values) => setNewUser({ ...newUser, teamIds: values })}
                  placeholder="Sélectionner des équipes"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Photo de profil (optionnel)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setSelectedFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () => setPreviewImage(reader.result);
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {previewImage && (
                  <div className="mt-2">
                    <img src={previewImage} alt="Preview" className="w-20 h-20 rounded-xl object-cover" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateUser}
                disabled={loading || !newUser.firstName || !newUser.lastName || !newUser.email || !newUser.password}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium disabled:opacity-50 shadow-md hover:shadow-lg"
              >
                {loading ? 'Création...' : 'Créer l\'utilisateur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Modifier l'utilisateur</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Prénom</label>
                  <input
                    type="text"
                    value={selectedUser.firstName}
                    onChange={(e) => setSelectedUser({ ...selectedUser, firstName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Nom</label>
                  <input
                    type="text"
                    value={selectedUser.lastName}
                    onChange={(e) => setSelectedUser({ ...selectedUser, lastName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Email</label>
                <input
                  type="email"
                  value={selectedUser.email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-500"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Rôle</label>
                  <select
                    value={selectedUser.role}
                    onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  >
                    <option value="employee">Employé</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Postes</label>
                  <MultiSelect
                    options={jobTitles || []}
                    value={selectedUser.jobTitleIds || []}
                    onChange={(values) => {
                      setSelectedUser({ ...selectedUser, jobTitleIds: values });
                      handleJobTitleChange(values, true);
                    }}
                    placeholder="Sélectionner des titres de poste"
                  />
                  {selectedUser.jobTitleIds && selectedUser.jobTitleIds.length > 0 && (
                    <p className="text-sm text-blue-600 mt-1">
                      💡 Les compétences requises pour ces postes seront automatiquement assignées à l'utilisateur
                    </p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Départements</label>
                <MultiSelect
                  options={departments}
                  value={selectedUser.departmentIds}
                  onChange={(values) => setSelectedUser({ ...selectedUser, departmentIds: values })}
                  placeholder="Sélectionner des départements"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Équipes</label>
                <MultiSelect
                  options={teams}
                  value={selectedUser.teamIds}
                  onChange={(values) => setSelectedUser({ ...selectedUser, teamIds: values })}
                  placeholder="Sélectionner des équipes"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Nouvelle photo de profil (optionnel)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setSelectedEditFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () => setEditPreviewImage(reader.result);
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {editPreviewImage && (
                  <div className="mt-2">
                    <img src={editPreviewImage} alt="Preview" className="w-20 h-20 rounded-xl object-cover" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleEditUser}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium disabled:opacity-50 shadow-md hover:shadow-lg"
              >
                {loading ? 'Mise à jour...' : 'Mettre à jour'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDeleteUser}
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ? Cette action ne peut pas être annulée."
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />

      {/* User Profile Modal */}
      {showUserProfileModal && selectedUserForProfile && (
        <UserProfileModal
          user={selectedUserForProfile}
          isOpen={showUserProfileModal}
          onClose={handleUserProfileClose}
        />
      )}
    </div>
  );
};

export default UserManagement; 