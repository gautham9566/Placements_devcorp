"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import VideoPlayer from '@/components/video/VideoPlayer';
import VideoCard from '@/components/students/VideoCard';
import CommentsSection from '@/components/students/CommentsSection';

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
  const [lmsUsername, setLmsUsername] = useState('');
  const [engagementStats, setEngagementStats] = useState(null);

  useEffect(() => {
    // Get username from sessionStorage
    const username = sessionStorage.getItem('lms_username') || 'Guest';
    setLmsUsername(username);
    
    if (videoHash) {
      fetchVideo();
      fetchEngagementStats();
      recordView(username);
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

  const fetchEngagementStats = async () => {
    try {
      const username = sessionStorage.getItem('lms_username') || 'Guest';
      const response = await fetch(`/api/engagement/stats/video/${videoHash}?lms_username=${username}`);
      if (response.ok) {
        const stats = await response.json();
        setEngagementStats(stats);
      }
    } catch (err) {
      console.error('Error fetching engagement stats:', err);
    }
  };

  const recordView = async (username) => {
    try {
      await fetch('/api/engagement/views', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lms_username: username,
          content_type: 'video',
          content_id: videoHash,
        }),
      });
    } catch (err) {
      console.error('Error recording view:', err);
    }
  };

  const handleLike = async () => {
    if (!lmsUsername || lmsUsername === 'Guest') return;
    
    try {
      if (engagementStats?.user_liked) {
        // Remove like
        await fetch(`/api/engagement/likes?lms_username=${lmsUsername}&content_type=video&content_id=${videoHash}`, {
          method: 'DELETE',
        });
      } else {
        // Add like
        await fetch('/api/engagement/likes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lms_username: lmsUsername,
            content_type: 'video',
            content_id: videoHash,
          }),
        });
      }
      fetchEngagementStats(); // Refresh stats
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleDislike = async () => {
    if (!lmsUsername || lmsUsername === 'Guest') return;
    
    try {
      if (engagementStats?.user_disliked) {
        // Remove dislike
        await fetch(`/api/engagement/dislikes?lms_username=${lmsUsername}&content_type=video&content_id=${videoHash}`, {
          method: 'DELETE',
        });
      } else {
        // Add dislike
        await fetch('/api/engagement/dislikes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lms_username: lmsUsername,
            content_type: 'video',
            content_id: videoHash,
          }),
        });
      }
      fetchEngagementStats(); // Refresh stats
    } catch (err) {
      console.error('Error toggling dislike:', err);
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
    // Navigate to the new video page instead of just changing state
    router.push(`/students/videos/${rv.hash}`);
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
                  videoTitle={video.title || 'Untitled Video'}
                  showStatsButton={true}
                  autoplay={false}
                />
              </div>
            </div>

            {/* Title */}
            <div className="text-gray-900 dark:text-white">
              <h1 className="text-2xl font-semibold mb-3">{video.title || 'Untitled Video'}</h1>
              
              {/* Engagement Stats Row - Views/Date on left, Like/Dislike on right */}
              <div className="flex items-center justify-between mb-4">
                {/* Left: Views and Date */}
                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                  {engagementStats && (
                    <>
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>{engagementStats.views.toLocaleString()} views</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{formatDate(video.created_at || video.upload_date)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Right: Like/Dislike Buttons */}
                <div className="flex items-center space-x-2">
                  {/* Like Button */}
                  <button
                    onClick={handleLike}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      engagementStats?.user_liked
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    disabled={!lmsUsername || lmsUsername === 'Guest'}
                  >
                    <svg className="w-5 h-5" fill={engagementStats?.user_liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                    <span>{engagementStats?.likes || 0}</span>
                  </button>

                  {/* Dislike Button */}
                  <button
                    onClick={handleDislike}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      engagementStats?.user_disliked
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    disabled={!lmsUsername || lmsUsername === 'Guest'}
                  >
                    <svg className="w-5 h-5" fill={engagementStats?.user_disliked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                    </svg>
                    <span>{engagementStats?.dislikes || 0}</span>
                  </button>
                </div>
              </div>

              {/* Description */}
              {video.description && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow mb-6">
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

              {/* Comments Section */}
              <div className="mt-4">
                <CommentsSection
                  contentType="video"
                  contentId={videoHash}
                  lmsUsername={lmsUsername}
                  isAdmin={false}
                />
              </div>
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
                        <img src={rv.thumbnail_filename ? `/api/thumbnail/${rv.hash}` : '/images/placeholder.png'} alt={rv.title || 'Video thumbnail'} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-lg text-gray-100 line-clamp-2">{rv.title || 'Untitled Video'}</div>
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
        const matched = arr.filter(v => (v.title || '').toLowerCase().includes(q));
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
                router.push(`/students/search?q=${q}`);
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
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{s.title || 'Untitled Video'}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{s.views ? `${s.views.toLocaleString()} views` : ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

