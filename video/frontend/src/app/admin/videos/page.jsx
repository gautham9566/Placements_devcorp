"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import VideoList from '../../../components/admin/VideoList';
import Pagination from '../../../components/admin/Pagination';
import VideoPlayerModal from '../../../components/admin/VideoPlayerModal';
import { getApiBaseUrl } from '../../../lib/apiConfig';
import SearchBar from '../../../components/SearchBar';
import VideoCard from '../../../components/students/VideoCard';
import CourseCard from '../../../components/students/CourseCard';

export default function AdminPage({ searchTerm = '', setSearchTerm = () => {} }) {
  const router = useRouter();
  const [videos, setVideos] = useState([]);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Date');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVideos, setTotalVideos] = useState(0);
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
  const [activeTab, setActiveTab] = useState('videos'); // 'videos', 'courses', 'all'
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const itemsPerPage = 10;

  const fetchVideos = async (page = 1) => {
    try {
      // Use getApiBaseUrl for automatic network switching
      const base = getApiBaseUrl();
      const url = `${base}/videos?page=${page}&limit=${itemsPerPage}`;
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        let videosData = [];
        
        // Handle both response formats: array (backward compatibility) and object with videos property
        if (Array.isArray(data)) {
          videosData = data;
          // For array response, we don't have pagination metadata, so set defaults
          setTotalVideos(data.length);
          setTotalPages(1);
        } else if (Array.isArray(data.videos)) {
          videosData = data.videos;
          setTotalVideos(data.total || 0);
          setTotalPages(data.total_pages || 1);
        }
        
        // Use real data, add thumbnail_url (via frontend proxy)
        const videos = videosData.map(d => ({
          ...d,
          thumbnail_url: d.thumbnail_filename && !d.thumbnail_filename.startsWith('http') ? `/api/thumbnail/${d.hash}` : d.thumbnail_filename
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
      const base = getApiBaseUrl();
      const url = `${base}/categories`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const base = getApiBaseUrl();
      const url = `${base}/courses?status=published&limit=1000`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const coursesArr = data.courses || [];
        setCourses(coursesArr);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const createCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Category name is required');
      return;
    }
    try {
      const base = getApiBaseUrl();
      const url = `${base}/categories`;
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
        const base = getApiBaseUrl();
        const url = `${base}/categories/${categoryId}`;
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
    // Safely handle missing title or undefined searchTerm
    const title = (video.title || '').toString();
    const q = (searchTerm || '').toString();
    return title.toLowerCase().includes(q.toLowerCase());
  }).filter(video => {
    // Date range filter (if any)
    if (dateFrom || dateTo) {
      const created = new Date(video.created_at || video.createdAt || 0);
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (created < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        // if time not provided, allow end of day by default - but datetime-local likely has time
        if (created > to) return false;
      }
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'Date') {
      return new Date(b.created_at) - new Date(a.created_at);
    }
    return 0;
  });

  const paginatedVideos = filteredVideos;

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

  // load videos on mount and when page changes
  React.useEffect(() => {
    fetchVideos(currentPage);
  }, [currentPage]);

  // load categories on mount
  React.useEffect(() => {
    fetchCategories();
    fetchCourses();
  }, []);

  // Auto-refresh videos every 30 seconds to check for scheduled video status changes
  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchVideos(currentPage);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [currentPage]);

  return (
    <div className="min-h-screen bg-gray-900/30 dark:bg-gray-900/30">
      <main className="p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                aria-label="Go back to admin dashboard"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-3xl font-bold text-white dark:text-white">Uploaded Videos</h1>
            </div>

            {/* Centered SearchBar */}
            <div className="flex-1 flex justify-center px-4">
              <div className="w-full max-w-md">
                <SearchBar
                  placeholder="Search videos..."
                  value={searchTerm || ''}
                  onChange={setSearchTerm}
                  variant="admin"
                />
              </div>
            </div>

            {/* Right-side placeholder to keep spacing consistent */}
            <div className="w-48" />
          </div>
        </div>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        {(searchTerm || '').trim() ? (
          // Search mode with tabs
          <>
            {/* Tabs */}
            <div className="mb-6">
              <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'all'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  All ({videos.filter(v => (v.filename || v.title || '').toLowerCase().includes((searchTerm || '').toLowerCase())).length + courses.filter(c => (c.title || c.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())).length})
                </button>
                <button
                  onClick={() => setActiveTab('videos')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'videos'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Videos ({videos.filter(v => (v.filename || v.title || '').toLowerCase().includes((searchTerm || '').toLowerCase())).length})
                </button>
                <button
                  onClick={() => setActiveTab('courses')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'courses'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Courses ({courses.filter(c => (c.title || c.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())).length})
                </button>
              </div>
            </div>

            {/* Search Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {(() => {
                const filteredVideos = videos.filter(v => (v.filename || v.title || '').toLowerCase().includes((searchTerm || '').toLowerCase()));
                const filteredCourses = courses.filter(c => (c.title || c.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()));

                let results = [];
                if (activeTab === 'all') {
                  results = [
                    ...filteredVideos.map(v => ({ ...v, type: 'video' })),
                    ...filteredCourses.map(c => ({ ...c, type: 'course' }))
                  ];
                } else if (activeTab === 'videos') {
                  results = filteredVideos.map(v => ({ ...v, type: 'video' }));
                } else if (activeTab === 'courses') {
                  results = filteredCourses.map(c => ({ ...c, type: 'course' }));
                }

                return results.map(r => (
                  <div key={`${r.type}-${r.id}`}>
                    {r.type === 'video' ? (
                      <VideoCard video={r} />
                    ) : (
                      <CourseCard course={r} />
                    )}
                  </div>
                ));
              })()}
            </div>
          </>
        ) : (
          // Admin management mode
          <>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  {['All', 'Published', 'Drafts', 'Scheduled'].map(f => (
                    <button
                      key={f}
                      onClick={() => {
                        setFilter(f);
                        setCurrentPage(1);
                      }}
                      className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                        filter === f
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {f}
                    </button>
                  ))}

                  {/* Move Sort into the left group */}
                  <div className="relative">
                    <button
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                        sortBy === 'Date'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      Sort by Date
                    </button>

                    {showDatePicker && (
                      <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded shadow-lg p-4 z-50">
                        <div className="text-sm text-gray-700 dark:text-gray-200 mb-2">Filter by created date</div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400">From</label>
                        <input
                          type="datetime-local"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="w-full mb-3 p-2 rounded bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                        />
                        <label className="block text-xs text-gray-600 dark:text-gray-400">To</label>
                        <input
                          type="datetime-local"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="w-full mb-3 p-2 rounded bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => {
                              setDateFrom('');
                              setDateTo('');
                              setShowDatePicker(false);
                              setCurrentPage(1);
                            }}
                            className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700"
                          >
                            Clear
                          </button>
                          <button
                            onClick={() => {
                              setShowDatePicker(false);
                              setCurrentPage(1);
                              setSortBy('Date');
                            }}
                            className="px-3 py-1 rounded bg-blue-600 text-white"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Move Manage Categories and Upload to the right */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors duration-200"
                >
                  Manage Categories
                </button>
                <button
                  onClick={() => router.push('/admin/videos/upload')}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-500 transition-colors duration-200"
                >
                  Upload
                </button>
              </div>
            </div>

            <VideoList videos={paginatedVideos} onSelectVideo={(id) => console.log('selected', id)} onPublish={handlePublish} onDelete={handleDelete} onEdit={handleEdit} onPreview={handlePreview} onUnpublish={handleUnpublish} />

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </main>

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