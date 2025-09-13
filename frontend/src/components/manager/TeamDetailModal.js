import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  AcademicCapIcon, 
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  StarIcon,
  BoltIcon,
  UsersIcon,
  UserIcon,
  FlagIcon
} from '@heroicons/react/24/outline';
import dataService from '../../services/dataService';
import apiService from '../../services/api';
import { getSkillLevelOptions } from '../../utils/skillUtils';
import ConfirmationModal from '../common/ConfirmationModal';
import { getProfilePictureUrl } from '../../utils/imageUtils';
import UserProfileModal from '../common/UserProfileModal';
import TeamPerformanceDashboard from './TeamPerformanceDashboard';
import IndividualTargetModal from './IndividualTargetModal';

const TeamDetailModal = ({ team, isOpen, onClose, departments }) => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [skills, setSkills] = useState([]);
  const [skillOptions, setSkillOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTeamObjectiveModal, setShowTeamObjectiveModal] = useState(false);
  const [showIndividualObjectiveModal, setShowIndividualObjectiveModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedEmployeeToAdd, setSelectedEmployeeToAdd] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);
  const [showIndividualTargetModal, setShowIndividualTargetModal] = useState(false);
  const [selectedEmployeeForTarget, setSelectedEmployeeForTarget] = useState(null);
  const [skillAnalytics, setSkillAnalytics] = useState({
    mostCommonSkills: [],
    averageSkillLevel: 0,
    skillGaps: [],
    totalSkills: 0,
    skillDistribution: {}
  });
  
  // Team objective form state
  const [teamObjective, setTeamObjective] = useState({
    title: '',
    description: '',
    skill: '',
    category: '', // Start with empty category to force selection
    targetLevel: 1,
    deadline: '',
    files: [] // Support multiple files
  });

  // Enhanced team objective functions with custom partial target names and individual customization
  const [currentTeamObjective, setCurrentTeamObjective] = useState(null);
  const [teamMemberAssignments, setTeamMemberAssignments] = useState([]);
  const [showTeamMemberAssignmentModal, setShowTeamMemberAssignmentModal] = useState(false);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState(null);
  const [showMemberEditModal, setShowMemberEditModal] = useState(false);
  
  // Individual objective form state
  const [individualObjective, setIndividualObjective] = useState({
    title: '',
    description: '',
    skill: '',
    category: 'personal_improvement', // Always set to personal improvement
    targetLevel: 1,
    deadline: '',
    files: [] // Support multiple files
  });

  const loadTeamData = useCallback(async () => {
    if (!team?.id) return;
    
    try {
      setLoading(true);
      console.log('🔍 TeamDetailModal: Starting loadTeamData');
      console.log('🏢 Team ID:', team.id);
      console.log('🏢 Team Name:', team.name);
      
      console.log('🔍 TeamDetailModal: Making API calls...');
             const [membersData, employeesData, skillsData] = await Promise.all([
         dataService.getTeamMembers(team.id),
         dataService.getUsers({ pageSize: 1000, include_inactive: true }), // Get all users, we'll filter in the frontend
         dataService.getSkills()
       ]);
      
      console.log('✅ TeamDetailModal: API calls completed');
      console.log('📊 Members data:', membersData);
      console.log('📊 Employees data length:', employeesData.length);
      console.log('📊 Skills data length:', skillsData.length);
      
      // Fetch individual objectives for each team member using the manager's view
      console.log('🔍 TeamDetailModal: Fetching individual objectives for team members...');
      const membersWithObjectives = await Promise.all(
        (membersData || []).map(async (member) => {
          try {
            // Get individual objectives for this member using the manager's objectives endpoint
            const managerObjectivesResponse = await dataService.getMyManagerObjectives();
            const memberObjectives = managerObjectivesResponse.filter(obj => 
              obj.assigneeType === 'USER' && 
              obj.assignee?.id === member.id &&
              !obj.parentObjectiveId // Individual objectives don't have a parent
            );
            
            console.log(`📊 Member ${member.firstName} ${member.lastName}: ${memberObjectives.length} individual objectives`);
            console.log(`📊 All objectives for debugging:`, managerObjectivesResponse);
            
            return {
              ...member,
              individualObjectives: memberObjectives,
              teamContributions: managerObjectivesResponse.filter(obj => 
                obj.assigneeType === 'USER' && 
                obj.assignee?.id === member.id &&
                obj.parentObjectiveId // Team contributions have a parent objective
              )
            };
          } catch (error) {
            console.error(`❌ Error fetching objectives for member ${member.id}:`, error);
            return {
              ...member,
              individualObjectives: [],
              teamContributions: []
            };
          }
        })
      );
      
      console.log('✅ TeamDetailModal: Individual objectives fetched for all members');
      
      setTeamMembers(membersWithObjectives);
      setAllEmployees(employeesData || []);
      setSkills((skillsData || []).map(skill => skill.name));
      setSkillOptions(skillsData || []);
      
      console.log('✅ TeamDetailModal: State updated successfully');
    } catch (error) {
      console.error('❌ TeamDetailModal: Error loading team data:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack
      });
      toast.error('Erreur lors du chargement des données de l\'équipe');
      // Set empty arrays to prevent crashes
      setTeamMembers([]);
      setAllEmployees([]);
      setSkills([]);
      setSkillOptions([]);
    } finally {
      setLoading(false);
    }
  }, [team?.id, team?.name]);

  useEffect(() => {
    if (isOpen && team) {
      loadTeamData();
    }
  }, [isOpen, team, loadTeamData]);

  const handleAssignTeamObjective = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Debug: Starting handleAssignTeamObjective');
      console.log('🔍 Debug: teamObjective:', teamObjective);
      console.log('🔍 Debug: teamObjective.title:', teamObjective.title);
      console.log('🔍 Debug: teamObjective.title.length:', teamObjective.title.length);
      console.log('🔍 Debug: team:', team);
      console.log('🔍 Debug: teamMembers state:', teamMembers);
      
      // Validate required fields based on category
      if (!teamObjective.category) {
        toast.error('Veuillez sélectionner une catégorie');
        return;
      }
      
      // Enhanced validation with detailed error messages
      if (!teamObjective.title || teamObjective.title.trim().length === 0) {
        toast.error('Le titre est obligatoire');
        return;
      }
      
      if (!teamObjective.description || teamObjective.description.trim().length === 0) {
        toast.error('La description est obligatoire');
        return;
      }
      
      if (!teamObjective.deadline) {
        toast.error('La date limite est obligatoire');
        return;
      }
      
      // Validate title length (minimum 5 characters as per backend validation)
      const trimmedTitle = teamObjective.title.trim();
      if (trimmedTitle.length < 5) {
        toast.error(`Le titre "${trimmedTitle}" est trop court (${trimmedTitle.length} caractères). Minimum requis: 5 caractères.`);
        return;
      }
      
      // Validate description length
      const trimmedDescription = teamObjective.description.trim();
      if (trimmedDescription.length < 10) {
        toast.error(`La description "${trimmedDescription}" est trop courte (${trimmedDescription.length} caractères). Minimum requis: 10 caractères.`);
        return;
      }
      
      console.log('✅ Debug: All validations passed');
      console.log('✅ Debug: Title:', `"${trimmedTitle}" (${trimmedTitle.length} chars)`);
      console.log('✅ Debug: Description:', `"${trimmedDescription}" (${trimmedDescription.length} chars)`);
      
      // For personal improvement, validate skill and target level
      if (teamObjective.category === 'personal_improvement') {
        if (!teamObjective.skill) {
          toast.error('Veuillez sélectionner une compétence');
          return;
        }
      
      // Find skill ID from name
      const selectedSkill = skillOptions.find(skill => skill.name === teamObjective.skill);
      if (!selectedSkill) {
        toast.error('Compétence invalide');
        return;
        }
      }
      
      // Check if team and teamMembers exist
      if (!team || !teamMembers || !Array.isArray(teamMembers) || teamMembers.length === 0) {
        console.error('❌ Error: Team or team members not available');
        console.error('❌ team:', team);
        console.error('❌ teamMembers:', teamMembers);
        toast.error('Erreur: Données de l\'équipe non disponibles. Veuillez réessayer.');
        return;
      }
      
      console.log('✅ Debug: Team validation passed');
      
      // Store the current team objective and prepare team member assignments
      const newCurrentTeamObjective = {
        ...teamObjective,
        skillId: teamObjective.category === 'personal_improvement' 
          ? skillOptions.find(skill => skill.name === teamObjective.skill)?.id 
          : null
      };
      
      console.log('✅ Debug: newCurrentTeamObjective:', newCurrentTeamObjective);
      console.log('✅ Debug: newCurrentTeamObjective.title:', newCurrentTeamObjective.title);
      console.log('✅ Debug: newCurrentTeamObjective.title.length:', newCurrentTeamObjective.title.length);
      
      setCurrentTeamObjective(newCurrentTeamObjective);
      console.log('✅ Debug: currentTeamObjective set');
      
      // Prepare team member assignments with enhanced fields
      const assignments = teamMembers.map(member => {
        console.log('🔍 Debug: Processing member:', member);
        return {
          userId: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          partialTargetName: `${teamObjective.title} (${member.firstName} ${member.lastName})`,
          customSuffix: '', // For additional context like "(frontend)", "(backend)"
          individualDescription: '', // Individual description for this member
  
          individualDeadline: teamObjective.deadline // Default to team deadline, but can be customized
        };
      });
      
      console.log('✅ Debug: Assignments prepared:', assignments);
      setTeamMemberAssignments(assignments);
      
      // Check category to determine next step
      if (teamObjective.category === 'personal_improvement') {
        // For personal improvement: assign directly to all members without customization modal
        console.log('✅ Debug: Personal improvement category - assigning directly to all members');
        
        // Close the first modal
        setShowTeamObjectiveModal(false);
        
        // Call handleFinalizeTeamObjective directly with default assignments
        await handleFinalizeTeamObjectiveDirectly(newCurrentTeamObjective, assignments);
      } else if (teamObjective.category === 'company_project') {
        // For company projects: show customization modal
        console.log('✅ Debug: Company project category - showing customization modal');
      
      // Close the first modal and show the team member assignment modal
      setShowTeamObjectiveModal(false);
      setShowTeamMemberAssignmentModal(true);
      } else {
        // For any other category: default to showing customization modal
        console.log('✅ Debug: Other category - showing customization modal');
        
        // Close the first modal and show the team member assignment modal
        setShowTeamObjectiveModal(false);
        setShowTeamMemberAssignmentModal(true);
      }
      
      console.log('✅ Debug: Category-based flow completed');
      
    } catch (error) {
      console.error('❌ Error preparing team objective:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        team: team,
        teamMembers: team?.members
      });
      toast.error('Erreur lors de la préparation de l\'objectif d\'équipe');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeTeamObjectiveDirectly = async (teamObjectiveData, memberAssignments) => {
    try {
      setLoading(true);
      
      console.log('🔍 Debug: Starting handleFinalizeTeamObjectiveDirectly for personal improvement');
      console.log('🔍 Debug: teamObjectiveData:', teamObjectiveData);
      console.log('🔍 Debug: memberAssignments:', memberAssignments);
      
      if (!teamObjectiveData) {
        toast.error('Données d\'objectif manquantes');
        return;
      }
      
      // Ensure the team deadline is properly formatted and validated
      let formattedTeamDeadline = null;
      if (teamObjectiveData.deadline) {
        // Convert to YYYY-MM-DD format to avoid timezone issues
        const date = new Date(teamObjectiveData.deadline);
        formattedTeamDeadline = date.toISOString().split('T')[0];
        
        // Validate team deadline is not in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        
        if (date < today) {
          toast.error('La date limite de l\'équipe ne peut pas être dans le passé');
          return;
        }
        
        // Ensure team deadline is at least 2 days in the future to allow individual deadlines
        const minTeamDeadline = new Date(today);
        minTeamDeadline.setDate(today.getDate() + 2);
        
        if (date < minTeamDeadline) {
          toast.error('La date limite de l\'équipe doit être au moins 2 jours dans le futur pour permettre des objectifs individuels');
          return;
        }
      }
      
      // For personal improvement, create individual objectives directly (not team objectives)
      if (teamObjectiveData.category === 'personal_improvement') {
        console.log('🔍 Creating individual objectives directly for personal improvement');
        
        let successCount = 0;
        let errorCount = 0;
        
        // REWRITTEN: Use the RELIABLE assignment approach from team targets (but create individual objectives directly)
        console.log('🚀 REWRITTEN: Starting individual target assignment using reliable team target approach');
        console.log(`🚀 REWRITTEN: Total team members to process: ${memberAssignments.length}`);
        
        // Log all members that will be processed
        memberAssignments.forEach((member, index) => {
          console.log(`🚀 REWRITTEN: Member ${index + 1}/${memberAssignments.length}: ${member.firstName} ${member.lastName} (ID: ${member.userId})`);
        });
        
        // Use the BULLETPROOF team individual targets endpoint (which has proven reliability)
        console.log('🚀 REWRITTEN: Using bulletproof team individual targets endpoint');
        
        try {
          const teamIndividualTargetData = {
            title: teamObjectiveData.title.trim(),
            description: teamObjectiveData.description.trim(),
            skillId: teamObjectiveData.skillId,
            targetLevel: teamObjectiveData.targetLevel,
            deadline: formattedTeamDeadline,
            teamId: team.id
          };
          
          console.log('🚀 REWRITTEN: Team individual target data:', teamIndividualTargetData);
          
          const response = await dataService.createTeamIndividualTargetsSimple(teamIndividualTargetData);
          console.log('✅ REWRITTEN: Team individual targets created successfully:', response);
          
          // The endpoint returns the count of created objectives
          successCount = response.createdTargets || response.createdObjectives?.length || 0;
          errorCount = response.failures?.length || response.failedMembers?.length || 0;
          
          console.log(`🚀 REWRITTEN: SUCCESS - ${successCount} objectives created, ${errorCount} failed`);
          
        } catch (error) {
          errorCount = memberAssignments.length;
          successCount = 0;
          console.error(`❌ REWRITTEN: Failed to create team individual targets:`, error);
          toast.error(`❌ ERREUR: Impossible de créer les objectifs individuels: ${error.message}`);
        }
        
        // Validation: Ensure all members were assigned
        console.log(`🚀 REWRITTEN: VALIDATION - Expected: ${memberAssignments.length}, Successful: ${successCount}, Failed: ${errorCount}`);
        
        if (successCount !== memberAssignments.length) {
          console.error(`❌ REWRITTEN: CRITICAL ERROR - Not all members were assigned!`);
          console.error(`❌ REWRITTEN: Expected ${memberAssignments.length} assignments, but only ${successCount} succeeded`);
          toast.error(`❌ ERREUR CRITIQUE: ${errorCount} employé(s) n'ont pas reçu l'objectif!`);
        } else {
          console.log(`🎉 REWRITTEN: SUCCESS - All ${memberAssignments.length} members were assigned successfully!`);
        }
        
        // Show summary
        if (successCount > 0) {
          toast.success(`${successCount} objectif(s) individuel(s) créé(s) avec succès pour l'amélioration personnelle`);
        }
        if (errorCount > 0) {
          toast.error(`${errorCount} erreur(s) lors de la création des objectifs individuels`);
        }
        
        // Close modal and refresh data
        onClose();
        return;
      }
      
      // For other categories, create team objective first
      const objectiveData = {
        title: teamObjectiveData.title.trim(),
        description: teamObjectiveData.description.trim(),
        skillId: teamObjectiveData.skillId,
        targetLevel: teamObjectiveData.targetLevel,
        deadline: formattedTeamDeadline,
        category: teamObjectiveData.category,
        assigneeType: 'TEAM',
        teamId: team.id
      };
      
      console.log('🔍 Debug: Creating team objective with data:', objectiveData);
      
      // Create the team objective
      const createdObjective = await dataService.createObjective(objectiveData);
      console.log('✅ Team objective created:', createdObjective);
      
      if (createdObjective && createdObjective.id) {
        console.log('🔍 Creating individual targets for team members...');
        
        let successCount = 0;
        let errorCount = 0;
        
        // Create individual targets for each team member with default values
        for (const member of memberAssignments) {
          try {
            // For team objectives, set individual deadline to 2 days before team deadline
            let individualDeadline = null;
            if (formattedTeamDeadline) {
              const teamDate = new Date(formattedTeamDeadline);
              teamDate.setDate(teamDate.getDate() - 2); // 2 days before to ensure it's definitely before
              individualDeadline = teamDate.toISOString().split('T')[0];
            }
            
            const individualTargetData = {
              objectiveId: createdObjective.id,
              userId: member.userId,
              teamId: team.id,
              customTitle: member.partialTargetName, // Use default name
              customDescription: '', // No custom description for personal improvement
              customDeadline: individualDeadline, // Use 2 days before team deadline
              customFilePath: null // No custom file for personal improvement
            };
            
            console.log('🔍 Creating individual target for member:', member.firstName, member.lastName);
            console.log('🔍 Team deadline (formatted):', formattedTeamDeadline);
            console.log('🔍 Individual deadline:', individualDeadline);
            console.log('🔍 Individual deadline (Date object):', individualDeadline ? new Date(individualDeadline) : 'null');
            console.log('🔍 Individual deadline (ISO):', individualDeadline ? new Date(individualDeadline).toISOString() : 'null');
            console.log('🔍 Individual target data:', individualTargetData);
            
            await dataService.createIndividualTarget(individualTargetData);
            successCount++;
            console.log('✅ Individual target created for:', member.firstName, member.lastName);
            
          } catch (error) {
            errorCount++;
            console.error('❌ Error creating individual target for user:', member.userId, error);
            toast.error(`Erreur lors de la création de l'objectif individuel pour ${member.partialTargetName} ${error.message}`);
          }
        }
        
        // Show summary
        if (successCount > 0) {
          toast.success(`Objectif d'équipe "${teamObjectiveData.title}" assigné avec succès à ${successCount} membre(s)`);
        }
        if (errorCount > 0) {
          toast.error(`${errorCount} erreur(s) lors de la création des objectifs individuels`);
        }
        
        // Close modal and refresh data
        onClose();
        // You might want to trigger a refresh of the parent component here
      }
      
    } catch (error) {
      console.error('❌ Error in handleFinalizeTeamObjectiveDirectly:', error);
      toast.error('Erreur lors de la création de l\'objectif d\'équipe');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeTeamObjective = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Debug: Starting handleFinalizeTeamObjective');
      console.log('🔍 Debug: currentTeamObjective:', currentTeamObjective);
      console.log('🔍 Debug: teamMemberAssignments:', teamMemberAssignments);
      console.log('🔍 Debug: Team objective deadline:', currentTeamObjective.deadline);
      console.log('🔍 Debug: Team objective deadline (parsed):', currentTeamObjective.deadline ? new Date(currentTeamObjective.deadline) : 'null');
      console.log('🔍 Debug: Team objective deadline (ISO):', currentTeamObjective.deadline ? new Date(currentTeamObjective.deadline).toISOString() : 'null');
      
      if (!currentTeamObjective) {
        toast.error('Données d\'objectif manquantes');
        return;
      }
      
            // Create the team objective with custom partial target names
      console.log('🔍 Debug: Preparing objectiveData');
      console.log('🔍 Debug: currentTeamObjective.title:', currentTeamObjective.title);
      console.log('🔍 Debug: currentTeamObjective.title.length:', currentTeamObjective.title.length);
      console.log('🔍 Debug: currentTeamObjective.title type:', typeof currentTeamObjective.title);
      
      // Ensure title meets minimum length requirement
      const title = currentTeamObjective.title.trim();
      if (title.length < 5) {
        toast.error(`Le titre "${title}" est trop court (${title.length} caractères). Minimum requis: 5 caractères.`);
        return;
      }
      
      const description = currentTeamObjective.description.trim();
      if (description.length < 10) {
        toast.error(`La description "${description}" est trop courte (${description.length} caractères). Minimum requis: 10 caractères.`);
        return;
      }
      
      console.log('🔍 Debug: Final validation before sending:');
      console.log('🔍 Debug: Title:', `"${title}" (${title.length} chars)`);
      console.log('🔍 Debug: Description:', `"${description}" (${description.length} chars)`);
      console.log('🔍 Debug: Category:', currentTeamObjective.category);
      console.log('🔍 Debug: Deadline:', currentTeamObjective.deadline);
      console.log('🔍 Debug: Team ID:', team.id);
      
      // Ensure the team deadline is properly formatted
      let formattedTeamDeadline = null;
      if (currentTeamObjective.deadline) {
        // Convert to YYYY-MM-DD format to avoid timezone issues
        const date = new Date(currentTeamObjective.deadline);
        formattedTeamDeadline = date.toISOString().split('T')[0];
      }
      
      const objectiveData = {
        title: title,
        description: description,
        skillId: currentTeamObjective.skillId,
        targetLevel: currentTeamObjective.targetLevel,
        deadline: formattedTeamDeadline,
        category: currentTeamObjective.category,
        assigneeType: 'TEAM',
        teamId: team.id,
        teamMemberAssignments: teamMemberAssignments.map(assignment => ({
          userId: assignment.userId,
          partialTargetName: assignment.partialTargetName + (assignment.customSuffix ? ` ${assignment.customSuffix}` : ''),
          individualDescription: assignment.individualDescription && assignment.individualDescription.trim() !== '' ? assignment.individualDescription : null,
          individualDeadline: assignment.individualDeadline || null,
          individualFile: null // Individual files not supported for team objectives yet
        }))
      };
      
      console.log('🔍 Debug: objectiveData being sent to backend:', objectiveData);
      console.log('🔍 Debug: Title length:', objectiveData.title.length);
      console.log('🔍 Debug: Title value:', `"${objectiveData.title}"`);
      console.log('🔍 Debug: teamMemberAssignments count:', teamMemberAssignments.length);
      
      // Validate team deadline is not in the past and gives enough time for individual deadlines
      const teamDeadline = new Date(currentTeamObjective.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day
      
      if (teamDeadline < today) {
        toast.error('La date limite de l\'équipe ne peut pas être dans le passé');
        return;
      }
      
      // Ensure team deadline is at least 2 days in the future to allow individual deadlines
      const minTeamDeadline = new Date(today);
      minTeamDeadline.setDate(today.getDate() + 2);
      
      if (teamDeadline < minTeamDeadline) {
        toast.error('La date limite de l\'équipe doit être au moins 2 jours dans le futur pour permettre des objectifs individuels');
        return;
      }
      
      // Create the team objective with team member assignments (handled by backend)
      const createdObjective = await dataService.createObjective(objectiveData);
      console.log('✅ Team objective created with individual targets:', createdObjective);
      
      // If manager selected files, attach them to the created objective
      if (createdObjective && createdObjective.id && teamObjective.files && teamObjective.files.length > 0) {
        try {
          // Upload each selected file to get a file record first
          const uploaded = [];
          for (const file of teamObjective.files) {
            const res = await apiService.uploadFile(file);
            uploaded.push({
              name: res.originalName || file.name,
              path: res.storageKey || res.url || res.profileUrl || file.name,
              size: res.sizeBytes || file.size,
              type: res.mimeType || file.type
            });
          }

          await dataService.attachObjectiveFiles(createdObjective.id, uploaded);
          console.log('✅ Uploaded and attached manager files to objective:', uploaded.length);
        } catch (attachErr) {
          console.error('❌ Failed to attach files to objective:', attachErr);
        }
      }
      
      toast.success(`Objectif d'équipe "${currentTeamObjective.title}" assigné avec succès`);
      
      // Reset all states and close modals
      setShowTeamMemberAssignmentModal(false);
      setCurrentTeamObjective(null);
      setTeamMemberAssignments([]);
      setTeamObjective({
        title: '',
        description: '',
        skill: '',
        category: '',
        targetLevel: 1,
        deadline: '',
        file: null
      });
      
      // Refresh team data
      loadTeamData();
      
    } catch (error) {
      console.error('Error creating team objective:', error);
      toast.error(error.message || 'Erreur lors de l\'assignation de l\'objectif d\'équipe');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePartialTargetName = (userId, newName) => {
    setTeamMemberAssignments(prev => 
      prev.map(assignment => 
        assignment.userId === userId 
          ? { ...assignment, partialTargetName: newName }
          : assignment
      )
    );
  };

  const handleUpdateCustomSuffix = (userId, suffix) => {
    setTeamMemberAssignments(prev => 
      prev.map(assignment => 
        assignment.userId === userId 
          ? { ...assignment, customSuffix: suffix }
          : assignment
      )
    );
  };

  const handleUpdateIndividualDescription = (userId, description) => {
    setTeamMemberAssignments(prev => 
      prev.map(assignment => 
        assignment.userId === userId 
          ? { ...assignment, individualDescription: description }
          : assignment
      )
    );
  };



  const handleUpdateIndividualDeadline = (userId, deadline) => {
    // Validate that individual deadline is not after team deadline
    const teamDeadline = new Date(currentTeamObjective.deadline);
    const individualDeadline = new Date(deadline);
    const today = new Date();
    
    // Normalize dates to compare only the date part (ignore time)
              const normalizedTeamDeadline = new Date(teamDeadline.getFullYear(), teamDeadline.getMonth(), teamDeadline.getDate());
    const normalizedIndividualDeadline = new Date(individualDeadline.getFullYear(), individualDeadline.getMonth(), individualDeadline.getDate());
    const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          
              // Allow same date (individual deadline can equal team deadline)
              if (normalizedIndividualDeadline > normalizedTeamDeadline) {
      toast.error('La date limite individuelle ne peut pas être après la date limite de l\'équipe');
      return;
    }
    
              if (normalizedIndividualDeadline < normalizedToday) {
      toast.error('La date limite individuelle ne peut pas être dans le passé');
      return;
    }
          
    console.log('✅ Frontend date validation passed:');
    console.log('   - Team deadline:', normalizedTeamDeadline);
    console.log('   - Individual deadline:', normalizedIndividualDeadline);
    console.log('   - Same date allowed:', normalizedIndividualDeadline.getTime() === normalizedTeamDeadline.getTime());
    
    setTeamMemberAssignments(prev => 
      prev.map(assignment => 
        assignment.userId === userId 
          ? { ...assignment, individualDeadline: deadline }
          : assignment
      )
    );
  };

  const handleEditMember = (member) => {
    setSelectedMemberForEdit(member);
    setShowMemberEditModal(true);
  };

  // Objective assignment function
  const handleAssignObjective = () => {
    setShowTeamObjectiveModal(true);
  };

  const handleAssignIndividualTarget = (member) => {
    console.log('🔍 TeamDetailModal: Opening individual target modal for:', member.firstName, member.lastName);
    setSelectedEmployeeForTarget(member);
    setShowIndividualTargetModal(true);
  };

  const handleTargetAssignmentSuccess = () => {
    console.log('✅ TeamDetailModal: handleTargetAssignmentSuccess called');
    // Refresh team data after successful target assignment
    loadTeamData();
    toast.success('Objectif assigné avec succès!');
  };

  const handleAssignIndividualObjective = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Starting individual objective assignment...');
      console.log('🔍 Selected member:', selectedMember);
      console.log('🔍 Individual objective data:', individualObjective);
      
      // Validate required fields
      if (!individualObjective.title || !individualObjective.description || !individualObjective.deadline) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        return;
      }
      
      // Validate skill and target level (always required for individual objectives)
        if (!individualObjective.skill) {
          toast.error('Veuillez sélectionner une compétence');
          return;
        }
      
      // Find skill ID from name
      const selectedSkill = skillOptions.find(skill => skill.name === individualObjective.skill);
      if (!selectedSkill) {
        toast.error('Compétence invalide');
        return;
      }

      // Category is automatically set to "personal_improvement" for individual objectives
      const objectiveData = {
        title: individualObjective.title,
        description: individualObjective.description,
        skillId: selectedSkill.id,
        targetLevel: individualObjective.targetLevel,
        deadline: individualObjective.deadline,
        category: 'personal_improvement', // Always set to personal improvement
        assigneeType: 'USER',
        userId: selectedMember.id
      };
      
      // Create the individual objective
      const createdObjective = await dataService.createObjective(objectiveData);
      console.log('✅ Individual objective created:', createdObjective);
      
      // Log the created objective details for debugging
      console.log('🔍 Created objective details:');
      console.log('  - ID:', createdObjective?.id);
      console.log('  - Title:', createdObjective?.title);
      console.log('  - Assigned to user:', objectiveData.userId);
      console.log('  - Category:', objectiveData.category);
      console.log('  - Assignee type:', objectiveData.assigneeType);
      
      // If manager selected files, upload and attach them to this individual objective
      if (createdObjective && createdObjective.id && individualObjective.files && individualObjective.files.length > 0) {
        try {
          console.log('🔍 Uploading and attaching files for individual objective:', individualObjective.files.length, 'files');
          
          // Upload each selected file to get a file record first
          const uploadedFiles = [];
          for (const file of individualObjective.files) {
            const res = await apiService.uploadFile(file);
            uploadedFiles.push({
              name: res.originalName || file.name,
              path: res.storageKey || res.url || res.profileUrl || file.name,
              size: res.sizeBytes || file.size,
              type: res.mimeType || file.type
            });
          }
          
          // Attach the uploaded files to the individual objective
          await dataService.attachObjectiveFiles(createdObjective.id, uploadedFiles);
          console.log('✅ Uploaded and attached manager files to individual objective:', uploadedFiles.length);
          
        } catch (attachErr) {
          console.error('❌ Failed to attach files to individual objective:', attachErr);
          toast.error(`Fichiers non attachés: ${attachErr.message}`);
        }
      }
      
      toast.success(`Objectif "${individualObjective.title}" assigné à ${selectedMember.firstName} ${selectedMember.lastName}`);
      
      // Refresh team data to show updated objective counts
      await loadTeamData();
      
      setShowIndividualObjectiveModal(false);
      setSelectedMember(null);
             setIndividualObjective({
         title: '',
         description: '',
         skill: '',
        category: 'personal_improvement', // Always reset to personal improvement
         targetLevel: 1,
        deadline: '',
        files: []
       });
    } catch (error) {
      console.error('❌ Error assigning individual objective:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      console.error('❌ Error status:', error.response?.status);
      
      // Show more detailed error message
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de l\'assignation de l\'objectif';
      toast.error(`Erreur: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    try {
      setLoading(true);
      await dataService.addTeamMember(team.id, selectedEmployeeToAdd);
      toast.success('Membre ajouté à l\'équipe avec succès');
      setShowAddMemberModal(false);
      setSelectedEmployeeToAdd('');
      loadTeamData(); // Refresh team data
    } catch (error) {
      console.error('Error adding team member:', error);
      toast.error(error.message || 'Erreur lors de l\'ajout du membre');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    try {
      setLoading(true);
      await dataService.removeTeamMember(team.id, selectedMember.id);
      toast.success(`${selectedMember.firstName} ${selectedMember.lastName} retiré de l'équipe`);
      setShowRemoveMemberModal(false);
      setSelectedMember(null);
      loadTeamData(); // Refresh team data
    } catch (error) {
      console.error('Error removing team member:', error);
      toast.error(error.message || 'Erreur lors du retrait du membre');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced Skill Analytics Functions with Real-time Data
  const calculateSkillAnalytics = useMemo(() => {
    if (!teamMembers?.length || !skillOptions?.length) {
      return {
        mostCommonSkills: [],
        averageSkillLevel: 0,
        skillGaps: [],
        totalSkills: 0,
        skillDistribution: {},
        totalMembers: teamMembers?.length || 0,
        skillsWithMembers: 0,
        averageSkillsPerMember: 0
      };
    }

    // Collect all skills from team members with enhanced data
    const allMemberSkills = [];
    const membersWithSkills = new Set();
    
    teamMembers.forEach(member => {
      if (member?.skills && Array.isArray(member.skills)) {
        member.skills.forEach(skill => {
          if (skill?.name && skill?.level) {
            allMemberSkills.push({
              name: skill.name,
              level: skill.level,
              memberId: member.id,
              memberName: `${member.firstName || ''} ${member.lastName || ''}`,
              category: skill.category || 'Général'
            });
            membersWithSkills.add(member.id);
          }
        });
      }
    });

    // Calculate skill frequency with enhanced metrics
    const skillFrequency = {};
    const skillLevels = {};
    const skillCategories = {};
    
    allMemberSkills.forEach(skill => {
      if (!skillFrequency[skill.name]) {
        skillFrequency[skill.name] = 0;
        skillLevels[skill.name] = [];
        skillCategories[skill.name] = skill.category;
      }
      skillFrequency[skill.name]++;
      skillLevels[skill.name].push(skill.level);
    });

    // Most common skills (top 5) with enhanced data
    const mostCommonSkills = Object.entries(skillFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([skillName, count]) => ({
        name: skillName,
        count,
        averageLevel: Math.round((skillLevels[skillName].reduce((sum, level) => sum + level, 0) / skillLevels[skillName].length) * 10) / 10,
        category: skillCategories[skillName],
        memberPercentage: Math.round((count / teamMembers.length) * 100)
      }));

    // Enhanced average skill level calculation
    const totalLevels = allMemberSkills.reduce((sum, skill) => sum + skill.level, 0);
    const averageSkillLevel = allMemberSkills.length > 0 ? totalLevels / allMemberSkills.length : 0;

    // Enhanced skill gaps calculation
    const availableSkills = skillOptions.map(skill => skill?.name).filter(Boolean);
    const teamSkillNames = Object.keys(skillFrequency);
    const skillGaps = availableSkills.filter(skill => !teamSkillNames.includes(skill));

    // Enhanced skill distribution by level
    const skillDistribution = {
      1: allMemberSkills.filter(skill => skill.level === 1).length,
      2: allMemberSkills.filter(skill => skill.level === 2).length,
      3: allMemberSkills.filter(skill => skill.level === 3).length,
      4: allMemberSkills.filter(skill => skill.level === 4).length,
      5: allMemberSkills.filter(skill => skill.level === 5).length
    };

    // Calculate additional metrics
    const totalMembers = teamMembers.length;
    const skillsWithMembers = Object.keys(skillFrequency).length;
    const averageSkillsPerMember = totalMembers > 0 ? Math.round((allMemberSkills.length / totalMembers) * 10) / 10 : 0;

    // Calculate skill coverage percentage
    const skillCoveragePercentage = availableSkills.length > 0 ? Math.round(((availableSkills.length - skillGaps.length) / availableSkills.length) * 100) : 0;

    return {
      mostCommonSkills,
      averageSkillLevel: Math.round(averageSkillLevel * 10) / 10,
      skillGaps: skillGaps.slice(0, 5), // Top 5 gaps
      totalSkills: Object.keys(skillFrequency).length, // Count unique skills, not total instances
      skillDistribution,
      totalMembers,
      skillsWithMembers,
      averageSkillsPerMember,
      skillCoveragePercentage,
      membersWithSkills: membersWithSkills.size,
      membersWithoutSkills: totalMembers - membersWithSkills.size
    };
  }, [teamMembers, skillOptions]);

  useEffect(() => {
    setSkillAnalytics(calculateSkillAnalytics);
  }, [calculateSkillAnalytics]);



  const handleUserClick = (userId) => {
    setSelectedProfileId(userId);
    setShowUserProfileModal(true);
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  // Function to map database category values to French display values
  const getCategoryDisplayName = (category) => {
    switch (category) {
      case 'personal_improvement':
        return 'Amélioration personnelle';
      case 'company_project':
        return 'Contribution d\'équipe';
      default:
        return category || 'Non définie';
    }
  };

  const filteredEmployees = allEmployees.filter(employee => 
    employee.role === 'employee' && // Only show employees
    employee.status === 'active' && // Only show active employees
    !teamMembers.find(member => member.id === employee.id) && // Not already in team
    (employee.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     employee.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     employee.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isOpen || !team) return null;

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
        <div className="relative top-10 mx-auto p-8 border-0 w-11/12 max-w-6xl shadow-2xl rounded-3xl bg-white">
          <div className="mt-3">
            {/* Modern Header */}
            <div className="flex justify-between items-start mb-8">
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <UserGroupIcon className="w-6 h-6 text-white" />
                  </div>
              <div>
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      {team?.name || 'Équipe'}
                    </h3>
                    <p className="text-gray-600 text-lg">{team?.description || 'Aucune description'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 mt-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    {team.departments && team.departments.length > 0 
                      ? team.departments.map(d => d.name).join(', ')
                      : 'Non assigné'}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <UsersIcon className="w-4 h-4 mr-1" />
                    {teamMembers.length} membres
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>

            {/* Skill Matrix Dashboard */}
            {loading ? (
              <div className="mb-8 bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              </div>
            ) : (
              <div className="mb-8 bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xl font-bold text-gray-900 flex items-center">
                  <AcademicCapIcon className="w-6 h-6 mr-2 text-blue-600" />
                  Tableau de bord des compétences
                </h4>
                <div className="flex space-x-2">
                                <button
                onClick={handleAssignObjective}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
                disabled={loading}
              >
                    <BoltIcon className="w-4 h-4 mr-2" />
                    Assigner objectif
                  </button>
                  <button
                    onClick={() => setShowPerformanceDashboard(true)}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-sm font-medium rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-md hover:shadow-lg"
                    disabled={loading}
                  >
                    <ChartBarIcon className="w-4 h-4 mr-2" />
                    Performance
              </button>
                </div>
            </div>

              {/* Analytics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {/* Total Skills */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Compétences</p>
                      <p className="text-2xl font-bold text-gray-900">{skillAnalytics.totalSkills}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <AcademicCapIcon className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Average Skill Level */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Niveau Moyen</p>
                      <p className="text-2xl font-bold text-gray-900">{skillAnalytics.averageSkillLevel}/5</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <StarIcon className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                {/* Team Members */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Membres</p>
                      <p className="text-2xl font-bold text-gray-900">{teamMembers.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <UsersIcon className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>

                {/* Skill Gaps */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Lacunes</p>
                      <p className="text-2xl font-bold text-gray-900">{skillAnalytics.skillGaps.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Skill Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Most Common Skills */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <h5 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <ArrowTrendingUpIcon className="w-5 h-5 mr-2 text-blue-600" />
                    Compétences les plus communes
                  </h5>
                  <div className="space-y-3">
                    {skillAnalytics.mostCommonSkills.length > 0 ? (
                      skillAnalytics.mostCommonSkills.map((skill, index) => (
                        <div key={skill.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-medium text-gray-900">{skill.name}</p>
                              <p className="text-sm text-gray-600">{skill.count} membres</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map(level => (
                              <div
                                key={level}
                                className={`w-3 h-3 rounded-full ${
                                  level <= skill.averageLevel ? 'bg-blue-500' : 'bg-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">Aucune compétence enregistrée</p>
                    )}
                  </div>
                </div>

                {/* Skill Gaps */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <h5 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <ExclamationTriangleIcon className="w-5 h-5 mr-2 text-orange-600" />
                    Lacunes de compétences
                  </h5>
                  <div className="space-y-2">
                    {skillAnalytics.skillGaps.length > 0 ? (
                      skillAnalytics.skillGaps.map((skill, index) => (
                        <div key={skill} className="flex items-center space-x-3 p-2 bg-orange-50 rounded-lg">
                          <span className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">
                            !
                          </span>
                          <span className="text-sm font-medium text-gray-900">{skill}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">Aucune lacune identifiée</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Modern Team Members Section */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-xl font-bold text-gray-900 flex items-center">
                  <UsersIcon className="w-6 h-6 mr-2 text-purple-600" />
                  Membres de l'équipe ({teamMembers.length})
                </h4>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-md hover:shadow-lg"
                  disabled={loading}
                >
                  <span className="w-4 h-4 mr-2">+</span>
                  Ajouter un membre
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
                  <UsersIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 text-lg font-medium">Aucun membre dans cette équipe</p>
                  <p className="text-gray-500 text-sm mt-2">Commencez par ajouter des membres à votre équipe</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {teamMembers
                    .sort((a, b) => {
                      // Put current user first
                      if (a?.id === user?.id) return -1;
                      if (b?.id === user?.id) return 1;
                      // Then sort alphabetically by name
                      const nameA = `${a?.firstName || ''} ${a?.lastName || ''}`.toLowerCase();
                      const nameB = `${b?.firstName || ''} ${b?.lastName || ''}`.toLowerCase();
                      return nameA.localeCompare(nameB);
                    })
                    .map((member) => (
                    <div key={member.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:border-purple-300 group">
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                        <div 
                            className="flex items-center space-x-4 cursor-pointer flex-1"
                          onClick={() => handleUserClick(member.id)}
                          title="Cliquer pour voir le profil"
                        >
                            <div className="relative">
                          {member.profilePictureUrl ? (
                            <img
                              src={getProfilePictureUrl(member.profilePictureUrl)}
                                  alt={`${member?.firstName || ''} ${member?.lastName || ''}`}
                                  className="h-12 w-12 rounded-xl object-cover border-2 border-gray-200 shadow-md"
                            />
                          ) : (
                                <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                                  <span className="text-white font-bold text-lg">
                                    {getInitials(member?.firstName || '', member?.lastName || '')}
                              </span>
                            </div>
                          )}
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                            </div>
                          <div>
                            <div className="flex items-center space-x-2">
                                <h5 className="font-bold text-gray-900 text-lg">
                                  {member?.firstName || ''} {member?.lastName || ''}
                              </h5>
                                {member?.id === user?.id && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  (Moi)
                                </span>
                              )}
                            </div>
                              <p className="text-sm text-gray-600 font-medium">{member?.jobTitle || 'Poste non défini'}</p>
                              <p className="text-xs text-gray-500">{member?.email || ''}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMember(member);
                            setShowRemoveMemberModal(true);
                          }}
                            className="text-gray-400 hover:text-red-600 text-xl p-1 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Retirer du membre"
                        >
                          ×
                        </button>
                      </div>
                      
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium text-gray-600">Département:</span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              member.departments && member.departments.length > 0
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {member.departments && member.departments.length > 0
                                ? member.departments.map(d => d.name).join(', ')
                                : 'Non assigné'}
                            </span>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAssignIndividualTarget(member)}
                            className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-medium py-2 px-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-sm hover:shadow-md"
                            disabled={loading}
                          >
                            <BoltIcon className="w-4 h-4 mr-1 inline" />
                            Objectif individuel
                          </button>
                        </div>
                        
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modern Footer */}
            <div className="flex justify-end pt-6 border-t border-gray-200">
              <button
                onClick={onClose}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-sm font-medium rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-md hover:shadow-lg"
                disabled={loading}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Team Objective Modal */}
      {showTeamObjectiveModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-[70] backdrop-blur-sm">
          <div className="relative top-10 mx-auto p-8 border-0 w-11/12 max-w-2xl shadow-2xl rounded-3xl bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Assigner un objectif à l'équipe</h3>
                    <p className="text-sm text-gray-600">Créez un nouvel objectif pour votre équipe</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTeamObjectiveModal(false)}
                  className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors duration-200"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Titre de l'objectif</label>
                  <input
                    type="text"
                    value={teamObjective.title}
                    onChange={(e) => setTeamObjective({...teamObjective, title: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                    placeholder="Ex: Améliorer les compétences React"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Description</label>
                  <textarea
                    value={teamObjective.description}
                    onChange={(e) => setTeamObjective({...teamObjective, description: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm resize-none"
                    rows="4"
                    placeholder="Description détaillée de l'objectif d'équipe"
                  />
                </div>
                
                {/* Category dropdown - First field for conditional rendering */}
                                 <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Catégorie</label>
                  <select
                    value={teamObjective.category}
                    onChange={(e) => setTeamObjective({...teamObjective, category: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                  >
                    <option value="">Sélectionner une catégorie</option>
                    <option value="personal_improvement">Amélioration personnelle</option>
                    <option value="company_project">Projet d'entreprise</option>
                  </select>
                </div>
                
                {/* Conditional rendering for Skill and Target Level - only show for Personal Improvement */}
                {teamObjective.category === 'personal_improvement' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">Compétence</label>
                   <select
                     value={teamObjective.skill}
                     onChange={(e) => setTeamObjective({...teamObjective, skill: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                   >
                     <option value="">Sélectionner une compétence</option>
                     {skills.map(skill => (
                       <option key={skill} value={skill}>{skill}</option>
                     ))}
                   </select>
                 </div>
                 
                 <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">Niveau cible</label>
                  <select
                    value={teamObjective.targetLevel}
                    onChange={(e) => setTeamObjective({...teamObjective, targetLevel: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                  >
                    {getSkillLevelOptions().map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                  </>
                )}
                
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Date limite</label>
                  <input
                    type="date"
                    value={teamObjective.deadline}
                    onChange={(e) => setTeamObjective({...teamObjective, deadline: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                  />
                </div>
                
                {/* File upload - available for all categories */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Fichiers joints (optionnel)</label>
                  <div className="space-y-3">
                    {/* File Input */}
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        const newFiles = Array.from(e.target.files);
                        setTeamObjective({
                          ...teamObjective, 
                          files: [...(teamObjective.files || []), ...newFiles]
                        });
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.txt,.zip"
                    />
                  <p className="text-xs text-gray-500 mt-2 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                      Formats acceptés: PDF, DOC, DOCX, JPG, JPEG, PNG, XLS, XLSX, TXT, ZIP (max 5MB par fichier)
                    </p>
                    
                    {/* Selected Files Preview */}
                    {teamObjective.files && teamObjective.files.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <h5 className="text-sm font-medium text-blue-800 mb-2">
                          Fichiers sélectionnés ({teamObjective.files.length})
                        </h5>
                        <div className="space-y-2">
                          {teamObjective.files.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-white rounded px-3 py-2">
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-sm text-gray-700">{file.name}</span>
                                <span className="text-xs text-gray-500">
                                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  setTeamObjective({
                                    ...teamObjective,
                                    files: teamObjective.files.filter((_, i) => i !== index)
                                  });
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowTeamObjectiveModal(false)}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  onClick={handleAssignTeamObjective}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    loading || 
                    !teamObjective.title || 
                    !teamObjective.description || 
                    !teamObjective.category || 
                    !teamObjective.deadline ||
                    (teamObjective.category === 'personal_improvement' && !teamObjective.skill)
                  }
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Assignation...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Assigner à l'équipe
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Objective Modal */}
      {showIndividualObjectiveModal && selectedMember && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-[70] backdrop-blur-sm">
          <div className="relative top-10 mx-auto p-8 border-0 w-11/12 max-w-2xl shadow-2xl rounded-3xl bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Assigner un objectif individuel</h3>
                    <p className="text-sm text-gray-600">Créez un objectif personnalisé pour ce membre</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIndividualObjectiveModal(false)}
                  className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors duration-200"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Employé</label>
                  <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl border border-green-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {getInitials(selectedMember?.firstName || '', selectedMember?.lastName || '')}
                    </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900 text-lg">
                          {selectedMember?.firstName || ''} {selectedMember?.lastName || ''}
                        </span>
                        <div className="text-sm text-gray-600">{selectedMember?.jobTitle || 'Poste non défini'}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Titre de l'objectif</label>
                  <input
                    type="text"
                    value={individualObjective.title}
                    onChange={(e) => setIndividualObjective({...individualObjective, title: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                    placeholder="Ex: Améliorer React"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Description</label>
                  <textarea
                    value={individualObjective.description}
                    onChange={(e) => setIndividualObjective({...individualObjective, description: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm resize-none"
                    rows="4"
                    placeholder="Description détaillée de l'objectif"
                  />
                </div>
                
                {/* Skill and Target Level - always shown since category is always "amélioration personnelle" */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">Compétence</label>
                   <select
                     value={individualObjective.skill}
                     onChange={(e) => setIndividualObjective({...individualObjective, skill: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                   >
                     <option value="">Sélectionner une compétence</option>
                     {skills.map(skill => (
                       <option key={skill} value={skill}>{skill}</option>
                     ))}
                   </select>
                 </div>
                 
                 <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">Niveau cible</label>
                  <select
                    value={individualObjective.targetLevel}
                    onChange={(e) => setIndividualObjective({...individualObjective, targetLevel: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                  >
                    {getSkillLevelOptions().map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Date limite</label>
                  <input
                    type="date"
                    value={individualObjective.deadline}
                    onChange={(e) => setIndividualObjective({...individualObjective, deadline: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                  />
                </div>
                
                {/* File upload - available for all categories */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Fichiers joints (optionnel)</label>
                  <div className="space-y-3">
                    {/* File Input */}
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        const newFiles = Array.from(e.target.files);
                        setIndividualObjective({
                          ...individualObjective, 
                          files: [...individualObjective.files, ...newFiles]
                        });
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.txt,.zip"
                    />
                  <p className="text-xs text-gray-500 mt-2 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                      Formats acceptés: PDF, DOC, DOCX, JPG, JPEG, PNG, XLS, XLSX, TXT, ZIP (max 5MB par fichier)
                    </p>
                    
                    {/* Selected Files Preview */}
                    {individualObjective.files.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <h5 className="text-sm font-medium text-blue-800 mb-2">
                          Fichiers sélectionnés ({individualObjective.files.length})
                        </h5>
                        <div className="space-y-2">
                          {individualObjective.files.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-white rounded px-3 py-2">
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-sm text-gray-700">{file.name}</span>
                                <span className="text-xs text-gray-500">
                                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  setIndividualObjective({
                                    ...individualObjective,
                                    files: individualObjective.files.filter((_, i) => i !== index)
                                  });
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowIndividualObjectiveModal(false)}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  onClick={handleAssignIndividualObjective}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    loading || 
                    !individualObjective.title || 
                    !individualObjective.description || 
                    !individualObjective.deadline ||
                    !individualObjective.skill
                  }
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Assignation...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Assigner
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-[70] backdrop-blur-sm">
          <div className="relative top-10 mx-auto p-8 border-0 w-11/12 max-w-2xl shadow-2xl rounded-3xl bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Ajouter un membre</h3>
                    <p className="text-sm text-gray-600">Recherchez et ajoutez un employé à votre équipe</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors duration-200"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Rechercher un employé</label>
                  <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                    placeholder="Nom, prénom ou email..."
                  />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Sélectionner un employé</label>
                  <select
                    value={selectedEmployeeToAdd}
                    onChange={(e) => setSelectedEmployeeToAdd(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                  >
                    <option value="">Sélectionner un employé</option>
                    {filteredEmployees.map(employee => (
                      <option key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName} ({employee.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddMember}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || !selectedEmployeeToAdd}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Ajout...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Ajouter
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      {showRemoveMemberModal && selectedMember && (
        <ConfirmationModal
          isOpen={showRemoveMemberModal}
          onClose={() => setShowRemoveMemberModal(false)}
          onConfirm={handleRemoveMember}
          title="Retirer le membre"
          message={`Êtes-vous sûr de vouloir retirer ${selectedMember.firstName} ${selectedMember.lastName} de l'équipe "${team.name}" ?`}
          confirmText="Retirer"
          cancelText="Annuler"
          loading={loading}
        />
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showUserProfileModal}
        onClose={() => {
          setShowUserProfileModal(false);
          setSelectedProfileId(null);
        }}
        userId={selectedProfileId}
        currentUserJobTitles={user?.currentJobTitles || []}
      />

      {/* Team Member Assignment Modal */}
      {showTeamMemberAssignmentModal && currentTeamObjective && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Assignation des objectifs d'équipe
                </h2>
                <p className="text-gray-600 mt-1">
                  Personnalisez les objectifs individuels pour chaque membre de l'équipe
                </p>
              </div>
              <button
                onClick={() => setShowTeamMemberAssignmentModal(false)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors duration-200"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Team Objective Summary */}
            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Objectif d'équipe: {currentTeamObjective.title}
              </h3>
              <p className="text-gray-700 mb-2">{currentTeamObjective.description}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>Catégorie: {getCategoryDisplayName(currentTeamObjective.category)}</span>
                <span>Échéance: {new Date(currentTeamObjective.deadline).toLocaleDateString('fr-FR')}</span>
                {currentTeamObjective.skillId && (
                  <span>Compétence: {skillOptions.find(s => s.id === currentTeamObjective.skillId)?.name}</span>
                )}
              </div>
            </div>

            {/* Team Member Assignments */}
            <div className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Objectifs individuels pour chaque membre
              </h4>
              
              <div className="space-y-4">
                {teamMemberAssignments.map((assignment, index) => (
                  <div key={assignment.userId} className="border border-gray-200 rounded-xl p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-gray-900">
                        {assignment.firstName} {assignment.lastName}
                      </h5>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Membre #{index + 1}</span>
                        <button
                          onClick={() => handleEditMember(assignment)}
                          className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium rounded-lg transition-colors"
                        >
                          Éditer
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Partial Target Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nom de l'objectif individuel
                        </label>
                        <input
                          type="text"
                          value={assignment.partialTargetName}
                          onChange={(e) => handleUpdatePartialTargetName(assignment.userId, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Nom de l'objectif individuel"
                        />
                      </div>
                      
                      {/* Custom Suffix */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Contexte supplémentaire (optionnel)
                        </label>
                        <input
                          type="text"
                          value={assignment.customSuffix}
                          onChange={(e) => handleUpdateCustomSuffix(assignment.userId, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="ex: (frontend), (backend), (design)"
                        />
                        <div className="mt-1 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateCustomSuffix(assignment.userId, '(frontend)')}
                            className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
                          >
                            (frontend)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateCustomSuffix(assignment.userId, '(backend)')}
                            className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors"
                          >
                            (backend)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateCustomSuffix(assignment.userId, '(design)')}
                            className="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-md transition-colors"
                          >
                            (design)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateCustomSuffix(assignment.userId, '(testing)')}
                            className="px-2 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-md transition-colors"
                          >
                            (testing)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateCustomSuffix(assignment.userId, '(devops)')}
                            className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
                          >
                            (devops)
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Individual Description */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description individuelle (optionnel)
                      </label>
                      <textarea
                        value={assignment.individualDescription}
                        onChange={(e) => handleUpdateIndividualDescription(assignment.userId, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows="3"
                        placeholder="Description détaillée spécifique à ce membre..."
                      />
                    </div>
                    

                    
                    {/* Individual Deadline */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date limite individuelle
                      </label>
                      <input
                        type="date"
                        value={assignment.individualDeadline}
                        onChange={(e) => handleUpdateIndividualDeadline(assignment.userId, e.target.value)}
                        max={currentTeamObjective.deadline}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Doit être avant ou égale à la date limite de l'équipe: {new Date(currentTeamObjective.deadline).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    
                    {/* Preview */}
                    <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg">
                      <span className="text-sm text-gray-600">Aperçu final:</span>
                      <div className="font-medium text-gray-900 mt-1">
                        {assignment.partialTargetName}
                        {assignment.customSuffix && (
                          <span className="text-blue-600"> {assignment.customSuffix}</span>
                        )}
                      </div>
                      {assignment.individualDescription && (
                        <div className="text-sm text-gray-600 mt-2">
                          <strong>Description:</strong> {assignment.individualDescription}
                        </div>
                      )}

                      <div className="text-xs text-gray-500 mt-2">
                        <strong>Échéance:</strong> {new Date(assignment.individualDeadline).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-4 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowTeamMemberAssignmentModal(false)}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                onClick={handleFinalizeTeamObjective}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Création...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Créer l'objectif d'équipe
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Edit Modal */}
      {showMemberEditModal && selectedMemberForEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Éditer l'objectif de {selectedMemberForEdit.firstName} {selectedMemberForEdit.lastName}
                </h2>
                <p className="text-gray-600 mt-1">
                  Personnalisez les détails spécifiques pour ce membre
                </p>
              </div>
              <button
                onClick={() => setShowMemberEditModal(false)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors duration-200"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Member Edit Form */}
            <div className="p-6 space-y-6">
              {/* Individual Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Description individuelle
                </label>
                <textarea
                  value={selectedMemberForEdit.individualDescription}
                  onChange={(e) => handleUpdateIndividualDescription(selectedMemberForEdit.userId, e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm resize-none"
                  rows="4"
                  placeholder="Description détaillée spécifique à ce membre..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cette description sera visible uniquement par ce membre
                </p>
              </div>

              {/* Individual File */}


              {/* Individual Deadline */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Date limite individuelle
                </label>
                <input
                  type="date"
                  value={selectedMemberForEdit.individualDeadline}
                  onChange={(e) => handleUpdateIndividualDeadline(selectedMemberForEdit.userId, e.target.value)}
                  max={currentTeamObjective.deadline}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Doit être avant ou égale à la date limite de l'équipe: {new Date(currentTeamObjective.deadline).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-4 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowMemberEditModal(false)}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Performance Dashboard */}
      {showPerformanceDashboard && (
        <TeamPerformanceDashboard
          team={team}
          onClose={() => setShowPerformanceDashboard(false)}
        />
      )}

      {/* Individual Target Assignment Modal */}
      {showIndividualTargetModal && selectedEmployeeForTarget && (
        <IndividualTargetModal
          employee={selectedEmployeeForTarget}
          team={team}
          isOpen={showIndividualTargetModal}
          onClose={() => {
            console.log('✅ TeamDetailModal: Individual target modal closing');
            setShowIndividualTargetModal(false);
            setSelectedEmployeeForTarget(null);
          }}
          onSuccess={handleTargetAssignmentSuccess}
        />
      )}

    </>
  );
};

export default TeamDetailModal;
