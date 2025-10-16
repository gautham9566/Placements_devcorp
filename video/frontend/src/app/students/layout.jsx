"use client";

import React from 'react';
import StudentSidebar from '@/components/students/StudentSidebar';

/**
 * Layout for Student Portal
 * Includes sidebar navigation
 */
export default function StudentsLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StudentSidebar />
      <div className="ml-20 transition-all duration-300">
        {children}
      </div>
    </div>
  );
}

