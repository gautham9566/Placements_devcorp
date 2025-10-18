"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalVideos: 0,
    publishedVideos: 0,
    draftVideos: 0,
    scheduledVideos: 0,
    totalCourses: 0,
    totalCategories: 0,
    transcodingJobs: 0,
    recentUploads: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setError(null);

      // Fetch videos
      const videosResponse = await fetch('/api/videos');
      let videos = [];
      if (videosResponse.ok) {
        const videosData = await videosResponse.json();
        videos = Array.isArray(videosData) ? videosData : videosData.videos || [];
      }

      // Fetch courses
      const coursesResponse = await fetch('/api/courses');
      let courses = [];
      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json();
        courses = coursesData.courses || [];
      }

      // Fetch categories
      const categoriesResponse = await fetch('/api/categories');
      let categories = [];
      if (categoriesResponse.ok) {
        categories = await categoriesResponse.json();
      }

      // Fetch transcoding status
      const transcodeResponse = await fetch('/api/transcode');
      let transcodingJobs = 0;
      if (transcodeResponse.ok) {
        const transcodeData = await transcodeResponse.json();
        // Assuming transcodeData has a jobs array or count
        transcodingJobs = transcodeData.jobs ? transcodeData.jobs.length : 0;
      }

      // Calculate stats
      const publishedVideos = videos.filter(v => v.status === 'Published').length;
      const draftVideos = videos.filter(v => !v.status || v.status.toLowerCase() === 'draft').length;
      const scheduledVideos = videos.filter(v => v.status === 'Scheduled').length;

      // Recent uploads (last 5)
      const recentUploads = videos
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

      setStats({
        totalVideos: videos.length,
        publishedVideos,
        draftVideos,
        scheduledVideos,
        totalCourses: courses.length,
        totalCategories: categories.length,
        transcodingJobs,
        recentUploads
      });

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setError('Failed to load dashboard data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Refresh every 30 seconds for real-time data
    const interval = setInterval(fetchStats, 30000);

    return () => clearInterval(interval);
  }, []);

  const StatCard = ({ title, value, icon, color, onClick }) => (
    <div
      className={`bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-${color}-500 transition-colors cursor-pointer`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className={`text-3xl font-bold text-${color}-400`}>{value}</p>
        </div>
        <div className={`text-${color}-400 text-2xl`}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900/30 dark:bg-gray-900/30 flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900/30 dark:bg-gray-900/30 flex items-center justify-center">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900/30 dark:bg-gray-900/30">
      <main className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white dark:text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">Real-time overview of your video platform</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Videos"
            value={stats.totalVideos}
            icon="🎥"
            color="blue"
            onClick={() => router.push('/admin/videos')}
          />
          <StatCard
            title="Published Videos"
            value={stats.publishedVideos}
            icon="📺"
            color="green"
            onClick={() => router.push('/admin/videos?filter=Published')}
          />
          <StatCard
            title="Draft Videos"
            value={stats.draftVideos}
            icon="📝"
            color="yellow"
            onClick={() => router.push('/admin/videos?filter=Drafts')}
          />
          <StatCard
            title="Scheduled Videos"
            value={stats.scheduledVideos}
            icon="⏰"
            color="purple"
            onClick={() => router.push('/admin/videos?filter=Scheduled')}
          />
          <StatCard
            title="Total Courses"
            value={stats.totalCourses}
            icon="📚"
            color="indigo"
            onClick={() => router.push('/admin/courses')}
          />
          <StatCard
            title="Categories"
            value={stats.totalCategories}
            icon="🏷️"
            color="pink"
            onClick={() => router.push('/admin/videos')} // Could link to categories management
          />
          <StatCard
            title="Transcoding Jobs"
            value={stats.transcodingJobs}
            icon="⚙️"
            color="orange"
            onClick={() => router.push('/admin/transcode')} // Assuming there's a transcode page
          />
          <StatCard
            title="Quick Actions"
            value="→"
            icon="⚡"
            color="gray"
            onClick={() => router.push('/admin/videos/upload')}
          />
        </div>
        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/admin/videos/upload')}
            className="bg-green-600 hover:bg-green-500 text-white p-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <span>📤</span>
            <span>Upload New Video</span>
          </button>
          <button
            onClick={() => router.push('/admin/courses')}
            className="bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <span>📚</span>
            <span>Manage Courses</span>
          </button>
          <button
            onClick={() => router.push('/admin/videos')}
            className="bg-purple-600 hover:bg-purple-500 text-white p-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <span>🎥</span>
            <span>View All Videos</span>
          </button>
        </div>
        <div className="mt-8"></div>
        {/* Recent Uploads */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Uploads</h2>
          {stats.recentUploads.length > 0 ? (
            <div className="space-y-3">
              {stats.recentUploads.map((video) => (
                <div key={video.hash} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {video.thumbnail_filename ? (
                      <img
                        src={`/api/thumbnail/${video.hash}`}
                        alt={video.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-600 rounded flex items-center justify-center">
                        <span className="text-gray-400 text-xs">No img</span>
                      </div>
                    )}
                    <div>
                      <p className="text-white font-medium">{video.title || 'Untitled'}</p>
                      <p className="text-gray-400 text-sm">
                        {new Date(video.created_at).toLocaleDateString()} • 
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          video.status === 'Published' ? 'bg-green-600' :
                          video.status === 'Scheduled' ? 'bg-purple-600' :
                          'bg-yellow-600'
                        }`}>
                          {video.status || 'Draft'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/admin/videos')}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    View →
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No videos uploaded yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}