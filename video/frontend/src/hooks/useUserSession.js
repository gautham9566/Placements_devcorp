import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Hook to manage user session from parent iframe
 * Gets username and theme from URL params and stores in sessionStorage
 */
export const useUserSession = () => {
  const [username, setUsername] = useState('guest');
  const [role, setRole] = useState('student');
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Get params from URL
        const usernameParam = searchParams.get('username');
        const roleParam = searchParams.get('role');
        const themeParam = searchParams.get('theme');

        let finalUsername = 'guest';
        let finalRole = 'student';

        if (usernameParam) {
          finalUsername = usernameParam;
          sessionStorage.setItem('lms_username', usernameParam);
        } else {
          // Try to get from sessionStorage
          const storedUsername = sessionStorage.getItem('lms_username');
          if (storedUsername) {
            finalUsername = storedUsername;
          }
        }

        if (roleParam) {
          finalRole = roleParam;
          sessionStorage.setItem('lms_role', roleParam);
        } else {
          // Try to get from sessionStorage
          const storedRole = sessionStorage.getItem('lms_role');
          if (storedRole) {
            finalRole = storedRole;
          }
        }

        if (themeParam) {
          sessionStorage.setItem('lms_theme', themeParam);
        }

        setUsername(finalUsername);
        setRole(finalRole);

        // Optionally send session to backend
        if (finalUsername !== 'guest') {
          try {
            await fetch('/api/user/session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                username: finalUsername,
                theme: themeParam || sessionStorage.getItem('lms_theme') || 'dark',
                role: finalRole
              })
            });
          } catch (error) {
            console.error('Failed to create user session:', error);
          }
        }
      } catch (error) {
        console.error('Error initializing user session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, [searchParams]);

  return {
    username,
    role,
    isLoading,
    isAdmin: role === 'admin',
    isStudent: role === 'student'
  };
};
