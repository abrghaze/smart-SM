import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  XMarkIcon,
  CheckIcon,
  BriefcaseIcon,
  UsersIcon,
  AcademicCapIcon,
  CalendarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import JobTitleDetailModal from './JobTitleDetailModal';

const JobTitleManagement = () => {
  const { user } = useAuth();
  const [jobTitles, setJobTitles] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingJobTitle, setEditingJobTitle] = useState(null);
  const [viewingJobTitle, setViewingJobTitle] = useState(null);
  const [selectedJobTitle, setSelectedJobTitle] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [jobTitlesData, skillsData] = await Promise.all([
        apiService.getJobTitles(),
        apiService.getAvailableSkills()
      ]);
      setJobTitles(jobTitlesData);
      setSkills(skillsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingJobTitle) {
        await apiService.updateJobTitle(editingJobTitle.id, formData);
        toast.success('Titre de poste mis à jour avec succès');
      } else {
        await apiService.createJobTitle(formData);
        toast.success('Titre de poste créé avec succès');
      }
      setShowModal(false);
      setEditingJobTitle(null);
      setFormData({ title: '', description: '', requirements: [] });
      loadData();
    } catch (error) {
      console.error('Error saving job title:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = async (jobTitle) => {
    try {
      // Fetch full job title data including requirements
      const fullJobTitle = await apiService.getJobTitle(jobTitle.id);
      
      setEditingJobTitle(fullJobTitle);
      setFormData({
        title: fullJobTitle.title,
        description: fullJobTitle.description || '',
        requirements: fullJobTitle.requirements || []
      });
      setShowModal(true);
    } catch (error) {
      console.error('Error loading job title for editing:', error);
      toast.error('Erreur lors du chargement des détails du titre de poste');
    }
  };

  const handleView = async (jobTitle) => {
    try {
      const fullJobTitle = await apiService.getJobTitle(jobTitle.id);
      setViewingJobTitle(fullJobTitle);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error loading job title details:', error);
      toast.error('Erreur lors du chargement des détails');
    }
  };

  const handleDetailView = (jobTitle) => {
    setSelectedJobTitle(jobTitle);
    setShowDetailModal(true);
  };

  const handleFixUserSkills = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir corriger les compétences de tous les utilisateurs avec des titres de poste ? Cette action assignera automatiquement les compétences requises à tous les utilisateurs.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.fixAllUserSkills();
      
      if (response.summary) {
        toast.success(`Correction terminée ! ${response.summary.assigned} utilisateurs ont reçu des compétences, ${response.summary.skipped} ignorés, ${response.summary.errors} erreurs`);
        
        // Reload data to show updated statistics
        loadData();
      } else {
        toast.success('Compétences corrigées avec succès !');
        loadData();
      }
    } catch (error) {
      console.error('Error fixing user skills:', error);
      toast.error('Erreur lors de la correction des compétences');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jobTitle) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le titre de poste "${jobTitle.title}" ?`)) {
      try {
        await apiService.deleteJobTitle(jobTitle.id);
        toast.success('Titre de poste supprimé avec succès');
        loadData();
      } catch (error) {
        console.error('Error deleting job title:', error);
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const addRequirement = () => {
    setFormData({
      ...formData,
      requirements: [...formData.requirements, { skill_id: '', required_level: 1 }]
    });
  };

  const removeRequirement = (index) => {
    setFormData({
      ...formData,
      requirements: formData.requirements.filter((_, i) => i !== index)
    });
  };

  const updateRequirement = (index, field, value) => {
    const newRequirements = [...formData.requirements];
    newRequirements[index][field] = value;
    setFormData({ ...formData, requirements: newRequirements });
  };

  const getSkillName = (skillId) => {
    const skill = skills.find(s => s.id === skillId);
    return skill ? skill.name : 'Compétence inconnue';
  };

  const getSkillCategory = (skillId) => {
    const skill = skills.find(s => s.id === skillId);
    return skill ? skill.category : '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                  <BriefcaseIcon className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestion des Titres de Poste</h1>
                <p className="text-gray-600 mt-1">Créez et gérez les titres de poste avec leurs exigences de compétences</p>
              </div>
            </div>
                    <div className="flex items-center space-x-3">
          <button
            onClick={handleFixUserSkills}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] flex items-center space-x-2"
          >
            <CheckIcon className="w-5 h-5" />
            <span>Corriger les Compétences</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] flex items-center space-x-2"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Nouveau Titre</span>
          </button>
        </div>
          </div>
        </div>

        {/* Job Titles Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Titres de Poste ({jobTitles.length})</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <ChartBarIcon className="w-4 h-4" />
                <span>Vue d'ensemble des postes</span>
              </div>
            </div>
          </div>
          
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobTitles.map((jobTitle) => (
                <div 
                  key={jobTitle.id} 
                  className="group bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] cursor-pointer"
                  onClick={() => handleDetailView(jobTitle)}
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                          <BriefcaseIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {jobTitle.title}
                          </h3>
                          <p className="text-sm text-gray-500 line-clamp-2">
                            {jobTitle.description || 'Aucune description'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <AcademicCapIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">Compétences requises</span>
                        </div>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {jobTitle.requirements_count || 0}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CalendarIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">Créé le</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(jobTitle.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDetailView(jobTitle);
                        }}
                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                      >
                        <EyeIcon className="w-4 h-4" />
                        <span>Voir les détails</span>
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(jobTitle);
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(jobTitle);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {jobTitles.length === 0 && (
              <div className="text-center py-12">
                <BriefcaseIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun titre de poste</h3>
                <p className="text-gray-500 mb-6">Commencez par créer votre premier titre de poste</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Créer un titre de poste
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* Job Title Detail Modal */}
        <JobTitleDetailModal
          jobTitle={selectedJobTitle}
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
        />

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-8 py-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <BriefcaseIcon className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {editingJobTitle ? 'Modifier le Titre de Poste' : 'Nouveau Titre de Poste'}
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setEditingJobTitle(null);
                      setFormData({ title: '', description: '', requirements: [] });
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Titre du Poste *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Ex: Senior Software Engineer"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                    placeholder="Décrivez les responsabilités et les exigences de ce poste..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Exigences de Compétences
                      </label>
                      <p className="text-sm text-gray-500 mt-1">
                        {formData.requirements.length} exigence{formData.requirements.length !== 1 ? 's' : ''} configurée{formData.requirements.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addRequirement}
                      className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span>Ajouter une exigence</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {formData.requirements.map((req, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center space-x-4">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Compétence
                            </label>
                            <select
                              value={req.skill_id}
                              onChange={(e) => updateRequirement(index, 'skill_id', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                              required
                            >
                              <option value="">Sélectionner une compétence</option>
                              {skills.map((skill) => (
                                <option key={skill.id} value={skill.id}>
                                  {skill.name} ({skill.category})
                                </option>
                              ))}
                            </select>
                            {req.skill_id && (
                              <p className="text-sm text-gray-500 mt-1">
                                {getSkillName(req.skill_id)} - {getSkillCategory(req.skill_id)}
                              </p>
                            )}
                          </div>
                          <div className="w-32">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Niveau requis
                            </label>
                            <select
                              value={req.required_level}
                              onChange={(e) => updateRequirement(index, 'required_level', parseInt(e.target.value))}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                              required
                            >
                              <option value={1}>Niveau 1</option>
                              <option value={2}>Niveau 2</option>
                              <option value={3}>Niveau 3</option>
                              <option value={4}>Niveau 4</option>
                              <option value={5}>Niveau 5</option>
                            </select>
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => removeRequirement(index)}
                              className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                              title="Supprimer cette exigence"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
              </div>

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingJobTitle(null);
                      setFormData({ title: '', description: '', requirements: [] });
                    }}
                    className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                  >
                    {editingJobTitle ? 'Mettre à jour' : 'Créer le titre'}
                  </button>
                </div>
            </form>
          </div>
        </div>
      )}

        {/* View Modal */}
        {showViewModal && viewingJobTitle && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-8 py-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <BriefcaseIcon className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Détails du Titre de Poste
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="px-8 py-6 space-y-6">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{viewingJobTitle.title}</h3>
                  <p className="text-gray-600">{viewingJobTitle.description || 'Aucune description'}</p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Exigences de Compétences</h4>
                  {viewingJobTitle.requirements && viewingJobTitle.requirements.length > 0 ? (
                    <div className="space-y-3">
                      {viewingJobTitle.requirements.map((req, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <AcademicCapIcon className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">{req.skill_name}</span>
                              <span className="text-gray-500 ml-2">({req.skill_category})</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Niveau requis:</span>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                              {req.required_level}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AcademicCapIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Aucune exigence de compétence définie</p>
                    </div>
                  )}
                </div>
            </div>

              <div className="px-8 py-6 border-t border-gray-100">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors font-medium"
                >
                  Fermer
                </button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobTitleManagement;
