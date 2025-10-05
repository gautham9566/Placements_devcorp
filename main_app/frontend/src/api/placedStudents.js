import client from './client';

/**
 * Placed Students API functions
 */

// Get placed students with pagination, search, and sorting
export function getPlacedStudents(params = {}) {
  const queryParams = new URLSearchParams();

  // Pagination
  if (params.page) queryParams.append('page', params.page);
  if (params.per_page) queryParams.append('per_page', params.per_page);

  // Search
  if (params.search) queryParams.append('search', params.search);

  // Passout year filter
  if (params.passout_year && params.passout_year !== 'all') queryParams.append('passout_year', params.passout_year);

  // Sorting
  if (params.sort_by) queryParams.append('sort_by', params.sort_by);
  if (params.sort_order) queryParams.append('sort_order', params.sort_order);

  const queryString = queryParams.toString();
  const url = `/api/v1/jobs/placed-students/${queryString ? `?${queryString}` : ''}`;

  return client.get(url);
}

// Export placed students data
export function exportPlacedStudents(params = {}) {
  const queryParams = new URLSearchParams();

  // Include current filters and sorting for export
  if (params.search) queryParams.append('search', params.search);
  if (params.passout_year && params.passout_year !== 'all') queryParams.append('passout_year', params.passout_year);
  if (params.sort_by) queryParams.append('sort_by', params.sort_by);
  if (params.sort_order) queryParams.append('sort_order', params.sort_order);

  const queryString = queryParams.toString();
  const url = `/api/v1/jobs/placed-students/export/${queryString ? `?${queryString}` : ''}`;

  return client.get(url, {
    responseType: 'blob' // For file download
  });
}

// Get available passout years for filtering
export function getPassoutYears() {
  return client.get('/api/v1/jobs/placed-students/passout_years/');
}