// Centralized data source for jobs, companies, and applications
// This file will serve as the single source of truth for all job-related data

import { listCompanies, getCompany, transformCompanyData } from '../api/companies';

// Static fallback data
export const companies = [
  {
    id: 1,
    name: "TechCorp Inc",
    description: "Leading technology solutions provider",
    industry: "Technology",
    size: "500-1000",
    founded: "2010",
    website: "https://techcorp.com"
  },
  {
    id: 2,
    name: "DataCorp",
    description: "Data analytics and insights company",
    industry: "Data Analytics",
    size: "100-500",
    founded: "2015",
    website: "https://datacorp.com"
  }
];

export const jobPostings = [
  {
    id: 25,
    title: "Software Engineer",
    company_id: 1,
    type: "FULL_TIME",
    is_active: true,
    is_featured: false,
    remote_eligible: true,
    location: "San Francisco, CA"
  },
  {
    id: 26,
    title: "Data Scientist",
    company_id: 2,
    type: "FULL_TIME",
    is_active: true,
    is_featured: true,
    remote_eligible: false,
    location: "New York, NY"
  }
];

export const studentApplications = [
  {
    id: 1,
    job_id: 25,
    title: "Software Engineer",
    company: "TechCorp Inc",
    status: "APPLIED",
    application_deadline: "2024-05-30T23:59:59Z"
  },
  {
    id: 2,
    job_id: 26,
    title: "Data Scientist",
    company: "DataCorp",
    status: "INTERVIEW SCHEDULED",
    application_deadline: "2024-06-15T23:59:59Z"
  }
];

// Function to fetch companies from the API
export const fetchCompanies = async (params = {}) => {
  try {
    // Add cache busting parameter
    const fetchParams = { 
      ...params, 
      _t: new Date().getTime() 
    };
    
    console.log('Fetching companies with cache busting...');
    const response = await listCompanies(fetchParams);
    
    // Handle response format consistently
    let companiesData = [];
    if (response.data && Array.isArray(response.data)) {
      companiesData = response.data;
    } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
      companiesData = response.data.results;
    } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
      companiesData = response.data.data;
    }
    
    // Transform the data to match our frontend structure
    const transformedData = companiesData.map(transformCompanyData);
    
    console.log(`Fetched ${transformedData.length} companies from API`);
    
    // Only fall back to static data if we got nothing from the API
    if (transformedData.length === 0) {
      console.warn('API returned empty companies array, using static data');
      return companies;
    }
    
    return transformedData;
  } catch (error) {
    console.error('Error fetching companies:', error);
    
    // Try once more with a different endpoint format
    try {
      console.log('Trying alternate endpoint format...');
      const altResponse = await fetch('/api/v1/college/default-college/companies/');
      if (altResponse.ok) {
        const data = await altResponse.json();
        const altData = Array.isArray(data) ? data : (data.data || data.results || []);
        if (altData.length > 0) {
          console.log('Successfully retrieved companies from alternate endpoint');
          return altData.map(transformCompanyData);
        }
      }
    } catch (altError) {
      console.error('Alternate endpoint also failed:', altError);
    }
    
    // Return static data as final fallback
    return companies;
  }
};

// Function to get a company by ID
export const getCompanyById = async (id) => {
  try {
    // First try to get from API
    const response = await getCompany(id);
    return transformCompanyData(response.data);
  } catch (error) {
    console.error(`Error fetching company ${id}:`, error);
    // Fallback to static data
    return companies.find(company => company.id === id) || null;
  }
};



// Helper functions
export const getActiveJobs = () => {
  return jobPostings.filter(job => job.is_active);
};

export const getJobById = (jobId) => {
  return jobPostings.find(job => job.id === jobId);
};

export const getCompaniesWithActiveJobs = () => {
  const activeJobCompanyIds = new Set(
    jobPostings.filter(job => job.is_active).map(job => job.company_id)
  );
  return companies.filter(company => activeJobCompanyIds.has(company.id));
};

export const getApplicationStats = () => {
  const total = studentApplications.length;
  const pending = studentApplications.filter(app => 
    app.status === 'APPLIED' || app.status === 'UNDER REVIEW'
  ).length;
  const interviews = studentApplications.filter(app => 
    app.status === 'INTERVIEW SCHEDULED'
  ).length;
  const rejected = studentApplications.filter(app => 
    app.status === 'REJECTED'
  ).length;
  const accepted = studentApplications.filter(app => 
    app.status === 'ACCEPTED'
  ).length;

  return { total, pending, interviews, rejected, accepted };
};

export const getJobStats = () => {
  const total = jobPostings.length;
  const active = jobPostings.filter(job => job.is_active).length;
  const internships = jobPostings.filter(job => job.type === 'INTERNSHIP').length;
  const fullTime = jobPostings.filter(job => job.type === 'FULL_TIME').length;
  const remote = jobPostings.filter(job => job.remote_eligible).length;
  const featured = jobPostings.filter(job => job.is_featured).length;

  return { total, active, internships, fullTime, remote, featured };
};

// Function to get jobs by company
export function getJobsByCompany(companyId) {
  // This is a placeholder implementation
  // You should replace this with an actual API call to fetch jobs by company ID
  
  // For now, we'll return an empty array to prevent the error
  console.log(`Fetching jobs for company ID: ${companyId}`);
  return [];
}