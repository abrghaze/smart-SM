import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import { 
  CheckIcon, 
  XMarkIcon, 
  DocumentIcon, 
  UserIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const ProgressApprovals = () => {
  const { user } = useAuth();
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [managerNotes, setManagerNotes] = useState('');

  useEffect(() => {
    loadPendingUpdates();
  }, []);

  const loadPendingUpdates = async () => {
    try {
      setLoading(true);
      const response = await dataService.getPendingProgressUpdates();
      setPendingUpdates(response.updates || []);
    } catch (error) {
      console.error('Error loading pending updates:', error);
      toast.error('Erreur lors du chargement des demandes de progression');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedUpdate) return;

    try {
      setApproving(true);
      await dataService.approveProgressUpdate(selectedUpdate.id, { managerNotes });
      toast.success('Progression approuvée avec succès');
      setShowApprovalModal(false);
      setSelectedUpdate(null);
      setManagerNotes('');
      loadPendingUpdates(); // Reload the list
    } catch (error) {
      console.error('Error approving progress update:', error);
      toast.error(error.message || 'Erreur lors de l\'approbation');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedUpdate) return;

    try {
      setRejecting(true);
      await dataService.rejectProgressUpdate(selectedUpdate.id, { managerNotes });
      toast.success('Progression rejetée');
      setShowRejectionModal(false);
      setSelectedUpdate(null);
      setManagerNotes('');
      loadPendingUpdates(); // Reload the list
    } catch (error) {
      console.error('Error rejecting progress update:', error);
      toast.error(error.message || 'Erreur lors du rejet');
    } finally {
      setRejecting(false);
    }
  };

  const handleDownloadProof = async (fileId, fileName) => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement');
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
    return new Date(dateString).toLocaleDateString('fr-FR');
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
        <h1 className="text-2xl font-bold text-gray-900">Approbations de progrès</h1>
        <p className="text-gray-600">Approuvez ou rejetez les demandes de mise à jour de progression de vos employés</p>
      </div>

      {pendingUpdates.length === 0 ? (
        <div className="card text-center py-12">
          <CheckIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune demande en attente</h3>
          <p className="text-gray-600">
            Toutes les demandes de progression ont été traitées.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingUpdates.map((update) => (
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
                <div className="flex items-center space-x-2">
                  <span className="badge badge-warning">En attente</span>
                </div>
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
                      onClick={() => handleDownloadProof(update.proofFile.id, update.proofFile.originalName)}
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
          ))}
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedUpdate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Approuver la progression</h3>
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
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
                    Objectif
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <span className="font-medium">{selectedUpdate.objective.title}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employé
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <span className="font-medium">
                      {selectedUpdate.author.firstName} {selectedUpdate.author.lastName}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nouvelle progression
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <span className="font-medium">{selectedUpdate.progress}%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes du manager (optionnel)
                  </label>
                  <textarea
                    value={managerNotes}
                    onChange={(e) => setManagerNotes(e.target.value)}
                    className="input-field"
                    rows="3"
                    placeholder="Ajoutez des commentaires sur cette approbation..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedUpdate(null);
                    setManagerNotes('');
                  }}
                  className="btn-secondary"
                  disabled={approving}
                >
                  Annuler
                </button>
                <button
                  onClick={handleApprove}
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
      {showRejectionModal && selectedUpdate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Rejeter la progression</h3>
                <button
                  onClick={() => {
                    setShowRejectionModal(false);
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
                    Objectif
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <span className="font-medium">{selectedUpdate.objective.title}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employé
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <span className="font-medium">
                      {selectedUpdate.author.firstName} {selectedUpdate.author.lastName}
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
                    placeholder="Expliquez pourquoi cette progression est rejetée..."
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowRejectionModal(false);
                    setSelectedUpdate(null);
                    setManagerNotes('');
                  }}
                  className="btn-secondary"
                  disabled={rejecting}
                >
                  Annuler
                </button>
                <button
                  onClick={handleReject}
                  className="btn-danger"
                  disabled={rejecting || !managerNotes.trim()}
                >
                  {rejecting ? 'Rejet...' : 'Rejeter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressApprovals;


