'use client';

import { useEffect, useState } from 'react';
import {
  Search,
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  Bookmark,
  BookmarkCheck,
  Building2,
  Users,
  Briefcase,
  GraduationCap,
  Globe,
  Heart,
  ExternalLink,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { applyToJob, listJobs } from '../../api/jobs.js';
import { FormattedJobDescription } from '../../lib/utils';
import { studentsAPI } from '../../api/students';

export default function JobPostings() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');

  const [savedJobs, setSavedJobs] = useState(new Set());
  const [isApplying, setIsApplying] = useState(false);
  const [freezeStatus, setFreezeStatus] = useState(null);
  const [jobEligibility, setJobEligibility] = useState(new Map());
  const [appliedJobs, setAppliedJobs] = useState(new Set());
  
  // Mobile view state
  const [isMobileView, setIsMobileView] = useState(false);
  const [showJobDetails, setShowJobDetails] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    per_page: 10,
    has_next: false,
    has_previous: false
  });
  const [isLoading, setIsLoading] = useState(false);

  // Function to fetch jobs with current filters and pagination
  const fetchJobs = async (page = 1) => {
    setIsLoading(true);
    try {
      const params = {
        page: page,
        per_page: 10,
        search: searchTerm,
        job_type: jobTypeFilter,
        location: locationFilter
      };

      const res = await listJobs(params);
      
      // Extract jobs from paginated response structure
      let jobsData = [];
      if (res.data && res.data.data && Array.isArray(res.data.data)) {
        jobsData = res.data.data;
        // Backend sometimes returns incorrect total_pages, so we calculate it correctly
        const originalPagination = res.data.pagination;
        const correctedTotalPages = Math.ceil(originalPagination.total_count / originalPagination.per_page);
        
        const correctedPagination = {
          ...originalPagination,
          total_pages: correctedTotalPages,
          has_next: originalPagination.current_page < correctedTotalPages,
          has_previous: originalPagination.current_page > 1
        };
        setPagination(correctedPagination);
      } else if (Array.isArray(res.data)) {
        jobsData = res.data;
        console.log('No pagination data in response');
      }
      
      setJobs(jobsData);
      setCurrentPage(page);
      
      // Auto-select first job if available and no job is currently selected
      if (jobsData.length > 0 && !selectedJob) {
        console.log('First job data:', jobsData[0]);
        console.log('Requirements field:', {
          value: jobsData[0].requirements,
          type: typeof jobsData[0].requirements,
          isArray: Array.isArray(jobsData[0].requirements)
        });
        console.log('Additional fields:', jobsData[0].additional_fields);
        console.log('Interview rounds:', jobsData[0].interview_rounds);
        setSelectedJob(jobsData[0]);
      }
      
    } catch (err) {
      console.error('Failed to load jobs:', err);
      setJobs([]);
      setPagination({
        current_page: 1,
        total_pages: 1,
        total_count: 0,
        per_page: 10,
        has_next: false,
        has_previous: false
      });
    } finally {
      setIsLoading(false);
    }
  };

