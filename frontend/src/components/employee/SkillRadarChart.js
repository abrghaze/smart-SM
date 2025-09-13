import React from 'react';

// Lightweight radar-like chart using SVG (no extra deps)
// Categories with values 0-100
const data = [
  { label: 'Développement', value: 75 },
  { label: 'Communication', value: 60 },
  { label: 'Design', value: 45 },
  { label: 'Gestion', value: 55 },
  { label: 'Qualité', value: 70 },
];

const toPoint = (center, radius, angleDeg) => {
  const angle = (Math.PI / 180) * angleDeg;
  return {
    x: center.x + radius * Math.cos(angle),
    y: center.y + radius * Math.sin(angle),
  };
};

const SkillRadarChart = () => {
  const size = 220;
  const center = { x: size / 2, y: size / 2 };
  const maxR = size / 2 - 16;
  const step = 360 / data.length;
  const points = data.map((d, i) => toPoint(center, (d.value / 100) * maxR, -90 + i * step));
  const polygon = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Vue d'ensemble des compétences</h3>
      <div className="flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* grid */}
          {[0.25, 0.5, 0.75, 1].map((r, idx) => (
            <circle key={idx} cx={center.x} cy={center.y} r={maxR * r} fill="none" stroke="#e5e7eb" strokeWidth="1" />
          ))}
          {/* axes */}
          {data.map((_, i) => {
            const end = toPoint(center, maxR, -90 + i * step);
            return <line key={i} x1={center.x} y1={center.y} x2={end.x} y2={end.y} stroke="#e5e7eb" strokeWidth="1" />;
          })}
          {/* area */}
          <polygon points={polygon} fill="rgba(37, 99, 235, 0.2)" stroke="#2563eb" strokeWidth="2" />
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
        {data.map((d) => (
          <div key={d.label} className="flex items-center justify-between bg-gray-50 rounded px-2 py-1">
            <span>{d.label}</span>
            <span className="font-medium text-gray-900">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkillRadarChart;
















