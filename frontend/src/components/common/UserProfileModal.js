import React, { useState, useEffect, useCallback } from 'react';
import { 
  XMarkIcon, 
  UserIcon, 
  AcademicCapIcon, 
  UserGroupIcon, 
  BuildingOfficeIcon,
  StarIcon,
  BoltIcon,
  ChartBarIcon,
  CalendarIcon,
  BriefcaseIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { getProfilePictureUrl } from '../../utils/imageUtils';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';

const UserProfileModal = ({ isOpen, onClose, userId, currentUserJobTitles = [] }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserProfile();
    }
  }, [isOpen, userId]);

  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const profile = await dataService.getPublicUserProfile(userId);
      setUserProfile(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const handleSetOfficialJobTitle = async (jobTitleId) => {
    try {
      await dataService.setOfficialJobTitle(jobTitleId);
      toast.success('Titre de poste officiel mis à jour avec succès');
      // Refresh the profile to show updated data
      await fetchUserProfile();
    } catch (error) {
      console.error('Error setting official job title:', error);
      toast.error('Erreur lors de la mise à jour du titre de poste officiel');
    }
  };

  // Helper function to check if current user has a specific job title
  const currentUserHasJobTitle = (jobTitleId) => {
    return currentUserJobTitles.some(jt => jt.id === jobTitleId);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-gradient-to-br from-red-500 via-red-600 to-red-700 text-white shadow-lg';
      case 'manager':
        return 'bg-gradient-to-br from-green-500 via-green-600 to-green-700 text-white shadow-lg';
      case 'employee':
        return 'bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white shadow-lg';
      default:
        return 'bg-gradient-to-br from-gray-500 via-gray-600 to-gray-700 text-white shadow-lg';
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
    if (level >= 4) return 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 text-white shadow-lg';
    if (level >= 3) return 'bg-gradient-to-br from-yellow-500 via-yellow-600 to-yellow-700 text-white shadow-lg';
    if (level >= 2) return 'bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white shadow-lg';
    return 'bg-gradient-to-br from-red-500 via-red-600 to-red-700 text-white shadow-lg';
  };

  const getSkillLevelIcon = (level) => {
    if (level >= 4) return <StarIcon className="w-4 h-4" />;
    if (level >= 3) return <ChartBarIcon className="w-4 h-4" />;
    if (level >= 2) return <BoltIcon className="w-4 h-4" />;
    return <UserIcon className="w-4 h-4" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 overflow-y-auto h-full w-full z-50 backdrop-blur-md">
      <div className="relative top-10 mx-auto p-8 border-0 w-11/12 max-w-5xl shadow-2xl rounded-3xl bg-gradient-to-br from-white via-gray-50 to-white">
        {/* Enhanced Header */}
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <UserIcon className="w-9 h-9 text-white" />
            </div>
            <div>
              <h3 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Profil Utilisateur
              </h3>
              <p className="text-lg text-gray-600 mt-2 font-medium">Informations détaillées de l'utilisateur</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 transform"
          >
            <XMarkIcon className="w-7 h-7 text-gray-600" />
          </button>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-8"></div>
              <p className="text-gray-600 text-xl font-medium">Chargement du profil...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-gradient-to-r from-red-50 via-red-100 to-red-200 border border-red-300 rounded-3xl p-10 mb-10 shadow-xl">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mr-6 shadow-lg">
                <XMarkIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-red-800 font-bold text-xl">{error}</p>
                <p className="text-red-600 text-lg">Veuillez réessayer plus tard</p>
              </div>
            </div>
          </div>
        )}

        {userProfile && !loading && (
          <div className="space-y-10">
            {/* Enhanced User Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-3xl p-10 border border-indigo-200 shadow-2xl">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full -mr-20 -mt-20 opacity-30 animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full -ml-16 -mb-16 opacity-30 animate-pulse"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-br from-pink-200 to-indigo-200 rounded-full opacity-20 animate-pulse"></div>
              
              <div className="relative text-center">
                <div className="relative inline-block mb-10">
                  {userProfile.profilePictureUrl ? (
                    <img
                      src={getProfilePictureUrl(userProfile.profilePictureUrl)}
                      alt={`${userProfile.firstName} ${userProfile.lastName}`}
                      className="w-48 h-48 rounded-full object-cover mx-auto border-6 border-white shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className="w-48 h-48 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto border-6 border-white shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105">
                      <UserIcon className="w-24 h-24 text-white" />
                    </div>
                  )}
                  <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full border-4 border-white shadow-xl flex items-center justify-center">
                    <div className="w-5 h-5 bg-white rounded-full"></div>
                  </div>
                </div>
                
                <h2 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent mb-4">
                  {userProfile.firstName} {userProfile.lastName}
                </h2>
                <p className="text-2xl text-gray-600 mb-8 font-medium">{userProfile.jobTitle}</p>
                
                <span className={`inline-flex items-center px-8 py-4 rounded-full text-lg font-bold ${getRoleColor(userProfile.role)} shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105`}>
                  {getRoleLabel(userProfile.role)}
                </span>
              </div>
            </div>

            {/* Enhanced Skills Section */}
            {userProfile.skills && userProfile.skills.length > 0 && (
              <div className="bg-white rounded-3xl p-10 border border-gray-200 shadow-2xl">
                <div className="flex items-center mb-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center mr-6 shadow-xl">
                    <AcademicCapIcon className="w-9 h-9 text-white" />
                  </div>
                  <div>
                    <h4 className="text-3xl font-bold text-gray-900">Compétences</h4>
                    <p className="text-xl text-gray-600">{userProfile.skills.length} compétence(s) maîtrisée(s)</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {userProfile.skills.map((skill) => (
                    <div key={skill.id} className="bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-3xl p-8 border border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
                      <div className="flex justify-between items-start mb-6">
                        <h5 className="font-bold text-gray-900 text-2xl group-hover:text-indigo-600 transition-colors">{skill.name}</h5>
                        <span className={`px-6 py-3 rounded-full text-lg font-bold ${getSkillLevelColor(skill.level)} shadow-xl flex items-center space-x-3`}>
                          {getSkillLevelIcon(skill.level)}
                          <span>Niveau {skill.level}</span>
                        </span>
                      </div>
                      {skill.category && (
                        <p className="text-lg text-gray-600 mb-4 font-semibold bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-2 rounded-full inline-block">
                          {skill.category}
                        </p>
                      )}
                      {skill.description && (
                        <p className="text-lg text-gray-500 leading-relaxed">{skill.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced Teams Section */}
            {userProfile.teams && userProfile.teams.length > 0 && (
              <div className="bg-white rounded-3xl p-10 border border-gray-200 shadow-2xl">
                <div className="flex items-center mb-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 via-emerald-500 to-green-600 rounded-3xl flex items-center justify-center mr-6 shadow-xl">
                    <UserGroupIcon className="w-9 h-9 text-white" />
                  </div>
                  <div>
                    <h4 className="text-3xl font-bold text-gray-900">Équipes</h4>
                    <p className="text-xl text-gray-600">{userProfile.teams.length} équipe(s) rejoint(s)</p>
                  </div>
                </div>
                <div className="space-y-8">
                  {userProfile.teams.map((team) => (
                    <div key={team.id} className="bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-3xl p-8 border border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="font-bold text-gray-900 text-2xl mb-4 group-hover:text-green-600 transition-colors">{team.name}</h5>
                          {team.description && (
                            <p className="text-lg text-gray-600 leading-relaxed mb-6">{team.description}</p>
                          )}
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-lg text-gray-500 font-medium">Équipe active</span>
                          </div>
                        </div>
                        <span className="ml-8 px-6 py-3 bg-gradient-to-br from-green-500 via-green-600 to-green-700 text-white rounded-full text-lg font-bold capitalize shadow-xl">
                          {team.roleInTeam}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced Departments Section */}
            {userProfile.departments && userProfile.departments.length > 0 && (
              <div className="bg-white rounded-3xl p-10 border border-gray-200 shadow-2xl">
                <div className="flex items-center mb-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 rounded-3xl flex items-center justify-center mr-6 shadow-xl">
                    <BuildingOfficeIcon className="w-9 h-9 text-white" />
                  </div>
                  <div>
                    <h4 className="text-3xl font-bold text-gray-900">Départements</h4>
                    <p className="text-xl text-gray-600">{userProfile.departments.length} département(s) assigné(s)</p>
                  </div>
                </div>
                <div className="space-y-8">
                  {userProfile.departments.map((department) => (
                    <div key={department.id} className="bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-3xl p-8 border border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
                      <h5 className="font-bold text-gray-900 text-2xl mb-4 group-hover:text-orange-600 transition-colors">{department.name}</h5>
                      {department.description && (
                        <p className="text-lg text-gray-600 leading-relaxed">{department.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced Job Titles Section */}
            {userProfile.currentJobTitles && userProfile.currentJobTitles.length > 0 ? (
              <div className="bg-white rounded-3xl p-10 border border-gray-200 shadow-2xl">
                <div className="flex items-center mb-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mr-6 shadow-xl">
                    <BriefcaseIcon className="w-9 h-9 text-white" />
                  </div>
                  <div>
                    <h4 className="text-3xl font-bold text-gray-900">Titres de Poste</h4>
                    <p className="text-xl text-gray-600">{userProfile.currentJobTitles.length} titre(s) de poste assigné(s)</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {userProfile.currentJobTitles.map((jobTitle) => {
                    const hasJobTitle = currentUserHasJobTitle(jobTitle.id);
                    const isOfficial = userProfile.officialJobTitle?.id === jobTitle.id;
                    
                    return (
                    <div 
                      key={jobTitle.id} 
                      className={`rounded-3xl p-8 border-2 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group ${
                        isOfficial 
                          ? 'border-purple-500 bg-gradient-to-br from-purple-50 via-white to-purple-50' 
                          : hasJobTitle
                          ? 'border-green-500 bg-gradient-to-br from-green-50 via-white to-green-50'
                          : 'border-gray-200 bg-gradient-to-br from-gray-50 via-white to-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-6">
                        <h5 className="font-bold text-gray-900 text-2xl group-hover:text-purple-600 transition-colors">
                          {jobTitle.title}
                        </h5>
                        <div className="flex items-center space-x-2">
                          {isOfficial ? (
                            <div className="flex items-center space-x-2">
                              <CheckIcon className="h-6 w-6 text-purple-600" />
                              <span className="text-sm text-purple-600 font-bold bg-purple-100 px-3 py-1 rounded-full">
                                Officiel
                              </span>
                            </div>
                          ) : hasJobTitle ? (
                            <div className="flex items-center space-x-2">
                              <CheckIcon className="h-6 w-6 text-green-600" />
                              <span className="text-sm text-green-600 font-bold bg-green-100 px-3 py-1 rounded-full">
                                Possédé
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-500 font-bold bg-gray-100 px-3 py-1 rounded-full">
                                Non possédé
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {jobTitle.description && (
                        <p className="text-lg text-gray-600 leading-relaxed">{jobTitle.description}</p>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-10 border border-gray-200 shadow-2xl">
                <div className="flex items-center mb-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mr-6 shadow-xl">
                    <BriefcaseIcon className="w-9 h-9 text-white" />
                  </div>
                  <div>
                    <h4 className="text-3xl font-bold text-gray-900">Titres de Poste</h4>
                    <p className="text-xl text-gray-600">Aucun titre de poste assigné</p>
                  </div>
                </div>
                <div className="text-center py-8">
                  <BriefcaseIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucun titre de poste assigné</p>
                </div>
              </div>
            )}

            {/* Enhanced Member Since */}
            <div className="text-center pt-10 border-t border-gray-200">
              <div className="bg-gradient-to-r from-gray-50 via-gray-100 to-gray-200 rounded-3xl p-8 inline-block shadow-xl">
                <div className="flex items-center justify-center space-x-3">
                  <CalendarIcon className="w-8 h-8 text-gray-600" />
                  <p className="text-lg text-gray-700 font-bold">
                    Membre depuis le {new Date(userProfile.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Footer */}
        <div className="flex justify-end mt-10 pt-10 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-12 py-5 bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 hover:from-gray-700 hover:via-gray-800 hover:to-gray-900 text-white font-bold rounded-3xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 text-lg"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
