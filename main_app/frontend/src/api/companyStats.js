import client from './client';

/**
 * Get summary statistics for companies and jobs
 * @returns {Promise} - Promise resolving to company statistics
 */
export const getCompanyStats = async () => {
  try {
    // Try multiple API endpoints to ensure we get data
    const endpoints = [
      '/api/v1/companies/stats/',
      '/api/v1/stats/companies/',
      '/api/v1/jobs/stats/'
    ];
    
    // Try each endpoint until we get a successful response
    for (const endpoint of endpoints) {
      try {
        const response = await client.get(endpoint);
        if (response.data) {
          console.log(`Successfully fetched stats from ${endpoint}`);
          return response.data;
        }
      } catch (error) {
        console.log(`Failed to fetch from ${endpoint}: ${error.message}`);
        // Continue to next endpoint
      }
    }
    
    // If we've tried all endpoints, fetch companies and calculate stats
    console.log('Falling back to calculated stats from companies data');
    return calculateStatsFromCompanies();
  } catch (error) {
    console.error('Failed to get company stats:', error);
    return getDefaultStats();
  }
};

/**
 * Calculate statistics from companies data
 * @returns {Promise} - Promise resolving to calculated statistics
 */
const calculateStatsFromCompanies = async () => {
  try {
    // Import from companies API to avoid circular dependencies
    const { fetchCompanies } = await import('./companies');
    const companies = await fetchCompanies();
    
    // Calculate basic statistics
    const stats = {
      total: companies.length,
      active_jobs: companies.reduce((sum, company) => sum + (company.totalActiveJobs || 0), 0),
      campus_recruiting: companies.filter(c => c.campus_recruiting).length,
      tier1: companies.filter(c => c.tier === 'Tier 1').length,
      tier2: companies.filter(c => c.tier === 'Tier 2').length,
      tier3: companies.filter(c => c.tier === 'Tier 3').length,
    };
    
    return stats;
  } catch (error) {
    console.error('Failed to calculate stats from companies:', error);
    return getDefaultStats();
  }
};

/**
 * Get default statistics when all else fails
 * @returns {Object} - Default statistics
 */
const getDefaultStats = () => {
  // Return some reasonable defaults
  return {
    total: 0,
    active_jobs: 0,
    campus_recruiting: 0,
    tier1: 0,
    tier2: 0,
    tier3: 0
  };
};

/**
 * Calculate eligible jobs for a student based on their profile
 * @param {Object} studentProfile - The student profile data
 * @returns {Promise<number>} - Number of eligible jobs
 */
export const getEligibleJobsForStudent = async (studentProfile) => {
  try {
    // First try to get from API (ideal case)
    try {
      const response = await client.get(`/api/v1/students/me/eligible-jobs/count/`);
      if (response.data && typeof response.data.count === 'number') {
        return response.data.count;
      }
    } catch (error) {
      console.log('Could not get eligible jobs from API:', error.message);
    }
    
    // If API fails, calculate based on profile and all jobs
    const { fetchCompanies } = await import('./companies');
    const companies = await fetchCompanies();
    
    // Get all jobs from all companies
    let totalJobs = 0;
    let eligibleJobs = 0;
    
    // Get student's CGPA
    const cgpa = parseFloat(studentProfile.cgpa || 
                          studentProfile.overall_cgpa || 
                          '0.0');
    
    // Get student's branch
    const branch = studentProfile.branch || '';
    
    // Apply eligibility logic - basic version
    companies.forEach(company => {
      const jobCount = company.totalActiveJobs || 0;
      totalJobs += jobCount;
      
      // Basic eligibility percentage based on tier and CGPA
      let eligiblePercent = 0;
      
      if (company.tier === 'Tier 1') {
        if (cgpa >= 8.5) eligiblePercent = 0.8;
        else if (cgpa >= 7.5) eligiblePercent = 0.4;
        else eligiblePercent = 0.1;
      } else if (company.tier === 'Tier 2') {
        if (cgpa >= 7.5) eligiblePercent = 0.9;
        else if (cgpa >= 6.5) eligiblePercent = 0.6;
        else eligiblePercent = 0.3;
      } else {
        if (cgpa >= 6.0) eligiblePercent = 0.95;
        else eligiblePercent = 0.7;
      }
      
      eligibleJobs += Math.floor(jobCount * eligiblePercent);
    });
    
    return eligibleJobs;
  } catch (error) {
    console.error('Failed to calculate eligible jobs:', error);
    return 0;
  }
};
