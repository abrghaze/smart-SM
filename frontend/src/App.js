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
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.some(role => hasRole(role))) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};

// Composant principal de l'application
const AppContent = () => {
  const { user, loading, isAuthLoading } = useAuth();
  
  if (loading || isAuthLoading) {
    return <LoadingSpinner />;
  }
  
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
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
    <div className="max-w-md w-full text-center">
      <div className="relative mb-8">
        <div className="w-32 h-32 mx-auto bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center">
          <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v.01M12 12v-4m0 0a1 1 0 110-2 1 1 0 010 2zm0 10a9 9 0 110-18 9 9 0 010 18z" />
          </svg>
        </div>
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-7xl font-bold text-gray-100 -z-10">401</span>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">Accès non autorisé</h1>
      <p className="text-gray-500 mb-8 leading-relaxed">
        Vous n'avez pas les permissions nécessaires pour accéder à cette page. Veuillez contacter votre administrateur si vous pensez qu'il s'agit d'une erreur.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button 
          onClick={() => window.history.back()} 
          className="px-6 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-colors duration-200 shadow-lg"
        >
          ← Retour
        </button>
        <a 
          href="/dashboard" 
          className="px-6 py-3 bg-white text-gray-700 font-medium rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors duration-200"
        >
          Accueil
        </a>
      </div>
    </div>
  </div>
);

// Page d'erreur 404
const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
    <div className="max-w-md w-full text-center">
      <div className="relative mb-8">
        <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
          <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-7xl font-bold text-gray-100 -z-10">404</span>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">Page non trouvée</h1>
      <p className="text-gray-500 mb-8 leading-relaxed">
        Oups ! La page que vous recherchez n'existe pas ou a été déplacée. Vérifiez l'URL ou retournez à l'accueil.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button 
          onClick={() => window.history.back()} 
          className="px-6 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-colors duration-200 shadow-lg"
        >
          ← Retour
        </button>
        <a 
          href="/dashboard" 
          className="px-6 py-3 bg-white text-gray-700 font-medium rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors duration-200"
        >
          Accueil
        </a>
      </div>
    </div>
  </div>
);

// Composant App principal avec les providers
const App = () => {
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