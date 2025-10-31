/**
 * Optimized API service for server-side pagination and filtering
 * Replaces inefficient client-side data loading patterns
 */

import client from './client';

/**
 * Generic function for paginated API calls
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise} API response
 */
export async function fetchPaginatedData(endpoint, params = {}) {
  try {
    const queryParams = new URLSearchParams();
    
    // Add pagination parameters - backend expects 'per_page' not 'page_size'
    if (params.page) queryParams.append('page', params.page);
    if (params.page_size) queryParams.append('per_page', params.page_size);
    
    // Add filter parameters
    Object.keys(params).forEach(key => {
      if (key !== 'page' && key !== 'page_size' && params[key]) {
        queryParams.append(key, params[key]);
      }
    });
    
    const url = `${endpoint}?${queryParams.toString()}`;
    const response = await client.get(url);
    
    // Handle different response formats from different endpoints
    let data, pagination, metadata;
    
    if (response.data.data && response.data.pagination) {
      // Format 1: {data: [...], pagination: {...}}
      data = response.data.data;
      pagination = {
        current_page: response.data.pagination.current_page,
        total_pages: response.data.pagination.total_pages,
        total_count: response.data.pagination.total_count,
        per_page: response.data.pagination.per_page,
        has_next: response.data.pagination.has_next,
        has_previous: response.data.pagination.has_previous
      };
      metadata = response.data.metadata || {};
    } else if (response.data.results !== undefined) {
      // Format 2: DRF pagination {count, next, previous, results} or {pagination: {}, results: []}
      data = response.data.results;
      
      if (response.data.pagination) {
        // Custom pagination object
        pagination = {
          current_page: response.data.pagination.page || params.page || 1,
          total_pages: response.data.pagination.total_pages || 1,
          total_count: response.data.pagination.total_count || 0,
          per_page: response.data.pagination.page_size || params.page_size || 10,
          has_next: response.data.pagination.has_next || false,
          has_previous: response.data.pagination.has_previous || false
        };
      } else {
        // Standard DRF pagination
        const totalCount = response.data.count || 0;
        const perPage = params.page_size || 10;
        const currentPage = params.page || 1;
        const totalPages = Math.ceil(totalCount / perPage);
        
        pagination = {
          current_page: currentPage,
          total_pages: totalPages,
          total_count: totalCount,
          per_page: perPage,
          has_next: response.data.next ? true : false,
          has_previous: response.data.previous ? true : false
        };
      }
      
      metadata = response.data.metadata || {};
    } else {
      // Fallback for other formats
      data = response.data;
      pagination = {
        current_page: params.page || 1,
        total_pages: 1,
        total_count: Array.isArray(data) ? data.length : 0,
        per_page: params.page_size || 10,
        has_next: false,
        has_previous: false
      };
      metadata = {};
    }
    
    return {
      success: true,
      data: data || [],
      pagination,
      metadata
    };
  } catch (error) {
    console.error(`Error fetching paginated data from ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Optimized company API functions
 */
export const companiesAPI = {
  /**
   * Fetch companies with server-side pagination and filtering
   * @param {Object} params - Query parameters
   * @returns {Promise} Companies data with pagination
   */
  async getCompanies(params = {}) {
    try {
      // Try the optimized endpoint first
      return await fetchPaginatedData('/api/v1/companies/optimized/', params);
    } catch (error) {
      console.log('Optimized endpoint failed, trying fallback endpoints...');
      
      // Fallback to regular companies endpoint with manual pagination
      try {
        const { fetchCompanies } = await import('./companies');
        const allCompanies = await fetchCompanies();
        
        // Apply client-side filtering and pagination as fallback
        let filteredCompanies = allCompanies;
        
        // Apply search filter
        if (params.search) {
          const searchTerm = params.search.toLowerCase();
          filteredCompanies = filteredCompanies.filter(company =>
            company.name.toLowerCase().includes(searchTerm) ||
            company.industry.toLowerCase().includes(searchTerm) ||
            company.description.toLowerCase().includes(searchTerm)
          );
        }
        
        // Apply tier filter
        if (params.tier && params.tier !== 'ALL') {
          filteredCompanies = filteredCompanies.filter(company => company.tier === params.tier);
        }
        
        // Apply industry filter
        if (params.industry && params.industry !== 'ALL') {
          filteredCompanies = filteredCompanies.filter(company => company.industry === params.industry);
        }
        
        // Apply sorting
        if (params.ordering) {
          filteredCompanies.sort((a, b) => {
            switch (params.ordering) {
              case 'name':
                return a.name.localeCompare(b.name);
              case '-total_active_jobs':
                return (b.totalActiveJobs || 0) - (a.totalActiveJobs || 0);
              case '-total_applicants':
                return (b.totalApplicants || 0) - (a.totalApplicants || 0);
              case 'tier':
                return a.tier.localeCompare(b.tier);
              default:
                return 0;
            }
          });
        }
        
        // Apply pagination
        const page = params.page || 1;
        const pageSize = params.page_size || 10;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedCompanies = filteredCompanies.slice(startIndex, endIndex);
        
        // Calculate pagination info
        const totalCount = filteredCompanies.length;
        const totalPages = Math.ceil(totalCount / pageSize);
        
        return {
          success: true,
          data: paginatedCompanies,
          pagination: {
            current_page: page,
            total_pages: totalPages,
            total_count: totalCount,
            per_page: pageSize,
            has_next: page < totalPages,
            has_previous: page > 1
          },
          metadata: {}
        };
      } catch (fallbackError) {
        console.error('All company endpoints failed:', fallbackError);
        throw fallbackError;
      }
    }
  },

  /**
   * Get company statistics
   * @param {boolean} forceRefresh - Force refresh cache
   * @returns {Promise} Company statistics
   */
  async getCompanyStats(forceRefresh = false) {
    try {
      // Try the working endpoint from companies.js
      const response = await client.get('/api/v1/companies/stats/');
      return response.data;
    } catch (error) {
      console.error('Error fetching company stats from primary endpoint:', error);
      
      // Try alternative endpoints
      const endpoints = [
        '/api/v1/stats/companies/',
        '/api/v1/jobs/stats/'
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await client.get(endpoint);
          if (response.data) {
            console.log(`Successfully fetched stats from ${endpoint}`);
            return response.data;
          }
        } catch (altError) {
          console.log(`Failed to fetch from ${endpoint}: ${altError.message}`);
        }
      }
      
      // Final fallback - calculate from companies data
      console.log('Falling back to calculated stats from companies data');
      return this.calculateStatsFromCompanies();
    }
  },

  /**
   * Calculate statistics from companies data as fallback
   * @returns {Promise} Calculated statistics
   */
  async calculateStatsFromCompanies() {
    try {
      // Import companies API to avoid circular dependencies
      const { fetchCompanies } = await import('./companies');
      const companies = await fetchCompanies();
      
      // Calculate basic statistics
      const stats = {
        total: companies.length,
        active_jobs: companies.reduce((sum, company) => sum + (company.totalActiveJobs || 0), 0),
        campus_recruiting: companies.filter(c => c.campus_recruiting).length,
        tier1: companies.filter(c => c.tier === 'Tier 1').length,
        tier2: companies.filter(c => c.tier === 'Tier 2').length,
        tier3: companies.filter(c => c.tier === 'Tier 3').length,
      };
      
      return stats;
    } catch (error) {
      console.error('Failed to calculate stats from companies:', error);
      return {
        total: 0,
        active_jobs: 0,
        campus_recruiting: 0,
        tier1: 0,
        tier2: 0,
        tier3: 0
      };
    }
  },

  /**
   * Search companies with optimized backend search
   * @param {string} searchTerm - Search term
   * @param {Object} filters - Additional filters
   * @param {number} page - Page number
   * @param {number} pageSize - Page size
   * @returns {Promise} Search results
   */
  async searchCompanies(searchTerm, filters = {}, page = 1, pageSize = 20) {
    const params = {
      search: searchTerm,
      page,
      page_size: pageSize,
      ...filters
    };
    return this.getCompanies(params);
  }
};

/**
 * Optimized student API functions
 */
export const studentsAPI = {
  /**
   * Fetch students with server-side pagination and filtering
   * @param {Object} params - Query parameters
   * @returns {Promise} Students data with pagination
   */
  async getStudents(params = {}) {
    try {
      // Map frontend parameter names to backend expected names
      const backendParams = { ...params };
      
      // Special case for getting year stats where we need all records
      const isCountRequest = params.count_only === true;
      if (isCountRequest) {
        // When just counting, use a larger page size to get more comprehensive stats
        backendParams.per_page = 1000;
      }
      
      // Ensure proper parameter mapping
      if (params.page_size) {
        backendParams.per_page = params.page_size;
        delete backendParams.page_size;
      }
      
      // Remove our custom param before sending to backend
      if (backendParams.count_only) {
        delete backendParams.count_only;
      }
      
      // Use the optimized endpoint with proper parameter mapping
      const response = await fetchPaginatedData('/api/accounts/students/optimized/', backendParams);
      
      // For count requests, make sure metadata includes year breakdowns
      if (isCountRequest && !response.metadata?.year_counts && response.data) {
        // Calculate year counts from the returned data if the backend didn't provide it
        const yearCounts = {};
        response.data.forEach(student => {
          const year = student.passout_year || student.graduation_year;
          if (year) {
            yearCounts[year] = (yearCounts[year] || 0) + 1;
          }
        });
        
        if (!response.metadata) response.metadata = {};
        response.metadata.year_counts = yearCounts;
      }
      
      // Ensure consistent response format
      return {
        success: true,
        data: response.data || [],
        pagination: {
          current_page: response.pagination?.current_page || params.page || 1,
          total_pages: response.pagination?.total_pages || 1,
          total_count: response.pagination?.total_count || 0,
          per_page: response.pagination?.per_page || params.page_size || 10,
          has_next: response.pagination?.has_next || false,
          has_previous: response.pagination?.has_previous || false
        },
        metadata: response.metadata || {}
      };
    } catch (error) {
      console.error('Error in studentsAPI.getStudents:', error);
      
      // Fallback to regular students endpoint
      try {
        const fallbackResponse = await fetchPaginatedData('/api/accounts/students/', params);
        return fallbackResponse;
      } catch (fallbackError) {
        console.error('Fallback endpoint also failed:', fallbackError);
        throw fallbackError;
      }
    }
  },

  /**
   * Get student statistics
   * @param {boolean} forceRefresh - Force refresh cache
   * @returns {Promise} Student statistics
   */
  async getStudentStats(forceRefresh = false) {
    try {
      // Use existing student endpoints instead of non-existent metrics endpoint
      const response = await client.get('/api/accounts/students/stats/');
      return response.data;
    } catch (error) {
      console.error('Error fetching student stats:', error);
      // Return default stats if endpoint fails
      return {
        total: 0,
        active: 0,
        graduated: 0,
        placed: 0
      };
    }
  },

  /**
   * Get department statistics
   * @param {boolean} forceRefresh - Force refresh cache
   * @returns {Promise} Department statistics
   */
  async getDepartmentStats(forceRefresh = false) {
    try {
      // Use existing department endpoints instead of non-existent metrics endpoint
      const response = await client.get('/api/accounts/departments/stats/');
      return response.data;
    } catch (error) {
      console.error('Error fetching department stats:', error);
      // Return default stats if endpoint fails
      return {
        total: 0,
        departments: []
      };
    }
  },

  /**
   * Search students with optimized backend search
   * @param {string} searchTerm - Search term
   * @param {Object} filters - Additional filters
   * @param {number} page - Page number
   * @param {number} pageSize - Page size
   * @returns {Promise} Search results
   */
  async searchStudents(searchTerm, filters = {}, page = 1, pageSize = 20) {
    const params = {
      search: searchTerm,
      page,
      page_size: pageSize,
      ...filters
    };
    return this.getStudents(params);
  },

  /**
   * Get single student
   * @param {string|number} id - Student ID
   * @returns {Promise} Student data
   */
  async getStudent(id) {
    try {
      const response = await client.get(`/api/accounts/students/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching student:', error);
      throw error;
    }
  },

  /**
   * Update student
   * @param {string|number} id - Student ID
   * @param {Object} data - Student data to update
   * @returns {Promise} Updated student data
   */
  async updateStudent(id, data) {
    try {
      console.log('updateStudent called with:', { id, data });

      // Clean data to ensure proper format
      const cleanedData = { ...data };
      
      // Ensure numeric fields are properly formatted
      ['joining_year', 'passout_year'].forEach(field => {
        if (cleanedData[field] !== null && cleanedData[field] !== undefined) {
          const num = parseInt(cleanedData[field]);
          cleanedData[field] = isNaN(num) ? null : num;
        }
      });

      // Use standardized field names for student data
      const stringFields = [
        'first_name', 'last_name', 'student_id', 'contact_email', 'phone', 'branch', 'gpa',
        'date_of_birth', 'address', 'city', 'district', 'state', 'pincode', 'country',
        'parent_contact', 'education', 'skills',
        'tenth_cgpa', 'tenth_percentage', 'tenth_board', 'tenth_school', 'tenth_year_of_passing', 
        'tenth_location', 'tenth_specialization',
        'twelfth_cgpa', 'twelfth_percentage', 'twelfth_board', 'twelfth_school', 'twelfth_year_of_passing',
        'twelfth_location', 'twelfth_specialization'
      ];

      stringFields.forEach(field => {
        if (cleanedData[field] !== null && cleanedData[field] !== undefined) {
          cleanedData[field] = String(cleanedData[field]).trim();
        }
      });

      // Remove undefined values
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === undefined) {
          delete cleanedData[key];
        }
      });

      console.log('Cleaned data being sent:', cleanedData);

      // Try the ViewSet endpoint first (more RESTful)
      try {
        console.log('Trying ViewSet endpoint:', `/api/accounts/profiles/${id}/`);
        const response = await client.patch(`/api/accounts/profiles/${id}/`, cleanedData);
        console.log('ViewSet endpoint success:', response.data);
        return response.data;
      } catch (error) {
        console.error('ViewSet endpoint failed:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });

        // If ViewSet fails, try the fallback endpoint
        try {
          console.log('Trying fallback endpoint:', `/api/accounts/students/${id}/update/`);
          const response = await client.patch(`/api/accounts/students/${id}/update/`, cleanedData);
          console.log('Fallback endpoint success:', response.data);
          return response.data;
        } catch (updateError) {
          console.error('Failed to update student via both endpoints:', {
            viewSetError: {
              status: error.response?.status,
              data: error.response?.data
            },
            updateViewError: {
              status: updateError.response?.status,
              data: updateError.response?.data
            }
          });

          // Throw the more specific error
          const primaryError = updateError.response?.status === 400 ? updateError : error;
          throw primaryError;
        }
      }
    } catch (error) {
      console.error('Error updating student:', error);
      throw error;
    }
  },

  /**
   * Upload resume for student
   * @param {File} file - Resume file
   * @returns {Promise} Upload response
   */
  async uploadResume(file) {
    try {
      const formData = new FormData();
      formData.append('resume', file);

      const response = await client.patch('/api/auth/profile/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading resume:', error);
      throw error;
    }
  },

  /**
   * Delete resume for student
   * @param {string|number} resumeId - Resume ID
   * @returns {Promise} Delete response
   */
  async deleteResume(resumeId) {
    try {
      const response = await client.delete(`/api/accounts/resumes/${resumeId}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting resume:', error);
      throw error;
    }
  },

  /**
   * Upload certificate for student
   * @param {File} file - Certificate file
   * @param {string} type - Certificate type (tenth/twelfth)
   * @returns {Promise} Upload response
   */
  async uploadCertificate(file, type) {
    try {
      const formData = new FormData();
      formData.append(`${type}_certificate`, file);

      const response = await client.patch('/api/auth/profile/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading certificate:', error);
      throw error;
    }
  },

  /**
   * Upload semester marksheet for student
   * @param {File} file - Marksheet file
   * @param {number} semester - Semester number
   * @returns {Promise} Upload response
   */
  async uploadSemesterMarksheet(file, semester) {
    try {
      const formData = new FormData();
      formData.append('marksheet', file);
      formData.append('semester', semester);

      const response = await client.post('/api/accounts/semester-marksheets/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading semester marksheet:', error);
      throw error;
    }
  },

  /**
   * Get current user profile data
   * @returns {Promise} User profile data
   */
  async getUserData() {
    try {
      const response = await client.get('/api/auth/profile/');
      return response.data;
    } catch (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }
  },

  /**
   * Update user profile data
   * @param {Object} data - Profile data to update
   * @returns {Promise} Updated profile data
   */
  async updateUserProfile(data) {
    try {
      const response = await client.patch('/api/auth/profile/', data);
      return response.data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  /**
   * Update user password
   * @param {Object} passwordData - Password update data
   * @returns {Promise} Update response
   */
  async updateUserPassword(passwordData) {
    try {
      // Use the correct endpoint that now exists in backend
      const response = await client.post('/api/auth/change-password/', passwordData);
      return response.data;
    } catch (error) {
      console.error('Password update error:', error);
      throw error;
    }
  }
};

/**
 * Admin API functions
 */
export const adminAPI = {
  /**
   * Update system settings (admin only)
   * @param {Object} settings - System settings to update
   * @returns {Promise} Update response
   */
  async updateSystemSettings(settings) {
    try {
      const response = await client.post('/api/admin/system-settings/', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating system settings:', error);
      throw error;
    }
  },

  /**
   * Get system settings (admin only)
   * @returns {Promise} System settings
   */
  async getSystemSettings() {
    try {
      const response = await client.get('/api/admin/system-settings/');
      return response.data;
    } catch (error) {
      console.error('Error fetching system settings:', error);
      throw error;
    }
  },

  /**
   * Get year management settings (admin only)
   * @returns {Promise} Year management data
   */
  async getYearManagement() {
    try {
      const response = await client.get('/api/admin/year-management/');
      return response.data;
    } catch (error) {
      console.error('Error fetching year management:', error);
      throw error;
    }
  },

  /**
   * Update year management settings (admin only)
   * @param {Object} yearData - Year management data
   * @returns {Promise} Update response
   */
  async updateYearManagement(yearData) {
    try {
      const response = await client.post('/api/admin/year-management/', yearData);
      return response.data;
    } catch (error) {
      console.error('Error updating year management:', error);
      throw error;
    }
  },

  /**
   * Get active branches list (for dropdowns/filtering)
   * This endpoint is NOT cached and always returns current active branches
   * @returns {Promise} Active branches array
   */
  async getActiveBranches() {
    try {
      const response = await client.get('/api/accounts/active-branches/');
      return response.data;
    } catch (error) {
      console.error('Error fetching active branches:', error);
      throw error;
    }
  },

  /**
   * Get active years list (for dropdowns/filtering)
   * This endpoint is NOT cached and always returns current active years
   * @returns {Promise} Active years array
   */
  async getActiveYears() {
    try {
      const response = await client.get('/api/accounts/active-years/');
      return response.data;
    } catch (error) {
      console.error('Error fetching active years:', error);
      throw error;
    }
  }
};

/**
 * Optimized jobs API functions
 */
export const jobsAPI = {
  /**
   * Fetch jobs with server-side pagination and filtering
   * @param {Object} params - Query parameters
   * @returns {Promise} Jobs data with pagination
   */
  async getJobs(params = {}) {
    return fetchPaginatedData('/api/v1/jobs/', params);
  },

  /**
   * Get job statistics
   * @param {boolean} forceRefresh - Force refresh cache
   * @returns {Promise} Job statistics
   */
  async getJobStats(forceRefresh = false) {
    try {
      // Use existing job stats endpoint
      const response = await client.get('/api/v1/jobs/stats/');
      return response.data;
    } catch (error) {
      console.error('Error fetching job stats:', error);
      return {
        total: 0,
        active: 0,
        expired: 0,
        applications: 0
      };
    }
  }
};

/**
 * Dashboard API functions
 */
export const dashboardAPI = {
  /**
   * Get dashboard statistics
   * @param {boolean} forceRefresh - Force refresh cache
   * @returns {Promise} Dashboard statistics
   */
  async getDashboardStats(forceRefresh = false) {
    try {
      // Aggregate stats from individual endpoints
      const [companyStats, jobStats] = await Promise.allSettled([
        companiesAPI.getCompanyStats(),
        jobsAPI.getJobStats()
      ]);
      
      return {
        companies: companyStats.status === 'fulfilled' ? companyStats.value : {},
        jobs: jobStats.status === 'fulfilled' ? jobStats.value : {},
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        companies: {},
        jobs: {},
        timestamp: new Date().toISOString()
      };
    }
  },

  /**
   * Get placement statistics
   * @param {boolean} forceRefresh - Force refresh cache
   * @returns {Promise} Placement statistics
   */
  async getPlacementStats(forceRefresh = false) {
    try {
      // Use existing placement endpoint if available
      const response = await client.get('/api/v1/placements/stats/');
      return response.data;
    } catch (error) {
      console.error('Error fetching placement stats:', error);
      return {
        total_placements: 0,
        placement_rate: 0,
        average_package: 0,
        top_recruiters: []
      };
    }
  }
};

/**
 * Student Metrics API functions
 */
export const studentMetricsAPI = {
  // Get enhanced student metrics
  getEnhancedStudentMetrics: async (type = 'enhanced_student_stats', refresh = false) => {
    try {
      const params = { type };
      if (refresh) params.refresh = 'true';
      
      const response = await client.get('/api/v1/metrics/students/enhanced/', { params });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching enhanced student metrics:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch enhanced student metrics'
      };
    }
  },

  // Get department-wise student statistics
  getDepartmentStats: async (department = null, refresh = false) => {
    try {
      const params = {};
      if (department) params.department = department;
      if (refresh) params.refresh = 'true';
      
      const response = await client.get('/api/v1/metrics/students/departments/', { params });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching department stats:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch department statistics'
      };
    }
  },

  // Get year-wise student statistics
  getYearStats: async (year = null, refresh = false, department = null) => {
    try {
      const params = {};
      if (year) params.year = year;
      if (department) params.department = department;
      if (refresh) params.refresh = 'true';
      
      const response = await client.get('/api/v1/metrics/students/years/', { params });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching year stats:', error);
      
      // Provide fallback data structure to prevent frontend crashes
      const fallbackData = {
        years: [],
        current_year: new Date().getFullYear(),
        department_filter: department || null,
        last_updated: new Date().toISOString(),
        error_fallback: true
      };
      
      // If it's a server error (500), return fallback data instead of error
      if (error.response?.status === 500) {
        console.warn('Server error for year stats, using fallback data');
        return {
          success: true,
          data: fallbackData,
          fallback: true
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch year statistics',
        fallbackData
      };
    }
  },

  // Get student performance analytics
  getPerformanceAnalytics: async () => {
    try {
      const response = await client.get('/api/v1/metrics/students/performance/');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching performance analytics:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch performance analytics'
      };
    }
  },

  // Get all student analytics in one call
  getAllStudentAnalytics: async (refresh = false) => {
    try {
      const [enhancedStats, departmentStats, yearStats, performanceStats] = await Promise.allSettled([
        studentMetricsAPI.getEnhancedStudentMetrics('enhanced_student_stats', refresh),
        studentMetricsAPI.getDepartmentStats(null, refresh),
        studentMetricsAPI.getYearStats(null, refresh),
        studentMetricsAPI.getPerformanceAnalytics()
      ]);

      const results = {
        enhanced: enhancedStats.status === 'fulfilled' ? enhancedStats.value.data : null,
        departments: departmentStats.status === 'fulfilled' ? departmentStats.value.data : null,
        years: yearStats.status === 'fulfilled' ? yearStats.value.data : null,
        performance: performanceStats.status === 'fulfilled' ? performanceStats.value.data : null,
        errors: []
      };

      // Collect any errors and provide fallbacks
      [enhancedStats, departmentStats, yearStats, performanceStats].forEach((result, index) => {
        const names = ['enhanced', 'departments', 'years', 'performance'];
        const name = names[index];
        
        if (result.status === 'rejected') {
          results.errors.push(`${name}: ${result.reason.message || 'Unknown error'}`);
        } else if (result.value?.fallback) {
          // If we got fallback data, note it but still use the data
          results.errors.push(`${name}: Using fallback data due to server error`);
        } else if (result.value && !result.value.success && result.value.fallbackData) {
          // Use fallback data if API failed but provided fallback
          results[name] = result.value.fallbackData;
          results.errors.push(`${name}: ${result.value.error || 'API error'}, using fallback`);
        }
      });

      // Provide default empty structures if data is null
      if (!results.enhanced) {
        results.enhanced = { overview: {}, last_updated: new Date().toISOString() };
      }
      if (!results.departments) {
        results.departments = { departments: [], last_updated: new Date().toISOString() };
      }
      if (!results.years) {
        results.years = { years: [], current_year: new Date().getFullYear(), last_updated: new Date().toISOString() };
      }
      if (!results.performance) {
        results.performance = { performance_categories: {}, last_updated: new Date().toISOString() };
      }

      return {
        success: true,
        data: results,
        last_updated: new Date().toISOString(),
        has_errors: results.errors.length > 0
      };
    } catch (error) {
      console.error('Error fetching all student analytics:', error);
      
      // Provide complete fallback structure
      const fallbackResults = {
        enhanced: { overview: {}, last_updated: new Date().toISOString() },
        departments: { departments: [], last_updated: new Date().toISOString() },
        years: { years: [], current_year: new Date().getFullYear(), last_updated: new Date().toISOString() },
        performance: { performance_categories: {}, last_updated: new Date().toISOString() },
        errors: ['Failed to fetch student analytics data - using fallback']
      };
      
      return {
        success: true, // Return success with fallback data to prevent frontend crashes
        data: fallbackResults,
        last_updated: new Date().toISOString(),
        fallback: true,
        has_errors: true
      };
    }
  },

  // Refresh all student metrics cache
  refreshAllMetrics: async () => {
    try {
      const refreshPromises = [
        studentMetricsAPI.getEnhancedStudentMetrics('enhanced_student_stats', true),
        studentMetricsAPI.getDepartmentStats(null, true),
        studentMetricsAPI.getYearStats(null, true)
      ];

      await Promise.all(refreshPromises);
      return { 
        success: true, 
        message: 'All student metrics refreshed successfully' 
      };
    } catch (error) {
      console.error('Error refreshing student metrics:', error);
      return {
        success: false,
        error: 'Failed to refresh student metrics'
      };
    }
  }
};

/**
 * Utility functions for pagination
 */
export const paginationUtils = {
  /**
   * Calculate pagination info
   * @param {number} currentPage - Current page
   * @param {number} totalPages - Total pages
   * @param {number} totalCount - Total items
   * @param {number} pageSize - Items per page
   * @returns {Object} Pagination info
   */
  calculatePaginationInfo(currentPage, totalPages, totalCount, pageSize) {
    return {
      currentPage,
      totalPages,
      totalCount,
      pageSize,
      startIndex: (currentPage - 1) * pageSize + 1,
      endIndex: Math.min(currentPage * pageSize, totalCount),
      hasNext: currentPage < totalPages,
      hasPrevious: currentPage > 1
    };
  },

  /**
   * Generate page numbers for pagination component
   * @param {number} currentPage - Current page
   * @param {number} totalPages - Total pages
   * @param {number} maxVisible - Maximum visible page numbers
   * @returns {Array} Array of page numbers
   */
  generatePageNumbers(currentPage, totalPages, maxVisible = 5) {
    const pages = [];
    const half = Math.floor(maxVisible / 2);
    
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    // Adjust start if we're near the end
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }
};

/**
 * Cache management utilities
 */
export const cacheUtils = {
  /**
   * Clear all cached data
   */
  clearAllCache() {
    // Clear localStorage cache
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_') || key.includes('_data') || key.includes('_timestamp')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear sessionStorage cache
    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach(key => {
      if (key.startsWith('cache_') || key.includes('_data') || key.includes('_timestamp')) {
        sessionStorage.removeItem(key);
      }
    });
  },

  /**
   * Check if cached data is still valid
   * @param {string} key - Cache key
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {boolean} Whether cache is valid
   */
  isCacheValid(key, maxAge = 5 * 60 * 1000) { // 5 minutes default
    const timestamp = localStorage.getItem(`${key}_timestamp`);
    if (!timestamp) return false;
    
    const age = Date.now() - parseInt(timestamp);
    return age < maxAge;
  }
};
