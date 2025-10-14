"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '../../../../../components/admin/Sidebar';
import TopHeader from '../../../../../components/admin/TopHeader';
import CustomVideoPlayer from '../../../../../components/admin/CustomVideoPlayer';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableSection({ section, sectionIndex, children, activeSection, setActiveSection, setAddingLesson, isReordering }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `section-${sectionIndex}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="border border-gray-700 rounded-lg">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 flex-1">
            {isReordering && (
              <button
                {...listeners}
                className="text-gray-400 hover:text-white p-1"
                title="Drag to reorder"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setActiveSection(activeSection === sectionIndex ? -1 : sectionIndex)}
              className="flex items-center gap-3 flex-1 text-left hover:bg-gray-700 transition-colors rounded px-2 py-1"
            >
              <div>
                <h4 className="text-white font-medium">{section.title}</h4>
                <p className="text-gray-400 text-sm">{section.lessons ? section.lessons.length : 0} lessons</p>
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
          </div>
          <button
            onClick={() => setAddingLesson(sectionIndex)}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors ml-2"
          >
            Add Lesson
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SortableLesson({ lesson, lessonIndex, sectionIndex, children, setSelectedVideo, isReordering }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `lesson-${sectionIndex}-${lessonIndex}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...(isReordering ? listeners : {})}>
      <div
        className={`flex items-center gap-3 p-3 bg-gray-700 rounded-lg ${isReordering ? 'cursor-move' : ''} ${lesson.type === 'video' ? 'hover:bg-gray-600' : ''}`}
        onClick={() => lesson.type === 'video' && lesson.video_id && setSelectedVideo(lesson.video_id)}
      >
        {isReordering && (
          <div className="text-gray-400 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export default function PreviewCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id;

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(0);
  const [transcodeStatus, setTranscodeStatus] = useState({});
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCourse, setEditedCourse] = useState(null);
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [addingLesson, setAddingLesson] = useState(null); // section index
  const [newLesson, setNewLesson] = useState({
    title: '',
    description: '',
    type: 'video',
    video_id: '',
    duration: 0
  });
  const [availableVideos, setAvailableVideos] = useState([]);
  const [showVideoSelector, setShowVideoSelector] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedSections = useMemo(() => {
    if (!course?.sections) return [];
    return [...course.sections].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [course?.sections]);

  useEffect(() => {
    fetchCourse();
    fetchAvailableVideos();
  }, [courseId]);

  const fetchAvailableVideos = async () => {
    try {
      const response = await fetch('/api/videos');
      if (response.ok) {
        const videos = await response.json();
        // Filter out videos without hashes and ensure uniqueness
        const validVideos = videos.filter(video => video && video.hash).filter((video, index, self) => 
          self.findIndex(v => v.hash === video.hash) === index
        );
        setAvailableVideos(validVideos);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      setAvailableVideos([]);
    }
  };

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
        setEditedCourse({ 
          ...data, 
          sections: data.sections || [] // Ensure sections exists
        });
        
        // Fetch transcoding status for all videos
        const videoIds = [];
        if (data.sections) {
          data.sections.forEach(section => {
            section.lessons.forEach(lesson => {
              if (lesson.video_id) {
                videoIds.push(lesson.video_id);
              }
            });
          });
        }
        
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

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedCourse),
      });
      if (response.ok) {
        const updatedCourse = await response.json();
        // Ensure sections property exists
        if (!updatedCourse.sections) {
          updatedCourse.sections = course.sections || [];
        }
        setCourse(updatedCourse);
        setIsEditing(false);
      } else {
        console.error('Failed to update course');
      }
    } catch (error) {
      console.error('Error updating course:', error);
    }
  };

  const handleCancel = () => {
    setEditedCourse({ ...course });
    setIsEditing(false);
  };

  const handlePublish = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...course, status: 'published' }),
      });
      if (response.ok) {
        const updatedCourse = await response.json();
        if (!updatedCourse.sections) {
          updatedCourse.sections = course.sections || [];
        }
        setCourse(updatedCourse);
        setEditedCourse({ ...updatedCourse, sections: updatedCourse.sections || [] });
      } else {
        console.error('Failed to publish course');
      }
    } catch (error) {
      console.error('Error publishing course:', error);
    }
  };

  const handleUnpublish = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...course, status: 'draft' }),
      });
      if (response.ok) {
        const updatedCourse = await response.json();
        if (!updatedCourse.sections) {
          updatedCourse.sections = course.sections || [];
        }
        setCourse(updatedCourse);
        setEditedCourse({ ...updatedCourse, sections: updatedCourse.sections || [] });
      } else {
        console.error('Failed to unpublish course');
      }
    } catch (error) {
      console.error('Error unpublishing course:', error);
    }
  };

  const handleDelete = async () => {
    // Prevent deleting a published course from the UI
    if (course?.status === 'published') {
      alert('Cannot delete a published course. Please unpublish it before deleting.');
      return;
    }

    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        router.push('/admin/courses');
      } else {
        console.error('Failed to delete course');
      }
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  };

  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;

    try {
      const response = await fetch(`/api/courses/${courseId}/sections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newSectionTitle,
          order: (course.sections || []).length
        }),
      });

      if (response.ok) {
        const newSection = await response.json();
        const updatedCourse = {
          ...course,
          sections: [...(course.sections || []), newSection]
        };
        setCourse(updatedCourse);
        setEditedCourse({ ...updatedCourse, sections: updatedCourse.sections });
        setNewSectionTitle('');
        setAddingSection(false);
      } else {
        console.error('Failed to add section');
      }
    } catch (error) {
      console.error('Error adding section:', error);
    }
  };

  const handleAddLesson = async (sectionIndex) => {
    if (!newLesson.title.trim()) return;

    const section = course.sections[sectionIndex];
    try {
      const response = await fetch(`/api/courses/${courseId}/lessons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newLesson,
          section_id: section.id,
          order: section.lessons ? section.lessons.length : 0
        }),
      });

      if (response.ok) {
        const newLessonData = await response.json();
        const updatedSections = [...course.sections];
        if (!updatedSections[sectionIndex].lessons) {
          updatedSections[sectionIndex].lessons = [];
        }
        updatedSections[sectionIndex].lessons = [...updatedSections[sectionIndex].lessons, newLessonData];

        const updatedCourse = {
          ...course,
          sections: updatedSections
        };
        setCourse(updatedCourse);
        setEditedCourse({ ...updatedCourse, sections: updatedCourse.sections });
        setNewLesson({
          title: '',
          description: '',
          type: 'video',
          video_id: '',
          duration: 0
        });
        setAddingLesson(null);
      } else {
        console.error('Failed to add lesson');
      }
    } catch (error) {
      console.error('Error adding lesson:', error);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    // Check if we're reordering sections
    if (activeId.startsWith('section-') && overId.startsWith('section-')) {
      const activeIndex = parseInt(activeId.replace('section-', ''));
      const overIndex = parseInt(overId.replace('section-', ''));

      // Sort sections by order for drag operations
      const sortedSections = [...course.sections].sort((a, b) => (a.order || 0) - (b.order || 0));
      const updatedSections = arrayMove(sortedSections, activeIndex, overIndex);

      // Update order in the backend
      try {
        await Promise.all(
          updatedSections.map((section, index) =>
            fetch(`/api/courses/${courseId}/sections/${section.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ ...section, order: index }),
            })
          )
        );
      } catch (error) {
        console.error('Error updating section order:', error);
        return;
      }

      const updatedCourse = {
        ...course,
        sections: updatedSections
      };
      setCourse(updatedCourse);
      setEditedCourse({ ...updatedCourse, sections: updatedCourse.sections });
    }
    // Check if we're reordering lessons within a section
    else if (activeId.startsWith('lesson-') && overId.startsWith('lesson-')) {
      const activeSectionIndex = parseInt(activeId.split('-')[1]);
      const activeLessonIndex = parseInt(activeId.split('-')[2]);
      const overSectionIndex = parseInt(overId.split('-')[1]);
      const overLessonIndex = parseInt(overId.split('-')[2]);

      if (activeSectionIndex === overSectionIndex) {
        // Sort sections by order to get the correct section
        const sortedSections = [...course.sections].sort((a, b) => (a.order || 0) - (b.order || 0));
        const section = sortedSections[activeSectionIndex];
        const updatedLessons = arrayMove(section.lessons, activeLessonIndex, overLessonIndex);

        // Update order in the backend
        try {
          await Promise.all(
            updatedLessons.map((lesson, index) =>
              fetch(`/api/courses/${courseId}/lessons/${lesson.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...lesson, order: index }),
              })
            )
          );
        } catch (error) {
          console.error('Error updating lesson order:', error);
          return;
        }

        // Update the section in the original course.sections array
        const originalSectionIndex = course.sections.findIndex(s => s.id === section.id);
        const updatedSections = [...course.sections];
        updatedSections[originalSectionIndex].lessons = updatedLessons;

        const updatedCourse = {
          ...course,
          sections: updatedSections
        };
        setCourse(updatedCourse);
        setEditedCourse({ ...updatedCourse, sections: updatedCourse.sections });
      }
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
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/courses')}
                className="text-gray-400 hover:text-white transition-colors"
                title="Back to Courses"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-3xl font-bold text-white">Course Preview</h1>
            </div>
            <div className="flex gap-4">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Edit Course
                  </button>
                  {course.status === 'published' ? (
                    <button
                      onClick={handleUnpublish}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Unpublish
                    </button>
                  ) : (
                    <button
                      onClick={handlePublish}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Publish
                    </button>
                  )}
                  <button
                    onClick={handleDelete}
                    disabled={course?.status === 'published'}
                    className={`px-4 py-2 rounded-lg transition-colors text-white ${course?.status === 'published' ? 'bg-red-600 opacity-50 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                  >
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Save Changes
                  </button>
                </>
              )}
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
                {isEditing && editedCourse ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editedCourse.title || ''}
                      onChange={(e) => setEditedCourse({ ...editedCourse, title: e.target.value })}
                      className="w-full bg-gray-700 text-white text-2xl font-bold px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                      placeholder="Course Title"
                    />
                    <input
                      type="text"
                      value={editedCourse.subtitle || ''}
                      onChange={(e) => setEditedCourse({ ...editedCourse, subtitle: e.target.value })}
                      className="w-full bg-gray-700 text-gray-300 px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                      placeholder="Course Subtitle"
                    />
                    <div className="flex gap-4">
                      <select
                        value={editedCourse.category || ''}
                        onChange={(e) => setEditedCourse({ ...editedCourse, category: e.target.value })}
                        className="bg-gray-700 text-gray-300 px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Select Category</option>
                        <option value="Programming">Programming</option>
                        <option value="Design">Design</option>
                        <option value="Business">Business</option>
                        <option value="Marketing">Marketing</option>
                      </select>
                      <select
                        value={editedCourse.level || ''}
                        onChange={(e) => setEditedCourse({ ...editedCourse, level: e.target.value })}
                        className="bg-gray-700 text-gray-300 px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Select Level</option>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                      <select
                        value={editedCourse.language || ''}
                        onChange={(e) => setEditedCourse({ ...editedCourse, language: e.target.value })}
                        className="bg-gray-700 text-gray-300 px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Select Language</option>
                        <option value="English">English</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                        <option value="German">German</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
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
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-white">Course Content</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsReordering(!isReordering)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        isReordering
                          ? 'bg-orange-600 hover:bg-orange-700 text-white'
                          : 'bg-gray-600 hover:bg-gray-700 text-white'
                      }`}
                    >
                      {isReordering ? 'Stop Reordering' : 'Reorder'}
                    </button>
                    <button
                      onClick={() => setAddingSection(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Add Section
                    </button>
                  </div>
                </div>

                {addingSection && (
                  <div className="mb-4 p-4 bg-gray-700 rounded-lg">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSectionTitle}
                        onChange={(e) => setNewSectionTitle(e.target.value)}
                        placeholder="Section title"
                        className="flex-1 bg-gray-600 text-white px-3 py-2 rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        onClick={handleAddSection}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded transition-colors"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setAddingSection(false);
                          setNewSectionTitle('');
                        }}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  {sortedSections.length === 0 ? (
                    <p className="text-gray-400">No course content available yet.</p>
                  ) : (
                    <SortableContext items={sortedSections.map((_, index) => `section-${index}`)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-4">
                        {sortedSections.map((section, sectionIndex) => (
                          <SortableSection
                            key={section.id}
                            section={section}
                            sectionIndex={sectionIndex}
                            activeSection={activeSection}
                            setActiveSection={setActiveSection}
                            setAddingLesson={setAddingLesson}
                            isReordering={isReordering}
                          >
                              {addingLesson === sectionIndex && (
                                <div className="px-4 pb-4">
                                  <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-300 mb-1">Lesson Title</label>
                                      <input
                                        type="text"
                                        value={newLesson.title}
                                        onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                                        placeholder="Enter lesson title"
                                        className="w-full bg-gray-600 text-white px-3 py-2 rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                                      <textarea
                                        value={newLesson.description}
                                        onChange={(e) => setNewLesson({ ...newLesson, description: e.target.value })}
                                        placeholder="Enter lesson description"
                                        className="w-full bg-gray-600 text-white px-3 py-2 rounded border border-gray-500 focus:border-blue-500 focus:outline-none min-h-[60px] resize-vertical"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-300 mb-1">Lesson Type</label>
                                      <select
                                        value={newLesson.type}
                                        onChange={(e) => setNewLesson({ ...newLesson, type: e.target.value })}
                                        className="w-full bg-gray-600 text-white px-3 py-2 rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                                      >
                                        <option value="video">Video</option>
                                        <option value="article">Article</option>
                                        <option value="quiz">Quiz</option>
                                      </select>
                                    </div>
                                    {newLesson.type === 'video' && (
                                      <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Select Video</label>
                                        <div className="flex gap-2">
                                          <select
                                            value={newLesson.video_id}
                                            onChange={(e) => {
                                              const selectedVideo = availableVideos.find(v => v?.hash === e.target.value);
                                              setNewLesson({
                                                ...newLesson,
                                                video_id: e.target.value,
                                                title: selectedVideo && !newLesson.title ? (selectedVideo.title || `Video ${selectedVideo.hash?.substring(0, 8) || 'Unknown'}`) : newLesson.title
                                              });
                                            }}
                                            className="flex-1 bg-gray-600 text-white px-3 py-2 rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                                          >
                                            <option value="">Select a video...</option>
                                            {availableVideos.map((video, index) => (
                                              <option key={video.hash || `video-${index}`} value={video.hash}>
                                                {video.title || `Video ${video.hash?.substring(0, 8) || 'Unknown'}`}
                                              </option>
                                            ))}
                                          </select>
                                          <button
                                            type="button"
                                            onClick={() => setShowVideoSelector(!showVideoSelector)}
                                            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded transition-colors"
                                            title="Browse videos"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                          </button>
                                        </div>
                                        {showVideoSelector && (
                                          <div className="mt-2 max-h-40 overflow-y-auto bg-gray-600 rounded border border-gray-500">
                                            {availableVideos.length === 0 ? (
                                              <p className="text-gray-400 p-2">No videos available</p>
                                            ) : (
                                              availableVideos.map((video, index) => (
                                                <div
                                                  key={video.hash || `video-${index}`}
                                                  onClick={() => {
                                                    if (video?.hash) {
                                                      setNewLesson({
                                                        ...newLesson,
                                                        video_id: video.hash,
                                                        title: !newLesson.title ? (video.title || `Video ${video.hash.substring(0, 8)}`) : newLesson.title
                                                      });
                                                      setShowVideoSelector(false);
                                                    }
                                                  }}
                                                  className="p-2 hover:bg-gray-500 cursor-pointer border-b border-gray-500 last:border-b-0"
                                                >
                                                  <div className="text-white text-sm font-medium">
                                                    {video.title || `Video ${video.hash.substring(0, 8)}`}
                                                  </div>
                                                  <div className="text-gray-400 text-xs">
                                                    Hash: {video.hash.substring(0, 16)}...
                                                  </div>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleAddLesson(sectionIndex)}
                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded transition-colors"
                                      >
                                        Add Lesson
                                      </button>
                                      <button
                                        onClick={() => {
                                          setAddingLesson(null);
                                          setNewLesson({
                                            title: '',
                                            description: '',
                                            type: 'video',
                                            video_id: '',
                                            duration: 0
                                          });
                                        }}
                                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {activeSection === sectionIndex && (
                                <SortableContext items={section.lessons ? section.lessons.map((_, index) => `lesson-${sectionIndex}-${index}`) : []} strategy={verticalListSortingStrategy}>
                                  <div className="px-4 pb-4 space-y-2">
                                    {section.lessons && section.lessons.map((lesson, lessonIndex) => (
                                      <SortableLesson
                                        key={lesson.id}
                                        lesson={lesson}
                                        lessonIndex={lessonIndex}
                                        sectionIndex={sectionIndex}
                                        setSelectedVideo={setSelectedVideo}
                                        isReordering={isReordering}
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
                                      </SortableLesson>
                                    ))}
                                  </div>
                                </SortableContext>
                              )}
                            </SortableSection>
                          ))}
                        </div>
                      </SortableContext>
                  )}
                </DndContext>
              </div>
            </div>
            <div className="lg:col-span-1">

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
                    <span className="text-white">{(course.sections || []).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Lessons</span>
                    <span className="text-white">
                      {(course.sections || []).reduce((total, section) => total + (section.lessons ? section.lessons.length : 0), 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Videos</span>
                    <span className="text-white">
                      {(course.sections || []).reduce((total, section) =>
                        total + (section.lessons ? section.lessons.filter(lesson => lesson.type === 'video').length : 0), 0
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
                  {isEditing && editedCourse ? (
                    <textarea
                      value={editedCourse.description || ''}
                      onChange={(e) => setEditedCourse({ ...editedCourse, description: e.target.value })}
                      className="w-full bg-gray-700 text-gray-300 px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none min-h-[100px] resize-vertical"
                      placeholder="Course description..."
                    ></textarea>
                  ) : (
                    <p className="text-gray-300 leading-relaxed">{course.description}</p>
                  )}
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