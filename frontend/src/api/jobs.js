import client from './client';

// List all jobs with pagination and filtering
export function listJobs(params = {}) {
  const queryParams = new URLSearchParams();
  
  // Add pagination parameters
  if (params.page) queryParams.append('page', params.page);
  if (params.per_page) queryParams.append('per_page', params.per_page);
  
  // Add filtering parameters
  if (params.job_type && params.job_type !== 'ALL') queryParams.append('job_type', params.job_type);
  if (params.location && params.location !== 'ALL') queryParams.append('location', params.location);
  if (params.salary_min) queryParams.append('salary_min', params.salary_min);
  if (params.search) queryParams.append('search', params.search);
  
  const queryString = queryParams.toString();
  const url = `/api/v1/college/default-college/jobs/${queryString ? `?${queryString}` : ''}`;
  
  return client.get(url);
}

// Apply to a job
export function applyToJob(job, coverLetter, additionalFields = {}) {
  // Check if any additional fields contain files
  const hasFiles = Object.values(additionalFields).some(value => value instanceof File);

  if (hasFiles) {
    // Use FormData for file uploads
    const formData = new FormData();
    formData.append('cover_letter', coverLetter);

    // Handle additional fields with files
    Object.entries(additionalFields).forEach(([key, value]) => {
      if (value instanceof File) {
        formData.append(key, value);
      } else {
        formData.append(key, JSON.stringify(value));
      }
    });

    return client.post(`/api/v1/college/default-college/jobs/${job}/apply/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  } else {
    // Use JSON for non-file submissions
    return client.post(`/api/v1/college/default-college/jobs/${job}/apply/`, {
      cover_letter: coverLetter,
      additional_field_responses: additionalFields
    });
  }
}

// Get job details by ID
export function getJobById(jobId) {
  return client.get(`/api/v1/college/default-college/jobs/${jobId}/`);
}

// List jobs the current student has applied to
export function listAppliedJobs() {
  return client.get('/api/v1/college/default-college/jobs/applied/');
}

// Admin API functions for managing jobs

// Note: Company management functions moved to /api/companies.js to avoid conflicts

// Create a new job posting
export function createJob(jobData) {
  return client.post('/api/v1/college/default-college/jobs/create/', jobData);
}

// Update job posting
export function updateJob(jobId, jobData) {
  return client.put(`/api/v1/college/default-college/jobs/${jobId}/`, jobData);
}

// Delete job posting
export function deleteJob(jobId) {
  return client.delete(`/api/v1/college/default-college/jobs/${jobId}/`);
}

// Get job applications for admin
export function getJobApplications(jobId) {
  return client.get(`/api/v1/college/default-college/jobs/${jobId}/applications/`);
}

// Get all applications for admin dashboard
export function getAllApplications() {
  return client.get('/api/v1/college/default-college/applications/');
}

// Admin-specific job listing (shows all jobs including unpublished)
export function listJobsAdmin(params = {}) {
  const queryParams = new URLSearchParams();
  
  // Add pagination parameters
  if (params.page) queryParams.append('page', params.page);
  if (params.per_page) queryParams.append('per_page', params.per_page);
  
  // Add filtering parameters
  if (params.search) queryParams.append('search', params.search);
  if (params.type && params.type !== 'All') queryParams.append('job_type', params.type);
  if (params.minCTC) queryParams.append('salary_min', params.minCTC);
  if (params.maxCTC) queryParams.append('salary_max', params.maxCTC);
  if (params.minStipend) queryParams.append('stipend_min', params.minStipend);
  if (params.maxStipend) queryParams.append('stipend_max', params.maxStipend);
  if (params.location) queryParams.append('location', params.location);
  if (params.is_published !== undefined) queryParams.append('is_published', params.is_published);
  
  // Add company filtering
  if (params.company_id) queryParams.append('company_id', params.company_id);
  if (params.company_name) queryParams.append('company_name', params.company_name);
  
  const queryString = queryParams.toString();
  const url = `/api/v1/college/default-college/jobs/admin/${queryString ? `?${queryString}` : ''}`;
  
  console.log('🌐 listJobsAdmin calling URL:', url, 'with params:', params);
  
  return client.get(url).then(response => {
    console.log('🌐 listJobsAdmin response:', {
      status: response.status,
      totalJobs: response.data?.pagination?.total_count || 0,
      currentPage: response.data?.pagination?.current_page || 1,
      totalPages: response.data?.pagination?.total_pages || 1
    });
    return response;
  }).catch(error => {
    console.error('🌐 listJobsAdmin error:', error);
    console.error('🌐 listJobsAdmin error response:', error.response?.data);
    throw error;
  });
}

// Toggle job publish status
export function toggleJobPublish(jobId) {
  return client.patch(`/api/v1/jobs/${jobId}/toggle-publish/`);
}

