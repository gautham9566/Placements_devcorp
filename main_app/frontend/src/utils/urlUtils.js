import { useEffect } from 'react';

// URL utility functions for pagination and state management

export const urlUtils = {
  /**
   * Updates browser URL with new parameters while preserving existing ones
   * @param {Object} newParams - Object containing parameters to update
   * @param {boolean} replace - Whether to replace current history entry instead of pushing new one
   */
  updateURL: (newParams = {}, replace = false) => {
    const searchParams = new URLSearchParams(window.location.search);
    
    // Update or add new parameters
    Object.entries(newParams).forEach(([key, value]) => {
      if (value && value !== 'null' && value !== '' && value !== 'ALL') {
        searchParams.set(key, value);
      } else {
        searchParams.delete(key);
      }
    });

    const newURL = `${window.location.pathname}?${searchParams.toString()}`;
    
    if (replace) {
      window.history.replaceState({}, '', newURL);
    } else {
      window.history.pushState({}, '', newURL);
    }
  },

  /**
   * Gets a parameter value from current URL
   * @param {string} param - Parameter name
   * @param {string} defaultValue - Default value if parameter doesn't exist
   * @returns {string} Parameter value
   */
  getURLParam: (param, defaultValue = '') => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get(param) || defaultValue;
  },

  /**
   * Gets all URL parameters as an object
   * @returns {Object} Object containing all URL parameters
   */
  getAllURLParams: () => {
    const searchParams = new URLSearchParams(window.location.search);
    const params = {};
    
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
    
    return params;
  },

  /**
   * Clears all URL parameters
   */
  clearURL: () => {
    window.history.pushState({}, '', window.location.pathname);
  },

  /**
   * Creates a URL with specific parameters (useful for sharing or bookmarking)
   * @param {Object} params - Parameters to include in URL
   * @returns {string} Complete URL with parameters
   */
  createURL: (params = {}) => {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== 'null' && value !== '' && value !== 'ALL') {
        searchParams.set(key, value);
      }
    });

    const paramString = searchParams.toString();
    return `${window.location.pathname}${paramString ? '?' + paramString : ''}`;
  }
};

// Hook for handling browser navigation (back/forward buttons)
export const useBrowserNavigation = (onNavigate) => {
  useEffect(() => {
    const handlePopState = () => {
      if (onNavigate) {
        onNavigate(urlUtils.getAllURLParams());
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onNavigate]);
};

export default urlUtils;
