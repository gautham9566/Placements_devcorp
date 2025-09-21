'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Building,
  MapPin,
  Users,
  Calendar,
  GraduationCap,
  Filter,
  ArrowRight,
  PlusCircle,
  Trash2,
  Edit,
  Loader,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Star,
  Heart
} from "lucide-react";

// Import API services
import { companiesAPI } from '../../../api/optimized';
import { deleteCompany, getUserFollowedCompanies, followCompany, unfollowCompany } from '../../../api/companies';
import { getUserId } from '../../../utils/auth';

function CompaniesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [companies, setCompanies] = useState([]);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [tierFilter, setTierFilter] = useState(searchParams.get('tier') || 'ALL');
  const [industryFilter, setIndustryFilter] = useState(searchParams.get('industry') || 'ALL');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'name');
  const [followedCompanies, setFollowedCompanies] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    tier1: 0,
    tier2: 0,
    tier3: 0,
    campus_recruiting: 0
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(8); // Show 8 cards per page

  // Function to update URL with current state
  const updateURL = (params = {}) => {
    const newParams = new URLSearchParams();
    
    // Always include current values unless overridden
    const currentParams = {
      page: currentPage.toString(),
      search: searchTerm,
      tier: tierFilter,
      industry: industryFilter,
      sort: sortBy,
      ...params
    };

    // Only add non-empty parameters to URL
    Object.entries(currentParams).forEach(([key, value]) => {
      if (value && value !== 'ALL' && value !== '' && value !== 'null' && value !== null) {
        newParams.set(key, value);
      }
    });

    const newURL = `${window.location.pathname}?${newParams.toString()}`;
    window.history.pushState({}, '', newURL);
  };

  // Fetch companies with server-side pagination and filtering
  const fetchCompanies = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      // Build filter parameters for server-side filtering
      const params = {
        page,
        page_size: pageSize,
      };

      // Add search filter
      if (searchTerm) {
        params.search = searchTerm;
      }

      // Add tier filter
      if (tierFilter !== 'ALL') {
        params.tier = tierFilter;
      }

      // Add industry filter
      if (industryFilter !== 'ALL') {
        params.industry = industryFilter;
      }

      // Add sorting
      if (sortBy) {
        params.ordering = sortBy === 'name' ? 'name' :
                         sortBy === 'jobs' ? '-total_active_jobs' :
                         sortBy === 'applicants' ? '-total_applicants' :
                         sortBy === 'tier' ? 'tier' : 'name';
      }

      // Fetch data from optimized API
      const response = await companiesAPI.getCompanies(params);

      // Transform the response data to ensure all fields are properly mapped
      const transformedCompanies = response.data.map(company => ({
        id: company.id,
        name: company.name || '',
        logo: company.logo || `https://via.placeholder.com/48x48/4285F4/FFFFFF?text=${(company.name || 'C').charAt(0)}`,
        description: company.description || '',
        industry: company.industry || '',
        // Standardized field names
        size: company.size || 'Size not specified',
        founded: company.founded || '',
        location: company.location || 'Location not specified',
        website: company.website || '',
        tier: company.tier || 'Tier 3',
        campus_recruiting: company.campus_recruiting || false,
        totalActiveJobs: company.total_active_jobs || 0,
        totalApplicants: company.total_applicants || 0,
        totalHired: company.total_hired || 0,
        awaitedApproval: company.pending_approval || 0,
      }));

      setCompanies(transformedCompanies);
      setCurrentPage(page);
      setTotalPages(response.pagination.total_pages);
      setTotalCount(response.pagination.total_count);

      setLoading(false);
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError('Failed to load companies. Please try again.');
      setCompanies([]);
      setLoading(false);
    }
  };

  // Fetch company statistics
  const fetchStats = async () => {
    try {
      const statsResponse = await companiesAPI.getCompanyStats();
      setStats(statsResponse);
    } catch (statsError) {
      console.error('Error fetching company stats:', statsError);
      // Fallback stats will be calculated from current page data
      setStats({
        total: totalCount,
        tier1: 0,
        tier2: 0,
        tier3: 0,
        campus_recruiting: 0
      });
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchCompanies();
    fetchStats();

    // Load followed companies from API
    const userId = getUserId();
    if (userId) {
      loadFollowedCompanies(userId);
    }
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const searchParams = new URLSearchParams(window.location.search);
      setCurrentPage(parseInt(searchParams.get('page')) || 1);
      setSearchTerm(searchParams.get('search') || '');
      setTierFilter(searchParams.get('tier') || 'ALL');
      setIndustryFilter(searchParams.get('industry') || 'ALL');
      setSortBy(searchParams.get('sort') || 'name');
      
      // Fetch data with new parameters
      fetchCompanies(parseInt(searchParams.get('page')) || 1);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Function to load followed companies from API
  const loadFollowedCompanies = async (userId) => {
    try {
      const response = await getUserFollowedCompanies(userId);
      const followedIds = response.data.map(company => company.id);
      setFollowedCompanies(new Set(followedIds));
    } catch (error) {
      console.error('Error loading followed companies:', error);
    }
  };

  // Industries will be fetched from backend or hardcoded for now
  const industries = ['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Consulting', 'E-commerce'];

  // Companies are already filtered and sorted on the server side
  const currentCompanies = companies;

  // Change page with URL update
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    updateURL({ page: pageNumber.toString() });
    fetchCompanies(pageNumber);
  };
  
  const nextPage = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      updateURL({ page: newPage.toString() });
      fetchCompanies(newPage);
    }
  };
  
  const prevPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      updateURL({ page: newPage.toString() });
      fetchCompanies(newPage);
    }
  };

  // Refetch data when tier, industry, or sort filters change (but not search)
  useEffect(() => {
    fetchCompanies(1); // Reset to page 1 when filters change
  }, [tierFilter, industryFilter, sortBy, pageSize]);

  // Handle search input change (only update state, don't fetch)
  const handleSearchInputChange = (value) => {
    setSearchTerm(value);
  };

  // Handle search button click or Enter key
  const handleSearch = () => {
    setCurrentPage(1);
    updateURL({ search: searchTerm, page: '1' });
    fetchCompanies(1);
  };

  // Handle search input key press
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleTierFilterChange = (value) => {
    setTierFilter(value);
    setCurrentPage(1);
    updateURL({ tier: value, page: '1' });
    fetchCompanies(1);
  };

  const handleIndustryFilterChange = (value) => {
    setIndustryFilter(value);
    setCurrentPage(1);
    updateURL({ industry: value, page: '1' });
    fetchCompanies(1);
  };

  const handleSortChange = (value) => {
    setSortBy(value);
    setCurrentPage(1);
    updateURL({ sort: value, page: '1' });
    fetchCompanies(1);
  };

  const toggleFollowCompany = async (e, companyId) => {
    e.stopPropagation(); // Prevent navigation when clicking follow button
    
    try {
      const userId = getUserId();
      if (!userId) {
        alert("Please log in to follow companies");
        return;
      }
      
      const newFollowedCompanies = new Set(followedCompanies);
      
      if (newFollowedCompanies.has(companyId)) {
        await unfollowCompany(companyId, userId);
        newFollowedCompanies.delete(companyId);
      } else {
        await followCompany(companyId, userId);
        newFollowedCompanies.add(companyId);
      }
      
      setFollowedCompanies(newFollowedCompanies);
    } catch (error) {
      console.error('Error updating follow status:', error);
      alert('Failed to update follow status. Please try again.');
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'Tier 1':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Tier 2':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Tier 3':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleCompanyClick = (companyId) => {
    router.push(`/admin/companymanagement/${companyId}`);
  };

  const handleCreateCompany = () => {
    router.push('/admin/companymanagement/create');
  };
  
  const handleEditCompany = (e, companyId) => {
    e.stopPropagation(); // Prevent navigation to company detail
    router.push(`/admin/companymanagement/edit/${companyId}`);
  };
  
  const handleDeleteCompany = async (e, companyId) => {
    e.stopPropagation(); // Prevent navigation to company detail
    
    if (confirm('Are you sure you want to delete this company? This action cannot be undone.')) {
      try {
        await deleteCompany(companyId);
        // Refresh the current page after deletion
        fetchCompanies(currentPage);
        alert('Company deleted successfully');
      } catch (error) {
        console.error('Error deleting company:', error);
        alert('Failed to delete company. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="relative w-16 h-16 mb-8">
          <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-r-4 border-transparent rounded-full"></div>
        </div>
        <p className="text-gray-600 mb-6">Loading companies...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <AlertCircle className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Companies</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Company Management</h1>
            <button
              onClick={handleCreateCompany}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Create New Company</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-sm text-gray-500">Total Companies</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Star className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.tier1}</p>
                  <p className="text-sm text-gray-500">Tier 1</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Star className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.tier2}</p>
                  <p className="text-sm text-gray-500">Tier 2</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Star className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.tier3}</p>
                  <p className="text-sm text-gray-500">Tier 3</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Heart className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{followedCompanies.size}</p>
                  <p className="text-sm text-gray-500">Following</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Bar with Button */}
              <div className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search companies, industries..."
                    value={searchTerm}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap transition-colors"
                >
                  Search
                </button>
              </div>

              {/* Filters */}
              <div className="flex gap-4">
                <select
                  value={tierFilter}
                  onChange={(e) => handleTierFilterChange(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
                >
                  <option value="ALL">All Tiers</option>
                  <option value="Tier 1">Tier 1</option>
                  <option value="Tier 2">Tier 2</option>
                  <option value="Tier 3">Tier 3</option>
                </select>

                <select
                  value={industryFilter}
                  onChange={(e) => handleIndustryFilterChange(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
                >
                  <option value="ALL">All Industries</option>
                  {industries.map(industry => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[130px]"
                >
                  <option value="name">Company A-Z</option>
                  <option value="jobs">Most Jobs</option>
                  <option value="applicants">Most Popular</option>
                  <option value="tier">Tier</option>
                </select>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              Showing {companies.length} of {totalCount} companies (Page {currentPage} of {totalPages})
            </div>
          </div>
        </div>

        {/* Companies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentCompanies.length > 0 ? (
            currentCompanies.map((company) => (
              <div
                key={company.id}
                onClick={() => handleCompanyClick(company.id)}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-200 cursor-pointer group"
              >
                {/* Company Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {company.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {company.name}
                      </h3>
                      <p className="text-sm text-gray-500">{company.industry}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleEditCompany(e, company.id)}
                      className="p-2 rounded-lg transition-colors bg-blue-100 text-blue-600 hover:bg-blue-200"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteCompany(e, company.id)}
                      className="p-2 rounded-lg transition-colors bg-red-100 text-red-600 hover:bg-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Company Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{company.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{company.size}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {company.founded ? `Founded ${company.founded}` : 'Founded year not specified'}
                    </span>
                  </div>
                </div>

                {/* Tier Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTierColor(company.tier)}`}>
                    {company.tier}
                  </span>
                  {company.campus_recruiting && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                      Campus Recruiting
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {company.description}
                </p>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{company.totalActiveJobs || 0}</p>
                    <p className="text-xs text-gray-500">Active Jobs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{company.totalApplicants || 0}</p>
                    <p className="text-xs text-gray-500">Applicants</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{company.totalHired || 0}</p>
                    <p className="text-xs text-gray-500">Hired</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Building className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No companies found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your search or filters</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setTierFilter('ALL');
                  setIndustryFilter('ALL');
                  setSortBy('name');
                  setCurrentPage(1);
                  // Clear URL parameters
                  window.history.pushState({}, '', window.location.pathname);
                  fetchCompanies(1);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {companies.length > 0 && totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <nav className="flex items-center space-x-2" aria-label="Pagination">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-md border ${
                  currentPage === 1 ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Previous
              </button>
              
              {/* Generate page numbers */}
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                // Logic to display pages around current page
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => paginate(pageNum)}
                    className={`w-10 h-10 flex items-center justify-center rounded-md ${
                      currentPage === pageNum
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    aria-current={currentPage === pageNum ? 'page' : undefined}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={nextPage}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-md border ${
                  currentPage === totalPages ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Companies() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CompaniesContent />
    </Suspense>
  );
}