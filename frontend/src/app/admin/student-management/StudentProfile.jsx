'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ArrowLeft, Edit, Save, X, Lock, Unlock } from 'lucide-react';
import { FaFileAlt, FaBuilding, FaMapMarkerAlt, FaPhoneAlt, FaUser, FaSpinner } from 'react-icons/fa';
import { studentsAPI } from '../../../api/students';
import DocumentsModal from './DocumentsModal';
import ResumeModal from './ResumeModal';
import FreezeModal from './FreezeModal';

export default function StudentProfile({
  selectedStudent,
  editedStudent,
  isEditing,
  handleBackToList,
  handleEdit,
  handleSave,
  handleCancel,
  handleInputChange,
  departmentOptions
}) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [semesterMarksheets, setSemesterMarksheets] = useState([]);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isFreezeModalOpen, setIsFreezeModalOpen] = useState(false);
  const [companyStats, setCompanyStats] = useState({
    loading: false,
    totalListings: 0,
    eligibleJobs: 0
  });
  const [resumeCount, setResumeCount] = useState(0);
  const [lastResumeUpdate, setLastResumeUpdate] = useState(null);
  const [freezeStatus, setFreezeStatus] = useState('none');
  const [freezeData, setFreezeData] = useState(null);

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

  // Use selectedStudent as the profile data, but allow fetching more details if needed
  useEffect(() => {
    if (selectedStudent) {
      setProfile(selectedStudent);

      // Optionally fetch additional details if needed
      fetchAdditionalDetails(selectedStudent.id);

      // Fetch company statistics
      fetchCompanyStats(selectedStudent.id);

      // Fetch resume information
      fetchResumeInfo(selectedStudent.id);

      // Fetch freeze status
      fetchFreezeStatus(selectedStudent.id);
    }
  }, [selectedStudent]);
  
  // Fetch additional details if needed
  const fetchAdditionalDetails = async (studentId) => {
    if (!studentId) return;

    try {
      setLoading(true);
      // Fetch detailed student profile including semester marksheets
      const details = await studentsAPI.getStudent(studentId);
      if (details) {
        // Update the main profile with fresh data (including certificate URLs)
        setProfile(details);

        // Update semester marksheets
        if (details.semester_marksheets) {
          setSemesterMarksheets(details.semester_marksheets);
        }
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching student details:', err);
      setLoading(false);
    }
  };

  // Fetch company statistics for the student
  const fetchCompanyStats = async (studentId) => {
    if (!studentId) return;

    try {
      setCompanyStats(prev => ({ ...prev, loading: true }));

      // Mock implementation - replace with actual API call
      // const stats = await studentsAPI.getStudentCompanyStats(studentId);

      // For now, provide mock data
      const mockStats = {
        loading: false,
        totalListings: 25,
        eligibleJobs: 18
      };

      setCompanyStats(mockStats);
    } catch (err) {
      console.error('Error fetching company stats:', err);
      setCompanyStats({
        loading: false,
        totalListings: 0,
        eligibleJobs: 0
      });
    }
  };

  // Fetch resume information for the student
  const fetchResumeInfo = async (studentId) => {
    if (!studentId) return;

    try {
      // Get actual resume data from API
      const resumesData = await studentsAPI.adminGetResumes(studentId);

      if (Array.isArray(resumesData)) {
        setResumeCount(resumesData.length);

        // Find the most recent upload date
        if (resumesData.length > 0) {
          const latestResume = resumesData.reduce((latest, current) => {
            const currentDate = new Date(current.uploaded_at);
            const latestDate = new Date(latest.uploaded_at);
            return currentDate > latestDate ? current : latest;
          });
          setLastResumeUpdate(latestResume.uploaded_at);
        } else {
          setLastResumeUpdate(null);
        }
      } else {
        setResumeCount(0);
        setLastResumeUpdate(null);
      }
    } catch (err) {
      console.error('Error fetching resume info:', err);
      setResumeCount(0);
      setLastResumeUpdate(null);
    }
  };

  // Fetch freeze status for the student
  const fetchFreezeStatus = async (studentId) => {
    if (!studentId) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/accounts/students/${studentId}/freeze/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFreezeStatus(data.freeze_status);
        setFreezeData(data);
      } else {
        setFreezeStatus('none');
        setFreezeData(null);
      }
    } catch (err) {
      console.error('Error fetching freeze status:', err);
      setFreezeStatus('none');
      setFreezeData(null);
    }
  };
  
  // Get overall CGPA from database
  const getOverallCGPA = () => {
    return editedStudent?.gpa || profile?.gpa || 'N/A';
  };
  
  // Calculate percentage from CGPA (approximation)
  const calculatePercentage = (cgpa) => {
    if (!cgpa || cgpa === 'N/A') return '';
    const numericCgpa = parseFloat(cgpa);
    if (isNaN(numericCgpa)) return '';
    return (numericCgpa * 9.5).toFixed(2) + '%';
  };
  
  // Format year range if available
  const formatEducationPeriod = (joiningYear, passoutYear) => {
    if (joiningYear && passoutYear) {
      return `${joiningYear} - ${passoutYear}`;
    }
    return 'N/A';
  };

  // Get year range for student
  const getYearRange = () => {
    if (profile?.joining_year && profile?.passout_year) {
      return `${profile.joining_year} - ${profile.passout_year}`;
    }
    if (editedStudent?.joining_year && editedStudent?.passout_year) {
      return `${editedStudent.joining_year} - ${editedStudent.passout_year}`;
    }
    if (profile?.year || editedStudent?.year) {
      return profile?.year || editedStudent?.year;
    }
    return null;
  };

  // Get semester CGPA
  const getSemesterCGPA = (semester) => {
    // First try to get from editedStudent semester_cgpas (highest priority during editing)
    if (editedStudent?.semester_cgpas && editedStudent.semester_cgpas.length > 0) {
      const semesterData = editedStudent.semester_cgpas.find(s => s.semester === semester);
      if (semesterData && semesterData.cgpa !== null && semesterData.cgpa !== undefined) {
        return semesterData.cgpa.toString();
      }
    }

    // Then try to get from semesterMarksheets (if available)
    if (semesterMarksheets && semesterMarksheets.length > 0) {
      const marksheet = semesterMarksheets[semester - 1];
      if (marksheet && marksheet.cgpa !== null && marksheet.cgpa !== undefined) {
        return marksheet.cgpa.toString();
      }
    }

    // Finally try to get from profile semester_cgpas
    if (profile?.semester_cgpas && profile.semester_cgpas.length > 0) {
      const semesterData = profile.semester_cgpas.find(s => s.semester === semester);
      if (semesterData && semesterData.cgpa !== null && semesterData.cgpa !== undefined) {
        return semesterData.cgpa.toString();
      }
    }

    return '-';
  };

  // Handle semester CGPA change
  const handleSemesterCGPAChange = (semester, value) => {
    // Ensure we have a valid editedStudent object
    if (!editedStudent) return;

    const currentSemesterCGPAs = editedStudent?.semester_cgpas || [];
    const updatedSemesterCGPAs = [...currentSemesterCGPAs];

    // Find existing semester data or create new one
    const existingIndex = updatedSemesterCGPAs.findIndex(s => s.semester === semester);

    if (existingIndex >= 0) {
      // Update existing semester
      updatedSemesterCGPAs[existingIndex] = {
        ...updatedSemesterCGPAs[existingIndex],
        cgpa: value
      };
    } else {
      // Add new semester data (only if value is not empty)
      if (value.trim() !== '') {
        updatedSemesterCGPAs.push({
          semester: semester,
          cgpa: value
        });
      }
    }

    // Remove entries with empty values
    const filteredSemesterCGPAs = updatedSemesterCGPAs.filter(item =>
      item.cgpa !== null && item.cgpa !== undefined && item.cgpa.toString().trim() !== ''
    );

    // Sort by semester number
    filteredSemesterCGPAs.sort((a, b) => a.semester - b.semester);

    // Update the edited student
    handleInputChange('semester_cgpas', filteredSemesterCGPAs);
  };

  // Handle resume upload
  const handleResumeUpload = async (file) => {
    try {
      if (!selectedStudent) {
        alert('No student selected');
        return;
      }

      // Use admin upload function with student ID
      await studentsAPI.adminUploadResume(selectedStudent.id, file, file.name, false);

      alert('Resume uploaded successfully!');

      // Refresh resume info after upload
      fetchResumeInfo(selectedStudent.id);
    } catch (err) {
      console.error('Error uploading resume:', err);
      alert(`Failed to upload resume: ${err.response?.data?.error || err.message || 'Unknown error'}`);
    }
  };

  // Handle resume delete
  const handleResumeDelete = async (resumeToDelete) => {
    try {
      // Use admin delete function with studentId and resumeId
      if (selectedStudent && resumeToDelete && resumeToDelete.id) {
        await studentsAPI.adminDeleteResume(selectedStudent.id, resumeToDelete.id);
        console.log('Resume deleted successfully');

        // Refresh resume info after delete
        fetchResumeInfo(selectedStudent.id);
      } else {
        console.error('Missing required data for resume deletion:', {
          selectedStudent: selectedStudent?.id,
          resumeId: resumeToDelete?.id
        });
        alert('Unable to delete resume: missing required information.');
      }
    } catch (err) {
      console.error('Error deleting resume:', err);
      alert(`Failed to delete resume: ${err.response?.data?.error || err.message || 'Unknown error'}`);
    }
  };

  // Handle freeze account
  const handleFreeze = async (freezeData) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/accounts/students/${selectedStudent.id}/freeze/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(freezeData)
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        // Refresh freeze status
        fetchFreezeStatus(selectedStudent.id);
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to freeze account');
      }
    } catch (err) {
      console.error('Error freezing account:', err);
      throw err;
    }
  };

  // Handle unfreeze account
  const handleUnfreeze = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/accounts/students/${selectedStudent.id}/freeze/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        // Refresh freeze status
        fetchFreezeStatus(selectedStudent.id);
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to unfreeze account');
      }
    } catch (err) {
      console.error('Error unfreezing account:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FaSpinner className="animate-spin text-blue-500 text-xl mr-2" />
        <span>Loading details...</span>
      </div>
    );
  }
  
  if (!selectedStudent && !editedStudent) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500">No student selected</p>
        <button 
          onClick={handleBackToList} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to List
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      {/* Header with back button and edit/save buttons */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={handleBackToList}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to List</span>
        </button>
        
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Save size={16} />
                  <span>Save</span>
                </div>
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <X size={16} />
                  <span>Cancel</span>
                </div>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Edit size={16} />
                  <span>Edit</span>
                </div>
              </button>
              <button
                onClick={() => setIsFreezeModalOpen(true)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  freezeStatus === 'none' 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : freezeStatus === 'complete'
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                }`}
              >
                {freezeStatus === 'none' ? (
                  <>
                    <Lock size={16} />
                    <span>Freeze</span>
                  </>
                ) : (
                  <>
                    <Unlock size={16} />
                    <span>Manage Freeze</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="max-w-8xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Student Information */}
        <div className="lg:col-span-3 bg-white rounded-lg p-5 shadow-sm h-fit">
          <div className="flex justify-center">
            <div className="w-50 h-50 bg-blue-500 text-white flex items-center justify-center rounded-lg mb-4">
              <span className="text-3xl font-bold">
                {editedStudent?.name ? editedStudent.name[0].toUpperCase() : 'S'}
              </span>
            </div>
          </div>
          
          <h1 className="text-xl font-bold text-center mt-2 text-gray-800">
            {isEditing ? (
              <input
                type="text"
                value={editedStudent?.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full p-1 border rounded text-center"
              />
            ) : (
              editedStudent?.name || 'Unknown Student'
            )}
          </h1>
          
          <div className="mt-4 space-y-3 text-md">
            <div className="flex">
              <p className="text-gray-500 w-20">Student ID</p>
              <p className="font-medium text-gray-800">: {isEditing ? (
                <input
                  type="text"
                  value={editedStudent?.rollNumber || ''}
                  onChange={(e) => handleInputChange('rollNumber', e.target.value)}
                  className="p-1 border rounded"
                />
              ) : (editedStudent?.rollNumber || '-')}</p>
            </div>
            <div className="flex">
              <p className="text-gray-500 w-20">Major</p>
              <p className="font-medium text-gray-800">: {isEditing ? (
                <select
                  value={editedStudent?.department || ''}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className="p-1 border rounded"
                >
                  <option value="">Select Department</option>
                  {departmentOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (editedStudent?.department || '-')}</p>
            </div>
            <div className="flex">
              <p className="text-gray-500 w-20">Passed Out</p>
              <p className="font-medium text-gray-800">: {isEditing ? (
                <input
                  type="text"
                  value={editedStudent?.passout_year || ''}
                  onChange={(e) => handleInputChange('passout_year', e.target.value)}
                  className="p-1 border rounded"
                />
              ) : (editedStudent?.passout_year || '-')}</p>
            </div>
            <div className="flex">
              <p className="text-gray-500 w-20">Gender</p>
              <p className="font-medium text-gray-800">: {isEditing ? (
                <select
                  value={editedStudent?.gender || ''}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="p-1 border rounded"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              ) : (editedStudent?.gender || '-')}</p>
            </div>
            <div className="flex">
              <p className="text-gray-500 w-20">Birthday</p>
              <p className="font-medium text-gray-800">: {isEditing ? (
                <input
                  type="date"
                  value={editedStudent?.dateOfBirth || ''}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  className="p-1 border rounded"
                />
              ) : (editedStudent?.dateOfBirth || '-')}</p>
            </div>
            <div className="flex">
              <p className="text-gray-500 w-20">Phone</p>
              <p className="font-medium text-gray-800">: {isEditing ? (
                <input
                  type="tel"
                  value={editedStudent?.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="p-1 border rounded"
                />
              ) : (editedStudent?.phone || '-')}</p>
            </div>
            <div className="flex">
              <p className="text-gray-500 w-20">Email</p>
              <p className="font-medium text-gray-800">: {isEditing ? (
                <input
                  type="email"
                  value={editedStudent?.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="p-1 border rounded"
                />
              ) : (editedStudent?.email || '-')}</p>
            </div>
            <div className="flex">
              <p className="text-gray-500 w-20">Campus</p>
              <p className="font-medium text-gray-800">: {isEditing ? (
                <input
                  type="text"
                  value={editedStudent?.college_name || ''}
                  onChange={(e) => handleInputChange('college_name', e.target.value)}
                  className="p-1 border rounded"
                />
              ) : (editedStudent?.college_name || '-')}</p>
            </div>
            <div className="flex">
              <p className="text-gray-500 w-20">Placement</p>
              <p className="font-medium text-gray-800">: {getYearRange() || '-'}</p>
            </div>
          </div>

          {/* Skills Section */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Skills</h3>
            {isEditing ? (
              <textarea
                value={Array.isArray(editedStudent?.skills) ? editedStudent.skills.join(', ') : editedStudent?.skills || ''}
                onChange={(e) => handleInputChange('skills', e.target.value.split(',').map(s => s.trim()))}
                className="w-full p-2 border rounded-lg"
                rows={3}
                placeholder="Enter skills separated by commas"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const skills = editedStudent?.skills || profile?.skills || selectedStudent?.skills;
                  
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
            )}
          </div>
        </div>

        {/* Middle Column - Academic Details */}
        <div className="lg:col-span-6 space-y-6">
          {/* Combined Academic Details */}
          <div className="bg-white rounded-lg p-5 shadow-sm">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">Academic</h2>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold text-gray-800">Semester Wise score</h3>
                <div className="bg-blue-50 inline-flex items-center px-3 py-1 rounded-full ml-3">
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editedStudent?.gpa || ''}
                        onChange={(e) => handleInputChange('gpa', e.target.value)}
                        className="w-16 p-1 border rounded text-sm text-blue-600 bg-transparent"
                        placeholder="0.00"
                      />
                      <span className="text-sm text-gray-500 ml-1">CGPA</span>
                      <span className="text-blue-600 ml-2">{calculatePercentage(editedStudent?.gpa)}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-blue-600 font-medium">{getOverallCGPA()}</span>
                      <span className="text-sm text-gray-500 ml-1">CGPA</span>
                      <span className="text-blue-600 ml-2">{calculatePercentage(getOverallCGPA())}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-lg font-semibold text-gray-800">
                {isEditing ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editedStudent?.joining_year || ''}
                      onChange={(e) => handleInputChange('joining_year', e.target.value)}
                      className="w-20 p-1 border rounded text-sm"
                      placeholder="2020"
                    />
                    <span>-</span>
                    <input
                      type="text"
                      value={editedStudent?.passout_year || ''}
                      onChange={(e) => handleInputChange('passout_year', e.target.value)}
                      className="w-20 p-1 border rounded text-sm"
                      placeholder="2024"
                    />
                  </div>
                ) : (
                  formatEducationPeriod(editedStudent?.joining_year, editedStudent?.passout_year)
                )}
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
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
                        const semesterCGPA = getSemesterCGPA(sem);
                        return (
                          <td key={sem} className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                            {isEditing ? (
                              <input
                                type="text"
                                value={semesterCGPA !== '-' ? semesterCGPA : ''}
                                onChange={(e) => handleSemesterCGPAChange(sem, e.target.value)}
                                className="w-full p-1 border rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0.0"
                                autoComplete="off"
                              />
                            ) : (
                              semesterCGPA
                            )}
                          </td>
                        );
                      })}
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
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={editedStudent?.twelfth_cgpa || ''}
                          onChange={(e) => handleInputChange('twelfth_cgpa', e.target.value)}
                          className="w-16 p-1 border rounded text-sm text-blue-600 bg-transparent"
                          placeholder="9.5"
                        />
                        <span className="text-sm text-gray-500 ml-1">CGPA</span>
                        <input
                          type="text"
                          value={editedStudent?.twelfth_percentage || ''}
                          onChange={(e) => handleInputChange('twelfth_percentage', e.target.value)}
                          className="w-16 p-1 border rounded text-sm text-blue-600 bg-transparent ml-2"
                          placeholder="95%"
                        />
                      </>
                    ) : (
                      <>
                        <span className="text-blue-600 font-medium">{editedStudent?.twelfth_cgpa || '-'}</span>
                        <span className="text-sm text-gray-500 ml-1">CGPA</span>
                        <span className="text-blue-600 ml-2">{editedStudent?.twelfth_percentage || '-'}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-lg font-semibold text-gray-800">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedStudent?.twelfth_year_of_passing || ''}
                      onChange={(e) => handleInputChange('twelfth_year_of_passing', e.target.value)}
                      className="w-20 p-1 border rounded text-sm"
                      placeholder="2020"
                    />
                  ) : (
                    editedStudent?.twelfth_year_of_passing
                      ? `${parseInt(editedStudent.twelfth_year_of_passing) - 2} - ${editedStudent.twelfth_year_of_passing}`
                      : '-'
                  )}
                </div>
              </div>
              <div className="flex justify-between items-start mb-2">
                <div className="grid grid-cols-2 gap-6 w-full">
                  <div className="space-y-3">
                    <div className="flex">
                      <p className="text-gray-500 text-sm w-[120px]">College :</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedStudent?.twelfth_school || ''}
                          onChange={(e) => handleInputChange('twelfth_school', e.target.value)}
                          className="flex-1 p-1 border rounded text-sm"
                          placeholder="School/College name"
                        />
                      ) : (
                        <p className="text-gray-700 font-medium">{editedStudent?.twelfth_school || '-'}</p>
                      )}
                    </div>
                    <div className="flex">
                      <p className="text-gray-500 text-sm w-[120px]">Board :</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedStudent?.twelfth_board || ''}
                          onChange={(e) => handleInputChange('twelfth_board', e.target.value)}
                          className="flex-1 p-1 border rounded text-sm"
                          placeholder="Board name"
                        />
                      ) : (
                        <p className="text-gray-700 font-medium">{editedStudent?.twelfth_board || '-'}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex">
                      <p className="text-gray-500 text-sm w-[120px]">Location :</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedStudent?.twelfth_location || ''}
                          onChange={(e) => handleInputChange('twelfth_location', e.target.value)}
                          className="flex-1 p-1 border rounded text-sm"
                          placeholder="City, State"
                        />
                      ) : (
                        <p className="text-gray-700 font-medium">{editedStudent?.twelfth_location || '-'}</p>
                      )}
                    </div>
                    <div className="flex">
                      <p className="text-gray-500 text-sm w-[120px]">Specialization :</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedStudent?.twelfth_specialization || ''}
                          onChange={(e) => handleInputChange('twelfth_specialization', e.target.value)}
                          className="flex-1 p-1 border rounded text-sm"
                          placeholder="Science/Commerce/Arts"
                        />
                      ) : (
                        <p className="text-gray-700 font-medium">{editedStudent?.twelfth_specialization || '-'}</p>
                      )}
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
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={editedStudent?.tenth_cgpa || ''}
                          onChange={(e) => handleInputChange('tenth_cgpa', e.target.value)}
                          className="w-16 p-1 border rounded text-sm text-blue-600 bg-transparent"
                          placeholder="9.5"
                        />
                        <span className="text-sm text-gray-500 ml-1">CGPA</span>
                        <input
                          type="text"
                          value={editedStudent?.tenth_percentage || ''}
                          onChange={(e) => handleInputChange('tenth_percentage', e.target.value)}
                          className="w-16 p-1 border rounded text-sm text-blue-600 bg-transparent ml-2"
                          placeholder="95%"
                        />
                      </>
                    ) : (
                      <>
                        <span className="text-blue-600 font-medium">{editedStudent?.tenth_cgpa || '-'}</span>
                        <span className="text-sm text-gray-500 ml-1">CGPA</span>
                        <span className="text-blue-600 ml-2">{editedStudent?.tenth_percentage || '-'}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-lg font-semibold text-gray-800">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedStudent?.tenth_year_of_passing || ''}
                      onChange={(e) => handleInputChange('tenth_year_of_passing', e.target.value)}
                      className="w-20 p-1 border rounded text-sm"
                      placeholder="2018"
                    />
                  ) : (
                    editedStudent?.tenth_year_of_passing
                      ? `${parseInt(editedStudent.tenth_year_of_passing) - 1} - ${editedStudent.tenth_year_of_passing}`
                      : '-'
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-start mb-2">
                <div className="grid grid-cols-2 gap-6 w-full">
                  <div className="space-y-3">
                    <div className="flex">
                      <p className="text-gray-500 text-sm w-[120px]">School :</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedStudent?.tenth_school || ''}
                          onChange={(e) => handleInputChange('tenth_school', e.target.value)}
                          className="flex-1 p-1 border rounded text-sm"
                          placeholder="School name"
                        />
                      ) : (
                        <p className="text-gray-700 font-medium">{editedStudent?.tenth_school || '-'}</p>
                      )}
                    </div>
                    <div className="flex">
                      <p className="text-gray-500 text-sm w-[120px]">Board :</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedStudent?.tenth_board || ''}
                          onChange={(e) => handleInputChange('tenth_board', e.target.value)}
                          className="flex-1 p-1 border rounded text-sm"
                          placeholder="Board name"
                        />
                      ) : (
                        <p className="text-gray-700 font-medium">{editedStudent?.tenth_board || '-'}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex">
                      <p className="text-gray-500 text-sm w-[120px]">Location :</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedStudent?.tenth_location || ''}
                          onChange={(e) => handleInputChange('tenth_location', e.target.value)}
                          className="flex-1 p-1 border rounded text-sm"
                          placeholder="City, State"
                        />
                      ) : (
                        <p className="text-gray-700 font-medium">{editedStudent?.tenth_location || '-'}</p>
                      )}
                    </div>
                    <div className="flex">
                      <p className="text-gray-500 text-sm w-[120px]">Specialization :</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedStudent?.tenth_specialization || ''}
                          onChange={(e) => handleInputChange('tenth_specialization', e.target.value)}
                          className="flex-1 p-1 border rounded text-sm"
                          placeholder="General/Other"
                        />
                      ) : (
                        <p className="text-gray-700 font-medium">{editedStudent?.tenth_specialization || '-'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Companies Section */}
          <div className="bg-white rounded-lg p-5 shadow-sm">
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
          <div className="bg-white rounded-lg p-5 shadow-sm">
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
          <div className="bg-white rounded-lg p-5 shadow-sm">
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
          <div className="bg-white rounded-lg p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">CURRENT ADDRESS</h2>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex">
                <p className="text-gray-500 w-20">City</p>
                <p className="font-medium text-gray-700">: {isEditing ? (
                  <input
                    type="text"
                    value={editedStudent?.city || ''}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="flex-1 p-1 border rounded text-sm"
                    placeholder="City name"
                  />
                ) : (editedStudent?.city || '-')}</p>
              </div>
              <div className="flex">
                <p className="text-gray-500 w-20">District</p>
                <p className="font-medium text-gray-700">: {isEditing ? (
                  <input
                    type="text"
                    value={editedStudent?.district || ''}
                    onChange={(e) => handleInputChange('district', e.target.value)}
                    className="flex-1 p-1 border rounded text-sm"
                    placeholder="District name"
                  />
                ) : (editedStudent?.district || '-')}</p>
              </div>
              <div className="flex items-center">
                <p className="text-gray-500 w-20">State</p>
                <span className="mr-2">:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedStudent?.state || ''}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="flex-1 p-2 border rounded text-sm"
                    placeholder="State name"
                  />
                ) : (
                  <p className="font-medium text-gray-700">{editedStudent?.state || '-'}</p>
                )}
              </div>
              <div className="flex items-center">
                <p className="text-gray-500 w-20">Pin Code</p>
                <span className="mr-2">:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedStudent?.pincode || ''}
                    onChange={(e) => handleInputChange('pincode', e.target.value)}
                    className="flex-1 p-2 border rounded text-sm"
                    placeholder="Pin code"
                  />
                ) : (
                  <p className="font-medium text-gray-700">{editedStudent?.pincode || '-'}</p>
                )}
              </div>
              <div className="flex items-center">
                <p className="text-gray-500 w-20">Country</p>
                <span className="mr-2">:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedStudent?.country || ''}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className="flex-1 p-2 border rounded text-sm"
                    placeholder="Country name"
                  />
                ) : (
                  <p className="font-medium text-gray-700">{editedStudent?.country || '-'}</p>
                )}
              </div>
              <div className="flex items-start">
                <p className="text-gray-500 w-20 mt-2">Address</p>
                <span className="mr-2 mt-2">:</span>
                {isEditing ? (
                  <textarea
                    value={editedStudent?.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="flex-1 p-2 border rounded text-sm"
                    rows={3}
                    placeholder="Full address"
                  />
                ) : (
                  <p className="font-medium text-gray-700 flex-1">{editedStudent?.address || '-'}</p>
                )}
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
        studentId={selectedStudent?.id}
        isAdminMode={true}
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
        onUploadCertificate={(file, type) => studentsAPI.adminUploadCertificate(selectedStudent.id, file, type)}
        onUploadMarksheet={(file, semester, cgpa) => studentsAPI.adminUploadSemesterMarksheet(selectedStudent.id, file, semester, cgpa)}
        onDeleteCertificate={(type) => studentsAPI.adminDeleteCertificate(selectedStudent.id, type)}
        onDeleteMarksheet={(semester) => studentsAPI.adminDeleteMarksheet(selectedStudent.id, semester)}
        onUploadSuccess={() => {
          // Refresh profile data after successful upload
          if (selectedStudent) {
            fetchAdditionalDetails(selectedStudent.id);
          }
        }}
      />

      {/* Freeze Modal */}
      <FreezeModal
        isOpen={isFreezeModalOpen}
        onClose={() => setIsFreezeModalOpen(false)}
        onFreeze={handleFreeze}
        onUnfreeze={handleUnfreeze}
        studentName={editedStudent?.name || selectedStudent?.name || 'Unknown Student'}
        currentFreezeStatus={freezeStatus}
        currentFreezeData={freezeData}
      />
    </div>
  </div>
);
}
