import React, { useState, useEffect } from 'react';
import dataService from '../../services/dataService';
import {
  XMarkIcon,
  UserIcon,
  AcademicCapIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  CalendarIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { getProfilePictureUrl } from '../../utils/imageUtils';

const getRoleColor = (role) => {
  switch (role) {
    case 'admin':
      return 'bg-gradient-to-r from-red-500 to-rose-500 text-white';
    case 'manager':
      return 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white';
    case 'employee':
      return 'bg-gradient-to-r from-emerald-500 to-green-500 text-white';
    default:
      return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
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
  if (level >= 4) return 'from-emerald-500 to-green-500';
  if (level >= 3) return 'from-blue-500 to-indigo-500';
  if (level >= 2) return 'from-amber-500 to-orange-500';
  return 'from-red-500 to-rose-500';
};

const getGradient = (name) => {
  const hash = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-pink-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-cyan-500 to-blue-600',
  ];
  return gradients[hash % gradients.length];
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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop with blur */}
      <div 
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity animate-fade-in" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in">
          {/* Header Background */}
          <div className={`h-32 bg-gradient-to-r ${getGradient(userProfile?.firstName || user?.firstName)} relative`}>
            <div className="absolute inset-0 bg-black/10" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-200 backdrop-blur-sm"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Profile Content */}
          <div className="px-8 pb-8">
            {/* Avatar */}
            <div className="relative -mt-16 mb-4 flex justify-center">
              {userProfile?.profilePictureUrl || user?.profilePictureUrl ? (
                <img
                  src={getProfilePictureUrl(userProfile?.profilePictureUrl || user?.profilePictureUrl)}
                  alt={`${userProfile?.firstName || user?.firstName} ${userProfile?.lastName || user?.lastName}`}
                  className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-xl"
                />
              ) : (
                <div className={`w-28 h-28 bg-gradient-to-br ${getGradient(userProfile?.firstName || user?.firstName)} rounded-2xl flex items-center justify-center border-4 border-white shadow-xl`}>
                  <span className="text-3xl font-bold text-white">
                    {(userProfile?.firstName || user?.firstName)?.[0]}{(userProfile?.lastName || user?.lastName)?.[0]}
                  </span>
                </div>
              )}
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Chargement du profil...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-6 mb-6 text-center">
                <p className="text-red-600 font-medium">{error}</p>
              </div>
            )}

            {userProfile && !loading && (
              <div className="space-y-6">
                {/* User Info Header */}
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {userProfile.firstName} {userProfile.lastName}
                  </h2>
                  <p className="text-gray-500 font-medium mb-3">{userProfile.jobTitle || 'Poste non défini'}</p>
                  
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${getRoleColor(userProfile.role)} shadow-lg`}>
                    <StarIcon className="w-4 h-4 mr-2" />
                    {getRoleLabel(userProfile.role)}
                  </span>
                </div>

                {/* Skills Section */}
                {userProfile.skills && userProfile.skills.length > 0 && (
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <div className="flex items-center mb-4">
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl mr-3">
                        <AcademicCapIcon className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-lg font-bold text-gray-900">Compétences</h4>
                      <span className="ml-auto text-sm font-semibold text-gray-500 bg-white px-3 py-1 rounded-full">
                        {userProfile.skills.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {userProfile.skills.map((skill) => (
                        <div key={skill.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-semibold text-gray-900">{skill.name}</h5>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-gradient-to-r ${getSkillLevelColor(skill.level)} shadow-sm`}>
                              Niveau {skill.level}
                            </span>
                          </div>
                          {skill.category && (
                            <p className="text-xs font-medium text-gray-500 bg-gray-100 inline-block px-2 py-1 rounded-lg">
                              {skill.category}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Teams Section */}
                {userProfile.teams && userProfile.teams.length > 0 && (
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <div className="flex items-center mb-4">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl mr-3">
                        <UserGroupIcon className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-lg font-bold text-gray-900">Équipes</h4>
                      <span className="ml-auto text-sm font-semibold text-gray-500 bg-white px-3 py-1 rounded-full">
                        {userProfile.teams.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {userProfile.teams.map((team) => (
                        <div key={team.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-semibold text-gray-900">{team.name}</h5>
                              {team.description && (
                                <p className="text-sm text-gray-500 mt-1">{team.description}</p>
                              )}
                            </div>
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg capitalize">
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
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <div className="flex items-center mb-4">
                      <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl mr-3">
                        <BuildingOfficeIcon className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-lg font-bold text-gray-900">Départements</h4>
                      <span className="ml-auto text-sm font-semibold text-gray-500 bg-white px-3 py-1 rounded-full">
                        {userProfile.departments.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {userProfile.departments.map((department) => (
                        <div key={department.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                          <h5 className="font-semibold text-gray-900">{department.name}</h5>
                          {department.description && (
                            <p className="text-sm text-gray-500 mt-1">{department.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Member Since Footer */}
                <div className="flex items-center justify-center pt-4 border-t border-gray-100">
                  <CalendarIcon className="w-4 h-4 text-gray-400 mr-2" />
                  <p className="text-sm text-gray-500 font-medium">
                    Membre depuis le {new Date(userProfile.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-center mt-6">
              <button
                onClick={onClose}
                className="px-8 py-3 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-xl font-semibold hover:from-gray-800 hover:to-gray-900 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
