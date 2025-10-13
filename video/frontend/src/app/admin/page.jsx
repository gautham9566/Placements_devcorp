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
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
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

  const fetchCategories = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || '';
      const url = base ? `${base}/categories` : '/api/categories';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const createCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Category name is required');
      return;
    }
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || '';
      const url = base ? `${base}/categories` : '/api/categories';
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim() || null
        })
      });
      if (response.ok) {
        setNewCategoryName('');
        setNewCategoryDescription('');
        setShowCategoryModal(false);
        fetchCategories();
      } else {
        const data = await response.json();
        alert(`Failed to create category: ${data.detail || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Failed to create category');
    }
  };

  const deleteCategory = async (categoryId) => {
    if (confirm('Are you sure you want to delete this category?')) {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || '';
        const url = base ? `${base}/categories/${categoryId}` : `/api/categories/${categoryId}`;
        const response = await fetch(url, {
          method: 'DELETE'
        });
        if (response.ok) {
          fetchCategories();
        } else {
          const data = await response.json();
          alert(`Failed to delete category: ${data.detail || 'Unknown error'}`);
        }
      } catch (error) {
        alert('Failed to delete category');
      }
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

  // load videos and categories on mount
  React.useEffect(() => {
    fetchVideos();
    fetchCategories();
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

              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors duration-200"
                >
                  Manage Categories
                </button>
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

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Manage Categories</h3>
            
            {/* Create New Category */}
            <div className="mb-6 p-4 bg-gray-800 rounded-lg">
              <h4 className="text-md font-medium mb-3">Create New Category</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Category Name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600"
                />
                <textarea
                  placeholder="Description (optional)"
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600 h-20"
                />
                <button
                  onClick={createCategory}
                  className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-500"
                >
                  Create Category
                </button>
              </div>
            </div>

            {/* Existing Categories */}
            <div>
              <h4 className="text-md font-medium mb-3">Existing Categories</h4>
              <div className="max-h-60 overflow-y-auto">
                {categories.length > 0 ? (
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <div key={category.id} className="p-3 bg-gray-800 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{category.name}</div>
                            {category.description && (
                              <div className="text-sm text-gray-400 mt-1">{category.description}</div>
                            )}
                          </div>
                          <button
                            onClick={() => deleteCategory(category.id)}
                            className="text-red-500 hover:text-red-400 p-1"
                            title="Delete category"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No categories created yet.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button onClick={() => setShowCategoryModal(false)} className="px-4 py-2 rounded bg-gray-700">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}