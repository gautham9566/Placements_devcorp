"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CommentsSection from '../../../../components/students/CommentsSection';
import CustomVideoPlayer from '../../../../components/admin/CustomVideoPlayer';

export default function AdminVideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id;

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedVideo, setEditedVideo] = useState(null);
  const [commentsCount, setCommentsCount] = useState(0);
  const [engagementStats, setEngagementStats] = useState(null);
  const [lmsUsername, setLmsUsername] = useState('admin');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (videoId) {
      fetchVideo();
      fetchEngagementStats();
    }
  }, [videoId]);

  const fetchVideo = async () => {
    try {
      const response = await fetch(`/api/videos/${videoId}`);
      if (!response.ok) throw new Error('Failed to fetch video');
      const data = await response.json();
      setVideo(data);
      setEditedVideo(data);
    } catch (err) {
      console.error('Error fetching video:', err);
      alert('Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const fetchEngagementStats = async () => {
    try {
      const response = await fetch(`/api/engagement/stats/video/${videoId}`);
      if (response.ok) {
        const stats = await response.json();
        setEngagementStats(stats);
        setCommentsCount(stats.comments || 0);
      }
    } catch (err) {
      console.error('Error fetching engagement stats:', err);
    }
  };

  const handleSave = async () => {
    if (!editedVideo) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editedVideo.title,
          description: editedVideo.description,
          category: editedVideo.category,
          subcategory: editedVideo.subcategory,
          tags: editedVideo.tags,
        }),
      });

      if (!response.ok) throw new Error('Failed to update video');

      const updatedVideo = await response.json();
      setVideo(updatedVideo);
      setEditedVideo(updatedVideo);
      setIsEditing(false);
      alert('Video updated successfully!');
      
      // Refresh video data to ensure all changes are reflected
      await fetchVideo();
    } catch (err) {
      console.error('Error updating video:', err);
      alert('Failed to update video');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedVideo(video);
    setIsEditing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading video...</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-4">Video not found</p>
          <button
            onClick={() => router.push('/admin/videos')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Videos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin/videos')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold">Video Details</h1>
          </div>

          <div className="flex items-center space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Edit Video</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Video Player & Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
              <div className="aspect-video w-full">
                <CustomVideoPlayer videoHash={videoId} showStatsButton={true} height="100%" />
              </div>
            </div>

            {/* Video Information */}
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Title
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedVideo.title || ''}
                      onChange={(e) => setEditedVideo({ ...editedVideo, title: e.target.value })}
                      className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                      placeholder="Video title..."
                    />
                  ) : (
                    <h2 className="text-2xl font-bold">{video.title || 'Untitled Video'}</h2>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Description
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editedVideo.description || ''}
                      onChange={(e) => setEditedVideo({ ...editedVideo, description: e.target.value })}
                      className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none min-h-[120px] resize-vertical"
                      placeholder="Video description..."
                    />
                  ) : (
                    <div>
                      <p className="text-gray-300 whitespace-pre-wrap">
                        {video.description ? (
                          isDescriptionExpanded ? video.description : video.description.length > 200 ? video.description.substring(0, 200) + '...' : video.description
                        ) : 'No description available'}
                      </p>
                      {video.description && video.description.length > 200 && (
                        <button
                          onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                          className="mt-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                        >
                          {isDescriptionExpanded ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Category & Subcategory */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Category
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedVideo.category || ''}
                        onChange={(e) => setEditedVideo({ ...editedVideo, category: e.target.value })}
                        className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                        placeholder="Category..."
                      />
                    ) : (
                      <p className="text-white">{video.category || 'Uncategorized'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Subcategory
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedVideo.subcategory || ''}
                        onChange={(e) => setEditedVideo({ ...editedVideo, subcategory: e.target.value })}
                        className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                        placeholder="Subcategory..."
                      />
                    ) : (
                      <p className="text-white">{video.subcategory || 'None'}</p>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Tags
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedVideo.tags || ''}
                      onChange={(e) => setEditedVideo({ ...editedVideo, tags: e.target.value })}
                      className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                      placeholder="Tags (comma-separated)..."
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {video.tags ? (
                        video.tags.split(',').map((tag, index) => (
                          <span
                            key={index}
                            className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm"
                          >
                            {tag.trim()}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500">No tags</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Comments</h3>
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                  {commentsCount}
                </span>
              </div>
              <CommentsSection
                contentType="video"
                contentId={videoId}
                lmsUsername={lmsUsername}
                isAdmin={true}
              />
            </div>
          </div>

          {/* Sidebar - Stats & Info */}
          <div className="space-y-6">
            {/* Engagement Stats */}
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-bold mb-4">Engagement Statistics</h3>
              {engagementStats ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span className="text-gray-400">Views</span>
                    </div>
                    <span className="text-white font-semibold">{engagementStats.views.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                      <span className="text-gray-400">Likes</span>
                    </div>
                    <span className="text-white font-semibold">{engagementStats.likes.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                      </svg>
                      <span className="text-gray-400">Dislikes</span>
                    </div>
                    <span className="text-white font-semibold">{engagementStats.dislikes.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="text-gray-400">Comments</span>
                    </div>
                    <span className="text-white font-semibold">{engagementStats.comments.toLocaleString()}</span>
                  </div>

                  {/* Engagement Rate */}
                  <div className="pt-4 border-t border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Engagement Rate</span>
                      <span className="text-white font-semibold">
                        {engagementStats.views > 0
                          ? (((engagementStats.likes + engagementStats.dislikes + engagementStats.comments) / engagementStats.views) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">Loading stats...</p>
              )}
            </div>

            {/* Video Metadata */}
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-bold mb-4">Video Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Hash</span>
                  <span className="text-white font-mono text-xs">{video.hash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Uploaded</span>
                  <span className="text-white">{formatDate(video.created_at || video.upload_date)}</span>
                </div>
                {video.duration && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Duration</span>
                    <span className="text-white">{video.duration}</span>
                  </div>
                )}
                {video.size && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">File Size</span>
                    <span className="text-white">{(video.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                )}
                {video.original_filename && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Original File</span>
                    <span className="text-white text-xs truncate max-w-[150px]" title={video.original_filename}>
                      {video.original_filename}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
