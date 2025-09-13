import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  UsersIcon,
  AcademicCapIcon,
  EnvelopeIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';
import Avatar from '../common/Avatar';
import UserProfileModal from '../admin/UserProfileModal';

const MyOrganization = () => {
  const { user, isAuthLoading } = useAuth();
  const [organizationData, setOrganizationData] = useState({
    departments: [],
    teams: [],
    colleagues: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);

  useEffect(() => {
    if (isAuthLoading || !user) {
      return;
    }
    loadOrganizationData();
  }, [isAuthLoading, user]);

  const loadOrganizationData = async () => {
    try {
      setLoading(true);
      const data = await dataService.getMyOrganization();
      setOrganizationData(data);
      
      console.log('Loaded organization data:', {
        departments: data.departments.length,
        teams: data.teams.length,
        colleagues: data.colleagues.length
      });
    } catch (error) {
      console.error('Error loading organization data:', error);
      toast.error('Erreur lors du chargement des données organisationnelles');
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setShowUserProfileModal(true);
  };

  const handleUserProfileClose = () => {
    setShowUserProfileModal(false);
    setSelectedUser(null);
  };

  const getRoleBadge = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-blue-100 text-blue-800',
      employee: 'bg-green-100 text-green-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mon Organisation</h1>
        <p className="text-gray-600">
          Découvrez votre place dans l'organisation et connectez-vous avec vos collègues
        </p>
      </div>

      {/* Departments Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <BuildingOfficeIcon className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Mes Départements</h2>
            <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
              {organizationData.departments.length}
            </span>
          </div>
        </div>
        <div className="p-6">
          {organizationData.departments.length === 0 ? (
            <div className="text-center py-8">
              <BuildingOfficeIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Vous n'êtes pas encore assigné à un département</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {organizationData.departments.map((department) => (
                <div
                  key={department.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-medium text-gray-900 mb-1">{department.name}</h3>
                  <p className="text-sm text-gray-500">
                    {department.description || 'Aucune description'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Teams Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <UserGroupIcon className="h-6 w-6 text-green-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Mes Équipes</h2>
            <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
              {organizationData.teams.length}
            </span>
          </div>
        </div>
        <div className="p-6">
          {organizationData.teams.length === 0 ? (
            <div className="text-center py-8">
              <UserGroupIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Vous n'êtes pas encore membre d'une équipe</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {organizationData.teams.map((team) => (
                <div
                  key={team.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-medium text-gray-900 mb-1">{team.name}</h3>
                  <p className="text-sm text-gray-500 mb-2">
                    {team.description || 'Aucune description'}
                  </p>
                  {team.department && (
                    <div className="flex items-center text-xs text-gray-400">
                      <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                      {team.department.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Colleagues Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <UsersIcon className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Mes Collègues</h2>
            <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
              {organizationData.colleagues.length}
            </span>
          </div>
        </div>
        <div className="p-6">
          {organizationData.colleagues.length === 0 ? (
            <div className="text-center py-8">
              <UsersIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Aucun collègue trouvé dans vos départements et équipes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {organizationData.colleagues.map((colleague) => (
                <div
                  key={colleague.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => handleUserClick(colleague)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar
                      src={colleague.profilePictureUrl}
                      alt={`${colleague.firstName} ${colleague.lastName}`}
                      size="md"
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        {colleague.firstName} {colleague.lastName}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <BriefcaseIcon className="h-4 w-4 mr-1" />
                          {colleague.jobTitle || 'Aucun poste'}
                        </span>
                        <span className="flex items-center">
                          <EnvelopeIcon className="h-4 w-4 mr-1" />
                          {colleague.email}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getRoleBadge(colleague.role)}`}>
                      {colleague.role === 'admin' ? 'Administrateur' : 
                       colleague.role === 'manager' ? 'Manager' : 'Employé'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        user={selectedUser}
        isOpen={showUserProfileModal}
        onClose={handleUserProfileClose}
      />
    </div>
  );
};

export default MyOrganization;






