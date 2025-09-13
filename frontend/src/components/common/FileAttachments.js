import React, { useState, useEffect, useCallback } from 'react';
import { 
  DocumentIcon, 
  PhotoIcon, 
  DocumentTextIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';

const FileAttachments = ({ 
  objectiveId, 
  individualTargetId = null, 
  isEditable = false,
  onFilesChange = null 
}) => {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const loadAttachments = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 FileAttachments: Calling dataService.getObjectiveAttachments with:', { objectiveId, individualTargetId });
      console.log('🔍 FileAttachments: Parameters:', { objectiveId, individualTargetId, isEditable });
      
      // Fetch attachments bound to the individual target (if provided)
      const indFiles = individualTargetId 
        ? await dataService.getObjectiveAttachments(objectiveId, individualTargetId)
        : [];

      // Also fetch objective-level attachments (common files added by manager)
      const objFiles = await dataService.getObjectiveAttachments(objectiveId, null);

      const files = [...objFiles, ...indFiles];
      console.log('🔍 FileAttachments: Combined files count:', files.length);
      setAttachments(files);
    } catch (error) {
      console.error('❌ FileAttachments: Error loading attachments:', error);
      toast.error('Erreur lors du chargement des fichiers');
    } finally {
      setLoading(false);
    }
  }, [objectiveId, individualTargetId]);

  useEffect(() => {
    if (objectiveId) {
      console.log('🔍 FileAttachments: Loading attachments for objective:', objectiveId);
      loadAttachments();
    }
  }, [objectiveId, individualTargetId, loadAttachments]);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) {
      return PhotoIcon;
    } else if (mimeType?.includes('pdf')) {
      return DocumentTextIcon;
    } else if (mimeType?.includes('word') || mimeType?.includes('document')) {
      return DocumentTextIcon;
    } else if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) {
      return DocumentTextIcon;
    } else {
      return DocumentIcon;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = async (attachment) => {
    try {
      const response = await fetch(attachment.downloadUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Fichier téléchargé avec succès');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      // Here you would implement the file upload logic
      // For now, we'll just show a success message
      toast.success(`${selectedFiles.length} fichier(s) sélectionné(s)`);
      setSelectedFiles([]);
      
      // Reload attachments
      await loadAttachments();
      
      // Notify parent component
      if (onFilesChange) {
        onFilesChange(selectedFiles);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'upload');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800">
          Fichiers joints ({attachments.length})
        </h4>
        {isEditable && (
          <button
            onClick={() => document.getElementById('file-input').click()}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Ajouter
          </button>
        )}
      </div>

      {/* File Input (Hidden) */}
      <input
        id="file-input"
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.zip"
      />

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h5 className="text-sm font-medium text-blue-800 mb-2">
            Fichiers sélectionnés ({selectedFiles.length})
          </h5>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-white rounded px-3 py-2">
                <div className="flex items-center space-x-2">
                  <DocumentIcon className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-700">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    ({formatFileSize(file.size)})
                  </span>
                </div>
                <button
                  onClick={() => removeSelectedFile(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex space-x-2">
            <button
              onClick={handleUpload}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              Confirmer l'upload
            </button>
            <button
              onClick={() => setSelectedFiles([])}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Existing Attachments */}
      {attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.mimeType);
            return (
              <div
                key={attachment.id}
                className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <FileIcon className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {attachment.fileName}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{formatFileSize(attachment.fileSize)}</span>
                      <span>•</span>
                      <span>
                        Ajouté par {attachment.uploadedBy.firstName} {attachment.uploadedBy.lastName}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(attachment.uploadedAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(attachment)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                  Télécharger
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500">
          <DocumentIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
          <p className="text-sm">Aucun fichier joint</p>
        </div>
      )}
    </div>
  );
};

export default FileAttachments;
