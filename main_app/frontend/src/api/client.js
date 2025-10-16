import axios from 'axios';
import { setupErrorInterceptor } from './errorHandler';
import { getApiBaseUrl } from '../utils/apiConfig';

const client = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
client.interceptors.request.use(
  (config) => {
    // Get the token from localStorage
    const token = localStorage.getItem('access_token');
    
    // If token exists, add it to the Authorization header
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401 errors (token expired)
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Get refresh token
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (refreshToken) {
          // Try to get a new token
          const response = await axios.post(`${getApiBaseUrl()}/api/auth/token/refresh/`, {
            refresh: refreshToken
          });
          
          // Store the new tokens
          localStorage.setItem('access_token', response.data.access);
          
          // Update the Authorization header
          originalRequest.headers['Authorization'] = `Bearer ${response.data.access}`;
          
          // Retry the original request
          return client(originalRequest);
        }
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
        
        // If token refresh fails, redirect to login
        if (typeof window !== 'undefined') {
          // Clear tokens
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          
          // Redirect to login page
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default client;
