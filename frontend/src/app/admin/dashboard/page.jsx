'use client';

import {
  Briefcase,
  Building2,
  ClipboardList,
  TrendingDown,
  TrendingUp,
  Users
} from "lucide-react";
import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis, YAxis
} from 'recharts';
import { getDashboardMetrics, getApplicationTimeline } from '../../../api/metrics';
import { getAllApplications } from '../../../api/applications';

function Dashboard() {
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalApplications: 0,
    totalStudents: 0,
    placementRate: 0
  });
  
  // Application status data for the chart
  const [applicationData, setApplicationData] = useState([]);
  const [selectedYear, setSelectedYear] = useState('All');
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [recentApplications, setRecentApplications] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [changes, setChanges] = useState({
    totalJobs: null,
    totalApplications: null,
    totalStudents: null,
    placementRate: null
  });

  useEffect(() => {
    fetchAvailableYears();
  }, []);

  useEffect(() => {
    fetchDashboardData(selectedYear);
  }, [selectedYear]);

  useEffect(() => {
    if (selectedYear) {
      if (selectedYear === 'All') {
        // For "All", fetch aggregated data
        fetchApplicationTimeline(null); // Pass null to get all data
        fetchRecentApplications(null); // Pass null to get all data
      } else {
        // For specific year, fetch filtered data
        fetchApplicationTimeline(selectedYear);
        fetchRecentApplications(selectedYear);
      }
    }
  }, [selectedYear]);

  const fetchDashboardData = async (year = 'All') => {
    try {
      setLoading(true);
      
      if (year === 'All') {
        // Fetch aggregated data for all years
        const metricsResponse = await getDashboardMetrics('dashboard_stats', false, null);
        const metricsData = metricsResponse.data;
        
        setStats({
          totalJobs: metricsData.total_jobs || 0,
          totalApplications: metricsData.total_applications || 0,
          totalStudents: metricsData.total_students || 0,
          placementRate: metricsData.placement_rate || 0
        });
        
        setChanges({
          totalJobs: null,
          totalApplications: null,
          totalStudents: null,
          placementRate: null
        });
      } else {
        // Fetch data for selected year and previous year to calculate changes
        const currentResponse = await getDashboardMetrics('dashboard_stats', false, year);
        const currentData = currentResponse.data;
        
        const prevYear = (parseInt(year) - 1).toString();
        const previousResponse = await getDashboardMetrics('dashboard_stats', false, prevYear);
        const previousData = previousResponse.data;
        
        const calcChange = (current, prev) => {
          if (!prev || prev === 0) return current > 0 ? 100 : 0;
          return ((current - prev) / prev * 100).toFixed(1);
        };
        
        setStats({
          totalJobs: currentData.total_jobs || 0,
          totalApplications: currentData.total_applications || 0,
          totalStudents: currentData.total_students || 0,
          placementRate: currentData.placement_rate || 0
        });
        
        setChanges({
          totalJobs: calcChange(currentData.total_jobs || 0, previousData.total_jobs || 0),
          totalApplications: calcChange(currentData.total_applications || 0, previousData.total_applications || 0),
          totalStudents: calcChange(currentData.total_students || 0, previousData.total_students || 0),
          placementRate: calcChange(currentData.placement_rate || 0, previousData.placement_rate || 0)
        });
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Keep dummy data as fallback
      setStats({
        totalJobs: 0,
        totalApplications: 0,
        totalStudents: 0,
        placementRate: 0
      });
      setChanges({
        totalJobs: null,
        totalApplications: null,
        totalStudents: null,
        placementRate: null
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableYears = async () => {
    try {
      // Fetch student stats which includes years
      const response = await getDashboardMetrics('student_stats');
      const studentData = response.data;
      
      if (studentData.by_year && Array.isArray(studentData.by_year)) {
        const years = studentData.by_year.map(item => item.passout_year).sort((a, b) => b - a);
        // Add "All" option at the beginning
        setAvailableYears(['All', ...years]);
        if (years.length > 0 && !selectedYear) {
          setSelectedYear('All'); // Default to "All"
        }
      }
    } catch (error) {
      console.error('Error fetching available years:', error);
      // Fallback to current year
      const currentYear = new Date().getFullYear();
      setAvailableYears(['All', currentYear]);
      setSelectedYear('All');
    }
  };

  const fetchRecentApplications = async (year) => {
    try {
      setApplicationsLoading(true);
      // For now, fetch all recent applications and filter by passout year on frontend
      // TODO: Add backend filtering by passout year
      const applicationsResponse = await getAllApplications({ page_size: 50 }); // Fetch more to filter
      
      // Handle different response structures
      let applications = [];
      if (applicationsResponse.data) {
        if (applicationsResponse.data.results) {
          if (typeof applicationsResponse.data.results === 'object' && applicationsResponse.data.results.results) {
            // Nested structure: results: { results: [...], stats: {...} }
            applications = applicationsResponse.data.results.results || [];
          } else if (Array.isArray(applicationsResponse.data.results)) {
            // Simple array structure: results: [...]
            applications = applicationsResponse.data.results;
          }
        } else if (Array.isArray(applicationsResponse.data)) {
          // Direct array response
          applications = applicationsResponse.data;
        }
      }
      
      // Filter applications by passout year (only if year is specified and not null)
      if (year && year !== 'All') {
        applications = applications.filter(app => {
          return app.passout_year && app.passout_year.toString() === year.toString();
        });
      }
      
      // Take only the first 10 after filtering
      applications = applications.slice(0, 10);
      
      // Ensure applications is always an array
      setRecentApplications(Array.isArray(applications) ? applications : []);
    } catch (error) {
      console.error('Error fetching recent applications:', error);
      setRecentApplications([]);
    } finally {
      setApplicationsLoading(false);
    }
  };

  const fetchApplicationTimeline = async (year) => {
    try {
      setChartLoading(true);
      const response = await getApplicationTimeline(year);
      setApplicationData(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching application timeline:', error);
      setApplicationData([]);
    } finally {
      setChartLoading(false);
    }
  };

  const dashboardCards = [
    {
      title: 'Total Active Jobs',
      value: loading ? '...' : stats.totalJobs,
      icon: <Briefcase className="w-8 h-8" />,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      change: changes.totalJobs ? `${changes.totalJobs > 0 ? '+' : ''}${changes.totalJobs}%` : null,
      changeType: changes.totalJobs ? (changes.totalJobs > 0 ? 'increase' : 'decrease') : null
    },
    {
      title: 'Total Applications',
      value: loading ? '...' : stats.totalApplications.toLocaleString(),
      icon: <ClipboardList className="w-8 h-8" />,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      change: changes.totalApplications ? `${changes.totalApplications > 0 ? '+' : ''}${changes.totalApplications}%` : null,
      changeType: changes.totalApplications ? (changes.totalApplications > 0 ? 'increase' : 'decrease') : null
    },
    {
      title: 'Registered Students',
      value: loading ? '...' : stats.totalStudents.toLocaleString(),
      icon: <Users className="w-8 h-8" />,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      change: changes.totalStudents ? `${changes.totalStudents > 0 ? '+' : ''}${changes.totalStudents}%` : null,
      changeType: changes.totalStudents ? (changes.totalStudents > 0 ? 'increase' : 'decrease') : null
    },
    {
      title: 'Placement Rate',
      value: loading ? '...' : `${stats.placementRate}%`,
      icon: <TrendingUp className="w-8 h-8" />,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      change: changes.placementRate ? `${changes.placementRate > 0 ? '+' : ''}${changes.placementRate}%` : null,
      changeType: changes.placementRate ? (changes.placementRate > 0 ? 'increase' : 'decrease') : null
    }
  ];

  return (
    <div className="p-6 ml-20 overflow-y-auto h-full">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, Admin!</h1>
        <p className="text-gray-600">Here's what's happening at your college today.</p>
      </div>
  
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {dashboardCards.map((card, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <div className={card.iconColor}>
                    {card.icon}
                  </div>
                </div>
                {card.change && card.changeType && (
                  <div className={`flex items-center text-sm font-medium ${card.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                    {card.changeType === 'increase' ? (
                      <TrendingUp className="w-4 h-4 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 mr-1" />
                    )}
                    {card.change}
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{card.value}</h3>
              <p className="text-gray-600 text-sm">{card.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Application Status Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2 md:mb-0">
            Application Status Timeline {selectedYear && selectedYear !== 'All' ? `(${selectedYear})` : selectedYear === 'All' ? '(All Years)' : ''}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm bg-white"
              disabled={availableYears.length === 0}
            >
              {availableYears.length === 0 ? (
                <option>Loading...</option>
              ) : (
                availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))
              )}
            </select>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-600 mr-2"></div>
            <span className="text-sm text-gray-700">Applications</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
            <span className="text-sm text-gray-700">Interviews</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
            <span className="text-sm text-gray-700">Approved</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
            <span className="text-sm text-gray-700">Rejected</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-gray-400 mr-2"></div>
            <span className="text-sm text-gray-700">Pending</span>
          </div>
        </div>
        
        <div className="h-72 relative">
          {chartLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Loading chart data...</span>
              </div>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={applicationData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                axisLine={{ stroke: '#e0e0e0' }}
                tick={{ fill: '#666666', fontSize: 12 }}
              />
              <YAxis 
                axisLine={{ stroke: '#e0e0e0' }}
                tick={{ fill: '#666666', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}
                itemStyle={{ padding: 0 }}
                labelStyle={{ fontWeight: 'bold', marginBottom: '5px' }}
              />
              <Line 
                type="monotone" 
                dataKey="sent" 
                name="Applications" 
                stroke="#4F46E5" 
                strokeWidth={2} 
                dot={{ stroke: '#4F46E5', strokeWidth: 2, r: 4, fill: 'white' }} 
                activeDot={{ r: 6, stroke: '#4F46E5', strokeWidth: 2, fill: '#4F46E5' }} 
              />
              <Line 
                type="monotone" 
                dataKey="interviews" 
                name="Interviews" 
                stroke="#10B981" 
                strokeWidth={2} 
                dot={{ stroke: '#10B981', strokeWidth: 2, r: 4, fill: 'white' }}
                activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2, fill: '#10B981' }}
              />
              <Line 
                type="monotone" 
                dataKey="approved" 
                name="Approved" 
                stroke="#F59E0B" 
                strokeWidth={2} 
                dot={{ stroke: '#F59E0B', strokeWidth: 2, r: 4, fill: 'white' }}
                activeDot={{ r: 6, stroke: '#F59E0B', strokeWidth: 2, fill: '#F59E0B' }}
              />
              <Line 
                type="monotone" 
                dataKey="rejected" 
                name="Rejected" 
                stroke="#8B5CF6" 
                strokeWidth={2} 
                dot={{ stroke: '#8B5CF6', strokeWidth: 2, r: 4, fill: 'white' }}
                activeDot={{ r: 6, stroke: '#8B5CF6', strokeWidth: 2, fill: '#8B5CF6' }}
              />
              <Line 
                type="monotone" 
                dataKey="pending" 
                name="Pending" 
                stroke="#9CA3AF" 
                strokeWidth={2} 
                dot={{ stroke: '#9CA3AF', strokeWidth: 2, r: 4, fill: 'white' }}
                activeDot={{ r: 6, stroke: '#9CA3AF', strokeWidth: 2, fill: '#9CA3AF' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    
      {/* Recent Applications Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Recent Applications {selectedYear && selectedYear !== 'All' ? `(${selectedYear})` : selectedYear === 'All' ? '(All Years)' : ''}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {applicationsLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Loading recent applications...</span>
                    </div>
                  </td>
                </tr>
              ) : !recentApplications || !Array.isArray(recentApplications) || recentApplications.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No recent applications found
                  </td>
                </tr>
              ) : (
                recentApplications.map((application, index) => (
                  <tr key={application.id || index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-medium">
                          {application.student_name ? application.student_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'N/A'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{application.student_name || 'Unknown Student'}</div>
                          <div className="text-sm text-gray-500">{application.branch || application.student_branch || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{application.job_title || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{application.company_name || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {application.applied_at ? new Date(application.applied_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        application.status === 'HIRED' ? 'bg-green-100 text-green-800' :
                        application.status === 'SHORTLISTED' ? 'bg-blue-100 text-blue-800' :
                        application.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        application.status === 'APPLIED' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {application.status || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
