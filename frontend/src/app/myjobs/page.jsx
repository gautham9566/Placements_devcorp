'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  MapPin,
  Building2,
  DollarSign,
  Target,
  TrendingUp,
  Eye,
  Search
} from "lucide-react";
import { listAppliedJobs, getJobById } from '../../api/jobs.js';
import { FormattedJobDescription } from '../../lib/utils';

const MyJobs = () => {
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [loading, setLoading] = useState(false);

  const fetchApplications = async (page = 1, status = 'ALL', search = '', sort = 'recent') => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: perPage,
      };
      
      // Add filtering parameters
      if (status !== 'ALL') params.status = status;
      if (search) params.company = search; // Backend filters by company name
      
      const res = await listAppliedJobs(params);
      
      let applicationsData = [];
      let paginationData = {};
      
      if (res.data && res.data.data && Array.isArray(res.data.data)) {
        applicationsData = res.data.data;
        paginationData = res.data.pagination || {};
      } else if (Array.isArray(res.data)) {
        applicationsData = res.data;
      }
      
      // Fetch complete job details for each application
      const applicationsWithJobDetails = await Promise.all(
        applicationsData.map(async (app) => {
          try {
            const jobRes = await getJobById(app.job);
            // Merge application data with complete job details
            return {
              ...app,
              jobDetails: jobRes.data
            };
          } catch (jobErr) {
            console.error(`Failed to fetch job details for job ${app.job}:`, jobErr);
            // Return application with existing data if job fetch fails
            return app;
          }
        })
      );
      
      console.log('Applications with job details:', applicationsWithJobDetails);
      setApplications(applicationsWithJobDetails);
      
      // Update pagination state
      setCurrentPage(paginationData.current_page || 1);
      setTotalPages(paginationData.total_pages || 1);
      setTotalCount(paginationData.total_count || 0);
      
      // Set selected application if not set or if current page changed
      if (!selectedApplication || page !== currentPage) {
        setSelectedApplication(applicationsWithJobDetails[0] || null);
      }
    } catch (err) {
      console.error('Failed to load applied jobs:', err);
      setApplications([]);
      setSelectedApplication(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications(currentPage, statusFilter, searchTerm, sortBy);
  }, []);

  const getStatusConfig = (status) => {
    const configs = {
      'APPLIED': {
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: <Clock className="w-4 h-4" />,
        bgIcon: 'bg-blue-100',
        textIcon: 'text-blue-600'
      },
      'UNDER REVIEW': {
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: <Eye className="w-4 h-4" />,
        bgIcon: 'bg-amber-100',
        textIcon: 'text-amber-600'
      },
      'INTERVIEW SCHEDULED': {
        color: 'bg-green-50 text-green-700 border-green-200',
        icon: <CheckCircle className="w-4 h-4" />,
        bgIcon: 'bg-green-100',
        textIcon: 'text-green-600'
      },
      'REJECTED': {
        color: 'bg-red-50 text-red-700 border-red-200',
        icon: <XCircle className="w-4 h-4" />,
        bgIcon: 'bg-red-100',
        textIcon: 'text-red-600'
      },
      'ACCEPTED': {
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <TrendingUp className="w-4 h-4" />,
        bgIcon: 'bg-emerald-100',
        textIcon: 'text-emerald-600'
      }
    };
    return configs[status] || configs['APPLIED'];
  };

  // Pagination handlers
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      fetchApplications(page, statusFilter, searchTerm, sortBy);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  // Filter and sort handlers
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when filtering
    fetchApplications(1, status, searchTerm, sortBy);
  };

  const handleSearchChange = (search) => {
    setSearchTerm(search);
    setCurrentPage(1); // Reset to first page when searching
    fetchApplications(1, statusFilter, search, sortBy);
  };

  const handleSortChange = (sort) => {
    setSortBy(sort);
    // Note: Sorting is done on frontend since backend doesn't support sort parameter
    // We could refetch if backend supported sorting
  };

  // Ensure applications is always an array
  const applicationsArray = Array.isArray(applications) ? applications : [];

  // Apply frontend sorting (backend handles filtering)
  const sortedApplications = [...applicationsArray].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.applied_at) - new Date(a.applied_at);
    } else if (sortBy === 'company') {
      const aCompany = a.jobDetails?.employer_name || a.employer_name || a.company_name || '';
      const bCompany = b.jobDetails?.employer_name || b.employer_name || b.company_name || '';
      return aCompany.localeCompare(bCompany);
    } else if (sortBy === 'status') {
      return (a.status || '').localeCompare(b.status || '');
    }
    return 0;
  });

  // For stats, we need total count from pagination since we only have current page data
  const stats = {
    total: totalCount, // Use total count from pagination
    pending: applicationsArray.filter(app => app.status === 'APPLIED' || app.status === 'UNDER REVIEW').length,
    interviews: applicationsArray.filter(app => app.status === 'INTERVIEW SCHEDULED').length,
    rejected: applicationsArray.filter(app => app.status === 'REJECTED').length,
  };

  return (
    <>
      {/* Compact Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Job Applications</h1>
            <p className="text-sm text-gray-600">Track and manage your job applications</p>
          </div>
          {/* Inline Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{stats.pending}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{stats.interviews}</p>
                <p className="text-xs text-gray-500">Interviews</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{stats.total > 0 ? Math.round(((stats.total - stats.rejected) / stats.total) * 100) : 0}%</p>
                <p className="text-xs text-gray-500">Response Rate</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[calc(100vh-240px)]">
        <div className="flex h-full">
          {/* Applications List */}
          <div className="w-2/5 border-r border-gray-200 flex flex-col">
            {/* Compact Search and Filter Header */}
            <div className="p-3 border-b border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Applications</h2>
                <span className="text-sm text-gray-500">{sortedApplications.length} of {totalCount}</span>
              </div>
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              {/* Filters */}
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="ALL">All Status</option>
                  <option value="APPLIED">Applied</option>
                  <option value="UNDER REVIEW">Under Review</option>
                  <option value="INTERVIEW SCHEDULED">Interview</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="ACCEPTED">Accepted</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="recent">Recent First</option>
                  <option value="company">Company A-Z</option>
                  <option value="status">Status</option>
                </select>
              </div>
            </div>
            {/* Applications List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-500">Loading applications...</p>
                </div>
              ) : sortedApplications.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {sortedApplications.map((app) => {
                    const statusConfig = getStatusConfig(app.status);
                    const isSelected = app.id === selectedApplication?.id;
                    return (
                      <div
                        key={app.id}
                        onClick={() => setSelectedApplication(app)}
                        className={`p-3 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''}`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <h3 className={`font-semibold text-sm leading-tight ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                              {app.jobDetails?.title || app.job_title || app.title || "Title not available"}
                            </h3>
                            <div className={`p-1 rounded-full ${statusConfig.bgIcon}`}>
                              <div className={statusConfig.textIcon}>{statusConfig.icon}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Building2 className="w-3 h-3" />
                            <span className="font-medium">{app.jobDetails?.employer_name || app.employer_name || app.company_name || "N/A"}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>{app.jobDetails?.location || app.location || app.job_location || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{app.applied_at ? new Date(app.applied_at).toLocaleDateString() : "—"}</span>
                            </div>
                          </div>
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                            {statusConfig.icon}
                            <span>{app.status}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
                  <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Page {currentPage} of {totalPages} ({totalCount} total applications)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage === 1 || loading}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            disabled={loading}
                            className={`px-3 py-1 text-sm border rounded-md ${
                              pageNum === currentPage
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-gray-300 hover:bg-gray-50'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages || loading}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Application Details */}
          <div className="flex-1 flex flex-col">
            {selectedApplication ? (
              <>
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        {selectedApplication.jobDetails?.title || selectedApplication.job_title || selectedApplication.title || "Title not available"}
                      </h1>
                      <div className="flex items-center gap-4 text-gray-600">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-5 h-5" />
                          <span className="font-medium">{selectedApplication.jobDetails?.employer_name || selectedApplication.employer_name || selectedApplication.company_name || "Company not available"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5" />
                          <span>{selectedApplication.jobDetails?.location || selectedApplication.location || selectedApplication.job_location || "Location not available"}</span>
                        </div>
                      </div>
                    </div>
                      <div className={`px-4 py-2 rounded-full text-sm font-medium border flex items-center gap-2 ${getStatusConfig(selectedApplication.status).color}`}>
                        {getStatusConfig(selectedApplication.status).icon}
                        <span>{selectedApplication.status}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900">Salary</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {selectedApplication.jobDetails?.salary_min && selectedApplication.jobDetails?.salary_max
                            ? `$${selectedApplication.jobDetails.salary_min} - $${selectedApplication.jobDetails.salary_max}`
                            : "Not disclosed"}
                        </span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900">Applied</span>
                        </div>
                        <span className="text-sm text-gray-600">{selectedApplication.applied_at ? new Date(selectedApplication.applied_at).toLocaleDateString() : "—"}</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900">Deadline</span>
                        </div>
                        <span className="text-sm text-gray-600">Not specified</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <Target className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900">Type</span>
                        </div>
                        <span className="text-sm text-gray-600">{selectedApplication.jobDetails?.job_type || selectedApplication.job_type || "Not specified"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 p-6 overflow-y-auto">
                    <div className="space-y-6">
                      {/* Description */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Description</h3>
                        <div className="prose prose-sm max-w-none">
                          <FormattedJobDescription 
                            description={selectedApplication.jobDetails?.description} 
                            className=""
                          />
                        </div>
                      </div>
                      {/* Requirements */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Requirements</h3>
                        <div className="space-y-2 text-gray-700">
                          {selectedApplication.jobDetails?.requirements ? (
                            <div dangerouslySetInnerHTML={{ __html: selectedApplication.jobDetails.requirements }} />
                          ) : (
                            <span>No requirements specified.</span>
                          )}
                        </div>
                      </div>
                      {/* Application Timeline */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Application Timeline</h3>
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Application Submitted</p>
                              <p className="text-sm text-gray-500">{selectedApplication.applied_at ? new Date(selectedApplication.applied_at).toLocaleDateString() : "—"}</p>
                            </div>
                          </div>
                          {selectedApplication.status !== 'APPLIED' && (
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                                <Eye className="w-5 h-5 text-amber-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">Under Review</p>
                                <p className="text-sm text-gray-500">Application is being reviewed by the hiring team</p>
                              </div>
                            </div>
                          )}
                          {selectedApplication.status === 'INTERVIEW SCHEDULED' && (
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">Interview Scheduled</p>
                                <p className="text-sm text-gray-500">You have been invited for an interview</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Eye className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select an application</h3>
                <p className="text-gray-500">Choose an application from the list to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MyJobs;
