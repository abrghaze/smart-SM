import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  console.log('Login component rendered with state:', { email, password, loading });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    console.log('Login form submitted:', { email, password });
    
    try {
      console.log('Calling login function...');
      const result = await login(email, password);
      console.log('Login successful:', result);
      console.log('Navigating to /dashboard...');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error in component:', error);
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { email: 'admin@smartskill.com', password: 'admin123', role: 'Admin' },
    { email: 'amine17abrghaze@gmail.com', password: '12345678', role: 'Manager' },
    { email: 'manager1@smartskill.com', password: '12345678', role: 'Manager' },
    { email: 'amine1abrghaze@gmail.com', password: '12345678', role: 'Employé' },
    { email: 'employee1@smartskill.com', password: '12345678', role: 'Employé' }
  ];

  const fillDemoAccount = (demoAccount) => {
    console.log('Filling demo account:', demoAccount);
    setEmail(demoAccount.email);
    setPassword(demoAccount.password);
  };

  console.log('Login component returning JSX');
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-primary-600 to-primary-800 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Smart Skill Matrix
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Connectez-vous à votre compte
          </p>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={(e) => {
          console.log('Form submitted, calling handleSubmit');
          handleSubmit(e);
        }}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Adresse email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  console.log('Email changed:', e.target.value);
                  setEmail(e.target.value);
                }}
                className="input-field mt-1"
                placeholder="votre@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => {
                    console.log('Password visibility toggled, current state:', showPassword);
                    setShowPassword(!showPassword);
                  }}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex justify-center py-3"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connexion...
                </div>
              ) : (
                'Se connecter'
              )}
            </button>
          </div>
        </form>

        {/* Demo Accounts */}
        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gradient-to-br from-primary-50 to-secondary-50 text-gray-500">
                Comptes de démonstration
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {demoAccounts.map((account, index) => (
              <button
                key={index}
                onClick={() => {
                  console.log('Demo account button clicked:', account);
                  fillDemoAccount(account);
                }}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors duration-200"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{account.role}</p>
                    <p className="text-xs text-gray-500">{account.email}</p>
                  </div>
                  <span className="text-xs text-primary-600 font-medium">Cliquer pour remplir</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            © 2024 Smart Skill Matrix. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 