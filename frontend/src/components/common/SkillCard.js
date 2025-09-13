import React from 'react';
import { AcademicCapIcon } from '@heroicons/react/24/outline';
import { getSkillLevelName } from '../../utils/skillLevels';

const SkillCard = ({ skill, isLoading = false }) => {
  const getSkillTypeColor = (type) => {
    return type === 'hard' 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-green-100 text-green-800';
  };

  const getSkillTypeLabel = (type) => {
    return type === 'hard' ? 'Hard Skill' : 'Soft Skill';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
      {/* Skill Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${skill.type === 'hard' ? 'bg-blue-100' : 'bg-green-100'}`}>
            <AcademicCapIcon className={`h-5 w-5 ${skill.type === 'hard' ? 'text-blue-600' : 'text-green-600'}`} />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">{skill.name}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSkillTypeColor(skill.type)}`}>
                {getSkillTypeLabel(skill.type)}
              </span>
            </div>
          </div>
        </div>
        {/* Large Level Display */}
        <div className="text-right">
          <div className="text-xl font-bold text-gray-900">{getSkillLevelName(skill.level)}</div>
        </div>
      </div>
      
      {/* Skill Level and Progress */}
      <div className="space-y-4">
        <div>
          <div className="text-sm text-gray-600 mb-2">Niveau actuel</div>
          {/* Segmented Progress Bar */}
          <div className="flex space-x-1 mb-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={`flex-1 h-3 rounded-sm transition-all duration-300 ${
                  level <= skill.level
                    ? level <= 2
                      ? 'bg-red-500'
                      : level === 3
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          <div className="text-sm text-gray-600">
            Niveau {skill.level} sur 5 - {Math.round((skill.level / 5) * 100)}% de maîtrise
          </div>
        </div>
        
        {/* Skill Details */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Catégorie:</span>
            <span className="font-medium text-gray-900">{skill.category}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Acquise le:</span>
            <span className="font-medium text-gray-900">
              {skill.acquiredAt ? new Date(skill.acquiredAt).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default SkillCard;
