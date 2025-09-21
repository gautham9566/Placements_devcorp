/**
 * Utility functions for authentication
 */

/**
 * Gets the current logged-in user ID
 * @returns {string|null} The user ID or null if not logged in
 */
export function getUserId() {
  try {
    // Check for authentication data in localStorage
    const authToken = localStorage.getItem('access');
    
    if (!authToken) {
      return null;
    }
    
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      return parsedUser.id || parsedUser.user_id || null;
    }
    
    // Alternative: try to get from JWT token if user data is not stored separately
    if (authToken) {
      try {
        // Decode JWT token to get user ID
        // JWT tokens are in format: header.payload.signature
        const payload = authToken.split('.')[1];
        const decodedPayload = JSON.parse(atob(payload));
        return decodedPayload.user_id || decodedPayload.id || decodedPayload.sub || null;
      } catch (e) {
        console.error('Error decoding JWT token:', e);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

/**
 * Checks if the user is logged in
 * @returns {boolean} True if logged in, false otherwise
 */
export function isLoggedIn() {
  const token = localStorage.getItem('access');
  return !!token;
}

/**
 * Gets the authentication token
 * @returns {string|null} The token or null if not logged in
 */
export function getAuthToken() {
  return localStorage.getItem('access');
}

/**
 * Gets the current user data
 * @returns {Object|null} The user data or null if not logged in
 */
export function getUserData() {
  try {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}
