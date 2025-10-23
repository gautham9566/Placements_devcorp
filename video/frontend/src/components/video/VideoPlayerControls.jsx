"use client";

import React from 'react';

/**
 * Reusable video player controls component
 * Eliminates duplicate control UI across different video players
 */
export const VideoPlayerControls = ({
  videoHash,
  playing,
  videoState,
  fullscreen,
  selectedQuality,
  showQualityMenu,
  onPlayPause,
  onSeek,
  onQualityClick,
  onStatsClick,
  onFullscreenClick,
  onVolumeChange,
  onMuteToggle,
  formatTime,
  showStats = false,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: fullscreen ? '20px' : '10px',
        left: fullscreen ? '20px' : '10px',
        right: fullscreen ? '20px' : '10px',
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderRadius: '6px',
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(255,255,255,0.2)',
      }}
    >
      {/* Play/Pause Button */}
      <button
        onClick={onPlayPause}
        style={{
          background: 'none',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h4v16H6V4zM14 4h4v16h-4V4z" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7L8 5z" />
          </svg>
        )}
      </button>

      {/* Progress Bar */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#fff', fontSize: '12px', minWidth: '35px' }}>
          {formatTime(videoState?.currentTime || 0)}
        </span>
        <input
          type="range"
          min="0"
          max={videoState?.duration || 0}
          value={videoState?.currentTime || 0}
          onChange={onSeek}
          style={{
            flex: 1,
            height: '4px',
            background: '#555',
            outline: 'none',
            borderRadius: '2px',
            cursor: 'pointer',
          }}
          aria-label="Seek"
        />
        <span style={{ color: '#fff', fontSize: '12px', minWidth: '35px' }}>
          {formatTime(videoState?.duration || 0)}
        </span>
      </div>

      {/* Volume Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <button
          onClick={onMuteToggle}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label={videoState?.muted ? 'Unmute' : 'Mute'}
        >
          {videoState?.muted || (videoState?.volume || 0) === 0 ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v4.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
          ) : (videoState?.volume || 0) < 0.5 ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          )}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={videoState?.muted ? 0 : (videoState?.volume || 0)}
          onChange={onVolumeChange}
          style={{
            width: '60px',
            height: '4px',
            background: '#555',
            outline: 'none',
            borderRadius: '2px',
            cursor: 'pointer',
          }}
          aria-label="Volume"
        />
      </div>

      {/* Settings Button (for Quality) */}
      <button
        onClick={onQualityClick}
        style={{
          background: 'none',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px',
          borderRadius: '3px',
          backgroundColor: showQualityMenu ? 'rgba(255,255,255,0.1)' : 'transparent',
        }}
        aria-label="Quality settings"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
        </svg>
      </button>

      {/* Stats Button */}
      {onStatsClick && (
        <button
          onClick={onStatsClick}
          style={{
            background: 'none',
            border: 'none',
            color: showStats ? '#ff6b6b' : '#fff',
            cursor: 'pointer',
            fontSize: '14px',
            fontFamily: 'monospace',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px 6px',
            borderRadius: '3px',
            backgroundColor: showStats ? 'rgba(255,255,255,0.1)' : 'transparent',
          }}
          aria-label="Video stats"
        >
          STATS
        </button>
      )}

      {/* Fullscreen Button */}
      <button
        onClick={onFullscreenClick}
        style={{
          background: 'none',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '16px',
        }}
        aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
        </svg>
      </button>
    </div>
  );
};

/**
 * Quality selection menu component
 */
