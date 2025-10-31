'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  User,
  FileText,
  Target,
  Award,
  ArrowRight,
  RefreshCw,
  MapPin,
  DollarSign,
  Building2,
  Users,
  AlertCircle
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { getAuthToken } from '@/utils/auth';
import { studentsAPI } from '@/api/optimized';
import { studentDashboardAPI } from '@/api/studentDashboard';
import { getApplicationTimeline } from '@/api/metrics';

export default function StudentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState(null);
  const [dashboardStats, setDashboardStats] = useState({
    totalApplications: 0,
    pendingApplications: 0,
    shortlistedApplications: 0,
    upcomingInterviews: 0,
    profileCompletion: 0,
    availableJobs: 0
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [priorityActions, setPriorityActions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [applicationData, setApplicationData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [changes, setChanges] = useState({
    totalApplications: null,
    pendingApplications: null,
    shortlistedApplications: null,
    profileCompletion: null
  });

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }
    
    fetchDashboardData();
    fetchApplicationTimeline();
    
    // Set up real-time updates every 2 minutes
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchApplicationTimeline();
    }, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch student profile data using the correct API
      const userData = await studentsAPI.getUserData();
      setStudentData(userData);

      // Calculate profile completion using the utility function
      const profileCompletion = studentDashboardAPI.calculateProfileCompletion(userData);

      // Fetch applications
      const applications = await studentDashboardAPI.getStudentApplications();
      setRecentApplications(applications.slice(0, 5));

      // Get application status summary
      const statusSummary = studentDashboardAPI.getApplicationStatusSummary(applications);

      // Fetch available jobs count
      const jobsData = await studentDashboardAPI.getAvailableJobs({ per_page: 1 });

      // Calculate stats with previous period comparison (mock for now)
      const stats = {
        totalApplications: statusSummary.total,
        pendingApplications: statusSummary.applied + statusSummary.under_review,
        shortlistedApplications: statusSummary.shortlisted,
        upcomingInterviews: 0, // Will be calculated from interview data
        profileCompletion: profileCompletion,
        availableJobs: jobsData.count || 0
      };
      setDashboardStats(stats);

      // Calculate percentage changes (mock data for demo)
      setChanges({
        totalApplications: stats.totalApplications > 0 ? '+12.5' : null,
        pendingApplications: stats.pendingApplications > 0 ? '-5.2' : null,
        shortlistedApplications: stats.shortlistedApplications > 0 ? '+25.0' : null,
        profileCompletion: profileCompletion < 100 ? `${100 - profileCompletion}% to go` : 'Complete!'
      });

      // Generate priority actions
      const actions = generatePriorityActions(userData, stats, applications);
      setPriorityActions(actions);

      // Fetch recommended jobs
      const recommendedJobsData = await studentDashboardAPI.getRecommendedJobs({
        branch: userData.branch,
        cgpa: userData.gpa,
        limit: 3
      });
      setRecommendedJobs(recommendedJobsData);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const fetchApplicationTimeline = async () => {
    try {
      setChartLoading(true);
      const timelineData = await getApplicationTimeline();
      
      if (timelineData && timelineData.data) {
        setApplicationData(timelineData.data);
      }
      setChartLoading(false);
    } catch (error) {
      console.error('Error fetching application timeline:', error);
      setChartLoading(false);
    }
  };

  const generatePriorityActions = (profile, stats, applications) => {
    const actions = [];

    // Check profile completion
    if (stats.profileCompletion < 100) {
      actions.push({
        id: 'complete-profile',
        title: 'Complete Your Profile',
        description: `Your profile is ${stats.profileCompletion}% complete`,
        icon: User,
        color: 'orange',
        priority: 1,
        action: () => router.push('/students/profile')
      });
    }

    // Check for missing resume
    if (!profile.resume) {
      actions.push({
        id: 'upload-resume',
        title: 'Upload Resume',
        description: 'Required for job applications',
        icon: FileText,
        color: 'red',
        priority: 1,
        action: () => router.push('/students/profile')
      });
    }

    // Check for pending applications
    if (stats.pendingApplications > 0) {
      actions.push({
        id: 'check-applications',
        title: `${stats.pendingApplications} Applications Pending`,
        description: 'Check status updates',
        icon: Clock,
        color: 'blue',
        priority: 2,
        action: () => router.push('/students/myjobs')
      });
    }

    // Encourage applying to more jobs
    if (stats.totalApplications < 3) {
      actions.push({
        id: 'apply-jobs',
        title: 'Browse Job Opportunities',
        description: `${stats.availableJobs} jobs available`,
        icon: Briefcase,
        color: 'green',
        priority: 3,
        action: () => router.push('/students/jobpostings')
      });
    }

    return actions.sort((a, b) => a.priority - b.priority);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      'APPLIED': 'bg-blue-100 text-blue-800',
      'UNDER_REVIEW': 'bg-yellow-100 text-yellow-800',
      'SHORTLISTED': 'bg-green-100 text-green-800',
      'REJECTED': 'bg-red-100 text-red-800',
      'HIRED': 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'APPLIED': Clock,
      'UNDER_REVIEW': AlertCircle,
      'SHORTLISTED': CheckCircle,
      'REJECTED': AlertCircle,
      'HIRED': Award
    };
    return icons[status] || Clock;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const dashboardCards = [
    {
      title: 'Total Applications',
      value: dashboardStats.totalApplications,
      icon: <Briefcase className="w-8 h-8" />,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      change: changes.totalApplications,
      changeType: changes.totalApplications && parseFloat(changes.totalApplications) > 0 ? 'increase' : 'decrease',
      actions: priorityActions.filter(action => action.id === 'apply-jobs')
    },
    {
      title: 'Under Review',
      value: dashboardStats.pendingApplications,
      icon: <Clock className="w-8 h-8" />,
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      change: changes.pendingApplications,
      changeType: changes.pendingApplications && parseFloat(changes.pendingApplications) > 0 ? 'increase' : 'decrease',
      actions: priorityActions.filter(action => action.id === 'check-applications')
    },
    {
      title: 'Shortlisted',
      value: dashboardStats.shortlistedApplications,
      icon: <CheckCircle className="w-8 h-8" />,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      change: changes.shortlistedApplications,
      changeType: changes.shortlistedApplications && parseFloat(changes.shortlistedApplications) > 0 ? 'increase' : 'decrease',
      actions: []
    },
    {
      title: 'Profile Completion',
      value: `${dashboardStats.profileCompletion}%`,
      icon: <User className="w-8 h-8" />,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      change: changes.profileCompletion,
      changeType: null, // No trend for profile completion
      actions: priorityActions.filter(action => ['complete-profile', 'upload-resume'].includes(action.id))
    }
  ];

  return (
    <div className="min-h-screen bg-white-50">
      {/* Header Section - matching admin dashboard */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {studentData?.first_name || 'Student'}! 👋
              </h1>
              <p className="text-gray-600 mt-1">
                {studentData?.branch} • Batch {studentData?.passout_year}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="mt-3 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Application Status Chart */}
        {/* <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Application Timeline</h2>
            {applicationData.length > 0 && (
              <p className="text-sm text-gray-600">Last 30 days</p>
            )}
          </div>
          {chartLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : applicationData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Briefcase className="w-16 h-16 mb-4 text-gray-300" />
              <p>No application data available yet</p>
              <button
                onClick={() => router.push('/jobs')}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Browse Jobs →
              </button>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={applicationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="applied"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Applied"
                    dot={{ fill: '#3b82f6', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="shortlisted"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Shortlisted"
                    dot={{ fill: '#10b981', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rejected"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Rejected"
                    dot={{ fill: '#ef4444', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div> */}

        {/* Stats Grid - matching admin dashboard */}
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
                      ) : card.changeType === 'decrease' ? (
                        <TrendingDown className="w-4 h-4 mr-1" />
                      ) : null}
                      {card.change}
                    </div>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{card.value}</h3>
                <p className="text-gray-600 text-sm">{card.title}</p>
                {card.title === 'Profile Completion' && dashboardStats.profileCompletion < 100 && (
                  <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all"
                      style={{ width: `${dashboardStats.profileCompletion}%` }}
                    />
                  </div>
                )}
                {/* Action Items inside cards */}
                {card.actions && card.actions.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {card.actions.map((action, actionIndex) => {
                      const ActionIcon = action.icon;
                      return (
                        <button
                          key={actionIndex}
                          onClick={action.action}
                          className="w-full flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group text-left"
                        >
                          <div className="flex items-center">
                            <div className={`p-1.5 rounded-md bg-${action.color}-100`}>
                              <ActionIcon className={`w-4 h-4 text-${action.color}-600`} />
                            </div>
                            <div className="ml-2">
                              <p className="text-xs font-medium text-gray-900">
                                {action.title}
                              </p>
                              <p className="text-xs text-gray-600">
                                {action.description}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Applications */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-600" />
                  Recent Applications
                </h2>
                <button
                  onClick={() => router.push('/applications')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                >
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {recentApplications.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2">No applications yet</p>
                  <p className="text-sm text-gray-500 mb-4">Start exploring job opportunities</p>
                  <button
                    onClick={() => router.push('/students/jobpostings')}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Briefcase className="w-4 h-4 mr-2" />
                    Browse Jobs
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentApplications.map((application, index) => {
                    const StatusIcon = getStatusIcon(application.status);
                    return (
                      <div
                        key={index}
                        className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => router.push(`/students/myjobs?selected=${application.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 mb-1">
                              {application.job_title}
                            </h3>
                            <div className="flex items-center text-sm text-gray-600 mb-2">
                              <Building2 className="w-4 h-4 mr-1" />
                              {application.company_name}
                            </div>
                            <p className="text-xs text-gray-500 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              Applied: {new Date(application.applied_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-col items-end ml-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {application.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recommended Jobs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Target className="w-5 h-5 mr-2 text-green-600" />
                Recommended for You
              </h2>
            </div>
            <div className="p-4 sm:p-6">
              <div className="space-y-3">
                {recommendedJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No recommendations yet</p>
                    <p className="text-xs text-gray-500 mt-1">Complete your profile to get personalized job matches</p>
                  </div>
                ) : (
                  recommendedJobs.map((job, index) => (
                    <div
                      key={job.id || index}
                      className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => router.push(`/jobpostings/${job.id}`)}
                    >
                      <div className="flex items-start">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Briefcase className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="ml-3 flex-1">
                          <h3 className="text-sm font-medium text-gray-900">
                            {job.title || 'Software Engineer'}
                          </h3>
                          <p className="text-xs text-gray-600 mt-1">
                            {job.company?.name || job.company_name || 'Tech Company'}
                          </p>
                          <div className="flex items-center mt-2 text-xs text-gray-500">
                            <MapPin className="w-3 h-3 mr-1" />
                            <span>{job.location || 'Bangalore'}</span>
                            {job.salary_min && job.salary_max && (
                              <>
                                <span className="mx-2">•</span>
                                <DollarSign className="w-3 h-3 mr-1" />
                                <span>₹{job.salary_min}-{job.salary_max} LPA</span>
                              </>
                            )}
                          </div>
                          <span className="inline-block mt-2 text-xs text-green-600 font-medium">
                            View Details →
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={() => router.push('/students/jobpostings')}
                className="w-full mt-4 py-2 px-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-medium text-sm"
              >
                View All Jobs
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button
            onClick={() => router.push('/students/jobpostings')}
            className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-300 transition-all group"
          >
            <div className="p-3 bg-blue-50 rounded-lg mb-3 inline-block">
              <Briefcase className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Browse Jobs</p>
            <p className="text-xs text-gray-500 mt-1">{dashboardStats.availableJobs} available</p>
          </button>

          <button
            onClick={() => router.push('/students/myjobs')}
            className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-yellow-300 transition-all group"
          >
            <div className="p-3 bg-yellow-50 rounded-lg mb-3 inline-block">
              <FileText className="w-6 h-6 text-yellow-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-sm font-semibold text-gray-900">My Applications</p>
            <p className="text-xs text-gray-500 mt-1">{dashboardStats.totalApplications} total</p>
          </button>

          <button
            onClick={() => router.push('/students/profile')}
            className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-purple-300 transition-all group"
          >
            <div className="p-3 bg-purple-50 rounded-lg mb-3 inline-block">
              <User className="w-6 h-6 text-purple-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-sm font-semibold text-gray-900">My Profile</p>
            <p className="text-xs text-gray-500 mt-1">{dashboardStats.profileCompletion}% complete</p>
          </button>

          <button
            onClick={() => router.push('/students/calendar')}
            className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-green-300 transition-all group"
          >
            <div className="p-3 bg-green-50 rounded-lg mb-3 inline-block">
              <Calendar className="w-6 h-6 text-green-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Calendar</p>
            <p className="text-xs text-gray-500 mt-1">{dashboardStats.upcomingInterviews} upcoming</p>
          </button>
        </div>
      </div>
    </div>
  );
}

