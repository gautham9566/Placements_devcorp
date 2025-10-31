"use client";

import React from 'react';
import VideoPlayer from '@/components/video/VideoPlayer';

/**
 * Video Player Modal Component - Now uses the unified VideoPlayer
 * Displays a video in a modal overlay with close button
 */
const VideoPlayerModal = ({ video, onClose }) => {
  // Normalize thumbnail URL
  const normalizeThumbnail = (url) => {
    if (!url) return undefined;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url.replace(/^https?:\/\/[^/]+/, '');
    }
    return url;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-6xl mx-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Video Title */}
        <div className="absolute top-4 left-4 z-50 text-white bg-black bg-opacity-50 px-4 py-2 rounded">
          <h3 className="text-lg font-semibold">{video.title || 'Untitled Video'}</h3>
        </div>

        {/* Unified Video Player */}
        <VideoPlayer
          videoHash={video.hash}
          poster={video.thumbnail_filename ? normalizeThumbnail(video.thumbnail_url || `/api/thumbnail/${video.hash}`) : undefined}
          height="80vh"
          autoplay={true}
          videoTitle={video.title || 'Untitled Video'}
          showStatsButton={true}
          className="rounded-lg"
        />
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default VideoPlayerModal;
