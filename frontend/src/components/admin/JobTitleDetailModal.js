import React, { useState, useEffect, useCallback } from 'react';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import {
  XMarkIcon,
  BriefcaseIcon,
  UsersIcon,
  ChartBarIcon,
  FunnelIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import Avatar from '../common/Avatar';

const JobTitleDetailModal = ({ jobTitle, isOpen, onClose }) => {
  const [jobTitleUsers, setJobTitleUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    averageSkillLevel: 0,
    skillDistribution: [],
    userSkillLevels: []
  });

  useEffect(() => {
    if (isOpen && jobTitle) {
      loadJobTitleData();
    }
  }, [isOpen, jobTitle]);

  const loadJobTitleData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get users with this job title
      const usersData = await dataService.getUsers({ pageSize: 1000, include_inactive: true });
      const usersWithJobTitle = usersData.filter(user => 
        user.jobTitleIds && user.jobTitleIds.includes(jobTitle.id)
      );
      
      // Get skill analytics for these users
      const skillAnalytics = await calculateSkillAnalytics(usersWithJobTitle, jobTitle);
      
      setJobTitleUsers(usersWithJobTitle);
      setAnalytics(skillAnalytics);
      
      console.log('Job title detail data loaded:', {
        users: usersWithJobTitle.length,
        analytics: skillAnalytics,
        jobTitleId: jobTitle.id,
        requirements: skillAnalytics.skillDistribution.length
      });
      
      // Debug: Log detailed analytics
      console.log('Detailed analytics:', {
        totalUsers: skillAnalytics.totalUsers,
        averageSkillLevel: skillAnalytics.averageSkillLevel,
        userSkillLevels: skillAnalytics.userSkillLevels,
        skillDistribution: skillAnalytics.skillDistribution
      });
    } catch (error) {
      console.error('Error loading job title detail data:', error);
      toast.error('Erreur lors du chargement des données du titre de poste');
    } finally {
      setLoading(false);
    }
  }, [jobTitle?.id]);

  const calculateSkillAnalytics = async (users, jobTitle) => {
    try {
      // Get job title requirements
      const jobTitleDetails = await dataService.getJobTitle(jobTitle.id);
      const requirements = jobTitleDetails.requirements || [];
      
      if (requirements.length === 0) {
        return {
          totalUsers: users.length,
          averageSkillLevel: 0,
          skillDistribution: [],
          userSkillLevels: []
        };
      }

      // Get user skills for all users
      const userSkillsPromises = users.map(async (user) => {
        try {
          const skills = await dataService.getUserSkills(user.id);
          return { userId: user.id, skills, error: null };
        } catch (error) {
          console.error(`Error getting skills for user ${user.id}:`, error);
          return { userId: user.id, skills: [], error: error.message };
        }
      });
      const userSkillsResults = await Promise.all(userSkillsPromises);
      

      
      // Calculate average skill level for required skills
      let totalSkillLevel = 0;
      let skillCount = 0;
      const skillDistribution = {};
      const userSkillLevels = [];

      users.forEach((user, userIndex) => {
        const userSkillsResult = userSkillsResults[userIndex];
        const userSkills = userSkillsResult.skills || [];
        let userTotalLevel = 0;
        let userSkillCount = 0;
        
        requirements.forEach(req => {
          const userSkill = userSkills.find(us => us.skillId === req.skill_id);
          const level = userSkill ? userSkill.level : 0;
          

          
          totalSkillLevel += level;
          skillCount++;
          userTotalLevel += level;
          userSkillCount++;
          
          // Track distribution
          if (!skillDistribution[req.skill_name]) {
            skillDistribution[req.skill_name] = {
              required: req.required_level,
              average: 0,
              users: []
            };
          }
          skillDistribution[req.skill_name].users.push({
            userId: user.id,
            level: level,
            meetsRequirement: level >= req.required_level
          });
        });

        // Calculate user's average skill level
        const userAverage = userSkillCount > 0 ? userTotalLevel / userSkillCount : 0;
        userSkillLevels.push({
          userId: user.id,
          name: `${user.firstName} ${user.lastName}`,
          averageLevel: userAverage,
          totalLevel: userTotalLevel,
          skillCount: userSkillCount
        });
      });

      // Calculate overall average
      const averageSkillLevel = skillCount > 0 ? totalSkillLevel / skillCount : 0;
      

      
      // Calculate skill-specific averages
      Object.keys(skillDistribution).forEach(skillName => {
        const skill = skillDistribution[skillName];
        const totalLevel = skill.users.reduce((sum, user) => sum + user.level, 0);
        skill.average = skill.users.length > 0 ? totalLevel / skill.users.length : 0;
      });

      return {
        totalUsers: users.length,
        averageSkillLevel: averageSkillLevel,
        skillDistribution: Object.entries(skillDistribution).map(([name, data]) => ({
          name,
          required: data.required,
          average: data.average,
          users: data.users
        })),
        userSkillLevels: userSkillLevels
      };
    } catch (error) {
      console.error('Error calculating skill analytics:', error);
      return {
        totalUsers: users.length,
        averageSkillLevel: 0,
        skillDistribution: [],
        userSkillLevels: []
      };
    }
  };



  if (!isOpen) return null;

  // Show loading state if job title data is not yet available
  if (!jobTitle) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
            <div className="bg-white px-6 py-4">
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <BriefcaseIcon className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{jobTitle.title}</h3>
                  <p className="text-sm text-gray-500">
                    {jobTitle.description || 'Aucune description'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Job Title Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Informations du titre de poste</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Description:</span>
                      <p className="text-gray-900">{jobTitle.description || 'Aucune description'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Exigences de compétences:</span>
                      <p className="text-gray-900">{analytics.skillDistribution.length} compétence(s) requise(s)</p>
                    </div>
                  </div>
                </div>

                {/* Analytics Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <UsersIcon className="h-8 w-8 text-blue-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Total utilisateurs</p>
                        <p className="text-2xl font-bold text-blue-600">{analytics.totalUsers}</p>
                      </div>
                    </div>
                  </div>
                  

                </div>

                {/* Skill Requirements Breakdown */}
                {analytics.skillDistribution.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Répartition des compétences requises</h4>
                    <div className="space-y-3">
                      {analytics.skillDistribution.map((skill, index) => (
                        <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <AcademicCapIcon className="h-5 w-5 text-gray-500" />
                              <span className="font-medium text-gray-900">{skill.name}</span>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-sm">
                                <span className="text-gray-500">Requis:</span>
                                <span className="ml-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                  Niveau {skill.required}
                                </span>
                              </div>

                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: 5 }, (_, i) => (
                              <div
                                key={i}
                                className={`w-4 h-4 rounded-full ${
                                  i < skill.required ? 'bg-red-500' : 'bg-gray-200'
                                }`}
                                title={`Niveau requis: ${skill.required}`}
                              />
                            ))}
                            <span className="ml-2 text-xs text-gray-500">Requis</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Users List */}
                <div>
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900">Utilisateurs avec ce titre de poste</h4>
                  </div>

                  {jobTitleUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <UsersIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">Aucun utilisateur avec ce titre de poste</p>
                    </div>
                  ) : (
                                         <div className="space-y-3">
                       {jobTitleUsers.map((user) => {
                         
                         return (
                           <div
                             key={user.id}
                             className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl"
                           >
                             <div className="flex items-center space-x-4">
                               <Avatar
                                 src={user.profilePictureUrl}
                                 alt={`${user.firstName} ${user.lastName}`}
                                 size="md"
                               />
                               <div>
                                 <p className="font-medium text-gray-900">
                                   {user.firstName} {user.lastName}
                                 </p>
                                 <p className="text-sm text-gray-500">{user.email}</p>
                                 <p className="text-xs text-gray-400">
                                   {user.jobTitle} • {user.role}
                                 </p>
                               </div>
                             </div>
                             <div className="flex items-center space-x-4">
                               <div className="text-right">
                                 <p className="text-sm font-medium text-gray-900">
                                   {user.departments && user.departments.length > 0 ? user.departments[0].name : 'Aucun département'}
                                 </p>
                                 <p className="text-xs text-gray-500">
                                   {user.teams && user.teams.length > 0 ? user.teams[0].name : 'Aucune équipe'}
                                 </p>
                               </div>

                             </div>
                           </div>
                         );
                       })}
                     </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 flex justify-end">
            <button
              onClick={onClose}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobTitleDetailModal;
