'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getFormById, updateForm } from '../../../../../api/forms';
import JobPostingForm from '../../../../../components/JobPostingForm';
import { studentsAPI } from '../../../../../api/optimized';

export default function EditFormPage() {
  const { id } = useParams();
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [passoutYears, setPassoutYears] = useState([]);
  const [selectedPassoutYears, setSelectedPassoutYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [arrearsRequirement, setArrearsRequirement] = useState('NO_RESTRICTION');

  useEffect(() => {
    const fetchForm = async () => {
      setIsLoading(true);
      try {
        const response = await getFormById(id);
        setForm(response.data);
      } catch (error) {
        console.error('Error fetching form:', error);
        alert('Failed to load form data');
        router.push('/admin/form');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchForm();
  }, [id, router]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const studentsResponse = await studentsAPI.getStudents({ page_size: 1 });
        if (studentsResponse.metadata && studentsResponse.metadata.available_years) {
          setPassoutYears(studentsResponse.metadata.available_years);
        }
        if (studentsResponse.metadata && studentsResponse.metadata.available_departments) {
          setDepartments(studentsResponse.metadata.available_departments);
        }
      } catch (error) {
        console.error('Error fetching metadata:', error);
      }
    };
    
    fetchMetadata();
  }, []);

  const handleJobSubmit = async (jobData) => {
    try {
      // Map JobPostingForm data to backend format
      const formattedDetails = {
        title: jobData.title || '',
        description: jobData.description || '',
        location: jobData.location || '',
        jobType: jobData.job_type || 'FULL_TIME',
        skills: jobData.required_skills || '',
        salaryMin: jobData.salary_min || '',
        salaryMax: jobData.salary_max || '',
        deadline: jobData.application_deadline || '',
        interview_rounds: jobData.interview_rounds || [],
        additional_fields: jobData.additional_fields || [],
        requirements: jobData.requirements || [],
        benefits: jobData.benefits || [],
        duration: jobData.duration || ''
      };

      await updateForm(id, {
        details: formattedDetails
      });
      
      alert('Form updated successfully!');
      router.push('/admin/form');
    } catch (error) {
      console.error('Error updating form:', error);
      alert('Failed to update form. Please try again.');
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      router.push('/admin/form');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/form')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <span className="text-xl">←</span>
            <span className="text-sm font-medium">Back to Forms Dashboard</span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
              <h1 className="text-2xl font-bold text-white">
                Edit Job Form
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
                initialData={{
                  company_name: form?.company || '',
                  company_id: form?.company || '',
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
                }}
                companyDisabled={true}
                passoutYears={passoutYears}
                selectedPassoutYears={selectedPassoutYears}
                onPassoutYearsChange={setSelectedPassoutYears}
                departments={departments}
                selectedDepartments={selectedDepartments}
                onDepartmentsChange={setSelectedDepartments}
                arrearsRequirement={arrearsRequirement}
                onArrearsRequirementChange={setArrearsRequirement}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

