'use client';

import '../globals.css';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/ui/Sidebar';
import DropdownMenu from '@/components/ui/DropdownMenu';
import { navigationLinks } from '@/utils/navigation';
import ThemeToggle from '@/components/ui/ThemeToggle';

// Define page titles for different routes
const getPageTitle = (pathname) => {
  const titleMap = {
    '/students/': 'My Campus',
    '/students/myjobs': 'My Jobs',
    '/students/jobpostings': 'Job Postings',
    '/students/companies': 'Companies',
    '/students/calendar': 'Calendar',
    '/admin': 'Admin Dashboard',
    '/admin/posts': 'Admin Posts'
  };
  
  // Handle dynamic routes like /company/[id]
  if (pathname.startsWith('/students/company/')) {
    return 'Company Profile';
  }
  
  if (pathname.startsWith('/admin/')) {
    return 'Admin Dashboard';
  }
  
  return titleMap[pathname] || 'DevCorp';
};

// Check if current route should use admin layout
const isAdminRoute = (pathname) => {
  return pathname.startsWith('/admin');
};

// Check if current route should hide the sidebar (like login, signup, etc.)
const shouldHideSidebar = (pathname) => {
  const hiddenRoutes = ['/login', '/signup', '/onboarding'];
  return hiddenRoutes.includes(pathname) || isAdminRoute(pathname);
};

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render the layout structure until client-side hydration
  if (!isClient) {
    return (
      <main className="h-full bg-white text-black">
        {children}
      </main>
    );
  }

  const pageTitle = getPageTitle(pathname);
  const hideLayout = shouldHideSidebar(pathname);

  // If it's a route that should hide the sidebar (like login, admin routes), just render the children
  if (hideLayout) {
    return (
      <main className="h-full bg-white text-black">
        {children}
      </main>
    );
  }

  return (
    <div className="h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="fixed w-full flex justify-between items-center py-4 bg-white shadow-sm z-10">
        <span className="text-gray-700 font-medium text-xl ml-16 sm:ml-28">
          Student Portal
        </span>
        <div className="flex items-center gap-4 mr-6">
          <ThemeToggle />
          <DropdownMenu />
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar 
        sections={navigationLinks} 
        defaultExpanded={false} 
        navbarHeight="4rem" 
        className="z-20" 
      />

      {/* Main Layout with Sidebar */}
      <div className="flex pt-16 h-[calc(100vh-1rem)]">
        {/* Content Area */}
        <div className="flex-1 p-6 ml-0 md:ml-20 h-full overflow-auto">
          <div className="bg-white rounded-xl shadow-md p-6 min-h-[800px] text-black content-card">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
