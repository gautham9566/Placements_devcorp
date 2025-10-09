import React from 'react';

export default function TranscodeStatus({ video, transcodeStatus, qualities, stopTranscode, resumeTranscode }) {
  const status = transcodeStatus[video.hash];

  const renderOriginalBlock = (label, res) => {
    if (!label && !res) return null;
    return (
      <div style={{
        marginBottom: 12,
        padding: '8px 10px',
        backgroundColor: '#e8f4ff',
        borderLeft: '4px solid #007bff',
        borderRadius: 4
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0056b3', marginBottom: 4 }}>Original video quality</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#003d82' }}>{label || 'unknown'} {res && `(${res})`}</div>
      </div>
    );
  };

  if (status) {
    const originalQualityLabel = status.original_quality_label || (status.qualities && status.qualities.original && status.qualities.original.quality_label) || video.original_quality_label;
    const originalResolution = status.original_resolution || (status.qualities && status.qualities.original && status.qualities.original.resolution) || video.original_resolution;

    const qualityEntries = status.qualities ? Object.entries(status.qualities).filter(([q]) => q !== 'original') : [];

    return (
      <div>
        {renderOriginalBlock(originalQualityLabel, originalResolution)}
        <div style={{ fontSize: 12, color: '#444', marginBottom: 8 }}>Overall: <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{status.overall || 'pending'}</span></div>

        <div style={{ marginBottom: 8 }}>
          {(status.overall === 'running' || status.overall === 'pending') && (
            <button onClick={() => stopTranscode(video.hash)} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Stop</button>
          )}
          {status.overall === 'stopped' && (
            <button onClick={() => resumeTranscode(video.hash)} style={{ background: '#28a745', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Resume</button>
          )}
        </div>

        {qualityEntries.length > 0 ? (
          qualityEntries.map(([q, s]) => {
            if (s.status === 'skipped') return null;
            const percent = typeof s.progress === 'number' ? s.progress : (s.status === 'ok' ? 100 : 0);
            const barColor = s.status === 'ok' ? '#28a745' : s.status === 'error' ? '#dc3545' : '#0d6efd';
            const statusLabel = s.status || 'pending';
            const detail = s.message || s.error || '';
            return (
              <div key={q} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: '#222', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{q}</span>
                  <span>{percent}%</span>
                </div>
                <div style={{ height: 10, background: '#eee', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ width: `${percent}%`, height: '100%', background: barColor, transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ fontSize: 11, color: statusLabel === 'error' ? '#b30000' : '#555', marginTop: 4 }}>{statusLabel}{detail ? ` · ${detail}` : ''}</div>
              </div>
            );
          })
        ) : (
          (qualities[video.hash] && qualities[video.hash].qualities) ? (
            Object.entries(qualities[video.hash].qualities).filter(([q]) => q !== 'original').map(([q, s]) => {
              const percent = typeof s.progress === 'number' ? s.progress : 100;
              const barColor = s.status === 'ok' || !s.status ? '#28a745' : s.status === 'error' ? '#dc3545' : '#0d6efd';
              const statusLabel = s.status || 'ok';
              const detail = s.message || s.error || '';
              return (
                <div key={q} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: '#222', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{q}</span>
                    <span>{percent}%</span>
                  </div>
                  <div style={{ height: 10, background: '#eee', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ width: `${percent}%`, height: '100%', background: barColor, transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ fontSize: 11, color: statusLabel === 'error' ? '#b30000' : '#555', marginTop: 4 }}>{statusLabel}{detail ? ` · ${detail}` : ''}</div>
                </div>
              );
            })
          ) : (
            <div style={{ fontSize: 12, color: '#555' }}>{status.overall || 'pending'}</div>
          )
        )}
      </div>
    );
  }

  // No status fallback
  const originalQualityLabel = video.original_quality_label || (qualities[video.hash] && qualities[video.hash].original_quality_label);
  const originalResolution = video.original_resolution || (qualities[video.hash] && qualities[video.hash].original_resolution);
  return (
    <div>
      {renderOriginalBlock(originalQualityLabel, originalResolution)}
      <div style={{ fontSize: 12, color: '#777' }}>No transcode status</div>
    </div>
  );
}
