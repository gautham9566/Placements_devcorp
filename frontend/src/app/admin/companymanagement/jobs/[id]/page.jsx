'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { use } from 'react';
import { ArrowLeft, Edit, Send, X, MapPin, Calendar, DollarSign, Briefcase, Users, Eye } from "lucide-react";
import { FormattedJobDescription } from '../../../../../lib/utils';
import { getJobById } from '../../../../../api/jobs';

export default function ViewJob({ params }) {
  const unwrappedParams = use(params);
  const jobId = parseInt(unwrappedParams.id);
  const router = useRouter();
  
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadJobData = async () => {
      try {
        console.log('Loading job data for ID:', jobId);
        const response = await getJobById(jobId);
        console.log('Job API response:', response);
        
        if (response.data) {
          const jobData = response.data;
          console.log('Setting job data:', jobData);
          
          // Format the data for display
          const formattedJob = {
            id: jobData.id,
            title: jobData.title || 'No title',
            description: jobData.description || 'No description available',
            location: jobData.location || 'Not specified',
            job_type: jobData.job_type || 'Not specified',
            salary_min: jobData.salary_min || 0,
            salary_max: jobData.salary_max || 0,
            application_deadline: jobData.application_deadline || new Date().toISOString().split('T')[0],
            is_published: jobData.is_published || false,
            company_name: jobData.company_name || jobData.company?.name || 'Unknown Company',
            requirements: Array.isArray(jobData.requirements) ? jobData.requirements : 
                         typeof jobData.requirements === 'string' ? jobData.requirements.split(',').map(r => r.trim()) : [],
            skills: Array.isArray(jobData.skills) ? jobData.skills : 
                   typeof jobData.skills === 'string' ? jobData.skills.split(',').map(s => s.trim()) : [],
            created_at: jobData.created_at || new Date().toISOString(),
            updated_at: jobData.updated_at || new Date().toISOString(),
            applications_count: jobData.applications_count || 0,
            duration: jobData.duration || 'Not specified',
            company_id: jobData.company_id || jobData.company?.id || null
          };
          
          setJob(formattedJob);
        }
      } catch (error) {
        console.error('Error loading job:', error);
        setError('Failed to load job data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      loadJobData();
    }
  }, [jobId]);

  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading job details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-red-600">Error: {error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-600">Job not found</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Company Management
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
              <p className="text-gray-600 mt-2">
                {job.company_name} • Job ID: {jobId}
              </p>
            </div>
            <div className="flex space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                job.is_published 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {job.is_published ? 'Published' : 'Draft'}
              </span>
              <button 
                onClick={() => router.push(`/admin/companymanagement/jobs/edit/${jobId}`)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Job
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Details */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Details</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">{job.location}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Briefcase className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Type</p>
                    <p className="font-medium">{job.job_type}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Salary</p>
                    <p className="font-medium">
                      {job.salary_min && job.salary_max 
                        ? `$${job.salary_min?.toLocaleString()} - $${job.salary_max?.toLocaleString()}`
                        : 'Not specified'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Deadline</p>
                    <p className="font-medium">
                      {job.application_deadline 
                        ? new Date(job.application_deadline).toLocaleDateString()
                        : 'No deadline'
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              {job.duration && (
                <div className="mb-6">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Duration</p>
                      <p className="font-medium">{job.duration}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Description</h3>
                <FormattedJobDescription 
                  description={job.description} 
                  className=""
                />
              </div>
            </div>

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Requirements</h2>
                <ul className="space-y-2">
                  {job.requirements.map((requirement, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                      <span className="text-gray-700">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Skills */}
            {job.skills && job.skills.length > 0 && (
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Statistics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Applications</span>
                  <span className="font-semibold text-gray-900">{job.applications_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Created</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(job.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Last Updated</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(job.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    job.is_published 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {job.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => router.push(`/admin/companymanagement/jobs/edit/${jobId}`)}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Job
                </button>
                <button 
                  onClick={() => router.push(`/admin/applications?job_id=${jobId}`)}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center justify-center"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Applications
                </button>
                <button className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center justify-center">
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </button>
              </div>
            </div>

            {/* Quick Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Quick Info</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Job ID:</span>
                  <span className="font-medium text-blue-900">{job.id}</span>
                </div>
                {job.company_id && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">Company ID:</span>
                    <span className="font-medium text-blue-900">{job.company_id}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-blue-700">Type:</span>
                  <span className="font-medium text-blue-900">{job.job_type}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 