import React from 'react';
import TranscodeStatus from './TranscodeStatus';

export default function VideoTable({ videos, transcodeStatus, qualities, deleting, isTranscodingActive, handleDelete, stopTranscode, resumeTranscode }) {
  return (
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
                    <TranscodeStatus video={video} transcodeStatus={transcodeStatus} qualities={qualities} stopTranscode={stopTranscode} resumeTranscode={resumeTranscode} />
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '12px', color: '#000' }}>{video.thumbnail_filename ? 'Yes' : 'No'}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
