"use client";

import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';

const VideoPlayerModal = ({ video, onClose }) => {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [qualities, setQualities] = useState({ master: null, qualities: {} });
  const [selectedQuality, setSelectedQuality] = useState('auto');

  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // Format time helper
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch available qualities
  useEffect(() => {
    const fetchQualities = async () => {
      try {
        const res = await fetch(`/api/transcode/${video.hash}/qualities`);
        if (res.ok) {
          const data = await res.json();
          setQualities(data);
        }
      } catch (err) {
        console.error('Failed to fetch qualities:', err);
      }
    };
    fetchQualities();
  }, [video.hash]);

  // Initialize video player
  useEffect(() => {
    if (!videoRef.current) return;

    const masterUrl = `/api/video/${video.hash}/${qualities.master || 'master.m3u8'}`;
    
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 120,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (selectedQuality !== 'auto') {
          const levelIndex = hls.levels.findIndex(
            level => level.name === selectedQuality || `${level.height}p` === selectedQuality
          );
          if (levelIndex >= 0) {
            hls.currentLevel = levelIndex;
          }
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          }
        }
      });

      hls.loadSource(masterUrl);
      hls.attachMedia(videoRef.current);
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = masterUrl;
    } else {
      videoRef.current.src = `/api/video/${video.hash}?format=mp4`;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [video.hash, qualities.master]);

  // Update quality
  useEffect(() => {
    if (!hlsRef.current || selectedQuality === 'auto') {
      if (hlsRef.current) {
        hlsRef.current.currentLevel = -1;
      }
      return;
    }

    const levelIndex = hlsRef.current.levels.findIndex(
      level => level.name === selectedQuality || `${level.height}p` === selectedQuality
    );
    if (levelIndex >= 0) {
      hlsRef.current.currentLevel = levelIndex;
    }
  }, [selectedQuality]);

  // Handle fullscreen
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  // Auto-hide controls
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (playing && !showQualityMenu) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const normalizeThumbnail = (url) => {
    if (!url) return undefined;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    if (url.startsWith('/api/') || url.startsWith('/images/') || url.startsWith('/_next/')) return url;
    const COURSE_SERVICE_ORIGIN = process.env.NEXT_PUBLIC_COURSE_SERVICE_ORIGIN;
    if (url.startsWith('/thumbnails')) return `${COURSE_SERVICE_ORIGIN}${url}`;
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
      <div
        ref={containerRef}
        className="relative w-full max-w-6xl mx-4"
        onMouseMove={resetControlsTimeout}
        onMouseEnter={() => setShowControls(true)}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 transition-all"
          style={{ display: showControls || !playing ? 'block' : 'none' }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Video Title */}
        <div
          className="absolute top-4 left-4 z-50 text-white bg-black bg-opacity-50 px-4 py-2 rounded"
          style={{ display: showControls || !playing ? 'block' : 'none' }}
        >
          <h3 className="text-lg font-semibold">{video.title || video.filename}</h3>
        </div>

        {/* Video Player */}
        <video
          ref={videoRef}
          className="w-full h-auto max-h-[80vh] bg-black rounded-lg"
          poster={video.thumbnail_filename ? normalizeThumbnail(video.thumbnail_url || `/api/thumbnail/${video.hash}`) : undefined}
          onPlay={() => {
            setPlaying(true);
            resetControlsTimeout();
          }}
          onPause={() => {
            setPlaying(false);
            setShowControls(true);
            if (controlsTimeoutRef.current) {
              clearTimeout(controlsTimeoutRef.current);
            }
          }}
          onTimeUpdate={(e) => {
            setCurrentTime(e.currentTarget.currentTime);
            setDuration(e.currentTarget.duration);
          }}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration);
            setVolume(e.currentTarget.volume);
            setMuted(e.currentTarget.muted);
          }}
          onVolumeChange={(e) => {
            setVolume(e.currentTarget.volume);
            setMuted(e.currentTarget.muted);
          }}
          onWaiting={() => setBuffering(true)}
          onCanPlay={() => setBuffering(false)}
          onEnded={() => setBuffering(false)}
        >
          Your browser does not support the video tag.
        </video>

        {/* Buffering Indicator */}
        {buffering && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Custom Controls */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 transition-opacity duration-300"
          style={{ opacity: showControls || !playing ? 1 : 0, pointerEvents: showControls || !playing ? 'auto' : 'none' }}
        >
          {/* Progress Bar */}
          <div
            className="w-full h-1 bg-gray-600 rounded-full cursor-pointer mb-4 relative group"
            onClick={(e) => {
              if (videoRef.current && duration) {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percentage = clickX / rect.width;
                videoRef.current.currentTime = percentage * duration;
              }
            }}
          >
            <div
              className="h-full bg-red-600 rounded-full relative"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            >
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <button
                onClick={() => {
                  if (playing) {
                    videoRef.current?.pause();
                  } else {
                    videoRef.current?.play();
                  }
                }}
                className="text-white hover:text-gray-300 transition-colors"
              >
                {playing ? (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zM14 4h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7L8 5z"/>
                  </svg>
                )}
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.muted = !muted;
                    }
                  }}
                  className="text-white hover:text-gray-300 transition-colors"
                >
                  {muted || volume === 0 ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3.63 3.63a.996.996 0 0 0 0 1.41L7.29 8.7 7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91-.36.15-.58.53-.58.92 0 .72.73 1.18 1.39.91.36-.12.69-.28 1-.47l.76.76a.996.996 0 0 0 1.41 0 .996.996 0 0 0 0-1.41L5.05 3.63c-.39-.39-1.02-.39-1.41 0zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87 0-3.83-2.4-7.11-5.78-8.4-.59-.23-1.22.23-1.22.86v.19c0 .38.25.71.61.85C17.18 6.54 19 9.06 19 12zm-8.71-6.29l-.17.17L12 7.76V6.41c0-.89-1.08-1.33-1.71-.71zM16.5 12c0-1.77-1.02-3.29-2.5-4.03v1.79l2.48 2.46c.01-.08.02-.16.02-.22z"/>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    if (videoRef.current) {
                      const newVolume = parseFloat(e.target.value);
                      videoRef.current.volume = newVolume;
                      if (newVolume > 0) {
                        videoRef.current.muted = false;
                      }
                    }
                  }}
                  className="w-20 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer slider"
                />
              </div>

              {/* Time */}
              <span className="text-white text-sm font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Quality Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className="text-white hover:text-gray-300 transition-colors px-3 py-1 bg-gray-800 bg-opacity-50 rounded"
                >
                  <span className="text-sm font-semibold">
                    {selectedQuality === 'auto' ? 'Auto' : selectedQuality}
                  </span>
                </button>

                {showQualityMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-gray-900 bg-opacity-95 rounded-lg shadow-lg overflow-hidden min-w-[120px]">
                    <button
                      onClick={() => {
                        setSelectedQuality('auto');
                        setShowQualityMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm ${
                        selectedQuality === 'auto' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      Auto
                    </button>
                    {Object.keys(qualities.qualities || {}).map((quality) => (
                      <button
                        key={quality}
                        onClick={() => {
                          setSelectedQuality(quality);
                          setShowQualityMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm ${
                          selectedQuality === quality ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        {quality}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-gray-300 transition-colors"
              >
                {fullscreen ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default VideoPlayerModal;
