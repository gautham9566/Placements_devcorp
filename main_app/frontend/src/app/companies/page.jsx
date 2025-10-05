'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Building,
  MapPin,
  Users,
  Calendar,
  Star,
  Heart,
  Filter,
  Loader,
  AlertCircle,
  Bookmark,
  BookmarkCheck
} from "lucide-react";

// Import API services
import { fetchCompanies, getCompanyStats, followCompany, unfollowCompany, getUserFollowedCompanies } from '../../api/companies';
import { getUserId } from '../../utils/auth';

export default function CompaniesPage() {
  const router = useRouter();
  const [allCompanies, setAllCompanies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [industryFilter, setIndustryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name');
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Show 8 cards per page

  useEffect(() => {
    // Load companies from API
    const loadCompanies = async () => {
      setLoading(true);
      try {
        const companies = await fetchCompanies();
        setAllCompanies(companies);
        
        // Use the working company stats function
        try {
          const statsResponse = await getCompanyStats();
          setStats(statsResponse.data || statsResponse);
        } catch (statsError) {
          console.error('Error loading company stats:', statsError);
          // Calculate stats from companies as fallback
          setStats({
            total: companies.length,
            tier1: companies.filter(c => c.tier === 'Tier 1').length,
            tier2: companies.filter(c => c.tier === 'Tier 2').length,
            tier3: companies.filter(c => c.tier === 'Tier 3').length,
            campus_recruiting: companies.filter(c => c.campus_recruiting).length
          });
        }
        
        // Load followed companies from API
        const userId = getUserId();
        if (userId) {
          await loadFollowedCompanies(userId);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error loading companies:', err);
        setError('Failed to load companies. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadCompanies();
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

  // Get unique industries for filter
  const industries = [...new Set(allCompanies.map(company => company.industry))];

  // Filter and sort companies
  const filteredCompanies = allCompanies
    .filter(company => {
      // First apply the regular filters
      const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           company.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           company.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTier = tierFilter === 'ALL' || company.tier === tierFilter;
      const matchesIndustry = industryFilter === 'ALL' || company.industry === industryFilter;
      
      // If "bookmarks" sort is selected, only include bookmarked companies
      const matchesBookmark = sortBy === 'bookmarks' ? followedCompanies.has(company.id) : true;
      
      return matchesSearch && matchesTier && matchesIndustry && matchesBookmark;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'jobs') {
        return b.totalActiveJobs - a.totalActiveJobs;
      } else if (sortBy === 'applicants') {
        return b.totalApplicants - a.totalApplicants;
      } else if (sortBy === 'tier') {
        return a.tier.localeCompare(b.tier);
      } else if (sortBy === 'bookmarks') {
        // Just sort alphabetically since all will be bookmarked now
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

  // Pagination calculations
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCompanies = filteredCompanies.slice(indexOfFirstItem, indexOfLastItem);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, tierFilter, industryFilter, sortBy]);

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
    router.push(`/company/${companyId}`);
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
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Explore Companies</h1>
            <p className="text-gray-600">
              Discover top companies and exciting career opportunities
            </p>
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
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Bookmark className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{followedCompanies.size}</p>
                  <p className="text-sm text-gray-500">Bookmarks</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search companies, industries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Filters */}
              <div className="flex gap-4">
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
                >
                  <option value="ALL">All Tiers</option>
                  <option value="Tier 1">Tier 1</option>
                  <option value="Tier 2">Tier 2</option>
                  <option value="Tier 3">Tier 3</option>
                </select>

                <select
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
                >
                  <option value="ALL">All Industries</option>
                  {industries.map(industry => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[130px]"
                >
                  <option value="name">Company A-Z</option>
                  <option value="jobs">Most Jobs</option>
                  <option value="applicants">Most Popular</option>
                  <option value="bookmarks">Bookmarked</option>
                  <option value="tier">Tier</option>
                </select>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredCompanies.length} of {allCompanies.length} companies
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
                  {/* Follow Button */}
                  <button
                    onClick={(e) => toggleFollowCompany(e, company.id)}
                    className="p-2 rounded-lg transition-colors hover:bg-gray-100"
                  >
                    {followedCompanies.has(company.id) ? (
                      <BookmarkCheck className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Bookmark className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
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
                    <p className="text-lg font-bold text-gray-900">{company.totalActiveJobs}</p>
                    <p className="text-xs text-gray-500">Active Jobs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{company.totalApplicants}</p>
                    <p className="text-xs text-gray-500">Applicants</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{company.totalHired}</p>
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
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredCompanies.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 mt-8">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => paginate(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => paginate(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span> ({filteredCompanies.length} total companies)
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => paginate(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === 1
                        ? 'text-gray-300'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Previous
                  </button>
                  {/* Page Numbers */}
                  {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = idx + 1;
                    } else if (currentPage <= 3) {
                      pageNum = idx + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + idx;
                    } else {
                      pageNum = currentPage - 2 + idx;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => paginate(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-white hover:bg-gray-50 border border-gray-300 text-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => paginate(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === totalPages
                        ? 'text-gray-300'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}