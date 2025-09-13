import React from 'react';

const objectives = [
  { id: 1, employee: 'Marie Martin', title: 'Améliorer React', progress: 50 },
  { id: 2, employee: 'Pierre Durand', title: 'Apprendre Docker', progress: 80 },
  { id: 3, employee: 'Sophie Bernard', title: 'Maîtriser Figma', progress: 35 },
];

const TeamObjectivesOverview = () => {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Objectifs de l'équipe</h3>
      <div className="space-y-4">
        {objectives.map((o) => (
          <div key={o.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{o.employee}</p>
                <p className="text-xs text-gray-600">{o.title}</p>
              </div>
              <span className="text-xs text-gray-500">{o.progress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
              <div className={`h-2 rounded-full ${o.progress >= 80 ? 'bg-green-600' : o.progress >= 50 ? 'bg-blue-600' : 'bg-yellow-500'}`} style={{ width: `${o.progress}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamObjectivesOverview;