// Removed modal application form state - now using dedicated page

  // Check freeze status and job eligibility
  const checkFreezeStatus = async () => {
    try {
      const status = await studentsAPI.getFreezeStatus();
      setFreezeStatus(status);
    } catch (err) {
      console.error('Failed to fetch freeze status:', err);
      // If user doesn't have student profile, set a default status
      if (err.response?.status === 400 || err.response?.status === 404) {
        setFreezeStatus({
          freeze_status: 'none',
          freeze_reason: null
        });
      }
    }
  };

  // Fetch applied jobs
  const fetchAppliedJobs = async () => {
    try {
      const appliedJobsData = await studentsAPI.getAppliedJobs();
      // Extract job IDs from the applied jobs data
      const appliedJobIds = new Set();
      if (appliedJobsData && appliedJobsData.results) {
        appliedJobsData.results.forEach(application => {
          if (application.job && application.job.id) {
            appliedJobIds.add(application.job.id);
          }
        });
      }
      setAppliedJobs(appliedJobIds);
    } catch (err) {
      console.error('Failed to fetch applied jobs:', err);
      // If error, assume no applied jobs
      setAppliedJobs(new Set());
    }
  };

  const checkJobEligibility = async (jobId) => {
    try {
      const eligibility = await studentsAPI.canApplyToJob(jobId);
      setJobEligibility(prev => new Map(prev.set(jobId, eligibility)));
      return eligibility;
    } catch (err) {
      console.error('Failed to check job eligibility:', err);

      // Handle specific error cases
      if (err.response?.status === 400 && err.response?.data?.reason) {
        // User doesn't have student profile - return error state
        const errorEligibility = {
          can_apply: false,
          reason: err.response.data.reason
        };
        setJobEligibility(prev => new Map(prev.set(jobId, errorEligibility)));
        return errorEligibility;
      }

      // For other errors, default to allowing application
      return { can_apply: true };
    }
  };

  // Helper function to check if a job has restrictions
  const hasJobRestrictions = (jobId) => {
    const eligibility = jobEligibility.get(jobId);
    return eligibility && !eligibility.can_apply;
  };

  // Helper function to get restriction message
  const getRestrictionMessage = (jobId) => {
    const eligibility = jobEligibility.get(jobId);
    if (eligibility && !eligibility.can_apply) {
      return eligibility.reason || 'You have restrictions for this job';
    }
    return null;
  };

  // Helper function to check if already applied to a job
  const hasAppliedToJob = (jobId) => {
    return appliedJobs.has(jobId);
  };

  // Helper function to get apply button text and state
  const getApplyButtonState = (jobId) => {
    if (hasAppliedToJob(jobId)) {
      return {
        text: 'Already Applied',
        disabled: true,
        className: 'px-6 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed',
        reason: 'You have already applied to this job'
      };
    }

    const eligibility = jobEligibility.get(jobId);
    if (eligibility && !eligibility.can_apply) {
      return {
        text: 'Cannot Apply',
        disabled: true,
        className: 'px-6 py-2 bg-red-400 text-white rounded-lg cursor-not-allowed',
        reason: eligibility.reason
      };
    }

    return {
      text: isApplying ? 'Applying...' : 'Apply Now',
      disabled: isApplying,
      className: 'px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium',
      reason: null
    };
  };

  const applyJob = async () => {
    // If no job is selected, return early
    if (!selectedJob) return;

    // Check if already applied
    if (hasAppliedToJob(selectedJob.id)) {
      alert('You have already applied to this job.');
      return;
    }

    // Check eligibility before navigating
    const eligibility = await checkJobEligibility(selectedJob.id);

    if (!eligibility.can_apply) {
      // Show a brief message and still navigate to let the application page handle the detailed error
      alert('You have restrictions that may prevent you from applying to this job. Please check the application page for details.');
    }

    // Navigate to the dedicated application page
    window.location.href = `/jobpostings/${selectedJob.id}/apply`;
  };

