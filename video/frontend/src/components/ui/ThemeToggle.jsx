'use client';

import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const ThemeToggle = () => {
  const { theme, changeTheme, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor }
  ];

  const currentTheme = themes.find(t => t.value === theme);

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

  const handleThemeChange = (newTheme) => {
    changeTheme(newTheme);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          p-2 rounded-lg border transition-colors duration-200
          ${isDark 
            ? 'bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700' 
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        `}
        title={`Current theme: ${currentTheme?.label}`}
      >
        {currentTheme && (
          <currentTheme.icon className="w-5 h-5" />
        )}
      </button>

      {isOpen && (
        <div className={`
          absolute right-0 mt-2 w-32 rounded-lg shadow-lg border z-50
          ${isDark 
            ? 'bg-gray-800 border-gray-600' 
            : 'bg-white border-gray-200'
          }
        `}>
          <div className="py-1">
            {themes.map((themeOption) => {
              const Icon = themeOption.icon;
              const isSelected = theme === themeOption.value;
              
              return (
                <button
                  key={themeOption.value}
                  onClick={() => handleThemeChange(themeOption.value)}
                  className={`
                    w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors duration-150
                    ${isSelected
                      ? (isDark ? 'bg-gray-700 text-blue-400' : 'bg-blue-50 text-blue-600')
                      : (isDark ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50')
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{themeOption.label}</span>
                  {isSelected && (
                    <span className="ml-auto text-xs">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
