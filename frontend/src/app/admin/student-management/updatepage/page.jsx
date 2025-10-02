'use client';

import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  RefreshCw
} from "lucide-react";
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { studentsAPI } from '../../../../api/optimized';
import { getAuthToken } from '../../../../utils/auth';

export default function UpdateStudentData() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [excelData, setExcelData] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [summary, setSummary] = useState(null);

  // Column mapping for student fields
  const COLUMN_MAPPINGS = {
    // Primary identifier (mandatory)
    'Roll Number': 'student_id',
    'RollNumber': 'student_id',
    'Student ID': 'student_id',
    'StudentID': 'student_id',
    'Roll No': 'student_id',
    'Student_ID': 'student_id',
    
    // Basic information
    'First Name': 'first_name',
    'FirstName': 'first_name',
    'Last Name': 'last_name',
    'LastName': 'last_name',
    'Name': 'name',
    'Full Name': 'name',
    'Gender': 'gender',
    'Sex': 'gender',
    'Email': 'contact_email',
    'Contact Email': 'contact_email',
    'Phone': 'phone',
    'Phone Number': 'phone',
    'Mobile': 'phone',
    'Contact': 'phone',
    'Department': 'branch',
    'Branch': 'branch',
    'Stream': 'branch',
    'CGPA': 'gpa',
    'GPA': 'gpa',
    'Grade': 'gpa',
    'Current CGPA': 'gpa',
    'Education': 'education',
    'Qualification': 'education',
    
    // Address details
    'Address': 'address',
    'City': 'city',
    'District': 'district',
    'State': 'state',
    'Pincode': 'pincode',
    'Pin Code': 'pincode',
    'Pin': 'pincode',
    'Country': 'country',
    
    // Academic details
    'Joining Year': 'joining_year',
    'Admission Year': 'joining_year',
    'Passout Year': 'passout_year',
    'Graduation Year': 'passout_year',
    'Completion Year': 'passout_year',
    'Date of Birth': 'date_of_birth',
    'DOB': 'date_of_birth',
    'Birth Date': 'date_of_birth',
    'Parent Contact': 'parent_contact',
    'Parent Phone': 'parent_contact',
    'Guardian Contact': 'parent_contact',
    'Skills': 'skills',
    'Technical Skills': 'skills',
    'College Name': 'college_name',
    'College': 'college_name',
    'Institution': 'college_name',
    
    // Semester CGPA details
    'Semester 1 CGPA': 'semester1_cgpa',
    'Sem 1 CGPA': 'semester1_cgpa',
    'Semester 2 CGPA': 'semester2_cgpa',
    'Sem 2 CGPA': 'semester2_cgpa',
    'Semester 3 CGPA': 'semester3_cgpa',
    'Sem 3 CGPA': 'semester3_cgpa',
    'Semester 4 CGPA': 'semester4_cgpa',
    'Sem 4 CGPA': 'semester4_cgpa',
    'Semester 5 CGPA': 'semester5_cgpa',
    'Sem 5 CGPA': 'semester5_cgpa',
    'Semester 6 CGPA': 'semester6_cgpa',
    'Sem 6 CGPA': 'semester6_cgpa',
    'Semester 7 CGPA': 'semester7_cgpa',
    'Sem 7 CGPA': 'semester7_cgpa',
    'Semester 8 CGPA': 'semester8_cgpa',
    'Sem 8 CGPA': 'semester8_cgpa',
    
    // Class X details
    'Class 10 CGPA': 'tenth_cgpa',
    '10th CGPA': 'tenth_cgpa',
    'Class 10 Percentage': 'tenth_percentage',
    '10th Percentage': 'tenth_percentage',
    'Class 10 Board': 'tenth_board',
    '10th Board': 'tenth_board',
    'Class 10 School': 'tenth_school',
    '10th School': 'tenth_school',
    'Class 10 Year': 'tenth_year_of_passing',
    '10th Year': 'tenth_year_of_passing',
    'Class 10 Location': 'tenth_location',
    '10th Location': 'tenth_location',
    'Class 10 Specialization': 'tenth_specialization',
    '10th Specialization': 'tenth_specialization',
    
    // Class XII details
    'Class 12 CGPA': 'twelfth_cgpa',
    '12th CGPA': 'twelfth_cgpa',
    'Class 12 Percentage': 'twelfth_percentage',
    '12th Percentage': 'twelfth_percentage',
    'Class 12 Board': 'twelfth_board',
    '12th Board': 'twelfth_board',
    'Class 12 School': 'twelfth_school',
    '12th School': 'twelfth_school',
    'Class 12 Year': 'twelfth_year_of_passing',
    '12th Year': 'twelfth_year_of_passing',
    'Class 12 Location': 'twelfth_location',
    '12th Location': 'twelfth_location',
    'Class 12 Stream': 'twelfth_specialization',
    '12th Stream': 'twelfth_specialization',
    'Class 12 Specialization': 'twelfth_specialization',
    
    // Arrears details
    'Active Arrears': 'active_arrears',
    'Activearrears': 'active_arrears',
    'Current Arrears': 'active_arrears',
    'Pending Arrears': 'active_arrears',
    'Total Arrears': 'arrears',
    'Arrears Count': 'arrears',
    'Arrears Total': 'arrears',
    'Arrears History': 'arrears_history',
    'Historical Arrears': 'arrears_history',
    'Cleared Arrears': 'arrears_history',
    'Previous Arrears': 'arrears_history',
  };

  // Reset all states to initial values
  const resetAllStates = () => {
    setSelectedFile(null);
    setIsProcessing(false);
    setProgress(0);
    setLogs([]);
    setExcelData(null);
    setPreviewData(null);
    setShowPreview(false);
    setSummary(null);
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addLog = (type, message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { type, message, timestamp }]);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        addLog('error', 'Please select a valid Excel file (.xlsx or .xls)');
        return;
      }
      
      // Reset previous states when new file is selected
      setProgress(0);
      setLogs([]);
      setExcelData(null);
      setPreviewData(null);
      setShowPreview(false);
      setSummary(null);
      
      setSelectedFile(file);
      addLog('info', `File selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  };

  const validateAndParseExcel = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            reject(new Error('Excel file is empty'));
            return;
          }

          // Check for mandatory Roll Number column
          const headers = Object.keys(jsonData[0]);
          const rollNumberColumn = headers.find(header => 
            Object.keys(COLUMN_MAPPINGS).some(mapping => 
              mapping.toLowerCase() === header.toLowerCase() && 
              COLUMN_MAPPINGS[mapping] === 'student_id'
            )
          );

          if (!rollNumberColumn) {
            reject(new Error('Roll Number column is mandatory. Please include a column with roll numbers.'));
            return;
          }

          addLog('success', `Excel file parsed successfully. Found ${jsonData.length} rows.`);
          addLog('info', `Detected columns: ${headers.join(', ')}`);
          addLog('success', `Roll Number column found: ${rollNumberColumn}`);

          resolve({
            data: jsonData,
            headers: headers,
            rollNumberColumn: rollNumberColumn
          });
        } catch (error) {
          reject(new Error(`Failed to parse Excel file: ${error.message}`));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsBinaryString(file);
    });
  };

  const mapExcelData = (excelData) => {
    const mappedData = [];
    const unmappedColumns = [];

    excelData.data.forEach((row, index) => {
      const mappedRow = {};
      let hasValidData = false;

      Object.entries(row).forEach(([excelColumn, value]) => {
        const mappedColumn = Object.keys(COLUMN_MAPPINGS).find(key => 
          key.toLowerCase() === excelColumn.toLowerCase()
        );

        if (mappedColumn) {
          const dbColumn = COLUMN_MAPPINGS[mappedColumn];
          if (value !== null && value !== undefined && value !== '') {
            // Handle name splitting for 'name' field
            if (dbColumn === 'name' && typeof value === 'string') {
              const nameParts = value.trim().split(' ');
              mappedRow['first_name'] = nameParts[0] || '';
              mappedRow['last_name'] = nameParts.slice(1).join(' ') || '';
            } else {
              mappedRow[dbColumn] = value;
            }
            hasValidData = true;
          }
        } else {
          if (!unmappedColumns.includes(excelColumn)) {
            unmappedColumns.push(excelColumn);
          }
        }
      });

      if (hasValidData && mappedRow.student_id) {
        mappedData.push({
          rowIndex: index + 2, // +2 because Excel is 1-indexed and has header
          data: mappedRow
        });
      }
    });

    if (unmappedColumns.length > 0) {
      addLog('warning', `Unmapped columns (will be ignored): ${unmappedColumns.join(', ')}`);
    }

    return mappedData;
  };

  const processExcelFile = async () => {
    if (!selectedFile) {
      addLog('error', 'Please select an Excel file first');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setLogs([]);
    setSummary(null);
    setShowPreview(false);
    setExcelData(null);
    setPreviewData(null);

    try {
      // Step 1: Parse Excel file
      addLog('info', 'Parsing Excel file...');
      setProgress(10);
      
      const excelData = await validateAndParseExcel(selectedFile);
      setExcelData(excelData);

      // Step 2: Map data
      addLog('info', 'Mapping Excel columns to database fields...');
      setProgress(20);
      
      const mappedData = mapExcelData(excelData);
      addLog('success', `Successfully mapped ${mappedData.length} rows for processing`);

      // Step 3: Show preview
      setPreviewData(mappedData.slice(0, 5)); // Show first 5 rows for preview
      setShowPreview(true);
      setProgress(30);

    } catch (error) {
      addLog('error', error.message);
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeUpdate = async () => {
    if (!excelData || !previewData) return;

    setIsProcessing(true);
    setShowPreview(false);
    
    const mappedData = mapExcelData(excelData);
    const totalRecords = mappedData.length;
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors = [];

    addLog('info', `Starting update process for ${totalRecords} records...`);

    const token = getAuthToken();
    if (!token) {
      addLog('error', 'Authentication token not found. Please login again.');
      setIsProcessing(false);
      return;
    }

    try {
      for (let i = 0; i < mappedData.length; i++) {
        const { rowIndex, data } = mappedData[i];
        const progress = Math.round(((i + 1) / totalRecords) * 70) + 30; // 30-100%
        setProgress(progress);

        try {
          // Find student by roll number
          const response = await studentsAPI.getStudents({
            search: data.student_id,
            page_size: 1
          });

          if (response.data.length === 0) {
            skippedCount++;
            addLog('warning', `Row ${rowIndex}: Student with Roll Number "${data.student_id}" not found - skipped`);
            continue;
          }

          const student = response.data[0];
          
          // Prepare update data (remove student_id from update as it's the identifier)
          const updateData = { ...data };
          delete updateData.student_id;

          // Update student
          await studentsAPI.updateStudent(student.id, updateData);
          successCount++;
          addLog('success', `Row ${rowIndex}: Updated student ${data.student_id} successfully`);

        } catch (error) {
          errorCount++;
          const errorMsg = `Row ${rowIndex}: Failed to update ${data.student_id} - ${error.message}`;
          addLog('error', errorMsg);
          errors.push(errorMsg);
        }

        // Add a small delay to prevent overwhelming the server
        if (i < mappedData.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Final summary
      const summaryData = {
        total: totalRecords,
        success: successCount,
        errors: errorCount,
        skipped: skippedCount,
        errorDetails: errors
      };

      setSummary(summaryData);
      setProgress(100);
      
      addLog('info', '=== UPDATE SUMMARY ===');
      addLog('success', `✅ Successfully updated: ${successCount} students`);
      addLog('error', `❌ Failed updates: ${errorCount} students`);
      addLog('warning', `⚠️ Skipped (not found): ${skippedCount} students`);
      addLog('info', `📊 Total processed: ${totalRecords} records`);

    } catch (error) {
      addLog('error', `Fatal error during update process: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewUpload = () => {
    resetAllStates();
    addLog('info', 'Ready for new file upload');
  };

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        'Roll Number': 'CS2021001',
        'First Name': 'John',
        'Last Name': 'Doe',
        'Gender': 'Male',
        'Email': 'john.doe@example.com',
        'Phone': '9876543210',
        'Department': 'Computer Science',
        'CGPA': '8.5',
        'Joining Year': '2021',
        'Passout Year': '2025',
        'Date of Birth': '2000-05-15',
        'Address': '123 Main Street',
        'City': 'Mumbai',
        'State': 'Maharashtra',
        'Pincode': '400001',
        'Skills': 'Java, Python, React',
        'College Name': 'ABC Engineering College',
        'Semester 1 CGPA': '8.2',
        'Semester 2 CGPA': '8.4',
        'Semester 3 CGPA': '8.6',
        'Semester 4 CGPA': '8.8',
        'Class 10 CGPA': '9.2',
        'Class 10 Percentage': '92',
        'Class 10 Board': 'CBSE',
        'Class 10 School': 'City High School',
        'Class 10 Year': '2018',
        'Class 12 CGPA': '8.9',
        'Class 12 Percentage': '89',
        'Class 12 Board': 'CBSE',
        'Class 12 School': 'City Senior Secondary School',
        'Class 12 Year': '2020',
        'Class 12 Stream': 'Science',
        'Active Arrears': '0',
        'Total Arrears': '2',
        'Arrears History': '2'
      },
      {
        'Roll Number': 'EC2021002',
        'First Name': 'Jane',
        'Last Name': 'Smith',
        'Gender': 'Female',
        'Email': 'jane.smith@example.com',
        'Phone': '9876543211',
        'Department': 'Electronics',
        'CGPA': '9.0',
        'Joining Year': '2021',
        'Passout Year': '2025',
        'Date of Birth': '2000-08-20',
        'Address': '456 Park Avenue',
        'City': 'Delhi',
        'State': 'Delhi',
        'Pincode': '110001',
        'Parent Contact': '9876543212',
        'Skills': 'C++, Embedded Systems, IoT',
        'College Name': 'XYZ Technical Institute',
        'Semester 1 CGPA': '8.8',
        'Semester 2 CGPA': '9.0',
        'Semester 3 CGPA': '9.1',
        'Semester 4 CGPA': '9.2',
        'Class 10 CGPA': '9.5',
        'Class 10 Percentage': '95',
        'Class 10 Board': 'ICSE',
        'Class 10 School': 'Delhi Public School',
        'Class 10 Year': '2018',
        'Class 12 CGPA': '9.3',
        'Class 12 Percentage': '93',
        'Class 12 Board': 'ICSE',
        'Class 12 School': 'Delhi Public School',
        'Class 12 Year': '2020',
        'Class 12 Stream': 'Science',
        'Active Arrears': '1',
        'Total Arrears': '3',
        'Arrears History': '2'
      },
      {
        'Roll Number': 'ME2021003',
        'First Name': 'Raj',
        'Last Name': 'Kumar',
        'Gender': 'Male',
        'Email': 'raj.kumar@example.com',
        'Phone': '9876543213',
        'Department': 'Mechanical',
        'CGPA': '7.8',
        'Joining Year': '2021',
        'Passout Year': '2025',
        'Date of Birth': '2000-12-10',
        'Address': '789 Industrial Area',
        'City': 'Pune',
        'State': 'Maharashtra',
        'Pincode': '411001',
        'Skills': 'CAD, SolidWorks, Manufacturing',
        'College Name': 'PQR Engineering College',
        'Semester 1 CGPA': '7.5',
        'Semester 2 CGPA': '7.7',
        'Semester 3 CGPA': '7.9',
        'Semester 4 CGPA': '8.0',
        'Class 10 CGPA': '8.5',
        'Class 10 Percentage': '85',
        'Class 10 Board': 'State Board',
        'Class 10 School': 'State High School',
        'Class 10 Year': '2018',
        'Class 12 CGPA': '8.2',
        'Class 12 Percentage': '82',
        'Class 12 Board': 'State Board',
        'Class 12 School': 'State Senior Secondary',
        'Class 12 Year': '2020',
        'Class 12 Stream': 'Science',
        'Active Arrears': '2',
        'Total Arrears': '5',
        'Arrears History': '3'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'student_update_template.xlsx');
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-800 ml-4">Update Student Data</h1>
        </div>
        
        {/* New Upload Button - Show after summary is available */}
        {summary && (
          <button
            onClick={handleNewUpload}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload New File
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Upload Section */}
        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Instructions
            </h2>
            
            <div className="space-y-3 text-sm text-blue-700">
              <p><strong>Requirements:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Only one File can be processed at a time</strong></li>
                <li><strong>Roll Number column is mandatory</strong> (will be used to match existing students)</li>
                <li>Only existing students will be updated (no new students created)</li>
                <li>Excel files (.xlsx, .xls) are supported</li>
                <li>Any number of columns can be included</li>
              </ul>
              
              <p className="mt-4"><strong>Supported Column Names:</strong></p>
              <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3 rounded border">
                <div>
                  <p className="font-medium">Identity:</p>
                  <p>Roll Number, Student ID</p>
                  <p className="font-medium mt-2">Basic Info:</p>
                  <p>First Name, Last Name, Name, Gender</p>
                  <p>Email, Phone, Department, CGPA</p>
                  <p>Joining Year, Passout Year, DOB</p>
                  <p>Address, City, State, Pincode</p>
                  <p>Skills, College Name, Education</p>
                  <p className="font-medium mt-2">Semester CGPA:</p>
                  <p>Semester 1-8 CGPA</p>
                  <p className="font-medium mt-2">Arrears:</p>
                  <p>Active Arrears, Total Arrears, Arrears History</p>
                </div>
                <div>
                  <p className="font-medium">Class X Details:</p>
                  <p>Class 10 CGPA, Percentage, Board</p>
                  <p>Class 10 School, Year, Location</p>
                  <p className="font-medium mt-2">Class XII Details:</p>
                  <p>Class 12 CGPA, Percentage, Board</p>
                  <p>Class 12 School, Year, Stream</p>
                  <p className="font-medium mt-2">Additional:</p>
                  <p>Parent Contact, District, Country</p>
                  <p>Date of Birth, Technical Skills</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={downloadSampleTemplate}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Sample Template
            </button>
          </div>

          {/* File Upload */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload Excel File</h2>
            
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isProcessing 
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
                    : 'border-gray-300 hover:border-blue-400'
                }`}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
              >
                <Upload className={`w-12 h-12 mx-auto mb-4 ${
                  isProcessing ? 'text-gray-300' : 'text-gray-400'
                }`} />
                <p className={`${isProcessing ? 'text-gray-400' : 'text-gray-600'}`}>
                  {isProcessing ? 'Processing...' : 'Click to select Excel file or drag and drop'}
                </p>
                <p className="text-sm text-gray-500 mt-2">Supports .xlsx and .xls files</p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                disabled={isProcessing}
                className="hidden"
              />
              
              {selectedFile && (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium text-green-800">{selectedFile.name}</p>
                    <p className="text-sm text-green-600">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={processExcelFile}
                  disabled={!selectedFile || isProcessing || showPreview}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {isProcessing ? 'Processing...' : 'Process File'}
                </button>
                
                {(selectedFile || logs.length > 0) && !isProcessing && (
                  <button
                    onClick={resetAllStates}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {(isProcessing || progress > 0) && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Progress</h3>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">{progress}% complete</p>
              {isProcessing && (
                <p className="text-xs text-blue-600 mt-2">
                  Please wait while we process your file...
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Logs and Preview */}
        <div className="space-y-6">
          {/* Preview Modal */}
          {showPreview && previewData && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Preview Data (First 5 rows)</h3>
              <div className="overflow-x-auto mb-4">
                <table className="min-w-full text-sm border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 border text-left">Row</th>
                      <th className="px-3 py-2 border text-left">Roll Number</th>
                      <th className="px-3 py-2 border text-left">Fields to Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 border">{row.rowIndex}</td>
                        <td className="px-3 py-2 border font-medium">{row.data.student_id}</td>
                        <td className="px-3 py-2 border">
                          {Object.keys(row.data).filter(key => key !== 'student_id').join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={executeUpdate}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isProcessing ? 'Updating...' : 'Confirm & Update'}
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Update Summary</h3>
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Process Complete
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{summary.success}</div>
                  <div className="text-sm text-green-700">Updated</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{summary.errors}</div>
                  <div className="text-sm text-red-700">Errors</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{summary.skipped}</div>
                  <div className="text-sm text-yellow-700">Skipped</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{summary.total}</div>
                  <div className="text-sm text-blue-700">Total</div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  Upload completed! You can now upload a new file or go back to student management.
                </p>
              </div>
            </div>
          )}

          {/* Logs */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Activity Log</h3>
              {logs.length > 0 && (
                <button
                  onClick={() => setLogs([])}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear Logs
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-sm">No activity yet. Upload an Excel file to begin.</p>
              ) : (
                logs.map((log, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                      log.type === 'success' ? 'bg-green-50 text-green-800' :
                      log.type === 'error' ? 'bg-red-50 text-red-800' :
                      log.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                      'bg-blue-50 text-blue-800'
                    }`}
                  >
                    {log.type === 'success' && <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                    {log.type === 'error' && <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                    {log.type === 'warning' && <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                    {log.type === 'info' && <RefreshCw className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                    <div className="flex-1">
                      <p>{log.message}</p>
                      <p className="text-xs opacity-70">{log.timestamp}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
