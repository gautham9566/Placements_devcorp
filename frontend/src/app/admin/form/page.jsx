'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconPlus, IconCopy, IconCheck, IconSearch, IconBuilding, IconEdit, IconExternalLink, IconThumbUp, IconThumbDown } from '@tabler/icons-react';
import { getForms, createForm, approveForm, rejectForm, convertFormToJob } from '../../../api/forms';
import { toggleJobPublish } from '../../../api/jobs';
import { fetchCompanies } from '../../../api/companies';

export default function AdminFormsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [forms, setForms] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [copiedFormId, setCopiedFormId] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [copiedKey, setCopiedKey] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10; // Items per page
  
  // Search state for each tab
  const [searchTerm, setSearchTerm] = useState('');

  // hydrate active tab from URL or local storage
  useEffect(() => {
    const paramTab = searchParams.get('tab');
    if (paramTab) {
      setActiveTab((prev) => (prev === paramTab ? prev : paramTab));
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('admin-forms-tab', paramTab);
      }
      return;
    }

    if (typeof window !== 'undefined') {
      const storedTab = window.localStorage.getItem('admin-forms-tab');
      if (storedTab && storedTab !== activeTab) {
        setActiveTab(storedTab);
        const nextUrl = `/admin/form?tab=${storedTab}`;
        if (window.location.search !== `?tab=${storedTab}`) {
          router.replace(nextUrl, { scroll: false });
        }
      }
    }
  }, [searchParams, activeTab, router]);
  
  const loadForms = useCallback(async (status, page = 1, search = '') => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let response;
      const baseParams = { 
        ordering: '-created_at',
        page: page,
        page_size: pageSize
      };
      
      // Add search parameter if provided
      if (search && search.trim()) {
        baseParams.search = search.trim();
      }

      if (status === 'pending') {
        response = await getForms({ ...baseParams, status: ['pending'], submitted: true });
      } else if (status === 'approved') {
        response = await getForms({ ...baseParams, status: ['approved', 'posted'], submitted: true });
      } else {
        response = await getForms(baseParams);
      }

      const payload = response?.data;
      const formsData = Array.isArray(payload?.results)
        ? payload.results
        : Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

      setForms(formsData);
      
      // Set pagination data
      if (payload?.count !== undefined) {
        setTotalCount(payload.count);
        setTotalPages(Math.ceil(payload.count / pageSize));
      } else {
        setTotalCount(formsData.length);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error loading forms:', error);
      console.error('Error details:', error.response || error.message);
      setForms([]);
      setErrorMessage('Failed to load forms. Please check the console for details.');
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  const loadCompanies = useCallback(async () => {
    try {
      const companiesData = await fetchCompanies();
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
    } catch (error) {
      console.error('Error loading companies:', error);
      setCompanies([]);
    }
  }, []);

  useEffect(() => {
    // Load forms based on active tab, resetting to page 1 when tab changes
    setCurrentPage(1);
    loadForms(activeTab, 1, searchTerm);
  }, [activeTab, loadForms]);

  useEffect(() => {
    // Load companies once for dropdown suggestions
    loadCompanies();
  }, [loadCompanies]);
  
  // Handle page changes
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    loadForms(activeTab, newPage, searchTerm);
  };
  
  // Handle search
  const handleSearch = () => {
    setCurrentPage(1);
    loadForms(activeTab, 1, searchTerm);
  };
  
  // Handle search input key press
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // Switch tabs and update URL
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('admin-forms-tab', tab);
    }

    const params = new URLSearchParams(searchParams?.toString?.() || '');
    params.set('tab', tab);
    const nextQuery = params.toString();
    router.replace(nextQuery ? `/admin/form?${nextQuery}` : '/admin/form', { scroll: false });
  };

  // Filter companies based on search term
  const filteredCompanies = Array.isArray(companies) ? companies.filter(company => {
    const companyName = (company.name || company.companyName || company.employer_name || '').toLowerCase();
    return companyName.includes(companySearchTerm.toLowerCase());
  }) : [];

  const handleCompanySelect = (company) => {
    const companyName = company.name || company.companyName || company.employer_name;
    if (editingForm) {
      setEditingForm({...editingForm, company: companyName});
    } else {
      setCompanySearchTerm(companyName);
    }
    setShowCompanyDropdown(false);
  };

  const handleCompanySearchChange = (value) => {
    setCompanySearchTerm(value);
    setShowCompanyDropdown(true);
  };

  const handleCopyLink = (e, formId) => {
    e.preventDefault();
    const formLink = `${window.location.origin}/forms/${formId}`;
    navigator.clipboard.writeText(formLink);
    setCopiedFormId(formId);
    setTimeout(() => setCopiedFormId(null), 2000);
  };

  const handleCopyKey = (e, key) => {
    e.preventDefault();
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCreateForm = async () => {
    try {
      if (!companySearchTerm || companySearchTerm.trim() === '') {
        alert('Please enter a company name');
        return;
      }
      
      // For initial form creation, we only need the company name
      const newForm = {
        company: companySearchTerm,
        submitted: false,
        status: 'pending'
      };
      
      console.log('Sending form data:', newForm); // Debug form data
      
      const response = await createForm(newForm);
      console.log('Create form response:', response); // Debug response
      
      // After creation, show a popup with the form link and key to share
      alert(`Form created successfully!
      
Form Link: ${window.location.origin}/forms/${response.data.id}
Access Key: ${response.data.key}

Please share this link and key with the company.`);
      
      // Reload all forms to ensure we have the latest data
      loadForms(activeTab);
      
      setCompanySearchTerm('');
      setShowPopup(false);
    } catch (error) {
      console.error('Error creating form:', error);
      console.error('Error details:', error.response || error.message);
      alert('Failed to create form. Please check the console for details.');
    }
  };
  
  const handleFormApproval = async (formId, approve = true) => {
    try {
      if (approve) {
        // Step 1: Approve the form
        await approveForm(formId);
        
        // Step 2: Convert form to job (creates a job posting)
        const jobResponse = await convertFormToJob(formId);
        console.log('Job creation response:', jobResponse);
        
        // Step 3: Publish the job automatically
        if (jobResponse?.data?.job_id) {
          await toggleJobPublish(jobResponse.data.job_id);
          alert(`Form approved and job published successfully!\n\nJob Title: ${jobResponse.data.job_title}\nCompany: ${jobResponse.data.company}`);
        } else {
          alert('Form approved and job created successfully!');
        }
      } else {
        await rejectForm(formId);
        alert('Form rejected successfully!');
      }

      // Refresh forms to reflect latest status
      await loadForms(activeTab, currentPage, searchTerm);
    } catch (error) {
      console.error(`Error ${approve ? 'approving' : 'rejecting'} form:`, error);
      alert(`Failed to ${approve ? 'approve' : 'reject'} form. Please try again.`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main content - sidebar removed */}
      <div className="container mx-auto px-4 py-6">
        {/* Main Content */}
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Forms Dashboard</h1>
              <button
                onClick={() => setShowPopup(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <IconPlus size={18} /> Create Form
              </button>
            </div>

            {/* Tabs Navigation */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => handleTabChange('all')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'all'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    All Forms
                  </button>
                  <button
                    onClick={() => handleTabChange('pending')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'pending'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Pending Review
                  </button>
                  <button
                    onClick={() => handleTabChange('approved')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'approved'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Approved Forms
                  </button>
                </nav>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 mb-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by company name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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
              <div className="mt-2 text-sm text-gray-600">
                Showing {forms.length} of {totalCount} forms (Page {currentPage} of {totalPages})
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {activeTab === 'pending' ? 'Forms Pending Review' : 
                 activeTab === 'approved' ? 'Approved Forms' : 'All Forms'}
              </h2>
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              ) : errorMessage ? (
                <p className="text-red-500 text-center py-10">{errorMessage}</p>
              ) : forms.length === 0 ? (
                <p className="text-gray-500 text-center py-10">No forms found in this category.</p>
              ) : (
                <div className="max-h-[70vh] overflow-y-auto border border-gray-200 rounded-lg">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company / Job</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submission</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Array.isArray(forms) && forms.map((form) => (
                          <tr key={form.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-900">{form.company}</span>
                                {form.details?.title && (
                                  <span className="text-xs text-gray-500 mt-0.5">Job: {form.details.title}</span>
                                )}
                                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                                  <span>ID: {form.id}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${form.submitted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {form.submitted ? 'Submitted' : 'Not Submitted'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                form.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                                form.status === 'posted' ? 'bg-green-100 text-green-800' :
                                form.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {(form.status || 'Pending').charAt(0).toUpperCase() + (form.status || 'pending').slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-700">{form.key}</span>
                                <button
                                  onClick={(e) => handleCopyKey(e, form.key)}
                                  className="p-1 rounded-full hover:bg-gray-100"
                                  title="Copy key"
                                >
                                  <IconCopy size={14} className={copiedKey ? 'text-green-500' : 'text-gray-400'} />
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(form.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-wrap gap-2">
                                <a
                                  href={`/forms/${form.id}`}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <IconExternalLink size={14} />
                                  Open
                                </a>
                                <button
                                  onClick={(e) => handleCopyLink(e, form.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100"
                                  title="Copy form link"
                                >
                                  {copiedFormId === form.id ? (
                                    <IconCheck size={14} className="text-green-500" />
                                  ) : (
                                    <IconCopy size={14} />
                                  )}
                                  Link
                                </button>
                                {form.submitted && form.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleFormApproval(form.id, true)}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200"
                                      title="Approve form"
                                    >
                                      <IconThumbUp size={14} />
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleFormApproval(form.id, false)}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200"
                                      title="Reject form"
                                    >
                                      <IconThumbDown size={14} />
                                      Reject
                                    </button>
                                  </>
                                )}
                                {form.status === 'approved' && (
                                  <button
                                    onClick={() => router.push('/admin/companymanagement')}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
                                  >
                                    <IconExternalLink size={14} />
                                    Manage Jobs
                                  </button>
                                )}
                                {form.submitted && (
                                  <button
                                    onClick={() => router.push(`/admin/form/edit/${form.id}`)}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                                  >
                                    <IconEdit size={14} />
                                    View
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 mt-4">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
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
                    onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
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
                      <span className="font-medium">{totalPages}</span> ({totalCount} total forms)
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
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
                            onClick={() => handlePageChange(pageNum)}
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
                        onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
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

      {/* Create Form Popup - Simplified to just company name */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
            <h3 className="text-xl font-bold text-blue-600 mb-4">
              Create New Form
            </h3>
            
            {/* Only Company Name Field */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name*
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IconBuilding className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={companySearchTerm}
                  onChange={(e) => handleCompanySearchChange(e.target.value)}
                  onFocus={() => setShowCompanyDropdown(true)}
                  placeholder="Search for a company..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <IconSearch size={18} className="text-gray-400" />
                </div>
              </div>
              
              {/* Company Dropdown */}
              {showCompanyDropdown && companySearchTerm && (
                <div className="absolute z-10 w-full max-w-md mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredCompanies.length > 0 ? (
                    <div className="py-1">
                      {filteredCompanies.map((company, index) => (
                        <button
                          key={company.id || index}
                          type="button"
                          onClick={() => handleCompanySelect(company)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">
                                {company.name || company.companyName || company.employer_name}
                              </div>
                              {company.location && (
                                <div className="text-sm text-gray-500">{company.location}</div>
                              )}
                            </div>
                            {company.totalActiveJobs > 0 && (
                              <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                {company.totalActiveJobs} jobs
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                      No companies found matching "{companySearchTerm}"
                    </div>
                  )}
                </div>
              )}
              
              {/* Click outside to close dropdown */}
              {showCompanyDropdown && (
                <div
                  className="fixed inset-0 z-5"
                  onClick={() => setShowCompanyDropdown(false)}
                />
              )}
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPopup(false);
                  setCompanySearchTerm('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateForm}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}