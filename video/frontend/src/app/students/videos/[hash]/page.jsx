"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import VideoPlayer from '@/components/video/VideoPlayer';
import VideoCard from '@/components/students/VideoCard';

/**
 * Individual Video View Page (YouTube-like)
 */
export default function VideoViewPage() {
  const params = useParams();
  const router = useRouter();
  const videoHash = params.hash;

  const [video, setVideo] = useState(null);
  const [relatedVideos, setRelatedVideos] = useState([]);
  // For infinite scroll: keep a full pool and an offset
  const [relatedPool, setRelatedPool] = useState([]);
  const [relatedOffset, setRelatedOffset] = useState(0);
  const RELATED_CHUNK = 12;
  const [loading, setLoading] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);
  const DESCRIPTION_PREVIEW_LENGTH = 400;
  const [relatedPage, setRelatedPage] = useState(1);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [hasMoreRelated, setHasMoreRelated] = useState(true);

  useEffect(() => {
    if (videoHash) {
      fetchVideo();
      (async () => {
        const published = await fetchRelatedVideos(1);
        setRelatedPool(published);
        setRelatedVideos(published.slice(0, RELATED_CHUNK));
        setRelatedOffset(Math.min(RELATED_CHUNK, published.length));
      })();
    }
  }, [videoHash]);

  const fetchVideo = async () => {
    try {
      const response = await fetch(`/api/videos/${videoHash}`);
      if (!response.ok) throw new Error('Failed to fetch video');
      const video = await response.json();
      setVideo(video);
    } catch (err) {
      console.error(err);
      router.push('/students');
    } finally {
      setLoading(false);
    }
  };

  // Fetch related videos and return the published array
  const fetchRelatedVideos = async (page = 1, forHash = videoHash) => {
    if (relatedLoading) return [];
    setRelatedLoading(true);
    try {
      const response = await fetch(`/api/videos?page=${page}&limit=100`);
      if (!response.ok) throw new Error('Failed to fetch videos');
      const data = await response.json();
      const videosArray = Array.isArray(data) ? data : (data.videos || []);
      const published = videosArray.filter(v => v.status?.toLowerCase() === 'published' && v.hash !== forHash);

      // Check if there are more pages
      const totalPages = data.total_pages || Math.ceil(data.total / 100);
      setHasMoreRelated(page < totalPages);

      return published;
    } catch (err) {
      console.error(err);
      return [];
    } finally {
      setRelatedLoading(false);
    }
  };

  const loadMoreRelated = async () => {
    if (relatedOffset >= relatedPool.length) {
      // If pool is exhausted and there are more pages, fetch next page
      if (hasMoreRelated && !relatedLoading) {
        const nextPage = relatedPage + 1;
        setRelatedPage(nextPage);
        const newPublished = await fetchRelatedVideos(nextPage);
        setRelatedPool(prev => [...prev, ...newPublished]);
        // Now load from the updated pool
        const updatedPool = [...relatedPool, ...newPublished];
        if (relatedOffset < updatedPool.length) {
          const next = updatedPool.slice(relatedOffset, relatedOffset + RELATED_CHUNK);
          setRelatedVideos((prev) => [...prev, ...next]);
          setRelatedOffset((prev) => Math.min(prev + RELATED_CHUNK, updatedPool.length));
        }
      }
      return;
    }
    const next = relatedPool.slice(relatedOffset, relatedOffset + RELATED_CHUNK);
    setRelatedVideos((prev) => [...prev, ...next]);
    setRelatedOffset((prev) => Math.min(prev + RELATED_CHUNK, relatedPool.length));
  };

  const handleRelatedScroll = (e) => {
    const el = e.target;
    // when within 150px of bottom, load more
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
      loadMoreRelated();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleRelatedClick = async (rv) => {
    // Set the clicked video as main, reset description and rebuild the related pool for it
    setVideo(rv);
    setDescExpanded(false);
    // Reset related states
    setRelatedPage(1);
    setRelatedPool([]);
    setRelatedVideos([]);
    setRelatedOffset(0);
    setHasMoreRelated(true);
    // Re-fetch related videos excluding the newly selected video so the pool is updated
    const published = await fetchRelatedVideos(1, rv.hash);
    setRelatedPool(published);
    setRelatedVideos(published.slice(0, RELATED_CHUNK));
    setRelatedOffset(Math.min(RELATED_CHUNK, published.length));

    // Scroll to top so the player is visible
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading video...</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 text-lg">Video not found</p>
          <button
            onClick={() => router.push('/students')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Videos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 w-full">
      <div className="w-full">
        {/* Header: Back button left, Search centered */}
        <div className="mb-4 relative">
          {/* Back button: left */}
          <div className="absolute left-0 top-0">
            <button
              onClick={() => router.push('/students')}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Videos
            </button>
          </div>

          {/* Centered search bar */}
          <div className="flex justify-center">
            <div className="w-full max-w-2xl px-16">
              <SearchBar />
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Left: Player + meta (flexible) */}
          <main className="flex-1">
            <div className="w-full rounded-lg overflow-hidden mb-4 bg-black">
              <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
                <VideoPlayer
                  videoHash={video.hash}
                  youtubeUrl={video.youtube_url}
                  poster={video.thumbnail_filename ? `/api/thumbnail/${video.hash}` : undefined}
                  videoTitle={video.filename}
                  showStatsButton={true}
                  autoplay={false}
                />
              </div>
            </div>

            {/* Title + actions */}
            <div className="text-gray-900 dark:text-white">
              <h1 className="text-2xl font-semibold mb-2">{video.filename}</h1>
{/* 
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center">
                      <span className="text-sm text-white">N</span>
                    </div>
                    <div>
                      <div className="font-medium">Uploader</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {video.views !== undefined ? `${video.views.toLocaleString()} views • ` : ''}{formatDate(video.created_at || video.upload_date)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-md">Like</button>
                  <button className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-md">Share</button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md">Subscribe</button>
                </div>
              </div> */}

              {/* Description */}
              {video.description && (
                <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                  <div
                    className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm"
                    role="button"
                    tabIndex={0}
                    onClick={() => { if (video.description.length > DESCRIPTION_PREVIEW_LENGTH) setDescExpanded(prev => !prev); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (video.description.length > DESCRIPTION_PREVIEW_LENGTH) setDescExpanded(prev => !prev); } }}
                  >
                    {video.description.length <= DESCRIPTION_PREVIEW_LENGTH || descExpanded
                      ? video.description
                      : `${video.description.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}...`}
                  </div>

                  {video.description.length > DESCRIPTION_PREVIEW_LENGTH && (
                    <div className="mt-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDescExpanded(prev => !prev); }}
                        className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
                        aria-expanded={descExpanded}
                      >
                        {descExpanded ? 'Show less' : 'Show more'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>

          {/* Right: Related videos (fixed width) */}
          <aside className="w-96 flex-shrink-0">
            {/* make the sidebar scroll internally and hide the native scrollbar */}
            <div
              className="sticky top-6 space-y-4 max-h-[calc(100vh-96px)] overflow-y-auto hide-scrollbar"
              onScroll={handleRelatedScroll}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Related Videos</h3>
              <div className="space-y-4">
                {relatedVideos.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">No related videos available</p>
                ) : (
                  relatedVideos.map(rv => (
                    <div
                      key={rv.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleRelatedClick(rv)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRelatedClick(rv); } }}
                      className="flex items-start space-x-4 cursor-pointer"
                    >
                      <div className="w-56 h-32 rounded-md overflow-hidden bg-gray-800 flex-shrink-0">
                        <img src={rv.thumbnail_filename ? `/api/thumbnail/${rv.hash}` : '/images/placeholder.png'} alt={rv.filename || rv.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-lg text-gray-100 line-clamp-2">{rv.filename || rv.title}</div>
                        <div className="text-sm text-gray-300 mt-1">{rv.views ? `${rv.views.toLocaleString()} views • ` : ''}{rv.created_at ? formatDate(rv.created_at) : ''}</div>
                      </div>
                    </div>
                  ))
                )}
                {relatedLoading && (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Loading more videos...</p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// Small inline SearchBar component to keep this page self-contained.
function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [show, setShow] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  // simple debounce
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setShow(false);
      setHighlight(-1);
      return;
    }

    setLoadingSuggestions(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch('/api/videos');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (data.videos || []);
        const q = query.trim().toLowerCase();
        const matched = arr.filter(v => (v.filename || v.title || '').toLowerCase().includes(q));
        setSuggestions(matched.slice(0, 8));
        setShow(true);
      } catch (e) {
        console.error(e);
        setSuggestions([]);
        setShow(false);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(id);
  }, [query]);

  const onSelect = (v) => {
    setShow(false);
    setQuery('');
    // navigate to the video's page
    if (v?.hash) router.push(`/students/videos/${v.hash}`);
  };

  return (
    <div className="relative flex-1 max-w-xl">
      {/* search icon */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
      </div>
      <input
        aria-label="Search videos"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { if (suggestions.length) setShow(true); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight(h => Math.min(h + 1, suggestions.length - 1));
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight(h => Math.max(h - 1, 0));
            return;
          }
          if (e.key === 'Enter') {
            if (highlight >= 0 && suggestions[highlight]) {
              onSelect(suggestions[highlight]);
            } else {
              // No suggestion highlighted: submit search and open results page
              if (query && query.trim().length > 0) {
                const q = encodeURIComponent(query.trim());
                setShow(false);
                setQuery('');
                router.push(`/students/videos/search?q=${q}`);
              }
            }
          }
          if (e.key === 'Escape') {
            setShow(false);
          }
        }}
        placeholder="Search videos (global)"
        className="w-full px-12 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {show && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 overflow-hidden">
          {loadingSuggestions && (
            <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
          )}
          {suggestions.map((s, idx) => (
            <div
              key={s.id || s.hash}
              onMouseDown={(e) => { e.preventDefault(); onSelect(s); }}
              className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${highlight === idx ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
            >
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{s.filename || s.title}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{s.views ? `${s.views.toLocaleString()} views` : ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

