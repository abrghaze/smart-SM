import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import UserProfileModal from '../common/UserProfileModal';
import JobTitleDetailModal from './JobTitleDetailModal';
import {
  PlusIcon,
  EyeIcon,
  XMarkIcon,
  CheckIcon,
  UserIcon,
  BriefcaseIcon,
  UserGroupIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  TrashIcon,
  UserCircleIcon,
  ChartBarIcon,
  FireIcon,
  StarIcon,
  AcademicCapIcon,
  RocketLaunchIcon,
  LightBulbIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

const JobTitleTargets = () => {
  const { user } = useAuth();
  const [objectives, setObjectives] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showJobTitleModal, setShowJobTitleModal] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState(null);
  const [objectiveToDelete, setObjectiveToDelete] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedJobTitle, setSelectedJobTitle] = useState(null);
  const [formData, setFormData] = useState({
    assignment_type: 'individual', // 'individual' or 'team'
    target_id: '', // employee_id or team_id
    job_title_id: '',
    notes: ''
  });
  const [availableMembers, setAvailableMembers] = useState([]);
  const [memberSkillGaps, setMemberSkillGaps] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [objectivesData, jobTitlesData, teamsData, teamMembersData] = await Promise.all([
        dataService.getManagerJobTitleObjectives(),
        dataService.getJobTitlesForManagers(),
        dataService.getManagerTeams(),
        dataService.getMyTeamMembers()
      ]);
      
      console.log('Objectives data received:', objectivesData);
      console.log('Objectives array:', objectivesData?.objectives);
      setObjectives(objectivesData?.objectives || []);
      setJobTitles(jobTitlesData || []);
      setTeams(teamsData?.managedTeams || []);
      setTeamMembers(teamMembersData?.teamMembers || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableMembersForJobTitle = async (jobTitleId) => {
    if (!jobTitleId) {
      setAvailableMembers([]);
      setMemberSkillGaps({});
      return;
    }

    try {
      const members = await dataService.getAvailableMembersForJobTitle(jobTitleId);
      setAvailableMembers(members || []);
      
      // Extract skill gaps from the members data (now included in the response)
      const gaps = {};
      (members || []).forEach(member => {
        gaps[member.id] = member.skillGap || { totalGap: 0, skillGaps: [], isQualified: false };
      });
      setMemberSkillGaps(gaps);
    } catch (error) {
      console.error('Error loading available members:', error);
      setAvailableMembers([]);
      setMemberSkillGaps({});
    }
  };

  const handleAssignTarget = async (e) => {
    e.preventDefault();
    try {
      const assignmentData = {
        assignment_type: formData.assignment_type,
        target_id: formData.target_id,
        job_title_id: formData.job_title_id,
        notes: formData.notes
      };
      
      await dataService.assignJobTitleObjective(assignmentData);
      toast.success('Objectif de titre de poste assigné avec succès');
      setShowAssignModal(false);
      setFormData({ assignment_type: 'individual', target_id: '', job_title_id: '', notes: '' });
      
      // Reload data, but don't fail the assignment if this fails
      try {
        await loadData();
      } catch (loadError) {
        console.error('Error reloading data after assignment:', loadError);
        // Don't show error to user since assignment was successful
      }
    } catch (error) {
      console.error('Error assigning target:', error);
      toast.error('Erreur lors de l\'assignation de l\'objectif');
    }
  };

  const handleViewObjective = (objective) => {
    setSelectedObjective(objective);
    setShowDetailModal(true);
  };

  const handleConfirmCompletion = async (objective) => {
    try {
      // Update the objective status to completed and remove from list
      await dataService.confirmJobTitleObjectiveCompletion(objective.id);
      
      // Reload the data to refresh the list
      await loadData();
      
      toast.success('Objectif confirmé et retiré de la liste');
    } catch (error) {
      console.error('Error confirming completion:', error);
      toast.error('Erreur lors de la confirmation');
    }
  };

  const handleDeleteObjective = async () => {
    try {
      console.log('🗑️ Attempting to delete objective:', objectiveToDelete.id);
      const result = await dataService.deleteJobTitleObjective(objectiveToDelete.id);
      console.log('✅ Delete successful:', result);
      setShowDeleteModal(false);
      setObjectiveToDelete(null);
      await loadData();
      toast.success('Objectif supprimé avec succès');
    } catch (error) {
      console.error('❌ Error deleting objective:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      toast.error('Erreur lors de la suppression');
    }
  };

  const openDeleteModal = (objective) => {
    setObjectiveToDelete(objective);
    setShowDeleteModal(true);
  };

  const handleViewEmployeeProfile = (employeeId) => {
    console.log('View employee profile:', employeeId);
    setSelectedUserId(employeeId);
    setShowUserProfileModal(true);
  };

  const handleViewJobTitleRequirements = (jobTitleId) => {
    console.log('View job title requirements:', jobTitleId);
    const jobTitle = jobTitles.find(jt => jt.id === jobTitleId);
    if (jobTitle) {
      setSelectedJobTitle(jobTitle);
      setShowJobTitleModal(true);
    } else {
      toast.error('Titre de poste non trouvé');
    }
  };

  const getProgressStatus = (objective) => {
    if (objective.status === 'completed') return 'completed';
    
    // Calculate real progress based on skill gaps
    const skillGap = objective.skillGap;
    if (skillGap && skillGap.skillGaps && skillGap.skillGaps.length > 0) {
      const totalRequired = skillGap.skillGaps.reduce((sum, gap) => sum + gap.requiredLevel, 0);
      const totalCurrent = skillGap.skillGaps.reduce((sum, gap) => sum + Math.min(gap.currentLevel, gap.requiredLevel), 0);
      const realProgress = Math.round((totalCurrent / totalRequired) * 100);
      
      if (realProgress >= 100) return 'completed';
      if (realProgress > 0) return 'in_progress';
    }
    
    return 'assigned';
  };

  const getStatusColor = (status, skillGap) => {
    if (status === 'completed') {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (status === 'ready' || (skillGap && skillGap.isQualified)) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    switch (status) {
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assigned':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status, skillGap) => {
    if (status === 'completed') {
      return 'Terminé';
    }
    if (status === 'ready' || (skillGap && skillGap.isQualified)) {
      return 'Prêt pour le titre de poste';
    }
    switch (status) {
      case 'in_progress':
        return 'En cours';
      case 'assigned':
        return 'Assigné';
      default:
        return 'Inconnu';
    }
  };

  const getStatusIcon = (status, skillGap) => {
    if (status === 'completed') {
      return <CheckIcon className="h-4 w-4" />;
    }
    if (status === 'ready' || (skillGap && skillGap.isQualified)) {
      return <StarIcon className="h-4 w-4" />;
    }
    switch (status) {
      case 'in_progress':
        return <ClockIcon className="h-4 w-4" />;
      case 'assigned':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const getSkillGapIcon = (totalGap) => {
    if (totalGap === 0) return <StarIcon className="h-5 w-5 text-yellow-500" />;
    if (totalGap <= 3) return <LightBulbIcon className="h-5 w-5 text-orange-500" />;
    if (totalGap <= 7) return <FireIcon className="h-5 w-5 text-red-500" />;
    return <RocketLaunchIcon className="h-5 w-5 text-purple-500" />;
  };

  const getSkillGapMessage = (totalGap) => {
    if (totalGap === 0) return "🎯 Prêt pour le titre de poste!";
    if (totalGap <= 3) return "💡 Presque là! Quelques compétences à peaufiner";
    if (totalGap <= 7) return "🔥 Du travail en perspective, mais c'est faisable!";
    return "🚀 Un défi passionnant vous attend!";
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return 'from-green-400 to-emerald-500';
    if (percentage >= 50) return 'from-yellow-400 to-orange-500';
    if (percentage >= 20) return 'from-orange-400 to-red-500';
    return 'from-red-400 to-pink-500';
  };

  const getObjectiveCardGradient = (status, skillGap) => {
    if (status === 'completed' || (skillGap && skillGap.isQualified)) {
      return 'from-green-50 to-emerald-50 border-green-200';
    }
    if (status === 'in_progress') {
      return 'from-blue-50 to-indigo-50 border-blue-200';
    }
    return 'from-yellow-50 to-orange-50 border-yellow-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg font-medium">Chargement des objectifs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Objectifs de Titres de Poste</h1>
              <p className="text-gray-600 mt-1">Gérez les objectifs de titres de poste assignés à vos équipes et membres</p>
            </div>
            <button
              onClick={() => setShowAssignModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Assigner un Objectif</span>
            </button>
          </div>
        </div>
      </div>

      {/* Objectives List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Objectifs Assignés ({objectives.length})</h2>
        </div>
        
        {objectives.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <BriefcaseIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun objectif assigné</h3>
            <p className="text-gray-600 mb-4">Commencez par assigner des objectifs de titres de poste à vos équipes ou membres.</p>
            <button
              onClick={() => setShowAssignModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors mx-auto"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Assigner un Objectif</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {(objectives || []).sort((a, b) => {
              const aStatus = getProgressStatus(a);
              const bStatus = getProgressStatus(b);
              const aSkillGap = a.skillGap || { totalGap: 0, skillGaps: [], isQualified: false };
              const bSkillGap = b.skillGap || { totalGap: 0, skillGaps: [], isQualified: false };
              
              // Prioritize ready/qualified members (100% progress) at the top
              const aIsReady = a.status === 'ready' || aSkillGap.isQualified;
              const bIsReady = b.status === 'ready' || bSkillGap.isQualified;
              
              if (aIsReady && !bIsReady) return -1;
              if (!aIsReady && bIsReady) return 1;
              
              // Then sort by progress percentage (highest first)
              const aProgress = a.progress_percentage || 0;
              const bProgress = b.progress_percentage || 0;
              return bProgress - aProgress;
            }).map((objective) => {
              const status = getProgressStatus(objective);
              const skillGap = objective.skillGap || { totalGap: 0, skillGaps: [], isQualified: false };
              const cardGradient = getObjectiveCardGradient(status, skillGap);
              
              return (
                <div key={objective.id} className={`bg-gradient-to-br ${cardGradient} rounded-2xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
                  {/* Header */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                          <BriefcaseIcon className="h-7 w-7 text-white" />
                        </div>
                        <div>
                          <button
                            onClick={() => handleViewJobTitleRequirements(objective.job_title_id)}
                            className="text-xl font-bold text-gray-900 hover:text-purple-600 transition-colors cursor-pointer"
                          >
                            {objective.job_title_name}
                          </button>
                          <p className="text-sm text-gray-600 mt-1">{objective.job_title_description}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border-2 ${getStatusColor(status, skillGap)}`}>
                        {getStatusIcon(status, skillGap)}
                        <span className="ml-2">{getStatusText(status, skillGap)}</span>
                      </span>
                    </div>

                    {/* Employee Info */}
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                        <UserIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <button
                          onClick={() => handleViewEmployeeProfile(objective.target_id)}
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          {objective.target_name}
                        </button>
                        <p className="text-sm text-gray-500">
                          Assigné le {new Date(objective.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>

                    {/* Skill Gap Analysis */}
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 mb-2">
                        {getSkillGapIcon(skillGap.totalGap)}
                        <span className="text-sm font-medium text-gray-700">
                          {getSkillGapMessage(skillGap.totalGap)}
                        </span>
                      </div>
                      
                      {skillGap && skillGap.totalGap > 0 && (
                        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Compétences à développer</span>
                            <span className="text-sm font-bold text-orange-600">{skillGap.totalGap} niveaux</span>
                          </div>
                          <div className="space-y-1">
                            {skillGap.skillGaps.slice(0, 3).map((gap, index) => (
                              <div key={index} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 font-medium">{gap.skillName}</span>
                                <div className="flex items-center space-x-2">
                                  <div className="flex space-x-1">
                                    {[...Array(gap.requiredLevel)].map((_, i) => (
                                      <div
                                        key={i}
                                        className={`w-2 h-2 rounded-full ${
                                          i < Math.min(gap.currentLevel, gap.requiredLevel) ? 'bg-green-400' : 'bg-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-orange-600 font-semibold">
                                    {Math.min(gap.currentLevel, gap.requiredLevel)}/{gap.requiredLevel}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {skillGap.skillGaps.length > 3 && (
                              <p className="text-xs text-gray-500 text-center pt-1">
                                +{skillGap.skillGaps.length - 3} autres compétences
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {skillGap && skillGap.isQualified && (
                        <div className="bg-green-100 border-2 border-green-300 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <CheckCircleIcon className="h-5 w-5 text-green-600" />
                            <span className="text-sm font-medium text-green-800">
                              🎉 Prêt pour le titre de poste!
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {(() => {
                      const skillGap = objective.skillGap;
                      let realProgress = 0;
                      let progressColor = 'from-red-500 to-pink-600';
                      let progressMessage = '';

                      if (skillGap && skillGap.skillGaps && skillGap.skillGaps.length > 0) {
                        const totalRequired = skillGap.skillGaps.reduce((sum, gap) => sum + gap.requiredLevel, 0);
                        const totalCurrent = skillGap.skillGaps.reduce((sum, gap) => sum + Math.min(gap.currentLevel, gap.requiredLevel), 0);
                        realProgress = Math.round((totalCurrent / totalRequired) * 100);
                        
                        if (realProgress >= 100) {
                          progressColor = 'from-green-500 to-emerald-600';
                          progressMessage = '🎉 Objectif atteint !';
                        } else if (realProgress >= 75) {
                          progressColor = 'from-blue-500 to-cyan-600';
                          progressMessage = '🚀 Excellent progrès !';
                        } else if (realProgress >= 50) {
                          progressColor = 'from-yellow-500 to-orange-500';
                          progressMessage = '📈 Bon progrès';
                        } else if (realProgress >= 25) {
                          progressColor = 'from-orange-500 to-red-500';
                          progressMessage = '⚠️ Progrès modéré';
                        } else {
                          progressColor = 'from-red-500 to-pink-600';
                          progressMessage = '🔴 Début de parcours';
                        }
                      }

                      return realProgress > 0 ? (
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                            <span className="font-medium">Progression</span>
                            <span className="font-bold">{realProgress}%</span>
                          </div>
                          <div className="w-full bg-white/60 rounded-full h-3 shadow-inner">
                            <div 
                              className={`h-3 rounded-full bg-gradient-to-r ${progressColor} transition-all duration-500 shadow-lg`}
                              style={{ width: `${realProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{progressMessage}</p>
                        </div>
                      ) : null;
                    })()}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewObjective(objective)}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          <EyeIcon className="h-4 w-4" />
                          <span>Détails</span>
                        </button>
                        
                        {(objective.status === 'ready' || (skillGap && skillGap.isQualified)) && (
                          <button
                            onClick={() => handleConfirmCompletion(objective)}
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl"
                          >
                            <CheckIcon className="h-4 w-4" />
                            <span>Confirmer</span>
                          </button>
                        )}
                      </div>
                      
                      <button
                        onClick={() => openDeleteModal(objective)}
                        className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white p-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                        title="Supprimer l'objectif"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Enhanced Assign Target Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 overflow-y-auto h-full w-full z-50 backdrop-blur-md">
          <div className="relative top-10 mx-auto p-8 border-0 w-11/12 max-w-2xl shadow-2xl rounded-3xl bg-gradient-to-br from-white via-gray-50 to-white">
            {/* Enhanced Header */}
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
                  <RocketLaunchIcon className="w-9 h-9 text-white" />
                </div>
                <div>
                  <h3 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Assigner un Objectif
                  </h3>
                  <p className="text-lg text-gray-600 mt-2 font-medium">Créer un nouveau défi de titre de poste</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setFormData({ assignment_type: 'individual', target_id: '', job_title_id: '', notes: '' });
                }}
                className="w-12 h-12 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 transform"
              >
                <XMarkIcon className="w-7 h-7 text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleAssignTarget} className="space-y-8">
              {/* Job Title Selection */}
              <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-2xl">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                    <BriefcaseIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">Titre de Poste Cible</h4>
                    <p className="text-sm text-gray-600">Sélectionnez le titre de poste à assigner</p>
                  </div>
                </div>
                <select
                  value={formData.job_title_id}
                  onChange={(e) => {
                    setFormData({ ...formData, job_title_id: e.target.value, target_id: '', assignment_type: 'individual' });
                    loadAvailableMembersForJobTitle(e.target.value);
                  }}
                  className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 text-lg font-medium bg-gradient-to-r from-gray-50 to-white hover:from-blue-50 hover:to-white"
                  required
                >
                  <option value="">🎯 Sélectionner un titre de poste</option>
                  {(jobTitles || []).map((jobTitle) => (
                    <option key={jobTitle.id} value={jobTitle.id}>
                      💼 {jobTitle.title}
                    </option>
                  ))}
                </select>
              </div>

              {formData.job_title_id && (
                <>
                  {/* Assignment Type */}
                  <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-2xl">
                    <div className="flex items-center mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                        <UserGroupIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900">Type d'Assignation</h4>
                        <p className="text-sm text-gray-600">Choisissez le mode d'assignation</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, assignment_type: 'individual', target_id: '' })}
                        className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                          formData.assignment_type === 'individual'
                            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg'
                            : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <UserIcon className={`w-8 h-8 ${formData.assignment_type === 'individual' ? 'text-blue-600' : 'text-gray-500'}`} />
                          <div className="text-left">
                            <h5 className="font-bold text-gray-900">👤 Individuel</h5>
                            <p className="text-sm text-gray-600">Un membre spécifique</p>
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, assignment_type: 'team', target_id: '' })}
                        className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                          formData.assignment_type === 'team'
                            ? 'border-green-500 bg-gradient-to-br from-green-50 to-green-100 shadow-lg'
                            : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white hover:border-green-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <UserGroupIcon className={`w-8 h-8 ${formData.assignment_type === 'team' ? 'text-green-600' : 'text-gray-500'}`} />
                          <div className="text-left">
                            <h5 className="font-bold text-gray-900">👥 Équipe</h5>
                            <p className="text-sm text-gray-600">Toute l'équipe</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Target Selection */}
                  <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-2xl">
                    <div className="flex items-center mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                        {formData.assignment_type === 'team' ? (
                          <UserGroupIcon className="w-6 h-6 text-white" />
                        ) : (
                          <UserIcon className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900">
                          {formData.assignment_type === 'team' ? 'Équipe Cible' : 'Membre Cible'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {formData.assignment_type === 'team' ? 'Sélectionnez l\'équipe' : 'Sélectionnez le membre'}
                        </p>
                      </div>
                    </div>
                    <select
                      value={formData.target_id}
                      onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
                      className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 text-lg font-medium bg-gradient-to-r from-gray-50 to-white hover:from-purple-50 hover:to-white"
                      required
                    >
                      <option value="">
                        {formData.assignment_type === 'team' ? '🏢 Sélectionner une équipe' : '👤 Sélectionner un membre'}
                      </option>
                      {formData.assignment_type === 'team' ? (
                        (teams || []).map((team) => (
                          <option key={team.id} value={team.id}>
                            🏢 {team.name}
                          </option>
                        ))
                      ) : (
                        (availableMembers || []).map((member) => {
                          const skillGap = memberSkillGaps[member.id] || { totalGap: 0, skillGaps: [], isQualified: false };
                          return (
                            <option key={member.id} value={member.id}>
                              👤 {member.firstName} {member.lastName} - {member.jobTitle} 
                              {skillGap.isQualified ? ' ✅ (Qualifié)' : ` ⚠️ (${skillGap.totalGap} niveaux manquants)`}
                            </option>
                          );
                        })
                      )}
                    </select>
                  </div>

                  {/* Skill Gap Analysis */}
                  {formData.assignment_type === 'individual' && formData.target_id && memberSkillGaps[formData.target_id] && (
                    <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-2xl">
                      <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                          <ChartBarIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-gray-900">Analyse des Compétences</h4>
                          <p className="text-sm text-gray-600">Évaluation du niveau actuel</p>
                        </div>
                      </div>
                      {(() => {
                        const skillGap = memberSkillGaps[formData.target_id];
                        if (skillGap.isQualified) {
                          return (
                            <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-green-100 border-2 border-green-200 rounded-2xl p-6 shadow-lg">
                              <div className="flex items-center">
                                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                                  <CheckCircleIcon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                  <h5 className="text-lg font-bold text-green-800 mb-2">🎉 Membre Qualifié !</h5>
                                  <p className="text-green-700">
                                    Ce membre possède déjà toutes les compétences requises pour ce titre de poste.
                                  </p>
                                  <p className="text-sm text-green-600 mt-2">
                                    Il sera marqué comme "Prêt pour le titre de poste" et vous devrez confirmer pour qu'il l'obtienne officiellement.
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div className="bg-gradient-to-r from-yellow-50 via-orange-50 to-red-50 border-2 border-yellow-200 rounded-2xl p-6 shadow-lg">
                              <div className="flex items-center mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                                  <ExclamationTriangleIcon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                  <h5 className="text-lg font-bold text-yellow-800 mb-2">⚠️ Compétences à Développer</h5>
                                  <p className="text-yellow-700">
                                    Ce membre a besoin de {skillGap.totalGap} niveau(s) supplémentaire(s) pour atteindre ce titre de poste.
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-3">
                                {skillGap.skillGaps.map((gap, index) => (
                                  <div key={index} className="bg-white rounded-xl p-4 border border-yellow-200 shadow-sm">
                                    <div className="flex justify-between items-center">
                                      <span className="font-medium text-gray-900">{gap.skillName}</span>
                                      <span className="text-sm text-gray-600">
                                        {Math.min(gap.currentLevel, gap.requiredLevel)}/{gap.requiredLevel}
                                        {gap.currentLevel < gap.requiredLevel && (
                                          <span className="ml-2 text-red-600 font-bold">
                                            (-{gap.gap} niveau{gap.gap > 1 ? 's' : ''})
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                      <div 
                                        className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${(Math.min(gap.currentLevel, gap.requiredLevel) / gap.requiredLevel) * 100}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  )}
                </>
              )}

              {/* Notes */}
              <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-2xl">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                    <LightBulbIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">Notes & Instructions</h4>
                    <p className="text-sm text-gray-600">Ajoutez des commentaires ou directives (optionnel)</p>
                  </div>
                </div>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 text-lg font-medium bg-gradient-to-r from-gray-50 to-white hover:from-indigo-50 hover:to-white resize-none"
                  placeholder="💡 Ajoutez des notes ou instructions pour cet objectif..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setFormData({ assignment_type: 'individual', target_id: '', job_title_id: '', notes: '' });
                  }}
                  className="px-8 py-4 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-bold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-8 py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-lg"
                >
                  🚀 Assigner l'Objectif
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced Objective Detail Modal */}
      {showDetailModal && selectedObjective && (
        <div className="fixed inset-0 bg-black bg-opacity-60 overflow-y-auto h-full w-full z-50 backdrop-blur-md">
          <div className="relative top-10 mx-auto p-8 border-0 w-11/12 max-w-4xl shadow-2xl rounded-3xl bg-gradient-to-br from-white via-gray-50 to-white">
            {/* Enhanced Header */}
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
                  <BriefcaseIcon className="w-9 h-9 text-white" />
                </div>
                <div>
                  <h3 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Détails de l'Objectif
                  </h3>
                  <p className="text-lg text-gray-600 mt-2 font-medium">Analyse complète de l'objectif de titre de poste</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-12 h-12 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 transform"
              >
                <XMarkIcon className="w-7 h-7 text-gray-600" />
              </button>
            </div>

            <div className="space-y-10">
              {/* Objective Overview */}
              <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-3xl p-10 border border-indigo-200 shadow-2xl">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full -mr-20 -mt-20 opacity-30 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full -ml-16 -mb-16 opacity-30 animate-pulse"></div>
                
                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-2xl p-6 shadow-xl border border-indigo-100">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                        <BriefcaseIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">Titre de Poste</h4>
                        <p className="text-sm text-gray-600">Objectif assigné</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-indigo-600">
                      {selectedObjective.job_title_name}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-xl border border-green-100">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                        {selectedObjective.assignment_type === 'team' ? (
                          <UserGroupIcon className="w-6 h-6 text-white" />
                        ) : (
                          <UserIcon className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">Assigné à</h4>
                        <p className="text-sm text-gray-600">
                          {selectedObjective.assignment_type === 'team' ? 'Équipe' : 'Individuel'}
                        </p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {selectedObjective.target_name}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status and Progress */}
              <div className="bg-white rounded-3xl p-10 border border-gray-200 shadow-2xl">
                <div className="flex items-center mb-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center mr-6 shadow-xl">
                    <ChartBarIcon className="w-9 h-9 text-white" />
                  </div>
                  <div>
                    <h4 className="text-3xl font-bold text-gray-900">Statut et Progrès</h4>
                    <p className="text-xl text-gray-600">Analyse de l'avancement de l'objectif</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Status */}
                  <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-3xl p-8 border border-gray-200 shadow-xl">
                    <h5 className="text-xl font-bold text-gray-900 mb-4">Statut Actuel</h5>
                    <div className={`inline-flex items-center px-6 py-4 rounded-full text-lg font-bold border-2 ${getStatusColor(getProgressStatus(selectedObjective))} shadow-xl`}>
                      {getStatusIcon(getProgressStatus(selectedObjective))}
                      <span className="ml-3">{getStatusText(getProgressStatus(selectedObjective))}</span>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-3xl p-8 border border-gray-200 shadow-xl">
                    <h5 className="text-xl font-bold text-gray-900 mb-4">Progrès Global</h5>
                    {(() => {
                      const skillGap = selectedObjective.skillGap;
                      let realProgress = 0;
                      let progressColor = 'from-red-500 to-pink-600';
                      let progressMessage = '';

                      if (skillGap && skillGap.skillGaps && skillGap.skillGaps.length > 0) {
                        const totalRequired = skillGap.skillGaps.reduce((sum, gap) => sum + gap.requiredLevel, 0);
                        const totalCurrent = skillGap.skillGaps.reduce((sum, gap) => sum + Math.min(gap.currentLevel, gap.requiredLevel), 0);
                        realProgress = Math.round((totalCurrent / totalRequired) * 100);
                        
                        if (realProgress >= 100) {
                          progressColor = 'from-green-500 to-emerald-600';
                          progressMessage = '🎉 Objectif atteint !';
                        } else if (realProgress >= 75) {
                          progressColor = 'from-blue-500 to-cyan-600';
                          progressMessage = '🚀 Excellent progrès !';
                        } else if (realProgress >= 50) {
                          progressColor = 'from-yellow-500 to-orange-500';
                          progressMessage = '📈 Bon progrès';
                        } else if (realProgress >= 25) {
                          progressColor = 'from-orange-500 to-red-500';
                          progressMessage = '⚠️ Progrès modéré';
                        } else {
                          progressColor = 'from-red-500 to-pink-600';
                          progressMessage = '🔴 Début de parcours';
                        }
                      }

                      return (
                        <div>
                          <div className="text-4xl font-bold text-gray-900 mb-2">{realProgress}%</div>
                          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                            <div 
                              className={`bg-gradient-to-r ${progressColor} h-4 rounded-full transition-all duration-1000 shadow-lg`}
                              style={{ width: `${realProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-lg text-gray-600 font-medium">{progressMessage}</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Enhanced Skill Gap Analysis */}
              {selectedObjective.skillGap && (
                <div className="bg-white rounded-3xl p-10 border border-gray-200 shadow-2xl">
                  <div className="flex items-center mb-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 rounded-3xl flex items-center justify-center mr-6 shadow-xl">
                      <AcademicCapIcon className="w-9 h-9 text-white" />
                    </div>
                    <div>
                      <h4 className="text-3xl font-bold text-gray-900">Analyse des Compétences</h4>
                      <p className="text-xl text-gray-600">Écart entre les compétences actuelles et requises</p>
                    </div>
                  </div>

                  {selectedObjective.skillGap.isQualified ? (
                    <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-green-100 border-2 border-green-200 rounded-3xl p-8 shadow-xl">
                      <div className="flex items-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mr-6 shadow-lg">
                          <CheckCircleIcon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h5 className="text-2xl font-bold text-green-800 mb-2">🎉 Membre Qualifié !</h5>
                          <p className="text-lg text-green-700">
                            Ce membre possède toutes les compétences requises pour ce titre de poste.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Summary */}
                      <div className="bg-gradient-to-r from-yellow-50 via-orange-50 to-red-50 border-2 border-yellow-200 rounded-3xl p-8 shadow-xl">
                        <div className="flex items-center mb-6">
                          <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mr-6 shadow-lg">
                            <ExclamationTriangleIcon className="w-8 h-8 text-white" />
                          </div>
                          <div>
                            <h5 className="text-2xl font-bold text-yellow-800 mb-2">Compétences à Améliorer</h5>
                            <p className="text-lg text-yellow-700">
                              {selectedObjective.skillGap.totalGap} niveau(s) manquant(s) au total
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-white rounded-2xl p-6 shadow-lg border border-yellow-200">
                            <div className="text-3xl font-bold text-red-600 mb-2">
                              {selectedObjective.skillGap.skillGaps?.length || 0}
                            </div>
                            <p className="text-sm text-gray-600">Compétences à améliorer</p>
                          </div>
                          <div className="bg-white rounded-2xl p-6 shadow-lg border border-yellow-200">
                            <div className="text-3xl font-bold text-orange-600 mb-2">
                              {selectedObjective.skillGap.totalGap || 0}
                            </div>
                            <p className="text-sm text-gray-600">Niveaux manquants</p>
                          </div>
                          <div className="bg-white rounded-2xl p-6 shadow-lg border border-yellow-200">
                            <div className="text-3xl font-bold text-yellow-600 mb-2">
                              {selectedObjective.skillGap.skillGaps?.reduce((sum, gap) => sum + gap.requiredLevel, 0) || 0}
                            </div>
                            <p className="text-sm text-gray-600">Niveaux requis total</p>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Skills */}
                      {selectedObjective.skillGap.skillGaps && selectedObjective.skillGap.skillGaps.length > 0 && (
                        <div>
                          <h5 className="text-2xl font-bold text-gray-900 mb-6">Détails des Compétences Manquantes</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {selectedObjective.skillGap.skillGaps.map((gap, index) => (
                              <div key={index} className="bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-3xl p-6 border border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
                                <div className="flex justify-between items-start mb-4">
                                  <h6 className="font-bold text-gray-900 text-xl group-hover:text-red-600 transition-colors">
                                    {gap.skillName}
                                  </h6>
                                  <span className={`text-xs px-3 py-2 rounded-full font-bold ${
                                    gap.gap > 0 
                                      ? 'text-red-600 bg-red-100' 
                                      : gap.gap < 0 
                                      ? 'text-green-600 bg-green-100' 
                                      : 'text-gray-600 bg-gray-100'
                                  }`}>
                                    {gap.gap > 0 ? `-${gap.gap}` : gap.gap < 0 ? `+${Math.abs(gap.gap)}` : '0'} niveau{gap.gap !== 0 ? (Math.abs(gap.gap) > 1 ? 's' : '') : 's'}
                                  </span>
                                </div>
                                
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Niveau actuel</span>
                                    <div className="flex items-center space-x-2">
                                      {Array.from({ length: 5 }, (_, i) => (
                                        <div
                                          key={i}
                                          className={`w-4 h-4 rounded-full ${
                                            i < gap.currentLevel
                                              ? 'bg-gradient-to-r from-blue-500 to-cyan-500' 
                                              : 'bg-gray-200'
                                          }`}
                                        />
                                      ))}
                                      <span className="text-sm font-bold text-gray-900">{gap.currentLevel}</span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Niveau requis</span>
                                    <div className="flex items-center space-x-2">
                                      {Array.from({ length: 5 }, (_, i) => (
                                        <div
                                          key={i}
                                          className={`w-4 h-4 rounded-full ${
                                            i < gap.requiredLevel 
                                              ? 'bg-gradient-to-r from-red-500 to-pink-500' 
                                              : 'bg-gray-200'
                                          }`}
                                        />
                                      ))}
                                      <span className="text-sm font-bold text-gray-900">{gap.requiredLevel}</span>
                                    </div>
                                  </div>
                                  
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-gradient-to-r from-red-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                                      style={{ width: `${(Math.min(gap.currentLevel, gap.requiredLevel) / gap.requiredLevel) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {selectedObjective.notes && (
                <div className="bg-white rounded-3xl p-10 border border-gray-200 shadow-2xl">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                      <LightBulbIcon className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="text-2xl font-bold text-gray-900">Notes</h4>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-2xl p-6 border border-gray-200 shadow-lg">
                    <p className="text-lg text-gray-700 leading-relaxed">{selectedObjective.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Footer */}
            <div className="flex justify-end mt-10 pt-10 border-t border-gray-200">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-12 py-5 bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 hover:from-gray-700 hover:via-gray-800 hover:to-gray-900 text-white font-bold rounded-3xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 text-lg"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && objectiveToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
                <TrashIcon className="h-8 w-8 text-red-600" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                Supprimer l'objectif
              </h3>
              
              <p className="text-gray-600 text-center mb-6">
                Êtes-vous sûr de vouloir supprimer l'objectif de titre de poste 
                <span className="font-semibold text-gray-900"> "{objectiveToDelete.job_title_name}"</span> 
                assigné à <span className="font-semibold text-gray-900">{objectiveToDelete.target_name}</span> ?
              </p>
              
              <p className="text-sm text-red-600 text-center mb-6 bg-red-50 p-3 rounded-lg">
                ⚠️ Cette action est irréversible et l'employé recevra une notification.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setObjectiveToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteObjective}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showUserProfileModal}
        onClose={() => {
          setShowUserProfileModal(false);
          setSelectedUserId(null);
        }}
        userId={selectedUserId}
        currentUserJobTitles={user?.currentJobTitles || []}
      />

      {/* Job Title Detail Modal */}
      <JobTitleDetailModal
        jobTitle={selectedJobTitle}
        isOpen={showJobTitleModal}
        onClose={() => {
          setShowJobTitleModal(false);
          setSelectedJobTitle(null);
        }}
      />
    </div>
  );
};

export default JobTitleTargets;