import { useNotification } from '../contexts/NotificationContext';

// Error codes and their corresponding handlers
export const ERROR_PATTERNS = {
  AUTHENTICATION: {
    codes: [401],
    keywords: ['unauthorized', 'authentication', 'token', 'login'],
    handler: 'showAuthError'
  },
  SESSION_EXPIRED: {
    codes: [401],
    keywords: ['expired', 'invalid token', 'token expired'],
    handler: 'showSessionExpiredModal'
  },
  PERMISSION_DENIED: {
    codes: [403],
    keywords: ['permission', 'forbidden', 'access denied'],
    handler: 'showAuthError'
  },
  VALIDATION: {
    codes: [400, 422],
    keywords: ['validation', 'invalid', 'required'],
    handler: 'showValidationError'
  },
  RESUME_REQUIRED: {
    fields: ['resume'],
    keywords: ['resume', 'must be uploaded', 'present in the student profile'],
    handler: 'showMissingResumeModal'
  },
  PROFILE_INCOMPLETE: {
    keywords: ['profile incomplete', 'missing profile', 'update profile'],
    handler: 'showProfileIncompleteModal'
  },
  FILE_UPLOAD: {
    keywords: ['file', 'upload', 'size', 'format', 'extension'],
    handler: 'showFileUploadError'
  },
  NETWORK_ERROR: {
    codes: ['NETWORK_ERROR', 'ECONNREFUSED', 'ERR_NETWORK'],
    keywords: ['network', 'connection', 'timeout'],
    handler: 'showNetworkError'
  },
  MAINTENANCE: {
    codes: [503, 502],
    keywords: ['maintenance', 'service unavailable', 'temporarily unavailable'],
    handler: 'showMaintenanceModal'
  }
};

// Smart error detection and handling
export const detectAndHandleError = (error, context = '', notificationHandlers) => {
  const errorData = error?.response?.data || {};
  const errorMessage = (errorData.detail || errorData.message || error.message || '').toLowerCase();
  const statusCode = error?.response?.status;

  // Check for specific error patterns
  for (const [pattern, config] of Object.entries(ERROR_PATTERNS)) {
    // Check status codes
    if (config.codes && config.codes.includes(statusCode)) {
      // Additional keyword check for more precision
      if (config.keywords && !config.keywords.some(keyword => errorMessage.includes(keyword))) {
        continue;
      }
      
      return handleSpecificError(pattern, error, context, notificationHandlers);
    }

    // Check for field-specific errors (like resume)
    if (config.fields && config.fields.some(field => errorData[field])) {
      return handleSpecificError(pattern, error, context, notificationHandlers);
    }

    // Check keywords in error message
    if (config.keywords && config.keywords.some(keyword => errorMessage.includes(keyword))) {
      return handleSpecificError(pattern, error, context, notificationHandlers);
    }
  }

  // Fallback to generic error handling
  return handleGenericError(error, context, notificationHandlers);
};

const handleSpecificError = (pattern, error, context, notificationHandlers) => {
  const config = ERROR_PATTERNS[pattern];
  const handlerName = config.handler;
  
  if (notificationHandlers[handlerName]) {
    switch (handlerName) {
      case 'showMissingResumeModal':
        notificationHandlers.showMissingResumeModal();
        break;
      case 'showSessionExpiredModal':
        notificationHandlers.showSessionExpiredModal();
        break;
      case 'showMaintenanceModal':
        notificationHandlers.showMaintenanceModal();
        break;
      case 'showValidationError':
        const errorData = error?.response?.data || {};
        notificationHandlers.showValidationError(
          `Validation Error ${context ? `in ${context}` : ''}`, 
          errorData
        );
        break;
      case 'showAuthError':
        const message = error?.response?.data?.detail || 
                       error?.response?.data?.message || 
                       `Authentication failed${context ? ` while ${context}` : ''}`;
        notificationHandlers.showAuthError(message);
        break;
      case 'showFileUploadError':
        notificationHandlers.showFileUploadError();
        break;
      case 'showNetworkError':
        notificationHandlers.showNetworkError(error);
        break;
      case 'showProfileIncompleteModal':
        notificationHandlers.showProfileIncompleteModal();
        break;
      default:
        return handleGenericError(error, context, notificationHandlers);
    }
    return true; // Error was handled
  }
  
  return false; // Error not handled
};

const handleGenericError = (error, context, notificationHandlers) => {
  if (notificationHandlers.handleApiError) {
    notificationHandlers.handleApiError(error, context);
    return true;
  }
  
  // Ultimate fallback
  console.error('Unhandled error:', error);
  return false;
};

// Hook for easy error handling in components
export const useErrorHandler = () => {
  const notificationHandlers = useNotification();
  
  const handleError = (error, context = '') => {
    return detectAndHandleError(error, context, notificationHandlers);
  };

  return { handleError };
};

// Axios interceptor setup
export const setupErrorInterceptor = (axiosInstance, notificationHandlers) => {
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      // Automatically handle common errors
      detectAndHandleError(error, 'API request', notificationHandlers);
      return Promise.reject(error);
    }
  );
};

export default {
  detectAndHandleError,
  useErrorHandler,
  setupErrorInterceptor,
  ERROR_PATTERNS
}; 