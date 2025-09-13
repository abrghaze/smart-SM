import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import apiService from '../../services/api';
import toast from 'react-hot-toast';
import { 
  FlagIcon, 
  ClockIcon, 
  XMarkIcon, 
  DocumentIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import ObjectiveDetailsModal from './ObjectiveDetailsModal';
import ProgressUpdateModal from './ProgressUpdateModal';

const Targets = () => {
  const { user, isAuthLoading } = useAuth();
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [showProgressUpdateModal, setShowProgressUpdateModal] = useState(false);
  const [progressUpdate, setProgressUpdate] = useState({
    progress: 0,
    notes: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadTargets = useCallback(async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      console.log('🔍 Starting loadTargets...');
      console.log('🔍 Current user:', user);
      console.log('🔍 User ID:', user?.id);
      
      if (!user?.id) {
        console.log('❌ No user ID available, cannot load targets');
        setTargets([]);
        return;
      }
      
      // Use the employee-specific objectives endpoint
      const objectivesData = await dataService.getMyEmployeeObjectives();
      console.log('🔍 Raw objectives data from backend:', objectivesData);
      console.log('🔍 Data type:', typeof objectivesData);
      console.log('🔍 Is Array?', Array.isArray(objectivesData));
      
      if (!objectivesData || !Array.isArray(objectivesData)) {
        console.log('❌ No objectives data received from backend');
        console.log('🔍 objectivesData:', objectivesData);
        setTargets([]);
        return;
      }
      
      console.log(`🔍 Received ${objectivesData.length} objectives from backend`);
      
      // Log individual objectives for debugging
      const individualObjectives = objectivesData.filter(obj => obj.assigneeType === 'USER');
      console.log(`🔍 Individual objectives found: ${individualObjectives.length}`);
      individualObjectives.forEach((obj, index) => {
        console.log(`  ${index + 1}. "${obj.title}" (Category: ${obj.category}, User: ${obj.assigned_user_first_name})`);
      });
      
      // Process objectives - backend now returns partial targets directly with customized data
      const processedTargets = objectivesData.map(objective => {
        console.log(`🔍 Processing objective:`, {
          id: objective.id,
          title: objective.title,
          category: objective.category,
          isTeamContribution: objective.isTeamContribution,
          parentObjectiveId: objective.parentObjectiveId,
          contributionId: objective.contributionId
        });
        
        // Ensure isTeamContribution is properly set
        // Team contributions are identified by category 'company_project' or having parentObjectiveId
        const isTeamContribution = objective.category === 'company_project' || objective.parentObjectiveId;
        
        return {
                ...objective,
          isTeamContribution,
          assignedTo: objective.assignedTo
        };
      });
      
      console.log('🔍 Final processed targets:', processedTargets);
      console.log(`🔍 Total targets to display: ${processedTargets.length}`);
      
      
      setTargets(processedTargets);
    } catch (error) {
      console.error('Error loading targets:', error);
      toast.error('Erreur lors du chargement des objectifs');
    } finally {
      setLoading(false);
      setRefreshing(false);
      if (showRefreshToast) {
        toast.success('Objectifs mis à jour!');
      }
    }
  }, [user]);

  // Manual refresh function
  const handleRefresh = () => {
    loadTargets(true);
  };

  useEffect(() => {
    // Don't fetch data if auth is still loading
    if (isAuthLoading || !user) {
      return;
    }
    
    loadTargets();
    
    // Set up automatic refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing targets...');
      loadTargets(true);
    }, 30000); // 30 seconds
    
    // Cleanup interval on unmount
    return () => {
      clearInterval(refreshInterval);
    };
  }, [isAuthLoading, user, loadTargets]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      case 'pending_approval':
        return 'text-yellow-600 bg-yellow-100';
      case 'overdue':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // IMPROVED: Calculate status based on progress instead of using static status
  const getCalculatedStatus = (target) => {
    const progress = parseFloat(target.progress) || 0;
    
    if (progress >= 100) {
      return 'completed';
    } else if (progress > 0) {
      return 'in_progress';
    } else {
      return 'not_started';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Terminé';
      case 'in_progress':
        return 'En cours';
      case 'overdue':
        return 'En retard';
      default:
        return 'Non commencé';
    }
  };

  const handleUpdateProgress = async () => {
    try {
      // Validate required fields
      if (!progressUpdate.notes?.trim()) {
        toast.error('Veuillez fournir une description de vos progrès');
        return;
      }
      
      if (!selectedFile) {
        toast.error('Veuillez fournir une preuve de progression (document, screenshot, etc.)');
        return;
      }

      setLoading(true);
      let proofFileId = null;

      // Step 1: Upload file (required)
      setUploadingFile(true);
      try {
        console.log('📤 Starting file upload for:', selectedFile.name);
        console.log('📊 File size:', selectedFile.size, 'bytes');
        console.log('📄 File type:', selectedFile.type);
        
        const fileData = await apiService.uploadFile(selectedFile);
        console.log('✅ File upload successful:', fileData);
        proofFileId = fileData.id;
        toast.success('Fichier téléchargé avec succès');
      } catch (error) {
        console.error('File upload error:', error);
        toast.error(error.message || 'Erreur lors du téléchargement du fichier');
        return;
      } finally {
        setUploadingFile(false);
      }

      // Step 2: Update progress with file ID
      console.log('🔍 Progress update - Target details:', {
        id: selectedTarget.id,
        title: selectedTarget.title,
        isTeamContribution: selectedTarget.isTeamContribution,
        contributionId: selectedTarget.contributionId,
        assigneeType: selectedTarget.assigneeType,
        category: selectedTarget.category
      });
      
      if (selectedTarget.isTeamContribution && selectedTarget.contributionId) {
        console.log('✅ Updating team contribution progress with contributionId:', selectedTarget.contributionId);
        // For team contributions, update the contribution progress
        await dataService.updateContributionProgress(selectedTarget.contributionId, {
          progress: progressUpdate.progress,
          notes: progressUpdate.notes,
          proofFileId: proofFileId
        });
      } else if (selectedTarget.isTeamContribution && !selectedTarget.contributionId) {
        console.error('❌ Team target missing contributionId - cannot update progress');
        toast.error('Erreur: Impossible de mettre à jour la progression de l\'objectif d\'équipe. Veuillez contacter votre manager.');
        return;
      } else {
        console.log('✅ Updating individual objective progress with objectiveId:', selectedTarget.id);
        // For individual objectives, update the objective progress
        await dataService.updateObjectiveProgress(selectedTarget.id, {
          progress: progressUpdate.progress,
          notes: progressUpdate.notes,
          proofFileId: proofFileId
        });
      }
      
      toast.success('Demande de mise à jour de progression envoyée. En attente d\'approbation du manager.');
      setShowProgressModal(false);
      setSelectedTarget(null);
      setProgressUpdate({
        progress: 0,
        notes: ''
      });
      setSelectedFile(null);
      loadTargets(); // Reload data
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour de la progression');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (target) => {
    setSelectedTarget(target);
    setShowDetailsModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non définie';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  if (loading && targets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes objectifs</h1>
          <p className="text-gray-600">Suivez vos objectifs et vos progrès</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>

      {targets.length === 0 ? (
        <div className="card text-center py-12">
          <FlagIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun objectif assigné</h3>
          <p className="text-gray-600">
            Vous n'avez pas encore d'objectifs assignés. Contactez votre manager pour en discuter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {targets.map((target) => (
            <div key={target.id} className={`card ${target.isTeamContribution ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {target.isTeamContribution ? (
                      <>
                        Contribution à l'objectif d'équipe: {target.title}
                        <span className="ml-2 text-sm text-blue-600 font-normal">
                          (Équipe: {target.team?.name || 'Non assigné'})
                        </span>
                      </>
                    ) : target.isIndividualTarget ? (
                      <>
                        {target.individualTitle || target.title}
                        <span className="ml-2 text-sm text-green-600 font-normal">
                          (Objectif personnalisé)
                        </span>
                      </>
                    ) : (
                      target.title
                    )}
                  </h3>
                  <p className="text-gray-600">
                    {target.isTeamContribution ? (target.contributionDescription || target.description) : 
                     target.isIndividualTarget ? (target.individualDescription || target.description) : 
                     target.description}
                  </p>
                  {target.isTeamContribution && (
                    <p className="text-sm text-blue-600 mt-1">
                      Objectif d'équipe: {target.title}
                    </p>
                  )}
                  {target.isIndividualTarget && target.individualDescription && (
                    <p className="text-sm text-green-600 mt-1">
                      Description personnalisée: {target.individualDescription}
                    </p>
                  )}
                  {target.isIndividualTarget && target.individualFile && (
                    <div className="flex items-center text-sm text-green-600 mt-1">
                      <DocumentIcon className="h-4 w-4 mr-1" />
                      Fichier attaché: {target.individualFile.name}
                      <button className="ml-2 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                        Télécharger
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end space-y-2">
                  {target.isTeamContribution && (
                    <span className="badge badge-blue text-xs">
                      Contribution d'équipe
                    </span>
                  )}
                  <span className={`badge ${getStatusColor(getCalculatedStatus(target))}`}>
                    {target.status === 'pending_approval' ? 'En attente d\'approbation' : getStatusLabel(getCalculatedStatus(target))}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                {/* Only show skill information for individual objectives, not team contributions */}
                {!target.isTeamContribution && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Compétence: {target.skill?.name || 'Non spécifiée'}</span>
                  <span>Niveau {target.targetLevel || 'Non spécifié'}</span>
                </div>
                )}
                
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Progression</span>
                    <span>{target.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        target.isTeamContribution ? 'bg-blue-600' : 'bg-green-600'
                      }`}
                      style={{ width: `${target.progress || 0}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center text-gray-500">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    Échéance: {target.isIndividualTarget && target.individualDeadline ? 
                      formatDate(target.individualDeadline) : 
                      formatDate(target.deadline)}
                    {target.isIndividualTarget && target.individualDeadline && (
                      <span className="ml-1 text-xs text-green-600">
                        (personnalisée)
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleViewDetails(target)}
                      className="btn-secondary text-sm"
                    >
                      Voir détails
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedTarget(target);
                        setProgressUpdate({
                          progress: target.progress || 0,
                          notes: ''
                        });
                        setShowProgressModal(true);
                      }}
                      className={`text-sm ${target.isTeamContribution ? 'btn-blue' : 'btn-primary'}`}
                      disabled={loading || target.status === 'pending_approval'}
                    >
                      {target.status === 'pending_approval' ? 'En attente' : 'Mettre à jour'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Progress Update Modal - Now using the modern design */}
      <ProgressUpdateModal
        isOpen={showProgressModal}
        onClose={() => {
                    setShowProgressModal(false);
                    setSelectedFile(null);
                  }}
        objective={selectedTarget}
        onProgressUpdate={async (progressData) => {
          try {
            console.log('🔍 Targets: Progress update submitted via old modal (now modern):', progressData);
            
            // Validate that new progress is not less than current progress
            const currentProgress = selectedTarget.progress || 0;
            if (progressData.progress < currentProgress) {
              toast.error(`La progression ne peut pas être inférieure à ${currentProgress}%`);
              return;
            }
            
            setLoading(true);
            let proofFileId = null;

            // Step 1: Upload file (required)
            try {
              console.log('📤 Starting file upload for old modal (now modern):', progressData.proofFile.name);
              console.log('📊 File size:', progressData.proofFile.size, 'bytes');
              console.log('📄 File type:', progressData.proofFile.type);
              
              const fileData = await apiService.uploadFile(progressData.proofFile);
              console.log('✅ File upload successful for old modal (now modern):', fileData);
              proofFileId = fileData.id;
              toast.success('Fichier téléchargé avec succès');
            } catch (error) {
              console.error('File upload error in old modal (now modern):', error);
              toast.error(error.message || 'Erreur lors du téléchargement du fichier');
              return;
            }

            // Step 2: Update progress with file ID
            console.log('🔍 Progress update - Target details (old modal, now modern):', {
              id: selectedTarget.id,
              title: selectedTarget.title,
              isTeamContribution: selectedTarget.isTeamContribution,
              contributionId: selectedTarget.contributionId,
              assigneeType: selectedTarget.assigneeType,
              category: selectedTarget.category
            });
            
            if (selectedTarget.isTeamContribution && selectedTarget.contributionId) {
              console.log('✅ Updating team contribution progress with contributionId (old modal, now modern):', selectedTarget.contributionId);
              // For team contributions, update the contribution progress
              await dataService.updateContributionProgress(selectedTarget.contributionId, {
                progress: progressData.progress,
                notes: progressData.description,
                proofFileId: proofFileId
              });
            } else if (selectedTarget.isTeamContribution) {
              console.log('✅ Updating team contribution progress (partial target):', selectedTarget.id);
              // For team contributions (partial targets), use the new endpoint
              await dataService.updatePartialTargetProgress(selectedTarget.id, {
                progress: progressData.progress,
                notes: progressData.description,
                proofFileId: proofFileId
              });
            } else {
              console.log('✅ Updating individual objective progress with objectiveId (old modal, now modern):', selectedTarget.id);
              // For individual objectives, update the objective progress
              await dataService.updateObjectiveProgress(selectedTarget.id, {
                progress: progressData.progress,
                notes: progressData.description,
                proofFileId: proofFileId
              });
            }
            
            toast.success('Demande de mise à jour de progression envoyée. En attente d\'approbation du manager.');
            setShowProgressModal(false);
            setSelectedTarget(null);
            
            // Reload targets to show updated progress
            await loadTargets();
          } catch (error) {
            console.error('❌ Targets: Error updating progress via old modal (now modern):', error);
            toast.error(error.message || 'Erreur lors de la mise à jour de la progression');
          } finally {
            setLoading(false);
          }
        }}
      />

      {/* Modernized Objective Details Modal */}
      <ObjectiveDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        objective={selectedTarget}
        onUpdate={() => {
          setShowDetailsModal(false);
          setShowProgressUpdateModal(true);
        }}
      />

      {/* Progress Update Modal */}
      <ProgressUpdateModal
        isOpen={showProgressUpdateModal}
        onClose={() => setShowProgressUpdateModal(false)}
        objective={selectedTarget}
        onProgressUpdate={async (progressData) => {
          try {
            console.log('🔍 Targets: Progress update submitted via modern modal:', progressData);
            
            // Validate that new progress is not less than current progress
            const currentProgress = selectedTarget.progress || 0;
            if (progressData.progress < currentProgress) {
              toast.error(`La progression ne peut pas être inférieure à ${currentProgress}%`);
              return;
            }
            
            setLoading(true);
            let proofFileId = null;

            // Step 1: Upload file (required)
            try {
              console.log('📤 Starting file upload for modern modal:', progressData.proofFile.name);
              console.log('📊 File size:', progressData.proofFile.size, 'bytes');
              console.log('📄 File type:', progressData.proofFile.type);
              
              const fileData = await apiService.uploadFile(progressData.proofFile);
              console.log('✅ File upload successful for modern modal:', fileData);
              proofFileId = fileData.id;
              toast.success('Fichier téléchargé avec succès');
            } catch (error) {
              console.error('File upload error in modern modal:', error);
              toast.error(error.message || 'Erreur lors du téléchargement du fichier');
              return;
            }

            // Step 2: Update progress with file ID
            console.log('🔍 Progress update - Target details (modern modal):', {
              id: selectedTarget.id,
              title: selectedTarget.title,
              isTeamContribution: selectedTarget.isTeamContribution,
              contributionId: selectedTarget.contributionId,
              assigneeType: selectedTarget.assigneeType,
              category: selectedTarget.category
            });
            
            if (selectedTarget.isTeamContribution && selectedTarget.contributionId) {
              console.log('✅ Updating team contribution progress with contributionId (modern modal):', selectedTarget.contributionId);
              // For team contributions, update the contribution progress
              await dataService.updateContributionProgress(selectedTarget.contributionId, {
                progress: progressData.progress,
                notes: progressData.description,
                proofFileId: proofFileId
              });
            } else if (selectedTarget.isTeamContribution && !selectedTarget.contributionId) {
              console.error('❌ Team target missing contributionId - cannot update progress (modern modal)');
              toast.error('Erreur: Impossible de mettre à jour la progression de l\'objectif d\'équipe. Veuillez contacter votre manager.');
              return;
            } else {
              console.log('✅ Updating individual objective progress with objectiveId (modern modal):', selectedTarget.id);
              // For individual objectives, update the objective progress
              await dataService.updateObjectiveProgress(selectedTarget.id, {
                progress: progressData.progress,
                notes: progressData.description,
                proofFileId: proofFileId
              });
            }
            
            toast.success('Demande de mise à jour de progression envoyée. En attente d\'approbation du manager.');
            setShowProgressUpdateModal(false);
            setSelectedTarget(null);
            
            // Reload targets to show updated progress
            await loadTargets();
          } catch (error) {
            console.error('❌ Targets: Error updating progress via modern modal:', error);
            toast.error(error.message || 'Erreur lors de la mise à jour de la progression');
          } finally {
            setLoading(false);
          }
        }}
      />
    </div>
  );
};

export default Targets; 