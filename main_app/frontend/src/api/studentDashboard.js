import axios from 'axios';
import { getAuthToken } from './auth';

// Set the base URL for all API requests
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const studentDashboardAPI = {
  /**
   * Get student's applications with status
   * @returns {Promise} List of student's job applications
   */
  getStudentApplications: async () => {
    try {
      const response = await api.get('/api/v1/jobs/applied/');
      // Handle both paginated and non-paginated responses
      if (response.data.data) {
        return response.data.data; // Paginated response
      }
      return response.data; // Direct array response
    } catch (error) {
      console.error('Error fetching student applications:', error);
      return [];
    }
  },

  /**
   * Get dashboard statistics for the student
   * @returns {Promise} Dashboard stats including application counts, interviews, etc.
   */
  getDashboardStats: async () => {
    try {
      // This endpoint needs to be created in the backend
      const response = await api.get('/api/student/dashboard-stats/');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Return mock data if endpoint doesn't exist yet
      return {
        totalApplications: 0,
        pendingApplications: 0,
        shortlistedApplications: 0,
        rejectedApplications: 0,
        upcomingInterviews: 0,
        completedInterviews: 0
      };
    }
  },

  /**
   * Get recommended jobs based on student profile
   * @param {Object} params - Filter parameters (branch, cgpa, etc.)
   * @returns {Promise} List of recommended jobs
   */
  getRecommendedJobs: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/jobs/recommended/', { params });
      // Handle paginated response format
      if (response.data.data) {
        return response.data.data; // Paginated response
      }
      return response.data; // Direct array response
    } catch (error) {
      console.error('Error fetching recommended jobs:', error);
      return [];
    }
  },

  /**
   * Get upcoming interviews for the student
   * @returns {Promise} List of upcoming interviews
   */
  getUpcomingInterviews: async () => {
    try {
      const response = await api.get('/api/student/interviews/upcoming/');
      return response.data;
    } catch (error) {
      console.error('Error fetching upcoming interviews:', error);
      return [];
    }
  },

  /**
   * Get recent notifications for the student
   * @param {number} limit - Number of notifications to fetch
   * @returns {Promise} List of recent notifications
   */
  getNotifications: async (limit = 10) => {
    try {
      const response = await api.get('/api/student/notifications/', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  /**
   * Mark notification as read
   * @param {number} notificationId - ID of the notification
   * @returns {Promise}
   */
  markNotificationRead: async (notificationId) => {
    try {
      const response = await api.patch(`/api/student/notifications/${notificationId}/read/`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  /**
   * Get job details by ID
   * @param {number} jobId - ID of the job
   * @returns {Promise} Job details
   */
  getJobDetails: async (jobId) => {
    try {
      const response = await api.get(`/api/v1/jobs/${jobId}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching job details:', error);
      throw error;
    }
  },

  /**
   * Apply for a job
   * @param {number} jobId - ID of the job to apply for
   * @param {Object} applicationData - Application data (cover letter, custom responses, etc.)
   * @returns {Promise} Application response
   */
  applyForJob: async (jobId, applicationData) => {
    try {
      const response = await api.post(`/api/v1/jobs/${jobId}/apply/`, applicationData);
      return response.data;
    } catch (error) {
      console.error('Error applying for job:', error);
      throw error;
    }
  },

  /**
   * Withdraw application
   * @param {number} applicationId - ID of the application
   * @returns {Promise}
   */
  withdrawApplication: async (applicationId) => {
    try {
      const response = await api.delete(`/api/v1/jobs/applications/${applicationId}/withdraw/`);
      return response.data;
    } catch (error) {
      console.error('Error withdrawing application:', error);
      throw error;
    }
  },

  /**
   * Get available jobs filtered by student eligibility
   * @param {Object} params - Filter parameters
   * @returns {Promise} List of available jobs
   */
  getAvailableJobs: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/jobs/', { params });
      // Handle paginated response format
      if (response.data.pagination) {
        return {
          results: response.data.data || [],
          count: response.data.pagination.total_count || 0
        };
      }
      return { results: response.data, count: response.data.length || 0 };
    } catch (error) {
      console.error('Error fetching available jobs:', error);
      return { results: [], count: 0 };
    }
  },

  /**
   * Calculate profile completion percentage
   * @param {Object} profile - Student profile data
   * @returns {number} Completion percentage (0-100)
   */
  calculateProfileCompletion: (profile) => {
    const requiredFields = [
      'first_name',
      'last_name',
      'student_id',
      'branch',
      'passout_year',
      'phone',
      'contact_email',
      'gpa',
      'tenth_percentage',
      'twelfth_percentage',
      'resume',
      'address',
      'city',
      'state'
    ];

    const optionalFields = [
      'pincode',
      'country',
      'tenth_certificate',
      'twelfth_certificate',
      'linkedin_profile',
      'github_profile'
    ];

    const completedRequired = requiredFields.filter(field => {
      const value = profile[field];
      return value !== null && value !== undefined && value !== '';
    }).length;

    const completedOptional = optionalFields.filter(field => {
      const value = profile[field];
      return value !== null && value !== undefined && value !== '';
    }).length;

    // Required fields are worth 80%, optional fields worth 20%
    const requiredScore = (completedRequired / requiredFields.length) * 80;
    const optionalScore = (completedOptional / optionalFields.length) * 20;

    return Math.round(requiredScore + optionalScore);
  },

  /**
   * Get missing profile fields
   * @param {Object} profile - Student profile data
   * @returns {Array} List of missing field names with descriptions
   */
  getMissingProfileFields: (profile) => {
    const fieldDescriptions = {
      first_name: 'First Name',
      last_name: 'Last Name',
      student_id: 'Student ID',
      branch: 'Branch/Department',
      passout_year: 'Passout Year',
      phone: 'Phone Number',
      contact_email: 'Contact Email',
      gpa: 'Current CGPA',
      tenth_percentage: '10th Percentage',
      twelfth_percentage: '12th Percentage',
      resume: 'Resume',
      address: 'Address',
      city: 'City',
      state: 'State',
      pincode: 'Pincode',
      country: 'Country'
    };

    const missingFields = [];

    Object.keys(fieldDescriptions).forEach(field => {
      const value = profile[field];
      if (value === null || value === undefined || value === '') {
        missingFields.push({
          field: field,
          label: fieldDescriptions[field]
        });
      }
    });

    return missingFields;
  },

  /**
   * Get application status summary
   * @param {Array} applications - List of applications
   * @returns {Object} Status summary with counts
   */
  getApplicationStatusSummary: (applications) => {
    const summary = {
      total: applications.length,
      applied: 0,
      under_review: 0,
      shortlisted: 0,
      rejected: 0,
      hired: 0
    };

    applications.forEach(app => {
      const status = app.status?.toLowerCase().replace('_', '');
      if (status === 'applied') summary.applied++;
      else if (status === 'underreview') summary.under_review++;
      else if (status === 'shortlisted') summary.shortlisted++;
      else if (status === 'rejected') summary.rejected++;
      else if (status === 'hired') summary.hired++;
    });

    return summary;
  },

  /**
   * Get interview statistics
   * @param {Array} interviews - List of interviews
   * @returns {Object} Interview statistics
   */
  getInterviewStats: (interviews) => {
    const now = new Date();
    
    return {
      total: interviews.length,
      upcoming: interviews.filter(i => new Date(i.scheduled_date) > now).length,
      completed: interviews.filter(i => new Date(i.scheduled_date) <= now && i.status === 'completed').length,
      pending: interviews.filter(i => i.status === 'scheduled' || i.status === 'pending').length,
      thisWeek: interviews.filter(i => {
        const interviewDate = new Date(i.scheduled_date);
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return interviewDate > now && interviewDate <= weekFromNow;
      }).length
    };
  }
};

export default studentDashboardAPI;
