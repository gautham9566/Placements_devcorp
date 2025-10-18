import React from 'react';
import Link from 'next/link';
import SearchBar from '../SearchBar';

const Header = ({ onFilterChange, onSortChange, currentFilter, currentSort, onSearchChange, searchTerm }) => {
  const filters = ['All', 'Published', 'Drafts', 'Scheduled'];
  const sorts = ['Date'];

  return (
    <div className="flex justify-between items-center mb-4">
      <h1 className="text-2xl font-bold text-white">Uploaded Videos</h1>
      <div className="flex items-center space-x-4">
        <SearchBar
          placeholder="Search videos..."
          value={searchTerm}
          onChange={onSearchChange}
          variant="admin"
        />
        <div className="flex items-center space-x-2">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`px-4 py-2 rounded-lg ${currentFilter === f ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              {f}
            </button>
          ))}
          <button
            onClick={() => onSortChange('Date')}
            className={`px-4 py-2 rounded-lg ${currentSort === 'Date' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            Sort by Date
          </button>
        </div>
        <Link href="/admin/videos/upload" className="bg-blue-500 text-white px-4 py-2 rounded-lg">
          Add New Video
        </Link>
      </div>
    </div>
  );
};

export default Header;
