import React from 'react';
import TranscodeStatus from './TranscodeStatus';

export default function VideoTable({ videos, transcodeStatus, qualities, deleting, isTranscodingActive, handleDelete, stopTranscode, resumeTranscode }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <h2 className="mt-0 text-gray-900 dark:text-white">Uploaded Videos</h2>
      {videos.length === 0 ? (
        <p className="text-gray-900 dark:text-white text-center py-5">No videos uploaded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse mt-5">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-left">ID</th>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-left">Video ID (Hash)</th>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-left">Title</th>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-left">Transcode</th>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-left">Thumbnail</th>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-left">Delete</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((video, index) => (
                <tr key={video.id} className={`${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'} transition-colors duration-200`}>
                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-gray-900 dark:text-white">{video.id}</td>
                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-gray-900 dark:text-white font-mono">{video.hash}</td>
                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-gray-900 dark:text-white">{video.title || 'Untitled'}</td>
                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-gray-900 dark:text-white min-w-60">
                    <TranscodeStatus video={video} transcodeStatus={transcodeStatus} qualities={qualities} stopTranscode={stopTranscode} resumeTranscode={resumeTranscode} />
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-gray-900 dark:text-white">{video.thumbnail_filename ? 'Yes' : 'No'}</td>
                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-gray-900 dark:text-white w-36">
                    {deleting[video.hash] ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded overflow-hidden">
                          <div className={`h-full ${deleting[video.hash].status === 'error' ? 'bg-red-500' : 'bg-red-500'} transition-all duration-250`} style={{ width: `${deleting[video.hash].progress || 0}%` }} />
                        </div>
                        <div className={`text-xs flex justify-between ${deleting[video.hash].status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>
                          <span>{deleting[video.hash].status === 'pending' ? 'Deleting...' : deleting[video.hash].status === 'done' ? 'Deleted' : 'Error'}</span>
                          <span>{deleting[video.hash].progress || 0}%</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDelete(video.hash)}
                        disabled={isTranscodingActive(video.hash)}
                        title={isTranscodingActive(video.hash) ? "Cannot delete while transcoding" : "Delete video"}
                        className="bg-transparent border-none cursor-pointer disabled:cursor-not-allowed p-1.5 inline-flex items-center disabled:opacity-50"
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
