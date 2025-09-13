import React, { useState, useEffect, useCallback } from 'react';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import {
  XMarkIcon,
  BriefcaseIcon,
  UsersIcon,
  ChartBarIcon,
  AcademicCapIcon,
  StarIcon,
  FireIcon,
  RocketLaunchIcon,
  LightBulbIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import Avatar from '../common/Avatar';

const JobTitleDetailModal = ({ jobTitle, isOpen, onClose }) => {
  const [jobTitleDetails, setJobTitleDetails] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && jobTitle) {
      loadJobTitleData();
    }
  }, [isOpen, jobTitle]);

  const loadJobTitleData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Loading job title data for:', jobTitle.id);
      
      // Get job title details with requirements
      const details = await dataService.getJobTitleForManagers(jobTitle.id);
      console.log('✅ Job title details loaded:', details);
      setJobTitleDetails(details);
      
      // Set empty team members array since we don't need to show members
      setTeamMembers([]);
      
      console.log('✅ Job title detail data loaded successfully:', {
        details,
        jobTitleId: jobTitle.id
      });
      
    } catch (error) {
      console.error('❌ Error loading job title detail data:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      setError('Erreur lors du chargement des données du titre de poste');
      toast.error('Erreur lors du chargement des données du titre de poste');
    } finally {
      setLoading(false);
    }
  }, [jobTitle?.id]);

  const getSkillLevelColor = (level) => {
    if (level >= 4) return 'bg-gradient-to-r from-emerald-500 to-green-600 text-white';
    if (level >= 3) return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white';
    if (level >= 2) return 'bg-gradient-to-r from-orange-500 to-red-500 text-white';
    return 'bg-gradient-to-r from-red-500 to-pink-600 text-white';
  };

  const getSkillLevelIcon = (level) => {
    if (level >= 4) return <StarIcon className="w-4 h-4" />;
    if (level >= 3) return <FireIcon className="w-4 h-4" />;
    if (level >= 2) return <LightBulbIcon className="w-4 h-4" />;
    return <AcademicCapIcon className="w-4 h-4" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 overflow-y-auto h-full w-full z-50 backdrop-blur-md">
      <div className="relative top-10 mx-auto p-8 border-0 w-11/12 max-w-6xl shadow-2xl rounded-3xl bg-gradient-to-br from-white via-gray-50 to-white">
        {/* Enhanced Header */}
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-500 rounded-3xl flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <BriefcaseIcon className="w-9 h-9 text-white" />
            </div>
            <div>
              <h3 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {jobTitle?.title || 'Titre de Poste'}
              </h3>
              <p className="text-lg text-gray-600 mt-2 font-medium">
                {jobTitle?.description || 'Aucune description disponible'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 transform"
          >
            <XMarkIcon className="w-7 h-7 text-gray-600" />
          </button>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-200 border-t-blue-600 mx-auto mb-8"></div>
              <p className="text-gray-600 text-xl font-medium">Chargement des détails...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-gradient-to-r from-red-50 via-red-100 to-red-200 border border-red-300 rounded-3xl p-10 mb-10 shadow-xl">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mr-6 shadow-lg">
                <ExclamationTriangleIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-red-800 font-bold text-xl">{error}</p>
                <p className="text-red-600 text-lg">Veuillez réessayer plus tard</p>
              </div>
            </div>
          </div>
        )}

        {jobTitleDetails && !loading && (
          <div className="space-y-10">
            {/* Job Title Overview */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 rounded-3xl p-10 border border-blue-200 shadow-2xl">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full -mr-20 -mt-20 opacity-30 animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-purple-200 to-indigo-200 rounded-full -ml-16 -mb-16 opacity-30 animate-pulse"></div>
              
              <div className="relative">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-white rounded-2xl p-6 shadow-xl border border-blue-100">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                        <AcademicCapIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">Compétences Requises</h4>
                        <p className="text-sm text-gray-600">Niveau de maîtrise nécessaire</p>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-blue-600">
                      {jobTitleDetails.requirements?.length || 0}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-xl border border-green-100">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                        <SparklesIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">Niveau Moyen</h4>
                        <p className="text-sm text-gray-600">Des compétences requises</p>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-green-600">
                      {jobTitleDetails.requirements?.length > 0 
                        ? Math.round(jobTitleDetails.requirements.reduce((sum, req) => sum + req.required_level, 0) / jobTitleDetails.requirements.length * 10) / 10
                        : 0
                      }
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-xl border border-purple-100">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                        <BriefcaseIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">Titre de Poste</h4>
                        <p className="text-sm text-gray-600">Informations générales</p>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-purple-600">
                      {jobTitle?.title || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Skill Requirements */}
            {jobTitleDetails.requirements && jobTitleDetails.requirements.length > 0 ? (
              <div className="bg-white rounded-3xl p-10 border border-gray-200 shadow-2xl">
                <div className="flex items-center mb-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center mr-6 shadow-xl">
                    <AcademicCapIcon className="w-9 h-9 text-white" />
                  </div>
                  <div>
                    <h4 className="text-3xl font-bold text-gray-900">Compétences Requises</h4>
                    <p className="text-xl text-gray-600">{jobTitleDetails.requirements.length} compétence(s) nécessaire(s)</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {jobTitleDetails.requirements.map((requirement, index) => (
                    <div key={index} className="bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-3xl p-8 border border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
                      <div className="flex justify-between items-start mb-6">
                        <h5 className="font-bold text-gray-900 text-2xl group-hover:text-blue-600 transition-colors">
                          {requirement.skill_name}
                        </h5>
                        <span className={`px-6 py-3 rounded-full text-lg font-bold ${getSkillLevelColor(requirement.required_level)} shadow-xl flex items-center space-x-3`}>
                          {getSkillLevelIcon(requirement.required_level)}
                          <span>Niveau {requirement.required_level}</span>
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 mb-4">
                        {Array.from({ length: 5 }, (_, i) => (
                          <div
                            key={i}
                            className={`w-6 h-6 rounded-full transition-all duration-300 ${
                              i < requirement.required_level 
                                ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg' 
                                : 'bg-gray-200'
                            }`}
                            title={`Niveau requis: ${requirement.required_level}`}
                          />
                        ))}
                        <span className="ml-3 text-sm text-gray-500 font-medium">Niveau requis</span>
                      </div>
                      {requirement.skill_description && (
                        <p className="text-lg text-gray-500 leading-relaxed">{requirement.skill_description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-10 border border-gray-200 shadow-2xl">
                <div className="flex items-center mb-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 rounded-3xl flex items-center justify-center mr-6 shadow-xl">
                    <AcademicCapIcon className="w-9 h-9 text-white" />
                  </div>
                  <div>
                    <h4 className="text-3xl font-bold text-gray-900">Compétences Requises</h4>
                    <p className="text-xl text-gray-600">Aucune compétence spécifique requise</p>
                  </div>
                </div>
                <div className="text-center py-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AcademicCapIcon className="h-12 w-12 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-lg">Ce titre de poste n'a pas de compétences spécifiques définies</p>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Enhanced Footer */}
        <div className="flex justify-end mt-10 pt-10 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-12 py-5 bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 hover:from-gray-700 hover:via-gray-800 hover:to-gray-900 text-white font-bold rounded-3xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 text-lg"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobTitleDetailModal;
