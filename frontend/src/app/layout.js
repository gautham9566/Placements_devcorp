'use client';

import './globals.css';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '../components/ui/Sidebar';
import DropdownMenu from '../components/ui/DropdownMenu';
import { navigationLinks } from '../utils/navigation';
import { ThemeProvider } from '../contexts/ThemeContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import ThemeToggle from '../components/ui/ThemeToggle';

// Define page titles for different routes
const getPageTitle = (pathname) => {
  const titleMap = {
    '/': 'My Campus',
    '/myjobs': 'My Jobs',
    '/explore': 'Explore',
    '/inbox': 'Inbox',
    '/jobpostings': 'Job Postings',
    '/companies': 'Companies',
    '/events': 'Events',
    '/calendar': 'Calendar',
    '/admin': 'Admin Dashboard',
    '/admin/posts': 'Admin Posts'
  };
  
  // Handle dynamic routes like /company/[id]
  if (pathname.startsWith('/company/')) {
    return 'Company Profile';
  }
  
  if (pathname.startsWith('/admin/')) {
    return 'Admin Dashboard';
  }
  
  return titleMap[pathname] || 'PlaceEasy';
};

// Check if current route should use admin layout
const isAdminRoute = (pathname) => {
  return pathname.startsWith('/admin');
};

// Check if current route should hide the sidebar (like login, signup, etc.)
const shouldHideSidebar = (pathname) => {
  const hiddenRoutes = ['/login', '/signup', '/onboarding'];
  return hiddenRoutes.includes(pathname);
};

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const [college, setCollege] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const storedCollege = localStorage.getItem('collegeName');
    if (storedCollege) {
      setCollege(storedCollege);
    }
  }, []);

  // Don't render the layout structure until client-side hydration
  if (!isClient) {
    return (
      <html lang="en">
        <head>
          <title>PlaceEasy - Campus Placement Platform</title>
          <meta name="description" content="Your comprehensive campus placement and career management platform" />
        </head>
        <body className="h-screen overflow-hidden">
          <ThemeProvider>
            <NotificationProvider>
              <main className="h-full bg-white text-black">
                {children}
              </main>
            </NotificationProvider>
          </ThemeProvider>
        </body>
      </html>
    );
  }

  const pageTitle = getPageTitle(pathname);
  const hideLayout = shouldHideSidebar(pathname);
  const isAdmin = isAdminRoute(pathname);

  // If it's a route that should hide the sidebar (like login), just render the children
  if (hideLayout) {
    return (
      <html lang="en">
        <head>
          <title>PlaceEasy - Campus Placement Platform</title>
          <meta name="description" content="Your comprehensive campus placement and career management platform" />
        </head>
        <body className="h-screen overflow-hidden">
          <ThemeProvider>
            <NotificationProvider>
              <main className="h-full bg-white text-black">
                {children}
              </main>
            </NotificationProvider>
          </ThemeProvider>
        </body>
      </html>
    );
  }

  // Admin routes use their own layout completely
  if (isAdmin) {
    return (
      <html lang="en">
        <head>
          <title>PlaceEasy - Campus Placement Platform</title>
          <meta name="description" content="Your comprehensive campus placement and career management platform" />
        </head>
        <body className="h-screen overflow-hidden">
          <ThemeProvider>
            <NotificationProvider>
              <div className="h-screen bg-gray-50">
                {/* Fixed Header for Admin */}
                <div className="fixed w-full flex justify-between items-center py-4 bg-white shadow-sm z-10">
                  <span className="text-gray-700 font-medium text-xl ml-28">
                    {pageTitle}
                  </span>
                  <div className="flex items-center gap-4 mr-6">
                    <ThemeToggle />
                    <DropdownMenu />
                  </div>
                </div>

                {/* Admin Content - Takes full remaining height */}
                <div className="pt-16 h-[calc(100vh-4rem)]">
                  {children}
                </div>
              </div>
            </NotificationProvider>
          </ThemeProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <head>
        <title>PlaceEasy - Campus Placement Platform</title>
        <meta name="description" content="Your comprehensive campus placement and career management platform" />
      </head>
      <body className="h-screen overflow-hidden">
        <ThemeProvider>
          <NotificationProvider>
            <div className="h-screen bg-gray-50">
              {/* Fixed Header */}
              <div className="fixed w-full flex justify-between items-center py-4 bg-white shadow-sm z-10">
                <span className="text-gray-700 font-medium text-xl ml-16 sm:ml-28">
                  {college || 'AVV Chennai'}
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
              <div className="flex pt-16 h-[calc(100vh-4rem)]">
                {/* Content Area */}
                <div className="flex-1 p-6 ml-0 md:ml-20 h-full overflow-auto">
                  <div className="bg-white rounded-xl shadow-md p-6 min-h-[800px] text-black content-card">
                    {children}
                  </div>
                </div>
              </div>
            </div>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
