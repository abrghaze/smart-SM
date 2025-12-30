import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, XMarkIcon, CheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const MultiSelect = ({ 
  options, 
  value = [], 
  onChange, 
  placeholder = "Sélectionner...",
  label,
  className = "",
  variant = "default" // "default", "modern", "minimal"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = (options || []).filter(option => {
    const optionName = option.name || option.title || '';
    return optionName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleToggleOption = (optionId) => {
    const newValue = value.includes(optionId)
      ? value.filter(id => id !== optionId)
      : [...value, optionId];
    onChange(newValue);
  };

  const handleRemoveOption = (optionId, e) => {
    e.stopPropagation();
    const newValue = value.filter(id => id !== optionId);
    onChange(newValue);
  };

  const selectedOptions = (options || []).filter(option => value.includes(option.id));

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <div
        className={`w-full px-4 py-3 border-2 rounded-xl cursor-pointer bg-white transition-all duration-200
          ${isOpen 
            ? 'border-blue-500 ring-4 ring-blue-100 shadow-lg' 
            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
          }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-2 min-h-[24px] pr-6">
          {selectedOptions.length > 0 ? (
            selectedOptions.map(option => (
              <span
                key={option.id}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm transform transition-all duration-200 hover:scale-105"
              >
                {option.name || option.title}
                <button
                  type="button"
                  onClick={(e) => handleRemoveOption(option.id, e)}
                  className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 hover:bg-white/30 transition-colors duration-200"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-gray-400 font-medium">{placeholder}</span>
          )}
        </div>
        <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 bg-white"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          
          {/* Options List */}
          <div className="max-h-56 overflow-auto p-2">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => {
                const isSelected = value.includes(option.id);
                return (
                  <div
                    key={option.id}
                    className={`flex items-center px-4 py-3 cursor-pointer rounded-xl mb-1 transition-all duration-200 ${
                      isSelected 
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200' 
                        : 'hover:bg-gray-50 border-2 border-transparent'
                    }`}
                    onClick={() => handleToggleOption(option.id)}
                  >
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center mr-3 transition-all duration-200 ${
                      isSelected 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 border-transparent' 
                        : 'border-gray-300 bg-white'
                    }`}>
                      {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`font-medium ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                      {option.name || option.title}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center">
                <div className="text-gray-400 mb-2">
                  <MagnifyingGlassIcon className="w-8 h-8 mx-auto" />
                </div>
                <p className="text-gray-500 text-sm font-medium">Aucune option trouvée</p>
              </div>
            )}
          </div>

          {/* Footer with count */}
          {selectedOptions.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500">
                {selectedOptions.length} sélectionné{selectedOptions.length > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;





