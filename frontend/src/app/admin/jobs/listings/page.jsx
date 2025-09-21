'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconSearch, IconPlus } from '@tabler/icons-react';
import { listJobsAdmin, toggleJobPublish } from '../../../../api/jobs';
import { JobTable } from '../../../../components/jobs/JobTable';
import { JobFilters } from '../../../../components/jobs/JobFilters';
import { PaginatedList } from '../../../../components/common/PaginatedList';

export default function JobListingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobListings, setJobListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [publishedJobs, setPublishedJobs] = useState(0);
  const [unpublishedJobs, setUnpublishedJobs] = useState(0);
  const [internshipJobs, setInternshipJobs] = useState(0);
  const jobsPerPage = 20;

  // Get all params from URL or use defaults
  const currentPage = Number(searchParams.get('page')) || 1;
  const searchQuery = searchParams.get('search') || '';
  const typeFilter = searchParams.get('type') || 'All';
  const minCTC = searchParams.get('minCTC') || '';
  const maxCTC = searchParams.get('maxCTC') || '';
  const minStipend = searchParams.get('minStipend') || '';
  const maxStipend = searchParams.get('maxStipend') || '';
  const deadlineFilter = searchParams.get('deadline') || '';

  // Function to update URL with filters and pagination
  const updateFilters = ({
    page = currentPage,
    search = searchQuery,
    type = typeFilter,
    min_ctc = minCTC,
    max_ctc = maxCTC,
    min_stipend = minStipend,
    max_stipend = maxStipend,
    deadline = deadlineFilter
  }) => {
    const params = new URLSearchParams();
    
    // Only add parameters that have values
    if (page > 1) params.set('page', page);
    if (search) params.set('search', search);
    if (type !== 'All') params.set('type', type);
    if (min_ctc) params.set('minCTC', min_ctc);
    if (max_ctc) params.set('maxCTC', max_ctc);
    if (min_stipend) params.set('minStipend', min_stipend);
    if (max_stipend) params.set('maxStipend', max_stipend);
    if (deadline) params.set('deadline', deadline);

    router.push(`/admin/jobs/listings${params.toString() ? `?${params.toString()}` : ''}`);
  };

  // Fetch jobs from API
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        console.log('🔍 Admin listings: Fetching jobs with filters', {
          page: currentPage,
          search: searchQuery,
          type: typeFilter,
          minCTC,
          maxCTC,
          minStipend,
          maxStipend,
          deadline: deadlineFilter
        });
        
        // First get total counts with filters but without pagination
        const statsResponse = await listJobsAdmin({
          per_page: 1,
          page: 1,
          search: searchQuery,
          job_type: typeFilter !== 'All' ? typeFilter : undefined,
          salary_min: minCTC || undefined,
          salary_max: maxCTC || undefined,
          stipend_min: minStipend || undefined,
          stipend_max: maxStipend || undefined,
          deadline: deadlineFilter || undefined
        });
        
        // Extract total counts from pagination data
        const paginationData = statsResponse.data?.pagination || {};
        const totalCount = paginationData.total_count || 0;
        setTotalJobs(totalCount);
        setTotalPages(Math.ceil(totalCount / jobsPerPage));

        // Now get the current page of jobs with filters
        const jobsResponse = await listJobsAdmin({
          per_page: jobsPerPage,
          page: currentPage,
          search: searchQuery,
          job_type: typeFilter !== 'All' ? typeFilter : undefined,
          salary_min: minCTC || undefined,
          salary_max: maxCTC || undefined,
          stipend_min: minStipend || undefined,
          stipend_max: maxStipend || undefined,
          deadline: deadlineFilter || undefined
        });
        
        const jobsData = Array.isArray(jobsResponse.data?.data) ? jobsResponse.data.data : 
                        Array.isArray(jobsResponse.data) ? jobsResponse.data : [];

        // Transform jobs data to include company information
        const jobsWithCompanyInfo = jobsData.map(job => ({
          ...job,
          companyName: job.company_name,
          title: job.title,
          type: job.job_type,
          ctc: job.salary_max || 0,
          stipend: job.job_type === 'INTERNSHIP' ? (job.salary_max || 0) : 0,
          deadline: job.application_deadline
        }));

        // Update job type counts
        setPublishedJobs(jobsWithCompanyInfo.filter(job => job.is_published).length);
        setUnpublishedJobs(jobsWithCompanyInfo.filter(job => !job.is_published).length);
        setInternshipJobs(jobsWithCompanyInfo.filter(job => job.job_type === 'INTERNSHIP').length);

        setJobListings(jobsWithCompanyInfo);
        setError(null);
      } catch (err) {
        console.error('🚨 Admin listings: Failed to fetch jobs:', err);
        setError('Failed to load job listings. Please try again.');
        setJobListings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [currentPage, searchQuery, typeFilter, minCTC, maxCTC, minStipend, maxStipend, deadlineFilter]);

  const handleTogglePublish = async (jobId, currentStatus) => {
    try {
      await toggleJobPublish(jobId);
      
      // Refresh the job listings with same parameters
      const jobsResponse = await listJobsAdmin({
        per_page: jobsPerPage,
        page: currentPage,
        search: searchQuery,
        job_type: typeFilter !== 'All' ? typeFilter : undefined,
        salary_min: minCTC || undefined,
        salary_max: maxCTC || undefined,
        stipend_min: minStipend || undefined,
        stipend_max: maxStipend || undefined,
        deadline: deadlineFilter || undefined
      });
      
      const jobsData = Array.isArray(jobsResponse.data?.data) ? jobsResponse.data.data : 
                      Array.isArray(jobsResponse.data) ? jobsResponse.data : [];
      const jobsWithCompanyInfo = jobsData.map(job => ({
        ...job,
        companyName: job.company_name,
        title: job.title,
        type: job.job_type,
        ctc: job.salary_max || 0,
        stipend: job.job_type === 'INTERNSHIP' ? (job.salary_max || 0) : 0,
        deadline: job.application_deadline
      }));
      setJobListings(jobsWithCompanyInfo);
      
      const newStatus = !currentStatus;
      alert(`Job ${newStatus ? 'published' : 'unpublished'} successfully!`);
    } catch (error) {
      console.error('Error toggling job publish status:', error);
      alert('Failed to update job status. Please try again.');
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Job Listings</h1>
            <p className="text-gray-600">
              Showing {jobListings.length} jobs (Page {currentPage} of {totalPages}, Total: {totalJobs} jobs)
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/admin/jobs/companies')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              View Companies
            </button>
            <button
              onClick={() => router.push('/admin/jobs/create')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <IconPlus size={18} />
              Post New Job
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{totalJobs}</div>
            <div className="text-sm text-blue-700">Total Jobs</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{publishedJobs}</div>
            <div className="text-sm text-green-700">Published</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{unpublishedJobs}</div>
            <div className="text-sm text-yellow-700">To be Published</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{internshipJobs}</div>
            <div className="text-sm text-purple-700">Internships</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IconSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => updateFilters({ search: e.target.value, page: 1 })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filters */}
          <JobFilters
            typeFilter={typeFilter}
            setTypeFilter={(value) => updateFilters({ type: value, page: 1 })}
            minCTC={minCTC}
            setMinCTC={(value) => updateFilters({ min_ctc: value, page: 1 })}
            maxCTC={maxCTC}
            setMaxCTC={(value) => updateFilters({ max_ctc: value, page: 1 })}
            minStipend={minStipend}
            setMinStipend={(value) => updateFilters({ min_stipend: value, page: 1 })}
            maxStipend={maxStipend}
            setMaxStipend={(value) => updateFilters({ max_stipend: value, page: 1 })}
            deadlineFilter={deadlineFilter}
            setDeadlineFilter={(value) => updateFilters({ deadline: value, page: 1 })}
          />
        </div>

        {/* Job Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {jobListings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No job listings found</p>
              <p className="text-gray-400 mb-4">Try adjusting your search criteria or create a new job posting</p>
              <button
                onClick={() => router.push('/admin/jobs/create')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Post New Job
              </button>
            </div>
          ) : (
            <>
              <JobTable
                jobs={jobListings}
                onTogglePublish={handleTogglePublish}
              />
              
              {/* Pagination Controls */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => updateFilters({ page: Math.max(currentPage - 1, 1) })}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => updateFilters({ page: Math.min(currentPage + 1, totalPages) })}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400'
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
                      <span className="font-medium">{totalPages}</span> ({totalJobs} total jobs)
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => updateFilters({ page: Math.max(currentPage - 1, 1) })}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                          currentPage === 1
                            ? 'text-gray-300'
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
                            onClick={() => updateFilters({ page: pageNum })}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === pageNum
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => updateFilters({ page: Math.min(currentPage + 1, totalPages) })}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                          currentPage === totalPages
                            ? 'text-gray-300'
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 