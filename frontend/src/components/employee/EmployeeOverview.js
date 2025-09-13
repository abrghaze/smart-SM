import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import {
  AcademicCapIcon,
  FlagIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  StarIcon,
  BoltIcon,
  CalendarIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { getSkillLevelName } from '../../utils/skillLevels';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

import DepartmentDetailModal from './DepartmentDetailModal';
import TeamDetailModal from './TeamDetailModal';

const EmployeeOverview = () => {
  const { user, isAuthLoading } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState([]);
  const [currentTargets, setCurrentTargets] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [organizationData, setOrganizationData] = useState({
    departments: [],
    teams: [],
    colleagues: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);

  // Chart data states
  const [skillProgressData, setSkillProgressData] = useState([]);
  const [objectiveProgressData, setObjectiveProgressData] = useState([]);
  const [skillLevelDistributionData, setSkillLevelDistributionData] = useState([]);
  const [weeklyActivityData, setWeeklyActivityData] = useState([]);
  const [skillRadarData, setSkillRadarData] = useState([]);
  
  // Modal states
  const [showSkillProgressModal, setShowSkillProgressModal] = useState(false);
  const [showSkillLevelDistributionModal, setShowSkillLevelDistributionModal] = useState(false);
  const [showObjectiveProgressModal, setShowObjectiveProgressModal] = useState(false);
  const [showSkillRadarModal, setShowSkillRadarModal] = useState(false);
  const [showMonthlyActivityModal, setShowMonthlyActivityModal] = useState(false);
  
  // Auto-sliding states
  const [currentObjectiveIndex, setCurrentObjectiveIndex] = useState(0);
  const [currentSkillIndex, setCurrentSkillIndex] = useState(0);

  useEffect(() => {
    // Don't fetch data if auth is still loading
    if (isAuthLoading || !user) {
      return;
    }

    const loadEmployeeData = async () => {
      try {
        setLoading(true);
        
        // Load employee-specific data with error handling
        // IMPROVED: Fetch ALL objectives the employee should see (not just direct assignments)
        const [objectivesResult, skillRequestsResult, notificationsResult, organizationDataResult, userSkillsResult, allSkillsResult] = await Promise.allSettled([
          dataService.getObjectives(), // Get ALL objectives, we'll filter them properly
          dataService.getMySkillRequests(),
          dataService.getNotifications({ userId: user.id, limit: 5 }),
          dataService.getMyOrganization(),
          dataService.getMyEmployeeSkills(),
          dataService.getSkills()
        ]);

        // IMPROVED: Simplified approach - get all objectives and filter them properly
        console.log('🔍 Using simplified objective fetching approach...');

        // Handle potential API failures gracefully
        const allObjectives = objectivesResult.status === 'fulfilled' ? objectivesResult.value : [];
        const skillRequests = skillRequestsResult.status === 'fulfilled' ? (skillRequestsResult.value.requests || []) : [];
        
        // IMPROVED: Filter objectives that belong to this employee
        const organizationData = organizationDataResult.status === 'fulfilled' ? organizationDataResult.value : { departments: [], teams: [], colleagues: [] };
        
        console.log('🔍 All objectives from backend:', allObjectives.length);
        console.log('🔍 Employee teams:', organizationData.teams?.map(t => ({ id: t.id, name: t.name })) || []);
        
        // TEMPORARY DEBUG MODE: Show ALL objectives to see what's happening
        console.log('🔍 DEBUG MODE: Showing ALL objectives without filtering');
        let objectives = allObjectives;
        
        console.log('🔍 All objectives from backend:', allObjectives.length);
        console.log('🔍 Employee teams:', organizationData.teams?.map(t => ({ id: t.id, name: t.name })) || []);
        
        // Log each objective to see its structure
        allObjectives.forEach((obj, index) => {
          console.log(`🔍 Objective ${index + 1}:`, {
            title: obj.title,
            assignee_type: obj.assignee_type,
            user_id: obj.user_id,
            team_id: obj.team_id,
            assigned_team_name: obj.assigned_team_name,
            progress: obj.progress,
            status: obj.status,
            fullObject: obj
          });
        });
        
        // DEBUG: Log the actual structure of objectives
        console.log('🔍 DEBUG: Final objectives structure:', objectives.map(obj => ({
          title: obj.title,
          assignee_type: obj.assignee_type,
          assigneeType: obj.assigneeType,
          team_id: obj.team_id,
          team: obj.assigned_team_name,
          progress: obj.progress,
          status: obj.status
        })));

        const userSkills = userSkillsResult.status === 'fulfilled' ? userSkillsResult.value : [];
        const allSkills = allSkillsResult.status === 'fulfilled' ? allSkillsResult.value.skills || allSkillsResult.value || [] : [];



        // Set organization data
        setOrganizationData(organizationData);

        // Calculate stats with safe array operations
        const activeObjectives = Array.isArray(objectives) ? objectives.filter(obj => obj.status === 'in_progress') : [];
        const completedObjectives = Array.isArray(objectives) ? objectives.filter(obj => obj.status === 'completed') : [];
        
        const calculatedStats = [
          {
            name: 'Compétences',
            value: user.skills?.length?.toString() || '0',
            change: '+0',
            changeType: 'positive',
            icon: AcademicCapIcon,
            color: 'bg-gradient-to-br from-green-500 to-green-600',
            route: '/employee/skills'
          },
          {
            name: 'Objectifs actifs',
            value: activeObjectives.length.toString(),
            change: '+0',
            changeType: 'positive',
            icon: FlagIcon,
            color: 'bg-gradient-to-br from-blue-500 to-blue-600',
            route: '/employee/targets'
          },
          {
            name: 'Objectifs complétés',
            value: completedObjectives.length.toString(),
            change: '+0',
            changeType: 'positive',
            icon: CheckCircleIcon,
            color: 'bg-gradient-to-br from-green-600 to-green-700',
            route: '/employee/targets'
          },
          {
            name: 'Demandes en cours',
            value: Array.isArray(skillRequests) ? skillRequests.filter(req => req.status === 'pending').length.toString() : '0',
            change: '+0',
            changeType: 'neutral',
            icon: ArrowTrendingUpIcon,
            color: 'bg-gradient-to-br from-purple-500 to-purple-600',
            route: '/employee/requests'
          }
        ];

        setStats(calculatedStats);

        // Set current targets - fetch individual contribution data separately
        const targetsWithIndividualData = await Promise.all(
          activeObjectives.map(async (obj) => {
            // For team objectives, fetch individual contribution data
            if (obj.assigneeType === 'TEAM') {
              try {
                const contributionResponse = await dataService.getObjectiveContributions(obj.id);
                if (contributionResponse && contributionResponse.contributions) {
                  // Find the contribution for the current user
                  const userContribution = contributionResponse.contributions.find(
                    contrib => contrib.assignee_user_id === user.id
                  );
                  
                  if (userContribution) {
                    console.log('🔍 Found user contribution:', userContribution);
                    return {
                      ...obj,
                      title: userContribution.task_description || obj.title,
                      description: userContribution.individual_description || obj.description,
                      deadline: userContribution.individual_deadline || obj.deadline,
                      individualDescription: userContribution.individual_description,
                      individualFile: userContribution.individual_file,
                      individualDeadline: userContribution.individual_deadline,
                      contributionDescription: userContribution.task_description,
                      isTeamContribution: true
                    };
                  }
                }
              } catch (error) {
                console.log('⚠️ Could not fetch contribution data for objective:', obj.id, error);
              }
            }
            
            return obj;
          })
        );
        
        console.log('🔍 Final targetsWithIndividualData:', targetsWithIndividualData.map(t => ({
          title: t.title,
          description: t.description,
          deadline: t.deadline,
          individualDescription: t.individualDescription,
          individualFile: t.individualFile,
          individualDeadline: t.individualDeadline
        })));
        
        setCurrentTargets(targetsWithIndividualData.slice(0, 5));

        // Debug logging
        console.log('🔍 Employee data loaded:', {
          userSkills: userSkills.length,
          allSkills: allSkills.length,
          objectives: objectives.length,
          skillRequests: skillRequests.length
        });
        console.log('📋 Sample user skill:', userSkills[0]);
        console.log('📋 Sample all skill:', allSkills[0]);
        console.log('🔍 Raw objectives data:', objectives);
        console.log('🔍 Objectives details:', objectives.map(obj => ({
          title: obj.title,
          assigneeType: obj.assigneeType,
          progress: obj.progress,
          status: obj.status,
          team: obj.team,
          assignedTo: obj.assignedTo,
          // Add individual contribution data logging
          contributionId: obj.contributionId,
          contributionDescription: obj.contributionDescription,
          individualDescription: obj.individualDescription,
          individualFile: obj.individualFile,
          individualDeadline: obj.individualDeadline,
          isTeamContribution: obj.isTeamContribution
        })));

        // Prepare chart data
        prepareChartData(userSkills, allSkills, objectives, skillRequests);

        // Create recent activities
        const activities = [];
        
        // Add recent skill requests
          skillRequests.slice(0, 3).forEach(request => {
            activities.push({
              id: request.id,
              type: 'skill_request',
            message: `Demande de compétence: ${request.requestedSkillName || request.skill?.name || 'Compétence'}`,
            time: new Date(request.createdAt).toLocaleDateString(),
            icon: AcademicCapIcon,
              color: 'text-blue-600'
            });
          });

        // Add recent objectives
        activeObjectives.slice(0, 2).forEach(objective => {
            activities.push({
            id: objective.id,
            type: 'objective_created',
            message: `Objectif en cours: ${objective.title}`,
            time: new Date(objective.createdAt).toLocaleDateString(),
              icon: CheckCircleIcon,
              color: 'text-green-600'
            });
          });

        setRecentActivities(activities);

      } catch (error) {
        console.error('Error loading employee data:', error);
        toast.error('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

      loadEmployeeData();
  }, [isAuthLoading, user]);

  // Auto-sliding effect for objectives
  useEffect(() => {
    if (objectiveProgressData.individual && objectiveProgressData.team) {
      const interval = setInterval(() => {
        setCurrentObjectiveIndex(prev => prev === 0 ? 1 : 0);
      }, 4000); // Switch every 4 seconds

      return () => clearInterval(interval);
    }
  }, [objectiveProgressData]);

  // Auto-sliding effect for skills
  useEffect(() => {
    if (skillRadarData.soft && skillRadarData.hard) {
      const interval = setInterval(() => {
        setCurrentSkillIndex(prev => prev === 0 ? 1 : 0);
      }, 4000); // Switch every 4 seconds

      return () => clearInterval(interval);
    }
  }, [skillRadarData]);

  const prepareChartData = (userSkills, allSkills, objectives, skillRequests) => {
    console.log('🔍 Preparing chart data with:', {
      userSkillsCount: userSkills.length,
      allSkillsCount: allSkills.length
    });

    // Helper function to get color based on skill level
    const getSkillLevelColor = (level) => {
      switch (level) {
        case 5: return '#10B981'; // Green
        case 4: return '#34D399'; // Light green
        case 3: return '#6EE7B7'; // Lighter green
        case 2: return '#A7F3D0'; // Very light green
        case 1: return '#D1FAE5'; // Lightest green
        default: return '#E5E7EB'; // Gray
      }
    };

    // Skill Progress Chart Data
    const skillProgress = userSkills.map(skill => {
      // For employee skills, the skill name is directly in the skill object
      const skillName = skill.name || skill.skill?.name || 'Compétence';
      const level = skill.level;
      console.log('📋 Processing skill:', { skillName, level, originalSkill: skill });
      return {
        name: skillName,
        level: level,
        maxLevel: 5,
        percentage: (level / 5) * 100,
        color: getSkillLevelColor(level)
      };
    }).sort((a, b) => b.level - a.level);

    console.log('✅ Skill progress data:', skillProgress);
    setSkillProgressData(skillProgress);

    // Objective Progress Chart Data - Split into individual and team objectives
    console.log('🔍 Processing objectives for charts...');
    console.log('🔍 All objectives:', objectives.map(obj => ({ 
      title: obj.title, 
      assigneeType: obj.assigneeType, 
      objectiveType: obj.objectiveType,
      team: obj.team,
      assignedTo: obj.assignedTo
    })));
    
    // IMPROVED categorization logic - Check actual data structure
    const categorizeObjective = (obj) => {
      console.log('🔍 Categorizing objective:', {
        title: obj.title,
        assignee_type: obj.assignee_type,
        assigneeType: obj.assigneeType,
        objectiveType: obj.objectiveType,
        team_id: obj.team_id,
        team: obj.team,
        assigned_team_name: obj.assigned_team_name,
        assignedTo: obj.assignedTo,
        isTeamContribution: obj.isTeamContribution,
        contributionId: obj.contributionId
      });
      
      // Check if this is a team contribution (has individual customization data)
      if (obj.isTeamContribution || obj.contributionId) {
        console.log(`✅ ${obj.title} categorized as TEAM (team contribution)`);
        return 'team';
      }
      
      // Check assignee type
      if (obj.assignee_type === 'TEAM' || obj.assigneeType === 'TEAM') {
        console.log(`✅ ${obj.title} categorized as TEAM (assignee type)`);
        return 'team';
      }
      
      if (obj.assignee_type === 'USER' || obj.assigneeType === 'USER') {
        console.log(`✅ ${obj.title} categorized as INDIVIDUAL (assignee type)`);
        return 'individual';
      }
      
      // Check for team information in data
      if (obj.team_id || obj.assigned_team_name || obj.team || obj.assignedTo?.name) {
        console.log(`✅ ${obj.title} categorized as TEAM (team data)`);
        return 'team';
      }
      
      // Default to individual
      console.log(`✅ ${obj.title} categorized as INDIVIDUAL (default)`);
      return 'individual';
    };
    
    const categorizedObjectives = objectives.map(obj => ({
      ...obj,
      category: categorizeObjective(obj)
    }));
    
    console.log('🔍 Categorized objectives:', categorizedObjectives.map(obj => ({
      title: obj.title,
      category: obj.category,
      assigneeType: obj.assigneeType,
      assignee_type: obj.assignee_type,
      team_id: obj.team_id,
      assigned_team_name: obj.assigned_team_name,
      team: obj.team,
      assignedTo: obj.assignedTo
    })));
    
    const individualObjectives = categorizedObjectives
      .filter(obj => obj.category === 'individual')
      .map(obj => ({
        name: obj.title.length > 20 ? obj.title.substring(0, 20) + '...' : obj.title,
        progress: obj.progress || 0,
        status: obj.status,
        deadline: obj.deadline ? new Date(obj.deadline).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }) : 'Non définie',
        type: 'individual'
      }));

    const teamObjectives = categorizedObjectives
      .filter(obj => obj.category === 'team')
      .map(obj => ({
        name: obj.title.length > 20 ? obj.title.substring(0, 20) + '...' : obj.title,
        progress: obj.progress || 0,
        status: obj.status,
        deadline: obj.deadline ? new Date(obj.deadline).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }) : 'Non définie',
        type: 'team'
      }));

    console.log('🔍 Filtered individual objectives:', individualObjectives);
    console.log('🔍 Filtered team objectives:', teamObjectives);

    console.log('🔍 Objectives processing:', {
      totalObjectives: objectives.length,
      individualObjectives: individualObjectives.length,
      teamObjectives: teamObjectives.length,
      allObjectives: objectives.map(obj => ({
        title: obj.title,
        assigneeType: obj.assigneeType,
        objectiveType: obj.objectiveType,
        isTeamContribution: obj.isTeamContribution,
        progress: obj.progress,
        team: obj.team,
        assignedTo: obj.assignedTo
      }))
    });
    setObjectiveProgressData({ individual: individualObjectives, team: teamObjectives });

    // Skill Level Distribution Chart Data
    const levelDistribution = {
      'Débutant (1-2)': userSkills.filter(s => s.level <= 2).length,
      'Intermédiaire (3)': userSkills.filter(s => s.level === 3).length,
      'Avancé (4-5)': userSkills.filter(s => s.level >= 4).length
    };

    const skillLevelDistributionChartData = [
      { name: 'Débutant (1-2)', value: levelDistribution['Débutant (1-2)'], color: '#F59E0B' },
      { name: 'Intermédiaire (3)', value: levelDistribution['Intermédiaire (3)'], color: '#3B82F6' },
      { name: 'Avancé (4-5)', value: levelDistribution['Avancé (4-5)'], color: '#10B981' }
    ];

    setSkillLevelDistributionData(skillLevelDistributionChartData);

    // Weekly Activity Data (Month divided into 4 weeks)
    console.log('🔍 Processing weekly activity data for employee...');
    console.log('🔍 Skill requests:', skillRequests.length, 'items');
    console.log('🔍 Objectives:', objectives.length, 'items');
    
    const weeklyActivity = {};
    
    // Helper function to get month name and week of month (1-4)
    const getWeekKey = (date) => {
      const d = new Date(date);
      const monthName = d.toLocaleDateString('fr-FR', { month: 'long' });
      const dayOfMonth = d.getDate();
      const weekOfMonth = Math.ceil(dayOfMonth / 7); // 1-4 weeks
      return `${monthName} - Semaine ${weekOfMonth}`;
    };
    
    // Add objectives by week of month
    objectives.forEach(objective => {
      const weekKey = getWeekKey(objective.createdAt);
      if (!weeklyActivity[weekKey]) weeklyActivity[weekKey] = { objectives: 0, skills: 0 };
      weeklyActivity[weekKey].objectives++;
      console.log(`🔍 Added objective for week: ${weekKey}`);
    });

    // Add skill requests by week of month
    skillRequests.forEach(request => {
      const weekKey = getWeekKey(request.createdAt);
      if (!weeklyActivity[weekKey]) weeklyActivity[weekKey] = { objectives: 0, skills: 0 };
      weeklyActivity[weekKey].skills++;
      console.log(`🔍 Added skill request for week: ${weekKey}`);
    });

    // Add all 4 weeks of current month if we have data
    const currentDate = new Date();
    const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long' });
    
    // Ensure all 4 weeks of the current month are represented
    for (let week = 1; week <= 4; week++) {
      const weekKey = `${monthName} - Semaine ${week}`;
      if (!weeklyActivity[weekKey]) {
        weeklyActivity[weekKey] = { objectives: 0, skills: 0 };
        console.log(`🔍 Added week: ${weekKey} with 0 activity`);
      }
    }

    console.log('🔍 Final weekly activity data for employee:', weeklyActivity);
    
    const weeklyActivityChartData = Object.entries(weeklyActivity)
      .filter(([week, data]) => week.includes(monthName)) // Only show current month
      .sort((a, b) => {
        // Sort by week number (1, 2, 3, 4)
        const weekA = parseInt(a[0].match(/Semaine (\d+)/)[1]);
        const weekB = parseInt(b[0].match(/Semaine (\d+)/)[1]);
        return weekA - weekB;
      })
      .map(([week, data]) => ({
        week,
        objectives: data.objectives,
        skills: data.skills
      }));

    setWeeklyActivityData(weeklyActivityChartData);

    // Skill Radar Chart Data - Split into soft skills and hard skills
    // First, categorize skills based on their type from the database
    const categorizedSkills = userSkills.reduce((acc, skill) => {
      const skillName = skill.name || skill.skill?.name || '';
      const skillType = skill.type || skill.skill?.type || '';
      
      // If the skill has a type from the database, use it
      if (skillType === 'soft') {
        acc.soft.push(skill);
      } else if (skillType === 'hard') {
        acc.hard.push(skill);
      } else {
        // Fallback to keyword-based categorization
        const softSkillKeywords = [
          'leadership', 'communication', 'teamwork', 'problem solving', 'problem-solving', 'adaptability', 
          'creativity', 'time management', 'collaboration', 'empathy', 'negotiation', 'interpersonal',
          'critical thinking', 'decision making', 'conflict resolution', 'mentoring', 'coaching',
          'presentation', 'public speaking', 'active listening', 'emotional intelligence'
        ];
        
        const hardSkillKeywords = [
          'python', 'javascript', 'java', 'react', 'node', 'sql', 'html', 'css', 'git', 'docker', 
          'aws', 'azure', 'database', 'api', 'testing', 'devops', 'typescript', 'angular', 'vue',
          'mongodb', 'postgresql', 'mysql', 'redis', 'kubernetes', 'jenkins', 'ansible', 'terraform',
          'linux', 'unix', 'windows', 'macos', 'mobile', 'ios', 'android', 'flutter', 'react native',
          'machine learning', 'ai', 'artificial intelligence', 'data science', 'analytics', 'bi',
          'excel', 'powerbi', 'tableau', 'r', 'matlab', 'scala', 'go', 'rust', 'php', 'ruby',
          'c#', 'c++', 'c', 'swift', 'kotlin', 'dart', 'perl', 'shell', 'bash', 'powershell',
          'jira', 'confluence', 'slack', 'teams', 'zoom', 'figma', 'sketch', 'adobe', 'photoshop',
          'illustrator', 'indesign', 'premiere', 'after effects', 'blender', 'maya', '3d', 'cad',
          'autocad', 'solidworks', 'fusion', 'inventor', 'revit', 'sketchup', 'rhino', 'grasshopper',
          'test', 'skill', 'advanced', 'lifecycle', 'custom', 'frontend', 'backend', 'fullstack',
          'web', 'mobile', 'desktop', 'cloud', 'server', 'network', 'security', 'cybersecurity',
          'blockchain', 'cryptocurrency', 'bitcoin', 'ethereum', 'smart contract', 'defi', 'nft',
          'metaverse', 'vr', 'ar', 'virtual reality', 'augmented reality', 'iot', 'internet of things',
          'robotics', 'automation', 'rpa', 'chatbot', 'nlp', 'natural language processing',
          'computer vision', 'deep learning', 'neural network', 'tensorflow', 'pytorch', 'keras',
          'scikit-learn', 'pandas', 'numpy', 'matplotlib', 'seaborn', 'plotly', 'dash', 'streamlit',
          'fastapi', 'django', 'flask', 'spring', 'express', 'nest', 'laravel', 'symfony', 'rails',
          'asp.net', 'dotnet', '.net', 'asp', 'mvc', 'mvvm', 'maven', 'gradle', 'npm', 'yarn',
          'webpack', 'vite', 'rollup', 'babel', 'eslint', 'prettier', 'jest', 'mocha', 'cypress',
          'selenium', 'playwright', 'puppeteer', 'postman', 'insomnia', 'swagger', 'openapi',
          'graphql', 'rest', 'soap', 'grpc', 'microservices', 'monolith', 'serverless', 'lambda',
          'function', 'event-driven', 'message queue', 'kafka', 'rabbitmq', 'redis', 'elasticsearch',
          'solr', 'lucene', 'hadoop', 'spark', 'kafka', 'storm', 'flink', 'airflow', 'luigi',
          'dbt', 'snowflake', 'bigquery', 'redshift', 'databricks', 'datafactory', 'glue',
          'etl', 'elt', 'data pipeline', 'data warehouse', 'data lake', 'data mart', 'olap',
          'olap', 'data mining', 'statistics', 'probability', 'linear algebra', 'calculus',
          'optimization', 'algorithm', 'data structure', 'design pattern', 'architecture',
          'clean code', 'tdd', 'bdd', 'ddd', 'agile', 'scrum', 'kanban', 'lean', 'six sigma',
          'project management', 'product management', 'business analysis', 'requirements',
          'user story', 'acceptance criteria', 'sprint', 'backlog', 'epic', 'story point',
          'velocity', 'burndown', 'retrospective', 'standup', 'planning', 'review', 'demo'
        ];
        
        if (softSkillKeywords.some(keyword => skillName.toLowerCase().includes(keyword))) {
          acc.soft.push(skill);
        } else if (hardSkillKeywords.some(keyword => skillName.toLowerCase().includes(keyword))) {
          acc.hard.push(skill);
        } else {
          // If no match found, default to hard skills (most technical skills fall here)
          acc.hard.push(skill);
        }
      }
      
      return acc;
    }, { soft: [], hard: [] });

    const softSkills = categorizedSkills.soft.map(skill => {
      const skillName = skill.name || skill.skill?.name || 'Compétence';
      return {
        skill: skillName,
        level: skill.level,
        fullMark: 5
      };
    });

    const hardSkills = categorizedSkills.hard.map(skill => {
      const skillName = skill.name || skill.skill?.name || 'Compétence';
      return {
        skill: skillName,
        level: skill.level,
        fullMark: 5
      };
    });

    console.log('✅ Soft skills radar data:', softSkills);
    console.log('✅ Hard skills radar data:', hardSkills);
    console.log('🔍 Total skills processed:', userSkills.length);
    console.log('🔍 Skills categorized as soft:', categorizedSkills.soft.length);
    console.log('🔍 Skills categorized as hard:', categorizedSkills.hard.length);
    console.log('🔍 All user skills:', userSkills.map(s => ({ name: s.name, type: s.type, level: s.level })));
    setSkillRadarData({ soft: softSkills, hard: hardSkills });
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
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
            <StarIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Vue d'ensemble Employé
            </h1>
            <p className="text-gray-600 text-lg mt-2">Tableau de bord de développement personnel et professionnel</p>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={stat.name}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 cursor-pointer hover:shadow-xl hover:border-emerald-200 transition-all duration-300 hover:scale-105"
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
                'bg-purple-100 text-purple-800'
              }`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section - Each taking full line */}
      
      {/* Skill Progress Chart - Full Line */}
      <div 
        className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 cursor-pointer hover:shadow-2xl transition-all duration-300"
        onClick={() => setShowSkillProgressModal(true)}
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
            <AcademicCapIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Progression des compétences</h3>
            <p className="text-gray-600">Niveaux actuels de vos compétences</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={skillProgressData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
            <YAxis domain={[0, 5]} />
            <Tooltip />
            <Bar dataKey="level">
              {skillProgressData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 text-center">
          <p className="text-sm text-green-600 font-medium">Cliquez pour voir plus de détails</p>
        </div>
      </div>

      {/* Skill Level Distribution Chart - Full Line */}
      <div 
        className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 cursor-pointer hover:shadow-2xl transition-all duration-300"
        onClick={() => setShowSkillLevelDistributionModal(true)}
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <ChartBarIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Distribution des niveaux</h3>
            <p className="text-gray-600">Répartition de vos compétences par niveau</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={skillLevelDistributionData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {skillLevelDistributionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Color Key/Legend */}
        <div className="flex items-center justify-center space-x-6 mt-6">
          {skillLevelDistributionData.map((level, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: level.color }}
              ></div>
              <span className="text-sm text-gray-600">{level.name} {level.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-blue-600 font-medium">Cliquez pour voir plus de détails</p>
        </div>
      </div>

      {/* Auto-sliding Charts Section - Each taking full line */}
      
      {/* Objectives Progress Chart - Full Line (Both Individual and Team) */}
      <div 
        className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 cursor-pointer hover:shadow-2xl transition-all duration-300"
        onClick={() => setShowObjectiveProgressModal(true)}
      >
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900">Progression des objectifs</h3>
          <p className="text-gray-600">Objectifs individuels et d'équipe</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Individual Objectives */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 text-orange-600">Objectifs individuels</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={objectiveProgressData.individual || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="progress" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Team Objectives */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 text-purple-600">Objectifs d'équipe</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={objectiveProgressData.team || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="progress" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-orange-600 font-medium">Cliquez pour voir plus de détails</p>
        </div>
      </div>

      {/* Auto-sliding Skills Radar Chart - Full Line */}
      <div 
        className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 cursor-pointer hover:shadow-2xl transition-all duration-300"
        onClick={() => setShowSkillRadarModal(true)}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Profil de compétences</h3>
          <div className="flex space-x-2">
                         <button
               onClick={(e) => {
                 e.stopPropagation();
                 setCurrentSkillIndex(0);
               }}
               className={`w-2 h-2 rounded-full transition-all duration-300 ${
                 currentSkillIndex === 0 ? 'bg-green-500' : 'bg-gray-300'
               }`}
             ></button>
             <button
               onClick={(e) => {
                 e.stopPropagation();
                 setCurrentSkillIndex(1);
               }}
               className={`w-2 h-2 rounded-full transition-all duration-300 ${
                 currentSkillIndex === 1 ? 'bg-blue-500' : 'bg-gray-300'
               }`}
             ></button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={currentSkillIndex === 0 ? (skillRadarData.soft || []) : (skillRadarData.hard || [])}>
            <PolarGrid />
            <PolarAngleAxis dataKey="skill" />
            <PolarRadiusAxis angle={30} domain={[0, 5]} />
            <Radar 
              name="Niveau" 
              dataKey="level" 
              stroke={currentSkillIndex === 0 ? '#10B981' : '#3B82F6'} 
              fill={currentSkillIndex === 0 ? '#10B981' : '#3B82F6'} 
              fillOpacity={0.3} 
            />
            <Tooltip formatter={(value, name) => [`Niveau ${value}/5`, name]} />
          </RadarChart>
        </ResponsiveContainer>
        <div className="mt-4 text-center">
          <p className="text-sm text-blue-600 font-medium">Cliquez pour voir plus de détails</p>
        </div>
      </div>

      {/* Monthly Progress Chart */}
      <div 
        className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 cursor-pointer hover:shadow-2xl transition-all duration-300"
        onClick={() => setShowMonthlyActivityModal(true)}
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <CalendarIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Activité mensuelle</h3>
            <p className="text-gray-600">Objectifs et demandes de compétences par mois</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={weeklyActivityData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="objectives" stroke="#3B82F6" strokeWidth={3} name="Objectifs" />
            <Line type="monotone" dataKey="skills" stroke="#10B981" strokeWidth={3} name="Demandes de compétences" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Organization Section - Full Line */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <BuildingOfficeIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Mon organisation</h3>
              <p className="text-gray-600">Équipes et départements</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Teams Section */}
          <div>
            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <UserGroupIcon className="h-5 w-5 mr-2 text-blue-600" />
              Mes équipes ({organizationData.teams.length})
            </h4>
            {organizationData.teams.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <UserGroupIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Vous n'êtes membre d'aucune équipe</p>
              </div>
            ) : (
              <div className="space-y-3">
                {organizationData.teams.slice(0, 3).map((team) => (
                  <div 
                    key={team.id} 
                    onClick={() => handleTeamClick(team)}
                    className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-blue-300"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-bold text-gray-900">{team.name}</h5>
                        <p className="text-sm text-gray-600">{team.description || 'Aucune description'}</p>
                      </div>
                      <ArrowTrendingUpIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Departments Section */}
          <div>
            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <BuildingOfficeIcon className="h-5 w-5 mr-2 text-purple-600" />
              Mes départements ({organizationData.departments.length})
            </h4>
            {organizationData.departments.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <BuildingOfficeIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Vous n'êtes membre d'aucun département</p>
              </div>
            ) : (
              <div className="space-y-3">
                {organizationData.departments.slice(0, 3).map((department) => (
                  <div
                    key={department.id}
                    onClick={() => handleDepartmentClick(department)}
                    className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-purple-300"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-bold text-gray-900">{department.name}</h5>
                        <p className="text-sm text-gray-600">{department.description || 'Aucune description'}</p>
                      </div>
                      <ArrowTrendingUpIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activities and Current Targets - Full Line */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activities */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Activités récentes</h3>
              <p className="text-gray-600">Dernières actions et mises à jour</p>
            </div>
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                <div className={`p-2 rounded-lg ${activity.color} bg-opacity-10`}>
                  <activity.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current Targets */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <FlagIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Objectifs actuels</h3>
              <p className="text-gray-600">Objectifs en cours de réalisation</p>
            </div>
          </div>
          <div className="space-y-4">
            {currentTargets.map((target) => (
              <div key={target.id} className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-gray-900">
                    {target.contributionDescription || target.title}
                  </h4>
                  <span className="text-sm text-gray-500">
                    {target.individualDeadline ? 
                      new Date(target.individualDeadline).toLocaleDateString() : 
                      target.deadline ? 
                        new Date(target.deadline).toLocaleDateString() : 
                        'Non définie'
                    }
                  </span>
                </div>
                
                {/* Show individual description if available, otherwise show main description */}
                <p className="text-sm text-gray-600 mb-3">
                  {target.individualDescription || target.description}
                </p>
                
                {/* Show individual file if available */}
                {target.individualFile && (
                  <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                    <span className="text-sm text-blue-600">
                      📎 Fichier joint: {target.individualFile}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${target.progress || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{target.progress || 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Modals */}
      
      {/* Skill Progress Modal - Full Page */}
      {showSkillProgressModal && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold">Progression des compétences complète</h1>
                  <p className="text-green-100 mt-2">Analyse détaillée de vos niveaux de compétences actuels</p>
                </div>
                <button
                  onClick={() => setShowSkillProgressModal(false)}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-2 transition-all"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-green-600 text-2xl font-bold">
                    {skillProgressData.length}
                  </div>
                  <div className="text-sm text-gray-600">Total compétences</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-blue-600 text-2xl font-bold">
                    {skillProgressData.filter(skill => skill.level >= 4).length}
                  </div>
                  <div className="text-sm text-gray-600">Compétences avancées</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-yellow-600 text-2xl font-bold">
                    {skillProgressData.filter(skill => skill.level >= 2 && skill.level < 4).length}
                  </div>
                  <div className="text-sm text-gray-600">Compétences intermédiaires</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-red-600 text-2xl font-bold">
                    {skillProgressData.filter(skill => skill.level < 2).length}
                  </div>
                  <div className="text-sm text-gray-600">Compétences débutantes</div>
                </div>
              </div>

              {/* Enhanced Chart */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Graphique de progression des compétences</h2>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={skillProgressData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis domain={[0, 5]} />
                      <Tooltip />
                      <Bar dataKey="level">
                        {skillProgressData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Skills Details Grid */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Détails des compétences</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {skillProgressData.map((skill, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-6 border">
                      <div className="flex items-center space-x-3 mb-4">
                        <div 
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: skill.color }}
                        ></div>
                        <h3 className="font-bold text-lg text-gray-900">{skill.name}</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Niveau actuel:</span>
                          <span className="font-medium">{skill.level}/5</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Niveau:</span>
                          <span className="font-medium">{getSkillLevelName(skill.level)}</span>
                        </div>
                        <div className="mt-4">
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-green-500 h-3 rounded-full" 
                              style={{ width: `${(skill.level / 5) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="text-center mt-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            skill.level >= 4 ? 'bg-green-100 text-green-800' :
                            skill.level >= 2 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {skill.level >= 4 ? '✅ Avancé' :
                             skill.level >= 2 ? '🔄 Intermédiaire' :
                             '⏸️ Débutant'}
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

      {/* Skill Level Distribution Modal - Full Page */}
      {showSkillLevelDistributionModal && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold">Distribution des niveaux complète</h1>
                  <p className="text-blue-100 mt-2">Analyse détaillée de la répartition de vos compétences par niveau</p>
                </div>
                <button
                  onClick={() => setShowSkillLevelDistributionModal(false)}
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
                    {skillLevelDistributionData.reduce((sum, level) => sum + level.value, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total compétences</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-green-600 text-2xl font-bold">
                    {skillLevelDistributionData.find(level => level.name === 'Avancé (4-5)')?.value || 0}
                  </div>
                  <div className="text-sm text-gray-600">Niveaux avancés</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-yellow-600 text-2xl font-bold">
                    {skillLevelDistributionData.find(level => level.name === 'Intermédiaire (3)')?.value || 0}
                  </div>
                  <div className="text-sm text-gray-600">Niveaux intermédiaires</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-red-600 text-2xl font-bold">
                    {skillLevelDistributionData.find(level => level.name === 'Débutant (1-2)')?.value || 0}
                  </div>
                  <div className="text-sm text-gray-600">Niveaux débutants</div>
                </div>
              </div>

              {/* Enhanced Chart */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Graphique de distribution des niveaux</h2>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={skillLevelDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {skillLevelDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Level Details Grid */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Détails par niveau</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {skillLevelDistributionData.map((level, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-6 border">
                      <div className="flex items-center space-x-3 mb-4">
                        <div 
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: level.color }}
                        ></div>
                        <h3 className="font-bold text-lg text-gray-900">{level.name}</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Nombre:</span>
                          <span className="font-medium">{level.value}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Pourcentage:</span>
                          <span className="font-medium">
                            {skillLevelDistributionData.length > 0 ? 
                              Math.round((level.value / skillLevelDistributionData.reduce((sum, l) => sum + l.value, 0)) * 100) : 0}%
                          </span>
                        </div>
                        <div className="mt-4">
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="h-3 rounded-full" 
                              style={{ 
                                width: `${skillLevelDistributionData.length > 0 ? (level.value / skillLevelDistributionData.reduce((sum, l) => sum + l.value, 0)) * 100 : 0}%`,
                                backgroundColor: level.color
                              }}
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
            <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold">Progression des objectifs complète</h1>
                  <p className="text-orange-100 mt-2">Analyse détaillée de vos objectifs individuels et d'équipe</p>
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
                    {(objectiveProgressData.individual || []).length + (objectiveProgressData.team || []).length}
                  </div>
                  <div className="text-sm text-gray-600">Total objectifs</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-blue-600 text-2xl font-bold">
                    {objectiveProgressData.individual?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Objectifs individuels</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-purple-600 text-2xl font-bold">
                    {objectiveProgressData.team?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Objectifs d'équipe</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-green-600 text-2xl font-bold">
                    {[...(objectiveProgressData.individual || []), ...(objectiveProgressData.team || [])]
                      .filter(obj => obj.progress === 100).length}
                  </div>
                  <div className="text-sm text-gray-600">Objectifs complétés</div>
                </div>
              </div>

              {/* Individual Objectives Section */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4 text-orange-600">Objectifs individuels</h2>
                <div className="h-96 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={objectiveProgressData.individual || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="progress" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(objectiveProgressData.individual || []).map((objective, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                      <h3 className="font-bold text-lg text-gray-900 mb-3">{objective.name}</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Progression:</span>
                          <span className="font-medium">{objective.progress}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Échéance:</span>
                          <span className="font-medium">{objective.deadline}</span>
                        </div>
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-orange-500 h-3 rounded-full transition-all duration-300" 
                              style={{ width: `${objective.progress}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="text-center mt-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            objective.progress === 100 ? 'bg-green-100 text-green-800' :
                            objective.progress >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {objective.progress === 100 ? '✅ Complété' :
                             objective.progress >= 50 ? '🔄 En cours' :
                             '⏸️ Débuté'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Team Objectives Section */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4 text-purple-600">Objectifs d'équipe</h2>
                <div className="h-96 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={objectiveProgressData.team || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="progress" fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(objectiveProgressData.team || []).map((objective, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                      <h3 className="font-bold text-lg text-gray-900 mb-3">{objective.name}</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Progression:</span>
                          <span className="font-medium">{objective.progress}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Échéance:</span>
                          <span className="font-medium">{objective.deadline}</span>
                        </div>
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-purple-500 h-3 rounded-full transition-all duration-300" 
                              style={{ width: `${objective.progress}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="text-center mt-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            objective.progress === 100 ? 'bg-green-100 text-green-800' :
                            objective.progress >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {objective.progress === 100 ? '✅ Complété' :
                             objective.progress >= 50 ? '🔄 En cours' :
                             '⏸️ Débuté'}
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

      {/* Skill Radar Modal - Full Page */}
      {showSkillRadarModal && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold">Profil de compétences complète</h1>
                  <p className="text-purple-100 mt-2">Analyse détaillée de vos compétences douces et techniques</p>
                </div>
                <button
                  onClick={() => setShowSkillRadarModal(false)}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-2 transition-all"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-purple-600 text-2xl font-bold">
                    {(skillRadarData.soft || []).length + (skillRadarData.hard || []).length}
                  </div>
                  <div className="text-sm text-gray-600">Total compétences</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-green-600 text-2xl font-bold">
                    {(skillRadarData.soft || []).length}
                  </div>
                  <div className="text-sm text-gray-600">Compétences douces</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-blue-600 text-2xl font-bold">
                    {(skillRadarData.hard || []).length}
                  </div>
                  <div className="text-sm text-gray-600">Compétences techniques</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-yellow-600 text-2xl font-bold">
                    {[...(skillRadarData.soft || []), ...(skillRadarData.hard || [])]
                      .filter(skill => skill.level >= 4).length}
                  </div>
                  <div className="text-sm text-gray-600">Niveaux avancés</div>
                </div>
              </div>
              
              {/* Soft Skills Section */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4 text-green-600">Compétences douces (Soft Skills)</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={skillRadarData.soft || []}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="skill" />
                        <PolarRadiusAxis angle={30} domain={[0, 5]} />
                        <Radar 
                          name="Niveau" 
                          dataKey="level" 
                          stroke="#10B981" 
                          fill="#10B981" 
                          fillOpacity={0.3} 
                        />
                        <Tooltip formatter={(value, name) => [`Niveau ${value}/5`, name]} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-4">
                    {(skillRadarData.soft || []).map((skill, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                        <h3 className="font-bold text-lg text-gray-900 mb-3">{skill.skill}</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Niveau:</span>
                            <span className="font-medium">{skill.level}/5</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Niveau:</span>
                            <span className="font-medium">{getSkillLevelName(skill.level)}</span>
                          </div>
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div 
                                className="bg-green-500 h-3 rounded-full transition-all duration-300" 
                                style={{ width: `${(skill.level / 5) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="text-center mt-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              skill.level >= 4 ? 'bg-green-100 text-green-800' :
                              skill.level >= 2 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {skill.level >= 4 ? '✅ Avancé' :
                               skill.level >= 2 ? '🔄 Intermédiaire' :
                               '⏸️ Débutant'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Hard Skills Section */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4 text-blue-600">Compétences techniques (Hard Skills)</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={skillRadarData.hard || []}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="skill" />
                        <PolarRadiusAxis angle={30} domain={[0, 5]} />
                        <Radar 
                          name="Niveau" 
                          dataKey="level" 
                          stroke="#3B82F6" 
                          fill="#3B82F6" 
                          fillOpacity={0.3} 
                        />
                        <Tooltip formatter={(value, name) => [`Niveau ${value}/5`, name]} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-4">
                    {(skillRadarData.hard || []).map((skill, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                        <h3 className="font-bold text-lg text-gray-900 mb-3">{skill.skill}</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Niveau:</span>
                            <span className="font-medium">{skill.level}/5</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Niveau:</span>
                            <span className="font-medium">{getSkillLevelName(skill.level)}</span>
                          </div>
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div 
                                className="bg-blue-500 h-3 rounded-full transition-all duration-300" 
                                style={{ width: `${(skill.level / 5) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="text-center mt-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              skill.level >= 4 ? 'bg-green-100 text-green-800' :
                              skill.level >= 2 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {skill.level >= 4 ? '✅ Avancé' :
                               skill.level >= 2 ? '🔄 Intermédiaire' :
                               '⏸️ Débutant'}
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
        </div>
      )}

      {/* Monthly Activity Modal - Full Page */}
      {showMonthlyActivityModal && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold">Activité mensuelle complète</h1>
                  <p className="text-indigo-100 mt-2">Analyse détaillée de vos objectifs et demandes de compétences par mois</p>
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
                <div className="bg-indigo-50 rounded-lg p-4">
                  <div className="text-indigo-600 text-2xl font-bold">
                    {weeklyActivityData.reduce((sum, week) => sum + week.objectives, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total objectifs</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-green-600 text-2xl font-bold">
                    {weeklyActivityData.reduce((sum, week) => sum + week.skills, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total demandes</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-blue-600 text-2xl font-bold">
                    {weeklyActivityData.length}
                  </div>
                  <div className="text-sm text-gray-600">Périodes analysées</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-yellow-600 text-2xl font-bold">
                    {weeklyActivityData.filter(week => week.objectives > 0 || week.skills > 0).length}
                  </div>
                  <div className="text-sm text-gray-600">Périodes actives</div>
                </div>
              </div>
              
              {/* Enhanced Chart Section */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Graphique d'activité mensuelle</h2>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyActivityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="objectives" stroke="#3B82F6" strokeWidth={3} name="Objectifs" />
                      <Line type="monotone" dataKey="skills" stroke="#10B981" strokeWidth={3} name="Demandes de compétences" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Detailed Data Tables Section */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Données détaillées par période</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {weeklyActivityData.map((data, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-6 border">
                      <h3 className="font-bold text-lg text-gray-900 mb-4 text-center">{data.week}</h3>
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600 mb-1">{data.objectives}</div>
                          <div className="text-sm text-gray-600">Objectifs</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600 mb-1">{data.skills}</div>
                          <div className="text-sm text-gray-600">Demandes de compétences</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-indigo-600 mb-1">{data.objectives + data.skills}</div>
                          <div className="text-sm text-gray-600">Total activités</div>
                        </div>
                        <div className="text-center mt-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            data.objectives > 0 || data.skills > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {data.objectives > 0 || data.skills > 0 ? '🟢 Actif' : '⚪ Inactif'}
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

      {/* Modals */}
      {selectedTeam && (
      <TeamDetailModal
        team={selectedTeam}
        isOpen={showTeamModal}
          onClose={() => {
            setShowTeamModal(false);
            setSelectedTeam(null);
          }}
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
    </div>
  );
};

export default EmployeeOverview; 