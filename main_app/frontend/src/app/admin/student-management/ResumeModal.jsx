'use client';
import { useState, useRef, useEffect } from 'react';
import { FaTrash, FaFileAlt, FaTimesCircle, FaUpload, FaExternalLinkAlt, FaSpinner, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { studentsAPI } from '../../../api/students';

export default function ResumeModal({ isOpen, onClose, resume, onUpload, onDelete, studentId, isAdminMode = false }) {
  const [resumes, setResumes] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch resumes from backend when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchResumes();
    }
  }, [isOpen, studentId]);

  const fetchResumes = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated before proceeding
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('No authentication token found');
        setResumes([]);
        setLoading(false);
        return;
      }
      
      let resumesData = [];

      if (isAdminMode && studentId) {
        // Admin mode: fetch resumes for specific student
        try {
          console.log('Admin mode: Fetching resumes for student ID:', studentId);
          resumesData = await studentsAPI.adminGetResumes(studentId);
          console.log('Admin resumes fetched:', resumesData);

          if (!Array.isArray(resumesData)) {
            console.error('Invalid admin resume data format:', resumesData);
            resumesData = [];
          }
        } catch (adminError) {
          console.error('Failed to fetch admin resumes:', adminError);
          resumesData = [];
        }
      } else {
        // Student mode: fetch resumes for current user
        try {
          console.log('Student mode: Fetching user-specific resumes...');
          resumesData = await studentsAPI.getResumes();
          console.log('Student resumes fetched:', resumesData);

          // Verify we have user-specific data
          if (!Array.isArray(resumesData)) {
            console.error('Invalid resume data format:', resumesData);
            throw new Error('Invalid resume data format');
          }
        } catch (apiError) {
          console.log('New resumes API not available, falling back to profile data:', apiError);

          // Fallback: try to get resume from profile
          try {
            const profile = await studentsAPI.getProfile();
            console.log('User profile fetched for resume fallback:', profile?.id);

            if (profile?.resume || profile?.resume_url) {
              const resumeUrl = profile.resume_url || profile.resume;
              const fileName = resumeUrl.split('/').pop() || 'Resume.pdf';
              resumesData = [{
                id: profile.id || 1,
                name: fileName,
                resume_url: resumeUrl,
                uploaded_at: profile.updated_at || new Date().toISOString()
              }];
            }
          } catch (profileError) {
            console.error('Error fetching profile for resume:', profileError);
          }
        }
      }
      
      // Transform backend data to frontend format
      const transformedResumes = resumesData.map((resume, index) => ({
        id: resume.id || index + 1,
        name: resume.name || resume.file_name || resume.resume_url?.split('/').pop() || `Resume ${index + 1}`,
        date: resume.uploaded_at ? new Date(resume.uploaded_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }) : new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        url: resume.resume_url || resume.file_url || resume.url,
        status: 'success'
      }));
      
      console.log(`Displaying ${transformedResumes.length} resumes for current user`);
      setResumes(transformedResumes);
      
    } catch (error) {
      console.error('Error fetching resumes:', error);
      // Final fallback to using the resume prop if API fails
      if (resume) {
        const resumeArray = [];
        if (typeof resume === 'string' && resume.trim() !== '') {
          const fileNameParts = resume.split('/');
          const fileName = fileNameParts[fileNameParts.length - 1];
          
          resumeArray.push({
            id: 1,
            name: fileName || "Resume",
            date: new Date().toLocaleDateString('en-US', {
              month: 'short', 
              day: 'numeric', 
              year: 'numeric'
            }),
            url: resume,
            status: 'success'
          });
        }
        setResumes(resumeArray);
      } else {
        // Set empty array if no fallback data
        setResumes([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setUploading(true);
        
        // Verify file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          alert('File size exceeds 5MB limit. Please select a smaller file.');
          setUploading(false);
          return;
        }
        
        // Create a new resume object with initial "uploading" status
        const newResume = {
          id: Date.now(),
          name: file.name,
          date: new Date().toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          }),
          file: file,
          url: URL.createObjectURL(file), // Temporary URL for preview
          status: 'uploading',
          progress: 0
        };
        
        // Add the new resume to the existing list
        setResumes(prevResumes => [...prevResumes, newResume]);
        
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setResumes(prevResumes => prevResumes.map(r => 
            r.id === newResume.id ? {...r, progress: Math.min(r.progress + 25, 99)} : r
          ));
        }, 500);
        
        try {
          // Upload the file to the server
          await onUpload(file);
          
          // Clear interval and refresh the resumes list
          clearInterval(progressInterval);
          
          // Refresh resumes from backend
          await fetchResumes();
          
        } catch (error) {
          clearInterval(progressInterval);
          setResumes(prevResumes => prevResumes.map(r => 
            r.id === newResume.id ? {...r, status: 'error', progress: 0} : r
          ));
          throw error;
        }
        
        setUploading(false);
      } catch (error) {
        console.error('Error uploading resume:', error);
        setUploading(false);
        alert('Failed to upload resume. Please try again.');
      }
    }
  };

  const handleViewResume = (url) => {
    if (!url) {
      alert('Resume URL is not available');
      return;
    }
    
    // Special handling for different URL types
    if (url.startsWith('blob:')) {
      // Blob URLs should be used as is
      window.open(url, '_blank');
    } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Handle relative URLs by prepending the origin
      const fullUrl = `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
      window.open(fullUrl, '_blank');
    } else {
      // Absolute URLs can be used directly
      window.open(url, '_blank');
    }
  };

  const handleDelete = async (id) => {
    try {
      const resumeToDelete = resumes.find(r => r.id === id);
      
      // Remove from local state immediately for better UX
      setResumes(prevResumes => prevResumes.filter(resume => resume.id !== id));
      
      // Call backend delete if resume has a valid backend ID
      if (resumeToDelete && resumeToDelete.id && typeof resumeToDelete.id === 'number') {
        try {
          let result;
          if (isAdminMode && studentId) {
            // Use admin delete function
            result = await studentsAPI.adminDeleteResume(studentId, resumeToDelete.id);
          } else {
            // Use regular delete function
            result = await studentsAPI.deleteResume(resumeToDelete.id);
          }
          console.log('Resume deletion response:', result);
          
          // Even if the server returns an error, we'll keep the UI updated
          // The important thing is the user experience - they expect the file to be gone
          
          // Clear any local storage cache that might contain resume data
          if (typeof window !== 'undefined') {
            try {
              // Clear all resume-related data from localStorage
              const localStorageKeys = Object.keys(localStorage);
              const resumeKeys = localStorageKeys.filter(key => 
                key.includes('resume') || key.includes('file') || key.includes('document')
              );
              
              // Log the keys we're removing for debugging
              if (resumeKeys.length > 0) {
                console.log('Clearing resume-related localStorage items:', resumeKeys);
                resumeKeys.forEach(key => localStorage.removeItem(key));
              }
              
              // Also clear some specific caches that might be used
              localStorage.removeItem('resume_count');
              localStorage.removeItem('last_resume_update');
              
              // Update the user profile cache to remove the resume if applicable
              const profileCache = localStorage.getItem('user_profile');
              if (profileCache) {
                try {
                  const profile = JSON.parse(profileCache);
                  if (profile && profile.resume) {
                    profile.resume = null;
                    localStorage.setItem('user_profile', JSON.stringify(profile));
                  }
                } catch (e) {
                  // Ignore JSON parse errors
                }
              }
            } catch (e) {
              console.error('Error clearing localStorage:', e);
            }
          }
        } catch (error) {
          console.error('Backend delete failed, but UI is updated:', error);
        }
      }
      
      // Call the onDelete callback if provided
      if (typeof onDelete === 'function') {
        try {
          await onDelete(resumeToDelete);
        } catch (callbackError) {
          console.error('onDelete callback error:', callbackError);
        }
      }
      
      // Always force a refresh of the list regardless of success/failure
      // This ensures we're showing the correct state
      await fetchResumes();
      
    } catch (error) {
      console.error('Error in delete process:', error);
      // Refresh the list to ensure UI is in sync with backend
      await fetchResumes();
    }
  };

  // Helper to render resume status icon
  const renderStatusIcon = (resume) => {
    if (resume.status === 'uploading') {
      return (
        <div className="ml-2 text-blue-500">
          <FaSpinner className="animate-spin" />
        </div>
      );
    } else if (resume.status === 'success') {
      return (
        <div className="ml-2 text-green-500">
          <FaCheckCircle />
        </div>
      );
    } else if (resume.status === 'error') {
      return (
        <div className="ml-2 text-red-500">
          <FaExclamationCircle />
        </div>
      );
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl shadow-xl">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">My Resumes</h2>
            <p className="text-sm text-gray-500">Upload multiple resumes for different job types</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimesCircle size={24} />
          </button>
        </div>
        
        <div className="p-6 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <FaSpinner className="animate-spin text-blue-500 text-2xl mr-3" />
              <span className="text-gray-600">Loading resumes...</span>
            </div>
          ) : resumes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No resumes uploaded yet</p>
              <p className="text-sm mt-2">You can upload multiple resumes for different job applications</p>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-medium text-gray-700">Your Resumes ({resumes.length})</h3>
                <div className="text-sm text-gray-500">
                  {resumes.length > 1 ? "You can use different resumes for different applications" : ""}
                </div>
              </div>
              <div className="space-y-4">
                {resumes.map((resume) => (
                  <div 
                    key={resume.id} 
                    className="flex items-center justify-between bg-gray-50 p-4 rounded-lg"
                  >
                    <div 
                      className="flex items-center flex-grow cursor-pointer hover:bg-gray-100 p-2 rounded"
                      onClick={() => resume.status !== 'uploading' ? handleViewResume(resume.url) : null}
                    >
                      <div className="bg-blue-100 p-3 rounded-full mr-4">
                        <FaFileAlt className="text-blue-600" />
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center">
                          <h3 className="font-medium text-gray-800 mr-2">{resume.name}</h3>
                          {renderStatusIcon(resume)}
                          {resume.status !== 'uploading' && <FaExternalLinkAlt className="text-gray-500 text-xs ml-2" />}
                        </div>
                        <p className="text-sm text-gray-500">Uploaded on {resume.date}</p>
                        
                        {/* Progress bar for uploading resumes */}
                        {resume.status === 'uploading' && (
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                            <div 
                              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                              style={{ width: `${resume.progress}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(resume.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full ml-2"
                      aria-label="Delete resume"
                      disabled={resume.status === 'uploading'}
                    >
                      <FaTrash className={resume.status === 'uploading' ? 'opacity-50' : ''} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="border-t p-6 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">
              Supported formats: PDF, DOCX (max 5MB)
            </p>
            <p className="text-xs text-gray-400 mt-1">
              You can upload multiple resumes tailored to different positions
            </p>
          </div>
          <div>
            <input 
              type="file" 
              accept=".pdf,.docx" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleUpload}
              disabled={uploading}
            />
            <button 
              onClick={() => fileInputRef.current.click()}
              className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <FaSpinner className="mr-2 animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <FaUpload className="mr-2" /> Add Resume
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
          //     )}
          //   </button>
          // </div>

