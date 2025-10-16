"use client";

import React, { useState } from 'react';
import TopHeader from '@/components/admin/TopHeader';

/**
 * Layout for Admin Portal
 * Includes top header navigation
 */
export default function AdminLayout({ children }) {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopHeader onSearchChange={setSearchTerm} searchTerm={searchTerm} />
      <div className="pt-16">
        {React.cloneElement(children, { searchTerm, setSearchTerm })}
      </div>
    </div>
  );
}