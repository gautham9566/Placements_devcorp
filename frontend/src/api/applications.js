import client from './client';

/**
 * Applications API functions for admin dashboard
 */

// Get all applications with advanced filtering and pagination
export function getAllApplications(params = {}) {
  const queryParams = new URLSearchParams();
  
  // Pagination
  if (params.page) queryParams.append('page', params.page);
  if (params.page_size) queryParams.append('page_size', params.page_size);
  
  // Filtering
  if (params.status && params.status !== 'ALL') queryParams.append('status', params.status);
  if (params.job_id) queryParams.append('job_id', params.job_id); // Add job_id filter
  if (params.company) queryParams.append('company_name__icontains', params.company);
  if (params.job_title) queryParams.append('job__title__icontains', params.job_title);
  if (params.student_name) queryParams.append('student_name__icontains', params.student_name);
  if (params.date_from) queryParams.append('applied_at__gte', params.date_from);
  if (params.date_to) queryParams.append('applied_at__lte', params.date_to);
  
  const queryString = queryParams.toString();
  const url = `/api/v1/jobs/applications/${queryString ? `?${queryString}` : ''}`;
  
  return client.get(url);
}

// Get individual application details
export function getApplication(applicationId) {
  return client.get(`/api/v1/jobs/applications/${applicationId}/`);
}

// Update application (admin only)
export function updateApplication(applicationId, data) {
  return client.patch(`/api/v1/jobs/applications/${applicationId}/`, data);
}

// Delete application (soft delete)
export function deleteApplication(applicationId) {
  return client.delete(`/api/v1/jobs/applications/${applicationId}/`);
}

// Get application statistics
export function getApplicationStats(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.job_id) queryParams.append('job_id', params.job_id);
  if (params.date_from) queryParams.append('date_from', params.date_from);
  if (params.date_to) queryParams.append('date_to', params.date_to);
  
  const queryString = queryParams.toString();
  const url = `/api/v1/jobs/applications/stats/${queryString ? `?${queryString}` : ''}`;
  
  return client.get(url);
}

// Export applications
export function exportApplications(config) {
  return client.post('/api/v1/jobs/applications/export/', config, {
    responseType: 'blob' // Important for file downloads
  });
}

// Bulk update applications
export function bulkUpdateApplications(applicationIds, updateData) {
  return client.post('/api/v1/jobs/applications/bulk-update/', {
    application_ids: applicationIds,
    update_data: updateData
  });
}

// Get available profile fields for form configuration
export function getProfileFields() {
  return client.get('/api/v1/jobs/applications/fields/');
}

// Get applications for a specific job (used in job detail page)
export function getJobApplications(jobId, params = {}) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page);
  if (params.page_size) queryParams.append('page_size', params.page_size);
  if (params.status) queryParams.append('status', params.status);
  
  const queryString = queryParams.toString();
  const url = `/api/v1/college/default-college/jobs/${jobId}/applications/${queryString ? `?${queryString}` : ''}`;
  
  return client.get(url);
}

// Application status change tracking
export function updateApplicationStatus(applicationId, newStatus, notes = '') {
  return client.patch(`/api/v1/jobs/applications/${applicationId}/status/`, {
    status: newStatus,
    admin_notes: notes
  });
}

// Get status history for an application
export function getApplicationStatusHistory(applicationId) {
  return client.get(`/api/v1/jobs/applications/${applicationId}/status-history/`);
} 