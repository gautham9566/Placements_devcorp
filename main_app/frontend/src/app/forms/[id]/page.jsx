'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getFormById, updateForm } from '@/api/forms';
import JobPostingForm from '@/components/JobPostingForm';
import { studentsAPI } from '@/api/optimized';

export default function CompanyFormPage() {
  const { id } = useParams();
  const [hasAccess, setHasAccess] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [passoutYears, setPassoutYears] = useState([]);
  const [selectedPassoutYears, setSelectedPassoutYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        setLoading(true);
        const response = await getFormById(id);
        setForm(response.data);
        
        // Check if user has access
        const token = localStorage.getItem(`form-access-${id}`);
        if (token === response.data.key) {
          setHasAccess(true);
        }
        
        setError(null);
      } catch (error) {
        console.error('Error fetching form:', error);
        setError('Unable to load form. It may have been deleted or you may not have permission to view it.');
      } finally {
        setLoading(false);
      }
    };

    const fetchMetadata = async () => {
      try {
        // Fetch passout years and departments from student metadata API
        const studentsResponse = await studentsAPI.getStudents({ page_size: 1 });
        if (studentsResponse.metadata && studentsResponse.metadata.available_years) {
          setPassoutYears(studentsResponse.metadata.available_years);
        }
        if (studentsResponse.metadata && studentsResponse.metadata.available_departments) {
          setDepartments(studentsResponse.metadata.available_departments);
        }
      } catch (error) {
        console.error('Error fetching metadata:', error);
        // Don't set error state for metadata fetch failure, just log it
      }
    };
    
    fetchForm();
    fetchMetadata();
  }, [id]);

  const handleAccess = () => {
    if (accessKey === form?.key) {
      setHasAccess(true);
      localStorage.setItem(`form-access-${id}`, accessKey);
    } else {
      alert('Invalid access key');
    }
  };

  const handleJobSubmit = async (jobData) => {
    try {
      // Map JobPostingForm data to the format expected by the backend
      const formattedDetails = {
        title: jobData.title || '',
        description: jobData.description || '',
        location: jobData.location || '',
        jobType: jobData.job_type || 'FULL_TIME',
        skills: jobData.required_skills || '',
        salaryMin: jobData.salary_min || '',
        salaryMax: jobData.salary_max || '',
        deadline: jobData.application_deadline || '',
        // Additional fields from JobPostingForm
        interview_rounds: jobData.interview_rounds || [],
        additional_fields: jobData.additional_fields || [],
        requirements: jobData.requirements || [],
        benefits: jobData.benefits || [],
        duration: jobData.duration || '',
        allowed_passout_years: selectedPassoutYears,
        allowed_departments: selectedDepartments
      };

      await updateForm(id, {
        details: formattedDetails,
        submitted: true
      });
      
      alert('Job posting submitted successfully!');
      window.location.reload();
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit form. Please try again.');
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (form?.submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Form Already Submitted</h2>
          <p className="text-gray-600">
            This form has already been submitted. Thank you for your submission!
          </p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">🔐</div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Job Posting Form
            </h1>
            <p className="text-gray-600">
              Enter your access key to continue
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Key
              </label>
              <input
                type="text"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAccess()}
                placeholder="Enter your access key"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <button
              onClick={handleAccess}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Access Form
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Company:</strong> {form?.company}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Prepare initial data with company name pre-filled
  const initialData = {
    company_name: form?.company || '',
    company_id: form?.company || '',
    // Map form details to JobPostingForm format
    title: form?.details?.title || '',
    description: form?.details?.description || '',
    location: form?.details?.location || '',
    job_type: form?.details?.jobType || 'FULL_TIME',
    required_skills: form?.details?.skills || '',
    salary_min: form?.details?.salaryMin || '',
    salary_max: form?.details?.salaryMax || '',
    application_deadline: form?.details?.deadline || '',
    interview_rounds: form?.details?.interview_rounds || [],
    additional_fields: form?.details?.additional_fields || [],
    requirements: form?.details?.requirements || [],
    benefits: form?.details?.benefits || [],
    duration: form?.details?.duration || ''
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
            <h1 className="text-2xl font-bold text-white">
              Submit Job Posting
            </h1>
            <p className="text-blue-100 mt-1">
              Company: {form?.company}
            </p>
          </div>

          <div className="p-6">
            <JobPostingForm
              companies={[{ id: form?.company, name: form?.company, companyName: form?.company }]}
              onSubmit={handleJobSubmit}
              onCancel={handleCancel}
              initialData={initialData}
              companyDisabled={true}
              passoutYears={passoutYears}
              selectedPassoutYears={selectedPassoutYears}
              onPassoutYearsChange={setSelectedPassoutYears}
              departments={departments}
              selectedDepartments={selectedDepartments}
              onDepartmentsChange={setSelectedDepartments}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
