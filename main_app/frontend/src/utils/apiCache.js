// Request Cache with TTL
const cache = new Map();
const pendingRequests = new Map();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

export function getCacheKey(url, options = {}) {
  const method = options.method || 'GET';
  const body = options.body ? JSON.stringify(options.body) : '';
  return `${method}:${url}:${body}`;
}

export function getFromCache(key) {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const { data, timestamp } = cached;
  const now = Date.now();
  
  if (now - timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return data;
}

export function setInCache(key, data) {
  // Limit cache size
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

export function clearCache() {
  cache.clear();
}

// Debounced fetch
let debounceTimers = new Map();

export function debouncedFetch(url, options = {}, delay = 300) {
  return new Promise((resolve, reject) => {
    const timerId = debounceTimers.get(url);
    if (timerId) {
      clearTimeout(timerId);
    }
    
    const newTimerId = setTimeout(async () => {
      try {
        const result = await cachedFetch(url, options);
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        debounceTimers.delete(url);
      }
    }, delay);
    
    debounceTimers.set(url, newTimerId);
  });
}

// Cached fetch with request deduplication
export async function cachedFetch(url, options = {}) {
  const cacheKey = getCacheKey(url, options);
  
  // Check cache first (only for GET requests)
  if (!options.method || options.method === 'GET') {
    const cached = getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Check if there's already a pending request
    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey);
    }
  }
  
  // Make the request
  const requestPromise = fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Cache successful GET requests
      if (!options.method || options.method === 'GET') {
        setInCache(cacheKey, data);
      }
      
      return data;
    })
    .finally(() => {
      pendingRequests.delete(cacheKey);
    });
  
  // Store pending request
  if (!options.method || options.method === 'GET') {
    pendingRequests.set(cacheKey, requestPromise);
  }
  
  return requestPromise;
}

// Batch multiple requests
export async function batchFetch(urls, options = {}) {
  return Promise.all(
    urls.map(url => cachedFetch(url, options))
  );
}

// Retry mechanism
export async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await cachedFetch(url, options);
    } catch (error) {
      lastError = error;
      
      // Wait before retrying (exponential backoff)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  
  throw lastError;
}

// Prefetch data
export function prefetch(url, options = {}) {
  const cacheKey = getCacheKey(url, options);
  const cached = getFromCache(cacheKey);
  
  if (!cached) {
    // Prefetch in background
    cachedFetch(url, options).catch(() => {
      // Ignore errors in prefetch
    });
  }
}
