"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';

export default function AdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { changeTheme, isDark, resolvedTheme, isInitialized } = useTheme();
  const [username, setUsername] = useState('Admin');
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
  const [themeInitialized, setThemeInitialized] = useState(false);

  // Extract username and theme from URL parameters - run once on mount
  useEffect(() => {
    if (themeInitialized) return; // Prevent re-running

    const usernameParam = searchParams.get('username');
    const storedUsername = sessionStorage.getItem('lms_username');
    
    // Priority: URL param > sessionStorage > default
    if (usernameParam) {
      setUsername(usernameParam);
      sessionStorage.setItem('lms_username', usernameParam);
    } else if (storedUsername) {
      setUsername(storedUsername);
    }

    // Handle theme parameter with priority
    const themeParam = searchParams.get('theme');
    if (themeParam) {
      console.log('Setting theme from URL parameter:', themeParam);
      sessionStorage.setItem('lms_theme', themeParam);
      changeTheme(themeParam);
    } else {
      const storedTheme = sessionStorage.getItem('lms_theme');
      if (storedTheme) {
        console.log('Setting theme from sessionStorage:', storedTheme);
        changeTheme(storedTheme);
      }
    }
    
    setThemeInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Only re-run when URL changes

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

  const StatCard = ({ title, value, icon, color, onClick }) => {
    // Color mappings for light and dark mode
    const colorMap = {
      blue: { text: isDark ? '#60a5fa' : '#3b82f6', border: isDark ? '#3b82f6' : '#60a5fa' },
      green: { text: isDark ? '#4ade80' : '#10b981', border: isDark ? '#22c55e' : '#34d399' },
      yellow: { text: isDark ? '#fbbf24' : '#d97706', border: isDark ? '#f59e0b' : '#fbbf24' },
      purple: { text: isDark ? '#c084fc' : '#a855f7', border: isDark ? '#a855f7' : '#c084fc' },
      indigo: { text: isDark ? '#818cf8' : '#6366f1', border: isDark ? '#6366f1' : '#818cf8' },
      pink: { text: isDark ? '#f472b6' : '#ec4899', border: isDark ? '#ec4899' : '#f472b6' },
      orange: { text: isDark ? '#fb923c' : '#f59e0b', border: isDark ? '#f59e0b' : '#fb923c' },
      gray: { text: isDark ? '#9ca3af' : '#6b7280', border: isDark ? '#6b7280' : '#9ca3af' },
    };

    const colors = colorMap[color] || colorMap.blue;
    const bgColor = isDark ? '#1f2937' : '#ffffff';
    const borderColor = isDark ? '#374151' : '#e5e7eb';
    const textSecondary = isDark ? '#9ca3af' : '#6b7280';

    return (
      <div
        className="rounded-lg p-6 border transition-all duration-300 cursor-pointer hover:shadow-lg"
        style={{
          backgroundColor: bgColor,
          borderColor: borderColor,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = colors.border;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = borderColor;
        }}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: textSecondary }}>{title}</p>
            <p className="text-3xl font-bold" style={{ color: colors.text }}>{value}</p>
          </div>
          <div className="text-2xl" style={{ color: colors.text }}>
            {icon}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900/30' : 'bg-white'}`}>
        <div className={`text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900/30' : 'bg-white'}`}>
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900/30' : 'bg-white'}`}>
      <main className="p-8">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Welcome, {username}!
          </h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Real-time overview of your video platform</p>
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
        <div className={`rounded-lg p-6 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Recent Uploads</h2>
          {stats.recentUploads.length > 0 ? (
            <div className="space-y-3">
              {stats.recentUploads.map((video) => (
                <div key={video.hash} className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center space-x-3">
                    {video.thumbnail_filename ? (
                      <img
                        src={`/api/thumbnail/${video.hash}`}
                        alt={video.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded flex items-center justify-center ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}>
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No img</span>
                      </div>
                    )}
                    <div>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{video.title || 'Untitled'}</p>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {new Date(video.created_at).toLocaleDateString()} • 
                        <span className={`ml-2 px-2 py-1 rounded text-xs text-white ${
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
                    className={`text-sm ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                  >
                    View →
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>No videos uploaded yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}