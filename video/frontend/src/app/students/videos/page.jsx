"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import VideoCard from '@/components/students/VideoCard';
import SearchBar from '@/components/SearchBar';

export default function VideosPage() {
  const router = useRouter();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const observerRef = useRef(null);
  const itemsPerPage = 12; // Number of videos to load per page

  // Track if user has scrolled
  useEffect(() => {
    const handleScroll = () => {
      if (!hasScrolled && window.scrollY > 100) {
        setHasScrolled(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasScrolled]);

  const fetchContent = async (page = 1, append = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        status: 'Published'
      });
      
      // Add search parameter if searching
      if (searchTerm && searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }
      
      // Fetch videos from API with pagination, status filter, and search
      const response = await fetch(`/api/videos?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }
      const data = await response.json();
      
      let videosArray = [];
      if (Array.isArray(data)) {
        videosArray = data;
        // For array response, we don't have pagination metadata
        setHasMore(videosArray.length === itemsPerPage);
        console.log('Array response, videos length:', videosArray.length, 'hasMore:', videosArray.length === itemsPerPage);
      } else if (Array.isArray(data.videos)) {
        videosArray = data.videos;
        // Check if we have more pages
        const totalPages = data.total_pages || 1;
        setHasMore(page < totalPages);
        console.log('Object response, page:', page, 'total_pages:', totalPages, 'hasMore:', page < totalPages, 'videos length:', videosArray.length);
      }
      
      if (append) {
        setVideos(prev => [...prev, ...videosArray]);
      } else {
        setVideos(videosArray);
      }
    } catch (err) {
      setError('Failed to load videos from server.');
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreVideos = () => {
    if (!loadingMore && hasMore) {
      console.log('Loading more videos, current page:', currentPage);
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchContent(nextPage, true);
    } else {
      console.log('Not loading more videos - loadingMore:', loadingMore, 'hasMore:', hasMore);
    }
  };

  const resetInfiniteScroll = () => {
    setVideos([]);
    setCurrentPage(1);
    setHasMore(true);
    setLoadingMore(false);
  };

  // Load content on mount and when search changes
  useEffect(() => {
    resetInfiniteScroll();
    fetchContent(1, false);
  }, [searchTerm]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    // Only set up observer if we have content, more to load, and user has scrolled
    if (!hasMore || videos.length === 0 || !hasScrolled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        // Only trigger if element is actually intersecting and we're not already loading
        if (entry.isIntersecting && hasMore && !loadingMore && entry.intersectionRatio > 0) {
          console.log('Intersection observer triggered, loading more videos');
          loadMoreVideos();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '200px' // Trigger 200px before the element comes into view
      }
    );

    const currentRef = observerRef.current;
    if (currentRef) {
      console.log('Attaching observer to element');
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        console.log('Cleaning up observer');
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, loadingMore, videos.length, hasScrolled]);

  // Videos are now filtered server-side, so we use videos directly
  const displayVideos = videos;

  const handleSearchSubmit = (term) => {
    const q = (term || searchTerm || '').trim();
    if (!q) return;
    // Always redirect to the search results page to show all matches for the keyword
    router.push(`/students/search?q=${encodeURIComponent(q)}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 w-full">
      <div className="w-full max-w-full mx-0">
        {/* Header with centered search using grid */}
        <div className="mb-8">
          <div className="grid grid-cols-12 items-center gap-4">
            {/* left: back + title */}
            <div className="col-span-4 md:col-span-4 lg:col-span-4 flex items-center">
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
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">Explore Videos</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">Discover and watch our video collection</p>
              </div>
            </div>

            {/* center: search (centered) */}
            <div className="col-span-12 md:col-span-4 lg:col-span-4 flex justify-center">
              <SearchBar
                placeholder="Search videos..."
                value={searchTerm}
                onChange={setSearchTerm}
                onSubmit={handleSearchSubmit}
                showSubmitButton={true}
                variant="centered"
              />
            </div>

            {/* right: empty for balance */}
            <div className="col-span-4 md:col-span-4 lg:col-span-4"></div>
          </div>
        </div>

        {/* Videos Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <svg className="w-7 h-7 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              All Videos
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {videos.length} {videos.length === 1 ? 'video' : 'videos'} loaded
            </span>
          </div>

          {error && (
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {videos.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {searchTerm ? 'No videos found matching your search' : 'No videos available yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {videos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
              
              {/* Infinite scroll trigger */}
              {hasMore && (
                <div ref={observerRef} className="flex justify-center py-8">
                  {loadingMore ? (
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading more videos...</span>
                    </div>
                  ) : (
                    <div className="text-gray-500 dark:text-gray-400 text-sm">
                      Scroll down to load more videos
                    </div>
                  )}
                </div>
              )}
              
              {!hasMore && videos.length > 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  You've reached the end of the video collection
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}