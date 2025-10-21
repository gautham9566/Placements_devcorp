'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Clock, MapPin, Building2, Calendar, DollarSign, CheckCircle, AlertCircle, Users, FileText, Briefcase, Award } from 'lucide-react';
import { applyToJob } from '../../../../api/jobs';
import client from '../../../../api/client';
import { useNotification } from '../../../../contexts/NotificationContext';
import { validateForJobApplication } from '../../../../utils/profileValidation';
import { studentsAPI } from '../../../../api/students';

// --- Reusable UI Components ---

// A reusable component for each section card in the form and review pages
const SectionCard = ({ title, onEdit, children, icon }) => (
  <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200/80 mb-6">
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center">
        {icon && <span className="mr-2 text-lg">{icon}</span>}
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      {onEdit && (
        <button onClick={onEdit} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors duration-200">
          Edit
        </button>
      )}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
      {children}
    </div>
  </div>
);

// A reusable input field component
const InputField = ({ label, type = 'text', placeholder, name, value, onChange, isFullWidth = false, required = false }) => (
  <div className={isFullWidth ? 'md:col-span-2' : ''}>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      id={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-200"
    />
  </div>
);

// A reusable select field component
const SelectField = ({ label, name, value, onChange, children, required = false }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select 
      id={name} 
      name={name} 
      value={value}
      onChange={onChange}
      required={required}
      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-200"
    >
      {children}
    </select>
  </div>
);

// A reusable textarea component
const TextareaField = ({ label, name, value, onChange, placeholder, rows = 6, tip, required = false }) => (
  <div className="md:col-span-2">
    <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <textarea
      id={name}
      name={name}
      rows={rows}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-200"
      placeholder={placeholder}
    ></textarea>
    {tip && <p className="mt-2 text-xs text-gray-500">{tip}</p>}
  </div>
);

// A reusable file input component with preview
const FileInput = ({ label, name, fileName, onChange, required = false }) => (
  <div className="md:col-span-2">
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-indigo-400 transition-colors duration-200">
      <div className="space-y-1 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="flex text-sm text-gray-600">
          <label htmlFor={name} className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
            <span>Upload a file</span>
            <input id={name} name={name} type="file" className="sr-only" onChange={onChange} required={required} />
          </label>
          <p className="pl-1">or drag and drop</p>
        </div>
        {fileName ? (
          <p className="text-sm font-semibold text-green-600">{fileName}</p>
        ) : (
          <p className="text-xs text-gray-500">PDF, DOCX, PNG, JPG up to 10MB</p>
        )}
      </div>
    </div>
  </div>
);

// --- Job Details Preview Component ---
const JobDetailsPreview = ({ job }) => {
  if (!job) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6 mb-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h2>
        <div className="flex items-center text-lg text-gray-600 mb-2">
          <Building2 className="w-5 h-5 mr-2" />
          <span>{job.company_name}</span>
        </div>
        <div className="flex items-center text-sm text-indigo-600 font-medium">
          <Briefcase className="w-4 h-4 mr-1" />
          <span>{job.job_type || 'FULL TIME'}</span>
        </div>
      </div>

      {/* Job Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-indigo-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">Salary</p>
            <p className="text-sm text-gray-600">
              {job.salary_min && job.salary_max
                ? `$${job.salary_min} - $${job.salary_max}`
                : "Competitive salary"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-indigo-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">Location</p>
            <p className="text-sm text-gray-600">{job.location}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">Deadline</p>
            <p className="text-sm text-gray-600">
              {job.application_deadline 
                ? new Date(job.application_deadline).toLocaleDateString()
                : "Not specified"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-indigo-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">Duration</p>
            <p className="text-sm text-gray-600">{job.duration || "Not specified"}</p>
          </div>
        </div>
      </div>

      {/* Job Description */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Description</h3>
        <p className="text-gray-700 leading-relaxed">{job.description}</p>
      </div>

      {/* Requirements */}
      {job.requirements && job.requirements.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Requirements</h3>
          <div className="flex flex-wrap gap-2">
            {job.requirements.map((req, index) => (
              <span key={index} className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-1 text-sm font-medium text-gray-700">
                {req}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Additional Fields Preview */}
      {job.additional_fields && job.additional_fields.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-indigo-600" />
            Additional Information Required
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-3">
              You'll need to provide the following information when applying:
            </p>
            <div className="space-y-2">
              {job.additional_fields.map((field, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                  <span className="text-sm text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                    {field.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Interview Process */}
      {job.interview_rounds && job.interview_rounds.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <Users className="w-5 h-5 mr-2 text-indigo-600" />
            Interview Process
          </h3>
          <div className="space-y-3">
            {job.interview_rounds.map((round, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{round.name}</h4>
                  <p className="text-sm text-gray-600">{round.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Eligibility Requirements */}
      {(job.min_cgpa || job.allowed_branches || job.min_tenth_percentage || job.min_twelfth_percentage) && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <Award className="w-5 h-5 mr-2 text-indigo-600" />
            Eligibility Requirements
          </h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {job.min_cgpa && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700">Minimum CGPA: {job.min_cgpa}</span>
                </div>
              )}
              {job.allowed_branches && job.allowed_branches.length > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700">Branches: {job.allowed_branches.join(', ')}</span>
                </div>
              )}
              {job.min_tenth_percentage && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700">10th Percentage: {job.min_tenth_percentage}%</span>
                </div>
              )}
              {job.min_twelfth_percentage && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700">12th Percentage: {job.min_twelfth_percentage}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Application Tips */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-yellow-800 mb-1">Application Tips</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Ensure your profile is complete with all required information</li>
              <li>• Prepare a compelling cover letter highlighting relevant experience</li>
              <li>• Have your resume and any required documents ready</li>
              <li>• Review the job requirements and eligibility criteria carefully</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Form View Component ---
const ApplicationForm = ({ job, formData, setFormData, setStep, canApply = true, userResumes = [] }) => {
  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setFormData(prev => ({ 
        ...prev, 
        additional_fields: {
          ...prev.additional_fields,
          [name]: files[0]
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAdditionalFieldChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      additional_fields: {
        ...prev.additional_fields,
        [fieldId]: value
      }
    }));
  };

  const renderAdditionalField = (field) => {
    const fieldId = `field_${field.id}`;
    const value = formData.additional_fields[fieldId] || '';

    switch (field.type) {
      case 'text':
        return (
          <InputField
            key={field.id}
            label={field.label}
            name={fieldId}
            value={value}
            onChange={(e) => handleAdditionalFieldChange(fieldId, e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            required={field.required}
          />
        );
      
      case 'number':
        return (
          <InputField
            key={field.id}
            label={field.label}
            type="number"
            name={fieldId}
            value={value}
            onChange={(e) => handleAdditionalFieldChange(fieldId, e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            required={field.required}
          />
        );
      
      case 'file':
        return (
          <FileInput
            key={field.id}
            label={field.label}
            name={fieldId}
            fileName={value instanceof File ? value.name : ''}
            onChange={(e) => {
              const file = e.target.files[0];
              handleAdditionalFieldChange(fieldId, file);
            }}
            required={field.required}
          />
        );
      
      case 'multiple_choice':
        return (
          <SelectField
            key={field.id}
            label={field.label}
            name={fieldId}
            value={value}
            onChange={(e) => handleAdditionalFieldChange(fieldId, e.target.value)}
            required={field.required}
          >
            <option value="">Select {field.label.toLowerCase()}</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </SelectField>
        );
      
      default:
        return null;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStep('review');
  };

  return (
    <form onSubmit={handleSubmit}>
      <SectionCard title="� Resume Selection" icon="📄">
        <div className="md:col-span-2">
          <label htmlFor="resume_id" className="block text-sm font-medium text-gray-700 mb-1.5">
            Select Resume <span className="text-red-500">*</span>
          </label>
          <select
            id="resume_id"
            name="resume_id"
            value={formData.resume_id || ''}
            onChange={handleChange}
            required={true}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-200"
          >
            <option value="">-- Select a resume --</option>
            {userResumes && userResumes.length > 0 ? (
              userResumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.name} {resume.is_primary ? '(Primary)' : ''} - Uploaded {new Date(resume.uploaded_at).toLocaleDateString()}
                </option>
              ))
            ) : (
              <option value="" disabled>No resumes available</option>
            )}
          </select>
          <p className="mt-2 text-xs text-gray-500">
            {userResumes && userResumes.length > 0 
              ? `You have ${userResumes.length} resume${userResumes.length > 1 ? 's' : ''} available. Select the one you want to use for this application.`
              : 'Please upload a resume in your profile before applying.'}
          </p>
        </div>
      </SectionCard>
      
      <SectionCard title="�📝 Cover Letter" icon="📝">
        <TextareaField 
          label="Cover Letter"
          name="cover_letter"
          value={formData.cover_letter}
          onChange={handleChange}
          placeholder="Dear Hiring Manager, I am writing to express my interest in this position..."
          tip="Tip: Mention specific skills from the job requirements and explain how your experience aligns with the role."
          required={true}
        />
      </SectionCard>

      {job.additional_fields && job.additional_fields.length > 0 && (
        <SectionCard title="📋 Additional Information" icon="📋">
          <div className="md:col-span-2 space-y-4">
            {job.additional_fields.map(field => renderAdditionalField(field))}
          </div>
        </SectionCard>
      )}

      <div className="mt-8 flex justify-end">
        <button
          type="submit"
          disabled={!canApply}
          className={`w-full sm:w-auto px-6 py-3 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ${
            canApply
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {canApply ? 'Review Application' : 'Application Restricted'}
        </button>
      </div>
    </form>
  );
};

// --- Review View Component ---
const ReviewApplication = ({ job, formData, setStep, onSubmit, isSubmitting, canApply = true, userResumes = [] }) => {
  
  // Find the selected resume
  const selectedResume = userResumes.find(r => r.id === parseInt(formData.resume_id));
  
  // A reusable row for displaying a piece of data
  const DataRow = ({ label, value }) => (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 break-words">{value || 'Not provided'}</dd>
    </div>
  );
  
  const TextData = ({ label, value }) => (
    <div className="py-3">
      <dt className="text-sm font-medium text-gray-500 mb-2">{label}</dt>
      <dd className="text-sm text-gray-800 p-4 bg-gray-50 rounded-lg whitespace-pre-wrap">{value || 'Not provided'}</dd>
    </div>
  );

  return (
    <div>
      <SectionCard title="� Selected Resume" onEdit={() => setStep('form')} icon="📄">
        <div className="md:col-span-2">
          {selectedResume ? (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedResume.name}</h4>
                  <p className="text-sm text-gray-600">
                    Uploaded on {new Date(selectedResume.uploaded_at).toLocaleDateString()}
                    {selectedResume.is_primary && <span className="ml-2 text-indigo-600 font-medium">(Primary Resume)</span>}
                  </p>
                </div>
                <a 
                  href={selectedResume.file_url || selectedResume.resume_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  View →
                </a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No resume selected</p>
          )}
        </div>
      </SectionCard>
      
      <SectionCard title="�📝 Cover Letter" onEdit={() => setStep('form')} icon="📝">
        <div className="md:col-span-2">
          <TextData label="Cover Letter" value={formData.cover_letter} />
        </div>
      </SectionCard>
      
      {job.additional_fields && job.additional_fields.length > 0 && (
        <SectionCard title="📋 Additional Information" onEdit={() => setStep('form')} icon="📋">
          <div className="md:col-span-2 divide-y divide-gray-200">
            {job.additional_fields.map(field => {
              const fieldId = `field_${field.id}`;
              const value = formData.additional_fields[fieldId];
              return (
                <DataRow 
                  key={field.id}
                  label={field.label} 
                  value={field.type === 'file' && value instanceof File ? value.name : value} 
                />
              );
            })}
          </div>
        </SectionCard>
      )}
      
      <div className="mt-8 flex justify-between">
        <button 
          type="button"
          onClick={() => setStep('form')}
          className="px-6 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
        >
          Back to Edit
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || !canApply}
          className={`px-8 py-3 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 ${
            canApply
              ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? "Submitting..." : canApply ? "Submit Application" : "Application Restricted"}
        </button>
      </div>
    </div>
  );
};

// --- Main Component ---
export default function JobApplicationPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id;
  const { showApplicationSubmissionError, showSuccess, handleApiError, showProfileIncompleteModal } = useNotification();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('form'); // 'form' or 'review'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profileValidation, setProfileValidation] = useState(null);
  const [freezeStatus, setFreezeStatus] = useState(null);
  const [canApply, setCanApply] = useState(true);
  const [freezeRestrictions, setFreezeRestrictions] = useState([]);
  const [userResumes, setUserResumes] = useState([]);

  // Form data state
  const [formData, setFormData] = useState({
    cover_letter: '',
    resume_id: '',
    additional_fields: {}
  });

  // Fetch job details
  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        setLoading(true);
        const response = await client.get(`/api/v1/jobs/${jobId}/`);
        setJob(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch job details:', err);
        handleApiError(err, 'loading job details');
        setError('Failed to load job details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchJobDetails();
      fetchUserProfile();
      checkJobApplicationEligibility();
    }
  }, [jobId]);

  // Fetch user profile for validation
  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await client.get('/api/auth/profile/');
      const profile = response.data;

      // Also fetch resume information from the new Resume model
      try {
        const resumes = await studentsAPI.getResumes();
        profile.resumes = resumes;
        profile.resume_count = resumes.length;
        setUserResumes(resumes);
        
        // Auto-select primary resume if available
        const primaryResume = resumes.find(r => r.is_primary);
        if (primaryResume && !formData.resume_id) {
          setFormData(prev => ({ ...prev, resume_id: primaryResume.id.toString() }));
        }
      } catch (resumeError) {
        console.log('Could not fetch resumes:', resumeError);
        profile.resumes = [];
        profile.resume_count = 0;
        setUserResumes([]);
      }

      setUserProfile(profile);

      // Validate profile for job application
      const jobRequirements = job ? {
        minCgpa: job.min_cgpa,
        allowedBranches: job.allowed_branches,
        minTenthPercentage: job.min_tenth_percentage,
        minTwelfthPercentage: job.min_twelfth_percentage
      } : {};

      const validation = validateForJobApplication(profile, jobRequirements);
      setProfileValidation(validation);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    }
  };

  // Check freeze status and job application eligibility
  const checkJobApplicationEligibility = async () => {
    if (!jobId) return;

    try {
      const eligibilityResponse = await studentsAPI.canApplyToJob(jobId);
      setCanApply(eligibilityResponse.can_apply);

      if (!eligibilityResponse.can_apply) {
        setFreezeStatus({
          status: eligibilityResponse.freeze_status,
          reason: eligibilityResponse.reason,
          freeze_reason: eligibilityResponse.freeze_reason,
          restrictions: eligibilityResponse.restrictions || []
        });
        setFreezeRestrictions(eligibilityResponse.restrictions || []);
      }
    } catch (err) {
      console.error('Failed to check job application eligibility:', err);

      // Handle specific error cases
      if (err.response?.status === 400 && err.response?.data?.reason) {
        // User doesn't have student profile or other validation error
        setCanApply(false);
        setFreezeStatus({
          status: 'error',
          reason: err.response.data.reason,
          freeze_reason: '',
          restrictions: []
        });
      } else if (err.response?.status === 500) {
        // Server error - show error message but allow application
        setCanApply(true);
        console.error('Server error checking eligibility:', err.response?.data);
      } else {
        // Other errors - allow application but log the error
        setCanApply(true);
      }
    }
  };

  // Re-validate when job data changes
  useEffect(() => {
    if (userProfile && job) {
      const jobRequirements = {
        minCgpa: job.min_cgpa,
        allowedBranches: job.allowed_branches,
        minTenthPercentage: job.min_tenth_percentage,
        minTwelfthPercentage: job.min_twelfth_percentage
      };

      const validation = validateForJobApplication(userProfile, jobRequirements);
      setProfileValidation(validation);
    }
  }, [userProfile, job]);

  const handleSubmit = async () => {
    // Check profile validation first
    if (profileValidation && !profileValidation.canApply) {
      const missingFields = profileValidation.missing.filter(field => 
        ['Resume', 'First Name', 'Last Name', 'Email', 'Student ID/Roll Number'].includes(field)
      );
      showProfileIncompleteModal(missingFields);
      return;
    }

    // Check job-specific eligibility
    if (profileValidation?.jobSpecific && !profileValidation.jobSpecific.isEligible) {
      showApplicationSubmissionError({
        response: {
          data: {
            eligibility: profileValidation.jobSpecific.errors
          }
        }
      });
      return;
    }
    
    if (!formData.cover_letter.trim()) {
      showApplicationSubmissionError({
        response: {
          data: {
            cover_letter: ['Cover letter is required.']
          }
        }
      });
      return;
    }
    
    if (!formData.resume_id) {
      showApplicationSubmissionError({
        response: {
          data: {
            resume: ['Please select a resume to submit with your application.']
          }
        }
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await applyToJob(jobId, formData.cover_letter, formData.additional_fields, formData.resume_id);
      
      // Success - show success notification and redirect
      showSuccess('Application Submitted!', 'Your job application has been submitted successfully. Good luck!');
      
      // Redirect after a short delay to let user see the success message
      setTimeout(() => {
        router.push('/jobpostings');
      }, 2000);
      
    } catch (err) {
      console.error('Failed to submit application:', err);
      showApplicationSubmissionError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/jobpostings')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Job not found</p>
          <button
            onClick={() => router.push('/jobpostings')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 font-sans">
      <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
        
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center mb-4">
            <button
              onClick={() => router.push('/jobpostings')}
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Jobs
            </button>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
                <div className="flex items-center text-lg text-gray-600 mb-2">
                  <Building2 className="w-5 h-5 mr-2" />
                  <span>{job.company_name}</span>
                </div>
              </div>
              
              {/* Application Status */}
              <div className="flex items-center space-x-2 mt-4 lg:mt-0">
                {[1, 2, 3].map((stepNumber) => (
                  <div key={stepNumber} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      (step === 'form' && stepNumber === 1) || (step === 'review' && stepNumber <= 2)
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {stepNumber}
                    </div>
                    {stepNumber < 3 && (
                      <div className={`w-8 h-0.5 mx-2 ${
                        (step === 'review' && stepNumber < 2) ? 'bg-indigo-600' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{job.location}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <DollarSign className="w-4 h-4 mr-2" />
                <span>
                  {job.salary_min && job.salary_max
                    ? `$${job.salary_min} - $${job.salary_max}`
                    : "Competitive salary"}
                </span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                <span>
                  Deadline: {job.application_deadline 
                    ? new Date(job.application_deadline).toLocaleDateString()
                    : "Not specified"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Job Details Preview */}
        <JobDetailsPreview job={job} />

        {/* Freeze Restriction Notice */}
        {!canApply && freezeStatus && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-red-800 font-semibold mb-2">
                  {freezeStatus.status === 'complete' ? 'Account Completely Frozen' : 'Account Partially Restricted'}
                </h3>
                <p className="text-red-700 mb-3">
                  {freezeStatus.reason}
                </p>
                {freezeStatus.freeze_reason && (
                  <div className="bg-red-100 rounded-md p-3 mb-3">
                    <p className="text-red-800 font-medium text-sm">
                      Admin Reason: {freezeStatus.freeze_reason}
                    </p>
                  </div>
                )}
                {freezeRestrictions.length > 0 && (
                  <div>
                    <p className="text-red-700 font-medium text-sm mb-2">Specific restrictions for this job:</p>
                    <ul className="list-disc list-inside text-red-600 text-sm space-y-1">
                      {freezeRestrictions.map((restriction, index) => (
                        <li key={index}>{restriction}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content: Switches between Form and Review */}
        <main>
          {step === 'form' ? (
            <ApplicationForm
              job={job}
              formData={formData}
              setFormData={setFormData}
              setStep={setStep}
              canApply={canApply}
              userResumes={userResumes}
            />
          ) : (
            <ReviewApplication
              job={job}
              formData={formData}
              setStep={setStep}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              canApply={canApply}
              userResumes={userResumes}
            />
          )}
        </main>
        
      </div>
    </div>
  );
}