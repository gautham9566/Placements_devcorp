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
  const [theme, setTheme] = useState('system');
  const [resolvedTheme, setResolvedTheme] = useState('light');

  // Load theme from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('userTheme') || 'system';
      setTheme(savedTheme);
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
    }
  };

  const value = {
    theme,
    resolvedTheme,
    changeTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
