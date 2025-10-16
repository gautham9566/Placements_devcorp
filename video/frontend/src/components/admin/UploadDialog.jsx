import React from 'react';

export default function UploadDialog({ show, onClose, videoFile, setVideoFile, thumbnailFile, setThumbnailFile, uploading, progress, handleUpload, videosWithoutThumbnail, selectedVideo, setSelectedVideo }) {
  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,1)', maxWidth: '500px', width: '90%' }}>
        <h2 style={{ marginTop: 0, color: '#000' }}>Upload Files</h2>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#000' }}>Choose Video File (optional):</label>
          <input type="file" accept="video/*" onChange={(e)=>setVideoFile(e.target.files[0])} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '10px' }} />
          <p style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>Supported formats: MP4, MOV, AVI, M4V (HEVC), HEVC. Only these will be accepted and processed.</p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#000' }}>Choose Thumbnail File (optional):</label>
          <input type="file" accept="image/*" onChange={(e)=>setThumbnailFile(e.target.files[0])} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '10px' }} />
        </div>

        {thumbnailFile && !videoFile && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#000' }}>Select Video for Thumbnail:</label>
            <select value={selectedVideo} onChange={(e)=>setSelectedVideo(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
              <option value="">Choose a video...</option>
              {videosWithoutThumbnail.map(v => <option key={v.hash} value={v.hash}>{v.filename} ({v.hash.slice(0,8)}...)</option>)}
            </select>
          </div>
        )}

        {uploading && (
          <div style={{ margin: '15px 0' }}>
            <div style={{ height: '10px', background: '#eee', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: '#28a745', transition: 'width 0.2s' }} />
            </div>
            <div style={{ textAlign: 'right', fontSize: '12px', color: '#333', marginTop: '6px' }}>{progress}%</div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', backgroundColor: '#b61010ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleUpload} disabled={uploading || (!videoFile && !thumbnailFile)} style={{ padding: '10px 20px', backgroundColor: uploading || (!videoFile && !thumbnailFile) ? '#ccc' : '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: uploading || (!videoFile && !thumbnailFile) ? 'not-allowed' : 'pointer' }}>{uploading ? 'Uploading...' : 'Upload'}</button>
        </div>
      </div>
    </div>
  );
}
