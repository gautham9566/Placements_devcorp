import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Utility function to format job descriptions with proper line breaks and formatting
export function formatJobDescription(description) {
  if (!description) return "No description provided.";
  
  return description
    .replace(/\n/g, '<br />') // Convert newlines to HTML breaks
    .replace(/•/g, '•') // Ensure bullet points are preserved
    .replace(/\*\s/g, '• ') // Convert asterisk bullets to bullet symbols
    .replace(/-\s/g, '• ') // Convert dash bullets to bullet symbols
    .trim();
}

// Component for rendering formatted job descriptions
export function FormattedJobDescription({ description, className = "" }) {
  const formattedDescription = formatJobDescription(description);
  
  return (
    <div 
      className={`text-gray-700 leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: formattedDescription }}
    />
  );
}

// Utility function to standardize field names in API responses
export function standardizeFieldNames(data, entityType) {
  if (!data) return data;
  
  // Define standard field name mappings for different entity types
  const fieldMappings = {
    company: {
      totalActiveJobs: 'total_active_jobs',
      totalApplicants: 'total_applicants',
      totalHired: 'total_hired',
      awaitedApproval: 'pending_approval',
      companyName: 'name',
      companySize: 'size',
      companyIndustry: 'industry',
      companyLocation: 'location'
    },
    student: {
      firstName: 'first_name',
      lastName: 'last_name',
      contactEmail: 'email',
      studentId: 'student_id',
      joiningYear: 'joining_year',
      passoutYear: 'passout_year',
      tenthCertificate: 'tenth_certificate',
      twelfthCertificate: 'twelfth_certificate'
    },
    job: {
      jobTitle: 'title',
      jobType: 'job_type',
      jobLocation: 'location',
      salaryMin: 'salary_min',
      salaryMax: 'salary_max',
      requiredSkills: 'required_skills',
      applicationDeadline: 'application_deadline',
      isActive: 'is_active',
      companyName: 'company_name'
    }
  };
  
  // Return original data if entity type is not supported
  if (!fieldMappings[entityType]) return data;
  
  // If it's an array, standardize each item
  if (Array.isArray(data)) {
    return data.map(item => standardizeFieldNames(item, entityType));
  }
  
  // For single objects, standardize fields
  const standardized = { ...data };
  const mapping = fieldMappings[entityType];
  
  // Apply field name standardization
  Object.keys(mapping).forEach(nonStandardField => {
    const standardField = mapping[nonStandardField];
    
    // If non-standard field exists in the data, copy it to the standard field
    if (standardized[nonStandardField] !== undefined && standardized[standardField] === undefined) {
      standardized[standardField] = standardized[nonStandardField];
      delete standardized[nonStandardField];
    }
  });
  
  return standardized;
}
