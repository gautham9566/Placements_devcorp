// Web Vitals Monitoring
export function reportWebVitals(metric) {
  if (process.env.NODE_ENV === 'production') {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    });

    // Send to analytics endpoint
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', body);
    } else {
      fetch('/api/analytics', {
        body,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(console.error);
    }
  } else {
    // Log in development
    console.log('[Web Vitals]', metric.name, metric.value, metric.rating);
  }
}

// Performance Observer
export function setupPerformanceObserver() {
  if (typeof window === 'undefined' || !window.PerformanceObserver) return;

  // Observe long tasks
  try {
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          console.warn('[Long Task]', entry.duration + 'ms', entry);
        }
      }
    });
    longTaskObserver.observe({ entryTypes: ['longtask'] });
  } catch (e) {
    // Long task API not supported
  }

  // Observe layout shifts
  try {
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput && entry.value > 0.1) {
          console.warn('[Layout Shift]', entry.value, entry);
        }
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch (e) {
    // Layout shift API not supported
  }
}

// Resource timing
export function logResourceTiming() {
  if (typeof window === 'undefined') return;

  const resources = performance.getEntriesByType('resource');
  const slowResources = resources.filter(r => r.duration > 1000);
  
  if (slowResources.length > 0) {
    console.warn('[Slow Resources]', slowResources);
  }
}
