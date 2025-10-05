'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import ErrorModal from '../components/ui/ErrorModal';
import { 
  Upload, 
  User, 
  Wifi, 
  FileText, 
  Shield, 
  ExternalLink 
} from 'lucide-react';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback((config) => {
    setNotification({
      id: Date.now(),
      ...config,
    });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // Specific notification types for common errors
  const showError = useCallback((title, message, details = null, actions = []) => {
    showNotification({
      type: 'error',
      title,
      message,
      details,
      actions,
    });
  }, [showNotification]);

  const showSuccess = useCallback((title, message, autoClose = true) => {
    showNotification({
      type: 'success',
      title,
      message,
      autoClose,
      autoCloseDelay: 3000,
    });
  }, [showNotification]);

  const showWarning = useCallback((title, message, details = null, actions = []) => {
    showNotification({
      type: 'warning',
      title,
      message,
      details,
      actions,
    });
  }, [showNotification]);

  const showInfo = useCallback((title, message, autoClose = false) => {
    showNotification({
      type: 'info',
      title,
      message,
      autoClose,
    });
  }, [showNotification]);

  // Specific error handlers for common scenarios
  const showMissingResumeModal = useCallback(() => {
    showNotification({
      type: 'warning',
      title: 'Resume Required',
      message: 'You need to upload a resume before applying to this job.',
      details: [
        'Please upload your resume to your profile first',
        'You can upload it from the Profile section',
        'Accepted formats: PDF, DOC, DOCX (max 5MB)'
      ],
      showIcon: true,
      actions: [
        {
          text: 'Go to Profile',
          style: 'primary',
          icon: User,
          action: () => {
            window.location.href = '/profile';
          }
        },
        {
          text: 'Upload Resume',
          style: 'secondary',
          icon: Upload,
          action: () => {
            // Trigger a file upload dialog
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf,.doc,.docx';
            input.onchange = (e) => {
              const file = e.target.files[0];
              if (file) {
                // Handle resume upload (this would need to be passed as a prop)
                console.log('Resume file selected:', file);
              }
            };
            input.click();
          }
        }
      ],
      dismissible: true
    });
  }, [showNotification]);

  const showApplicationSubmissionError = useCallback((error) => {
    const errorData = error?.response?.data || {};
    
    // Check for specific validation errors
    if (errorData.resume) {
      showMissingResumeModal();
      return;
    }

    // Check for other validation errors
    const validationErrors = {};
    let hasValidationErrors = false;

    Object.keys(errorData).forEach(field => {
      if (Array.isArray(errorData[field]) && errorData[field].length > 0) {
        validationErrors[field] = errorData[field];
        hasValidationErrors = true;
      }
    });

    if (hasValidationErrors) {
      // Use inline validation error notification instead of undefined function
      showNotification({
        type: 'error',
        title: 'Application Submission Failed',
        message: 'Please fix the following validation errors:',
        details: Object.entries(validationErrors).map(([field, errors]) => 
          `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`
        ),
        showIcon: true,
        dismissible: true
      });
      return;
    }

    // Generic application error
    const message = errorData.detail || 
                   errorData.message || 
                   error?.message || 
                   'Failed to submit your job application.';

    showNotification({
      type: 'error',
      title: 'Application Failed',
      message: message,
      details: [
        'Please check your application details',
        'Ensure all required fields are filled',
        'Try again in a few moments'
      ],
      showIcon: true,
      actions: [
        {
          text: 'Try Again',
          style: 'primary',
          action: () => {
            // This would need to be passed as a callback
            window.location.reload();
          }
        }
      ],
      dismissible: true
    });
  }, [showNotification, showMissingResumeModal]);

  const showProfileIncompleteModal = useCallback((missingFields = []) => {
    showNotification({
      type: 'warning',
      title: 'Profile Incomplete',
      message: 'Please complete your profile before applying to jobs.',
      details: missingFields.length > 0 
        ? [`Missing: ${missingFields.join(', ')}`]
        : [
          'Some required profile information is missing',
          'Please update your profile with all necessary details',
          'This ensures better job matching and application processing'
        ],
      showIcon: true,
      actions: [
        {
          text: 'Complete Profile',
          style: 'primary',
          icon: User,
          action: () => {
            window.location.href = '/profile';
          }
        }
      ],
      dismissible: true
    });
  }, [showNotification]);

  const showSessionExpiredModal = useCallback(() => {
    showNotification({
      type: 'warning',
      title: 'Session Expired',
      message: 'Your login session has expired. Please login again to continue.',
      details: [
        'For security reasons, sessions expire after a period of inactivity',
        'Please login again to access your account',
        'Your data is safe and will be available after login'
      ],
      showIcon: true,
      actions: [
        {
          text: 'Login',
          style: 'primary',
          icon: Shield,
          action: () => {
            window.location.href = '/login';
          }
        }
      ],
      dismissible: false,
      autoClose: false
    });
  }, [showNotification]);

  const showMaintenanceModal = useCallback(() => {
    showNotification({
      type: 'info',
      title: 'System Maintenance',
      message: 'The system is currently under maintenance. Please try again later.',
      details: [
        'We are working to improve your experience',
        'Maintenance should be completed shortly',
        'Thank you for your patience'
      ],
      showIcon: true,
      actions: [
        {
          text: 'Check Status',
          style: 'secondary',
          icon: ExternalLink,
          action: () => {
            window.open('/status', '_blank');
          }
        }
      ],
      dismissible: true,
      autoClose: false
    });
  }, [showNotification]);

  // Specific error handlers for common scenarios
  const showAuthError = useCallback((message = 'Authentication failed. Please log in again.') => {
    showNotification({
      type: 'auth',
      title: 'Authentication Required',
      message,
      actions: [
        {
          label: 'Go to Login',
          onClick: () => {
            hideNotification();
            window.location.href = '/login';
          },
          icon: User,
        },
      ],
    });
  }, [showNotification, hideNotification]);

  const showNetworkError = useCallback((error = null) => {
    showNotification({
      type: 'network',
      title: 'Connection Error',
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      details: error ? [
        'Make sure you\'re connected to the internet',
        'Try refreshing the page',
        'Check if the server is running',
        error.message || 'Unknown network error'
      ] : [
        'Make sure you\'re connected to the internet',
        'Try refreshing the page',
        'Check if the server is running'
      ],
      actions: [
        {
          label: 'Retry',
          onClick: () => {
            hideNotification();
            window.location.reload();
          },
          icon: Wifi,
        },
        {
          label: 'Cancel',
          onClick: hideNotification,
          variant: 'secondary',
        },
      ],
    });
  }, [showNotification, hideNotification]);

  const showResumeRequiredError = useCallback(() => {
    showNotification({
      type: 'validation',
      title: 'Resume Required',
      message: 'You need to upload a resume before applying to this job. Please update your profile first.',
      details: [
        'Go to your profile page',
        'Upload your resume in the "Resume" section',
        'Come back and apply for the job'
      ],
      actions: [
        {
          label: 'Go to Profile',
          onClick: () => {
            hideNotification();
            window.location.href = '/profile';
          },
          icon: User,
        },
        {
          label: 'Cancel',
          onClick: hideNotification,
          variant: 'secondary',
        },
      ],
    });
  }, [showNotification, hideNotification]);

  const showFileUploadError = useCallback((details = null) => {
    showNotification({
      type: 'error',
      title: 'File Upload Failed',
      message: 'There was a problem uploading your file. Please try again with a different file.',
      details: details || [
        'Check that your file is not too large (max 10MB)',
        'Supported formats: PDF, DOC, DOCX',
        'Make sure the file is not corrupted',
        'Try uploading a different file'
      ],
      actions: [
        {
          label: 'Try Again',
          onClick: hideNotification,
          icon: Upload,
        },
      ],
    });
  }, [showNotification, hideNotification]);

  const showValidationError = useCallback((title, errors) => {
    let details;
    let message;

    if (typeof errors === 'object' && errors !== null) {
      // Handle backend validation errors
      details = {};
      Object.entries(errors).forEach(([field, messages]) => {
        if (Array.isArray(messages)) {
          details[field] = messages.join(', ');
        } else {
          details[field] = messages;
        }
      });
      message = 'Please fix the following errors and try again:';
    } else if (Array.isArray(errors)) {
      details = errors;
      message = 'Please fix the following issues:';
    } else {
      message = errors || 'Please check your input and try again.';
      details = null;
    }

    showNotification({
      type: 'validation',
      title: title || 'Validation Error',
      message,
      details,
    });
  }, [showNotification]);

  const showPermissionError = useCallback((message = 'You don\'t have permission to perform this action.') => {
    showNotification({
      type: 'auth',
      title: 'Permission Denied',
      message,
      details: [
        'Contact your administrator if you believe this is an error',
        'Make sure you\'re logged in with the correct account',
        'Check if your session has expired'
      ],
      actions: [
        {
          label: 'Go to Login',
          onClick: () => {
            hideNotification();
            window.location.href = '/login';
          },
          icon: Shield,
        },
        {
          label: 'Contact Support',
          onClick: () => {
            hideNotification();
            window.location.href = '/admin/helpandsupport';
          },
          icon: ExternalLink,
          variant: 'secondary',
        },
      ],
    });
  }, [showNotification, hideNotification]);

  const showProfileIncompleteError = useCallback((missingFields = []) => {
    showNotification({
      type: 'warning',
      title: 'Profile Incomplete',
      message: 'Your profile needs to be completed before you can apply for jobs.',
      details: missingFields.length > 0 
        ? [`Please fill in the following fields: ${missingFields.join(', ')}`]
        : [
            'Make sure your personal information is complete',
            'Upload your resume',
            'Verify your contact information',
            'Add your academic details'
          ],
      actions: [
        {
          label: 'Complete Profile',
          onClick: () => {
            hideNotification();
            window.location.href = '/profile';
          },
          icon: User,
        },
        {
          label: 'Later',
          onClick: hideNotification,
          variant: 'secondary',
        },
      ],
    });
  }, [showNotification, hideNotification]);

  // Generic API error handler
  const handleApiError = useCallback((error, context = 'operation') => {
    if (error?.response?.status === 401) {
      showAuthError();
    } else if (error?.response?.status === 403) {
      showPermissionError();
    } else if (error?.response?.status >= 500) {
      showError(
        'Server Error',
        `A server error occurred while performing the ${context}. Please try again later.`,
        'If the problem persists, please contact support.'
      );
    } else if (!error?.response) {
      showNetworkError(error);
    } else {
      // Generic error
      const message = error?.response?.data?.detail || 
                     error?.response?.data?.message || 
                     error?.message || 
                     `Failed to complete ${context}. Please try again.`;
      
      showError('Error', message);
    }
  }, [showError, showAuthError, showPermissionError, showNetworkError]);

  const value = {
    // Core functions
    showNotification,
    hideNotification,
    
    // Basic types
    showError,
    showSuccess,
    showWarning,
    showInfo,
    
    // Specific error types
    showAuthError,
    showNetworkError,
    showResumeRequiredError,
    showFileUploadError,
    showValidationError,
    showPermissionError,
    showProfileIncompleteError,
    showApplicationSubmissionError,
    showMissingResumeModal,
    showProfileIncompleteModal,
    showSessionExpiredModal,
    showMaintenanceModal,
    
    // Generic handler
    handleApiError,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {notification && (
        <ErrorModal
          isOpen={true}
          onClose={hideNotification}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          details={notification.details}
          actions={notification.actions}
          dismissible={notification.dismissible !== false}
          autoClose={notification.autoClose}
          autoCloseDelay={notification.autoCloseDelay}
          showIcon={notification.showIcon !== false}
        />
      )}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider; 