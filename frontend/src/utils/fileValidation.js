// File validation utilities

export const FILE_CONSTRAINTS = {
  resume: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    allowedExtensions: ['.pdf', '.doc', '.docx'],
    displayName: 'Resume'
  },
  profile_image: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    displayName: 'Profile Image'
  },
  certificate: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],
    displayName: 'Certificate'
  },
  marksheet: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],
    displayName: 'Marksheet'
  },
  cover_letter: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    allowedExtensions: ['.pdf', '.doc', '.docx'],
    displayName: 'Cover Letter'
  },
  generic_document: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
    displayName: 'Document'
  }
};

export const validateFile = (file, fileType = 'generic_document') => {
  const constraints = FILE_CONSTRAINTS[fileType];
  const errors = [];
  const warnings = [];

  if (!file) {
    return {
      isValid: false,
      errors: ['No file selected'],
      warnings: [],
      file: null
    };
  }

  // Check file size
  if (file.size > constraints.maxSize) {
    const maxSizeMB = Math.round(constraints.maxSize / (1024 * 1024));
    const fileSizeMB = Math.round(file.size / (1024 * 1024) * 10) / 10;
    errors.push(`File size (${fileSizeMB}MB) exceeds maximum allowed size of ${maxSizeMB}MB`);
  }

  // Check file type
  if (!constraints.allowedTypes.includes(file.type)) {
    const allowedTypesDisplay = constraints.allowedExtensions.join(', ');
    errors.push(`File type not supported. Allowed formats: ${allowedTypesDisplay}`);
  }

  // Check file extension
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
  if (!constraints.allowedExtensions.includes(fileExtension)) {
    const allowedExtensionsDisplay = constraints.allowedExtensions.join(', ');
    errors.push(`File extension not allowed. Supported extensions: ${allowedExtensionsDisplay}`);
  }

  // Additional validations based on file type
  switch (fileType) {
    case 'resume':
      if (file.size < 50 * 1024) { // Less than 50KB
        warnings.push('Resume file seems very small. Please ensure it contains adequate content.');
      }
      if (file.name.length > 100) {
        warnings.push('File name is very long. Consider using a shorter name.');
      }
      break;

    case 'profile_image':
      if (file.size < 10 * 1024) { // Less than 10KB
        warnings.push('Image file seems very small. Please ensure it\'s a clear photo.');
      }
      break;

    case 'certificate':
    case 'marksheet':
      if (file.size < 100 * 1024) { // Less than 100KB
        warnings.push('Document file seems small. Please ensure it\'s clearly readable.');
      }
      break;
  }

  // Check for potentially malicious file names
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    errors.push('File name contains invalid characters');
  }

  // Check for very long file names
  if (file.name.length > 255) {
    errors.push('File name is too long (maximum 255 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    file,
    size: file.size,
    sizeDisplay: formatFileSize(file.size),
    type: file.type,
    name: file.name
  };
};

export const validateMultipleFiles = (files, fileType = 'generic_document', maxFiles = 5) => {
  const results = [];
  const overallErrors = [];

  if (!files || files.length === 0) {
    return {
      isValid: false,
      errors: ['No files selected'],
      warnings: [],
      results: [],
      totalSize: 0
    };
  }

  if (files.length > maxFiles) {
    overallErrors.push(`Too many files selected. Maximum allowed: ${maxFiles}`);
  }

  let totalSize = 0;
  let hasErrors = false;

  for (let i = 0; i < files.length; i++) {
    const validation = validateFile(files[i], fileType);
    results.push({
      index: i,
      fileName: files[i].name,
      ...validation
    });

    totalSize += files[i].size;

    if (!validation.isValid) {
      hasErrors = true;
    }
  }

  // Check total size for multiple files
  const maxTotalSize = FILE_CONSTRAINTS[fileType].maxSize * Math.min(files.length, maxFiles);
  if (totalSize > maxTotalSize) {
    const maxTotalSizeMB = Math.round(maxTotalSize / (1024 * 1024));
    const totalSizeMB = Math.round(totalSize / (1024 * 1024) * 10) / 10;
    overallErrors.push(`Total file size (${totalSizeMB}MB) exceeds maximum allowed (${maxTotalSizeMB}MB)`);
    hasErrors = true;
  }

  return {
    isValid: !hasErrors && overallErrors.length === 0,
    errors: overallErrors,
    warnings: [],
    results,
    totalSize,
    totalSizeDisplay: formatFileSize(totalSize),
    fileCount: files.length
  };
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const getFileTypeIcon = (fileType) => {
  const iconMap = {
    'application/pdf': 'file-text',
    'application/msword': 'file-text',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'file-text',
    'image/jpeg': 'image',
    'image/png': 'image',
    'image/gif': 'image',
    'image/webp': 'image'
  };

  return iconMap[fileType] || 'file';
};

export const createFileUploadPreview = (file, validation) => {
  return {
    name: file.name,
    size: formatFileSize(file.size),
    type: file.type,
    icon: getFileTypeIcon(file.type),
    isValid: validation.isValid,
    errors: validation.errors,
    warnings: validation.warnings,
    preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
  };
};

// Error messages for different scenarios
export const getFileErrorMessage = (validationResult) => {
  if (validationResult.isValid) {
    return null;
  }

  const primaryError = validationResult.errors[0];
  
  if (primaryError.includes('size')) {
    return {
      title: 'File Too Large',
      message: primaryError,
      suggestion: 'Please compress the file or choose a smaller file.',
      type: 'size'
    };
  }

  if (primaryError.includes('type') || primaryError.includes('extension')) {
    return {
      title: 'Unsupported File Format',
      message: primaryError,
      suggestion: 'Please convert your file to a supported format.',
      type: 'format'
    };
  }

  if (primaryError.includes('name')) {
    return {
      title: 'Invalid File Name',
      message: primaryError,
      suggestion: 'Please rename your file and try again.',
      type: 'name'
    };
  }

  return {
    title: 'File Upload Error',
    message: primaryError,
    suggestion: 'Please check your file and try again.',
    type: 'generic'
  };
};

export default {
  validateFile,
  validateMultipleFiles,
  formatFileSize,
  getFileTypeIcon,
  createFileUploadPreview,
  getFileErrorMessage,
  FILE_CONSTRAINTS
}; 