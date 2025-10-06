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

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/videos');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setVideos(data);
        }
      } else {
        setError('Failed to load videos');
      }
    } catch (error) {
      setError('Network error while loading videos');
    }
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
            if (data && (data.overall === 'ok' || data.overall === 'error')) {
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

        // send chunks sequentially
        let uploadedBytes = 0;
        for (let index = 0; index < totalChunks; index++) {
          const start = index * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, videoFile.size);
          const chunk = videoFile.slice(start, end);

          const chunkForm = new FormData();
          chunkForm.append('upload_id', videoHash);
          chunkForm.append('index', String(index));
          chunkForm.append('file', chunk, `${videoFile.name}.part`);

          const chunkResp = await fetch('/api/upload/chunk', {
            method: 'POST',
            body: chunkForm,
          });

          if (!chunkResp.ok) {
            const err = await chunkResp.json().catch(() => ({}));
            throw new Error(err.detail || `Failed uploading chunk ${index}`);
          }

          uploadedBytes += (end - start);
          setProgress(Math.round((uploadedBytes / videoFile.size) * 100));
        }

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
                        <div style={{ fontSize: 12, color: '#444', marginBottom: 8 }}>
                          Overall:{' '}
                          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                            {transcodeStatus[video.hash].overall || 'pending'}
                          </span>
                        </div>
                        {transcodeStatus[video.hash].qualities ? (
                          Object.entries(transcodeStatus[video.hash].qualities).map(([q, s]) => {
                            const percent = typeof s.progress === 'number'
                              ? s.progress
                              : (s.status === 'ok' ? 100 : 0);
                            const barColor = s.status === 'ok'
                              ? '#28a745'
                              : s.status === 'error'
                                ? '#dc3545'
                                : '#0d6efd';
                            const detail = s.message || s.error;
                            const statusLabel = s.status || 'pending';
                            return (
                              <div key={q} style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: 12, color: '#222', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                                  <span>{q}</span>
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
                          })
                        ) : (
                          <div style={{ fontSize: 12, color: '#555' }}>{transcodeStatus[video.hash].overall || 'pending'}</div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#777' }}>No status</div>
                    )}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '12px', color: '#000' }}>
              {video.thumbnail_filename ? 'Yes' : 'No'}
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
                  backgroundColor: '#6c757d',
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