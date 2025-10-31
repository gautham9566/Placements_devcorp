export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: auto-switch based on hostname
    return window.location.hostname === 'localhost' 
      ? 'http://localhost:8000' 
      : 'http://100.118.93.80:8000';
  }
  // Server-side: fallback to env var
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
};