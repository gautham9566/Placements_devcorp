'use client';

import {
  ArrowLeft,
  Calendar,
  RefreshCw,
  Save,
  Search,
  User,
  X,
  GraduationCap,
  Upload
} from "lucide-react";
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { studentsAPI, studentMetricsAPI } from '../../../api/optimized';
import { getAuthToken } from '../../../utils/auth';
import { useNotification } from '../../../contexts/NotificationContext';
import CustomDropdown from './StudentDropdown';
import StudentProfile from './StudentProfile';
import DepartmentCards from './DepartmentCards';
import PassoutYearCards from './PassoutYearCards';
import StudentList from './StudentList';

export default function StudentManagement() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleApiError, showValidationError, showSuccess } = useNotification();
  
  // Initialize state from URL parameters
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedDepartment, setSelectedDepartment] = useState(searchParams.get('department') || null);
  const [selectedYear, setSelectedYear] = useState(searchParams.get('year') || 'all');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedStudent, setEditedStudent] = useState(null);
  const dropdownRef = useRef(null);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [availableYears, setAvailableYears] = useState([]);
  const [departmentStats, setDepartmentStats] = useState([]);
  const [selectedPassoutYear, setSelectedPassoutYear] = useState(searchParams.get('passout_year') || null);
  const [cgpaMin, setCgpaMin] = useState(searchParams.get('cgpa_min') || '');
  const [cgpaMax, setCgpaMax] = useState(searchParams.get('cgpa_max') || '');
  const [yearStats, setYearStats] = useState([]);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // Function to update URL with current state
  const updateURL = (params = {}) => {
    const newParams = new URLSearchParams();
    
    // Always include current values unless overridden
    const currentParams = {
      page: params.page || currentPage.toString(),
      department: params.department !== undefined ? params.department : selectedDepartment,
      passout_year: params.passout_year !== undefined ? params.passout_year : selectedPassoutYear,
      search: params.search !== undefined ? params.search : searchTerm,
      cgpa_min: params.cgpa_min !== undefined ? params.cgpa_min : cgpaMin,
      cgpa_max: params.cgpa_max !== undefined ? params.cgpa_max : cgpaMax,
      ...params
    };

    // Only add non-empty parameters to URL
    Object.entries(currentParams).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '' && value !== 'null' && value !== null) {
        newParams.set(key, value);
      }
    });

    const newURL = `${window.location.pathname}?${newParams.toString()}`;
    window.history.pushState({}, '', newURL);
  };

  // Dropdown options
  const departmentOptions = [
    { value: 'Computer Science', label: 'Computer Science' },
    { value: 'Electronics', label: 'Electronics' },
    { value: 'Mechanical', label: 'Mechanical' },
    { value: 'Civil', label: 'Civil' },
    { value: 'Electrical', label: 'Electrical' },
    { value: 'Information Technology', label: 'Information Technology' },
    { value: 'Chemical', label: 'Chemical' },
    { value: 'Biotechnology', label: 'Biotechnology' }
  ];

  // Transform student data from API response
  const transformStudentData = (student) => ({
    id: student.id,
    rollNumber: student.student_id || 'N/A',
    name: `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown',
    email: student.contact_email || student.email || 'N/A',
    phone: student.phone || 'N/A',
    department: student.branch || 'N/A',
    year: getYearFromBranch(student.branch, student),
    cgpa: student.gpa || 'N/A',
    gpa: student.gpa || 'N/A', // Overall CGPA from database
    address: student.address || 'N/A',
    dateOfBirth: student.date_of_birth || '',
    parentContact: student.parent_contact || 'N/A',
    education: student.education || 'N/A',
    skills: student.skills || [],

    // Academic details
        joining_year: student.joining_year || student.admission_year || '',
        passout_year: student.passout_year || student.graduation_year || '',

        // Class XII details
        twelfth_cgpa: student.twelfth_cgpa || student.class_12_cgpa || '',
        twelfth_percentage: student.twelfth_percentage || student.class_12_percentage || '',
        twelfth_year_of_passing: student.twelfth_year_of_passing || student.class_12_year || '',
        twelfth_school: student.twelfth_school || student.class_12_school || '',
        twelfth_board: student.twelfth_board || student.class_12_board || '',
        twelfth_location: student.twelfth_location || student.class_12_location || '',
        twelfth_specialization: student.twelfth_specialization || student.class_12_stream || '',

        // Class X details
        tenth_cgpa: student.tenth_cgpa || student.class_10_cgpa || '',
        tenth_percentage: student.tenth_percentage || student.class_10_percentage || '',
        tenth_year_of_passing: student.tenth_year_of_passing || student.class_10_year || '',
        tenth_school: student.tenth_school || student.class_10_school || '',
        tenth_board: student.tenth_board || student.class_10_board || '',
        tenth_location: student.tenth_location || student.class_10_location || '',
        tenth_specialization: student.tenth_specialization || student.class_10_stream || '',

        // Address details
        city: student.city || '',
        district: student.district || '',
        state: student.state || '',
        pincode: student.pincode || student.pin_code || '',
        country: student.country || 'India',

        // Certificate URLs
        tenth_certificate: student.tenth_certificate || student.class_10_certificate || '',
        twelfth_certificate: student.twelfth_certificate || student.class_12_certificate || '',
        tenth_certificate_url: student.tenth_certificate_url || student.class_10_certificate_url || '',
        twelfth_certificate_url: student.twelfth_certificate_url || student.class_12_certificate_url || '',

        // Resume details
        resume: student.resume || '',
        resume_url: student.resume_url || '',

        // Semester-wise CGPA data - use actual backend data
        semester_cgpas: student.semester_marksheets || [],
        semester_marksheets: student.semester_marksheets || [],

        // Placement details
        placement_status: student.placement_status || 'not_placed',
        placed_job_id: student.placed_job_id || '',
      });

  // Remove debounced search - we'll use button-based search instead
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     setDebouncedSearchTerm(searchTerm);
  //   }, 300); // 300ms delay

  //   return () => clearTimeout(timer);
  // }, [searchTerm]);

  // Fetch students with server-side pagination and filtering
  const fetchStudents = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      setIsRetrying(false);

      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found. Please login first.');
      }

      // Build filter parameters for server-side filtering
      const params = {
        page,
        page_size: pageSize,
        ordering: 'student_id', // Sort by roll number (student_id) instead of name/email
      };

      // Add search filter
      if (searchTerm) {
        params.search = searchTerm;
      }

      // Add department filter
      if (selectedDepartment) {
        params.department = selectedDepartment;
      }

      // Add passout year filter - this is the key fix
      if (selectedPassoutYear) {
        params.passout_year = selectedPassoutYear;
      }

      // Add year filter (convert to passout year if needed)
      if (selectedYear !== 'all') {
        params.year = selectedYear;
      }

      // Add CGPA filters
      if (cgpaMin) {
        params.cgpa_min = cgpaMin;
      }
      if (cgpaMax) {
        params.cgpa_max = cgpaMax;
      }

      // Debug logging
      console.log('Fetching students with params:', params);

      // Fetch data from optimized API
      const response = await studentsAPI.getStudents(params);

      // Transform the data
      const transformedStudents = response.data.map(transformStudentData);

      // Backend now handles sorting by student_id, so no client-side sorting needed
      setStudents(transformedStudents);
      setCurrentPage(page);
      setTotalPages(response.pagination.total_pages);
      setTotalStudents(response.pagination.total_count);
      
      // Update available years and department stats from metadata
      if (response.metadata) {
        if (response.metadata.available_years) {
          setAvailableYears(response.metadata.available_years);
        }
        if (response.metadata.available_departments) {
          // Convert to department stats format
          const deptStats = response.metadata.available_departments.map(dept => ({
            department: dept,
            count: 0 // We'll need to fetch department counts separately or calculate them
          }));
          setDepartmentStats(deptStats);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching students:', err);

      if (err.response?.status === 401) {
        handleApiError(err, 'loading student data');
        setError('Authentication failed. Please login again.');
      } else if (err.response?.status === 403) {
        handleApiError(err, 'accessing student management');
        setError('You do not have permission to view students. Admin access required.');
      } else if (err.message.includes('token')) {
        handleApiError(err, 'authentication');
        setError('Please login to access student management.');
      } else {
        handleApiError(err, 'loading student data');
        setError(`Error: ${err.message}`);
      }

      setStudents([]);
      setLoading(false);
    }
  };

  // Fetch year statistics for a specific department
  const fetchYearStats = async (department) => {
    try {
      const token = getAuthToken();
      if (!token) return;

      console.log('Fetching year stats for department:', department);
      
      // Use the optimized API to get year statistics filtered by department
      const result = await studentMetricsAPI.getYearStats(null, false, department);
      
      if (result.success && result.data && result.data.years) {
        console.log('Year stats from API:', result.data.years);
        setYearStats(result.data.years);
      } else {
        console.error('Failed to fetch year stats:', result.error);
        
        // Fallback: Calculate from current students data
        const params = {
          department: department,
          page_size: 1000, // Get more data for accurate counting - increased from default
          count_only: true // Add a parameter to indicate we just need counts
        };

        const response = await studentsAPI.getStudents(params);
        console.log('Year stats response:', response);

        // Calculate year statistics from the filtered department data
        if (response.data) {
          const yearCounts = {};
          const currentYear = new Date().getFullYear();
          
          response.data.forEach(student => {
            // Try different year field variations
            const passoutYear = student.passout_year || 
                               student.graduation_year || 
                               student.expected_graduation_year ||
                               student.passoutYear;
            
            if (passoutYear) {
              const year = passoutYear.toString();
              if (!yearCounts[year]) {
                yearCounts[year] = {
                  passout_year: parseInt(year),
                  total_students: 0,
                  current_year_students: 0
                };
              }
              yearCounts[year].total_students++;
              
              // Check if this is a current year student (assuming final year students)
              if (parseInt(year) === currentYear || parseInt(year) === currentYear + 1) {
                yearCounts[year].current_year_students++;
              }
            }
          });

          const calculatedYearStats = Object.values(yearCounts);
          console.log('Calculated year stats for department:', department, calculatedYearStats);
          setYearStats(calculatedYearStats);
        }
      }

    } catch (err) {
      console.error('Error fetching year stats:', err);
      setYearStats([]);
    }
  };

  // Helper function to determine year from branch (you can customize this logic)
  const getYearFromBranch = (branch, student) => {
    if (student && student.joining_year && student.passout_year) {
      return `${student.joining_year}-${student.passout_year}`;
    }
    return 'N/A';
  };

  // Initial data fetch
  useEffect(() => {
    fetchStudents();
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const searchParams = new URLSearchParams(window.location.search);
      setCurrentPage(parseInt(searchParams.get('page')) || 1);
      setSelectedDepartment(searchParams.get('department') || null);
      setSelectedPassoutYear(searchParams.get('passout_year') || null);
      setSearchTerm(searchParams.get('search') || '');
      setCgpaMin(searchParams.get('cgpa_min') || '');
      setCgpaMax(searchParams.get('cgpa_max') || '');
      
      // Fetch data with new parameters
      fetchStudents(parseInt(searchParams.get('page')) || 1);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Load specific student if ID is in URL
  useEffect(() => {
    const studentId = searchParams.get('student_id');
    if (studentId && students.length > 0) {
      const student = students.find(s => s.id.toString() === studentId);
      if (student) {
        setSelectedStudent(student);
        setEditedStudent({ ...student });
      }
    }
  }, [students, searchParams]);

  // Add this useEffect after your existing useEffect
  useEffect(() => {
    // Check if user is authenticated
    const token = getAuthToken();
    if (!token) {
      // Redirect to login page or show login prompt
      setError('Please login to access student management.');
      setLoading(false);
      return;
    }
    
    fetchStudents();
  }, []);

  // Helper function to extract year from student ID (assuming format like CS2021001)
  const getYearFromStudentId = (studentId) => {
    if (studentId && studentId.length >= 6) {
      const yearPart = studentId.substring(2, 6);
      if (!isNaN(yearPart)) {
        return `${4 - (new Date().getFullYear() - parseInt(yearPart))}th Year`;
      }
    }
    return 'Unknown';
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsYearDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get available passout years from the metadata
  const getAvailablePassoutYears = () => {
    return availableYears;
  };

  // Get available years from students data
  const getAvailableYears = (studentsData) => {
    const years = [...new Set(studentsData.map(student => student.year).filter(year => year && year !== 'N/A'))];
    return years.sort();
  };

  // Get department statistics
  const getDepartmentStats = (studentsData) => {
    const stats = {};
    studentsData.forEach(student => {
      if (student.department && student.department !== 'N/A') {
        stats[student.department] = (stats[student.department] || 0) + 1;
      }
    });
    return Object.entries(stats).map(([department, count]) => ({ department, count }));
  };

  // This function is no longer needed with server-side pagination
  // Available years will be fetched from the backend

  // Filtering is now handled server-side in fetchStudents

  // Update filters and refetch when dependencies change (except search)
  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filters change
    fetchStudents(1); // Reset to page 1 when filters change
  }, [selectedDepartment, selectedYear, selectedPassoutYear, cgpaMin, cgpaMax, pageSize]);

  // Separate effect for page changes without resetting filters
  useEffect(() => {
    if (currentPage > 1) {
      fetchStudents(currentPage);
    }
  }, [currentPage]);

  // Filter students based on selected department, year, and search term
  const filteredStudents = students; // Students are already filtered in fetchStudents

  // Function to get filtered students for StudentList component
  const getFilteredStudents = () => {
    return filteredStudents;
  };

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    setEditedStudent({ ...student });
    setIsEditing(false);
    
    // Update URL to include student ID
    updateURL({ student_id: student.id });
  };

  const handleBackToList = () => {
    setSelectedStudent(null);
    setIsEditing(false);
    setEditedStudent(null);
    
    // Remove student_id from URL
    const params = new URLSearchParams(window.location.search);
    params.delete('student_id');
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newURL);
  };

  const handleBackToDepartments = () => {
    setSelectedDepartment(null);
    setSelectedYear('all');
    setSearchTerm('');
    setSelectedPassoutYear(null);
    setCgpaMin('');
    setCgpaMax('');
    setCurrentPage(1);
    
    // Clear URL parameters
    window.history.pushState({}, '', window.location.pathname);
  };

  // Handle department selection
  const handleDepartmentSelect = (department) => {
    setSelectedDepartment(department);
    setCurrentPage(1);
    updateURL({ department, page: '1' });
    
    // Fetch year statistics for this department
    fetchYearStats(department);
  };

  // Handle passout year selection
  const handlePassoutYearSelect = (passoutYear) => {
    console.log('Selected passout year:', passoutYear, 'for department:', selectedDepartment);
    setSelectedPassoutYear(passoutYear);
    setCurrentPage(1);
    // Ensure page parameter is explicitly included in URL
    updateURL({ passout_year: passoutYear, page: '1' });
  };

  // Handle CGPA filter changes
  const handleCgpaMinChange = (value) => {
    setCgpaMin(value);
    setCurrentPage(1);
    updateURL({ cgpa_min: value, page: '1' });
  };

  const handleCgpaMaxChange = (value) => {
    setCgpaMax(value);
    setCurrentPage(1);
    updateURL({ cgpa_max: value, page: '1' });
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Helper function to clean data
      const cleanValue = (value) => {
        if (value === '' || value === null || value === undefined) {
          return null;
        }
        // Handle string values
        if (typeof value === 'string') {
          const trimmed = value.trim();
          return trimmed === '' ? null : trimmed;
        }
        return value;
      };

      // Helper function to clean numeric values
      const cleanNumericValue = (value) => {
        if (value === '' || value === null || value === undefined) {
          return null;
        }
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed === '') return null;
          const parsed = parseInt(trimmed);
          return isNaN(parsed) ? null : parsed;
        }
        if (typeof value === 'number') {
          return isNaN(value) ? null : value;
        }
        return null;
      };

      // Helper function to clean string values specifically
      const cleanStringValue = (value) => {
        if (value === '' || value === null || value === undefined) {
          return '';
        }
        return typeof value === 'string' ? value.trim() : String(value).trim();
      };

      // Split the name properly
      const nameParts = editedStudent.name ? editedStudent.name.trim().split(' ') : [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Prepare the data for backend update
      const updateData = {
        // Basic information - ensure strings are not empty
        first_name: cleanStringValue(firstName),
        last_name: cleanStringValue(lastName),
        student_id: cleanStringValue(editedStudent.rollNumber),
        contact_email: cleanValue(editedStudent.email),
        phone: cleanStringValue(editedStudent.phone),
        branch: cleanStringValue(editedStudent.department),
        gpa: cleanStringValue(editedStudent.gpa), // Overall CGPA as string

        // Academic details - these should be integers
        joining_year: cleanNumericValue(editedStudent.joining_year),
        passout_year: cleanNumericValue(editedStudent.passout_year),

        // Personal details
        date_of_birth: cleanValue(editedStudent.dateOfBirth),
        address: cleanStringValue(editedStudent.address),
        city: cleanStringValue(editedStudent.city),
        district: cleanStringValue(editedStudent.district),
        state: cleanStringValue(editedStudent.state),
        pincode: cleanStringValue(editedStudent.pincode),
        country: cleanStringValue(editedStudent.country),
        parent_contact: cleanStringValue(editedStudent.parentContact),
        education: cleanStringValue(editedStudent.education),
        skills: Array.isArray(editedStudent.skills) 
          ? editedStudent.skills.filter(skill => skill && skill.trim()).join(', ')
          : cleanStringValue(editedStudent.skills),

        // Placement status
        placement_status: cleanStringValue(editedStudent.placement_status || 'not_placed'),
        placed_job_id: cleanStringValue(editedStudent.placed_job_id),

        // Academic scores - all as strings to match model
        tenth_cgpa: cleanStringValue(editedStudent.tenth_cgpa),
        tenth_percentage: cleanStringValue(editedStudent.tenth_percentage),
        tenth_board: cleanStringValue(editedStudent.tenth_board),
        tenth_school: cleanStringValue(editedStudent.tenth_school),
        tenth_year_of_passing: cleanStringValue(editedStudent.tenth_year_of_passing),
        tenth_location: cleanStringValue(editedStudent.tenth_location),
        tenth_specialization: cleanStringValue(editedStudent.tenth_specialization),

        twelfth_cgpa: cleanStringValue(editedStudent.twelfth_cgpa),
        twelfth_percentage: cleanStringValue(editedStudent.twelfth_percentage),
        twelfth_board: cleanStringValue(editedStudent.twelfth_board),
        twelfth_school: cleanStringValue(editedStudent.twelfth_school),
        twelfth_year_of_passing: cleanStringValue(editedStudent.twelfth_year_of_passing),
        twelfth_location: cleanStringValue(editedStudent.twelfth_location),
        twelfth_specialization: cleanStringValue(editedStudent.twelfth_specialization),
      };

      // Add semester CGPAs if they exist
      if (editedStudent.semester_cgpas && Array.isArray(editedStudent.semester_cgpas)) {
        editedStudent.semester_cgpas.forEach(semesterData => {
          if (semesterData.semester >= 1 && semesterData.semester <= 8 && semesterData.cgpa) {
            updateData[`semester${semesterData.semester}_cgpa`] = cleanStringValue(semesterData.cgpa);
          }
        });
      }

      // Remove empty string values but keep nulls for proper field clearing
      const cleanedUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([key, value]) => {
          // Keep nulls for clearing fields, remove empty strings except for required fields
          const requiredFields = ['first_name', 'last_name', 'student_id', 'gpa'];
          if (requiredFields.includes(key)) {
            return value !== null && value !== undefined;
          }
          return value !== null && value !== undefined && value !== '';
        })
      );

      // Ensure required fields have default values if missing
      if (!cleanedUpdateData.first_name) cleanedUpdateData.first_name = 'Student';
      if (!cleanedUpdateData.last_name) cleanedUpdateData.last_name = '';
      if (!cleanedUpdateData.student_id) cleanedUpdateData.student_id = `TEMP_${Date.now()}`;
      if (!cleanedUpdateData.gpa) cleanedUpdateData.gpa = '0.0';

      // Debug logging
      console.log('Original editedStudent:', editedStudent);
      console.log('Update data being sent:', cleanedUpdateData);
      console.log('Student ID:', editedStudent.id);

      // Make API call to update student
      const updatedStudent = await studentsAPI.updateStudent(editedStudent.id, cleanedUpdateData);

      // Update the student in the list with the response data
      const updatedStudentData = {
        ...editedStudent,
        ...updatedStudent,
        name: `${updatedStudent.first_name || ''} ${updatedStudent.last_name || ''}`.trim(),
        rollNumber: updatedStudent.student_id,
        email: updatedStudent.contact_email,
        department: updatedStudent.branch,
        gpa: updatedStudent.gpa,
        placement_status: updatedStudent.placement_status,
        placed_job_id: updatedStudent.placed_job_id,
      };

      setStudents(prev =>
        prev.map(student =>
          student.id === editedStudent.id ? updatedStudentData : student
        )
      );

      setSelectedStudent(updatedStudentData);
      setIsEditing(false);

      // Show success message
      showSuccess('Student Updated!', 'Student profile has been updated successfully.');

    } catch (error) {
      console.error('Error updating student:', error);
      
      // More detailed error logging
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data);
        console.error('Error response headers:', error.response.headers);
      }
      
      let errorMessage = 'Failed to update student profile. Please try again.';
      
      if (error.response?.data) {
        // Handle validation errors
        if (typeof error.response.data === 'object') {
          const errorDetails = [];
          for (const [field, messages] of Object.entries(error.response.data)) {
            if (Array.isArray(messages)) {
              errorDetails.push(`${field}: ${messages.join(', ')}`);
            } else {
              errorDetails.push(`${field}: ${messages}`);
            }
          }
          if (errorDetails.length > 0) {
            errorMessage = `Validation errors:\n${errorDetails.join('\n')}`;
          }
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      }
      
      showValidationError('Update Failed', {
        details: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedStudent({ ...selectedStudent });
    setIsEditing(false);
  };

  const handleInputChange = (field, value) => {
    setEditedStudent(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      
      // Clear placed_job_id when placement status is changed to "not_placed"
      if (field === 'placement_status' && value === 'not_placed') {
        updated.placed_job_id = '';
      }
      
      return updated;
    });
  };

  // Handle retry button click
  const handleRetry = () => {
    setIsRetrying(true);
    fetchStudents();
  };

  // Help developers find the correct API endpoint
  const debugBackend = () => {
    window.open('http://localhost:8000/admin/');
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      updateURL({ page: newPage.toString() });
      // fetchStudents will be called by useEffect
    }
  };

  // Handle search input change (only update state, don't trigger search)
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Don't trigger immediate search, let button handle it
  };

  // Handle search input key press
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If we're on a specific department and passout year page, use regular search
      if (selectedDepartment && selectedPassoutYear) {
        handleSearch();
      } else {
        // Otherwise use global search
        handleGlobalSearch();
      }
    }
  };

  const handleSearch = () => {
    // Force immediate search with current search term
    setCurrentPage(1);
    updateURL({ search: searchTerm, page: '1' });
    fetchStudents(1);
  };

  const handleGlobalSearch = async () => {
    try {
      setLoading(true);
      setShowSearchResults(false);

      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found. Please login first.');
      }

      const params = {
        search: globalSearchTerm,
        page_size: 10, // Limit results for popup
      };

      const response = await studentsAPI.getStudents(params);
      const transformedResults = response.data.map(transformStudentData);

      setSearchResults(transformedResults);
      setShowSearchResults(true);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching search results:', err);
      handleApiError(err, 'searching students');
      setSearchResults([]);
      setShowSearchResults(true);
      setLoading(false);
    }
  };

  const closeSearchResults = () => {
    setShowSearchResults(false);
    setSearchResults([]);
  };

  // Handle edit function - redirect to existing student profile edit page
  const handleEdit = () => {
    if (selectedStudent) {
      // Set filters to match the student's department and passout year
      setSelectedDepartment(selectedStudent.department);
      setSelectedPassoutYear(selectedStudent.passout_year);
      
      // Update URL to include the student's department and year context
      updateURL({ 
        department: selectedStudent.department, 
        passout_year: selectedStudent.passout_year, 
        student_id: selectedStudent.id 
      });
      
      // Enable editing mode
      setIsEditing(true);
    }
  };

  if (loading) return (
    <div className="flex-1 p-6 ml-20 overflow-y-auto h-full">
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <div className="text-gray-600">Loading students...</div>
      </div>
    </div>
  );
  
  if (error && students.length === 0) return (
    <div className="flex-1 p-6 ml-20 overflow-y-auto h-full">
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-red-500 mb-4 text-center max-w-md">
          <p className="font-semibold text-lg mb-2">Access Error</p>
          <p>{error}</p>
          <div className="mt-4 text-sm text-gray-600">
            <p>Possible solutions:</p>
            <ul className="list-disc list-inside mt-2 text-left">
              <li>Make sure you're logged in with admin credentials</li>
              <li>Check if your session has expired</li>
              <li>Verify Django server is running on port 8000</li>
              <li>Ensure proper permissions are set in Django</li>
            </ul>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          {!error.includes('login') && (
            <button 
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={isRetrying}
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : 'Retry'}
            </button>
          )}
          <button 
            onClick={() => window.location.href = '/login'}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <User className="w-4 h-4" />
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 p-6 overflow-y-auto h-full">
      {/* Global Search Bar - Only show on main page (department cards view) */}
      {!selectedDepartment && !selectedStudent && (
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <input
              type="text"
              value={globalSearchTerm}
              onChange={(e) => setGlobalSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search students globally..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleGlobalSearch}
              className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Search className="w-4 h-4 inline-block mr-1" />
              Search
            </button>
            <button
              onClick={() => router.push('/admin/student-management/updatepage')}
              className="ml-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Excel
            </button>
          </div>
        </div>
      )}

      {/* Search Results Popup */}
      {showSearchResults && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-3/4 max-w-4xl max-h-3/4 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Global Search Results</h2>
              <button
                onClick={closeSearchResults}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((student) => (
                  <div
                    key={student.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedStudent(student);
                      setEditedStudent({ ...student });
                      setShowSearchResults(false);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-lg">{student.name}</p>
                        <p className="text-sm text-gray-600">Roll: {student.rollNumber}</p>
                        <p className="text-sm text-gray-600">Department: {student.department}</p>
                        <p className="text-sm text-gray-600">Email: {student.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">CGPA: {student.cgpa}</p>
                        <p className="text-sm text-gray-500">Year: {student.passout_year}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 text-lg">No results found for "{globalSearchTerm}"</p>
                <p className="text-gray-500 text-sm mt-2">Try searching with different keywords like name, roll number, or email</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Existing content */}
      {!selectedStudent ? (
        <>
          {!selectedDepartment ? (
            <DepartmentCards
              departmentOptions={departmentOptions}
              departmentStats={departmentStats}
              totalStudents={totalStudents}
              onSelect={handleDepartmentSelect}
            />
          ) : !selectedPassoutYear ? (
            <PassoutYearCards
              departmentLabel={departmentOptions.find(d => d.value === selectedDepartment)?.label}
              onBack={handleBackToDepartments}
              getAvailablePassoutYears={getAvailablePassoutYears}
              selectedDepartment={selectedDepartment}
              onSelectYear={handlePassoutYearSelect}
              yearStats={yearStats}
              students={students}
            />
          ) : (
            <StudentList
              departmentLabel={departmentOptions.find(d => d.value === selectedDepartment)?.label}
              passoutYear={selectedPassoutYear}
              onBack={() => setSelectedPassoutYear(null)}
              searchTerm={searchTerm}
              handleSearchInputChange={handleSearchInputChange}
              handleSearchKeyDown={handleSearchKeyDown}
              cgpaMin={cgpaMin}
              setCgpaMin={handleCgpaMinChange}
              cgpaMax={cgpaMax}
              setCgpaMax={handleCgpaMaxChange}
              handleSearch={handleSearch}
              getFilteredStudents={getFilteredStudents}
              currentPage={currentPage}
              handlePageChange={handlePageChange}
              handleStudentClick={handleStudentClick}
              loading={loading}
              totalPages={totalPages}
              totalStudents={totalStudents}
            />
          )}
        </>
      ) : (
        <StudentProfile
          selectedStudent={selectedStudent}
          editedStudent={editedStudent}
          isEditing={isEditing}
          handleBackToList={handleBackToList}
          handleEdit={handleEdit}
          handleSave={handleSave}
          handleCancel={handleCancel}
          handleInputChange={handleInputChange}
          departmentOptions={departmentOptions}
        />
      )}
    </div>
  );
}