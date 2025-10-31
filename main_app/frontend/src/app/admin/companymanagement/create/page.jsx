'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building,
  MapPin,
  Users,
  Calendar,
  Star,
  Briefcase,
  Save,
  ArrowLeft,
  Info,
  CheckCircle,
  XCircle,
  Upload,
  Image,
  Loader,
  Link as LinkIcon
} from "lucide-react";

// Import API service
import { createCompany } from '../../../../api/companies';

export default function CreateCompany() {
  const router = useRouter();
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [companyImage, setCompanyImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  
  // Form state
  const [companyData, setCompanyData] = useState({
    name: '',
    industry: '',
    location: '',
    size: '',
    founded: '',
    website: '', // Add website field which is required by the backend
    tier: 'Tier 3', // Default to Tier 3
    description: '',
    campus_recruiting: false,
    total_active_jobs: 0,
    total_applicants: 0,
    total_hired: 0,
    awaited_approval: 0,
    logo: null
  });

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCompanyData({
      ...companyData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCompanyImage(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
        setCompanyData({
          ...companyData,
          logo: reader.result // In a real app, this would be a URL from your storage service
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // Remove uploaded image
  const removeImage = () => {
    setCompanyImage(null);
    setPreviewUrl('');
    setCompanyData({
      ...companyData,
      logo: ''
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!companyData.name.trim()) errors.name = 'Company name is required';
    if (!companyData.industry.trim()) errors.industry = 'Industry is required';
    if (!companyData.location.trim()) errors.location = 'Location is required';
    if (!companyData.size.trim()) errors.size = 'Company size is required';
    if (!companyData.founded.trim()) errors.founded = 'Founded year is required';
    if (!companyData.description.trim()) errors.description = 'Description is required';
    if (!companyData.website.trim()) errors.website = 'Website URL is required';
    else if (!isValidUrl(companyData.website)) errors.website = 'Please enter a valid URL (include http:// or https://)';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // URL validation helper
  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setIsSubmitting(true);
      
      try {
        // Prepare data for API
        const formattedData = {
          ...companyData,
          // Ensure numeric fields are sent as numbers
          total_active_jobs: Number(companyData.total_active_jobs),
          total_applicants: Number(companyData.total_applicants),
          total_hired: Number(companyData.total_hired),
          awaited_approval: Number(companyData.awaited_approval),
          // Convert campus_recruiting to boolean
          campus_recruiting: Boolean(companyData.campus_recruiting),
          // Send the file object for logo
          logo: companyImage
        };
        
        console.log('Submitting company data:', formattedData);
        
        // Submit to API
        const response = await createCompany(formattedData);
        
        console.log('API response:', response);
        setFormSubmitted(true);
        
        // Navigate back to the company management page after a short delay
        setTimeout(() => {
          router.push('/admin/companymanagement');
        }, 1500);
      } catch (error) {
        console.error('Error creating company:', error);
        
        // Handle API errors
        if (error.response?.data) {
          console.log('API error details:', error.response.data);
          setFormErrors(prev => ({
            ...prev,
            ...error.response.data,
            // Handle nested errors if they exist
            ...(error.response.data.non_field_errors ? 
              { api_error: error.response.data.non_field_errors.join(', ') } : {})
          }));
        } else {
          setFormErrors(prev => ({
            ...prev,
            api_error: 'Failed to create company. Please try again.'
          }));
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Go back to company management page
  const handleCancel = () => {
    router.push('/admin/companymanagement');
  };

  if (formSubmitted) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-md w-full">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Company Created!</h2>
            <p className="text-gray-600 text-center mb-6">
              The company profile has been successfully created.
            </p>
            <p className="text-sm text-gray-500">Redirecting back to company management...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="container mx-auto py-8 px-4 md:px-6">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button 
            onClick={handleCancel}
            className="mr-4 p-2 rounded-full hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Create New Company</h1>
        </div>
        
        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
          {/* Display API errors if any */}
          {formErrors.api_error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium">Error</h4>
                <p>{formErrors.api_error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company Logo/Image Upload */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Logo
                </label>
                <div className="flex items-center space-x-6">
                  {/* Preview Area */}
                  <div className={`w-24 h-24 rounded-lg flex items-center justify-center overflow-hidden ${
                    previewUrl ? 'border border-gray-200' : 'bg-gradient-to-br from-blue-500 to-purple-600'
                  }`}>
                    {previewUrl ? (
                      <img 
                        src={previewUrl} 
                        alt="Company logo preview" 
                        className="w-full h-full object-cover" 
                      />
                    ) : companyData.name ? (
                      <span className="text-white font-bold text-2xl">
                        {companyData.name.charAt(0)}
                      </span>
                    ) : (
                      <Image className="w-10 h-10 text-white opacity-70" />
                    )}
                  </div>
                  
                  {/* Upload Controls */}
                  <div className="flex flex-col">
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={triggerFileInput}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        {previewUrl ? 'Change Logo' : 'Upload Logo'}
                      </button>
                      
                      {previewUrl && (
                        <button
                          type="button"
                          onClick={removeImage}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg"
                        >
                          Remove
                        </button>
                      )}
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      Recommended: Square image, at least 200x200px (.jpg, .png)
                    </p>
                    <p className="text-xs text-gray-400">
                      If no logo is uploaded, the first letter of the company name will be used.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Company Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name*
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={companyData.name}
                    onChange={handleInputChange}
                    className={`pl-10 w-full rounded-lg border ${formErrors.name ? 'border-red-300' : 'border-gray-300'} py-3 px-4 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Enter company name"
                  />
                </div>
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                )}
              </div>
              
              {/* Industry */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Industry*
                </label>
                <select
                  name="industry"
                  value={companyData.industry}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border ${formErrors.industry ? 'border-red-300' : 'border-gray-300'} py-3 px-4 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="">Select Industry</option>
                  <option value="Technology">Technology</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Education">Education</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Retail">Retail</option>
                  <option value="Consulting">Consulting</option>
                  <option value="Media">Media</option>
                  <option value="Other">Other</option>
                </select>
                {formErrors.industry && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.industry}</p>
                )}
              </div>
              
              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location*
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="location"
                    value={companyData.location}
                    onChange={handleInputChange}
                    className={`pl-10 w-full rounded-lg border ${formErrors.location ? 'border-red-300' : 'border-gray-300'} py-3 px-4 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="e.g., New York, NY"
                  />
                </div>
                {formErrors.location && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.location}</p>
                )}
              </div>
              
              {/* Company Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Size*
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    name="size"
                    value={companyData.size}
                    onChange={handleInputChange}
                    className={`pl-10 w-full rounded-lg border ${formErrors.size ? 'border-red-300' : 'border-gray-300'} py-3 px-4 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    <option value="">Select Size</option>
                    <option value="1-10 employees">1-10 employees</option>
                    <option value="11-50 employees">11-50 employees</option>
                    <option value="51-200 employees">51-200 employees</option>
                    <option value="201-500 employees">201-500 employees</option>
                    <option value="501-1000 employees">501-1000 employees</option>
                    <option value="1001-5000 employees">1001-5000 employees</option>
                    <option value="5001+ employees">5001+ employees</option>
                  </select>
                </div>
                {formErrors.size && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.size}</p>
                )}
              </div>
              
              {/* Founded Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Founded Year*
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    name="founded"
                    min="1800"
                    max={new Date().getFullYear()}
                    value={companyData.founded}
                    onChange={handleInputChange}
                    className={`pl-10 w-full rounded-lg border ${formErrors.founded ? 'border-red-300' : 'border-gray-300'} py-3 px-4 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="e.g., 2010"
                  />
                </div>
                {formErrors.founded && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.founded}</p>
                )}
              </div>
              
              {/* Tier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tier
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Star className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    name="tier"
                    value={companyData.tier}
                    onChange={handleInputChange}
                    className="pl-10 w-full rounded-lg border border-gray-300 py-3 px-4 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Tier 1">Tier 1</option>
                    <option value="Tier 2">Tier 2</option>
                    <option value="Tier 3">Tier 3</option>
                  </select>
                </div>
              </div>
              
              {/* Campus Recruiting */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="campus_recruiting"
                  name="campus_recruiting"
                  checked={companyData.campus_recruiting}
                  onChange={handleInputChange}
                  className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="campus_recruiting" className="text-sm font-medium text-gray-700">
                  Campus Recruiting Program
                </label>
              </div>
              
              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description*
                </label>
                <textarea
                  name="description"
                  value={companyData.description}
                  onChange={handleInputChange}
                  rows="4"
                  className={`w-full rounded-lg border ${formErrors.description ? 'border-red-300' : 'border-gray-300'} py-3 px-4 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Enter a description of the company..."
                ></textarea>
                {formErrors.description && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
                )}
              </div>

              {/* Website URL - add this field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website URL*
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="url"
                    name="website"
                    value={companyData.website}
                    onChange={handleInputChange}
                    className={`pl-10 w-full rounded-lg border ${formErrors.website ? 'border-red-300' : 'border-gray-300'} py-3 px-4 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="https://example.com"
                  />
                </div>
                {formErrors.website && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.website}</p>
                )}
              </div>
            </div>
            
            {/* Form Actions */}
            <div className="mt-8 flex flex-col md:flex-row gap-4 md:gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 font-medium"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 rounded-lg text-white hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Create Company
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        
        {/* Information Note */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-800">Important Note</h4>
            <p className="text-sm text-blue-600">
              In a production environment, this would submit to an API endpoint. Currently, this demo adds the company to the local data store.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
