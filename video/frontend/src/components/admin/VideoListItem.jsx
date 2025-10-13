import React from 'react';

const VideoListItem = ({ video, onSelect, onPublish, onDelete, onEdit, onPreview, onUnpublish }) => {
  const getStatusChip = (status) => {
    switch (status.toLowerCase()) {
      case 'published':
        return <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs">{status}</span>;
      case 'draft':
        return <span className="bg-gray-500 text-white px-2 py-1 rounded-full text-xs">{status}</span>;
      case 'scheduled':
        return (
          <div className="flex flex-col items-start">
            <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs mb-1">{status}</span>
            {video.scheduled_at && (
              <span className="text-xs text-yellow-400">
                {new Date(video.scheduled_at).toLocaleString()}
              </span>
            )}
          </div>
        );
      default:
        return <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs">{status}</span>;
    }
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-center p-4 border-b border-gray-800/30 hover:bg-gray-900/40 transition-colors duration-200">
      <div className="col-span-1">
        <img src={video.thumbnail_url || '/placeholder.png'} alt={video.title} className="w-16 h-9 rounded-md object-cover" />
      </div>
  <div className="col-span-3 text-white font-medium min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{video.title ? (video.title.length > 20 ? video.title.slice(0, 20) + '...' : video.title) : 'N/A'}</div>
  <div className="col-span-1 text-gray-400 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{video.description ? (video.description.length > 20 ? video.description.slice(0, 20) + '...' : video.description) : 'N/A'}</div>
      <div className="col-span-2 text-gray-400">{video.category || 'N/A'}</div>
      <div className="col-span-2 text-gray-400">{new Date(video.created_at).toLocaleDateString()}</div>
      <div className="col-span-1">{getStatusChip(video.status || 'Draft')}</div>
      <div className="col-span-1 text-gray-400">{video.views || '0'}</div>
      <div className="col-span-1 flex items-center space-x-2">
        <button 
          onClick={() => onPublish && onPublish(video.hash)}
          className={`transition-colors duration-200 ${
            video.status?.toLowerCase() === 'draft' 
              ? 'text-purple-400 hover:text-purple-300' 
              : 'text-gray-600 cursor-not-allowed'
          }`}
          title="Publish"
          disabled={video.status?.toLowerCase() !== 'draft'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <button 
          onClick={() => onUnpublish && onUnpublish(video.hash)}
          className={`transition-colors duration-200 ${
            video.status?.toLowerCase() === 'published' 
              ? 'text-orange-400 hover:text-orange-300' 
              : 'text-gray-600 cursor-not-allowed'
          }`}
          title="Unpublish"
          disabled={video.status?.toLowerCase() !== 'published'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a4 4 0 000-8 5 5 0 10-9.9 1" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
          </svg>
        </button>
        <button 
          onClick={() => onEdit && onEdit(video)}
          className={`transition-colors duration-200 ${
            video.status?.toLowerCase() === 'published' 
              ? 'text-gray-600 cursor-not-allowed' 
              : 'text-blue-400 hover:text-blue-300'
          }`}
          title="Edit"
          disabled={video.status?.toLowerCase() === 'published'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button 
          onClick={() => onDelete(video.hash)} 
          className="text-red-400 hover:text-red-300 transition-colors duration-200" 
          title="Delete"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        <button 
          onClick={() => onPreview && onPreview(video)}
          className="text-green-400 hover:text-green-300 transition-colors duration-200" 
          title="Preview"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default VideoListItem;
