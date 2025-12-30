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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-indigo-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Chargement de vos objectifs...</p>
        </div>
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
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <FlagIcon className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Mes Objectifs</h1>
                <p className="text-gray-600 mt-1">Suivez vos objectifs et vos progrès</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] flex items-center space-x-2"
            >
              <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Actualisation...' : 'Actualiser'}</span>
            </button>
          </div>
        </div>

      {targets.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16">
          <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FlagIcon className="h-10 w-10 text-indigo-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun objectif assigné</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Vous n'avez pas encore d'objectifs assignés. Contactez votre manager pour en discuter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {targets.map((target) => (
            <div 
              key={target.id} 
              className={`bg-white rounded-2xl shadow-sm border-2 p-6 transition-all duration-200 hover:shadow-lg ${
                target.isTeamContribution 
                  ? 'border-l-4 border-l-blue-500 border-blue-100 bg-gradient-to-r from-blue-50 to-white' 
                  : 'border-gray-100 hover:border-indigo-200'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center flex-wrap">
                    {target.isTeamContribution ? (
                      <>
                        <span className="mr-2">Contribution à l'objectif d'équipe: {target.title}</span>
                        <span className="text-sm font-medium text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                          Équipe: {target.team?.name || 'Non assigné'}
                        </span>
                      </>
                    ) : target.isIndividualTarget ? (
                      <>
                        <span className="mr-2">{target.individualTitle || target.title}</span>
                        <span className="text-sm font-medium text-green-600 bg-green-100 px-3 py-1 rounded-full">
                          Objectif personnalisé
                        </span>
                      </>
                    ) : (
                      target.title
                    )}
                  </h3>
                  <p className="text-gray-600 mt-2">
                    {target.isTeamContribution ? (target.contributionDescription || target.description) : 
                     target.isIndividualTarget ? (target.individualDescription || target.description) : 
                     target.description}
                  </p>
                  {target.isTeamContribution && (
                    <p className="text-sm text-blue-600 mt-2 bg-blue-50 inline-block px-3 py-1 rounded-lg">
                      🎯 Objectif d'équipe: {target.title}
                    </p>
                  )}
                  {target.isIndividualTarget && target.individualDescription && (
                    <p className="text-sm text-green-600 mt-2 bg-green-50 inline-block px-3 py-1 rounded-lg">
                      📝 {target.individualDescription}
                    </p>
                  )}
                  {target.isIndividualTarget && target.individualFile && (
                    <div className="flex items-center text-sm text-green-600 mt-2 bg-green-50 inline-flex px-3 py-2 rounded-lg">
                      <DocumentIcon className="h-4 w-4 mr-2" />
                      <span className="mr-3">Fichier: {target.individualFile.name}</span>
                      <button className="px-3 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium">
                        Télécharger
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end space-y-2 ml-4">
                  {target.isTeamContribution && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm">
                      👥 Contribution d'équipe
                    </span>
                  )}
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                    getCalculatedStatus(target) === 'completed' 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                      : getCalculatedStatus(target) === 'in_progress'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                      : target.status === 'pending_approval'
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {target.status === 'pending_approval' ? '⏳ En attente d\'approbation' : getStatusLabel(getCalculatedStatus(target))}
                  </span>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Only show skill information for individual objectives, not team contributions */}
                {!target.isTeamContribution && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 flex items-center">
                      <span className="w-2 h-2 bg-indigo-400 rounded-full mr-2"></span>
                      Compétence: <span className="font-medium text-gray-900 ml-1">{target.skill?.name || 'Non spécifiée'}</span>
                    </span>
                    <span className="text-gray-600 flex items-center">
                      <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                      Niveau cible: <span className="font-semibold text-indigo-600 ml-1">{target.targetLevel || 'Non spécifié'}</span>
                    </span>
                  </div>
                )}
                
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Progression</span>
                    <span className={`font-bold ${
                      (target.progress || 0) >= 100 ? 'text-green-600' :
                      (target.progress || 0) >= 50 ? 'text-blue-600' : 'text-indigo-600'
                    }`}>{target.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        target.isTeamContribution 
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                          : (target.progress || 0) >= 100 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                      }`}
                      style={{ width: `${target.progress || 0}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Footer */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <div className="flex items-center text-sm text-gray-500">
                    <ClockIcon className="h-5 w-5 mr-2 text-gray-400" />
                    <span>Échéance: <span className="font-medium text-gray-700">
                      {target.isIndividualTarget && target.individualDeadline ? 
                        formatDate(target.individualDeadline) : 
                        formatDate(target.deadline)}
                    </span></span>
                    {target.isIndividualTarget && target.individualDeadline && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-600 rounded-full font-medium">
                        personnalisée
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => handleViewDetails(target)}
                      className="px-4 py-2 border-2 border-gray-200 text-gray-700 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 font-medium text-sm"
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
                      className={`px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                        target.isTeamContribution 
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700' 
                          : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700'
                      }`}
                      disabled={loading || target.status === 'pending_approval'}
                    >
                      {target.status === 'pending_approval' ? '⏳ En attente' : '📈 Mettre à jour'}
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
    </div>
  );
};

export default Targets; 