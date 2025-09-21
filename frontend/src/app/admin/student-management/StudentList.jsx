import { ArrowLeft, Search } from "lucide-react";

export default function StudentList({
  departmentLabel,
  passoutYear,
  onBack,
  searchTerm,
  handleSearchInputChange,
  handleSearchKeyDown,
  cgpaMin,
  setCgpaMin,
  cgpaMax,
  setCgpaMax,
  handleSearch,
  getFilteredStudents,
  currentPage,
  handlePageChange,
  handleStudentClick,
  loading,
  totalPages,
  totalStudents
}) {
  // Use data directly from backend instead of client-side filtering
  const students = getFilteredStudents();
  
  // Use backend pagination data
  const actualTotalPages = totalPages || 1;
  const actualTotalStudents = totalStudents || 0;
  
  // Students are already paginated from backend, no need to slice again
  const pageStudents = students;

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {departmentLabel} - {passoutYear} Students
            </h1>
            <p className="text-gray-600">
              Manage students from {departmentLabel?.toLowerCase()}, passout year {passoutYear}
            </p>
          </div>
        </div>
      </div>
      {/* Search and Filter Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex gap-4 flex-wrap">
          {/* Search Input */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by name or roll number..."
                value={searchTerm}
                onChange={handleSearchInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                  handleSearchKeyDown && handleSearchKeyDown(e);
                }}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          {/* CGPA Filter */}
          <div className="flex items-center gap-2 min-w-[220px]">
            <label className="text-gray-700 text-sm">CGPA:</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="10"
              value={cgpaMin}
              onChange={e => setCgpaMin(e.target.value)}
              placeholder="Min"
              className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              step="0.01"
              min="0"
              max="10"
              value={cgpaMax}
              onChange={e => setCgpaMax(e.target.value)}
              placeholder="Max"
              className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* Search Button */}
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
          >
            Search
          </button>
        </div>
      </div>
      {/* Students Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Students ({actualTotalStudents} total, showing {pageStudents.length} on page {currentPage})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roll Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Year
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CGPA
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pageStudents.map((student) => (
                <tr
                  key={student.id}
                  onClick={() => handleStudentClick(student)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {student.rollNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm mr-3">
                        {student.name.charAt(0)}
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {student.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {student.cgpa}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
              <div className="text-gray-500">Loading students...</div>
            </div>
          )}
          {pageStudents.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">No students found</div>
              <p className="text-gray-400">
                {searchTerm ? 'Try adjusting your search criteria' : 'No students in this department and passout year'}
              </p>
            </div>
          )}
        </div>
        {/* Pagination Controls */}
        {actualTotalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {actualTotalPages} ({actualTotalStudents} total students)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-2 rounded border text-sm ${
                  currentPage === 1 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' 
                    : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'
                }`}
              >
                Previous
              </button>
              {/* Page Numbers */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, actualTotalPages) }, (_, i) => {
                  let pageNum;
                  if (actualTotalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= actualTotalPages - 2) {
                    pageNum = actualTotalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 rounded text-sm ${
                        pageNum === currentPage
                          ? 'bg-blue-600 text-white'
                          : 'bg-white hover:bg-gray-50 border border-gray-300 text-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === actualTotalPages}
                className={`px-3 py-2 rounded border text-sm ${
                  currentPage === actualTotalPages 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' 
                    : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
