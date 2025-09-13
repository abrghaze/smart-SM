import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import dataService from '../../services/api';
import ConfirmationModal from '../common/ConfirmationModal';

const TeamPerformanceDashboard = ({ team, onClose }) => {
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedMembers, setExpandedMembers] = useState(new Set());
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, id: null, title: null });

  useEffect(() => {
    if (team) {
      loadTeamPerformance();
    }
  }, [team]);

  const loadTeamPerformance = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading team performance for team:', team.id);
      
      const data = await dataService.getTeamPerformance(team.id);
      console.log('✅ Team performance data loaded:', data);
      
      setPerformanceData(data);
    } catch (error) {
      console.error('❌ Error loading team performance:', error);
      toast.error('Erreur lors du chargement des données de performance');
    } finally {
      setLoading(false);
    }
  };

  const toggleMemberExpansion = (memberId) => {
    const newExpanded = new Set(expandedMembers);
    if (newExpanded.has(memberId)) {
      newExpanded.delete(memberId);
    } else {
      newExpanded.add(memberId);
    }
    setExpandedMembers(newExpanded);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'not_started':
        return 'bg-gray-100 text-gray-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'in_progress':
        return <ClockIcon className="w-4 h-4" />;
      case 'not_started':
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'overdue':
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'bg-green-600';
    if (progress >= 50) return 'bg-blue-600';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non définie';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const handleDeleteObjective = (objectiveId, objectiveTitle, type) => {
    setDeleteModal({
      isOpen: true,
      type: type,
      id: objectiveId,
      title: objectiveTitle
    });
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      
      if (deleteModal.type === 'team') {
        await dataService.deleteObjective(deleteModal.id);
      } else if (deleteModal.type === 'individual') {
        await dataService.deleteIndividualTarget(deleteModal.id);
      } else if (deleteModal.type === 'contribution') {
        await dataService.deleteContribution(deleteModal.id);
      }
      
      // Refresh data after deletion
      await loadTeamPerformance();
      
      // Close modal
      setDeleteModal({ isOpen: false, type: null, id: null, title: null });
      
    } catch (error) {
      console.error('Error deleting objective:', error);
      // Error is already handled by dataService
    } finally {
      setLoading(false);
    }
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, type: null, id: null, title: null });
  };

  // Function to map database category values to French display values
  const getCategoryDisplayName = (category) => {
    switch (category) {
      case 'personal_improvement':
        return 'Amélioration personnelle';
      case 'company_project':
        return 'Contribution d\'équipe';
      default:
        return category || 'Non définie';
    }
  };

  // IMPROVED: Calculate status based on progress instead of using static status
  const getCalculatedStatus = (objective) => {
    const progress = parseFloat(objective.progress) || 0;
    
    console.log('🔍 getCalculatedStatus called for objective:', {
      title: objective.title,
      progress: objective.progress,
      parsedProgress: progress,
      hasStaticStatus: !!objective.status,
      staticStatus: objective.status
    });
    
    if (progress >= 100) {
      console.log('✅ Status: completed (100% progress)');
      return 'completed';
    } else if (progress > 0) {
      console.log('✅ Status: in_progress (progress > 0%)');
      return 'in_progress';
    } else {
      console.log('✅ Status: not_started (0% progress)');
      return 'not_started';
    }
  };

  // IMPROVED: Convert English status to French labels
  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Terminé';
      case 'in_progress':
        return 'En cours';
      case 'not_started':
        return 'Non commencé';
      case 'overdue':
        return 'En retard';
      default:
        return 'Non commencé';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!performanceData) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
          <div className="text-center py-8">
            <p className="text-gray-500">Aucune donnée de performance disponible</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-11/12 max-w-7xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Tableau de bord de performance - {performanceData.team.name}
            </h2>
            <p className="text-gray-600 mt-1">
              Vue d'ensemble des objectifs et de la progression de l'équipe
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Performance Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <ChartBarIcon className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Progression globale</p>
                <p className="text-2xl font-bold text-gray-900">
                  {performanceData.performance.overallProgress}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <UserGroupIcon className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Membres</p>
                <p className="text-2xl font-bold text-gray-900">
                  {performanceData.teamMembers.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Objectifs terminés</p>
                <p className="text-2xl font-bold text-gray-900">
                  {performanceData.performance.completedObjectives}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <ClockIcon className="w-8 h-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total objectifs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {performanceData.performance.totalObjectives}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Objectives Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ChartBarIcon className="w-5 h-5 mr-2" />
            Objectifs de l'équipe
          </h3>
          
          {performanceData.teamObjectives.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Aucun objectif d'équipe assigné</p>
            </div>
          ) : (
            <div className="space-y-4">
              {performanceData.teamObjectives.map((objective) => (
                <div key={objective.id} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{objective.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{objective.description}</p>
                      <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                        <span>Catégorie: {getCategoryDisplayName(objective.category)}</span>
                        {objective.skillName && <span>Compétence: {objective.skillName}</span>}
                        <span>Échéance: {formatDate(objective.deadline)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(getCalculatedStatus(objective))}`}>
                        {getStatusLabel(getCalculatedStatus(objective))}
                      </span>
                      <button
                        onClick={() => handleDeleteObjective(objective.id, objective.title, 'team')}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                        title="Supprimer l'objectif d'équipe"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progression: {objective.progress}%</span>
                      <span>{objective.completedContributions}/{objective.totalContributions} contributions terminées</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full">
                      <div 
                        className={`h-2 rounded-full ${getProgressColor(objective.progress)}`} 
                        style={{ width: `${objective.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Team Members Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <UserGroupIcon className="w-5 h-5 mr-2" />
            Membres de l'équipe
          </h3>
          
          <div className="space-y-4">
            {performanceData.teamMembers.map((member) => (
              <div key={member.id} className="bg-white border border-gray-200 rounded-lg">
                {/* Member Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                  onClick={() => toggleMemberExpansion(member.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {getInitials(member.firstName, member.lastName)}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {member.firstName} {member.lastName}
                      </h4>
                      <p className="text-sm text-gray-600">{member.jobTitle}</p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {member.individualObjectives.length} objectifs individuels
                      </p>
                      <p className="text-sm text-gray-600">
                        {member.teamContributions.length} contributions d'équipe
                      </p>
                    </div>
                    {expandedMembers.has(member.id) ? (
                      <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedMembers.has(member.id) && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Individual Objectives */}
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3">Objectifs individuels</h5>
                        {member.individualObjectives.length === 0 ? (
                          <p className="text-sm text-gray-500">Aucun objectif individuel</p>
                        ) : (
                          <div className="space-y-3">
                            {member.individualObjectives.map((objective) => (
                              <div key={objective.id} className="bg-white p-3 rounded border">
                                <div className="flex items-start justify-between mb-2">
                                  <h6 className="font-medium text-sm text-gray-900">{objective.title}</h6>
                                  <div className="flex items-center space-x-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(objective.status)}`}>
                                      {getStatusIcon(objective.status)}
                                    </span>
                                    <button
                                      onClick={() => handleDeleteObjective(objective.id, objective.title, 'individual')}
                                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                      title="Supprimer l'objectif individuel"
                                    >
                                      <TrashIcon className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-600 mb-2">{objective.description}</p>
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                  <span>Progression: {objective.progress}%</span>
                                  <span>Échéance: {formatDate(objective.deadline)}</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-200 rounded-full">
                                  <div 
                                    className={`h-1.5 rounded-full ${getProgressColor(objective.progress)}`} 
                                    style={{ width: `${objective.progress}%` }}
                                  ></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Team Contributions */}
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3">Contributions d'équipe</h5>
                        {member.teamContributions.length === 0 ? (
                          <p className="text-sm text-gray-500">Aucune contribution d'équipe</p>
                        ) : (
                          <div className="space-y-3">
                            {member.teamContributions.map((contribution) => (
                              <div key={contribution.id} className="bg-white p-3 rounded border">
                                <div className="flex items-start justify-between mb-2">
                                  <h6 className="font-medium text-sm text-gray-900">
                                    {/* Display team contribution with just the original title */}
                                    {contribution.title}
                                  </h6>
                                  <div className="flex items-center space-x-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(contribution.status)}`}>
                                      {getStatusIcon(contribution.status)}
                                    </span>
                                    <button
                                      onClick={() => handleDeleteObjective(contribution.id, contribution.title, 'contribution')}
                                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                      title="Supprimer la contribution"
                                    >
                                      <TrashIcon className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Show custom description if available */}
                                {contribution.customDescription && (
                                  <p className="text-xs text-gray-600 mb-1">
                                    {contribution.customDescription}
                                  </p>
                                )}
                                
                                <p className="text-xs text-gray-600 mb-1">
                                  Objectif: {contribution.parentObjectiveTitle}
                                </p>
                                
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                  <span>Progression: {contribution.progress}%</span>
                                  <span>Échéance: {formatDate(contribution.customDeadline || contribution.deadline)}</span>
                                </div>
                                
                                <div className="w-full h-1.5 bg-gray-200 rounded-full">
                                  <div 
                                    className={`h-1.5 rounded-full ${getProgressColor(contribution.progress)}`} 
                                    style={{ width: `${contribution.progress}%` }}
                                  ></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end mt-8">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title={`Supprimer ${deleteModal.type === 'team' ? 'l\'objectif d\'équipe' : deleteModal.type === 'individual' ? 'l\'objectif individuel' : 'la contribution'}`}
        message={`Êtes-vous sûr de vouloir supprimer "${deleteModal.title}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmButtonColor="red"
      />
    </div>
  );
};

export default TeamPerformanceDashboard;
