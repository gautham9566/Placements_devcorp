"use client";

import { useEffect, useState } from 'react';
import { studentsAPI } from '@/api/students';
import { useTheme } from '@/contexts/ThemeContext';

export default function LMSPage() {
  const [iframeUrl, setIframeUrl] = useState('');
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    const fetchUserAndBuildUrl = async () => {
      try {
        // Get user data
        const userData = await studentsAPI.getProfile();
        
        // Build full name from first_name and last_name
        const firstName = userData?.first_name || userData?.user?.first_name || '';
        const lastName = userData?.last_name || userData?.user?.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        
        // Fallback to username, email, or student_id if name is empty
        const username = fullName || 
                        userData?.username || 
                        userData?.student_id || 
                        userData?.email || 
                        userData?.user?.username || 
                        'Student';
        
        // Build URL with query parameters
        const params = new URLSearchParams({
          username: username,
          theme: resolvedTheme || 'dark',
          role: 'student'
        });
        
        setIframeUrl(`http://100.118.93.80:4000/students?${params.toString()}`);
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Fallback URL with default values
        const params = new URLSearchParams({
          username: 'Student',
          theme: resolvedTheme || 'dark',
          role: 'student'
        });
        setIframeUrl(`http://100.118.93.80:4000/students?${params.toString()}`);
      }
    };

    fetchUserAndBuildUrl();
  }, [resolvedTheme]);

  if (!iframeUrl) {
    return (
      <div className="w-full min-h-screen flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading LMS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex-1">
      <iframe
        src={iframeUrl}
        className="w-full min-h-screen border-0"
        title="LMS Student"
      />
    </div>
  );
}
