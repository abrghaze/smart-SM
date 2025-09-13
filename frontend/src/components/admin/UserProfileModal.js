import React, { useState, useEffect } from 'react';
import dataService from '../../services/dataService';
import {
  XMarkIcon,
  UserIcon,
  AcademicCapIcon,
  UserGroupIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { getProfilePictureUrl } from '../../utils/imageUtils';

const getRoleColor = (role) => {
  switch (role) {
    case 'admin':
      return 'bg-blue-100 text-blue-800';
    case 'manager':
      return 'bg-green-100 text-green-800';
    case 'employee':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getRoleLabel = (role) => {
  switch (role) {
    case 'admin':
      return 'Administrateur';
    case 'manager':
      return 'Manager';
    case 'employee':
      return 'Employé';
    default:
      return role;
  }
};

const getSkillLevelColor = (level) => {
  if (level >= 4) return 'bg-green-100 text-green-800';
  if (level >= 3) return 'bg-yellow-100 text-yellow-800';
  if (level >= 2) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
};

const UserProfileModal = ({ user, isOpen, onClose }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchUserProfile();
    }
  }, [isOpen, user]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const profile = await dataService.getPublicUserProfile(user.id);
      setUserProfile(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Profil Utilisateur</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {userProfile && !loading && (
          <div className="space-y-6">
            {/* User Header */}
            <div className="text-center">
              <div className="relative inline-block mb-4">
                {userProfile.profilePictureUrl ? (
                  <img
                    src={getProfilePictureUrl(userProfile.profilePictureUrl)}
                    alt={`${userProfile.firstName} ${userProfile.lastName}`}
                    className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-gray-100 shadow-sm"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto border-4 border-gray-100 shadow-sm">
                    <UserIcon className="w-12 h-12 text-white" />
                  </div>
                )}
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                {userProfile.firstName} {userProfile.lastName}
              </h2>
              <p className="text-gray-600 mb-2">{userProfile.jobTitle}</p>
              
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(userProfile.role)}`}>
                {getRoleLabel(userProfile.role)}
              </span>
            </div>

            {/* Skills Section */}
            {userProfile.skills && userProfile.skills.length > 0 && (
              <div>
                <div className="flex items-center mb-3">
                  <AcademicCapIcon className="w-5 h-5 text-gray-500 mr-2" />
                  <h4 className="text-md font-medium text-gray-900">Compétences</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {userProfile.skills.map((skill) => (
                    <div key={skill.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium text-gray-900">{skill.name}</h5>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSkillLevelColor(skill.level)}`}>
                          Niveau {skill.level}
                        </span>
                      </div>
                      {skill.category && (
                        <p className="text-sm text-gray-600 mb-1">Catégorie: {skill.category}</p>
                      )}
                      {skill.description && (
                        <p className="text-sm text-gray-500">{skill.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teams Section */}
            {userProfile.teams && userProfile.teams.length > 0 && (
              <div>
                <div className="flex items-center mb-3">
                  <UserGroupIcon className="w-5 h-5 text-gray-500 mr-2" />
                  <h4 className="text-md font-medium text-gray-900">Équipes</h4>
                </div>
                <div className="space-y-2">
                  {userProfile.teams.map((team) => (
                    <div key={team.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-medium text-gray-900">{team.name}</h5>
                          {team.description && (
                            <p className="text-sm text-gray-600 mt-1">{team.description}</p>
                          )}
                        </div>
                        <span className="text-sm text-gray-500 capitalize">
                          {team.roleInTeam}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Departments Section */}
            {userProfile.departments && userProfile.departments.length > 0 && (
              <div>
                <div className="flex items-center mb-3">
                  <BuildingOfficeIcon className="w-5 h-5 text-gray-500 mr-2" />
                  <h4 className="text-md font-medium text-gray-900">Départements</h4>
                </div>
                <div className="space-y-2">
                  {userProfile.departments.map((department) => (
                    <div key={department.id} className="bg-gray-50 rounded-lg p-3">
                      <h5 className="font-medium text-gray-900">{department.name}</h5>
                      {department.description && (
                        <p className="text-sm text-gray-600 mt-1">{department.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Member Since */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Membre depuis le {new Date(userProfile.createdAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
