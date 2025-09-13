import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import apiService from '../../services/api';
import toast from 'react-hot-toast';
import ConfirmationModal from '../common/ConfirmationModal';
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { getSkillLevelName, getSkillLevelOptions } from '../../utils/skillLevels';

const TargetManagement = () => {
  const { user } = useAuth();
  const [targets, setTargets] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [skills, setSkills] = useState([]);
  const [managedTeams, setManagedTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'progress', 'deadline'
  const [activeTab, setActiveTab] = useState('individual'); // 'individual' or 'team'
  const [individualFilter, setIndividualFilter] = useState('all'); // 'all', 'automatic', 'specific'
  const [newTarget, setNewTarget] = useState({
    employee: '',
    team: '',
    title: '',
    description: '',
    skill: '',
    targetLevel: 1,
    deadline: '',
    category: 'personal_improvement',
    assignType: 'employee', // Will be set based on active tab
    files: [] // Add files array for attachments
  });
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showProgressHistoryModal, setShowProgressHistoryModal] = useState(false);
  const [selectedObjectiveForHistory, setSelectedObjectiveForHistory] = useState(null);
  const [progressHistory, setProgressHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadTargetData();
  }, []);

  const loadTargetData = async () => {
    try {
      setLoading(true);
      
      // COMPREHENSIVE APPROACH: Get ALL objectives and filter by current team management
      console.log('🔍 COMPREHENSIVE TARGET LOADING - Current user ID:', user.id);
      
      // CRITICAL FIX: Use CURRENT manager objectives endpoint (not creator-based)
      console.log('🔍 CRITICAL FIX: Using CURRENT manager objectives endpoint');
      
      let allObjectivesData = [];
      
      // PRIORITY: Use the CURRENT manager objectives endpoint (not creator-based)
      try {
        console.log('🔍 Using CURRENT manager objectives endpoint (team management based)...');
        const currentManagerData = await dataService.getCurrentManagerObjectives();
        console.log('🔍 getCurrentManagerObjectives result:', currentManagerData);
        
        if (currentManagerData && currentManagerData.objectives) {
          allObjectivesData = currentManagerData.objectives;
        } else if (Array.isArray(currentManagerData)) {
          allObjectivesData = currentManagerData;
        } else {
          allObjectivesData = [];
        }
        
        console.log('🔍 Successfully loaded objectives via current manager endpoint:', allObjectivesData.length);
      } catch (error) {
        console.log('❌ getCurrentManagerObjectives failed:', error);
        
        // FALLBACK: Try direct API call to current-manager-view endpoint
        try {
          console.log('🔍 Trying direct API call to current-manager-view...');
          const response = await fetch('/api/objectives/current-manager-view', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          });
          if (response.ok) {
            const apiData = await response.json();
            allObjectivesData = apiData.objectives || apiData.data || apiData || [];
            console.log('🔍 Direct API call to current-manager-view result:', allObjectivesData.length);
          } else {
            console.log('❌ Direct API call failed with status:', response.status);
            allObjectivesData = [];
          }
        } catch (apiError) {
          console.log('❌ Direct API call failed:', apiError);
          allObjectivesData = [];
        }
      }
      
      // NO FALLBACK TO OLD ENDPOINTS - Only use current-manager-view
      // This ensures old managers cannot see objectives for teams they no longer manage
      
      // Ensure we have an array
      if (!Array.isArray(allObjectivesData)) {
        if (allObjectivesData && allObjectivesData.objectives) {
          allObjectivesData = allObjectivesData.objectives;
        } else if (allObjectivesData && allObjectivesData.data) {
          allObjectivesData = allObjectivesData.data;
        } else {
          allObjectivesData = [];
        }
      }
      
      console.log('🔍 Final allObjectivesData:', allObjectivesData);
      console.log('🔍 All objectives loaded:', allObjectivesData.length);
      
      // Get teams this manager currently manages
      const teamsDataResponse = await dataService.getManagerTeams();
      console.log('🔍 Raw teamsDataResponse:', teamsDataResponse);
      
      let managedTeams = [];
      if (teamsDataResponse && teamsDataResponse.managedTeams) {
        managedTeams = teamsDataResponse.managedTeams;
      } else if (teamsDataResponse && teamsDataResponse.value && teamsDataResponse.value.managedTeams) {
        managedTeams = teamsDataResponse.value.managedTeams;
      } else if (Array.isArray(teamsDataResponse)) {
        managedTeams = teamsDataResponse;
      }
      
      console.log('🔍 Processed managed teams:', managedTeams);
      console.log('🔍 Managed teams details:', managedTeams.map(t => ({ id: t.id, name: t.name, managerId: t.managerId })));
      
      // Get all users and teams for reference
      const [usersData, teamsData, skillsData] = await Promise.all([
        dataService.getUsers({ pageSize: 1000, include_inactive: true }),
        dataService.getTeams(),
        dataService.getSkills()
      ]);
      
      // COMPREHENSIVE FILTERING: Show objectives from teams you currently manage
      console.log('🔍 Starting comprehensive filtering...');
      console.log('🔍 Available objectives to filter:', allObjectivesData.length);
      console.log('🔍 Managed teams available:', managedTeams.length);
      
      // Debug: Log first few objectives to understand structure
      if (allObjectivesData.length > 0) {
        console.log('🔍 Sample objective structure:', allObjectivesData[0]);
        console.log('🔍 All objective fields:', Object.keys(allObjectivesData[0]));
      }
      
      const comprehensiveObjectives = allObjectivesData.filter(obj => {
        console.log(`🔍 Checking objective: "${obj.title}" (ID: ${obj.id})`);
        console.log('🔍 Objective details:', {
          title: obj.title,
          id: obj.id,
          assignee_type: obj.assignee_type,
          team_id: obj.team_id,
          user_id: obj.user_id,
          created_by: obj.created_by,
          team: obj.team,
          assignee: obj.assignee,
          allFields: Object.keys(obj)
        });
        
        // REMOVED: Method 1 - Don't show objectives based on creator anymore
        // Only show objectives for teams currently managed by this user
        
        // Method 2: Direct team assignment via team_id
        if (obj.team_id && managedTeams.some(team => team.id === obj.team_id)) {
          console.log('✅ Method 2 - Direct team_id match:', obj.title, 'for team:', obj.team_id);
          return true;
        }
        
        // Method 3: Team assignment via assignee field
        if (obj.assignee && obj.assignee.type === 'TEAM' && managedTeams.some(team => team.id === obj.assignee.id)) {
          console.log('✅ Method 3 - Assignee team match:', obj.title, 'for team:', obj.assignee.id);
          return true;
        }
        
        // Method 4: Team assignment via team field
        if (obj.team && managedTeams.some(team => team.id === obj.team.id)) {
          console.log('✅ Method 4 - Team field match:', obj.title, 'for team:', obj.team.id);
          return true;
        }
        
        // Method 5: Check if objective title contains team name (fallback)
        const teamNameMatch = managedTeams.find(team => 
          obj.title.toLowerCase().includes(team.name.toLowerCase()) ||
          team.name.toLowerCase().includes(obj.title.toLowerCase())
        );
        if (teamNameMatch) {
          console.log('✅ Method 5 - Team name match in title:', obj.title, 'for team:', teamNameMatch.name);
          return true;
        }
        
        // Method 6: Check if objective is in team's objectives array
        const teamWithObjective = managedTeams.find(team => 
          team.objectives && team.objectives.some(teamObj => teamObj.id === obj.id)
        );
        if (teamWithObjective) {
          console.log('✅ Method 6 - Objective found in team objectives:', obj.title, 'for team:', teamWithObjective.name);
          return true;
        }
        
        // Method 7: Check if objective is for individual team members
        if (obj.user_id && managedTeams.some(team => 
          team.members?.some(member => member.id === obj.user_id)
        )) {
          console.log('✅ Method 7 - Objective for employee in managed team:', obj.title, 'User:', obj.user_id);
          return true;
        }
        
        // Method 8: Check if objective is for individual team members via assignee
        if (obj.assignee && obj.assignee.type === 'USER' && managedTeams.some(team => 
          team.members?.some(member => member.id === obj.assignee.id)
        )) {
          console.log('✅ Method 8 - Objective for employee in managed team via assignee:', obj.title, 'User:', obj.assignee.id);
          return true;
        }
        
        // Method 9: Check if objective has any team-related field that matches managed teams
        const hasTeamMatch = managedTeams.some(team => {
          // Check various possible team fields
          const possibleTeamFields = [
            obj.team_id,
            obj.team?.id,
            obj.assignee?.id,
            obj.assignedTo,
            obj.teamName,
            obj.team_name
          ];
          return possibleTeamFields.some(field => field === team.id || field === team.name);
        });
        
        if (hasTeamMatch) {
          console.log('✅ Method 9 - Team match found via various fields:', obj.title);
          return true;
        }
        
        // Method 10: PRIORITY FALLBACK - If backend returned it from current-manager-view, it's valid
        // This ensures objectives from the current-manager-view endpoint are always shown
        if (obj.access_type === 'CURRENT_MANAGER') {
          console.log('✅ Method 10 - Backend confirmed this objective is for current manager:', obj.title);
          return true;
        }
        
        // STRICT FILTERING: If none of the above methods match, reject the objective
        // This prevents old managers from seeing objectives for teams they no longer manage
        console.log('❌ Objective not included (no current management relationship):', obj.title);
        return false;
      });
      
      console.log('🔍 COMPREHENSIVE filtering results:');
      console.log('  - Total objectives found:', comprehensiveObjectives.length);
      console.log('  - This will automatically update when team management changes!');
      
      setTargets(comprehensiveObjectives);
      setManagedTeams(managedTeams);
      setUsers(usersData);
      setTeams(teamsData);
      setSkills(skillsData.map(skill => skill.name));
      
      console.log('Loaded comprehensive target data:', { 
        targets: comprehensiveObjectives.length, 
        users: usersData.length, 
        teams: teamsData.length,
        skills: skillsData.length 
      });
      
      // Log some sample data for debugging
      if (comprehensiveObjectives.length > 0) {
        console.log('Sample comprehensive objective data:', {
          title: comprehensiveObjectives[0].title,
          assigneeType: comprehensiveObjectives[0].assigneeType,
          assignee_type: comprehensiveObjectives[0].assignee_type,
          teamId: comprehensiveObjectives[0].teamId,
          team_id: comprehensiveObjectives[0].team_id,
          userId: comprehensiveObjectives[0].userId,
          user_id: comprehensiveObjectives[0].user_id,
          assigned_team_name: comprehensiveObjectives[0].assigned_team_name,
          assigned_user_first_name: comprehensiveObjectives[0].assigned_user_first_name,
          assigned_user_last_name: comprehensiveObjectives[0].assigned_user_last_name,
          allFields: Object.keys(comprehensiveObjectives[0])
        });
      }
    } catch (error) {
      console.error('Error loading comprehensive target data:', error);
      toast.error('Erreur lors du chargement des données des objectifs');
    } finally {
      setLoading(false);
    }
  };

  const skillLevelOptions = getSkillLevelOptions();

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
        return 'text-green-600 bg-green-100';
      case 'overdue':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // IMPROVED: Calculate status based on progress instead of using static status
  const getCalculatedStatus = (target) => {
    const progress = parseFloat(target.progress) || 0;
    
    console.log('🔍 getCalculatedStatus called for:', {
      title: target.title,
      progress: target.progress,
      parsedProgress: progress,
      calculatedStatus: progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started'
    });
    
    if (progress >= 100) {
      return 'completed';
    } else if (progress > 0) {
      return 'in_progress';
    } else {
      return 'not_started';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Terminé';
      case 'in_progress':
        return 'En cours';
      case 'overdue':
        return 'En retard';
      default:
        return 'Non commencé';
    }
  };

  const handleCreateTarget = async () => {
    try {
      setLoading(true);
      
             // Determine if this is a team or individual objective based on active tab
       const isTeamObjective = activeTab === 'team';
      
      const objectiveData = {
        title: isTeamObjective ? `[ÉQUIPE] ${newTarget.title}` : newTarget.title,
        description: newTarget.description,
        assigned_to: newTarget.employee || newTarget.team,
         assignee_type: isTeamObjective ? 'TEAM' : 'USER',
         skill: isTeamObjective ? null : newTarget.skill, // No skill for team objectives
         target_level: isTeamObjective ? null : getSkillLevelName(newTarget.targetLevel), // No level for team objectives
        due_date: newTarget.deadline,
         category: isTeamObjective ? 'company' : 'personal', // Team objectives are company projects
         type: isTeamObjective ? 'project' : 'skill_improvement' // Team objectives are projects
      };
      
      // Create the main objective
      const createdObjective = await dataService.createObjective(objectiveData);
      
      // If manager selected files, attach them to the created objective
      if (createdObjective && createdObjective.id && newTarget.files && newTarget.files.length > 0) {
        try {
          // Upload each selected file to get a file record first
          const uploaded = [];
          for (const file of newTarget.files) {
            const res = await apiService.uploadFile(file);
            uploaded.push({
              name: res.originalName || file.name,
              path: res.storageKey || res.url || res.profileUrl || file.name,
              size: res.sizeBytes || file.size,
              type: res.mimeType || file.type
            });
          }

          await dataService.attachObjectiveFiles(createdObjective.id, uploaded);
          console.log('✅ Uploaded and attached manager files to individual objective:', uploaded.length);
        } catch (attachErr) {
          console.error('❌ Failed to attach files to individual objective:', attachErr);
        }
      }
      
      // If this is a team objective, create individual contributions for each team member
      if (isTeamObjective && createdObjective.id) {
        const selectedTeam = teams.find(t => t.id === newTarget.team);
        if (selectedTeam && selectedTeam.members) {
          const teamMemberIds = selectedTeam.members.map(member => member.id || member);
          
          // Create individual contributions for each team member
          for (const memberId of teamMemberIds) {
            const contributionData = {
              parent_objective_id: createdObjective.id,
              assignee_user_id: memberId,
              task_description: `Contribution individuelle à l'objectif d'équipe: ${newTarget.title}`,
              status: 'not_started',
              progress: 0,
              deadline: newTarget.deadline
            };
            
            try {
              await dataService.createObjectiveContribution(contributionData);
            } catch (contributionError) {
              console.error(`Error creating contribution for member ${memberId}:`, contributionError);
            }
          }
          
          console.log(`Created ${teamMemberIds.length} individual contributions for team objective`);
        }
      }
      
      toast.success('Objectif créé avec succès');
      setShowCreateModal(false);
      setNewTarget({
        employee: '',
        team: '',
        title: '',
        description: '',
        skill: '',
        targetLevel: 1,
        deadline: '',
        category: 'personal_improvement',
        assignType: 'employee',
        files: []
      });
      loadTargetData(); // Reload data
    } catch (error) {
      console.error('Error creating target:', error);
      toast.error(error.message || 'Erreur lors de la création de l\'objectif');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTarget = async () => {
    try {
      setLoading(true);
      const objectiveData = {
        title: selectedTarget.title,
        description: selectedTarget.description,
        assigned_to: selectedTarget.assignedTo,
        skill: selectedTarget.skill,
        target_level: selectedTarget.targetLevel,
        due_date: selectedTarget.dueDate,
        category: selectedTarget.category === 'personal_improvement' ? 'personal' : 'company',
        type: selectedTarget.category === 'personal_improvement' ? 'skill_improvement' : 'project'
      };
      
      await dataService.updateObjective(selectedTarget.id, objectiveData);
      toast.success('Objectif modifié avec succès');
      setShowEditModal(false);
      setSelectedTarget(null);
      loadTargetData(); // Reload data
    } catch (error) {
      console.error('Error updating target:', error);
      toast.error(error.message || 'Erreur lors de la modification de l\'objectif');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTarget = async (targetId) => {
    setItemToDelete(targetId);
    setIsConfirmModalOpen(true);
  };

  const confirmDeleteTarget = async () => {
    try {
      setLoading(true);
      
      // Find the target to determine its type
      const target = targets.find(t => t.id === itemToDelete);
      if (!target) {
        throw new Error('Objectif non trouvé');
      }

      // Use the appropriate delete method based on objective type
      if (target.assigneeType === 'USER' || target.assignee_type === 'USER') {
        // Individual objective - use the individual target endpoint
        await dataService.deleteIndividualTarget(itemToDelete);
      } else {
        // Team objective - use the regular objective endpoint
        await dataService.deleteObjective(itemToDelete);
      }
      
      toast.success('Objectif supprimé avec succès');
      setIsConfirmModalOpen(false);
      setItemToDelete(null);
      loadTargetData(); // Reload data
    } catch (error) {
      console.error('Error deleting target:', error);
      toast.error(error.message || 'Erreur lors de la suppression de l\'objectif');
    } finally {
      setLoading(false);
    }
  };



  const handleViewProgressHistory = async (objective) => {
    try {
      setSelectedObjectiveForHistory(objective);
      setShowProgressHistoryModal(true);
      setLoadingHistory(true);
      
      const data = await dataService.getObjectiveUpdates(objective.id);
      setProgressHistory(data.updates || []);
    } catch (error) {
      console.error('Error loading progress history:', error);
      toast.error(error.message || 'Erreur lors du chargement de l\'historique');
      setShowProgressHistoryModal(false);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDownloadProof = async (fileId, fileName) => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Fichier téléchargé avec succès');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Erreur lors du téléchargement du fichier');
    }
  };

  // Helper functions (defined before use)
  const formatDate = (dateString) => {
    if (!dateString) return 'Non définie';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getUserName = (assignedTo) => {
    if (!assignedTo) return 'Utilisateur inconnu';
    
    // If assignedTo is already an object with name information
    if (typeof assignedTo === 'object') {
      if (assignedTo.firstName && assignedTo.lastName) {
        return `${assignedTo.firstName} ${assignedTo.lastName}`;
      }
      if (assignedTo.first_name && assignedTo.last_name) {
        return `${assignedTo.first_name} ${assignedTo.last_name}`;
      }
      if (assignedTo.name) {
        return assignedTo.name;
      }
    }
    
    // If assignedTo is a user ID, find the user in the users array
    const userId = typeof assignedTo === 'string' ? assignedTo : assignedTo?.id;
    if (userId) {
    const user = users.find(u => u.id === userId);
      if (user) {
        return `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim() || 'Utilisateur inconnu';
      }
    }
    
    return 'Utilisateur inconnu';
  };

  const getTeamName = (assignedTo) => {
    if (!assignedTo) return 'Équipe inconnue';
    
    // If assignedTo is already an object with name information
    if (typeof assignedTo === 'object') {
      if (assignedTo.name) {
        return assignedTo.name;
      }
      if (assignedTo.id) {
        // If it's an object with just an ID, find the team
        const team = teams.find(t => t.id === assignedTo.id);
    return team ? team.name : 'Équipe inconnue';
      }
    }
    
    // If assignedTo is a team ID string, find the team
    if (typeof assignedTo === 'string') {
      const team = teams.find(t => t.id === assignedTo);
      return team ? team.name : 'Équipe inconnue';
    }
    
    return 'Équipe inconnue';
  };

  // Filter targets based on search term, category, and status
  const filteredTargets = targets.filter(target => {
    const matchesSearch = searchTerm === '' || 
      target.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      target.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === '' || target.category === categoryFilter;
    const matchesStatus = statusFilter === '' || target.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Separate individual and team objectives
  // Individual objectives include both direct assignments and team contributions
  // FIX: Use correct field names from backend (assignee_type instead of assigneeType)
  const individualTargets = filteredTargets.filter(target => 
    target.assignee_type === 'USER' || target.is_team_contribution
  );
  
  const teamTargets = filteredTargets.filter(target => 
    target.assignee_type === 'TEAM' && !target.is_team_contribution
  );

  // Apply individual filter for individual objectives
  const filteredIndividualTargets = individualTargets.filter(target => {
    if (individualFilter === 'all') return true;
    
    // Use the backend-provided is_team_contribution flag for filtering
    if (individualFilter === 'automatic') return target.is_team_contribution;
    if (individualFilter === 'specific') return !target.is_team_contribution;
    return true;
  });

  // Sort function
  const sortTargets = (targets) => {
    return targets.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          const aName = a.assignee_type === 'USER' ? 
            (a.assigned_user_first_name && a.assigned_user_last_name ? 
              `${a.assigned_user_first_name} ${a.assigned_user_last_name}` : 
              'Employé non spécifié'
            ) : 
            (a.assigned_team_name || 'Équipe non spécifiée');
          const bName = b.assignee_type === 'USER' ? 
            (b.assigned_user_first_name && b.assigned_user_last_name ? 
              `${b.assigned_user_first_name} ${b.assigned_user_last_name}` : 
              'Employé non spécifié'
            ) : 
            (b.assigned_team_name || 'Équipe non spécifiée');
          return aName.localeCompare(bName);
        case 'progress':
          return (b.progress || 0) - (a.progress || 0);
        case 'deadline':
          return new Date(a.deadline || '9999-12-31') - new Date(b.deadline || '9999-12-31');
        default:
          return 0;
      }
    });
  };

  const sortedIndividualTargets = sortTargets(filteredIndividualTargets);
  const sortedTeamTargets = sortTargets(teamTargets);

  // Debug logging for troubleshooting
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Frontend Debug - Target Filtering:');
    console.log('📊 Total targets:', targets.length);
    console.log('📊 Team targets:', teamTargets.length);
    
    if (teamTargets.length > 0) {
      console.log('📋 Team targets details:');
      teamTargets.forEach((target, index) => {
        console.log(`   ${index + 1}. ${target.title} - AssigneeType: ${target.assignee_type} - IsTeamContribution: ${target.is_team_contribution} - AssignedTo:`, target.assignedTo);
      });
    }
  }

  if (loading && targets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des objectifs</h1>
          <p className="text-gray-600">Assignez et suivez les objectifs de votre équipe</p>
        </div>
        <div className="text-sm text-gray-500 italic">
          Pour créer des objectifs, utilisez la gestion d'équipe
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('individual')}
            className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'individual'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Objectifs individuels ({sortedIndividualTargets.length})
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'team'
                ? 'border-green-500 text-green-600 bg-green-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Objectifs d'équipe ({sortedTeamTargets.length})
          </button>
        </div>
      </div>

      {/* Enhanced Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rechercher</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Titre ou description..."
              className="input-field w-full"
            />
          </div>
          
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field w-full"
          >
            <option value="">Toutes les catégories</option>
              <option value="personal_improvement">Amélioration personnelle</option>
              <option value="company_project">Projet d'entreprise</option>
              
          </select>
        </div>
          
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-full"
            >
              <option value="">Tous les statuts</option>
              <option value="not_started">Non commencé</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminé</option>
              <option value="overdue">En retard</option>
            </select>
      </div>

          {/* Individual Filter (only show for individual tab) */}
          {activeTab === 'individual' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type d'assignation</label>
              <select
                value={individualFilter}
                onChange={(e) => setIndividualFilter(e.target.value)}
                className="input-field w-full"
              >
                <option value="all">Tous les types</option>
                <option value="specific">Assignation spécifique</option>
                <option value="automatic">Assignation automatique (équipe)</option>
              </select>
            </div>
          )}
          
          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trier par</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field w-full"
            >
              <option value="name">Nom (A-Z)</option>
              <option value="progress">Progression (décroissant)</option>
              <option value="deadline">Échéance (croissant)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Single Column Layout based on Active Tab */}
      <div className="card">
        {activeTab === 'individual' ? (
          /* Individual Objectives Tab */
          <div>
        <div className="flex items-center justify-between mb-4">
          <div>
                <h2 className="text-xl font-semibold text-gray-900">Objectifs individuels</h2>
                <p className="text-gray-600">Objectifs assignés aux employés individuels</p>
          </div>
              <span className="badge badge-primary">{sortedIndividualTargets.length} objectifs</span>
        </div>
        
        <div className="space-y-4">
              {sortedIndividualTargets.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun objectif individuel</p>
              ) : (
                sortedIndividualTargets.map((target) => (
                  <div key={target.id} className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {target.isTeamContribution ? 
                        `${target.title} (${target.assignedTo?.firstName} ${target.assignedTo?.lastName})` : 
                        target.title
                      }
                    </h3>
                    <p className="text-sm text-gray-600 mb-1">
                      {target.isTeamContribution ? target.contributionDescription : target.description}
                    </p>
                        <p className="text-sm text-gray-500 font-medium">
                          👤 {target.assignee_type === 'TEAM' ? 
                            'Équipe entière' : 
                            target.assignee_type === 'USER' ? 
                              (target.assigned_user_first_name && target.assigned_user_last_name ? 
                                `${target.assigned_user_first_name} ${target.assigned_user_last_name}` : 
                                'Employé non spécifié'
                              ) : 
                              'Employé non spécifié'
                          }
                        </p>
                        {/* Show team name for ALL team objectives */}
                        {target.assignee_type === 'TEAM' && target.assigned_team_name && (
                          <p className="text-xs text-blue-600 mt-1">
                            🏢 Équipe: {target.assigned_team_name}
                          </p>
                        )}
                        {/* Show assignment type indicator */}
                        {target.isTeamContribution && (
                          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-1">
                            Assignation automatique (équipe)
                          </span>
                        )}
                        {!target.isTeamContribution && target.assigneeType === 'USER' && (
                          <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mt-1">
                            Assignation spécifique
                          </span>
                        )}
                  </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <span className={`badge ${getStatusColor(getCalculatedStatus(target))} text-xs`}>
                      {getStatusLabel(getCalculatedStatus(target))}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-gray-600">
                        <span>
                          {target.assignee_type === 'TEAM' 
                            ? '' 
                            : `📚 ${target.skill?.name || target.skill_name || target.skill || 'Compétence non spécifiée'}`}
                        </span>
                        <span>
                          {target.assignee_type === 'TEAM' 
                            ? '' 
                            : `🎯 Niveau ${target.targetLevel || 'Non spécifié'}`}
                        </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-500">
                          <span>📊 Progression</span>
                      <span>{target.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              (target.progress || 0) >= 80 ? 'bg-green-600' : 
                              (target.progress || 0) >= 50 ? 'bg-blue-600' : 'bg-yellow-500'
                            }`}
                        style={{ width: `${target.progress || 0}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">📅 Échéance: {formatDate(target.deadline)}</span>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleViewProgressHistory(target)}
                            className="btn-secondary text-xs px-2 py-1"
                        disabled={loading}
                            title="Voir l'historique"
                      >
                            📈
                      </button>
                          {/* Show edit/delete buttons if user is admin, objective creator, or manager of the team */}
                          {(user.role === 'admin' || target.createdBy === user.id || 
                            (user.role === 'manager' && (
                              // Check if this is a team objective for a team the manager manages
                              (target.assigneeType === 'TEAM' && target.teamId && managedTeams.some(team => team.id === target.teamId)) ||
                              // Check if this is an individual objective for a team member the manager manages
                              (target.assigneeType === 'USER' && target.userId && managedTeams.some(team => 
                                team.members?.some(member => member.id === target.userId)
                              )) ||
                              // Check if this is a team objective via team field
                              (target.team && managedTeams.some(team => team.id === target.team.id)) ||
                              // Check if this is an individual objective via assignee
                              (target.assignee && target.assignee.type === 'USER' && managedTeams.some(team => 
                                team.members?.some(member => member.id === target.assignee.id)
                              )) ||
                              // Check if this is a team objective via assignee
                              (target.assignee && target.assignee.type === 'TEAM' && managedTeams.some(team => team.id === target.assignee.id))
                            ))) && (
                            <>
                      <button 
                        onClick={() => {
                          setSelectedTarget(target);
                          setShowEditModal(true);
                        }}
                                className="btn-secondary text-xs px-2 py-1"
                        disabled={loading}
                                title="Modifier l'objectif"
                              >
                                ✏️
                      </button>
                      <button 
                        onClick={() => handleDeleteTarget(target.id)}
                                className="text-red-600 hover:text-red-900 text-xs px-2 py-1"
                        disabled={loading}
                                title="Supprimer l'objectif"
                      >
                                🗑️
                      </button>
                            </>
                          )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
        ) : (
          /* Team Objectives Tab */
          <div>
        <div className="flex items-center justify-between mb-4">
          <div>
                <h2 className="text-xl font-semibold text-gray-900">Objectifs d'équipe</h2>
                <p className="text-gray-600">Objectifs assignés aux équipes entières</p>
          </div>
              <span className="badge badge-success">{sortedTeamTargets.length} objectifs</span>
        </div>
        
        <div className="space-y-4">
              {sortedTeamTargets.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun objectif d'équipe</p>
          ) : (
                sortedTeamTargets.map((target) => (
              <div key={target.id} className="border border-gray-200 rounded-lg p-4 bg-green-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{target.title}</h3>
                        <p className="text-sm text-gray-600 mb-1">{target.description}</p>
                        <p className="text-sm text-gray-500 font-medium">
                          👥 {target.assignee_type === 'TEAM' ? (target.assigned_team_name || 'Équipe non spécifiée') : 'Équipe non spécifiée'}
                    </p>
                  </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <span className={`badge ${getStatusColor(getCalculatedStatus(target))} text-xs`}>
                      {getStatusLabel(getCalculatedStatus(target))}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-gray-600">
                        <span>
                          {target.assignee_type === 'TEAM' 
                            ? '' 
                            : `📚 ${target.skill?.name || target.skill_name || target.skill || 'Compétence non spécifiée'}`}
                        </span>
                        <span>
                          {target.assignee_type === 'TEAM' 
                            ? '' 
                            : `🎯 Niveau ${target.targetLevel || 'Non spécifié'}`}
                        </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-500">
                          <span>📊 Progression</span>
                      <span>{target.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              (target.progress || 0) >= 80 ? 'bg-green-600' : 
                              (target.progress || 0) >= 50 ? 'bg-blue-600' : 'bg-yellow-500'
                            }`}
                        style={{ width: `${target.progress || 0}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">📅 Échéance: {formatDate(target.deadline)}</span>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleViewProgressHistory(target)}
                            className="btn-secondary text-xs px-2 py-1"
                        disabled={loading}
                            title="Voir l'historique"
                      >
                            📈
                      </button>
                          {/* Show edit/delete buttons if user is admin, objective creator, or manager of the team */}
                          {(user.role === 'admin' || target.createdBy === user.id || 
                            (user.role === 'manager' && (
                              // Check if this is a team objective for a team the manager manages
                              (target.assigneeType === 'TEAM' && target.teamId && managedTeams.some(team => team.id === target.teamId)) ||
                              // Check if this is an individual objective for a team member the manager manages
                              (target.assigneeType === 'USER' && target.userId && managedTeams.some(team => 
                                team.members?.some(member => member.id === target.userId)
                              )) ||
                              // Check if this is a team objective via team field
                              (target.team && managedTeams.some(team => team.id === target.team.id)) ||
                              // Check if this is an individual objective via assignee
                              (target.assignee && target.assignee.type === 'USER' && managedTeams.some(team => 
                                team.members?.some(member => member.id === target.assignee.id)
                              )) ||
                              // Check if this is a team objective via assignee
                              (target.assignee && target.assignee.type === 'TEAM' && managedTeams.some(team => team.id === target.assignee.id))
                            ))) && (
                            <>
                      <button 
                        onClick={() => {
                          setSelectedTarget(target);
                          setShowEditModal(true);
                        }}
                                className="btn-secondary text-xs px-2 py-1"
                        disabled={loading}
                                title="Modifier l'objectif"
                              >
                                ✏️
                      </button>
                      <button 
                        onClick={() => handleDeleteTarget(target.id)}
                                className="text-red-600 hover:text-red-900 text-xs px-2 py-1"
                        disabled={loading}
                                title="Supprimer l'objectif"
                      >
                                🗑️
                      </button>
                            </>
                          )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
          </div>
        )}
      </div>

      {/* Create Target Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Créer un objectif</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    // Reset form when closing
                    setNewTarget({
                      employee: '',
                      team: '',
                      title: '',
                      description: '',
                      skill: '',
                      targetLevel: 1,
                      deadline: '',
                      category: 'personal_improvement',
                      assignType: activeTab === 'team' ? 'team' : 'employee',
                      files: []
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                                     <label className="block text-sm font-medium text-gray-700 mb-3">Assigner à</label>
                   <div className="space-y-3">
                     {/* Show only the relevant option based on active tab */}
                     {activeTab === 'individual' && (
                       <>
                         <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg bg-blue-50">
                        <input
                          type="radio"
                          name="assignType"
                          value="employee"
                             checked={true}
                             readOnly
                             className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                           />
                           <div className="flex-1">
                             <label className="text-sm font-medium text-gray-900">
                        Employé individuel
                      </label>
                             <p className="text-xs text-gray-500">Assigner l'objectif à un employé spécifique</p>
                           </div>
                         </div>
                         
                         <div className="ml-6">
                        <select
                          value={newTarget.employee}
                          onChange={(e) => setNewTarget({...newTarget, employee: e.target.value})}
                             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        >
                          <option value="">Sélectionner un employé</option>
                             {users
                               .filter(userItem => userItem.id !== user?.id) // Filter out current user
                               .map(userItem => (
                                 <option key={userItem.id} value={userItem.id}>
                                   {userItem.firstName} {userItem.lastName}
                            </option>
                          ))}
                        </select>
                    </div>
                       </>
                     )}
                     
                     {activeTab === 'team' && (
                       <>
                         <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg bg-green-50">
                        <input
                          type="radio"
                          name="assignType"
                          value="team"
                             checked={true}
                             readOnly
                             className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                           />
                           <div className="flex-1">
                             <label className="text-sm font-medium text-gray-900">
                        Équipe entière
                      </label>
                             <p className="text-xs text-gray-500">Assigner l'objectif à toute l'équipe</p>
                           </div>
                         </div>
                         
                         <div className="ml-6">
                           {teams.length === 0 ? (
                             <div className="text-sm text-red-600 bg-red-50 p-2 rounded border">
                               Aucune équipe disponible. Veuillez contacter l'administrateur.
                             </div>
                           ) : (
                        <select
                          value={newTarget.team}
                          onChange={(e) => setNewTarget({...newTarget, team: e.target.value})}
                               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        >
                               <option value="">Sélectionner une équipe ({teams.length} équipes disponibles)</option>
                          {teams.map(team => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                       </>
                     )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Titre de l'objectif</label>
                  <input
                    type="text"
                    value={newTarget.title}
                    onChange={(e) => setNewTarget({...newTarget, title: e.target.value})}
                    className="input-field"
                    placeholder="Ex: Améliorer React"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newTarget.description}
                    onChange={(e) => setNewTarget({...newTarget, description: e.target.value})}
                    className="input-field"
                    rows="3"
                    placeholder="Description détaillée de l'objectif"
                  />
                </div>
                                 {/* Only show skill and level for individual objectives */}
                 {activeTab === 'individual' && (
                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Compétence</label>
                  <select
                    value={newTarget.skill}
                    onChange={(e) => setNewTarget({...newTarget, skill: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  >
                    <option value="">Sélectionner une compétence</option>
                    {skills.map(skill => (
                      <option key={skill} value={skill}>{skill}</option>
                    ))}
                  </select>
                </div>
                 )}
                 {/* Only show skill and level for individual objectives */}
                 {activeTab === 'individual' && (
                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Niveau cible</label>
                  <select
                    value={newTarget.targetLevel}
                    onChange={(e) => setNewTarget({...newTarget, targetLevel: parseInt(e.target.value)})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  >
                    {skillLevelOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                 )}
                
                {/* File attachments section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fichiers joints (optionnel)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        const filesArray = Array.from(e.target.files);
                        setNewTarget({...newTarget, files: filesArray});
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {newTarget.files && newTarget.files.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">{newTarget.files.length} fichier(s) sélectionné(s):</p>
                        <ul className="text-xs text-gray-500 mt-1">
                          {newTarget.files.map((file, index) => (
                            <li key={index} className="flex items-center justify-between py-1">
                              <span>{file.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedFiles = newTarget.files.filter((_, i) => i !== index);
                                  setNewTarget({...newTarget, files: updatedFiles});
                                }}
                                className="text-red-500 hover:text-red-700 ml-2"
                              >
                                ×
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date limite</label>
                  <input
                    type="date"
                    value={newTarget.deadline}
                    onChange={(e) => setNewTarget({...newTarget, deadline: e.target.value})}
                    className="input-field"
                  />
                </div>
                
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    // Reset form when closing
                    setNewTarget({
                      employee: '',
                      team: '',
                      title: '',
                      description: '',
                      skill: '',
                      targetLevel: 1,
                      deadline: '',
                      category: 'personal_improvement',
                      assignType: activeTab === 'team' ? 'team' : 'employee',
                      files: []
                    });
                  }}
                  className="btn-secondary"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateTarget}
                  className="btn-primary"
                                     disabled={
                     loading || 
                     !newTarget.title || 
                     !newTarget.deadline || 
                     (activeTab === 'individual' && (!newTarget.employee || !newTarget.skill)) ||
                     (activeTab === 'team' && !newTarget.team)
                   }
                >
                  {loading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Target Modal */}
      {showEditModal && selectedTarget && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Modifier l'objectif</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assigné à</label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <span className="font-medium">
                      {selectedTarget.assignedTo ? getUserName(selectedTarget.assignedTo) : 'Non assigné'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Titre de l'objectif</label>
                  <input
                    type="text"
                    value={selectedTarget.title}
                    onChange={(e) => setSelectedTarget({...selectedTarget, title: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={selectedTarget.description}
                    onChange={(e) => setSelectedTarget({...selectedTarget, description: e.target.value})}
                    className="input-field"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Compétence</label>
                  <select
                    value={selectedTarget.skill || ''}
                    onChange={(e) => setSelectedTarget({...selectedTarget, skill: e.target.value})}
                    className="input-field"
                  >
                    {skills.map(skill => (
                      <option key={skill} value={skill}>{skill}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Niveau cible</label>
                  <select
                    value={selectedTarget.targetLevel || 1}
                    onChange={(e) => setSelectedTarget({...selectedTarget, targetLevel: parseInt(e.target.value)})}
                    className="input-field"
                  >
                    {skillLevelOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date limite</label>
                  <input
                    type="date"
                    value={selectedTarget.dueDate ? selectedTarget.dueDate.split('T')[0] : ''}
                    onChange={(e) => setSelectedTarget({...selectedTarget, dueDate: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Catégorie d'objectif</label>
                  <select
                    value={selectedTarget.category === 'personal' ? 'personal_improvement' : 'company_project'}
                    onChange={(e) => setSelectedTarget({...selectedTarget, category: e.target.value === 'personal_improvement' ? 'personal' : 'company'})}
                    className="input-field"
                  >
                    <option value="personal_improvement">Amélioration personnelle</option>
                    <option value="company_project">Projet d'entreprise</option>
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
                  onClick={handleEditTarget}
                  className="btn-primary"
                  disabled={loading || !selectedTarget.title || !selectedTarget.skill || !selectedTarget.dueDate}
                >
                  {loading ? 'Modification...' : 'Modifier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress History Modal */}
      {showProgressHistoryModal && selectedObjectiveForHistory && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Historique des progrès - {selectedObjectiveForHistory.title}
                </h3>
                <button
                  onClick={() => {
                    setShowProgressHistoryModal(false);
                    setSelectedObjectiveForHistory(null);
                    setProgressHistory([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {loadingHistory ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : progressHistory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Aucun historique de progression disponible</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {progressHistory.map((update) => (
                    <div key={update.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            Progression mise à jour à {update.progress}%
                          </h4>
                          <p className="text-sm text-gray-600">
                            par {update.author.firstName} {update.author.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(update.createdAt).toLocaleString('fr-FR')}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-green-600">
                          {update.progress}%
                        </span>
                      </div>
                      
                      {update.notes && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                            {update.notes}
                          </p>
                        </div>
                      )}
                      
                      {update.proofFile && (
                                                  <div className="flex items-center justify-between bg-green-50 p-3 rounded border">
                          <div className="flex items-center space-x-2">
                            <span className="text-green-600">📎</span>
                            <span className="text-sm font-medium text-gray-900">
                              {update.proofFile.originalName}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({(update.proofFile.sizeBytes / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <button
                            onClick={() => handleDownloadProof(update.proofFile.id, update.proofFile.originalName)}
                            className="btn-primary text-sm"
                          >
                            Télécharger la preuve
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowProgressHistoryModal(false);
                    setSelectedObjectiveForHistory(null);
                    setProgressHistory([]);
                  }}
                  className="btn-secondary"
                >
                  Fermer
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
        onConfirm={confirmDeleteTarget}
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer cet objectif ?"
        confirmText="Supprimer"
        cancelText="Annuler"
        isLoading={loading}
      />
    </div>
  );
};

export default TargetManagement; 