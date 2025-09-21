'use client';

import { useState, useEffect } from 'react';
import { X, Save, User, Briefcase, Calendar, FileText, FileCheck, Download } from 'lucide-react';
import StatusBadge from '../../../../components/applications/StatusBadge';
import { getApplication } from '../../../../api/applications';

export default function ApplicationDetailModal({ application, onClose, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    status: application?.status || 'APPLIED',
    admin_notes: application?.admin_notes || ''
  });
  const [detailedApplication, setDetailedApplication] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch detailed application data including job's additional fields
  useEffect(() => {
    const fetchDetailedApplication = async () => {
      if (!application?.id) return;
      
      try {
        setLoading(true);
        const response = await getApplication(application.id);
        setDetailedApplication(response.data);
      } catch (error) {
        console.error('Failed to fetch detailed application:', error);
        // Fallback to basic application data
        setDetailedApplication(application);
      } finally {
        setLoading(false);
      }
    };

    fetchDetailedApplication();
  }, [application?.id]);

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Saving application:', editData);
    alert('Save functionality will be implemented in the next phase');
    setIsEditing(false);
    if (onUpdate) onUpdate();
  };

  if (!application) return null;

  // Use detailed application data if available, otherwise fallback to basic data
  const appData = detailedApplication || application;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderAdditionalField = (field, value) => {
    const displayValue = () => {
      if (!value && value !== 0) return 'Not provided';
      
      switch (field.type) {
        case 'file':
          if (typeof value === 'string' && value.startsWith('/media/')) {
            return (
              <a 
                href={value} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                View File
              </a>
            );
          }
          return value || 'No file uploaded';
        case 'multiple_choice':
          return value || 'Not selected';
        case 'number':
          return value || 'Not provided';
        case 'text':
        default:
          return value || 'Not provided';
      }
    };

    return (
      <div key={field.id || field.label} className="flex justify-between items-start text-sm py-2 border-b border-gray-100 last:border-b-0">
        <div className="flex-1">
          <span className="font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </span>
          {field.type && (
            <span className="text-xs text-gray-500 ml-2">({field.type})</span>
          )}
        </div>
        <div className="flex-1 text-right">
          {displayValue()}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Application Details - {appData.student_name}
          </h2>
          <div className="flex items-center gap-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading application details...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Student Information */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <User className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Student Information</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Name</label>
                    <p className="text-gray-900">{appData.student_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-gray-900">{appData.student_email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Student ID</label>
                    <p className="text-gray-900">{appData.student_id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Branch</label>
                    <p className="text-gray-900">{appData.branch}</p>
                  </div>
                </div>
              </div>

              {/* Job Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Briefcase className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Job Information</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Job Title</label>
                    <p className="text-gray-900">{appData.job_title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Company</label>
                    <p className="text-gray-900">{appData.company_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Location</label>
                    <p className="text-gray-900">{appData.job_location}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Application Details */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Application Details</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Applied Date</label>
                    <p className="text-gray-900">{formatDate(appData.applied_at)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    {isEditing ? (
                      <select
                        value={editData.status}
                        onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="APPLIED">Applied</option>
                        <option value="UNDER_REVIEW">Under Review</option>
                        <option value="SHORTLISTED">Shortlisted</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="HIRED">Hired</option>
                      </select>
                    ) : (
                      <div className="mt-1">
                        <StatusBadge status={appData.status} />
                      </div>
                    )}
                  </div>
                  {appData.cover_letter && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Cover Letter</label>
                      <p className="text-gray-900 text-sm bg-white p-3 rounded border">
                        {appData.cover_letter}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Fields */}
              {appData.job_additional_fields && appData.job_additional_fields.length > 0 && appData.custom_responses && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <FileCheck className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Additional Information</h3>
                  </div>
                  <div className="space-y-1">
                    {appData.job_additional_fields.map((field) => {
                      const fieldKey = `field_${field.id}`;
                      const value = appData.custom_responses[fieldKey] || appData.custom_responses[field.id] || appData.custom_responses[field.label];
                      return renderAdditionalField(field, value);
                    })}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Admin Notes</h3>
                </div>
                {isEditing ? (
                  <textarea
                    value={editData.admin_notes}
                    onChange={(e) => setEditData({ ...editData, admin_notes: e.target.value })}
                    placeholder="Add internal notes about this application..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">
                    {appData.admin_notes || 'No admin notes yet.'}
                  </p>
                )}
              </div>

              {/* Status History */}
              {appData.status_history && appData.status_history.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Status History</h3>
                  <div className="space-y-2">
                    {appData.status_history.map((change, index) => (
                      <div key={index} className="text-sm bg-white p-2 rounded">
                        <span className="font-medium">{change.from_status}</span> → <span className="font-medium">{change.to_status}</span>
                        <span className="text-gray-500 ml-2">{formatDate(change.changed_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
} 