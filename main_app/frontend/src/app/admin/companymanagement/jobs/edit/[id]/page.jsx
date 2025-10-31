'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { use } from 'react';
import { ArrowLeft, Save, X, Plus, Trash2 } from "lucide-react";
import { getJobById, updateJob } from '../../../../../../api/jobs';
import { studentsAPI } from '../../../../../../api/optimized';

export default function EditJob({ params }) {
  const unwrappedParams = use(params);
  const jobId = parseInt(unwrappedParams.id);
  const router = useRouter();
  
  const [job, setJob] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    job_type: 'FULL_TIME',
    salary_max: '',
    salary_min: '',
    application_deadline: '',
    duration: '',
    is_published: false,
    requirements: [],
    benefits: [],
    skills: [],
    required_skills: '',
    company_id: null,
    company_name: '',
    allowed_passout_years: [],
    allowed_departments: [],
    arrears_requirement: 'NO_RESTRICTION',
    min_cgpa: ''
  });

  const [interviewRounds, setInterviewRounds] = useState([
    { id: 1, name: '', date: '', time: '' }
  ]);

  const [additionalFields, setAdditionalFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Dropdown states
  const [showPassoutYearsDropdown, setShowPassoutYearsDropdown] = useState(false);
  const [showDepartmentsDropdown, setShowDepartmentsDropdown] = useState(false);

  // Additional data states
  const [passoutYears, setPassoutYears] = useState([]);
  const [selectedPassoutYears, setSelectedPassoutYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [arrearsRequirement, setArrearsRequirement] = useState('NO_RESTRICTION');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Fetch passout years and departments
        console.log('Fetching passout years and departments...');
        const studentsResponse = await studentsAPI.getStudents({ page_size: 1 });
        if (studentsResponse.metadata && studentsResponse.metadata.available_years) {
          setPassoutYears(studentsResponse.metadata.available_years);
        }
        if (studentsResponse.metadata && studentsResponse.metadata.available_departments) {
          setDepartments(studentsResponse.metadata.available_departments);
        }

        // Load job data
        console.log('Loading job data for ID:', jobId);
        const response = await getJobById(jobId);
        console.log('Job API response:', response);
        
        if (response.data) {
          const jobData = response.data;
          console.log('Setting job data:', jobData);
          setJob(jobData);
          
          // Format the data for the form
          const formattedData = {
            id: jobData.id,
            title: jobData.title || '',
            description: jobData.description || '',
            location: jobData.location || '',
            job_type: jobData.job_type || 'FULL_TIME',
            salary_max: jobData.salary_max || '',
            salary_min: jobData.salary_min || '',
            application_deadline: jobData.application_deadline || '',
            duration: jobData.duration || '',
            is_published: jobData.is_published || false,
            requirements: jobData.requirements || [],
            benefits: jobData.benefits || [],
            skills: jobData.skills || [],
            required_skills: jobData.required_skills || '',
            company_id: jobData.company_id || jobData.company?.id || null,
            company_name: jobData.company_name || jobData.company?.name || '',
            allowed_passout_years: jobData.allowed_passout_years || [],
            allowed_departments: jobData.allowed_departments || [],
            arrears_requirement: jobData.arrears_requirement || 'NO_RESTRICTION',
            min_cgpa: jobData.min_cgpa || ''
          };
          
          setFormData(formattedData);
          
          // Set selected values from job data
          setSelectedPassoutYears(jobData.allowed_passout_years || []);
          setSelectedDepartments(jobData.allowed_departments || []);
          setArrearsRequirement(jobData.arrears_requirement || 'NO_RESTRICTION');
          
          // Set interview rounds if available
          if (jobData.interview_rounds && jobData.interview_rounds.length > 0) {
            setInterviewRounds(jobData.interview_rounds.map((round, index) => ({
              id: index + 1,
              name: round.name || '',
              date: round.date || '',
              time: round.time || ''
            })));
          }
          
          // Set additional fields if available
          if (jobData.additional_fields && jobData.additional_fields.length > 0) {
            setAdditionalFields(jobData.additional_fields);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load job data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      loadData();
    }
  }, [jobId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.passout-years-dropdown') && !event.target.closest('.departments-dropdown')) {
        setShowPassoutYearsDropdown(false);
        setShowDepartmentsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addInterviewRound = () => {
    const newId = Math.max(...interviewRounds.map(r => r.id), 0) + 1;
    setInterviewRounds(prev => [...prev, { id: newId, name: '', date: '', time: '' }]);
  };

  const updateInterviewRound = (id, field, value) => {
    setInterviewRounds(prev => prev.map(round => 
      round.id === id ? { ...round, [field]: value } : round
    ));
  };

  const removeInterviewRound = (id) => {
    setInterviewRounds(prev => prev.filter(round => round.id !== id));
  };

  const addAdditionalField = (type) => {
    const fieldId = Date.now();
    const newField = {
      id: fieldId,
      type,
      label: '',
      required: false,
      options: type === 'multiple_choice' ? [''] : undefined
    };
    setAdditionalFields(prev => [...prev, newField]);
  };

  const updateAdditionalField = (id, field, value) => {
    setAdditionalFields(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeAdditionalField = (id) => {
    setAdditionalFields(prev => prev.filter(item => item.id !== id));
  };

  const addChoiceOption = (fieldId) => {
    setAdditionalFields(prev => prev.map(field => 
      field.id === fieldId 
        ? { ...field, options: [...(field.options || []), ''] }
        : field
    ));
  };

  const updateChoiceOption = (fieldId, optionIndex, value) => {
    setAdditionalFields(prev => prev.map(field => 
      field.id === fieldId 
        ? { 
            ...field, 
            options: field.options.map((opt, i) => i === optionIndex ? value : opt)
          }
        : field
    ));
  };

  const removeChoiceOption = (fieldId, optionIndex) => {
    setAdditionalFields(prev => prev.map(field => 
      field.id === fieldId 
        ? { 
            ...field, 
            options: field.options.filter((_, i) => i !== optionIndex)
          }
        : field
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('Saving job data:', formData);
      
      // Prepare data for API
      const apiData = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        job_type: formData.job_type,
        salary_max: formData.salary_max,
        salary_min: formData.salary_min,
        application_deadline: formData.application_deadline,
        duration: formData.duration,
        is_published: formData.is_published,
        requirements: formData.requirements,
        benefits: formData.benefits,
        skills: formData.skills,
        required_skills: formData.required_skills,
        interview_rounds: interviewRounds.filter(round => round.name.trim()),
        additional_fields: additionalFields,
        allowed_passout_years: selectedPassoutYears,
        allowed_departments: selectedDepartments,
        arrears_requirement: arrearsRequirement,
        min_cgpa: formData.min_cgpa ? parseFloat(formData.min_cgpa) : null
      };
      
      const response = await updateJob(jobId, apiData);
      console.log('Update response:', response);
      
      if (response.data) {
        setJob(response.data);
        alert('Job updated successfully!');
      }
      
    } catch (error) {
      console.error('Error saving job:', error);
      setError('Failed to save job. Please try again.');
      alert('Failed to save job. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading job...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !job) {
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

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <button 
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Company Management
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Job Application</h1>
              <p className="text-gray-600 mt-1">
                Job ID: {jobId} | Company: {formData.company_name}
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 space-y-6">
            
            {/* Basic Job Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter job title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Enter location"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Type *
                </label>
                <select
                  value={formData.job_type}
                  onChange={(e) => handleInputChange('job_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="INTERNSHIP">Internship</option>
                  <option value="CONTRACT">Contract</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Salary
                </label>
                <input
                  type="text"
                  value={formData.salary_min}
                  onChange={(e) => handleInputChange('salary_min', e.target.value)}
                  placeholder="Enter minimum salary"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Salary
                </label>
                <input
                  type="text"
                  value={formData.salary_max}
                  onChange={(e) => handleInputChange('salary_max', e.target.value)}
                  placeholder="Enter maximum salary"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.is_published ? 'published' : 'draft'}
                  onChange={(e) => handleInputChange('is_published', e.target.value === 'published')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration
                </label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', e.target.value)}
                  placeholder="e.g., 6 months, 2 years"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Application Deadline
                </label>
                <input
                  type="date"
                  value={formData.application_deadline}
                  onChange={(e) => handleInputChange('application_deadline', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Job Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter job description"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Required Skills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Skills
              </label>
              <input
                type="text"
                value={formData.required_skills}
                onChange={(e) => handleInputChange('required_skills', e.target.value)}
                placeholder="Enter required skills (e.g., Python, Java, SQL)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Passout Years Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed Passout Years
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Select the passout years that can view and apply for this job. If none are selected, all students can view the job.
              </p>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPassoutYearsDropdown(!showPassoutYearsDropdown)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {selectedPassoutYears.length > 0
                    ? `${selectedPassoutYears.length} selected (${selectedPassoutYears.join(', ')})`
                    : 'Select passout years'
                  }
                </button>
                {showPassoutYearsDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto passout-years-dropdown">
                    {passoutYears.length > 0 ? (
                      passoutYears.map(year => (
                        <label key={year} className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedPassoutYears.includes(year)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPassoutYears(prev => [...prev, year]);
                              } else {
                                setSelectedPassoutYears(prev => prev.filter(y => y !== year));
                              }
                            }}
                            className="mr-2"
                          />
                          {year}
                        </label>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        No passout years available
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Click outside to close dropdown */}
              {showPassoutYearsDropdown && (
                <div
                  className="fixed inset-0 z-5"
                  onClick={() => setShowPassoutYearsDropdown(false)}
                />
              )}
            </div>

            {/* Departments Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed Departments
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Select the departments that can view and apply for this job. If none are selected, all departments can view the job.
              </p>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDepartmentsDropdown(!showDepartmentsDropdown)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {selectedDepartments.length > 0
                    ? `${selectedDepartments.length} selected (${selectedDepartments.join(', ')})`
                    : 'Select departments'
                  }
                </button>
                {showDepartmentsDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto departments-dropdown">
                    {departments.length > 0 ? (
                      departments.map(dept => (
                        <label key={dept} className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedDepartments.includes(dept)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDepartments(prev => [...prev, dept]);
                              } else {
                                setSelectedDepartments(prev => prev.filter(d => d !== dept));
                              }
                            }}
                            className="mr-2"
                          />
                          {dept}
                        </label>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        No departments available
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Click outside to close dropdown */}
              {showDepartmentsDropdown && (
                <div
                  className="fixed inset-0 z-5"
                  onClick={() => setShowDepartmentsDropdown(false)}
                />
              )}
            </div>

            {/* Arrears Requirement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Arrears Requirement
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Set requirements for student arrears status. If no restriction is selected, all students can view the job.
              </p>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="filterArrears"
                    checked={arrearsRequirement !== 'NO_RESTRICTION'}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setArrearsRequirement('ALLOW_WITH_ARREARS');
                      } else {
                        setArrearsRequirement('NO_RESTRICTION');
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="filterArrears" className="ml-2 block text-sm text-gray-900">
                    Filter by arrears status
                  </label>
                </div>

                {arrearsRequirement !== 'NO_RESTRICTION' && (
                  <div className="ml-6">
                    <select
                      value={arrearsRequirement}
                      onChange={(e) => setArrearsRequirement(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ALLOW_WITH_ARREARS">Allow students with active arrears</option>
                      <option value="NO_ARREARS_ALLOWED">Only students with no active arrears</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Minimum CGPA Requirement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum CGPA Requirement
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Set a minimum CGPA requirement for applicants. Students with CGPA below this threshold will not be able to apply. Leave empty for no CGPA requirement.
              </p>
              <input
                type="number"
                min="0"
                max="10"
                step="0.01"
                value={formData.min_cgpa}
                onChange={(e) => handleInputChange('min_cgpa', e.target.value)}
                placeholder="e.g., 7.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Interview Timeline */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Interview Timeline</h3>
              {interviewRounds.map((round, index) => (
                <div key={round.id} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-700">Round {index + 1}</h4>
                    {interviewRounds.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInterviewRound(round.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={round.name}
                      onChange={(e) => updateInterviewRound(round.id, 'name', e.target.value)}
                      placeholder="Enter round name"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="date"
                      value={round.date}
                      onChange={(e) => updateInterviewRound(round.id, 'date', e.target.value)}
                      placeholder="Select date"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="time"
                      value={round.time}
                      onChange={(e) => updateInterviewRound(round.id, 'time', e.target.value)}
                      placeholder="Select time"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addInterviewRound}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Round
              </button>
            </div>

            {/* Additional Fields */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Fields</h3>
              
              {additionalFields.map((field) => (
                <div key={field.id} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateAdditionalField(field.id, 'label', e.target.value)}
                      placeholder="Field label"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mr-3"
                    />
                    <button
                      type="button"
                      onClick={() => removeAdditionalField(field.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-2">
                    Field Type: {field.type.replace('_', ' ').toUpperCase()}
                  </div>
                  
                  {field.type === 'multiple_choice' && (
                    <div className="space-y-2">
                      {field.options?.map((option, optIndex) => (
                        <div key={optIndex} className="flex gap-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => updateChoiceOption(field.id, optIndex, e.target.value)}
                            placeholder={`Option ${optIndex + 1}`}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {field.options.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeChoiceOption(field.id, optIndex)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addChoiceOption(field.id)}
                        className="text-blue-600 text-sm hover:text-blue-800"
                      >
                        + Add Option
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addAdditionalField('text')}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Text Field
                </button>
                <button
                  type="button"
                  onClick={() => addAdditionalField('number')}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Number Field
                </button>
                <button
                  type="button"
                  onClick={() => addAdditionalField('file')}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add File Upload Field
                </button>
                <button
                  type="button"
                  onClick={() => addAdditionalField('multiple_choice')}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Multiple Choice Field
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={saving}
                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
} 