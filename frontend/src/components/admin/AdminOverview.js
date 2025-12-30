import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import {
  UsersIcon,
  AcademicCapIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  StarIcon,
  BoltIcon,
  XMarkIcon,
  BriefcaseIcon
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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

const AdminOverview = () => {
  const navigate = useNavigate();
  const { user, isAuthLoading } = useAuth();
  const [stats, setStats] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [allLateObjectives, setAllLateObjectives] = useState([]);
  const [showLateObjectivesModal, setShowLateObjectivesModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
      // Chart data states
    const [userGrowthData, setUserGrowthData] = useState([]);
    const [skillDistributionData, setSkillDistributionData] = useState({ hard: [], soft: [] });
    const [requestStatusData, setRequestStatusData] = useState([]);
    const [departmentStatsData, setDepartmentStatsData] = useState([]);
    const [monthlyActivityData, setMonthlyActivityData] = useState([]);
    
    // Skill display data
    // Removed displaySkillData as it's no longer needed
    

  
      // Modal states
    const [showUserGrowthModal, setShowUserGrowthModal] = useState(false);
    const [showSkillDistributionModal, setShowSkillDistributionModal] = useState(false);
    const [showRequestStatusModal, setShowRequestStatusModal] = useState(false);
    const [showDepartmentStatsModal, setShowDepartmentStatsModal] = useState(false);
    const [showMonthlyActivityModal, setShowMonthlyActivityModal] = useState(false);
    
    // Daily activity expansion state
    const [dailyActivityData, setDailyActivityData] = useState([]);
    
    // Store requests and objectives data for daily expansion
    const [requestsData, setRequestsData] = useState([]);
    const [objectivesData, setObjectivesData] = useState([]);
    
    // Store users data for skill distribution modal
    const [usersData, setUsersData] = useState([]);
    
    // Monthly activity modal state
    const [selectedMonthForDaily, setSelectedMonthForDaily] = useState(null);
    
    // Expanded deadline state
    const [expandedDeadline, setExpandedDeadline] = useState(null);
  
  // Debug logging
  console.log('AdminOverview rendered');

  const generateDailyActivityData = (monthStr, objectives, skillRequests) => {
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
      
      // Count skill requests created on this day
      skillRequests.forEach(request => {
        if (request.createdAt) {
          const requestDate = new Date(request.createdAt);
          if (requestDate.getDate() === day && 
              requestDate.getMonth() === monthIndex && 
              requestDate.getFullYear() === parseInt(year)) {
            dayRequests++;
            if (request.status === 'approved') {
              dayApprovedRequests++;
            }
          }
        }
      });
      
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

  const handleMonthClick = (monthStr) => {
    console.log('🗓️ Generating daily data for month:', monthStr);
    const dailyData = generateDailyActivityData(monthStr, objectivesData, requestsData);
    console.log('📅 Daily activity data:', dailyData);
    setDailyActivityData(dailyData);
    setSelectedMonthForDaily(monthStr);
  };

  useEffect(() => {
    // Don't fetch data if auth is still loading
    if (isAuthLoading || !user) {
      return;
    }

    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Load all data in parallel
        const [users, skills, teams, departments, skillRequests, objectives, userSkills, jobTitles] = await Promise.all([
          dataService.getUsers({ pageSize: 1000, include_inactive: true }),
          dataService.getSkills(),
          dataService.getTeams(),
          dataService.getDepartments(),
          dataService.getSkillRequests(),
          dataService.getObjectives(),
          dataService.getAllUserSkills(),
          dataService.getJobTitles()
        ]);

        // Store data for daily expansion
        setRequestsData(skillRequests);
        setObjectivesData(objectives);



        console.log('🔍 Loaded data:', {
          users: users?.length || 0,
          skills: skills?.length || 0,
          teams: teams?.length || 0,
          departments: departments?.length || 0,
          skillRequests: skillRequests?.length || 0,
          objectives: objectives?.length || 0,
          userSkills: userSkills?.length || 0
        });

        // Extract objectives from nested structure
        const objectivesData = objectives?.objectives || objectives || [];
        
        // Store data for daily expansion
        setRequestsData(skillRequests?.requests || skillRequests || []);
        setObjectivesData(objectivesData);



        // Calculate stats
        const calculatedStats = [
          {
            name: 'Utilisateurs totaux',
            value: users.length.toString(),
            change: '+0%',
            changeType: 'positive',
            icon: UsersIcon,
            color: 'bg-blue-500',
            route: '/admin/users'
          },
          {
            name: 'Compétences actives',
            value: skills.length.toString(),
            change: '+0%',
            changeType: 'positive',
            icon: AcademicCapIcon,
            color: 'bg-green-500',
            route: '/admin/skills'
          },
          {
            name: 'Équipes',
            value: teams.length.toString(),
            change: '+0',
            changeType: 'positive',
            icon: UserGroupIcon,
            color: 'bg-purple-500',
            route: '/admin/teams'
          },
          {
            name: 'Départements',
            value: departments.length.toString(),
            change: '0',
            changeType: 'neutral',
            icon: BuildingOfficeIcon,
            color: 'bg-orange-500',
            route: '/admin/departments'
          },
          {
            name: 'Titres de Poste',
            value: jobTitles.length.toString(),
            change: '0',
            changeType: 'neutral',
            icon: BriefcaseIcon,
            color: 'bg-indigo-500',
            route: '/admin/job-titles'
          }
        ];

        setStats(calculatedStats);

        // Create recent activities from real data
        const activities = [];
        
        // Add recent skill requests
        console.log('Admin skill requests data:', skillRequests);
        console.log('Admin skill requests length:', skillRequests?.requests?.length || skillRequests?.length || 0);
        
        const requests = skillRequests.requests || skillRequests;

        
        requests.slice(0, 3).forEach(request => {
          activities.push({
            id: request.id,
            type: 'skill_request',
            message: `Nouvelle demande de compétence: ${request.requestedSkillName || request.skill?.name || 'Compétence'}`,
            time: new Date(request.createdAt).toLocaleDateString(),
            icon: AcademicCapIcon,
            color: 'text-blue-600'
          });
        });

        // Add recent objectives
        objectivesData.slice(0, 2).forEach(objective => {
          activities.push({
            id: objective.id,
            type: 'objective_created',
            message: `Nouvel objectif créé: ${objective.title}`,
            time: new Date(objective.createdAt).toLocaleDateString(),
            icon: CheckCircleIcon,
            color: 'text-green-600'
          });
        });

        setRecentActivities(activities);

        // Filter late objectives from all objectives
        const lateObjectives = filterLateObjectives(objectivesData, users);
        console.log('🔍 Late objectives found:', lateObjectives.length);
        
        // Set top 5 most critical late objectives for display
        setUpcomingDeadlines(lateObjectives.slice(0, 5));
        // Set all late objectives for modal
        setAllLateObjectives(lateObjectives);

        // Prepare chart data
        prepareChartData(users, skills, teams, departments, skillRequests, objectivesData, userSkills);

        console.log('Dashboard data loaded:', {
          users: users.length,
          skills: skills.length,
          teams: teams.length,
          departments: departments.length,
          skillRequests: skillRequests.length,
          objectives: objectivesData.length
        });

      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast.error('Erreur lors du chargement des données du tableau de bord');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [isAuthLoading, user]);

  // Removed rotating skill display effect - now showing both charts simultaneously



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
        } else if (objective.created_by) {
          // Fallback to creator
          const creator = users.find(u => u.id === objective.created_by);
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

  const prepareChartData = (users, skills, teams, departments, skillRequests, objectives, userSkills) => {


            // User Growth Chart Data (by month) - Enhanced with historical data and role breakdown
        const userGrowth = {};
        
        // Process actual user data with role breakdown
        users.forEach(user => {
          const month = new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
          if (!userGrowth[month]) {
            userGrowth[month] = {
              total: 0,
              managers: 0,
              employees: 0
            };
          }
          userGrowth[month].total++;
          
          // Categorize by role
          if (user.role === 'manager') {
            userGrowth[month].managers++;
          } else {
            userGrowth[month].employees++;
          }
        });
    
    // If we only have one month of data, add previous months with zero values for better visualization
    if (Object.keys(userGrowth).length <= 1) {
      const currentDate = new Date();
      const monthsToShow = 6; // Show last 6 months
      
      for (let i = monthsToShow - 1; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthKey = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
        
        if (!userGrowth[monthKey]) {
          // Add previous month with zero values (no users before current month)
          userGrowth[monthKey] = {
            total: 0,
            managers: 0,
            employees: 0
          };
        }
      }
    }

            const userGrowthChartData = Object.entries(userGrowth)
          .sort((a, b) => {
            // Sort by date (convert month strings back to dates for proper sorting)
            // Handle French month abbreviations properly
            const monthNames = {
              'janv.': 0, 'févr.': 1, 'mars': 2, 'avr.': 3, 'mai': 4, 'juin': 5,
              'juil.': 6, 'août': 7, 'sept.': 8, 'oct.': 9, 'nov.': 10, 'déc.': 11
            };
            
            const [monthA, yearA] = a[0].split(' ');
            const [monthB, yearB] = b[0].split(' ');
            
            const dateA = new Date(parseInt(yearA), monthNames[monthA] || 0, 1);
            const dateB = new Date(parseInt(yearB), monthNames[monthB] || 0, 1);
            
            return dateA - dateB; // Chronological order (earliest first)
          })
          .map(([month, data]) => ({
            month,
            users: data.total,
            managers: data.managers,
            employees: data.employees
          }));


    setUserGrowthData(userGrowthChartData);

    // Skill Distribution Chart Data - Separate hard and soft skills
    const skillDistribution = skills.map(skill => {
      const usersWithSkill = userSkills.filter(us => us.skillId === skill.id);
      const userCount = usersWithSkill.length;
      
      // Calculate average level for this skill
      const avgLevel = userCount > 0 
        ? Math.round(usersWithSkill.reduce((sum, us) => sum + us.level, 0) / userCount)
        : 0;
      
      // Calculate percentage: (users with skill / total users) * 100
      const percentage = users.length > 0 ? Math.round((userCount / users.length) * 100) : 0;
      
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
        name: skill.name,
        type: skill.type || 'hard', // Default to hard if no type specified
        users: userCount,
        level: avgLevel,
        percentage: percentage,
        color: getColorByLevel(avgLevel)
      };
    });

    // Separate hard and soft skills, order by average level (highest level first)
    const hardSkills = skillDistribution
      .filter(skill => skill.type === 'hard')
      .sort((a, b) => b.level - a.level); // Order by highest level first
    
    const softSkills = skillDistribution
      .filter(skill => skill.type === 'soft')
      .sort((a, b) => b.level - a.level); // Order by highest level first

    // Set both datasets
    console.log('🔍 Skill distribution data:', { hard: hardSkills, soft: softSkills });
    setSkillDistributionData({ hard: hardSkills, soft: softSkills });

    // Request Status Chart Data - Weekly Filtering (Monday to Sunday)
    const requests = skillRequests.requests || skillRequests;
    
    console.log('Admin request status - requests:', requests);
    console.log('Admin request status - requests length:', requests.length);
    
    // Calculate current week (Monday to Sunday)
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay; // Adjust for Monday start
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + daysToMonday);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    console.log('📅 Weekly filter - Week start:', weekStart.toISOString());
    console.log('📅 Weekly filter - Week end:', weekEnd.toISOString());
    
    // Filter requests to current week only
    console.log('🔍 Debug Admin Request Filtering:');
    console.log('All requests:', requests);
    console.log('Week start:', weekStart.toISOString());
    console.log('Week end:', weekEnd.toISOString());
    
    const weeklyRequests = requests.filter(r => {
      const requestDate = new Date(r.createdAt);
      const isInWeek = requestDate >= weekStart && requestDate <= weekEnd;
      console.log(`Request ${r.id} (${r.status}): ${r.createdAt} -> ${requestDate.toISOString()} -> ${isInWeek ? 'IN' : 'OUT'}`);
      return isInWeek;
    });
    
    console.log('📊 Weekly requests count:', weeklyRequests.length);
    console.log('📊 All requests count:', requests.length);
    console.log('📊 Weekly requests:', weeklyRequests);
    
    const requestStatus = {
      approved: weeklyRequests.filter(r => r.status === 'approved').length,
      rejected: weeklyRequests.filter(r => r.status === 'rejected').length
    };
    
    console.log('Admin weekly request status counts:', requestStatus);

    const requestStatusChartData = [
      { name: 'Approuvées', value: requestStatus.approved, color: '#10B981' },
      { name: 'Rejetées', value: requestStatus.rejected, color: '#EF4444' }
    ];

    setRequestStatusData(requestStatusChartData);

    // Department Statistics Chart Data
    console.log('🔍 Debug Department Stats:');
    console.log('Departments:', departments);
    console.log('Users sample:', users.slice(0, 3));
    console.log('Teams sample:', teams.slice(0, 3));
    
    const departmentStats = departments.map(dept => {
      // Debug each department
      console.log(`\n📊 Processing department: ${dept.name} (ID: ${dept.id})`);
      
      // Count users in this department
      // Users can have multiple departments, so check if any of their departments match
      const deptUsers = users.filter(u => {
        // Check if user has departments array and if any department matches
        if (u.departments && Array.isArray(u.departments)) {
          const matches = u.departments.some(d => d.id === dept.id);
          if (matches) {
            console.log(`  ✅ User ${u.firstName} ${u.lastName} belongs to ${dept.name}`);
          }
          return matches;
        }
        // Fallback: check single department field
        const userDeptId = u.department?.id || u.departmentId || u.department_id;
        const matches = userDeptId === dept.id;
        if (matches) {
          console.log(`  ✅ User ${u.firstName} ${u.lastName} belongs to ${dept.name}`);
        }
        return matches;
      }).length;
      
      // Count teams in this department
      // Teams can have multiple departments, so check if any of their departments match
      const deptTeams = teams.filter(t => {
        // Check if team has departments array and if any department matches
        if (t.departments && Array.isArray(t.departments)) {
          const matches = t.departments.some(d => d.id === dept.id);
          if (matches) {
            console.log(`  ✅ Team ${t.name} belongs to ${dept.name}`);
          }
          return matches;
        }
        // Fallback: check single department field
        const teamDeptId = t.department?.id || t.departmentId || t.department_id;
        const matches = teamDeptId === dept.id;
        if (matches) {
          console.log(`  ✅ Team ${t.name} belongs to ${dept.name}`);
        }
        return matches;
      }).length;
      
      console.log(`  📈 Result: ${deptUsers} users, ${deptTeams} teams`);
      
      return {
        name: dept.name,
        users: deptUsers,
        teams: deptTeams
      };
    });

    console.log('📊 Final department stats:', departmentStats);
    setDepartmentStatsData(departmentStats);
    
    // Store users data for modal access
    setUsersData(users);

    // Monthly Activity Data - Real data with detailed categories
    const monthlyActivity = {};
    
    // Initialize all months with zero values for all categories
    const allMonths = new Set();
    
    // Collect all months from requests and objectives
    requests.forEach(request => {
      const month = new Date(request.createdAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      allMonths.add(month);
    });
    
    objectives.forEach(objective => {
      const month = new Date(objective.createdAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      allMonths.add(month);
    });
    
    // Initialize all months with zero values
    allMonths.forEach(month => {
      monthlyActivity[month] = {
        requests: 0,
        objectives: 0,
        completedObjectives: 0,
        uncompletedObjectives: 0,
        acceptedRequests: 0,
        refusedRequests: 0,
        pendingRequests: 0
      };
    });
    
    // Process skill requests by month with status
    console.log('🔍 Processing requests:', requests);
    console.log('🔍 Requests length:', requests?.length || 0);
    
    if (requests && requests.length > 0) {
      requests.forEach(request => {
        console.log('🔍 Processing request:', request);
        if (request && request.createdAt) {
          const month = new Date(request.createdAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
          if (!monthlyActivity[month]) {
            monthlyActivity[month] = {
              requests: 0,
              objectives: 0,
              completedObjectives: 0,
              uncompletedObjectives: 0,
              acceptedRequests: 0,
              refusedRequests: 0,
              pendingRequests: 0
            };
          }
          
          monthlyActivity[month].requests++;
          
          // Categorize by request status
          switch (request.status) {
            case 'approved':
              monthlyActivity[month].acceptedRequests++;
              break;
            case 'rejected':
              monthlyActivity[month].refusedRequests++;
              break;
            case 'pending':
              monthlyActivity[month].pendingRequests++;
              break;
            default:
              monthlyActivity[month].pendingRequests++;
          }
        }
      });
    } else {
      console.log('🔍 No requests found or requests is empty');
    }

    // Process objectives by month with completion status
    console.log('🔍 Processing objectives:', objectives);
    console.log('🔍 Objectives length:', objectives?.length || 0);
    
    if (objectives && objectives.length > 0) {
      objectives.forEach(objective => {
        console.log('🔍 Processing objective:', objective);
        if (objective && objective.createdAt) {
          const month = new Date(objective.createdAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
          if (!monthlyActivity[month]) {
            monthlyActivity[month] = {
              requests: 0,
              objectives: 0,
              completedObjectives: 0,
              uncompletedObjectives: 0,
              acceptedRequests: 0,
              refusedRequests: 0,
              pendingRequests: 0
            };
          }
          
          monthlyActivity[month].objectives++;
          
          // Categorize by objective completion
          if (objective.progress >= 100) {
            monthlyActivity[month].completedObjectives++;
          } else {
            monthlyActivity[month].uncompletedObjectives++;
          }
        }
      });
    } else {
      console.log('🔍 No objectives found or objectives is empty');
    }
    
    // If we have no data at all, add some sample data for demonstration
    if (Object.keys(monthlyActivity).length === 0) {
      console.log('🔍 No monthly activity data found, adding sample data');
      const currentDate = new Date();
      const monthsToShow = 3; // Show last 3 months
      
      for (let i = monthsToShow - 1; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthKey = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
        
        monthlyActivity[monthKey] = {
          requests: Math.floor(Math.random() * 5) + 1, // 1-5 requests
          objectives: Math.floor(Math.random() * 8) + 2, // 2-9 objectives
          completedObjectives: Math.floor(Math.random() * 3) + 1, // 1-3 completed
          uncompletedObjectives: Math.floor(Math.random() * 6) + 1, // 1-6 uncompleted
          acceptedRequests: Math.floor(Math.random() * 3) + 1, // 1-3 accepted
          refusedRequests: Math.floor(Math.random() * 2), // 0-1 refused
          pendingRequests: Math.floor(Math.random() * 2) + 1 // 1-2 pending
        };
      }
    }

    // If we only have one month of data, add previous months with zero values for better visualization
    if (Object.keys(monthlyActivity).length <= 1) {
      const currentDate = new Date();
      const monthsToShow = 6; // Show last 6 months
      
      for (let i = monthsToShow - 1; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthKey = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
        
        if (!monthlyActivity[monthKey]) {
          // Add previous month with zero values (no activity before current month)
          monthlyActivity[monthKey] = {
            requests: 0,
            objectives: 0,
            completedObjectives: 0,
            uncompletedObjectives: 0,
            acceptedRequests: 0,
            refusedRequests: 0,
            pendingRequests: 0
          };
        }
      }
    }

    const monthlyActivityChartData = Object.entries(monthlyActivity)
      .sort((a, b) => {
        // Sort by date (convert month strings back to dates for proper sorting)
        // Handle French month abbreviations properly
        const monthNames = {
          'janv.': 0, 'févr.': 1, 'mars': 2, 'avr.': 3, 'mai': 4, 'juin': 5,
          'juil.': 6, 'août': 7, 'sept.': 8, 'oct.': 9, 'nov.': 10, 'déc.': 11
        };
        
        const [monthA, yearA] = a[0].split(' ');
        const [monthB, yearB] = b[0].split(' ');
        
        const dateA = new Date(parseInt(yearA), monthNames[monthA] || 0, 1);
        const dateB = new Date(parseInt(yearB), monthNames[monthB] || 0, 1);
        
        return dateA - dateB; // Chronological order (earliest first)
      })
      .map(([month, data]) => ({
        month,
        requests: data.requests,
        objectives: data.objectives,
        completedObjectives: data.completedObjectives,
        uncompletedObjectives: data.uncompletedObjectives,
        acceptedRequests: data.acceptedRequests,
        refusedRequests: data.refusedRequests,
        pendingRequests: data.pendingRequests
      }));

    console.log('🔍 Final monthly activity data:', monthlyActivityChartData);
    setMonthlyActivityData(monthlyActivityChartData);
  };

  const handleCardClick = (route) => {
    navigate(route);
  };





  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/30">
              <ChartBarIcon className="h-10 w-10 text-white animate-pulse" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 blur-xl" />
          </div>
          <p className="text-gray-600 text-lg font-semibold">Chargement du tableau de bord...</p>
          <p className="text-gray-400 text-sm mt-1">Préparation de vos données</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Modern Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 rounded-3xl shadow-2xl p-8 text-white">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        
        <div className="relative flex items-start justify-between">
          <div className="flex items-center space-x-5">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
              <ChartBarIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Tableau de bord administrateur
              </h1>
              <p className="text-indigo-200 mt-1">Vue d'ensemble complète du système Smart Skill Matrix</p>
            </div>
          </div>
          
          {/* Quick stats summary */}
          <div className="hidden lg:flex items-center gap-6 bg-white/10 backdrop-blur-xl rounded-2xl px-6 py-3 border border-white/20">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats[0]?.value || 0}</p>
              <p className="text-xs text-indigo-200">Utilisateurs</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-bold">{stats[1]?.value || 0}</p>
              <p className="text-xs text-indigo-200">Compétences</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-bold">{stats[2]?.value || 0}</p>
              <p className="text-xs text-indigo-200">Équipes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {stats.map((stat, index) => {
          const gradients = [
            'from-blue-500 to-indigo-600',
            'from-emerald-500 to-teal-600',
            'from-violet-500 to-purple-600',
            'from-amber-500 to-orange-600',
            'from-rose-500 to-pink-600'
          ];
          const bgColors = [
            'bg-blue-50',
            'bg-emerald-50',
            'bg-violet-50',
            'bg-amber-50',
            'bg-rose-50'
          ];
          const iconColors = [
            'text-blue-600',
            'text-emerald-600',
            'text-violet-600',
            'text-amber-600',
            'text-rose-600'
          ];
          
          return (
            <div
              key={stat.name}
              className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 overflow-hidden"
              onClick={() => handleCardClick(stat.route)}
            >
              {/* Decorative gradient blob */}
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradients[index % 5]} opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500`} />
              
              <div className="relative">
                <div className={`inline-flex p-3 rounded-xl ${bgColors[index % 5]} mb-4`}>
                  <stat.icon className={`h-6 w-6 ${iconColors[index % 5]}`} />
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                
                <div className="mt-4 flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    stat.changeType === 'positive' ? 'bg-emerald-50 text-emerald-700' :
                    stat.changeType === 'negative' ? 'bg-red-50 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {stat.change}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6">


        {/* Skill Distribution Chart */}
        <div 
          className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300"
          onClick={() => setShowSkillDistributionModal(true)}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-emerald-50">
                <AcademicCapIcon className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Distribution des compétences</h3>
                <p className="text-sm text-gray-500">Compétences techniques et comportementales</p>
              </div>
            </div>
            <span className="text-xs text-gray-400 group-hover:text-indigo-600 transition-colors">Cliquer pour détails →</span>
          </div>
                      <ResponsiveContainer width="100%" height={300}>
              {(() => {
                return skillDistributionData && skillDistributionData.hard && skillDistributionData.soft && 
                       skillDistributionData.hard.length > 0 && skillDistributionData.soft.length > 0;
              })() ? (
                <div>
                  {/* Both charts side by side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Hard Skills Chart */}
                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="text-center mb-4">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-100 text-blue-700">
                          🔧 Compétences Techniques
                        </span>
                      </div>
                      
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={skillDistributionData.hard}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                            formatter={(value, name) => {
                              if (name === 'level') return [`Niveau ${value}/5`, 'Niveau moyen'];
                              if (name === 'users') return [value, 'Utilisateurs'];
                              return [value, name];
                            }}
                          />
                          <Bar dataKey="level" name="level" radius={[6, 6, 0, 0]}>
                            {skillDistributionData.hard.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Soft Skills Chart */}
                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="text-center mb-4">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-100 text-emerald-700">
                          💬 Compétences Comportementales
                        </span>
                      </div>
                      
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={skillDistributionData.soft}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                            formatter={(value, name) => {
                              if (name === 'level') return [`Niveau ${value}/5`, 'Niveau moyen'];
                              if (name === 'users') return [value, 'Utilisateurs'];
                              return [value, name];
                            }}
                          />
                          <Bar dataKey="level" name="level" radius={[6, 6, 0, 0]}>
                            {skillDistributionData.soft.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  

          </div>
        ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <AcademicCapIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-900">
                      {!skillDistributionData.hard || !skillDistributionData.soft ? 'Chargement...' : 'Aucune compétence'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {!skillDistributionData.hard || !skillDistributionData.soft ? 'Récupération des données...' : 'Aucune compétence trouvée'}
                    </p>
                  </div>
                </div>
              )}
            </ResponsiveContainer>
          

        </div>

        {/* User Growth Chart */}
        <div 
          className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 cursor-pointer hover:shadow-2xl transition-all duration-300"
          onClick={() => setShowUserGrowthModal(true)}
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <UsersIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Croissance des utilisateurs</h3>
              <p className="text-gray-600">Évolution mensuelle des inscriptions</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="users" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Request Status Chart */}
        <div 
          className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 cursor-pointer hover:shadow-2xl transition-all duration-300"
          onClick={() => setShowRequestStatusModal(true)}
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <BoltIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Statut des demandes</h3>
              <p className="text-gray-600">Répartition des demandes de compétences (semaine en cours)</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            {requestStatusData.some(status => status.value > 0) ? (
              <PieChart>
                <Pie
                  data={requestStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {requestStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <BoltIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Aucune demande</p>
                  <p className="text-sm">Aucune demande de compétence trouvée</p>
                </div>
              </div>
            )}
          </ResponsiveContainer>
          
          {/* Color Key/Legend */}
          <div className="flex items-center justify-center space-x-6 mt-6">
            {requestStatusData.map((status, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: status.color }}
                ></div>
                <span className="text-sm text-gray-600">{status.name} {status.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Department Statistics Chart */}
        <div 
          className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 cursor-pointer hover:shadow-2xl transition-all duration-300"
          onClick={() => setShowDepartmentStatsModal(true)}
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <BuildingOfficeIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Statistiques par département</h3>
              <p className="text-gray-600">Utilisateurs et équipes par département</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentStatsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="users" fill="#F59E0B" name="Utilisateurs" />
              <Bar dataKey="teams" fill="#EF4444" name="Équipes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Activity Chart */}
      <div 
        className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 cursor-pointer hover:shadow-2xl transition-all duration-300"
        onClick={() => setShowMonthlyActivityModal(true)}
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <StarIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Activité mensuelle</h3>
            <p className="text-gray-600">Demandes et objectifs créés par mois</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={monthlyActivityData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="objectives" stroke="#1F2937" strokeWidth={3} name="Objectifs" />
            <Line type="monotone" dataKey="requests" stroke="#2563EB" strokeWidth={3} name="Demandes" />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 text-center">
          <p className="text-sm text-indigo-600 font-medium">Cliquez pour voir les détails jour par jour</p>
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
              <p className="text-gray-600">Dernières actions dans le système</p>
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
            {upcomingDeadlines.map((deadline) => (
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
            ))}
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-red-600 font-medium">Cliquez pour voir tous les objectifs en retard</p>
          </div>
        </div>
      </div>

      {/* User Growth Modal */}
      {showUserGrowthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <UsersIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Croissance des utilisateurs</h3>
                    <p className="text-gray-600">Détails de l'évolution mensuelle des inscriptions</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUserGrowthModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-500" />
                </button>
              </div>
              <ResponsiveContainer width="100%" height={500}>
                <AreaChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="users" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userGrowthData.map((data, index) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">{data.month}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Nouveaux utilisateurs:</span>
                        <span className="font-medium">{data.users}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>
        )}

      {/* Skill Distribution Modal */}
      {showSkillDistributionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                    <AcademicCapIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Distribution des compétences</h3>
                    <p className="text-gray-600">Niveaux moyens et détails des compétences dans l'entreprise</p>
                  </div>
                </div>
          <button
                  onClick={() => setShowSkillDistributionModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
                  <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
              </div>
              {/* Hard Skills Chart */}
              <div className="mb-8">
                <h4 className="text-xl font-bold text-gray-900 mb-4">Compétences techniques (Hard Skills)</h4>
                <ResponsiveContainer width="100%" height={300}>
                  {skillDistributionData.hard && skillDistributionData.hard.length > 0 ? (
                    <BarChart data={skillDistributionData.hard}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis domain={[0, 5]} />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'level') return [`Niveau ${value}/5`, 'Niveau moyen'];
                          if (name === 'users') return [value, 'Utilisateurs'];
                          return [value, name];
                        }}
                      />
                      <Bar dataKey="level" name="Niveau moyen">
                        {skillDistributionData.hard.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-gray-500">
                        <AcademicCapIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">Aucune compétence technique</p>
                        <p className="text-sm">Aucune compétence technique trouvée</p>
                      </div>
                    </div>
                  )}
                </ResponsiveContainer>
      </div>

              {/* Soft Skills Chart */}
              <div className="mb-8">
                <h4 className="text-xl font-bold text-gray-900 mb-4">Compétences comportementales (Soft Skills)</h4>
                <ResponsiveContainer width="100%" height={300}>
                  {skillDistributionData.soft && skillDistributionData.soft.length > 0 ? (
                    <BarChart data={skillDistributionData.soft}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis domain={[0, 5]} />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'level') return [`Niveau ${value}/5`, 'Niveau moyen'];
                          if (name === 'users') return [value, 'Utilisateurs'];
                          return [value, name];
                        }}
                      />
                      <Bar dataKey="level" name="Niveau moyen">
                        {skillDistributionData.soft.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-gray-500">
                        <AcademicCapIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">Aucune compétence comportementale</p>
                        <p className="text-sm">Aucune compétence comportementale trouvée</p>
                      </div>
                    </div>
                  )}
                </ResponsiveContainer>
              </div>
              
              {/* Color Legend */}
              <div className="mt-6 mb-4 flex items-center justify-center space-x-6">
                <div className="text-sm text-gray-600 font-medium">Légende des niveaux:</div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }}></div>
                    <span className="text-sm">Niveau 5</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#34D399' }}></div>
                    <span className="text-sm">Niveau 4</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#6EE7B7' }}></div>
                    <span className="text-sm">Niveau 3</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#A7F3D0' }}></div>
                    <span className="text-sm">Niveau 2</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#D1FAE5' }}></div>
                    <span className="text-sm">Niveau 1</span>
                  </div>
                </div>
              </div>
              {/* Hard Skills Details */}
              {skillDistributionData.hard && skillDistributionData.hard.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Détails des compétences techniques</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {skillDistributionData.hard.map((skill, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">{skill.name}</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Utilisateurs:</span>
                            <span className="font-medium">{skill.users}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Niveau moyen:</span>
                            <span className="font-medium">{skill.level}/5</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pourcentage:</span>
                            <span className="font-medium">{skill.percentage}%</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span>Niveau:</span>
                            <div 
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: skill.color }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Soft Skills Details */}
              {skillDistributionData.soft && skillDistributionData.soft.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Détails des compétences comportementales</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {skillDistributionData.soft.map((skill, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">{skill.name}</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Utilisateurs:</span>
                            <span className="font-medium">{skill.users}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Niveau moyen:</span>
                            <span className="font-medium">{skill.level}/5</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pourcentage:</span>
                            <span className="font-medium">{skill.percentage}%</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span>Niveau:</span>
                            <div 
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: skill.color }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Request Status Modal */}
      {showRequestStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <BoltIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Statut des demandes</h3>
                    <p className="text-gray-600">Détails de la répartition des demandes de compétences (semaine en cours)</p>
                  </div>
                </div>
          <button
                  onClick={() => setShowRequestStatusModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
                  <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={requestStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {requestStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-4">
                  {requestStatusData.map((status, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: status.color }}></div>
                        <h4 className="font-semibold text-gray-900">{status.name}</h4>
                        <span className="ml-auto font-bold text-lg">{status.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Department Statistics Modal */}
      {showDepartmentStatsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <BuildingOfficeIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Statistiques par département</h3>
                    <p className="text-gray-600">Détails des utilisateurs et équipes par département</p>
                  </div>
                </div>
          <button
                  onClick={() => setShowDepartmentStatsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
                  <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
              </div>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={departmentStatsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="users" fill="#F59E0B" name="Utilisateurs" />
                  <Bar dataKey="teams" fill="#EF4444" name="Équipes" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departmentStatsData.map((dept, index) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">{dept.name}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Utilisateurs:</span>
                        <span className="font-medium">{dept.users}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Équipes:</span>
                        <span className="font-medium">{dept.teams}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Activity Modal */}
      {showMonthlyActivityModal && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold">Activité mensuelle complète</h1>
                  <p className="text-indigo-100 mt-2">Analyse détaillée des demandes et objectifs sur 12 mois</p>
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
                    {monthlyActivityData.reduce((sum, month) => sum + (month.acceptedRequests || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Demandes acceptées</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-green-600 text-2xl font-bold">
                    {monthlyActivityData.reduce((sum, month) => sum + (month.completedObjectives || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Objectifs complétés</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-purple-600 text-2xl font-bold">
                    {monthlyActivityData.reduce((sum, month) => sum + (month.requests || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total demandes</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-yellow-600 text-2xl font-bold">
                    {monthlyActivityData.reduce((sum, month) => sum + (month.objectives || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total objectifs</div>
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
                        <Legend 
                          content={({ payload }) => (
                            <div className="flex flex-wrap justify-center gap-4 mt-4">
                              {payload?.map((entry, index) => {
                                const isDashed = entry.payload?.strokeDasharray === "5,5";
                                return (
                                  <div key={index} className="flex items-center space-x-2">
                                    <div 
                                      className="w-4 h-3 rounded"
                                      style={{ 
                                        backgroundColor: entry.color,
                                        backgroundImage: isDashed ? 'repeating-linear-gradient(90deg, transparent, transparent 2px, currentColor 2px, currentColor 4px)' : 'none'
                                      }}
                                    />
                                    <span className="text-sm text-gray-700">
                                      {entry.value}
                                      {isDashed && <span className="text-xs text-gray-500 ml-1">(ligne pointillée)</span>}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        />
                        
                        {/* Lines ordered from highest to lowest values with distinct colors */}
                        <Line type="monotone" dataKey="objectives" stroke="#1F2937" strokeWidth={4} name="Objectifs totaux" />
                        <Line type="monotone" dataKey="requests" stroke="#2563EB" strokeWidth={4} strokeDasharray="5,5" name="Demandes totales" />
                        <Line type="monotone" dataKey="uncompletedObjectives" stroke="#EA580C" strokeWidth={3} name="Objectifs non complétés" />
                        <Line type="monotone" dataKey="completedObjectives" stroke="#16A34A" strokeWidth={3} name="Objectifs complétés" />
                        <Line type="monotone" dataKey="acceptedRequests" stroke="#059669" strokeWidth={3} strokeDasharray="5,5" name="Demandes acceptées" />
                        <Line type="monotone" dataKey="pendingRequests" stroke="#CA8A04" strokeWidth={3} strokeDasharray="5,5" name="Demandes en attente" />
                        <Line type="monotone" dataKey="refusedRequests" stroke="#DC2626" strokeWidth={3} strokeDasharray="5,5" name="Demandes refusées" />
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
                          <span className="text-blue-600">Demandes totales</span>
                          <span className="font-medium">{month.requests || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-600">Demandes acceptées</span>
                          <span className="font-medium">{month.acceptedRequests || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-600">Objectifs totaux</span>
                          <span className="font-medium">{month.objectives || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-yellow-600">Objectifs complétés</span>
                          <span className="font-medium">{month.completedObjectives || 0}</span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex justify-between font-bold">
                            <span>Total activité</span>
                            <span>{(month.requests || 0) + (month.objectives || 0)}</span>
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
                  <div className="text-blue-600 text-2xl font-bold">
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
                  <div className="text-blue-600 text-2xl font-bold">
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

      {/* User Growth Modal */}
      {showUserGrowthModal && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold">Croissance des utilisateurs complète</h1>
                  <p className="text-blue-100 mt-2">Analyse détaillée de l'évolution des inscriptions</p>
                </div>
                <button
                  onClick={() => setShowUserGrowthModal(false)}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-2 transition-all"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-blue-600 text-2xl font-bold">
                    {userGrowthData.reduce((sum, month) => sum + (month.users || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total utilisateurs</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-green-600 text-2xl font-bold">
                    {userGrowthData.reduce((sum, month) => sum + (month.managers || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total managers</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-purple-600 text-2xl font-bold">
                    {userGrowthData.reduce((sum, month) => sum + (month.employees || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total employés</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-orange-600 text-2xl font-bold">
                    {userGrowthData.length > 0 ? userGrowthData[userGrowthData.length - 1]?.users || 0 : 0}
                  </div>
                  <div className="text-sm text-gray-600">Utilisateurs ce mois</div>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4">
                  <div className="text-indigo-600 text-2xl font-bold">
                    {userGrowthData.length > 1 ? 
                      (userGrowthData[userGrowthData.length - 1]?.users || 0) - (userGrowthData[userGrowthData.length - 2]?.users || 0) : 0}
                  </div>
                  <div className="text-sm text-gray-600">Croissance ce mois</div>
                </div>
              </div>

              {/* Enhanced Chart */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Évolution de la croissance des utilisateurs</h2>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    {userGrowthData && userGrowthData.length > 0 ? (
                      <AreaChart data={userGrowthData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="users" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} name="Total utilisateurs" />
                        <Area type="monotone" dataKey="managers" stroke="#10B981" fill="#10B981" fillOpacity={0.2} name="Managers" />
                        <Area type="monotone" dataKey="employees" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} name="Employés" />
                      </AreaChart>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        Aucune donnée de croissance disponible
                      </div>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Monthly Details Grid */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Détails par mois</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userGrowthData.map((month, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <h3 className="font-bold text-lg text-gray-900">{month.month}</h3>
                      <div className="mt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-blue-600 font-medium">Total</span>
                          <span className="text-2xl font-bold text-blue-600">{month.users || 0}</span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-green-600">Managers:</span>
                            <span className="font-medium text-green-600">{month.managers || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-orange-600">Employés:</span>
                            <span className="font-medium text-orange-600">{month.employees || 0}</span>
                          </div>
                        </div>
                        {index > 0 && (
                          <div className="mt-2 text-sm">
                            <span className={`font-medium ${
                              (month.users || 0) > (userGrowthData[index - 1]?.users || 0) 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {((month.users || 0) - (userGrowthData[index - 1]?.users || 0)) > 0 ? '+' : ''}
                              {(month.users || 0) - (userGrowthData[index - 1]?.users || 0)} utilisateurs
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Skill Distribution Modal */}
      {showSkillDistributionModal && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold">Distribution des compétences complète</h1>
                  <p className="text-green-100 mt-2">Analyse détaillée des compétences techniques et comportementales</p>
                </div>
                <button
                  onClick={() => setShowSkillDistributionModal(false)}
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
                    {skillDistributionData.hard.length}
                  </div>
                  <div className="text-sm text-gray-600">Compétences techniques</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-green-600 text-2xl font-bold">
                    {skillDistributionData.soft.length}
                  </div>
                  <div className="text-sm text-gray-600">Compétences comportementales</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-purple-600 text-2xl font-bold">
                    {usersData ? usersData.length : 0}
                  </div>
                  <div className="text-sm text-gray-600">Total utilisateurs</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-yellow-600 text-2xl font-bold">
                    {(() => {
                      const allSkills = [
                        ...(skillDistributionData.hard || []),
                        ...(skillDistributionData.soft || [])
                      ];
                      return allSkills.length > 0 
                        ? Math.round(allSkills.reduce((sum, skill) => sum + (skill.level || 0), 0) / allSkills.length)
                        : 0;
                    })()}
                  </div>
                  <div className="text-sm text-gray-600">Niveau moyen</div>
                </div>
              </div>

              {/* Enhanced Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Hard Skills Chart */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold mb-4">🔧 Compétences Techniques</h2>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      {skillDistributionData.hard && skillDistributionData.hard.length > 0 ? (
                        <BarChart data={skillDistributionData.hard}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                          <YAxis domain={[0, 5]} />
                          <Tooltip />
                          <Bar dataKey="level" name="Niveau moyen" fill="#3B82F6">
                            {skillDistributionData.hard.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          Aucune compétence technique disponible
                        </div>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Soft Skills Chart */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold mb-4">💬 Compétences Comportementales</h2>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      {skillDistributionData.soft && skillDistributionData.soft.length > 0 ? (
                        <BarChart data={skillDistributionData.soft}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                          <YAxis domain={[0, 5]} />
                          <Tooltip />
                          <Bar dataKey="level" name="Niveau moyen" fill="#10B981">
                            {skillDistributionData.soft.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          Aucune compétence comportementale disponible
                        </div>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Skills Details Grid */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Détails des compétences</h2>
                
                {/* Technical Skills Details */}
                {skillDistributionData.hard && skillDistributionData.hard.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-blue-600 mb-4">🔧 Compétences Techniques</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {skillDistributionData.hard.map((skill, index) => (
                        <div key={index} className="border rounded-lg p-4 bg-blue-50">
                          <h4 className="font-bold text-lg text-gray-900 mb-3">{skill.name}</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 text-sm">Niveau moyen</span>
                              <span className="font-bold text-blue-600 text-lg">{skill.level}/5</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 text-sm">Utilisateurs</span>
                              <span className="font-medium text-gray-900">{skill.users}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 text-sm">Pourcentage</span>
                              <span className="font-medium text-gray-900">{skill.percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div 
                                className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                                style={{ width: `${(skill.level / 5) * 100}%` }}
                              ></div>
                            </div>
                            <div className="flex items-center justify-center">
                              <div 
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: skill.color }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Behavioral Skills Details */}
                {skillDistributionData.soft && skillDistributionData.soft.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-green-600 mb-4">💬 Compétences Comportementales</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {skillDistributionData.soft.map((skill, index) => (
                        <div key={index} className="border rounded-lg p-4 bg-green-50">
                          <h4 className="font-bold text-lg text-gray-900 mb-3">{skill.name}</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 text-sm">Niveau moyen</span>
                              <span className="font-bold text-green-600 text-lg">{skill.level}/5</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 text-sm">Utilisateurs</span>
                              <span className="font-medium text-gray-900">{skill.users}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 text-sm">Pourcentage</span>
                              <span className="font-medium text-gray-900">{skill.percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div 
                                className="bg-green-600 h-3 rounded-full transition-all duration-300" 
                                style={{ width: `${(skill.level / 5) * 100}%` }}
                              ></div>
                            </div>
                            <div className="flex items-center justify-center">
                              <div 
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: skill.color }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Status Modal */}
      {showRequestStatusModal && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold">Statut des demandes complet</h1>
                  <p className="text-purple-100 mt-2">Analyse détaillée des demandes de compétences (semaine en cours)</p>
                </div>
                <button
                  onClick={() => setShowRequestStatusModal(false)}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-2 transition-all"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {requestStatusData.map((status, index) => (
                  <div key={index} className={`rounded-lg p-4`} style={{ backgroundColor: `${status.color}20` }}>
                    <div className="text-2xl font-bold" style={{ color: status.color }}>
                      {status.value}
                    </div>
                    <div className="text-sm text-gray-600">{status.name}</div>
                  </div>
                ))}
              </div>

              {/* Enhanced Chart */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Répartition des demandes</h2>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    {requestStatusData.some(status => status.value > 0) ? (
                      <PieChart>
                        <Pie
                          data={requestStatusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {requestStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        Aucune demande disponible
                      </div>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Request Details */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Détails des demandes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {requestStatusData.map((status, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center space-x-3 mb-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: status.color }}
                        ></div>
                        <h3 className="font-bold text-lg text-gray-900">{status.name}</h3>
                      </div>
                      <div className="text-3xl font-bold" style={{ color: status.color }}>
                        {status.value}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {status.value === 1 ? 'demande' : 'demandes'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Department Stats Modal */}
      {showDepartmentStatsModal && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold">Statistiques par département complètes</h1>
                  <p className="text-orange-100 mt-2">Analyse détaillée des utilisateurs et équipes par département</p>
                </div>
                <button
                  onClick={() => setShowDepartmentStatsModal(false)}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-2 transition-all"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-orange-600 text-2xl font-bold">
                    {departmentStatsData.reduce((sum, dept) => sum + (dept.users || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total utilisateurs</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-red-600 text-2xl font-bold">
                    {departmentStatsData.reduce((sum, dept) => sum + (dept.teams || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total équipes</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-yellow-600 text-2xl font-bold">
                    {departmentStatsData.length}
                  </div>
                  <div className="text-sm text-gray-600">Départements</div>
                </div>
              </div>

              {/* Enhanced Chart */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Répartition par département</h2>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    {departmentStatsData && departmentStatsData.length > 0 ? (
                      <BarChart data={departmentStatsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="users" fill="#F59E0B" name="Utilisateurs" />
                        <Bar dataKey="teams" fill="#EF4444" name="Équipes" />
                      </BarChart>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        Aucune donnée de département disponible
                      </div>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Department Details Grid */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Détails par département</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {departmentStatsData.map((dept, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <h3 className="font-bold text-lg text-gray-900">{dept.name}</h3>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-orange-600">Utilisateurs</span>
                          <span className="font-medium">{dept.users || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-600">Équipes</span>
                          <span className="font-medium">{dept.teams || 0}</span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex justify-between font-bold">
                            <span>Total</span>
                            <span>{(dept.users || 0) + (dept.teams || 0)}</span>
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

export default AdminOverview; 