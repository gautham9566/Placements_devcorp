'use client';

import React from 'react';
import { 
  X, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  Upload,
  User,
  Wifi,
  FileText,
  Shield,
  Clock,
  ExternalLink
} from 'lucide-react';

const ErrorModal = ({ 
  isOpen, 
  onClose, 
  type = 'error', 
  title, 
  message, 
  details,
  actions = [],
  dismissible = true,
  autoClose = false,
  autoCloseDelay = 5000,
  showIcon = true
}) => {
  React.useEffect(() => {
    if (autoClose && isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoClose, isOpen, autoCloseDelay, onClose]);

  // Prevent background scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getIconAndColors = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          buttonColor: 'bg-green-600 hover:bg-green-700'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
        };
      case 'info':
        return {
          icon: Info,
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          buttonColor: 'bg-blue-600 hover:bg-blue-700'
        };
      case 'network':
        return {
          icon: Wifi,
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          buttonColor: 'bg-red-600 hover:bg-red-700'
        };
      case 'auth':
        return {
          icon: Shield,
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          buttonColor: 'bg-red-600 hover:bg-red-700'
        };
      case 'validation':
        return {
          icon: AlertCircle,
          iconColor: 'text-orange-500',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          buttonColor: 'bg-orange-600 hover:bg-orange-700'
        };
      default: // error
        return {
          icon: AlertCircle,
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          buttonColor: 'bg-red-600 hover:bg-red-700'
        };
    }
  };

  const { icon: IconComponent, iconColor, bgColor, borderColor, buttonColor } = getIconAndColors();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border-2 ${borderColor}`}>
        {/* Header */}
        <div className={`${bgColor} px-6 py-4 rounded-t-lg border-b ${borderColor} flex items-center justify-between`}>
          <div className="flex items-center">
            {showIcon && (
              <IconComponent className={`w-6 h-6 ${iconColor} mr-3`} />
            )}
            <h3 className="text-lg font-semibold text-gray-900">
              {title}
            </h3>
          </div>
          {dismissible && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-gray-700 mb-4">
            {message}
          </p>
          
          {details && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-800 mb-2">Details:</h4>
              {typeof details === 'string' ? (
                <p className="text-sm text-gray-600">{details}</p>
              ) : Array.isArray(details) ? (
                <ul className="text-sm text-gray-600 space-y-1">
                  {details.map((detail, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {detail}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-gray-600">
                  {Object.entries(details).map(([key, value]) => (
                    <div key={key} className="mb-1">
                      <span className="font-medium">{key}:</span> {Array.isArray(value) ? value.join(', ') : value}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3 sm:justify-end">
          {actions.length > 0 ? (
            actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  action.variant === 'secondary'
                    ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    : action.variant === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : buttonColor + ' text-white'
                }`}
                disabled={action.disabled}
              >
                {action.loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                )}
                {action.icon && <action.icon className="w-4 h-4 mr-2 inline-block" />}
                {action.label}
              </button>
            ))
          ) : (
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg font-medium text-white transition-colors ${buttonColor}`}
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorModal; 