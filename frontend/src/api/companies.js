import client from './client';

// List all companies with optional filtering
export function listCompanies(params = {}) {
  const queryParams = new URLSearchParams();
  
  // Add pagination parameters
  if (params.page) queryParams.append('page', params.page);
  if (params.per_page) queryParams.append('per_page', params.per_page);
  
  // Add filtering parameters
  if (params.tier && params.tier !== 'ALL') queryParams.append('tier', params.tier);
  if (params.industry && params.industry !== 'ALL') queryParams.append('industry', params.industry);
  if (params.campus_recruiting) queryParams.append('campus_recruiting', params.campus_recruiting);
  if (params.search) queryParams.append('search', params.search);
  if (params.sort) queryParams.append('sort', params.sort);
  
  // Add cache busting parameter to prevent cached responses
  queryParams.append('_t', new Date().getTime());
  
  const queryString = queryParams.toString();
  // Try both endpoints to maximize compatibility with backend
  const urls = [
    `/api/v1/companies/${queryString ? `?${queryString}` : ''}`,
    `/api/v1/college/default-college/companies/${queryString ? `?${queryString}` : ''}`
  ];
  
  // Try primary endpoint first, fall back to secondary if needed
  return client.get(urls[0])
    .catch(error => {
      console.log(`Primary endpoint failed: ${error.message}, trying fallback...`);
      return client.get(urls[1]);
    });
}

// Function to fetch companies from the API with improved reliability
export async function fetchCompanies(params = {}) {
  try {
    console.log('Fetching companies from API...');
    const response = await listCompanies(params);
    // Transform the data to match our frontend structure
    let companies = [];
    
    if (response.data && Array.isArray(response.data)) {
      companies = response.data;
    } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
      companies = response.data.results;
    } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
      companies = response.data.data;
    }
    
    console.log(`Retrieved ${companies.length} companies from API`);
    
    // Only proceed with detail fetching if we got a reasonable number of companies
    if (companies.length > 0) {
      // For each company in the list, fetch complete details to get all fields
      const detailedCompanies = await Promise.all(
        companies.map(async (company) => {
          try {
            // Fetch detailed info for each company
            const detailResponse = await getCompany(company.id);
            return transformCompanyData(detailResponse.data);
          } catch (error) {
            console.log(`Could not fetch details for company ${company.id}:`, error);
            // Fall back to the list data if detail fetch fails
            return transformCompanyData(company);
          }
        })
      );
      
      // Store companies in sessionStorage for quick access
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('companies_data', JSON.stringify(detailedCompanies));
        sessionStorage.setItem('companies_timestamp', Date.now());
      }
      
      return detailedCompanies;
    } else {
      throw new Error('No companies returned from API');
    }
  } catch (error) {
    console.error('Error fetching companies from API:', error);
    
    // Check if we have cached data in sessionStorage
    if (typeof window !== 'undefined') {
      const cachedData = sessionStorage.getItem('companies_data');
      const timestamp = sessionStorage.getItem('companies_timestamp');
      
      if (cachedData && timestamp) {
        // Only use cached data if it's less than 5 minutes old
        const age = Date.now() - parseInt(timestamp);
        if (age < 5 * 60 * 1000) {
          console.log('Using cached company data (< 5 min old)');
          return JSON.parse(cachedData);
        }
      }
    }
    
    // Import the static data as last resort
    console.log('Falling back to static company data');
    const { companies } = await import('../data/jobsData');
    return companies;
  }
}

// Get a single company by ID with better error handling
export function getCompany(companyId) {
  // Try both possible endpoints
  const urls = [
    `/api/v1/company/${companyId}/`,
    `/api/v1/companies/${companyId}/`,
    `/api/v1/college/default-college/companies/${companyId}/`
  ];
  
  // Try each URL in sequence until one works
  return client.get(urls[0])
    .catch(error1 => {
      console.log(`First company endpoint failed: ${error1.message}, trying second...`);
      return client.get(urls[1])
        .catch(error2 => {
          console.log(`Second company endpoint failed: ${error2.message}, trying third...`);
          return client.get(urls[2]);
        });
    });
}

