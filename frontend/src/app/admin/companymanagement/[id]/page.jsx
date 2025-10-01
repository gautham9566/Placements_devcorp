'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { use } from 'react';
import {
  ArrowLeft,
  MapPin,
  Building2,
  Clock,
  DollarSign,
  Calendar,
  Target,
  Users,
  Globe,
  CheckCircle,
  Heart,
  ExternalLink,
  Briefcase,
  GraduationCap,
  Award,
  TrendingUp,
  Star,
  Eye,
  Building,
  ChevronRight,
  Mail,
  Phone,
  Share2,
  Bookmark,
  BookmarkCheck,
  Loader,
  AlertCircle,
  Edit,
  Save,
  X,
  Plus,
  FileText,
  Send,
  Search
} from "lucide-react";

// Import the API functions
import { companiesAPI } from '../../../../api/optimized';
import { 
  getCompany, 
  transformCompanyData, 
  updateCompany,
  getFollowersCount
} from '../../../../api/companies';
import { getFormsForCompany, updateForm, approveForm, convertFormToJob } from '../../../../api/forms';
import { createJob, listJobsAdmin, toggleJobPublish } from '../../../../api/jobs';
import { getUserId } from '../../../../utils/auth';
import JobPostingForm from '../../../../components/JobPostingForm';
import { FormattedJobDescription } from '../../../../lib/utils';

