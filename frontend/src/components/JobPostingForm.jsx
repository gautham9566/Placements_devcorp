'use client';

import { useState } from 'react';
import { IconSearch, IconX, IconPlus, IconTrash } from '@tabler/icons-react';
import { createJob } from '../api/jobs';

// Job Posting Form Component
export default function JobPostingForm({ companies, onSubmit, onCancel, initialData = {}, companyDisabled = false }) {
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    location: initialData.location || '',
    salary_min: initialData.salary_min || '',
    salary_max: initialData.salary_max || '',
    job_type: initialData.job_type || 'FULL_TIME',
    description: initialData.description || '',
    required_skills: initialData.required_skills || '',
    requirements: initialData.requirements || [],
    skills: initialData.skills || [],
    benefits: initialData.benefits || [],
    application_deadline: initialData.application_deadline || '',
    duration: initialData.duration || '',
    company_id: initialData.company_id || '',
    company_name: initialData.company_name || ''
  });

  const [interviewRounds, setInterviewRounds] = useState(
    initialData.interview_rounds || [{ name: '', date: '', time: '' }]
  );

  const [additionalFields, setAdditionalFields] = useState(initialData.additional_fields || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Company search states
  const [companySearchQuery, setCompanySearchQuery] = useState(initialData.company_name || '');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [selectedCompanyName, setSelectedCompanyName] = useState(initialData.company_name || '');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCompanySelect = (company) => {
    const companyName = company.companyName || company.name;
    setFormData(prev => ({
      ...prev,
      company_id: company.id || company.companyName,
      company_name: companyName || ''
    }));
    setSelectedCompanyName(companyName);
    setCompanySearchQuery(companyName);
    setShowCompanyDropdown(false);
  };

  const handleCompanySearchChange = (value) => {
    setCompanySearchQuery(value);
    setShowCompanyDropdown(true);
    
    // Clear selection if search is cleared
    if (!value.trim()) {
      setFormData(prev => ({
        ...prev,
        company_id: '',
        company_name: ''
      }));
      setSelectedCompanyName('');
    }
  };

  // Filter companies based on search query
  const filteredCompanies = (companies || []).filter(company => {
    const companyName = (company.companyName || company.name || '').toLowerCase();
    return companyName.includes(companySearchQuery.toLowerCase());
  });

  const addInterviewRound = () => {
    setInterviewRounds(prev => [...prev, { name: '', date: '', time: '' }]);
  };

  const updateInterviewRound = (index, field, value) => {
    setInterviewRounds(prev => prev.map((round, i) => 
      i === index ? { ...round, [field]: value } : round
    ));
  };

  const removeInterviewRound = (index) => {
    setInterviewRounds(prev => prev.filter((_, i) => i !== index));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const jobData = {
        ...formData,
        interview_rounds: interviewRounds.filter(round => round.name.trim()),
        additional_fields: additionalFields,
        salary_min: parseFloat(formData.salary_min) || 0,
        salary_max: parseFloat(formData.salary_max) || 0,
        requirements: formData.requirements.filter(req => req.trim()),
        skills: formData.skills.filter(skill => skill.trim()),
        benefits: formData.benefits.filter(benefit => benefit.trim())
      };

      await onSubmit(jobData);
    } catch (error) {
      console.error('Error creating job:', error);
      alert('Failed to create job posting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Publish Job Posting</h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <IconX className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Selection */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Company *
            </label>
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none w-4 h-4" />
              <input
                type="text"
                value={companySearchQuery}
                onChange={(e) => !companyDisabled && handleCompanySearchChange(e.target.value)}
                onFocus={() => !companyDisabled && setShowCompanyDropdown(true)}
                placeholder={companyDisabled ? "Company is pre-selected" : "Search for a company..."}
                className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  companyDisabled ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                disabled={companyDisabled}
                required
              />
              {selectedCompanyName && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-600 font-medium">
                      {companyDisabled ? 'Pre-selected' : 'Selected'}
                    </span>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Company Dropdown */}
            {!companyDisabled && showCompanyDropdown && companySearchQuery && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredCompanies.length > 0 ? (
                  <div className="py-1">
                    {filteredCompanies.map((company) => (
                      <button
                        key={company.id || company.companyName}
                        type="button"
                        onClick={() => handleCompanySelect(company)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">
                              {company.companyName || company.name}
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
                    No companies found matching "{companySearchQuery}"
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
                required
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
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                type="number"
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
                type="number"
                value={formData.salary_max}
                onChange={(e) => handleInputChange('salary_max', e.target.value)}
                placeholder="Enter maximum salary"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
                Application Deadline *
              </label>
              <input
                type="date"
                value={formData.application_deadline}
                onChange={(e) => handleInputChange('application_deadline', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
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
              required
            />
          </div>

          {/* Required Skills */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Required Skills *
            </label>
            <textarea
              value={formData.required_skills}
              onChange={(e) => handleInputChange('required_skills', e.target.value)}
              placeholder="Enter required skills (e.g., Python, React, SQL, etc.)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Interview Timeline */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Interview Timeline</h3>
            {interviewRounds.map((round, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-700">Round {index + 1}</h4>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => removeInterviewRound(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <IconTrash className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={round.name}
                    onChange={(e) => updateInterviewRound(index, 'name', e.target.value)}
                    placeholder="Enter round name"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={round.date}
                    onChange={(e) => updateInterviewRound(index, 'date', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="time"
                    value={round.time}
                    onChange={(e) => updateInterviewRound(index, 'time', e.target.value)}
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
              <IconPlus className="w-4 h-4" />
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
                    <IconTrash className="w-4 h-4" />
                  </button>
                </div>
                
                {field.type === 'multiple_choice' && (
                  <div className="space-y-2">
                    {field.options?.map((option, optIndex) => (
                      <input
                        key={optIndex}
                        type="text"
                        value={option}
                        onChange={(e) => updateChoiceOption(field.id, optIndex, e.target.value)}
                        placeholder={`Option ${optIndex + 1}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
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
                <IconPlus className="w-4 h-4" />
                Add Text Field
              </button>
              <button
                type="button"
                onClick={() => addAdditionalField('number')}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <IconPlus className="w-4 h-4" />
                Add Number Field
              </button>
              <button
                type="button"
                onClick={() => addAdditionalField('file')}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <IconPlus className="w-4 h-4" />
                Add File Upload Field
              </button>
              <button
                type="button"
                onClick={() => addAdditionalField('multiple_choice')}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <IconPlus className="w-4 h-4" />
                Add Multiple Choice Field
              </button>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
                              {isSubmitting ? 'Publishing...' : 'Publish Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 