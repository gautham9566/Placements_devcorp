'use client';

import { Eye, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import StatusBadge from '../../../../components/applications/StatusBadge';

export default function ApplicationsTable({ 
  applications, 
  onViewApplication, 
  onDeleteApplication 
}) {
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Ensure applications is always an array
  const safeApplications = Array.isArray(applications) ? applications : [];

  const toggleRowSelection = (applicationId) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(applicationId)) {
      newSelection.delete(applicationId);
    } else {
      newSelection.add(applicationId);
    }
    setSelectedRows(newSelection);
    setShowBulkActions(newSelection.size > 0);
  };

  const toggleAllSelection = () => {
    if (selectedRows.size === safeApplications.length) {
      setSelectedRows(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedRows(new Set(safeApplications.map(app => app.id)));
      setShowBulkActions(true);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="overflow-x-auto">
      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="flex items-center justify-between bg-blue-50 border-b border-blue-200 px-6 py-3">
          <span className="text-sm text-blue-700">
            {selectedRows.size} application{selectedRows.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
              Bulk Status Update
            </button>
            <button className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">
              Bulk Delete
            </button>
          </div>
        </div>
      )}

      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left">
              <input
                type="checkbox"
                checked={selectedRows.size === safeApplications.length && safeApplications.length > 0}
                onChange={toggleAllSelection}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Student
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Job Title
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Company
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Applied Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {safeApplications.map((application) => (
            <tr 
              key={application.id}
              className={`hover:bg-gray-50 ${
                selectedRows.has(application.id) ? 'bg-blue-50' : ''
              }`}
            >
              <td className="px-6 py-4">
                <input
                  type="checkbox"
                  checked={selectedRows.has(application.id)}
                  onChange={() => toggleRowSelection(application.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {application.student_name?.charAt(0) || 'U'}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {application.student_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {application.student_email}
                    </div>
                    <div className="text-xs text-gray-400">
                      ID: {application.student_id}
                    </div>
                  </div>
                </div>
              </td>
              
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900">
                  {application.job_title}
                </div>
                <div className="text-sm text-gray-500">
                  {application.job_location}
                </div>
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {application.company_name}
                </div>
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={application.status} />
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(application.applied_at)}
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onViewApplication(application)}
                    className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </button>
                  
                  <button
                    onClick={() => onDeleteApplication(application.id)}
                    className="inline-flex items-center px-2 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 