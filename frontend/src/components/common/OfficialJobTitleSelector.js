import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import { CheckIcon, BriefcaseIcon } from '@heroicons/react/24/outline';

const OfficialJobTitleSelector = ({ onUpdate }) => {
  const { user, setUser } = useAuth();
  const [currentJobTitles, setCurrentJobTitles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedJobTitleId, setSelectedJobTitleId] = useState(null);

  useEffect(() => {
    if (user && user.currentJobTitles) {
      setCurrentJobTitles(user.currentJobTitles);
      setSelectedJobTitleId(user.officialJobTitle?.id || null);
    }
  }, [user]);

  const handleSetOfficialJobTitle = async () => {
    if (!selectedJobTitleId) return;

    try {
      setLoading(true);
      await dataService.setOfficialJobTitle(selectedJobTitleId);
      
      // Update the user context with the new official job title
      const selectedJobTitle = currentJobTitles.find(jt => jt.id === selectedJobTitleId);
      const updatedUser = {
        ...user,
        officialJobTitle: selectedJobTitle,
        job_title: selectedJobTitle?.title || user.job_title
      };
      setUser(updatedUser);
      
      if (onUpdate) {
        onUpdate(updatedUser);
      }
    } catch (error) {
      console.error('Error setting official job title:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentJobTitles || currentJobTitles.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <BriefcaseIcon className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-500">Aucun titre de poste assigné</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Titre de Poste Officiel</h3>
        <div className="flex items-center space-x-2">
          <BriefcaseIcon className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-500">
            {user.officialJobTitle ? 'Défini' : 'Non défini'}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Sélectionner votre titre de poste officiel
          </label>
          <select
            value={selectedJobTitleId || ''}
            onChange={(e) => setSelectedJobTitleId(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Choisir un titre de poste</option>
            {currentJobTitles.map((jobTitle) => (
              <option key={jobTitle.id} value={jobTitle.id}>
                {jobTitle.title}
              </option>
            ))}
          </select>
        </div>

        {selectedJobTitleId && (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
            <div className="flex items-center space-x-2">
              <CheckIcon className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                {currentJobTitles.find(jt => jt.id === selectedJobTitleId)?.title}
              </span>
            </div>
            <button
              onClick={handleSetOfficialJobTitle}
              disabled={loading || selectedJobTitleId === user.officialJobTitle?.id}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Mise à jour...' : 'Définir comme officiel'}
            </button>
          </div>
        )}

        {user.officialJobTitle && (
          <div className="p-3 bg-green-50 rounded-md">
            <div className="flex items-center space-x-2">
              <CheckIcon className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800">
                Titre officiel actuel: <strong>{user.officialJobTitle.title}</strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficialJobTitleSelector;


