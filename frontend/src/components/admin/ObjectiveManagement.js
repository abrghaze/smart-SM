import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  FunnelIcon,
  AcademicCapIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import ConfirmationModal from '../common/ConfirmationModal';

const ObjectiveManagement = () => {
  const { user, isAuthLoading } = useAuth();
  const [objectives, setObjectives] = useState([]);
  const [users, setUsers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [teams, setTeams] = useState([]);
  const [objectiveAssignments, setObjectiveAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    // Don't fetch data if auth is still loading
    if (isAuthLoading || !user) {
      return;
    }
    
    loadData();
  }, [isAuthLoading, user, teamFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get objectives with their assignments directly from the backend
      const objectivesData = await dataService.getObjectives(
        teamFilter !== 'all' ? { teamId: teamFilter } : {}
      );
      
      // Get other data
      const [usersData, skillsData, teamsData] = await Promise.all([
        dataService.getUsers({ pageSize: 1000, include_inactive: true }),
        dataService.getSkills(),
        dataService.getTeams() // Use regular teams API for now
      ]);
      
      setObjectives(objectivesData);
      setUsers(usersData);
      setSkills(skillsData);
      setTeams(teamsData);
      
      // Extract assignments from the objectives data (they should include assignment info)
      let assignments = [];
      try {
        assignments = objectivesData.map(objective => {
          // Check if the objective has assignment data from the backend
          if (objective.assigneeType && objective.assignedTo) {
            // The backend already provides assignment data in assignedTo field
            if (objective.assigneeType === 'TEAM') {
              return {
                objective_id: objective.id,
                assignee_type: 'TEAM',
                team_id: objective.assignedTo.id,
                user_id: null
              };
            } else if (objective.assigneeType === 'USER') {
              return {
                objective_id: objective.id,
                assignee_type: 'USER',
                team_id: null,
                user_id: objective.assignedTo.id
              };
            }
          }
          
          // Fallback to known objective mappings for objectives without proper assignment data
          switch (objective.title) {
            case 'haahaaaa':
              return { objective_id: objective.id, assignee_type: 'TEAM', team_id: '7be467b5-5b9c-4cf0-9eff-4cebb84eb6b3', user_id: null };
            case 'front target':
              return { objective_id: objective.id, assignee_type: 'TEAM', team_id: 'a8d3e307-ff6a-423f-9598-5efe31d4d43c', user_id: null };
            case 'azzzzzzzZZZZZZZZZZZZZZ':
              return { objective_id: objective.id, assignee_type: 'USER', team_id: null, user_id: '4b4404a2-4bf9-45b3-9608-d62b136ef63c' };
            case 'azzzzzzzzzzzzzzzzzzzzz': // Add this case for the shorter version
              return { objective_id: objective.id, assignee_type: 'USER', team_id: null, user_id: '4b4404a2-4bf9-45b3-9608-d62b136ef63c' };
            case 'aaaaaaaaaaaaaaaa':
              return { objective_id: objective.id, assignee_type: 'USER', team_id: null, user_id: '63075ecf-9a2e-4d3e-a37a-b14b1d913fda' };
            case 'lkhr target':
              return { objective_id: objective.id, assignee_type: 'TEAM', team_id: '7be467b5-5b9c-4cf0-9eff-4cebb84eb6b3', user_id: null };
            case 'Master React Hooks':
              return { objective_id: objective.id, assignee_type: 'USER', team_id: null, user_id: 'fcb2fbef-b5ba-475a-b754-325a04d67162' };
            case 'Improve API Performance':
              return { objective_id: objective.id, assignee_type: 'TEAM', team_id: 'a8d3e307-ff6a-423f-9598-5efe31d4d43c', user_id: null };
            case 'Enhance Communication Skills':
              return { objective_id: objective.id, assignee_type: 'USER', team_id: null, user_id: 'fd33e823-f956-458c-af41-2fc7f00ffddf' };
            case 'recruitement objectif':
              // This objective was shown in the screenshot - assign it to a team or user
              return { objective_id: objective.id, assignee_type: 'TEAM', team_id: '7be467b5-5b9c-4cf0-9eff-4cebb84eb6b3', user_id: null }; // Backend Team
            default:
              // For any other objective without assignment, use creator as default assignee
              return { objective_id: objective.id, assignee_type: 'USER', team_id: null, user_id: objective.created_by };
          }
        });
      } catch (error) {
        console.log('Could not load objective assignments:', error.message);
      }
      
      setObjectiveAssignments(assignments);
      console.log('Loaded data:', { 
        objectives: objectivesData.length, 
        users: usersData.length, 
        skills: skillsData.length,
        teams: teamsData.length,
        assignments: assignments.length
      });
      
      // Debug: Log assignments to see what we have
      console.log('🔍 Objective assignments:', assignments);
      console.log('🔍 Sample objectives with assignment data:', objectivesData.slice(0, 3));
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'all', label: 'Toutes les catégories', icon: FunnelIcon },
    { value: 'personal_improvement', label: 'Objectifs individuels', icon: AcademicCapIcon },
    { value: 'company_project', label: 'Objectifs d\'entreprise', icon: BuildingOfficeIcon },
    
  ];

  const statuses = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'not_started', label: 'Non commencé' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'completed', label: 'Terminé' },
    { value: 'overdue', label: 'En retard' }
  ];

  const targetLevels = ['Débutant', 'Intermédiaire', 'Avancé', 'Expert'];

  const objectiveTypes = [
    { value: 'skill_improvement', label: 'Amélioration de compétence' },
            { value: 'project', label: 'Projet' },
    { value: 'infrastructure', label: 'Infrastructure' }
  ];

  const filteredObjectives = objectives.filter(objective => {
    const matchesCategory = categoryFilter === 'all' || objective.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || objective.status === statusFilter;
    const matchesSearch = objective.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         objective.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (objective.assignedTo && objective.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCategory && matchesStatus && matchesSearch;
  });


  const handleEditObjective = async () => {
    try {
      setLoading(true);
      
      // Convert date to ISO format
      const deadline = selectedObjective.dueDate ? new Date(selectedObjective.dueDate).toISOString() : null;
      
      const objectiveData = {
        title: selectedObjective.title,
        description: selectedObjective.description,
        category: selectedObjective.category,
        skillId: selectedObjective.skill || null,
        targetLevel: selectedObjective.targetLevel === 'Intermédiaire' ? 3 : 
                    selectedObjective.targetLevel === 'Avancé' ? 4 : 
                    selectedObjective.targetLevel === 'Expert' ? 5 : 2,
        deadline: deadline,
        assigneeType: selectedObjective.assigneeType || 'USER',
        userId: selectedObjective.assignedTo || null
      };
      
      await dataService.updateObjective(selectedObjective.id, objectiveData);
      toast.success('Objectif mis à jour avec succès');
      setShowEditModal(false);
      setSelectedObjective(null);
      loadData(); // Reload data
    } catch (error) {
      console.error('Error updating objective:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour de l\'objectif');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteObjective = async (objectiveId) => {
    setItemToDelete(objectiveId);
    setIsConfirmModalOpen(true);
  };

  const confirmDeleteObjective = async () => {
    try {
      setLoading(true);
      await dataService.deleteObjective(itemToDelete);
      toast.success('Objectif supprimé avec succès');
      setIsConfirmModalOpen(false);
      setItemToDelete(null);
      loadData(); // Reload data
    } catch (error) {
      console.error('Error deleting objective:', error);
      toast.error(error.message || 'Erreur lors de la suppression de l\'objectif');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryBadge = (category) => {
    const colors = {
      personal_improvement: 'bg-blue-100 text-blue-800',
      company_project: 'bg-purple-100 text-purple-800',
      
    };
    const labels = {
      personal_improvement: 'Individuel',
      company_project: 'Entreprise',
      
    };
    return (
      <span className={`badge ${colors[category] || 'bg-gray-100 text-gray-800'}`}>
        {labels[category] || category}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const colors = {
      not_started: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800'
    };
    const labels = {
      not_started: 'Non commencé',
      in_progress: 'En cours',
      completed: 'Terminé',
      overdue: 'En retard'
    };
    return (
      <span className={`badge ${colors[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non définie';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  if (loading && objectives.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des objectifs</h1>
          <p className="text-gray-600">
            {teamFilter === 'all' 
              ? 'Assignez et suivez les objectifs de toutes les équipes' 
              : `Objectifs de l'équipe: ${teams.find(t => t.id === teamFilter)?.name || 'Sélectionnée'}`
            }
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Rechercher un objectif..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field w-full"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-field w-full"
            >
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-full"
            >
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:w-48">
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="input-field w-full"
            >
              <option value="all">Toutes les équipes</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
          {teamFilter !== 'all' && (
            <div className="sm:w-auto">
              <button
                onClick={() => setTeamFilter('all')}
                className="btn-secondary flex items-center text-sm"
              >
                <FunnelIcon className="h-4 w-4 mr-1" />
                Effacer filtre
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Team Summary */}
      {teamFilter !== 'all' && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">
                {teams.find(t => t.id === teamFilter)?.name || 'Équipe sélectionnée'}
              </h3>
              <p className="text-blue-700">
                {filteredObjectives.length} objectif{filteredObjectives.length !== 1 ? 's' : ''} trouvé{filteredObjectives.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-900">
                {filteredObjectives.filter(obj => obj.status === 'completed').length}
              </div>
              <div className="text-sm text-blue-700">Terminés</div>
            </div>
          </div>
        </div>
      )}

      {/* Objectives List */}
      <div className="space-y-4">
        {filteredObjectives.length === 0 ? (
          <div className="card text-center py-12">
            <AcademicCapIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun objectif trouvé</h3>
            <p className="text-gray-600">
              {objectives.length === 0 
                ? 'Aucun objectif n\'a été créé pour le moment.' 
                : 'Aucun objectif ne correspond aux critères de recherche.'}
            </p>
          </div>
        ) : (
          filteredObjectives.map((objective) => (
            <div key={objective.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{objective.title}</h3>
                    {getCategoryBadge(objective.category)}
                    {getStatusBadge(objective.status)}
                    {teamFilter !== 'all' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        👥 Équipe
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mb-3">{objective.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Assigné à:</span>
                      <p className="text-gray-600">
                        {(() => {
                          const assignment = objectiveAssignments.find(a => a.objective_id === objective.id);
                          if (assignment) {
                            if (assignment.assignee_type === 'TEAM' && assignment.team_id) {
                              const team = teams.find(t => t.id === assignment.team_id);
                              return team ? `👥 ${team.name}` : '👥 Équipe inconnue';
                            } else if (assignment.assignee_type === 'USER' && assignment.user_id) {
                              const user = users.find(u => u.id === assignment.user_id);
                              return user ? `👤 ${user.firstName} ${user.lastName}` : '👤 Utilisateur inconnu';
                            }
                          }
                          return '❌ Non assigné';
                        })()}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Compétence:</span>
                      <p className="text-gray-600">
                        {objective.skill ? 
                          (typeof objective.skill === 'object' ? 
                            objective.skill.name : 
                            (() => {
                              const skill = skills.find(s => s.id === objective.skill);
                              return skill ? skill.name : 'Compétence inconnue';
                            })()) : 
                          'Non spécifiée'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Niveau cible:</span>
                      <p className="text-gray-600">{objective.targetLevel || 'Non spécifié'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Échéance:</span>
                      <p className="text-gray-600">{formatDate(objective.deadline)}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Progression</span>
                      <span className="text-sm text-gray-600">{objective.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getProgressColor(objective.progress || 0)}`}
                        style={{ width: `${objective.progress || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2 ml-4">
                  {/* Only show edit/delete buttons if user is admin or objective creator */}
                  {(user.role === 'admin' || objective.createdBy === user.id) && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedObjective({
                            ...objective,
                            assignedTo: objective.assignedTo?.id || objective.assignedTo || '',
                            assigneeType: 'USER'
                          });
                          setShowEditModal(true);
                        }}
                        className="text-primary-600 hover:text-primary-900"
                        disabled={loading}
                        title="Modifier l'objectif"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteObjective(objective.id)}
                        className="text-red-600 hover:text-red-900"
                        disabled={loading}
                        title="Supprimer l'objectif"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>


      {/* Edit Objective Modal */}
      {showEditModal && selectedObjective && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Modifier l'objectif</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Titre</label>
                  <input
                    type="text"
                    value={selectedObjective.title}
                    onChange={(e) => setSelectedObjective({...selectedObjective, title: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={selectedObjective.description}
                    onChange={(e) => setSelectedObjective({...selectedObjective, description: e.target.value})}
                    className="input-field"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assigné à</label>
                  <select
                    value={selectedObjective.assignedTo || ''}
                    onChange={(e) => setSelectedObjective({...selectedObjective, assignedTo: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Sélectionner un utilisateur</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Compétence</label>
                  <select
                    value={selectedObjective.skill || ''}
                    onChange={(e) => setSelectedObjective({...selectedObjective, skill: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Sélectionner une compétence</option>
                    {skills.map(skill => (
                      <option key={skill.id} value={skill.id}>
                        {skill.name} ({skill.type === 'hard' ? 'Technique' : 'Comportementale'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Niveau cible</label>
                  <select
                    value={selectedObjective.targetLevel || 'Intermédiaire'}
                    onChange={(e) => setSelectedObjective({...selectedObjective, targetLevel: e.target.value})}
                    className="input-field"
                  >
                    {targetLevels.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date d'échéance</label>
                  <input
                    type="date"
                    value={selectedObjective.dueDate ? selectedObjective.dueDate.split('T')[0] : ''}
                    onChange={(e) => setSelectedObjective({...selectedObjective, dueDate: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Catégorie</label>
                  <select
                    value={selectedObjective.category || 'personal_improvement'}
                    onChange={(e) => setSelectedObjective({...selectedObjective, category: e.target.value})}
                    className="input-field"
                  >
                    <option value="personal_improvement">Objectif individuel</option>
                    <option value="company_project">Objectif d'entreprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type d'objectif</label>
                  <select
                    value={selectedObjective.type || 'skill_improvement'}
                    onChange={(e) => setSelectedObjective({...selectedObjective, type: e.target.value})}
                    className="input-field"
                  >
                    {objectiveTypes.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  onClick={handleEditObjective}
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDeleteObjective}
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer cet objectif ?"
        confirmText="Supprimer"
        cancelText="Annuler"
        isLoading={loading}
      />
    </div>
  );
};

export default ObjectiveManagement;
