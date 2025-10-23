import React from 'react';

export default function TranscodeStatus({ video, transcodeStatus, qualities, stopTranscode, resumeTranscode }) {
  const status = transcodeStatus[video.hash];

  const renderOriginalBlock = (label, res) => {
    if (!label && !res) return null;
    return (
      <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded">
        <div className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-1">Original video quality</div>
        <div className="text-sm font-semibold text-blue-900 dark:text-blue-200">{label || 'unknown'} {res && `(${res})`}</div>
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
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">Overall: <span className="font-semibold capitalize">{status.overall || 'pending'}</span></div>

        <div className="mb-2">
          {(status.overall === 'running' || status.overall === 'pending') && (
            <button onClick={() => stopTranscode(video.hash)} className="bg-red-600 hover:bg-red-700 text-white border-none px-2 py-1 rounded cursor-pointer text-xs">Stop</button>
          )}
          {status.overall === 'stopped' && (
            <button onClick={() => resumeTranscode(video.hash)} className="bg-green-600 hover:bg-green-700 text-white border-none px-2 py-1 rounded cursor-pointer text-xs">Resume</button>
          )}
        </div>

        {qualityEntries.length > 0 ? (
          qualityEntries.map(([q, s]) => {
            if (s.status === 'skipped') return null;
            const percent = typeof s.progress === 'number' ? s.progress : (s.status === 'ok' ? 100 : 0);
            const barColor = s.status === 'ok' ? 'bg-green-500' : s.status === 'error' ? 'bg-red-500' : 'bg-blue-500';
            const statusLabel = s.status || 'pending';
            const detail = s.message || s.error || '';
            return (
              <div key={q} className="mb-2.5">
                <div className="text-xs text-gray-800 dark:text-gray-200 mb-1 flex justify-between">
                  <span>{q}</span>
                  <span>{percent}%</span>
                </div>
                <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden relative">
                  <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${percent}%` }} />
                </div>
                <div className={`text-xs mt-1 ${statusLabel === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>{statusLabel}{detail ? ` · ${detail}` : ''}</div>
              </div>
            );
          })
        ) : (
          (qualities[video.hash] && qualities[video.hash].qualities) ? (
            Object.entries(qualities[video.hash].qualities).filter(([q]) => q !== 'original').map(([q, s]) => {
              const percent = typeof s.progress === 'number' ? s.progress : 100;
              const barColor = s.status === 'ok' || !s.status ? 'bg-green-500' : s.status === 'error' ? 'bg-red-500' : 'bg-blue-500';
              const statusLabel = s.status || 'ok';
              const detail = s.message || s.error || '';
              return (
                <div key={q} className="mb-2.5">
                  <div className="text-xs text-gray-800 dark:text-gray-200 mb-1 flex justify-between">
                    <span>{q}</span>
                    <span>{percent}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden relative">
                    <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${percent}%` }} />
                  </div>
                  <div className={`text-xs mt-1 ${statusLabel === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>{statusLabel}{detail ? ` · ${detail}` : ''}</div>
                </div>
              );
            })
          ) : (
            <div className="text-xs text-gray-600 dark:text-gray-400">{status.overall || 'pending'}</div>
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
      <div className="text-xs text-gray-500 dark:text-gray-400">No transcode status</div>
    </div>
  );
}
