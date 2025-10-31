"use client";

import React from 'react';

/**
 * Layout for Student Portal
 * Sidebar removed — pages should render full width now
 */
export default function StudentsLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="transition-all duration-300">
        {children}
      </main>
    </div>
  );
}

