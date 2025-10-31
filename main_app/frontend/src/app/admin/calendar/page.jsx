'use client';

import { useEffect, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Building2,
  Users,
  AlertCircle,
  CheckCircle,
  Filter,
  List,
  Grid3X3,
  Search,
  Plus,
  Bell,
  Eye,
  Edit,
  Trash2,
  ExternalLink,
  User,
  Target,
  BookmarkPlus,
  Calendar as CalendarIcon
} from "lucide-react";
import { getCalendarEvents } from '../../../api/jobs';
import { getDashboardMetrics } from '../../../api/metrics';
import { adminAPI } from '../../../api/optimized';

export default function AdminCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
  const [filterType, setFilterType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedYear, setSelectedYear] = useState('All');
  const [availableYears, setAvailableYears] = useState([]);

  useEffect(() => {
    fetchCalendarEvents();
  }, []);

  useEffect(() => {
    fetchAvailableYears();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, filterType, searchTerm]);

  useEffect(() => {
    fetchCalendarEvents();
  }, [selectedYear]);

  const fetchCalendarEvents = async () => {
    try {
      setLoading(true);
      let params = {};
      
      if (selectedYear === 'All') {
        // For "All", show a reasonable date range around current year
        const currentYear = new Date().getFullYear();
        params = {
          start_date: `${currentYear}-01-01`,
          end_date: `${currentYear + 1}-12-31`, // Show current year + next year
          passout_year: selectedYear
        };
      } else {
        // When filtering by specific passout year, let backend handle date range
        // This avoids conflicts and shows all relevant events for that graduating class
        params = {
          passout_year: selectedYear
          // Backend will use broad date range (2 years ago to 3 years ahead)
        };
      }
      
      console.log('Fetching calendar events with params:', params);
      
      const response = await getCalendarEvents(params);
      
      console.log('Calendar API response:', response.data);
      setEvents(response.data.events || []);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableYears = async () => {
    try {
      // Fetch active years directly from the year management API (not cached)
      const response = await adminAPI.getActiveYears();
      
      if (response.active_years && Array.isArray(response.active_years)) {
        const years = response.active_years.sort((a, b) => b - a);
        // Add "All" option at the beginning
        setAvailableYears(['All', ...years]);
        if (years.length > 0 && !selectedYear) {
          setSelectedYear('All'); // Default to "All"
        }
      }
    } catch (error) {
      console.error('Error fetching available years:', error);
      // Fallback: try to get from student stats (cached but better than nothing)
      try {
        const response = await getDashboardMetrics('student_stats');
        const studentData = response.data;
        
        if (studentData.by_year && Array.isArray(studentData.by_year)) {
          const years = studentData.by_year.map(item => item.passout_year).sort((a, b) => b - a);
          setAvailableYears(['All', ...years]);
          if (years.length > 0 && !selectedYear) {
            setSelectedYear('All');
          }
        }
      } catch (fallbackError) {
        console.error('Error fetching fallback years:', fallbackError);
        // Final fallback to current year
        const currentYear = new Date().getFullYear();
        setAvailableYears(['All', currentYear]);
        setSelectedYear('All');
      }
    }
  };

  const filterEvents = () => {
    let filtered = [...events];

    // Filter by type
    if (filterType !== 'ALL') {
      filtered = filtered.filter(event => event.type === filterType);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.company.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredEvents(filtered);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const getEventsForDate = (day) => {
    if (!day) return [];

    const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredEvents.filter(event => event.date === dateString);
  };

  const getEventTypeIcon = (type) => {
    switch (type) {
      case 'JOB_DEADLINE':
        return <AlertCircle className="w-4 h-4" />;
      case 'INTERVIEW':
        return <Users className="w-4 h-4" />;
      case 'APPLICATION_SUBMITTED':
        return <CheckCircle className="w-4 h-4" />;
      case 'CAREER_FAIR':
        return <Target className="w-4 h-4" />;
      case 'COMPANY_EVENT':
        return <Building2 className="w-4 h-4" />;
      default:
        return <CalendarIcon className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-red-500 bg-red-50 text-red-700';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50 text-yellow-700';
      case 'low':
        return 'border-green-500 bg-green-50 text-green-700';
      default:
        return 'border-gray-500 bg-gray-50 text-gray-700';
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  const closeEventModal = () => {
    setSelectedEvent(null);
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      day &&
      currentDate.getFullYear() === today.getFullYear() &&
      currentDate.getMonth() === today.getMonth() &&
      day === today.getDate()
    );
  };

  // Calculate stats
  const stats = {
    total: filteredEvents.length,
    interviews: filteredEvents.filter(e => e.type === 'INTERVIEW').length,
    deadlines: filteredEvents.filter(e => e.type === 'JOB_DEADLINE').length,
    companyEvents: filteredEvents.filter(e => e.type === 'COMPANY_EVENT' || e.type === 'CAREER_FAIR').length,
    upcoming: filteredEvents.filter(e => {
      const eventDate = new Date(e.date);
      const today = new Date();
      const weekFromNow = new Date(today);
      weekFromNow.setDate(today.getDate() + 7);
      return eventDate >= today && eventDate <= weekFromNow;
    }).length
  };

  const upcomingEvents = events.filter(e => {
    const eventDate = new Date(e.date);
    const today = new Date();
    const weekFromNow = new Date(today);
    weekFromNow.setDate(today.getDate() + 7);
    return eventDate >= today && eventDate <= weekFromNow;
  }).slice(0, 7);

  if (loading) {
    return (
      <div className="p-6 ml-20 overflow-y-auto h-full">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading calendar...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header Section */}
      <div className="p-6 ml-20 overflow-y-auto h-full">
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Calendar</h1>
            <p className="text-gray-600">Manage all placement events, deadlines, and interviews</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-sm text-gray-500">Total Events</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.interviews}</p>
                  <p className="text-sm text-gray-500">Interviews</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.deadlines}</p>
                  <p className="text-sm text-gray-500">Deadlines</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.companyEvents}</p>
                  <p className="text-sm text-gray-500">Company Events</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.upcoming}</p>
                  <p className="text-sm text-gray-500">This Week</p>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search and Filters */}
              <div className="flex gap-4 flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[300px]"
                  />
                </div>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>
                      {year === 'All' ? 'All Years' : `Year ${year}`}
                    </option>
                  ))}
                </select>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Events</option>
                  <option value="JOB_DEADLINE">Job Deadlines</option>
                  <option value="INTERVIEW">Interviews</option>
                  <option value="APPLICATION_SUBMITTED">Applications</option>
                  <option value="CAREER_FAIR">Career Fairs</option>
                  <option value="COMPANY_EVENT">Company Events</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredEvents.length} of {events.length} events
            </div>
          </div>
        </div>

        {/* Calendar or List View */}
        {viewMode === 'calendar' ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            {/* Calendar Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigateMonth(-1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => navigateMonth(1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-6">
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-4 mb-4">
                {daysOfWeek.map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-4">
                {getDaysInMonth(currentDate).map((day, index) => {
                  const dayEvents = getEventsForDate(day);
                  const today = isToday(day);

                  return (
                    <div
                      key={index}
                      className={`min-h-[120px] p-2 border rounded-lg ${
                        today
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${day ? 'cursor-pointer' : ''}`}
                      onClick={() => day && setSelectedDate(day)}
                    >
                      {day && (
                        <>
                          <div className={`text-sm font-medium mb-2 ${
                            today ? 'text-blue-700' : 'text-gray-900'
                          }`}>
                            {day}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 3).map(event => (
                              <div
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEventClick(event);
                                }}
                                className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80"
                                style={{ backgroundColor: event.color + '20', color: event.color }}
                              >
                                {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-xs text-gray-500 p-1">
                                +{dayEvents.length - 3} more
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="space-y-4">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarIcon className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No events found</h3>
                <p className="text-gray-600">Try adjusting your search or filters to find more events</p>
              </div>
            ) : (
              filteredEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: event.color + '20', color: event.color }}
                    >
                      {getEventTypeIcon(event.type)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(event.priority)}`}>
                          {event.priority?.toUpperCase() || 'MEDIUM'}
                        </span>
                      </div>

                      <p className="text-gray-600 mb-3">{event.description}</p>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(event.date).toLocaleDateString()}</span>
                        </div>
                        {event.time && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{event.time}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          <span>{event.company}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Upcoming Events Sidebar
        {upcomingEvents.length > 0 && (
          <div className="fixed right-6 top-24 w-80 bg-white rounded-lg shadow-lg border border-gray-100 p-4 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming This Week</h3>
            <div className="space-y-3">
              {upcomingEvents.slice(0, 5).map(event => (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: event.color }}
                    ></div>
                    <span className="text-sm font-medium text-gray-900">{event.company}</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{event.title}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(event.date).toLocaleDateString()}</span>
                    {event.time && (
                      <>
                        <Clock className="w-3 h-3 ml-2" />
                        <span>{event.time}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )} */}

        {/* Event Detail Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-start gap-4">
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: selectedEvent.color + '20', color: selectedEvent.color }}
                    >
                      {getEventTypeIcon(selectedEvent.type)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedEvent.title}</h2>
                      <p className="text-gray-600">{selectedEvent.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={closeEventModal}
                    className="text-gray-400 hover:text-gray-600 p-2"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Date</p>
                        <p className="font-medium">{new Date(selectedEvent.date).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {selectedEvent.time && (
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Time</p>
                          <p className="font-medium">{selectedEvent.time}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Company</p>
                        <p className="font-medium">{selectedEvent.company}</p>
                      </div>
                    </div>

                    {selectedEvent.location && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Location</p>
                          <p className="font-medium">{selectedEvent.location}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {selectedEvent.applicant_name && (
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Applicant</p>
                          <p className="font-medium">{selectedEvent.applicant_name}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Priority</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(selectedEvent.priority)}`}>
                          {selectedEvent.priority?.toUpperCase() || 'MEDIUM'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p className="font-medium capitalize">{selectedEvent.status}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={closeEventModal}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                  <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Add to Google Calendar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}