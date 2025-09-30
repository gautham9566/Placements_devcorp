'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconPlus, IconCopy, IconCheck, IconSearch, IconBuilding, IconEdit, IconExternalLink, IconThumbUp, IconThumbDown } from '@tabler/icons-react';
import { getForms, createForm, approveForm, rejectForm } from '../../../api/forms';
import { fetchCompanies } from '../../../data/jobsData';
import FormsSidebar from '../../../components/ui/FormsSidebar';

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
  
  const loadForms = useCallback(async (status) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let response;
      const baseParams = { ordering: '-created_at' };

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
    } catch (error) {
      console.error('Error loading forms:', error);
      console.error('Error details:', error.response || error.message);
      setForms([]);
      setErrorMessage('Failed to load forms. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    // Load forms based on active tab
    loadForms(activeTab);
  }, [activeTab, loadForms]);

  useEffect(() => {
    // Load companies once for dropdown suggestions
    loadCompanies();
  }, [loadCompanies]);

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
        await approveForm(formId);
      } else {
        await rejectForm(formId);
      }
      
      alert(`Form ${approve ? 'approved' : 'rejected'} successfully!`);

      // Refresh forms to reflect latest status and remove items from filtered views
      await loadForms(activeTab);
    } catch (error) {
      console.error(`Error ${approve ? 'approving' : 'rejecting'} form:`, error);
      alert(`Failed to ${approve ? 'approve' : 'reject'} form. Please try again.`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main content layout */}
      <div className="flex">
        {/* Sidebar - with position:sticky */}
        <div className="w-64 sticky top-0 h-screen">
          <FormsSidebar className="h-full" />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 p-6">
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
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                  {Array.isArray(forms) && forms.map((form) => (
                    <div
                      key={form.id}
                      className="border border-gray-200 rounded-lg p-4 mb-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{form.company}</h3>
                          <div className="flex gap-3 mt-1">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">Key: {form.key}</span>
                              <button
                                onClick={(e) => handleCopyKey(e, form.key)}
                                className="p-1 hover:bg-gray-100 rounded-full"
                                title="Copy key"
                              >
                                <IconCopy size={14} className={copiedKey ? "text-green-500" : "text-gray-400"} />
                              </button>
                            </div>
                            <p className="text-xs text-gray-500">
                              Status: {form.submitted ? 
                                <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">Completed</span> : 
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">Not Submitted</span>}
                            </p>
                            {form.status && (
                              <p className="text-xs">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  form.status === 'approved' ? 'bg-blue-100 text-blue-800' : 
                                  form.status === 'posted' ? 'bg-green-100 text-green-800' : 
                                  form.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
                                </span>
                              </p>
                            )}
                          </div>
                          
                          {/* Show job title if available */}
                          {form.details?.title && (
                            <p className="text-sm text-gray-700 mt-2">
                              <span className="font-medium">Job:</span> {form.details.title}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={`/forms/${form.id}`}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <IconExternalLink size={16} />
                            Open Form
                          </a>
                          <button
                            onClick={(e) => handleCopyLink(e, form.id)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
                            title="Copy form link"
                          >
                            {copiedFormId === form.id ? (
                              <IconCheck size={18} className="text-green-500" />
                            ) : (
                              <IconCopy size={18} />
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {/* Form Actions */}
                      <div className="mt-4 border-t pt-4 flex justify-between items-center">
                        {/* Status Display */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">Created: {new Date(form.created_at).toLocaleDateString()}</span>
                        </div>
                        
                        {/* Buttons */}
                        <div className="flex gap-2">
                          {/* Conditional buttons based on form status */}
                          {form.submitted && form.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleFormApproval(form.id, true)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                title="Approve form"
                              >
                                <IconThumbUp size={16} />
                                Approve
                              </button>
                              <button
                                onClick={() => handleFormApproval(form.id, false)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                title="Reject form"
                              >
                                <IconThumbDown size={16} />
                                Reject
                              </button>
                            </>
                          )}
                          
                          {form.status === 'approved' && (
                            <button
                              onClick={() => router.push(`/admin/companymanagement`)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            >
                              <IconExternalLink size={16} />
                              Manage Jobs
                            </button>
                          )}
                          
                          {/* View Details for submitted forms */}
                          {form.submitted && (
                            <button
                              onClick={() => router.push(`/admin/form/edit/${form.id}`)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                              <IconEdit size={16} />
                              View Details
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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