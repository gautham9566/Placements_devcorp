'use client';

import { useState, useEffect } from 'react';
import { X, Download, RefreshCw } from 'lucide-react';
import { useNotification } from '../../../../contexts/NotificationContext';
import client from '../../../../api/client';

export default function ExportModal({ onClose, filters }) {
  const { showSuccess, showError, handleApiError } = useNotification();
  const [exportFormat, setExportFormat] = useState('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState(true);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [exportColumns, setExportColumns] = useState([
    'student_name',
    'student_email',
    'job_title',
    'company_name',
    'status',
    'applied_at'
  ]);

  // Fetch available columns including dynamic fields
  useEffect(() => {
    const fetchAvailableColumns = async () => {
      try {
        setLoadingColumns(true);
        const jobId = filters?.job_id;
        const response = await client.get(`/api/v1/jobs/applications/export/${jobId ? `?job_id=${jobId}` : ''}`);
        
        if (response.data && response.data.all) {
          setAvailableColumns(response.data.all);
          
          // Set default columns if none selected
          if (exportColumns.length === 6) { // Only if still using defaults
            const defaultColumns = response.data.standard
              .filter(col => ['student_name', 'student_email', 'job_title', 'company_name', 'status', 'applied_at'].includes(col.key))
              .map(col => col.key);
            setExportColumns(defaultColumns);
          }
        }
      } catch (error) {
        console.error('Failed to fetch available columns:', error);
        // Fallback to basic columns
        setAvailableColumns([
          { key: 'student_name', label: 'Student Name', category: 'student' },
          { key: 'student_email', label: 'Email', category: 'student' },
          { key: 'student_id', label: 'Student ID', category: 'student' },
          { key: 'job_title', label: 'Job Title', category: 'job' },
          { key: 'company_name', label: 'Company', category: 'job' },
          { key: 'status', label: 'Status', category: 'application' },
          { key: 'applied_at', label: 'Applied Date', category: 'application' },
          { key: 'current_cgpa', label: 'CGPA', category: 'academic' },
          { key: 'branch', label: 'Branch', category: 'student' }
        ]);
      } finally {
        setLoadingColumns(false);
      }
    };

    fetchAvailableColumns();
  }, [filters?.job_id]);

  const handleExport = async () => {
    if (exportColumns.length === 0) {
      showError('Export Error', 'Please select at least one column to export.');
      return;
    }

    setIsExporting(true);
    
    try {
      // Prepare export request payload with proper filter transformation
      const exportData = {
        format: exportFormat,
        columns: exportColumns,
      };

      // Transform filters to match backend expectations
      if (filters) {
        // Only include valid filters and transform them appropriately
        if (filters.job_id) {
          exportData.job_id = parseInt(filters.job_id);
        }
        
        if (filters.status && filters.status !== 'ALL') {
          exportData.status = [filters.status]; // Backend expects array
        }
        
        if (filters.date_from) {
          exportData.date_from = filters.date_from;
        }
        
        if (filters.date_to) {
          exportData.date_to = filters.date_to;
        }
        
        // Note: Other filters like company, job_title, student_name are handled differently in the backend
        // They are applied at the queryset level, not in the export configuration
      }

      console.log('Export request payload:', exportData);
      console.log('Current filters passed to export:', filters);

      // Make API request to export endpoint using the client
      const response = await client.post('/api/v1/jobs/applications/export/', exportData, {
        responseType: 'blob'
      });

      // Handle file download
      const blob = response.data;
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `applications_export.${exportFormat}`;

      // Show success message with application count for CSV files
      if (exportFormat === 'csv') {
        try {
          const text = await blob.text();
          const lines = text.split('\n');
          const applicationCount = lines.length - 2; // Subtract header line

          console.log(`Exported ${applicationCount} applications to CSV`);

          showSuccess(
            'Export Successful',
            `Your ${exportFormat.toUpperCase()} file has been downloaded with ${applicationCount} applications.`
          );
        } catch (previewError) {
          console.error('Error reading CSV content:', previewError);
          showSuccess('Export Successful', `Your ${exportFormat.toUpperCase()} file has been downloaded.`);
        }
      } else {
        showSuccess('Export Successful', `Your ${exportFormat.toUpperCase()} file has been downloaded.`);
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      onClose();

    } catch (error) {
      console.error('Export error:', error);

      // Provide specific error messages
      if (error.response?.status === 401) {
        showError('Authentication Error', 'You need to be logged in as an admin to export data. Please log in and try again.');
      } else if (error.response?.status === 403) {
        showError('Permission Error', 'You do not have permission to export applications data.');
      } else if (error.response?.status === 500) {
        showError('Server Error', 'There was a server error while generating the export. Please try again later.');
      } else {
        handleApiError(error, 'export');
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Export Applications</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Information Notice */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Export Information</h3>
                <p className="mt-1 text-sm text-blue-700">
                  This will export <strong>ALL applications</strong> that match your current filters{filters?.job_id ? ` (including Job ID: ${filters.job_id})` : ''}, not just the ones visible on this page.
                  The export contains real-time data from the database.
                </p>
              </div>
            </div>
          </div>

          {/* Export Format */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Export Format
            </label>
            <div className="flex gap-3">
              {['csv', 'excel', 'pdf'].map(format => (
                <label key={format} className="flex items-center">
                  <input
                    type="radio"
                    name="format"
                    value={format}
                    checked={exportFormat === format}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="mr-2"
                  />
                  {format.toUpperCase()}
                </label>
              ))}
            </div>
          </div>

          {/* Column Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Columns to Export
            </label>
            <p className="text-sm text-gray-600 mb-4">Choose which fields to include in your export file.</p>
            
            {loadingColumns ? (
              <div className="flex items-center justify-center py-8 border rounded-lg">
                <RefreshCw className="w-5 h-5 text-gray-400 animate-spin mr-2" />
                <span className="text-gray-600">Loading available columns...</span>
              </div>
            ) : (
              <>
                <div className="space-y-4 max-h-64 overflow-y-auto border rounded-lg p-3">
                  {/* Group columns by category */}
                  {['student', 'job', 'application', 'academic', 'contact', 'additional'].map(category => {
                    const categoryColumns = availableColumns.filter(col => col.category === category);
                    if (categoryColumns.length === 0) return null;
                    
                    const categoryLabels = {
                      student: 'Student Information',
                      job: 'Job Details',
                      application: 'Application Data',
                      academic: 'Academic Information',
                      contact: 'Contact Information',
                      additional: 'Additional Fields'
                    };
                    
                    return (
                      <div key={category} className="mb-4">
                        <h4 className="text-sm font-medium text-gray-800 mb-2 border-b border-gray-200 pb-1">
                          {categoryLabels[category]}
                        </h4>
                        <div className="space-y-1">
                          {categoryColumns.map((column) => (
                            <label key={column.key} className="flex items-center space-x-3 p-1 hover:bg-gray-50 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={exportColumns.includes(column.key)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setExportColumns(prev => [...prev, column.key]);
                                  } else {
                                    setExportColumns(prev => prev.filter(col => col !== column.key));
                                  }
                                }}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700 flex-1">{column.label}</span>
                              {column.type && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                  {column.type}
                                </span>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex justify-between text-sm text-gray-600">
                  <span>{exportColumns.length} columns selected</span>
                  <div className="space-x-2">
                    <button
                      type="button"
                      onClick={() => setExportColumns([])}
                      className="text-gray-600 hover:text-gray-700"
                    >
                      Clear All
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportColumns(availableColumns.map(col => col.key))}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Select All
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={exportColumns.length === 0 || isExporting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 