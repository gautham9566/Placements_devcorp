'use client';

import React, { useState, useRef, useEffect } from 'react';
import { studentsAPI } from '../../../api/students';

function PhotoBox({ name }) {
  const [image, setImage] = useState('/images/default-avatar.png');
  const [isEditing, setIsEditing] = useState(false);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef(null);

  const handleEditClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target.result);
        setIsEditing(true);
        setImageError(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoSave = () => { 
    setIsEditing(false);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // Get first letter of name for fallback
  const getInitial = () => {
    return name && name.length > 0 ? name.charAt(0).toUpperCase() : '?';
  };

  return (
    <div className="mb-6">
      <div className="flex flex-col items-center bg-white rounded-2xl p-6 shadow-sm content-card profile-container">
        {!imageError ? (
          <img 
            src={image} 
            alt="Profile" 
            className="w-32 h-48 object-cover border-2 border-gray-100 rounded-lg"
            onError={handleImageError}
          />
        ) : (
          <div className="w-32 h-48 flex items-center justify-center bg-blue-100 text-blue-600 font-bold text-5xl rounded-lg border-2 border-gray-100">
            {getInitial()}
          </div>
        )}
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleEditClick}
            className="text-sm px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Edit
          </button>
          {isEditing && (
            <button
              onClick={handlePhotoSave} 
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
          )}
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>
    </div>
  );
}

function StudentProfilePage() {
  // Simplified state for basic profile info
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    fullName: '',
    role: ''
  });

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  // Fetch user profile on mount
  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setProfileError('');
      try {
        const profile = await studentsAPI.getProfile();
        // Get role from localStorage
        const userRole = localStorage.getItem('role') || '';
        
        setFormData({
          email: profile.user?.email || profile.email || '',
          phone: profile.phone || profile.contact_email || '',
          fullName: [profile.first_name, profile.last_name].filter(Boolean).join(' '),
          role: userRole
        });
      } catch (err) {
        setProfileError('Failed to load profile data.');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  return (
    <div className="flex-1 bg-white rounded-2xl p-6 shadow-sm content-card profile-container">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-medium text-black">Profile Information</h3>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : profileError ? (
        <div className="text-red-500">{profileError}</div>
      ) : (
        <div className="flex flex-col md:flex-row gap-6">
          <PhotoBox name={formData.fullName} />
          
          <div className="space-y-4 flex-1">
            <div className="border-b pb-4">
              <h4 className="text-lg font-medium text-black mb-4">Basic Information</h4>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <div className="p-2 bg-gray-50 rounded-lg text-black">{formData.fullName}</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Role</label>
                  <div className="p-2 bg-gray-50 rounded-lg text-black capitalize">
                    {formData.role?.toLowerCase() || 'N/A'}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="p-2 bg-gray-50 rounded-lg text-black">{formData.email}</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <div className="p-2 bg-gray-50 rounded-lg text-black">{formData.phone || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentProfilePage;