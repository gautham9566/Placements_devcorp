"use client";

import React, { useEffect, useState, useRef } from 'react';
import Hls from 'hls.js';

export default function StudentPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadedVideos, setLoadedVideos] = useState({});
  const [transcodeStatus, setTranscodeStatus] = useState({});
  const [qualities, setQualities] = useState({});
  const [selectedQualities, setSelectedQualities] = useState({});
  const [showQualityMenu, setShowQualityMenu] = useState({});
  const [playingVideos, setPlayingVideos] = useState({});
  const [videoStates, setVideoStates] = useState({});
  const [showControls, setShowControls] = useState({});
  const [fullscreenVideos, setFullscreenVideos] = useState({});
  const [showStats, setShowStats] = useState({});
  const [videoStats, setVideoStats] = useState({});
  const [bufferingVideos, setBufferingVideos] = useState({});

  const hlsInstancesRef = useRef({});
  const pendingQualityRef = useRef({});
  const activeSourceRef = useRef({});
  const masterSourceRef = useRef({});

  // Helper function to format time
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper function to format bytes
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Collect video stats
  const collectVideoStats = (hash) => {
    const player = document.getElementById(`player-${hash}`);
    if (!player) return {};

    const buffered = player.buffered;
    const bufferedEnd = buffered.length > 0 ? buffered.end(buffered.length - 1) : 0;
    const bufferedPercentage = player.duration ? (bufferedEnd / player.duration) * 100 : 0;

    const selected = selectedQualities[hash] || 'auto';
    let activeQuality = selected === 'auto' ? 'Auto' : selected || 'Auto';
    const hls = hlsInstancesRef.current[hash];
    if (hls && Array.isArray(hls.levels) && hls.currentLevel !== undefined && hls.currentLevel >= 0) {
      const level = hls.levels[hls.currentLevel];
      if (level) {
        activeQuality = level.name || (level.height ? `${level.height}p` : activeQuality);
      }
    }

    return {
      resolution: `${player.videoWidth}x${player.videoHeight}`,
      currentQuality: activeQuality,
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
      seeking: player.seeking,
  fullscreen: (function(){ try { const p = document.getElementById(`player-${hash}`); return !!(document.fullscreenElement && p && document.fullscreenElement.contains(p)); } catch (e) { return !!(fullscreenVideos[hash]); } })(),
      timestamp: Date.now()
    };
  };

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/videos');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setVideos(data);
          // Fetch qualities asynchronously after videos are loaded
          fetchQualitiesForVideos(data);
        }
      } else {
        setError('Failed to load videos');
      }
    } catch (error) {
      setError('Network error while loading videos');
    } finally {
      setLoading(false);
    }
  };

  const fetchQualitiesForVideos = async (videos) => {
    const qualitiesData = {};
    for (const v of videos) {
      try {
        const res = await fetch(`/api/transcode/${v.hash}/qualities`);
        if (res.ok) {
          const qdata = await res.json();
          qualitiesData[v.hash] = {
            master: qdata.master,
            qualities: qdata.qualities || {},
          };
          if (qdata.master) {
            masterSourceRef.current[v.hash] = `/api/video/${v.hash}/${qdata.master}`;
          } else {
            masterSourceRef.current[v.hash] = `/api/video/${v.hash}`;
          }
        }
      } catch (err) {
        // ignore errors for individual quality fetches
      }
    }
    setQualities(qualitiesData);
    setSelectedQualities((prev) => {
      const next = { ...prev };
      videos.forEach((video) => {
        if (!next[video.hash]) {
          next[video.hash] = 'auto';
        }
      });
      return next;
    });
  };

  const getMasterUrl = (hash) => {
    const stored = masterSourceRef.current[hash];
    if (stored) return stored;
    return `/api/video/${hash}/master.m3u8`;
  };

  const getVariantPlaylistUrl = (hash, quality) => `/api/video/${hash}/${quality}/playlist.m3u8`;

  const findLevelIndex = (hash, quality) => {
    const hls = hlsInstancesRef.current[hash];
    if (!hls || !Array.isArray(hls.levels)) return -1;
    const normalized = (quality || '').toLowerCase();
    let idx = hls.levels.findIndex((level) => level.name && level.name.toLowerCase() === normalized);
    if (idx !== -1) return idx;
    idx = hls.levels.findIndex((level) => level.height && `${level.height}p` === normalized);
    if (idx !== -1) return idx;
    return hls.levels.findIndex((level) => level.height && `${level.height}` === normalized);
  };

  const ensureHlsInstance = (hash, preferredQuality = 'auto') => {
    const player = typeof document !== 'undefined' ? document.getElementById(`player-${hash}`) : null;
    if (!player || !Hls.isSupported()) {
      return null;
    }

    let hls = hlsInstancesRef.current[hash];
    const masterUrl = getMasterUrl(hash);

    if (!hls) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 120,
      });
      hlsInstancesRef.current[hash] = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, (_event) => {
        const pending = pendingQualityRef.current[hash] || preferredQuality;
        if (pending && pending !== 'auto') {
          const idx = findLevelIndex(hash, pending);
          hls.currentLevel = idx >= 0 ? idx : -1;
        } else {
          hls.currentLevel = -1;
        }
        delete pendingQualityRef.current[hash];
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data?.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          try {
            hls.destroy();
          } catch (e) {
            /* noop */
          }
          delete hlsInstancesRef.current[hash];
        }
      });

      hls.attachMedia(player);
    }

    if (activeSourceRef.current[hash] !== masterUrl) {
      hls.loadSource(masterUrl);
      activeSourceRef.current[hash] = masterUrl;
    }

    if (preferredQuality && preferredQuality !== 'auto') {
      const idx = findLevelIndex(hash, preferredQuality);
      if (idx >= 0) {
        hls.currentLevel = idx;
      } else {
        pendingQualityRef.current[hash] = preferredQuality;
        hls.currentLevel = -1;
      }
    } else {
      hls.currentLevel = -1;
    }

    return hls;
  };

  const loadVideoForHash = (hash, preferredQuality = 'auto') => {
    const player = typeof document !== 'undefined' ? document.getElementById(`player-${hash}`) : null;
    if (!player) return;

    const qualityInfo = qualities[hash];
    const masterUrl = getMasterUrl(hash);
    const hasHlsOutputs = Boolean(qualityInfo && (qualityInfo.master || Object.keys(qualityInfo.qualities || {}).length));

    if (Hls.isSupported() && hasHlsOutputs) {
      ensureHlsInstance(hash, preferredQuality);
      player.dataset.srcLoaded = '1';
      return;
    }

    const supportsNativeHls = player.canPlayType && player.canPlayType('application/vnd.apple.mpegurl');
    if (supportsNativeHls) {
      const target = preferredQuality && preferredQuality !== 'auto'
        ? getVariantPlaylistUrl(hash, preferredQuality)
        : masterUrl;
      if (player.src !== target) {
        player.src = target;
        try { player.load(); } catch (e) {}
      }
      player.dataset.srcLoaded = '1';
      return;
    }

    const fallback = `/api/video/${hash}?format=mp4`;
    if (player.src !== fallback) {
      player.src = fallback;
      try { player.load(); } catch (e) {}
    }
    player.dataset.srcLoaded = '1';
  };

  // Switch quality for a playing video while preserving currentTime/play state
  const applyQualityToPlayer = (hash, quality) => {
    const player = document.getElementById(`player-${hash}`);
    if (!player) return;

    const targetQuality = quality || 'auto';
    const currentTime = player.currentTime || 0;
    const wasPaused = player.paused;

    const restorePlayback = () => {
      try {
        if (player.duration && currentTime < player.duration) {
          player.currentTime = currentTime;
        }
      } catch (e) {}
      if (!wasPaused) {
        player.play().catch(() => {});
      }
    };

    setLoadedVideos(prev => ({ ...prev, [hash]: true }));
    loadVideoForHash(hash, targetQuality);

    if (Hls.isSupported()) {
      const hls = ensureHlsInstance(hash, targetQuality);
      if (!hls) {
        return;
      }
      if (!player.readyState || player.readyState < 1) {
        const onLoaded = () => {
          player.removeEventListener('loadedmetadata', onLoaded);
          restorePlayback();
        };
        player.addEventListener('loadedmetadata', onLoaded);
      } else {
        restorePlayback();
      }
      return;
    }

    const supportsNativeHls = player.canPlayType && player.canPlayType('application/vnd.apple.mpegurl');
    if (supportsNativeHls) {
      const target = targetQuality === 'auto'
        ? getMasterUrl(hash)
        : getVariantPlaylistUrl(hash, targetQuality);
      if (player.src !== target) {
        player.src = target;
        try { player.load(); } catch (e) {}
        const onLoaded = () => {
          player.removeEventListener('loadedmetadata', onLoaded);
          restorePlayback();
        };
        player.addEventListener('loadedmetadata', onLoaded);
      } else {
        restorePlayback();
      }
      return;
    }

    const fallback = `/api/video/${hash}?format=mp4`;
    if (player.src !== fallback) {
      player.src = fallback;
      try { player.load(); } catch (e) {}
      const onLoaded = () => {
        player.removeEventListener('loadedmetadata', onLoaded);
        restorePlayback();
      };
      player.addEventListener('loadedmetadata', onLoaded);
    } else {
      restorePlayback();
    }
  };

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsEl = document.fullscreenElement;
      if (fsEl) {
        // If something is fullscreen, try to find any player inside it
        const player = fsEl.tagName && fsEl.id && fsEl.id.startsWith('player-') ? fsEl : fsEl.querySelector ? fsEl.querySelector("video[id^='player-']") : null;
        if (player && player.id) {
          const hash = player.id.replace('player-', '');
          setFullscreenVideos(prev => ({ ...prev, [hash]: true }));
          setShowControls(prev => ({ ...prev, [hash]: true }));
          return;
        }
      }
      // Clear all fullscreen states when exiting or if no player found
      setFullscreenVideos({});
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Update video stats periodically when stats panel is open
  useEffect(() => {
    const statsHashes = Object.keys(showStats).filter(hash => showStats[hash]);
    if (statsHashes.length === 0) return;

    const updateStats = () => {
      const newStats = {};
      statsHashes.forEach(hash => {
        newStats[hash] = collectVideoStats(hash);
      });
      setVideoStats(prev => ({ ...prev, ...newStats }));
    };

    updateStats(); // Initial update
    const interval = setInterval(updateStats, 1000); // Update every second
    return () => clearInterval(interval);
  }, [showStats, selectedQualities, fullscreenVideos]);

  // Load videos on mount
  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => () => {
    Object.values(hlsInstancesRef.current).forEach((instance) => {
      try {
        instance.destroy();
      } catch (e) {
        /* noop */
      }
    });
    hlsInstancesRef.current = {};
    activeSourceRef.current = {};
    pendingQualityRef.current = {};
  }, []);

  // Poll status for videos every 5 seconds
  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      if (!mounted) return;
      for (const v of videos) {
        try {
          const res = await fetch(`/api/transcode/${v.hash}/status`);
          if (res.ok) {
            const data = await res.json();
            setTranscodeStatus(prev => ({ ...prev, [v.hash]: data }));
          }
        } catch (err) {
          // ignore
        }
      }
    };

    const id = setInterval(poll, 5000);
    // run once immediately
    poll();
    return () => { mounted = false; clearInterval(id); };
  }, [videos]);

  const triggerTranscode = async (hash) => {
    try {
      await fetch(`/api/transcode/${hash}`, { method: 'POST' });
      // immediately poll status
      const res = await fetch(`/api/transcode/${hash}/status`);
      if (res.ok) {
        const data = await res.json();
        setTranscodeStatus(prev => ({ ...prev, [hash]: data }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
        <p>Loading videos...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '30px' }}>Student Videos</h1>

        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {videos.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '50px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <p style={{ color: '#666', fontSize: '18px' }}>No videos available yet.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {videos.map((video) => (
              <div key={video.id} style={{
                backgroundColor: '#fff',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }} onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
              }} onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
              }}>
                <div style={{ padding: '15px' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '18px' }}>{video.filename}</h3>
                    <div style={{ marginBottom: 8 }}>
                      {transcodeStatus[video.hash] ? (
                        <div style={{ fontSize: 13 }}>
                          <strong>Transcode:</strong> {transcodeStatus[video.hash].overall || 'unknown'}
                          <div style={{ marginTop: 6 }}>
                            {Object.entries(transcodeStatus[video.hash].qualities || {}).map(([k, v]) => (
                              <div key={k} style={{ fontSize: 12 }}>{k}: {v.status}{v.message ? ` - ${v.message.slice(0,80)}` : ''}</div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: '#666' }}>Transcode: not started</div>
                      )}
                      {/* manual transcode trigger removed from students UI */}
                    </div>
                  <div style={{ position: 'relative',
                    width: fullscreenVideos[video.hash] ? '100vw' : 'auto',
                    height: fullscreenVideos[video.hash] ? '100vh' : 'auto'
                  }}
                    data-video-container={video.hash}
                    onMouseEnter={() => setShowControls(prev => ({ ...prev, [video.hash]: true }))}
                    onMouseMove={() => setShowControls(prev => ({ ...prev, [video.hash]: true }))}
                    onMouseLeave={() => {
                      // Hide controls after a delay if video is playing and not in fullscreen
                      if (playingVideos[video.hash] && !fullscreenVideos[video.hash]) {
                        setTimeout(() => {
                          setShowControls(prev => ({ ...prev, [video.hash]: false }));
                        }, 2000);
                      }
                    }}
                  >
                    <video
                      id={`player-${video.hash}`}
                      poster={video.thumbnail_filename ? `/api/thumbnail/${video.hash}` : undefined}
                      preload="none"
                      style={{
                        width: fullscreenVideos[video.hash] ? '100%' : '100%',
                        height: fullscreenVideos[video.hash] ? '100vh' : '200px',
                        objectFit: fullscreenVideos[video.hash] ? 'contain' : 'cover',
                        borderRadius: fullscreenVideos[video.hash] ? '0' : '4px',
                        backgroundColor: '#000'
                      }}
                      onPlay={(e) => {
                        // Lazy-load the video src only when the user starts playback
                        const player = e.currentTarget;
                        if (!player.dataset.srcLoaded) {
                          const quality = selectedQualities[video.hash] || 'auto';
                          loadVideoForHash(video.hash, quality);
                          // mark in React state too so overlay hides
                          setLoadedVideos(prev => ({ ...prev, [video.hash]: true }));
                          requestAnimationFrame(() => {
                            player.play().catch(() => {});
                          });
                        }
                        setPlayingVideos(prev => ({ ...prev, [video.hash]: true }));
                        setShowControls(prev => ({ ...prev, [video.hash]: true }));
                      }}
                      onPause={(e) => {
                        setPlayingVideos(prev => ({ ...prev, [video.hash]: false }));
                        setShowControls(prev => ({ ...prev, [video.hash]: true }));
                        setBufferingVideos(prev => ({ ...prev, [video.hash]: false }));
                      }}
                      onTimeUpdate={(e) => {
                        const player = e.currentTarget;
                        setVideoStates(prev => ({
                          ...prev,
                          [video.hash]: {
                            ...prev[video.hash],
                            currentTime: player.currentTime,
                            duration: player.duration
                          }
                        }));
                      }}
                      onLoadedMetadata={(e) => {
                        const player = e.currentTarget;
                        setVideoStates(prev => ({
                          ...prev,
                          [video.hash]: {
                            ...prev[video.hash],
                            duration: player.duration,
                            volume: player.volume,
                            muted: player.muted
                          }
                        }));
                        setShowControls(prev => ({ ...prev, [video.hash]: true }));
                      }}
                      onVolumeChange={(e) => {
                        const player = e.currentTarget;
                        setVideoStates(prev => ({
                          ...prev,
                          [video.hash]: {
                            ...prev[video.hash],
                            volume: player.volume,
                            muted: player.muted
                          }
                        }));
                      }}
                      onWaiting={() => setBufferingVideos(prev => ({ ...prev, [video.hash]: true }))}
                      onCanPlay={() => setBufferingVideos(prev => ({ ...prev, [video.hash]: false }))}
                      onEnded={() => setBufferingVideos(prev => ({ ...prev, [video.hash]: false }))}
                    >
                      Your browser does not support the video tag.
                    </video>

                    {/* Buffering Indicator */}
                    {bufferingVideos[video.hash] && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        borderRadius: '8px',
                        padding: '16px'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          border: '4px solid #f3f3f3',
                          borderTop: '4px solid #3498db',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                      </div>
                    )}

                    {/* Custom Controls */}
                    {(showControls[video.hash] || fullscreenVideos[video.hash]) && (
                      <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        right: '0',
                        background: fullscreenVideos[video.hash] 
                          ? 'linear-gradient(transparent, rgba(0,0,0,0.9))' 
                          : 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                        padding: fullscreenVideos[video.hash] ? '20px' : '10px',
                        opacity: (showControls[video.hash] || fullscreenVideos[video.hash]) ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                        zIndex: fullscreenVideos[video.hash] ? 9999 : 'auto'
                      }}>
                        {/* Progress Bar */}
                        <div style={{
                          width: '100%',
                          height: '4px',
                          backgroundColor: 'rgba(255,255,255,0.3)',
                          borderRadius: '2px',
                          marginBottom: '10px',
                          cursor: 'pointer',
                          position: 'relative'
                        }} onClick={(e) => {
                          const player = document.getElementById(`player-${video.hash}`);
                          if (player && player.duration) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const percentage = clickX / rect.width;
                            player.currentTime = percentage * player.duration;
                          }
                        }}>
                          <div style={{
                            height: '100%',
                            backgroundColor: '#ff0000',
                            borderRadius: '2px',
                            width: `${videoStates[video.hash]?.duration ? ((videoStates[video.hash].currentTime || 0) / videoStates[video.hash].duration) * 100 : 0}%`
                          }}></div>
                        </div>

                        {/* Control Buttons */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {/* Play/Pause Button */}
                            <button
                              onClick={() => {
                                const player = document.getElementById(`player-${video.hash}`);
                                if (player) {
                                  if (playingVideos[video.hash]) {
                                    player.pause();
                                  } else {
                                    player.play().catch(() => {});
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
                              {playingVideos[video.hash] ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M6 4h4v16H6V4zM14 4h4v16h-4V4z"/>
                                </svg>
                              ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M8 5v14l11-7L8 5z"/>
                                </svg>
                              )}
                            </button>

                            {/* Volume Control */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <button
                                onClick={() => {
                                  const player = document.getElementById(`player-${video.hash}`);
                                  if (player) {
                                    player.muted = !player.muted;
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
                                {videoStates[video.hash]?.muted || (videoStates[video.hash]?.volume === 0) ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M3.63 3.63a.996.996 0 0 0 0 1.41L7.29 8.7 7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91-.36.15-.58.53-.58.92 0 .72.73 1.18 1.39.91.36-.12.69-.28 1-.47l.76.76a.996.996 0 0 0 1.41 0 .996.996 0 0 0 0-1.41L5.05 3.63c-.39-.39-1.02-.39-1.41 0zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87 0-3.83-2.4-7.11-5.78-8.4-.59-.23-1.22.23-1.22.86v.19c0 .38.25.71.61.85C17.18 6.54 19 9.06 19 12zm-8.71-6.29l-.17.17L12 7.76V6.41c0-.89-1.08-1.33-1.71-.71zM16.5 12c0-1.77-1.02-3.29-2.5-4.03v1.79l2.48 2.46c.01-.08.02-.16.02-.22z"/>
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
                                value={videoStates[video.hash]?.muted ? 0 : (videoStates[video.hash]?.volume || 1)}
                                onChange={(e) => {
                                  const player = document.getElementById(`player-${video.hash}`);
                                  if (player) {
                                    player.volume = parseFloat(e.target.value);
                                    if (parseFloat(e.target.value) > 0) {
                                      player.muted = false;
                                    }
                                  }
                                }}
                                style={{
                                  width: '60px',
                                  height: '4px',
                                  background: '#fff',
                                  outline: 'none',
                                  borderRadius: '2px'
                                }}
                              />
                            </div>

                            {/* Time Display */}
                            <span style={{ color: '#fff', fontSize: '14px', fontFamily: 'monospace' }}>
                              {formatTime(videoStates[video.hash]?.currentTime || 0)} / {formatTime(videoStates[video.hash]?.duration || 0)}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {/* Quality Button */}
                            <button
                              data-settings={video.hash}
                              onClick={() => setShowQualityMenu(prev => ({ ...prev, [video.hash]: !prev[video.hash] }))}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              aria-label="Video quality"
                            >
                              ⚙️
                            </button>

                            {/* Stats Button */}
                            <button
                              data-stats-btn={video.hash}
                              onClick={() => {
                                const newShowStats = !showStats[video.hash];
                                setShowStats(prev => ({ ...prev, [video.hash]: newShowStats }));
                                if (newShowStats) {
                                  // Close quality menu if open
                                  setShowQualityMenu(prev => ({ ...prev, [video.hash]: false }));
                                }
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: showStats[video.hash] ? '#ff6b6b' : '#fff',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontFamily: 'monospace',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                backgroundColor: showStats[video.hash] ? 'rgba(255,255,255,0.1)' : 'transparent'
                              }}
                              aria-label="Video stats"
                            >
                              STATS
                            </button>

                            {/* Fullscreen Button */}
                            <button
                              onClick={() => {
                                const videoContainer = document.querySelector(`[data-video-container="${video.hash}"]`);
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
                        </div>
                      </div>
                    )}

                    {/* Stats Overlay */}
                    {showStats[video.hash] && videoStats[video.hash] && (
                      <div 
                        data-stats={video.hash}
                        style={{
                        position: 'absolute',
                        top: fullscreenVideos[video.hash] ? '20px' : '10px',
                        right: fullscreenVideos[video.hash] ? '20px' : '10px',
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        color: '#fff',
                        padding: '12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        maxWidth: fullscreenVideos[video.hash] ? '300px' : '250px',
                        zIndex: 1000,
                        backdropFilter: 'blur(4px)',
                        border: '1px solid rgba(255,255,255,0.2)'
                      }}>
                        <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#ff6b6b' }}>
                          STATS FOR NERDS
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                          <div>Resolution:</div>
                          <div>{videoStats[video.hash].resolution}</div>

                          <div>Quality:</div>
                          <div>{videoStats[video.hash].currentQuality}</div>

                          <div>Duration:</div>
                          <div>{formatTime(videoStats[video.hash].duration)}</div>

                          <div>Current Time:</div>
                          <div>{formatTime(videoStats[video.hash].currentTime)}</div>

                          <div>Buffered:</div>
                          <div>{formatTime(videoStats[video.hash].bufferedTime)} ({videoStats[video.hash].bufferedPercentage}%)</div>

                          <div>Volume:</div>
                          <div>{videoStats[video.hash].volume}% {videoStats[video.hash].muted ? '(Muted)' : ''}</div>

                          <div>Playback Rate:</div>
                          <div>{videoStats[video.hash].playbackRate}x</div>

                          <div>Network State:</div>
                          <div>{['Empty', 'Idle', 'Loading', 'No Source'][videoStats[video.hash].networkState] || 'Unknown'}</div>

                          <div>Ready State:</div>
                          <div>{['Nothing', 'Metadata', 'Current', 'Future', 'Enough'][videoStats[video.hash].readyState] || 'Unknown'}</div>

                          <div>Status:</div>
                          <div>
                            {videoStats[video.hash].paused ? 'Paused' :
                             videoStats[video.hash].ended ? 'Ended' :
                             videoStats[video.hash].seeking ? 'Seeking' : 'Playing'}
                          </div>

                          <div>Fullscreen:</div>
                          <div>{videoStats[video.hash].fullscreen ? 'Yes' : 'No'}</div>
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '10px', color: '#ccc' }}>
                          Last updated: {new Date(videoStats[video.hash].timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    )}

                    {/* Custom Settings Button - Remove this as it's now in controls */}

                    {/* Quality Menu */}
                    {showQualityMenu[video.hash] && (
                      <div 
                        data-menu={video.hash}
                        style={{
                          position: 'absolute',
                          bottom: fullscreenVideos[video.hash] ? '90px' : '70px',
                          right: fullscreenVideos[video.hash] ? '20px' : '10px',
                          backgroundColor: '#fff',
                          borderRadius: '4px',
                          boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                          minWidth: '120px',
                          zIndex: 1000
                        }}
                      >
                        <div style={{
                          padding: '8px 12px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          borderBottom: '1px solid #eee',
                          color: '#333'
                        }}>
                          Quality
                        </div>
                        <div style={{ padding: '4px 0' }}>
                          <button
                            onClick={() => {
                              setSelectedQualities(prev => ({ ...prev, [video.hash]: 'auto' }));
                              setShowQualityMenu(prev => ({ ...prev, [video.hash]: false }));
                              applyQualityToPlayer(video.hash, 'auto');
                            }}
                            style={{
                              display: 'block',
                              width: '100%',
                              padding: '8px 12px',
                              border: 'none',
                              backgroundColor: (selectedQualities[video.hash] || 'auto') === 'auto' ? '#f0f0f0' : 'transparent',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: '#333'
                            }}
                          >
                            Auto (Best)
                          </button>
                          {Object.entries(qualities[video.hash]?.qualities || {}).map(([q, meta]) => (
                            <button
                              key={q}
                              onClick={() => {
                                setSelectedQualities(prev => ({ ...prev, [video.hash]: q }));
                                setShowQualityMenu(prev => ({ ...prev, [video.hash]: false }));
                                // switch player's source and resume from current time if playing
                                applyQualityToPlayer(video.hash, q);
                              }}
                              style={{
                                display: 'block',
                                width: '100%',
                                padding: '8px 12px',
                                border: 'none',
                                backgroundColor: selectedQualities[video.hash] === q ? '#f0f0f0' : 'transparent',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '14px',
                                color: '#333'
                              }}
                            >
                              {q}{meta?.resolution ? ` · ${meta.resolution}` : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Overlay play button shown while video src not loaded */}
                    {!loadedVideos[video.hash] && (
                      <button
                        aria-label={`Play ${video.filename}`}
                        onClick={() => {
                          const player = document.getElementById(`player-${video.hash}`);
                          if (player && !player.dataset.srcLoaded) {
                            const quality = selectedQualities[video.hash] || 'auto';
                            loadVideoForHash(video.hash, quality);
                            setLoadedVideos(prev => ({ ...prev, [video.hash]: true }));
                            requestAnimationFrame(() => {
                              player.play().catch(() => {});
                            });
                          } else if (player) {
                            // if already has src, just play
                            player.play().catch(() => {});
                          }
                        }}
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
                          color: '#fff'
                        }}
                      >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 5v14l11-7L8 5z" fill="currentColor" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}