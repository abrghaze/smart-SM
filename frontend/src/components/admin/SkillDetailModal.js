import React, { useState, useEffect, useCallback } from 'react';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import {
  XMarkIcon,
  AcademicCapIcon,
  UsersIcon,
  ChartBarIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import Avatar from '../common/Avatar';

const SkillDetailModal = ({ skill, isOpen, onClose }) => {
  const [skillUsers, setSkillUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [levelFilter, setLevelFilter] = useState('');
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    levelBreakdown: [],
    averageLevel: 0
  });

  useEffect(() => {
    if (isOpen && skill) {
      loadSkillData();
    }
  }, [isOpen, skill]);

  const loadSkillData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersData, analyticsData] = await Promise.all([
        dataService.getSkillUsers(skill.id),
        dataService.getSkillAnalytics(skill.id)
      ]);
      
      setSkillUsers(usersData);
      setAnalytics(analyticsData);
      
      console.log('Skill detail data loaded:', {
        users: usersData.length,
        analytics: analyticsData,
        userLevels: usersData.map(u => ({ id: u.id, level: u.level }))
      });
    } catch (error) {
      console.error('Error loading skill detail data:', error);
      toast.error('Erreur lors du chargement des données de la compétence');
    } finally {
      setLoading(false);
    }
  }, [skill?.id]);

  // Filter users by level
  const filteredUsers = skillUsers.filter(user => 
    !levelFilter || user.level === parseInt(levelFilter)
  );

  // Calculate level breakdown for display
  const getLevelBreakdown = () => {
    if (!skill) {
      return {};
    }
    
    const breakdown = {};
    for (let i = 1; i <= 5; i++) {
      breakdown[i] = 0;
    }
    
    skillUsers.forEach(user => {
      const level = parseInt(user.level);
      if (level && level >= 1 && level <= 5) {
        breakdown[level]++;
      }
    });
    
    console.log('Level breakdown calculation:', {
      skillUsers: skillUsers.length,
      skillMaxLevel: 5,
      breakdown: breakdown
    });
    
    return breakdown;
  };

  const levelBreakdown = getLevelBreakdown();

  // Debug logging for analytics data
  console.log('SkillDetailModal render:', {
    skill: skill?.name,
    skillMaxLevel: 5,
    skillUsersCount: skillUsers.length,
    analytics: analytics,
    levelBreakdown: levelBreakdown,
    filteredUsersCount: filteredUsers.length
  });

  if (!isOpen) return null;

  // Show loading state if skill data is not yet available
  if (!skill) {
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
                <AcademicCapIcon className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{skill.name}</h3>
                  <p className="text-sm text-gray-500">
                    {skill.type === 'hard' ? 'Compétence technique' : 'Compétence comportementale'} • {skill.category}
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
                {/* Skill Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Informations de la compétence</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Description:</span>
                      <p className="text-gray-900">{skill.description || 'Aucune description'}</p>
                    </div>
                                         
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <p className="text-gray-900 capitalize">{skill.type}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Catégorie:</span>
                      <p className="text-gray-900">{skill.category || 'Non catégorisée'}</p>
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
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <ChartBarIcon className="h-8 w-8 text-green-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-green-900">Niveau moyen</p>
                        <p className="text-2xl font-bold text-green-600">
                          {analytics.averageLevel ? analytics.averageLevel.toFixed(1) : '0.0'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  
                </div>

                {/* Level Breakdown */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Répartition par niveau</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {Object.entries(levelBreakdown).map(([level, count]) => (
                      <div
                        key={level}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center"
                      >
                        <p className="text-lg font-bold text-gray-900">{count}</p>
                        <p className="text-sm text-gray-500">Niveau {level}</p>
                        {analytics.totalUsers > 0 && (
                          <p className="text-xs text-gray-400">
                            {((count / analytics.totalUsers) * 100).toFixed(1)}%
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Users List */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">Utilisateurs avec cette compétence</h4>
                    <div className="flex items-center space-x-2">
                      <FunnelIcon className="h-4 w-4 text-gray-400" />
                      <select
                        value={levelFilter}
                        onChange={(e) => setLevelFilter(e.target.value)}
                        className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                                                                         <option value="">Tous les niveaux</option>
                        {Array.from({ length: 5 }, (_, i) => i + 1).map(level => (
                          <option key={level} value={level}>
                            Niveau {level} ({levelBreakdown[level] || 0})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <UsersIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">
                        {levelFilter ? `Aucun utilisateur au niveau ${levelFilter}` : 'Aucun utilisateur avec cette compétence'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar
                              src={user.profilePictureUrl}
                              alt={`${user.firstName} ${user.lastName}`}
                              size="md"
                            />
                            <div>
                              <p className="font-medium">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                              <p className="text-xs text-gray-400">
                                {user.jobTitle} • {user.role}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">
                                Niveau {user.level}
                              </p>
                              <p className="text-xs text-gray-500">
                                {user.experienceYears ? `${user.experienceYears} ans d'exp.` : 'Expérience non spécifiée'}
                              </p>
                            </div>
                            <div className="flex items-center space-x-1">
                              {Array.from({ length: 5 }, (_, i) => (
                                <div
                                  key={i}
                                  className={`w-2 h-2 rounded-full ${
                                    i < user.level ? 'bg-blue-500' : 'bg-gray-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
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

export default SkillDetailModal;
