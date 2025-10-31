import React, { useState } from 'react';

function StatCard({ label, value }) {
  return (
    <div className="bg-gray-100 rounded-lg p-4 text-center shadow">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}

export function CompanyDetailsModal({ company, onClose }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-none flex items-center justify-center">
      <div className="bg-white w-full max-w-4xl rounded-xl p-6 relative shadow-2xl border">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-600 text-xl hover:text-black"
        >
          &times;
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 border-b pb-4">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
            {!imgError ? (
              <img
                src={company.Logo}
                alt="Logo"
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="text-sm text-gray-500">Logo</span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">{company.companyName}</h2>
            <p className="text-sm text-gray-500">{company.companyDescription}</p>
            <p className="text-sm text-gray-500">{company.location}</p>
            <p className="text-sm text-gray-500">{company.employeeCount} Employees</p>
            <a
              href={company.website}
              className="text-blue-500 underline text-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              {company.website}
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 my-6">
          <StatCard label="Total Active Jobs" value={company.totalActiveJobs} />
          <StatCard label="Total Applicants" value={company.totalApplicants} />
          <StatCard label="Total Hired" value={company.totalHired} />
          <StatCard label="Waiting for Approval" value={company.awaitedApproval} />
          <StatCard label="Other Stat" value="..." />
        </div>

        {/* Active Listings */}
        <div>
          <h3 className="font-semibold text-lg mb-2">Active Listing</h3>
          <table className="w-full table-auto text-sm">
            <thead>
              <tr className="text-left bg-gray-100">
                <th className="p-2">Title</th>
                <th className="p-2">Type</th>
                <th className="p-2">CTC</th>
                <th className="p-2">Stipend</th>
                <th className="p-2">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {(company.activeListingsData || []).map((listing, i) => (
                <tr
                  key={i}
                  className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} text-left`}
                >
                  <td className="p-2">{listing.title}</td>
                  <td className="p-2">{listing.type}</td>
                  <td className="px-4 py-4 text-gray-700">
                    {listing.ctc ? `${listing.ctc} LPA` : '-'}
                  </td>
                  <td className="px-4 py-4 text-gray-700">
                    {listing.stipend ? `${listing.stipend} INR ` : '-'}
                  </td>
                  <td className="p-2">{listing.deadline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 