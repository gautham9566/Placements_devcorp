
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      // Redirect based on user role
      if (user) {
        switch (user.role) {
          case 'admin':
            navigate('/');
            break;
          case 'agent':
            navigate('/tickets');
            break;
          case 'customer':
            navigate('/tickets');
            break;
          default:
            navigate('/');
        }
      } else {
        navigate('/');
      }
    } else {
      navigate('/login');
    }
  }, [isAuthenticated, navigate, user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center fade-in-element">
        <h1 className="text-4xl font-bold mb-4">Support Flow Nexus</h1>
        <p className="text-xl text-gray-600">Redirecting to the appropriate page...</p>
      </div>
    </div>
  );
};

export default Index;
