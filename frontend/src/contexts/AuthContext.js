import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import apiService from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  console.log('useAuth hook called, context:', context);
  if (!context) {
    console.error('useAuth must be used within an AuthProvider');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Check if user is logged in on load
  useEffect(() => {
    console.log('AuthContext useEffect running');
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    console.log('AuthContext localStorage:', { token, userData });
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        console.log('AuthContext parsed user:', parsedUser);
        setUser(parsedUser);
        
        // Verify token is still valid by calling API
        apiService.getCurrentUser()
          .then(response => {
            console.log('Token verified, user data:', response);
            // Update user data with fresh data from API
            const updatedUser = {
              id: response.id,
              email: response.email,
              firstName: response.firstName,
              lastName: response.lastName,
              role: response.role,
              jobTitle: response.jobTitle,
              profilePictureUrl: response.profilePictureUrl,
              createdAt: response.createdAt,
              teams: response.teams || [],
              skills: response.skills || [],
              departments: response.departments || [],
              currentJobTitles: response.currentJobTitles || [],
              officialJobTitle: response.officialJobTitle || null
            };
            setUser(updatedUser);
            localStorage.setItem('userData', JSON.stringify(updatedUser));
            setIsAuthLoading(false);
          })
          .catch(error => {
            console.error('Token verification failed:', error);
            // Token is invalid, clear storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            setUser(null);
            setIsAuthLoading(false);
          });
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        setIsAuthLoading(false);
      }
    } else {
      // No token or user data, auth is complete
      setIsAuthLoading(false);
    }
    
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    console.log('AuthContext: Login attempt for:', email);
    
    try {
      setLoading(true);
      const response = await apiService.login(email, password);
      console.log('AuthContext: Login successful for user:', response.user.role);
      
      // Store tokens securely
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      // Use the complete user object from backend response
      const userData = {
        id: response.user.id,
        email: response.user.email,
        firstName: response.user.firstName,
        lastName: response.user.lastName,
        role: response.user.role,
        jobTitle: response.user.jobTitle,
        profilePictureUrl: response.user.profilePictureUrl,
        createdAt: response.user.createdAt,
        teams: response.user.teams || [],
        skills: response.user.skills || [],
        departments: response.user.departments || [],
        currentJobTitles: response.user.currentJobTitles || [],
        officialJobTitle: response.user.officialJobTitle || null
      };
      
      // Store user data
      localStorage.setItem('userData', JSON.stringify(userData));
      setUser(userData);
      
      toast.success(`Bienvenue ${userData.firstName} !`);
      return userData;
      
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      toast.error(error.message || 'Erreur de connexion');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    console.log('AuthContext: Logout initiated');
    
    try {
      setLoading(true);
      // Call logout API
      await apiService.logout();
      console.log('AuthContext: Logout API call successful');
    } catch (error) {
      console.error('AuthContext: Logout API error:', error);
      // Continue with logout even if API call fails
    }
    
    // Clear all authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    
    setUser(null);
    setLoading(false);
    
    console.log('AuthContext: User logged out successfully');
    toast.success('Déconnexion réussie');
  }, []);

  const register = useCallback(async (userData) => {
    console.log('AuthContext register called with:', userData);
    
    try {
      const response = await apiService.register(userData);
      console.log('Register API response:', response);
      
      toast.success('Utilisateur créé avec succès');
      return response;
      
    } catch (error) {
      console.error('Register error:', error);
      toast.error(error.message || 'Erreur lors de la création du compte');
      throw error;
    }
  }, []);

  const updateProfile = useCallback(async (profileData) => {
    console.log('AuthContext updateProfile called with:', profileData);
    
    try {
      const response = await apiService.updateUserProfile(profileData);
      console.log('Update profile API response:', response);
      
      // Update local user data
      const updatedUser = {
        ...user,
        firstName: response.user.firstName,
        lastName: response.user.lastName,
        jobTitle: response.user.jobTitle,
        profilePictureUrl: response.user.profilePictureUrl
      };
      
      setUser(updatedUser);
      localStorage.setItem('userData', JSON.stringify(updatedUser));
      
      toast.success('Profil mis à jour avec succès');
      return response;
      
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour du profil');
      throw error;
    }
  }, [user]);

  const refreshUserData = useCallback(async () => {
    console.log('AuthContext refreshUserData called');
    
    try {
      const response = await apiService.getCurrentUser();
      console.log('Refresh user data API response:', response);
      
      const updatedUser = {
        id: response.id,
        email: response.email,
        firstName: response.firstName,
        lastName: response.lastName,
        role: response.role,
        jobTitle: response.jobTitle,
        profilePictureUrl: response.profilePictureUrl,
        createdAt: response.createdAt,
        teams: response.teams || [],
        skills: response.skills || [],
        departments: response.departments || [],
        currentJobTitles: response.currentJobTitles || [],
        officialJobTitle: response.officialJobTitle || null
      };
      
      setUser(updatedUser);
      localStorage.setItem('userData', JSON.stringify(updatedUser));
      
      return updatedUser;
      
    } catch (error) {
      console.error('Refresh user data error:', error);
      throw error;
    }
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthLoading,
    login,
    logout,
    register,
    updateProfile,
    refreshUserData,
    // Helper methods for role checking
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isEmployee: user?.role === 'employee',
    hasRole: (role) => user?.role === role,
    isAuthenticated: !!user && !!localStorage.getItem('authToken')
  }), [user, loading, isAuthLoading, login, logout, register, updateProfile, refreshUserData]);

  console.log('AuthContext: Current user role:', user?.role, 'isAuthenticated:', value.isAuthenticated);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 