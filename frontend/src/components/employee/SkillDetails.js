import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  AcademicCapIcon, 
  ArrowLeftIcon, 
  PlusIcon, 
  XMarkIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { getSkillLevelName, getSkillLevelOptions } from '../../utils/skillLevels';

const SkillDetails = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showNewSkillModal, setShowNewSkillModal] = useState(false);
  const [showImprovementModal, setShowImprovementModal] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [newSkillRequest, setNewSkillRequest] = useState({
    skillName: '',
    skillType: 'hard',
    reason: ''
  });
  const [improvementRequest, setImprovementRequest] = useState({
    currentLevel: 1,
    targetLevel: 2,
    reason: ''
  });

  const skillLevelOptions = getSkillLevelOptions();

  const availableSkills = [
    'React', 'Docker', 'Python', 'JavaScript', 'Node.js', 'MongoDB', 'SQL', 'Git',
    'TypeScript', 'Vue.js', 'Angular', 'AWS', 'Azure', 'Kubernetes', 'Jenkins',
    'Communication', 'Leadership', 'Problem Solving', 'Teamwork', 'Time Management'
  ];

  // Get skill history from API
  const getSkillHistory = async (skillId) => {
    try {
      // TODO: Implement API call to get skill history
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error fetching skill history:', error);
      return [];
    }
  };

  const handleRequestNewSkill = () => {
    toast.success(`Demande de compétence "${newSkillRequest.skillName}" envoyée au manager`);
    setShowNewSkillModal(false);
    setNewSkillRequest({
      skillName: '',
      skillType: 'hard',
      reason: ''
    });
  };

  const handleRequestImprovement = () => {
    toast.success(`Demande d'amélioration pour ${selectedSkill.name} envoyée au manager`);
    setShowImprovementModal(false);
    setSelectedSkill(null);
    setImprovementRequest({
      currentLevel: 1,
      targetLevel: 2,
      reason: ''
    });
  };

  const getSkillTypeColor = (type) => {
    return type === 'hard' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  const getSkillTypeIcon = (type) => {
    return type === 'hard' ? 'text-blue-600' : 'text-green-600';
  };

  const getProgressColor = (level) => {
    if (level <= 2) return 'bg-red-500';
    if (level <= 3) return 'bg-yellow-500';
    if (level <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/employee')}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Détails de mes compétences</h1>
            <p className="text-gray-600">Vue complète de vos compétences et de leur évolution</p>
          </div>
        </div>
        <button 
          onClick={() => setShowNewSkillModal(true)}
          className="btn-primary flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Demander une compétence
        </button>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {user.skills.map((skill) => (
          <div key={skill.id} className="card">
            {/* Skill Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${skill.type === 'hard' ? 'bg-blue-100' : 'bg-green-100'}`}>
                  <AcademicCapIcon className={`h-6 w-6 ${getSkillTypeIcon(skill.type)}`} />
                </div>
                <div className="ml-3">
                  <h3 className="text-xl font-semibold text-gray-900">{skill.name}</h3>
                  <span className={`badge ${getSkillTypeColor(skill.type)}`}>
                    {skill.type === 'hard' ? 'Hard Skill' : 'Soft Skill'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Current Level */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Niveau actuel</span>
                <span className="text-2xl font-bold text-gray-900">{getSkillLevelName(skill.level)}</span>
              </div>
              <div className="flex space-x-1 mb-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`w-full h-3 rounded-full ${
                      level <= skill.level ? getProgressColor(level) : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-600">
                Niveau {skill.level} sur 5 - {skill.level * 20}% de maîtrise
              </p>
            </div>

            {/* Skill History */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <ChartBarIcon className="h-4 w-4 mr-2" />
                Historique de la compétence
              </h4>
              <div className="space-y-2">
                {getSkillHistory(skill.id).map((history) => (
                  <div key={history.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-md">
                    <div className="p-1 rounded-full bg-blue-100">
                      {history.type === 'level_up' ? (
                        <ArrowLeftIcon className="h-3 w-3 text-blue-600" />
                      ) : (
                        <PlusIcon className="h-3 w-3 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-900">
                        {history.type === 'level_up' 
                          ? `Niveau ${history.fromLevel} → ${history.toLevel}`
                          : `Niveau ${history.level} ajouté`
                        }
                      </p>
                      <p className="text-xs text-gray-600">{history.reason}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{history.date}</p>
                      <p className="text-xs text-gray-500">{history.approvedBy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* New Skill Request Modal */}
      {showNewSkillModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Demander une nouvelle compétence</h3>
                <button
                  onClick={() => setShowNewSkillModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Compétence</label>
                  <select
                    value={newSkillRequest.skillName}
                    onChange={(e) => setNewSkillRequest({...newSkillRequest, skillName: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Sélectionner une compétence</option>
                    {availableSkills.map(skill => (
                      <option key={skill} value={skill}>{skill}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type de compétence</label>
                  <select
                    value={newSkillRequest.skillType}
                    onChange={(e) => setNewSkillRequest({...newSkillRequest, skillType: e.target.value})}
                    className="input-field"
                  >
                    <option value="hard">Hard Skill</option>
                    <option value="soft">Soft Skill</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Raison de la demande</label>
                  <textarea
                    value={newSkillRequest.reason}
                    onChange={(e) => setNewSkillRequest({...newSkillRequest, reason: e.target.value})}
                    className="input-field"
                    rows="3"
                    placeholder="Expliquez pourquoi vous souhaitez ajouter cette compétence..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowNewSkillModal(false)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button
                  onClick={handleRequestNewSkill}
                  className="btn-primary"
                  disabled={!newSkillRequest.skillName || !newSkillRequest.reason}
                >
                  Envoyer la demande
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Skill Improvement Request Modal */}
      {showImprovementModal && selectedSkill && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Demander une amélioration</h3>
                <button
                  onClick={() => setShowImprovementModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Compétence</label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <span className="font-medium">{selectedSkill.name}</span>
                    <span className={`ml-2 badge ${getSkillTypeColor(selectedSkill.type)}`}>
                      {selectedSkill.type === 'hard' ? 'Hard Skill' : 'Soft Skill'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Niveau actuel</label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <span className="font-medium">Niveau {improvementRequest.currentLevel}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Niveau cible</label>
                  <select
                    value={improvementRequest.targetLevel}
                    onChange={(e) => setImprovementRequest({...improvementRequest, targetLevel: parseInt(e.target.value)})}
                    className="input-field"
                  >
                    {skillLevelOptions.map(option => (
                      <option key={option.value} value={option.value} disabled={option.value <= improvementRequest.currentLevel}>
                        {option.label} {option.value <= improvementRequest.currentLevel ? '(niveau actuel ou inférieur)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Raison de l'amélioration</label>
                  <textarea
                    value={improvementRequest.reason}
                    onChange={(e) => setImprovementRequest({...improvementRequest, reason: e.target.value})}
                    className="input-field"
                    rows="3"
                    placeholder="Expliquez pourquoi vous souhaitez améliorer cette compétence..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowImprovementModal(false)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button
                  onClick={handleRequestImprovement}
                  className="btn-primary"
                  disabled={!improvementRequest.reason || improvementRequest.targetLevel <= improvementRequest.currentLevel}
                >
                  Envoyer la demande
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillDetails;

