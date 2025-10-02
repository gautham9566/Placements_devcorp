'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FaFileAlt, FaBuilding, FaMapMarkerAlt, FaPhoneAlt, FaUser, FaSpinner } from 'react-icons/fa';
import ResumeModal from './ResumeModal';
import DocumentsModal from './DocumentsModal';
import { studentsAPI } from '../../api/students';
import { useNotification } from '../../contexts/NotificationContext';
import { validateFile } from '../../utils/fileValidation';

export default function ProfilePage() {
  const { handleApiError, showFileUploadError } = useNotification();
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [semesterMarksheets, setSemesterMarksheets] = useState([]);
  const [resumeCount, setResumeCount] = useState(0);
  const [lastResumeUpdate, setLastResumeUpdate] = useState(null);
  const [companyStats, setCompanyStats] = useState({
    totalListings: 0,
    eligibleJobs: 0,
    loading: true
  });
  
  useEffect(() => {
    async function fetchProfileData() {
      try {
        setLoading(true);
        const profileData = await studentsAPI.getProfile();
        setProfile(profileData);
        
        // Fetch semester marksheets
        const marksheets = await studentsAPI.getSemesterMarksheets();
        setSemesterMarksheets(marksheets);
        
        // Fetch resume count
        await fetchResumeCount();
        
        // Fetch company stats
        fetchCompanyStats();
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching profile:', err);
        handleApiError(err, 'loading profile');
        setError('Failed to load profile data. Please try again later.');
        setLoading(false);
      }
    }
    
    fetchProfileData();
  }, []);
  
  // Function to fetch resume count
  const fetchResumeCount = async () => {
    try {
      const resumes = await studentsAPI.getResumes();
      setResumeCount(resumes.length);
      if (resumes.length > 0) {
        // Get the most recent upload date
        const mostRecent = resumes.reduce((latest, resume) => {
          const resumeDate = new Date(resume.uploaded_at || resume.created_at);
          const latestDate = new Date(latest);
          return resumeDate > latestDate ? resume.uploaded_at || resume.created_at : latest;
        }, resumes[0].uploaded_at || resumes[0].created_at);
        setLastResumeUpdate(mostRecent);
      }
    } catch (err) {
      console.error('Error fetching resumes:', err);
      // Fallback to profile resume if available
      if (profile?.resume) {
        setResumeCount(1);
        setLastResumeUpdate(profile.updated_at);
      }
    }
  };

  // Function to fetch company statistics
  const fetchCompanyStats = async () => {
    try {
      // Import and use API functions from companies.js
      const { getCompanyStats, fetchCompanies } = await import('../../api/companies');
      
      // Get stats if available
      let stats;
      try {
        const statsResponse = await getCompanyStats();
        stats = statsResponse.data || statsResponse;
      } catch (error) {
        console.log('Could not fetch company stats, calculating from companies data');
        // Fetch all companies to get total count
        const companies = await fetchCompanies();
        stats = {
          total: companies.length,
          active_jobs: companies.reduce((sum, company) => sum + (company.totalActiveJobs || 0), 0)
        };
      }
      
      // Calculate eligible jobs based on profile criteria (e.g., CGPA requirements)
      const eligibleJobsCount = calculateEligibleJobs(stats, profile);
      
      setCompanyStats({
        totalListings: stats.total || 0,
        eligibleJobs: eligibleJobsCount,
        loading: false
      });
      
    } catch (error) {
      console.error('Error fetching company stats:', error);
      setCompanyStats({
        totalListings: 0,
        eligibleJobs: 0,
        loading: false
      });
    }
  };
  
  // Helper function to calculate eligible jobs based on profile
  const calculateEligibleJobs = (companies, profile) => {
    if (!companies || !profile) return 0;
    
    // Get user's CGPA for comparison
    const userCgpa = parseFloat(getOverallCGPA());
    
    // Get user's branch/major for matching
    const userBranch = profile.branch;
    
    // Count jobs that match the user's criteria
    let eligibleCount = 0;
    
    // For each company, check eligibility
    companies.forEach(company => {
      // In a real implementation, we would check each job's requirements
      // For now, use a simple heuristic based on company tier
      const companyJobCount = company.totalActiveJobs || 0;
      let eligibilityPercent = 0;
      
      // Very basic eligibility logic (would be replaced with actual requirements)
      if (userCgpa >= 8.5) {
        eligibilityPercent = 0.9; // 90% of jobs eligible for high CGPA students
      } else if (userCgpa >= 7.5) {
        eligibilityPercent = 0.75; // 75% eligible for good CGPA students
      } else if (userCgpa >= 6.5) {
        eligibilityPercent = 0.5; // 50% eligible for average CGPA students
      } else {
        eligibilityPercent = 0.25; // 25% eligible for below average CGPA students
      }
      
      // Add to eligible count
      eligibleCount += Math.floor(companyJobCount * eligibilityPercent);
    });
    
    return eligibleCount;
  };

  // Function to handle profile image upload
  const handleProfileImageUpload = async (file) => {
    // Validate file first
    const validation = validateFile(file, 'profile_image');
    if (!validation.isValid) {
      showFileUploadError(validation.errors);
      return;
    }

    try {
      await studentsAPI.uploadProfileImage(file);
      // Refresh profile data
      const profileData = await studentsAPI.getProfile();
      setProfile(profileData);
    } catch (err) {
      console.error('Error uploading profile image:', err);
      showFileUploadError([
        'Failed to upload profile image',
        'Please check the file format and size',
        'Supported formats: JPG, PNG, GIF (max 2MB)'
      ]);
    }
  };

  // Function to handle resume upload
  const handleResumeUpload = async (file) => {
    // Validate file first
    const validation = validateFile(file, 'resume');
    if (!validation.isValid) {
      showFileUploadError(validation.errors);
      return;
    }

    try {
      // Use the new resume upload API
      await studentsAPI.uploadResume(file, file.name, false);
      // Refresh resume count after upload
      await fetchResumeCount();
    } catch (err) {
      console.error('Error uploading resume:', err);
      showFileUploadError([
        'Failed to upload resume',
        'Please check the file format and size',
        'Supported formats: PDF, DOC, DOCX (max 5MB)'
      ]);
    }
  };

  // Function to handle resume delete
  const handleResumeDelete = async (resume) => {
    try {
      // Clear any cached resume data
      if (typeof window !== 'undefined' && resume?.id) {
        localStorage.removeItem(`resume_${resume.id}`);
        localStorage.removeItem('resume_count');
        localStorage.removeItem('last_resume_update');
      }
      
      // Force refresh resume count
      await fetchResumeCount();
      
      // If we were displaying a specific resume that was deleted, clear it
      if (resume?.url === profile?.resume) {
        const updatedProfile = { ...profile, resume: null };
        setProfile(updatedProfile);
      }
    } catch (error) {
      console.error('Error handling resume deletion:', error);
    }
  };

  // Get overall CGPA from database
  const getOverallCGPA = () => {
    return profile?.gpa || '0.00';
  };
  
  // Calculate percentage from CGPA (approximation)
  const calculatePercentage = (cgpa) => {
    if (!cgpa || cgpa === '-') return '-';
    return (parseFloat(cgpa) * 9.5).toFixed(2) + '%';
  };

  // Helper function to check if a document actually exists
  const isValidDocument = (document) => {
    return document &&
           typeof document === 'string' &&
           document.trim() !== '' &&
           document !== 'null' &&
           document !== 'undefined';
  };

  // Calculate actual document count
  const getDocumentCount = () => {
    const tenthCount = isValidDocument(profile?.tenth_certificate) ? 1 : 0;
    const twelfthCount = isValidDocument(profile?.twelfth_certificate) ? 1 : 0;
    const semesterCount = semesterMarksheets ?
      semesterMarksheets.filter(sheet => sheet && isValidDocument(sheet.marksheet_url)).length : 0;

    return tenthCount + twelfthCount + semesterCount;
  };
  
  // Get semester CGPA value
  const getSemesterCGPA = (semNumber) => {
    if (!profile) return '-';
    const semesterCGPA = profile[`semester${semNumber}_cgpa`];
    return semesterCGPA || '-';
  };
  
  // Get semester marksheets sorted by semester number
  const getSortedSemesterMarksheets = () => {
    if (!semesterMarksheets) return [];
    return [...semesterMarksheets].sort((a, b) => a.semester - b.semester);
  };
  
  // Format date to display period (e.g., "Sep 2021 - Aug 2025")
  const formatEducationPeriod = (startYear, endYear) => {
    if (!startYear || !endYear) return '-';
    return `${startYear} - ${endYear}`;
  };
  
  // Function to display either the profile image or a fallback with initial
  const renderProfileImage = () => {
    if (loading) {
      return (
        <div className="w-50 h-50 bg-blue-100 flex items-center justify-center rounded-lg mb-4">
          <FaSpinner className="animate-spin text-blue-500 text-2xl" />
        </div>
      );
    }
    
    if (profile?.profile_image_url) {
      return (
        <div className="w-50 h-50 bg-blue-100 object-center text-center rounded-lg mb-4 relative mx-auto">
          <Image 
            src={profile.profile_image_url} 
            alt={`${profile.first_name} ${profile.last_name}`} 
            fill 
            className="rounded-lg object-cover"
          />
        </div>
      );
    }
    
    // Fallback to initial
    return (
      <div className="w-50 h-50 bg-blue-500 text-white flex items-center justify-center rounded-lg mb-4 mx-auto">
        <span className="text-3xl font-bold">
          {profile?.initial || (profile?.first_name ? profile.first_name[0].toUpperCase() : 'S')}
        </span>
      </div>
    );
  };
  
  // Display loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <FaSpinner className="animate-spin text-blue-500 text-4xl mr-3" />
        <span className="text-xl text-gray-700">Loading profile...</span>
      </div>
    );
  }
  
  // Display error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-8xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Student Information (Smaller) */}
        <div className="lg:col-span-3 bg-white rounded-lg p-5 shadow-sm h-fit content-card profile-container">
          <div className="flex justify-between">
            {renderProfileImage()}
          </div>
          
          <h1 className="text-xl font-bold text-center mt-2 text-gray-800">
            {profile?.first_name && profile?.last_name 
              ? `${profile.first_name} ${profile.last_name}` 
              : '-'}
          </h1>
          
          <div className="mt-4 space-y-3 text-md">
            <div className="flex">
              <p className="text-gray-500 w-20">Student ID</p>
              <p className="font-medium text-gray-800">: {profile?.student_id || '-'}</p>
            </div>
            <div className="flex">
              <p className="text-gray-500 w-20">Major</p>
              <p className="font-medium text-gray-800">: {profile?.branch || '-'}</p>
            </div>
            <div className="flex">
              <p className="text-gray-500 w-20">Passed Out</p>
              <p className="font-medium text-gray-800">: {profile?.passout_year || '-'}</p>
            </div>
            <div className="flex">
              <p className="text-gray-500 w-20">Gender</p>
              <p className="font-medium text-gray-800">: {profile?.gender || '-'}</p>
            </div>
            <div className="flex">
              <p className="text-gray-500 w-20">Birthday</p>
              <p className="font-medium text-gray-800">: {profile?.date_of_birth || '-'}</p>
            </div>
            <div className="flex">
              <p className="text-gray-500 w-20">Phone</p>
              <p className="font-medium text-gray-800">: {profile?.phone || '-'}</p>
            </div>
            <div className="flex">
              <p className="text-gray-500 w-20">Email</p>
              <p className="font-medium text-gray-800">: {profile?.contact_email || profile?.user?.email || '-'}</p>
            </div>
            <div className="flex">
              <p className="text-gray-500 w-20">Campus</p>
              <p className="font-medium text-gray-800">: {profile?.college_name || '-'}</p>
            </div>
            <div className="flex">
              <p className="text-gray-500 w-20">Placement</p>
              <p className="font-medium text-gray-800">: {profile?.joining_year && profile?.passout_year 
                ? `${profile.joining_year}-${profile.passout_year}` 
                : '-'}
              </p>
            </div>
          </div>
          {/* Skills Section */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const skills = profile?.skills || selectedStudent?.skills;

                if (Array.isArray(skills) && skills.length > 0) {
                  return skills.map((skill, index) => (
                    <span 
                      key={index} 
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ));
                } else if (typeof skills === 'string' && skills.trim()) {
                  return skills.split(',').map((skill, index) => (
                    <span 
                      key={index} 
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                    >
                      {skill.trim()}
                    </span>
                  ));
                } else {
                  return <p className="text-gray-600">No skills listed</p>;
                }
              })()}
            </div>
        
          </div>
        </div>

        {/* Middle Column - Academic Details (Expanded) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Combined Academic Details */}
          <div className="bg-white rounded-lg p-5 shadow-sm content-card">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">Academic</h2>
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center">
                  <h3 className="text-lg font-semibold text-gray-800">Semester Wise score</h3>
                  <div className="bg-blue-50 inline-flex items-center px-3 py-1 rounded-full ml-3">
                    <span className="text-blue-600 font-medium">{getOverallCGPA()}</span>
                    <span className="text-sm text-gray-500 ml-1">CGPA</span>
                    <span className="text-blue-600 ml-2">{calculatePercentage(getOverallCGPA())}</span>
                  </div>
                </div>
                <div className="text-lg font-semibold text-gray-800">
                  {formatEducationPeriod(profile?.joining_year, profile?.passout_year)}
                </div>
              </div>
            {/* Current Semester Scores */}
            <div className="mb-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700">Sem</th>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                        <th key={sem} className="border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700">{sem}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700">Cgpa</td>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                        <td key={sem} className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                          {getSemesterCGPA(sem)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <hr className="my-6" />

            {/* Class XII */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center">
                  <h3 className="text-lg font-semibold text-gray-800">Class XII</h3>
                  <div className="bg-blue-50 inline-flex items-center px-3 py-1 rounded-full ml-3">
                    <span className="text-blue-600 font-medium">{profile?.twelfth_cgpa || '-'}</span>
                    <span className="text-sm text-gray-500 ml-1">CGPA</span>
                    <span className="text-blue-600 ml-2">{profile?.twelfth_percentage || '-'}</span>
                  </div>
                </div>
                <div className="text-lg font-semibold text-gray-800">
                  {profile?.twelfth_year_of_passing 
                    ? `${parseInt(profile.twelfth_year_of_passing) - 2} - ${profile.twelfth_year_of_passing}` 
                    : '-'}
                </div>
              </div>
              <div className="flex justify-between items-start mb-2">
                <div className="grid grid-cols-2 gap-6 w-full">
                  <div className="space-y-3">
                    <div className="flex">
                      <p className="text-gray-500 text-sm w-[120px]">College :</p>
                      <p className="text-gray-700 font-medium">{profile?.twelfth_school || '-'}</p>
                    </div>
                    <div className="flex">
                      <p className="text-gray-500 text-sm w-[120px]">Board :</p>
                      <p className="text-gray-700 font-medium">{profile?.twelfth_board || '-'}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex">
                      <p className="text-gray-500 text-sm w-[120px]">Location :</p>
                      <p className="text-gray-700 font-medium">{profile?.city || '-'}</p>
                    </div>
                    <div className="flex">
                      <p className="text-gray-500 text-sm w-[120px]">Specialization :</p>
                      <p className="text-gray-700 font-medium">{profile?.twelfth_specialization || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
              
             
              
              

            <hr className="my-6" />

            {/* Class X */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center">
                  <h3 className="text-lg font-semibold text-gray-800">Class X</h3>
                  <div className="bg-blue-50 inline-flex items-center px-3 py-1 rounded-full ml-3">
                    <span className="text-blue-600 font-medium">{profile?.tenth_cgpa || '-'}</span>
                    <span className="text-sm text-gray-500 ml-1">CGPA</span>
                    <span className="text-blue-600 ml-2">{profile?.tenth_percentage || '-'}</span>
                  </div>
                </div>
                <div className="text-lg font-semibold text-gray-800">
                  {profile?.tenth_year_of_passing 
                    ? `${parseInt(profile.tenth_year_of_passing) - 1} - ${profile.tenth_year_of_passing}` 
                    : '-'}
                </div>
              </div>
              
              <div className="flex justify-between items-start mb-2">
                <div className="grid grid-cols-2 gap-6 w-full">
                  <div className="space-y-3">
                    <div className="flex">
                      <p className="text-gray-500 text-sm w-[120px]">School :</p>
                      <p className="text-gray-700 font-medium">{profile?.tenth_school || '-'}</p>
                    </div>
                    <div className="flex">
                      <p className="text-gray-500 text-sm w-[120px]">Board :</p>
                      <p className="text-gray-700 font-medium">{profile?.tenth_board || '-'}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex">
                      <p className="text-gray-500 text-sm w-[120px]">Location :</p>
                      <p className="text-gray-700 font-medium">{profile?.city || '-'}</p>
                    </div>
                    <div className="flex">
                      <p className="text-gray-500 text-sm w-[120px]">Specialization :</p>
                      <p className="text-gray-700 font-medium">-</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Companies Section */}
          <div className="bg-white rounded-lg p-5 shadow-sm content-card">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Companies</h2>
              
            {companyStats.loading ? (
              <div className="flex items-center justify-center py-4">
                <FaSpinner className="animate-spin text-blue-500 text-xl mr-2" />
                <span className="text-gray-600">Loading company data...</span>
              </div>
            ) : (
              <>
                {/* Total Listings */}
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-500 text-sm">Total Listings</p>
                    <p className="text-lg font-semibold text-gray-700">{companyStats.totalListings}</p>
                  </div>
                </div>
                  
                {/* Eligible Jobs */}
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-500 text-sm">Eligible Jobs</p>
                    <p className="text-lg font-semibold text-gray-700">{companyStats.eligibleJobs}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column - Stats and Files */}
        <div className="lg:col-span-3 space-y-6">
          {/* Arrears Section */}
          <div className="bg-white rounded-lg p-5 shadow-sm content-card">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Academic Status</h2>

            {/* Active Arrears */}
            <div className="flex items-center p-2 mb-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-3 ${
                (profile?.active_arrears || 0) > 0 ? 'bg-red-100' : 'bg-green-100'
              }`}>
                <div className={`${
                  (profile?.active_arrears || 0) > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="font-medium text-gray-700">Active Arrears</h3>
                <p className="text-sm text-gray-500">
                  {(profile?.active_arrears || 0) > 0
                    ? `${profile.active_arrears} subject${profile.active_arrears > 1 ? 's' : ''} currently pending`
                    : 'No active arrears'
                  }
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full ${
                (profile?.active_arrears || 0) > 0 ? 'bg-red-50' : 'bg-green-50'
              }`}>
                <span className={`font-medium ${
                  (profile?.active_arrears || 0) > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {profile?.active_arrears || 0}
                </span>
              </div>
            </div>

            {/* Arrears History */}
            {(profile?.arrears_history > 0) && (
              <div>
                <div className="flex items-center p-2">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <div className="text-blue-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-medium text-gray-700">Arrears History</h4>
                    <p className="text-sm text-gray-500">
                      {profile.arrears_history} subject{profile.arrears_history > 1 ? 's' : ''} previously had arrears
                    </p>
                  </div>
                  <div className="bg-blue-50 px-3 py-1 rounded-full">
                    <span className="text-blue-600 font-medium">{profile.arrears_history}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Total Arrears Summary */}
            {/* <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Total Arrears</span>
                <span className="font-medium text-gray-800">{profile?.arrears || 0}</span>
              </div>
            </div> */}
          </div>

          {/* Files Section */}
          <div className="bg-white rounded-lg p-5 shadow-sm content-card">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">My Files</h2>
            
            <div 
              className="flex items-center p-2 mb-3 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => setIsResumeModalOpen(true)}
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <div className="text-blue-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="font-medium text-gray-700">Resumes</h3>
                <p className="text-sm text-gray-500">
                  {resumeCount > 0 
                    ? `${resumeCount} resume${resumeCount > 1 ? 's' : ''} uploaded` + 
                      (lastResumeUpdate ? ` • Last updated ${new Date(lastResumeUpdate).toLocaleDateString()}` : '')
                    : 'No resumes uploaded'
                  }
                </p>
              </div>
              <div className="bg-green-50 px-3 py-1 rounded-full">
                <span className="text-green-600 font-medium">{resumeCount}</span>
              </div>
            </div>
            
            <div 
              className="flex items-center p-2 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => setIsDocumentsModalOpen(true)}
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <div className="text-blue-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="font-medium text-gray-700">Documents</h3>
                <p className="text-sm text-gray-500">Academic certificates and marksheets</p>
              </div>
              <div className="bg-green-50 px-3 py-1 rounded-full">
                <span className="text-green-600 font-medium">
                  {getDocumentCount()}
                </span>
              </div>
            </div>
          </div>
          
          {/* Address Section */}
          <div className="bg-white rounded-lg p-5 shadow-sm content-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">CURRENT ADDRESS</h2>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex">
                <p className="text-gray-500 w-20">City</p>
                <p className="font-medium text-gray-700">: {profile?.city || '-'}</p>
              </div>
              <div className="flex">
                <p className="text-gray-500 w-20">District</p>
                <p className="font-medium text-gray-700">: {profile?.district || '-'}</p>
              </div>
              <div className="flex">
                <p className="text-gray-500 w-20">State</p>
                <p className="font-medium text-gray-700">: {profile?.state || '-'}</p>
              </div>
              <div className="flex">
                <p className="text-gray-500 w-20">Pin Code</p>
                <p className="font-medium text-gray-700">: {profile?.pincode || '-'}</p>
              </div>
              <div className="flex">
                <p className="text-gray-500 w-20">Country</p>
                <p className="font-medium text-gray-700">: {profile?.country || '-'}</p>
              </div>
              <div className="flex">
                <p className="text-gray-500 w-20">Address</p>
                <p className="font-medium text-gray-700">: {profile?.address || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Resume Modal */}
      <ResumeModal 
        isOpen={isResumeModalOpen} 
        onClose={() => setIsResumeModalOpen(false)}
        resume={profile?.resume_url || profile?.resume}
        onUpload={handleResumeUpload}
        onDelete={handleResumeDelete}
      />

      {/* Documents Modal */}
      <DocumentsModal
        isOpen={isDocumentsModalOpen}
        onClose={() => setIsDocumentsModalOpen(false)}
        documents={{
          tenth: profile?.tenth_certificate_url || profile?.tenth_certificate,
          twelfth: profile?.twelfth_certificate_url || profile?.twelfth_certificate,
          semesterMarksheets: semesterMarksheets
        }}
        onUploadCertificate={studentsAPI.uploadCertificate}
        onUploadMarksheet={studentsAPI.uploadSemesterMarksheet}
        onDeleteCertificate={studentsAPI.deleteCertificate}
        onDeleteMarksheet={studentsAPI.deleteMarksheet}
      />
    </div>
  );
}


