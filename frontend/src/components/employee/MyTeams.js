import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import {
  UserGroupIcon,
  UsersIcon,
  UserIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import TeamDetailModal from './TeamDetailModal';

const MyTeams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showTeamModal, setShowTeamModal] = useState(false);

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const organizationData = await dataService.getMyOrganization();
      
      setTeams(organizationData.teams || []);
    } catch (error) {
      console.error('Error loading team data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleTeamClick = (team) => {
    setSelectedTeam(team);
    setShowTeamModal(true);
  };

  const handleTeamModalClose = () => {
    setShowTeamModal(false);
    setSelectedTeam(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Modern Header */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-700 rounded-3xl"></div>
            <div className="absolute inset-0 bg-black opacity-10 rounded-3xl"></div>
            <div className="relative bg-white/10 backdrop-blur-sm rounded-3xl border border-white/20 p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <UserGroupIcon className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <SparklesIcon className="h-6 w-6 text-yellow-300" />
                      <h1 className="text-4xl font-bold text-white">Mes Équipes</h1>
                    </div>
                    <p className="text-green-100 text-lg">Vos équipes et collègues</p>
                  </div>
                </div>
                <div className="hidden md:flex items-center space-x-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                    <span className="text-white font-semibold">{teams.length} Équipe{teams.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Teams Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl">
                  <TrophyIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Mes Équipes
                  </h2>
                  <p className="text-gray-600">Votre collaboration et travail d'équipe</p>
                </div>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-full px-4 py-2 border border-green-200">
                <span className="text-green-700 font-semibold">{teams.length} Équipe{teams.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {teams.length === 0 ? (
              <div className="text-center py-16">
                <div className="p-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl inline-block mb-6">
                  <UserGroupIcon className="h-20 w-20 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Aucune équipe assignée</h3>
                <p className="text-gray-500 max-w-md mx-auto">Contactez votre administrateur pour être assigné à une équipe et commencer à collaborer avec vos collègues.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map((team) => (
                  <div 
                    key={team.id} 
                    className="group bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-200 hover:shadow-xl hover:border-green-300 transition-all duration-300 transform hover:scale-105 cursor-pointer"
                    onClick={() => handleTeamClick(team)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                          <UserGroupIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-1">{team.name}</h3>
                          {team.description && (
                            <p className="text-sm text-gray-600 leading-relaxed">{team.description}</p>
                          )}
                        </div>
                      </div>
                      <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                        <div className="flex items-center space-x-2">
                          <UsersIcon className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-700">{team.members?.length || 0} membres</span>
                        </div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      </div>
                      
                      {team.departments && team.departments.length > 0 && (
                        <div className="flex items-center p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                          <BuildingOfficeIcon className="h-4 w-4 text-purple-600 mr-2" />
                          <span className="text-sm font-medium text-purple-700">{team.departments.map(d => d.name).join(', ')}</span>
                        </div>
                      )}
                      
                      {team.manager && (
                        <div className="flex items-center p-3 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border border-orange-200">
                          <UserIcon className="h-4 w-4 text-orange-600 mr-2" />
                          <span className="text-sm font-medium text-orange-700">Manager: {team.manager.firstName} {team.manager.lastName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Detail Modal */}
      <TeamDetailModal
        team={selectedTeam}
        isOpen={showTeamModal}
        onClose={handleTeamModalClose}
      />
    </div>
  );
};

export default MyTeams;
