// Skill level utilities
export const getSkillLevelOptions = () => {
  return [
    { value: 1, label: 'Débutant' },
    { value: 2, label: 'Intermédiaire' },
    { value: 3, label: 'Avancé' },
    { value: 4, label: 'Expert' },
    { value: 5, label: 'Maître' }
  ];
};

export const getSkillLevelName = (level) => {
  const options = getSkillLevelOptions();
  const option = options.find(opt => opt.value === level);
  return option ? option.label : 'Non défini';
};

export const getSkillLevelValue = (name) => {
  const options = getSkillLevelOptions();
  const option = options.find(opt => opt.label === name);
  return option ? option.value : 1;
};







