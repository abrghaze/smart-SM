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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes Demandes</h1>
        <p className="text-gray-600">Suivez vos demandes de compétences et vos mises à jour de progression</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('skill-requests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'skill-requests'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <AcademicCapIcon className="h-5 w-5 inline mr-2" />
            Mes Demandes de Compétences ({skillRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('progress-updates')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'progress-updates'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FlagIcon className="h-5 w-5 inline mr-2" />
            Demandes de Progression d'Objectif ({progressUpdates.length})
          </button>
        </nav>
      </div>

      {/* Skill Requests Tab */}
      {activeTab === 'skill-requests' && (
        <div className="space-y-4">
          {skillRequests.length === 0 ? (
            <div className="card text-center py-12">
              <AcademicCapIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune demande de compétence</h3>
              <p className="text-gray-600">Vous n'avez pas encore soumis de demandes de compétences.</p>
            </div>
          ) : (
            skillRequests.map((request) => (
              <div key={request.id} className="card border-l-4 border-l-blue-500">
                <div className="flex justify-between items-start mb-4">
                                     <div className="flex-1">
                     <h3 className="text-lg font-semibold text-gray-900">
                       {getRequestTypeLabel(request)}
                     </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {request.reason}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {formatDate(request.createdAt)}
                      </div>
                      <div className="flex items-center">
                        <span>Niveau actuel: {request.currentLevel}</span>
                      </div>
                      <div className="flex items-center">
                        <span>Niveau demandé: {request.targetLevel}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${getStatusColor(request.status)}`}>
                    {getStatusLabel(request.status)}
                  </span>
                </div>

                {request.certificateFile && (
                  <div className="flex items-center justify-between bg-blue-50 p-3 rounded-md mb-4">
                    <div className="flex items-center space-x-2">
                      <DocumentIcon className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-900">
                        {request.certificateFile.originalName}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDownloadFile(request.certificateFile.id, request.certificateFile.originalName)}
                      className="btn-secondary text-sm"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      Voir le certificat
                    </button>
                  </div>
                )}

                {request.managerComment && (
                  <div className="bg-gray-50 p-3 rounded-md mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Commentaire du manager</h4>
                    <p className="text-sm text-gray-700">{request.managerComment}</p>
                  </div>
                )}

                {request.adminComment && (
                  <div className="bg-gray-50 p-3 rounded-md mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Commentaire de l'admin</h4>
                    <p className="text-sm text-gray-700">{request.adminComment}</p>
                  </div>
                )}

                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => handleDeleteRequest(request, 'skill-request')}
                    className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    disabled={deleting}
                  >
                    <TrashIcon className="h-3 w-3 mr-1" />
                    Supprimer
                  </button>
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
            <div className="card text-center py-12">
              <FlagIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune demande de progression</h3>
              <p className="text-gray-600">Vous n'avez pas encore soumis de demandes de mise à jour de progression.</p>
            </div>
          ) : (
            progressUpdates.map((update) => (
              <div key={update.id} className="card border-l-4 border-l-yellow-500">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {update.objective.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {update.objective.description}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {formatDate(update.createdAt)}
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${getStatusColor(update.status)}`}>
                    {getStatusLabel(update.status)}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Progression proposée</span>
                    <span className="font-semibold">{update.progress}%</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Progression</span>
                      <span>{update.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          update.progress >= 80 ? 'bg-green-600' : 
                          update.progress >= 50 ? 'bg-blue-600' : 'bg-yellow-500'
                        }`}
                        style={{ width: `${update.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Description des progrès</h4>
                    <p className="text-sm text-gray-700">{update.notes}</p>
                  </div>

                  {update.proofFile && (
                    <div className="flex items-center justify-between bg-blue-50 p-3 rounded-md">
                      <div className="flex items-center space-x-2">
                        <DocumentIcon className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium text-gray-900">
                          {update.proofFile.originalName}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({(update.proofFile.sizeBytes / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        onClick={() => handleDownloadFile(update.proofFile.id, update.proofFile.originalName)}
                        className="btn-secondary text-sm"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        Voir la preuve
                      </button>
                    </div>
                  )}

                  {update.managerComment && (
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Commentaire du manager</h4>
                      <p className="text-sm text-gray-700">{update.managerComment}</p>
                    </div>
                  )}

                  <div className="flex justify-end mt-4">
                    <button
                      onClick={() => handleDeleteRequest(update, 'progress-update')}
                      className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      disabled={deleting}
                    >
                      <TrashIcon className="h-3 w-3 mr-1" />
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Confirmer la suppression
                </h3>
                <button
                  onClick={cancelDelete}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={deleting}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                  <TrashIcon className="h-6 w-6 text-red-600" />
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Êtes-vous sûr de vouloir supprimer cette {deleteType === 'skill-request' ? 'demande de compétence' : 'demande de progression'} ?
                  </p>
                                     <p className="text-sm text-gray-800 font-medium mt-2">
                     {deleteType === 'skill-request' 
                       ? getRequestTypeLabel(itemToDelete)
                       : `Objectif: ${itemToDelete.objective?.title}`
                     }
                   </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Cette action est irréversible. Une fois supprimée, la demande ne sera plus visible par votre manager.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={cancelDelete}
                  className="btn-secondary"
                  disabled={deleting}
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDelete}
                  className="btn-danger"
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
  );
};

export default Requests;
