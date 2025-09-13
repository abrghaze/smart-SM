import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import { AcademicCapIcon, CheckIcon, XMarkIcon, EyeIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { getSkillLevelName } from '../../utils/skillLevels';

const SkillRequests = () => {
  const { user, isAuthLoading } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionComment, setRejectionComment] = useState('');
  const [approvedLevel, setApprovedLevel] = useState(1);

  // Load skill requests for manager's team
  useEffect(() => {
    // Don't fetch data if auth is still loading
    if (isAuthLoading || !user) {
      return;
    }
    
    loadSkillRequests();
  }, [isAuthLoading, user]);

  const loadSkillRequests = async () => {
    try {
      setLoading(true);
      const requestsData = await dataService.getMyManagerSkillRequests();
      setRequests(requestsData || []);
      console.log('Loaded skill requests:', requestsData?.length);
    } catch (error) {
      console.error('Error loading skill requests:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending_manager: 'bg-yellow-100 text-yellow-800',
      pending_admin: 'bg-green-100 text-green-800',
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

  const handleApprove = async () => {
    try {
      setLoading(true);
      // Send null instead of empty string for optional comment
      const commentToSend = approvalComment.trim() === '' ? null : approvalComment.trim();
      await dataService.approveSkillRequest(selectedRequest.id, commentToSend, approvedLevel);
      toast.success('Demande approuvée avec succès');
      setShowApproveModal(false);
      setSelectedRequest(null);
      setApprovalComment('');
      setApprovedLevel(1);
      loadSkillRequests(); // Reload data
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error(error.message || 'Erreur lors de l\'approbation');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);
      // Send null instead of empty string for optional comment
      const commentToSend = rejectionComment.trim() === '' ? null : rejectionComment.trim();
      await dataService.rejectSkillRequest(selectedRequest.id, commentToSend);
      toast.error('Demande rejetée');
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionComment('');
      loadSkillRequests(); // Reload data
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error(error.message || 'Erreur lors du rejet');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setApprovedLevel(request.targetLevel || 1);
    setShowDetailsModal(true);
  };

  const handleApproveClick = (request) => {
    setSelectedRequest(request);
    // Ensure the approved level is not lower than current level
    const currentLevel = request.currentLevel || 0;
    const targetLevel = request.targetLevel || 1;
    const initialLevel = Math.max(targetLevel, currentLevel + 1);
    setApprovedLevel(initialLevel);
    setShowApproveModal(true);
  };

  const handleRejectClick = (request) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const handleDownloadCertificate = async (requestId) => {
    try {
      const response = await fetch(`/api/skill-requests/${requestId}/certificate`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download certificate');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'certificate';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Certificat téléchargé avec succès');
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast.error('Erreur lors du téléchargement du certificat');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRequestTypeLabel = (type) => {
    const labels = {
      'add_existing': 'Ajout de compétence',
      'upgrade': 'Mise à niveau',
      'create_new': 'Création de nouvelle compétence'
    };
    return labels[type] || type;
  };

  if (loading && requests.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Demandes de compétences</h1>
          <p className="text-gray-600">Traitez les demandes de compétences de votre équipe</p>
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
            <p className="text-gray-500">Aucune demande de compétence en attente</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {requests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <AcademicCapIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{request.requestedSkillName || request.skill?.name || 'N/A'}</h3>
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
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">
                          {request.employeeName}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Soumis le</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(request.createdAt)}
                      </p>
                      {request.certificateFileId && (
                        <p className="text-xs text-green-600 font-medium">📄 Certificat fourni</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleViewDetails(request)}
                      className="text-blue-600 hover:text-blue-700 p-2"
                      title="Voir les détails"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    {request.certificateFileId && (
                      <button
                        onClick={() => handleDownloadCertificate(request.id)}
                        className="text-green-600 hover:text-green-700 p-2"
                        title="Télécharger le certificat"
                      >
                        <DocumentArrowDownIcon className="h-5 w-5" />
                      </button>
                    )}
                    {request.status === 'pending_manager' && (
                      <>
                        <button
                          onClick={() => handleApproveClick(request)}
                          className="text-green-600 hover:text-green-700 p-2"
                          title="Approuver"
                        >
                          <CheckIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleRejectClick(request)}
                          className="text-red-600 hover:text-red-700 p-2"
                          title="Rejeter"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                {request.managerComment && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Votre commentaire:</span> {request.managerComment}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Approuver la demande - {selectedRequest.skill?.name || selectedRequest.requestedSkillName || 'N/A'}
              </h3>
              
              {/* Request Details */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-gray-900 mb-3">Détails de la demande</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Type de demande:</span>
                    <p className="text-gray-900">{getRequestTypeLabel(selectedRequest.type)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Employé:</span>
                    <p className="text-gray-900">{selectedRequest.requester?.firstName} {selectedRequest.requester?.lastName}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Compétence:</span>
                    <p className="text-gray-900">{selectedRequest.skill?.name || selectedRequest.requestedSkillName || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Niveau actuel:</span>
                    <p className="text-gray-900">{selectedRequest.currentLevel || 0}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Niveau demandé:</span>
                    <p className="text-gray-900">{selectedRequest.targetLevel}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium text-gray-700">Raison:</span>
                    <p className="text-gray-900">{selectedRequest.reason}</p>
                  </div>
                  {selectedRequest.certificateFileId && (
                    <div className="col-span-2">
                      <span className="font-medium text-gray-700">Certificat:</span>
                      <p className="text-gray-900">Certificat fourni</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Niveau accordé (basé sur le certificat)
                  </label>
                  <select
                    value={approvedLevel}
                    onChange={(e) => setApprovedLevel(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {(() => {
                      const currentLevel = selectedRequest.currentLevel || 0;
                      const availableLevels = [1, 2, 3, 4, 5].filter(level => level > currentLevel);
                      
                      if (availableLevels.length === 0) {
                        return <option value={currentLevel + 1}>Aucun niveau supérieur disponible</option>;
                      }
                      
                      return availableLevels.map(level => (
                        <option key={level} value={level}>
                          Niveau {level} - {getSkillLevelName(level)}
                        </option>
                      ));
                    })()}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire (optionnel)</label>
                  <textarea
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ajoutez un commentaire pour l'employé..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Approbation...' : 'Approuver'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Rejeter la demande - {selectedRequest.requestedSkillName || selectedRequest.skill?.name || 'N/A'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Raison du rejet (optionnel)</label>
                  <textarea
                    value={rejectionComment}
                    onChange={(e) => setRejectionComment(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Expliquez pourquoi vous rejetez cette demande..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Rejet...' : 'Rejeter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[700px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Détails de la demande - {selectedRequest.requestedSkillName || selectedRequest.skill?.name || 'N/A'}
                </h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Request Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Informations de la demande</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Type de demande:</span>
                      <p className="text-gray-900">{getRequestTypeLabel(selectedRequest.type)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Statut:</span>
                      <p className="text-gray-900">{getStatusBadge(selectedRequest.status)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Employé:</span>
                      <p className="text-gray-900">{selectedRequest.requester?.firstName} {selectedRequest.requester?.lastName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Email:</span>
                      <p className="text-gray-900">{selectedRequest.requester?.email}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Compétence:</span>
                      <p className="text-gray-900">{selectedRequest.requestedSkillName || selectedRequest.skill?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Niveau demandé:</span>
                      <p className="text-gray-900">{selectedRequest.targetLevel}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium text-gray-700">Raison:</span>
                      <p className="text-gray-900">{selectedRequest.reason}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Date de soumission:</span>
                      <p className="text-gray-900">{formatDate(selectedRequest.createdAt)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Certificat:</span>
                      <p className="text-gray-900">
                        {selectedRequest.certificate ? (
                          <span className="text-green-600 font-medium">
                            📄 {selectedRequest.certificate.originalName}
                          </span>
                        ) : (
                          <span className="text-gray-500">Non fourni</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Certificate Section */}
                {selectedRequest.certificate && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Certificat fourni</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="font-medium text-gray-700">Nom du fichier:</span>
                        <p className="text-gray-900">{selectedRequest.certificate.originalName}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Taille:</span>
                        <p className="text-gray-900">{(selectedRequest.certificate.sizeBytes / 1024).toFixed(1)} KB</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Type:</span>
                        <p className="text-gray-900">{selectedRequest.certificate.mimeType}</p>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setShowDetailsModal(false);
                          setShowCertificateModal(true);
                        }}
                        className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-white hover:bg-blue-50"
                      >
                        <EyeIcon className="h-4 w-4 mr-2" />
                        Voir le certificat
                      </button>
                      <a
                        href={selectedRequest.certificate.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-2 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-white hover:bg-green-50"
                      >
                        <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                        Télécharger
                      </a>
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                {selectedRequest.status === 'pending_manager' && (
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleRejectClick(selectedRequest);
                      }}
                      className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors"
                    >
                      Rejeter
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleApproveClick(selectedRequest);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      Approuver
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {showCertificateModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Certificat - {selectedRequest.requestedSkillName || selectedRequest.skill?.name || 'N/A'}</h3>
                <button
                  onClick={() => setShowCertificateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Informations du certificat</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Employé:</span>
                      <p className="text-gray-900">{selectedRequest.requester?.firstName} {selectedRequest.requester?.lastName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Compétence:</span>
                      <p className="text-gray-900">{selectedRequest.requestedSkillName || selectedRequest.skill?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Type de demande:</span>
                      <p className="text-gray-900">{getRequestTypeLabel(selectedRequest.type)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Date de soumission:</span>
                      <p className="text-gray-900">{formatDate(selectedRequest.createdAt)}</p>
                    </div>
                  </div>
                </div>
                
                {selectedRequest.certificate && (
                  <>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Informations du certificat</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Nom du fichier:</span>
                          <p className="text-gray-900">{selectedRequest.certificate.originalName}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Taille:</span>
                          <p className="text-gray-900">{(selectedRequest.certificate.sizeBytes / 1024).toFixed(1)} KB</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Type:</span>
                          <p className="text-gray-900">{selectedRequest.certificate.mimeType}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Actions</label>
                      <div className="flex space-x-3">
                        <a
                          href={selectedRequest.certificate.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-white hover:bg-blue-50"
                        >
                          <EyeIcon className="h-4 w-4 mr-2" />
                          Voir le certificat
                        </a>
                        <a
                          href={selectedRequest.certificate.downloadUrl}
                          download={selectedRequest.certificate.originalName}
                          className="inline-flex items-center px-3 py-2 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-white hover:bg-green-50"
                        >
                          <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                          Télécharger
                        </a>
                      </div>
                    </div>
                  </>
                )}
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