'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');
  const [resolvedTheme, setResolvedTheme] = useState('dark');
  const [isInitialized, setIsInitialized] = useState(false);

  // Load theme from sessionStorage (for iframe) or localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Priority: sessionStorage (from iframe params) > localStorage > default
      const sessionTheme = sessionStorage.getItem('lms_theme');
      const savedTheme = localStorage.getItem('userTheme');
      const initialTheme = sessionTheme || savedTheme || 'dark';
      
      setTheme(initialTheme);
      setIsInitialized(true);
    }
  }, []);

  // Apply theme to document and resolve system theme
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const applyTheme = (themeToApply) => {
        const root = document.documentElement;
        const body = document.body;
        
        // Remove existing theme classes
        body.classList.remove('dark-mode', 'light-mode');
        root.removeAttribute('data-theme');
        
        let actualTheme = themeToApply;
        
        // Handle system theme
        if (themeToApply === 'system') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          actualTheme = prefersDark ? 'dark' : 'light';
        }
        
        // Apply theme
        if (actualTheme === 'dark') {
          body.classList.add('dark-mode');
          root.setAttribute('data-theme', 'dark');
        } else {
          body.classList.add('light-mode');
          root.setAttribute('data-theme', 'light');
        }
        
        setResolvedTheme(actualTheme);
      };

      applyTheme(theme);

      // Listen for system theme changes when using system theme
      if (theme === 'system') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
          applyTheme('system');
        };
        
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      }
    }
  }, [theme]);

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('userTheme', newTheme);
      // Also update sessionStorage to persist across iframe navigation
      sessionStorage.setItem('lms_theme', newTheme);
    }
  };

  const value = {
    theme,
    resolvedTheme,
    changeTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    isInitialized,
    // Legacy support for components using toggleTheme
    toggleTheme: () => {
      const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
      changeTheme(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
