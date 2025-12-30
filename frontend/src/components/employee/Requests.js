import React, { useState, useEffect, useCallback } from 'react';

import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import { 
  XMarkIcon, 
  DocumentIcon, 
  ClockIcon,
  EyeIcon,
  AcademicCapIcon,
  FlagIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

const Requests = () => {
  const [activeTab, setActiveTab] = useState('skill-requests');
  const [skillRequests, setSkillRequests] = useState([]);
  const [progressUpdates, setProgressUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'skill-request' or 'progress-update'

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadSkillRequests(),
        loadProgressUpdates()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadSkillRequests = async () => {
    try {
      const response = await dataService.getMySkillRequests();
      console.log('Skill requests loaded:', response);
      setSkillRequests(response.skillRequests || []);
    } catch (error) {
      console.error('Error loading skill requests:', error);
      setSkillRequests([]);
      // Don't show error toast for empty data - this is normal
      if (error.response?.status !== 404) {
        toast.error('Erreur lors du chargement de vos demandes de compétences');
      }
    }
  };

  const loadProgressUpdates = async () => {
    try {
      // For employees, we'll get their own progress updates
      const response = await dataService.getMyProgressUpdates();
      setProgressUpdates(response.updates || []);
    } catch (error) {
      console.error('Error loading progress updates:', error);
      setProgressUpdates([]);
      // Don't show error toast for empty data or server errors - this is normal
      if (error.response?.status !== 404 && error.response?.status !== 500) {
        toast.error('Erreur lors du chargement de vos mises à jour');
      }
    }
  };

  const handleDownloadFile = async (fileId, fileName) => {
    try {
      console.log('🔍 Starting file download:', { fileId, fileName });
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`http://localhost:5000/api/files/${fileId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': '*/*'
        }
      });

      console.log('📡 Download response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Download failed:', errorText);
        throw new Error(`Erreur lors du téléchargement: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('📦 Blob created:', {
        size: blob.size,
        type: blob.type
      });

      if (blob.size === 0) {
        throw new Error('Le fichier téléchargé est vide');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      
      toast.success('Fichier téléchargé avec succès');
      console.log('✅ File download completed successfully');
    } catch (error) {
      console.error('❌ Error downloading file:', error);
      toast.error(`Erreur lors du téléchargement: ${error.message}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non définie';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteRequest = (item, type) => {
    setItemToDelete(item);
    setDeleteType(type);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !deleteType) return;

    try {
      setDeleting(true);
      
      if (deleteType === 'skill-request') {
        await dataService.deleteSkillRequest(itemToDelete.id);
        setSkillRequests(prev => prev.filter(req => req.id !== itemToDelete.id));
      } else if (deleteType === 'progress-update') {
        await dataService.deleteProgressUpdate(itemToDelete.id);
        setProgressUpdates(prev => prev.filter(update => update.id !== itemToDelete.id));
      }

      setShowDeleteModal(false);
      setItemToDelete(null);
      setDeleteType(null);
    } catch (error) {
      console.error('Error deleting request:', error);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
    setDeleteType(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      case 'pending_manager':
      case 'pending_admin':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'approved':
        return 'Approuvé';
      case 'rejected':
        return 'Rejeté';
      case 'pending_manager':
        return 'En attente du manager';
      case 'pending_admin':
        return 'En attente de l\'admin';
      default:
        return 'En attente';
    }
  };

  const getRequestTypeLabel = (request) => {
    switch (request.type) {
      case 'upgrade':
        return `Demande d'amélioration de compétence: ${request.skill?.name || request.requestedSkillName || 'Compétence non spécifiée'}`;
      case 'add_existing':
        return `Demande d'ajout de compétence: ${request.skill?.name || request.requestedSkillName || 'Compétence non spécifiée'}`;
      case 'create_new':
        return `Demande d'ajout d'un nouveau skill: ${request.requestedSkillName || 'Skill non spécifié'}`;
      default:
        return `Demande de compétence: ${request.skill?.name || request.requestedSkillName || 'Compétence non spécifiée'}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-purple-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Chargement de vos demandes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <ClockIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mes Demandes</h1>
              <p className="text-gray-600 mt-1">Suivez vos demandes de compétences et vos mises à jour de progression</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
          <nav className="flex space-x-2">
            <button
              onClick={() => setActiveTab('skill-requests')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
                activeTab === 'skill-requests'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <AcademicCapIcon className="h-5 w-5" />
              <span>Demandes de Compétences</span>
              <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'skill-requests' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {skillRequests.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('progress-updates')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
                activeTab === 'progress-updates'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FlagIcon className="h-5 w-5" />
              <span>Demandes de Progression</span>
              <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'progress-updates' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {progressUpdates.length}
              </span>
            </button>
          </nav>
        </div>

        {/* Skill Requests Tab */}
        {activeTab === 'skill-requests' && (
          <div className="space-y-4">
            {skillRequests.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16">
                <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AcademicCapIcon className="h-10 w-10 text-purple-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Aucune demande de compétence</h3>
                <p className="text-gray-500">Vous n'avez pas encore soumis de demandes de compétences.</p>
              </div>
            ) : (
              skillRequests.map((request) => (
                <div key={request.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-200">
                  <div className="border-l-4 border-purple-500 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {getRequestTypeLabel(request)}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3 bg-gray-50 p-3 rounded-xl">
                          {request.reason}
                        </p>
                        <div className="flex items-center flex-wrap gap-3 text-sm">
                          <span className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-medium">
                            <ClockIcon className="h-4 w-4 mr-1.5" />
                            {formatDate(request.createdAt)}
                          </span>
                          <span className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg font-medium">
                            Niveau actuel: {request.currentLevel}
                          </span>
                          <span className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-lg font-medium">
                            Niveau demandé: {request.targetLevel}
                          </span>
                        </div>
                      </div>
                      <span className={`px-4 py-2 rounded-xl text-sm font-bold ${getStatusColor(request.status)}`}>
                        {getStatusLabel(request.status)}
                      </span>
                    </div>

                    {request.certificateFile && (
                      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl mb-4 border border-blue-100">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <DocumentIcon className="h-5 w-5 text-blue-600" />
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            {request.certificateFile.originalName}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDownloadFile(request.certificateFile.id, request.certificateFile.originalName)}
                          className="inline-flex items-center px-4 py-2 bg-white border-2 border-blue-200 text-blue-600 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-colors"
                        >
                          <EyeIcon className="h-4 w-4 mr-2" />
                          Voir le certificat
                        </button>
                      </div>
                    )}

                    {request.managerComment && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl mb-4 border border-green-100">
                        <h4 className="text-sm font-bold text-green-800 mb-2">💬 Commentaire du manager</h4>
                        <p className="text-sm text-green-700">{request.managerComment}</p>
                      </div>
                    )}

                    {request.adminComment && (
                      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-xl mb-4 border border-purple-100">
                        <h4 className="text-sm font-bold text-purple-800 mb-2">👤 Commentaire de l'admin</h4>
                        <p className="text-sm text-purple-700">{request.adminComment}</p>
                      </div>
                    )}

                    <div className="flex justify-end mt-4">
                      <button
                        onClick={() => handleDeleteRequest(request, 'skill-request')}
                        className="inline-flex items-center px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 border-2 border-red-100 rounded-xl hover:bg-red-100 transition-all duration-200"
                        disabled={deleting}
                      >
                        <TrashIcon className="h-4 w-4 mr-2" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Progress Updates Tab */}
        {activeTab === 'progress-updates' && (
          <div className="space-y-4">
            {progressUpdates.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16">
                <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FlagIcon className="h-10 w-10 text-amber-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Aucune demande de progression</h3>
                <p className="text-gray-500">Vous n'avez pas encore soumis de demandes de mise à jour de progression.</p>
              </div>
            ) : (
              progressUpdates.map((update) => (
                <div key={update.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-200">
                  <div className="border-l-4 border-amber-500 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {update.objective.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3 bg-gray-50 p-3 rounded-xl">
                          {update.objective.description}
                        </p>
                        <div className="flex items-center text-sm">
                          <span className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-medium">
                            <ClockIcon className="h-4 w-4 mr-1.5" />
                            {formatDate(update.createdAt)}
                          </span>
                        </div>
                      </div>
                      <span className={`px-4 py-2 rounded-xl text-sm font-bold ${getStatusColor(update.status)}`}>
                        {getStatusLabel(update.status)}
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-semibold text-amber-800">Progression proposée</span>
                          <span className="font-bold text-amber-900">{update.progress}%</span>
                        </div>
                        <div className="w-full bg-amber-200 rounded-full h-3 overflow-hidden">
                          <div 
                            className={`h-3 rounded-full transition-all duration-500 ${
                              update.progress >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 
                              update.progress >= 50 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 
                              'bg-gradient-to-r from-amber-500 to-orange-500'
                            }`}
                            style={{ width: `${update.progress}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-xl">
                        <h4 className="text-sm font-bold text-gray-900 mb-2">📝 Description des progrès</h4>
                        <p className="text-sm text-gray-700">{update.notes}</p>
                      </div>

                      {update.proofFile && (
                        <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <DocumentIcon className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-gray-900 block">
                                {update.proofFile.originalName}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({(update.proofFile.sizeBytes / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDownloadFile(update.proofFile.id, update.proofFile.originalName)}
                            className="inline-flex items-center px-4 py-2 bg-white border-2 border-blue-200 text-blue-600 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-colors"
                          >
                            <EyeIcon className="h-4 w-4 mr-2" />
                            Voir la preuve
                          </button>
                        </div>
                      )}

                      {update.managerComment && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                          <h4 className="text-sm font-bold text-green-800 mb-2">💬 Commentaire du manager</h4>
                          <p className="text-sm text-green-700">{update.managerComment}</p>
                        </div>
                      )}

                      <div className="flex justify-end mt-4">
                        <button
                          onClick={() => handleDeleteRequest(update, 'progress-update')}
                          className="inline-flex items-center px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 border-2 border-red-100 rounded-xl hover:bg-red-100 transition-all duration-200"
                          disabled={deleting}
                        >
                          <TrashIcon className="h-4 w-4 mr-2" />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && itemToDelete && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={cancelDelete} />
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                <div className="p-6">
                  <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-2xl mb-4">
                    <TrashIcon className="h-8 w-8 text-red-600" />
                  </div>
                  
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Confirmer la suppression
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Êtes-vous sûr de vouloir supprimer cette {deleteType === 'skill-request' ? 'demande de compétence' : 'demande de progression'} ?
                    </p>
                    <div className="bg-gray-50 p-4 rounded-xl mb-4">
                      <p className="text-sm text-gray-800 font-semibold">
                        {deleteType === 'skill-request' 
                          ? getRequestTypeLabel(itemToDelete)
                          : `Objectif: ${itemToDelete.objective?.title}`
                        }
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      ⚠️ Cette action est irréversible. Une fois supprimée, la demande ne sera plus visible par votre manager.
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
                  <button
                    onClick={cancelDelete}
                    className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-100 transition-all duration-200"
                    disabled={deleting}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-rose-700 transition-all duration-200 shadow-lg"
                    disabled={deleting}
                  >
                    {deleting ? 'Suppression...' : 'Supprimer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Requests;
