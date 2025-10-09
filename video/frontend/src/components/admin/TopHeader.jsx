import React from 'react';

const TopHeader = ({ onSearchChange, searchTerm }) => {
  return (
    <header className="bg-gray-900 bg-opacity-60 backdrop-blur-sm border-b border-gray-800/60 px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left side - Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded flex items-center justify-center">
            <span className="text-black font-bold text-xl">D</span>
          </div>
          <h1 className="text-xl font-semibold text-white">DevCorp</h1>
        </div>

        {/* Center - Search bar */}
        <div className="flex-1 max-w-2xl mx-90">
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 000 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-800 bg-opacity-30 text-white placeholder-gray-400 border border-gray-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;