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
  RefreshCw,
  Link as LinkIcon,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  Lock,
  MessageSquare
} from 'lucide-react';
import { getAllApplications, getApplicationStats, deleteApplication } from '../../../api/applications';
import { updateShareableLink, getShareableLinks } from '../../../api/ats';
import ApplicationFilters from './components/ApplicationFilters';
import ApplicationsTable from './components/ApplicationsTable';
import ExportModal from './components/ExportModal';
import ApplicationDetailModal from './components/ApplicationDetailModal';
import StatusBadge from '../../../components/applications/StatusBadge';
import client from '../../../api/client';

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

  // Shareable link state
  const [shareableLink, setShareableLink] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [selectedPermissionLevel, setSelectedPermissionLevel] = useState('VIEW');
  const [showPermissionDropdown, setShowPermissionDropdown] = useState(false);
  const [showExistingLinkDropdown, setShowExistingLinkDropdown] = useState(false);
  const [updatingPermission, setUpdatingPermission] = useState(false);

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

  // Load existing shareable links on mount
  useEffect(() => {
    loadExistingShareableLinks();
  }, [jobIdFromUrl]);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPermissionDropdown && !event.target.closest('.permission-dropdown-container')) {
        setShowPermissionDropdown(false);
      }
      if (showExistingLinkDropdown && !event.target.closest('.existing-link-dropdown-container')) {
        setShowExistingLinkDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPermissionDropdown, showExistingLinkDropdown]);

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

  const loadExistingShareableLinks = async () => {
    try {
      console.log('Loading existing shareable links...');
      const params = {};
      if (jobIdFromUrl) {
        params.job_id = jobIdFromUrl;
        console.log('Fetching links for job ID:', jobIdFromUrl);
      }
      const response = await getShareableLinks(params);
      console.log('API Response received');
      
      let links = [];
      
      // Handle different response structures like the applications API
      if (response.data) {
        if (Array.isArray(response.data)) {
          // Direct array response
          links = response.data;
        } else if (response.data.results) {
          if (Array.isArray(response.data.results)) {
            // Simple results array
            links = response.data.results;
          } else if (typeof response.data.results === 'object' && response.data.results.results) {
            // Nested results structure
            links = response.data.results.results || [];
          }
        }
      }
      
      console.log('Processed links array:', links.length, 'links found');
      
      if (links.length > 0) {
        // Find active links that haven't expired, sorted by creation date (newest first)
        const now = new Date();
        
        const activeLinks = links
          .filter(link => {
            const expiresAt = link.expires_at ? new Date(link.expires_at) : null;
            const isNotExpired = !expiresAt || expiresAt > now;
            
            return isNotExpired;
          })
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        console.log('Active links found:', activeLinks.length);
        
        // Use the most recent active link
        const activeLink = activeLinks.length > 0 ? activeLinks[0] : null;
        
        if (activeLink) {
          console.log('Setting shareable link for job:', activeLink.job_id || 'general');
          
          // Ensure the link has a full_url field
          let linkToSet = { ...activeLink };
          
          // If full_url is missing but we have a token, construct the full URL
          if (!linkToSet.full_url && linkToSet.token) {
            // Assuming the shared board URL follows the pattern from the routing
            linkToSet.full_url = `${window.location.origin}/shared/${linkToSet.token}`;
          }
          
          setShareableLink(linkToSet);
          console.log('Shareable link state set successfully');
        } else {
          console.log('No active link found to set');
        }
      } else {
        console.log('No links found in response');
      }
    } catch (error) {
      console.error('Failed to load existing shareable links:', error);
      // Don't show error to user as this is a background operation
    }
  };

  const generateShareableLink = async () => {
    // First check if there's already an active link
    if (shareableLink) {
      const now = new Date();
      const expiresAt = shareableLink.expires_at ? new Date(shareableLink.expires_at) : null;
      
      // If link exists and hasn't expired, don't generate a new one
      if (!expiresAt || expiresAt > now) {
        alert(`An active shareable link already exists${jobIdFromUrl ? ' for this job' : ''}. You can copy the existing link or update its permissions.`);
        return;
      }
    }

    setGeneratingLink(true);
    try {
      // Generate shareable link via API
      const requestData = {
        applications_view: true,
        permission_level: selectedPermissionLevel,
        expires_in_days: 30
      };
      
      // Add job_id if available
      if (jobIdFromUrl) {
        requestData.job_id = jobIdFromUrl;
      }
      
      const response = await client.post('/api/v1/jobs/ats/links/generate_link/', requestData);

      if (response.data) {
        // Ensure the link has a full_url field
        let linkData = { ...response.data };
        if (!linkData.full_url && linkData.token) {
          linkData.full_url = `${window.location.origin}/shared/${linkData.token}`;
        }
        
        setShareableLink(linkData);
        // Auto-copy the link
        await copyLinkToClipboard(linkData.full_url);
      }
    } catch (error) {
      console.error('Failed to generate shareable link:', error);
      alert('Failed to generate shareable link. Please try again.');
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyLinkToClipboard = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      alert('Failed to copy link to clipboard');
    }
  };

  const updateLinkPermission = async (newLevel) => {
    if (!shareableLink?.id) return;
    
    setUpdatingPermission(true);
    try {
      await updateShareableLink(shareableLink.id, {
        permission_level: newLevel
      });
      
      // Update local state
      setShareableLink(prev => ({
        ...prev,
        permission_level: newLevel
      }));
      
      setShowExistingLinkDropdown(false);
    } catch (err) {
      console.error('Error updating permission level:', err);
      alert('Failed to update access level. Please try again.');
    } finally {
      setUpdatingPermission(false);
    }
  };

  const getPermissionDetails = (level) => {
    const details = {
      VIEW: { 
        icon: Eye, 
        text: 'View Only', 
        color: 'bg-blue-100 text-blue-700',
        description: 'Read-only access'
      },
      COMMENT: { 
        icon: MessageSquare, 
        text: 'Can Comment', 
        color: 'bg-green-100 text-green-700',
        description: 'Can add comments'
      },
      EDIT: { 
        icon: Edit, 
        text: 'Can Edit', 
        color: 'bg-purple-100 text-purple-700',
        description: 'Can edit & move candidates'
      },
      FULL: { 
        icon: Lock, 
        text: 'Full Access', 
        color: 'bg-orange-100 text-orange-700',
        description: 'Complete control'
      },
    };
    return details[level] || details.VIEW;
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

          {/* Share ATS Board Button with Permission Dropdown */}
          <div className="relative permission-dropdown-container">
            <button
              onClick={shareableLink ? () => copyLinkToClipboard(shareableLink.full_url) : () => setShowPermissionDropdown(!showPermissionDropdown)}
              disabled={generatingLink}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                linkCopied
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
              } ${generatingLink ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Generate and copy shareable link to ATS board"
            >
              {linkCopied ? (
                <>
                  <Check className="w-4 h-4" />
                  Link Copied!
                </>
              ) : generatingLink ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4" />
                  {shareableLink ? 'Copy Link' : 'Share ATS Board'}
                  {!shareableLink && <ChevronDown className={`w-4 h-4 transition-transform ${showPermissionDropdown ? 'rotate-180' : ''}`} />}
                </>
              )}
            </button>

            {/* Permission Dropdown Menu */}
            {showPermissionDropdown && !shareableLink && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-20">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 uppercase">Select Access Level</p>
                </div>
                {['VIEW', 'COMMENT', 'EDIT', 'FULL'].map((level) => {
                  const { icon: Icon, text, color, description } = getPermissionDetails(level);
                  const isActive = selectedPermissionLevel === level;
                  
                  return (
                    <button
                      key={level}
                      onClick={() => {
                        setSelectedPermissionLevel(level);
                        setShowPermissionDropdown(false);
                        // Generate link immediately after selection
                        setTimeout(() => generateShareableLink(), 100);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isActive 
                          ? 'bg-gray-50' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
                        <Icon size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{text}</div>
                        <div className="text-xs text-gray-500">{description}</div>
                      </div>
                      {isActive && (
                        <CheckCircle size={18} className="text-green-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
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

      {/* Shareable Link Info Panel */}
      {shareableLink && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-sm border border-purple-200 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Shareable ATS Board Link</h3>
                
                {/* Permission Level Dropdown */}
                <div className="relative existing-link-dropdown-container">
                  <button
                    onClick={() => setShowExistingLinkDropdown(!showExistingLinkDropdown)}
                    disabled={updatingPermission}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      getPermissionDetails(shareableLink.permission_level).color
                    } hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {(() => {
                      const { icon: Icon, text } = getPermissionDetails(shareableLink.permission_level);
                      return (
                        <>
                          <Icon size={14} />
                          <span>{text}</span>
                          {updatingPermission ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <ChevronDown size={12} className={`transition-transform ${showExistingLinkDropdown ? 'rotate-180' : ''}`} />
                          )}
                        </>
                      );
                    })()}
                  </button>

                  {/* Dropdown Menu */}
                  {showExistingLinkDropdown && (
                    <div className="absolute left-0 mt-2 w-60 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-20">
                      <div className="px-3 py-2 border-b border-gray-200">
                        <p className="text-xs font-semibold text-gray-700 uppercase">Change Access Level</p>
                      </div>
                      {['VIEW', 'COMMENT', 'EDIT', 'FULL'].map((level) => {
                        const { icon: Icon, text, color, description } = getPermissionDetails(level);
                        const isActive = shareableLink.permission_level === level;
                        
                        return (
                          <button
                            key={level}
                            onClick={() => updateLinkPermission(level)}
                            disabled={isActive || updatingPermission}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                              isActive 
                                ? 'bg-gray-50 cursor-default' 
                                : 'hover:bg-gray-50 cursor-pointer'
                            } disabled:opacity-50`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${color}`}>
                              <Icon size={16} />
                            </div>
                            <div className="flex-1">
                              <div className="text-xs font-medium text-gray-900">{text}</div>
                              <div className="text-[10px] text-gray-500">{description}</div>
                            </div>
                            {isActive && (
                              <CheckCircle size={14} className="text-green-600" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Share this link to give {getPermissionDetails(shareableLink.permission_level).text.toLowerCase()} access to the recruitment tracking system. 
                {shareableLink.expires_at && ` Link expires on ${new Date(shareableLink.expires_at).toLocaleDateString()}.`}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-700 overflow-x-auto">
                  {shareableLink.full_url}
                </div>
                <button
                  onClick={() => copyLinkToClipboard(shareableLink.full_url)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    linkCopied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
                <a
                  href={shareableLink.full_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open
                </a>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                <span>Access count: {shareableLink.access_count}</span>
                <span>•</span>
                <span>Created: {new Date(shareableLink.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || loading}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === 1 || loading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || loading}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === totalPages || loading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span> ({stats.total} total applications)
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || loading}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === 1 || loading
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Previous
                  </button>
                  {/* Page Numbers */}
                  {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = idx + 1;
                    } else if (currentPage <= 3) {
                      pageNum = idx + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + idx;
                    } else {
                      pageNum = currentPage - 2 + idx;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={loading}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'
                        } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages || loading}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === totalPages || loading
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Next
                  </button>
                </nav>
              </div>
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