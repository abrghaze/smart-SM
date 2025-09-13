import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import { 
  UserIcon, 
  CameraIcon, 
  LockClosedIcon, 
  BuildingOfficeIcon, 
  UserGroupIcon, 
  AcademicCapIcon,
  CalendarIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { getProfilePictureUrl } from '../../utils/imageUtils';

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
      const fileUrl = response.profileUrl || response.url || response.fileUrl;
      setProfilePicture(fileUrl);
      
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
      refreshUserData();
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
      admin: 'bg-gradient-to-r from-red-500 to-red-600',
      manager: 'bg-gradient-to-r from-green-500 to-green-600',
      employee: 'bg-gradient-to-r from-blue-500 to-blue-600'
    };
    return colors[role] || 'bg-gradient-to-r from-gray-500 to-gray-600';
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg font-medium">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Modern Header */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl shadow-lg border border-indigo-100 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <UserIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-900 to-indigo-900 bg-clip-text text-transparent">
                Mon profil
              </h1>
              <p className="text-lg text-gray-600 mt-2">Gérez vos informations personnelles et paramètres</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="inline-flex items-center px-6 py-3 bg-white text-gray-700 text-sm font-medium rounded-xl hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-indigo-300"
            >
              <LockClosedIcon className="h-5 w-5 mr-2" />
              Changer le mot de passe
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-medium rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {isEditing ? 'Annuler' : 'Modifier'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Enhanced Profile Picture Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
            <div className="text-center">
              <div className="relative inline-block mb-6">
                <div className="w-40 h-40 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto shadow-xl">
                  {user.profilePictureUrl ? (
                    <img
                      src={getProfilePictureUrl(user.profilePictureUrl)}
                      alt="Profile"
                      className="w-40 h-40 rounded-full object-cover shadow-lg"
                    />
                  ) : (
                    <UserIcon className="w-20 h-20 text-gray-400" />
                  )}
                </div>
                <button
                  onClick={() => setShowPictureModal(true)}
                  className="absolute bottom-6 right-6 p-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <CameraIcon className="h-5 w-5" />
                </button>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-gray-600 mb-4 text-lg">{user.email}</p>
              
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold text-white shadow-lg ${getRoleColor(user.role)}`}>
                <ShieldCheckIcon className="h-4 w-4 mr-2" />
                {getRoleLabel(user.role)}
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information Card */}
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Informations personnelles</h3>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                <UserIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Prénom</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                ) : (
                  <p className="text-lg text-gray-900 font-medium">{user.firstName}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Nom</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                ) : (
                  <p className="text-lg text-gray-900 font-medium">{user.lastName}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Email</label>
                <p className="text-lg text-gray-900 font-medium">{user.email}</p>
                <p className="text-xs text-gray-500">L'email ne peut pas être modifié</p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Poste</label>
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">Sélectionner un titre de poste</option>
                    {user.currentJobTitles && user.currentJobTitles.map((jobTitle) => (
                      <option key={jobTitle.id} value={jobTitle.id}>
                        {jobTitle.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-lg text-gray-900 font-medium">{user.officialJobTitle?.title || user.jobTitle || 'Non spécifié'}</p>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end space-x-4 mt-8">
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading || !formData.firstName || !formData.lastName}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 disabled:opacity-50 font-medium shadow-lg"
                >
                  {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            )}
          </div>

          {/* Enhanced Organization Information Card */}
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Informations organisationnelles</h3>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                <BuildingOfficeIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <BuildingOfficeIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Département</p>
                  <p className="text-lg text-gray-900 font-medium">{getDepartmentDisplay()}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-2xl">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <UserGroupIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Équipe</p>
                  <p className="text-lg text-gray-900 font-medium">{getTeamDisplay()}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-2xl">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <AcademicCapIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Rôle</p>
                  <p className="text-lg text-gray-900 font-medium">{getRoleLabel(user.role)}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-2xl">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <CalendarIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Membre depuis</p>
                  <p className="text-lg text-gray-900 font-medium">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-8 w-full max-w-md">
            <div className="bg-white rounded-3xl shadow-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Changer le mot de passe</h3>
                <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center">
                  <LockClosedIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mot de passe actuel</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Confirmer le nouveau mot de passe</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 mt-8">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 disabled:opacity-50 font-medium shadow-lg"
                >
                  {loading ? 'Modification...' : 'Modifier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Upload Picture Modal */}
      {showPictureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-8 w-full max-w-md">
            <div className="bg-white rounded-3xl shadow-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Changer la photo de profil</h3>
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                  <CameraIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sélectionner une image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                
                {profilePicture && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Aperçu</label>
                    <img
                      src={profilePicture}
                      alt="Preview"
                      className="w-40 h-40 object-cover rounded-2xl mx-auto shadow-lg"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-4 mt-8">
                <button
                  onClick={() => setShowPictureModal(false)}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUploadPicture}
                  disabled={loading || !selectedFile}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 disabled:opacity-50 font-medium shadow-lg"
                >
                  {loading ? 'Téléchargement...' : 'Télécharger'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
