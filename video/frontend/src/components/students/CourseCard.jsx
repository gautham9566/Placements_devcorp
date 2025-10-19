"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

/**
 * Course Card Component for Udemy-like course grid
 * Shows thumbnail, title, description, duration, lesson count
 */
const CourseCard = ({ course, viewMode = 'grid', redirectPath }) => {
  const router = useRouter();

  const handleClick = () => {
    router.push(redirectPath || `/students/courses/${course.id}`);
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getThumbnailUrl = () => {
    if (course.thumbnail_url) {
      // If backend gives a /thumbnails/... path, route it through the frontend proxy at /api/thumbnails/...
      if (course.thumbnail_url.startsWith('/thumbnails/')) {
        return `/api${course.thumbnail_url}`;
      }
      // If it's an absolute URL use it directly, otherwise also prefix with /api so Next proxies it
      return course.thumbnail_url.startsWith('http') ? course.thumbnail_url : `/api${course.thumbnail_url}`;
    }
    if (course.thumbnail_filename) return `/api/courses/${course.id}/thumbnail`;
    return null;
  };

  const thumbnailUrl = getThumbnailUrl();

  // Render horizontal/list layout when requested
  if (viewMode === 'list') {
    return (
      <div
        className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer group flex border border-gray-200 dark:border-gray-700"
        onClick={handleClick}
      >
        <div className="relative w-1/3 min-w-[220px] aspect-video bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={course.title}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-20 h-20 text-white opacity-50" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
              </svg>
            </div>
          )}
        </div>

        <div className="p-5 flex-1">
          <h3 className="font-bold text-xl text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {course.title}
          </h3>

          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
            {course.description || 'No description available.'}
          </p>

          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
            <div className="flex items-center space-x-4">
              {course.total_duration && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatDuration(course.total_duration)}
                </div>
              )}
              {course.lesson_count !== undefined && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {course.lesson_count} lessons
                </div>
              )}
            </div>

            <div className="pt-4 sm:pt-0 sm:border-t-0">
              <button
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
                onClick={(e) => { e.stopPropagation(); handleClick(); }}
              >
                View Course
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default grid layout (unchanged)
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer group border border-gray-200 dark:border-gray-700"
      onClick={handleClick}
    >
      {/* Course Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-20 h-20 text-white opacity-50" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
            </svg>
          </div>
        )}
      </div>

      {/* Course Info */}
      <div className="p-5">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {course.title}
        </h3>

        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
          {course.description || 'No description available.'}
        </p>

        {/* Course Meta */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
          <div className="flex items-center space-x-4">
            {course.total_duration && (
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatDuration(course.total_duration)}
              </div>
            )}
            {course.lesson_count !== undefined && (
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {course.lesson_count} lessons
              </div>
            )}
          </div>
        </div>

        {/* View Course Button */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            View Course
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;

