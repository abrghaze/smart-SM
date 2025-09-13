import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';

const MultiSelect = ({ 
  options, 
  value = [], 
  onChange, 
  placeholder = "Sélectionner...",
  label,
  className = ""
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
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 cursor-pointer bg-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1 min-h-[20px]">
          {selectedOptions.length > 0 ? (
            selectedOptions.map(option => (
              <span
                key={option.id}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
              >
                {option.name || option.title}
                <button
                  type="button"
                  onClick={(e) => handleRemoveOption(option.id, e)}
                  className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>
        <ChevronDownIcon className={`absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-2">
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <div className="max-h-48 overflow-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div
                  key={option.id}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                    value.includes(option.id) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                  onClick={() => handleToggleOption(option.id)}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={value.includes(option.id)}
                      onChange={() => {}}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    {option.name || option.title}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-gray-500 text-sm">
                Aucune option trouvée
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelect;





