import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import { 
  UserIcon, 
  AcademicCapIcon, 
  UserGroupIcon, 
  BuildingOfficeIcon, 
  CameraIcon, 
  LockClosedIcon, 
  BriefcaseIcon, 
  CheckIcon,
  SparklesIcon,
  StarIcon,
  TrophyIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  CalendarIcon,
  EnvelopeIcon,
  IdentificationIcon
} from '@heroicons/react/24/outline';
import { getProfilePictureUrl } from '../../utils/imageUtils';
import SkillBadge from '../common/SkillBadge';
import SkillRadarChart from './SkillRadarChart';


const Profile = () => {
  const { user, updateProfile, refreshUserData } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPictureModal, setShowPictureModal] = useState(false);
  const [loading, setLoading] = useState(false);

  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    jobTitle: user?.jobTitle || ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [profilePicture, setProfilePicture] = useState(user?.profilePictureUrl || null);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        jobTitle: user.jobTitle || ''
      });
      setProfilePicture(user.profilePictureUrl || null);
    }

  }, [user]);



  const getDepartmentDisplay = () => {
    if (user.departments && user.departments.length > 0) {
      return user.departments.map(d => d.name).join(', ');
    }
    return 'Aucun département';
  };

  const getTeamDisplay = () => {
    if (user.teams && user.teams.length > 0) {
      return user.teams.map(t => t.name).join(', ');
    }
    return 'Aucune équipe';
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Convert to snake_case for backend API
      const profileData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        job_title: formData.jobTitle
      };
      
      await updateProfile(profileData);
      setIsEditing(false);
      toast.success('Profil mis à jour avec succès');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      jobTitle: user?.jobTitle || ''
    });
    setIsEditing(false);
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      setLoading(true);
      await dataService.changePassword(passwordData.currentPassword, passwordData.newPassword);
      toast.success('Mot de passe modifié avec succès');
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePicture(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadPicture = async () => {
    if (!selectedFile) {
      toast.error('Veuillez sélectionner une image');
      return;
    }
    
    try {
      setLoading(true);
      const response = await dataService.uploadFile(selectedFile);
      // Use profileUrl for displaying the image (no authentication required)
      const fileUrl = response.profileUrl || response.url || response.fileUrl;
      setProfilePicture(fileUrl);
      
      // Update profile with the new picture URL in snake_case format
      const profileData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        job_title: formData.jobTitle,
        profile_picture_url: fileUrl
      };
      
      await updateProfile(profileData);
      toast.success('Photo de profil mise à jour');
      setShowPictureModal(false);
      setSelectedFile(null);
      refreshUserData(); // Refresh user data after successful upload
    } catch (error) {
      console.error('Error uploading picture:', error);
      toast.error('Erreur lors du téléchargement de l\'image');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrateur',
      manager: 'Manager',
      employee: 'Employé'
    };
    return labels[role] || role;
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-blue-100 text-blue-800',
      employee: 'bg-green-100 text-green-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Hero Header with Gradient Background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700"></div>
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative bg-white/10 backdrop-blur-sm border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col lg:flex-row items-center justify-between">
              <div className="text-center lg:text-left text-white mb-8 lg:mb-0">
                <div className="flex items-center justify-center lg:justify-start mb-4">
                  <SparklesIcon className="h-8 w-8 text-yellow-300 mr-3" />
                  <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                    Mon Profil
                  </h1>
                </div>
                <p className="text-xl text-blue-100 mb-6 max-w-2xl">
                  Gérez vos informations personnelles et paramètres
                </p>
                <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                  <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                    <TrophyIcon className="h-5 w-5 text-yellow-300 mr-2" />
                    <span className="text-sm font-medium">Profil Premium</span>
                  </div>
                  <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                    <ShieldCheckIcon className="h-5 w-5 text-green-300 mr-2" />
                    <span className="text-sm font-medium">Sécurisé</span>
                  </div>
                </div>
          </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setShowPasswordModal(true)}
                  className="group flex items-center justify-center px-6 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white hover:bg-white/30 transition-all duration-300 transform hover:scale-105"
            >
                  <LockClosedIcon className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform" />
                  <span className="font-medium">Sécurité</span>
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
                  className="group flex items-center justify-center px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl text-white hover:from-yellow-500 hover:to-orange-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
                  <SparklesIcon className="h-5 w-5 mr-2 group-hover:animate-pulse" />
                  <span className="font-semibold">{isEditing ? 'Annuler' : 'Modifier'}</span>
            </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="space-y-8">
          {/* Profile Card with Modern Design */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 transform hover:scale-105 transition-all duration-300">
            <div className="text-center">
              <div className="relative inline-block mb-6">
                <div className="relative">
                  <div className="w-40 h-40 rounded-full bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 p-1 mx-auto">
                    <div className="w-full h-full rounded-full bg-white p-2">
                  {user.profilePictureUrl ? (
                    <img
                      src={getProfilePictureUrl(user.profilePictureUrl)}
                      alt="Profile"
                          className="w-full h-full rounded-full object-cover shadow-lg"
                    />
                  ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          <UserIcon className="w-20 h-20 text-gray-400" />
                        </div>
                  )}
                    </div>
                </div>
                <button
                  onClick={() => setShowPictureModal(true)}
                    className="absolute -bottom-2 -right-2 p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-110 shadow-lg hover:shadow-xl"
                >
                    <CameraIcon className="h-5 w-5" />
                </button>
                </div>
              </div>
              
              <div className="space-y-3">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                {user.firstName} {user.lastName}
              </h2>
                <div className="flex items-center justify-center text-gray-600">
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  <p className="text-sm">{user.email}</p>
                </div>
              
                <div className="flex items-center justify-center">
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold shadow-lg ${getRoleColor(user.role)}`}>
                    <StarIcon className="h-4 w-4 mr-2" />
                {getRoleLabel(user.role)}
              </span>
            </div>
          </div>
        </div>
          </div>

          {/* Personal Information Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8">
            <div className="flex items-center mb-8">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mr-4">
                <IdentificationIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Informations personnelles
                </h3>
                <p className="text-gray-600">Vos données personnelles et professionnelles</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <UserIcon className="h-4 w-4 mr-2 text-blue-500" />
                  Prénom
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                  />
                ) : (
                  <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                    <p className="text-gray-900 font-medium">{user.firstName}</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <UserIcon className="h-4 w-4 mr-2 text-blue-500" />
                  Nom
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                  />
                ) : (
                  <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                    <p className="text-gray-900 font-medium">{user.lastName}</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <EnvelopeIcon className="h-4 w-4 mr-2 text-green-500" />
                  Email
                </label>
                <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <p className="text-gray-900 font-medium">{user.email}</p>
                  <p className="text-xs text-green-600 mt-1 flex items-center">
                    <ShieldCheckIcon className="h-3 w-3 mr-1" />
                    L'email ne peut pas être modifié
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <BriefcaseIcon className="h-4 w-4 mr-2 text-purple-500" />
                  Poste
                </label>
                {isEditing ? (
                  <select
                    value={user.officialJobTitle?.id || ''}
                    onChange={async (e) => {
                      const jobTitleId = e.target.value ? parseInt(e.target.value) : null;
                      if (jobTitleId) {
                        try {
                          await dataService.setOfficialJobTitle(jobTitleId);
                          toast.success('Titre de poste officiel mis à jour avec succès');
                          await refreshUserData();
                        } catch (error) {
                          console.error('Error setting official job title:', error);
                          toast.error('Erreur lors de la mise à jour du titre de poste officiel');
                        }
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                  >
                    <option value="">Sélectionner un titre de poste</option>
                    {user.currentJobTitles && user.currentJobTitles.map((jobTitle) => (
                      <option key={jobTitle.id} value={jobTitle.id}>
                        {jobTitle.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                    <p className="text-gray-900 font-medium">{user.officialJobTitle?.title || user.jobTitle || 'Non spécifié'}</p>
                  </div>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end space-x-4 mt-8">
                <button
                  onClick={handleCancel}
                  className="group flex items-center px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 transform hover:scale-105"
                >
                  <span className="font-medium">Annuler</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading || !formData.firstName || !formData.lastName}
                  className="group flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      <span className="font-semibold">Sauvegarde...</span>
                    </div>
                  ) : (
                    <span className="font-semibold">Sauvegarder</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Organization Information Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8">
            <div className="flex items-center mb-8">
              <div className="p-3 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-2xl mr-4">
                <BuildingOfficeIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Informations organisationnelles
                </h3>
                <p className="text-gray-600">Votre structure organisationnelle</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                    <BuildingOfficeIcon className="h-6 w-6 text-white" />
                  </div>
                <div>
                    <p className="text-sm font-semibold text-blue-700 mb-1">Département</p>
                    <p className="text-gray-900 font-medium">{getDepartmentDisplay()}</p>
                  </div>
                </div>
              </div>
              
              <div className="group p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-500 rounded-xl group-hover:scale-110 transition-transform">
                    <UserGroupIcon className="h-6 w-6 text-white" />
                  </div>
                <div>
                    <p className="text-sm font-semibold text-green-700 mb-1">Équipe</p>
                    <p className="text-gray-900 font-medium">{getTeamDisplay()}</p>
                  </div>
                </div>
              </div>
              
              <div className="group p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-purple-500 rounded-xl group-hover:scale-110 transition-transform">
                    <AcademicCapIcon className="h-6 w-6 text-white" />
                  </div>
                <div>
                    <p className="text-sm font-semibold text-purple-700 mb-1">Rôle</p>
                    <p className="text-gray-900 font-medium">{getRoleLabel(user.role)}</p>
                  </div>
                </div>
              </div>
              
              <div className="group p-6 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl border border-orange-200 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-orange-500 rounded-xl group-hover:scale-110 transition-transform">
                    <CalendarIcon className="h-6 w-6 text-white" />
                  </div>
                <div>
                    <p className="text-sm font-semibold text-orange-700 mb-1">Membre depuis</p>
                    <p className="text-gray-900 font-medium">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* Job Titles Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8">
            <div className="flex items-center mb-8">
              <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl mr-4">
                <BriefcaseIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Mes Titres de Poste
                </h3>
                <p className="text-gray-600">Vos rôles et responsabilités professionnelles</p>
        </div>
      </div>

        {user.currentJobTitles && user.currentJobTitles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {user.currentJobTitles.map((jobTitle) => (
              <div 
                key={jobTitle.id} 
                    className={`group p-6 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                  user.officialJobTitle?.id === jobTitle.id 
                        ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg' 
                        : 'border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-3">
                          <div className={`p-2 rounded-xl mr-3 ${
                            user.officialJobTitle?.id === jobTitle.id 
                              ? 'bg-blue-500' 
                              : 'bg-gray-400'
                          }`}>
                            <BriefcaseIcon className="h-5 w-5 text-white" />
                          </div>
                          <h4 className="font-bold text-gray-900 text-lg">{jobTitle.title}</h4>
                        </div>
                    {jobTitle.description && (
                          <p className="text-sm text-gray-600 leading-relaxed">{jobTitle.description}</p>
                    )}
                  </div>
                  {user.officialJobTitle?.id === jobTitle.id && (
                        <div className="flex items-center space-x-2 bg-blue-500 text-white px-3 py-1 rounded-full">
                          <CheckIcon className="h-4 w-4" />
                          <span className="text-xs font-semibold">Officiel</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
              <div className="text-center py-12">
                <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl inline-block mb-4">
                  <BriefcaseIcon className="h-16 w-16 text-gray-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-700 mb-2">Aucun titre de poste assigné</h4>
                <p className="text-gray-500">Contactez votre manager pour obtenir des titres de poste</p>
          </div>
        )}
      </div>

          {/* Skills Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8">
                <div className="flex items-center mb-8">
                  <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl mr-4">
                    <ChartBarIcon className="h-6 w-6 text-white" />
          </div>
          <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      Mes Compétences
                    </h3>
                    <p className="text-gray-600">Vos compétences techniques et comportementales</p>
                  </div>
                </div>
                
                <div className="space-y-8">
                  {/* Hard Skills */}
                  <div>
                    <div className="flex items-center mb-6">
                      <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl mr-3">
                        <AcademicCapIcon className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900">Hard Skills</h4>
                    </div>
            {user.skills.filter(s => s.type === 'hard').length === 0 ? (
                      <div className="text-center py-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                        <AcademicCapIcon className="h-12 w-12 text-blue-400 mx-auto mb-3" />
                        <p className="text-gray-600 font-medium">Aucune compétence technique</p>
                        <p className="text-sm text-gray-500 mt-1">Utilisez le bouton « Demander une nouvelle compétence »</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                {user.skills.filter(s => s.type === 'hard').map((s) => (
                  <SkillBadge key={`hard-${s.id}`} name={s.name} level={s.level} type={s.type} />
                ))}
              </div>
            )}
          </div>
                  
                  {/* Soft Skills */}
                  <div>
                    <div className="flex items-center mb-6">
                      <div className="p-2 bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl mr-3">
                        <UserIcon className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900">Soft Skills</h4>
                    </div>
            {user.skills.filter(s => s.type === 'soft').length === 0 ? (
                      <div className="text-center py-8 bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl border border-pink-200">
                        <UserIcon className="h-12 w-12 text-pink-400 mx-auto mb-3" />
                        <p className="text-gray-600 font-medium">Aucune compétence comportementale</p>
                        <p className="text-sm text-gray-500 mt-1">Développez vos compétences interpersonnelles</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                {user.skills.filter(s => s.type === 'soft').map((s) => (
                  <SkillBadge key={`soft-${s.id}`} name={s.name} level={s.level} type={s.type} />
                ))}
              </div>
            )}
          </div>
        </div>
              </div>
            </div>
            
            <div className="lg:col-span-1">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8">
          <SkillRadarChart />
              </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
              <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 w-full max-w-md transform transition-all duration-300 scale-100">
                <div className="p-8">
                  <div className="flex items-center mb-8">
                    <div className="p-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl mr-4">
                      <LockClosedIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Sécurité
                      </h3>
                      <p className="text-gray-600">Changer votre mot de passe</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <LockClosedIcon className="h-4 w-4 mr-2 text-gray-500" />
                        Mot de passe actuel
                      </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                        placeholder="Entrez votre mot de passe actuel"
                  />
                </div>
                
                <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <SparklesIcon className="h-4 w-4 mr-2 text-green-500" />
                        Nouveau mot de passe
                      </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                        placeholder="Entrez votre nouveau mot de passe"
                  />
                </div>
                
                <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <ShieldCheckIcon className="h-4 w-4 mr-2 text-blue-500" />
                        Confirmer le nouveau mot de passe
                      </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                        placeholder="Confirmez votre nouveau mot de passe"
                  />
                </div>
              </div>
              
                  <div className="flex justify-end space-x-4 mt-8">
                <button
                  onClick={() => setShowPasswordModal(false)}
                      className="group flex items-center px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 transform hover:scale-105"
                >
                      <span className="font-medium">Annuler</span>
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                      className="group flex items-center px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:from-red-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none"
                    >
                      {loading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          <span className="font-semibold">Modification...</span>
                        </div>
                      ) : (
                        <span className="font-semibold">Modifier</span>
                      )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Picture Modal */}
      {showPictureModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
              <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 w-full max-w-md transform transition-all duration-300 scale-100">
                <div className="p-8">
                  <div className="flex items-center mb-8">
                    <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl mr-4">
                      <CameraIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Photo de Profil
                      </h3>
                      <p className="text-gray-600">Changer votre photo de profil</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <CameraIcon className="h-4 w-4 mr-2 text-purple-500" />
                        Sélectionner une image
                      </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 bg-white/50 backdrop-blur-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  />
                </div>
                
                {profilePicture && (
                      <div className="text-center">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">Aperçu</label>
                        <div className="relative inline-block">
                          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 p-1">
                    <img
                      src={profilePicture}
                      alt="Preview"
                              className="w-full h-full rounded-full object-cover"
                    />
                          </div>
                          <div className="absolute -bottom-2 -right-2 p-2 bg-green-500 rounded-full">
                            <CheckIcon className="h-4 w-4 text-white" />
                          </div>
                        </div>
                  </div>
                )}
              </div>
              
                  <div className="flex justify-end space-x-4 mt-8">
                <button
                  onClick={() => setShowPictureModal(false)}
                      className="group flex items-center px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 transform hover:scale-105"
                >
                      <span className="font-medium">Annuler</span>
                </button>
                <button
                  onClick={handleUploadPicture}
                  disabled={loading || !selectedFile}
                      className="group flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none"
                    >
                      {loading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          <span className="font-semibold">Téléchargement...</span>
                        </div>
                      ) : (
                        <span className="font-semibold">Télécharger</span>
                      )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default Profile; 