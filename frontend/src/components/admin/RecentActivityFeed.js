import React, { useState, useEffect } from 'react';
import { UsersIcon, AcademicCapIcon, UserGroupIcon, BuildingOfficeIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';

const RecentActivityFeed = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentActivity();
  }, []);

  const loadRecentActivity = async () => {
    try {
      setLoading(true);
      const data = await dataService.getRecentActivity(10);
      setActivities(data);
    } catch (error) {
      console.error('Error loading recent activity:', error);
      toast.error('Erreur lors du chargement des activités récentes');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'user_created':
        return UsersIcon;
      case 'skill_created':
        return AcademicCapIcon;
      case 'team_created':
        return UserGroupIcon;
      case 'department_created':
        return BuildingOfficeIcon;
      case 'skill_request_created':
        return DocumentTextIcon;
      default:
        return DocumentTextIcon;
    }
  };

  const getActivityText = (activity) => {
    switch (activity.type) {
      case 'user_created':
        return `Nouvel utilisateur créé: ${activity.entityName}`;
      case 'skill_created':
        return `Compétence '${activity.entityName}' ajoutée`;
      case 'team_created':
        return `Équipe '${activity.entityName}' créée`;
      case 'department_created':
        return `Département '${activity.entityName}' créé`;
      case 'skill_request_created':
        return `Demande de compétence créée par ${activity.entityName}`;
      default:
        return activity.description;
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activités récentes</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start space-x-3 animate-pulse">
              <div className="p-2 bg-gray-200 rounded-lg w-8 h-8"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Activités récentes</h3>
      <div className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucune activité récente</p>
        ) : (
          activities.map((activity) => {
            const IconComponent = getActivityIcon(activity.type);
            return (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <IconComponent className="h-4 w-4 text-gray-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{getActivityText(activity)}</p>
                  <p className="text-xs text-gray-500">{activity.timeAgo}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RecentActivityFeed;


