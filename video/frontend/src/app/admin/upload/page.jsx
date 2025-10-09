"use client";
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

const UploadPage = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async () => {
    if (!videoFile) {
      alert('Please select a video file to upload');
      return;
    }
    setUploading(true);
    try {
      // 1) upload video in chunks
      const hash = await uploadVideoFile(videoFile, (p) => setUploadProgress(p));

      // 2) upload thumbnail if present
      if (thumbnailFile) await uploadThumbnail(hash, thumbnailFile);

        // record current hash so we can poll status
        setCurrentHash(hash);

      // 3) trigger transcode with default qualities
      await triggerTranscode(hash, { '360p': true, '480p': true, '720p': true }, null);

    // 4) create metadata entry (include title and description)
    const metadata = { hash, filename: videoFile.name, title: title, description: description || '' };
    if (scheduledAt) {
      metadata.status = 'Scheduled';
      metadata.scheduled_at = scheduledAt;
    }
    await fetch('/api/videos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(metadata) });
    // Do NOT automatically reset the form here; allow the user to keep the data until they explicitly clear or upload next.
    } catch (e) {
      alert('Upload failed: ' + (e.message || e));
    } finally {
      setUploading(false);
    }
  };

  // Hidden file input ref for clickable drop area
  const hiddenInputRef = useRef(null);

  const onDropFile = (file) => {
    if (file) setVideoFile(file);
  };

  const handleAreaClick = () => {
    hiddenInputRef.current?.click();
  };

  const handleFileInputChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) onDropFile(f);
  };

  const router = useRouter();

  // Scheduling state
  const [scheduledAt, setScheduledAt] = useState('');

  const handleBack = () => router.push('/admin');

  // Transcode status for the current uploaded video (if any)
  const [currentHash, setCurrentHash] = useState(null);
  const [transcodeStatus, setTranscodeStatus] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // start polling when we have a currentHash
  React.useEffect(() => {
    if (!currentHash) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const resp = await fetch(`/api/transcode/${currentHash}/status`);
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) {
            setTranscodeStatus(data);
            if (data.overall === 'ok' || data.overall === 'finished' || data.overall === 'completed') {
              setShowSuccessModal(true);
            }
          }
        }
      } catch (e) {
        // ignore
      }
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => { cancelled = true; clearInterval(id); };
  }, [currentHash]);

  // Note: automatic schedule modal on transcode completion removed. Users can schedule explicitly.

  const stopTranscode = async (hash) => {
    try {
      await fetch(`/api/videos/${hash}/stop`, { method: 'PUT' });
    } catch (e) {}
  };

  const resumeTranscode = async (hash) => {
    try {
      await fetch(`/api/videos/${hash}/resume`, { method: 'PUT' });
    } catch (e) {}
  };

  return (
    <div className="bg-gray-900 min-h-screen p-8 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-8">
          <button onClick={handleBack} className="bg-gray-700 text-white px-3 py-2 rounded-lg mr-4">
            <svg className="w-5 h-5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </button>
          <h1 className="text-3xl font-bold">Upload New Video</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="md:col-span-2 space-y-6">
            {/* Drag and Drop */}
            <div
              className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center"
              onClick={handleAreaClick}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) onDropFile(f); }}
            >
              <div className="flex flex-col items-center">
                <svg className="w-16 h-16 text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                <p className="text-gray-400">Drag & drop video file here, or click to upload</p>
                <input
                  ref={hiddenInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                {videoFile && (
                  <div className="mt-4 w-full text-left text-sm text-gray-200">
                    Selected: <span className="font-semibold">{videoFile.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Video Details */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Video Upload</h2>
              <div className="space-y-4">
                <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600" />
                <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600 h-24"></textarea>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Schedule publish (optional)</label>
                  <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full bg-gray-700 p-2 rounded-lg border border-gray-600" />
                </div>
              </div>
            </div>

            {/* Thumbnail Upload (file input) */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Thumbnail Upload</h2>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setThumbnailFile(e.target.files && e.target.files[0])}
                  className="bg-gray-700 p-2 rounded-lg border border-gray-600"
                />
                {thumbnailFile && (
                  <div className="w-24 h-14 rounded-md overflow-hidden">
                    <img src={URL.createObjectURL(thumbnailFile)} alt="thumb" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-4">
              <button onClick={() => handleSubmit()} disabled={uploading} className="bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold">{uploading ? 'Uploading...' : 'Upload'}</button>
            </div>

            {/* Upload and transcode panels moved to the right preview column */}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Video Preview</h2>
              <div className="bg-black aspect-video rounded-lg flex items-center justify-center">
                {videoFile ? (
                  <video controls className="w-full h-full rounded-lg">
                    <source src={URL.createObjectURL(videoFile)} type={videoFile.type} />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <svg className="w-16 h-16 text-gray-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                )}
              </div>
            </div>

            {/* Upload Progress */}
            {uploading && !currentHash && (
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Uploading...</h2>
                <div className="flex justify-between items-center mb-2">
                  <span>Uploading</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}

            {/* Transcode Status */}
            {currentHash && (
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Transcode Status</h2>
                <div className="mb-3 text-gray-300">Overall: <span className="font-semibold">{transcodeStatus?.overall || 'pending'}</span></div>
                <div className="mb-3">
                  {(transcodeStatus?.overall === 'running' || transcodeStatus?.overall === 'pending') && (
                    <button onClick={() => stopTranscode(currentHash)} className="bg-red-600 text-white px-3 py-1 rounded-lg mr-2">Stop</button>
                  )}
                  {transcodeStatus?.overall === 'stopped' && (
                    <button onClick={() => resumeTranscode(currentHash)} className="bg-green-600 text-white px-3 py-1 rounded-lg">Resume</button>
                  )}
                </div>
                <div>
                  {transcodeStatus && transcodeStatus.qualities ? (
                    Object.entries(transcodeStatus.qualities).filter(([q]) => q !== 'original').map(([q, s]) => {
                      const percent = typeof s.progress === 'number' ? s.progress : (s.status === 'ok' ? 100 : 0);
                      const barColor = s.status === 'ok' ? 'bg-green-500' : s.status === 'error' ? 'bg-red-500' : 'bg-blue-500';
                      return (
                        <div key={q} className="mb-3">
                          <div className="flex justify-between text-sm text-gray-200 mb-1"><span>{q}</span><span>{percent}%</span></div>
                          <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                            <div className={`${barColor} h-2.5`} style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-gray-400">No transcode status</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        .switch {
          position: relative;
          display: inline-block;
          width: 60px;
          height: 34px;
        }
        .switch input { 
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 26px;
          width: 26px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
        }
        input:checked + .slider {
          background-color: #2196F3;
        }
        input:focus + .slider {
          box-shadow: 0 0 1px #2196F3;
        }
        input:checked + .slider:before {
          transform: translateX(26px);
        }
        .slider.round {
          border-radius: 34px;
        }
        .slider.round:before {
          border-radius: 50%;
        }
      `}</style>
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md text-center">
            <h3 className="text-lg font-semibold mb-3">Upload Successful!</h3>
            <p className="text-sm text-gray-300 mb-4">Your video has been uploaded and transcoded successfully.</p>
            <button onClick={() => router.push('/admin')} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold">Go to Admin Page</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPage;

// Helper functions (kept at bottom to avoid reordering large file block)
async function uploadVideoFile(file, onProgress) {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  // init
  const initForm = new FormData();
  initForm.append('filename', file.name);
  initForm.append('total_chunks', String(totalChunks));

  const initResp = await fetch('/api/upload/init', { method: 'POST', body: initForm });
  if (!initResp.ok) throw new Error('Failed to initialize upload');
  const initResult = await initResp.json();
  const upload_id = initResult.upload_id;

  let completed = 0;
  const chunkPromises = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const form = new FormData();
    form.append('upload_id', upload_id);
    form.append('index', String(i));
    form.append('file', chunk, `${file.name}.part`);

    const p = fetch('/api/upload/chunk', { method: 'POST', body: form }).then(resp => {
      if (!resp.ok) throw new Error('Chunk upload failed');
      completed += 1;
      if (onProgress) onProgress(Math.round((completed / totalChunks) * 100));
    });

    chunkPromises.push(p);
  }

  await Promise.all(chunkPromises);

  const completeForm = new FormData();
  completeForm.append('upload_id', upload_id);
  const completeResp = await fetch('/api/upload/complete', { method: 'POST', body: completeForm });
  if (!completeResp.ok) throw new Error('Complete failed');
  const completeResult = await completeResp.json();
  return completeResult.hash;
}

async function uploadThumbnail(hash, file) {
  if (!file) return;
  const form = new FormData();
  form.append('file', file);
  await fetch(`/api/thumbnail/${hash}`, { method: 'POST', body: form });
}

async function triggerTranscode(hash, qualities, measuredSpeed) {
  const payload = { qualities: Object.keys(qualities).filter(q => qualities[q]), networkSpeed: measuredSpeed };
  await fetch(`/api/transcode/${hash}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
}
