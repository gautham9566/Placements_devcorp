'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Star, Clock } from 'lucide-react';

export default function CalendarView({ stages, onCandidateClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedStage, setSelectedStage] = useState('all');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ date: null, isCurrentMonth: false });
    }
    
    // Add days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        isCurrentMonth: true
      });
    }
    
    // Add empty cells to complete the last row
    const remainingCells = 42 - days.length; // 6 rows × 7 days
    for (let i = 0; i < remainingCells; i++) {
      days.push({ date: null, isCurrentMonth: false });
    }
    
    return days;
  };

  const getCandidatesForDate = (date) => {
    if (!date) return [];
    
    const allCandidates = stages.flatMap(stage => 
      (stage.candidates || []).map(candidate => ({
        ...candidate,
        stageColor: stage.color,
        stageName: stage.name
      }))
    );

    return allCandidates.filter(candidate => {
      const candidateDate = new Date(candidate.added_at);
      const isSameDate = 
        candidateDate.getDate() === date.getDate() &&
        candidateDate.getMonth() === date.getMonth() &&
        candidateDate.getFullYear() === date.getFullYear();
      
      const matchesStage = selectedStage === 'all' || candidate.stageName === selectedStage;
      
      return isSameDate && matchesStage;
    });
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const days = useMemo(() => getDaysInMonth(currentDate), [currentDate]);

  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={10}
            className={star <= (rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Stage Filter */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Stages</option>
            {stages.map(stage => (
              <option key={stage.id} value={stage.name}>{stage.name}</option>
            ))}
          </select>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {daysOfWeek.map(day => (
          <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          const candidates = getCandidatesForDate(day.date);
          const isTodayDate = isToday(day.date);

          return (
            <div
              key={index}
              className={`
                min-h-[120px] p-2 border rounded-lg
                ${!day.isCurrentMonth ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'}
                ${isTodayDate ? 'ring-2 ring-purple-500 border-purple-500' : ''}
              `}
            >
              {day.date && (
                <>
                  {/* Date Number */}
                  <div className={`
                    text-sm font-semibold mb-1
                    ${!day.isCurrentMonth ? 'text-gray-400' : 'text-gray-700'}
                    ${isTodayDate ? 'text-purple-600' : ''}
                  `}>
                    {day.date.getDate()}
                  </div>

                  {/* Candidates */}
                  <div className="space-y-1">
                    {candidates.slice(0, 3).map((candidate) => (
                      <div
                        key={candidate.id}
                        onClick={() => onCandidateClick(candidate.id)}
                        className="p-1.5 rounded bg-gray-50 hover:bg-purple-50 cursor-pointer transition-colors border-l-2"
                        style={{ borderLeftColor: candidate.stageColor }}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">
                              {candidate.student_name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {candidate.job_title}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            {renderStars(candidate.rating)}
                          </div>
                        </div>
                        {candidate.time_in_stage && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <Clock size={10} />
                            <span>{candidate.time_in_stage}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Show count if more than 3 */}
                    {candidates.length > 3 && (
                      <div className="text-xs text-gray-500 text-center py-1">
                        +{candidates.length - 3} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-6 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Stages:</span>
          {stages.map(stage => (
            <div key={stage.id} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: stage.color }}
              />
              <span className="text-sm text-gray-600">{stage.name}</span>
              <span className="text-xs text-gray-400">
                ({stage.candidates?.length || 0})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
