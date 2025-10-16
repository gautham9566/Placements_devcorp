"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Start with null so we can detect when we've resolved the initial preference
  const [isDark, setIsDark] = useState(null);

  useEffect(() => {
    // Run only in the browser
    try {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setIsDark(savedTheme === 'dark');
        return;
      }

      // Fallback to OS preference when no saved theme
      if (typeof window !== 'undefined' && window.matchMedia) {
        setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
      } else {
        setIsDark(true);
      }
    } catch (e) {
      // If anything fails, default to dark
      setIsDark(true);
    }
  }, []);

  useEffect(() => {
    // Don't run until initial preference is resolved
    if (isDark === null) return;

    try {
      const root = document.documentElement;
      if (isDark) {
        root.classList.remove('light');
        root.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        localStorage.setItem('theme', 'light');
      }
    } catch (e) {
      // ignore DOM/localStorage errors in restricted environments
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDark: !!isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
