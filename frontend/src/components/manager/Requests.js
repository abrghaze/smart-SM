import React, { useState, useEffect, useCallback } from 'react';

import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import { 
  CheckIcon, 
  XMarkIcon, 
  DocumentIcon, 
  UserIcon,
  ClockIcon,
  EyeIcon,
  AcademicCapIcon,
  FlagIcon
} from '@heroicons/react/24/outline';

const Requests = () => {
  const [activeTab, setActiveTab] = useState('skill-requests');
  const [skillRequests, setSkillRequests] = useState([]);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedUpdate, setSelectedUpdate] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [managerNotes, setManagerNotes] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadSkillRequests(),
        loadPendingUpdates()
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
      const response = await dataService.getMyManagerSkillRequests();
      console.log('🔍 Manager skill requests loaded:', response);
      if (response && response.length > 0) {
        response.forEach((request, index) => {
          console.log(`Request ${index + 1}:`, {
            id: request.id,
            type: request.type,
            skillName: request.skill?.name || request.requestedSkillName,
            status: request.status,
            currentLevel: request.currentLevel,
            targetLevel: request.targetLevel
          });
        });
      }
      setSkillRequests(response || []);
    } catch (error) {
      console.error('Error loading skill requests:', error);
    }
  };

  const loadPendingUpdates = async () => {
    try {
      const response = await dataService.getPendingProgressUpdates();
      setPendingUpdates(response.updates || []);
    } catch (error) {
      console.error('Error loading pending updates:', error);
    }
  };

  const handleSkillRequestAction = async (requestId, action) => {
    try {
      setApproving(true);
      if (action === 'approve') {
        // Send null instead of empty string for optional comment
        const commentToSend = managerNotes.trim() === '' ? null : managerNotes.trim();
        
        // Determine the appropriate level based on request type
        const request = skillRequests.find(r => r.id === requestId);
        let grantedLevel = null;
        
        if (request) {
          if (request.type === 'upgrade') {
            // For upgrades, use the target level requested
            grantedLevel = request.targetLevel;
          } else if (request.type === 'add_existing') {
            // For adding existing skills, use level 1 as default
            grantedLevel = 1;
          }
          // For create_new, don't set grantedLevel as it goes to admin
        }
        
        await dataService.approveSkillRequest(requestId, commentToSend, grantedLevel);
        toast.success('Demande de compétence approuvée');
      } else {
        // Send null instead of empty string for optional comment
        const commentToSend = managerNotes.trim() === '' ? null : managerNotes.trim();
        await dataService.rejectSkillRequest(requestId, commentToSend);
        toast.success('Demande de compétence rejetée');
      }
      setShowApprovalModal(false);
      setSelectedRequest(null);
      setManagerNotes('');
      loadSkillRequests();
    } catch (error) {
      console.error('Error processing skill request:', error);
      toast.error(error.message || 'Erreur lors du traitement');
    } finally {
      setApproving(false);
    }
  };

  const handleProgressUpdateAction = async (updateId, action) => {
    try {
      setApproving(true);
      if (action === 'approve') {
        await dataService.approveProgressUpdate(updateId, { managerNotes });
        toast.success('Progression approuvée avec succès');
      } else {
        await dataService.rejectProgressUpdate(updateId, { managerNotes });
        toast.success('Progression rejetée');
      }
      setShowApprovalModal(false);
      setSelectedUpdate(null);
      setManagerNotes('');
      loadPendingUpdates();
    } catch (error) {
      console.error('Error processing progress update:', error);
      toast.error(error.message || 'Erreur lors du traitement');
    } finally {
      setApproving(false);
    }
  };

  const handleDownloadFile = async (fileId, fileName) => {
    try {
      const response = await fetch(`http://localhost:5000/api/files/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          toast.error('Accès refusé au fichier. Contactez l\'administrateur.');
        } else {
          throw new Error('Erreur lors du téléchargement');
        }
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Fichier téléchargé avec succès');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Erreur lors du téléchargement du fichier');
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

  const getRequestTypeText = (type) => {
    switch (type) {
      case 'upgrade':
        return 'Amélioration de compétence existante';
      case 'add_existing':
        return 'Ajout de compétence existante';
      case 'create_new':
        return 'Création de nouvelle compétence';
      default:
        return 'Demande de compétence';
    }
  };

  const getRequestTypeTitle = (type) => {
    console.log('🔍 getRequestTypeTitle called with type:', type);
    switch (type) {
      case 'upgrade':
        return 'Demande d\'amélioration de compétence';
      case 'add_existing':
        return 'Demande d\'ajout de compétence';
      case 'create_new':
        return 'Demande de création de compétence';
      default:
        console.log('⚠️ Unknown request type:', type);
        return 'Demande de compétence';
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
        <h1 className="text-2xl font-bold text-gray-900">Demandes</h1>
        <p className="text-gray-600">Gérez les demandes de compétences et les approbations de progression</p>
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
            Demandes de compétences ({skillRequests.filter(r => r.status === 'pending' || r.status === 'pending_manager').length})
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
            Demandes de progression ({pendingUpdates.length})
          </button>
        </nav>
      </div>

      {/* Skill Requests Tab */}
      {activeTab === 'skill-requests' && (
        <div className="space-y-4">
          {skillRequests.filter(r => r.status === 'pending' || r.status === 'pending_manager').length === 0 ? (
            <div className="card text-center py-12">
              <CheckIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune demande en attente</h3>
              <p className="text-gray-600">Toutes les demandes de compétences ont été traitées.</p>
            </div>
          ) : (
            skillRequests
              .filter(r => r.status === 'pending' || r.status === 'pending_manager')
              .map((request) => (
                <div key={request.id} className="card border-l-4 border-l-blue-500">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getRequestTypeTitle(request.type)}: {request.skill?.name || request.requestedSkillName || 'Compétence non spécifiée'}
                      </h3>
                      
                      {/* Request Type and Details */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <FlagIcon className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">
                            {getRequestTypeText(request.type)}
                          </span>
                        </div>
                        
                        {request.type === 'upgrade' && (
                          <div className="text-sm text-blue-700">
                            <span className="font-medium">Amélioration de niveau:</span> {request.currentLevel || 0} → {request.targetLevel}
                          </div>
                        )}
                        
                        {request.type === 'add_existing' && (
                          <div className="text-sm text-blue-700">
                            <span className="font-medium">Ajout de compétence:</span> Niveau {request.targetLevel}
                          </div>
                        )}
                        
                        {request.type === 'create_new' && (
                          <div className="text-sm text-blue-700">
                            <span className="font-medium">Création de nouvelle compétence:</span> {request.requestedSkillName}
                          </div>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Raison:</span> {request.reason}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <UserIcon className="h-4 w-4 mr-1" />
                          {request.requester ? `${request.requester.firstName} ${request.requester.lastName}` : 'Employé non spécifié'}
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {formatDate(request.createdAt)}
                        </div>
                      </div>
                    </div>
                    <span className="badge badge-warning">En attente</span>
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
                        Voir la preuve
                      </button>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowRejectionModal(true);
                      }}
                      className="btn-danger text-sm"
                    >
                      <XMarkIcon className="h-4 w-4 mr-1" />
                      Rejeter
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowApprovalModal(true);
                      }}
                      className="btn-success text-sm"
                    >
                      <CheckIcon className="h-4 w-4 mr-1" />
                      Approuver
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
          {pendingUpdates.length === 0 ? (
            <div className="card text-center py-12">
              <CheckIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune demande en attente</h3>
              <p className="text-gray-600">Toutes les demandes de progression ont été traitées.</p>
            </div>
          ) : (
            pendingUpdates.map((update) => (
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
                        <UserIcon className="h-4 w-4 mr-1" />
                        {update.author.firstName} {update.author.lastName}
                      </div>
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {formatDate(update.createdAt)}
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-warning">En attente</span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Nouvelle progression proposée</span>
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
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setSelectedUpdate(update);
                        setShowRejectionModal(true);
                      }}
                      className="btn-danger text-sm"
                    >
                      <XMarkIcon className="h-4 w-4 mr-1" />
                      Rejeter
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUpdate(update);
                        setShowApprovalModal(true);
                      }}
                      className="btn-success text-sm"
                    >
                      <CheckIcon className="h-4 w-4 mr-1" />
                      Approuver
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && (selectedRequest || selectedUpdate) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedRequest ? 'Approuver la demande de compétence' : 'Approuver la progression'}
                </h3>
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedRequest(null);
                    setSelectedUpdate(null);
                    setManagerNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedRequest ? 'Compétence' : 'Objectif'}
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <span className="font-medium">
                      {selectedRequest ? (selectedRequest.skill?.name || selectedRequest.requestedSkillName || 'Compétence non spécifiée') : selectedUpdate.objective.title}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employé
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <span className="font-medium">
                                             {selectedRequest ? `${selectedRequest.requester.firstName} ${selectedRequest.requester.lastName}` : `${selectedUpdate.author.firstName} ${selectedUpdate.author.lastName}`}
                    </span>
                  </div>
                </div>
                {selectedUpdate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nouvelle progression
                    </label>
                    <div className="p-3 bg-gray-50 rounded-md">
                      <span className="font-medium">{selectedUpdate.progress}%</span>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes du manager (optionnel)
                  </label>
                  <textarea
                    value={managerNotes}
                    onChange={(e) => setManagerNotes(e.target.value)}
                    className="input-field"
                    rows="3"
                    placeholder="Ajoutez des commentaires..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedRequest(null);
                    setSelectedUpdate(null);
                    setManagerNotes('');
                  }}
                  className="btn-secondary"
                  disabled={approving}
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    if (selectedRequest) {
                      handleSkillRequestAction(selectedRequest.id, 'approve');
                    } else {
                      handleProgressUpdateAction(selectedUpdate.id, 'approve');
                    }
                  }}
                  className="btn-success"
                  disabled={approving}
                >
                  {approving ? 'Approbation...' : 'Approuver'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (selectedRequest || selectedUpdate) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedRequest ? 'Rejeter la demande de compétence' : 'Rejeter la progression'}
                </h3>
                <button
                  onClick={() => {
                    setShowRejectionModal(false);
                    setSelectedRequest(null);
                    setSelectedUpdate(null);
                    setManagerNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedRequest ? 'Compétence' : 'Objectif'}
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <span className="font-medium">
                      {selectedRequest ? (selectedRequest.skill?.name || selectedRequest.requestedSkillName || 'Compétence non spécifiée') : selectedUpdate.objective.title}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Raison du rejet <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={managerNotes}
                    onChange={(e) => setManagerNotes(e.target.value)}
                    className="input-field"
                    rows="3"
                    placeholder="Expliquez pourquoi cette demande est rejetée..."
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowRejectionModal(false);
                    setSelectedRequest(null);
                    setSelectedUpdate(null);
                    setManagerNotes('');
                  }}
                  className="btn-secondary"
                  disabled={approving}
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    if (selectedRequest) {
                      handleSkillRequestAction(selectedRequest.id, 'reject');
                    } else {
                      handleProgressUpdateAction(selectedUpdate.id, 'reject');
                    }
                  }}
                  className="btn-danger"
                  disabled={approving || !managerNotes.trim()}
                >
                  {approving ? 'Rejet...' : 'Rejeter'}
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
