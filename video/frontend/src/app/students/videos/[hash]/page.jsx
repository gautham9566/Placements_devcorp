"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import VideoPlayer from '@/components/video/VideoPlayer';
import VideoCard from '@/components/students/VideoCard';

/**
 * Individual Video View Page (YouTube-like)
 * Features: Video player, title, description, upload date, related videos
 */
export default function VideoViewPage() {
  const params = useParams();
  const router = useRouter();
  const videoHash = params.hash;

  const [video, setVideo] = useState(null);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (videoHash) {
      fetchVideo();
      fetchRelatedVideos();
    }
  }, [videoHash]);

  const fetchVideo = async () => {
    try {
      // Fetch videos from API
      const response = await fetch('/api/videos');
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }
      const data = await response.json();
      const videosArray = Array.isArray(data) ? data : (data.videos || []);
      const foundVideo = videosArray.find(v => v.hash === videoHash);

      if (foundVideo) {
        setVideo(foundVideo);
      } else {
        router.push('/students');
      }
    } catch (error) {
      console.error('Error fetching video:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedVideos = async () => {
    try {
      // Fetch videos from API
      const response = await fetch('/api/videos');
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }
      const data = await response.json();
      const videosArray = Array.isArray(data) ? data : (data.videos || []);
      const published = videosArray.filter(v =>
        v.status?.toLowerCase() === 'published' && v.hash !== videoHash
      );
      setRelatedVideos(published.slice(0, 8));
    } catch (error) {
      console.error('Error fetching related videos:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatCommentDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDate(dateString);
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
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/students')}
          className="mb-4 flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Videos
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Video Player */}
            <div className="bg-black rounded-lg overflow-hidden mb-4">
              <VideoPlayer
                videoHash={video.hash}
                youtubeUrl={video.youtube_url}
                poster={video.thumbnail_filename ? `/api/thumbnail/${video.hash}` : undefined}
                height="600px"
                videoTitle={video.filename}
                showStatsButton={true}
                autoplay={false}
              />
            </div>

            {/* Video Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-4 shadow">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {video.filename}
              </h1>
              
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
                <span>{formatDate(video.created_at || video.upload_date)}</span>
                {video.views !== undefined && (
                  <span>{video.views.toLocaleString()} views</span>
                )}
              </div>

              {video.description && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {video.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Related Videos */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Related Videos
              </h3>
              <div className="space-y-4">
                {relatedVideos.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
                    No related videos available
                  </p>
                ) : (
                  relatedVideos.map((relatedVideo) => (
                    <VideoCard key={relatedVideo.id} video={relatedVideo} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

