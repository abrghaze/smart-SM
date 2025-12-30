import React from 'react';
import {
  ExclamationTriangleIcon,
  XMarkIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  confirmButtonColor = 'red',
  icon: Icon = ExclamationTriangleIcon,
  type = 'danger' // 'danger', 'warning', 'info', 'success'
}) => {
  if (!isOpen) return null;

  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return { 
          bgColor: 'bg-emerald-50', 
          iconColor: 'text-emerald-600',
          icon: CheckCircleIcon
        };
      case 'warning':
        return { 
          bgColor: 'bg-amber-50', 
          iconColor: 'text-amber-600',
          icon: ExclamationTriangleIcon
        };
      case 'info':
        return { 
          bgColor: 'bg-blue-50', 
          iconColor: 'text-blue-600',
          icon: InformationCircleIcon
        };
      case 'danger':
      default:
        return { 
          bgColor: 'bg-red-50', 
          iconColor: 'text-red-600',
          icon: ExclamationTriangleIcon
        };
    }
  };

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex justify-center items-center px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    switch (confirmButtonColor) {
      case 'red':
        return `${baseClasses} bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 focus:ring-red-500`;
      case 'blue':
        return `${baseClasses} bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 focus:ring-blue-500`;
      case 'green':
        return `${baseClasses} bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 focus:ring-emerald-500`;
      default:
        return `${baseClasses} bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white shadow-lg shadow-gray-500/25 focus:ring-gray-500`;
    }
  };

  const iconConfig = getIconConfig();
  const IconComponent = Icon || iconConfig.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity animate-fade-in" 
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in overflow-hidden">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="p-6">
            <div className="flex items-start space-x-4">
              {/* Icon */}
              <div className={`flex-shrink-0 w-12 h-12 rounded-full ${iconConfig.bgColor} flex items-center justify-center`}>
                <IconComponent className={`w-6 h-6 ${iconConfig.iconColor}`} />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0 pt-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
              onClick={onClose}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className={getButtonClasses()}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;



