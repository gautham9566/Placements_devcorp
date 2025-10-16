"use client";

import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';

// Custom Video Player Component - Reused from students page
const CustomVideoPlayer = ({ videoHash, poster, className = "", height = "200px", autoplay = false }) => {
  const [playingVideos, setPlayingVideos] = useState({});
  const [videoStates, setVideoStates] = useState({});
  const [showControls, setShowControls] = useState({});
  const [fullscreenVideos, setFullscreenVideos] = useState({});
  const [showStats, setShowStats] = useState({});
  const [videoStats, setVideoStats] = useState({});
  const [bufferingVideos, setBufferingVideos] = useState({});
  const [qualities, setQualities] = useState({});
  const [selectedQualities, setSelectedQualities] = useState({});
  const [showQualityMenu, setShowQualityMenu] = useState({});

  const hlsInstancesRef = useRef({});
  const pendingQualityRef = useRef({});

  // Format time helper
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Collect video stats
  const collectVideoStats = (hash) => {
    const player = document.getElementById(`player-${hash}`);
    if (!player) return {};

    const buffered = player.buffered;
    let bufferedEnd = 0;
    if (buffered.length > 0) {
      bufferedEnd = buffered.end(buffered.length - 1);
    }
    const bufferedPercentage = player.duration ? (bufferedEnd / player.duration) * 100 : 0;

    return {
      resolution: `${player.videoWidth}x${player.videoHeight}`,
      currentQuality: selectedQualities[hash] || 'auto',
      duration: player.duration || 0,
      currentTime: player.currentTime || 0,
      bufferedTime: bufferedEnd,
      bufferedPercentage: bufferedPercentage.toFixed(1),
      volume: (player.volume * 100).toFixed(0),
      muted: player.muted,
      playbackRate: player.playbackRate,
      networkState: player.networkState,
      readyState: player.readyState,
      paused: player.paused,
      ended: player.ended,
      seeking: videoStates[hash]?.seeking || false,
      fullscreen: (function(){ try { const p = document.getElementById(`player-${hash}`); return !!(document.fullscreenElement && p && document.fullscreenElement.contains(p)); } catch (e) { return !!(fullscreenVideos[hash]); } })(),
    };
  };

  // Load video for hash
  const loadVideoForHash = (hash, quality) => {
    const player = document.getElementById(`player-${hash}`);
    if (!player) return;

    // indicate buffering/loading started
    setBufferingVideos(prev => ({ ...prev, [hash]: true }));

    const videoSrc = quality === 'auto' ? `/api/video/${hash}/master.m3u8` : `/api/video/${hash}/${quality}/playlist.m3u8`;

    if (Hls.isSupported()) {
      if (hlsInstancesRef.current[hash]) {
        hlsInstancesRef.current[hash].destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 120,
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (pendingQualityRef.current[hash]) {
          const levelIndex = hls.levels.findIndex(level => `${level.height}p` === pendingQualityRef.current[hash]);
          if (levelIndex >= 0) {
            hls.currentLevel = levelIndex;
          }
          delete pendingQualityRef.current[hash];
        }
        // If autoplay was requested for this hash, try to play once manifest parsed
        try {
          const playerEl = document.getElementById(`player-${hash}`);
          if (playerEl && autoplay) {
            // attempt to play - may be blocked if not triggered by user gesture
            playerEl.play().catch(() => {});
          }
        } catch (e) {
          // ignore
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

      hls.loadSource(videoSrc);
      hls.attachMedia(player);
      hlsInstancesRef.current[hash] = hls;
    } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
      player.src = videoSrc;
    } else {
      player.src = `/api/video/${hash}?format=mp4`;
    }
  };

  // Fetch qualities
  useEffect(() => {
    const fetchQualities = async () => {
      try {
        const res = await fetch(`/api/transcode/${videoHash}/qualities`);
        if (res.ok) {
          const data = await res.json();
          setQualities(prev => ({ ...prev, [videoHash]: data }));
        }
      } catch (err) {
        console.error('Failed to fetch qualities:', err);
      }
    };
    fetchQualities();
  }, [videoHash]);

  // When videoHash changes and autoplay is requested, start loading and try to play
  useEffect(() => {
    if (!videoHash) return;
    if (!autoplay) return;

    // start loading the video immediately
    try {
      const quality = selectedQualities[videoHash] || 'auto';
      loadVideoForHash(videoHash, quality);
    } catch (e) {
      // ignore
    }

    // Try to play after a short delay; the player may not be attached yet
    const t = setTimeout(() => {
      try {
        const playerEl = document.getElementById(`player-${videoHash}`);
        if (playerEl) {
          // attempt to play; browser may block if not allowed
          playerEl.play().catch(() => {});
        }
      } catch (e) {}
    }, 250);

    return () => clearTimeout(t);
  }, [videoHash, autoplay]);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;
      setFullscreenVideos(prev => ({ ...prev, [videoHash]: isFullscreen }));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [videoHash]);

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (playingVideos[videoHash]) {
        setVideoStats(prev => ({ ...prev, [videoHash]: collectVideoStats(videoHash) }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [playingVideos, videoHash, selectedQualities, videoStates, fullscreenVideos]);

  return (
    <div
      style={{
        position: 'relative',
        width: fullscreenVideos[videoHash] ? '100vw' : '100%',
        height: fullscreenVideos[videoHash] ? '100vh' : height,
        backgroundColor: '#000'
      }}
      data-video-container={videoHash}
      onMouseEnter={() => setShowControls(prev => ({ ...prev, [videoHash]: true }))}
      onMouseMove={() => setShowControls(prev => ({ ...prev, [videoHash]: true }))}
      onMouseLeave={() => {
        if (playingVideos[videoHash] && !fullscreenVideos[videoHash]) {
          setTimeout(() => {
            setShowControls(prev => ({ ...prev, [videoHash]: false }));
          }, 2000);
        }
      }}
    >
      <video
        id={`player-${videoHash}`}
        poster={poster}
        preload={autoplay ? 'auto' : 'none'}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: '4px'
        }}
        onPlay={(e) => {
          if (!e.target.dataset.srcLoaded) {
            const quality = selectedQualities[videoHash] || 'auto';
            loadVideoForHash(videoHash, quality);
            e.target.dataset.srcLoaded = 'true';
          }
          setPlayingVideos(prev => ({ ...prev, [videoHash]: true }));
          setVideoStates(prev => ({
            ...prev,
            [videoHash]: {
              ...prev[videoHash],
              paused: false,
              ended: false
            }
          }));
        }}
        onPause={(e) => {
          setPlayingVideos(prev => ({ ...prev, [videoHash]: false }));
          setVideoStates(prev => ({
            ...prev,
            [videoHash]: {
              ...prev[videoHash],
              paused: true
            }
          }));
        }}
        onEnded={(e) => {
          setPlayingVideos(prev => ({ ...prev, [videoHash]: false }));
          setVideoStates(prev => ({
            ...prev,
            [videoHash]: {
              ...prev[videoHash],
              ended: true
            }
          }));
        }}
        onTimeUpdate={(e) => {
          const player = e.target;
          setVideoStates(prev => ({
            ...prev,
            [videoHash]: {
              ...prev[videoHash],
              currentTime: player.currentTime,
              duration: player.duration
            }
          }));
        }}
        onVolumeChange={(e) => {
          const player = e.target;
          setVideoStates(prev => ({
            ...prev,
            [videoHash]: {
              ...prev[videoHash],
              volume: Math.round(player.volume * 100),
              muted: player.muted
            }
          }));
        }}
        onLoadedMetadata={(e) => {
          const player = e.target;
          setVideoStates(prev => ({
            ...prev,
            [videoHash]: {
              ...prev[videoHash],
              duration: player.duration,
              volume: Math.round(player.volume * 100),
              muted: player.muted
            }
          }));
          // loaded metadata - still may be buffering, but clear if can play
          setBufferingVideos(prev => ({ ...prev, [videoHash]: false }));
        }}
        onWaiting={() => {
          setBufferingVideos(prev => ({ ...prev, [videoHash]: true }));
        }}
        onCanPlay={() => {
          setBufferingVideos(prev => ({ ...prev, [videoHash]: false }));
        }}
        onSeeking={() => {
          setVideoStates(prev => ({
            ...prev,
            [videoHash]: {
              ...prev[videoHash],
              seeking: true
            }
          }));
        }}
        onSeeked={() => {
          setVideoStates(prev => ({
            ...prev,
            [videoHash]: {
              ...prev[videoHash],
              seeking: false
            }
          }));
        }}
      />

      {/* Buffering Indicator */}
      {bufferingVideos[videoHash] && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            border: '4px solid rgba(255,255,255,0.15)',
            borderTop: '4px solid rgba(255,255,255,0.9)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} aria-hidden="true"></div>
        </div>
      )}

      {/* Custom Controls */}
      {showControls[videoHash] && (
        <div style={{
          position: 'absolute',
          bottom: fullscreenVideos[videoHash] ? '20px' : '10px',
          left: fullscreenVideos[videoHash] ? '20px' : '10px',
          right: fullscreenVideos[videoHash] ? '20px' : '10px',
          backgroundColor: 'rgba(0,0,0,0.8)',
          borderRadius: '6px',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          {/* Play/Pause Button */}
          <button
            onClick={() => {
              const player = document.getElementById(`player-${videoHash}`);
              if (player) {
                if (player.paused) {
                  player.play().catch(() => {});
                } else {
                  player.pause();
                }
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {playingVideos[videoHash] ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6V4zM14 4h4v16h-4V4z"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7L8 5z"/>
              </svg>
            )}
          </button>

          {/* Progress Bar */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#fff', fontSize: '12px', minWidth: '35px' }}>
              {formatTime(videoStates[videoHash]?.currentTime || 0)}
            </span>
            <input
              type="range"
              min="0"
              max={videoStates[videoHash]?.duration || 0}
              value={videoStates[videoHash]?.currentTime || 0}
              onChange={(e) => {
                const player = document.getElementById(`player-${videoHash}`);
                if (player) {
                  player.currentTime = parseFloat(e.target.value);
                }
              }}
              style={{
                flex: 1,
                height: '4px',
                background: '#555',
                outline: 'none',
                borderRadius: '2px',
                cursor: 'pointer'
              }}
            />
            <span style={{ color: '#fff', fontSize: '12px', minWidth: '35px' }}>
              {formatTime(videoStates[videoHash]?.duration || 0)}
            </span>
          </div>

          {/* Quality Button */}
          <button
            onClick={() => {
              const newShowMenu = !showQualityMenu[videoHash];
              setShowQualityMenu(prev => ({ ...prev, [videoHash]: newShowMenu }));
              if (newShowMenu) {
                setShowStats(prev => ({ ...prev, [videoHash]: false }));
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: 'monospace',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px 6px',
              borderRadius: '3px',
              backgroundColor: showQualityMenu[videoHash] ? 'rgba(255,255,255,0.1)' : 'transparent'
            }}
            aria-label="Quality settings"
          >
            {selectedQualities[videoHash] || 'AUTO'}
          </button>

          {/* Stats Button */}
          <button
            onClick={() => {
              const newShowStats = !showStats[videoHash];
              setShowStats(prev => ({ ...prev, [videoHash]: newShowStats }));
              if (newShowStats) {
                setShowQualityMenu(prev => ({ ...prev, [videoHash]: false }));
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: showStats[videoHash] ? '#ff6b6b' : '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: 'monospace',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px 6px',
              borderRadius: '3px',
              backgroundColor: showStats[videoHash] ? 'rgba(255,255,255,0.1)' : 'transparent'
            }}
            aria-label="Video stats"
          >
            STATS
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={() => {
              const videoContainer = document.querySelector(`[data-video-container="${videoHash}"]`);
              if (document.fullscreenElement) {
                document.exitFullscreen();
              } else if (videoContainer) {
                videoContainer.requestFullscreen();
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
            </svg>
          </button>
        </div>
      )}

      {/* Quality Menu */}
      {showQualityMenu[videoHash] && qualities[videoHash] && (
        <div style={{
          position: 'absolute',
          bottom: fullscreenVideos[videoHash] ? '80px' : '70px',
          right: fullscreenVideos[videoHash] ? '20px' : '10px',
          backgroundColor: 'rgba(0,0,0,0.9)',
          borderRadius: '6px',
          padding: '8px',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <button
            onClick={() => {
              setSelectedQualities(prev => ({ ...prev, [videoHash]: 'auto' }));
              setShowQualityMenu(prev => ({ ...prev, [videoHash]: false }));
            }}
            style={{
              display: 'block',
              width: '100%',
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: '4px 8px',
              textAlign: 'left',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}
          >
            AUTO
          </button>
          {Object.keys(qualities[videoHash].qualities || {}).map((quality) => (
            <button
              key={quality}
              onClick={() => {
                setSelectedQualities(prev => ({ ...prev, [videoHash]: quality }));
                setShowQualityMenu(prev => ({ ...prev, [videoHash]: false }));
              }}
              style={{
                display: 'block',
                width: '100%',
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: '4px 8px',
                textAlign: 'left',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}
            >
              {quality}
            </button>
          ))}
        </div>
      )}

      {/* Stats Overlay */}
      {showStats[videoHash] && videoStats[videoHash] && (
        <div
          data-stats={videoHash}
          style={{
            position: 'absolute',
            top: fullscreenVideos[videoHash] ? '20px' : '10px',
            right: fullscreenVideos[videoHash] ? '20px' : '10px',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: '#fff',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'monospace',
            maxWidth: fullscreenVideos[videoHash] ? '300px' : '250px',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
          <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#ff6b6b' }}>
            STATS FOR NERDS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
            <div>Resolution:</div>
            <div>{videoStats[videoHash].resolution}</div>
            <div>Quality:</div>
            <div>{videoStats[videoHash].currentQuality}</div>
            <div>Duration:</div>
            <div>{formatTime(videoStats[videoHash].duration)}</div>
            <div>Current Time:</div>
            <div>{formatTime(videoStats[videoHash].currentTime)}</div>
            <div>Buffered:</div>
            <div>{formatTime(videoStats[videoHash].bufferedTime)} ({videoStats[videoHash].bufferedPercentage}%)</div>
            <div>Volume:</div>
            <div>{videoStats[videoHash].volume}% {videoStats[videoHash].muted ? '(Muted)' : ''}</div>
            <div>Playback Rate:</div>
            <div>{videoStats[videoHash].playbackRate}x</div>
            <div>Network State:</div>
            <div>{['Empty', 'Idle', 'Loading', 'No Source'][videoStats[videoHash].networkState] || 'Unknown'}</div>
            <div>Ready State:</div>
            <div>{['Nothing', 'Metadata', 'Current', 'Future', 'Enough'][videoStats[videoHash].readyState] || 'Unknown'}</div>
            <div>Status:</div>
            <div>
              {videoStats[videoHash].paused ? 'Paused' :
               videoStats[videoHash].ended ? 'Ended' :
               videoStats[videoHash].seeking ? 'Seeking' : 'Playing'}
            </div>
            <div>Fullscreen:</div>
            <div>{videoStats[videoHash].fullscreen ? 'Yes' : 'No'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomVideoPlayer;