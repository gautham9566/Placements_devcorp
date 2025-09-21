import React, { useState, useEffect } from 'react';

export function PaginatedList({ items = [], renderItem, itemsPerPage = 15, searchQuery = '', chunkItems = false }) {
  const [currentPage, setCurrentPage] = useState(1);

  const isFiltering = searchQuery.trim() !== '';
  const filteredItems = items.filter(item =>
    item.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const effectiveItems = isFiltering ? filteredItems : items;
  const totalPages = Math.ceil(effectiveItems.length / itemsPerPage);

  const paginatedItems = effectiveItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <>
      {/* Render Mode */}
      {chunkItems ? (
        // When chunkItems is true (like for JobTable)
        renderItem(paginatedItems, currentPage)
      ) : (
        // Otherwise render each item individually (like cards)
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {paginatedItems.map(renderItem)}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 space-x-2">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded-lg border ${
              currentPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-blue-50'
            }`}
          >
            Prev
          </button>

          {[...Array(totalPages)].map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentPage(idx + 1)}
              className={`px-3 py-1 rounded-lg border ${
                currentPage === idx + 1 ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-blue-50'
              }`}
            >
              {idx + 1}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded-lg border ${
              currentPage === totalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-blue-50'
            }`}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
} 