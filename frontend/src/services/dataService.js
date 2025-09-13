import apiService from './api';
import toast from 'react-hot-toast';

class DataService {
  // Skills
  async getSkills(params = {}) {
    try {
      console.log('🔍 DataService: Calling getSkills()');
      const response = await apiService.getAllSkills(params);
      console.log('✅ DataService: getSkills response:', response);
      console.log('✅ DataService: getSkills response length:', response.skills?.length || 0);
      return response.skills || [];
    } catch (error) {
      console.error('❌ DataService: Error fetching skills:', error);
      toast.error('Erreur lors du chargement des compétences');
      return [];
    }
  }

  async getSkillById(skillId) {
    try {
      const response = await apiService.getSkillById(skillId);
      return response;
    } catch (error) {
      console.error('Error fetching skill:', error);
      toast.error('Erreur lors du chargement de la compétence');
      throw error;
    }
  }

  async createSkill(skillData) {
    try {
      const response = await apiService.createSkill(skillData);
      toast.success('Compétence créée avec succès');
      return response;
    } catch (error) {
      console.error('Error creating skill:', error);
      toast.error(error.message || 'Erreur lors de la création de la compétence');
      throw error;
    }
  }

  async updateSkill(skillId, skillData) {
    try {
      const response = await apiService.updateSkill(skillId, skillData);
      toast.success('Compétence mise à jour avec succès');
      return response;
    } catch (error) {
      console.error('Error updating skill:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour de la compétence');
      throw error;
    }
  }

  async deleteSkill(skillId) {
    try {
      const response = await apiService.deleteSkill(skillId);
      return response;
    } catch (error) {
      console.error('Error deleting skill:', error);
      toast.error(error.message || 'Erreur lors de la suppression de la compétence');
      throw error;
    }
  }

  // Skill Requests
  async getSkillRequests(params = {}) {
    try {
      console.log('🔍 DataService: Calling getSkillRequests with params:', params);
      const response = await apiService.getAllSkillRequests(params);
      console.log('✅ DataService: getSkillRequests response:', response);
      console.log('✅ DataService: getSkillRequests requests array:', response.requests);
      console.log('✅ DataService: getSkillRequests count:', response.requests?.length || 0);
      // Return just the requests array, not the full response object
      return response.requests || [];
    } catch (error) {
      console.error('❌ DataService: Error fetching skill requests:', error);
      toast.error('Erreur lors du chargement des demandes de compétences');
      return [];
    }
  }

  // Manager-specific skill requests (now includes progression requests too)
  async getManagerSkillRequests(params = {}) {
    try {
      console.log('🔍 DataService: Calling getManagerSkillRequests with params:', params);
      const response = await apiService.getMyManagerSkillRequests(params);
      console.log('✅ DataService: getManagerSkillRequests response:', response);
      console.log('✅ DataService: getManagerSkillRequests skillRequests array:', response.skillRequests);
      console.log('✅ DataService: getManagerSkillRequests progressionRequests array:', response.progressionRequests);
      console.log('✅ DataService: getManagerSkillRequests allRequests array:', response.allRequests);
      // Return just the skill requests array for backward compatibility
      return response.skillRequests || [];
    } catch (error) {
      console.error('❌ DataService: Error fetching manager skill requests:', error);
      toast.error('Erreur lors du chargement des demandes de compétences du manager');
      return [];
    }
  }

  // Manager-specific progression requests (now gets from skill requests endpoint)
  async getManagerProgressionRequests(params = {}) {
    try {
      console.log('🔍 DataService: Calling getManagerProgressionRequests with params:', params);
      const response = await apiService.getMyManagerSkillRequests(params);
      console.log('✅ DataService: getManagerProgressionRequests response:', response);
      console.log('✅ DataService: getManagerProgressionRequests progressionRequests array:', response.progressionRequests);
      console.log('✅ DataService: getManagerProgressionRequests count:', response.progressionRequests?.length || 0);
      // Return just the progression requests array
      return response.progressionRequests || [];
    } catch (error) {
      console.error('❌ DataService: Error fetching manager progression requests:', error);
      toast.error('Erreur lors du chargement des demandes de progression du manager');
      return [];
    }
  }

  async getMySkillRequests(params = {}) {
    try {
      const response = await apiService.getMySkillRequests(params);
      return response;
    } catch (error) {
      console.error('Error fetching my skill requests:', error);
      // Don't show error toast for normal empty responses
      if (error.response?.status !== 404) {
        toast.error('Erreur lors du chargement de vos demandes');
      }
      throw error;
    }
  }

  async getSkillRequestById(requestId) {
    try {
      const response = await apiService.getSkillRequestById(requestId);
      return response;
    } catch (error) {
      console.error('Error fetching skill request:', error);
      toast.error('Erreur lors du chargement de la demande');
      throw error;
    }
  }

  async createSkillRequest(requestData) {
    try {
      const response = await apiService.createSkillRequest(requestData);
      toast.success('Demande de compétence créée avec succès');
      return response;
    } catch (error) {
      console.error('Error creating skill request:', error);
      toast.error(error.message || 'Erreur lors de la création de la demande');
      throw error;
    }
  }

  async approveSkillRequest(requestId, comment, approvedLevel, modifiedSkillName, modifiedSkillDescription) {
    try {
      const response = await apiService.approveSkillRequest(requestId, comment, approvedLevel, modifiedSkillName, modifiedSkillDescription);
      toast.success('Demande approuvée avec succès');
      return response;
    } catch (error) {
      console.error('Error approving skill request:', error);
      toast.error(error.message || 'Erreur lors de l\'approbation de la demande');
      throw error;
    }
  }

  async rejectSkillRequest(requestId, comment) {
    try {
      const response = await apiService.rejectSkillRequest(requestId, comment);
      toast.success('Demande rejetée');
      return response;
    } catch (error) {
      console.error('Error rejecting skill request:', error);
      toast.error(error.message || 'Erreur lors du rejet de la demande');
      throw error;
    }
  }

