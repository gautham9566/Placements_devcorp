'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  Building2,
  User,
  FileText,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';
import { getAllApplications, getApplicationStats, deleteApplication } from '../../../api/applications';
import ApplicationFilters from './components/ApplicationFilters';
import ApplicationsTable from './components/ApplicationsTable';
import ExportModal from './components/ExportModal';
import ApplicationDetailModal from './components/ApplicationDetailModal';
import StatusBadge from '../../../components/applications/StatusBadge';

function ApplicationsPageContent() {
  const searchParams = useSearchParams();
  const jobIdFromUrl = searchParams.get('job_id');

  // State management
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    by_status: [],
    recent: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'ALL',
    company: '',
    job_title: '',
    date_from: '',
    date_to: '',
    student_name: ''
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(20);

  // Load applications data
  useEffect(() => {
    loadApplications();
  }, [currentPage, filters, jobIdFromUrl]);

  // Initialize filtered applications when applications data changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredApplications(applications);
    }
  }, [applications]);

  // Search debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      applySearchFilter();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, applications]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      
      // Try to fetch real data first since we now have real applications
      try {
        const response = await getAllApplications({
          page: currentPage,
          page_size: itemsPerPage,
          ...(jobIdFromUrl && { job_id: jobIdFromUrl }),
          ...filters
        });

        console.log('Real API Response:', response);

        if (response && response.data) {
          // Backend returns paginated response with nested structure
          // Structure: { count, next, previous, results: { results: [...], stats: {...} } }

          let applications = [];
          let stats = { total: 0, by_status: [], recent: 0 };
          let totalCount = 0;

          if (response.data.results) {
            if (typeof response.data.results === 'object' && response.data.results.results) {
              // Nested structure: results: { results: [...], stats: {...} }
              applications = response.data.results.results || [];
              stats = response.data.results.stats || stats;
              totalCount = response.data.count || stats.total || 0;
            } else if (Array.isArray(response.data.results)) {
              // Simple array structure: results: [...]
              applications = response.data.results;
              stats = response.data.stats || stats;
              totalCount = response.data.count || applications.length;
            }
          }

          console.log('Processed applications:', applications.length);
          console.log('Processed stats:', stats);

          setApplications(applications);
          setStats(stats);
          setTotalPages(Math.ceil(totalCount / itemsPerPage));

          return; // Successfully loaded real data
        }
      } catch (apiError) {
        console.error('API Error details:', {
          message: apiError.message,
          status: apiError.response?.status,
          statusText: apiError.response?.statusText,
          data: apiError.response?.data,
          url: apiError.config?.url
        });
        console.log('API Error, falling back to mock data:', apiError);
      }

      // Fallback to mock data if API fails
      let mockApplications = [
        {
          id: 1,
          job_id: 25,
          student_name: "John Doe",
          student_email: "john.doe@university.edu",
          student_id: "CS2021001",
          branch: "Computer Science",
          job_title: "Software Engineer",
          company_name: "TechCorp Inc",
          job_location: "San Francisco, CA",
          status: "APPLIED",
          applied_at: "2024-01-15T10:30:00Z",
          cover_letter: "I am very interested in this position...",
          admin_notes: "",
          status_history: []
        },
        {
          id: 2,
          job_id: 25,
          student_name: "Jane Smith",
          student_email: "jane.smith@university.edu",
          student_id: "CS2021002",
          branch: "Computer Science",
          job_title: "Software Engineer",
          company_name: "TechCorp Inc",
          job_location: "San Francisco, CA",
          status: "UNDER_REVIEW",
          applied_at: "2024-01-14T14:20:00Z",
          cover_letter: "My experience in machine learning...",
          admin_notes: "Strong candidate",
          status_history: []
        },
        {
          id: 3,
          job_id: 26,
          student_name: "Mike Johnson",
          student_email: "mike.johnson@university.edu",
          student_id: "CS2021003",
          branch: "Computer Science",
          job_title: "Frontend Developer",
          company_name: "WebSolutions",
          job_location: "Austin, TX",
          status: "SHORTLISTED",
          applied_at: "2024-01-13T09:15:00Z",
          cover_letter: "I have extensive experience in React...",
          admin_notes: "Excellent portfolio",
          status_history: []
        }
      ];

      // Filter by job_id if provided in URL
      if (jobIdFromUrl) {
        mockApplications = mockApplications.filter(app => app.job_id === parseInt(jobIdFromUrl));
      }

      // Calculate stats AFTER filtering
      const mockStats = {
        total: mockApplications.length,
        by_status: [
          { status: 'APPLIED', count: mockApplications.filter(app => app.status === 'APPLIED').length },
          { status: 'UNDER_REVIEW', count: mockApplications.filter(app => app.status === 'UNDER_REVIEW').length },
          { status: 'SHORTLISTED', count: mockApplications.filter(app => app.status === 'SHORTLISTED').length }
        ],
        recent: mockApplications.length // All mock data is recent for demo
      };

      console.log('Using Mock Applications:', mockApplications);
      console.log('Mock Stats:', mockStats);
      console.log('Job ID from URL:', jobIdFromUrl);

      setApplications(mockApplications);
      setStats(mockStats);
      setTotalPages(1);

    } catch (err) {
      console.error('Failed to load applications:', err);
      setError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const applySearchFilter = () => {
    const safeApplications = Array.isArray(applications) ? applications : [];
    
    if (!searchTerm.trim()) {
      setFilteredApplications(safeApplications);
      return;
    }

    const filtered = safeApplications.filter(app => 
      app.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.student_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredApplications(filtered);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleViewApplication = (application) => {
    setSelectedApplication(application);
    setShowDetailModal(true);
  };

  const handleDeleteApplication = async (applicationId) => {
    if (!confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
      return;
    }

    try {
      // For now, just remove from local state since API might not be ready
      setApplications(prev => prev.filter(app => app.id !== applicationId));
      alert('Application deleted successfully (mock action)');
    } catch (err) {
      console.error('Failed to delete application:', err);
      alert('Failed to delete application');
    }
  };

  const getStatusIcon = (status) => {
    const iconMap = {
      'APPLIED': <Clock className="w-4 h-4" />,
      'UNDER_REVIEW': <Eye className="w-4 h-4" />,
      'SHORTLISTED': <CheckCircle className="w-4 h-4" />,
      'REJECTED': <XCircle className="w-4 h-4" />,
      'HIRED': <CheckCircle className="w-4 h-4" />
    };
    return iconMap[status] || <Clock className="w-4 h-4" />;
  };

  const displayApplications = searchTerm 
    ? (Array.isArray(filteredApplications) ? filteredApplications : []) 
    : (Array.isArray(applications) ? applications : []);

  // Debug logging
  console.log('Current state:', {
    searchTerm,
    applications: applications?.length || 0,
    filteredApplications: filteredApplications?.length || 0,
    displayApplications: displayApplications?.length || 0,
    stats
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Applications Management</h1>
          <p className="text-gray-600 mt-1">
            {jobIdFromUrl 
              ? `Applications for Job ID: ${jobIdFromUrl}` 
              : 'Track and manage all job applications from students'
            }
          </p>
          {jobIdFromUrl && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Filtered by Job ID: {jobIdFromUrl}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          
          <button
            onClick={loadApplications}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Applications</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.by_status?.find(s => s.status === 'APPLIED')?.count || 0}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Shortlisted</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.by_status?.find(s => s.status === 'SHORTLISTED')?.count || 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recent (7 days)</p>
              <p className="text-3xl font-bold text-gray-900">{stats.recent}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <ApplicationFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student name, email, job title, company, or student ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
            <span className="ml-3 text-gray-600">Loading applications...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-gray-900 font-medium">Error loading applications</p>
              <p className="text-gray-600">{error}</p>
              <button
                onClick={loadApplications}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : displayApplications.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-900 font-medium">No applications found</p>
              <p className="text-gray-600">
                {searchTerm ? 'Try adjusting your search criteria' : 'No applications have been submitted yet'}
              </p>
            </div>
          </div>
        ) : (
          <ApplicationsTable
            applications={displayApplications}
            onViewApplication={handleViewApplication}
            onDeleteApplication={handleDeleteApplication}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          filters={{
            ...filters,
            ...(jobIdFromUrl && { job_id: jobIdFromUrl })
          }}
        />
      )}

      {showDetailModal && selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedApplication(null);
          }}
          onUpdate={loadApplications}
        />
      )}
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ApplicationsPageContent />
    </Suspense>
  );
} 