"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import VideoPlayer from '@/components/video/VideoPlayer';
import SearchBar from '@/components/SearchBar';

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

  useEffect(() => {
    if (courseId) {
      fetchCourse();
      loadProgress();
    }
  }, [courseId]);

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

          {/* Progress */}
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
  <div className="flex h-[calc(100vh-80px)] min-h-0 mt-6">
        {/* Left Side - Video Player (60-70%) */}
        <div className="flex-[0_0_65%] flex flex-col min-h-0 pr-6">
          {currentLesson && currentLesson.video_id ? (
            <>
              {/* Sticky Video Player (Udemy-like) */}
              <div className="w-full flex-shrink-0 sticky top-20 z-10 flex items-center justify-center" style={{ height: '72.5%' }}>
                <div className="w-full h-full max-w-6xl aspect-video rounded-xl overflow-hidden shadow-lg" style={{ marginTop: '0' }}>
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
              
              {/* Video Controls */}
              {/* <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
                <button
                  onClick={goToPreviousLesson}
                  className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                
                <button
                  onClick={() => toggleLessonComplete(currentLesson.id)}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    completedLessons.has(currentLesson.id)
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {completedLessons.has(currentLesson.id) ? 'Completed ✓' : 'Mark as Complete'}
                </button>
                
                <button
                  onClick={goToNextLesson}
                  className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Next
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div> */}

              {/* Lesson Details Section - YouTube-like description panel */}
              <div className="px-6 py-6 overflow-auto" style={{ height: '30%' }}>
                <div className="max-w-6xl mx-auto">
                  <div
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-expanded={descExpanded}
                    onClick={() => setDescExpanded(!descExpanded)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setDescExpanded(!descExpanded);
                      }
                    }}
                  >
                    <div className="space-y-3">
                      {/* Title + meta */}
                      <div>
                        <div className="flex items-start">
                          <h3 className="text-xl font-semibold leading-tight flex-1">
                            {currentLesson.title}
                          </h3>
                          <svg
                            className={`w-5 h-5 ml-3 transform transition-transform ${descExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 flex items-center space-x-3">
                          <span>{currentLesson.views ? `${currentLesson.views} views` : ''}</span>
                          {currentLesson.uploaded_at && (
                            <span className="truncate">• {currentLesson.uploaded_at}</span>
                          )}
                          {currentLesson.duration && (
                            <span className="ml-auto">{currentLesson.duration} min</span>
                          )}
                        </div>
                      </div>

                  {/* Collapsible Description */}
                  {currentLesson.description && (
                    <div>
                      <div className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap" style={{ maxHeight: descExpanded ? 'none' : 96, overflow: 'hidden' }}>
                        {currentLesson.description}
                      </div>
                      {currentLesson.description.length > 300 && (
                        <button
                          onClick={() => setDescExpanded(!descExpanded)}
                          className="mt-2 text-sm text-blue-600 hover:underline"
                        >
                          {descExpanded ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Resources (kept below description) */}
                  {currentLesson.resources && currentLesson.resources.length > 0 && (
                    <div>
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
                            <button
                              onClick={(e) => { e.stopPropagation(); /* implement download action */ }}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                            >
                              Download
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
                </div>
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
  <div className="flex-[0_0_35%] bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto min-h-0">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              <button
                onClick={() => setShowResources(false)}
                className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                  !showResources
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Curriculum
              </button>
              <button
                onClick={() => setShowResources(true)}
                className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                  showResources
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
            {!showResources ? (
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
            ) : (
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
                        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
                          Download
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No resources available for this course
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

