export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: auto-switch based on hostname
    return window.location.hostname === 'localhost' 
      ? 'http://100.118.93.80:8005' 
      : 'http://100.118.93.80:8005';
  }
  // Server-side: fallback to env var
  return process.env.NEXT_PUBLIC_API_URL || 'http://100.118.93.80:8005';
};
