"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '../../../../../components/admin/Sidebar';
import TopHeader from '../../../../../components/admin/TopHeader';
import CustomVideoPlayer from '../../../../../components/admin/CustomVideoPlayer';

export default function PreviewCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id;

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(0);
  const [transcodeStatus, setTranscodeStatus] = useState({});
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const renderTranscodeStatus = (videoId) => {
    const status = transcodeStatus[videoId];
    if (!status) return null;

    const overall = status.overall || 'unknown';
    let statusColor = 'text-gray-400';
    let statusText = 'Unknown';

    if (overall === 'ok') {
      statusColor = 'text-green-400';
      statusText = 'Ready';
    } else if (overall === 'running') {
      statusColor = 'text-blue-400';
      statusText = 'Processing';
    } else if (overall === 'error') {
      statusColor = 'text-red-400';
      statusText = 'Failed';
    } else if (overall === 'stopped') {
      statusColor = 'text-yellow-400';
      statusText = 'Stopped';
    }

    return (
      <div className={`text-xs ${statusColor} mt-1`}>
        Transcoding: {statusText}
      </div>
    );
  };

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (response.ok) {
        const data = await response.json();
        setCourse(data);
        
        // Fetch transcoding status for all videos
        const videoIds = [];
        data.sections.forEach(section => {
          section.lessons.forEach(lesson => {
            if (lesson.video_id) {
              videoIds.push(lesson.video_id);
            }
          });
        });
        
        const statusPromises = videoIds.map(async (videoId) => {
          try {
            const statusResponse = await fetch(`/api/transcode/${videoId}/status`);
            if (statusResponse.ok) {
              const status = await statusResponse.json();
              return { videoId, status };
            }
          } catch (error) {
            console.error(`Failed to fetch transcoding status for ${videoId}:`, error);
          }
          return { videoId, status: null };
        });
        
        const statuses = await Promise.all(statusPromises);
        const statusMap = {};
        statuses.forEach(({ videoId, status }) => {
          statusMap[videoId] = status;
        });
        setTranscodeStatus(statusMap);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-900">
        <Sidebar />
        <div className="flex-1 ml-64">
          <TopHeader />
          <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-screen bg-gray-900">
        <Sidebar />
        <div className="flex-1 ml-64">
          <TopHeader />
          <div className="flex justify-center items-center h-screen">
            <p className="text-white">Course not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-900">
      <Sidebar />
      <div className="flex-1 ml-64">
        <TopHeader />
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Course Preview</h1>
              <p className="text-gray-400 mt-1">Preview how students will see this course</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => router.push(`/admin/courses/${courseId}/edit`)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Edit Course
              </button>
              <button
                onClick={() => router.push('/admin/courses')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Back to Courses
              </button>
            </div>
          </div>

          {/* Course Header */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-6">
              <div className="w-48 h-32 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url.startsWith('http') ? course.thumbnail_url : `/api${course.thumbnail_url}`}
                    alt={course.title}
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => { e.currentTarget.src = '/images/placeholder.svg'; }}
                  />
                ) : (
                  <img src="/images/placeholder.svg" alt="placeholder" className="w-full h-full object-cover rounded-lg" />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">{course.title}</h2>
                {course.subtitle && (
                  <p className="text-gray-300 mb-4">{course.subtitle}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>By Instructor</span>
                  <span>•</span>
                  <span>{course.category}</span>
                  <span>•</span>
                  <span>{course.level}</span>
                  <span>•</span>
                  <span>{course.language}</span>
                </div>
                <div className="mt-4">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    course.status === 'published' ? 'bg-green-600 text-white' :
                    course.status === 'draft' ? 'bg-yellow-600 text-white' :
                    'bg-gray-600 text-white'
                  }`}>
                    {course.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Course Content */}
          {/* Main grid now: left curriculum + right preview */}
          {/* Adjusted grid to include preview card on the right */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Left: Curriculum (span 2) */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Course Content</h3>

                {course.sections.length === 0 ? (
                  <p className="text-gray-400">No course content available yet.</p>
                ) : (
                  <div className="space-y-4">
                    {course.sections.map((section, sectionIndex) => (
                      <div key={section.id} className="border border-gray-700 rounded-lg">
                        <button
                          onClick={() => setActiveSection(activeSection === sectionIndex ? -1 : sectionIndex)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-700 transition-colors"
                        >
                          <div>
                            <h4 className="text-white font-medium">{section.title}</h4>
                            <p className="text-gray-400 text-sm">{section.lessons.length} lessons</p>
                          </div>
                          <svg
                            className={`w-5 h-5 text-gray-400 transform transition-transform ${
                              activeSection === sectionIndex ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {activeSection === sectionIndex && (
                          <div className="px-4 pb-4 space-y-2">
                            {section.lessons.map((lesson, lessonIndex) => (
                              <div 
                                key={lesson.id} 
                                className={`flex items-center gap-3 p-3 bg-gray-700 rounded-lg ${lesson.type === 'video' ? 'cursor-pointer hover:bg-gray-600' : ''}`}
                                onClick={() => lesson.type === 'video' && lesson.video_id && setSelectedVideo(lesson.video_id)}
                              >
                                <div className="flex-shrink-0">
                                  {lesson.type === 'video' && (
                                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  )}
                                  {lesson.type === 'article' && (
                                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  )}
                                  {lesson.type === 'quiz' && (
                                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="text-white font-medium">{lesson.title}</p>
                                  {lesson.description && (
                                    <p className="text-gray-400 text-sm">{lesson.description}</p>
                                  )}
                                  {lesson.type === 'video' && lesson.video_id && renderTranscodeStatus(lesson.video_id)}
                                </div>
                                {lesson.duration && (
                                  <span className="text-gray-400 text-sm">
                                    {Math.floor(lesson.duration / 60)}:{(lesson.duration % 60).toString().padStart(2, '0')}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Video Preview Card */}
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-4">
                {/* <div className="p-3 bg-gray-900 rounded-md border border-gray-700">
                  <h3 className="text-sm font-semibold text-white">Video Preview</h3>
                  {!selectedVideo && (
                    <p className="text-xs text-gray-400 mt-1">Select a video from the curriculum</p>
                  )}
                </div> */}
                <div className="mt-4 bg-black rounded-md overflow-hidden w-full h-48 flex items-center justify-center">
                  {selectedVideo ? (
                    <div className="w-full h-full">
                      <CustomVideoPlayer
                        videoHash={selectedVideo}
                        poster="/images/placeholder.svg"
                        className="w-full h-full"
                        height="100%"
                        autoplay={true}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-12 h-12 text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <p className="text-gray-400 text-sm">No video selected</p>
                        <p className="text-xs text-gray-400 mt-1">Select a video from the curriculum</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Course Stats */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Course Details</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sections</span>
                    <span className="text-white">{course.sections.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Lessons</span>
                    <span className="text-white">
                      {course.sections.reduce((total, section) => total + section.lessons.length, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Videos</span>
                    <span className="text-white">
                      {course.sections.reduce((total, section) =>
                        total + section.lessons.filter(lesson => lesson.type === 'video').length, 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Level</span>
                    <span className="text-white">{course.level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Language</span>
                    <span className="text-white">{course.language}</span>
                  </div>
                </div>
              </div>

              {/* Course Description */}
              {course.description && (
                <div className="bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-white mb-4">About This Course</h4>
                  <p className="text-gray-300 leading-relaxed">{course.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}