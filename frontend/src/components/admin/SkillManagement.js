import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import ConfirmationModal from '../common/ConfirmationModal';
import SkillDetailModal from './SkillDetailModal';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  AcademicCapIcon,
  CpuChipIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  FunnelIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const SkillManagement = () => {
  const { user, isAuthLoading } = useAuth();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [showSkillDetailModal, setShowSkillDetailModal] = useState(false);
  const [skillTypeFilter, setSkillTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [newSkill, setNewSkill] = useState({
    name: '',
    type: 'hard',
    description: '',
    category: ''
  });
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const categories = {
    hard: ['Frontend', 'Backend', 'DevOps', 'Data Science', 'Mobile', 'Database'],
    soft: ['Management', 'Communication', 'Interpersonnel', 'Organisation', 'Créativité']
  };

  // Load skills from database
  useEffect(() => {
    // Don't fetch data if auth is still loading
    if (isAuthLoading || !user) {
      return;
    }
    
    loadSkills();
  }, [isAuthLoading, user]);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const skillsData = await dataService.getSkills();
      setSkills(skillsData);
      console.log('Loaded skills:', skillsData);
    } catch (error) {
      console.error('Error loading skills:', error);
      toast.error('Erreur lors du chargement des compétences');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSkill = async () => {
    try {
      setLoading(true);
      await dataService.createSkill(newSkill);
      toast.success('Compétence créée avec succès');
      setShowCreateModal(false);
      setNewSkill({ name: '', type: 'hard', description: '', category: '' });
      loadSkills(); // Reload skills
    } catch (error) {
      console.error('Error creating skill:', error);
      toast.error(error.message || 'Erreur lors de la création de la compétence');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSkill = async () => {
    try {
      setLoading(true);
      
      // Only send fields that are allowed in the update schema
      const updateData = {
        name: selectedSkill.name,
        type: selectedSkill.type,
        category: selectedSkill.category,
        description: selectedSkill.description,
        maxLevel: selectedSkill.maxLevel,
        isActive: selectedSkill.isActive
      };
      
      await dataService.updateSkill(selectedSkill.id, updateData);
      toast.success('Compétence mise à jour avec succès');
      setShowEditModal(false);
      setSelectedSkill(null);
      loadSkills(); // Reload skills
    } catch (error) {
      console.error('Error updating skill:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour de la compétence');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSkill = async (skillId) => {
    setItemToDelete(skillId);
    setIsConfirmModalOpen(true);
  };

  const confirmDeleteSkill = async () => {
    try {
      setLoading(true);
      await dataService.deleteSkill(itemToDelete);
      toast.success('Compétence supprimée avec succès');
      setIsConfirmModalOpen(false);
      setItemToDelete(null);
      loadSkills(); // Reload skills
    } catch (error) {
      console.error('Error deleting skill:', error);
      toast.error(error.message || 'Erreur lors de la suppression de la compétence');
    } finally {
      setLoading(false);
    }
  };

  const getSkillTypeIcon = (type) => {
    return type === 'hard' ? (
      <CpuChipIcon className="w-5 h-5 text-blue-600" />
    ) : (
      <HeartIcon className="w-5 h-5 text-pink-600" />
    );
  };

  const getSkillTypeBadge = (type) => {
    const colors = {
      hard: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-200',
      soft: 'bg-gradient-to-r from-pink-100 to-pink-200 text-pink-800 border border-pink-200'
    };
    const labels = {
      hard: 'Hard Skill',
      soft: 'Soft Skill'
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
        {getSkillTypeIcon(type)}
        <span className="ml-1">{labels[type] || type}</span>
      </span>
    );
  };

  const getStatusBadge = (isActive) => {
    const colors = isActive 
      ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-200'
      : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-200';
    const label = isActive ? 'Actif' : 'Inactif';
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${colors}`}>
        {label}
      </span>
    );
  };

  // Filter skills based on search term and type filter
  const filteredSkills = skills.filter(skill => {
    const matchesSearch = !searchTerm || 
      skill.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !skillTypeFilter || skill.type === skillTypeFilter;
    
    return matchesSearch && matchesType;
  });

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <AcademicCapIcon className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestion des compétences</h1>
                <p className="text-gray-600 mt-1">Créez et gérez les compétences techniques et interpersonnelles</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] flex items-center space-x-2"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Créer une compétence</span>
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une compétence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={skillTypeFilter}
                onChange={(e) => setSkillTypeFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white appearance-none"
              >
                <option value="">Tous les types</option>
                <option value="hard">Hard Skills</option>
                <option value="soft">Soft Skills</option>
              </select>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-center">
              <span className="text-sm text-gray-600 font-medium">
                {filteredSkills.length} compétence{filteredSkills.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-blue-600 font-medium">
                  {skills.filter(s => s.type === 'hard').length} Hard Skills
                </span>
                <span className="text-pink-600 font-medium">
                  {skills.filter(s => s.type === 'soft').length} Soft Skills
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Skills List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
            <h2 className="text-xl font-bold text-gray-900">
              Liste des compétences
            </h2>
          </div>
          
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Chargement des compétences...</p>
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="text-center py-16">
              <SparklesIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">Aucune compétence trouvée</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredSkills.map((skill) => (
                <div key={skill.id} className={`p-6 transition-all duration-200 hover:shadow-sm ${
                  !skill.isActive 
                    ? 'bg-gray-50 hover:bg-gray-100 opacity-75' 
                    : 'hover:bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          skill.type === 'hard' 
                            ? 'bg-gradient-to-br from-blue-100 to-blue-200' 
                            : 'bg-gradient-to-br from-pink-100 to-pink-200'
                        }`}>
                          {getSkillTypeIcon(skill.type)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{skill.name}</h3>
                        <p className="text-gray-600 text-sm mb-2">{skill.description}</p>
                        <div className="flex items-center space-x-3">
                          {getSkillTypeBadge(skill.type)}
                          {getStatusBadge(skill.isActive)}
                          <span className="text-sm text-gray-500">Niveau max: {skill.maxLevel}</span>
                          {skill.category && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="text-sm text-gray-500">{skill.category}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => {
                          setSelectedSkill(skill);
                          setShowSkillDetailModal(true);
                        }}
                        className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-200"
                        title="Voir les détails"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedSkill(skill);
                          setShowEditModal(true);
                        }}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
                        title="Modifier la compétence"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteSkill(skill.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                        title="Supprimer la compétence"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Skill Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Créer une nouvelle compétence</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Nom de la compétence</label>
                <input
                  type="text"
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  placeholder="Ex: JavaScript, Communication, Leadership"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Type</label>
                  <select
                    value={newSkill.type}
                    onChange={(e) => setNewSkill({ ...newSkill, type: e.target.value, category: '' })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  >
                    <option value="hard">Hard Skill (Technique)</option>
                    <option value="soft">Soft Skill (Interpersonnel)</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Catégorie</label>
                  <select
                    value={newSkill.category}
                    onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {categories[newSkill.type]?.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Description</label>
                <textarea
                  value={newSkill.description}
                  onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white resize-none"
                  placeholder="Décrivez cette compétence..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateSkill}
                disabled={loading || !newSkill.name}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200 font-medium disabled:opacity-50 shadow-md hover:shadow-lg"
              >
                {loading ? 'Création...' : 'Créer la compétence'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Skill Modal */}
      {showEditModal && selectedSkill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Modifier la compétence</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Nom de la compétence</label>
                <input
                  type="text"
                  value={selectedSkill.name}
                  onChange={(e) => setSelectedSkill({ ...selectedSkill, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Type</label>
                  <select
                    value={selectedSkill.type}
                    onChange={(e) => setSelectedSkill({ ...selectedSkill, type: e.target.value, category: '' })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  >
                    <option value="hard">Hard Skill (Technique)</option>
                    <option value="soft">Soft Skill (Interpersonnel)</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Catégorie</label>
                  <select
                    value={selectedSkill.category}
                    onChange={(e) => setSelectedSkill({ ...selectedSkill, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {categories[selectedSkill.type]?.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Description</label>
                <textarea
                  value={selectedSkill.description}
                  onChange={(e) => setSelectedSkill({ ...selectedSkill, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white resize-none"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Niveau maximum</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={selectedSkill.maxLevel}
                    onChange={(e) => setSelectedSkill({ ...selectedSkill, maxLevel: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Statut</label>
                  <select
                    value={selectedSkill.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setSelectedSkill({ ...selectedSkill, isActive: e.target.value === 'active' })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  >
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleEditSkill}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium disabled:opacity-50 shadow-md hover:shadow-lg"
              >
                {loading ? 'Mise à jour...' : 'Mettre à jour'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDeleteSkill}
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer cette compétence ? Cette action ne peut pas être annulée."
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />

      {/* Skill Detail Modal */}
      {showSkillDetailModal && selectedSkill && (
        <SkillDetailModal
          skill={selectedSkill}
          isOpen={showSkillDetailModal}
          onClose={() => {
            setShowSkillDetailModal(false);
            setSelectedSkill(null);
          }}
        />
      )}
    </div>
  );
};

export default SkillManagement; 