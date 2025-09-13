import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import { UserIcon, CameraIcon, LockClosedIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
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

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        jobTitle: user.jobTitle || ''
      });
    }
  }, [user]);

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
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (!passwordData.currentPassword) {
      toast.error('Veuillez saisir votre mot de passe actuel');
      return;
    }

    try {
      setLoading(true);
      // Use the API to change password
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

  const handleUploadPicture = async () => {
    if (!selectedFile) {
      toast.error('Veuillez sélectionner une image');
      return;
    }
    
    try {
      setLoading(true);
      // Upload file using the API
      const response = await dataService.uploadFile(selectedFile);
      // Use profileUrl for displaying the image (no authentication required)
      const fileUrl = response.profileUrl || response.url || response.fileUrl;
      
      // Update profile with the new picture URL in snake_case format
      const profileData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        job_title: formData.jobTitle,
        profile_picture_url: fileUrl
      };
      
      await updateProfile(profileData);
      
      // Refresh user data to ensure the profile picture URL is updated in the context
      await refreshUserData();
      
      toast.success('Photo de profil mise à jour');
      setShowPictureModal(false);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error uploading picture:', error);
      toast.error('Erreur lors du téléchargement de l\'image');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
    } else {
      toast.error('Veuillez sélectionner une image valide');
    }
  };

  if (!user) {
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
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
              <p className="text-gray-600 mt-1">Gérez vos informations personnelles et vos paramètres</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto shadow-lg border-4 border-white">
                    {user.profilePictureUrl ? (
                      <img
                        src={getProfilePictureUrl(user.profilePictureUrl)}
                        alt="Profile"
                        className="w-40 h-40 rounded-2xl object-cover"
                      />
                    ) : (
                      <UserIcon className="w-20 h-20 text-gray-400" />
                    )}
                  </div>
                  <button
                    onClick={() => setShowPictureModal(true)}
                    className="absolute -bottom-2 -right-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <CameraIcon className="w-5 h-5" />
                  </button>
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-blue-600 font-medium mb-1">{user.jobTitle}</p>
                <p className="text-gray-500 mb-6">{user.email}</p>
                
                <div className="flex flex-col space-y-3">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] flex items-center justify-center space-x-2"
                  >
                    <PencilIcon className="w-4 h-4" />
                    <span>Modifier le profil</span>
                  </button>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] flex items-center justify-center space-x-2"
                  >
                    <LockClosedIcon className="w-4 h-4" />
                    <span>Changer le mot de passe</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Informations personnelles</h3>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">Prénom</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                      placeholder="Votre prénom"
                    />
                  ) : (
                    <p className="text-gray-900 text-lg font-medium">{user.firstName}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">Nom</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                      placeholder="Votre nom"
                    />
                  ) : (
                    <p className="text-gray-900 text-lg font-medium">{user.lastName}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">Email</label>
                  <p className="text-gray-900 text-lg font-medium">{user.email}</p>
                  <p className="text-xs text-gray-500">L'email ne peut pas être modifié</p>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">Poste</label>
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
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                    >
                      <option value="">Sélectionner un titre de poste</option>
                      {user.currentJobTitles && user.currentJobTitles.map((jobTitle) => (
                        <option key={jobTitle.id} value={jobTitle.id}>
                          {jobTitle.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900 text-lg font-medium">{user.officialJobTitle?.title || user.jobTitle || 'Non spécifié'}</p>
                  )}
                </div>
              </div>
              
              {isEditing && (
                <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-100">
                  <button
                    onClick={handleCancel}
                    className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium flex items-center space-x-2"
                  >
                    <XMarkIcon className="w-4 h-4" />
                    <span>Annuler</span>
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium disabled:opacity-50 flex items-center space-x-2 shadow-md hover:shadow-lg"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Sauvegarde...</span>
                      </>
                    ) : (
                      <>
                        <CheckIcon className="w-4 h-4" />
                        <span>Sauvegarder</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Changer le mot de passe</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Mot de passe actuel</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  placeholder="Votre mot de passe actuel"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  placeholder="Nouveau mot de passe"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  placeholder="Confirmer le nouveau mot de passe"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium disabled:opacity-50 shadow-md hover:shadow-lg"
              >
                {loading ? 'Changement...' : 'Changer le mot de passe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Picture Upload Modal */}
      {showPictureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Changer la photo de profil</h3>
              <button
                onClick={() => setShowPictureModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Sélectionner une image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              
              {selectedFile && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm text-green-700 font-medium">
                    Fichier sélectionné: {selectedFile.name}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => setShowPictureModal(false)}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleUploadPicture}
                disabled={loading || !selectedFile}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium disabled:opacity-50 shadow-md hover:shadow-lg"
              >
                {loading ? 'Téléchargement...' : 'Télécharger'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
