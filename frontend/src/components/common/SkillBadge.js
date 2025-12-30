import React from 'react';
import { getSkillLevelName } from '../../utils/skillLevels';
import { CogIcon, SparklesIcon } from '@heroicons/react/24/outline';

const SkillBadge = ({ name, level, type, size = 'md', showIcon = true }) => {
  const getTypeStyles = () => {
    if (type === 'hard') {
      return {
        bg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        icon: CogIcon,
        iconColor: 'text-blue-500'
      };
    } else {
      return {
        bg: 'bg-gradient-to-r from-emerald-50 to-teal-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        icon: SparklesIcon,
        iconColor: 'text-emerald-500'
      };
    }
  };

  const getLevelColor = (level) => {
    const colors = {
      1: 'bg-gray-200',
      2: 'bg-blue-300',
      3: 'bg-blue-400',
      4: 'bg-blue-500',
      5: 'bg-blue-600'
    };
    return colors[level] || 'bg-gray-200';
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2.5 py-1 text-xs';
      case 'lg':
        return 'px-4 py-2 text-sm';
      default:
        return 'px-3 py-1.5 text-xs';
    }
  };

  const styles = getTypeStyles();
  const IconComponent = styles.icon;

  return (
    <span 
      className={`inline-flex items-center ${getSizeClasses()} rounded-xl font-medium ${styles.bg} ${styles.text} border ${styles.border} mr-2 mb-2 transition-all duration-200 hover:shadow-sm`}
    >
      {showIcon && (
        <IconComponent className={`w-3.5 h-3.5 mr-1.5 ${styles.iconColor}`} />
      )}
      <span className="font-semibold">{name}</span>
      <span className="mx-1.5 text-gray-300">•</span>
      <span className="flex items-center">
        <span className="text-gray-500 mr-1.5">{getSkillLevelName(level)}</span>
        <div className="flex space-x-0.5">
          {[1, 2, 3, 4, 5].map((dot) => (
            <span
              key={dot}
              className={`w-1.5 h-1.5 rounded-full ${dot <= level ? getLevelColor(level) : 'bg-gray-200'}`}
            />
          ))}
        </div>
      </span>
    </span>
  );
};

export default SkillBadge;
