  async markSkillRequestAsSeen(requestId) {
    try {
      const response = await apiService.markSkillRequestAsSeen(requestId);
      return response;
    } catch (error) {
      console.error('Error marking skill request as seen:', error);
      throw error;
    }
  }

  async dismissSkillRequest(requestId) {
    try {
      const response = await apiService.dismissSkillRequest(requestId);
      toast.success('Demande archivée avec succès');
      return response;
    } catch (error) {
      console.error('Error dismissing skill request:', error);
      toast.error('Erreur lors de l\'archivage de la demande');
      throw error;
    }
  }

  // Objectives
  async getObjectives(params = {}) {
    try {
      // Get user role from localStorage to determine which endpoint to use
      const userRole = localStorage.getItem('userRole');
      
      if (userRole === 'manager') {
        // Managers should use the current-manager-view endpoint to only see objectives from teams they currently manage
        console.log('🔧 Using current-manager-view endpoint for managers');
        const response = await apiService.getCurrentManagerObjectives(params);
        return response.objectives || [];
      } else {
        // Employees and admins use the main objectives endpoint
        console.log('🔧 Using main objectives endpoint for employees/admins');
        const response = await apiService.getAllObjectives(params);
        return response.objectives || [];
      }
    } catch (error) {
      console.error('Error fetching objectives:', error);
      toast.error('Erreur lors du chargement des objectifs');
      return []; // Return empty array directly
    }
  }

  async getMyObjectives() {
    try {
      const response = await apiService.getMyObjectives();
      return response.objectives || [];
    } catch (error) {
      console.error('Error fetching my objectives:', error);
      toast.error('Erreur lors du chargement de vos objectifs');
      return [];
    }
  }

  async getManagerObjectives(params = {}) {
    try {
      const response = await apiService.getManagerObjectives(params);
      return response.objectives || [];
    } catch (error) {
      console.error('Error fetching manager objectives:', error);
      toast.error('Erreur lors du chargement des objectifs');
      return [];
    }
  }

  // NEW: Get objectives based on CURRENT team management (not creator)
  async getCurrentManagerObjectives(params = {}) {
    try {
      const response = await apiService.getCurrentManagerObjectives(params);
      return response; // Return the full response object, not just response.objectives
    } catch (error) {
      console.error('Error fetching current manager objectives:', error);
      toast.error('Erreur lors du chargement des objectifs actuels');
      return { objectives: [] };
    }
  }

  // NEW: Get team objective with individual targets
  async getTeamObjectiveWithIndividualTargets(objectiveId) {
    try {
      const response = await apiService.getTeamObjectiveWithIndividualTargets(objectiveId);
      return response;
    } catch (error) {
      console.error('Error fetching team objective with individual targets:', error);
      toast.error('Erreur lors du chargement des détails de l\'objectif d\'équipe');
      return null;
    }
  }

  // Get file attachments for an objective
  async getObjectiveAttachments(objectiveId, individualTargetId = null) {
    try {
      const response = await apiService.getObjectiveAttachments(objectiveId, individualTargetId);
      return response.attachments || [];
    } catch (error) {
      console.error('Error fetching objective attachments:', error);
      return [];
    }
  }

  async attachObjectiveFiles(objectiveId, files) {
    try {
      return await apiService.attachObjectiveFiles(objectiveId, files);
    } catch (error) {
      console.error('Error attaching files to objective:', error);
      throw error;
    }
  }

  async getObjectiveById(objectiveId) {
    try {
      const response = await apiService.getObjectiveById(objectiveId);
      return response;
    } catch (error) {
      console.error('Error fetching objective:', error);
      toast.error('Erreur lors du chargement de l\'objectif');
      throw error;
    }
  }

