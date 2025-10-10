import axios from 'axios';
import { getAuthToken } from './auth';
import { getApiBaseUrl } from '../utils/apiConfig';

// Set the base URL for all API requests
const API_BASE_URL = getApiBaseUrl();

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
      // Token expired or invalid
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const studentMetricsAPI = {
  // Get enhanced student metrics (comprehensive overview)
  getEnhancedStudentMetrics: async (type = 'enhanced_student_stats', refresh = false) => {
    const params = { type };
    if (refresh) params.refresh = 'true';
    
    const response = await api.get('/api/v1/metrics/students/enhanced/', { params });
    return response.data;
  },

  // Get department-wise student statistics
  getDepartmentStats: async (department = null, refresh = false) => {
    const params = {};
    if (department) params.department = department;
    if (refresh) params.refresh = 'true';
    
    const response = await api.get('/api/v1/metrics/students/departments/', { params });
    return response.data;
  },

  // Get year-wise student statistics
  getYearStats: async (year = null, refresh = false) => {
    const params = {};
    if (year) params.year = year;
    if (refresh) params.refresh = 'true';
    
    const response = await api.get('/api/v1/metrics/students/years/', { params });
    return response.data;
  },

  // Get student performance analytics
  getPerformanceAnalytics: async () => {
    const response = await api.get('/api/v1/metrics/students/performance/');
    return response.data;
  },

  // Get specific metric types
  getStudentMetricsByType: async (type, refresh = false) => {
    const validTypes = [
      'enhanced_student_stats',
      'student_department_breakdown',
      'student_year_analysis'
    ];
    
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid metric type. Valid types: ${validTypes.join(', ')}`);
    }
    
    const params = { type };
    if (refresh) params.refresh = 'true';
    
    const response = await api.get('/api/v1/metrics/students/enhanced/', { params });
    return response.data;
  },

  // Get basic student metrics (backward compatibility)
  getBasicStudentMetrics: async (refresh = false) => {
    const params = { type: 'student_stats' };
    if (refresh) params.refresh = 'true';
    
    const response = await api.get('/api/v1/metrics/', { params });
    return response.data;
  },

  // Get dashboard student statistics
  getDashboardStudentStats: async (refresh = false) => {
    const params = { type: 'dashboard_stats' };
    if (refresh) params.refresh = 'true';
    
    const response = await api.get('/api/v1/metrics/', { params });
    return response.data;
  },

  // Get all student analytics data in one call (for dashboard)
  getAllStudentAnalytics: async (refresh = false) => {
    try {
      const [enhancedStats, departmentStats, yearStats, performanceStats] = await Promise.all([
        studentMetricsAPI.getEnhancedStudentMetrics('enhanced_student_stats', refresh),
        studentMetricsAPI.getDepartmentStats(null, refresh),
        studentMetricsAPI.getYearStats(null, refresh),
        studentMetricsAPI.getPerformanceAnalytics()
      ]);

      return {
        enhanced: enhancedStats,
        departments: departmentStats,
        years: yearStats,
        performance: performanceStats,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching all student analytics:', error);
      throw error;
    }
  },

  // Refresh all student metrics cache
  refreshAllMetrics: async () => {
    try {
      const refreshPromises = [
        studentMetricsAPI.getEnhancedStudentMetrics('enhanced_student_stats', true),
        studentMetricsAPI.getDepartmentStats(null, true),
        studentMetricsAPI.getYearStats(null, true),
        studentMetricsAPI.getBasicStudentMetrics(true)
      ];

      await Promise.all(refreshPromises);
      return { success: true, message: 'All student metrics refreshed successfully' };
    } catch (error) {
      console.error('Error refreshing student metrics:', error);
      throw error;
    }
  }
};

// Utility functions for data processing
export const studentMetricsUtils = {
  // Calculate percentage
  calculatePercentage: (part, total) => {
    if (total === 0) return 0;
    return Math.round((part / total) * 100 * 100) / 100; // Round to 2 decimal places
  },

  // Format GPA
  formatGPA: (gpa) => {
    if (!gpa) return '0.00';
    return parseFloat(gpa).toFixed(2);
  },

  // Get performance category color
  getPerformanceCategoryColor: (category) => {
    const colors = {
      'high_performers': '#10B981', // Green
      'good_performers': '#3B82F6', // Blue
      'average_performers': '#F59E0B', // Yellow
      'poor_performers': '#EF4444', // Red
    };
    return colors[category] || '#6B7280'; // Gray as default
  },

  // Get department color (for charts)
  getDepartmentColor: (index) => {
    const colors = [
      '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];
    return colors[index % colors.length];
  },

  // Sort departments by student count
  sortDepartmentsByCount: (departments) => {
    return [...departments].sort((a, b) => b.total_students - a.total_students);
  },

  // Sort years chronologically
  sortYearsChronologically: (years) => {
    return [...years].sort((a, b) => (a.passout_year || 0) - (b.passout_year || 0));
  },

  // Filter current year students
  filterCurrentYearStudents: (data, currentYear) => {
    if (!data.years) return [];
    return data.years.filter(year => year.passout_year === currentYear);
  },

  // Get top performing departments
  getTopPerformingDepartments: (departments, limit = 5) => {
    return [...departments]
      .sort((a, b) => (b.avg_gpa || 0) - (a.avg_gpa || 0))
      .slice(0, limit);
  },

  // Calculate trends
  calculateYearOverYearGrowth: (yearData) => {
    const sortedYears = studentMetricsUtils.sortYearsChronologically(yearData);
    const trends = [];
    
    for (let i = 1; i < sortedYears.length; i++) {
      const current = sortedYears[i];
      const previous = sortedYears[i - 1];
      
      const growth = previous.total_students > 0 
        ? ((current.total_students - previous.total_students) / previous.total_students) * 100
        : 0;
      
      trends.push({
        year: current.passout_year,
        growth_percentage: Math.round(growth * 100) / 100,
        current_count: current.total_students,
        previous_count: previous.total_students
      });
    }
    
    return trends;
  }
};

export default studentMetricsAPI;
