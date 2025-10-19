"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Pagination from '../../../components/admin/Pagination';

export default function CoursesPage({ searchTerm: injectedSearchTerm, setSearchTerm: injectedSetSearchTerm }) {
  const router = useRouter();
  // Only store courses for the current page (max 25 courses)
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  // Use searchTerm from layout when provided, otherwise local state
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const searchTerm = injectedSearchTerm !== undefined ? injectedSearchTerm : localSearchTerm;
  const setSearchTerm = injectedSetSearchTerm !== undefined ? injectedSetSearchTerm : setLocalSearchTerm;
  // Local input state for search bar
  const [inputSearchTerm, setInputSearchTerm] = useState(searchTerm);
  const [viewMode, setViewMode] = useState('grid'); // grid or list

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Add state to track images that failed to load
  const [brokenImages, setBrokenImages] = useState(new Set());

  // Helper to normalize thumbnail URL to an absolute URL served by your backend
  const getThumbnail = (url) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    if (url.startsWith('/api/')) return url;
    if (url.startsWith('/images/') || url.startsWith('/_next/')) return url;
    // Convert /thumbnails/filename to /api/thumbnails/filename
    if (url.startsWith('/thumbnails/')) {
      const filename = url.substring('/thumbnails/'.length);
      return `/api/thumbnails/${filename}`;
    }
    return url;
  };

  // Sync input search term with search term
  useEffect(() => {
    setInputSearchTerm(searchTerm);
  }, [searchTerm]);

  const fetchCourses = async (page = 1) => {
    try {
      setLoading(true);
      // Clear current courses to ensure only new page data is shown
      setCourses([]);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25'
      });

      if (filter !== 'All') {
        params.set('status', filter);
      }

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
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      setCourses([]); // Clear courses on error
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses;

  useEffect(() => {
    fetchCourses(currentPage);
  }, [currentPage, filter, searchTerm]);

  const getStatusBadge = (status) => {
    const statusColors = {
      draft: 'bg-gray-500',
      published: 'bg-green-500',
      archived: 'bg-red-500'
    };
    return statusColors[status] || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gray-900/30 dark:bg-gray-900/30">
      <div className="p-6 bg-white dark:bg-gray-900/30">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin')}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
              aria-label="Go back to admin dashboard"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-white dark:text-white">Courses</h1>
          </div>
          <button
            onClick={() => router.push('/admin/courses/create')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Create Course
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search courses..."
              value={inputSearchTerm}
              onChange={(e) => setInputSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearchTerm(inputSearchTerm);
                }
              }}
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Status</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Archived">Archived</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

          {/* Courses Grid/List */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-300">No courses found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first course.</p>
              <div className="mt-6">
                <button
                  onClick={() => router.push('/admin/courses/create')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Create Course
                </button>
              </div>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'space-y-4'}>
              {filteredCourses.map((course) => {
                const thumbnailSrc = getThumbnail(course.thumbnail_url);
                const imageBroken = brokenImages.has(course.id);

                return (
                  <div key={course.id} className={`bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 hover:shadow-lg transition-shadow ${viewMode === 'list' ? 'flex' : ''}`}>
                    {/* Course Thumbnail */}
                    <div className={`${viewMode === 'list' ? 'w-48 flex-shrink-0' : 'aspect-video'} bg-gray-700 relative cursor-pointer`} onClick={() => router.push(`/admin/courses/${course.id}/preview`)}>
                      {thumbnailSrc && !imageBroken ? (
                        <img
                          src={thumbnailSrc}
                          alt={course.title}
                          loading="lazy"
                          className="w-full h-full object-cover"
                          onError={() => {
                            setBrokenImages(prev => {
                              const s = new Set(prev);
                              s.add(course.id);
                              return s;
                            });
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className={`absolute top-1.5 right-1.5 ${getStatusBadge(course.status)} text-white text-xs px-1.5 py-0.5 rounded`}>
                        {course.status}
                      </div>
                    </div>

                    {/* Course Info */}
                    <div className="p-3 flex-1 cursor-pointer" onClick={() => router.push(`/admin/courses/${course.id}/preview`)}>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">{course.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-xs mb-1.5 truncate">{course.category}</p>
                      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                        <span>{new Date(course.created_at).toLocaleDateString()}</span>
                        <span className="font-medium">{course.price > 0 ? `$${course.price}` : 'Free'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
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
        </div>
      
    </div>
  );
}