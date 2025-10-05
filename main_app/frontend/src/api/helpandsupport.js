import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

// Create the API client following the original pattern
const helpClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false
});

// Add token to requests if available
helpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for logging
helpClient.interceptors.response.use(
  (response) => {
    console.group('Help & Support API Response');
    console.log('URL:', response.config.url);
    console.log('Method:', response.config.method?.toUpperCase());
    console.log('Status:', response.status);
    console.log('Response Data:', response.data);
    console.groupEnd();
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      console.warn('Authentication failed. You may need to log in again.');
    }
    
    console.error('Help & Support API Error:', error);
    throw error;
  }
);

// Authentication functions
const loginUser = async (username, password) => {
  try {
    // Always perform login, do not reuse stored token/user
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await axios.post(`${API_BASE_URL}/auth/login`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, user } = response.data;

    // Store auth data according to original pattern
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(user));

    return { token: access_token, user };
  } catch (error) {
    console.error('Login failed:', error);
    alert('Login failed: ' + (error.response?.data?.message || 'Invalid credentials'));
    throw error;
  }
};

// Helper function to get credentials (simplified to align with the original pattern)
const getUserCredentials = async () => {
  const token = localStorage.getItem('token');
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  
  if (!token || !user) {
    alert('Please log in to access the help and support system');
    return {};
  }
  
  return { user, token };
};

/**
 * Tickets API functions
 */
export const ticketsAPI = {
  /**
   * Create a new support ticket
   * @param {Object} ticketData - The ticket data
   * @param {string} ticketData.title - Ticket title
   * @param {string} ticketData.description - Ticket description
   * @param {string} ticketData.category - Ticket category
   * @param {string} ticketData.priority - Ticket priority (low, medium, high, urgent)
   * @returns {Promise} - Promise resolving to created ticket
   */
  createTicket: async (ticketData) => {
    try {
      const response = await helpClient.post('/tickets', ticketData);
      return response.data;
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  },
  
  /**
   * Get all tickets with pagination
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.page_size - Items per page
   * @param {string} params.status - Filter by status
   * @param {string} params.user_id - Filter by user ID
   * @returns {Promise} - Promise resolving to tickets list with pagination
   */
  getTickets: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      // Add pagination parameters
      if (params.page) queryParams.append('page', params.page);
      if (params.page_size) queryParams.append('limit', params.page_size);
      if (params.skip) queryParams.append('skip', params.skip);
      
      // Add filtering parameters
      if (params.status && params.status !== 'all') {
        queryParams.append('status', params.status.replace('-', '_'));
      }
      if (params.search) queryParams.append('search', params.search);
      if (params.category) queryParams.append('category', params.category);
      if (params.priority) queryParams.append('priority', params.priority);
      if (params.user_id) queryParams.append('user_id', params.user_id);
      
      const queryString = queryParams.toString();
      const url = `/tickets${queryString ? `?${queryString}` : ''}`;
      
      const response = await helpClient.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching tickets:', error);
      throw error;
    }
  },
  
  /**
   * Get a specific ticket by ID
   * @param {string|number} id - Ticket ID
   * @returns {Promise} - Promise resolving to ticket details
   */
  getTicket: async (id) => {
    try {
      const response = await helpClient.get(`/tickets/${id}`);
      
      // Transform response to match frontend expectations
      const ticket = response.data;
      return {
        ...ticket,
        createdBy: ticket.created_by || ticket.createdBy,
        assignedTo: ticket.assigned_to || ticket.assignedTo,
        createdAt: new Date(ticket.created_at || ticket.createdAt),
        updatedAt: new Date(ticket.updated_at || ticket.updatedAt)
      };
    } catch (error) {
      console.error(`Error fetching ticket ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Update a ticket
   * @param {string|number} id - Ticket ID
   * @param {Object} updateData - Data to update
   * @returns {Promise} - Promise resolving to updated ticket
   */
  updateTicket: async (id, updateData) => {
    try {
      // Convert frontend status format to backend format if needed
      const backendData = { ...updateData };
      if (backendData.status) {
        backendData.status = backendData.status.replace('-', '_');
      }
      
      const response = await helpClient.put(`/tickets/${id}`, backendData);
      return response.data;
    } catch (error) {
      console.error(`Error updating ticket ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Add a comment to a ticket
   * @param {string|number} ticketId - Ticket ID
   * @param {string} content - Comment content
   * @returns {Promise} - Promise resolving to created comment
   */
  addComment: async (ticketId, content) => {
    try {
      const response = await helpClient.post(`/tickets/${ticketId}/comments`, { content });
      return response.data;
    } catch (error) {
      console.error(`Error adding comment to ticket ${ticketId}:`, error);
      throw error;
    }
  },
  
  /**
   * Get comments for a ticket
   * @param {string|number} ticketId - Ticket ID
   * @param {Object} params - Query parameters
   * @returns {Promise} - Promise resolving to comments list
   */
  getComments: async (ticketId, params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      // Add pagination parameters
      if (params.page) queryParams.append('page', params.page);
      if (params.page_size) queryParams.append('limit', params.page_size);
      if (params.skip) queryParams.append('skip', params.skip);
      
      const queryString = queryParams.toString();
      const url = `/tickets/${ticketId}/comments${queryString ? `?${queryString}` : ''}`;
      
      const response = await helpClient.get(url);
      return response.data;
    } catch (error) {
      console.error(`Error fetching comments for ticket ${ticketId}:`, error);
      throw error;
    }
  },
  
  /**
   * Add an attachment to a ticket
   * @param {string|number} ticketId - Ticket ID
   * @param {File} file - File to upload
   * @returns {Promise} - Promise resolving to uploaded attachment
   */
  addAttachment: async (ticketId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await helpClient.post(`/tickets/${ticketId}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error adding attachment to ticket ${ticketId}:`, error);
      throw error;
    }
  },
  
  /**
   * Submit feedback for a ticket
   * @param {string|number} ticketId - Ticket ID
   * @param {Object} data - Feedback data
   * @param {number} data.rating - Rating (1-5)
   * @param {string} data.comment - Feedback comment
   * @returns {Promise} - Promise resolving to submitted feedback
   */
  submitFeedback: async (ticketId, data) => {
    try {
      const response = await helpClient.post(`/tickets/${ticketId}/feedback`, data);
      return response.data;
    } catch (error) {
      console.error(`Error submitting feedback for ticket ${ticketId}:`, error);
      throw error;
    }
  },
  
  /**
   * Check if feedback exists for a ticket
   * @param {string|number} ticketId - Ticket ID
   * @returns {Promise} - Promise resolving to feedback if exists
   */
  checkFeedback: async (ticketId) => {
    try {
      const response = await helpClient.get(`/tickets/${ticketId}/feedback`);
      return response.data;
    } catch (error) {
      // 404 typically means no feedback exists
      if (error.response && error.response.status === 404) {
        return null;
      }
      console.error(`Error checking feedback for ticket ${ticketId}:`, error);
      throw error;
    }
  },
  
  /**
   * Get all feedback
   * @returns {Promise} - Promise resolving to all feedback
   */
  getAllFeedback: async () => {
    try {
      const response = await helpClient.get('/feedback');
      return response.data;
    } catch (error) {
      console.error('Error fetching all feedback:', error);
      throw error;
    }
  },
};

