import axios, { AxiosError } from 'axios';

interface ErrorResponse {
  message?: string;
  error?: string;
  details?: any;
}

export const handleApiError = (error: unknown): { message: string; details?: any } => {
  console.group('API Error Details');
  
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ErrorResponse>;
    console.error('Request URL:', axiosError.config?.url);
    console.error('Request Method:', axiosError.config?.method?.toUpperCase());
    console.error('Status:', axiosError.response?.status);
    console.error('Status Text:', axiosError.response?.statusText);
    console.error('Response Data:', axiosError.response?.data);
    console.error('Request Headers:', axiosError.config?.headers);
    console.error('Request Data:', axiosError.config?.data);
    
    const errorMessage = axiosError.response?.data?.message 
      || axiosError.response?.data?.error 
      || axiosError.message 
      || 'An unexpected error occurred';
      
    console.error('Error Message:', errorMessage);
    console.groupEnd();
    
    return {
      message: errorMessage,
      details: axiosError.response?.data
    };
  }

  if (error instanceof Error) {
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Stack Trace:', error.stack);
    console.groupEnd();
    
    return {
      message: error.message,
      details: { stack: error.stack }
    };
  }

  console.error('Unknown Error:', error);
  console.groupEnd();
  
  return {
    message: 'An unexpected error occurred',
    details: error
  };
}; 