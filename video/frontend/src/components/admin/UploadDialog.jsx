import React from 'react';

export default function UploadDialog({ show, onClose, videoFile, setVideoFile, thumbnailFile, setThumbnailFile, uploading, progress, handleUpload, videosWithoutThumbnail, selectedVideo, setSelectedVideo }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Upload Files</h2>

        <div className="mb-4">
          <label className="block mb-2 font-semibold text-gray-900 dark:text-white">Choose Video File (optional):</label>
          <input 
            type="file" 
            accept="video/*" 
            onChange={(e)=>setVideoFile(e.target.files[0])} 
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
          />
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Supported formats: MP4, MOV, AVI, M4V (HEVC), HEVC. Only these will be accepted and processed.</p>
        </div>

        <div className="mb-4">
          <label className="block mb-2 font-semibold text-gray-900 dark:text-white">Choose Thumbnail File (optional):</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e)=>setThumbnailFile(e.target.files[0])} 
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
          />
        </div>

        {thumbnailFile && !videoFile && (
          <div className="mb-4">
            <label className="block mb-2 font-semibold text-gray-900 dark:text-white">Select Video for Thumbnail:</label>
            <select 
              value={selectedVideo} 
              onChange={(e)=>setSelectedVideo(e.target.value)} 
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Choose a video...</option>
              {videosWithoutThumbnail.map(v => <option key={v.hash} value={v.hash}>{v.filename} ({v.hash.slice(0,8)}...)</option>)}
            </select>
          </div>
        )}

        {uploading && (
          <div className="mb-4">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-200" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-right text-sm text-gray-600 dark:text-gray-400 mt-1">{progress}%</div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleUpload} 
            disabled={uploading || (!videoFile && !thumbnailFile)} 
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
