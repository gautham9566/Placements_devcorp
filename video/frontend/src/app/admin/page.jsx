"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/admin/Sidebar';
import TopHeader from '../../components/admin/TopHeader';
import VideoList from '../../components/admin/VideoList';
import Pagination from '../../components/admin/Pagination';
import VideoPlayerModal from '../../components/admin/VideoPlayerModal';

export default function AdminPage() {
  const router = useRouter();
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Date');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [previewVideo, setPreviewVideo] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const itemsPerPage = 10;

  const fetchVideos = async () => {
    try {
      // Prefer direct backend URL when available (fast local dev). Fall back to the frontend proxy if not set.
      const base = process.env.NEXT_PUBLIC_API_URL || '';
      const url = base ? `${base}/videos` : '/api/videos';
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        let videosData = [];
        if (Array.isArray(data)) {
          videosData = data;
        } else if (data.videos && Array.isArray(data.videos)) {
          videosData = data.videos;
        }
        // Use real data, add thumbnail_url (via frontend proxy)
        const videos = videosData.map(d => ({
          ...d,
          thumbnail_url: d.thumbnail_filename ? `/api/thumbnail/${d.hash}` : null
        }));
        setVideos(videos);
      } else {
        setError('Failed to load videos');
      }
    } catch (error) {
      setError('Network error while loading videos');
    }
  };

  const filteredVideos = videos.filter(video => {
    if (filter === 'All') return true;
    if (filter === 'Drafts') return !video.status || video.status.toLowerCase() === 'draft';
    return video.status === filter;
  }).filter(video => {
    return video.title.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => {
    if (sortBy === 'Date') {
      return new Date(b.created_at) - new Date(a.created_at);
    }
    return 0;
  });

  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage);
  const paginatedVideos = filteredVideos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePublish = async (videoOrHash) => {
    // Accept either a hash string or the video object
    const hash = typeof videoOrHash === 'string' ? videoOrHash : (videoOrHash && videoOrHash.hash);
    if (!hash) {
      alert('Missing video hash');
      return;
    }
    try {
      const resp = await fetch(`/api/videos/${encodeURIComponent(hash)}`, { method: 'POST' });
      if (resp.ok) {
        fetchVideos(); // Refresh list
      } else {
        const data = await resp.json().catch(() => ({}));
        alert(`Failed to publish: ${data.detail || 'Unknown error'}`);
      }
    } catch (e) {
      alert('Failed to publish');
    }
  };

  const handleUnpublish = async (videoOrHash) => {
    // Accept either a hash string or the video object
    const hash = typeof videoOrHash === 'string' ? videoOrHash : (videoOrHash && videoOrHash.hash);
    if (!hash) {
      alert('Missing video hash');
      return;
    }
    try {
      const resp = await fetch(`/api/videos/${encodeURIComponent(hash)}`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Draft' })
      });
      if (resp.ok) {
        fetchVideos(); // Refresh list
      } else {
        const data = await resp.json().catch(() => ({}));
        alert(`Failed to unpublish: ${data.detail || 'Unknown error'}`);
      }
    } catch (e) {
      alert('Failed to unpublish');
    }
  };

  const handleDelete = async (hash) => {
    if (confirm('Are you sure you want to delete this video?')) {
      try {
        await fetch(`/api/videos/${hash}`, { method: 'DELETE' });
        fetchVideos(); // Refresh list
      } catch (e) {
        alert('Failed to delete');
      }
    }
  };

  const handleEdit = (video) => {
    setEditingVideo(video);
    setEditTitle(video.title || '');
    setEditDescription(video.description || '');
    setEditScheduledAt(video.scheduled_at ? video.scheduled_at.slice(0, 16) : '');
    setEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingVideo) return;
    const updates = { title: editTitle, description: editDescription };
    if (editingVideo.status?.toLowerCase() === 'scheduled') {
      updates.scheduled_at = editScheduledAt + ':00';
    }
    await updateVideo(editingVideo.hash, updates);
    setEditModal(false);
    setEditingVideo(null);
  };

  const handlePreview = (video) => {
    // Open video player modal
    setPreviewVideo(video);
  };

  const updateVideo = async (hash, updates) => {
    try {
      await fetch(`/api/videos/${hash}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      fetchVideos(); // Refresh list
    } catch (e) {
      alert('Failed to update video');
    }
  };

  // load videos on mount
  React.useEffect(() => {
    fetchVideos();
  }, []);

  // Auto-refresh videos every 30 seconds to check for scheduled video status changes
  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchVideos();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900/30">
      <TopHeader onSearchChange={setSearchTerm} searchTerm={searchTerm} />

      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-6">Uploaded Videos</h1>
            <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center space-x-4">
                {['All', 'Published', 'Drafts', 'Scheduled'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                      filter === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-900 bg-opacity-30 text-gray-200 hover:bg-gray-900/60 border border-gray-800/30'
                    }`}
                  >
                    {f}
                  </button>
                ))}
                <button
                  onClick={() => setSortBy('Date')}
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                    sortBy === 'Date'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-900 bg-opacity-30 text-gray-200 hover:bg-gray-900/60 border border-gray-800/30'
                  }`}
                >
                  Sort by Date
                </button>
              </div>

              <div className="flex items-center">
                <button
                  onClick={() => router.push('/admin/upload')}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-500 transition-colors duration-200"
                >
                  Upload
                </button>
              </div>
            </div>
          </div>

          {error && <p className="text-red-500 text-center mb-4">{error}</p>}

          <VideoList videos={paginatedVideos} onSelectVideo={(id) => console.log('selected', id)} onPublish={handlePublish} onDelete={handleDelete} onEdit={handleEdit} onPreview={handlePreview} onUnpublish={handleUnpublish} />

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </main>
      </div>

      {/* Video Player Modal */}
      {previewVideo && (
        <VideoPlayerModal
          video={previewVideo}
          onClose={() => setPreviewVideo(null)}
        />
      )}

      {/* Edit Modal */}
      {editModal && editingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Video</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600"
              />
              <textarea
                placeholder="Description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600 h-24"
              />
              {editingVideo.status?.toLowerCase() === 'scheduled' && (
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Scheduled Publish Time</label>
                  <input
                    type="datetime-local"
                    value={editScheduledAt}
                    onChange={(e) => setEditScheduledAt(e.target.value)}
                    className="w-full bg-gray-700 p-2 rounded-lg border border-gray-600"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setEditModal(false)} className="px-4 py-2 rounded bg-gray-700">Cancel</button>
              <button onClick={handleSaveEdit} className="px-4 py-2 rounded bg-blue-600 text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}