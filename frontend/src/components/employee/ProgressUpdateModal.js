import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon,
  ChartBarIcon,
  DocumentTextIcon,
  PaperClipIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ProgressUpdateModal = ({ 
  isOpen, 
  onClose, 
  objective, 
  onProgressUpdate 
}) => {
  const [progressData, setProgressData] = useState({
    progress: 0,
    description: '',
    proofFile: null
  });
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Initialize progress with current objective progress when modal opens
  useEffect(() => {
    if (isOpen && objective) {
      const currentProgress = objective.progress || 0;
      setProgressData(prev => ({
        ...prev,
        progress: currentProgress
      }));
      console.log('🔍 ProgressUpdateModal: Initialized with current progress:', currentProgress);
    }
  }, [isOpen, objective]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Le fichier est trop volumineux. Taille maximum: 5MB');
        return;
      }
      setSelectedFile(file);
      setProgressData(prev => ({ ...prev, proofFile: file }));
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setProgressData(prev => ({ ...prev, proofFile: null }));
    // Reset file input
    const fileInput = document.getElementById('proof-file-input');
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!progressData.description.trim()) {
      toast.error('La description des progrès est obligatoire');
      return;
    }
    
    if (!progressData.proofFile) {
      toast.error('La preuve de progression est obligatoire');
      return;
    }

    try {
      setLoading(true);
      
      // Here you would implement the actual progress update logic
      console.log('🔍 ProgressUpdateModal: Submitting progress update:', progressData);
      
      if (onProgressUpdate) {
        await onProgressUpdate(progressData);
      }
      
      toast.success('Progression mise à jour avec succès!');
      onClose();
      
      // Reset form
      setProgressData({
        progress: 0,
        description: '',
        proofFile: null
      });
      setSelectedFile(null);
      
    } catch (error) {
      console.error('❌ ProgressUpdateModal: Error updating progress:', error);
      toast.error('Erreur lors de la mise à jour de la progression');
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'text-green-600';
    if (progress >= 50) return 'text-blue-600';
    if (progress >= 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressBarColor = (progress) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (!isOpen || !objective) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center">
              <ChartBarIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Mettre à jour la progression
              </h2>
              <p className="text-gray-600 mt-1">
                Suivez vos progrès et fournissez des preuves de votre avancement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center transition-colors duration-200 shadow-sm border border-gray-200"
          >
            <XMarkIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Objective Info Card */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-4 border border-gray-200">
            <div className="flex items-center space-x-3">
              <DocumentTextIcon className="w-8 h-8 text-blue-500" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {objective.title || 'Objectif'}
                </h3>
                <p className="text-sm text-gray-600">
                  Progression actuelle: <span className="font-medium">{objective.progress || 0}%</span>
                </p>
              </div>
            </div>
          </div>

          {/* Progress Input */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              Nouvelle progression <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              <input
                type="range"
                min={objective.progress || 0}
                max="100"
                value={progressData.progress}
                onChange={(e) => setProgressData(prev => ({ ...prev, progress: parseInt(e.target.value) }))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, ${getProgressBarColor(progressData.progress)} 0%, ${getProgressBarColor(progressData.progress)} ${progressData.progress}%, #e5e7eb ${progressData.progress}%, #e5e7eb 100%)`
                }}
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">{objective.progress || 0}%</span>
                <span className={`text-2xl font-bold ${getProgressColor(progressData.progress)}`}>
                  {progressData.progress}%
                </span>
                <span className="text-sm text-gray-500">100%</span>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Progression minimale: {objective.progress || 0}% (progression actuelle)
              </p>
            </div>
          </div>

          {/* Description Input */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              Description des progrès <span className="text-red-500">*</span>
            </label>
            <textarea
              value={progressData.description}
              onChange={(e) => setProgressData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Décrivez en détail ce que vous avez accompli pour faire progresser cet objectif..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm resize-none"
              rows="4"
              required
            />
            <p className="text-xs text-gray-500">
              Soyez spécifique et détaillé dans votre description
            </p>
          </div>

          {/* File Upload */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              Preuve de progression <span className="text-red-500">*</span>
            </label>
            
            <div className="space-y-3">
              {/* File Input */}
              <div className="relative">
                <input
                  id="proof-file-input"
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                  required
                />
                <label
                  htmlFor="proof-file-input"
                  className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex flex-col items-center space-y-2">
                    <PaperClipIcon className="w-8 h-8 text-gray-400" />
                    <div className="text-center">
                      <span className="text-sm font-medium text-gray-700">
                        Cliquez pour choisir un fichier
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        ou glissez-déposez ici
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {/* File Info */}
              <div className="text-xs text-gray-500 space-y-1">
                <p className="flex items-center">
                  <ExclamationTriangleIcon className="w-4 h-4 mr-1 text-yellow-500" />
                  <span className="font-medium">Obligatoire:</span> Fournissez une preuve de vos progrès
                </p>
                <p>Formats acceptés: PDF, DOC, DOCX, TXT, JPG, PNG, GIF (max 5MB)</p>
              </div>

              {/* Selected File Preview */}
              {selectedFile && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-green-600">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-200"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !progressData.description.trim() || !progressData.proofFile}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Mise à jour...
                </div>
              ) : (
                'Mettre à jour'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Custom CSS for slider */}
      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
};

export default ProgressUpdateModal;




