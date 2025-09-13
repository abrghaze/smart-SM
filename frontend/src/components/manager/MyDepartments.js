import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dataService from '../../services/dataService';
import toast from 'react-hot-toast';
import {
  BuildingOfficeIcon,
  UsersIcon,
  UserIcon,
  UserGroupIcon,
  ChartBarIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import DepartmentDetailModal from '../admin/DepartmentDetailModal';

const MyDepartments = () => {
  const [managedDepartments, setManagedDepartments] = useState([]);
  const [memberDepartments, setMemberDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);

  useEffect(() => {
    loadDepartmentData();
  }, []);

  const loadDepartmentData = async () => {
    try {
      setLoading(true);
      const departmentData = await dataService.getManagerDepartments();
      
      setManagedDepartments(departmentData.managedDepartments || []);
      setMemberDepartments(departmentData.memberDepartments || []);
    } catch (error) {
      console.error('Error loading department data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentClick = (department) => {
    setSelectedDepartment(department);
    setShowDepartmentModal(true);
  };

  const handleDepartmentModalClose = () => {
    setShowDepartmentModal(false);
    setSelectedDepartment(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Chargement des départements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Modern Header */}
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-3xl shadow-lg border border-indigo-100 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <BuildingOfficeIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-900 to-purple-900 bg-clip-text text-transparent">
              Mes Départements
            </h1>
            <p className="text-lg text-gray-600 mt-2">Gérez vos départements et équipes</p>
          </div>
        </div>
        
        {/* Stats Overview */}
        <div className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Departments */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <ChartBarIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total départements</p>
                  <p className="text-2xl font-bold text-gray-900">{managedDepartments.length + memberDepartments.length}</p>
                </div>
              </div>
            </div>

            {/* Total Teams */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                  <UserGroupIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total équipes</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {managedDepartments.reduce((sum, dept) => sum + (dept.teamsCount || 0), 0) + 
                     memberDepartments.reduce((sum, dept) => sum + (dept.teamsCount || 0), 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Total Employees */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <UsersIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total employés</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {managedDepartments.reduce((sum, dept) => sum + (dept.employeesCount || 0), 0) + 
                     memberDepartments.reduce((sum, dept) => sum + (dept.employeesCount || 0), 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Managed Departments Section - Only show if there are managed departments */}
      {managedDepartments.length > 0 && (
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <StarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Départements que je gère</h2>
              <p className="text-gray-600">Vous gérez {managedDepartments.length} département(s)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {managedDepartments.map((department) => (
              <div 
                key={department.id} 
                className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200 hover:shadow-xl transition-all duration-300 cursor-pointer group hover:scale-105"
                onClick={() => handleDepartmentClick(department)}
              >
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                    <BuildingOfficeIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{department.name}</h3>
                    {department.description && (
                      <p className="text-sm text-gray-600 leading-relaxed">{department.description}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                    <div className="flex items-center space-x-2">
                      <UsersIcon className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-gray-700">Employés</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">{department.employeesCount || 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                    <div className="flex items-center space-x-2">
                      <UserGroupIcon className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-gray-700">Équipes</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">{department.teamsCount || 0}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-3 bg-green-100 rounded-xl">
                    <UserIcon className="h-5 w-5 text-green-700" />
                    <span className="text-sm font-semibold text-green-700">Vous êtes le manager</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member Departments Section - Only show if there are member departments */}
      {memberDepartments.length > 0 && (
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Départements dont je suis membre</h2>
              <p className="text-gray-600">Vous êtes membre de {memberDepartments.length} département(s)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {memberDepartments.map((department) => (
              <div 
                key={department.id} 
                className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200 hover:shadow-xl transition-all duration-300 cursor-pointer group hover:scale-105"
                onClick={() => handleDepartmentClick(department)}
              >
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                    <BuildingOfficeIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{department.name}</h3>
                    {department.description && (
                      <p className="text-sm text-gray-600 leading-relaxed">{department.description}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                    <div className="flex items-center space-x-2">
                      <UsersIcon className="h-5 w-5 text-blue-600" />
                      <span className="text-sm text-gray-700">Employés</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{department.employeesCount || 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                    <div className="flex items-center space-x-2">
                      <UserGroupIcon className="h-5 w-5 text-blue-600" />
                      <span className="text-sm text-gray-700">Équipes</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{department.teamsCount || 0}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-3 bg-blue-100 rounded-xl">
                    <UserIcon className="h-5 w-5 text-blue-700" />
                    <span className="text-sm font-semibold text-blue-700">Vous êtes membre</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show message if no departments at all */}
      {managedDepartments.length === 0 && memberDepartments.length === 0 && (
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-12">
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <BuildingOfficeIcon className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Aucun département</h3>
            <p className="text-gray-600 text-lg mb-6">Vous n'appartenez à aucun département pour le moment</p>
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
              <p className="text-gray-700 font-medium">
                Contactez votre administrateur pour être assigné à un département
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Department Detail Modal */}
      <DepartmentDetailModal
        department={selectedDepartment}
        isOpen={showDepartmentModal}
        onClose={handleDepartmentModalClose}
        onDepartmentUpdated={loadDepartmentData}
      />
    </div>
  );
};

export default MyDepartments;

