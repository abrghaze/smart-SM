import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const MyActiveObjectives = () => {
  const { user } = useAuth();
  const objectives = user.targets || [];

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Mes objectifs actifs</h3>
      <div className="space-y-4">
        {objectives.map((t) => (
          <div key={t.id} className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-medium text-gray-900">{t.title}</h4>
              <span className="text-xs text-gray-500">{t.progress}%</span>
            </div>
            <p className="text-xs text-gray-600 mb-2">{t.description}</p>
            <div className="w-full bg-gray-200 h-2 rounded-full">
              <div className={`h-2 rounded-full ${t.progress >= 80 ? 'bg-green-600' : t.progress >= 50 ? 'bg-blue-600' : 'bg-yellow-500'}`} style={{ width: `${t.progress}%` }}></div>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>Échéance: {t.deadline}</span>
              <button className="btn-primary btn-sm px-3 py-1 text-xs">Mettre à jour</button>
            </div>
          </div>
        ))}
        {objectives.length === 0 && (
          <p className="text-sm text-gray-500 italic">Aucun objectif actif</p>
        )}
      </div>
    </div>
  );
};

export default MyActiveObjectives;