// Removed modal application form handlers - now using dedicated page


  // Initial load
  useEffect(() => {
    fetchJobs(1);
    checkFreezeStatus();
    fetchAppliedJobs();

    // Load saved jobs from localStorage
    const saved = localStorage.getItem('savedJobs');
    if (saved) {
      setSavedJobs(new Set(JSON.parse(saved)));
    }
  }, []);

  // Refresh applied jobs when page becomes visible (e.g., returning from application page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchAppliedJobs();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage === 1) {
        fetchJobs(1);
      } else {
        setCurrentPage(1);
        fetchJobs(1);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm, jobTypeFilter, locationFilter]);

  // Check for mobile view on mount and resize
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  // Stats based on pagination data
  const jobsArray = Array.isArray(jobs) ? jobs : [];
  
  // Pagination is working correctly now
  
  const stats = {
    total: pagination.total_count,
    internships: jobsArray.filter(job => job.job_type === 'INTERNSHIP').length,
    fullTime: jobsArray.filter(job => job.job_type === 'FULL_TIME').length,
    remote: jobsArray.filter(job => (job.location || '').toLowerCase().includes('remote')).length,
  };

  // Use jobs directly since filtering is done server-side
  const filteredJobs = jobsArray;

  const toggleSaveJob = (jobId) => {
    const newSavedJobs = new Set(savedJobs);
    if (newSavedJobs.has(jobId)) {
      newSavedJobs.delete(jobId);
    } else {
      newSavedJobs.add(jobId);
    }
    setSavedJobs(newSavedJobs);
    localStorage.setItem('savedJobs', JSON.stringify([...newSavedJobs]));
  };

  // Mobile-specific functions
  const handleJobSelect = (job) => {
    setSelectedJob(job);
    if (isMobileView) {
      setShowJobDetails(true);
    }
  };

  const handleBackToList = () => {
    setShowJobDetails(false);
  };

  return (
    <>
      {/* Header with stats */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Discover Jobs</h1>
            <p className="text-sm text-gray-600">Find your next opportunity from top companies</p>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Briefcase className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500">Total Jobs</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <GraduationCap className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{stats.internships}</p>
                <p className="text-xs text-gray-500">Internships</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Globe className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{stats.remote}</p>
                <p className="text-xs text-gray-500">Remote</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Heart className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{savedJobs.size}</p>
                <p className="text-xs text-gray-500">Saved</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[calc(100vh-240px)]">
        {/* Mobile Layout */}
        {isMobileView ? (
          <div className="h-full">
            {!showJobDetails ? (
              // Mobile Job List View
              <div className="h-full flex flex-col">
                {/* Mobile Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Jobs</h2>
                    <span className="text-sm text-gray-500">
                      {pagination.total_count > 0 
                        ? `${filteredJobs.length} of ${pagination.total_count} jobs` 
                        : `${filteredJobs.length} positions`}
                    </span>
                  </div>
                  
                  {/* Mobile Search and Filters */}
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search jobs, companies, skills..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={jobTypeFilter}
                        onChange={(e) => setJobTypeFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="ALL">All Types</option>
                        <option value="INTERNSHIP">Internships</option>
                        <option value="FULL_TIME">Full-time</option>
                        <option value="PART_TIME">Part-time</option>
                      </select>
                      <select
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="ALL">All Locations</option>
                        <option value="Remote">Remote</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Mobile Jobs List */}
                <div className="flex-1 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : filteredJobs.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {filteredJobs.map((job) => {
                        const isSaved = savedJobs.has(job.id);
                        return (
                          <div
                            key={job.id}
                            onClick={() => handleJobSelect(job)}
                            className="p-4 cursor-pointer transition-all duration-200 hover:bg-gray-50"
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    job.job_type === 'INTERNSHIP' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {job.job_type || "Type not specified"}
                                  </span>
                                  <h3 className="font-semibold text-base leading-tight mt-2">
                                    {job.title || "Title not available"}
                                  </h3>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSaveJob(job.id);
                                  }}
                                  className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                                >
                                  {isSaved ? (
                                    <BookmarkCheck className="w-5 h-5 text-blue-600" />
                                  ) : (
                                    <Bookmark className="w-5 h-5 text-gray-400" />
                                  )}
                                </button>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Building2 className="w-4 h-4" />
                                <span className="font-medium">{job.company_name || "N/A"}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  <span>{job.location || "N/A"}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-4 h-4" />
                                  <span>
                                    {job.salary_min && job.salary_max
                                      ? `$${job.salary_min} - $${job.salary_max}`
                                      : "Salary not specified"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                      <Search className="w-12 h-12 mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No jobs found</p>
                      <p className="text-sm text-center">Try adjusting your search or filters</p>
                    </div>
                  )}
                </div>
                
                {/* Mobile Pagination */}
                {pagination.total_pages > 1 && (
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Showing {((currentPage - 1) * pagination.per_page) + 1} to {Math.min(currentPage * pagination.per_page, pagination.total_count)} of {pagination.total_count} jobs
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => fetchJobs(currentPage - 1)}
                          disabled={!pagination.has_previous || isLoading}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-600">
                          {currentPage} of {pagination.total_pages}
                        </span>
                        <button
                          onClick={() => fetchJobs(currentPage + 1)}
                          disabled={!pagination.has_next || isLoading}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Mobile Job Details View
              <div className="h-full flex flex-col">
                {/* Mobile Job Details Header */}
                <div className="p-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={handleBackToList}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Jobs
                    </button>
                    <button
                      onClick={() => toggleSaveJob(selectedJob.id)}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        savedJobs.has(selectedJob.id)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {savedJobs.has(selectedJob.id) ? 'Saved' : 'Save'}
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <h1 className="text-xl font-bold text-gray-900 mb-2">
                      {selectedJob.title || "Title not available"}
                    </h1>
                    <div className="flex items-center gap-3 text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span className="font-semibold">{selectedJob.company_name || "Company not available"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedJob.job_type === 'INTERNSHIP' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {selectedJob.job_type || "Type not specified"}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {selectedJob && (() => {
                      const buttonState = getApplyButtonState(selectedJob.id);
                      const showWarning = (freezeStatus && freezeStatus.freeze_status !== 'none') ||
                                         hasAppliedToJob(selectedJob.id) ||
                                         (buttonState.reason && !hasAppliedToJob(selectedJob.id));

                      return (
                        <>
                          {showWarning && (
                            <div className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
                              hasAppliedToJob(selectedJob.id)
                                ? 'text-green-600 bg-green-50'
                                : buttonState.reason
                                  ? 'text-red-600 bg-red-50'
                                  : 'text-amber-600 bg-amber-50'
                            }`}>
                              <AlertCircle className="w-4 h-4" />
                              <span>
                                {hasAppliedToJob(selectedJob.id)
                                  ? 'You have already applied to this job'
                                  : buttonState.reason || 'Account restrictions may apply'
                                }
                              </span>
                            </div>
                          )}
                          <button
                            onClick={applyJob}
                            className={`w-full px-6 py-3 rounded-lg transition-colors font-medium ${
                              buttonState.className.replace('px-6 py-2', 'px-6 py-3')
                            }`}
                            disabled={buttonState.disabled}
                          >
                            {buttonState.text}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>
                
                {/* Mobile Job Details Content */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-6">
                    {/* Key Information Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-3 h-3 text-green-600" />
                          <h3 className="font-semibold text-gray-900 text-sm">Salary</h3>
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {selectedJob.salary_min && selectedJob.salary_max
                            ? `$${selectedJob.salary_min} - $${selectedJob.salary_max}`
                            : "Salary not specified"}
                        </p>
                        <p className="text-xs text-gray-500">per {selectedJob.per_unit || "N/A"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-3 h-3 text-red-600" />
                          <h3 className="font-semibold text-gray-900 text-sm">Location</h3>
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {selectedJob.location || "Not specified"}
                        </p>
                      </div>
                    </div>
                    
                    {/* Job Description */}
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-3">Job Description</h3>
                      <FormattedJobDescription 
                        description={selectedJob.description} 
                        className="text-sm"
                      />
                    </div>
                    
                    {/* Requirements */}
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-3">Requirements</h3>
                      <div className="text-sm text-gray-700">
                        {selectedJob.requirements ? (
                          typeof selectedJob.requirements === 'string' ? (
                            <ul className="space-y-2">
                              {selectedJob.requirements.split(',').map((req, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <span>{req.trim()}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p>{String(selectedJob.requirements)}</p>
                          )
                        ) : (
                          <p>No requirements specified.</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Skills */}
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-3">Required Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedJob.requirements && typeof selectedJob.requirements === 'string' ? (
                          selectedJob.requirements.split(',').map((skill, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                            >
                              {skill.trim()}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">No skills specified.</span>
                        )}
                      </div>
                    </div>

                    {/* Interview Process */}
                    {selectedJob.interview_rounds && selectedJob.interview_rounds.length > 0 && (
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 mb-3">Interview Process</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="space-y-3">
                            {selectedJob.interview_rounds.map((round, index) => (
                              <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{round.name}</p>
                                    {round.date && (
                                      <p className="text-sm text-gray-600">
                                        {new Date(round.date).toLocaleDateString()}
                                        {round.time && ` at ${round.time}`}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500">
                                  Round {index + 1}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Additional Requirements - Preview Form */}
                    {selectedJob.additional_fields && selectedJob.additional_fields.length > 0 && (
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 mb-3">Additional Application Fields</h3>
                        <p className="text-sm text-gray-600 mb-4">These fields will be required when applying for this position.</p>
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                          <div className="space-y-4">
                            {selectedJob.additional_fields.map((field, index) => {
                              const renderField = () => {
                                switch (field.type) {
                                  case 'text':
                                    return (
                                      <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-gray-900">
                                          {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </label>
                                        <input
                                          type="text"
                                          placeholder={`Enter ${field.label.toLowerCase()}`}
                                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                          disabled
                                        />
                                      </div>
                                    );
                                  
                                  case 'number':
                                    return (
                                      <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-gray-900">
                                          {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </label>
                                        <input
                                          type="number"
                                          placeholder="e.g., 5"
                                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                          disabled
                                        />
                                      </div>
                                    );
                                  
                                  case 'file':
                                    return (
                                      <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-gray-900">
                                          {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </label>
                                        <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 border-dashed">
                                          <div className="flex items-center justify-center text-gray-500">
                                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            <span className="text-sm font-medium">Upload {field.label.toLowerCase()}</span>
                                          </div>
                                          <div className="text-center mt-2">
                                            <span className="text-xs text-gray-400">No file chosen</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  
                                  case 'multiple_choice':
                                    return (
                                      <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-gray-900">
                                          {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </label>
                                        <select
                                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                          disabled
                                        >
                                          <option value="">Select {field.label.toLowerCase()}</option>
                                          {field.options?.map((option, optIndex) => (
                                            <option key={optIndex} value={option}>
                                              {option}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    );
                                  
                                  case 'textarea':
                                    return (
                                      <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-gray-900">
                                          {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </label>
                                        <textarea
                                          rows={4}
                                          placeholder={`Enter ${field.label.toLowerCase()}`}
                                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                                          disabled
                                        />
                                      </div>
                                    );
                                  
                                  default:
                                    return (
                                      <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-gray-900">
                                          {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </label>
                                        <input
                                          type="text"
                                          placeholder="Unknown field type"
                                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 opacity-50 cursor-not-allowed text-sm"
                                          disabled
                                        />
                                      </div>
                                    );
                                }
                              };

                              return (
                                <div key={field.id || index} className="bg-gray-50 rounded-lg p-4">
                                  {renderField()}
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-blue-900 mb-1">Preview Mode</p>
                                <p className="text-sm text-blue-800 leading-relaxed">These are preview fields. You'll be able to fill them out when you apply for this position.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Desktop Layout (existing code)
          <div className="flex h-full">
            {/* Jobs List */}
            <div className="w-2/5 border-r border-gray-200 flex flex-col">
              {/* Search and Filter Header */}
              <div className="p-3 border-b border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Jobs</h2>
                  <span className="text-sm text-gray-500">
                    {pagination.total_count > 0 
                      ? `${filteredJobs.length} of ${pagination.total_count} jobs` 
                      : `${filteredJobs.length} positions`}
                  </span>
                </div>
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search jobs, companies, skills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                {/* Filters */}
                <div className="flex gap-2">
                  <select
                    value={jobTypeFilter}
                    onChange={(e) => setJobTypeFilter(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="ALL">All Types</option>
                    <option value="INTERNSHIP">Internships</option>
                    <option value="FULL_TIME">Full-time</option>
                    <option value="PART_TIME">Part-time</option>
                  </select>
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="ALL">All Locations</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>
              </div>
              {/* Jobs List */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : filteredJobs.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {filteredJobs.map((job) => {
                      const isSelected = job.id === selectedJob?.id;
                      const isSaved = savedJobs.has(job.id);
                      return (
                        <div
                          key={job.id}
                          onClick={() => handleJobSelect(job)}
                          className={`p-3 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                            isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  job.job_type === 'INTERNSHIP' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {job.job_type || "Type not specified"}
                                </span>
                                <h3 className={`font-semibold text-sm leading-tight ${
                                  isSelected ? 'text-blue-900' : 'text-gray-900'
                                }`}>
                                  {job.title || "Title not available"}
                                </h3>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSaveJob(job.id);
                                }}
                                className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                              >
                                {isSaved ? (
                                  <BookmarkCheck className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Bookmark className="w-4 h-4 text-gray-400" />
                                )}
                              </button>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Building2 className="w-3 h-3" />
                              <span className="font-medium">{job.company_name || "N/A"}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  <span>{job.location || "N/A"}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  <span>
                                    {job.salary_min && job.salary_max
                                      ? `$${job.salary_min} - $${job.salary_max}`
                                      : "Salary not specified"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>—</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <Search className="w-12 h-12 mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No jobs found</p>
                    <p className="text-sm">Try adjusting your search or filters</p>
                  </div>
                )}
              </div>
              
              {/* Pagination Controls */}
              {pagination.total_pages > 1 && (
                <div className="p-4 border-t border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Showing {((currentPage - 1) * pagination.per_page) + 1} to {Math.min(currentPage * pagination.per_page, pagination.total_count)} of {pagination.total_count} jobs
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchJobs(currentPage - 1)}
                        disabled={!pagination.has_previous || isLoading}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {/* Show page numbers */}
                        {Array.from({ length: Math.min(pagination.total_pages, 5) }, (_, i) => {
                          let pageNum;
                          if (pagination.total_pages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= pagination.total_pages - 2) {
                            pageNum = pagination.total_pages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => fetchJobs(pageNum)}
                              disabled={isLoading}
                              className={`px-3 py-1 text-sm border rounded-md ${
                                pageNum === currentPage
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-300 hover:bg-gray-100'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => fetchJobs(currentPage + 1)}
                        disabled={!pagination.has_next || isLoading}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Job Details */}
            <div className="flex-1 flex flex-col">
              {selectedJob ? (
                <>
                  {/* Job Header */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h1 className="text-xl font-bold text-gray-900 mb-1">
                          {selectedJob.title || "Title not available"}
                        </h1>
                        <div className="flex items-center gap-4 text-gray-600 mb-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span className="font-semibold">{selectedJob.company_name || "Company not available"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{selectedJob.location || "Location not available"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            selectedJob.job_type === 'INTERNSHIP' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {selectedJob.job_type || "Type not specified"}
                          </span>
                          {/* Placeholders for more tags */}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {selectedJob && (() => {
                          const buttonState = getApplyButtonState(selectedJob.id);
                          const showWarning = (freezeStatus && freezeStatus.freeze_status !== 'none') ||
                                             hasAppliedToJob(selectedJob.id) ||
                                             (buttonState.reason && !hasAppliedToJob(selectedJob.id));

                          return (
                            <>
                              {showWarning && (
                                <div className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
                                  hasAppliedToJob(selectedJob.id)
                                    ? 'text-green-600 bg-green-50'
                                    : buttonState.reason
                                      ? 'text-red-600 bg-red-50'
                                      : 'text-amber-600 bg-amber-50'
                                }`}>
                                  <AlertCircle className="w-4 h-4" />
                                  <span>
                                    {hasAppliedToJob(selectedJob.id)
                                      ? 'You have already applied to this job'
                                      : buttonState.reason || 'Account restrictions may apply'
                                    }
                                  </span>
                                </div>
                              )}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => toggleSaveJob(selectedJob.id)}
                                  className={`px-4 py-2 rounded-lg border transition-colors ${
                                    savedJobs.has(selectedJob.id)
                                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                                      : 'border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {savedJobs.has(selectedJob.id) ? 'Saved' : 'Save'}
                                </button>
                                <button
                                  onClick={applyJob}
                                  className={buttonState.className}
                                  disabled={buttonState.disabled}
                                >
                                  {buttonState.text}
                                </button>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Job Content */}
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-4">
                      {/* Key Information Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-3 h-3 text-green-600" />
                            <h3 className="font-semibold text-gray-900 text-sm">Salary</h3>
                          </div>
                          <p className="text-sm font-bold text-gray-900">
                            {selectedJob.salary_min && selectedJob.salary_max
                              ? `$${selectedJob.salary_min} - $${selectedJob.salary_max}`
                              : "Salary not specified"}
                          </p>
                          <p className="text-xs text-gray-500">per {selectedJob.per_unit || "N/A"}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-3 h-3 text-red-600" />
                            <h3 className="font-semibold text-gray-900 text-sm">Deadline</h3>
                          </div>
                          <p className="text-sm font-bold text-gray-900">
                            {selectedJob.application_deadline
                              ? new Date(selectedJob.application_deadline).toLocaleDateString()
                              : "No deadline specified"}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-3 h-3 text-blue-600" />
                            <h3 className="font-semibold text-gray-900 text-sm">Duration</h3>
                          </div>
                          <p className="text-sm font-bold text-gray-900">
                            {selectedJob.duration || "Not specified"}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="w-3 h-3 text-purple-600" />
                            <h3 className="font-semibold text-gray-900 text-sm">Company Size</h3>
                          </div>
                          <p className="text-sm font-bold text-gray-900">
                            {"N/A"}
                          </p>
                        </div>
                      </div>
                      {/* Job Description */}
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 mb-2">Job Description</h3>
                        <FormattedJobDescription 
                          description={selectedJob.description} 
                          className="text-sm"
                        />
                      </div>
                      {/* Requirements */}
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 mb-2">Requirements</h3>
                        <div className="text-sm text-gray-700">
                          {selectedJob.requirements ? (
                            typeof selectedJob.requirements === 'string' ? (
                              <ul className="space-y-1">
                                {selectedJob.requirements.split(',').map((req, index) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    <span>{req.trim()}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p>{String(selectedJob.requirements)}</p>
                            )
                          ) : (
                            <p>No requirements specified.</p>
                          )}
                        </div>
                      </div>
                      {/* Skills */}
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 mb-2">Required Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.requirements && typeof selectedJob.requirements === 'string' ? (
                            selectedJob.requirements.split(',').map((skill, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                              >
                                {skill.trim()}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">No skills specified.</span>
                          )}
                        </div>
                      </div>

                      {/* Interview Process */}
                      {selectedJob.interview_rounds && selectedJob.interview_rounds.length > 0 && (
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 mb-2">Interview Process</h3>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="space-y-3">
                              {selectedJob.interview_rounds.map((round, index) => (
                                <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                      <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">{round.name}</p>
                                      {round.date && (
                                        <p className="text-sm text-gray-600">
                                          {new Date(round.date).toLocaleDateString()}
                                          {round.time && ` at ${round.time}`}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Round {index + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Additional Requirements - Preview Form */}
                      {selectedJob.additional_fields && selectedJob.additional_fields.length > 0 && (
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 mb-2">Additional Application Fields</h3>
                          <p className="text-sm text-gray-600 mb-6">These fields will be required when applying for this position.</p>
                          <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="space-y-6">
                              {selectedJob.additional_fields.map((field, index) => {
                                const renderField = () => {
                                  switch (field.type) {
                                    case 'text':
                                      return (
                                        <div className="space-y-2">
                                          <label className="block text-sm font-semibold text-gray-900">
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                          </label>
                                          <input
                                            type="text"
                                            placeholder={`Enter ${field.label.toLowerCase()}`}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                          />
                                        </div>
                                      );
                                    
                                    case 'number':
                                      return (
                                        <div className="space-y-2">
                                          <label className="block text-sm font-semibold text-gray-900">
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                          </label>
                                          <input
                                            type="number"
                                            placeholder="e.g., 5"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                          />
                                        </div>
                                      );
                                    
                                    case 'file':
                                      return (
                                        <div className="space-y-2">
                                          <label className="block text-sm font-semibold text-gray-900">
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                          </label>
                                          <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 border-dashed">
                                            <div className="flex items-center justify-center text-gray-500">
                                              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                              </svg>
                                              <span className="text-sm font-medium">Upload {field.label.toLowerCase()}</span>
                                            </div>
                                            <div className="text-center mt-2">
                                              <span className="text-xs text-gray-400">No file chosen</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    
                                    case 'multiple_choice':
                                      return (
                                        <div className="space-y-2">
                                          <label className="block text-sm font-semibold text-gray-900">
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                          </label>
                                          <select
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                          >
                                            <option value="">Select {field.label.toLowerCase()}</option>
                                            {field.options?.map((option, optIndex) => (
                                              <option key={optIndex} value={option}>
                                                {option}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      );
                                    
                                    case 'textarea':
                                      return (
                                        <div className="space-y-2">
                                          <label className="block text-sm font-semibold text-gray-900">
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                          </label>
                                          <textarea
                                            rows={4}
                                            placeholder={`Enter ${field.label.toLowerCase()}`}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                                          />
                                        </div>
                                      );
                                    
                                    default:
                                      return (
                                        <div className="space-y-2">
                                          <label className="block text-sm font-semibold text-gray-900">
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                          </label>
                                          <input
                                            type="text"
                                            placeholder="Unknown field type"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 opacity-50 cursor-not-allowed text-sm"
                                          />
                                        </div>
                                      );
                                  }
                                };

                                return (
                                  <div key={field.id || index} className="bg-gray-50 rounded-lg p-4">
                                    {renderField()}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-blue-900 mb-1">Preview Mode</p>
                                  <p className="text-sm text-blue-800 leading-relaxed">These are preview fields. You'll be able to fill them out when you apply for this position.</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Briefcase className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Job</h3>
                    <p className="text-gray-600">Choose a position from the list to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

