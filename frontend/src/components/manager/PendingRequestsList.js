import React, { useState } from 'react';
import { AcademicCapIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const initial = [
  { id: 1, employee: 'Marie Martin', skill: 'TypeScript', current: 2, target: 4 },
  { id: 2, employee: 'Pierre Durand', skill: 'Docker', current: 1, target: 3 },
  { id: 3, employee: 'Sophie Bernard', skill: 'React', current: 2, target: 3 },
];

const PendingRequestsList = () => {
  const [requests, setRequests] = useState(initial);

  const handle = (id, action) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    toast.success(action === 'approve' ? 'Demande approuvée' : 'Demande rejetée');
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Demandes en attente</h3>
      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-green-100 rounded-lg">
                <AcademicCapIcon className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{r.employee}</p>
                <p className="text-xs text-gray-600">{r.skill} — {r.current} → {r.target}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button className="btn-secondary" onClick={() => handle(r.id, 'reject')}>Rejeter</button>
              <button className="btn-primary" onClick={() => handle(r.id, 'approve')}>Approuver</button>
            </div>
          </div>
        ))}
        {requests.length === 0 && (
          <p className="text-sm text-gray-500 italic">Aucune demande en attente</p>
        )}
      </div>
    </div>
  );
};

export default PendingRequestsList;