// Create a new company
export function createCompany(companyData) {
  const formData = new FormData();
  
  // Append all fields to the FormData
  Object.keys(companyData).forEach(key => {
    // Handle file upload for logo
    if (key === 'logo' && companyData[key] instanceof File) {
      formData.append(key, companyData[key]);
    } else if (companyData[key] !== null && companyData[key] !== undefined) {
      formData.append(key, companyData[key]);
    }
  });
  
  return client.post('/api/v1/companies/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

// Update company details
export function updateCompany(companyId, companyData) {
  const formData = new FormData();
  
  // Append all fields to the FormData
  Object.keys(companyData).forEach(key => {
    // Handle file upload for logo
    if (key === 'logo' && companyData[key] instanceof File) {
      formData.append(key, companyData[key]);
    } else if (companyData[key] !== null && companyData[key] !== undefined) {
      formData.append(key, companyData[key]);
    }
  });
  
  return client.put(`/api/v1/companies/${companyId}/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

// Delete a company
export function deleteCompany(companyId) {
  return client.delete(`/api/v1/companies/${companyId}/`);
}

// Upload company logo
export function uploadCompanyLogo(companyId, logoFile) {
  const formData = new FormData();
  formData.append('logo', logoFile);
  
  return client.post(`/api/v1/companies/${companyId}/upload-logo/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

// Get company statistics
export function getCompanyStats() {
  return client.get('/api/v1/companies/stats/');
}

// Get unique industries
export function getIndustries() {
  return client.get('/api/v1/companies/industries/');
}

// Transform backend company data to match frontend structure
export function transformCompanyData(backendData) {
  return {
    id: backendData.id,
    name: backendData.name,
    logo: backendData.logo || `https://via.placeholder.com/48x48/4285F4/FFFFFF?text=${backendData.name.charAt(0)}`,
    description: backendData.description || '',
    industry: backendData.industry || '',
    size: backendData.size || '',
    founded: backendData.founded || '',
    location: backendData.location || 'Location not specified',
    website: backendData.website || '',
    tier: backendData.tier || 'Tier 3',
    campus_recruiting: backendData.campus_recruiting || false,
    // Standardized field names
    totalActiveJobs: backendData.total_active_jobs || 0,
    totalApplicants: backendData.total_applicants || 0, 
    totalHired: backendData.total_hired || 0,
    awaitedApproval: backendData.pending_approval || 0,
  };
}

// Get followers count for a company
export function getFollowersCount(companyId) {
  return client.get(`/api/v1/companies/${companyId}/followers/count/`);
}

// Follow a company
export function followCompany(companyId, userId) {
  return client.post(`/api/v1/companies/${companyId}/followers/`, { user_id: userId });
}

// Unfollow a company
export function unfollowCompany(companyId, userId) {
  return client.delete(`/api/v1/companies/${companyId}/followers/`, { data: { user_id: userId } });
}

// Check if user is following a company
export function checkFollowingStatus(companyId, userId) {
  return client.get(`/api/v1/companies/${companyId}/followers/status/?user_id=${userId}`);
}

// Get all companies a user is following
export function getUserFollowedCompanies(userId) {
  return client.get(`/api/v1/users/${userId}/following/`);
}

// Simple, reliable function to fetch all companies
export function fetchSimpleCompanies() {
  return client.get('/api/v1/companies/simple/')
    .then(response => {
      if (response.data && response.data.success) {
        return response.data;
      }
      throw new Error('Failed to fetch companies');
    })
    .catch(error => {
      console.error('Error fetching companies:', error);
      // Return a fallback structure
      return {
        success: false,
        data: [],
        count: 0,
        error: error.message
      };
    });
}
