import React from 'react';
import { getSkillLevelName } from '../../utils/skillLevels';

const SkillBadge = ({ name, level, type }) => {
  const color = type === 'hard' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${color} mr-2 mb-2`}>
      {name} — {getSkillLevelName(level)}
    </span>
  );
};

export default SkillBadge;
















