"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import VideoCard from '@/components/students/VideoCard';
import CourseCard from '@/components/students/CourseCard';
import SearchBar from '@/components/SearchBar';

export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get('q') || '';
  const [allVideos, setAllVideos] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchInput, setSearchInput] = useState(q);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'videos', 'courses'
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list'
  const LIMIT = 100;

  const term = (q || '').trim().toLowerCase();

  const handleSearchSubmit = (searchTerm) => {
    const trimmedTerm = (searchTerm || searchInput || '').trim();
    if (!trimmedTerm) return;
    // Navigate to the same page with new search query
    router.push(`/students/search?q=${encodeURIComponent(trimmedTerm)}`);
  };

  useEffect(() => {
    // Reset on new search
    setAllVideos([]);
    setAllCourses([]);
    setResults([]);
    setCurrentPage(1);
    setHasMore(true);
    setLoading(true);
    setSearchInput(q); // Sync search input with URL parameter
    fetchPage(1);
  }, [q]); // Only depend on q to avoid unnecessary re-renders

  const fetchPage = async (page) => {
    try {
      // Fetch videos with search parameter
      const videoParams = new URLSearchParams({
        page: page.toString(),
        limit: LIMIT.toString(),
        status: 'Published'
      });
      if (term) {
        videoParams.set('search', term);
      }
      const videoRes = await fetch(`/api/videos?${videoParams.toString()}`);
      if (!videoRes.ok) throw new Error('Failed to fetch videos');
      const videoData = await videoRes.json();
      const videosArr = Array.isArray(videoData) ? videoData : (videoData.videos || []);
      setAllVideos(prev => {
        // Remove duplicates based on id before appending
        const uniqueVideosArr = videosArr.filter(video => !prev.some(existing => existing.id === video.id));
        return [...prev, ...uniqueVideosArr];
      });
      // Check if more video pages
      const totalVideoPages = videoData.total_pages || Math.ceil(videoData.total / LIMIT);
      const hasMoreVideos = page < totalVideoPages && videosArr.length === LIMIT;

      // Fetch courses with search parameter
      const courseParams = new URLSearchParams({
        page: '1',
        limit: '1000',
        status: 'published'
      });
      if (term) {
        courseParams.set('search', term);
      }
      const courseRes = await fetch(`/api/courses?${courseParams.toString()}`);
      if (courseRes.ok) {
        const courseData = await courseRes.json();
        const coursesArr = courseData.courses || [];
        // Ensure courses are unique by ID
        const uniqueCoursesArr = coursesArr.filter((course, index, self) =>
          index === self.findIndex(c => c.id === course.id)
        );
        setAllCourses(uniqueCoursesArr);
      }

      setHasMore(hasMoreVideos);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (loadingMore || !hasMore || !term || loading) return;
    setLoadingMore(true);
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchPage(nextPage);
  };

  const scrollTimeoutRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollTimeoutRef.current) return; // Throttle scroll events
      
      scrollTimeoutRef.current = setTimeout(() => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
          loadMore();
        }
        scrollTimeoutRef.current = null;
      }, 100); // 100ms throttle
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [loadingMore, hasMore, term, currentPage, loading]);

  // Rebuild results whenever allVideos or allCourses changes
  useEffect(() => {
    // Since APIs now return filtered results, just combine them with type field
    // Ensure no duplicates in the combined results
    const videoResults = allVideos.map(v => ({ ...v, type: 'video' }));
    const courseResults = allCourses.map(c => ({ ...c, type: 'course' }));
    let combinedResults = [...videoResults, ...courseResults];

    // Remove any potential duplicates (though videos and courses should have separate ID spaces)
    combinedResults = combinedResults.filter((item, index, self) =>
      index === self.findIndex(i => i.id === item.id && i.type === item.type)
    );

    setResults(combinedResults);
  }, [allVideos, allCourses]);

  return (
    <div className="min-h-screen p-6 pr-0">
      <div className="w-full">
        {/* Header with back arrow, title, and centered search bar */}
        <div className="flex items-center mb-6 relative">
          <div className="flex items-center z-10">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
              aria-label="Go back"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl text-white font-semibold">Search results for "{q}"</h1>
          </div>

          {/* Centered search bar */}
          <div className="absolute left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4 z-20">
            <SearchBar
              placeholder="Refine your search..."
              value={searchInput}
              onChange={setSearchInput}
              onSubmit={handleSearchSubmit}
              showSubmitButton={true}
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400 text-lg">Searching for videos and courses...</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">This may take a moment</p>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs - always show when not loading */}
            <div className="mb-6">
              <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'all'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  All ({results.length})
                </button>
                <button
                  onClick={() => setActiveTab('videos')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'videos'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Videos ({results.filter(r => r.type === 'video').length})
                </button>
                <button
                  onClick={() => setActiveTab('courses')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'courses'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Courses ({results.filter(r => r.type === 'course').length})
                </button>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="mb-6">
              <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  List
                </button>
              </div>
            </div>

            {results.filter(r => activeTab === 'all' || r.type === activeTab.slice(0, -1)).length === 0 ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center max-w-md">
                  <svg className="w-24 h-24 mx-auto text-gray-400 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No results found</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    We couldn't find any {activeTab === 'all' ? 'videos or courses' : activeTab} matching "{q}". Try adjusting your search terms or browse all content.
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => router.push('/students')}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Browse All Content
                    </button>
                    <button
                      onClick={() => router.back()}
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      Go Back
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-gray-600 dark:text-gray-400">
                    Found {results.filter(r => activeTab === 'all' || r.type === activeTab.slice(0, -1)).length} result{results.filter(r => activeTab === 'all' || r.type === activeTab.slice(0, -1)).length !== 1 ? 's' : ''} matching your search
                  </p>
                </div>
                <div className={`${
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'
                    : 'flex flex-col space-y-4'
                }`}>
                  {results
                    .filter(r => activeTab === 'all' || r.type === activeTab.slice(0, -1)) // 'videos' -> 'video', 'courses' -> 'course'
                    .map(r => (
                    <div key={`${r.type}-${r.id}`} className={viewMode === 'list' ? 'w-full' : ''}>
                      {r.type === 'video' ? (
                        <VideoCard video={r} viewMode={viewMode} />
                      ) : (
                        <CourseCard course={r} viewMode={viewMode} />
                      )}
                    </div>
                  ))}
                </div>
                {loadingMore && (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Loading more results...</p>
                    </div>
                  </div>
                )}
                {!hasMore && results.filter(r => activeTab === 'all' || r.type === activeTab.slice(0, -1)).length > 0 && (
                  <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    You've seen all {results.filter(r => activeTab === 'all' || r.type === activeTab.slice(0, -1)).length} matching result{results.filter(r => activeTab === 'all' || r.type === activeTab.slice(0, -1)).length !== 1 ? 's' : ''}
                  </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