/**
 * Feedback API functions
 */
export const feedbackAPI = {
  /**
   * Get feedback statistics
   * @returns {Promise} - Promise resolving to feedback statistics
   */
  getStats: async () => {
    try {
      const response = await helpClient.get('/feedback/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching feedback stats:', error);
      throw error;
    }
  },
};

// Export auth functions consistent with original implementation
export const helpAuthAPI = {
  // Default credentials for easy access
  defaultCredentials: {
    email: 'admin1@admin.com',
    password: 'admin123'
  },
  
  // Login with provided credentials or use defaults
  login: async (email = null, password = null) => {
    // Always login with provided credentials or defaults
    const loginEmail = email || helpAuthAPI.defaultCredentials.email;
    const loginPassword = password || helpAuthAPI.defaultCredentials.password;

    console.log(`Attempting login with: ${loginEmail}`);
    // Always call loginUser, do not check for existing token
    return loginUser(loginEmail, loginPassword);
  },
  
  // Auto login using default credentials
  autoLogin: async () => {
    try {
      console.log('Auto-logging in with default credentials...');
      const result = await helpAuthAPI.login();
      console.log('Auto-login successful');
      return result;
    } catch (error) {
      console.error('Auto-login failed:', error);
      throw error;
    }
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  getProfile: async () => {
    const response = await helpClient.get('/auth/me');
    return response.data;
  },
  
  // Check if we're logged in and login automatically if not
  ensureLoggedIn: async () => {
    // Always perform login, do not check for existing token
    return helpAuthAPI.autoLogin();
  }
};

// Attempt auto-login when the module is imported
helpAuthAPI.ensureLoggedIn().catch(err => console.warn('Initial auto-login failed, will retry when API is used'));

// Export default combined API
export default {
  tickets: ticketsAPI,
  feedback: feedbackAPI,
  auth: helpAuthAPI
};
  