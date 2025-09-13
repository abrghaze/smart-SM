import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import { AcademicCapIcon, CheckIcon, XMarkIcon, EyeIcon, ClockIcon, UserIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { getSkillLevelName } from '../../utils/skillLevels';

const SkillApprovals = () => {
  const { user, isAuthLoading } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionComment, setRejectionComment] = useState('');
  const [modifiedSkillName, setModifiedSkillName] = useState('');
  const [modifiedSkillDescription, setModifiedSkillDescription] = useState('');

  // Load skill requests for admin approval
  useEffect(() => {
    if (isAuthLoading || !user) {
      return;
    }
    
    loadSkillRequests();
  }, [isAuthLoading, user]);

  const loadSkillRequests = async () => {
    try {
      setLoading(true);
      console.log('🔍 Admin loading skill requests with status: pending_admin');
      const requests = await dataService.getSkillRequests({ status: 'pending_admin' });
      console.log('📋 Admin requests array from dataService:', requests);
      setRequests(requests);
      console.log('✅ Admin loaded skill requests:', {
        totalCount: requests.length,
        requests: requests.map(r => ({
          id: r.id,
          type: r.type,
          status: r.status,
          requesterRole: r.requester?.role,
          skillName: r.requested_skill_name,
          createdAt: r.created_at
        }))
      });
    } catch (error) {
      console.error('Error loading skill requests:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending_manager: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-200',
      pending_admin: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-200',
      approved: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-200',
      rejected: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-200'
    };
    const labels = {
      pending_manager: 'En attente manager',
      pending_admin: 'En attente admin',
      approved: 'Approuvé',
      rejected: 'Rejeté'
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getRequestTypeLabel = (type) => {
    const labels = {
      'add_existing': 'Ajout de compétence',
      'upgrade': 'Mise à niveau',
      'create_new': 'Création de nouvelle compétence'
    };
    return labels[type] || type;
  };

  const handleApprove = async () => {
    try {
      setLoading(true);
      
      if (selectedRequest.type === 'create_new') {
        // For create_new requests, send modified data to backend for skill creation
        // Use modified values if provided, otherwise use original values
        const finalSkillName = modifiedSkillName || selectedRequest.requestedSkillName;
        const finalSkillDescription = modifiedSkillDescription || selectedRequest.skillDescription;
        
        console.log('🚀 Admin approving create_new request with final data:', {
          name: finalSkillName,
          description: finalSkillDescription
        });
        
        // Send approval with final skill data
        await dataService.approveSkillRequest(
          selectedRequest.id, 
          approvalComment || '', // Ensure comment is always a string
          undefined, // grantedLevel
          finalSkillName,
          finalSkillDescription
        );
      } else {
        // For other request types, send regular approval
        await dataService.approveSkillRequest(
          selectedRequest.id, 
          approvalComment || '', // Ensure comment is always a string
          undefined // grantedLevel
        );
      }
      
      toast.success('Demande approuvée avec succès');
      setShowApproveModal(false);
      setSelectedRequest(null);
      setApprovalComment('');
      setModifiedSkillName('');
      setModifiedSkillDescription('');
      loadSkillRequests(); // Reload requests
    } catch (error) {
      console.error('Error approving skill request:', error);
      toast.error(error.message || 'Erreur lors de l\'approbation de la demande');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCertificate = async (file) => {
    try {
      const response = await fetch(`/api/files/${file.id}/download`);
      if (!response.ok) {
        throw new Error(`Erreur lors du téléchargement: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      
      toast.success('Fichier téléchargé avec succès');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error(`Erreur lors du téléchargement: ${error.message}`);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);
      await dataService.rejectSkillRequest(
        selectedRequest.id, 
        rejectionComment || '' // Ensure comment is always a string
      );
      
      toast.success('Demande rejetée');
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionComment('');
      loadSkillRequests(); // Reload requests
    } catch (error) {
      console.error('Error rejecting skill request:', error);
      toast.error(error.message || 'Erreur lors du rejet de la demande');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isAuthLoading) {
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center">
                  <AcademicCapIcon className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Demandes de compétences</h1>
                <p className="text-gray-600 mt-1">Validez et gérez les demandes de compétences en attente d'approbation</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Demandes en attente</p>
                <p className="text-2xl font-bold text-orange-600">{requests.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
            <h2 className="text-xl font-bold text-gray-900">
              Demandes en attente d'approbation
            </h2>
          </div>
          
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Chargement des demandes...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16">
              <CheckIcon className="h-16 w-16 mx-auto text-green-400 mb-4" />
              <p className="text-gray-500 text-lg">Aucune demande en attente d'approbation</p>
              <p className="text-gray-400 text-sm mt-2">Toutes les demandes ont été traitées</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {requests.map((request) => (
                <div key={request.id} className="p-6 transition-all duration-200 hover:shadow-sm hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                          <DocumentTextIcon className="w-6 h-6 text-orange-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {request.requested_skill_name || request.skillName}
                          </h3>
                          {getStatusBadge(request.status)}
                          <span className="text-sm text-gray-500">
                            {getRequestTypeLabel(request.type)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center space-x-1">
                            <UserIcon className="w-4 h-4" />
                            <span>
                              {request.requester?.firstName} {request.requester?.lastName}
                              {request.requester?.role && ` (${request.requester.role})`}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <ClockIcon className="w-4 h-4" />
                            <span>{formatDate(request.created_at)}</span>
                          </div>
                        </div>
                        
                        {request.description && (
                          <p className="text-gray-600 text-sm">{request.description}</p>
                        )}
                        
                        {request.type === 'upgrade' && request.currentLevel && request.requestedLevel && (
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-sm text-gray-500">Niveau actuel:</span>
                            <span className="text-sm font-medium text-gray-700">
                              {getSkillLevelName(request.currentLevel)}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="text-sm font-medium text-gray-700">
                              {getSkillLevelName(request.requestedLevel)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowCertificateModal(true);
                        }}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
                        title="Voir le certificat"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setModifiedSkillName(request.requested_skill_name || request.skillName);
                          setModifiedSkillDescription(request.skillDescription || request.description);
                          setShowApproveModal(true);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg flex items-center space-x-2"
                        title="Approuver la demande"
                      >
                        <CheckIcon className="w-4 h-4" />
                        <span>Approuver</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowRejectModal(true);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg flex items-center space-x-2"
                        title="Rejeter la demande"
                      >
                        <XMarkIcon className="w-4 h-4" />
                        <span>Rejeter</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Approuver la demande</h3>
              <button
                onClick={() => setShowApproveModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center space-x-2">
                  <CheckIcon className="w-5 h-5 text-green-600" />
                  <span className="text-green-800 font-medium">Demande de: {selectedRequest.requester?.firstName} {selectedRequest.requester?.lastName}</span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  {getRequestTypeLabel(selectedRequest.type)} - {selectedRequest.requested_skill_name || selectedRequest.skillName}
                </p>
              </div>
              
              {selectedRequest.type === 'create_new' && (
                <>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Nom de la compétence (modifiable)</label>
                    <input
                      type="text"
                      value={modifiedSkillName}
                      onChange={(e) => setModifiedSkillName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                      placeholder="Nom de la compétence"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Description (modifiable)</label>
                    <textarea
                      value={modifiedSkillDescription}
                      onChange={(e) => setModifiedSkillDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white resize-none"
                      placeholder="Description de la compétence"
                    />
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Commentaire (optionnel)</label>
                <textarea
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white resize-none"
                  placeholder="Commentaire d'approbation..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => setShowApproveModal(false)}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleApprove}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium disabled:opacity-50 shadow-md hover:shadow-lg flex items-center space-x-2"
              >
                <CheckIcon className="w-4 h-4" />
                <span>{loading ? 'Approbation...' : 'Approuver'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Rejeter la demande</h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center space-x-2">
                  <XMarkIcon className="w-5 h-5 text-red-600" />
                  <span className="text-red-800 font-medium">Demande de: {selectedRequest.requester?.firstName} {selectedRequest.requester?.lastName}</span>
                </div>
                <p className="text-red-700 text-sm mt-1">
                  {getRequestTypeLabel(selectedRequest.type)} - {selectedRequest.requested_skill_name || selectedRequest.skillName}
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Raison du rejet</label>
                <textarea
                  value={rejectionComment}
                  onChange={(e) => setRejectionComment(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white resize-none"
                  placeholder="Expliquez pourquoi cette demande est rejetée..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                disabled={loading || !rejectionComment.trim()}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium disabled:opacity-50 shadow-md hover:shadow-lg flex items-center space-x-2"
              >
                <XMarkIcon className="w-4 h-4" />
                <span>{loading ? 'Rejet...' : 'Rejeter'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {showCertificateModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Certificat de compétence</h3>
              <button
                onClick={() => setShowCertificateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center space-x-2">
                  <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-blue-800 font-medium">Certificat soumis</span>
                </div>
                <p className="text-blue-700 text-sm mt-1">
                  {selectedRequest.requester?.firstName} {selectedRequest.requester?.lastName} - {selectedRequest.requested_skill_name || selectedRequest.skillName}
                </p>
              </div>
              
              {selectedRequest.certificateFile ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Fichier du certificat</label>
                    <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <DocumentTextIcon className="w-8 h-8 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{selectedRequest.certificateFile.originalName}</p>
                          <p className="text-xs text-gray-500">
                            {Math.round(selectedRequest.certificateFile.sizeBytes / 1024)} KB
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDownloadCertificate(selectedRequest.certificateFile)}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-medium"
                  >
                    <EyeIcon className="w-4 h-4" />
                    <span>Télécharger le certificat</span>
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">Aucun certificat joint à cette demande</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => setShowCertificateModal(false)}
                className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillApprovals;