export default function AdminCompanyDetail({ params }) {
  const unwrappedParams = use(params);
  const companyId = parseInt(unwrappedParams.id);
  const router = useRouter();
  
  const [company, setCompany] = useState(null);
  const [activeTab, setActiveTab] = useState('jobs');
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [isSaving, setSaving] = useState(false);
  
  // Job management state
  const [pendingForms, setPendingForms] = useState([]);
  const [publishedForms, setPublishedForms] = useState([]);
  const [publishedJobs, setPublishedJobs] = useState([]);
  const [unpublishedJobs, setUnpublishedJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [showJobCreationModal, setShowJobCreationModal] = useState(false);
  
  // Pagination and search state for To be Published tab
  const [toPublishPage, setToPublishPage] = useState(1);
  const [toPublishSearch, setToPublishSearch] = useState('');
  const toPublishPerPage = 10;
  
  // Pagination and search state for Published tab
  const [publishedPage, setPublishedPage] = useState(1);
  const [publishedSearch, setPublishedSearch] = useState('');
  const publishedPerPage = 10;

  useEffect(() => {
    loadCompanyData();
  }, [companyId]);

  // Load job data after company data is loaded
  useEffect(() => {
    if (company) {
      loadJobData();
    }
  }, [company]);

  const loadCompanyData = async () => {
    setLoading(true);
    try {
      // Fetch company data from API
      const response = await getCompany(companyId);
      const companyData = transformCompanyData(response.data);
      
      if (companyData) {
        setCompany(companyData);
        setEditFormData(companyData);
        
        // Load follower count from API
        try {
          const followerResponse = await getFollowersCount(companyId);
          setFollowerCount(followerResponse.data.count || 0);
        } catch (error) {
          console.error("Error fetching follower count:", error);
          setFollowerCount(0);
        }
        
        setError(null);
      } else {
        setError("Company not found");
        router.push('/admin/companymanagement');
      }
    } catch (err) {
      console.error("Error fetching company:", err);
      setError("Failed to load company data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadJobData = async () => {
    if (!company) return;
    
    setLoadingJobs(true);
    console.log('🔍 LoadJobData called for company:', company.name, 'ID:', company.id);
    
    try {
      const formsResponse = await getFormsForCompany(company.name, {
        submitted: true,
        status: ['pending', 'approved', 'posted'],
        ordering: '-created_at'
      });

      const formsPayload = formsResponse?.data;
      const formsData = Array.isArray(formsPayload?.results)
        ? formsPayload.results
        : Array.isArray(formsPayload)
          ? formsPayload
          : Array.isArray(formsPayload?.data)
            ? formsPayload.data
            : [];

      const normalizedCompany = company.name.toLowerCase().trim();
      const belongsToCompany = (form) => {
        if (!form.company) return false;
        const formCompany = String(form.company).toLowerCase().trim();
        return formCompany === normalizedCompany ||
               formCompany.includes(normalizedCompany) ||
               normalizedCompany.includes(formCompany);
      };

      const companyForms = formsData.filter((form) => form.submitted && belongsToCompany(form));

      const pendingCompanyForms = companyForms.filter((form) => {
        const status = (form.status || '').toLowerCase();
        // Include pending forms (forms that need review before publishing)
        return !status || status === 'pending' || status === 'pending_review';
      });

      const publishedCompanyForms = companyForms.filter((form) => {
        const status = (form.status || '').toLowerCase();
        return status === 'approved' || status === 'posted';
      });

      setPendingForms(pendingCompanyForms);
      setPublishedForms(publishedCompanyForms);
      
      // Load published jobs for this company
      try {
        console.log('🔍 Loading jobs from admin API...');
        // Filter jobs by company ID to avoid pagination issues
        const jobsResponse = await listJobsAdmin({ 
          company_id: company.id,
          per_page: 100  // Get all jobs for this company
        });
        console.log('🔍 Raw jobs response:', jobsResponse);
        
        let allJobs = [];
        
        // Handle different response structures from admin endpoint
        if (jobsResponse.data?.data) {
          allJobs = Array.isArray(jobsResponse.data.data) ? jobsResponse.data.data : [];
          console.log('🔍 Jobs from jobsResponse.data.data:', allJobs.length);
        } else if (jobsResponse.data) {
          allJobs = Array.isArray(jobsResponse.data) ? jobsResponse.data : [];
          console.log('🔍 Jobs from jobsResponse.data:', allJobs.length);
        } else if (Array.isArray(jobsResponse)) {
          allJobs = jobsResponse;
          console.log('🔍 Jobs from direct array:', allJobs.length);
        }
        
        console.log('🔍 All jobs loaded:', allJobs.length);
        
        // Log first few jobs for debugging
        if (allJobs.length > 0) {
          console.log('🔍 Sample jobs data:');
          allJobs.slice(0, 3).forEach((job, index) => {
            console.log(`  Job ${index + 1}:`, {
              id: job.id,
              title: job.title,
              company_name: job.company_name,
              company_id: job.company_id,
              is_published: job.is_published
            });
          });
        } else {
          console.log('⚠️ No jobs found in API response');
        }
        
        // Since we're filtering by company in the API, all jobs should belong to this company
        // But let's still verify the filtering as a safety check
        console.log('🔍 Filtering jobs for company:', company.name, 'Company ID:', company.id);
        const companyJobs = allJobs.filter(job => {
          // Try multiple matching strategies
          const matchByName = job.company_name && 
            job.company_name.toLowerCase().includes(company.name.toLowerCase());
          
          const matchById = job.company_id && company.id && 
            parseInt(job.company_id) === parseInt(company.id);
          
          const match = matchByName || matchById;
          
          if (job.company_name || job.company_id) {
            console.log(`🔍 Job "${job.title}": company_name="${job.company_name}", company_id="${job.company_id}", matchByName=${matchByName}, matchById=${matchById}, overall=${match}`);
          }
          
          return match;
        });
        
        // Separate published and unpublished jobs
        const publishedCompanyJobs = companyJobs.filter(job => job.is_published === true);
        const unpublishedCompanyJobs = companyJobs.filter(job => job.is_published === false);
        
        console.log('🔍 Results:');
        console.log('  Total company jobs:', companyJobs.length);
        console.log('  Published company jobs:', publishedCompanyJobs.length);
        console.log('  Unpublished company jobs:', unpublishedCompanyJobs.length);
        
        setPublishedJobs(publishedCompanyJobs);
        setUnpublishedJobs(unpublishedCompanyJobs);
      } catch (jobError) {
        console.error("❌ Error loading jobs:", jobError);
        console.error("❌ Job error details:", jobError.response?.data);
        setPublishedJobs([]);
        setUnpublishedJobs([]);
      }
      
    } catch (error) {
      console.error("❌ Error loading job data:", error);
      console.error("❌ Error details:", error.response?.data);
  setPendingForms([]);
  setPublishedForms([]);
      setPublishedJobs([]);
      setUnpublishedJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset form data
      setEditFormData(company);
    }
    setIsEditing(!isEditing);
  };

  const handleEditSave = async () => {
    setSaving(true);
    try {
      const response = await updateCompany(companyId, editFormData);
      const updatedCompany = transformCompanyData(response.data);
      setCompany(updatedCompany);
      setIsEditing(false);
      alert('Company updated successfully!');
    } catch (error) {
      console.error("Error updating company:", error);
      alert('Failed to update company. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFormFieldChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateJobFromForm = (form) => {
    setSelectedForm(form);
    setShowJobCreationModal(true);
  };

  const handleJobCreation = async (jobData) => {
    const sourceForm = selectedForm;
    try {
      console.log('Raw job data from form:', jobData);
      
      // Transform the job data to match backend expectations (same format as admin jobs page)
      const transformedJobData = {
        title: jobData.title,
        description: jobData.description,
        location: jobData.location,
        job_type: jobData.job_type || 'FULL_TIME',
        salary_min: parseFloat(jobData.salary_min) || 0,
        salary_max: parseFloat(jobData.salary_max) || 0,
        required_skills: (() => {
          // Combine requirements and skills arrays, prioritizing non-empty arrays
          const requirements = Array.isArray(jobData.requirements) ? jobData.requirements.filter(r => r.trim()) : [];
          const skills = Array.isArray(jobData.skills) ? jobData.skills.filter(s => s.trim()) : [];
          const combined = [...requirements, ...skills];
          
          if (combined.length > 0) {
            return combined.join(', ');
          }
          
          // Fallback to string field if arrays are empty
          return jobData.required_skills || 'No specific requirements';
        })(),
        application_deadline: jobData.application_deadline || jobData.deadline,
        is_active: jobData.is_active !== undefined ? jobData.is_active : true,
        company_name: company.name  // Add company name for proper association
      };
      
      console.log('Transformed job data being sent:', transformedJobData);
      
      await createJob(transformedJobData);
      
      if (sourceForm) {
        try {
          await updateForm(sourceForm.id, {
            status: 'posted',
            submitted: true,
          });
        } catch (updateError) {
          console.error('Error updating form status after job creation:', updateError);
        }
      }
      
      alert('Job published successfully! It will now appear in the Published section.');
      setShowJobCreationModal(false);
      setSelectedForm(null);
      
      // Remove the form from approved forms since it's now published
      // Reload job data to show the new job in Published section
      await loadJobData();
      
    } catch (error) {
      console.error("Error creating job:", error);
      console.error("Error details:", error.response?.data);
      alert('Failed to create job posting. Please try again.');
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

  // Add function to handle job publish toggle
  const handleJobPublishToggle = async (jobId, currentStatus) => {
    try {
      const response = await toggleJobPublish(jobId);
      console.log('Toggle response:', response);
      
      // Reload job data to reflect changes
      await loadJobData();
    } catch (error) {
      console.error('Error toggling job publish status:', error);
      alert('Failed to update job status. Please try again.');
    }
  };

  // Add function to handle job edit
  const handleJobEdit = (jobId) => {
    router.push(`/admin/companymanagement/jobs/edit/${jobId}`);
  };

  // Add function to handle job view
  const handleJobView = (jobId) => {
    router.push(`/jobs/${jobId}`);
  };
  
  // Add function to handle form publishing with auto-approve
  const handlePublishForm = async (formId) => {
    if (!confirm('This will approve and publish the job posting. Continue?')) {
      return;
    }
    
    try {
      setLoadingJobs(true);
      
      // Step 1: Approve the form
      await approveForm(formId);
      
      // Step 2: Convert form to job (creates a job posting)
      const jobResponse = await convertFormToJob(formId);
      
      // Step 3: Publish the job automatically
      if (jobResponse?.data?.job_id) {
        await toggleJobPublish(jobResponse.data.job_id);
        alert(`Job published successfully!\n\nJob Title: ${jobResponse.data.job_title}\nCompany: ${jobResponse.data.company}`);
      } else {
        alert('Form approved and job created successfully!');
      }
      
      // Refresh job data
      await loadJobData();
    } catch (error) {
      console.error('Error publishing form:', error);
      alert('Failed to publish form. Please try again.');
    } finally {
      setLoadingJobs(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading company details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <AlertCircle className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Company</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/admin/companymanagement')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Company Management
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        {/* Back Navigation */}
        <div className="mb-4">
          <button
            onClick={() => router.push('/admin/companymanagement')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Company Management</span>
          </button>
        </div>

        {/* Company Header Banner */}
        <div className="relative mb-6">
          {/* Banner Background */}
          <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-800 relative overflow-hidden rounded-xl">
            <div className="absolute inset-0 bg-black opacity-20"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
            
            {/* Company Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-end justify-between">
                {/* Company Logo */}
                <div className="w-16 h-16 bg-white rounded-xl shadow-lg flex items-center justify-center overflow-hidden border-4 border-white">
                  {company.logo ? (
                    <img 
                      src={company.logo} 
                      alt={company.name}
                                              className="w-12 h-12 rounded-lg object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <Building2 className={`w-8 h-8 text-gray-600 ${company.logo ? 'hidden' : 'flex'}`} />
                </div>

                {/* Company Title */}
                <div className="flex-1 text-white pb-2 ml-6">
                  <div className="flex items-center gap-4 mb-2">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.name || ''}
                        onChange={(e) => handleFormFieldChange('name', e.target.value)}
                        className="text-2xl font-bold bg-white/20 text-white placeholder-white/70 border border-white/30 rounded-lg px-3 py-1"
                        placeholder="Company Name"
                      />
                    ) : (
                      <h1 className="text-2xl font-bold">{company.name}</h1>
                    )}
                    
                    {/* Edit/Save Controls */}
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={handleEditSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {isSaving ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            {isSaving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={handleEditToggle}
                            className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white border border-white/30 rounded-lg hover:bg-white/30 transition-colors"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleEditToggle}
                          className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white border border-white/30 rounded-lg hover:bg-white/30 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          Edit Company
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-white/90">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.industry || ''}
                        onChange={(e) => handleFormFieldChange('industry', e.target.value)}
                        className="bg-white/20 text-white placeholder-white/70 border border-white/30 rounded px-2 py-1"
                        placeholder="Industry"
                      />
                    ) : (
                      <span>{company.industry}</span>
                    )}
                    <span>•</span>
                    <span>{followerCount.toLocaleString()} followers</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Company Quick Info */}
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg mt-4">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.location || ''}
                        onChange={(e) => handleFormFieldChange('location', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1"
                        placeholder="Location"
                      />
                    ) : (
                      <span>{company.location}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.size || ''}
                        onChange={(e) => handleFormFieldChange('size', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1"
                        placeholder="Company Size"
                      />
                    ) : (
                      <span>{company.size}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.founded || ''}
                        onChange={(e) => handleFormFieldChange('founded', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1"
                        placeholder="Founded Year"
                      />
                    ) : (
                      <span>Founded {company.founded}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-blue-600 hover:text-blue-800">
                    <Globe className="w-4 h-4" />
                    {isEditing ? (
                      <input
                        type="url"
                        value={editFormData.website || ''}
                        onChange={(e) => handleFormFieldChange('website', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1"
                        placeholder="Website URL"
                      />
                    ) : (
                      <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                        <span>Website</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getTierColor(company.tier)}`}>
                    <Star className="w-4 h-4" />
                    <span>{company.tier}</span>
                  </div>
                  {company.campus_recruiting && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      Campus Recruiting
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {['jobs', 'overview'  ].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'jobs' ? 'Job Management' : 'Overview'}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          {activeTab === 'overview' && (
            <div className="max-w-4xl">
              <div className="space-y-8">
                {/* Company Description */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">About {company.name}</h2>
                  {isEditing ? (
                    <textarea
                      value={editFormData.description || ''}
                      onChange={(e) => handleFormFieldChange('description', e.target.value)}
                      rows="6"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Company description..."
                    />
                  ) : (
                    <p className="text-gray-700 leading-relaxed text-lg">
                      {company.description}
                    </p>
                  )}
                </div>

                {/* Key Metrics */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Metrics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-blue-50 rounded-lg p-6 text-center">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Briefcase className="w-6 h-6 text-blue-600" />
                        <h4 className="font-semibold text-blue-900">Active Jobs</h4>
                      </div>
                      <p className="text-3xl font-bold text-blue-900">{company.totalActiveJobs || 0}</p>
                    </div>

                    <div className="bg-green-50 rounded-lg p-6 text-center">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Users className="w-6 h-6 text-green-600" />
                        <h4 className="font-semibold text-green-900">Total Applicants</h4>
                      </div>
                      <p className="text-3xl font-bold text-green-900">{company.totalApplicants || 0}</p>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-6 text-center">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <CheckCircle className="w-6 h-6 text-purple-600" />
                        <h4 className="font-semibold text-purple-900">Total Hired</h4>
                      </div>
                      <p className="text-3xl font-bold text-purple-900">{company.totalHired || 0}</p>
                    </div>

                    <div className="bg-amber-50 rounded-lg p-6 text-center">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Clock className="w-6 h-6 text-amber-600" />
                        <h4 className="font-semibold text-amber-900">Pending Review</h4>
                      </div>
                      <p className="text-3xl font-bold text-amber-900">{company.awaited_approval || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Company Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Details</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Industry</h4>
                        <p className="text-gray-700">{company.industry}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Company Size</h4>
                        <p className="text-gray-700">{company.size}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Founded</h4>
                        <p className="text-gray-700">{company.founded}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Headquarters</h4>
                        <p className="text-gray-700">{company.location}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'jobs' && (
            <div className="space-y-6">
              {/* Jobs Section Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Job Management</h2>
                <div className="flex items-center gap-4">
                  <button
                    onClick={loadJobData}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                  >
                    Refresh Data
                  </button>
                  <button
                    onClick={() => router.push(`/admin/jobs/create?company_id=${companyId}&company_name=${encodeURIComponent(company.name)}`)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Post New Job
                  </button>
                  <div className="text-sm text-gray-500">
                    Manage job postings from approved forms
                  </div>
                </div>
              </div>

              {/* Pass the handlers to JobManagementTabs */}
              <JobManagementTabs 
                pendingForms={pendingForms}
                publishedForms={publishedForms}
                publishedJobs={publishedJobs}
                unpublishedJobs={unpublishedJobs}
                loadingJobs={loadingJobs}
                onPublishToggle={handleJobPublishToggle}
                onEditJob={handleJobEdit}
                onViewJob={handleJobView}
                onPublishForm={handlePublishForm}
              />
            </div>
          )}
        </div>
      </div>

      {/* Job Creation Modal */}
      {showJobCreationModal && selectedForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Create Job Posting</h3>
                  <p className="text-sm text-gray-500 mt-1">Based on form: {selectedForm.key}</p>
                </div>
                <button
                  onClick={() => setShowJobCreationModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <JobPostingForm
                companies={[company]} // Pass current company as pre-selected
                onSubmit={handleJobCreation}
                onCancel={() => setShowJobCreationModal(false)}
                initialData={{
                  title: selectedForm.details?.title || '',
                  description: selectedForm.details?.description || '',
                  location: selectedForm.details?.location || company.location || '',
                  salary_min: selectedForm.details?.salaryMin || '',
                  salary_max: selectedForm.details?.salaryMax || '',
                  skills: selectedForm.details?.skills ? selectedForm.details.skills.split(',').map(s => s.trim()) : [],
                  requirements: selectedForm.details?.requirements ? selectedForm.details.requirements.split(',').map(r => r.trim()) : [],
                  application_deadline: selectedForm.details?.deadline || '',
                  company_name: company.name,
                  company_id: companyId
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Job Management Tabs Component
function JobManagementTabs({ 
  pendingForms = [],
  publishedForms = [],
  publishedJobs = [], 
  unpublishedJobs = [], 
  loadingJobs, 
  onPublishToggle,
  onEditJob,
  onViewJob,
  onPublishForm
}) {
  const router = useRouter();
  const [activeJobTab, setActiveJobTab] = useState('to-publish');
  
  // Pagination and search for To be Published
  const [toPublishPage, setToPublishPage] = useState(1);
  const [toPublishSearch, setToPublishSearch] = useState('');
  const toPublishPerPage = 10;
  
  // Pagination and search for Published
  const [publishedPage, setPublishedPage] = useState(1);
  const [publishedSearch, setPublishedSearch] = useState('');
  const publishedPerPage = 10;

  const pendingFormCount = pendingForms?.length || 0;
  const publishedFormCount = publishedForms?.length || 0;
  const toPublishCount = (pendingFormCount + unpublishedJobs?.length) || 0;
  const publishedCount = publishedJobs?.length || 0;
  
  // Filter and paginate To be Published items
  const filteredToPublish = React.useMemo(() => {
    const allItems = [
      ...pendingForms.map(f => ({ ...f, type: 'form' })),
      ...unpublishedJobs.map(j => ({ ...j, type: 'job' }))
    ];
    
    if (!toPublishSearch.trim()) return allItems;
    
    const search = toPublishSearch.toLowerCase();
    return allItems.filter(item => {
      if (item.type === 'form') {
        return (item.details?.title || '').toLowerCase().includes(search) ||
               (item.details?.location || '').toLowerCase().includes(search);
      } else {
        return (item.title || '').toLowerCase().includes(search) ||
               (item.location || '').toLowerCase().includes(search);
      }
    });
  }, [pendingForms, unpublishedJobs, toPublishSearch]);
  
  const paginatedToPublish = React.useMemo(() => {
    const start = (toPublishPage - 1) * toPublishPerPage;
    return filteredToPublish.slice(start, start + toPublishPerPage);
  }, [filteredToPublish, toPublishPage, toPublishPerPage]);
  
  const toPublishTotalPages = Math.ceil(filteredToPublish.length / toPublishPerPage);
  
  // Filter and paginate Published items
  const filteredPublished = React.useMemo(() => {
    if (!publishedSearch.trim()) return publishedJobs;
    
    const search = publishedSearch.toLowerCase();
    return publishedJobs.filter(job =>
      (job.title || '').toLowerCase().includes(search) ||
      (job.location || '').toLowerCase().includes(search)
    );
  }, [publishedJobs, publishedSearch]);
  
  const paginatedPublished = React.useMemo(() => {
    const start = (publishedPage - 1) * publishedPerPage;
    return filteredPublished.slice(start, start + publishedPerPage);
  }, [filteredPublished, publishedPage, publishedPerPage]);
  
  const publishedTotalPages = Math.ceil(filteredPublished.length / publishedPerPage);

  if (loadingJobs) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Job Sub-tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveJobTab('to-publish')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeJobTab === 'to-publish'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            To be Published ({toPublishCount})
          </button>
          <button
            onClick={() => setActiveJobTab('published')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeJobTab === 'published'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Published ({publishedCount})
          </button>
        </nav>
      </div>

      {/* Job Content */}
      <div className="space-y-6">
        {activeJobTab === 'to-publish' && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by title or location..."
                  value={toPublishSearch}
                  onChange={(e) => {
                    setToPublishSearch(e.target.value);
                    setToPublishPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="text-sm text-gray-600">
                Showing {paginatedToPublish.length} of {filteredToPublish.length} items
              </div>
            </div>
            
            {/* Combined Section for Pending Forms and Unpublished Jobs */}
            <section>
              {filteredToPublish.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    {toPublishSearch ? 'No results found' : 'No unpublished jobs'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {toPublishSearch ? 'Try a different search term' : 'Jobs created but not yet published will appear here'}
                  </p>
                </div>
              ) : (
                <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Job Title
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Salary
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Deadline
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedToPublish.map((item) => (
                          <tr key={item.type === 'form' ? `form-${item.id}` : `job-${item.id}`} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {item.type === 'form' ? (item.details?.title || 'Untitled Position') : item.title}
                                </div>
                                <div className="text-sm text-gray-500">
                                  ID: {item.id?.toString().substring(0, 8)}...
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {item.type === 'form' ? (item.details?.location || 'N/A') : (item.location || 'N/A')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {item.type === 'form' ? (
                                  item.details?.jobType === 'FULL_TIME' ? 'Full Time' :
                                  item.details?.jobType === 'PART_TIME' ? 'Part Time' :
                                  item.details?.jobType === 'INTERNSHIP' ? 'Internship' :
                                  item.details?.jobType === 'CONTRACT' ? 'Contract' :
                                  item.details?.jobType || 'INTERNSHIP'
                                ) : (
                                  item.job_type === 'FULL_TIME' ? 'Full Time' :
                                  item.job_type === 'PART_TIME' ? 'Part Time' :
                                  item.job_type === 'INTERNSHIP' ? 'Internship' :
                                  item.job_type === 'CONTRACT' ? 'Contract' :
                                  item.job_type || 'INTERNSHIP'
                                )}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {item.type === 'form' ? (
                                  item.details?.salaryMax ? `Up to $${item.details.salaryMax}` : 'Not specified'
                                ) : (
                                  item.salary_max ? `Up to $${item.salary_max.toLocaleString()}` : 'Not specified'
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {item.type === 'form' ? (
                                  item.details?.deadline ? new Date(item.details.deadline).toLocaleDateString() : 'Not specified'
                                ) : (
                                  item.application_deadline ? new Date(item.application_deadline).toLocaleDateString() : 'Not specified'
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                To be Published
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                {item.type === 'form' ? (
                                  <>
                                    <button
                                      onClick={() => onPublishForm(item.id)}
                                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                      <Send className="w-3 h-3 mr-1" />
                                      Publish
                                    </button>
                                    <button
                                      onClick={() => router.push(`/admin/form/edit/${item.id}`)}
                                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                      <Edit className="w-3 h-3 mr-1" />
                                      Edit
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => onPublishToggle(item.id, false)}
                                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                      <Send className="w-3 h-3 mr-1" />
                                      Publish
                                    </button>
                                    <button
                                      onClick={() => onEditJob(item.id)}
                                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                      <Edit className="w-3 h-3 mr-1" />
                                      Edit
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination for To be Published */}
                  {toPublishTotalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
                      <div className="flex justify-between items-center w-full">
                        <div className="text-sm text-gray-700">
                          Page {toPublishPage} of {toPublishTotalPages}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setToPublishPage(p => Math.max(1, p - 1))}
                            disabled={toPublishPage === 1}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setToPublishPage(p => Math.min(toPublishTotalPages, p + 1))}
                            disabled={toPublishPage === toPublishTotalPages}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {activeJobTab === 'published' && (
          <div className="space-y-8">
            {publishedFormCount > 0 && (
              <section className="border border-blue-200 bg-blue-50 text-blue-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide">Approved & Published Forms</h3>
                  <p className="text-sm">
                    {publishedFormCount} form{publishedFormCount === 1 ? '' : 's'} are available in the Forms Dashboard for deeper review or updates.
                  </p>
                </div>
                <button
                  onClick={() => router.push('/admin/form?tab=approved')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Forms
                </button>
              </section>
            )}

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Published Job Listings</h3>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search published jobs..."
                    value={publishedSearch}
                    onChange={(e) => {
                      setPublishedSearch(e.target.value);
                      setPublishedPage(1); // Reset to first page on search
                    }}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                </div>
              </div>
              
              {paginatedPublished.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    {publishedSearch ? 'No matching published jobs' : 'No published jobs'}
                  </p>
                  <p className="text-gray-400 text-sm">Published jobs will appear here</p>
                </div>
              ) : (
                <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Job Title
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Salary
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Deadline
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedPublished.map((job) => (
                          <tr key={job.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{job.title}</div>
                                <div className="text-sm text-gray-500">ID: {job.id}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{job.location}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{job.job_type}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {job.salary_max ? `Up to $${job.salary_max.toLocaleString()}` : 'Not specified'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {job.application_deadline ? new Date(job.application_deadline).toLocaleDateString() : 'Not specified'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                Active
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => onViewJob(job.id)}
                                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </button>
                                <button
                                  onClick={() => onEditJob(job.id)}
                                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => onPublishToggle(job.id, true)}
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Unpublish
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination for Published */}
                  {publishedTotalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
                      <div className="flex justify-between items-center w-full">
                        <div className="text-sm text-gray-700">
                          Page {publishedPage} of {publishedTotalPages}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPublishedPage(p => Math.max(1, p - 1))}
                            disabled={publishedPage === 1}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setPublishedPage(p => Math.min(publishedTotalPages, p + 1))}
                            disabled={publishedPage === publishedTotalPages}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
} 