import React from 'react';

export function JobTable({ jobs = [], onTogglePublish }) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6M8 8v10m8-10v10" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-500 mb-2">No job listings found</h3>
        <p className="text-sm text-gray-400">Job listings will appear here once they are created</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm text-left border-collapse">
        <thead className="bg-gray-50 text-gray-700 sticky top-0">
          <tr>
            <th className="px-4 py-3 font-medium">Company</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">CTC</th>
            <th className="px-4 py-3 font-medium">Stipend</th>
            <th className="px-4 py-3 font-medium">Deadline</th>
            <th className="px-4 py-3 font-medium">Status</th>
            {onTogglePublish && <th className="px-4 py-3 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {jobs.map((job, index) => (
            <tr
              key={index}
              className="hover:bg-gray-50 transition-colors"
            >
              <td className="px-4 py-4 font-medium text-gray-900">{job.companyName}</td>
              <td className="px-4 py-4 text-gray-700">{job.title}</td>
              <td className="px-4 py-4">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  job.type === 'Full-Time' 
                    ? 'bg-green-100 text-green-800' 
                    : job.type === 'Internship'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {job.type}
                </span>
              </td>
              <td className="px-4 py-4 text-gray-700">
                {job.ctc ? `${job.ctc} LPA` : '-'}
              </td>
              <td className="px-4 py-4 text-gray-700">
                {job.stipend ? `${job.stipend} INR ` : '-'}
              </td>
              <td className="px-4 py-4 text-gray-700">{job.deadline || job.application_deadline}</td>
              <td className="px-4 py-4">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  job.is_published 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {job.is_published ? 'Published' : 'To be Published'}
                </span>
              </td>
              {onTogglePublish && (
                <td className="px-4 py-4">
                  <button
                    onClick={() => onTogglePublish(job.id, job.is_published)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      job.is_published
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {job.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 