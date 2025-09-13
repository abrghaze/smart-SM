import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import {
  UserGroupIcon,
  BuildingOfficeIcon,
  UsersIcon,
  ChartBarIcon,
  StarIcon,
  ArrowRightIcon,
  PlusIcon,
  SparklesIcon,
  TrophyIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline';

import TeamDetailModal from './TeamDetailModal';

const TeamManagement = () => {
  const { user, isAuthLoading } = useAuth();
  const [teams, setTeams] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showTeamDetailModal, setShowTeamDetailModal] = useState(false);

  const loadTeamData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 TeamManagement: Starting loadTeamData');
      console.log('👤 Current user:', user);
      
      const [teamsData, departmentsData] = await Promise.all([
        dataService.getManagerTeams(),
        dataService.getDepartments()
      ]);
      
      // CRITICAL FIX: Only show teams that this manager CURRENTLY manages
      // Old managers should not see teams they no longer manage
      const managedTeams = teamsData.managedTeams || [];
      setTeams(managedTeams);
      setDepartments(departmentsData);
      
      console.log('Loaded team data:', { 
        teams: teamsData.length,
        departments: departmentsData.length
      });
    } catch (error) {
      console.error('❌ TeamManagement: Error loading team data:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack
      });
      toast.error('Erreur lors du chargement des données de l\'équipe');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthLoading && user) {
      loadTeamData();
    }
  }, [isAuthLoading, user, loadTeamData]);

  const handleTeamClick = (team) => {
    setSelectedTeam(team);
    setShowTeamDetailModal(true);
  };

  const handleTeamDetailClose = () => {
    setShowTeamDetailModal(false);
    setSelectedTeam(null);
    // Refresh team data when modal closes
    loadTeamData();
  };



  const getTeamStats = () => {
    // Since we only show managed teams now, all teams are managed teams
    const managedTeams = teams.length;
    const totalMembers = teams.reduce((sum, team) => sum + (team.membersCount || 0), 0);
    const teamsWithDepartments = teams.filter(team => team.departmentsCount > 0).length;
    
    return {
      managedTeams: managedTeams,
      memberTeams: 0, // No member teams shown in this view
      totalMembers,
      teamsWithDepartments
    };
  };

  const stats = getTeamStats();

  if (loading && teams.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-8"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <p className="text-gray-600 text-xl font-medium">Chargement des équipes...</p>
          <p className="text-gray-500 text-sm mt-2">Préparation de votre espace de gestion</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen p-8">
      {/* Enhanced Modern Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50 to-indigo-100 rounded-3xl shadow-2xl border border-indigo-200 p-10">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200 to-indigo-300 rounded-full -mr-16 -mt-16 opacity-30 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-200 to-pink-300 rounded-full -ml-12 -mb-12 opacity-30 animate-pulse"></div>
        
        <div className="relative">
          <div className="flex items-center space-x-6 mb-8">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <UserGroupIcon className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <SparklesIcon className="w-4 h-4 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
                Gestion de l'équipe
              </h1>
              <p className="text-xl text-gray-600 mt-3 font-medium">Gérez vos équipes et leurs objectifs avec style</p>
            </div>
          </div>
          
          {/* Enhanced Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-10">
            <div className="bg-gradient-to-br from-white to-blue-50 rounded-3xl p-8 shadow-xl border border-blue-100 hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <StarIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Équipes gérées</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.managedTeams}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-white to-green-50 rounded-3xl p-8 shadow-xl border border-green-100 hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <UsersIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Équipes membres</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.memberTeams}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-white to-purple-50 rounded-3xl p-8 shadow-xl border border-purple-100 hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 via-purple-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <UserGroupIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total membres</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalMembers}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-white to-orange-50 rounded-3xl p-8 shadow-xl border border-orange-100 hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <BuildingOfficeIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Avec département</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.teamsWithDepartments}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Teams Section */}
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-10">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 rounded-3xl flex items-center justify-center shadow-xl">
                <UserGroupIcon className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <TrophyIcon className="w-3 h-3 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Mes équipes gérées ({teams.length})</h2>
              <p className="text-xl text-gray-600 font-medium">Gérez vos équipes et leurs performances</p>
            </div>
          </div>
        </div>
        
        {teams.length === 0 ? (
          <div className="text-center py-20">
            <div className="relative mb-8">
              <div className="w-32 h-32 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto shadow-xl">
                <UserGroupIcon className="h-16 w-16 text-gray-400" />
              </div>
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                <PlusIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-6">Aucune équipe</h3>
            <p className="text-xl text-gray-600 mb-8">Vous n'appartenez à aucune équipe pour le moment</p>
            <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-3xl p-8 border border-indigo-200 shadow-xl max-w-2xl mx-auto">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <RocketLaunchIcon className="w-8 h-8 text-indigo-600" />
                <p className="text-gray-700 font-bold text-lg">Prêt à rejoindre une équipe ?</p>
              </div>
              <p className="text-gray-700 font-medium text-center">
                Contactez votre administrateur pour être assigné à une équipe
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teams.map((team, index) => (
              <div
                key={team.id}
                onClick={() => handleTeamClick(team)}
                className="bg-gradient-to-br from-white via-gray-50 to-white rounded-3xl p-8 cursor-pointer hover:shadow-2xl transition-all duration-500 border border-gray-200 hover:border-indigo-300 hover:scale-105 group transform hover:-translate-y-2"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110">
                        <UserGroupIcon className="w-8 h-8 text-white" />
                      </div>
                      {team.relationship === 'manager' && (
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                          <StarIcon className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">{team.name}</h3>
                      <p className="text-lg text-gray-600">{team.description || 'Aucune description'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-100">
                    <div className="flex items-center space-x-3">
                      <BuildingOfficeIcon className="h-5 w-5 text-blue-600" />
                      <span className="text-lg text-gray-700 font-medium">Département</span>
                    </div>
                    <span className="px-4 py-2 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 rounded-full text-lg font-semibold shadow-sm">
                      {team.departments && team.departments.length > 0 
                        ? team.departments.map(d => d.name).join(', ')
                        : 'Non assigné'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl shadow-sm border border-green-100">
                    <div className="flex items-center space-x-3">
                      <UsersIcon className="h-5 w-5 text-green-600" />
                      <span className="text-lg text-gray-700 font-medium">Membres</span>
                    </div>
                    <span className="px-4 py-2 bg-gradient-to-r from-green-100 to-green-200 text-green-800 rounded-full text-lg font-semibold shadow-sm">
                      {team.membersCount || 0} membres
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl shadow-sm border border-purple-100">
                    <div className="flex items-center space-x-3">
                      <ChartBarIcon className="h-5 w-5 text-purple-600" />
                      <span className="text-lg text-gray-700 font-medium">Rôle</span>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-lg font-semibold shadow-sm ${
                      team.relationship === 'manager' 
                        ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800'
                        : 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800'
                    }`}>
                      {team.relationship === 'manager' ? 'Manager' : 'Membre'}
                    </span>
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between text-lg text-indigo-600 font-bold group-hover:text-indigo-700 transition-colors">
                    <span>Gérer l'équipe</span>
                    <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Team Detail Modal */}
      {selectedTeam && (
        <TeamDetailModal
          team={selectedTeam}
          isOpen={showTeamDetailModal}
          onClose={handleTeamDetailClose}
          departments={departments}
        />
      )}
    </div>
  );
};

export default TeamManagement; 