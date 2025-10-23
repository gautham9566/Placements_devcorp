"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import VideoPlayer from '@/components/video/VideoPlayer';
import SearchBar from '@/components/SearchBar';
import CommentsSection from '@/components/students/CommentsSection';

/**
 * Individual Course View Page (Udemy-like)
 * Features: Split-screen layout with video player and course curriculum
 * Left: Video player (60-70%)
 * Right: Course content panel with curriculum tree (30-40%)
 */
export default function CourseViewPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id;

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [showResources, setShowResources] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [showTab, setShowTab] = useState('curriculum'); // curriculum, resources, comments
  const [lmsUsername, setLmsUsername] = useState('');
  const [engagementStats, setEngagementStats] = useState(null);

  useEffect(() => {
    // Get username from sessionStorage
    const username = sessionStorage.getItem('lms_username') || 'Guest';
    setLmsUsername(username);
    
    if (courseId) {
      fetchCourse();
      loadProgress();
      recordView(username);
    }
  }, [courseId]);

  useEffect(() => {
    if (currentLesson?.video_id) {
      fetchEngagementStats();
    }
  }, [currentLesson?.video_id]);

  const fetchCourse = async () => {
    try {
      // Fetch course from API
      const response = await fetch(`/api/courses/${courseId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch course');
      }
      const foundCourse = await response.json();

      if (foundCourse) {
        setCourse(foundCourse);

        // Set first lesson as current if available
        if (foundCourse.sections && foundCourse.sections.length > 0) {
          const firstSection = foundCourse.sections[0];
          if (firstSection.lessons && firstSection.lessons.length > 0) {
            setCurrentLesson(firstSection.lessons[0]);
            setExpandedSections(new Set([0]));
          }
        }
      } else {
        router.push('/students');
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      router.push('/students');
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = () => {
    const stored = localStorage.getItem(`course_progress_${courseId}`);
    if (stored) {
      setCompletedLessons(new Set(JSON.parse(stored)));
    }
  };

  const saveProgress = (updatedCompleted) => {
    localStorage.setItem(`course_progress_${courseId}`, JSON.stringify([...updatedCompleted]));
    setCompletedLessons(updatedCompleted);
  };

  const toggleSection = (sectionIndex) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionIndex)) {
      newExpanded.delete(sectionIndex);
    } else {
      newExpanded.add(sectionIndex);
    }
    setExpandedSections(newExpanded);
  };

  const toggleLessonComplete = (lessonId) => {
    const newCompleted = new Set(completedLessons);
    if (newCompleted.has(lessonId)) {
      newCompleted.delete(lessonId);
    } else {
      newCompleted.add(lessonId);
    }
    saveProgress(newCompleted);
  };

  const selectLesson = (lesson) => {
    setCurrentLesson(lesson);
  };

  const goToNextLesson = () => {
    if (!course || !currentLesson) return;

    let found = false;
    for (const section of course.sections) {
      for (const lesson of section.lessons) {
        if (found) {
          setCurrentLesson(lesson);
          return;
        }
        if (lesson.id === currentLesson.id) {
          found = true;
        }
      }
    }
  };

  const goToPreviousLesson = () => {
    if (!course || !currentLesson) return;

    let previousLesson = null;
    for (const section of course.sections) {
      for (const lesson of section.lessons) {
        if (lesson.id === currentLesson.id) {
          if (previousLesson) {
            setCurrentLesson(previousLesson);
          }
          return;
        }
        previousLesson = lesson;
      }
    }
  };

  const calculateProgress = () => {
    if (!course) return 0;
    let totalLessons = 0;
    course.sections?.forEach(section => {
      totalLessons += section.lessons?.length || 0;
    });
    if (totalLessons === 0) return 0;
    return Math.round((completedLessons.size / totalLessons) * 100);
  };

  const handleSearchSubmit = (term) => {
    const q = (term || searchInput || '').trim();
    if (!q) return;
    router.push(`/students/search?q=${encodeURIComponent(q)}`);
  };

  const fetchEngagementStats = async () => {
    if (!currentLesson?.video_id) return;
    
    try {
      const username = sessionStorage.getItem('lms_username') || 'Guest';
      const response = await fetch(`/api/engagement/stats/video/${currentLesson.video_id}?lms_username=${username}`);
      if (response.ok) {
        const stats = await response.json();
        setEngagementStats(stats);
      }
    } catch (err) {
      console.error('Error fetching engagement stats:', err);
    }
  };

  const recordView = async (username) => {
    try {
      await fetch('/api/engagement/views', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lms_username: username,
          content_type: 'course',
          content_id: courseId,
        }),
      });
    } catch (err) {
      console.error('Error recording view:', err);
    }
  };

  const handleLike = async () => {
    if (!lmsUsername || lmsUsername === 'Guest' || !currentLesson?.video_id) return;
    
    try {
      if (engagementStats?.user_liked) {
        await fetch(`/api/engagement/likes?lms_username=${lmsUsername}&content_type=video&content_id=${currentLesson.video_id}`, {
          method: 'DELETE',
        });
      } else {
        await fetch('/api/engagement/likes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lms_username: lmsUsername,
            content_type: 'video',
            content_id: currentLesson.video_id,
          }),
        });
      }
      fetchEngagementStats();
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleDislike = async () => {
    if (!lmsUsername || lmsUsername === 'Guest' || !currentLesson?.video_id) return;
    
    try {
      if (engagementStats?.user_disliked) {
        await fetch(`/api/engagement/dislikes?lms_username=${lmsUsername}&content_type=video&content_id=${currentLesson.video_id}`, {
          method: 'DELETE',
        });
      } else {
        await fetch('/api/engagement/dislikes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lms_username: lmsUsername,
            content_type: 'video',
            content_id: currentLesson.video_id,
          }),
        });
      }
      fetchEngagementStats();
    } catch (err) {
      console.error('Error toggling dislike:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 text-lg">Course not found</p>
          <button
            onClick={() => router.push('/students')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header controls (wrapper removed) */}
      <div className="px-6 py-2">
        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/students')}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {course.title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currentLesson ? currentLesson.title : 'Select a lesson to begin'}
              </p>
            </div>
          </div>

          {/* Centered Search Bar */}
          <div className="flex justify-center w-full">
            <div className="w-full max-w-md">
              <SearchBar
                placeholder="Search courses and videos..."
                value={searchInput}
                onChange={setSearchInput}
                onSubmit={handleSearchSubmit}
                showSubmitButton={true}
              />
            </div>
          </div>

          {/* Progress & Engagement */}
          <div className="flex items-center justify-end space-x-4"> 
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Your Progress</p>
              <p className="text-lg font-bold text-blue-600">{calculateProgress()}%</p>
            </div>
            <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${calculateProgress()}%` }}
              />
            </div>
          </div>
        </div>
      </div>

  {/* Split Screen Layout */}
  <div className="flex h-[calc(100vh-140px)]">
        {/* Left Side - Video Player (60-70%) */}
        <div className="flex-[0_0_65%] flex flex-col overflow-y-auto px-6">
          {currentLesson && currentLesson.video_id ? (
            <>
              {/* Sticky Video Player (Udemy-like) */}
              <div className="w-full flex-shrink-0 mb-4">
                <div className="w-full aspect-video rounded-xl overflow-hidden shadow-lg bg-black">
                  <VideoPlayer
                    videoHash={currentLesson.video_id}
                    youtubeUrl={currentLesson.youtube_url}
                    poster={currentLesson.thumbnail ? `/api/thumbnail/${currentLesson.video_id}` : undefined}
                    videoTitle={currentLesson.title}
                    showStatsButton={true}
                    autoplay={true}
                  />
                </div>
              </div>

              {/* Lesson Details Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {currentLesson.title}
                </h3>

                {/* Engagement Stats Row - Views/Date on left, Like/Dislike on right */}
                <div className="flex items-center justify-between mb-4">
                  {/* Left: Views and Date */}
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    {engagementStats && (
                      <>
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>{engagementStats.views.toLocaleString()} views</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{new Date().toLocaleDateString()}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right: Like/Dislike Buttons */}
                  <div className="flex items-center space-x-2">
                    {/* Like Button */}
                    <button
                      onClick={handleLike}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        engagementStats?.user_liked
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                      disabled={!lmsUsername || lmsUsername === 'Guest'}
                    >
                      <svg className="w-5 h-5" fill={engagementStats?.user_liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                      <span>{engagementStats?.likes || 0}</span>
                    </button>

                    {/* Dislike Button */}
                    <button
                      onClick={handleDislike}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        engagementStats?.user_disliked
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                      disabled={!lmsUsername || lmsUsername === 'Guest'}
                    >
                      <svg className="w-5 h-5" fill={engagementStats?.user_disliked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                      </svg>
                      <span>{engagementStats?.dislikes || 0}</span>
                    </button>
                  </div>
                </div>

                {currentLesson.description && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      {currentLesson.description}
                    </p>
                  </div>
                )}

                {/* Comments Section */}
                <div className="mt-6">
                  <CommentsSection
                    contentType="course"
                    contentId={courseId}
                    lmsUsername={lmsUsername}
                    isAdmin={false}
                    currentVideoId={currentLesson.video_id}
                  />
                </div>

                {currentLesson.resources && currentLesson.resources.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Resources</h4>
                    <div className="space-y-2">
                      {currentLesson.resources.map((resource, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                          <div className="flex items-center space-x-3">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div>
                              <p className="font-medium text-sm">{resource.title || resource.name || `Resource ${index + 1}`}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{resource.type || 'file'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <svg className="w-24 h-24 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-lg">Select a lesson from the curriculum to start learning</p>
              </div>
            </div>
          )}
  </div>

        {/* Right Side - Course Content Panel (30-40%) */}
  <div className="flex-[0_0_35%] bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              <button
                onClick={() => setShowTab('curriculum')}
                className={`flex-1 px-4 py-3 font-semibold text-sm transition-colors ${
                  showTab === 'curriculum'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Curriculum
              </button>
              <button
                onClick={() => setShowTab('resources')}
                className={`flex-1 px-4 py-3 font-semibold text-sm transition-colors ${
                  showTab === 'resources'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Resources
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {showTab === 'curriculum' ? (
              // Curriculum Tree
              <div className="space-y-2">
                {course.sections && course.sections.length > 0 ? (
                  course.sections.map((section, sectionIndex) => {
                    const totalLessons = section.lessons?.length || 0;
                    const completedCount = section.lessons?.filter(l => completedLessons.has(l.id)).length || 0;
                    const sectionDuration = section.lessons?.reduce((acc, l) => acc + (Number(l.duration) || 0), 0) || 0;
                    return (
                      <div key={section.id || sectionIndex} className="mb-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        {/* Section Header (Udemy-like) */}
                        <button
                          onClick={() => toggleSection(sectionIndex)}
                          className="w-full text-left px-6 py-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 flex flex-col sm:flex-row sm:items-center justify-between transition-colors rounded-t-lg"
                        >
                          <div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">Section {sectionIndex + 1}: {section.title}</div>
                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">{completedCount} / {totalLessons} • {sectionDuration}min</div>
                          </div>
                          <div className="mt-2 sm:mt-0">
                            <svg
                              className={`w-6 h-6 text-gray-600 dark:text-gray-300 transition-transform ${expandedSections.has(sectionIndex) ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        {/* Lessons List (card body) */}
                        {expandedSections.has(sectionIndex) && section.lessons && (
                          <div className="bg-white dark:bg-gray-800 rounded-b-lg border-t border-gray-200 dark:border-gray-600">
                            {section.lessons.map((lesson, lessonIndex) => (
                              <div
                                key={lesson.id || lessonIndex}
                                className={`w-full px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${currentLesson?.id === lesson.id ? 'border-l-4 border-blue-600 bg-transparent' : ''}`}
                                onClick={() => selectLesson(lesson)}
                              >
                                <div className="flex items-start space-x-4">
                                  <div
                                    onClick={(e) => { e.stopPropagation(); toggleLessonComplete(lesson.id); }}
                                    className={`w-6 h-6 mt-1 rounded-sm flex items-center justify-center flex-shrink-0 cursor-pointer ${completedLessons.has(lesson.id) ? 'bg-purple-600 border-purple-600' : 'border-2 border-gray-300 dark:border-gray-600'}`}
                                  >
                                    {completedLessons.has(lesson.id) && (
                                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>

                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <div className={`text-sm ${currentLesson?.id === lesson.id ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-900 dark:text-white'}`}>{lesson.title}</div>
                                      {currentLesson?.id === lesson.id && (
                                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                        </svg>
                                      )}
                                    </div>
                                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-3">
                                      <span className="flex items-center space-x-1">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        <span>{lesson.duration ? `${lesson.duration} min` : ''}</span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No curriculum available
                  </p>
                )}
              </div>
            ) : showTab === 'resources' ? (
              // Resources
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Course Resources
                </h3>
                {course.resources && course.resources.length > 0 ? (
                  course.resources.map((resource, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {resource.title}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {resource.type}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No resources available for this course
                  </p>
                )}
              </div>
            ) : (
              // Comments
              <div>
                <CommentsSection
                  contentType="course"
                  contentId={courseId}
                  lmsUsername={lmsUsername}
                  isAdmin={false}
                  currentVideoId={currentLesson?.video_id || null}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

