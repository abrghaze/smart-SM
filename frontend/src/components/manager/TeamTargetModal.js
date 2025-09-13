import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import {
  XMarkIcon,
  UserGroupIcon,
  CalendarIcon,
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const TeamTargetModal = ({ team, isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Team target form state
  const [teamTarget, setTeamTarget] = useState({
    title: '',
    description: '',
    skill: '',
    targetLevel: 1,
    deadline: '',
    category: 'company_project' // Default to "Projet d'entreprise"
  });
  
  // Partial targets for each team member
  const [partialTargets, setPartialTargets] = useState([]);
  const [showPartialTargetsModal, setShowPartialTargetsModal] = useState(false);
  
  useEffect(() => {
    if (isOpen && team) {
      loadTeamData();
      loadSkills();
    }
  }, [isOpen, team]);
  
  const loadTeamData = async () => {
    try {
      const members = await dataService.getTeamMembers(team.id);
      setTeamMembers(members);
      
      // Initialize partial targets for each member
      const initialPartialTargets = members.map(member => ({
        userId: member.id,
        firstName: member.first_name || 'Unknown',
        lastName: member.last_name || 'User',
        partialTargetName: `${teamTarget.title || 'Nouvel objectif'} - ${member.first_name || 'Unknown'} ${member.last_name || 'User'}`,
        individualDescription: `Partial target for ${member.first_name || 'Unknown'} ${member.last_name || 'User'}`,
        individualDeadline: teamTarget.deadline || new Date().toISOString().split('T')[0]
      }));
      setPartialTargets(initialPartialTargets);
    } catch (error) {
      console.error('Error loading team data:', error);
      toast.error('Erreur lors du chargement des données de l\'équipe');
      // Set empty array to prevent errors
      setPartialTargets([]);
    }
  };
  
  const loadSkills = async () => {
    try {
      const skillsData = await dataService.getSkills();
      setSkills(skillsData);
    } catch (error) {
      console.error('Error loading skills:', error);
      toast.error('Erreur lors du chargement des compétences');
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Debug category changes
    if (name === 'category') {
      console.log('🔍 DEBUG: Category changed to:', value);
    }
    
    setTeamTarget(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Update partial target names when team target title changes
    if (name === 'title' && partialTargets && partialTargets.length > 0) {
      setPartialTargets(prev => prev.map(target => ({
        ...target,
        partialTargetName: `${value} - ${target.firstName || 'Unknown'} ${target.lastName || 'User'}`
      })));
    }
  };
  
  const handlePartialTargetChange = (index, field, value) => {
    setPartialTargets(prev => prev.map((target, i) => 
      i === index ? { ...target, [field]: value } : target
    ));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!teamTarget.title || !teamTarget.description || !teamTarget.skill || !teamTarget.deadline) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    if (teamTarget.title.length < 5) {
      toast.error('Le titre doit contenir au moins 5 caractères');
      return;
    }
    
    if (teamTarget.description.length < 10) {
      toast.error('La description doit contenir au moins 10 caractères');
      return;
    }
    
    // Find skill ID
    const selectedSkill = skills.find(skill => skill.name === teamTarget.skill);
    if (!selectedSkill) {
      toast.error('Compétence invalide');
      return;
    }
    
    setLoading(true);
    
    try {
      // ✅ FIX: Always sync partialTargets with teamMembers before submit
      const ensureAllPartialTargets = () => {
        const memberIds = teamMembers.map(m => m.id);
        const updated = memberIds.map(memberId => {
          const member = teamMembers.find(m => m.id === memberId);
          const existing = partialTargets.find(pt => pt.userId === memberId);

          return {
            userId: member.id,
            firstName: member.first_name || 'Unknown',
            lastName: member.last_name || 'User',
            partialTargetName: existing?.partialTargetName || `${teamTarget.title} - ${member.first_name}`,
            individualDescription: existing?.individualDescription || `Partial target for ${member.first_name}`,
            individualDeadline: existing?.individualDeadline || teamTarget.deadline
          };
        });
        setPartialTargets(updated);
        return updated;
      };

      const finalPartialTargets = ensureAllPartialTargets();
      
      console.log('🔍 FIXED: Final partial targets count:', finalPartialTargets.length);
      console.log('🔍 FIXED: Team members count:', teamMembers.length);
      console.log('🔍 FIXED: All members included:', finalPartialTargets.length === teamMembers.length ? 'YES ✅' : 'NO ❌');
      
      // Debug: Show which members are included
      finalPartialTargets.forEach((target, index) => {
        const member = teamMembers.find(m => m.id === target.userId);
        console.log(`🔍 FIXED: Member ${index + 1}: ${member?.first_name} ${member?.last_name} (${target.userId})`);
      });
      
      // BULLETPROOF: Simple data preparation based on category
      let objectiveData;
      
      if (teamTarget.category === 'personal_improvement') {
        // For individual targets: Simple data, backend handles all team members
        objectiveData = {
          title: teamTarget.title,
          description: teamTarget.description,
          skillId: selectedSkill.id,
          targetLevel: parseInt(teamTarget.targetLevel),
          deadline: teamTarget.deadline,
          teamId: team.id
        };
        console.log('🚀 BULLETPROOF: Individual target data prepared:', objectiveData);
      } else {
        // For team targets: Complex data with partial targets
        objectiveData = {
          title: teamTarget.title,
          description: teamTarget.description,
          category: teamTarget.category,
          skillId: selectedSkill.id,
          targetLevel: parseInt(teamTarget.targetLevel),
          deadline: teamTarget.deadline,
          assigneeType: 'TEAM',
          teamId: team.id,
          teamMemberAssignments: finalPartialTargets.map(target => ({
            userId: target.userId,
            partialTargetName: target.partialTargetName,
            individualDescription: target.individualDescription,
            individualDeadline: target.individualDeadline
          }))
        };
        console.log('🚀 BULLETPROOF: Team target data prepared:', objectiveData);
      }
      
      console.log('🚀 BULLETPROOF: Final objective data:', objectiveData);
      
      // BULLETPROOF LOGIC: Simple category-based routing
      console.log('🚀 BULLETPROOF: Category =', teamTarget.category);
      
      let result;
      if (teamTarget.category === 'personal_improvement') {
        console.log('🚀 BULLETPROOF: Assigning individual targets to all team members');
        result = await dataService.createTeamIndividualTargets(objectiveData);
        console.log('🚀 BULLETPROOF: Individual targets result:', result);
      } else {
        console.log('🚀 BULLETPROOF: Creating team target with partial targets');
        result = await dataService.createTeamTarget(objectiveData);
        console.log('🚀 BULLETPROOF: Team target result:', result);
      }
      
      toast.success('Objectif d\'équipe créé avec succès!');
      onSuccess && onSuccess(result);
      onClose();
      
    } catch (error) {
      console.error('Error creating team target:', error);
      toast.error(error.message || 'Erreur lors de la création de l\'objectif d\'équipe');
    } finally {
      setLoading(false);
    }
  };
  
  const handleClose = () => {
    setTeamTarget({
      title: '',
      description: '',
      skill: '',
      targetLevel: 1,
      deadline: '',
      category: 'company_project'
    });
    setPartialTargets([]);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 overflow-y-auto h-full w-full z-50 backdrop-blur-md">
      <div className="relative top-4 mx-auto p-8 border-0 w-11/12 max-w-4xl shadow-2xl rounded-3xl bg-gradient-to-br from-white via-gray-50 to-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-500 rounded-3xl flex items-center justify-center shadow-2xl">
              <UserGroupIcon className="w-9 h-9 text-white" />
            </div>
            <div>
              <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Assigner un Objectif d'Équipe
              </h3>
              <p className="text-lg text-gray-600 mt-1">Projet d'entreprise - {team?.name}</p>
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
          {/* Team Target Details */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
            <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <DocumentTextIcon className="w-6 h-6 mr-2 text-blue-600" />
              Détails de l'Objectif d'Équipe
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre de l'objectif *
                </label>
                <input
                  type="text"
                  name="title"
                  value={teamTarget.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Ex: Développement d'une nouvelle fonctionnalité"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catégorie *
                </label>
                <select
                  name="category"
                  value={teamTarget.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value="company_project">Projet d'entreprise</option>
                  <option value="personal_improvement">Amélioration personnelle</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Compétence *
                </label>
                <select
                  name="skill"
                  value={teamTarget.skill}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
                  value={teamTarget.targetLevel}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
                    value={teamTarget.deadline}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
                value={teamTarget.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Décrivez l'objectif d'équipe en détail..."
                required
              />
            </div>
          </div>
          
          {/* Partial Targets Section */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xl font-bold text-gray-900 flex items-center">
                <UserGroupIcon className="w-6 h-6 mr-2 text-green-600" />
                Objectifs Partiels pour les Membres ({teamMembers.length} membres)
              </h4>
              <button
                type="button"
                onClick={() => setShowPartialTargetsModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors duration-200 flex items-center"
              >
                <PencilIcon className="w-4 h-4 mr-2" />
                Personnaliser
              </button>
            </div>
            
            <div className="space-y-3">
              {partialTargets && partialTargets.length > 0 ? partialTargets.map((target, index) => (
                <div key={target.userId || index} className="bg-white rounded-xl p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-bold text-sm">
                          {(target.firstName && target.firstName[0]) || 'U'}{(target.lastName && target.lastName[0]) || 'U'}
                        </span>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">
                          {target.firstName || 'Unknown'} {target.lastName || 'User'}
                        </h5>
                        <p className="text-sm text-gray-600">{target.partialTargetName || 'No target name'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        Échéance: {target.individualDeadline ? new Date(target.individualDeadline).toLocaleDateString('fr-FR') : 'Non définie'}
                      </p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Chargement des membres de l'équipe...</p>
                </div>
              )}
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
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Création...
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4 mr-2" />
                  Créer l'Objectif d'Équipe
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      
      {/* Partial Targets Customization Modal */}
      {showPartialTargetsModal && (
        <PartialTargetsModal
          partialTargets={partialTargets}
          onUpdate={setPartialTargets}
          onClose={() => setShowPartialTargetsModal(false)}
        />
      )}
    </div>
  );
};

// Partial Targets Customization Modal Component
const PartialTargetsModal = ({ partialTargets, onUpdate, onClose }) => {
  const [localTargets, setLocalTargets] = useState(partialTargets);
  
  const handleTargetChange = (index, field, value) => {
    setLocalTargets(prev => prev.map((target, i) => 
      i === index ? { ...target, [field]: value } : target
    ));
  };
  
  const handleSave = () => {
    onUpdate(localTargets);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 overflow-y-auto h-full w-full z-60 backdrop-blur-md">
      <div className="relative top-10 mx-auto p-6 border-0 w-11/12 max-w-4xl shadow-2xl rounded-3xl bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Personnaliser les Objectifs Partiels</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
          >
            <XMarkIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {localTargets && localTargets.length > 0 ? localTargets.map((target, index) => (
            <div key={target.userId || index} className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-medium text-gray-900 mb-3">
                {target.firstName || 'Unknown'} {target.lastName || 'User'}
              </h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titre de l'objectif partiel
                  </label>
                  <input
                    type="text"
                    value={target.partialTargetName}
                    onChange={(e) => handleTargetChange(index, 'partialTargetName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description individuelle
                  </label>
                  <textarea
                    value={target.individualDescription}
                    onChange={(e) => handleTargetChange(index, 'individualDescription', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date limite individuelle
                  </label>
                  <input
                    type="date"
                    value={target.individualDeadline}
                    onChange={(e) => handleTargetChange(index, 'individualDeadline', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-8 text-gray-500">
              <p>Aucun membre trouvé</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamTargetModal;
