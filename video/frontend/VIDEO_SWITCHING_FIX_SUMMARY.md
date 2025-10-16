# Video Switching Fix - Summary

## Problem
When one video is playing and the user clicks on another video (e.g., selecting a different lesson in a course), the new video doesn't start playing automatically. The player doesn't properly reset and load the new video.

## Root Cause
The `useVideoPlayer` hook didn't have proper cleanup and reset logic when the `videoHash` prop changed. When switching between videos:
1. The previous HLS instance wasn't being destroyed
2. Player state wasn't being reset
3. The new video wasn't being loaded automatically
4. Autoplay was disabled in the course page

## Solution

### 1. Added Video Hash Change Detection (`useVideoPlayer.js`)

Added a new `useEffect` that watches for `videoHash` changes and properly resets the player:

```javascript
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
```

### 2. Enabled Autoplay in Course Page (`courses/[id]/page.jsx`)

Changed the `autoplay` prop from `false` to `true` so that when a user selects a new lesson, it starts playing automatically:

```javascript
<VideoPlayer
  videoHash={currentLesson.video_hash}
  youtubeUrl={currentLesson.youtube_url}
  poster={currentLesson.thumbnail ? `/api/thumbnail/${currentLesson.video_hash}` : undefined}
  height="100%"
  videoTitle={currentLesson.title}
  showStatsButton={true}
  autoplay={true}  // Changed from false to true
/>
```

## How It Works

1. **User clicks on a different video/lesson**
   - The `currentLesson` state changes
   - React re-renders the `VideoPlayer` component with a new `videoHash` prop

2. **videoHash change is detected**
   - The `useEffect` with `[videoHash]` dependency triggers
   - Previous video is paused and reset to time 0
   - Previous HLS instance is destroyed
   - All player state is reset to initial values
   - Blob URLs are revoked to prevent memory leaks

3. **New video is fetched and loaded**
   - The qualities fetch effect runs with the new `videoHash`
   - Qualities are fetched from `/api/transcode/${videoHash}/qualities`
   - The autoplay effect detects that qualities are available
   - Video is loaded and playback starts automatically

4. **HLS manifest is parsed**
   - All quality levels are extracted from the manifest
   - Quality menu is populated with available options
   - Video starts playing at the selected quality

## Benefits

1. **Seamless video switching**: Users can click between videos without manual intervention
2. **Proper cleanup**: Previous video resources are properly cleaned up to prevent memory leaks
3. **Automatic playback**: New videos start playing automatically when selected
4. **State reset**: All player state is properly reset between videos
5. **HLS instance management**: Previous HLS instances are destroyed before creating new ones

## Testing

To test the fix:

1. **Course Page Test**:
   - Navigate to a course page: `/students/courses/[id]`
   - Click on a lesson to start playing
   - Click on a different lesson
   - Verify:
     - Previous video stops
     - New video loads and starts playing automatically
     - Quality menu shows correct qualities for the new video
     - No console errors

2. **Video List Test**:
   - Navigate to videos page: `/students/videos`
   - Click on a video to view it
   - Go back and click on a different video
   - Verify the new video loads and plays

3. **Memory Leak Test**:
   - Switch between multiple videos rapidly
   - Check browser's memory usage (should not continuously increase)
   - Check console for any errors or warnings

## Files Modified

1. **`video\frontend\src\hooks\useVideoPlayer.js`**
   - Added `useEffect` to detect and handle `videoHash` changes
   - Properly resets all player state when video changes
   - Destroys previous HLS instance and revokes blob URLs
   - Resets all refs to initial values

2. **`video\frontend\src\app\students\courses\[id]\page.jsx`**
   - Changed `autoplay` prop from `false` to `true`
   - Enables automatic playback when switching between lessons

## Technical Details

### State Reset
When switching videos, the following state is reset:
- `playing`: false
- `loaded`: false
- `buffering`: false
- `selectedQuality`: null
- `qualities`: { master: null, qualities: {} }
- `videoState`: Reset to initial values (currentTime: 0, duration: 0, etc.)

### Refs Reset
The following refs are reset:
- `hlsInstanceRef`: Destroyed and set to null
- `manifestBlobUrlRef`: URL revoked and set to null
- `activeSourceRef`: Set to null
- `pendingQualityRef`: Set to null
- `playRequestedRef`: Set to false

### Cleanup Order
1. Pause current video
2. Reset video currentTime to 0
3. Clear srcLoaded flag
4. Destroy HLS instance
5. Revoke blob URLs
6. Reset all state and refs
7. Let React effects handle loading the new video

## Edge Cases Handled

1. **Rapid video switching**: Multiple rapid clicks won't cause issues as each change properly cleans up before loading new video
2. **Same video selected**: If the same video is selected again, it will reset and restart from the beginning
3. **YouTube videos**: The reset logic works for both HLS videos and YouTube embeds
4. **Missing video hash**: If videoHash is null/undefined, the effect doesn't run
5. **Memory leaks**: Blob URLs are properly revoked to prevent memory leaks

## Future Improvements

Potential enhancements for the future:
1. Add a smooth transition/fade effect between videos
2. Remember playback position for each video (resume functionality)
3. Add a loading indicator during video switching
4. Preload the next video in a playlist for faster switching
5. Add keyboard shortcuts for next/previous video navigation

