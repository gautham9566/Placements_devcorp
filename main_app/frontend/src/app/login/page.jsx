'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { setAuthToken,setRefreshToken } from '../../api/auth';
import { useNotification } from '../../contexts/NotificationContext';

export default function LoginPage() {
  const router = useRouter();
  const { showAuthError, showValidationError, showNetworkError, handleApiError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [college, setCollege] = useState('');
  const [dropdown, setDropdown] = useState(false);
  const [filtered, setFiltered] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleLogin(email, password);
  };

  const handleLogin = async (email, password) => {
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('http://127.0.0.1:8000/api/auth/login/', {
        email,
        password,
      });
      
      setAuthToken(res.data.access);
      setRefreshToken(res.data.refresh);

      const { access, refresh, user } = res.data;

      // Store tokens with both naming conventions
      localStorage.setItem('access', access);
      localStorage.setItem('refresh', refresh);
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(user));
      
      document.cookie = `role=${user.user_type}; path=/; max-age=86400`;

      // Handle different user types
      switch (user.user_type?.toLowerCase()) {
        case 'student':
          router.push('/');
          break;
        case 'admin':
          router.push('/admin/dashboard');
          break;
        case 'employer':
          router.push('/company/dashboard');
          break;
        default:
          router.push('/');
      }
    } catch (err) {
      console.error('Login error:', err);
      
      // Handle freeze status specifically
      if (err.response?.status === 403 && err.response?.data?.freeze_status === 'complete') {
        showAuthError(err.response.data.detail);
        setError(err.response.data.detail);
      } else if (err.response?.status === 401) {
        showValidationError('Login Failed', {
          credentials: 'Invalid email or password. Please check your credentials and try again.'
        });
      } else if (!err.response) {
        showNetworkError(err);
      } else {
        handleApiError(err, 'login');
      }
      
      // Keep the local error state for backward compatibility
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          'Login failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-[#242734] to-[#241F2A] flex items-center justify-center p-4 login-container">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-xl shadow-2xl p-10 flex flex-col gap-6 login-form"
      >
        <h1 className="text-center text-2xl text-gray-800 font-bold mb-2">
          Login to DevCorp
        </h1>

        {/* Add error display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex flex-col">
          <label className="mb-2 font-semibold text-gray-800">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-3 rounded-lg border border-gray-300 text-gray-800 text-base outline-none"
            required
            disabled={loading}
          />
        </div>
        <div className="flex flex-col">
          <label className="mb-2 font-semibold text-gray-800">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-3 rounded-lg border border-gray-300 text-gray-800 text-base outline-none"
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`p-3 rounded-lg cursor-pointer text-white text-base font-medium transition-colors ${
            loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-indigo-500 hover:bg-indigo-600'
          }`}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <button
          onClick={() => handleLogin('admin@admin.com', 'admin')}
          disabled={loading}
          type="button"
          className={`p-3 rounded-lg cursor-pointer text-white text-base font-medium transition-colors ${
            loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {loading ? 'Logging in...' : 'Quick Login as Admin'}
        </button>

        <button
          onClick={() => handleLogin('student19@example.com', 'student123')}
          disabled={loading}
          type="button"
          className={`p-3 rounded-lg cursor-pointer text-white text-base font-medium transition-colors ${
            loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {loading ? 'Logging in...' : 'Quick Login as Student'}
        </button>
        
        <Link href='/signup'>
          <div className='p-3 rounded-lg cursor-pointer text-center bg-indigo-500 text-white text-base font-medium hover:bg-indigo-600 transition-colors'>
            Signup 
          </div>
        </Link>
      </form>
    </div>
  );
}
