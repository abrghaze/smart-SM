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
  FlagIcon,
  ClipboardDocumentListIcon
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Chargement des demandes...</p>
        </div>
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
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <ClipboardDocumentListIcon className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Demandes</h1>
              <p className="text-gray-600 mt-1">Gérez les demandes de compétences et les approbations de progression</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
          <nav className="flex space-x-2">
            <button
              onClick={() => setActiveTab('skill-requests')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-6 rounded-xl font-medium text-sm transition-all duration-200 ${
                activeTab === 'skill-requests'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <AcademicCapIcon className="h-5 w-5" />
              <span>Demandes de compétences</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'skill-requests' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
              }`}>
                {skillRequests.filter(r => r.status === 'pending' || r.status === 'pending_manager').length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('progress-updates')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-6 rounded-xl font-medium text-sm transition-all duration-200 ${
                activeTab === 'progress-updates'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FlagIcon className="h-5 w-5" />
              <span>Demandes de progression</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'progress-updates' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-600'
              }`}>
                {pendingUpdates.length}
              </span>
            </button>
          </nav>
        </div>

      {/* Skill Requests Tab */}
      {activeTab === 'skill-requests' && (
        <div className="space-y-4">
          {skillRequests.filter(r => r.status === 'pending' || r.status === 'pending_manager').length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16">
              <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckIcon className="h-10 w-10 text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Aucune demande en attente</h3>
              <p className="text-gray-500">Toutes les demandes de compétences ont été traitées.</p>
            </div>
          ) : (
            skillRequests
              .filter(r => r.status === 'pending' || r.status === 'pending_manager')
              .map((request) => (
                <div key={request.id} className="bg-white rounded-2xl shadow-sm border-2 border-l-4 border-l-blue-500 border-gray-100 p-6 hover:shadow-lg transition-all duration-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center flex-wrap">
                        <span className="mr-3">{request.skill?.name || request.requestedSkillName || 'Compétence non spécifiée'}</span>
                        <span className="text-sm font-medium text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                          {getRequestTypeTitle(request.type)}
                        </span>
                      </h3>
                      
                      {/* Request Type and Details */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-4 mt-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FlagIcon className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="text-sm font-semibold text-blue-800">
                            {getRequestTypeText(request.type)}
                          </span>
                        </div>
                        
                        {request.type === 'upgrade' && (
                          <div className="text-sm text-blue-700 bg-white rounded-lg px-3 py-2 mt-2">
                            <span className="font-medium">Amélioration:</span> Niveau {request.currentLevel || 0} → <span className="font-bold text-blue-600">Niveau {request.targetLevel}</span>
                          </div>
                        )}
                        
                        {request.type === 'add_existing' && (
                          <div className="text-sm text-blue-700 bg-white rounded-lg px-3 py-2 mt-2">
                            <span className="font-medium">Ajout à:</span> <span className="font-bold text-blue-600">Niveau {request.targetLevel}</span>
                          </div>
                        )}
                        
                        {request.type === 'create_new' && (
                          <div className="text-sm text-blue-700 bg-white rounded-lg px-3 py-2 mt-2">
                            <span className="font-medium">Nouvelle compétence:</span> <span className="font-bold text-blue-600">{request.requestedSkillName}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-gray-50 rounded-xl p-3 mb-3">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold text-gray-900">Raison:</span> {request.reason}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center bg-gray-100 px-3 py-1.5 rounded-lg">
                          <UserIcon className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="font-medium text-gray-700">{request.requester ? `${request.requester.firstName} ${request.requester.lastName}` : 'Employé non spécifié'}</span>
                        </div>
                        <div className="flex items-center bg-gray-100 px-3 py-1.5 rounded-lg">
                          <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{formatDate(request.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm">
                      ⏳ En attente
                    </span>
                  </div>

                  {request.certificateFile && (
                    <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl mb-4 border border-blue-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                          <DocumentIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {request.certificateFile.originalName}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDownloadFile(request.certificateFile.id, request.certificateFile.originalName)}
                        className="px-4 py-2 bg-white border-2 border-blue-200 text-blue-600 rounded-xl hover:bg-blue-50 transition-all duration-200 font-medium text-sm flex items-center space-x-2"
                      >
                        <EyeIcon className="h-4 w-4" />
                        <span>Voir la preuve</span>
                      </button>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowRejectionModal(true);
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium text-sm flex items-center space-x-2 shadow-md"
                    >
                      <XMarkIcon className="h-4 w-4" />
                      Rejeter
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowApprovalModal(true);
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-medium text-sm flex items-center space-x-2 shadow-md"
                    >
                      <CheckIcon className="h-4 w-4" />
                      <span>Approuver</span>
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16">
              <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckIcon className="h-10 w-10 text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Aucune demande en attente</h3>
              <p className="text-gray-500">Toutes les demandes de progression ont été traitées.</p>
            </div>
          ) : (
            pendingUpdates.map((update) => (
              <div key={update.id} className="bg-white rounded-2xl shadow-sm border-2 border-l-4 border-l-amber-500 border-gray-100 p-6 hover:shadow-lg transition-all duration-200">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">
                      {update.objective.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-xl p-3">
                      {update.objective.description}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-3">
                      <div className="flex items-center bg-gray-100 px-3 py-1.5 rounded-lg">
                        <UserIcon className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium text-gray-700">{update.author.firstName} {update.author.lastName}</span>
                      </div>
                      <div className="flex items-center bg-gray-100 px-3 py-1.5 rounded-lg">
                        <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{formatDate(update.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm">
                    ⏳ En attente
                  </span>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-semibold text-gray-700">Nouvelle progression proposée</span>
                      <span className={`text-lg font-bold ${
                        update.progress >= 80 ? 'text-green-600' : 
                        update.progress >= 50 ? 'text-blue-600' : 'text-amber-600'
                      }`}>{update.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${
                          update.progress >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 
                          update.progress >= 50 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'
                        }`}
                        style={{ width: `${update.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                      <DocumentIcon className="h-4 w-4 mr-2 text-gray-400" />
                      Description des progrès
                    </h4>
                    <p className="text-sm text-gray-700">{update.notes}</p>
                  </div>

                  {update.proofFile && (
                    <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                          <DocumentIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-900 block">
                            {update.proofFile.originalName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {(update.proofFile.sizeBytes / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadFile(update.proofFile.id, update.proofFile.originalName)}
                        className="px-4 py-2 bg-white border-2 border-blue-200 text-blue-600 rounded-xl hover:bg-blue-50 transition-all duration-200 font-medium text-sm flex items-center space-x-2"
                      >
                        <EyeIcon className="h-4 w-4" />
                        <span>Voir la preuve</span>
                      </button>
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setSelectedUpdate(update);
                        setShowRejectionModal(true);
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium text-sm flex items-center space-x-2 shadow-md"
                    >
                      <XMarkIcon className="h-4 w-4" />
                      <span>Rejeter</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUpdate(update);
                        setShowApprovalModal(true);
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-medium text-sm flex items-center space-x-2 shadow-md"
                    >
                      <CheckIcon className="h-4 w-4" />
                      <span>Approuver</span>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <CheckIcon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {selectedRequest ? 'Approuver la demande' : 'Approuver la progression'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedRequest(null);
                    setSelectedUpdate(null);
                    setManagerNotes('');
                  }}
                  className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {selectedRequest ? 'Compétence' : 'Objectif'}
                </label>
                <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                  <span className="font-medium text-gray-900">
                    {selectedRequest ? (selectedRequest.skill?.name || selectedRequest.requestedSkillName || 'Compétence non spécifiée') : selectedUpdate.objective.title}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Employé
                </label>
                <div className="p-3 bg-gray-50 rounded-xl flex items-center space-x-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="font-medium text-gray-900">
                    {selectedRequest ? `${selectedRequest.requester.firstName} ${selectedRequest.requester.lastName}` : `${selectedUpdate.author.firstName} ${selectedUpdate.author.lastName}`}
                  </span>
                </div>
              </div>
              {selectedUpdate && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nouvelle progression
                  </label>
                  <div className="p-3 bg-green-50 rounded-xl">
                    <span className="font-bold text-green-600 text-lg">{selectedUpdate.progress}%</span>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes du manager (optionnel)
                </label>
                <textarea
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white resize-none"
                  rows="3"
                  placeholder="Ajoutez des commentaires..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 p-6 pt-0">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedRequest(null);
                  setSelectedUpdate(null);
                  setManagerNotes('');
                }}
                className="px-5 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
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
                className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-medium shadow-lg disabled:opacity-50"
                disabled={approving}
              >
                {approving ? 'Approbation...' : '✓ Approuver'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (selectedRequest || selectedUpdate) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <XMarkIcon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {selectedRequest ? 'Rejeter la demande' : 'Rejeter la progression'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowRejectionModal(false);
                    setSelectedRequest(null);
                    setSelectedUpdate(null);
                    setManagerNotes('');
                  }}
                  className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {selectedRequest ? 'Compétence' : 'Objectif'}
                </label>
                <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                  <span className="font-medium text-gray-900">
                    {selectedRequest ? (selectedRequest.skill?.name || selectedRequest.requestedSkillName || 'Compétence non spécifiée') : selectedUpdate.objective.title}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Raison du rejet <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white resize-none"
                  rows="3"
                  placeholder="Expliquez pourquoi cette demande est rejetée..."
                  required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 p-6 pt-0">
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setSelectedRequest(null);
                  setSelectedUpdate(null);
                  setManagerNotes('');
                }}
                className="px-5 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
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
                className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-lg disabled:opacity-50"
                disabled={approving || !managerNotes.trim()}
              >
                {approving ? 'Rejet...' : '✕ Rejeter'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Requests;
