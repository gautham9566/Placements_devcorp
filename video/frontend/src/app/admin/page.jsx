"use client";

import React, { useState, useEffect } from 'react';

export default function VideoUpload() {
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState('');
  const [transcoding, setTranscoding] = useState({});
  const [transcodeStatus, setTranscodeStatus] = useState({});
  const [deleting, setDeleting] = useState({});
  const [qualities, setQualities] = useState({});

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/videos');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setVideos(data);
          // fetch qualities for videos as a fallback for displaying original
          fetchQualitiesForVideos(data);
        }
      } else {
        setError('Failed to load videos');
      }
    } catch (error) {
      setError('Network error while loading videos');
    }
  };

  const fetchQualitiesForVideos = async (videosList) => {
    const qualityPromises = videosList.map(async (v) => {
      try {
        const res = await fetch(`/api/transcode/${v.hash}/qualities`);
        if (res.ok) {
          const qdata = await res.json();
          return {
            hash: v.hash,
            data: {
              master: qdata.master,
              qualities: qdata.qualities || {},
            }
          };
        }
      } catch (err) {
        // ignore individual errors
      }
      return null;
    });

    const results = await Promise.all(qualityPromises);
    const qualitiesData = {};
    results.forEach(result => {
      if (result) {
        qualitiesData[result.hash] = result.data;
      }
    });
    setQualities(qualitiesData);
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // Poll transcode status for videos that are being converted
  useEffect(() => {
    let cancelled = false;
    const intervals = {};

    const startPolling = (hash) => {
      // don't start if already polling
      if (intervals[hash]) return;

      const poll = async () => {
        try {
          const resp = await fetch(`/api/transcode/${hash}/status`);
          if (resp.ok) {
            const data = await resp.json();
            if (!cancelled) setTranscodeStatus(prev => ({ ...prev, [hash]: data }));
            // stop polling when finished
            if (data && (data.overall === 'ok' || data.overall === 'error' || data.overall === 'stopped')) {
              clearInterval(intervals[hash]);
              delete intervals[hash];
            }
          }
        } catch (err) {
          // ignore network errors, keep polling
        }
      };

      // initial immediate poll then interval
      poll();
  intervals[hash] = setInterval(poll, 1000);
    };

    // start polling for any video that looks like it may have transcode status
    videos.forEach(v => {
      if (!v || !v.hash) return;
      // start polling for all videos (lightweight) - server will return quickly
      startPolling(v.hash);
    });

    return () => {
      cancelled = true;
      Object.values(intervals).forEach(i => clearInterval(i));
    };
  }, [videos]);

  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

  const handleUpload = async () => {
    if (!videoFile && !thumbnailFile) {
      alert('Please select at least a video or thumbnail file');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      let videoHash = null;

      // Upload video in chunks if selected
      if (videoFile) {
        const totalChunks = Math.ceil(videoFile.size / CHUNK_SIZE);

        // init
        const initForm = new FormData();
        initForm.append('filename', videoFile.name);
        initForm.append('total_chunks', String(totalChunks));

        const initResp = await fetch('/api/upload/init', {
          method: 'POST',
          body: initForm,
        });

        if (!initResp.ok) {
          const err = await initResp.json().catch(() => ({}));
          throw new Error(err.detail || 'Failed to initialize upload');
        }

        const initResult = await initResp.json();
        videoHash = initResult.upload_id;

        // send chunks in parallel with progress tracking
        const chunkPromises = [];
        let completedChunks = 0;

        for (let index = 0; index < totalChunks; index++) {
          const start = index * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, videoFile.size);
          const chunk = videoFile.slice(start, end);

          const chunkForm = new FormData();
          chunkForm.append('upload_id', videoHash);
          chunkForm.append('index', String(index));
          chunkForm.append('file', chunk, `${videoFile.name}.part`);

          const chunkPromise = fetch('/api/upload/chunk', {
            method: 'POST',
            body: chunkForm,
          }).then(chunkResp => {
            if (!chunkResp.ok) {
              const err = chunkResp.json().catch(() => ({}));
              throw new Error(err.detail || `Failed uploading chunk ${index}`);
            }
            // Update progress when chunk completes
            completedChunks++;
            const progressPercent = Math.round((completedChunks / totalChunks) * 100);
            setProgress(progressPercent);
            return end - start; // return bytes uploaded
          });
          
          chunkPromises.push(chunkPromise);
        }

        // Wait for all chunks to upload in parallel
        const uploadedBytesArray = await Promise.all(chunkPromises);
        const totalUploadedBytes = uploadedBytesArray.reduce((sum, bytes) => sum + bytes, 0);
        // Ensure progress shows 100% at the end
        setProgress(100);

        // complete
        const completeForm = new FormData();
        completeForm.append('upload_id', videoHash);

        const completeResp = await fetch('/api/upload/complete', {
          method: 'POST',
          body: completeForm,
        });

        if (!completeResp.ok) {
          const err = await completeResp.json().catch(() => ({}));
          throw new Error(err.detail || 'Failed to complete upload');
        }

        const completeResult = await completeResp.json();
        if (completeResult.hash) {
          videoHash = completeResult.hash;
          // ensure progress 100%
          setProgress(100);
          // small success notification
          // alert('Video uploaded successfully!');
        } else {
          throw new Error('Upload complete returned invalid response');
        }
      }

      // Upload thumbnail if selected and we have a video hash
      if (thumbnailFile) {
        if (!videoHash && !selectedVideo) {
          alert('Please select a video for the thumbnail');
          setUploading(false);
          return;
        }

        const thumbnailFormData = new FormData();
        thumbnailFormData.append('file', thumbnailFile);

        const targetHash = videoHash || selectedVideo;

        const thumbnailResponse = await fetch(`/api/thumbnail/${targetHash}`, {
          method: 'POST',
          body: thumbnailFormData,
        });

        if (thumbnailResponse.ok) {
          // alert('Thumbnail uploaded successfully!');
        } else {
          const thumbnailResult = await thumbnailResponse.json().catch(() => ({}));
          alert(`Thumbnail upload failed: ${thumbnailResult.error || thumbnailResult.detail || 'Unknown'}`);
        }
      }

      await fetchVideos(); // Refresh the list
      setShowDialog(false);
      setVideoFile(null);
      setThumbnailFile(null);
      setSelectedVideo('');
    } catch (error) {
      alert(`Upload error: ${error.message}`);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 800);
    }
  };

  const videosWithoutThumbnail = videos.filter(v => !v.thumbnail_filename);

  const triggerTranscode = async (hash) => {
    try {
      setTranscoding(prev => ({ ...prev, [hash]: 'starting' }));
      const resp = await fetch(`/api/transcode/${hash}`, { method: 'POST' });
      if (resp.ok) {
        setTranscoding(prev => ({ ...prev, [hash]: 'started' }));
        // after a short delay, clear status and refresh videos
        setTimeout(() => {
          setTranscoding(prev => ({ ...prev, [hash]: undefined }));
          fetchVideos();
        }, 2500);
      } else {
        const txt = await resp.text().catch(() => 'error');
        setTranscoding(prev => ({ ...prev, [hash]: 'error' }));
        console.error('Transcode error', txt);
      }
    } catch (err) {
      setTranscoding(prev => ({ ...prev, [hash]: 'error' }));
      console.error(err);
    }
  };

  const stopTranscode = async (hash) => {
    try {
      const resp = await fetch(`/api/videos/${hash}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'stop' }) });
      if (resp.ok) {
        // Refresh status
        fetchVideos();
      } else {
        alert('Failed to stop transcoding');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resumeTranscode = async (hash) => {
    try {
      const resp = await fetch(`/api/videos/${hash}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resume' }) });
      if (resp.ok) {
        // Refresh status
        fetchVideos();
      } else {
        alert('Failed to resume transcoding');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to determine if a video is currently being transcoded.
  // We check both the local `transcoding` state (short-lived flags when triggering)
  // and the `transcodeStatus` polled from the server which contains the long-running status.
  const isTranscodingActive = (hash) => {
    if (!hash) return false;
    const local = transcoding[hash];
    if (local && local !== 'error') return true; // 'starting' | 'started'
    const status = transcodeStatus[hash]?.overall;
    // treat any non-final status as active (final states are 'ok', 'error', 'stopped')
    if (status && status !== 'ok' && status !== 'error' && status !== 'stopped') return true;
    return false;
  };

  const handleDelete = async (hash) => {
    if (!hash) return;
    if (isTranscodingActive(hash)) {
      alert('Cannot delete while transcoding is in progress.');
      return;
    }
    const ok = confirm('Delete this video and all its files? This cannot be undone.');
    if (!ok) return;
    try {
      // start progress indicator
      setDeleting(prev => ({ ...prev, [hash]: { status: 'pending', progress: 10 } }));

      // slowly advance UI progress while waiting (visual only)
      let tick = 0;
      const interval = setInterval(() => {
        tick += 1;
        setDeleting(prev => {
          const cur = prev[hash];
          if (!cur || cur.status !== 'pending') return prev;
          const next = Math.min(95, (cur.progress || 10) + Math.floor(Math.random() * 8) + 2);
          return { ...prev, [hash]: { ...cur, progress: next } };
        });
      }, 300);

      const resp = await fetch(`/api/videos/${hash}`, { method: 'DELETE' });
      if (resp.ok) {
        clearInterval(interval);
        setDeleting(prev => ({ ...prev, [hash]: { status: 'done', progress: 100 } }));
        // small delay so progress reaches 100%
        setTimeout(async () => {
          // refresh list
          await fetchVideos();
          setDeleting(prev => {
            const copy = { ...prev };
            delete copy[hash];
            return copy;
          });
        }, 350);
      } else {
        clearInterval(interval);
        setDeleting(prev => ({ ...prev, [hash]: { status: 'error', progress: 100 } }));
        const txt = await resp.text().catch(() => 'error');
        alert(`Delete failed: ${txt}`);
        // clear after pause
        setTimeout(() => setDeleting(prev => { const c = { ...prev }; delete c[hash]; return c; }), 1500);
      }
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '30px' }}>Video Upload Admin</h1>

        {/* Upload Button */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <button
            onClick={() => setShowDialog(true)}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '18px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            Upload
          </button>
        </div>

        {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '20px' }}>{error}</p>}

       { /* Videos Table */}
          <div style={{
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginTop: 0, color: '#000' }}>Uploaded Videos</h2>
            {videos.length === 0 ? (
              <p style={{ color: '#000', textAlign: 'center', padding: '20px' }}>No videos uploaded yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#007bff', color: 'white' }}>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>ID</th>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Video ID (Hash)</th>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Filename</th>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Transcode</th>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Thumbnail</th>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((video, index) => (
                <tr key={video.id} style={{
                  backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#fff',
                  transition: 'background-color 0.2s'
                }}>
                  <td style={{ border: '1px solid #ddd', padding: '12px', color: '#000' }}>{video.id}</td>
                  <td style={{ border: '1px solid #ddd', padding: '12px', color: '#000', fontFamily: 'monospace' }}>{video.hash}</td>
                  <td style={{ border: '1px solid #ddd', padding: '12px', color: '#000' }}>{video.filename}</td>
                  <td style={{ border: '1px solid #ddd', padding: '12px', color: '#000', minWidth: 240 }}>
                    {transcodeStatus[video.hash] ? (
                      <div>
                        {/* Original video quality header - PROMINENTLY DISPLAYED */}
                        {(() => {
                          // Try to get original quality label from multiple sources
                          const origFromStatus = transcodeStatus[video.hash]?.original_quality_label;
                          const origFromQualitiesObj = transcodeStatus[video.hash]?.qualities?.original?.quality_label;
                          const origFromVideoRecord = video.original_quality_label;
                          const originalQualityLabel = origFromStatus || origFromQualitiesObj || origFromVideoRecord;
                          
                          const origResFromStatus = transcodeStatus[video.hash]?.original_resolution;
                          const origResFromQualitiesObj = transcodeStatus[video.hash]?.qualities?.original?.resolution;
                          const origResFromVideoRecord = video.original_resolution;
                          const originalResolution = origResFromStatus || origResFromQualitiesObj || origResFromVideoRecord;
                          
                          if (originalQualityLabel || originalResolution) {
                            return (
                              <div style={{ 
                                marginBottom: 12, 
                                padding: '8px 10px', 
                                backgroundColor: '#e8f4ff', 
                                borderLeft: '4px solid #007bff',
                                borderRadius: 4 
                              }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#0056b3', marginBottom: 4 }}>
                                  Original video quality
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#003d82' }}>
                                  {originalQualityLabel || 'unknown'} {originalResolution && `(${originalResolution})`}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        <div style={{ fontSize: 12, color: '#444', marginBottom: 8 }}>
                          Overall:{' '}
                          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                            {transcodeStatus[video.hash].overall || 'pending'}
                          </span>
                        </div>

                        <div style={{ marginBottom: 8 }}>
                          {(transcodeStatus[video.hash].overall === 'running' || transcodeStatus[video.hash].overall === 'pending') && (
                            <button
                              onClick={() => stopTranscode(video.hash)}
                              style={{
                                background: '#dc3545',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontSize: 12
                              }}
                            >
                              Stop
                            </button>
                          )}
                          {transcodeStatus[video.hash].overall === 'stopped' && (
                            <button
                              onClick={() => resumeTranscode(video.hash)}
                              style={{
                                background: '#28a745',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontSize: 12
                              }}
                            >
                              Resume
                            </button>
                          )}
                        </div>

                        {transcodeStatus[video.hash].qualities ? (
                          (() => {
                            const entries = Object.entries(transcodeStatus[video.hash].qualities || {});
                            // Filter out 'original' from the processing list as it's shown above
                            const filteredEntries = entries.filter(([q]) => q !== 'original');
                            filteredEntries.sort((a, b) => {
                              const ra = a[1].resolution || a[1].target_resolution || '';
                              const rb = b[1].resolution || b[1].target_resolution || '';
                              const ha = parseInt((ra.split('x')[1] || '').toString(), 10) || 0;
                              const hb = parseInt((rb.split('x')[1] || '').toString(), 10) || 0;
                              return hb - ha; // descending by height
                            });

                            return filteredEntries.map(([q, s]) => {
                              const percent = typeof s.progress === 'number'
                                ? s.progress
                                : (s.status === 'ok' ? 100 : 0);
                              const barColor = s.status === 'ok'
                                ? '#28a745'
                                : s.status === 'error'
                                  ? '#dc3545'
                                  : s.status === 'skipped'
                                    ? '#6c757d'
                                    : '#0d6efd';
                              const detail = s.message || s.error || '';
                              const statusLabel = s.status || 'pending';
                              const label = q;
                              
                              // Skip rendering skipped qualities
                              if (s.status === 'skipped') {
                                return null;
                              }
                              
                              return (
                                <div key={q} style={{ marginBottom: 10 }}>
                                  <div style={{ fontSize: 12, color: '#222', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{label}</span>
                                    <span>{percent}%</span>
                                  </div>
                                  <div style={{ height: 10, background: '#eee', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                                    <div
                                      style={{
                                        width: `${percent}%`,
                                        height: '100%',
                                        background: barColor,
                                        transition: 'width 0.5s ease',
                                      }}
                                    />
                                  </div>
                                  <div style={{ fontSize: 11, color: statusLabel === 'error' ? '#b30000' : '#555', marginTop: 4 }}>
                                    {statusLabel}{detail ? ` · ${detail}` : ''}
                                  </div>
                                </div>
                              );
                            });
                          })()
                        ) : (
                          // fallback to qualities fetched from /api/transcode/{hash}/qualities
                          (qualities[video.hash] && qualities[video.hash].qualities) ? (
                            (() => {
                              const entries = Object.entries(qualities[video.hash].qualities || {});
                              // Filter out 'original' from the processing list
                              const filteredEntries = entries.filter(([q]) => q !== 'original');
                              filteredEntries.sort((a, b) => {
                                const ra = a[1].resolution || a[1].target_resolution || '';
                                const rb = b[1].resolution || b[1].target_resolution || '';
                                const ha = parseInt((ra.split('x')[1] || '').toString(), 10) || 0;
                                const hb = parseInt((rb.split('x')[1] || '').toString(), 10) || 0;
                                return hb - ha;
                              });

                              return filteredEntries.map(([q, s]) => {
                                const percent = typeof s.progress === 'number' ? s.progress : 100;
                                const barColor = s.status === 'ok' || !s.status ? '#28a745' : s.status === 'error' ? '#dc3545' : '#0d6efd';
                                const detail = s.message || s.error || '';
                                const statusLabel = s.status || 'ok';
                                const label = q;
                                return (
                                  <div key={q} style={{ marginBottom: 10 }}>
                                    <div style={{ fontSize: 12, color: '#222', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                                      <span>{label}</span>
                                      <span>{percent}%</span>
                                    </div>
                                    <div style={{ height: 10, background: '#eee', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                                      <div style={{ width: `${percent}%`, height: '100%', background: barColor, transition: 'width 0.5s ease' }} />
                                    </div>
                                    <div style={{ fontSize: 11, color: statusLabel === 'error' ? '#b30000' : '#555', marginTop: 4 }}>
                                      {statusLabel}{detail ? ` · ${detail}` : ''}
                                    </div>
                                  </div>
                                );
                              });
                            })()
                          ) : (
                            <div style={{ fontSize: 12, color: '#555' }}>{transcodeStatus[video.hash].overall || 'pending'}</div>
                          )
                        )}
                      </div>
                    ) : (
                      <div>
                        {/* Show original quality even if no transcode status */}
                        {(() => {
                          const origFromVideoRecord = video.original_quality_label;
                          const origResFromVideoRecord = video.original_resolution;
                          const origFromQualities = qualities[video.hash]?.original_quality_label;
                          const origResFromQualities = qualities[video.hash]?.original_resolution;
                          
                          const originalQualityLabel = origFromVideoRecord || origFromQualities;
                          const originalResolution = origResFromVideoRecord || origResFromQualities;
                          
                          if (originalQualityLabel || originalResolution) {
                            return (
                              <div style={{ 
                                marginBottom: 12, 
                                padding: '8px 10px', 
                                backgroundColor: '#e8f4ff', 
                                borderLeft: '4px solid #007bff',
                                borderRadius: 4 
                              }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#0056b3', marginBottom: 4 }}>
                                  Original video quality
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#003d82' }}>
                                  {originalQualityLabel || 'unknown'} {originalResolution && `(${originalResolution})`}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        <div style={{ fontSize: 12, color: '#777' }}>No transcode status</div>
                      </div>
                    )}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '12px', color: '#000' }}>
              {video.thumbnail_filename ? 'Yes' : 'No'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '12px', color: '#000', width: 140 }}>
                    {deleting[video.hash] ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ height: 8, background: '#eee', borderRadius: 6, overflow: 'hidden' }}>
                          <div style={{ width: `${deleting[video.hash].progress || 0}%`, height: '100%', background: deleting[video.hash].status === 'error' ? '#dc3545' : '#dc3545', transition: 'width 0.25s' }} />
                        </div>
                        <div style={{ fontSize: 12, color: deleting[video.hash].status === 'error' ? '#b30000' : '#333', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{deleting[video.hash].status === 'pending' ? 'Deleting...' : deleting[video.hash].status === 'done' ? 'Deleted' : 'Error'}</span>
                          <span>{deleting[video.hash].progress || 0}%</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDelete(video.hash)}
                        disabled={isTranscodingActive(video.hash)}
                        title={isTranscodingActive(video.hash) ? "Cannot delete while transcoding" : "Delete video"}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: isTranscodingActive(video.hash) ? 'not-allowed' : 'pointer',
                          padding: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          opacity: isTranscodingActive(video.hash) ? 0.5 : 1
                        }}
                      >
                        {/* simple trash icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b30000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </td>
                  {/* transcode control removed from admin UI */}
                </tr>
              ))}
            </tbody>
                </table>
              </div>
            )}
          </div>
              </div>

              {/* Upload Dialog */}
              {showDialog && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: '#fff',
              padding: '30px',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 1)',
              maxWidth: '500px',
              width: '90%'
            }}>
              <h2 style={{ marginTop: 0, color: '#000' }}>Upload Files</h2>

              {/* File Inputs */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#000' }}>
                  Choose Video File (optional):
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files[0])}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginBottom: '10px'
                  }}
                />
                 <p style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                  Supported formats: MP4, MOV, AVI, M4V (HEVC), HEVC. Only these will be accepted and processed.
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#000' }}>
                  Choose Thumbnail File (optional):
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setThumbnailFile(e.target.files[0])}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginBottom: '10px'
                  }}
                />
              </div>

              {/* Video Selection for Thumbnail only */}
              {thumbnailFile && !videoFile && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#000' }}>
                    Select Video for Thumbnail:
                  </label>
                  <select
                    value={selectedVideo}
                    onChange={(e) => setSelectedVideo(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="">Choose a video...</option>
                    {videosWithoutThumbnail.map((video) => (
                      <option key={video.hash} value={video.hash}>
                        {video.filename} ({video.hash.slice(0, 8)}...)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Buttons */}
              {/* Progress Bar */}
              {uploading && (
                <div style={{ margin: '15px 0' }}>
                  <div style={{ height: '10px', background: '#eee', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: '#28a745', transition: 'width 0.2s' }} />
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12px', color: '#333', marginTop: '6px' }}>{progress}%</div>
                </div>
              )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowDialog(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#b61010ff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || (!videoFile && !thumbnailFile)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: uploading || (!videoFile && !thumbnailFile) ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: uploading || (!videoFile && !thumbnailFile) ? 'not-allowed' : 'pointer'
                }}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}