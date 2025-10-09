import React from 'react';
import VideoListItem from './VideoListItem';

const VideoList = ({ videos, onSelectVideo, onPublish, onDelete, onEdit, onPreview }) => {
  return (
    <div className="bg-gray-900 bg-opacity-30 backdrop-blur-sm rounded-lg overflow-hidden border border-gray-800/30">
      <div className="grid grid-cols-13 gap-4 items-center p-4 border-b border-gray-800/30 text-gray-200 font-bold text-sm">
        <div className="col-span-1">
          <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-400 bg-gray-900 bg-opacity-20 border-gray-700 rounded focus:ring-blue-500 focus:ring-2" />
        </div>
        <div className="col-span-1">Thumbnail</div>
        <div className="col-span-4">Video Title</div>
        <div className="col-span-2">Category</div>
        <div className="col-span-2">Date Added</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-1">Views</div>
        <div className="col-span-1">Actions</div>
      </div>
      {videos.map(video => (
        <VideoListItem key={video.id} video={video} onSelect={onSelectVideo} onPublish={onPublish} onDelete={onDelete} onEdit={onEdit} onPreview={onPreview} />
      ))}
    </div>
  );
};

export default VideoList;
