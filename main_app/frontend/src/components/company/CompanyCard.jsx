import React, { useState } from 'react';

export function CompanyCard({ company, onClick }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="bg-gray-100 p-4 rounded-xl shadow w-full hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded bg-gray-300 flex items-center justify-center text-sm font-semibold text-gray-600 overflow-hidden">
          {!imgError ? (
            <img
              src={company.Logo}
              alt="Logo"
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <span>Logo</span>
          )}
        </div>
        <div>
          <h3
            onClick={() => onClick(company)}
            className="text-lg font-semibold text-blue-500 cursor-pointer hover:underline"
          >
            {company.companyName}
          </h3>
          <p className="text-sm text-gray-500">{company.companyDescription}</p>
        </div>
      </div>
      <div className="mt-3 text-sm text-gray-700">
        <p>
          {company.totalActiveJobs} Active Listing, {company.awaitedApproval} Awaiting Approval
        </p><br></br>
        <p className="text-gray-500">{company.location}</p>
      </div>
    </div>
  );
} 