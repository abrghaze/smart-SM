import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import {
  BriefcaseIcon,
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline';

const JobTitleProgress = () => {
  const { user } = useAuth();
  const [targets, setTargets] = useState([]);
  const [currentJobTitles, setCurrentJobTitles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTargets();
  }, []);

  const loadTargets = async () => {
    try {
      setLoading(true);
      
      // Load both current job titles and objectives
      const [objectivesData, profileData] = await Promise.all([
        dataService.getEmployeeJobTitleObjectives(),
        dataService.getCurrentUser()
      ]);
      
      console.log('Employee objectives data received:', objectivesData);
      setTargets(objectivesData);
      
      // Get current job titles from profile data
      if (profileData.currentJobTitles && profileData.currentJobTitles.length > 0) {
        setCurrentJobTitles(profileData.currentJobTitles);
      }
    } catch (error) {
      console.error('Error loading job title data:', error);
      toast.error('Erreur lors du chargement de vos données');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assigned':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ready':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Terminé';
      case 'in_progress':
        return 'En cours';
      case 'assigned':
        return 'Assigné';
      case 'ready':
        return 'Prêt pour confirmation';
      default:
        return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckIcon className="h-4 w-4" />;
      case 'in_progress':
        return <ArrowUpIcon className="h-4 w-4" />;
      case 'assigned':
        return <ClockIcon className="h-4 w-4" />;
      case 'ready':
        return <CheckIcon className="h-4 w-4" />;
      default:
        return <ExclamationTriangleIcon className="h-4 w-4" />;
    }
  };

  const getProgressBarColor = (percentage) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mes Titres de Poste</h1>
        <p className="text-gray-600 mt-2">Vos titres de poste actuels et objectifs en cours</p>
      </div>

      {/* Current Job Titles Section */}
      {currentJobTitles.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Mes Titres de Poste Actuels</h2>
            <p className="text-sm text-gray-600 mt-1">Titres de poste que vous occupez actuellement</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentJobTitles.map((jobTitle) => (
                <div key={jobTitle.id} className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <BriefcaseIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{jobTitle.title}</h3>
                      <p className="text-sm text-gray-600">{jobTitle.description}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                      {jobTitle.requirements_count || 0} compétences requises
                    </span>
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      Actuel
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Job Title Objectives Section */}
      {targets.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Mes Objectifs de Titres de Poste</h2>
            <p className="text-sm text-gray-600 mt-1">Titres de poste que vous travaillez à atteindre</p>
          </div>
          
          {/* Summary Cards */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BriefcaseIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total des Objectifs</p>
                    <p className="text-2xl font-bold text-gray-900">{targets.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Objectifs Terminés</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {targets.filter(t => t.status === 'completed').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <ArrowUpIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">En Cours</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {targets.filter(t => t.status === 'in_progress' || t.status === 'assigned').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Targets List */}
            <div className="space-y-4">
              {targets.map((target) => (
                <div key={target.id} className="bg-gray-50 rounded-lg border border-gray-200">
                  <div className="p-6">
                    {/* Target Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{target.job_title_name}</h3>
                        <p className="text-gray-600 mt-1">{target.job_title_description}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(target.status)}`}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(target.status)}
                            <span>{getStatusText(target.status)}</span>
                          </div>
                        </span>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Progression</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {target.progress_percentage || 0}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(target.progress_percentage || 0)}`}
                          style={{ width: `${target.progress_percentage || 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Skills Progress */}
                    {target.progress && target.progress.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700">Exigences de Compétences:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {target.progress.map((progress, index) => (
                            <div
                              key={index}
                              className={`p-3 rounded-lg border ${
                                progress.is_completed 
                                  ? 'bg-green-50 border-green-200' 
                                  : 'bg-yellow-50 border-yellow-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">{progress.skill_name}</p>
                                  <p className="text-sm text-gray-600">
                                    Niveau requis: {progress.required_level}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">
                                    Niveau actuel: {progress.current_level}
                                  </p>
                                  {progress.is_completed ? (
                                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                      ✓ Terminé
                                    </span>
                                  ) : (
                                    <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                                      En cours
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No data message */}
      {currentJobTitles.length === 0 && targets.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <BriefcaseIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun titre de poste</h3>
          <p className="text-gray-500">Vous n'avez pas encore de titres de poste assignés ou d'objectifs en cours.</p>
        </div>
      )}
    </div>
  );
};

export default JobTitleProgress;