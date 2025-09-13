import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import {
  XMarkIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  UsersIcon,
  AcademicCapIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import Avatar from '../common/Avatar';
import TeamDetailModal from './TeamDetailModal';
import UserProfileModal from './UserProfileModal';
import ConfirmationModal from '../common/ConfirmationModal';

const DepartmentDetailModal = ({ department, isOpen, onClose, onDepartmentUpdated }) => {
  const { user } = useAuth();
  const [departmentData, setDepartmentData] = useState(null);
  const [departmentTeams, setDepartmentTeams] = useState([]);
  const [departmentEmployees, setDepartmentEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('teams'); // 'teams' or 'employees'
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showTeamDetailModal, setShowTeamDetailModal] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [allTeams, setAllTeams] = useState([]);

  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');
  const [selectedTeamToAdd, setSelectedTeamToAdd] = useState('');
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    managerId: ''
  });
  const [showDeleteTeamConfirmation, setShowDeleteTeamConfirmation] = useState(false);
  const [showRemoveUserConfirmation, setShowRemoveUserConfirmation] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [userToRemove, setUserToRemove] = useState(null);
  const [showChangeManagerModal, setShowChangeManagerModal] = useState(false);
  const [selectedManager, setSelectedManager] = useState('');
  const [expandedTeamId, setExpandedTeamId] = useState(null);

  const loadDepartmentData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading fresh department data for:', department.id);
      
      // Get fresh department details with all relationships
      const [departmentDetails, allUsersData, allTeamsData] = await Promise.all([
        dataService.getDepartmentById(department.id),
        dataService.getUsers({ include_inactive: true }),
        dataService.getTeams()
      ]);
      
      // Store the complete department data
      setDepartmentData(departmentDetails);
      
      // Extract teams and employees from department details
      const teamsData = departmentDetails.teams || [];
      const employeesData = departmentDetails.employees || [];
      
      setDepartmentTeams(teamsData);
      setDepartmentEmployees(employeesData);
      // Department manager is now included in departmentDetails.manager
      setAllUsers(allUsersData);
      setAllTeams(allTeamsData);
      
      console.log('✅ Department detail data loaded:', {
        departmentId: department.id,
        teams: teamsData.length,
        employees: employeesData.length,
        manager: departmentDetails.manager ? 'Present' : 'None',
        allUsers: allUsersData.length,
        allTeams: allTeamsData.length
      });
    } catch (error) {
      console.error('❌ Error loading department detail data:', error);
      toast.error('Erreur lors du chargement des données du département');
    } finally {
      setLoading(false);
    }
  }, [department?.id]);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen && department) {
      loadDepartmentData();
    }
  }, [isOpen, department, loadDepartmentData]);



  const handleTeamClick = (team) => {
    // Toggle team expansion for drill-down functionality
    if (expandedTeamId === team.id) {
      setExpandedTeamId(null);
    } else {
      setExpandedTeamId(team.id);
    }
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setShowUserProfileModal(true);
  };

  const handleTeamDetailClose = () => {
    setShowTeamDetailModal(false);
    setSelectedTeam(null);
  };

  const handleUserProfileClose = () => {
    setShowUserProfileModal(false);
    setSelectedUser(null);
  };

  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) {
      toast.error('Le nom de l\'équipe est requis');
      return;
    }

    try {
      setLoading(true);
      await dataService.createTeam({
        ...newTeam,
        departmentId: department.id
      });
      toast.success('Équipe créée avec succès');
      setShowCreateTeamModal(false);
      setNewTeam({ name: '', description: '', managerId: '' });
      loadDepartmentData();
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error(error.message || 'Erreur lors de la création de l\'équipe');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTeamFromDepartment = async (teamId) => {
    try {
      setLoading(true);
      console.log('🔍 Removing team from department:', { teamId, departmentId: department.id });
      await dataService.removeTeamFromDepartment(department.id, teamId);
      toast.success('Équipe retirée du département avec succès');
      
      // Reload fresh data
      await loadDepartmentData();
    } catch (error) {
      console.error('❌ Error removing team from department:', error);
      toast.error(error.message || 'Erreur lors du retrait de l\'équipe');
    } finally {
      setLoading(false);
    }
  };

  const confirmRemoveTeamFromDepartment = (team) => {
    setTeamToDelete(team);
    setShowDeleteTeamConfirmation(true);
  };

  const handleConfirmRemoveTeam = async () => {
    if (teamToDelete) {
      await handleRemoveTeamFromDepartment(teamToDelete.id);
      setShowDeleteTeamConfirmation(false);
      setTeamToDelete(null);
    }
  };

  const handleAddTeamToDepartment = async () => {
    if (!selectedTeamToAdd) {
      toast.error('Veuillez sélectionner une équipe');
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 Adding team to department:', { teamId: selectedTeamToAdd, departmentId: department.id });
      
      // Add team to department (creates department_teams relationship)
      await dataService.addTeamToDepartment(selectedTeamToAdd, department.id);
      toast.success('Équipe ajoutée au département avec succès');
      
      // Clear modal state immediately
      setShowAddTeamModal(false);
      setSelectedTeamToAdd('');
      
      // Force reload fresh data to prevent duplication
      console.log('🔄 Reloading fresh department data after adding team...');
      await loadDepartmentData();
      
      console.log('✅ Team added successfully, fresh data loaded');
    } catch (error) {
      console.error('❌ Error adding team to department:', error);
      toast.error(error.message || 'Erreur lors de l\'ajout de l\'équipe');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUserToDepartment = async () => {
    if (!selectedUserToAdd) {
      toast.error('Veuillez sélectionner un utilisateur');
      return;
    }

    try {
      setLoading(true);
      await dataService.updateUser(selectedUserToAdd, { departmentIds: [department.id] });
      toast.success('Utilisateur ajouté au département avec succès');
      setShowAddUserModal(false);
      setSelectedUserToAdd('');
      loadDepartmentData();
    } catch (error) {
      console.error('Error adding user to department:', error);
      toast.error(error.message || 'Erreur lors de l\'ajout de l\'utilisateur');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUserFromDepartment = async (userId) => {
    try {
      setLoading(true);
      // Get current user's departments and remove this one
      const currentUser = allUsers.find(u => u.id === userId);
      const currentDepartments = currentUser?.departments?.map(d => d.id) || [];
      const updatedDepartments = currentDepartments.filter(deptId => deptId !== department.id);
      
      await dataService.updateUser(userId, { departmentIds: updatedDepartments });
      toast.success('Utilisateur retiré du département avec succès');
      loadDepartmentData();
    } catch (error) {
      console.error('Error removing user from department:', error);
      toast.error(error.message || 'Erreur lors du retrait de l\'utilisateur');
    } finally {
      setLoading(false);
    }
  };

  const confirmRemoveUserFromDepartment = (user) => {
    setUserToRemove(user);
    setShowRemoveUserConfirmation(true);
  };

  const handleConfirmRemoveUser = async () => {
    if (userToRemove) {
      await handleRemoveUserFromDepartment(userToRemove.id);
      setShowRemoveUserConfirmation(false);
      setUserToRemove(null);
    }
  };

  const handleChangeManager = async () => {
    if (!selectedManager) {
      toast.error('Veuillez sélectionner un manager');
      return;
    }

    try {
      setLoading(true);
      
      // Update department with new manager
      await dataService.updateDepartment(department.id, { managerId: selectedManager });
      
      toast.success('Manager du département mis à jour avec succès');
      setSelectedManager('');
      setShowChangeManagerModal(false);
      loadDepartmentData();
      if (onDepartmentUpdated) onDepartmentUpdated();
    } catch (error) {
      console.error('Error changing department manager:', error);
      toast.error(error.message || 'Erreur lors du changement du manager');
    } finally {
      setLoading(false);
    }
  };

  // Check if current user is the department manager
  const isDepartmentManager = user?.id === departmentData?.manager?.id;

  // Filter users who are not already in the department
  const availableUsers = allUsers.filter(user => 
    !user.departments?.some(dept => dept.id === department?.id)
  );

  // Filter teams that are not already in the department
  const availableTeams = allTeams.filter(team => 
    !departmentTeams.some(deptTeam => deptTeam.id === team.id)
  );

  if (!isOpen || !department) return null;

  return (
    <>
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
        <div className="relative top-10 mx-auto p-8 border-0 w-11/12 max-w-6xl shadow-2xl rounded-3xl bg-white">
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
                </div>

                {/* Department Manager Section - REMOVED */}

                {/* Modern Tabs */}
                <div className="bg-gray-50 rounded-2xl p-2">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setActiveTab('teams')}
                      className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${
                        activeTab === 'teams'
                          ? 'bg-white text-blue-600 shadow-lg'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                      }`}
                    >
                      <UserGroupIcon className="h-5 w-5" />
                      <span>Équipes ({departmentTeams.length})</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('employees')}
                      className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${
                        activeTab === 'employees'
                          ? 'bg-white text-blue-600 shadow-lg'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                      }`}
                    >
                      <UsersIcon className="h-5 w-5" />
                      <span>Membres ({departmentEmployees.length})</span>
                    </button>
                  </div>
                </div>

                {/* Teams Tab */}
                {activeTab === 'teams' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-900">Équipes du département</h3>
                      {isDepartmentManager && (
                        <button
                          onClick={() => setShowAddTeamModal(true)}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                        >
                          <PlusIcon className="h-4 w-4" />
                          <span>Ajouter une équipe</span>
                        </button>
                      )}
                    </div>
                    
                    {departmentTeams.length === 0 ? (
                      <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
                        <div className="p-4 bg-gray-200 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <UserGroupIcon className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-lg">Aucune équipe dans ce département</p>
                      </div>
                    ) : (
                       <div className="space-y-4">
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
                             const isExpanded = expandedTeamId === team.id;
                             
                             return (
                               <div key={team.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden">
                                 {/* Team Card */}
                                 <div className="p-6 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200">
                                   <div className="flex items-start justify-between">
                                     <div className="flex-1 cursor-pointer" onClick={() => handleTeamClick(team)}>
                                       <div className="flex items-center space-x-3 mb-3">
                                         <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                                           <UserGroupIcon className="h-5 w-5 text-white" />
                                         </div>
                                         <div>
                                           <h5 className="font-bold text-gray-900 text-lg">{team.name}</h5>
                                           {isUserTeam && (
                                             <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-400 to-green-600 text-white">
                                               Mon équipe
                                             </span>
                                           )}
                                         </div>
                                       </div>
                                       <p className="text-gray-600 mb-4 leading-relaxed">
                                         {team.description || 'Aucune description'}
                                       </p>
                                       <div className="flex items-center space-x-6 text-sm text-gray-500">
                                         <span className="flex items-center space-x-2">
                                           <UsersIcon className="h-4 w-4" />
                                           <span>{team.membersCount || 0} membre(s)</span>
                                         </span>
                                         {team.manager && (
                                           <span className="flex items-center space-x-2">
                                             <AcademicCapIcon className="h-4 w-4" />
                                             <span>{team.manager.firstName} {team.manager.lastName}</span>
                                           </span>
                                         )}
                                       </div>
                                     </div>
                                     <div className="flex items-center space-x-2">
                                       {/* Only show edit button for admins, not managers */}
                                       {user?.role === 'admin' && (
                                         <button
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             // Add department information to the team object
                                             const teamWithDepartment = {
                                               ...team,
                                               department: {
                                                 id: department.id,
                                                 name: department.name,
                                                 description: department.description
                                               }
                                             };
                                             setSelectedTeam(teamWithDepartment);
                                             setShowTeamDetailModal(true);
                                           }}
                                           className="p-2 text-blue-600 hover:text-blue-800 rounded-xl hover:bg-blue-100 transition-all duration-200"
                                           title="Voir les détails de l'équipe"
                                         >
                                           <PencilIcon className="h-5 w-5" />
                                         </button>
                                       )}
                                       {isDepartmentManager && (
                                         <button
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             confirmRemoveTeamFromDepartment(team);
                                           }}
                                           className="p-2 text-red-600 hover:text-red-800 rounded-xl hover:bg-red-100 transition-all duration-200"
                                           title="Retirer l'équipe du département"
                                         >
                                           <TrashIcon className="h-5 w-5" />
                                         </button>
                                       )}
                                     </div>
                                   </div>
                                 </div>
                                 
                                 {/* Expanded Team Members Section */}
                                 {isExpanded && team.members && team.members.length > 0 && (
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
                                             onClick={() => handleUserClick(member)}
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
                             );
                           })}
                       </div>
                     )}
                   </div>
                 )}

                {/* Employees Tab */}
                {activeTab === 'employees' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-900">Employés du département</h3>
                      {isDepartmentManager && (
                        <button
                          onClick={() => setShowAddUserModal(true)}
                          className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-xl text-sm hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                        >
                          <PlusIcon className="h-4 w-4" />
                          <span>Ajouter un utilisateur</span>
                        </button>
                      )}
                    </div>
                    
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
                             className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 p-6"
                           >
                             <div className="flex items-center justify-between">
                               <div className="flex items-center space-x-4 cursor-pointer" onClick={() => handleUserClick(employee)}>
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
                                 {employee.team && (
                                   <span className="text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full font-medium">
                                     {employee.team.name}
                                   </span>
                                 )}
                                 {isDepartmentManager && (
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       confirmRemoveUserFromDepartment(employee);
                                     }}
                                     className="p-2 text-red-600 hover:text-red-800 rounded-xl hover:bg-red-100 transition-all duration-200"
                                     title="Retirer du département"
                                   >
                                     <TrashIcon className="h-5 w-5" />
                                   </button>
                                 )}
                               </div>
                             </div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 )}
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

      {/* Team Detail Modal */}
      <TeamDetailModal
        team={selectedTeam}
        isOpen={showTeamDetailModal}
        onClose={handleTeamDetailClose}
        onTeamUpdated={() => {
          // Reload department data when team is updated
          loadDepartmentData();
        }}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        user={selectedUser}
        isOpen={showUserProfileModal}
        onClose={handleUserProfileClose}
      />

                {/* Add Team Modal */}
                {showAddTeamModal && (
                  <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-[70] backdrop-blur-sm">
                    <div className="relative top-10 mx-auto p-8 border-0 w-11/12 max-w-md shadow-2xl rounded-3xl bg-white">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                            <UserGroupIcon className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900">Ajouter une équipe au département</h3>
                        </div>
                        <button
                          onClick={() => setShowAddTeamModal(false)}
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                        >
                          <XMarkIcon className="h-5 w-5 text-gray-500" />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Sélectionner une équipe</label>
                          {availableTeams.length > 0 ? (
                            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl">
                              {availableTeams.map((team) => (
                                <div
                                  key={team.id}
                                  onClick={() => setSelectedTeamToAdd(team.id)}
                                  className={`p-4 cursor-pointer hover:bg-blue-50 flex items-center space-x-3 transition-all duration-200 ${
                                    selectedTeamToAdd === team.id ? 'bg-blue-100 border-l-4 border-blue-500' : ''
                                  }`}
                                >
                                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                                    <UserGroupIcon className="h-5 w-5 text-white" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900">{team.name}</p>
                                    <p className="text-sm text-gray-500">{team.description || 'Aucune description'}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 bg-gray-50 rounded-xl">
                              <p className="text-gray-500">Aucune équipe disponible</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                        <button
                          onClick={() => {
                            setShowAddTeamModal(false);
                            setSelectedTeamToAdd('');
                          }}
                          className="bg-gray-300 text-gray-700 px-6 py-2 rounded-xl hover:bg-gray-400 transition-all duration-200 font-medium"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={handleAddTeamToDepartment}
                          disabled={loading || !selectedTeamToAdd}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50"
                        >
                          {loading ? 'Ajout...' : 'Ajouter'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

         {/* Create Team Modal */}
         {showCreateTeamModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateTeamModal(false)}></div>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Créer une nouvelle équipe</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'équipe</label>
                      <input
                        type="text"
                        value={newTeam.name}
                        onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nom de l'équipe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={newTeam.description}
                        onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Description de l'équipe"
                        rows={3}
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
                        {allUsers.filter(user => user.role === 'manager' && user.status === 'active').map(user => (
                          <option key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={handleCreateTeam}
                    disabled={loading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {loading ? 'Création...' : 'Créer'}
                  </button>
                  <button
                    onClick={() => setShowCreateTeamModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

                {/* Add User Modal */}
                {showAddUserModal && (
                  <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-[70] backdrop-blur-sm">
                    <div className="relative top-10 mx-auto p-8 border-0 w-11/12 max-w-md shadow-2xl rounded-3xl bg-white">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                            <UsersIcon className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900">Ajouter un utilisateur au département</h3>
                        </div>
                        <button
                          onClick={() => setShowAddUserModal(false)}
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                        >
                          <XMarkIcon className="h-5 w-5 text-gray-500" />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Sélectionner un utilisateur</label>
                          {availableUsers.length > 0 ? (
                            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl">
                              {availableUsers.map((user) => (
                                <div
                                  key={user.id}
                                  onClick={() => setSelectedUserToAdd(user.id)}
                                  className={`p-4 cursor-pointer hover:bg-green-50 flex items-center space-x-3 transition-all duration-200 ${
                                    selectedUserToAdd === user.id ? 'bg-green-100 border-l-4 border-green-500' : ''
                                  }`}
                                >
                                  <Avatar
                                    src={user.profilePictureUrl}
                                    alt={`${user.firstName} ${user.lastName}`}
                                    size="md"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <p className="font-semibold text-gray-900">
                                        {user.firstName} {user.lastName}
                                      </p>
                                      {user.status === 'inactive' && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                          Inactif
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 bg-gray-50 rounded-xl">
                              <p className="text-gray-500">Aucun utilisateur disponible</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                        <button
                          onClick={() => {
                            setShowAddUserModal(false);
                            setSelectedUserToAdd('');
                          }}
                          className="bg-gray-300 text-gray-700 px-6 py-2 rounded-xl hover:bg-gray-400 transition-all duration-200 font-medium"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={handleAddUserToDepartment}
                          disabled={loading || !selectedUserToAdd}
                          className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50"
                        >
                          {loading ? 'Ajout...' : 'Ajouter'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Change Manager Modal */}
                {showChangeManagerModal && (
                  <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-[70] backdrop-blur-sm">
                    <div className="relative top-10 mx-auto p-8 border-0 w-11/12 max-w-md shadow-2xl rounded-3xl bg-white">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                            <AcademicCapIcon className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900">Changer le manager du département</h3>
                        </div>
                        <button
                          onClick={() => setShowChangeManagerModal(false)}
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                        >
                          <XMarkIcon className="h-5 w-5 text-gray-500" />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sélectionner le manager
                          </label>
                          <select
                            value={selectedManager}
                            onChange={(e) => setSelectedManager(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                          >
                            <option value="">Sélectionner un manager</option>
                            {allUsers
                              .filter(user => user.role === 'manager' && user.status === 'active')
                              .map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.firstName} {user.lastName} ({user.email})
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                        <button
                          onClick={() => {
                            setSelectedManager('');
                            setShowChangeManagerModal(false);
                          }}
                          className="bg-gray-300 text-gray-700 px-6 py-2 rounded-xl hover:bg-gray-400 transition-all duration-200 font-medium"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={handleChangeManager}
                          disabled={loading || !selectedManager}
                          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-2 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50"
                        >
                          {loading ? 'Mise à jour...' : 'Changer le manager'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

        {/* Confirmation Modals */}
        <ConfirmationModal
          isOpen={showDeleteTeamConfirmation}
          onClose={() => {
            setShowDeleteTeamConfirmation(false);
            setTeamToDelete(null);
          }}
          onConfirm={handleConfirmRemoveTeam}
          title="Retirer l'équipe du département"
          message={`Êtes-vous sûr de vouloir retirer l'équipe "${teamToDelete?.name}" du département "${department.name}" ? L'équipe ne sera pas supprimée, seulement retirée du département.`}
          confirmText="Retirer"
          cancelText="Annuler"
          confirmButtonColor="red"
        />

        <ConfirmationModal
          isOpen={showRemoveUserConfirmation}
          onClose={() => {
            setShowRemoveUserConfirmation(false);
            setUserToRemove(null);
          }}
          onConfirm={handleConfirmRemoveUser}
          title="Retirer l'utilisateur du département"
          message={`Êtes-vous sûr de vouloir retirer ${userToRemove ? `${userToRemove.firstName} ${userToRemove.lastName}` : 'cet utilisateur'} du département ?`}
          confirmText="Retirer"
          cancelText="Annuler"
          confirmButtonColor="red"
        />
      </>
    );
  };

export default DepartmentDetailModal;
