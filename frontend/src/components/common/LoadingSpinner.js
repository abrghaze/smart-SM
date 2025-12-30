import React from 'react';

const LoadingSpinner = ({ size = 'md', text = 'Chargement...' }) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20'
  };

  const borderClasses = {
    sm: 'border-2',
    md: 'border-3',
    lg: 'border-4',
    xl: 'border-4'
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="relative">
        {/* Outer glow effect */}
        <div className={`${sizeClasses[size]} absolute inset-0 rounded-full bg-blue-400 opacity-20 blur-md animate-pulse`}></div>
        
        {/* Main spinner */}
        <div className={`${sizeClasses[size]} ${borderClasses[size]} relative animate-spin rounded-full border-gray-200 border-t-blue-600 border-r-blue-600`}></div>
        
        {/* Inner dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
        </div>
      </div>
      
      {text && (
        <div className="mt-6 text-center">
          <p className="text-gray-700 font-medium">{text}</p>
          <div className="flex justify-center space-x-1 mt-2">
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner; 