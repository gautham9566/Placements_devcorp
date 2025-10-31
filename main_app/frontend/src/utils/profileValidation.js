// Profile validation utilities for job applications

export const REQUIRED_PROFILE_FIELDS = {
  basic: {
    first_name: 'First Name',
    last_name: 'Last Name',
    email: 'Email Address',
    phone: 'Phone Number',
    date_of_birth: 'Date of Birth'
  },
  academic: {
    student_id: 'Student ID/Roll Number',
    branch: 'Department/Branch',
    gpa: 'CGPA/GPA',
    joining_year: 'Joining Year',
    passout_year: 'Passout Year'
  },
  contact: {
    address: 'Address',
    city: 'City',
    state: 'State',
    pincode: 'PIN Code'
  },
  documents: {
    resume: 'Resume',
    tenth_certificate: 'Class 10 Certificate',
    twelfth_certificate: 'Class 12 Certificate'
  },
  education: {
    tenth_percentage: 'Class 10 Percentage',
    twelfth_percentage: 'Class 12 Percentage',
    tenth_year_of_passing: 'Class 10 Year of Passing',
    twelfth_year_of_passing: 'Class 12 Year of Passing'
  }
};

export const CRITICAL_FIELDS = [
  'first_name',
  'last_name', 
  'email',
  'phone',
  'student_id',
  'branch',
  'gpa',
  'resume'
];

export const validateProfile = (profile) => {
  const missing = [];
  const warnings = [];
  const errors = [];

  if (!profile) {
    return {
      isValid: false,
      missing: ['Profile not found'],
      warnings: [],
      errors: ['Please complete your profile before applying'],
      score: 0
    };
  }

  // Check critical fields
  CRITICAL_FIELDS.forEach(field => {
    const value = profile[field];
    const fieldName = getFieldDisplayName(field);
    
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missing.push(fieldName);
    }
  });

  // Check GPA/CGPA format and range
  if (profile.gpa) {
    const gpaValue = parseFloat(profile.gpa);
    if (isNaN(gpaValue) || gpaValue < 0 || gpaValue > 10) {
      errors.push('CGPA must be between 0 and 10');
    } else if (gpaValue < 6.0) {
      warnings.push('CGPA below 6.0 may limit job opportunities');
    }
  }

  // Check phone number format
  if (profile.phone) {
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(profile.phone.replace(/[^\d]/g, ''))) {
      errors.push('Phone number must be a valid 10-digit Indian mobile number');
    }
  }

  // Check email format
  if (profile.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profile.email)) {
      errors.push('Please provide a valid email address');
    }
  }

  // Check resume - check both old resume field and new Resume model
  const hasOldResume = profile.resume || profile.resume_url;
  const hasNewResumes = profile.resumes && Array.isArray(profile.resumes) && profile.resumes.length > 0;
  const hasResumeCount = profile.resume_count && profile.resume_count > 0;

  if (!hasOldResume && !hasNewResumes && !hasResumeCount) {
    missing.push('Resume');
    errors.push('Resume is required for job applications');
  }

  // Check academic details
  if (profile.tenth_percentage && (profile.tenth_percentage < 60)) {
    warnings.push('Class 10 percentage below 60% may limit opportunities');
  }

  if (profile.twelfth_percentage && (profile.twelfth_percentage < 60)) {
    warnings.push('Class 12 percentage below 60% may limit opportunities');
  }

  // Calculate completeness score
  const totalFields = Object.keys(REQUIRED_PROFILE_FIELDS).reduce(
    (acc, section) => acc + Object.keys(REQUIRED_PROFILE_FIELDS[section]).length, 
    0
  );
  
  const filledFields = totalFields - missing.length;
  const score = Math.round((filledFields / totalFields) * 100);

  // Determine if profile is valid for job applications
  const isValid = missing.length === 0 && errors.length === 0;
  const canApply = CRITICAL_FIELDS.every(field => {
    if (field === 'resume') {
      // Special handling for resume field - check both old and new resume models
      const hasOldResume = profile.resume || profile.resume_url;
      const hasNewResumes = profile.resumes && Array.isArray(profile.resumes) && profile.resumes.length > 0;
      const hasResumeCount = profile.resume_count && profile.resume_count > 0;
      return hasOldResume || hasNewResumes || hasResumeCount;
    }
    const value = profile[field];
    return value && (typeof value !== 'string' || value.trim() !== '');
  });

  return {
    isValid,
    canApply,
    missing,
    warnings,
    errors,
    score,
    summary: generateSummary(score, missing.length, warnings.length, errors.length)
  };
};

