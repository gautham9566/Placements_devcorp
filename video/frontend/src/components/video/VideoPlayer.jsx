"use client";

import React from 'react';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import {
  VideoPlayerControls,
  QualityMenu,
  VideoStatsOverlay,
  BufferingIndicator,
  PlayButtonOverlay,
} from './VideoPlayerControls';

/**
 * Unified Video Player Component
 * Consolidates all video player functionality to eliminate code redundancy
 * 
 * @param {Object} props
 * @param {string} props.videoHash - Unique hash identifier for the video
 * @param {string} props.youtubeUrl - YouTube URL for the video
 * @param {string} props.poster - Poster image URL
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.height - Height of the player (default: "100%")
 * @param {boolean} props.autoplay - Whether to autoplay the video
 * @param {string} props.videoTitle - Title of the video for accessibility
 * @param {boolean} props.showStatsButton - Whether to show the stats button
 */
const VideoPlayer = ({
  videoHash,
  youtubeUrl,
  poster,
  className = '',
  height = '100%',
  autoplay = false,
  videoTitle = 'Video',
  showStatsButton = true,
}) => {
  const {
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
    setShowControls,
    setShowQualityMenu,
    setShowStats,
    loadVideo,
    changeQuality,
    measureNetworkSpeed,
    videoRef,
    play,
    pause,
    requestPlay,
    formatTime,
  } = useVideoPlayer(videoHash, { autoplay });
  const controlsTimeoutRef = React.useRef(null);
  const keyPressTimeoutRef = React.useRef(null);
  const keyPressIntervalRef = React.useRef(null);

  React.useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
      if (keyPressTimeoutRef.current) {
        clearTimeout(keyPressTimeoutRef.current);
        keyPressTimeoutRef.current = null;
      }
      if (keyPressIntervalRef.current) {
        clearInterval(keyPressIntervalRef.current);
        keyPressIntervalRef.current = null;
      }
    };
  }, []);

  // Keyboard shortcuts like YouTube
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle keyboard shortcuts when typing in input fields
      const activeElement = document.activeElement;
      const isInputField = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
      );
      
      if (isInputField) {
        return;
      }

      // Only handle keyboard shortcuts when video is focused or controls are visible
      const videoContainer = document.querySelector(`[data-video-container="${videoHash}"]`);
      if (!videoContainer || (!videoContainer.contains(document.activeElement) && !showControls)) {
        return;
      }

      // Prevent default behavior for our handled keys
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'Space') {
        e.preventDefault();
      }

      switch (e.code) {
        case 'ArrowLeft': // Left arrow - backward 5 seconds
          if (e.repeat) {
            // Long press - continuous backward
            if (!keyPressIntervalRef.current) {
              keyPressIntervalRef.current = setInterval(() => {
                const player = videoRef.current;
                if (player) {
                  player.currentTime = Math.max(0, player.currentTime - 0.1);
                }
              }, 100);
            }
          } else {
            // Single press - 5 seconds backward
            if (keyPressTimeoutRef.current) {
              clearTimeout(keyPressTimeoutRef.current);
            }
            keyPressTimeoutRef.current = setTimeout(() => {
              const player = videoRef.current;
              if (player) {
                player.currentTime = Math.max(0, player.currentTime - 5);
              }
            }, 200); // Debounce for distinguishing single vs long press
          }
          break;

        case 'ArrowRight': // Right arrow - forward 5 seconds
          if (e.repeat) {
            // Long press - continuous forward
            if (!keyPressIntervalRef.current) {
              keyPressIntervalRef.current = setInterval(() => {
                const player = videoRef.current;
                if (player) {
                  player.currentTime = Math.min(player.duration || 0, player.currentTime + 0.1);
                }
              }, 100);
            }
          } else {
            // Single press - 5 seconds forward
            if (keyPressTimeoutRef.current) {
              clearTimeout(keyPressTimeoutRef.current);
            }
            keyPressTimeoutRef.current = setTimeout(() => {
              const player = videoRef.current;
              if (player) {
                player.currentTime = Math.min(player.duration || 0, player.currentTime + 5);
              }
            }, 200); // Debounce for distinguishing single vs long press
          }
          break;

        case 'Space': // Space - play/pause
          handlePlayPause();
          break;
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        // Clear continuous seeking on key release
        if (keyPressIntervalRef.current) {
          clearInterval(keyPressIntervalRef.current);
          keyPressIntervalRef.current = null;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [videoHash, showControls]);
  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const youtubeVideoId = getYouTubeVideoId(youtubeUrl);
  const isYouTubeVideo = !!youtubeVideoId;

  // Handle play/pause
  const handlePlayPause = () => {
    const player = videoRef.current;
    if (player) {
      if (player.paused) play();
      else pause();
    }
  };

  // Handle seek
  const handleSeek = (e) => {
    const player = videoRef.current;
    if (player) {
      player.currentTime = parseFloat(e.target.value);
    }
  };

  // Handle volume change
  const handleVolumeChange = (e) => {
    const player = videoRef.current;
    if (player) {
      player.volume = parseFloat(e.target.value);
    }
  };

  // Handle mute toggle
  const handleMuteToggle = () => {
    const player = videoRef.current;
    if (player) {
      player.muted = !player.muted;
    }
  };

  // Handle skip backward
  const handleSkipBackward = () => {
    const player = videoRef.current;
    if (player) {
      player.currentTime = Math.max(0, player.currentTime - 10);
    }
  };

  // Handle skip forward
  const handleSkipForward = () => {
    const player = videoRef.current;
    if (player) {
      player.currentTime = Math.min(player.duration, player.currentTime + 10);
    }
  };

  // Handle quality menu toggle
  const handleQualityClick = () => {
    setShowQualityMenu((prev) => !prev);
    if (!showQualityMenu) {
      setShowStats(false);
    }
  };

  // Handle stats toggle
  const handleStatsClick = () => {
    setShowStats((prev) => !prev);
    if (!showStats) {
      setShowQualityMenu(false);
    }
  };

  // Handle fullscreen toggle with iframe support
  const handleFullscreenClick = () => {
    const videoContainer = document.querySelector(`[data-video-container="${videoHash}"]`);

    // Check if already in fullscreen
    const isFullscreen = document.fullscreenElement ||
                         document.webkitFullscreenElement ||
                         document.mozFullScreenElement ||
                         document.msFullscreenElement;

    if (isFullscreen) {
      // Exit fullscreen with browser prefixes
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    } else if (videoContainer) {
      // Always try to fullscreen the video container first
      // This will work in standalone mode and in iframes with allowfullscreen
      const requestFullscreen = (element) => {
        if (element.requestFullscreen) {
          return element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
          return element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
          return element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
          return element.msRequestFullscreen();
        }
        return Promise.reject(new Error('Fullscreen API not supported'));
      };

      // Try video container fullscreen first
      requestFullscreen(videoContainer).catch(err => {
        console.error('Video container fullscreen failed:', err);

        // If video container fails and we're in an iframe, try document element as fallback
        const isInIframe = window.self !== window.top;
        if (isInIframe) {
          console.log('Trying document fullscreen as fallback in iframe...');
          requestFullscreen(document.documentElement).catch(fallbackErr => {
            console.error('Document fullscreen fallback also failed:', fallbackErr);
            // Could show a user-friendly message here
            alert('Fullscreen is not available in this context. Please open the video in a new tab for fullscreen support.');
          });
        } else {
          // Not in iframe, just show error
          console.error('Fullscreen not supported:', err);
        }
      });
    }
  };

  // Handle play button overlay click
  const handlePlayButtonClick = () => {
    const player = videoRef.current;
    if (player && !player.dataset.srcLoaded) {
      loadVideo(selectedQuality);
      requestPlay();
    } else {
      requestPlay();
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: fullscreen ? '100vw' : '100%',
  height: fullscreen ? '100vh' : height,
        backgroundColor: '#000',
      }}
      className={className}
      data-video-container={videoHash}
      onMouseEnter={() => setShowControls(true)}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => {
        if (playing && !fullscreen) {
          setTimeout(() => {
            setShowControls(false);
          }, 2000);
        }
      }}
    >
      {isYouTubeVideo ? (
        /* YouTube Embed */
        <iframe
          src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=${autoplay ? 1 : 0}&rel=0`}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: fullscreen ? '0' : '4px',
            border: 'none',
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={videoTitle}
        />
      ) : (
        <>
          {/* Video Element */}
          <video
            ref={videoRef}
            id={`player-${videoHash}`}
            poster={poster}
            preload={autoplay ? 'auto' : 'none'}
            style={{
              width: '100%',
              height: '100%',
              /* Use contain to preserve the video's native aspect ratio inside the container */
              objectFit: 'contain',
              borderRadius: fullscreen ? '0' : '4px',
              backgroundColor: '#000',
            }}
            onPlay={(e) => {
              if (!e.target.dataset.srcLoaded) {
                loadVideo(selectedQuality);
              }
            }}
            onClick={() => {
              const player = videoRef.current;
              if (player && !player.dataset.srcLoaded) {
                loadVideo(selectedQuality);
                requestPlay();
              } else {
                // Toggle play/pause
                if (player) {
                  if (player.paused) requestPlay();
                  else pause();
                }
              }
              // show controls briefly
              setShowControls(true);
              if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
              }
              controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2000);
            }}
            onPause={() => {}}
            onEnded={() => {}}
            onTimeUpdate={() => {}}
            onVolumeChange={() => {}}
            onLoadedMetadata={() => {}}
            onWaiting={() => {}}
            onCanPlay={() => {}}
            onSeeking={() => {}}
            onSeeked={() => {}}
          />

          {/* Buffering Indicator */}
          {buffering && <BufferingIndicator />}

          {/* Play Button Overlay (shown before video loads) */}
          {!loaded && <PlayButtonOverlay onPlay={handlePlayButtonClick} videoTitle={videoTitle} />}

          {/* Custom Controls */}
          {showControls && (
            <VideoPlayerControls
              videoHash={videoHash}
              playing={playing}
              videoState={videoState}
              fullscreen={fullscreen}
              selectedQuality={selectedQuality}
              showQualityMenu={showQualityMenu}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
              onQualityClick={handleQualityClick}
              onStatsClick={showStatsButton ? handleStatsClick : null}
              onFullscreenClick={handleFullscreenClick}
              onVolumeChange={handleVolumeChange}
              onMuteToggle={handleMuteToggle}
              formatTime={formatTime}
              showStats={showStats}
            />
          )}

          {/* Quality Menu */}
          {showQualityMenu && (
            <QualityMenu
              videoHash={videoHash}
              qualities={qualities}
              selectedQuality={selectedQuality}
              fullscreen={fullscreen}
              onQualitySelect={changeQuality}
            />
          )}

          {/* Stats Overlay */}
          {showStats && (
            <VideoStatsOverlay
              videoStats={videoStats}
              fullscreen={fullscreen}
              formatTime={formatTime}
            />
          )}
        </>
      )}
    </div>
  );
};

export default VideoPlayer;

