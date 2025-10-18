import React from 'react';

const SearchBar = ({
  placeholder = "Search...",
  value,
  onChange,
  onSubmit,
  showSubmitButton = false,
  variant = "default", // "default", "centered", "admin"
  className = ""
}) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (onSubmit) {
        onSubmit(value);
      }
    }
  };

  const handleSubmitClick = () => {
    if (onSubmit) {
      onSubmit(value);
    }
  };

  const baseInputClasses = "w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  const getInputClasses = () => {
    switch (variant) {
      case "centered":
        return `${baseInputClasses} px-16 text-lg font-medium`;
      case "admin":
        return "px-4 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500";
      default:
        return baseInputClasses;
    }
  };

  const getContainerClasses = () => {
    switch (variant) {
      case "centered":
        return "relative max-w-4xl px-4";
      case "admin":
        return "";
      default:
        return "relative max-w-2xl";
    }
  };

  return (
    <div className={`${getContainerClasses()} ${className}`}>
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className={getInputClasses()}
        />

        {/* Right submit button (optional) */}
        {showSubmitButton && onSubmit && (
          <button
            type="button"
            aria-label="Search"
            onClick={handleSubmitClick}
            className={`absolute top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 ${variant === "centered" ? "right-4" : "right-4"}`}
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