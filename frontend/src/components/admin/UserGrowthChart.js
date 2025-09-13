import React, { useState, useEffect } from 'react';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';

const buildPath = (pts) =>
  pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

const UserGrowthChart = () => {
  const [growthData, setGrowthData] = useState([]);
  const [summary, setSummary] = useState({ totalUsers: 0, newUsers: 0, growthPercentage: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserGrowth();
  }, []);

  const loadUserGrowth = async () => {
    try {
      setLoading(true);
      const data = await dataService.getUserGrowth('30days');
      setGrowthData(data.growthData || []);
      setSummary(data.summary || { totalUsers: 0, newUsers: 0, growthPercentage: 0 });
    } catch (error) {
      console.error('Error loading user growth:', error);
      toast.error('Erreur lors du chargement des données de croissance');
    } finally {
      setLoading(false);
    }
  };

  // Transform data for chart rendering
  const getChartPoints = () => {
    if (growthData.length === 0) return [];
    
    const maxUsers = Math.max(...growthData.map(d => d.newUsers), 1);
    const width = 100;
    const height = 80;
    
    return growthData.map((dataPoint, index) => ({
      x: (index / (growthData.length - 1)) * width,
      y: height - (dataPoint.newUsers / maxUsers) * height
    }));
  };

  const points = getChartPoints();

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Analyse de la croissance des utilisateurs</h3>
          <div className="text-xs text-gray-500">30 derniers jours</div>
        </div>
        <div className="h-56 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Utilisateurs</div>
            <div className="text-gray-900 font-semibold">-</div>
          </div>
          <div>
            <div className="text-gray-500">Croissance</div>
            <div className="text-green-600 font-semibold">-</div>
          </div>
          <div>
            <div className="text-gray-500">Nouveaux</div>
            <div className="text-gray-900 font-semibold">-</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Analyse de la croissance des utilisateurs</h3>
        <div className="text-xs text-gray-500">30 derniers jours</div>
      </div>
      <div className="h-56">
        {points.length > 0 ? (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polyline
              points={points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#2563eb"
              strokeWidth="1.5"
            />
            <path
              d={`${buildPath(points)} L 100,100 L 0,100 Z`}
              fill="url(#lineGradient)"
            />
          </svg>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            Aucune donnée disponible
          </div>
        )}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Utilisateurs</div>
          <div className="text-gray-900 font-semibold">{summary.totalUsers}</div>
        </div>
        <div>
          <div className="text-gray-500">Croissance</div>
          <div className={`font-semibold ${summary.growthPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {summary.growthPercentage >= 0 ? '+' : ''}{summary.growthPercentage}%
          </div>
        </div>
        <div>
          <div className="text-gray-500">Nouveaux</div>
          <div className="text-gray-900 font-semibold">+{summary.newUsers}</div>
        </div>
      </div>
    </div>
  );
};

export default UserGrowthChart;


