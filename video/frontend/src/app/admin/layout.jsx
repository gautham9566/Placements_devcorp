"use client";

import React, { useState } from 'react';

/**
 * Layout for Admin Portal
 * Provides searchTerm state for filtering functionality
 */
export default function AdminLayout({ children }) {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {React.cloneElement(children, { searchTerm, setSearchTerm })}
    </div>
  );
}