import React from 'react';
import { AcademicCapIcon, SparklesIcon, StarIcon } from '@heroicons/react/24/outline';
import { getSkillLevelName } from '../../utils/skillLevels';

const SkillCard = ({ skill, isLoading = false }) => {
  const getSkillTypeColor = (type) => {
    return type === 'hard' 
      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white' 
      : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
  };

  const getSkillTypeLabel = (type) => {
    return type === 'hard' ? 'Technique' : 'Comportemental';
  };

  const getLevelColor = (level) => {
    if (level >= 4) return 'text-green-600';
    if (level >= 3) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getProgressColor = (level, index) => {
    if (index >= level) return 'bg-gray-200';
    if (level >= 4) return 'bg-gradient-to-r from-green-400 to-green-500';
    if (level >= 3) return 'bg-gradient-to-r from-yellow-400 to-yellow-500';
    return 'bg-gradient-to-r from-orange-400 to-orange-500';
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-gray-200 transition-all duration-300 group">
      {/* Skill Header */}
      <div className="flex justify-between items-start mb-5">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-xl shadow-md ${skill.type === 'hard' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-green-500 to-emerald-600'} group-hover:scale-110 transition-transform duration-300`}>
            <AcademicCapIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors duration-200">{skill.name}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${getSkillTypeColor(skill.type)}`}>
                {skill.type === 'hard' ? '💻' : '🎯'} {getSkillTypeLabel(skill.type)}
              </span>
            </div>
          </div>
        </div>
        {/* Large Level Display */}
        <div className="text-right">
          <div className={`text-2xl font-bold ${getLevelColor(skill.level)}`}>{getSkillLevelName(skill.level)}</div>
          <div className="flex items-center justify-end mt-1">
            {[...Array(5)].map((_, i) => (
              <StarIcon 
                key={i} 
                className={`h-4 w-4 ${i < skill.level ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Skill Level and Progress */}
      <div className="space-y-5">
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-gray-700">Niveau de maîtrise</span>
            <span className={`text-sm font-bold ${getLevelColor(skill.level)}`}>
              {Math.round((skill.level / 5) * 100)}%
            </span>
          </div>
          {/* Segmented Progress Bar */}
          <div className="flex space-x-1.5 mb-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={`flex-1 h-3 rounded-full transition-all duration-500 ${getProgressColor(skill.level, level - 1)} ${level <= skill.level ? 'shadow-sm' : ''}`}
              />
            ))}
          </div>
          <div className="text-xs text-gray-500 flex items-center">
            <SparklesIcon className="h-3.5 w-3.5 mr-1 text-yellow-500" />
            Niveau {skill.level} sur 5
          </div>
        </div>
        
        {/* Skill Details */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 font-medium">Catégorie</span>
            <span className="font-semibold text-gray-900 bg-white px-3 py-1 rounded-lg shadow-sm">{skill.category || 'Générale'}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 font-medium">Acquise le</span>
            <span className="font-semibold text-gray-900 bg-white px-3 py-1 rounded-lg shadow-sm">
              {skill.acquiredAt ? new Date(skill.acquiredAt).toLocaleDateString('fr-FR') : 'N/A'}
            </span>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default SkillCard;
