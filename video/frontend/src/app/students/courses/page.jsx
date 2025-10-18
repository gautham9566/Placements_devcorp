"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CourseCard from '@/components/students/CourseCard';
import Pagination from '@/components/admin/Pagination';
import SearchBar from '@/components/SearchBar';

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // `searchTerm` is the applied search used to fetch server results.
  // `searchInput` is the live input while typing; only when the user submits (Enter or suggestion) do we set `searchTerm`.
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchContent = async (page = 1) => {
    try {
      setLoading(true);
      // Clear current courses to ensure only new page data is shown
      setCourses([]);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        status: 'published' // Only show published courses for students
      });

      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }

      const response = await fetch(`/api/courses?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        // Ensure we only set the courses for the current page
        const pageCourses = data.courses || [];
        console.log(`Loaded ${pageCourses.length} courses for page ${page}`);
        setCourses(pageCourses);
        setTotalPages(data.pagination?.total_pages || 1);
        setTotalCount(data.pagination?.total_count || 0);
      } else {
        console.error('Failed to fetch courses:', response.status);
        setCourses([]); // Clear courses on error
        setError('Failed to load courses from server.');
      }
    } catch (err) {
      setError('Failed to load courses from server.');
      console.error(err);
      setCourses([]); // Clear courses on error
    } finally {
      setLoading(false);
    }
  };

  // Load content on mount and when page/search changes
  useEffect(() => {
    fetchContent(currentPage);
  }, [currentPage, searchTerm]);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Debounced suggestions: fetch small set of matches while user types, but do not perform full search until submit
  useEffect(() => {
    const q = (searchInput || '').trim();
    if (!q || q.length < 2 || q === searchTerm) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    setSuggestionsLoading(true);
    const handle = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search: q, limit: '6' });
        const res = await fetch(`/api/courses?${params.toString()}`);
        if (!res.ok) {
          setSuggestions([]);
        } else {
          const data = await res.json();
          const items = data.courses || data || [];
          setSuggestions(items.slice(0, 6));
        }
      } catch (e) {
        console.error('Suggestion fetch error', e);
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [searchInput, searchTerm]);

  // Remove frontend filtering since it's now done on backend
  // But when a search term is active, sort the returned courses by simple relevance:
  // 1) exact title match, 2) title startsWith, 3) title includes, 4) alphabetical
  const filteredCourses = (() => {
    if (!searchTerm || !searchTerm.trim()) return courses;
    const q = searchTerm.trim().toLowerCase();
    const score = (c) => {
      const t = (c.title || c.name || '').toLowerCase();
      if (!t) return 0;
      if (t === q) return 100;
      if (t.startsWith(q)) return 75;
      if (t.includes(q)) return 50;
      return 0;
    };

    return [...courses].sort((a, b) => {
      const sa = score(a);
      const sb = score(b);
      if (sa !== sb) return sb - sa; // higher score first
      const ta = (a.title || a.name || '').toLowerCase();
      const tb = (b.title || b.name || '').toLowerCase();
      return ta.localeCompare(tb);
    });
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading courses...</p>
        </div>
      </div>
    );
  }

  
  // Apply the typed search input as the active searchTerm which triggers server fetch
  const applySearch = (term) => {
    const q = (term || searchInput || '').trim();
    if (!q) return;
    // Redirect to unified search page
    router.push(`/students/search?q=${encodeURIComponent(q)}`);
  };

  return (
   <div className="min-h-screen p-6 w-full">
      <div className="w-full max-w-full mx-0">
        {/* Header with back button, title, and centered Search Bar */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
            <div className="flex items-center md:justify-start">
              <button
                type="button"
                onClick={() => router.back()}
                aria-label="Go back"
                className="mr-4 p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Explore Courses
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Discover and learn from our comprehensive course collection
                </p>
              </div>
            </div>

            <div className="flex justify-center w-full">
              <div className="w-full max-w-md relative">
                <SearchBar
                  placeholder="Search courses..."
                  value={searchInput}
                  onChange={setSearchInput}
                  onSubmit={() => applySearch(searchInput)}
                  showSubmitButton={true}
                />

                {/* Suggestions dropdown while typing */}
                {suggestionsLoading ? (
                  <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow p-2 text-sm text-gray-600 dark:text-gray-300">
                    Loading suggestions...
                  </div>
                ) : (
                  suggestions.length > 0 && (
                    <ul className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow overflow-hidden z-50">
                      {suggestions.map(s => (
                        <li
                          key={s.id}
                          onMouseDown={() => applySearch(s.title || s.name || s.id)}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                        >
                          {s.title || s.name || `Course ${s.id}`}
                        </li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            </div>

            <div className="hidden md:block" />
          </div>
        </div>

        {/* Courses Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <svg className="w-7 h-7 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              All Courses
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {totalCount} {totalCount === 1 ? 'course' : 'courses'}
            </span>
          </div>

          {error && (
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {filteredCourses.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {searchTerm ? 'No courses found matching your search' : 'No courses available yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          )}
        </section>
      </div>
    </div>
  );
}