'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IconArrowLeft, IconCheck } from '@tabler/icons-react';
import JobPostingForm from '../../../../../components/JobPostingForm';
import { createJob } from '../../../../../api/jobs';
import { fetchSimpleCompanies } from '../../../../../api/companies';

export default function CreateJobPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch companies on component mount
  useEffect(() => {
    const fetchCompanies = async () => {
      setLoading(true);
      try {
        console.log('Fetching companies for job creation...');
        const response = await fetchSimpleCompanies();
        
        if (response.success && Array.isArray(response.data)) {
          setCompanies(response.data);
          console.log(`Loaded ${response.data.length} companies for job creation`);
          setError(null);
        } else {
          throw new Error(response.error || 'Failed to fetch companies');
        }
      } catch (err) {
        console.error('Failed to fetch companies:', err);
        setError('Failed to load companies. Please check your connection and try again.');
        setCompanies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  const handleCreateJob = async (jobData) => {
    setIsSubmitting(true);
    try {
      // Format the data according to what the backend expects
      const formattedJobData = {
        title: jobData.title,
        description: jobData.description,
        location: jobData.location,
        job_type: jobData.job_type || 'FULL_TIME',
        salary_min: parseFloat(jobData.salary_min) || 0,
        salary_max: parseFloat(jobData.salary_max) || 0,
        required_skills: jobData.required_skills || '',
        application_deadline: jobData.application_deadline || jobData.deadline,
        is_active: jobData.is_active !== undefined ? jobData.is_active : true,
        company_name: jobData.company_name, // Add company name from form
        interview_rounds: jobData.interview_rounds || [], // Include interview rounds
        additional_fields: jobData.additional_fields || [] // Include additional fields
      };
      
      console.log('Sending job data to backend:', formattedJobData);
      await createJob(formattedJobData);
      setSuccess(true);
      
      // Show success message and redirect after a short delay
      setTimeout(() => {
        router.push('/admin/companymanagement/jobs/listings');
      }, 2000);
      
    } catch (error) {
      console.error('Error creating job:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      throw error; // Re-throw to let the form handle it
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      router.push('/admin/companymanagement/jobs/listings');
    }
  };

  if (success) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <IconCheck className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Posted Successfully!</h2>
          <p className="text-gray-600 mb-4">The job posting has been created and is ready for publication.</p>
          <div className="space-x-3">
            <button
              onClick={() => router.push('/admin/companymanagement/jobs/listings')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              View All Jobs
            </button>
            <button
              onClick={() => router.push('/admin/companymanagement/jobs/create')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Create Another Job
            </button>
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin/companymanagement')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <IconArrowLeft size={20} className="mr-2" />
              Back to Jobs
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Job Posting</h1>
              <p className="text-gray-600">Fill out the details below to create a new job opportunity</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/admin/companymanagement/jobs/companies')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              View Companies
            </button>
            <button
              onClick={() => router.push('/admin/companymanagement/jobs/listings')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              View All Jobs
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Job Creation Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Job Details</h2>
              <p className="text-gray-600">
                Complete all required fields to create the job posting. 
                The job will be saved as a draft and can be published later.
              </p>
            </div>

            <JobPostingForm
              companies={companies}
              onSubmit={handleCreateJob}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
              submitButtonText="Create Job Posting"
              mode="create"
            />
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Tips for Creating Great Job Postings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Job Title</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Be specific and clear</li>
                <li>Avoid internal jargon</li>
                <li>Include seniority level if relevant</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Start with company overview</li>
                <li>Detail key responsibilities</li>
                <li>Highlight growth opportunities</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Requirements</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>List must-have skills first</li>
                <li>Separate nice-to-have skills</li>
                <li>Include soft skills requirements</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Salary Range</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Be transparent with compensation</li>
                <li>Include benefits if applicable</li>
                <li>Consider market rates</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 