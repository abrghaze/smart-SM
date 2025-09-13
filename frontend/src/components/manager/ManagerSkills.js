import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { getSkillLevelName, getSkillLevelOptions } from '../../utils/skillLevels';
import SkillCard from '../common/SkillCard';

const ManagerSkills = () => {
  const { user, isAuthLoading } = useAuth();
  const navigate = useNavigate();

  // Role-based access control
  useEffect(() => {
    if (!isAuthLoading && user && user.role !== 'manager') {
      console.warn('ManagerSkills: Unauthorized access attempt by user with role:', user.role);
      navigate('/');
      return;
    }
  }, [user, isAuthLoading, navigate]);
  const [userSkills, setUserSkills] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewSkillModal, setShowNewSkillModal] = useState(false);
  // Memoized initial states for better performance
  const initialNewSkillRequest = useMemo(() => ({
    requestType: 'add_existing',
    skillId: '',
    requestedSkillName: '',
    skillDescription: '',
    currentLevel: 1,
    targetLevel: 2,
    reason: '',
    certificateFile: null
  }), []);


  const [newSkillRequest, setNewSkillRequest] = useState(initialNewSkillRequest);
  const [previewCertificate, setPreviewCertificate] = useState(null);
  const [availableApprovers, setAvailableApprovers] = useState([]);
  const [selectedApprover, setSelectedApprover] = useState('');
  const [skillTypeFilter, setSkillTypeFilter] = useState('all'); // New state for skill type filtering

  const skillLevelOptions = useMemo(() => getSkillLevelOptions(), []);
  
  // Filter available skills based on type
  const filteredAvailableSkills = useMemo(() => {
    if (skillTypeFilter === 'all') {
      return availableSkills;
    }
    return availableSkills.filter(skill => skill.type === skillTypeFilter);
  }, [availableSkills, skillTypeFilter]);

  const loadSkillsData = useCallback(async () => {
    try {
      setLoading(true);
      // Load user's current skills and available skills in parallel for better performance
      const [skillsData, availableSkillsData] = await Promise.all([
        dataService.getMySkills(),
        dataService.getSkills()
      ]);
      
      setUserSkills(skillsData || []);
      setAvailableSkills(availableSkillsData || []);
      
      console.log('ManagerSkills: Loaded skills data successfully', { 
        userSkills: skillsData?.length || 0, 
        availableSkills: availableSkillsData?.length || 0 
      });
    } catch (error) {
      console.error('ManagerSkills: Error loading skills data:', error);
      toast.error('Erreur lors du chargement des compétences');
      // Reset to empty arrays on error to prevent undefined errors
      setUserSkills([]);
      setAvailableSkills([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load user skills and available skills
  useEffect(() => {
    // Don't fetch data if auth is still loading
    if (isAuthLoading || !user) {
      return;
    }
    
    loadSkillsData();
  }, [isAuthLoading, user, loadSkillsData]);

  const loadAvailableApprovers = useCallback(async () => {
    try {
      // Use the new intelligent approver endpoint
      const approversResponse = await dataService.getMyApprovers();
      setAvailableApprovers(approversResponse || []);
      if (approversResponse && approversResponse.length > 0) {
        setSelectedApprover(approversResponse[0].id);
      }
    } catch (error) {
      console.error('Error loading available approvers:', error);
      toast.error('Erreur lors du chargement des approbateurs');
    }
  }, []);

  const handleCertificateFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewSkillRequest({ ...newSkillRequest, certificateFile: file });

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreviewCertificate(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setPreviewCertificate(null);
      }
    }
  };

  const handleRequestNewSkill = async () => {
    // Validate based on request type
    if (newSkillRequest.requestType === 'add_existing' && !newSkillRequest.skillId) {
      toast.error('Veuillez sélectionner une compétence');
      return;
    }

    if (newSkillRequest.requestType === 'upgrade' && !newSkillRequest.skillId) {
      toast.error('Veuillez sélectionner une compétence à améliorer');
      return;
    }

    if (newSkillRequest.requestType === 'create_new' && !newSkillRequest.requestedSkillName) {
      toast.error('Veuillez saisir le nom de la nouvelle compétence');
      return;
    }

    if (newSkillRequest.requestType === 'create_new' && !newSkillRequest.skillDescription) {
      toast.error('Veuillez décrire la nouvelle compétence');
      return;
    }

    if (!newSkillRequest.certificateFile) {
      toast.error('Veuillez ajouter un certificat pour valider votre demande');
      return;
    }

    try {
      setLoading(true);
      
      // Upload certificate file first
      const fileResponse = await dataService.uploadFile(newSkillRequest.certificateFile);
      
      // Prepare request data based on type
      let requestData = {
        type: newSkillRequest.requestType,
        reason: newSkillRequest.reason,
        certificateFileId: fileResponse.fileId
      };

      if (newSkillRequest.requestType === 'add_existing') {
        const skillData = availableSkills.find(s => s.id === newSkillRequest.skillId);
        requestData = {
          ...requestData,
          skillId: newSkillRequest.skillId,
          requestedSkillName: skillData.name,
          targetLevel: 1
        };
      } else if (newSkillRequest.requestType === 'upgrade') {
        const skillData = userSkills.find(s => s.id === newSkillRequest.skillId);
        requestData = {
          ...requestData,
          skillId: newSkillRequest.skillId,
          currentLevel: skillData.level,
          targetLevel: newSkillRequest.targetLevel
        };
      } else if (newSkillRequest.requestType === 'create_new') {
        requestData = {
          ...requestData,
          requestedSkillName: newSkillRequest.requestedSkillName,
          skillDescription: newSkillRequest.skillDescription,
          targetLevel: 1
        };
      }

      // Create skill request
      console.log('🚀 Manager submitting skill request:', requestData);
      const response = await dataService.createSkillRequest(requestData);
      console.log('✅ Manager skill request response:', response);

      const successMessage = newSkillRequest.requestType === 'add_existing' 
        ? `Demande de compétence "${requestData.requestedSkillName}" envoyée à l'admin`
        : newSkillRequest.requestType === 'upgrade'
        ? `Demande d'amélioration pour ${requestData.requestedSkillName} envoyée à l'admin`
        : `Demande de création de compétence "${requestData.requestedSkillName}" envoyée à l'admin`;

      toast.success(successMessage);
      setShowNewSkillModal(false);
      setNewSkillRequest(initialNewSkillRequest);
      setPreviewCertificate(null);
      setAvailableApprovers([]);
      setSelectedApprover('');
      setSkillTypeFilter('all'); // Reset skill type filter
    } catch (error) {
      console.error('Error creating skill request:', error);
      toast.error(error.message || 'Erreur lors de la création de la demande');
    } finally {
      setLoading(false);
    }
  };




  if (loading && userSkills.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Mes Compétences</h1>
            <p className="text-gray-600">Gérez vos compétences et demandez des améliorations</p>
          </div>
          <button
            onClick={() => setShowNewSkillModal(true)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Demander une compétence
          </button>
        </div>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userSkills.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            isLoading={loading}
          />
        ))}
      </div>

      {/* New Skill Modal */}
      {showNewSkillModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <PlusIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Demander une nouvelle compétence</h3>
                    <p className="text-gray-600">Enrichissez votre profil de compétences</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowNewSkillModal(false);
                    setSkillTypeFilter('all'); // Reset skill type filter
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-500" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-3">Type de demande</label>
                  <select
                    value={newSkillRequest.requestType}
                    onChange={(e) => setNewSkillRequest({ ...newSkillRequest, requestType: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  >
                    <option value="add_existing">Ajouter une compétence existante</option>
                    <option value="upgrade">Améliorer une compétence existante</option>
                    <option value="create_new">Créer une nouvelle compétence</option>
                  </select>
                </div>
                
                {newSkillRequest.requestType === 'add_existing' && (
                  <>
                    {/* Skill Type Filter */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-3">Filtrer par type</label>
                      <div className="flex space-x-1 bg-gray-100 rounded-xl p-1">
                        <label className="flex-1">
                          <input
                            type="radio"
                            value="all"
                            checked={skillTypeFilter === 'all'}
                            onChange={(e) => setSkillTypeFilter(e.target.value)}
                            className="sr-only"
                          />
                          <div className={`w-full py-2 px-4 text-center rounded-lg cursor-pointer transition-all duration-200 ${
                            skillTypeFilter === 'all' 
                              ? 'bg-white shadow-sm text-blue-600 font-medium' 
                              : 'text-gray-600 hover:text-gray-800'
                          }`}>
                            Toutes
                          </div>
                        </label>
                        <label className="flex-1">
                          <input
                            type="radio"
                            value="hard"
                            checked={skillTypeFilter === 'hard'}
                            onChange={(e) => setSkillTypeFilter(e.target.value)}
                            className="sr-only"
                          />
                          <div className={`w-full py-2 px-4 text-center rounded-lg cursor-pointer transition-all duration-200 ${
                            skillTypeFilter === 'hard' 
                              ? 'bg-white shadow-sm text-blue-600 font-medium' 
                              : 'text-gray-600 hover:text-gray-800'
                          }`}>
                            Techniques
                          </div>
                        </label>
                        <label className="flex-1">
                          <input
                            type="radio"
                            value="soft"
                            checked={skillTypeFilter === 'soft'}
                            onChange={(e) => setSkillTypeFilter(e.target.value)}
                            className="sr-only"
                          />
                          <div className={`w-full py-2 px-4 text-center rounded-lg cursor-pointer transition-all duration-200 ${
                            skillTypeFilter === 'soft' 
                              ? 'bg-white shadow-sm text-blue-600 font-medium' 
                              : 'text-gray-600 hover:text-gray-800'
                          }`}>
                            Comportementales
                          </div>
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-3">Compétence</label>
                      <select
                        value={newSkillRequest.skillId}
                        onChange={(e) => setNewSkillRequest({ ...newSkillRequest, skillId: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                      >
                        <option value="">Sélectionner une compétence</option>
                        {filteredAvailableSkills
                          .filter(skill => !userSkills.some(userSkill => userSkill.id === skill.id))
                          .map(skill => (
                            <option key={skill.id} value={skill.id}>
                              {skill.name} ({skill.type === 'hard' ? 'Technique' : 'Comportementale'})
                            </option>
                          ))}
                      </select>
                    </div>
                  </>
                )}

                {newSkillRequest.requestType === 'upgrade' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-3">Compétence à améliorer</label>
                      <select
                        value={newSkillRequest.skillId}
                        onChange={(e) => {
                          const selectedSkill = userSkills.find(skill => skill.id === e.target.value);
                          setNewSkillRequest({ 
                            ...newSkillRequest, 
                            skillId: e.target.value,
                            targetLevel: selectedSkill ? selectedSkill.level + 1 : 1 // Set to next level
                          });
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                      >
                        <option value="">Sélectionner une compétence à améliorer</option>
                        {userSkills.filter(skill => skill.level < 5).length === 0 ? (
                          <option value="" disabled>
                            Aucune compétence à améliorer (toutes au niveau maximum)
                          </option>
                        ) : (
                          userSkills
                            .filter(skill => skill.level < 5) // Only show skills that can be improved
                            .map(skill => (
                              <option key={skill.id} value={skill.id}>
                                {skill.name} (Niveau {skill.level})
                              </option>
                            ))
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-3">Niveau cible</label>
                      <select
                        value={newSkillRequest.targetLevel}
                        onChange={(e) => setNewSkillRequest({ ...newSkillRequest, targetLevel: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                      >
                        {(() => {
                          const selectedSkill = userSkills.find(skill => skill.id === newSkillRequest.skillId);
                          const currentLevel = selectedSkill ? selectedSkill.level : 0;
                          
                          return skillLevelOptions
                            .filter(level => level.value > currentLevel)
                            .map(level => (
                              <option key={level.value} value={level.value}>
                                {level.label}
                              </option>
                            ));
                        })()}
                      </select>
                    </div>
                  </>
                )}

                {newSkillRequest.requestType === 'create_new' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-3">Nom de la compétence</label>
                      <input
                        type="text"
                        value={newSkillRequest.requestedSkillName}
                        onChange={(e) => setNewSkillRequest({ ...newSkillRequest, requestedSkillName: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                        placeholder="Ex: Leadership, Communication, Analyse de données"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-3">Description de la compétence</label>
                      <textarea
                        value={newSkillRequest.skillDescription}
                        onChange={(e) => setNewSkillRequest({ ...newSkillRequest, skillDescription: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white resize-none"
                        placeholder="Décrivez la compétence que vous souhaitez acquérir..."
                      />
                    </div>
                  </>
                )}
                
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-3">Raison de la demande</label>
                  <textarea
                    value={newSkillRequest.reason}
                    onChange={(e) => setNewSkillRequest({ ...newSkillRequest, reason: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white resize-none"
                    placeholder="Expliquez pourquoi vous souhaitez acquérir cette compétence..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-3">Certificat *</label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                      onChange={(e) => handleCertificateFileChange(e, false)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all duration-200"
                      required
                    />
                    {newSkillRequest.certificateFile && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600 bg-green-50 p-3 rounded-xl">
                        <span>📎 {newSkillRequest.certificateFile.name}</span>
                        <button
                          type="button"
                          onClick={() => setNewSkillRequest({...newSkillRequest, certificateFile: null})}
                          className="text-red-500 hover:text-red-700 font-medium"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl">
                      <strong>Obligatoire:</strong> Fournissez un certificat pour valider votre demande (screenshots, documents, etc.)<br/>
                      Formats acceptés: PDF, DOC, DOCX, TXT, JPG, PNG, GIF (max 5MB)
                    </p>
                  </div>
                </div>

                {previewCertificate && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-3">Aperçu</label>
                    <img
                      src={previewCertificate}
                      alt="Certificate preview"
                      className="w-full h-40 object-cover rounded-xl border-2 border-gray-200"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowNewSkillModal(false);
                    setSkillTypeFilter('all'); // Reset skill type filter
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleRequestNewSkill}
                  disabled={loading || !newSkillRequest.certificateFile}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
                >
                  {loading ? 'Envoi...' : 'Envoyer la demande'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManagerSkills;
