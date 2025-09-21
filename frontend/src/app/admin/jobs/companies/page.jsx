'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconSearch } from '@tabler/icons-react';
import { CompanyCard } from '../../../../components/company/CompanyCard';
import { CompanyDetailsModal } from '../../../../components/company/CompanyDetailsModal';
import { fetchSimpleCompanies } from '../../../../api/companies';
import { listJobsAdmin } from '../../../../api/jobs';

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch companies from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        console.log('Fetching companies...');
        const response = await fetchSimpleCompanies();
        
        if (response.success && Array.isArray(response.data)) {
          setCompanies(response.data);
          console.log(`Loaded ${response.data.length} companies successfully`);
          setError(null);
        } else {
          throw new Error(response.error || 'Failed to fetch companies');
        }
      } catch (err) {
        console.error('Failed to fetch companies:', err);
        setError('Failed to load companies. Please try again.');
        setCompanies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredCompanies = companies
    .filter(company =>
      (company.companyName || company.company_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => (a.companyName || a.company_name || '').localeCompare(b.companyName || b.company_name || ''));

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading companies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-xl mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
            <p className="text-gray-600">Manage company partnerships and job opportunities</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/admin/jobs/listings')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              View Job Listings
            </button>
            <button
              onClick={() => router.push('/admin/jobs/create')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Post New Job
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IconSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Companies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 text-lg">No companies found</p>
              <p className="text-gray-400">Try adjusting your search criteria</p>
            </div>
          ) : (
            filteredCompanies.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                onClick={() => setSelectedCompany(company)}
              />
            ))
          )}
        </div>

        {/* Company Details Modal */}
        {selectedCompany && (
          <CompanyDetailsModal
            company={selectedCompany}
            isOpen={!!selectedCompany}
            onClose={() => setSelectedCompany(null)}
          />
        )}
      </div>
    </div>
  );
} 