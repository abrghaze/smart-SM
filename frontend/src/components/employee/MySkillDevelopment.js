import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import { AcademicCapIcon, ChartBarIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const MySkillDevelopment = () => {
  const { user } = useAuth();
  const [userSkills, setUserSkills] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const loadSkillsData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const [skillsData, availableSkillsData] = await Promise.all([
        dataService.getMySkills(),
        dataService.getSkills()
      ]);
      
      setUserSkills(skillsData || []);
      setAvailableSkills(availableSkillsData || []);
      
      console.log('Loaded skill development data:', { 
        userSkills: skillsData?.length || 0, 
        availableSkills: availableSkillsData?.length || 0 
      });
    } catch (error) {
      console.error('Error loading skill development data:', error);
      toast.error('Erreur lors du chargement des compétences');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSkillsData();
  }, [loadSkillsData]);

  const getSkillLevelLabel = (level) => {
    const levels = {
      1: 'Débutant',
      2: 'Intermédiaire',
      3: 'Avancé',
      4: 'Expert',
      5: 'Maître'
    };
    return levels[level] || 'N/A';
  };

  const getSkillLevelColor = (level) => {
    const colors = {
      1: 'bg-gray-100 text-gray-800',
      2: 'bg-blue-100 text-blue-800',
      3: 'bg-green-100 text-green-800',
      4: 'bg-yellow-100 text-yellow-800',
      5: 'bg-blue-100 text-blue-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  const getSkillTypeIcon = (type) => {
    return type === 'hard' ? '💻' : '🤝';
  };

  const getSkillTypeLabel = (type) => {
    return type === 'hard' ? 'Compétence technique' : 'Compétence soft';
  };

  const getSkillTypeColor = (type) => {
    return type === 'hard' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700';
  };

  const getProgressPercentage = (skill) => {
    return (skill.level / 5) * 100;
  };

  const getNextLevelTarget = (currentLevel) => {
    if (currentLevel >= 5) return null;
    return currentLevel + 1;
  };

  const getSkillCategory = (skillId) => {
    const skill = availableSkills.find(s => s.id === skillId);
    return skill?.category || 'Général';
  };

  if (loading && userSkills.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Mon développement de compétences</h1>
            <p className="text-gray-600">Suivez votre progression et vos objectifs de développement</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{userSkills.length}</div>
            <div className="text-sm text-gray-500">Compétences acquises</div>
          </div>
        </div>
      </div>

      {/* Skills Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <AcademicCapIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Compétences techniques</p>
              <p className="text-2xl font-bold text-gray-900">
                {userSkills.filter(skill => {
                  const skillData = availableSkills.find(s => s.id === skill.skillId);
                  return skillData?.type === 'hard';
                }).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Compétences soft</p>
              <p className="text-2xl font-bold text-gray-900">
                {userSkills.filter(skill => {
                  const skillData = availableSkills.find(s => s.id === skill.skillId);
                  return skillData?.type === 'soft';
                }).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Niveau moyen</p>
              <p className="text-2xl font-bold text-gray-900">
                {userSkills.length > 0 
                  ? (userSkills.reduce((sum, skill) => sum + skill.level, 0) / userSkills.length).toFixed(1)
                  : '0'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Skills List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Mes compétences ({userSkills.length})
          </h2>
        </div>

        {userSkills.length === 0 ? (
          <div className="text-center py-12">
            <AcademicCapIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Vous n'avez pas encore de compétences enregistrées</p>
            <p className="text-sm text-gray-400 mt-2">Demandez l'ajout de nouvelles compétences à votre manager</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {userSkills.map((userSkill) => {
              const skillData = availableSkills.find(s => s.id === userSkill.skillId);
              if (!skillData) return null;

              return (
                <div key={userSkill.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">
                        {getSkillTypeIcon(skillData.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {skillData.name}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSkillTypeColor(skillData.type)}`}>
                            {getSkillTypeLabel(skillData.type)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {skillData.description}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSkillLevelColor(userSkill.level)}`}>
                            Niveau {userSkill.level} - {getSkillLevelLabel(userSkill.level)}
                          </span>
                          <span className="text-xs text-gray-500">
                            Catégorie: {getSkillCategory(userSkill.skillId)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedSkill({ ...userSkill, skillData });
                          setShowDetailsModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Détails
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progression</span>
                      <span>{getProgressPercentage(userSkill)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getProgressPercentage(userSkill)}%` }}
                      ></div>
                    </div>
                    {getNextLevelTarget(userSkill.level) && (
                      <p className="text-xs text-gray-500 mt-1">
                        Prochain objectif: Niveau {getNextLevelTarget(userSkill.level)} - {getSkillLevelLabel(getNextLevelTarget(userSkill.level))}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Skill Details Modal */}
      {showDetailsModal && selectedSkill && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Détails de la compétence
                </h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    {selectedSkill.skillData.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {selectedSkill.skillData.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSkillTypeColor(selectedSkill.skillData.type)}`}>
                      {getSkillTypeLabel(selectedSkill.skillData.type)}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Catégorie</label>
                    <span className="text-sm text-gray-900">
                      {getSkillCategory(selectedSkill.skillId)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Niveau actuel</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSkillLevelColor(selectedSkill.level)}`}>
                      Niveau {selectedSkill.level} - {getSkillLevelLabel(selectedSkill.level)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Progression</label>
                  <div className="mt-2">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Niveau {selectedSkill.level} sur 5</span>
                      <span>{getProgressPercentage(selectedSkill)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${getProgressPercentage(selectedSkill)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {getNextLevelTarget(selectedSkill.level) && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Prochain objectif</p>
                        <p className="text-sm text-blue-700">
                          Atteindre le niveau {getNextLevelTarget(selectedSkill.level)} - {getSkillLevelLabel(getNextLevelTarget(selectedSkill.level))}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Date d'acquisition</label>
                  <span className="text-sm text-gray-900">
                    {selectedSkill.createdAt ? new Date(selectedSkill.createdAt).toLocaleDateString('fr-FR') : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowDetailsModal(false)}
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

export default MySkillDevelopment;


