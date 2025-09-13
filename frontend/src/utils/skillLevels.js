// Utility functions for skill levels
export const SKILL_LEVELS = {
  1: 'Débutant',
  2: 'Intermédiaire',
  3: 'Confirmé',
  4: 'Avancé',
  5: 'Expert'
};

export const SKILL_LEVEL_VALUES = {
  'Débutant': 1,
  'Intermédiaire': 2,
  'Confirmé': 3,
  'Avancé': 4,
  'Expert': 5
};

export const getSkillLevelName = (level) => {
  return SKILL_LEVELS[level] || 'Inconnu';
};

export const getSkillLevelValue = (levelName) => {
  return SKILL_LEVEL_VALUES[levelName] || 1;
};

export const getSkillLevelOptions = () => {
  return Object.entries(SKILL_LEVELS).map(([value, label]) => ({
    value: parseInt(value),
    label: label
  }));
};

export const getSkillLevelNameOptions = () => {
  return Object.entries(SKILL_LEVELS).map(([value, label]) => ({
    value: label,
    label: label
  }));
};
