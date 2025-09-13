import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import ManagerDashboard from './components/manager/ManagerDashboard';
import EmployeeDashboard from './components/employee/EmployeeDashboard';
import LoadingSpinner from './components/common/LoadingSpinner';

// Composant de protection des routes
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated, hasRole } = useAuth();
  
  // Debug logging
  console.log('ProtectedRoute check:', { user, loading, allowedRoles });
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    console.log('ProtectedRoute: User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.some(role => hasRole(role))) {
    console.log('ProtectedRoute: Access denied for role:', user.role, 'allowed:', allowedRoles);
    return <Navigate to="/unauthorized" replace />;
  }
  
  console.log('Access granted to protected route');
  return children;
};

// Composant principal de l'application
const AppContent = () => {
  const { user, loading, isAuthLoading } = useAuth();
  
  console.log('AppContent rendered:', { user, loading, isAuthLoading });
  
  if (loading || isAuthLoading) {
    console.log('AppContent loading, showing spinner');
    return <LoadingSpinner />;
  }
  
  console.log('AppContent not loading, rendering routes');
  
  return (
    <>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/*" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/manager/*" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <ManagerDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/employee/*" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'employee']}>
              <EmployeeDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      
    </>
  );
};

// Page d'erreur 401
const UnauthorizedPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-gray-900 mb-4">401</h1>
      <p className="text-xl text-gray-600 mb-8">Accès non autorisé</p>
      <p className="text-gray-500 mb-8">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
      <button 
        onClick={() => window.history.back()} 
        className="btn-primary"
      >
        Retour
      </button>
    </div>
  </div>
);

// Page d'erreur 404
const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">Page non trouvée</p>
      <p className="text-gray-500 mb-8">La page que vous recherchez n'existe pas.</p>
      <button 
        onClick={() => window.history.back()} 
        className="btn-primary"
      >
        Retour
      </button>
    </div>
  </div>
);

// Composant App principal avec les providers
const App = () => {
  console.log('App component rendering');
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App; 