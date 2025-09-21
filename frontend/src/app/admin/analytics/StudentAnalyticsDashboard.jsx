'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  TrendingUp, 
  Award, 
  BookOpen,
  Calendar,
  BarChart3,
  PieChart,
  RefreshCw
} from 'lucide-react';
import { studentMetricsAPI } from '../../../api/optimized';

// Utility functions for data processing
const studentMetricsUtils = {
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

  // Sort departments by student count
  sortDepartmentsByCount: (departments) => {
    return [...departments].sort((a, b) => b.total_students - a.total_students);
  },

  // Sort years chronologically
  sortYearsChronologically: (years) => {
    return [...years].sort((a, b) => (a.passout_year || 0) - (b.passout_year || 0));
  }
};

const StudentAnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({
    enhanced: null,
    departments: null,
    years: null,
    performance: null
  });

  // Fetch all student analytics data
  const fetchAnalytics = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await studentMetricsAPI.getAllStudentAnalytics(forceRefresh);
      
      if (result.success) {
        setData(result.data);
        if (result.data.errors && result.data.errors.length > 0) {
          console.warn('Some metrics failed to load:', result.data.errors);
        }
      } else {
        setError(result.error || 'Failed to load student analytics');
      }
    } catch (err) {
      console.error('Error fetching student analytics:', err);
      setError('Failed to load student analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Refresh all metrics
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await studentMetricsAPI.refreshAllMetrics();
      if (result.success) {
        await fetchAnalytics(true);
      } else {
        setError(result.error || 'Failed to refresh metrics');
      }
    } catch (err) {
      console.error('Error refreshing metrics:', err);
      setError('Failed to refresh metrics. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading student analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={() => fetchAnalytics()} 
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { enhanced, departments, years, performance } = data;
  const overview = enhanced?.overview || {};
  const departmentData = departments?.departments || [];
  const yearData = years?.years || [];

  // Calculate summary cards data
  const summaryCards = [
    {
      title: 'Total Students',
      value: overview.total_students?.toLocaleString() || '0',
      icon: <Users className="w-6 h-6" />,
      color: 'bg-blue-500',
      description: 'Registered students',
      trend: overview.high_performer_percentage > 20 ? 'up' : 'down'
    },
    {
      title: 'Departments',
      value: overview.active_departments || '0',
      icon: <BookOpen className="w-6 h-6" />,
      color: 'bg-green-500',
      description: 'Active departments',
      trend: 'up'
    },
    {
      title: 'High Performers',
      value: overview.high_performers?.toLocaleString() || '0',
      icon: <Award className="w-6 h-6" />,
      color: 'bg-purple-500',
      description: `${overview.high_performer_percentage?.toFixed(1) || 0}% of students`,
      trend: overview.high_performer_percentage > 25 ? 'up' : 'down'
    },
    {
      title: 'Placement Ready',
      value: overview.placement_ready?.toLocaleString() || '0',
      icon: <GraduationCap className="w-6 h-6" />,
      color: 'bg-orange-500',
      description: 'Current year eligible',
      trend: 'up'
    }
  ];

  // Get top 5 departments by student count
  const topDepartments = studentMetricsUtils.sortDepartmentsByCount(departmentData).slice(0, 5);

  // Get recent years data (last 5 years)
  const recentYears = studentMetricsUtils.sortYearsChronologically(yearData).slice(-5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Analytics</h1>
          <p className="text-gray-600">Comprehensive overview of student data and performance</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-500 mt-1">{card.description}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg text-white`}>
                {card.icon}
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {card.trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <TrendingUp className="w-4 h-4 text-red-500 mr-1 transform rotate-180" />
              )}
              <span className={`text-sm ${card.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                Performance indicator
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Department and Year Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Departments */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Departments</h2>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {topDepartments.map((dept, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {dept.branch || 'Unknown Department'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {dept.total_students} students
                    </span>
                  </div>
                  <div className="mt-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ 
                        width: `${(dept.total_students / (topDepartments[0]?.total_students || 1)) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-gray-500">
                    <span>Avg GPA: {studentMetricsUtils.formatGPA(dept.avg_gpa)}</span>
                    <span>High Performers: {dept.high_performers || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Year-wise Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Year-wise Distribution</h2>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentYears.map((year, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {year.passout_year || 'Unknown Year'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {year.total_students} students
                    </span>
                  </div>
                  <div className="mt-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ 
                        width: `${(year.total_students / (recentYears[0]?.total_students || 1)) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-gray-500">
                    <span>Avg GPA: {studentMetricsUtils.formatGPA(year.avg_gpa)}</span>
                    <span>Placement Rate: {year.placement_rate?.toFixed(1) || 0}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Overview */}
      {performance && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Performance Analytics</h2>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.entries(performance.performance_categories || {}).map(([category, count], index) => (
              <div key={category} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-600 capitalize">
                  {category.replace('_', ' ')}
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded">
                  <div 
                    className="h-2 rounded"
                    style={{ 
                      width: `${(count / (performance.overall_performance?.total_students || 1)) * 100}%`,
                      backgroundColor: studentMetricsUtils.getPerformanceCategoryColor(category)
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {enhanced?.last_updated ? new Date(enhanced.last_updated).toLocaleString() : 'Unknown'}
      </div>
    </div>
  );
};

export default StudentAnalyticsDashboard;
