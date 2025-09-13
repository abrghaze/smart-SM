import React, { useEffect } from 'react';
import { 
  XMarkIcon,
  CalendarIcon,
  UserIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import FileAttachments from '../common/FileAttachments';

const ObjectiveDetailsModal = ({ 
  isOpen, 
  onClose, 
  objective, 
  onUpdate 
}) => {
  useEffect(() => {
    if (isOpen && objective?.id) {
      // Files are loaded by the FileAttachments component directly
      console.log('🔍 ObjectiveDetailsModal: Opening modal for objective:', objective.id);
    }
  }, [isOpen, objective?.id]);

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'terminé':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'in_progress':
      case 'en_cours':
        return <ClockIcon className="w-5 h-5 text-blue-500" />;
      case 'not_started':
      case 'non_commencé':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'terminé':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
      case 'en_cours':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'not_started':
      case 'non_commencé':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryDisplayName = (category) => {
    switch (category) {
      case 'personal_improvement':
        return 'Amélioration personnelle';
      case 'company_project':
        return 'Contribution d\'équipe';
      default:
        return category || 'Non spécifiée';
    }
  };

  const getSkillLevelDisplay = (level) => {
    if (!level) return 'Non spécifié';
    return `Niveau ${level}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non spécifiée';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  if (!isOpen || !objective) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <DocumentTextIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Détails de l'objectif
              </h2>
              <p className="text-gray-600 mt-1">
                Consultez les informations complètes de votre objectif
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
        <div className="p-6 space-y-6">
          {/* Objective Overview Card */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Titre de l'objectif
                  </label>
                  <div className="text-lg font-medium text-gray-900 bg-white px-4 py-3 rounded-xl border border-gray-200">
                    {objective.title || 'Non spécifié'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <div className="text-gray-800 bg-white px-4 py-3 rounded-xl border border-gray-200 min-h-[80px] flex items-start">
                    {objective.description || 'Aucune description fournie'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Catégorie
                  </label>
                  <div className="inline-flex items-center px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                    {getCategoryDisplayName(objective.category)}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Only show competence for "Amélioration personnelle" objectives */}
                {(objective.category === 'personal_improvement' || objective.category === 'amélioration personnelle') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Compétence
                    </label>
                    <div className="text-gray-800 bg-white px-4 py-3 rounded-xl border border-gray-200">
                      {objective.skill?.name || objective.skillName || 'Non spécifiée'}
                    </div>
                  </div>
                )}

                {/* Only show target level for "Amélioration personnelle" objectives */}
                {(objective.category === 'personal_improvement' || objective.category === 'amélioration personnelle') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Niveau cible
                    </label>
                    <div className="text-gray-800 bg-white px-4 py-3 rounded-xl border border-gray-200">
                      {getSkillLevelDisplay(objective.targetLevel || objective.target_level)}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Échéance
                  </label>
                  <div className="flex items-center space-x-2 text-gray-800 bg-white px-4 py-3 rounded-xl border border-gray-200">
                    <CalendarIcon className="w-5 h-5 text-blue-500" />
                    <span>{formatDate(objective.deadline)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress and Status Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Progress Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Progression actuelle
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Progression</span>
                    <span className="text-lg font-bold text-blue-600">
                      {objective.progress || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${objective.progress || 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Statut</span>
                  <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border ${getStatusColor(objective.status)}`}>
                    {getStatusIcon(objective.status)}
                    <span className="text-sm font-medium">
                      {objective.status || 'Non spécifié'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Assignment Info Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Informations d'assignation
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <UserIcon className="w-5 h-5 text-green-500" />
                  <div>
                    <span className="text-sm text-gray-600">Assigné par</span>
                    <p className="text-sm font-medium text-gray-900">
                      {objective.creator?.firstName || objective.creatorFirstName} {objective.creator?.lastName || objective.creatorLastName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <CalendarIcon className="w-5 h-5 text-blue-500" />
                  <div>
                    <span className="text-sm text-gray-600">Date de création</span>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(objective.createdAt || objective.created_at)}
                    </p>
                  </div>
                </div>

                {objective.teamName && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">T</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Équipe</span>
                      <p className="text-sm font-medium text-gray-900">
                        {objective.teamName}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

                      {/* File Attachments Section */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                Fichiers joints
              </h3>
              

              

              
              <FileAttachments 
                objectiveId={objective.id}
                individualTargetId={objective.individualTargetId || objective.contributionId}
                isEditable={false}
              />
            </div>

          {/* Individual Customization Section (if exists) */}
          {objective.individualFile && (
            <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-2xl p-6 border border-green-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Personnalisation individuelle
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {objective.customTitle && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Titre personnalisé
                    </label>
                    <div className="text-gray-800 bg-white px-4 py-3 rounded-xl border border-green-200">
                      {objective.customTitle}
                    </div>
                  </div>
                )}

                {objective.customDescription && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description personnalisée
                    </label>
                    <div className="text-gray-800 bg-white px-4 py-3 rounded-xl border border-green-200 min-h-[80px] flex items-start">
                      {objective.customDescription}
                    </div>
                  </div>
                )}

                {objective.customDeadline && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Échéance individuelle
                    </label>
                    <div className="flex items-center space-x-2 text-gray-800 bg-white px-4 py-3 rounded-xl border border-green-200">
                      <CalendarIcon className="w-5 h-5 text-green-500" />
                      <span>{formatDate(objective.customDeadline)}</span>
                    </div>
                  </div>
                )}

                {objective.individualFile && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Fichier individuel
                    </label>
                    <div className="bg-white px-4 py-3 rounded-xl border border-green-200">
                      <div className="flex items-center space-x-3">
                        <DocumentIcon className="w-8 h-8 text-green-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {objective.individualFile.name || 'Fichier joint'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Cliquez pour télécharger
                          </p>
                        </div>
                        <button className="p-2 bg-green-100 hover:bg-green-200 rounded-lg transition-colors">
                          <ArrowDownTrayIcon className="w-5 h-5 text-green-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-4 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-200"
          >
            Fermer
          </button>
                     <button
             onClick={() => {
               console.log('🔍 ObjectiveDetailsModal: Update button clicked for objective:', objective.id);
               if (onUpdate) {
                 onUpdate();
               } else {
                 // Default behavior - show progress update modal
                 console.log('🔍 ObjectiveDetailsModal: No onUpdate provided, showing default behavior');
                 // You can add default behavior here
               }
             }}
             className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
           >
             Mettre à jour
           </button>
        </div>
      </div>
    </div>
  );
};

export default ObjectiveDetailsModal;
