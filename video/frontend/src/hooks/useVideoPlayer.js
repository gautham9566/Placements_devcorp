import { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';

/**
 * Custom hook for managing video player state and HLS streaming
 * Consolidates all video player logic to eliminate redundancy
 */
export const useVideoPlayer = (videoHash, options = {}) => {
  const {
    autoplay = false,
    onPlay,
    onPause,
    onEnded,
    onTimeUpdate,
    onVolumeChange,
    onLoadedMetadata,
  } = options;

  // State management
  const [playing, setPlaying] = useState(false);
  const [videoState, setVideoState] = useState({
    currentTime: 0,
    duration: 0,
    volume: 100,
    muted: false,
    paused: true,
    ended: false,
    seeking: false,
  });
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [qualities, setQualities] = useState({ master: null, qualities: {} });
  const [selectedQuality, setSelectedQuality] = useState(null);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [videoStats, setVideoStats] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [networkSpeed, setNetworkSpeed] = useState(null); // Mbps
  const [autoQualityEnabled, setAutoQualityEnabled] = useState(true);

  // Refs
  const hlsInstanceRef = useRef(null);
  const pendingQualityRef = useRef(null);
  const activeSourceRef = useRef(null);
  const manifestBlobUrlRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const videoRef = useRef(null);
  const rafRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const playRequestedRef = useRef(false);

  // Helper: Format time
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper: Format bytes
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper: Measure network speed
  const measureNetworkSpeed = async () => {
    try {
      // Try multiple methods to get network speed

      // Method 1: Use navigator.connection if available (most accurate)
      if (navigator.connection && navigator.connection.downlink) {
        const speed = navigator.connection.downlink; // Mbps
        console.log('[NetworkSpeed] Using navigator.connection:', speed, 'Mbps');
        setNetworkSpeed(speed);
        return speed;
      }

      // Method 2: Measure download speed with a test file
      try {
        const testUrls = [
          '/api/video/test-speed', // Our test endpoint
          'https://www.google.com/favicon.ico', // Small external file
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9InJlZCIvPjwvc3ZnPg==', // Data URL fallback
        ];

        for (const testUrl of testUrls) {
          try {
            const startTime = performance.now();
            const response = await fetch(testUrl, {
              method: 'GET',
              cache: 'no-cache',
              mode: testUrl.startsWith('http') ? 'cors' : 'same-origin'
            });

            if (response.ok) {
              const contentLength = response.headers.get('content-length');
              const data = await response.blob();
              const endTime = performance.now();
              const duration = (endTime - startTime) / 1000; // seconds

              const bytes = contentLength ? parseInt(contentLength) : data.size;
              if (bytes > 0 && duration > 0) {
                const bitsPerSecond = (bytes * 8) / duration;
                const mbps = bitsPerSecond / (1024 * 1024);
                console.log('[NetworkSpeed] Measured speed:', mbps.toFixed(2), 'Mbps (using', testUrl, ')');
                setNetworkSpeed(mbps);
                return mbps;
              }
            }
          } catch (e) {
            console.warn('[NetworkSpeed] Failed with URL:', testUrl, e);
            continue;
          }
        }
      } catch (e) {
        console.warn('[NetworkSpeed] Download test failed:', e);
      }

      // Method 3: Estimate based on HLS fragment loading times
      const hls = hlsInstanceRef.current;
      if (hls && hls.levels && hls.currentLevel >= 0) {
        const level = hls.levels[hls.currentLevel];
        if (level && level.details && level.details.totalduration) {
          // Estimate based on current level bitrate and successful loading
          const bitrate = level.bitrate || level.details.bitrate;
          if (bitrate) {
            // Assume we're getting close to the bitrate if fragments are loading well
            const estimatedMbps = (bitrate / (1024 * 1024)) * 0.8; // 80% of theoretical max
            console.log('[NetworkSpeed] Estimated from HLS bitrate:', estimatedMbps.toFixed(2), 'Mbps');
            setNetworkSpeed(estimatedMbps);
            return estimatedMbps;
          }
        }
      }

      // Method 4: Fallback to common speed estimates based on device/connection type
      let fallbackSpeed = 10; // Default assumption
      if (navigator.connection) {
        const connection = navigator.connection;
        if (connection.effectiveType) {
          switch (connection.effectiveType) {
            case '4g': fallbackSpeed = 15; break;
            case '3g': fallbackSpeed = 3; break;
            case '2g': fallbackSpeed = 0.5; break;
            case 'slow-2g': fallbackSpeed = 0.1; break;
            default: fallbackSpeed = 10;
          }
        }
      }

      console.log('[NetworkSpeed] Using fallback estimate:', fallbackSpeed, 'Mbps');
      setNetworkSpeed(fallbackSpeed);
      return fallbackSpeed;

    } catch (error) {
      console.warn('[NetworkSpeed] All measurement methods failed:', error);
      setNetworkSpeed(null);
      return null;
    }
  };

  // Helper: Get optimal quality based on network speed
  const getOptimalQuality = (currentSpeed = null) => {
    const speed = currentSpeed || networkSpeed;
    if (!speed || !qualities?.qualities) return 'auto';

    // Define speed thresholds (Mbps) and corresponding quality recommendations
    const speedThresholds = [
      { maxSpeed: 1, quality: '360p' },    // Very slow connection
      { maxSpeed: 3, quality: '480p' },    // Slow connection
      { maxSpeed: 10, quality: '720p' },   // Moderate connection
      { maxSpeed: 25, quality: '1080p' },  // Fast connection
      { maxSpeed: Infinity, quality: '1440p' } // Very fast connection
    ];

    // Get available qualities sorted by resolution
    const availableQualities = Object.entries(qualities.qualities)
      .map(([quality, meta]) => ({
        quality,
        resolution: parseInt(meta?.resolution?.replace('p', '') || '0') || 0
      }))
      .sort((a, b) => b.resolution - a.resolution);

    if (availableQualities.length === 0) return 'auto';

    // Find the best quality that matches the connection speed
    for (const threshold of speedThresholds) {
      if (speed <= threshold.maxSpeed) {
        // Find the closest available quality to the recommended one
        const recommendedRes = parseInt(threshold.quality.replace('p', ''));
        const bestMatch = availableQualities.reduce((best, current) => {
          return Math.abs(current.resolution - recommendedRes) < Math.abs(best.resolution - recommendedRes)
            ? current
            : best;
        });
        return bestMatch.quality;
      }
    }

    // Default to highest available quality for very fast connections
    return availableQualities[0].quality;
  };

  // Helper: Auto-adjust quality based on network conditions
  const autoAdjustQuality = async () => {
    if (!autoQualityEnabled || selectedQuality !== 'auto') return;

    try {
      const currentSpeed = await measureNetworkSpeed();
      if (!currentSpeed) return;

      const optimalQuality = getOptimalQuality(currentSpeed);
      const hls = hlsInstanceRef.current;

      if (hls && optimalQuality !== 'auto') {
        const levelIndex = findLevelIndex(optimalQuality);
        if (levelIndex >= 0 && hls.currentLevel !== levelIndex) {
          console.log(`Auto-adjusting quality to ${optimalQuality} (${currentSpeed.toFixed(1)} Mbps)`);
          hls.currentLevel = levelIndex;
        }
      }
    } catch (error) {
      console.warn('Auto quality adjustment failed:', error);
    }
  };

  // Helper: Collect video stats
  const collectVideoStats = () => {
    const player = videoRef.current || document.getElementById(`player-${videoHash}`);
    if (!player) return null;

    const buffered = player.buffered;
    const bufferedEnd = buffered.length > 0 ? buffered.end(buffered.length - 1) : 0;
    const bufferedPercentage = player.duration ? (bufferedEnd / player.duration) * 100 : 0;

    let activeQuality = selectedQuality || 'Loading...';
    const hls = hlsInstanceRef.current;
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
      networkSpeed: networkSpeed ? `${networkSpeed.toFixed(1)} Mbps` : 'Unknown',
      fullscreen: !!document.fullscreenElement,
      timestamp: Date.now(),
    };
  };

  // Helper: Get master URL
  const getMasterUrl = () => {
    if (qualities.master) {
      return `/api/video/${videoHash}/${qualities.master}`;
    }
    return `/api/video/${videoHash}/master.m3u8`;
  };

  // Helper: Get variant playlist URL
  const getVariantPlaylistUrl = (quality) => {
    return `/api/video/${videoHash}/${quality}/playlist.m3u8`;
  };

  // Helper: Find level index in HLS
  const findLevelIndex = (quality) => {
    const hls = hlsInstanceRef.current;
    if (!hls || !Array.isArray(hls.levels)) return -1;
    
    const normalized = (quality || '').toLowerCase();
    let idx = hls.levels.findIndex((level) => level.name && level.name.toLowerCase() === normalized);
    if (idx !== -1) return idx;
    
    idx = hls.levels.findIndex((level) => level.height && `${level.height}p` === normalized);
    if (idx !== -1) return idx;
    
    return hls.levels.findIndex((level) => level.height && `${level.height}` === normalized);
  };

  // Load video with HLS support
  const loadVideo = async (quality = 'auto') => {
    const player = videoRef.current || document.getElementById(`player-${videoHash}`);
    if (!player) {
      console.warn('[loadVideo] Player element not found');
      return;
    }

    setBuffering(true);
    const masterUrl = getMasterUrl();
    const hasHlsOutputs = Boolean(
      qualities && (qualities.master || Object.keys(qualities.qualities || {}).length)
    );

    console.debug('[loadVideo] Starting load', {
      quality,
      masterUrl,
      hasHlsOutputs,
      hlsSupported: Hls.isSupported()
    });

    // HLS.js support
    if (Hls.isSupported() && hasHlsOutputs) {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
      }
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 120,
      });

      // Enable hls.js debug logs when available to aid troubleshooting
      if (hls.config) {
        hls.config.debug = true;
      }

      hlsInstanceRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.debug('[hls] MANIFEST_PARSED', { event, data, masterUrl });

        // Extract quality levels from HLS manifest
        if (hls.levels && hls.levels.length > 0) {
          const hlsQualities = {};

          hls.levels.forEach((level, index) => {
            // Extract quality name from level attributes or height
            let qualityName = level.name || level.attrs?.NAME;

            if (!qualityName) {
              // Fallback: use height to determine quality
              const height = level.height;
              if (height) {
                qualityName = `${height}p`;
              } else {
                qualityName = `Level ${index}`;
              }
            }

            hlsQualities[qualityName] = {
              resolution: qualityName,
              width: level.width,
              height: level.height,
              bitrate: level.bitrate,
              bandwidth: level.attrs?.BANDWIDTH,
              codecs: level.attrs?.CODECS,
              frameRate: level.attrs?.['FRAME-RATE'],
              levelIndex: index
            };

            console.log(`[hls] Found quality: ${qualityName}`, hlsQualities[qualityName]);
          });

          // Update qualities state with HLS levels
          setQualities(prev => ({
            ...prev,
            qualities: {
              ...prev.qualities,
              ...hlsQualities
            },
            hlsLevels: hls.levels
          }));

          console.log('[hls] Updated qualities from manifest:', hlsQualities);
        }

        const pending = pendingQualityRef.current || quality;
        if (pending && pending !== 'auto') {
          const idx = findLevelIndex(pending);
          hls.currentLevel = idx >= 0 ? idx : -1;
        } else {
          hls.currentLevel = -1; // Auto quality
        }
        pendingQualityRef.current = null;

        // If autoplay or play was requested, attempt to play once manifest is ready
        if (playRequestedRef.current || autoplay) {
          console.debug('[hls] MANIFEST_PARSED - play requested or autoplay enabled');
          // HLS will start loading fragments automatically
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        console.log('[hls] LEVEL_SWITCHED to level:', data.level);
        if (hls.levels && hls.levels[data.level]) {
          const level = hls.levels[data.level];
          const qualityName = level.name || `${level.height}p`;
          console.log('[hls] Now playing quality:', qualityName, level);

          // Update selected quality if in auto mode
          if (selectedQuality === 'auto' || hls.currentLevel === -1) {
            // Don't update selectedQuality state to keep it as 'auto'
            console.log('[hls] Auto quality selected:', qualityName);
          }
        }
      });

      hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
        console.debug('[hls] LEVEL_LOADED', { event, data });
        // If fragments are available after level load, clear buffering state
        try {
          const playerForLevel = videoRef.current || document.getElementById(`player-${videoHash}`);
          if (playerForLevel) {
            const buffered = playerForLevel.buffered;
            const bufferedEnd = buffered.length > 0 ? buffered.end(buffered.length - 1) : 0;
            if (bufferedEnd > 0) setBuffering(false);
          }
        } catch (e) {
          // ignore
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        // Check if we have valid error data
        if (!data) {
          console.warn('[hls] ERROR event received with no data');
          return;
        }

        // Only log fatal errors to avoid console spam
        if (data.fatal) {
          console.error('[hls] FATAL ERROR', {
            type: data.type,
            details: data.details,
            fatal: data.fatal,
            url: data.url,
            response: data.response,
            reason: data.reason,
            level: data.level
          });

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            console.warn('[hls] Network error, retrying...', data.details);
            try {
              hls.startLoad();
            } catch (e) {
              console.error('[hls] Failed to restart load:', e);
            }
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            console.warn('[hls] Media error, attempting recovery...', data.details);
            try {
              hls.recoverMediaError();
            } catch (e) {
              console.error('[hls] Failed to recover from media error:', e);
            }
          } else {
            console.error('[hls] Unrecoverable error, destroying HLS instance');
            try {
              hls.destroy();
            } catch (e) {
              // ignore
            }
            hlsInstanceRef.current = null;
          }
        } else if (data.details) {
          // Log non-fatal errors at debug level
          console.debug('[hls] Non-fatal error:', data.details, data.type);
        }
      });

      // When a fragment is buffered, it's safe to start/resume playback
      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        try {
          const pl = videoRef.current || document.getElementById(`player-${videoHash}`);
          if (pl) {
            // If user requested playback or autoplay is enabled, try to play
            setBuffering(false);
            if (playRequestedRef.current || autoplay) {
              console.debug('[hls] FRAG_BUFFERED - attempting playback', {
                playRequested: playRequestedRef.current,
                autoplay,
                paused: pl.paused,
                readyState: pl.readyState
              });
              pl.play().catch((err) => {
                console.warn('[hls] Play failed:', err);
              });
              playRequestedRef.current = false;
            }
          }
        } catch (e) {
          console.error('[hls] FRAG_BUFFERED error:', e);
        }
      });

      // Use absolute URL to avoid any relative resolution issues
      const absoluteMaster = masterUrl.startsWith('http') ? masterUrl : (typeof window !== 'undefined' ? window.location.origin + masterUrl : masterUrl);
      console.debug('[hls] loadSource', absoluteMaster);
      hls.loadSource(absoluteMaster);
      hls.attachMedia(player);
      activeSourceRef.current = masterUrl;
      player.dataset.srcLoaded = 'true';
      setLoaded(true);
      // Add native video event listeners for buffering/playing signals
      try {
        player.addEventListener('waiting', () => setBuffering(true));
        player.addEventListener('playing', () => setBuffering(false));

        const onCanPlay = () => {
          setBuffering(false);
          // If autoplay or play was requested, attempt to play when video is ready
          if (playRequestedRef.current || autoplay) {
            console.debug('[video] canplay - attempting autoplay');
            player.play().catch((err) => {
              console.warn('[video] Autoplay failed:', err);
            });
            playRequestedRef.current = false;
          }
        };
        player.addEventListener('canplay', onCanPlay);
      } catch (e) {
        // ignore
      }
      return;
    }

    // Native HLS support (Safari)
  const supportsNativeHls = player.canPlayType && player.canPlayType('application/vnd.apple.mpegurl');
    if (supportsNativeHls && hasHlsOutputs) {
      const target = quality ? getVariantPlaylistUrl(quality) : masterUrl;
      if (player.src !== target) {
        player.src = target;
        try {
          player.load();
        } catch (e) {
          // ignore
        }
      }

      // Setup autoplay for native HLS
      const onCanPlayNative = () => {
        setBuffering(false);
        if (playRequestedRef.current || autoplay) {
          console.debug('[native-hls] canplay - attempting autoplay');
          player.play().catch((err) => {
            console.warn('[native-hls] Autoplay failed:', err);
          });
          playRequestedRef.current = false;
        }
        player.removeEventListener('canplay', onCanPlayNative);
      };
      player.addEventListener('canplay', onCanPlayNative);

      player.dataset.srcLoaded = 'true';
      setLoaded(true);
      return;
    }

    // Fallback to MP4, but verify the fallback doesn't actually return an HLS playlist
    const fallback = `/api/video/${videoHash}?format=mp4`;
    try {
      // Use HEAD to check content-type quickly
      const headResp = await fetch(fallback, { method: 'HEAD' });
      const ct = (headResp.headers.get('content-type') || '').toLowerCase();
      const looksLikeM3u8 = ct.includes('mpegurl') || ct.includes('application/x-mpegurl');

      if (looksLikeM3u8) {
        // The fallback endpoint is returning a playlist — fetch it, rewrite relative paths to absolute
        const absoluteFallback = fallback.startsWith('http') ? fallback : (typeof window !== 'undefined' ? window.location.origin + fallback : fallback);
        try {
          const resp = await fetch(absoluteFallback);
          if (resp.ok) {
            const text = await resp.text();
            // Rewrite relative playlist/segment URIs to absolute /api/video/{hash}/...
            const rewritten = text.split('\n').map((line) => {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith('#') || /^https?:\/\//i.test(trimmed)) return line;
              // treat as relative path; prepend '/api/video/{hash}/'
              return `${window.location.origin}/api/video/${videoHash}/${trimmed}`;
            }).join('\n');

            // Create a blob URL for the rewritten manifest
            if (manifestBlobUrlRef.current) {
              URL.revokeObjectURL(manifestBlobUrlRef.current);
              manifestBlobUrlRef.current = null;
            }
            const blob = new Blob([rewritten], { type: 'application/vnd.apple.mpegurl' });
            const blobUrl = URL.createObjectURL(blob);
            manifestBlobUrlRef.current = blobUrl;

            if (Hls.isSupported()) {
              if (hlsInstanceRef.current) {
                hlsInstanceRef.current.destroy();
              }
              const hls = new Hls({ enableWorker: true });
              hlsInstanceRef.current = hls;
              hls.loadSource(blobUrl);
              hls.attachMedia(player);
              activeSourceRef.current = blobUrl;
              player.dataset.srcLoaded = 'true';
              setLoaded(true);
              return;
            } else if (player.canPlayType && player.canPlayType('application/vnd.apple.mpegurl')) {
              // Native HLS (Safari) — use blob URL which contains absolute paths
              if (player.src !== blobUrl) {
                player.src = blobUrl;
                try { player.load(); } catch (e) { /* ignore */ }
              }
              activeSourceRef.current = blobUrl;
              player.dataset.srcLoaded = 'true';
              setLoaded(true);
              return;
            }
          }
        } catch (err) {
          // fetching manifest failed; fall back to treating as MP4 later
          // console.debug('[video] manifest fetch failed', err);
        }
      }
    } catch (err) {
      // HEAD may fail on some servers or due to CORS; fall back to treating the URL as MP4
      // console.debug('[video] head check failed', err);
    }

    // Assume it's an MP4 if we didn't early return
    if (player.src !== fallback) {
      player.src = fallback;
      try {
        player.load();
      } catch (e) {
        // ignore
      }
    }
    player.dataset.srcLoaded = 'true';
    setLoaded(true);
  };

  // Change quality while preserving playback state
  const changeQuality = (quality) => {
    console.log('[changeQuality] Changing quality to:', quality);
    const player = videoRef.current || document.getElementById(`player-${videoHash}`);
    if (!player) return;

    const hls = hlsInstanceRef.current;

    // If HLS is active and we're just switching levels, use HLS API directly
    if (hls && hls.levels && hls.levels.length > 0) {
      console.log('[changeQuality] Using HLS level switching');

      if (quality === 'auto') {
        console.log('[changeQuality] Setting to auto quality (adaptive)');
        hls.currentLevel = -1; // -1 means auto
        setAutoQualityEnabled(true);
      } else {
        const levelIndex = findLevelIndex(quality);
        console.log('[changeQuality] Found level index:', levelIndex, 'for quality:', quality);

        if (levelIndex >= 0) {
          hls.currentLevel = levelIndex;
          setAutoQualityEnabled(false);
        } else {
          console.warn('[changeQuality] Quality not found in HLS levels:', quality);
        }
      }

      setSelectedQuality(quality);
      setShowQualityMenu(false);
      return;
    }

    // Fallback: reload video with new quality
    console.log('[changeQuality] Reloading video with new quality');
    const currentTime = player.currentTime || 0;
    const wasPaused = player.paused;

    // Manual quality selection
    setAutoQualityEnabled(quality === 'auto');
    setSelectedQuality(quality);
    setShowQualityMenu(false);

    // Clear any existing network monitoring
    if (player.dataset.monitorInterval) {
      clearInterval(player.dataset.monitorInterval);
      delete player.dataset.monitorInterval;
    }

    const restorePlayback = () => {
      try {
        if (player.duration && currentTime < player.duration) {
          player.currentTime = currentTime;
        }
      } catch (e) {
        // ignore
      }
      if (!wasPaused) {
        player.play().catch(() => {});
      }
    };

    loadVideo(quality);

    if (Hls.isSupported() && hlsInstanceRef.current) {
      if (!player.readyState || player.readyState < 1) {
        const onLoaded = () => {
          player.removeEventListener('loadedmetadata', onLoaded);
          restorePlayback();
        };
        player.addEventListener('loadedmetadata', onLoaded);
      } else {
        restorePlayback();
      }
    } else {
      const onLoaded = () => {
        player.removeEventListener('loadedmetadata', onLoaded);
        restorePlayback();
      };
      player.addEventListener('loadedmetadata', onLoaded);
    }
  };

  // Fetch available qualities
  useEffect(() => {
    if (!videoHash) return;

    const fetchQualities = async () => {
      try {
        const res = await fetch(`/api/transcode/${videoHash}/qualities`);
        if (res.ok) {
          const data = await res.json();
          console.log('[useVideoPlayer] Fetched qualities data:', data);
          setQualities(data);

          // Auto-select highest quality if no quality is selected
          if (!selectedQuality && data?.qualities && Object.keys(data.qualities).length > 0) {
            const qualityKeys = Object.keys(data.qualities);
            console.log('[useVideoPlayer] Available quality keys:', qualityKeys);
            // Sort by resolution (highest first) and select the first one
            const sortedQualities = qualityKeys.sort((a, b) => {
              const resA = parseInt(a.replace(/p$/i, '')) || 0;
              const resB = parseInt(b.replace(/p$/i, '')) || 0;
              return resB - resA;
            });
            console.log('[useVideoPlayer] Auto-selecting quality:', sortedQualities[0]);
            setSelectedQuality(sortedQualities[0]);
          }
        } else {
          console.warn('[useVideoPlayer] Failed to fetch qualities, status:', res.status);
        }
      } catch (err) {
        console.error('[useVideoPlayer] Failed to fetch qualities:', err);
      }
    };

    fetchQualities();
  }, [videoHash]);

  // Auto quality adjustment when qualities change
  useEffect(() => {
    if (selectedQuality === 'auto' && autoQualityEnabled && qualities?.qualities && Object.keys(qualities.qualities).length > 0) {
      const timer = setTimeout(() => autoAdjustQuality(), 500);
      return () => clearTimeout(timer);
    }
  }, [qualities, selectedQuality, autoQualityEnabled]);

  // Autoplay handling - triggers when qualities are available
  useEffect(() => {
    if (!videoHash || !autoplay) return;

    // Wait for qualities to be fetched
    const hasQualities = qualities && (qualities.master || Object.keys(qualities.qualities || {}).length > 0);
    if (!hasQualities) return;

    // Don't trigger if already loaded
    if (loaded) return;

    const timer = setTimeout(() => {
      const player = videoRef.current || document.getElementById(`player-${videoHash}`);
      if (player && !loaded) {
        console.debug('[autoplay] Loading video and requesting playback');
        playRequestedRef.current = true;
        loadVideo(selectedQuality);
      }
    }, 250);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoHash, autoplay, qualities, loaded]);

  // Efficiently sync video state (time/duration/paused) with React state using rAF and throttling
  useEffect(() => {
    const player = videoRef.current || document.getElementById(`player-${videoHash}`);
    if (!player) return;

    const onUpdate = () => {
      const now = Date.now();
      if (now - lastUpdateRef.current < 250) {
        // schedule next frame but avoid frequent updates
        rafRef.current = requestAnimationFrame(onUpdate);
        return;
      }
      lastUpdateRef.current = now;
      setVideoState((prev) => ({
        ...prev,
        currentTime: player.currentTime || 0,
        duration: player.duration || 0,
        volume: Math.round((player.volume || 0) * 100),
        muted: !!player.muted,
        paused: !!player.paused,
        ended: !!player.ended,
      }));
      rafRef.current = requestAnimationFrame(onUpdate);
    };

    // Start rAF loop
    rafRef.current = requestAnimationFrame(onUpdate);

    // Pause/resume detection
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPause);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', onPause);
    };
  }, [videoHash, loaded]);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Update stats periodically
  useEffect(() => {
    if (!showStats) return;

    const interval = setInterval(() => {
      const stats = collectVideoStats();
      if (stats) {
        setVideoStats(stats);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [showStats, selectedQuality, videoHash]);

  // Reset player when videoHash changes
  useEffect(() => {
    console.log('[useVideoPlayer] videoHash changed to:', videoHash);

    // Reset all state
    setPlaying(false);
    setLoaded(false);
    setBuffering(false);
    setSelectedQuality(null);
    setQualities({ master: null, qualities: {} });
    setVideoState({
      currentTime: 0,
      duration: 0,
      volume: 100,
      muted: false,
      paused: true,
      ended: false,
      seeking: false,
    });

    // Clean up previous video
    const player = videoRef.current || document.getElementById(`player-${videoHash}`);
    if (player) {
      player.pause();
      player.currentTime = 0;
      player.dataset.srcLoaded = '';
    }

    // Destroy previous HLS instance
    if (hlsInstanceRef.current) {
      try {
        console.log('[useVideoPlayer] Destroying previous HLS instance');
        hlsInstanceRef.current.destroy();
      } catch (e) {
        console.warn('[useVideoPlayer] Error destroying HLS instance:', e);
      }
      hlsInstanceRef.current = null;
    }

    // Revoke previous blob URL
    if (manifestBlobUrlRef.current) {
      try {
        URL.revokeObjectURL(manifestBlobUrlRef.current);
      } catch (e) {
        // ignore
      }
      manifestBlobUrlRef.current = null;
    }

    // Reset refs
    activeSourceRef.current = null;
    pendingQualityRef.current = null;
    playRequestedRef.current = false;

  }, [videoHash]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hlsInstanceRef.current) {
        try {
          hlsInstanceRef.current.destroy();
        } catch (e) {
          // ignore
        }
        hlsInstanceRef.current = null;
      }
      if (manifestBlobUrlRef.current) {
        try { URL.revokeObjectURL(manifestBlobUrlRef.current); } catch (e) { /* ignore */ }
        manifestBlobUrlRef.current = null;
      }
    };
  }, []);

  return {
    // State
    playing,
    videoState,
    showControls,
    fullscreen,
    buffering,
    qualities,
    selectedQuality,
    showQualityMenu,
    showStats,
    videoStats,
    loaded,
    networkSpeed,
    autoQualityEnabled,

    // Setters
    setPlaying,
    setVideoState,
    setShowControls,
    setFullscreen,
    setBuffering,
    setShowQualityMenu,
    setShowStats,
    setAutoQualityEnabled,

    // Actions
    loadVideo,
    changeQuality,
    measureNetworkSpeed,
    autoAdjustQuality,
    // DOM ref
    videoRef,
    // convenience methods
    play: () => {
      const p = videoRef.current || document.getElementById(`player-${videoHash}`);
      if (p) p.play().catch(() => {});
    },
    pause: () => {
      const p = videoRef.current || document.getElementById(`player-${videoHash}`);
      if (p) p.pause();
    },
    requestPlay: () => {
      const p = videoRef.current || document.getElementById(`player-${videoHash}`);
      playRequestedRef.current = true;
      if (!p) return;
      // If there's buffered content, play immediately, otherwise HLS FRAG_BUFFERED will trigger play
      const buffered = p.buffered;
      const bufferedEnd = buffered.length > 0 ? buffered.end(buffered.length - 1) : 0;
      if (bufferedEnd > p.currentTime + 0.5) {
        p.play().catch(() => {});
        playRequestedRef.current = false;
      }
    },

    // Helpers
    formatTime,
    formatBytes,
    collectVideoStats,
  };
};

