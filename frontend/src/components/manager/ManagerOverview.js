import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';

import { 
  UserGroupIcon, 
  AcademicCapIcon, 
  ClockIcon, 
  CheckCircleIcon,

  BoltIcon,
  ArrowRightIcon,
  CalendarIcon,
  UsersIcon,
  ArrowTrendingUpIcon,

  ChartBarIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell

} from 'recharts';
import DepartmentDetailModal from '../admin/DepartmentDetailModal';
import TeamDetailModal from '../admin/TeamDetailModal';

const ManagerOverview = () => {
  const { user, isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [allLateObjectives, setAllLateObjectives] = useState([]);
  const [managedTeams, setManagedTeams] = useState([]);

  const [managedDepartments, setManagedDepartments] = useState([]);
  const [memberDepartments, setMemberDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);

  // Chart data states
  const [teamPerformanceData, setTeamPerformanceData] = useState([]);
  const [skillDistributionData, setSkillDistributionData] = useState([]);
  const [objectiveProgressData, setObjectiveProgressData] = useState([]);
  const [monthlyActivityData, setMonthlyActivityData] = useState([]);
  
  // Chart modal states 
  const [showTeamPerformanceModal, setShowTeamPerformanceModal] = useState(false);
  const [showSkillsDistributionModal, setShowSkillsDistributionModal] = useState(false);
  const [showObjectiveProgressModal, setShowObjectiveProgressModal] = useState(false);
  const [showMonthlyActivityModal, setShowMonthlyActivityModal] = useState(false);
  const [showLateObjectivesModal, setShowLateObjectivesModal] = useState(false);
  
  // New Professional Dashboard Modal States
  const [showTeamSkillsAnalysisModal, setShowTeamSkillsAnalysisModal] = useState(false);
  const [showObjectiveTrendsModal, setShowObjectiveTrendsModal] = useState(false);
  const [showSkillRequestAnalyticsModal, setShowSkillRequestAnalyticsModal] = useState(false);
  const [showWorkloadDistributionModal, setShowWorkloadDistributionModal] = useState(false);
  const [selectedMonthForDaily, setSelectedMonthForDaily] = useState(null);
  const [dailyActivityData, setDailyActivityData] = useState([]);
  const [objectives, setObjectives] = useState([]);
  
  // New Professional Dashboard Data
  const [teamSkillsAnalysisData, setTeamSkillsAnalysisData] = useState([]);
  const [objectiveTrendsData, setObjectiveTrendsData] = useState([]);
  const [workloadDistributionData, setWorkloadDistributionData] = useState([]);


  useEffect(() => {
    if (isAuthLoading || !user) {
      return;
    }
    
    loadDashboardData();
    
    // No auto-refresh - user will manually refresh when needed
  }, [user, isAuthLoading]);

  const generateDailyActivityData = (monthStr, objectives) => {
    // Parse the month string (e.g., "août 2025")
    const [monthName, year] = monthStr.split(' ');
    const monthMap = {
      'janv.': 0, 'févr.': 1, 'mars': 2, 'avr.': 3, 'mai': 4, 'juin': 5,
      'juill.': 6, 'août': 7, 'sept.': 8, 'oct.': 9, 'nov.': 10, 'déc.': 11
    };
    
    const monthIndex = monthMap[monthName];
    if (monthIndex === undefined) return [];
    
    // Get the number of days in the month
    const daysInMonth = new Date(parseInt(year), monthIndex + 1, 0).getDate();
    
    // Initialize daily data
    const dailyData = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(parseInt(year), monthIndex, day);
      const dayStr = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      
      // Count activities for this specific day
      let dayRequests = 0;
      let dayObjectives = 0;
      let dayApprovedRequests = 0;
      let dayCompletedObjectives = 0;
      
      
      // Count objectives created on this day
      objectives.forEach(objective => {
        if (objective.createdAt) {
          const objDate = new Date(objective.createdAt);
          if (objDate.getDate() === day && 
              objDate.getMonth() === monthIndex && 
              objDate.getFullYear() === parseInt(year)) {
            dayObjectives++;
            if (objective.status === 'completed' || objective.progress >= 100) {
              dayCompletedObjectives++;
            }
          }
        }
      });
      
      dailyData.push({
        day: dayStr,
        dayNumber: day,
        requests: dayRequests,
        objectives: dayObjectives,
        approvedRequests: dayApprovedRequests,
        completedObjectives: dayCompletedObjectives,
        totalActivity: dayRequests + dayObjectives
      });
    }
    
    return dailyData;
  };

  const handleMonthClick = async (monthStr) => {
    console.log('🗓️ Loading daily data for month:', monthStr);
    
    try {
      // Parse the month string to get year and month
      const [monthName, year] = monthStr.split(' ');
      const monthMap = {
        'janv.': 1, 'févr.': 2, 'mars': 3, 'avr.': 4, 'mai': 5, 'juin': 6,
        'juill.': 7, 'août': 8, 'sept.': 9, 'oct.': 10, 'nov.': 11, 'déc.': 12
      };
      
      const monthNumber = monthMap[monthName];
      const yearNumber = parseInt(year);
      
      if (monthNumber && yearNumber) {
        console.log('🔍 Loading activity data for:', yearNumber, monthNumber);
        const activityData = await dataService.getMonthlyActivity(yearNumber, monthNumber);
        
        console.log('📅 Real daily activity data:', activityData);
        setDailyActivityData(activityData.dailyActivity || []);
        setSelectedMonthForDaily(monthStr);
      } else {
        console.log('❌ Could not parse month string:', monthStr);
        // Fallback to generated data
        const dailyData = generateDailyActivityData(monthStr, objectives);
        setDailyActivityData(dailyData);
        setSelectedMonthForDaily(monthStr);
      }
    } catch (error) {
      console.error('❌ Error loading daily activity data:', error);
      // Fallback to generated data
      const dailyData = generateDailyActivityData(monthStr, objectives);
      setDailyActivityData(dailyData);
      setSelectedMonthForDaily(monthStr);
    }
  };

  const loadDashboardData = async () => {
    if (!user?.id) return;
    
    console.log('🔍 Loading dashboard data for user:', user);
    console.log('🔍 User ID:', user.id);
    console.log('🔍 User role:', user.role);
    
    try {
      setLoading(true);
      
      const [
        usersData,
        skillsData,
        teamsDataResponse,
        departmentsDataResponse,
        objectivesData,
        userSkillsData,
        recentActivitiesData,
        upcomingDeadlinesData
      ] = await Promise.allSettled([
        dataService.getUsers({ pageSize: 1000, include_inactive: true }),
        dataService.getSkills(),
        dataService.getManagerTeams(),
        dataService.getManagerDepartments(),
        dataService.getManagerObjectives(), // Use manager-specific objectives endpoint
        dataService.getAllUserSkills(),
        dataService.getManagerRecentActivities(),
        dataService.getManagerUpcomingDeadlines()
      ]);

      // Debug: Log what we're getting from each API call
      console.log('🔍 API Response Status:', {
        users: usersData.status,
        skills: skillsData.status,
        teams: teamsDataResponse.status,
        departments: departmentsDataResponse.status,
        objectives: objectivesData.status,
        userSkills: userSkillsData.status,
        recentActivities: recentActivitiesData.status,
        upcomingDeadlines: upcomingDeadlinesData.status
      });
      
      
      // Debug: Log objectives data specifically
      if (objectivesData.status === 'fulfilled') {
        console.log('🎯 Objectives data received:', objectivesData.value);
        console.log('🎯 Objectives count:', objectivesData.value?.length || 0);
        if (objectivesData.value && objectivesData.value.length > 0) {
          console.log('🎯 First objective:', objectivesData.value[0]);
          
          // Debug: Check for team objectives specifically
          const teamObjectives = objectivesData.value.filter(obj => 
            obj.assigneeType === 'TEAM' && obj.teamId
          );
          console.log('🎯 Team objectives found:', teamObjectives.length);
          teamObjectives.forEach((obj, index) => {
            console.log(`  ${index + 1}. "${obj.title}" - ${obj.progress}% (${obj.teamName})`);
          });
        }
      } else {
        console.log('❌ Objectives data failed:', objectivesData.reason);
      }

      // Debug: Log any failed API calls
      if (teamsDataResponse.status === 'rejected') {
        console.error('❌ Teams API call failed:', teamsDataResponse.reason);
      }
      if (departmentsDataResponse.status === 'rejected') {
        console.error('❌ Departments API call failed:', departmentsDataResponse.reason);
      }
      if (objectivesData.status === 'rejected') {
        console.error('❌ Objectives API call failed:', objectivesData.reason);
      }

      const users = usersData.status === 'fulfilled' ? usersData.value : [];
      const skills = skillsData.status === 'fulfilled' ? skillsData.value : [];
      const teamsData = teamsDataResponse.status === 'fulfilled' ? teamsDataResponse.value : { managedTeams: [], memberTeams: [] };
      const departmentsData = departmentsDataResponse.status === 'fulfilled' ? departmentsDataResponse.value : { managedDepartments: [], memberDepartments: [] };
      const objectivesArray = objectivesData.status === 'fulfilled' ? objectivesData.value : [];
      
      // Debug: Log the actual structure of teamsData
      console.log('🔍 teamsDataResponse:', teamsDataResponse);
      console.log('🔍 teamsData:', teamsData);
      console.log('🔍 teamsData type:', typeof teamsData);
      console.log('🔍 teamsData keys:', Object.keys(teamsData));
      
      // Store in state for later use
      setObjectives(objectivesArray);
      const userSkills = userSkillsData.status === 'fulfilled' ? userSkillsData.value : [];

      // Extract team and department data first
      const { managedTeams: managedTeamsData } = teamsData;
      const { managedDepartments: managedDepartmentsData, memberDepartments: memberDepartmentsData } = departmentsData;
      
      // Debug: Log the extracted data
      console.log('🔍 managedTeamsData:', managedTeamsData);
      console.log('🔍 managedTeamsData length:', managedTeamsData?.length);
      console.log('🔍 managedTeamsData type:', typeof managedTeamsData);
      console.log('🔍 managedTeamsData isArray:', Array.isArray(managedTeamsData));

      // Get team member IDs for other processing
      const teamMemberIds = managedTeamsData.flatMap(team => 
        team.members?.map(member => member.id) || []
      );
      
      setManagedTeams(managedTeamsData);
      setManagedDepartments(managedDepartmentsData);
      setMemberDepartments(memberDepartmentsData);
      
      // Debug logging
      console.log('🔍 Loaded data:', {
        objectives: objectivesArray.length,
        userSkills: userSkills.length,
        teams: managedTeamsData.length
      });
      
      // Log detailed team data
      console.log('🔍 Managed teams:', managedTeamsData);
      managedTeamsData.forEach((team, index) => {
        console.log(`🔍 Team ${index + 1}: ${team.name} (ID: ${team.id}, Members: ${team.membersCount})`);
      });
      
      // Log detailed objectives data
      console.log('🔍 All objectives:', objectivesArray);
      objectivesArray.forEach((obj, index) => {
        console.log(`🔍 Objective ${index + 1}: ${obj.title} (ID: ${obj.id}, Progress: ${obj.progress}%, Deadline: ${obj.deadline})`);
      });
      
      // Use only real objectives from database - no sample data
      let finalObjectives = objectivesArray;
      if (objectivesArray.length === 0) {
        console.log('📝 No objectives found in database - dashboard will show empty state');
      }
      
      // Log sample data to understand structure
      if (objectivesArray.length > 0) {
        console.log('📋 Sample objective:', objectivesArray[0]);
      }
      if (userSkills.length > 0) {
        console.log('📋 Sample user skill:', userSkills[0]);
      }
      
      
      const totalTeamMembers = managedTeamsData.reduce((sum, team) => sum + (team.membersCount || 0), 0);
      
      
      // Map objectives to teams based on real database relationships - comprehensive mapping
      const teamObjectives = finalObjectives.filter(obj => {
        // Check if this objective is assigned to any of the managed teams
        const isTeamObjective = managedTeamsData.some(team => {
          // Method 1: Direct team assignment via assigneeType
          if (obj.assigneeType === 'TEAM' && obj.teamId === team.id) {
            return true;
          }
          
          // Method 2: Direct team assignment via teamId field
          if (obj.teamId === team.id) {
            return true;
          }
          
          // Method 3: Check if objective is assigned to team members
          if (obj.assigneeType === 'USER' && obj.assignedTo) {
            const teamMemberIds = team.members?.map(m => m.id) || [];
            if (teamMemberIds.includes(obj.assignedTo)) {
              return true;
            }
          }
          
          // Method 4: Check if objective is assigned to team members via assignedTo field
          if (obj.assignedTo) {
            const teamMemberIds = team.members?.map(m => m.id) || [];
            if (teamMemberIds.includes(obj.assignedTo)) {
              return true;
            }
          }
          
          // Method 5: Check if objective is created by team members
          if (obj.created_by) {
            const teamMemberIds = team.members?.map(m => m.id) || [];
            if (teamMemberIds.includes(obj.created_by)) {
              return true;
            }
          }
          
          return false;
        });
        return isTeamObjective;
      });
      
      console.log('🎯 Team objectives found:', teamObjectives.length, teamObjectives.map(o => o.title));
      
      const inProgressObjectives = teamObjectives.filter(obj => obj.status === 'in_progress');
      
      // Update stats with final data
      const totalObjectives = finalObjectives.length;
      const completedObjectives = finalObjectives.filter(obj => obj.status === 'completed' || obj.progress >= 100).length;

      setStats([
        {
          name: 'Équipes gérées',
          value: managedTeamsData.length.toString(),
          change: '+0',
          changeType: 'positive',
          icon: UserGroupIcon,
          color: 'bg-gradient-to-br from-blue-500 to-blue-600',
          route: '/manager/teams'
        },
        {
          name: 'Membres d\'équipe',
          value: totalTeamMembers.toString(),
          change: '+0',
          changeType: 'positive',
          icon: UsersIcon,
          color: 'bg-gradient-to-br from-green-500 to-green-600',
          route: '/manager/teams'
        },
      ]);

      // Prepare chart data
      prepareChartData(managedTeamsData, skills, finalObjectives, userSkills, users, totalTeamMembers);
      
      // Prepare new professional dashboard data
      prepareProfessionalDashboards(managedTeamsData, finalObjectives, userSkills, users, skills);

      // Set recent activities from API
      if (recentActivitiesData.status === 'fulfilled' && recentActivitiesData.value) {
        console.log('🔍 Recent activities data received:', recentActivitiesData.value);
        setRecentActivities(recentActivitiesData.value);
      } else {
        console.log('⚠️ Recent activities data failed:', recentActivitiesData.reason);
        setRecentActivities([]);
      }

      // Filter late objectives from all objectives
      const lateObjectives = filterLateObjectives(objectivesData.value || [], usersData.value || []);
      console.log('🔍 Late objectives found:', lateObjectives.length);
      
      // Set top 5 most critical late objectives for display
      setUpcomingDeadlines(lateObjectives.slice(0, 5));
      // Set all late objectives for modal
      setAllLateObjectives(lateObjectives);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Erreur lors du chargement des données du tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  const prepareProfessionalDashboards = (teams, objectives, userSkills, users, skills) => {
    if (!Array.isArray(teams)) teams = [];
    if (!Array.isArray(objectives)) objectives = [];
    if (!Array.isArray(userSkills)) userSkills = [];
    if (!Array.isArray(users)) users = [];
    if (!Array.isArray(skills)) skills = [];

    console.log('🎯 Preparing professional dashboards with data:', {
      teams: teams.length,
      objectives: objectives.length,
      userSkills: userSkills.length,
      users: users.length,
      skills: skills.length
    });

    // 1. 📊 TEAM SKILLS ANALYSIS - Real skill distribution across teams
    const teamSkillsAnalysis = teams.map(team => {
      // Get actual skills for team members
      const teamMemberIds = team.members?.map(m => m.id) || [];
      const teamSkills = userSkills.filter(us => teamMemberIds.includes(us.userId));
      
      // Count skills by category
      const hardSkills = teamSkills.filter(us => {
        const skill = skills.find(s => s.id === us.skillId);
        return skill && skill.type === 'hard';
      });
      
      const softSkills = teamSkills.filter(us => {
        const skill = skills.find(s => s.id === us.skillId);
        return skill && skill.type === 'soft';
      });
      
      // Calculate average skill levels
      const avgHardLevel = hardSkills.length > 0 ? 
        hardSkills.reduce((sum, us) => sum + (us.level || 0), 0) / hardSkills.length : 0;
      const avgSoftLevel = softSkills.length > 0 ? 
        softSkills.reduce((sum, us) => sum + (us.level || 0), 0) / softSkills.length : 0;
      
      // Skill diversity (unique skills)
      const uniqueSkills = new Set(teamSkills.map(us => us.skillId)).size;
      
      return {
        name: team.name,
        hardSkills: hardSkills.length,
        softSkills: softSkills.length,
        avgHardLevel: Math.round(avgHardLevel * 10) / 10,
        avgSoftLevel: Math.round(avgSoftLevel * 10) / 10,
        uniqueSkills: uniqueSkills,
        totalSkills: teamSkills.length,
        members: team.membersCount || 0,
        skillDiversity: team.membersCount > 0 ? Math.round((uniqueSkills / team.membersCount) * 100) : 0
      };
    });

    // 2. 🎯 OBJECTIVE COMPLETION TRENDS - Last 6 months
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      last6Months.push(monthKey);
    }
    
    const objectiveTrends = last6Months.map(month => {
      const [monthName, year] = month.split(' ');
      const monthMap = {
        'janv.': 0, 'févr.': 1, 'mars': 2, 'avr.': 3, 'mai': 4, 'juin': 5,
        'juill.': 6, 'août': 7, 'sept.': 8, 'oct.': 9, 'nov.': 10, 'déc.': 11
      };
      const monthIndex = monthMap[monthName];
      
      // Count objectives completed in this month
      const completedThisMonth = objectives.filter(obj => {
        if (!obj.deadline && !obj.createdAt) return false;
        const checkDate = new Date(obj.deadline || obj.createdAt);
        return checkDate.getMonth() === monthIndex && 
               checkDate.getFullYear() === parseInt(year) &&
               (obj.status === 'completed' || obj.progress >= 100);
      }).length;
      
      // Count total objectives for this month
      const totalThisMonth = objectives.filter(obj => {
        if (!obj.deadline && !obj.createdAt) return false;
        const checkDate = new Date(obj.deadline || obj.createdAt);
        return checkDate.getMonth() === monthIndex && 
               checkDate.getFullYear() === parseInt(year);
      }).length;
      
      const completionRate = totalThisMonth > 0 ? 
        Math.round((completedThisMonth / totalThisMonth) * 100) : 0;
      
      return {
        month,
        completed: completedThisMonth,
        total: totalThisMonth,
        completionRate: completionRate,
        pending: totalThisMonth - completedThisMonth
      };
    });


    // 3. ⚖️ WORKLOAD DISTRIBUTION - Objectives per team member
    const workloadDistribution = teams.map(team => {
      // Count objectives assigned to this team - use same comprehensive logic as team performance
      let teamObjectives = objectives.filter(obj => {
        // Method 1: Direct team assignment via assigneeType
        if (obj.assigneeType === 'TEAM' && obj.teamId === team.id) {
          return true;
        }
        
        // Method 2: Direct team assignment via teamId field
        if (obj.teamId === team.id) {
          return true;
        }
        
        // Method 3: User assignment to team members
        if (obj.assigneeType === 'USER' && obj.assignedTo) {
          const teamMemberIds = team.members?.map(m => m.id) || [];
          return teamMemberIds.includes(obj.assignedTo);
        }
        
        // Method 4: Check if objective is assigned to team members via assignedTo field
        if (obj.assignedTo) {
          const teamMemberIds = team.members?.map(m => m.id) || [];
          if (teamMemberIds.includes(obj.assignedTo)) {
            return true;
          }
        }
        
        // Method 5: Check if objective is created by team members
        if (obj.created_by) {
          const teamMemberIds = team.members?.map(m => m.id) || [];
          if (teamMemberIds.includes(obj.created_by)) {
            return true;
          }
        }
        
        return false;
      });
      
      const members = team.membersCount || 1;
      const workload = teamObjectives.length;
      const workloadPerMember = Math.round((workload / members) * 10) / 10;
      
      // Calculate workload status
      let status = 'optimal';
      if (workloadPerMember > 3) status = 'overloaded';
      else if (workloadPerMember > 2) status = 'high';
      else if (workloadPerMember < 1) status = 'underutilized';
      
      return {
        name: team.name,
        members: members,
        objectives: workload,
        workloadPerMember: workloadPerMember,
        status: status,
        completed: teamObjectives.filter(obj => obj.status === 'completed' || obj.progress >= 100).length,
        inProgress: teamObjectives.filter(obj => obj.progress > 0 && obj.progress < 100).length,
        utilization: Math.min(100, Math.round(workloadPerMember * 33.33)) // Assuming 3 objectives = 100% utilization
      };
    });

    // Set all dashboard data
    setTeamSkillsAnalysisData(teamSkillsAnalysis);
    setObjectiveTrendsData(objectiveTrends);
    setWorkloadDistributionData(workloadDistribution);

    console.log('✅ Professional dashboards prepared:', {
      teamSkillsAnalysis: teamSkillsAnalysis.length,
      objectiveTrends: objectiveTrends.length,
      workloadDistribution: workloadDistribution.length
    });
  };

  // Function to filter late objectives (progress < 80% AND deadline passed 80% of time)
  const filterLateObjectives = (objectives, users) => {
    const now = new Date();
    const lateObjectives = [];
    
    objectives.forEach(objective => {
      if (!objective.deadline) return;
      
      const deadline = new Date(objective.deadline);
      const createdDate = new Date(objective.createdAt || objective.created_at);
      const totalTime = deadline.getTime() - createdDate.getTime();
      const elapsedTime = now.getTime() - createdDate.getTime();
      const timeProgress = (elapsedTime / totalTime) * 100;
      const objectiveProgress = objective.progress || 0;
      
      // Check if objective is late: progress < 80% AND time passed > 80%
      if (objectiveProgress < 80 && timeProgress > 80) {
        // Find the assignee
        let assigneeName = 'Non assigné';
        let assigneeType = 'unknown';
        
        if (objective.assigneeType && objective.assignedTo) {
          if (objective.assigneeType === 'TEAM') {
            assigneeName = objective.assignedTo.name;
            assigneeType = 'team';
          } else if (objective.assigneeType === 'USER') {
            assigneeName = `${objective.assignedTo.firstName} ${objective.assignedTo.lastName}`;
            assigneeType = 'user';
          }
        } else {
          // Fallback to creator
          const creator = users.find(u => u.id === objective.createdBy);
          if (creator) {
            assigneeName = `${creator.first_name} ${creator.last_name}`;
            assigneeType = 'user';
          }
        }
        
        lateObjectives.push({
          id: objective.id,
          employee: assigneeName,
          skill: objective.title,
          deadline: objective.deadline,
          progress: objectiveProgress,
          assigneeType: assigneeType,
          timeProgress: Math.round(timeProgress),
          daysOverdue: Math.max(0, Math.ceil((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24)))
        });
      }
    });
    
    // Sort by days overdue (most overdue first)
    lateObjectives.sort((a, b) => b.daysOverdue - a.daysOverdue);
    
    return lateObjectives;
  };

  const prepareChartData = (teams, skills, objectives, userSkills, users, totalTeamMembers) => {
    // Ensure all parameters are arrays
    if (!Array.isArray(teams)) teams = [];
    if (!Array.isArray(skills)) skills = [];
    if (!Array.isArray(objectives)) objectives = [];
    if (!Array.isArray(userSkills)) userSkills = [];
    if (!Array.isArray(users)) users = [];
    
    console.log('🔍 prepareChartData inputs:', {
      teams: teams.length,
      skills: skills.length,
      objectives: objectives.length,
      userSkills: userSkills.length,
      users: users.length
    });
    
    // Debug: Log sample objective structure
    if (objectives.length > 0) {
      console.log('🔍 Sample objective structure:', objectives[0]);
      console.log('🔍 All objectives:', objectives.map(obj => ({
        id: obj.id,
        title: obj.title,
        teamId: obj.teamId,
        assigneeType: obj.assigneeType,
        assignedTo: obj.assignedTo,
        progress: obj.progress
      })));
    }
    
    // Debug: Log team structure
    if (teams.length > 0) {
      console.log('🔍 Sample team structure:', teams[0]);
      console.log('🔍 All teams:', teams.map(team => ({
        id: team.id,
        name: team.name,
        membersCount: team.membersCount
      })));
    }

    // Team Performance Chart Data - MONTHLY FILTERING LOGIC
    const teamPerformance = teams.map(team => {
      // Get objectives that are actually assigned to this team - COMPREHENSIVE MAPPING
      let teamObjectives = objectives.filter(obj => {
        // Method 1: Direct team assignment via assigneeType and teamId
        if (obj.assigneeType === 'TEAM' && (obj.teamId === team.id || obj.team_id === team.id)) {
          return true;
        }
        
        // Method 2: Direct team assignment via teamId field (different naming)
        if (obj.teamId === team.id || obj.team_id === team.id) {
          return true;
        }
        
        // Method 3: Team assignment via team object
        if (obj.team && (obj.team.id === team.id || obj.team.name === team.name)) {
          return true;
        }
        
        // Method 3.5: Team assignment via assignee object (this is the actual structure!)
        if (obj.assigneeType === 'TEAM' && obj.assignee && (obj.assignee.id === team.id || obj.assignee.name === team.name)) {
          return true;
        }
        
        // Method 4: User assignment to team members
        if (obj.assigneeType === 'USER' && (obj.assignedTo || obj.assignee)) {
          const teamMemberIds = team.members?.map(m => m.id) || [];
          const assigneeId = obj.assignedTo || obj.assignee?.id;
          if (teamMemberIds.includes(assigneeId)) {
            return true;
          }
        }
        
        // Method 5: Check if objective is assigned to team members via assignedTo field
        if (obj.assignedTo) {
          const teamMemberIds = team.members?.map(m => m.id) || [];
          if (teamMemberIds.includes(obj.assignedTo)) {
            return true;
          }
        }
        
        // Method 6: Check if objective is created by team members
        if (obj.created_by) {
          const teamMemberIds = team.members?.map(m => m.id) || [];
          if (teamMemberIds.includes(obj.created_by)) {
            return true;
          }
        }
        
        // Method 7: Check if objective has team name match
        if (obj.teamName === team.name || obj.team_name === team.name) {
          return true;
        }
        
        return false;
      });
      
      
      // MONTHLY FILTERING LOGIC - IMPROVED
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      // Filter objectives based on monthly logic
      let filteredObjectives = teamObjectives.filter(obj => {
        // Use created_at as primary date, fallback to updated_at if created_at is not available
        const objectiveDate = new Date(obj.created_at || obj.updated_at || obj.deadline);
        
        // If we can't determine a valid date, include the objective (don't filter it out)
        if (isNaN(objectiveDate.getTime())) {
          return true; // Include objectives with invalid dates
        }
        
        const objectiveMonth = objectiveDate.getMonth();
        const objectiveYear = objectiveDate.getFullYear();
        
        // Current month: Show all objectives (completed + in progress)
        if (objectiveMonth === currentMonth && objectiveYear === currentYear) {
          return true;
        }
        
        // Previous months: Only show objectives that are still in progress (not completed)
        if (objectiveMonth < currentMonth || objectiveYear < currentYear) {
          return obj.status !== 'completed';
        }
        
        // Future months: Show all objectives
        return true;
      });
      
      // FALLBACK: If filtering results in 0 objectives, show all objectives to ensure we display real data
      if (filteredObjectives.length === 0 && teamObjectives.length > 0) {
        filteredObjectives = teamObjectives;
      }
      
      const completedObjectives = filteredObjectives.filter(obj => obj.status === 'completed');
      const avgProgress = filteredObjectives.length > 0 
        ? filteredObjectives.reduce((sum, obj) => sum + (obj.progress || 0), 0) / filteredObjectives.length 
        : 0;
        
      console.log(`📊 Team "${team.name}" stats (monthly filtered):`, {
        totalObjectives: filteredObjectives.length,
        completedObjectives: completedObjectives.length,
        avgProgress: avgProgress,
        members: team.membersCount,
        currentMonth: currentMonth + 1, // +1 because getMonth() returns 0-11
        currentYear: currentYear
      });
      
      return {
        name: team.name,
        members: team.membersCount || 0,
        objectives: filteredObjectives.length,
        completed: completedObjectives.length,
        progress: Math.round(avgProgress)
      };
    });

    setTeamPerformanceData(teamPerformance);
    
    // Debug: Log the final team performance data
    console.log('🎯 Final team performance data:', teamPerformance);
    console.log('🎯 Team performance data length:', teamPerformance.length);

    // IMPROVED: Show ALL skills that team members have, exclude manager's skills, order by highest level
    const skillDistribution = skills.map(skill => {
      // Filter out the manager's skills - only include team member skills
      const teamMemberSkills = userSkills.filter(us => 
        us.skillId === skill.id && 
        us.userId !== user.id // Exclude manager's own skills
      );
      
      const userCount = teamMemberSkills.length;
      
      // Only include skills that at least one team member has
      if (userCount === 0) {
        return null; // Will be filtered out
      }
      
      // Calculate average level for this skill (excluding manager)
      const avgLevel = userCount > 0 
        ? Math.round(teamMemberSkills.reduce((sum, us) => sum + us.level, 0) / userCount)
        : 0;
      
      // Calculate percentage: (users with skill / total team members) * 100
      const percentage = totalTeamMembers > 0 ? Math.round((userCount / totalTeamMembers) * 100) : 0;
      
      // Color based on average level (5=green, 4=less green, etc.)
      const getColorByLevel = (level) => {
        switch(level) {
          case 5: return '#10B981'; // Green
          case 4: return '#34D399'; // Light green
          case 3: return '#6EE7B7'; // Lighter green
          case 2: return '#A7F3D0'; // Very light green
          case 1: return '#D1FAE5'; // Lightest green
          default: return '#E5E7EB'; // Gray
        }
      };
      
      return {
        id: skill.id,
        name: skill.name,
        type: skill.type || 'hard', // Default to hard if no type specified
        users: userCount,
        level: avgLevel,
        percentage: percentage,
        color: getColorByLevel(avgLevel)
      };
    })
    .filter(skill => skill !== null) // Remove skills with no team members

    // Separate hard and soft skills, order by number of users (most users first)
    const hardSkills = skillDistribution
      .filter(skill => skill.type === 'hard')
      .sort((a, b) => b.users - a.users); // Order by most users first
    
    const softSkills = skillDistribution
      .filter(skill => skill.type === 'soft')
      .sort((a, b) => b.users - a.users); // Order by most users first

    // Set both datasets
    setSkillDistributionData({ hard: hardSkills, soft: softSkills });


    // Objective Progress Chart Data - REAL-TIME
    // Get ONLY team objectives (not individual objectives)
    const teamObjectives = objectives.filter(obj => {
      // Only include objectives that are explicitly assigned to teams
      return obj.assigneeType === 'TEAM' && obj.teamId;
    });
    
    console.log('🎯 Team objectives for progress chart:', teamObjectives.map(obj => obj.title));

    // Filter to show only actual team objectives (assigned to teams, not individual targets)
    const actualTeamObjectives = teamObjectives.filter(obj => 
      obj.assigneeType === 'TEAM' && obj.teamId // Only objectives assigned to teams
    );

    console.log('🎯 Team objectives for chart filtering:', teamObjectives.length);
    console.log('🎯 Actual team objectives after filtering:', actualTeamObjectives.length);
    actualTeamObjectives.forEach((obj, index) => {
      console.log(`  ${index + 1}. "${obj.title}" - ${obj.progress}% (${obj.teamName})`);
    });

    const objectiveProgress = actualTeamObjectives
      .sort((a, b) => (b.progress || 0) - (a.progress || 0)) // Sort by progress descending
      .map(obj => ({
        name: obj.title.length > 20 ? obj.title.substring(0, 20) + '...' : obj.title,
        progress: obj.progress || 0,
        deadline: obj.deadline ? new Date(obj.deadline).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }) : 'N/A',
        teamName: obj.teamName || obj.team?.name || 'N/A'
      }))
      .slice(0, 10); // Show top 10

    console.log('📊 Final chart data:', objectiveProgress);
    
    // Set the actual data (empty array if no objectives)
      setObjectiveProgressData(objectiveProgress);

        // Generate last 12 months for comprehensive view (for the monthly overview)
    const monthlyActivity = {};
    const last12Months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      last12Months.push(monthKey);
      monthlyActivity[monthKey] = {
        requests: 0,
        objectives: 0,
        completedObjectives: 0,
        approvedRequests: 0,
        teamActivities: 0,
        skillDevelopment: 0
      };
    }

    // Load real monthly activity data from API
    const loadMonthlyActivityData = async () => {
      try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-based
        
        console.log('🔍 Loading monthly activity data for:', currentYear, currentMonth);
        const activityData = await dataService.getMonthlyActivity(currentYear, currentMonth);
        
        console.log('📊 Monthly activity data received:', activityData);
        
        // Update the daily activity data for the current month
        if (activityData.dailyActivity && activityData.dailyActivity.length > 0) {
          setDailyActivityData(activityData.dailyActivity);
        }
        
        // Also update the monthly activity chart data with real data
        const realMonthlyData = last12Months.map(month => {
          // For the current month, use real data
          if (month === currentDate.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })) {
            return {
              month,
              requests: activityData.summary?.totalRequests || 0,
              objectives: activityData.summary?.totalObjectives || 0,
              completedObjectives: activityData.summary?.completedObjectives || 0,
              approvedRequests: activityData.summary?.approvedRequests || 0,
              teamActivities: activityData.summary?.totalObjectives || 0,
              skillDevelopment: 0
            };
          } else {
            // For other months, use 0 for now (can be enhanced later)
            return {
              month,
              requests: 0,
              objectives: 0,
              completedObjectives: 0,
              approvedRequests: 0,
              teamActivities: 0,
              skillDevelopment: 0
            };
          }
        });
        
        setMonthlyActivityData(realMonthlyData);
        
      } catch (error) {
        console.error('❌ Error loading monthly activity data:', error);
        // Fallback to empty data
        setMonthlyActivityData([]);
        setDailyActivityData([]);
      }
    };

    // Call the function to load real data
    loadMonthlyActivityData();
    
    console.log('📊 Enhanced monthly activity data:', monthlyActivity);

    // Create comprehensive chart data showing 12 months with safe defaults
    const monthlyActivityChartData = last12Months.map(month => {
      const data = monthlyActivity[month] || {};
      return {
        month,
        requests: Number(data.requests) || 0,
        objectives: Number(data.objectives) || 0,
        completedObjectives: Number(data.completedObjectives) || 0,
        approvedRequests: Number(data.approvedRequests) || 0,
        teamActivities: Number(data.teamActivities) || 0,
        skillDevelopment: Number(data.skillDevelopment) || 0,
        totalActivity: (Number(data.requests) || 0) + (Number(data.objectives) || 0) + (Number(data.teamActivities) || 0)
      };
    });

    console.log('📊 Final monthly activity chart data:', monthlyActivityChartData);
    setMonthlyActivityData(monthlyActivityChartData);

    // Team Member Skills Radar Chart Data
    const teamMemberSkillsData = teams.map(team => {
      const teamMemberIds = team.members?.map(member => member.id) || [];
      const teamSkills = userSkills.filter(us => teamMemberIds.includes(us.userId));
      
      const skillLevels = skills.map(skill => {
        const skillData = teamSkills.filter(us => us.skillId === skill.id);
        const avgLevel = skillData.length > 0 
          ? skillData.reduce((sum, us) => sum + us.level, 0) / skillData.length 
          : 0;
        return { skill: skill.name, level: Math.round(avgLevel * 10) / 10 };
      }).slice(0, 6);

      return {
        team: team.name,
        skills: skillLevels
      };
    });

    // Load Recent Activities
    const activities = [];
    

    // Add objective activities
    objectives.slice(0, 5).forEach(objective => {
      const user = users.find(u => u.id === objective.createdBy);
      if (user) {
        activities.push({
          id: `objective-${objective.id}`,
          message: `Objectif "${objective.title}" créé par ${user.first_name} ${user.last_name}`,
          time: new Date(objective.createdAt).toLocaleDateString('fr-FR', { 
            day: 'numeric', 
            month: 'short', 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          color: 'text-green-600',
          icon: CheckCircleIcon
        });
      }
    });

    // Sort activities by time (most recent first) and take top 5
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    setRecentActivities(activities.slice(0, 5));

    // Late objectives are now handled in the main data loading function


  };

  const handleCardClick = (route) => {
    navigate(route);
  };

  const handleTeamClick = (team) => {
    setSelectedTeam(team);
    setShowTeamModal(true);
  };

  const handleDepartmentClick = (department) => {
    setSelectedDepartment(department);
    setShowDepartmentModal(true);
  };



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen p-8">
      {/* Enhanced Header */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <ChartBarIcon className="h-8 w-8 text-white" />
            </div>
          <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Vue d'ensemble Manager
              </h1>
              <p className="text-gray-600 text-lg mt-2">Tableau de bord de gestion d'équipe et de performance</p>
          </div>
          </div>

        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div 
            key={stat.name}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 cursor-pointer hover:shadow-xl hover:border-green-200 transition-all duration-300 hover:scale-105"
            onClick={() => handleCardClick(stat.route)}
          >
            <div className="flex items-center">
              <div className={`p-4 rounded-xl shadow-lg ${stat.color}`}>
                <stat.icon className="h-7 w-7 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-600">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
            <div className="mt-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                stat.changeType === 'positive' ? 'bg-green-100 text-green-800' :
                stat.changeType === 'negative' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Professional Dashboard Charts Section - Each taking full line */}
      
      {/* Team Performance Chart - Full Line */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 cursor-pointer hover:shadow-2xl transition-all duration-300" onClick={() => setShowTeamPerformanceModal(true)}>
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <ArrowTrendingUpIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Performance des équipes</h3>
            <p className="text-gray-600">Progression par équipe</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={teamPerformanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="progress" fill="#3B82F6" name="Progression %" />
            <Bar dataKey="completed" fill="#10B981" name="Objectifs complétés" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 text-center">
          <p className="text-sm text-blue-600 font-medium">Cliquez pour voir plus de détails</p>
        </div>
      </div>

      {/* Skills Distribution Chart - Full Line with Side-by-Side Hard/Soft Skills */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 cursor-pointer hover:shadow-2xl transition-all duration-300" onClick={() => setShowSkillsDistributionModal(true)}>
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <AcademicCapIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Distribution des compétences</h3>
            <p className="text-gray-600">Compétences techniques et comportementales</p>
          </div>
        </div>
        
        {/* Side-by-Side Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Hard Skills Chart */}
          <div>
            <h4 className="text-lg font-semibold text-gray-700 mb-4 text-center text-blue-600">Compétences Techniques</h4>
            <ResponsiveContainer width="100%" height={300}>
                {skillDistributionData.hard && skillDistributionData.hard.length > 0 ? (
                  <BarChart data={skillDistributionData.hard}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis domain={[0, 5]} tickCount={6} />
                    <Tooltip />
                    <Bar dataKey="users" fill="#3B82F6" />
                  </BarChart>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <AcademicCapIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-sm font-medium">Aucune compétence technique</p>
                  </div>
                </div>
              )}
            </ResponsiveContainer>
          </div>

          {/* Soft Skills Chart */}
          <div>
            <h4 className="text-lg font-semibold text-gray-700 mb-4 text-center text-green-600">Compétences Comportementales</h4>
            <ResponsiveContainer width="100%" height={300}>
                {skillDistributionData.soft && skillDistributionData.soft.length > 0 ? (
                  <BarChart data={skillDistributionData.soft}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis domain={[0, 5]} tickCount={6} />
                    <Tooltip />
                    <Bar dataKey="users" fill="#10B981" />
                  </BarChart>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <AcademicCapIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-sm font-medium">Aucune compétence comportementale</p>
                  </div>
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-indigo-600 font-medium">Cliquez pour voir plus de détails</p>
        </div>
      </div>


      {/* Objective Progress Chart - Full Line */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 cursor-pointer hover:shadow-2xl transition-all duration-300" onClick={() => setShowObjectiveProgressModal(true)}>
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
            <CheckCircleIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Progression des objectifs</h3>
            <p className="text-gray-600">Objectifs d'équipe</p>
          </div>
        </div>
        {objectiveProgressData.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={objectiveProgressData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
            <YAxis domain={[0, 100]} />
            <Tooltip 
              formatter={(value, name, props) => [
                `${value}%`, 
                'Progression'
              ]}
              labelFormatter={(label, payload) => {
                if (payload && payload[0] && payload[0].payload) {
                  const data = payload[0].payload;
                  return `${data.name} (${data.teamName})`;
                }
                return label;
              }}
            />
            <Bar dataKey="progress" fill="#F59E0B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-96 text-center">
            <div>
              <CheckCircleIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun objectif d'équipe</h3>
              <p className="text-gray-500">Créez des objectifs d'équipe pour voir leur progression ici</p>
            </div>
          </div>
        )}
        <div className="mt-4 text-center">
          <div className="flex justify-center space-x-6 text-sm">
            <div className="text-gray-600">
              <span className="font-semibold text-orange-600">{objectiveProgressData.length}</span> objectifs d'équipe
            </div>
            <div className="text-gray-600">
              Moyenne: <span className="font-semibold text-orange-600">
                {objectiveProgressData.length > 0 
                  ? Math.round(objectiveProgressData.reduce((sum, obj) => sum + obj.progress, 0) / objectiveProgressData.length)
                  : 0}%
              </span>
            </div>
          </div>
          <p className="text-sm text-orange-600 font-medium mt-2">Cliquez pour voir plus de détails</p>
        </div>
      </div>

      {/* Monthly Activity Chart */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 cursor-pointer hover:shadow-2xl transition-all duration-300" onClick={() => setShowMonthlyActivityModal(true)}>
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <CalendarIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Activité mensuelle</h3>
            <p className="text-gray-600">Métriques business et développement des équipes</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          {monthlyActivityData && monthlyActivityData.length > 0 ? (
            <LineChart data={monthlyActivityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="skillDevelopment" stroke="#8B5CF6" strokeWidth={3} name="Développement compétences" />
              <Line type="monotone" dataKey="teamActivities" stroke="#10B981" strokeWidth={3} name="Activités équipe" />
              <Line type="monotone" dataKey="completedObjectives" stroke="#F59E0B" strokeWidth={3} name="Objectifs complétés" />
              <Line type="monotone" dataKey="approvedRequests" stroke="#3B82F6" strokeWidth={3} name="Demandes approuvées" />
            </LineChart>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Chargement des données d'activité...
            </div>
          )}
        </ResponsiveContainer>
        <div className="mt-4 text-center">
          <p className="text-sm text-indigo-600 font-medium">Cliquez pour voir les détails jour par jour</p>
        </div>
        </div>

      {/* Teams and Departments Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Enhanced Teams Section */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <UserGroupIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Mes équipes ({managedTeams.length})</h3>
                <p className="text-gray-600">Gérez vos équipes et leurs performances</p>
              </div>
            </div>
          </div>
          
          {managedTeams.length === 0 ? (
              <div className="text-center py-12">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserGroupIcon className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Aucune équipe</h3>
              <p className="text-gray-600">Vous ne gérez aucune équipe pour le moment</p>
              </div>
            ) : (
              <div className="space-y-4">
              {managedTeams.slice(0, 3).map((team) => (
                <div
                  key={team.id}
                  onClick={() => handleTeamClick(team)}
                  className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-blue-300"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 mb-2">{team.name}</h4>
                      <p className="text-gray-600 mb-3">{team.description || 'Aucune description'}</p>
                      <div className="flex items-center space-x-4">
                        <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          <UsersIcon className="h-4 w-4 mr-1" />
                          {team.membersCount} membres
                        </span>
                        <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                          {team.departments && team.departments.length > 0 
                            ? team.departments.map(d => d.name).join(', ')
                            : 'Non assigné'}
                        </span>
                    </div>
                    </div>
                    <ArrowRightIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
                      )}
                    </div>

        {/* Enhanced Departments Section */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <BuildingOfficeIcon className="h-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {managedDepartments.length > 0 ? 'Départements que je gère' : 'Départements dont je suis membre'}
                </h3>
                <p className="text-gray-600">
                  {managedDepartments.length > 0 
                    ? `${managedDepartments.length} département(s)` 
                    : `${memberDepartments.length} département(s)`
                  }
                </p>
        </div>
      </div>
          </div>
          
          {managedDepartments.length === 0 && memberDepartments.length === 0 ? (
              <div className="text-center py-12">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <BuildingOfficeIcon className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Aucun département</h3>
              <p className="text-gray-600">Vous n'êtes membre d'aucun département pour le moment</p>
              </div>
            ) : (
              <div className="space-y-4">
              {(managedDepartments.length > 0 ? managedDepartments : memberDepartments).slice(0, 3).map((department) => (
                <div
                  key={department.id}
                  onClick={() => handleDepartmentClick(department)}
                  className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-purple-300"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 mb-2">{department.name}</h4>
                      <p className="text-gray-600 mb-3">{department.description || 'Aucune description'}</p>
                      <div className="flex items-center space-x-4">
                        <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                          <UsersIcon className="h-4 w-4 mr-1" />
                          {department.employeesCount} employés
                        </span>
                        <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          <UserGroupIcon className="h-4 w-4 mr-1" />
                          {department.teamsCount} équipes
                        </span>
                        {managedDepartments.length === 0 && (
                          <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                            Membre
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRightIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>

      {/* Recent Activities and Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activities */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Activités récentes</h3>
              <p className="text-gray-600">Dernières actions dans vos équipes</p>
            </div>
          </div>
          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                  <div className={`p-2 rounded-lg ${
                    activity.color === 'green' ? 'bg-green-100 text-green-600' :
                    activity.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                    activity.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {activity.icon === 'progress' && <CheckCircleIcon className="h-5 w-5" />}
                    {activity.icon === 'skill' && <AcademicCapIcon className="h-5 w-5" />}
                    {activity.icon === 'completed' && <CheckCircleIcon className="h-5 w-5" />}
                    {activity.icon === 'member' && <UsersIcon className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(activity.createdAt).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'short', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                <ClockIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Aucune activité récente</p>
                <p className="text-sm">Les activités de vos équipes apparaîtront ici</p>
              </div>
            )}
          </div>
        </div>

        {/* Late Objectives */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 cursor-pointer hover:shadow-2xl transition-all duration-300" onClick={() => setShowLateObjectivesModal(true)}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-white" />
          </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Objectifs en retard</h3>
              <p className="text-gray-600">Objectifs critiques nécessitant une attention immédiate</p>
              </div>
          </div>
              <div className="space-y-4">
                {upcomingDeadlines.length > 0 ? (
                  upcomingDeadlines.map((deadline) => (
                    <div key={deadline.id} className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-200">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {deadline.employee}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            deadline.assigneeType === 'team' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {deadline.assigneeType === 'team' ? '👥 Équipe' : '👤 Employé'}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {deadline.daysOverdue} jour{deadline.daysOverdue > 1 ? 's' : ''} en retard
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{deadline.skill}</p>
                        <p className="text-xs text-red-600 font-medium">
                          Progression: {deadline.progress}% | Temps écoulé: {deadline.timeProgress}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(deadline.deadline).toLocaleDateString('fr-FR', { 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                        </p>
                        <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-red-500 h-2 rounded-full" 
                            style={{ width: `${deadline.progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-red-600 font-medium mt-1">
                          {deadline.progress}% terminé
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <CheckCircleIcon className="h-16 w-16 mx-auto mb-4 text-green-300" />
                    <p className="text-lg font-medium">Aucun objectif en retard</p>
                    <p className="text-sm">Tous les objectifs sont dans les temps</p>
                  </div>
                )}
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-red-600 font-medium">Cliquez pour voir tous les objectifs en retard</p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedTeam && (
        <TeamDetailModal
          team={selectedTeam}
          isOpen={showTeamModal}
          onClose={() => {
            setShowTeamModal(false);
            setSelectedTeam(null);
          }}
          departments={[...managedDepartments, ...memberDepartments]}
        />
      )}

      {selectedDepartment && (
      <DepartmentDetailModal
        department={selectedDepartment}
        isOpen={showDepartmentModal}
          onClose={() => {
            setShowDepartmentModal(false);
            setSelectedDepartment(null);
          }}
        />
      )}

      {/* Chart Detail Modals */}
      
      {/* Team Performance Modal - Full Page */}
      {showTeamPerformanceModal && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold">Performance des équipes complète</h1>
                  <p className="text-blue-100 mt-2">Analyse détaillée de la performance de toutes les équipes</p>
                </div>
                <button
                  onClick={() => setShowTeamPerformanceModal(false)}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-2 transition-all"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-blue-600 text-2xl font-bold">
                    {teamPerformanceData.length}
                  </div>
                  <div className="text-sm text-gray-600">Total équipes</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-green-600 text-2xl font-bold">
                    {teamPerformanceData.reduce((sum, team) => sum + (team.members || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total membres</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-purple-600 text-2xl font-bold">
                    {teamPerformanceData.reduce((sum, team) => sum + (team.objectives || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total objectifs</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-yellow-600 text-2xl font-bold">
                    {teamPerformanceData.reduce((sum, team) => sum + (team.completed || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Objectifs complétés</div>
                </div>
              </div>

              {/* Enhanced Chart */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Graphique de performance des équipes</h2>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="progress" fill="#3B82F6" name="Progression %" />
                      <Bar dataKey="completed" fill="#10B981" name="Objectifs complétés" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Team Details Grid */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Détails par équipe</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {teamPerformanceData.map((team, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-6 border">
                      <h3 className="font-bold text-lg text-gray-900 mb-4">{team.name}</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Membres:</span>
                          <span className="font-medium">{team.members || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Objectifs:</span>
                          <span className="font-medium">{team.objectives || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Progression:</span>
                          <span className="font-medium">{team.progress || 0}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Complétés:</span>
                          <span className="font-medium">{team.completed || 0}</span>
                        </div>
                        <div className="mt-4">
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-blue-500 h-3 rounded-full" 
                              style={{ width: `${team.progress || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}






      {/* Objective Progress Modal - Full Page */}
      {showObjectiveProgressModal && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold">Progression des objectifs complète</h1>
                  <p className="text-orange-100 mt-2">Analyse détaillée de la progression de tous les objectifs d'équipe</p>
                </div>
                <button
                  onClick={() => setShowObjectiveProgressModal(false)}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-2 transition-all"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-orange-600 text-2xl font-bold">
                    {objectiveProgressData.length}
                  </div>
                  <div className="text-sm text-gray-600">Total objectifs</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-green-600 text-2xl font-bold">
                    {objectiveProgressData.filter(obj => obj.progress >= 100).length}
                  </div>
                  <div className="text-sm text-gray-600">Objectifs complétés</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-blue-600 text-2xl font-bold">
                    {objectiveProgressData.filter(obj => obj.progress > 0 && obj.progress < 100).length}
                  </div>
                  <div className="text-sm text-gray-600">En cours</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-gray-600 text-2xl font-bold">
                    {objectiveProgressData.filter(obj => obj.progress === 0).length}
                  </div>
                  <div className="text-sm text-gray-600">Non commencés</div>
                </div>
              </div>

              {/* Enhanced Chart */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Graphique de progression des objectifs</h2>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={objectiveProgressData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="progress" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Objective Details Grid */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Détails des objectifs d'équipe</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {objectiveProgressData.map((objective, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-6 border">
                      <h3 className="font-bold text-lg text-gray-900 mb-2">{objective.name}</h3>
                      <p className="text-sm text-blue-600 mb-4">Équipe: {objective.teamName}</p>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Progression:</span>
                          <span className="font-medium">{objective.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${objective.progress}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Échéance:</span>
                          <span className="font-medium">{objective.deadline}</span>
                        </div>
                        <div className="mt-4">
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-orange-500 h-3 rounded-full" 
                              style={{ width: `${objective.progress}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="text-center mt-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            objective.progress >= 100 ? 'bg-green-100 text-green-800' :
                            objective.progress > 0 ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {objective.progress >= 100 ? '✅ Terminé' :
                             objective.progress > 0 ? '🔄 En cours' :
                             '⏸️ Non commencé'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full-Page Skills Distribution Modal */}
      {showSkillsDistributionModal && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold">Distribution des compétences complète</h1>
                  <p className="text-indigo-100 mt-2">Analyse détaillée des compétences techniques et comportementales</p>
                </div>
                <button
                  onClick={() => setShowSkillsDistributionModal(false)}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-2 transition-all"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-blue-600 text-2xl font-bold">
                    {skillDistributionData.hard?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total compétences techniques</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-green-600 text-2xl font-bold">
                    {skillDistributionData.soft?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total compétences comportementales</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-purple-600 text-2xl font-bold">
                    {(skillDistributionData.hard?.length || 0) + (skillDistributionData.soft?.length || 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total compétences</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-yellow-600 text-2xl font-bold">
                    {(() => {
                      const allSkills = [...(skillDistributionData.hard || []), ...(skillDistributionData.soft || [])];
                      if (allSkills.length === 0) return 0;
                      const totalLevel = allSkills.reduce((sum, skill) => sum + (skill.averageLevel || skill.level || 0), 0);
                      return (totalLevel / allSkills.length).toFixed(1);
                    })()}
                  </div>
                  <div className="text-sm text-gray-600">Niveau moyen</div>
                </div>
              </div>

              {/* Enhanced Chart */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Distribution des compétences</h2>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    {skillDistributionData.hard && skillDistributionData.hard.length > 0 && skillDistributionData.soft && skillDistributionData.soft.length > 0 ? (
                      <BarChart data={[...skillDistributionData.hard, ...skillDistributionData.soft]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                        <YAxis domain={[0, 5]} tickCount={6} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="users" fill="#3B82F6" name="Utilisateurs" />
                      </BarChart>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        Aucune compétence trouvée
                      </div>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Skills Details Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Technical Skills Details */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold mb-4 text-blue-600">Compétences Techniques</h2>
                  <div className="space-y-4">
                    {skillDistributionData.hard?.map((skill, index) => (
                      <div key={index} className="bg-blue-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">{skill.name}</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Utilisateurs:</span>
                            <span className="ml-2 font-medium">{skill.users}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Niveau moyen:</span>
                            <span className="ml-2 font-medium">{skill.level}/5</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Pourcentage:</span>
                            <span className="ml-2 font-medium">{skill.percentage}%</span>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${skill.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Behavioral Skills Details */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold mb-4 text-green-600">Compétences Comportementales</h2>
                  <div className="space-y-4">
                    {skillDistributionData.soft?.map((skill, index) => (
                      <div key={index} className="bg-green-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">{skill.name}</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Utilisateurs:</span>
                            <span className="ml-2 font-medium">{skill.users}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Niveau moyen:</span>
                            <span className="ml-2 font-medium">{skill.level}/5</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Pourcentage:</span>
                            <span className="ml-2 font-medium">{skill.percentage}%</span>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="w-full bg-green-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${skill.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full-Page Monthly Activity Modal */}
      {showMonthlyActivityModal && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold">Activité mensuelle complète</h1>
                  <p className="text-indigo-100 mt-2">Analyse détaillée des métriques business sur 12 mois</p>
                </div>
                <button
                  onClick={() => setShowMonthlyActivityModal(false)}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-2 transition-all"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-blue-600 text-2xl font-bold">
                    {monthlyActivityData.reduce((sum, month) => sum + (month.approvedRequests || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Demandes approuvées</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-green-600 text-2xl font-bold">
                    {monthlyActivityData.reduce((sum, month) => sum + (month.completedObjectives || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Objectifs complétés</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-purple-600 text-2xl font-bold">
                    {monthlyActivityData.reduce((sum, month) => sum + (month.skillDevelopment || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Développement compétences</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-yellow-600 text-2xl font-bold">
                    {monthlyActivityData.reduce((sum, month) => sum + (month.teamActivities || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Activités équipe</div>
                </div>
              </div>

              {/* Enhanced Chart */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Évolution des métriques sur 12 mois</h2>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    {monthlyActivityData && monthlyActivityData.length > 0 ? (
                      <LineChart data={monthlyActivityData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="skillDevelopment" stroke="#8B5CF6" strokeWidth={4} name="Développement compétences" />
                        <Line type="monotone" dataKey="teamActivities" stroke="#10B981" strokeWidth={4} name="Activités équipe" />
                        <Line type="monotone" dataKey="completedObjectives" stroke="#F59E0B" strokeWidth={4} name="Objectifs complétés" />
                        <Line type="monotone" dataKey="approvedRequests" stroke="#3B82F6" strokeWidth={4} name="Demandes approuvées" />
                      </LineChart>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        Chargement des données d'activité...
                      </div>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Monthly Details Grid - Clickable for Daily View */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Détails par mois (cliquez pour voir les jours)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {monthlyActivityData.map((month, index) => (
                    <div 
                      key={index} 
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-gray-50 hover:bg-gray-100"
                      onClick={() => handleMonthClick(month.month)}
                    >
                      <h3 className="font-bold text-lg text-gray-900">{month.month}</h3>
                      <div className="space-y-2 mt-3">
                        <div className="flex justify-between">
                          <span className="text-blue-600">Demandes approuvées</span>
                          <span className="font-medium">{month.approvedRequests || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-600">Activités équipe</span>
                          <span className="font-medium">{month.teamActivities || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-600">Développement</span>
                          <span className="font-medium">{month.skillDevelopment || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-yellow-600">Objectifs complétés</span>
                          <span className="font-medium">{month.completedObjectives || 0}</span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex justify-between font-bold">
                            <span>Total activité</span>
                            <span>{(month.totalActivity || 0)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 text-center">
                        <span className="text-xs text-indigo-600 font-medium">👆 Cliquer pour voir les détails quotidiens</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Activity View Modal */}
      {selectedMonthForDaily && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold">Activité quotidienne - {selectedMonthForDaily}</h1>
                  <p className="text-blue-100 mt-2">Détail jour par jour des activités du mois</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedMonthForDaily(null)}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg px-4 py-2 transition-all"
                  >
                    ← Retour au mois
                  </button>
                  <button
                    onClick={() => {
                      setSelectedMonthForDaily(null);
                      setShowMonthlyActivityModal(false);
                    }}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-2 transition-all"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-blue-600 text-2xl font-bold">
                    {dailyActivityData.reduce((sum, day) => sum + day.requests, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total demandes</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-green-600 text-2xl font-bold">
                    {dailyActivityData.reduce((sum, day) => sum + day.objectives, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total objectifs</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-purple-600 text-2xl font-bold">
                    {dailyActivityData.reduce((sum, day) => sum + day.approvedRequests, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Demandes approuvées</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-yellow-600 text-2xl font-bold">
                    {dailyActivityData.reduce((sum, day) => sum + day.completedObjectives, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Objectifs complétés</div>
                </div>
              </div>

              {/* Daily Chart */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Activité quotidienne</h2>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    {dailyActivityData && dailyActivityData.length > 0 ? (
                      <LineChart data={dailyActivityData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="requests" stroke="#3B82F6" strokeWidth={3} name="Demandes" />
                        <Line type="monotone" dataKey="objectives" stroke="#10B981" strokeWidth={3} name="Objectifs" />
                        <Line type="monotone" dataKey="approvedRequests" stroke="#8B5CF6" strokeWidth={3} name="Demandes approuvées" />
                        <Line type="monotone" dataKey="completedObjectives" stroke="#F59E0B" strokeWidth={3} name="Objectifs complétés" />
                      </LineChart>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        Aucune activité trouvée pour ce mois
                      </div>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Daily Details Grid */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Détails par jour</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {dailyActivityData.map((day, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <h3 className="font-bold text-lg text-gray-900">{day.day}</h3>
                      <div className="space-y-1 mt-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-600">Demandes</span>
                          <span className="font-medium">{day.requests}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-600">Objectifs</span>
                          <span className="font-medium">{day.objectives}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-600">Approuvées</span>
                          <span className="font-medium">{day.approvedRequests}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-yellow-600">Complétés</span>
                          <span className="font-medium">{day.completedObjectives}</span>
                        </div>
                        <div className="pt-1 border-t">
                          <div className="flex justify-between font-bold">
                            <span>Total</span>
                            <span>{day.totalActivity}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Late Objectives Modal */}
      {showLateObjectivesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Tous les objectifs en retard</h2>
                  <p className="text-gray-600">Objectifs critiques nécessitant une attention immédiate</p>
                </div>
              </div>
              <button
                onClick={() => setShowLateObjectivesModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {allLateObjectives.length > 0 ? (
                <div className="space-y-4">
                  {allLateObjectives.map((objective) => (
                    <div key={objective.id} className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-200">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-lg font-medium text-gray-900">
                            {objective.employee}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            objective.assigneeType === 'team' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {objective.assigneeType === 'team' ? '👥 Équipe' : '👤 Employé'}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {objective.daysOverdue} jour{objective.daysOverdue > 1 ? 's' : ''} en retard
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{objective.skill}</p>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-gray-500">Progression:</span>
                            <span className="ml-2 font-medium text-red-600">{objective.progress}%</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Temps écoulé:</span>
                            <span className="ml-2 font-medium text-red-600">{objective.timeProgress}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(objective.deadline).toLocaleDateString('fr-FR', { 
                            day: 'numeric', 
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                        <div className="w-24 bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full" 
                            style={{ width: `${objective.progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-red-600 font-medium mt-1">
                          {objective.progress}% terminé
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircleIcon className="h-16 w-16 mx-auto mb-4 text-green-300" />
                  <p className="text-lg font-medium">Aucun objectif en retard</p>
                  <p className="text-sm">Tous les objectifs sont dans les temps</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerOverview; 