export const validateForJobApplication = (profile, jobRequirements = {}) => {
  const baseValidation = validateProfile(profile);
  
  // Additional job-specific validations
  const jobErrors = [];
  const jobWarnings = [];

  if (jobRequirements.minCgpa && profile.gpa) {
    const gpaValue = parseFloat(profile.gpa);
    if (gpaValue < jobRequirements.minCgpa) {
      jobErrors.push(`CGPA ${jobRequirements.minCgpa} or above required`);
    }
  }

  if (jobRequirements.allowedBranches && profile.branch) {
    if (!jobRequirements.allowedBranches.includes(profile.branch)) {
      jobErrors.push(`This job is not open for ${profile.branch} students`);
    }
  }

  if (jobRequirements.minTenthPercentage && profile.tenth_percentage) {
    if (profile.tenth_percentage < jobRequirements.minTenthPercentage) {
      jobErrors.push(`Class 10: ${jobRequirements.minTenthPercentage}% or above required`);
    }
  }

  if (jobRequirements.minTwelfthPercentage && profile.twelfth_percentage) {
    if (profile.twelfth_percentage < jobRequirements.minTwelfthPercentage) {
      jobErrors.push(`Class 12: ${jobRequirements.minTwelfthPercentage}% or above required`);
    }
  }

  return {
    ...baseValidation,
    jobSpecific: {
      errors: jobErrors,
      warnings: jobWarnings,
      isEligible: jobErrors.length === 0
    }
  };
};

export const getProfileCompletionSuggestions = (validation) => {
  const suggestions = [];

  if (validation.missing.includes('Resume')) {
    suggestions.push({
      type: 'critical',
      title: 'Upload Resume',
      description: 'A resume is required for all job applications',
      action: 'upload_resume',
      icon: 'upload'
    });
  }

  if (validation.missing.some(field => ['First Name', 'Last Name', 'Email', 'Phone'].includes(field))) {
    suggestions.push({
      type: 'critical',
      title: 'Complete Basic Information',
      description: 'Fill in your personal details',
      action: 'edit_basic_info',
      icon: 'user'
    });
  }

  if (validation.missing.some(field => ['CGPA/GPA', 'Department/Branch'].includes(field))) {
    suggestions.push({
      type: 'critical',
      title: 'Add Academic Details',
      description: 'Provide your academic information',
      action: 'edit_academic_info',
      icon: 'graduation-cap'
    });
  }

  if (validation.warnings.some(w => w.includes('percentage'))) {
    suggestions.push({
      type: 'warning',
      title: 'Review Academic Performance',
      description: 'Low grades may limit job opportunities',
      action: 'review_grades',
      icon: 'alert-triangle'
    });
  }

  if (validation.score < 80) {
    suggestions.push({
      type: 'info',
      title: 'Complete Profile',
      description: `Profile is ${validation.score}% complete. More complete profiles get better job matches.`,
      action: 'complete_profile',
      icon: 'info'
    });
  }

  return suggestions;
};

const getFieldDisplayName = (field) => {
  for (const section of Object.values(REQUIRED_PROFILE_FIELDS)) {
    if (section[field]) {
      return section[field];
    }
  }
  return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const generateSummary = (score, missingCount, warningCount, errorCount) => {
  if (errorCount > 0) {
    return {
      status: 'error',
      message: `${errorCount} error(s) need to be fixed before applying`,
      color: 'red'
    };
  }
  
  if (missingCount > 0) {
    return {
      status: 'incomplete',
      message: `${missingCount} required field(s) missing`,
      color: 'yellow'
    };
  }
  
  if (warningCount > 0) {
    return {
      status: 'warning',
      message: `Profile complete with ${warningCount} warning(s)`,
      color: 'orange'
    };
  }
  
  if (score >= 90) {
    return {
      status: 'excellent',
      message: 'Profile is excellent and ready for applications',
      color: 'green'
    };
  }
  
  if (score >= 80) {
    return {
      status: 'good',
      message: 'Profile is good for most applications',
      color: 'blue'
    };
  }
  
  return {
    status: 'needs_improvement',
    message: 'Profile needs more information for better job matching',
    color: 'yellow'
  };
};

export default {
  validateProfile,
  validateForJobApplication,
  getProfileCompletionSuggestions,
  REQUIRED_PROFILE_FIELDS,
  CRITICAL_FIELDS
}; 