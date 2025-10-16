import React from 'react';
import VideoListItem from './VideoListItem';

const VideoList = ({ videos, onSelectVideo, onPublish, onDelete, onEdit, onPreview, onUnpublish }) => {
  return (
    <div className="bg-gray-900 bg-opacity-30 backdrop-blur-sm rounded-lg overflow-hidden border border-gray-800/30">
      <div className="grid grid-cols-12 gap-2 items-center p-4 border-b border-gray-800/30 text-gray-200 font-bold text-sm">
        <div className="col-span-1">Thumbnail</div>
        <div className="col-span-3 min-w-0">Video Title</div>
        <div className="col-span-1 min-w-0">Description</div>
        <div className="col-span-2 min-w-0">Category</div>
        <div className="col-span-2 min-w-0">Date Added</div>
        <div className="col-span-1 min-w-0">Status</div>
        <div className="col-span-1 min-w-0">Views</div>
        <div className="col-span-1 min-w-0">Actions</div>
      </div>
      {videos.map(video => (
        <VideoListItem key={video.id} video={video} onSelect={onSelectVideo} onPublish={onPublish} onDelete={onDelete} onEdit={onEdit} onPreview={onPreview} onUnpublish={onUnpublish} />
      ))}
    </div>
  );
};

export default VideoList;
