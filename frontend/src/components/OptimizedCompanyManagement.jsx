'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { companiesAPI, paginationUtils } from '../api/optimized';

const OptimizedCompanyManagement = () => {
  // State management
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    tier: '',
    industry: '',
    location: '',
    campus_recruiting: '',
    min_jobs: ''
  });
  
  // Metadata state
  const [metadata, setMetadata] = useState({
    available_industries: [],
    available_locations: [],
    tier_distribution: []
  });

  // Remove debounced search - using button-based search now
  // const debouncedSearch = useCallback(
  //   debounce((searchTerm, currentFilters) => {
  //     fetchCompanies(1, { ...currentFilters, search: searchTerm });
  //   }, 300),
  //   []
  // );

  // Fetch companies with server-side pagination
  const fetchCompanies = async (page = currentPage, filterParams = filters) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        page_size: pageSize,
        ...filterParams
      };

      const response = await companiesAPI.getCompanies(params);
      
      setCompanies(response.data);
      setCurrentPage(page);
      setTotalCount(response.pagination.total_count);
      setTotalPages(response.pagination.total_pages);
      
      if (response.metadata) {
        setMetadata(response.metadata);
      }
      
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError('Failed to load companies. Please try again.');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle search input change (only update state, don't trigger search)
  const handleSearchChange = (e) => {
    const searchTerm = e.target.value;
    setFilters(prev => ({ ...prev, search: searchTerm }));
    // Don't trigger immediate search, let button handle it
  };

  // Handle search button click or Enter key
  const handleSearch = () => {
    fetchCompanies(1, filters);
  };

  // Handle search input key press
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // Handle filter change
  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    fetchCompanies(1, newFilters);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchCompanies(newPage);
    }
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    fetchCompanies(1, filters);
  };

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      tier: '',
      industry: '',
      location: '',
      campus_recruiting: '',
      min_jobs: ''
    };
    setFilters(clearedFilters);
    fetchCompanies(1, clearedFilters);
  };

  // Refresh data
  const refreshData = () => {
    fetchCompanies(currentPage, filters);
  };

  // Initial load
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Calculate pagination info
  const paginationInfo = paginationUtils.calculatePaginationInfo(
    currentPage, totalPages, totalCount, pageSize
  );

  const pageNumbers = paginationUtils.generatePageNumbers(currentPage, totalPages);

  // Get tier badge color
  const getTierBadgeColor = (tier) => {
    switch (tier) {
      case 'Tier 1': return 'bg-green-100 text-green-800';
      case 'Tier 2': return 'bg-blue-100 text-blue-800';
      case 'Tier 3': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Company Management</h1>
          <p className="text-gray-600">
            Manage and view company information with optimized performance
          </p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search with Button */}
            <div className="flex gap-2 md:col-span-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search companies..."
                  value={filters.search}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap transition-colors"
              >
                Search
              </button>
            </div>

            {/* Tier Filter */}
            <select
              value={filters.tier}
              onChange={(e) => handleFilterChange('tier', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Tiers</option>
              <option value="Tier 1">Tier 1</option>
              <option value="Tier 2">Tier 2</option>
              <option value="Tier 3">Tier 3</option>
            </select>

            {/* Industry Filter */}
            <select
              value={filters.industry}
              onChange={(e) => handleFilterChange('industry', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Industries</option>
              {metadata.available_industries.map(industry => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>

            {/* Location Filter */}
            <select
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Locations</option>
              {metadata.available_locations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>

            {/* Campus Recruiting Filter */}
            <select
              value={filters.campus_recruiting}
              onChange={(e) => handleFilterChange('campus_recruiting', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Companies</option>
              <option value="true">Campus Recruiting</option>
              <option value="false">No Campus Recruiting</option>
            </select>

            {/* Min Jobs Filter */}
            <input
              type="number"
              placeholder="Min Active Jobs"
              value={filters.min_jobs}
              onChange={(e) => handleFilterChange('min_jobs', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>

          {/* Filter Actions */}
          <div className="flex justify-between items-center">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear Filters
            </button>
            <button
              onClick={refreshData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Results Info */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-gray-600">
            Showing {paginationInfo.startIndex}-{paginationInfo.endIndex} of {totalCount} companies
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Items per page:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Companies Grid */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading companies...</span>
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No companies found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {companies.map((company) => (
                <div key={company.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        {company.logo ? (
                          <img src={company.logo} alt={company.name} className="w-8 h-8 rounded" />
                        ) : (
                          <Building2 className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{company.name}</h3>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getTierBadgeColor(company.tier)}`}>
                          {company.tier}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><span className="font-medium">Industry:</span> {company.industry}</p>
                    <p><span className="font-medium">Location:</span> {company.location}</p>
                    <p><span className="font-medium">Size:</span> {company.size}</p>
                    <p><span className="font-medium">Active Jobs:</span> {company.total_active_jobs || 0}</p>
                    {company.campus_recruiting && (
                      <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Campus Recruiting
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pagination">
            <div className="text-sm text-gray-600 page-number">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!paginationInfo.hasPrevious}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {pageNumbers.map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-2 border rounded-lg ${
                    pageNum === currentPage
                      ? 'bg-blue-600 text-white border-blue-600 active'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!paginationInfo.hasNext}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OptimizedCompanyManagement;
