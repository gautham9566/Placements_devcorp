import React from 'react';

export function JobFilters({
  typeFilter,
  setTypeFilter,
  minCTC,
  setMinCTC,
  maxCTC,
  setMaxCTC,
  minStipend,
  setMinStipend,
  maxStipend,
  setMaxStipend,
  deadlineFilter,
  setDeadlineFilter
}) {
  const resetFilters = () => {
    setTypeFilter('All');
    setMinCTC('');
    setMaxCTC('');
    setMinStipend('');
    setMaxStipend('');
    setDeadlineFilter('');
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Job Type */}
      <select
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        className="w-[100px] px-2 py-2 text-sm rounded-md border border-gray-300 bg-gray-100"
      >
        <option value="All">All</option>
        <option value="Full-Time">Full-Time</option>
        <option value="Internship">Intern</option>
      </select>

      {/* CTC */}
      <input
        type="number"
        placeholder="Min CTC"
        value={minCTC}
        onChange={(e) => setMinCTC(e.target.value)}
        className="w-[90px] px-2 py-2 text-sm rounded-md border border-gray-300 bg-gray-100"
      />
      <input
        type="number"
        placeholder="Max CTC"
        value={maxCTC}
        onChange={(e) => setMaxCTC(e.target.value)}
        className="w-[90px] px-2 py-2 text-sm rounded-md border border-gray-300 bg-gray-100"
      />

      {/* Stipend */}
      <input
        type="number"
        placeholder="Min Stipend"
        value={minStipend}
        onChange={(e) => setMinStipend(e.target.value)}
        className="w-[120px] px-2 py-2 text-sm rounded-md border border-gray-300 bg-gray-100"
      />
      <input
        type="number"
        placeholder="Max Stipend"
        value={maxStipend}
        onChange={(e) => setMaxStipend(e.target.value)}
        className="w-[120px] px-2 py-2 text-sm rounded-md border border-gray-300 bg-gray-100"
      />

      {/* Deadline */}
      <input
        type="date"
        value={deadlineFilter}
        onChange={(e) => setDeadlineFilter(e.target.value)}
        className="w-[140px] px-2 py-2 text-sm rounded-md border border-gray-300 bg-gray-100"
      />

      {/* Reset Filters Button */}
      <button
        onClick={resetFilters}
        className="px-3 py-2 text-sm font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex-shrink-0"
      >
        Reset
      </button>
    </div>
  );
} 