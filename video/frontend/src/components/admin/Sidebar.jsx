import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../ui/ThemeToggle';

const Sidebar = () => {
  const [courseCount, setCourseCount] = useState(0);
  const { isDark } = useTheme();

  useEffect(() => {
    fetchCourseCount();
  }, []);

  const fetchCourseCount = async () => {
    try {
      const response = await fetch('/api/courses');
      if (response.ok) {
        const courses = await response.json();
        setCourseCount(courses.length);
      }
    } catch (error) {
      console.error('Error fetching course count:', error);
    }
  };

  const menuItems = [
    { 
      name: 'Home', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ), 
      href: '/admin', 
      active: false 
    },
    { 
      name: 'Courses', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ), 
      href: '/admin/courses', 
      active: false,
      badge: courseCount
    },
  ];

  return (
    <div className={`w-64 min-h-screen shadow-inner relative ${
      isDark 
        ? 'bg-gray-900 bg-opacity-60 backdrop-blur-sm border-r border-gray-800/60' 
        : 'bg-white bg-opacity-60 backdrop-blur-sm border-r border-gray-200'
    }`}>
      <div className="p-6">
        {/* Navigation menu */}
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors duration-200 ${
                item.active
                  ? isDark 
                    ? 'bg-transparent text-gray-400' 
                    : 'bg-gray-100 text-gray-700'
                  : isDark
                    ? 'text-gray-500 hover:bg-blue-800 hover:text-gray-300'
                    : 'text-gray-600 hover:bg-blue-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center">
                <span className="mr-3 scale-125">{item.icon}</span>
                <span className="text-xl">{item.name}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>
      
      {/* Theme Toggle at bottom */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
        <ThemeToggle />
      </div>
    </div>
  );
};

export default Sidebar;