import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import {
  XMarkIcon,
  UserIcon,
  CalendarIcon,
  DocumentTextIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const IndividualTargetModal = ({ employee, team, isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Individual target form state
  const [individualTarget, setIndividualTarget] = useState({
    title: '',
    description: '',
    skill: '',
    targetLevel: 1,
    deadline: '',
    category: 'personal_improvement' // Default to "Amélioration personnelle"
  });
  
  useEffect(() => {
    if (isOpen) {
      loadSkills();
      // Reset form state when modal opens
      setIndividualTarget({
        title: '',
        description: '',
        skill: '',
        targetLevel: 1,
        deadline: '',
        category: 'personal_improvement'
      });
      setLoading(false);
    }
  }, [isOpen]);
  
  const loadSkills = async () => {
    try {
      const skillsData = await dataService.getSkills();
      console.log('🔍 IndividualTargetModal: Skills loaded:', skillsData);
      console.log('🔍 IndividualTargetModal: Skills length:', skillsData.length);
      setSkills(skillsData);
    } catch (error) {
      console.error('Error loading skills:', error);
      toast.error('Erreur lors du chargement des compétences');
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setIndividualTarget(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🔍 IndividualTargetModal: Form submission started');
    console.log('🔍 IndividualTargetModal: Form data:', individualTarget);
    console.log('🔍 IndividualTargetModal: Employee:', employee);
    console.log('🔍 IndividualTargetModal: Skills available:', skills.length);
    
    // Enhanced validation
    if (!individualTarget.title || !individualTarget.description || !individualTarget.skill || !individualTarget.deadline) {
      console.log('❌ IndividualTargetModal: Missing required fields');
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    if (individualTarget.title.length < 5) {
      console.log('❌ IndividualTargetModal: Title too short');
      toast.error('Le titre doit contenir au moins 5 caractères');
      return;
    }
    
    if (individualTarget.description.length < 10) {
      console.log('❌ IndividualTargetModal: Description too short');
      toast.error('La description doit contenir au moins 10 caractères');
      return;
    }
    
    // Find skill ID
    console.log('🔍 IndividualTargetModal: Looking for skill:', individualTarget.skill);
    console.log('🔍 IndividualTargetModal: Available skills:', skills.map(s => s.name));
    const selectedSkill = skills.find(skill => skill.name === individualTarget.skill);
    if (!selectedSkill) {
      console.log('❌ IndividualTargetModal: Invalid skill selected');
      console.log('🔍 IndividualTargetModal: Selected skill name:', individualTarget.skill);
      console.log('🔍 IndividualTargetModal: Available skill names:', skills.map(s => s.name));
      toast.error('Compétence invalide');
      return;
    }
    
    console.log('✅ IndividualTargetModal: Validation passed');
    console.log('🔍 IndividualTargetModal: Selected skill:', selectedSkill);
    
    setLoading(true);
    
    try {
      const objectiveData = {
        title: individualTarget.title,
        description: individualTarget.description,
        category: individualTarget.category,
        skillId: selectedSkill.id,
        targetLevel: parseInt(individualTarget.targetLevel),
        deadline: individualTarget.deadline,
        assigneeType: 'USER',
        userId: employee.id
      };
      
      console.log('🔍 IndividualTargetModal: Sending data to API:', objectiveData);
      
      const result = await dataService.createObjective(objectiveData);
      
      console.log('✅ IndividualTargetModal: API response:', result);
      
      toast.success('Objectif individuel créé avec succès!');
      console.log('✅ IndividualTargetModal: Calling onSuccess callback');
      onSuccess && onSuccess(result);
      console.log('✅ IndividualTargetModal: Calling onClose');
      onClose();
      
    } catch (error) {
      console.error('❌ IndividualTargetModal: Error creating individual target:', error);
      console.error('❌ IndividualTargetModal: Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
      toast.error(error.message || 'Erreur lors de la création de l\'objectif individuel');
    } finally {
      setLoading(false);
    }
  };
  
  const handleClose = () => {
    setIndividualTarget({
      title: '',
      description: '',
      skill: '',
      targetLevel: 1,
      deadline: '',
      category: 'personal_improvement'
    });
    setLoading(false); // Reset loading state
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 overflow-y-auto h-full w-full z-50 backdrop-blur-md">
      <div className="relative top-10 mx-auto p-8 border-0 w-11/12 max-w-2xl shadow-2xl rounded-3xl bg-gradient-to-br from-white via-gray-50 to-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-3xl flex items-center justify-center shadow-2xl">
              <UserIcon className="w-9 h-9 text-white" />
            </div>
            <div>
              <h3 className="text-3xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Assigner un Objectif Individuel
              </h3>
              <p className="text-lg text-gray-600 mt-1">
                Amélioration personnelle - {employee?.first_name} {employee?.last_name}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-12 h-12 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110"
          >
            <XMarkIcon className="w-7 h-7 text-gray-600" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Individual Target Details */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
            <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <DocumentTextIcon className="w-6 h-6 mr-2 text-green-600" />
              Détails de l'Objectif Individuel
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre de l'objectif *
                </label>
                <input
                  type="text"
                  name="title"
                  value={individualTarget.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  placeholder="Ex: Améliorer les compétences en React"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Compétence *
                </label>
                <select
                  name="skill"
                  value={individualTarget.skill}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value="">Sélectionner une compétence</option>
                  {skills.map(skill => (
                    <option key={skill.id} value={skill.name}>
                      {skill.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Niveau cible *
                </label>
                <select
                  name="targetLevel"
                  value={individualTarget.targetLevel}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value={1}>Débutant</option>
                  <option value={2}>Intermédiaire</option>
                  <option value={3}>Avancé</option>
                  <option value={4}>Expert</option>
                  <option value={5}>Maître</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date limite *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    name="deadline"
                    value={individualTarget.deadline}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={individualTarget.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                placeholder="Décrivez l'objectif individuel en détail..."
                required
              />
            </div>
          </div>
          
          {/* Employee Info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
            <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
              <UserIcon className="w-5 h-5 mr-2 text-blue-600" />
              Employé Assigné
            </h4>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-lg">
                  {employee?.first_name?.[0]}{employee?.last_name?.[0]}
                </span>
              </div>
              <div>
                <h5 className="font-medium text-gray-900">
                  {employee?.first_name} {employee?.last_name}
                </h5>
                <p className="text-sm text-gray-600">{employee?.email}</p>
                <p className="text-sm text-gray-500">Équipe: {team?.name}</p>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors duration-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Création...
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4 mr-2" />
                  Créer l'Objectif Individuel
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IndividualTargetModal;

