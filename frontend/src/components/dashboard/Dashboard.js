import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';

const Dashboard = () => {
  const { user, loading } = useAuth();

  // Debug logging
  console.log('Dashboard component:', { user, loading });

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    console.log('No user in Dashboard, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Rediriger vers le bon dashboard selon le rôle
  console.log('User role:', user.role);
  switch (user.role) {
    case 'admin':
      console.log('Redirecting admin to /admin');
      return <Navigate to="/admin" replace />;
    case 'manager':
      console.log('Redirecting manager to /manager');
      return <Navigate to="/manager" replace />;
    case 'employee':
      console.log('Redirecting employee to /employee');
      return <Navigate to="/employee" replace />;
    default:
      console.log('Unknown role, redirecting to login');
      return <Navigate to="/login" replace />;
  }
};

export default Dashboard; 