// Use localhost:5000 for browser access (both Docker and local development)
// The backend is exposed on port 5000 of the host machine
const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method to get auth token
  getAuthToken() {
    const token = localStorage.getItem('authToken');
    console.log('🔍 ApiService: Getting auth token:', token ? `${token.substring(0, 20)}...` : 'null');
    return token;
  }

  // Helper method to set auth headers
  getAuthHeaders() {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      ...options
    };

    console.log('🔍 ApiService: Making request to:', url);
    console.log('🔍 ApiService: Request config:', {
      method: config.method || 'GET',
      headers: config.headers,
      body: config.body ? 'present' : 'none'
    });

    try {
      const response = await fetch(url, config);
      
      // Handle 401 Unauthorized
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '/login';
        throw new Error('Unauthorized - Please login again');
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      // Handle 204 No Content responses (no body to parse)
      if (response.status === 204) {
        return { success: true };
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication endpoints
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async refreshToken(refreshToken) {
    return this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST'
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // Get current user's teams
  async getMyTeams() {
    return this.request('/auth/me/teams');
  }

  // Get manager's teams (teams they manage)
  async getManagerTeams() {
    return this.request('/manager/my-teams');
  }

  async getMonthlyActivity(year, month) {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (month) params.append('month', month);
    return this.request(`/manager/monthly-activity?${params.toString()}`);
  }

  // Get current user's departments
  async getMyDepartments() {
    return this.request('/auth/me/departments');
  }

  // Get current user's managers
  async getMyManagers() {
    return this.request('/auth/me/managers');
  }

  async getMyApprovers() {
    return this.request('/auth/me/approvers');
  }

  async changePassword(currentPassword, newPassword) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  }

  // User management endpoints
  async getUserProfile() {
    return this.request('/users/profile');
  }

  async getSidebarStats() {
    return this.request('/auth/me/sidebar-stats');
  }

  async updateUserProfile(profileData) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  async getAllUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/users?${queryString}`);
  }

  async getUserById(userId) {
    return this.request(`/users/${userId}`);
  }


  async getPublicUserProfile(userId) {
    return this.request(`/users/${userId}/profile`);
  }

  async getUserSkills(userId) {
    return this.request(`/users/${userId}/skills`);
  }

  async getMySkills() {
    return this.request('/auth/me/skills');
  }

  async getUserObjectives(userId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/users/${userId}/objectives?${queryString}`);
  }

  async getMyObjectives(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/employee/my-objectives?${queryString}`);
  }

  async getManagerObjectives(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/manager/my-objectives?${queryString}`);
  }

  // NEW: Get objectives based on CURRENT team management (not creator)
  async getCurrentManagerObjectives(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/objectives/current-manager-view?${queryString}`);
  }

  // Objective contributions endpoints
  async getObjectiveContributions(objectiveId) {
    return this.request(`/objectives/contributions/${objectiveId}`);
  }

  async createObjectiveContribution(objectiveId, contributionData) {
    return this.request(`/objectives/${objectiveId}/contributions`, {
      method: 'POST',
      body: JSON.stringify(contributionData)
    });
  }

  async updateObjectiveContribution(contributionId, contributionData) {
    return this.request(`/objectives/contributions/${contributionId}`, {
      method: 'PUT',
      body: JSON.stringify(contributionData)
    });
  }

  async updateContributionProgress(contributionId, progressData) {
    return this.request(`/objectives/contributions/${contributionId}/progress`, {
      method: 'PUT',
      body: JSON.stringify(progressData)
    });
  }

  async getContributionByObjectiveId(objectiveId) {
    return this.request(`/objectives/${objectiveId}/contribution`);
  }

  async updatePartialTargetProgress(objectiveId, progressData) {
    return this.request(`/objectives/${objectiveId}/progress`, {
      method: 'PUT',
      body: JSON.stringify(progressData)
    });
  }

  async deleteObjectiveContribution(contributionId) {
    return this.request(`/objectives/contributions/${contributionId}`, {
      method: 'DELETE'
    });
  }

  async getObjectiveUpdates(objectiveId) {
    return this.request(`/objectives/${objectiveId}/updates`);
  }

  // Employee organization endpoints
  async getMyOrganization() {
    return this.request('/employee/my-organization');
  }

  async getMyEmployeeSkills() {
    return this.request('/employee/my-skills');
  }

  async getAllUserSkills() {
    return this.request('/skills/user-skills/all');
  }

  // Notification endpoints
  async getNotifications(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/notifications?${queryString}`);
  }

  async markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PUT'
    });
  }

  async markAllNotificationsRead() {
    return this.request('/notifications/read-all', {
      method: 'PUT'
    });
  }

  async deleteNotification(id) {
    return this.request(`/notifications/${id}`, {
      method: 'DELETE'
    });
  }



  async createUser(userData) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async updateUser(userId, userData) {
    // Convert single departmentId/teamId to arrays for many-to-many support
    const updatedData = { ...userData };
    
    if (userData.departmentId !== undefined) {
      updatedData.departmentIds = userData.departmentId ? [userData.departmentId] : [];
      delete updatedData.departmentId;
    }
    
    if (userData.teamId !== undefined) {
      updatedData.teamIds = userData.teamId ? [userData.teamId] : [];
      delete updatedData.teamId;
    }
    
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updatedData)
    });
  }

  // Notification methods

  async getUnreadCount() {
    return this.request('/notifications/unread-count');
  }



  async updateUserStatus(userId, status) {
    return this.request(`/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  async addUserToTeam(userId, teamId) {
    return this.request(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  async deleteUser(userId) {
    return this.request(`/users/${userId}`, {
      method: 'DELETE'
    });
  }

  async cleanupDuplicateUsers() {
    return this.request('/users/deduplicate', {
      method: 'POST'
    });
  }




  // Skills endpoints
  async getAllSkills(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/skills?${queryString}`);
  }

  async getSkillById(skillId) {
    return this.request(`/skills/${skillId}`);
  }

  async createSkill(skillData) {
    return this.request('/skills', {
      method: 'POST',
      body: JSON.stringify(skillData)
    });
  }

  async updateSkill(skillId, skillData) {
    return this.request(`/skills/${skillId}`, {
      method: 'PUT',
      body: JSON.stringify(skillData)
    });
  }

  async deleteSkill(skillId) {
    return this.request(`/skills/${skillId}`, {
      method: 'DELETE'
    });
  }

  async getSkillUsers(skillId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/skills/${skillId}/users?${queryString}`);
  }

  async getSkillAnalytics(skillId) {
    return this.request(`/skills/${skillId}/analytics`);
  }



  // Skill requests endpoints
  async getAllSkillRequests(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/skill-requests?${queryString}`);
  }

  async getMySkillRequests(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/employee/my-skill-requests?${queryString}`);
  }

  async getSkillRequestById(requestId) {
    return this.request(`/skill-requests/${requestId}`);
  }

  async createSkillRequest(requestData) {
    return this.request('/skill-requests', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  }

  async approveSkillRequest(requestId, comment, grantedLevel, modifiedSkillName, modifiedSkillDescription) {
    const body = { comment, grantedLevel };
    
    // Only add modified skill data if provided
    if (modifiedSkillName) {
      body.modifiedSkillName = modifiedSkillName;
    }
    if (modifiedSkillDescription) {
      body.modifiedSkillDescription = modifiedSkillDescription;
    }
    
    return this.request(`/skill-requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async rejectSkillRequest(requestId, comment) {
    return this.request(`/skill-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comment })
    });
  }

  async markSkillRequestAsSeen(requestId) {
    return this.request(`/skill-requests/${requestId}/mark-seen`, {
      method: 'POST'
    });
  }

  async dismissSkillRequest(requestId) {
    return this.request(`/skill-requests/${requestId}/dismiss`, {
      method: 'POST'
    });
  }



  // Objectives endpoints
  async getAllObjectives(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/objectives?${queryString}`);
  }

  async getObjectiveById(objectiveId) {
    return this.request(`/objectives/${objectiveId}`);
  }

  async getTeamObjectiveWithIndividualTargets(objectiveId) {
    return this.request(`/objectives/team-objective/${objectiveId}/with-individual-targets`);
  }

  async getObjectiveAttachments(objectiveId, individualTargetId = null) {
    const queryString = individualTargetId ? `?individualTargetId=${individualTargetId}` : '';
    return this.request(`/objectives/attachments/${objectiveId}${queryString}`);
  }

  async attachObjectiveFiles(objectiveId, files) {
    // files: array of { name, path, size, type }
    return this.request(`/objectives/attachments/${objectiveId}`, {
      method: 'POST',
      body: JSON.stringify({ files })
    });
  }

  async createObjective(objectiveData) {
    console.log('🔍 ApiService: Creating objective with data:', objectiveData);
    try {
      const response = await this.request('/objectives', {
        method: 'POST',
        body: JSON.stringify(objectiveData)
      });
      console.log('✅ ApiService: Objective created successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ ApiService: Error creating objective:', error);
      throw error;
    }
  }

  async createIndividualTarget(objectiveData) {
    console.log('🔍 ApiService: Creating individual target with data:', objectiveData);
    try {
      const response = await this.request('/objectives/individual-targets', {
        method: 'POST',
        body: JSON.stringify(objectiveData)
      });
      console.log('✅ ApiService: Individual target created successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ ApiService: Error creating individual target:', error);
      throw error;
    }
  }

  async createTeamIndividualTargets(objectiveData) {
    console.log('🔍 ApiService: Creating team individual targets with data:', objectiveData);
    try {
      const response = await this.request('/objectives/team-individual-targets-batch', {
        method: 'POST',
        body: JSON.stringify(objectiveData)
      });
      console.log('✅ ApiService: Team individual targets created successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ ApiService: Error creating team individual targets:', error);
      throw error;
    }
  }

  async createTeamIndividualTargetsSimple(objectiveData) {
    console.log('🔍 ApiService: Creating team individual targets (simple) with data:', objectiveData);
    try {
      const response = await this.request('/objectives/team-individual-targets-simple', {
        method: 'POST',
        body: JSON.stringify(objectiveData)
      });
      console.log('✅ ApiService: Team individual targets (simple) created successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ ApiService: Error creating team individual targets (simple):', error);
      throw error;
    }
  }

  async createTeamTarget(teamTargetData) {
    return this.request('/objectives/team-target', {
      method: 'POST',
      body: JSON.stringify(teamTargetData)
    });
  }

  async updateObjective(objectiveId, objectiveData) {
    return this.request(`/objectives/${objectiveId}`, {
      method: 'PUT',
      body: JSON.stringify(objectiveData)
    });
  }

  async deleteObjective(objectiveId) {
    return this.request(`/objectives/${objectiveId}`, {
      method: 'DELETE'
    });
  }

  async deleteIndividualTarget(targetId) {
    return this.request(`/objectives/individual-targets/${targetId}`, {
      method: 'DELETE'
    });
  }

  async deleteContribution(contributionId) {
    return this.request(`/objectives/contributions/${contributionId}`, {
      method: 'DELETE'
    });
  }

  async updateObjectiveProgress(objectiveId, progressData) {
    return this.request(`/objectives/${objectiveId}/progress`, {
      method: 'POST',
      body: JSON.stringify(progressData)
    });
  }

  // Teams endpoints
  async getAllTeams(params = {}) {
    console.log('🔍 ApiService: Calling getAllTeams with params:', params);
    const queryString = new URLSearchParams(params).toString();
    const response = await this.request(`/teams?${queryString}`);
    console.log('✅ ApiService: getAllTeams response:', response);
    return response;
  }

  async getTeamsForObjectives() {
    return this.request('/objectives/teams');
  }

  async getTeamById(teamId) {
    return this.request(`/teams/${teamId}`);
  }

  async createTeam(teamData) {
    return this.request('/teams', {
      method: 'POST',
      body: JSON.stringify(teamData)
    });
  }

  async updateTeam(teamId, teamData) {
    return this.request(`/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(teamData)
    });
  }

  async deleteTeam(teamId) {
    return this.request(`/teams/${teamId}`, {
      method: 'DELETE'
    });
  }

  async addTeamToDepartment(teamId, departmentId) {
    return this.request(`/departments/${departmentId}/teams`, {
      method: 'POST',
      body: JSON.stringify({ teamId })
    });
  }


  async getTeamMembers(teamId) {
    console.log('🔍 ApiService: Calling getTeamMembers for teamId:', teamId);
    const response = await this.request(`/teams/${teamId}/members`);
    console.log('✅ ApiService: getTeamMembers response:', response);
    return response;
  }

  async addTeamMember(teamId, userId) {
    return this.request(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  async removeTeamMember(teamId, userId) {
    return this.request(`/teams/${teamId}/members/${userId}`, {
      method: 'DELETE'
    });
  }

  // Manager-specific endpoints
  async getMyTeamMembers() {
    console.log('🔍 ApiService: Calling /manager/my-team-members');
    const response = await this.request('/manager/my-team-members');
    console.log('✅ ApiService: /manager/my-team-members response:', response);
    return response;
  }

  async getMyManagerSkillRequests() {
    return this.request('/manager/my-skill-requests');
  }

  async getManagerRecentActivities() {
    return this.request('/manager/recent-activities');
  }

  async getManagerUpcomingDeadlines() {
    return this.request('/manager/upcoming-deadlines');
  }

  async getMyManagerObjectives() {
    return this.request('/manager/my-objectives');
  }

  // Employee-specific endpoints

  async getMyEmployeeObjectives() {
    return this.request('/employee/my-objectives');
  }

  async getMyEmployeeSkillRequests() {
    return this.request('/employee/my-skill-requests');
  }

  async getMyTeam() {
    return this.request('/employee/my-team');
  }

  // Departments endpoints
  async getAllDepartments(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/departments?${queryString}`);
  }

  async getDepartmentById(departmentId) {
    return this.request(`/departments/${departmentId}`);
  }

  async createDepartment(departmentData) {
    return this.request('/departments', {
      method: 'POST',
      body: JSON.stringify(departmentData)
    });
  }

  async updateDepartment(departmentId, departmentData) {
    return this.request(`/departments/${departmentId}`, {
      method: 'PUT',
      body: JSON.stringify(departmentData)
    });
  }

  async deleteDepartment(departmentId) {
    return this.request(`/departments/${departmentId}`, {
      method: 'DELETE'
    });
  }

  async removeTeamFromDepartment(departmentId, teamId) {
    return this.request(`/departments/${departmentId}/teams/${teamId}`, {
      method: 'DELETE'
    });
  }

  async getDepartmentEmployees(departmentId) {
    console.log('🔍 ApiService: Calling getDepartmentEmployees for departmentId:', departmentId);
    const response = await this.request(`/departments/${departmentId}/employees`);
    console.log('✅ ApiService: getDepartmentEmployees response:', response);
    return response;
  }



  // Search endpoints
  async search(query, type = null, params = {}) {
    const searchParams = { q: query, ...params };
    if (type) searchParams.type = type;
    const queryString = new URLSearchParams(searchParams).toString();
    return this.request(`/search?${queryString}`);
  }

  async getSearchSuggestions(query) {
    return this.request(`/search/suggestions?q=${encodeURIComponent(query)}`);
  }

  // Notifications endpoints
  async getAllNotifications(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/notifications?${queryString}`);
  }

  async markNotificationAsRead(notificationId) {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT'
    });
  }

  // Files endpoints
  async getAllFiles(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/files?${queryString}`);
  }

  async uploadFile(file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getAuthToken();
    const url = `${this.baseURL}/files/upload`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  }

  async deleteFile(fileId) {
    return this.request(`/files/${fileId}`, {
      method: 'DELETE'
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }

  // Manager endpoints (enhanced for many-to-many relationships)
  async getManagerTeams() {
    return this.request('/manager/my-teams');
  }

  async getManagerDepartments() {
    return this.request('/manager/my-departments');
  }

  // Get team performance dashboard
  async getTeamPerformance(teamId) {
    return this.request(`/manager/team-performance/${teamId}`);
  }

  async getManagerTeamMembers() {
    return this.request('/manager/my-team-members');
  }

  // Analytics endpoints
  async getRecentActivity(limit = 10) {
    return this.request(`/analytics/recent-activity?limit=${limit}`);
  }

  async getUserGrowth(period = '30days') {
    return this.request(`/analytics/user-growth?period=${period}`);
  }

  // Progress Update Approval API methods
  async getPendingProgressUpdates() {
    return this.request('/objectives/manager/progress-updates');
  }

  async approveProgressUpdate(updateId, approvalData) {
    return this.request(`/objectives/progress-updates/${updateId}/approve`, {
      method: 'POST',
      body: JSON.stringify(approvalData)
    });
  }

  async rejectProgressUpdate(updateId, rejectionData) {
    return this.request(`/objectives/progress-updates/${updateId}/reject`, {
      method: 'POST',
      body: JSON.stringify(rejectionData)
    });
  }

  // Get employee's own progress updates
  async getMyProgressUpdates() {
    return this.request('/objectives/my-progress-updates');
  }



  // Delete employee's own skill request
  async deleteSkillRequest(requestId) {
    return this.request(`/skill-requests/${requestId}`, {
      method: 'DELETE'
    });
  }

  // Delete employee's own progress update
  async deleteProgressUpdate(updateId) {
    return this.request(`/objectives/progress-updates/${updateId}`, {
      method: 'DELETE'
    });
  }

  // REMOVED: Duplicate createIndividualTarget method that was causing conflicts

  // NEW: Get individual targets for a specific objective
  async getIndividualTargets(objectiveId) {
    return this.request(`/objectives/individual-targets/${objectiveId}`);
  }

  // Job Title Management API methods

  // Get all job titles (admin only)
  async getJobTitles() {
    return this.request('/job-titles');
  }

  async fixAllUserSkills() {
    return this.request('/users/fix-all-user-skills', {
      method: 'POST'
    });
  }

  // Set user's official job title
  async setOfficialJobTitle(jobTitleId) {
    return this.request('/users/official-job-title', {
      method: 'PUT',
      body: JSON.stringify({ job_title_id: jobTitleId })
    });
  }

  // Check and auto-assign job titles based on skill requirements
  async checkAndAssignJobTitles() {
    return this.request('/users/check-and-assign-job-titles', {
      method: 'POST'
    });
  }

  // Get job title with skill requirements (admin only)
  async getJobTitle(id) {
    return this.request(`/job-titles/${id}`);
  }

  async getJobTitlesForManagers() {
    return this.request('/job-titles/for-managers');
  }

  // Get single job title with requirements (for managers)
  async getJobTitleForManagers(id) {
    return this.request(`/job-titles/for-managers/${id}`);
  }

  // Job Title Objectives Management
  async getManagerJobTitleObjectives() {
    return this.request('/job-title-objectives/manager');
  }

  async assignJobTitleObjective(assignmentData) {
    return this.request('/job-title-objectives/assign', {
      method: 'POST',
      body: JSON.stringify(assignmentData)
    });
  }

  async getAvailableMembersForJobTitle(jobTitleId) {
    return this.request(`/job-title-objectives/available-members/${jobTitleId}`, {
      method: 'GET'
    });
  }

  async getMemberSkillGapForJobTitle(memberId, jobTitleId) {
    return this.request(`/job-title-objectives/skill-gap/${memberId}/${jobTitleId}`, {
      method: 'GET'
    });
  }

  async getEmployeeJobTitleObjectives() {
    return this.request('/job-title-objectives/employee/my-objectives', {
      method: 'GET'
    });
  }

  async getJobTitleObjectives() {
    return this.request('/job-title-objectives/manager', {
      method: 'GET'
    });
  }

  async confirmJobTitleObjectiveCompletion(objectiveId) {
    return this.request(`/job-title-objectives/confirm-completion/${objectiveId}`, {
      method: 'POST'
    });
  }

  async deleteJobTitleObjective(objectiveId) {
    console.log('🗑️ ApiService: Deleting objective:', objectiveId);
    const response = await this.request(`/job-title-objectives/${objectiveId}`, {
      method: 'DELETE'
    });
    console.log('✅ ApiService: Delete response:', response);
    return response;
  }


  // Create new job title (admin only)
  async createJobTitle(jobTitleData) {
    return this.request('/job-titles', {
      method: 'POST',
      body: JSON.stringify(jobTitleData)
    });
  }

  // Update job title (admin only)
  async updateJobTitle(id, jobTitleData) {
    return this.request(`/job-titles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(jobTitleData)
    });
  }

  // Delete job title (admin only)
  async deleteJobTitle(id) {
    return this.request(`/job-titles/${id}`, {
      method: 'DELETE'
    });
  }

  // Get available skills for job title requirements (admin only)
  async getAvailableSkills() {
    return this.request('/job-titles/skills/available');
  }

  // Get job titles available for assignment (managers)
  async getAvailableJobTitles() {
    return this.request('/job-titles/available-for-assignment');
  }

  // Assign job title target to employee (managers)
  async assignJobTitleTarget(assignmentData) {
    return this.request('/job-titles/assign', {
      method: 'POST',
      body: JSON.stringify(assignmentData)
    });
  }

  // Get employee's job title targets
  async getEmployeeJobTitleTargets(employeeId) {
    return this.request(`/job-titles/employee/${employeeId}/targets`);
  }

  // Update job title target progress
  async updateJobTitleTargetProgress(targetId, progressData) {
    return this.request(`/job-titles/targets/${targetId}/progress`, {
      method: 'PUT',
      body: JSON.stringify(progressData)
    });
  }


  async getUnreadNotificationCount() {
    return this.request('/notifications/unread-count');
  }

  async markAllNotificationsAsRead() {
    return this.request('/notifications/read-all', {
      method: 'PUT'
    });
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;
