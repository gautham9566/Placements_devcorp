'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BarChart3, 
  List, 
  TrendingUp,
  Award,
  GraduationCap,
  BookOpen,
  RefreshCw,
  Eye,
  Filter
} from 'lucide-react';
import OptimizedStudentManagement from './OptimizedStudentManagement';
import { studentMetricsAPI } from '../api/optimized';

const EnhancedStudentManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [metricsData, setMetricsData] = useState({
    enhanced: null,
    departments: null,
    years: null,
    performance: null
  });

  // Fetch student metrics data
  const fetchMetrics = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await studentMetricsAPI.getAllStudentAnalytics(forceRefresh);
      
      if (result.success) {
        setMetricsData(result.data);
        if (result.data.errors && result.data.errors.length > 0) {
          console.warn('Some metrics failed to load:', result.data.errors);
        }
      } else {
        setError(result.error || 'Failed to load metrics');
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('Failed to load student metrics');
    } finally {
      setLoading(false);
    }
  };

  // Refresh all metrics
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await studentMetricsAPI.refreshAllMetrics();
      await fetchMetrics(true);
    } catch (err) {
      console.error('Error refreshing metrics:', err);
      setError('Failed to refresh metrics');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'analytics') {
      fetchMetrics();
    }
  }, [activeTab]);

  // Calculate overview stats
  const getOverviewStats = () => {
    const enhanced = metricsData?.enhanced?.overview || {};
    const departments = metricsData?.departments?.departments || [];
    const years = metricsData?.years?.years || [];
    
    return {
      totalStudents: enhanced.total_students || 0,
      activeDepartments: enhanced.active_departments || 0,
      highPerformers: enhanced.high_performers || 0,
      placementReady: enhanced.placement_ready || 0,
      averageGPA: departments.length > 0 
        ? (departments.reduce((sum, dept) => sum + (dept.avg_gpa || 0), 0) / departments.length).toFixed(2)
        : '0.00',
      currentYearStudents: enhanced.current_year_students || 0
    };
  };

  const stats = getOverviewStats();

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Eye },
    { id: 'analytics', name: 'Analytics', icon: BarChart3 },
    { id: 'list', name: 'Student List', icon: List },
  ];

  const summaryCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents.toLocaleString(),
      icon: <Users className="w-6 h-6" />,
      color: 'bg-blue-500',
      description: 'All registered students'
    },
    {
      title: 'Departments',
      value: stats.activeDepartments,
      icon: <BookOpen className="w-6 h-6" />,
      color: 'bg-green-500',
      description: 'Active departments'
    },
    {
      title: 'High Performers',
      value: stats.highPerformers.toLocaleString(),
      icon: <Award className="w-6 h-6" />,
      color: 'bg-purple-500',
      description: 'GPA ≥ 8.5'
    },
    {
      title: 'Placement Ready',
      value: stats.placementReady.toLocaleString(),
      icon: <GraduationCap className="w-6 h-6" />,
      color: 'bg-orange-500',
      description: 'Current year eligible'
    }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
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
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Overview */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Departments</h3>
          <div className="space-y-3">
            {(metricsData?.departments?.departments || [])
              .sort((a, b) => b.total_students - a.total_students)
              .slice(0, 5)
              .map((dept, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{dept.branch || 'Unknown'}</span>
                      <span className="text-sm text-gray-600">{dept.total_students} students</span>
                    </div>
                    <div className="mt-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ 
                          width: `${(dept.total_students / Math.max(...(metricsData?.departments?.departments || []).map(d => d.total_students)) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Performance Overview */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Distribution</h3>
          <div className="space-y-3">
            {Object.entries(metricsData?.performance?.performance_categories || {}).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{category.replace('_', ' ')}</span>
                <div className="flex items-center">
                  <span className="text-sm text-gray-600 mr-2">{count}</span>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ 
                        width: `${(count / stats.totalStudents * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => {
    if (!metricsData?.enhanced) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600">Analytics data not available. Please refresh to load data.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Department Analytics */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Analytics</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg GPA</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">High Performers</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placement Rate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(metricsData?.departments?.departments || []).map((dept, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {dept.branch || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dept.total_students}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dept.avg_gpa ? dept.avg_gpa.toFixed(2) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dept.high_performers || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dept.placement_rate ? `${dept.placement_rate.toFixed(1)}%` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Year Analytics */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Year-wise Analytics</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg GPA</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placement Rate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(metricsData?.years?.years || [])
                  .sort((a, b) => (b.passout_year || 0) - (a.passout_year || 0))
                  .map((year, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {year.passout_year || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {year.total_students}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {year.avg_gpa ? year.avg_gpa.toFixed(2) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          year.status === 'current' ? 'bg-blue-100 text-blue-800' :
                          year.status === 'graduating' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {year.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {year.placement_rate ? `${year.placement_rate.toFixed(1)}%` : 'N/A'}
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Student Management</h1>
              <p className="text-gray-600 mt-1">Comprehensive student data and analytics</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {loading && activeTab !== 'list' ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading student data...</span>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'analytics' && renderAnalytics()}
            {activeTab === 'list' && <OptimizedStudentManagement />}
          </>
        )}
      </div>
    </div>
  );
};

export default EnhancedStudentManagement;
