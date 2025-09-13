import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';

const SkillRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [countdown, setCountdown] = useState(0);

  // Load user's skill requests
  useEffect(() => {
    loadSkillRequests();
  }, []);

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => prev + 1);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const loadSkillRequests = async () => {
    try {
      setLoading(true);
      const requestsData = await dataService.getMySkillRequests();
      setRequests(requestsData.requests || []);
      console.log('Loaded my skill requests:', requestsData.requests?.length || 0);
    } catch (error) {
      console.error('Error loading skill requests:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const dismissRequest = async (requestId) => {
    try {
      await dataService.dismissSkillRequest(requestId);
      toast.success('Demande archivée avec succès');
      // Remove the dismissed request from the list
      setRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      console.error('Error dismissing request:', error);
      toast.error('Erreur lors de l\'archivage de la demande');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending_manager: 'bg-yellow-100 text-yellow-800',
      pending_admin: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    const labels = {
      pending_manager: 'En attente manager',
      pending_admin: 'En attente admin',
      approved: 'Approuvé',
      rejected: 'Rejeté'
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending_manager':
      case 'pending_admin':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getRequestTypeLabel = (type) => {
    return type === 'new' ? 'Nouvelle compétence' : 'Amélioration';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTimeUntilDeletion = (updatedAt) => {
    const updated = new Date(updatedAt);
    const now = new Date();
    const timeDiff = updated.getTime() + (24 * 60 * 60 * 1000) - now.getTime();
    
    if (timeDiff <= 0) {
      return 'À supprimer';
    }
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m restantes`;
  };

  const markRequestAsSeen = async (requestId) => {
    try {
      await dataService.markSkillRequestAsSeen(requestId);
      // Reload requests to update the seen status
      loadSkillRequests();
    } catch (error) {
      console.error('Error marking request as seen:', error);
    }
  };

  if (loading && requests.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Mes Demandes de Compétences</h1>
            <p className="text-gray-600">Suivez l'état de vos demandes de compétences</p>
          </div>
          <button
            onClick={() => window.location.href = '/employee/skills'}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Nouvelle demande
          </button>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Demandes ({requests.length})
          </h2>
        </div>
        
        {requests.length === 0 ? (
          <div className="text-center py-12">
            <AcademicCapIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">Vous n'avez pas encore de demandes de compétences</p>
            <button
              onClick={() => window.location.href = '/employee/skills'}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Créer votre première demande
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {requests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      {getStatusIcon(request.status)}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{request.skillName}</h3>
                      <p className="text-sm text-gray-600">{request.reason}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {getStatusBadge(request.status)}
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">
                          {getRequestTypeLabel(request.requestType)}
                        </span>
                        {request.requestType === 'improvement' && (
                          <>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500">
                              Niveau {request.currentLevel} → {request.targetLevel}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Soumis le</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(request.createdAt)}
                      </p>
                      {(request.status === 'approved' || request.status === 'rejected') && (
                        <p className="text-xs text-gray-500">
                          {getTimeUntilDeletion(request.updatedAt)}
                        </p>
                      )}
                    </div>
                    {request.certificateUrl && (
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowCertificateModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-700 p-2"
                        title="Voir le certificat"
                      >
                        <DocumentTextIcon className="h-5 w-5" />
                      </button>
                    )}
                    {(request.status === 'approved' || request.status === 'rejected') && !request.seenByUser && (
                      <button
                        onClick={() => markRequestAsSeen(request.id)}
                        className="text-green-600 hover:text-green-700 p-2"
                        title="Marquer comme vu"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                    )}
                    {(request.status === 'approved' || request.status === 'rejected') && (
                      <button
                        onClick={() => dismissRequest(request.id)}
                        className="text-gray-600 hover:text-gray-700 p-2"
                        title="Archiver la demande"
                      >
                        <ArchiveBoxIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
                
                {request.managerComment && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Commentaire du manager:</span> {request.managerComment}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Certificate Modal */}
      {showCertificateModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Certificat - {selectedRequest.skillName}</h3>
                <button
                  onClick={() => setShowCertificateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-gray-900">{selectedRequest.certificateDescription}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fichier</label>
                  <a
                    href={selectedRequest.certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    Voir le certificat
                  </a>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowCertificateModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillRequests;