  async createObjective(objectiveData) {
    try {
      console.log('🔍 DataService: Creating objective with data:', objectiveData);
      const response = await apiService.createObjective(objectiveData);
      console.log('✅ DataService: Objective created successfully:', response);
      toast.success('Objectif créé avec succès');
      return response;
    } catch (error) {
      console.error('❌ DataService: Error creating objective:', error);
      console.error('❌ DataService: Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
      toast.error(error.message || 'Erreur lors de la création de l\'objectif');
      throw error;
    }
  }

  async createIndividualTarget(objectiveData) {
    try {
      console.log('🔍 DataService: Creating individual target with data:', objectiveData);
      const response = await apiService.createIndividualTarget(objectiveData);
      console.log('✅ DataService: Individual target created successfully:', response);
      toast.success('Objectif individuel créé avec succès');
      return response;
    } catch (error) {
      console.error('❌ DataService: Error creating individual target:', error);
      console.error('❌ DataService: Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
      toast.error(error.message || 'Erreur lors de la création de l\'objectif individuel');
      throw error;
    }
  }

  async createTeamIndividualTargets(objectiveData) {
    try {
      console.log('🔍 DataService: Creating team individual targets with data:', objectiveData);
      const response = await apiService.createTeamIndividualTargets(objectiveData);
      console.log('✅ DataService: Team individual targets created successfully:', response);
      toast.success(`Objectifs individuels créés avec succès pour ${response.totalMembers} membres d'équipe`);
      return response;
    } catch (error) {
      console.error('❌ DataService: Error creating team individual targets:', error);
      console.error('❌ DataService: Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
      toast.error(error.message || 'Erreur lors de la création des objectifs individuels d\'équipe');
      throw error;
    }
  }

  async createTeamIndividualTargetsSimple(objectiveData) {
    try {
      console.log('🔍 DataService: Creating team individual targets (simple) with data:', objectiveData);
      const response = await apiService.createTeamIndividualTargetsSimple(objectiveData);
      console.log('✅ DataService: Team individual targets (simple) created successfully:', response);
      toast.success(`Objectifs individuels créés avec succès pour ${response.createdTargets || response.createdObjectives?.length || 0} membres d'équipe`);
      return response;
    } catch (error) {
      console.error('❌ DataService: Error creating team individual targets (simple):', error);
      console.error('❌ DataService: Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
      toast.error(error.message || 'Erreur lors de la création des objectifs individuels d\'équipe');
      throw error;
    }
  }

  async createTeamTarget(teamTargetData) {
    try {
      const response = await apiService.createTeamTarget(teamTargetData);
      toast.success('Objectif d\'équipe créé avec succès');
      return response;
    } catch (error) {
      console.error('Error creating team target:', error);
      toast.error(error.message || 'Erreur lors de la création de l\'objectif d\'équipe');
      throw error;
    }
  }

  async updateObjective(objectiveId, objectiveData) {
    try {
      const response = await apiService.updateObjective(objectiveId, objectiveData);
      toast.success('Objectif mis à jour avec succès');
      return response;
    } catch (error) {
      console.error('Error updating objective:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour de l\'objectif');
      throw error;
    }
  }

  async deleteObjective(objectiveId) {
    try {
      await apiService.deleteObjective(objectiveId);
      toast.success('Objectif supprimé avec succès');
    } catch (error) {
      console.error('Error deleting objective:', error);
      toast.error(error.message || 'Erreur lors de la suppression de l\'objectif');
      throw error;
    }
  }

  async deleteIndividualTarget(targetId) {
    try {
      await apiService.deleteIndividualTarget(targetId);
      toast.success('Objectif individuel supprimé avec succès');
    } catch (error) {
      console.error('Error deleting individual target:', error);
      toast.error(error.message || 'Erreur lors de la suppression de l\'objectif individuel');
      throw error;
    }
  }

  async deleteContribution(contributionId) {
    try {
      await apiService.deleteContribution(contributionId);
      toast.success('Contribution supprimée avec succès');
    } catch (error) {
      console.error('Error deleting contribution:', error);
      toast.error(error.message || 'Erreur lors de la suppression de la contribution');
      throw error;
    }
  }

  async updateObjectiveProgress(objectiveId, progressData) {
    try {
      const response = await apiService.updateObjectiveProgress(objectiveId, progressData);
      toast.success('Progression mise à jour avec succès');
      return response;
    } catch (error) {
      console.error('Error updating objective progress:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour de la progression');
      throw error;
    }
  }

  async updateContributionProgress(contributionId, progressData) {
    try {
      const response = await apiService.updateContributionProgress(contributionId, progressData);
      toast.success('Progression mise à jour avec succès');
      return response;
    } catch (error) {
      console.error('Error updating contribution progress:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour de la progression');
      throw error;
    }
  }

  async getContributionByObjectiveId(objectiveId) {
    try {
      console.log('🔍 DataService: Getting contribution by objective ID:', objectiveId);
      const response = await apiService.getContributionByObjectiveId(objectiveId);
      console.log('✅ DataService: Contribution response:', response);
      return response;
    } catch (error) {
      console.error('Error getting contribution by objective ID:', error);
      throw error;
    }
  }

  async updatePartialTargetProgress(objectiveId, progressData) {
    try {
      console.log('🔍 DataService: Updating partial target progress:', objectiveId, progressData);
      const response = await apiService.updatePartialTargetProgress(objectiveId, progressData);
      console.log('✅ DataService: Partial target progress update response:', response);
      return response;
    } catch (error) {
      console.error('Error updating partial target progress:', error);
      throw error;
    }
  }

  // Teams
  async getTeams(params = {}) {
    try {
      console.log('🔍 DataService: Calling getTeams()');
      const response = await apiService.getAllTeams(params);
      console.log('✅ DataService: getTeams response:', response);
      console.log('✅ DataService: getTeams teams array:', response.teams);
      console.log('✅ DataService: getTeams count:', response.teams?.length || 0);
      return response.teams || [];
    } catch (error) {
      console.error('❌ DataService: Error fetching teams:', error);
      toast.error('Erreur lors du chargement des équipes');
      return [];
    }
  }

  async getTeamsForObjectives() {
    try {
      console.log('🔍 DataService: Calling getTeamsForObjectives()');
      const response = await apiService.getTeamsForObjectives();
      console.log('✅ DataService: getTeamsForObjectives response:', response);
      return response.teams || [];
    } catch (error) {
      console.error('❌ DataService: Error fetching teams for objectives:', error);
      toast.error('Erreur lors du chargement des équipes');
      return [];
    }
  }

  async getJobTitleObjectives() {
    try {
      console.log('🔍 DataService: Calling getJobTitleObjectives()');
      const response = await apiService.getJobTitleObjectives();
      console.log('✅ DataService: getJobTitleObjectives response:', response);
      return response || [];
    } catch (error) {
      console.error('❌ DataService: Error fetching job title objectives:', error);
      toast.error('Erreur lors du chargement des objectifs de titres de poste');
      return [];
    }
  }

  async getMyTeams() {
    try {
      console.log('🔍 DataService: Calling getMyTeams()');
      const response = await apiService.getMyTeams();
      console.log('✅ DataService: getMyTeams response:', response);
      
      // The backend returns { managedTeams, memberTeams, totalTeams }
      // We need to combine both arrays and add a relationship field
      const managedTeams = response.managedTeams || [];
      const memberTeams = response.memberTeams || [];
      
      // Combine both arrays
      const allTeams = [...managedTeams, ...memberTeams];
      
      console.log('✅ DataService: Combined teams:', allTeams.length);
      return allTeams;
    } catch (error) {
      console.error('❌ DataService: Error fetching my teams:', error);
      toast.error('Erreur lors du chargement de vos équipes');
      return [];
    }
  }

  async getManagerTeams() {
    try {
      console.log('🔍 DataService: Calling getManagerTeams()');
      const response = await apiService.getManagerTeams();
      console.log('✅ DataService: getManagerTeams response:', response);
      
      // The backend returns { managedTeams, memberTeams, totalTeams }
      const managedTeams = response.managedTeams || [];
      const memberTeams = response.memberTeams || [];
      
      // For manager dashboard, we primarily want managed teams
      const allTeams = [...managedTeams, ...memberTeams];
      
      console.log('✅ DataService: Manager teams:', allTeams.length);
      return allTeams;
    } catch (error) {
      console.error('❌ DataService: Error fetching manager teams:', error);
      toast.error('Erreur lors du chargement des équipes gérées');
      return [];
    }
  }

  async getMonthlyActivity(year, month) {
    try {
      console.log('🔍 DataService: Calling getMonthlyActivity()');
      const response = await apiService.getMonthlyActivity(year, month);
      console.log('✅ DataService: getMonthlyActivity response:', response);
      return response;
    } catch (error) {
      console.error('❌ DataService: Error fetching monthly activity:', error);
      toast.error('Erreur lors du chargement des données d\'activité mensuelle');
      return {
        dailyActivity: [],
        summary: {
          totalRequests: 0,
          totalObjectives: 0,
          approvedRequests: 0,
          completedObjectives: 0
        }
      };
    }
  }

  async getTeamMembers(teamId) {
    try {
      console.log('🔍 DataService: Calling getTeamMembers for teamId:', teamId);
      const response = await apiService.getTeamMembers(teamId);
      console.log('✅ DataService: getTeamMembers response:', response);
      return response.members || [];
    } catch (error) {
      console.error('❌ DataService: Error fetching team members:', error);
      toast.error('Erreur lors du chargement des membres de l\'équipe');
      return [];
    }
  }

  async addTeamMember(teamId, userId) {
    try {
      const response = await apiService.addTeamMember(teamId, userId);
      toast.success('Membre ajouté à l\'équipe avec succès');
      return response;
    } catch (error) {
      console.error('Error adding team member:', error);
      toast.error(error.message || 'Erreur lors de l\'ajout du membre');
      throw error;
    }
  }

  async removeTeamMember(teamId, userId) {
    try {
      const response = await apiService.removeTeamMember(teamId, userId);
      toast.success('Membre retiré de l\'équipe avec succès');
      return response;
    } catch (error) {
      console.error('Error removing team member:', error);
      toast.error(error.message || 'Erreur lors du retrait du membre');
      throw error;
    }
  }

  async getMyTeamMembers() {
    try {
      console.log('🔍 DataService: Calling getMyTeamMembers()');
      const response = await apiService.getMyTeamMembers();
      console.log('✅ DataService: getMyTeamMembers response:', response);
      return response.teamMembers || [];
    } catch (error) {
      console.error('❌ DataService: Error fetching my team members:', error);
      toast.error('Erreur lors du chargement des membres de l\'équipe');
      return [];
    }
  }

  async getMyManagerSkillRequests() {
    try {
      const response = await apiService.getMyManagerSkillRequests();
      return response.skillRequests || [];
    } catch (error) {
      console.error('Error fetching my skill requests:', error);
      toast.error('Erreur lors du chargement des demandes de compétences');
      return [];
    }
  }

  async getManagerRecentActivities() {
    try {
      const response = await apiService.getManagerRecentActivities();
      return response.activities || [];
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      toast.error('Erreur lors du chargement des activités récentes');
      return [];
    }
  }

  async getManagerUpcomingDeadlines() {
    try {
      const response = await apiService.getManagerUpcomingDeadlines();
      return response.deadlines || [];
    } catch (error) {
      console.error('Error fetching upcoming deadlines:', error);
      toast.error('Erreur lors du chargement des échéances à venir');
      return [];
    }
  }

  async getMyEmployeeSkills() {
    try {
      const response = await apiService.getMyEmployeeSkills();
      return response.skills || [];
    } catch (error) {
      console.error('Error fetching my skills:', error);
      toast.error('Erreur lors du chargement de vos compétences');
      return [];
    }
  }

  async getAllUserSkills() {
    try {
      const response = await apiService.getAllUserSkills();
      return response.userSkills || [];
    } catch (error) {
      console.error('Error fetching all user skills:', error);
      toast.error('Erreur lors du chargement des compétences utilisateurs');
      return [];
    }
  }

  async getMyEmployeeObjectives() {
    try {
      const response = await apiService.getMyEmployeeObjectives();
      return response.objectives || [];
    } catch (error) {
      console.error('Error fetching my objectives:', error);
      toast.error('Erreur lors du chargement de vos objectifs');
      return [];
    }
  }

  async getMyManagerObjectives() {
    try {
      const response = await apiService.getMyManagerObjectives();
      return response.objectives || [];
    } catch (error) {
      console.error('Error fetching manager objectives:', error);
      toast.error('Erreur lors du chargement des objectifs du manager');
      return [];
    }
  }

  async getTeamById(teamId) {
    try {
      const response = await apiService.getTeamById(teamId);
      return response;
    } catch (error) {
      console.error('Error fetching team:', error);
      toast.error('Erreur lors du chargement de l\'équipe');
      throw error;
    }
  }

  async createTeam(teamData) {
    try {
      const response = await apiService.createTeam(teamData);
      toast.success('Équipe créée avec succès');
      return response;
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error(error.message || 'Erreur lors de la création de l\'équipe');
      throw error;
    }
  }

  async updateTeam(teamId, teamData) {
    try {
      const response = await apiService.updateTeam(teamId, teamData);
      toast.success('Équipe mise à jour avec succès');
      return response;
    } catch (error) {
      console.error('Error updating team:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour de l\'équipe');
      throw error;
    }
  }

  async deleteTeam(teamId) {
    try {
      await apiService.deleteTeam(teamId);
      toast.success('Équipe supprimée avec succès');
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error(error.message || 'Erreur lors de la suppression de l\'équipe');
      throw error;
    }
  }

  // Departments
  async getDepartments(params = {}) {
    try {
      console.log('🔍 DataService: Calling getDepartments()');
      const response = await apiService.getAllDepartments(params);
      console.log('✅ DataService: getDepartments response length:', response.departments?.length || 0);
      return response.departments || [];
    } catch (error) {
      console.error('❌ DataService: Error fetching departments:', error);
      toast.error('Erreur lors du chargement des départements');
      return [];
    }
  }

  async getDepartmentById(departmentId) {
    try {
      const response = await apiService.getDepartmentById(departmentId);
      return response;
    } catch (error) {
      console.error('Error fetching department:', error);
      toast.error('Erreur lors du chargement du département');
      throw error;
    }
  }

  async createDepartment(departmentData) {
    try {
      const response = await apiService.createDepartment(departmentData);
      toast.success('Département créé avec succès');
      return response;
    } catch (error) {
      console.error('Error creating department:', error);
      toast.error(error.message || 'Erreur lors de la création du département');
      throw error;
    }
  }

  async updateDepartment(departmentId, departmentData) {
    try {
      const response = await apiService.updateDepartment(departmentId, departmentData);
      toast.success('Département mis à jour avec succès');
      return response;
    } catch (error) {
      console.error('Error updating department:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour du département');
      throw error;
    }
  }

  async deleteDepartment(departmentId) {
    try {
      await apiService.deleteDepartment(departmentId);
      toast.success('Département supprimé avec succès');
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error(error.message || 'Erreur lors de la suppression du département');
      throw error;
    }
  }

  async removeTeamFromDepartment(departmentId, teamId) {
    try {
      const response = await apiService.removeTeamFromDepartment(departmentId, teamId);
      toast.success('Équipe retirée du département avec succès');
      return response;
    } catch (error) {
      console.error('Error removing team from department:', error);
      toast.error(error.message || 'Erreur lors du retrait de l\'équipe');
      throw error;
    }
  }

  async getDepartmentEmployees(departmentId) {
    try {
      const response = await apiService.getDepartmentEmployees(departmentId);
      return response.employees || [];
    } catch (error) {
      console.error('Error fetching department employees:', error);
      toast.error('Erreur lors du chargement des employés du département');
      return [];
    }
  }



  // Users
  async getUsers(params = {}) {
    try {
      const response = await apiService.getAllUsers(params);
      return response.users || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
      return [];
    }
  }

  async getUserById(userId) {
    try {
      const response = await apiService.getUserById(userId);
      return response;
    } catch (error) {
      console.error('Error fetching user:', error);
      toast.error('Erreur lors du chargement de l\'utilisateur');
      throw error;
    }
  }

  async getUserProfile(userId) {
    try {
      const response = await apiService.getUserProfile(userId);
      return response;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Erreur lors du chargement du profil utilisateur');
      throw error;
    }
  }

  async getPublicUserProfile(userId) {
    try {
      const response = await apiService.getPublicUserProfile(userId);
      return response;
    } catch (error) {
      console.error('Error fetching public user profile:', error);
      toast.error('Erreur lors du chargement du profil public');
      throw error;
    }
  }

  async getSidebarStats() {
    try {
      const response = await apiService.getSidebarStats();
      return response.stats || {};
    } catch (error) {
      console.error('Error fetching sidebar stats:', error);
      return {};
    }
  }

  async getUserSkills(userId) {
    try {
      const response = await apiService.getUserSkills(userId);
      return response.skills || [];
    } catch (error) {
      console.error('Error fetching user skills:', error);
      toast.error('Erreur lors du chargement des compétences utilisateur');
      return [];
    }
  }

  async getMySkills() {
    try {
      const response = await apiService.getMySkills();
      return response.skills || [];
    } catch (error) {
      console.error('Error fetching my skills:', error);
      toast.error('Erreur lors du chargement de vos compétences');
      return [];
    }
  }



  async getMyDepartments() {
    try {
      console.log('🔍 DataService: Calling getMyDepartments()');
      const response = await apiService.getMyDepartments();
      console.log('✅ DataService: getMyDepartments response:', response);
      
      // The backend returns { managedDepartments, memberDepartments, totalDepartments }
      // We need to combine both arrays
      const managedDepartments = response.managedDepartments || [];
      const memberDepartments = response.memberDepartments || [];
      
      // Combine both arrays
      const allDepartments = [...managedDepartments, ...memberDepartments];
      
      console.log('✅ DataService: Combined departments:', allDepartments.length);
      return allDepartments;
    } catch (error) {
      console.error('❌ DataService: Error fetching my departments:', error);
      toast.error('Erreur lors du chargement des départements');
      return [];
    }
  }

  async getMyManagers() {
    try {
      console.log('🔍 DataService: Calling getMyManagers()');
      const response = await apiService.getMyManagers();
      console.log('✅ DataService: getMyManagers response:', response);
      return response.managers || [];
    } catch (error) {
      console.error('❌ DataService: Error fetching my managers:', error);
      toast.error('Erreur lors du chargement des managers');
      return [];
    }
  }

  async getMyApprovers() {
    try {
      console.log('🔍 DataService: Calling getMyApprovers()');
      const response = await apiService.getMyApprovers();
      console.log('✅ DataService: getMyApprovers response:', response);
      return response.approvers || [];
    } catch (error) {
      console.error('❌ DataService: Error fetching my approvers:', error);
      toast.error('Erreur lors du chargement des approbateurs');
      return [];
    }
  }

  async getUserObjectives(userId, params = {}) {
    try {
      const response = await apiService.getUserObjectives(userId, params);
      return response.objectives || [];
    } catch (error) {
      console.error('Error fetching user objectives:', error);
      toast.error('Erreur lors du chargement des objectifs utilisateur');
      return [];
    }
  }


  // Objective contributions methods
  async getObjectiveContributions(objectiveId) {
    try {
      const response = await apiService.getObjectiveContributions(objectiveId);
      return response.contributions || [];
    } catch (error) {
      console.error('Error fetching objective contributions:', error);
      toast.error('Erreur lors du chargement des contributions');
      return [];
    }
  }

  async createObjectiveContribution(objectiveId, contributionData) {
    try {
      const response = await apiService.createObjectiveContribution(objectiveId, contributionData);
      toast.success('Contribution créée avec succès');
      return response.contribution;
    } catch (error) {
      console.error('Error creating objective contribution:', error);
      toast.error(error.message || 'Erreur lors de la création de la contribution');
      throw error;
    }
  }

  async updateObjectiveContribution(contributionId, contributionData) {
    try {
      const response = await apiService.updateObjectiveContribution(contributionId, contributionData);
      toast.success('Contribution mise à jour avec succès');
      return response.contribution;
    } catch (error) {
      console.error('Error updating objective contribution:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour de la contribution');
      throw error;
    }
  }

  async deleteObjectiveContribution(contributionId) {
    try {
      await apiService.deleteObjectiveContribution(contributionId);
      toast.success('Contribution supprimée avec succès');
    } catch (error) {
      console.error('Error deleting objective contribution:', error);
      toast.error(error.message || 'Erreur lors de la suppression de la contribution');
      throw error;
    }
  }

  async getObjectiveUpdates(objectiveId) {
    try {
      const response = await apiService.getObjectiveUpdates(objectiveId);
      return response;
    } catch (error) {
      console.error('Error fetching objective updates:', error);
      toast.error('Erreur lors du chargement de l\'historique');
      throw error;
    }
  }

  // Employee organization methods
  async getMyOrganization() {
    try {
      const response = await apiService.getMyOrganization();
      return {
        departments: response.departments || [],
        teams: response.teams || [],
        colleagues: response.colleagues || []
      };
    } catch (error) {
      console.error('Error fetching organization data:', error);
      toast.error('Erreur lors du chargement des données organisationnelles');
      return { departments: [], teams: [], colleagues: [] };
    }
  }



  async createUser(userData) {
    try {
      const response = await apiService.createUser(userData);
      toast.success('Utilisateur créé avec succès');
      return response;
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Erreur lors de la création de l\'utilisateur');
      throw error;
    }
  }

  async updateUser(userId, userData) {
    try {
      const response = await apiService.updateUser(userId, userData);
      toast.success('Utilisateur mis à jour avec succès');
      return response;
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour de l\'utilisateur');
      throw error;
    }
  }

  async updateUserStatus(userId, status) {
    try {
      const response = await apiService.updateUserStatus(userId, status);
      toast.success(`Utilisateur ${status === 'active' ? 'activé' : 'désactivé'} avec succès`);
      return response;
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour du statut');
      throw error;
    }
  }

  async addUserToTeam(userId, teamId) {
    try {
      const response = await apiService.addUserToTeam(userId, teamId);
      return response;
    } catch (error) {
      console.error('Error adding user to team:', error);
      throw error;
    }
  }

  async deleteUser(userId) {
    try {
      await apiService.deleteUser(userId);
      toast.success('Utilisateur supprimé avec succès');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Erreur lors de la suppression de l\'utilisateur');
      throw error;
    }
  }

  async cleanupDuplicateUsers() {
    try {
      const result = await apiService.cleanupDuplicateUsers();
      toast.success(`Nettoyage terminé: ${result.deletedCount} utilisateurs dupliqués supprimés`);
      return result;
    } catch (error) {
      console.error('Error cleaning up duplicate users:', error);
      toast.error(error.message || 'Erreur lors du nettoyage des utilisateurs dupliqués');
      throw error;
    }
  }



  // Authentication
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await apiService.changePassword(currentPassword, newPassword);
      return response;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  // Search
  async search(query, type = null, params = {}) {
    try {
      const response = await apiService.search(query, type, params);
      return response;
    } catch (error) {
      console.error('Error searching:', error);
      toast.error('Erreur lors de la recherche');
      return { results: {}, totalResults: 0 };
    }
  }

  async getSearchSuggestions(query) {
    try {
      const response = await apiService.getSearchSuggestions(query);
      return response.suggestions || [];
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }

  // Notifications
  async getNotifications(params = {}) {
    try {
      const response = await apiService.getAllNotifications(params);
      return response;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Erreur lors du chargement des notifications');
      return { notifications: [], unreadCount: 0, total: 0 };
    }
  }

  async markNotificationAsRead(notificationId) {
    try {
      const response = await apiService.markNotificationAsRead(notificationId);
      return response;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Files
  async getFiles(params = {}) {
    try {
      const response = await apiService.getAllFiles(params);
      return response.files || [];
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Erreur lors du chargement des fichiers');
      return [];
    }
  }

  async uploadFile(file, onProgress = null) {
    try {
      const response = await apiService.uploadFile(file, onProgress);
      toast.success('Fichier téléchargé avec succès');
      return response;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error.message || 'Erreur lors du téléchargement du fichier');
      throw error;
    }
  }

  async deleteFile(fileId) {
    try {
      await apiService.deleteFile(fileId);
      toast.success('Fichier supprimé avec succès');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error(error.message || 'Erreur lors de la suppression du fichier');
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await apiService.healthCheck();
      return response;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // Skill analytics methods
  async getSkillUsers(skillId, params = {}) {
    try {
      const response = await apiService.getSkillUsers(skillId, params);
      return response.users || [];
    } catch (error) {
      console.error('Error fetching skill users:', error);
      toast.error('Erreur lors du chargement des utilisateurs de la compétence');
      return [];
    }
  }

  async getSkillAnalytics(skillId) {
    try {
      const response = await apiService.getSkillAnalytics(skillId);
      return response;
    } catch (error) {
      console.error('Error fetching skill analytics:', error);
      toast.error('Erreur lors du chargement des analytics de la compétence');
      return {
        totalUsers: 0,
        averageLevel: 0,
        levelBreakdown: {}
      };
    }
  }

  // User profile methods


  // Team management methods


  async addTeamToDepartment(teamId, departmentId) {
    try {
      const response = await apiService.addTeamToDepartment(teamId, departmentId);
      return response;
    } catch (error) {
      console.error('Error adding team to department:', error);
      toast.error('Erreur lors de l\'ajout de l\'équipe au département');
      throw error;
    }
  }

  // User management methods

  // Notification methods

  async getUnreadCount() {
    try {
      const response = await apiService.getUnreadCount();
      return response.count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  }

  async markNotificationRead(notificationId) {
    try {
      const response = await apiService.markNotificationRead(notificationId);
      return response;
    } catch (error) {
      console.error('Error marking notification read:', error);
      throw error;
    }
  }

  async markAllNotificationsRead() {
    try {
      const response = await apiService.markAllNotificationsRead();
      return response;
    } catch (error) {
      console.error('Error marking all notifications read:', error);
      throw error;
    }
  }

  // Manager endpoints (enhanced for many-to-many relationships)
  async getManagerTeams() {
    try {
      const response = await apiService.getManagerTeams();
      return {
        managedTeams: response.managedTeams || [],
        memberTeams: response.memberTeams || [],
        totalTeams: response.totalTeams || 0
      };
    } catch (error) {
      console.error('Error fetching manager teams:', error);
      toast.error('Erreur lors du chargement des équipes');
      return { managedTeams: [], memberTeams: [], totalTeams: 0 };
    }
  }

  async getManagerDepartments() {
    try {
      console.log('🔍 dataService.getManagerDepartments() called');
      const response = await apiService.getManagerDepartments();
      console.log('🔍 getManagerDepartments response:', response);
      console.log('🔍 managedDepartments:', response.managedDepartments);
      console.log('🔍 memberDepartments:', response.memberDepartments);
      console.log('🔍 totalDepartments:', response.totalDepartments);
      return {
        managedDepartments: response.managedDepartments || [],
        memberDepartments: response.memberDepartments || [],
        totalDepartments: response.totalDepartments || 0
      };
    } catch (error) {
      console.error('Error fetching manager departments:', error);
      toast.error('Erreur lors du chargement des départements');
      return { managedDepartments: [], memberDepartments: [], totalDepartments: 0 };
    }
  }

  async getManagerTeamMembers() {
    try {
      const response = await apiService.getManagerTeamMembers();
      return response.teamMembers || [];
    } catch (error) {
      console.error('Error fetching manager team members:', error);
      toast.error('Erreur lors du chargement des membres d\'équipe');
      return [];
    }
  }

  // Analytics operations
  async getRecentActivity(limit = 10) {
    try {
      const response = await apiService.getRecentActivity(limit);
      return response.activities || [];
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      toast.error('Erreur lors du chargement des activités récentes');
      return [];
    }
  }

  async getUserGrowth(period = '30days') {
    try {
      const response = await apiService.getUserGrowth(period);
      return response;
    } catch (error) {
      console.error('Error fetching user growth:', error);
      toast.error('Erreur lors du chargement des données de croissance');
      return { growthData: [], summary: { totalUsers: 0, newUsers: 0, growthPercentage: 0 } };
    }
  }

  // Progress Update Approval methods
  async getPendingProgressUpdates() {
    try {
      const response = await apiService.getPendingProgressUpdates();
      return response;
    } catch (error) {
      console.error('Error fetching pending progress updates:', error);
      toast.error('Erreur lors du chargement des demandes de progression');
      throw error;
    }
  }

  async approveProgressUpdate(updateId, approvalData) {
    try {
      const response = await apiService.approveProgressUpdate(updateId, approvalData);
      return response;
    } catch (error) {
      console.error('Error approving progress update:', error);
      toast.error('Erreur lors de l\'approbation');
      throw error;
    }
  }

  async rejectProgressUpdate(updateId, rejectionData) {
    try {
      const response = await apiService.rejectProgressUpdate(updateId, rejectionData);
      return response;
    } catch (error) {
      console.error('Error rejecting progress update:', error);
      toast.error('Erreur lors du rejet');
      throw error;
    }
  }

  // Get employee's own progress updates
  async getMyProgressUpdates() {
    try {
      const response = await apiService.getMyProgressUpdates();
      return response;
    } catch (error) {
      console.error('Error fetching my progress updates:', error);
      // Don't show error toast for normal empty responses or server errors
      if (error.response?.status !== 404 && error.response?.status !== 500) {
        toast.error('Erreur lors du chargement de vos mises à jour');
      }
      throw error;
    }
  }



  // Delete employee's own skill request
  async deleteSkillRequest(requestId) {
    try {
      const response = await apiService.deleteSkillRequest(requestId);
      toast.success('Demande de compétence supprimée avec succès');
      return response;
    } catch (error) {
      console.error('Error deleting skill request:', error);
      toast.error('Erreur lors de la suppression de la demande');
      throw error;
    }
  }

  // Delete employee's own progress update
  async deleteProgressUpdate(updateId) {
    try {
      const response = await apiService.deleteProgressUpdate(updateId);
      toast.success('Demande de progression supprimée avec succès');
      return response;
    } catch (error) {
      console.error('Error deleting progress update:', error);
      toast.error('Erreur lors de la suppression de la demande');
      throw error;
    }
  }


  // NEW: Get individual targets for a specific objective
  async getIndividualTargets(objectiveId) {
    try {
      const response = await apiService.getIndividualTargets(objectiveId);
      return response;
    } catch (error) {
      console.error('Error fetching individual targets:', error);
      toast.error('Erreur lors du chargement des objectifs individuels');
      return { individualTargets: [] };
    }
  }

  // Job Titles
  async getJobTitles() {
    try {
      console.log('🔍 DataService: Calling getJobTitles()');
      const response = await apiService.getJobTitles();
      console.log('✅ DataService: getJobTitles response:', response);
      return response || [];
    } catch (error) {
      console.error('❌ DataService: Error fetching job titles:', error);
      toast.error('Erreur lors du chargement des titres de poste');
      return [];
    }
  }

  async getJobTitlesForManagers() {
    try {
      console.log('🔍 DataService: Calling getJobTitlesForManagers()');
      const response = await apiService.getJobTitlesForManagers();
      console.log('✅ DataService: getJobTitlesForManagers response:', response);
      return response || [];
    } catch (error) {
      console.error('❌ DataService: Error fetching job titles for managers:', error);
      toast.error('Erreur lors du chargement des titres de poste');
      return [];
    }
  }

  async getJobTitle(id) {
    try {
      const response = await apiService.getJobTitle(id);
      return response;
    } catch (error) {
      console.error('Error fetching job title:', error);
      toast.error('Erreur lors du chargement du titre de poste');
      throw error;
    }
  }

  async getJobTitleForManagers(id) {
    try {
      const response = await apiService.getJobTitleForManagers(id);
      return response;
    } catch (error) {
      console.error('Error fetching job title for managers:', error);
      toast.error('Erreur lors du chargement du titre de poste');
      throw error;
    }
  }

  // Job Title Objectives Management
  async getManagerJobTitleObjectives() {
    try {
      const response = await apiService.getManagerJobTitleObjectives();
      return response;
    } catch (error) {
      console.error('Error fetching manager job title objectives:', error);
      return { objectives: [] };
    }
  }

  async assignJobTitleObjective(assignmentData) {
    try {
      const response = await apiService.assignJobTitleObjective(assignmentData);
      return response;
    } catch (error) {
      console.error('Error assigning job title objective:', error);
      throw error;
    }
  }

  async getAvailableMembersForJobTitle(jobTitleId) {
    try {
      const response = await apiService.getAvailableMembersForJobTitle(jobTitleId);
      return response.members || [];
    } catch (error) {
      console.error('Error fetching available members for job title:', error);
      throw error;
    }
  }

  async getMemberSkillGapForJobTitle(memberId, jobTitleId) {
    try {
      const response = await apiService.getMemberSkillGapForJobTitle(memberId, jobTitleId);
      return response.skillGap || { totalGap: 0, skillGaps: [] };
    } catch (error) {
      console.error('Error fetching member skill gap:', error);
      throw error;
    }
  }

  async getEmployeeJobTitleObjectives() {
    try {
      const response = await apiService.getEmployeeJobTitleObjectives();
      return response.objectives || [];
    } catch (error) {
      console.error('Error fetching employee job title objectives:', error);
      throw error;
    }
  }

  async confirmJobTitleObjectiveCompletion(objectiveId) {
    try {
      const response = await apiService.confirmJobTitleObjectiveCompletion(objectiveId);
      return response;
    } catch (error) {
      console.error('Error confirming job title objective completion:', error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      const response = await apiService.getCurrentUser();
      return response;
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  }

  async deleteJobTitleObjective(objectiveId) {
    try {
      console.log('🗑️ DataService: Deleting objective:', objectiveId);
      const response = await apiService.deleteJobTitleObjective(objectiveId);
      console.log('✅ DataService: Delete response:', response);
      return response;
    } catch (error) {
      console.error('❌ DataService: Error deleting job title objective:', error);
      console.error('❌ DataService: Error response:', error.response?.data);
      throw error;
    }
  }


  async createJobTitle(jobTitleData) {
    try {
      const response = await apiService.createJobTitle(jobTitleData);
      toast.success('Titre de poste créé avec succès');
      return response;
    } catch (error) {
      console.error('Error creating job title:', error);
      toast.error(error.message || 'Erreur lors de la création du titre de poste');
      throw error;
    }
  }

  async updateJobTitle(id, jobTitleData) {
    try {
      const response = await apiService.updateJobTitle(id, jobTitleData);
      toast.success('Titre de poste mis à jour avec succès');
      return response;
    } catch (error) {
      console.error('Error updating job title:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour du titre de poste');
      throw error;
    }
  }

  async deleteJobTitle(id) {
    try {
      const response = await apiService.deleteJobTitle(id);
      toast.success('Titre de poste supprimé avec succès');
      return response;
    } catch (error) {
      console.error('Error deleting job title:', error);
      toast.error(error.message || 'Erreur lors de la suppression du titre de poste');
      throw error;
    }
  }

  async getAvailableSkills() {
    try {
      const response = await apiService.getAvailableSkills();
      return response;
    } catch (error) {
      console.error('Error fetching available skills:', error);
      toast.error('Erreur lors du chargement des compétences disponibles');
      return [];
    }
  }

  async getAvailableJobTitles() {
    try {
      const response = await apiService.getAvailableJobTitles();
      return response;
    } catch (error) {
      console.error('Error fetching available job titles:', error);
      toast.error('Erreur lors du chargement des titres de poste disponibles');
      return [];
    }
  }

  async assignJobTitleTarget(assignmentData) {
    try {
      const response = await apiService.assignJobTitleTarget(assignmentData);
      toast.success('Objectif de titre de poste assigné avec succès');
      return response;
    } catch (error) {
      console.error('Error assigning job title target:', error);
      toast.error(error.message || 'Erreur lors de l\'assignation de l\'objectif');
      throw error;
    }
  }

  async getEmployeeJobTitleTargets(employeeId) {
    try {
      const response = await apiService.getEmployeeJobTitleTargets(employeeId);
      return response;
    } catch (error) {
      console.error('Error fetching employee job title targets:', error);
      toast.error('Erreur lors du chargement des objectifs de titre de poste');
      return [];
    }
  }

  // Official Job Title Management
  async setOfficialJobTitle(jobTitleId) {
    try {
      const response = await apiService.setOfficialJobTitle(jobTitleId);
      toast.success('Titre de poste officiel mis à jour avec succès');
      return response;
    } catch (error) {
      console.error('Error setting official job title:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour du titre de poste officiel');
      throw error;
    }
  }

  async checkAndAssignJobTitles() {
    try {
      const response = await apiService.checkAndAssignJobTitles();
      if (response.count > 0) {
        toast.success(`${response.count} nouveau(x) titre(s) de poste assigné(s) automatiquement !`);
      } else {
        toast.info('Aucun nouveau titre de poste à assigner');
      }
      return response;
    } catch (error) {
      console.error('Error checking and assigning job titles:', error);
      toast.error(error.message || 'Erreur lors de la vérification des titres de poste');
      throw error;
    }
  }


  async getUnreadNotificationCount() {
    try {
      const response = await apiService.getUnreadNotificationCount();
      return response;
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
      return { unreadCount: 0 };
    }
  }


  async markAllNotificationsAsRead() {
    try {
      const response = await apiService.markAllNotificationsAsRead();
      return response;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Erreur lors de la mise à jour des notifications');
      throw error;
    }
  }
}

const dataService = new DataService();
export default dataService;
