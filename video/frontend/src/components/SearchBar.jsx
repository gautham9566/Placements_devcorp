import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const SearchBar = ({
  placeholder = "Search...",
  value,
  onChange,
  onSubmit,
  showSubmitButton = false,
  variant = "default", // "default", "centered", "admin"
  className = ""
}) => {
  const { isDark } = useTheme();
  // Local buffer so we only propagate changes when user presses Enter (or clicks submit)
  const [inputValue, setInputValue] = useState(value || '');
  const inputRef = useRef(null);

  // Sync when external value changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const commit = (val) => {
    if (onChange) onChange(val);
    if (onSubmit) onSubmit(val);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit(inputValue);
    }
    if (e.key === 'Escape') {
      // Clear on Escape for convenience
      setInputValue('');
      // do not auto-commit; user can press Enter to search empty string if desired
      if (inputRef.current) inputRef.current.blur();
    }
  };

  const handleSubmitClick = () => {
    commit(inputValue);
  };

  const baseInputClasses = `w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
    isDark 
      ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-400' 
      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
  }`;

  const getInputClasses = () => {
    switch (variant) {
      case "centered":
        return `${baseInputClasses} px-16 text-lg font-medium`;
      case "admin":
        // admin variant: slightly more compact padding, full width, and expand/visual emphasis on focus
        return `w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:shadow-lg transition-all ${
          isDark
            ? 'bg-gray-700 text-white placeholder-gray-400 border border-gray-600'
            : 'bg-gray-100 text-gray-900 placeholder-gray-500 border border-gray-300'
        }`;
      default:
        return baseInputClasses;
    }
  };

  const getContainerClasses = () => {
    switch (variant) {
      case "centered":
        return "relative max-w-4xl px-4";
      case "admin":
        // allow the admin search to expand on larger screens
        return "relative w-full max-w-md md:max-w-lg lg:max-w-2xl transition-all";
      default:
        return "relative max-w-2xl";
    }
  };

  return (
    <div className={`${getContainerClasses()} ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Right submit button (optional) */}
        {showSubmitButton && (
          <button
            type="button"
            aria-label="Search"
            onClick={handleSubmitClick}
            className={`absolute top-1/2 -translate-y-1/2 transition-colors ${
              variant === "centered" ? "right-4" : "right-4"
            } ${
              isDark
                ? 'text-gray-400 hover:text-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;