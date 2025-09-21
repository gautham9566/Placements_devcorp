'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconPlus, IconCopy, IconCheck, IconSearch, IconBuilding, IconEdit, IconExternalLink } from '@tabler/icons-react';
import { getForms, createForm, updateForm } from '../../../api/forms';
import { fetchCompanies } from '../../../data/jobsData';
import FormsSidebar from '../../../components/ui/FormsSidebar';

export default function AdminFormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [formInput, setFormInput] = useState({ company: '' });
  const [editingForm, setEditingForm] = useState(null);
  
  // Company search states
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // State for copy confirmation
  const [copiedFormId, setCopiedFormId] = useState(null);

  useEffect(() => {
    // Fetch forms when component mounts
    const loadForms = async () => {
      setIsLoading(true);
      try {
        const response = await getForms();
        // Ensure response.data is an array, fallback to empty array
        const formsData = Array.isArray(response?.data) ? response.data : [];
        setForms(formsData);
      } catch (error) {
        console.error('Error loading forms:', error);
        // On error, ensure forms remains an empty array
        setForms([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Fetch companies for dropdown
    const loadCompanies = async () => {
      try {
        const companiesData = await fetchCompanies();
        // Ensure companies is an array
        setCompanies(Array.isArray(companiesData) ? companiesData : []);
      } catch (error) {
        console.error('Error loading companies:', error);
        // On error, ensure companies remains an empty array
        setCompanies([]);
      }
    };
    
    loadForms();
    loadCompanies();
  }, []);

  // Filter companies based on search term - add safety check
  const filteredCompanies = Array.isArray(companies) ? companies.filter(company => {
    const companyName = (company.name || company.companyName || company.employer_name || '').toLowerCase();
    return companyName.includes(companySearchTerm.toLowerCase());
  }) : [];

  const handleCompanySelect = (company) => {
    const companyName = company.name || company.companyName || company.employer_name;
    if (editingForm) {
      setEditingForm({...editingForm, company: companyName});
    } else {
      setFormInput({ company: companyName });
    }
    setCompanySearchTerm(companyName);
    setShowCompanyDropdown(false);
  };

  const handleCompanySearchChange = (value) => {
    setCompanySearchTerm(value);
    if (editingForm) {
      setEditingForm({...editingForm, company: value});
    } else {
      setFormInput({ company: value });
    }
    setShowCompanyDropdown(true);
  };

  const handleCopyLink = (e, formId) => {
    e.preventDefault();
    const formLink = `${window.location.origin}/forms/${formId}`;
    navigator.clipboard.writeText(formLink);
    setCopiedFormId(formId);
    setTimeout(() => setCopiedFormId(null), 2000);
  };

  const handleCreateForm = async () => {
    try {
      if (!formInput.company || formInput.company.trim() === '') {
        alert('Please enter a company name');
        return;
      }
      
      const newForm = {
        company: formInput.company,
        submitted: false,
        details: null
      };
      
      const response = await createForm(newForm);
      setForms([response.data, ...(Array.isArray(forms) ? forms : [])]);
      setFormInput({ company: '' });
      setCompanySearchTerm('');
      setShowPopup(false);
    } catch (error) {
      console.error('Error creating form:', error);
      alert('Failed to create form. Please try again.');
    }
  };

  const handleEditForm = (form) => {
    setEditingForm(form);
    setCompanySearchTerm(form.company);
    setShowPopup(true);
  };

  const handleUpdateForm = async () => {
    try {
      if (!editingForm.company || editingForm.company.trim() === '') {
        alert('Please enter a company name');
        return;
      }
      
      await updateForm(editingForm.id, editingForm);
      
      // Update local state
      setForms((Array.isArray(forms) ? forms : []).map(f => f.id === editingForm.id ? editingForm : f));
      setEditingForm(null);
      setCompanySearchTerm('');
      setShowPopup(false);
    } catch (error) {
      console.error('Error updating form:', error);
      alert('Failed to update form. Please try again.');
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setEditingForm(null);
    setCompanySearchTerm('');
    setFormInput({ company: '' });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Use the FormsSidebar component */}
      <FormsSidebar />
      
      {/* Main Content - added margin to account for sidebar */}
      <div className="flex-1 ml-64 p-6">
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

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Available Forms</h2>
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : forms.length === 0 ? (
              <p className="text-gray-500 text-center py-10">No forms created yet.</p>
            ) : (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                {Array.isArray(forms) && forms.map((form) => (
                  <div
                    key={form.id}
                    className="border-b border-gray-200 pb-4 mb-4 last:border-b-0 last:mb-0 last:pb-0"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{form.company}</h3>
                        <p className="text-xs text-gray-500 mt-1">Key: {form.key}</p>
                        <p className="text-xs text-gray-500">
                          Status: {form.submitted ? 
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">Completed</span> : 
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">Not Submitted</span>}
                        </p>
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
                        <button
                          onClick={() => handleEditForm(form)}
                          className="p-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100"
                          title="Edit form"
                        >
                          <IconEdit size={18} />
                        </button>
                      </div>
                    </div>
                    {form.submitted && (
                      <div className="mt-2 text-right">
                        <button
                          onClick={() => router.push(`/admin/form/edit/${form.id}`)}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          View Details
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Form Popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
            <h3 className="text-xl font-bold text-blue-600 mb-4">
              {editingForm ? 'Edit Form' : 'Create New Form'}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
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
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
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
                onClick={handleClosePopup}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingForm ? handleUpdateForm : handleCreateForm}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingForm ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
