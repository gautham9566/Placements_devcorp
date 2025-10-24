import { ArrowLeft, Calendar, AlertCircle, Loader2 } from "lucide-react";

export default function PassoutYearCards({
  departmentLabel,
  onBack,
  getAvailablePassoutYears,
  selectedDepartment,
  onSelectYear,
  yearStats = [],
  students = [],
  isLoading = false,
  error = null
}) {
  // Debug logging
  console.log('PassoutYearCards - yearStats:', yearStats);
  console.log('PassoutYearCards - students:', students);
  console.log('PassoutYearCards - selectedDepartment:', selectedDepartment);

  // Get available years
  // Sort years in descending order
  const availableYears = getAvailablePassoutYears().slice().sort((a, b) => Number(b) - Number(a));

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
              {departmentLabel} - Passout Years
            </h1>
            <p className="text-gray-600">Select a passout year to view students</p>
          </div>
        </div>
      </div>
      
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-600">Loading passout years data...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-600">Error loading data: {error}</p>
          </div>
        </div>
      )}
      
      {!isLoading && !error && availableYears.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Passout Years Found</h3>
          <p className="text-gray-600 mb-4">There are no passout years available for {departmentLabel}</p>
        </div>
      )}
      
      {!isLoading && !error && availableYears.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {availableYears.map(year => {
            // Find matching year statistics from backend API
            const yearStat = yearStats.find(stat => {
              const statYear = stat.passout_year || stat.year || stat.passoutYear;
              return statYear?.toString() === year?.toString();
            });
            
            // Use backend data as the primary source (already filtered by department and active years)
            const count = yearStat?.total_students || 0;
            
            return (
              <div
                key={year}
                onClick={() => onSelectYear(year)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all duration-200 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-xs text-gray-500">Total Students</div>

                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{year}</h3>
                <p className="text-sm text-gray-600">Passout Year</p>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

