import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import dataService from '../../services/dataService';
import { useAuth } from '../../contexts/AuthContext';

const ApiTest = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    testHealthCheck();
  }, []);

  const testHealthCheck = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.healthCheck();
      setHealthStatus(response);
      console.log('Health check response:', response);
    } catch (error) {
      console.error('Health check failed:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const testSkillsApi = async () => {
    try {
      setLoading(true);
      setError(null);
      const skillsData = await dataService.getSkills();
      setSkills(skillsData);
      console.log('Skills data:', skillsData);
    } catch (error) {
      console.error('Skills API failed:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.login('employee@smartskill.com', 'employee123');
      console.log('Login test response:', response);
      alert('Login test successful! Check console for details.');
    } catch (error) {
      console.error('Login test failed:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">API Connection Test</h2>
      
      <div className="space-y-4">
        {/* Health Check */}
        <div className="border p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Health Check</h3>
          <button
            onClick={testHealthCheck}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Health Check'}
          </button>
          {healthStatus && (
            <div className="mt-2 p-2 bg-green-100 rounded">
              <p><strong>Status:</strong> {healthStatus.status}</p>
              <p><strong>Environment:</strong> {healthStatus.environment}</p>
              <p><strong>Timestamp:</strong> {healthStatus.timestamp}</p>
            </div>
          )}
        </div>

        {/* Skills API */}
        <div className="border p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Skills API</h3>
          <button
            onClick={testSkillsApi}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Test Skills API'}
          </button>
          {skills.length > 0 && (
            <div className="mt-2 p-2 bg-green-100 rounded">
              <p><strong>Skills loaded:</strong> {skills.length}</p>
              <ul className="text-sm">
                {skills.slice(0, 3).map(skill => (
                  <li key={skill.id}>• {skill.name} ({skill.type})</li>
                ))}
                {skills.length > 3 && <li>... and {skills.length - 3} more</li>}
              </ul>
            </div>
          )}
        </div>

        {/* Login Test */}
        <div className="border p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Login Test</h3>
          <button
            onClick={testLogin}
            disabled={loading}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Login'}
          </button>
          <p className="text-sm text-gray-600 mt-1">
            Tests login with employee@smartskill.com
          </p>
        </div>

        {/* Current User Info */}
        {user && (
          <div className="border p-4 rounded bg-blue-50">
            <h3 className="text-lg font-semibold mb-2">Current User</h3>
            <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Role:</strong> {user.role}</p>
            <p><strong>Job Title:</strong> {user.jobTitle}</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="border p-4 rounded bg-red-100">
            <h3 className="text-lg font-semibold mb-2 text-red-800">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Connection Status */}
        <div className="border p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Connection Status</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${healthStatus ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{healthStatus ? 'Connected to Backend' : 'Not Connected'}</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Backend URL: http://localhost:5000/api
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApiTest;











