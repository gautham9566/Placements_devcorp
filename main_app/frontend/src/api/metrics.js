import client from './client';

// Fetch dashboard metrics
export function getDashboardMetrics(type = 'dashboard_stats', refresh = false, year = null) {
  const params = new URLSearchParams();
  params.append('type', type);
  if (refresh) {
    params.append('refresh', 'true');
  }
  if (year && year !== 'All') {
    params.append('year', year);
  }

  return client.get(`/api/v1/metrics/?${params.toString()}`);
}

// Fetch application timeline data
export function getApplicationTimeline(year = null) {
  const params = new URLSearchParams();
  if (year && year !== 'All' && year !== '') {
    params.append('year', year);
  }
  return client.get(`/api/v1/metrics/application-timeline/?${params.toString()}`);
}

// Fetch recent applications
export function getRecentApplications(limit = 10) {
  return client.get(`/api/v1/jobs/applications/recent/?limit=${limit}`);
}