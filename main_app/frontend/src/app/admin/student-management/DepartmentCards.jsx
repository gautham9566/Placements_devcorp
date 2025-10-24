import { GraduationCap, BarChart3, Award, TrendingUp, RefreshCw, Users, BookOpen } from "lucide-react";
import { useState, useEffect } from 'react';
import { studentMetricsAPI } from '../../../api/optimized';

export default function DepartmentCards({ departmentOptions, departmentStats, totalStudents, onSelect }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch analytics data
  const fetchAnalytics = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await studentMetricsAPI.getAllStudentAnalytics(forceRefresh);
      
      if (result.success) {
        setAnalytics(result.data);
        
        // Show warning if we're using fallback data
        if (result.fallback || result.has_errors) {
          const errorMessages = result.data?.errors || [];
          console.warn('Analytics loaded with warnings:', errorMessages);
          setError(`Some data may be incomplete: ${errorMessages.join(', ')}`);
        }
      } else {
        setError(result.error || 'Failed to load analytics');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load student analytics');
    } finally {
      setLoading(false);
    }
  };

  // Refresh analytics
  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    
    try {
      console.log('Refreshing metrics - clearing existing data...');
      
      // Clear existing analytics data first
      setAnalytics(null);
      
      // Call backend to refresh all metrics
      const result = await studentMetricsAPI.refreshAllMetrics();
      
      if (result.success) {
        console.log('Backend refresh successful, fetching fresh data...');
        // Fetch fresh data with force refresh flag
        await fetchAnalytics(true);
      } else {
        setError(result.error || 'Failed to refresh metrics');
      }
    } catch (err) {
      console.error('Error refreshing metrics:', err);
      setError('Failed to refresh metrics: ' + err.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Get analytics data with fallbacks
  const overview = analytics?.enhanced?.overview || {};
  const departmentData = analytics?.departments?.departments || [];
  const yearData = analytics?.years?.years || [];
  const performanceData = analytics?.performance?.performance_categories || {};

  // Debug logging
  console.log('DepartmentCards - Analytics loaded:', !!analytics);
  console.log('DepartmentCards - Department data count:', departmentData.length);
  console.log('DepartmentCards - Departments:', departmentData.map(d => ({ branch: d.branch, count: d.total_students })));

  // Calculate enhanced stats
  const enhancedStats = {
    totalStudents: overview.total_students || totalStudents || 0,
    activeDepartments: overview.active_departments || departmentData.length || 0,
    highPerformers: overview.high_performers || 0,
    highPerformerPercentage: overview.high_performer_percentage || 0,
    placementReady: overview.placement_ready || 0,
    averageGPA: departmentData.length > 0 
      ? (departmentData.reduce((sum, dept) => sum + (dept.avg_gpa || 0), 0) / departmentData.length).toFixed(2)
      : '0.00'
  };

  return (
    <>
      {/* Header with Refresh Button */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Management & Analytics</h1>
          <p className="text-gray-600">Comprehensive overview of student data and performance</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Error Handling */}
      {error && (
        <div className={`mb-6 rounded-lg p-4 ${
          error.includes('incomplete') || error.includes('fallback') 
            ? 'bg-yellow-50 border border-yellow-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`${
            error.includes('incomplete') || error.includes('fallback')
              ? 'text-yellow-600'
              : 'text-red-600'
          }`}>
            {error.includes('incomplete') || error.includes('fallback') 
              ? `⚠️ ${error}` 
              : error
            }
          </p>
          <button 
            onClick={() => fetchAnalytics()} 
            className={`mt-2 px-4 py-2 text-white rounded hover:opacity-90 text-sm ${
              error.includes('incomplete') || error.includes('fallback')
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            Retry Load
          </button>
        </div>
      )}

      {/* Enhanced Summary Stats */}
      <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Overview Analytics</h2>
          <BarChart3 className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Students */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{enhancedStats.totalStudents.toLocaleString()}</div>
                <div className="text-sm text-blue-700 font-medium">Total Students</div>
                <div className="text-xs text-blue-600 mt-1">All registered students</div>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          {/* Active Departments */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{enhancedStats.activeDepartments}</div>
                <div className="text-sm text-green-700 font-medium">Active Departments</div>
                <div className="text-xs text-green-600 mt-1">Avg GPA: {enhancedStats.averageGPA}</div>
              </div>
              <BookOpen className="w-8 h-8 text-green-600" />
            </div>
          </div>

          {/* High Performers */}
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">{enhancedStats.highPerformers.toLocaleString()}</div>
                <div className="text-sm text-purple-700 font-medium">High Performers</div>
                <div className="text-xs text-purple-600 mt-1">{enhancedStats.highPerformerPercentage.toFixed(1)}% (GPA ≥ 8.5)</div>
              </div>
              <Award className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          {/* Placement Ready */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">{enhancedStats.placementReady.toLocaleString()}</div>
                <div className="text-sm text-orange-700 font-medium">Placement Ready</div>
                <div className="text-xs text-orange-600 mt-1">Current year eligible</div>
              </div>
              <GraduationCap className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Performance Analytics */}
      {/* {!loading && Object.keys(performanceData).length > 0 && ( */}
        {/* <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.entries(performanceData).map(([category, count]) => {
              const colors = {
                'high_performers': { bg: 'bg-green-100', text: 'text-green-800', bar: 'bg-green-500' },
                'good_performers': { bg: 'bg-blue-100', text: 'text-blue-800', bar: 'bg-blue-500' },
                'average_performers': { bg: 'bg-yellow-100', text: 'text-yellow-800', bar: 'bg-yellow-500' },
                'poor_performers': { bg: 'bg-red-100', text: 'text-red-800', bar: 'bg-red-500' }
              };
              const color = colors[category] || { bg: 'bg-gray-100', text: 'text-gray-800', bar: 'bg-gray-500' };
              const percentage = enhancedStats.totalStudents > 0 ? (count / enhancedStats.totalStudents * 100) : 0;
              
              return (
                <div key={category} className={`${color.bg} rounded-lg p-4`}>
                  <div className="text-center">
                    <div className={`text-xl font-bold ${color.text}`}>{count}</div>
                    <div className={`text-sm font-medium ${color.text} capitalize`}>
                      {category.replace('_', ' ')}
                    </div>
                    <div className="mt-2 bg-white bg-opacity-50 rounded-full h-2">
                      <div 
                        className={`${color.bar} h-2 rounded-full transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className={`text-xs ${color.text} mt-1`}>{percentage.toFixed(1)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )} */}

      {/* Top Departments Analytics */}
      {/* {!loading && departmentData.length > 0 && ( */}
        {/* <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Performing Departments</h3>
          <div className="space-y-4">
            {departmentData
              .sort((a, b) => (b.avg_gpa || 0) - (a.avg_gpa || 0))
              .slice(0, 5)
              .map((dept, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900">{dept.branch || 'Unknown Department'}</span>
                      <span className="text-sm text-gray-600">{dept.total_students} students</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Avg GPA: {dept.avg_gpa ? dept.avg_gpa.toFixed(2) : 'N/A'}</span>
                      <span>High Performers: {dept.high_performers || 0}</span>
                      <span>Placement Rate: {dept.placement_rate ? dept.placement_rate.toFixed(1) + '%' : 'N/A'}</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                        style={{ 
                          width: `${dept.avg_gpa ? (dept.avg_gpa / 10) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )} */}

      {/* Department Cards with Enhanced Data */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Browse by Department</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {departmentOptions.map((dept) => {
            // Skip departments with 0 students BEFORE loading analytics (prevents showing wrong data)
            // Wait for analytics to load before showing any department cards
            if (loading || !analytics || departmentData.length === 0) {
              return null;
            }

            // Use analytics data from backend (which respects active years filtering)
            const analyticsStats = departmentData.find(analytic => 
              analytic.branch?.toLowerCase().trim() === dept.value?.toLowerCase().trim()
            );
            
            // Use analytics data as primary source (already filtered by active years on backend)
            const studentCount = analyticsStats?.total_students || 0;
            
            // Show all departments, even those with 0 students (they are active in the system)
            console.log(`Department ${dept.value}: ${studentCount} students`);
            
            return (
              <div
                key={dept.value}
                onClick={() => onSelect(dept.value)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all duration-200 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <GraduationCap className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{studentCount}</div>
                    <div className="text-xs text-gray-500">Students</div>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{dept.label}</h3>
                <p className="text-sm text-gray-600 mb-3">View and manage {dept.label.toLowerCase()} students</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading analytics...</span>
        </div>
      )}

      {/* Last Updated */}
      {analytics?.enhanced?.last_updated && (
        <div className="text-center text-sm text-gray-500 mt-6">
          Last updated: {new Date(analytics.enhanced.last_updated).toLocaleString()}
        </div>
      )}
    </>
  );
}
