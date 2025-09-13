import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { getSkillLevelName } from '../../utils/skillLevels';
import {
  CameraIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  AcademicCapIcon,
  UserIcon
} from '@heroicons/react/24/outline';

const UserProfile = ({ user, onUpdateProfile, onUpdatePassword, onUpdateProfilePicture }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isChangingPicture, setIsChangingPicture] = useState(false);
  const [editedProfile, setEditedProfile] = useState({ ...user });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleProfileUpdate = () => {
    onUpdateProfile(editedProfile);
    setIsEditing(false);
  };

  const handlePasswordUpdate = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }
    onUpdatePassword(passwordData);
    toast.success('Mot de passe mis à jour');
    setIsChangingPassword(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handlePictureUpdate = () => {
    if (selectedFile) {
      onUpdateProfilePicture(selectedFile);
      setIsChangingPicture(false);
      setSelectedFile(null);
      setPreviewImage(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon Profil</h1>
          <p className="text-gray-600">Gérez vos informations personnelles et vos compétences</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsChangingPicture(true)}
            className="btn-secondary flex items-center"
          >
            <CameraIcon className="h-4 w-4 mr-2" />
            Changer photo
          </button>
          <button
            onClick={() => setIsChangingPassword(true)}
            className="btn-secondary flex items-center"
          >
            <EyeIcon className="h-4 w-4 mr-2" />
            Changer mot de passe
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn-primary flex items-center"
          >
            {isEditing ? (
              <>
                <XMarkIcon className="h-4 w-4 mr-2" />
                Annuler
              </>
            ) : (
              <>
                <PencilIcon className="h-4 w-4 mr-2" />
                Modifier
              </>
            )}
          </button>
        </div>
      </div>

      {/* Profile Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Picture and Basic Info */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="text-center">
              <div className="relative inline-block">
                {user.profilePictureUrl ? (
                  <img 
                    src={user.profilePictureUrl} 
                    alt={`${user.firstName} ${user.lastName}`}
                    className="h-32 w-32 rounded-full object-cover mx-auto"
                  />
                ) : (
                  <div className="h-32 w-32 bg-primary-600 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-white text-4xl font-bold">
                      {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => setIsChangingPicture(true)}
                  className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full hover:bg-primary-700 transition-colors"
                >
                  <CameraIcon className="h-4 w-4" />
                </button>
              </div>
              
              <div className="mt-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-gray-600">{user.jobTitle}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
                <div className="mt-2">
                  <span className={`badge ${
                    user.role === 'admin' ? 'bg-red-100 text-red-800' :
                    user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Profile Information */}
        <div className="lg:col-span-2">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Prénom</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedProfile.firstName}
                    onChange={(e) => setEditedProfile({...editedProfile, firstName: e.target.value})}
                    className="input-field"
                  />
                ) : (
                  <p className="text-gray-900">{user.firstName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedProfile.lastName}
                    onChange={(e) => setEditedProfile({...editedProfile, lastName: e.target.value})}
                    className="input-field"
                  />
                ) : (
                  <p className="text-gray-900">{user.lastName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editedProfile.email}
                    onChange={(e) => setEditedProfile({...editedProfile, email: e.target.value})}
                    className="input-field"
                  />
                ) : (
                  <p className="text-gray-900">{user.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Titre de poste</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedProfile.jobTitle}
                    onChange={(e) => setEditedProfile({...editedProfile, jobTitle: e.target.value})}
                    className="input-field"
                  />
                ) : (
                  <p className="text-gray-900">{user.jobTitle}</p>
                )}
              </div>
            </div>
            
            {isEditing && (
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button
                  onClick={handleProfileUpdate}
                  className="btn-primary flex items-center"
                >
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Sauvegarder
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skills Section */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <AcademicCapIcon className="h-5 w-5 mr-2 text-primary-600" />
          Mes Compétences
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {user.skills && user.skills.map((skill, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <AcademicCapIcon className="h-5 w-5 text-primary-600" />
                  <h4 className="font-medium text-gray-900">{skill.name}</h4>
                </div>
                <span className={`badge ${
                  skill.type === 'hard' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`}>
                  {skill.type === 'hard' ? 'Hard Skill' : 'Soft Skill'}
                </span>
              </div>
              
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Niveau actuel</span>
                  <span className="text-sm font-medium text-gray-900">
                    {getSkillLevelName(skill.level)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  {/** Derive progress percent from level (out of 5) to avoid undefined values */}
                  {(() => {
                    const percent = Math.round((Math.min(Math.max(skill.level, 0), 5) / 5) * 100);
                    return (
                  <div 
                    className={`h-2 rounded-full ${getProgressColor(percent)}`}
                    style={{ width: `${percent}%` }}
                  ></div>
                    );
                  })()}
                </div>
                <div className="text-right mt-1">
                  {(() => {
                    const percent = Math.round((Math.min(Math.max(skill.level, 0), 5) / 5) * 100);
                    return <span className="text-xs text-gray-600">{percent}%</span>;
                  })()}
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button className="btn-primary text-xs flex-1">
                  Voir détails
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {(!user.skills || user.skills.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <AcademicCapIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Aucune compétence enregistrée</p>
          </div>
        )}
      </div>

      {/* Change Password Modal */}
      {isChangingPassword && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Changer le mot de passe</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mot de passe actuel</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      className="input-field pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="input-field"
                    placeholder="Minimum 6 caractères"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirmer le nouveau mot de passe</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setIsChangingPassword(false)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button
                  onClick={handlePasswordUpdate}
                  className="btn-primary"
                  disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                >
                  Changer le mot de passe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Profile Picture Modal */}
      {isChangingPicture && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Changer la photo de profil</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sélectionner une image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="input-field"
                  />
                </div>
                {previewImage && (
                  <div className="text-center">
                    <img 
                      src={previewImage} 
                      alt="Preview" 
                      className="h-32 w-32 rounded-full object-cover mx-auto" 
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setIsChangingPicture(false)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button
                  onClick={handlePictureUpdate}
                  className="btn-primary"
                  disabled={!selectedFile}
                >
                  Mettre à jour
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
