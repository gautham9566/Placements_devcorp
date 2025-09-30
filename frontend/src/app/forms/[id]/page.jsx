'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { getFormById, updateForm } from '../../../api/forms';

export default function CompanyFormPage() {
  const { id } = useParams();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [form, setForm] = useState(null);
  const [formFields, setFormFields] = useState({
    title: '',
    description: '',
    location: '',
    jobType: 'FULL_TIME',
    salaryMin: '',
    salaryMax: '',
    deadline: '',
    skills: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        setLoading(true);
        const response = await getFormById(id);
        setForm(response.data);
        
        // If form is already submitted, populate the form fields
        if (response.data.submitted && response.data.details) {
          setFormFields(response.data.details);
        }
        
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
    
    fetchForm();
  }, [id]);

  const handleAccess = () => {
    if (accessKey === form?.key) {
      setHasAccess(true);
      localStorage.setItem(`form-access-${id}`, accessKey);
    } else {
      alert('Invalid access key');
    }
  };

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!formFields.title) {
        alert('Please enter a job title');
        return;
      }
      if (!formFields.description) {
        alert('Please enter a job description');
        return;
      }
      if (!formFields.skills) {
        alert('Please enter required skills');
        return;
      }
      if (!formFields.location) {
        alert('Please enter job location');
        return;
      }
      if (!formFields.deadline) {
        alert('Please enter application deadline');
        return;
      }
      
      await updateForm(id, {
        submitted: true,
        details: formFields
      });
      
      // Clear access token from localStorage
      localStorage.removeItem(`form-access-${id}`);
      router.push('/thank-you');
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit form. Please try again.');
    }
  };

  const handleInputChange = (field, value) => {
    setFormFields(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-6 rounded-lg shadow w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-6 rounded-lg shadow w-full max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-lg font-bold mb-2 text-gray-900">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!form) return <div className="p-6">Form not found.</div>;

  // If access key is required, show the access form
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-6 rounded-lg shadow w-full max-w-md">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{form.company} Job Form</h2>
            <p className="text-gray-600">Please enter the access key that was provided to you.</p>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Access Key</label>
            <input
              type="text"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              className="w-full p-3 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter the access key"
            />
            <button
              onClick={handleAccess}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              Submit Key
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-black mb-2">Job Details for {form.company}</h2>
          {form.status && (
            <div className="mb-2">
              <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                form.status === 'approved' ? 'bg-blue-100 text-blue-800' : 
                form.status === 'posted' ? 'bg-green-100 text-green-800' : 
                form.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                'bg-yellow-100 text-yellow-800'
              }`}>
                Status: {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
              </span>
            </div>
          )}
          <p className="text-sm text-gray-600">Please fill in the following details about the job position.</p>
        </div>

        <div className="space-y-4">
          {/* Job Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Title *
            </label>
            <input
              type="text"
              value={formFields.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Software Engineer"
              className="w-full border p-2 rounded focus:ring-2 text-black focus:ring-blue-500"
              required
            />
          </div>
          
          {/* Job Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location *
            </label>
            <input
              type="text"
              value={formFields.location || ''}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="e.g., New York, NY"
              className="w-full border p-2 rounded focus:ring-2 text-black focus:ring-blue-500"
              required
            />
          </div>
          
          {/* Job Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Type *
            </label>
            <select
              value={formFields.jobType || 'FULL_TIME'}
              onChange={(e) => handleInputChange('jobType', e.target.value)}
              className="w-full border p-2 rounded focus:ring-2 text-black focus:ring-blue-500"
              required
            >
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="INTERNSHIP">Internship</option>
              <option value="CONTRACT">Contract</option>
            </select>
          </div>

          {/* Job Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Description *
            </label>
            <textarea
              rows={5}
              placeholder="Detailed job description"
              value={formFields.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full border p-3 rounded focus:ring-2 text-black focus:ring-blue-500"
              required
            ></textarea>
          </div>

          {/* Required Skills */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Required Skills *
            </label>
            <textarea
              rows={3}
              placeholder="Required skills (comma-separated)"
              value={formFields.skills || ''}
              onChange={(e) => handleInputChange('skills', e.target.value)}
              className="w-full border p-2 rounded focus:ring-2 text-black focus:ring-blue-500"
              required
            />
          </div>

          {/* Salary Range */}
          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Salary
              </label>
              <input
                type="number"
                placeholder="e.g., 50000"
                value={formFields.salaryMin || ''}
                onChange={(e) => handleInputChange('salaryMin', e.target.value)}
                className="w-full border p-2 rounded focus:ring-2 text-black focus:ring-blue-500"
              />
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Salary
              </label>
              <input
                type="number"
                placeholder="e.g., 80000"
                value={formFields.salaryMax || ''}
                onChange={(e) => handleInputChange('salaryMax', e.target.value)}
                className="w-full border p-2 rounded focus:ring-2 text-black focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Application Deadline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Application Deadline *
            </label>
            <input
              type="date"
              value={formFields.deadline || ''}
              onChange={(e) => handleInputChange('deadline', e.target.value)}
              className="w-full border p-2 rounded focus:ring-2 text-black focus:ring-blue-500"
              required
            />
          </div>

          <div className="pt-4">
            <button
              onClick={handleSubmit}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              Submit Job Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
