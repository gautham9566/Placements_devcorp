"use client";

import React from 'react';
import VideoPlayer from '@/components/video/VideoPlayer';

/**
 * Custom Video Player Component - Now uses the unified VideoPlayer
 * This component is kept for backward compatibility
 */
const CustomVideoPlayer = ({ videoHash, poster, className = "", height = "200px", autoplay = false }) => {
  return (
    <VideoPlayer
      videoHash={videoHash}
      poster={poster}
      className={className}
      height={height}
      autoplay={autoplay}
      videoTitle="Video"
      showStatsButton={true}
    />
  );
};

export default CustomVideoPlayer;