export const QualityMenu = ({
  videoHash,
  qualities,
  selectedQuality,
  fullscreen,
  onQualitySelect,
}) => {
  // Get all available qualities - handle different data structures
  const getSortedQualities = () => {
    if (!qualities) {
      return [];
    }

    // Handle different possible data structures
    let qualityData = {};

    if (qualities.qualities && typeof qualities.qualities === 'object') {
      qualityData = qualities.qualities;
    } else if (Array.isArray(qualities)) {
      // Convert array format to object
      qualities.forEach(q => {
        if (typeof q === 'string') {
          qualityData[q] = { resolution: q };
        } else if (q && q.quality) {
          qualityData[q.quality] = q;
        }
      });
    } else if (typeof qualities === 'object') {
      // Direct object with quality keys (excluding master and hlsLevels)
      Object.entries(qualities).forEach(([key, value]) => {
        if (key !== 'master' && key !== 'hlsLevels') {
          qualityData[key] = value;
        }
      });
    }

    // Convert to array and sort by resolution (highest first)
    const sortedQualityList = Object.entries(qualityData)
      .map(([quality, meta]) => ({
        quality,
        meta: typeof meta === 'object' ? meta : { resolution: quality },
        // Extract resolution for sorting (e.g., "720p" -> 720)
        resolutionValue: parseInt((meta?.resolution || quality)?.replace(/p$/i, '') || '0') || 0
      }))
      .sort((a, b) => b.resolutionValue - a.resolutionValue); // Highest resolution first

    // Add "Auto" option at the beginning if there are qualities available
    if (sortedQualityList.length > 0) {
      sortedQualityList.unshift({
        quality: 'auto',
        meta: { resolution: 'Auto (Adaptive)' },
        resolutionValue: Infinity // Ensure it stays at the top
      });
    }

    return sortedQualityList;
  };

  const sortedQualities = getSortedQualities();

  return (
    <div
      style={{
        position: 'absolute',
        bottom: fullscreen ? '90px' : '70px',
        right: fullscreen ? '20px' : '10px',
        backgroundColor: '#fff',
        borderRadius: '6px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        minWidth: '160px',
        maxWidth: '200px',
        zIndex: 1000,
        border: '1px solid #e0e0e0',
      }}
    >
      <div
        style={{
          padding: '10px 12px',
          fontSize: '14px',
          fontWeight: 'bold',
          borderBottom: '1px solid #eee',
          color: '#333',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px 6px 0 0',
        }}
      >
        Quality ({sortedQualities.length} available)
      </div>
      <div style={{ padding: '4px 0', maxHeight: '300px', overflowY: 'auto' }}>
        {sortedQualities.length === 0 ? (
          <div style={{
            padding: '10px 12px',
            color: '#666',
            fontSize: '12px',
            textAlign: 'center'
          }}>
            No qualities available
          </div>
        ) : (
          sortedQualities.map(({ quality, meta }) => (
            <button
              key={quality}
              onClick={() => onQualitySelect(quality)}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 12px',
                border: 'none',
                backgroundColor: selectedQuality === quality ? '#e3f2fd' : 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#333',
                fontWeight: selectedQuality === quality ? '600' : '400',
                borderRadius: '0',
                transition: 'background-color 0.2s ease',
                borderTop: '1px solid #f0f0f0',
              }}
              onMouseEnter={(e) => {
                if (selectedQuality !== quality) {
                  e.target.style.backgroundColor = '#f5f5f5';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedQuality !== quality) {
                  e.target.style.backgroundColor = selectedQuality === quality ? '#e3f2fd' : 'transparent';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: selectedQuality === quality ? '#2196f3' : '#ccc',
                  flexShrink: 0
                }}></div>
                <div>
                  <div style={{ fontWeight: '500' }}>{quality}</div>
                  {meta?.resolution && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                      {meta.resolution}
                      {meta.bitrate && ` · ${Math.round(meta.bitrate / 1000)} kbps`}
                      {meta.size && ` · ${meta.size}`}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

/**
 * Video stats overlay component
 */
export const VideoStatsOverlay = ({ videoStats, fullscreen, formatTime }) => {
  if (!videoStats) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: fullscreen ? '20px' : '10px',
        right: fullscreen ? '20px' : '10px',
        backgroundColor: 'rgba(0,0,0,0.8)',
        color: '#fff',
        padding: '12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily: 'monospace',
        maxWidth: fullscreen ? '300px' : '250px',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(255,255,255,0.2)',
      }}
    >
      <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#ff6b6b' }}>
        STATS FOR NERDS
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
        <div>Resolution:</div>
        <div>{videoStats.resolution}</div>

        <div>Quality:</div>
        <div>{videoStats.currentQuality}</div>

        <div>Duration:</div>
        <div>{formatTime(videoStats.duration)}</div>

        <div>Current Time:</div>
        <div>{formatTime(videoStats.currentTime)}</div>

        <div>Buffered:</div>
        <div>
          {formatTime(videoStats.bufferedTime)} ({videoStats.bufferedPercentage}%)
        </div>

        <div>Volume:</div>
        <div>
          {videoStats.volume}% {videoStats.muted ? '(Muted)' : ''}
        </div>

        <div>Playback Rate:</div>
        <div>{videoStats.playbackRate}x</div>

        <div>Network State:</div>
        <div>
          {['Empty', 'Idle', 'Loading', 'No Source'][videoStats.networkState] || 'Unknown'}
        </div>

        <div>Ready State:</div>
        <div>
          {['Nothing', 'Metadata', 'Current', 'Future', 'Enough'][videoStats.readyState] ||
            'Unknown'}
        </div>

        <div>Network Speed:</div>
        <div>{videoStats.networkSpeed || 'Measuring...'}</div>

        <div>Status:</div>
        <div>
          {videoStats.paused
            ? 'Paused'
            : videoStats.ended
            ? 'Ended'
            : videoStats.seeking
            ? 'Seeking'
            : 'Playing'}
        </div>

        <div>Fullscreen:</div>
        <div>{videoStats.fullscreen ? 'Yes' : 'No'}</div>
      </div>
      <div style={{ marginTop: '8px', fontSize: '10px', color: '#ccc' }}>
        Last updated: {new Date(videoStats.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};

/**
 * Buffering indicator component
 */
export const BufferingIndicator = () => {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          border: '4px solid rgba(255,255,255,0.15)',
          borderTop: '4px solid rgba(255,255,255,0.9)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
        aria-hidden="true"
      />
    </div>
  );
};

/**
 * Play button overlay (shown before video loads)
 */
export const PlayButtonOverlay = ({ onPlay, videoTitle }) => {
  return (
    <button
      aria-label={`Play ${videoTitle}`}
      onClick={onPlay}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        backgroundColor: 'rgba(0,0,0,0.6)',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: '#fff',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.8)';
        e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.6)';
        e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 5v14l11-7L8 5z" fill="currentColor" />
      </svg>
    </button>
  );
};

