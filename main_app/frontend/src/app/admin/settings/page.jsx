'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as auth from '../../../api/auth';
import { studentsAPI } from '../../../api/optimized';

// Import the main Settings component
import Settings from '../../settings/page';

const AdminSettings = () => {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminAuth = async () => {
      const token = auth.getAuthToken();
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const userData = await studentsAPI.getUserData();
        const isUserAdmin = userData.user_type === 'ADMIN' || userData.role === 'admin' || userData.user?.role === 'admin';
        
        if (!isUserAdmin) {
          // Regular user trying to access admin settings - redirect to regular settings
          router.replace('/settings');
          return;
        }
        
        // Set admin role cookie for middleware
        if (typeof document !== 'undefined') {
          document.cookie = `role=ADMIN; path=/; max-age=86400`;
        }
        
        setIsAdmin(true);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        router.push('/login');
      }
    };

    checkAdminAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

  // Render the main Settings component for admin users
  return <Settings />;
};

export default AdminSettings;
