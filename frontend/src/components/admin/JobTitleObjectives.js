import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import UserProfileModal from '../common/UserProfileModal';
import JobTitleDetailModal from '../manager/JobTitleDetailModal';
import {
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
  UserCircleIcon,
  ChartBarIcon,
  FireIcon,
  StarIcon,
  AcademicCapIcon,
  RocketLaunchIcon,
  LightBulbIcon,
  HeartIcon,
  FunnelIcon,
  BuildingOfficeIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const JobTitleObjectives = () => {
  const { user } = useAuth();
  const [objectives, setObjectives] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showJobTitleModal, setShowJobTitleModal] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedJobTitle, setSelectedJobTitle] = useState(null);
  const [teamFilter, setTeamFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get job title objectives for admin (all objectives)
      const objectivesData = await apiService.getJobTitleObjectives();
      
      // Ensure objectives is always an array
      if (Array.isArray(objectivesData)) {
        setObjectives(objectivesData);
      } else if (objectivesData && Array.isArray(objectivesData.objectives)) {
        setObjectives(objectivesData.objectives);
      } else {
        console.warn('⚠️ Unexpected objectives data format:', objectivesData);
        setObjectives([]);
      }
      
      // Get job titles
      const jobTitlesData = await dataService.getJobTitles();
      setJobTitles(Array.isArray(jobTitlesData) ? jobTitlesData : []);
      
      // Get teams
      const teamsData = await dataService.getTeams();
      setTeams(Array.isArray(teamsData) ? teamsData : []);
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
      setObjectives([]);
      setJobTitles([]);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const getProgressStatus = (objective) => {
    if (objective.already_has_job_title) return 'completed';
    if (objective.progress_percentage >= 100) return 'completed';
    if (objective.progress_percentage >= 80) return 'almost_done';
    if (objective.progress_percentage >= 50) return 'in_progress';
    if (objective.progress_percentage > 0) return 'started';
    return 'not_started';
  };

  const getStatusColor = (status, skillGap) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'almost_done':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'started':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'not_started':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status, skillGap) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'almost_done':
        return <ArrowUpIcon className="h-4 w-4" />;
      case 'in_progress':
        return <ChartBarIcon className="h-4 w-4" />;
      case 'started':
        return <RocketLaunchIcon className="h-4 w-4" />;
      case 'not_started':
        return <ClockIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const getStatusText = (status, skillGap) => {
    switch (status) {
      case 'completed':
        return 'Terminé';
      case 'almost_done':
        return 'Presque terminé';
      case 'in_progress':
        return 'En cours';
      case 'started':
        return 'Commencé';
      case 'not_started':
        return 'Non commencé';
      default:
        return 'Inconnu';
    }
  };

  const getObjectiveCardGradient = (status, skillGap) => {
    switch (status) {
      case 'completed':
        return 'from-green-50 to-emerald-100 border-green-200';
      case 'almost_done':
        return 'from-blue-50 to-cyan-100 border-blue-200';
      case 'in_progress':
        return 'from-yellow-50 to-amber-100 border-yellow-200';
      case 'started':
        return 'from-orange-50 to-amber-100 border-orange-200';
      case 'not_started':
        return 'from-gray-50 to-slate-100 border-gray-200';
      default:
        return 'from-gray-50 to-slate-100 border-gray-200';
    }
  };

  const handleViewUserProfile = (userId) => {
    setSelectedUserId(userId);
    setShowUserProfileModal(true);
  };

  const handleViewJobTitleRequirements = (jobTitleId) => {
    setSelectedJobTitle(jobTitleId);
    setShowJobTitleModal(true);
  };

  const handleViewObjectiveDetails = (objective) => {
    setSelectedObjective(objective);
    setShowDetailModal(true);
  };

  // Filter objectives based on current filters
  const filteredObjectives = (Array.isArray(objectives) ? objectives : []).filter(objective => {
    const matchesTeam = teamFilter === 'all' || 
      (objective.team_id && objective.team_id === teamFilter);
    
    const matchesStatus = statusFilter === 'all' || 
      getProgressStatus(objective) === statusFilter;
    
    const matchesSearch = searchTerm === '' || 
      objective.job_title_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      objective.target_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      objective.job_title_description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    
    return matchesTeam && matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <BriefcaseIcon className="h-8 w-8 text-blue-600 mr-3" />
              Objectifs de Titres de Poste
            </h1>
            <p className="text-gray-600 mt-1">
              Suivez la progression des objectifs de titres de poste pour tous les employés et équipes
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Rechercher par titre de poste, employé ou description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field w-full"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="input-field w-full"
            >
              <option value="all">Toutes les équipes</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-full"
            >
              <option value="all">Tous les statuts</option>
              <option value="not_started">Non commencé</option>
              <option value="started">Commencé</option>
              <option value="in_progress">En cours</option>
              <option value="almost_done">Presque terminé</option>
              <option value="completed">Terminé</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BriefcaseIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Objectifs</p>
              <p className="text-2xl font-bold text-gray-900">{Array.isArray(objectives) ? objectives.length : 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Terminés</p>
              <p className="text-2xl font-bold text-gray-900">
                {Array.isArray(objectives) ? objectives.filter(obj => getProgressStatus(obj) === 'completed').length : 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">En Cours</p>
              <p className="text-2xl font-bold text-gray-900">
                {Array.isArray(objectives) ? objectives.filter(obj => ['started', 'in_progress', 'almost_done'].includes(getProgressStatus(obj))).length : 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Non Commencés</p>
              <p className="text-2xl font-bold text-gray-900">
                {Array.isArray(objectives) ? objectives.filter(obj => getProgressStatus(obj) === 'not_started').length : 0}
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* Objectives List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Objectifs de Titres de Poste ({filteredObjectives.length})
          </h2>
        </div>
        
        <div className="p-6">
          {filteredObjectives.length === 0 ? (
            <div className="text-center py-12">
              <BriefcaseIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun objectif trouvé</h3>
              <p className="text-gray-500">
                {searchTerm || teamFilter !== 'all' || statusFilter !== 'all' 
                  ? `Aucun objectif ne correspond aux filtres sélectionnés.${
                      teamFilter !== 'all' ? ` (Équipe: ${teams.find(t => t.id === teamFilter)?.name || 'Inconnue'})` : ''
                    }`
                  : 'Aucun objectif de titre de poste n\'a été assigné pour le moment.'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredObjectives.map((objective) => {
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
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <button
                            onClick={() => handleViewUserProfile(objective.target_id)}
                            className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            {objective.target_name}
                          </button>
                          <p className="text-sm text-gray-600">{objective.email}</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">Progression</span>
                          <span className="text-sm font-bold text-gray-900">{objective.progress_percentage || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${objective.progress_percentage || 0}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Skill Gap Info */}
                      {skillGap && skillGap.totalGap > 0 && (
                        <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="flex items-center space-x-2">
                            <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
                            <span className="text-sm font-medium text-orange-800">
                              Écart de compétences: {skillGap.totalGap} points
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Success Message for Completed Objectives */}
                      {skillGap && skillGap.totalGap === 0 && status === 'completed' && (
                        <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center space-x-2">
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                            <span className="text-sm font-medium text-green-800">
                              Objectif accompli - Toutes les compétences requises sont maîtrisées
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewObjectiveDetails(objective)}
                          className="flex-1 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-700 font-medium py-2 px-4 rounded-lg border border-gray-300 hover:border-gray-400 transition-all duration-200 flex items-center justify-center space-x-2"
                        >
                          <EyeIcon className="h-4 w-4" />
                          <span>Voir détails</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showUserProfileModal && selectedUserId && (
        <UserProfileModal
          userId={selectedUserId}
          onClose={() => {
            setShowUserProfileModal(false);
            setSelectedUserId(null);
          }}
        />
      )}

      {showJobTitleModal && selectedJobTitle && (
        <JobTitleDetailModal
          jobTitleId={selectedJobTitle}
          onClose={() => {
            setShowJobTitleModal(false);
            setSelectedJobTitle(null);
          }}
        />
      )}

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
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-8 border border-blue-200">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <BriefcaseIcon className="w-6 h-6 text-white" />
                      </div>
                <div>
                        <h4 className="text-xl font-bold text-gray-900">{selectedObjective.job_title_name}</h4>
                        <p className="text-gray-600 font-medium">Titre de poste</p>
                      </div>
                </div>
                
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                        <UserIcon className="w-6 h-6 text-white" />
                      </div>
                <div>
                        <h4 className="text-xl font-bold text-gray-900">{selectedObjective.target_name}</h4>
                        <p className="text-gray-600 font-medium">Employé assigné</p>
                        <p className="text-sm text-gray-500">{selectedObjective.email}</p>
                      </div>
                    </div>
                </div>
                
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="text-lg font-semibold text-gray-900">Progression</h5>
                        <span className="text-2xl font-bold text-indigo-600">{selectedObjective.progress_percentage || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-4 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${selectedObjective.progress_percentage || 0}%` }}
                        ></div>
                      </div>
                </div>
                
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getProgressStatus(selectedObjective) === 'completed' ? 'bg-green-500' : getProgressStatus(selectedObjective) === 'in_progress' ? 'bg-yellow-500' : 'bg-gray-400'}`}></div>
                        <span className="text-lg font-semibold text-gray-900">
                          {getStatusText(getProgressStatus(selectedObjective), selectedObjective.skillGap)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                </div>

              {/* Additional Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {selectedObjective.job_title_description && (
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                        <SparklesIcon className="w-5 h-5 text-white" />
                      </div>
                      <h5 className="text-lg font-semibold text-gray-900">Description du poste</h5>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{selectedObjective.job_title_description}</p>
                  </div>
                )}
                
                {selectedObjective.notes && (
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                        <LightBulbIcon className="w-5 h-5 text-white" />
                      </div>
                      <h5 className="text-lg font-semibold text-gray-900">Notes</h5>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{selectedObjective.notes}</p>
                  </div>
                )}
              </div>

              {/* Skill Gap Information */}
              {selectedObjective.skillGap && selectedObjective.skillGap.totalGap > 0 && (
                <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-3xl p-8 border border-orange-200">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                      <ExclamationTriangleIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">Écart de compétences</h4>
                      <p className="text-gray-600 font-medium">Analyse des compétences manquantes</p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-orange-600 mb-2">
                        {selectedObjective.skillGap.totalGap} points
                      </div>
                      <p className="text-gray-600 font-medium">Écart total de compétences</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Information for Completed Objectives */}
              {selectedObjective.skillGap && selectedObjective.skillGap.totalGap === 0 && getProgressStatus(selectedObjective) === 'completed' && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-3xl p-8 border border-green-200">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                      <CheckCircleIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">Objectif Accompli</h4>
                      <p className="text-gray-600 font-medium">Toutes les compétences requises sont maîtrisées</p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-green-600 mb-2">
                        0 points
                      </div>
                      <p className="text-gray-600 font-medium">Écart de compétences - Aucun écart restant</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4 pt-6">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleViewUserProfile(selectedObjective.target_id);
                  }}
                  className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-3"
                >
                  <UserIcon className="w-5 h-5" />
                  <span>Voir le profil</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleViewJobTitleRequirements(selectedObjective.job_title_id);
                  }}
                  className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-3"
                >
                  <BriefcaseIcon className="w-5 h-5" />
                  <span>Voir les exigences</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobTitleObjectives;


