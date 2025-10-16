"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
// TopHeader provided by admin layout
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
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableSection({ section, sectionIndex, children, activeSection, setActiveSection, setAddingLesson, isReordering, isEditing, onDeleteSection, editingSectionTitle, setEditingSectionTitle, onEditSectionTitle }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="border border-gray-300 dark:border-gray-700 rounded-lg">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 flex-1">
            {isReordering && (
              <div {...listeners} className="text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white cursor-move">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </div>
            )}
            <button
              onClick={() => setActiveSection(section.id === activeSection ? null : section.id)}
              className="flex items-center gap-3 flex-1 text-left"
            >
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${section.id === activeSection ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <div className="text-black dark:text-white font-medium">{section.title}</div>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {isEditing && (
              <button
                onClick={() => setEditingSectionTitle(editingSectionTitle === section.id ? null : section.id)}
                className="text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white p-1"
                title="Edit Section Title"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {isEditing && (
              <button
                onClick={() => onDeleteSection(section.id)}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                title="Delete Section"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setAddingLesson(section.id)}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Add Lesson
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function SortableLesson({ lesson, lessonIndex, sectionIndex, children, setSelectedVideo, isReordering, isEditing, onChangeLessonVideo, changingLessonVideo }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...(isReordering ? listeners : {})}>
      <div
        className={`flex items-center gap-3 p-3 bg-gray-200 dark:bg-gray-700 rounded-lg ${isReordering ? 'cursor-move' : ''} ${lesson.type === 'video' ? 'hover:bg-gray-300 dark:hover:bg-gray-600' : ''}`}
        onClick={() => lesson.type === 'video' && lesson.video_id && setSelectedVideo(lesson.video_id)}
      >
        {isReordering && (
          <div className="text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white">
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
  const [activeSection, setActiveSection] = useState(null); // section id
  const [transcodeStatus, setTranscodeStatus] = useState({});
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCourse, setEditedCourse] = useState(null);
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [addingLesson, setAddingLesson] = useState(null); // section id
  const [editingSectionTitle, setEditingSectionTitle] = useState(null); // section id being edited
  const [changingLessonVideo, setChangingLessonVideo] = useState(null); // {sectionId, lessonIndex}
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
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedSections = useMemo(() => {
    // Use editedCourse when in editing mode, otherwise use course
    const sourceCourse = isEditing && editedCourse ? editedCourse : course;
    if (!sourceCourse?.sections) return [];
    return [...sourceCourse.sections].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [course?.sections, editedCourse?.sections, isEditing]);

  useEffect(() => {
    fetchCourse();
    fetchAvailableVideos();
  }, [courseId]);

  const fetchAvailableVideos = async () => {
    try {
      // Fetch only videos for this specific course
      const response = await fetch(`/api/courses/${courseId}/videos`);
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
    if (!status) {
      return (
        <div className="text-xs text-gray-400 mt-1">
          Transcoding: Pending
        </div>
      );
    }

    const overall = status.overall || 'unknown';
    let statusColor = 'text-gray-400';
    let statusText = 'Unknown';
    let statusIcon = null;

    if (overall === 'ok' || overall === 'completed') {
      statusColor = 'text-green-400';
      statusText = 'Completed';
      statusIcon = (
        <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    } else if (overall === 'running') {
      statusColor = 'text-blue-400';
      statusText = 'Transcoding...';
      statusIcon = (
        <svg className="w-3 h-3 inline mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    } else if (overall === 'error') {
      statusColor = 'text-red-400';
      statusText = 'Failed';
      statusIcon = (
        <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    } else if (overall === 'stopped') {
      statusColor = 'text-yellow-400';
      statusText = 'Stopped';
      statusIcon = (
        <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    }

    // Calculate progress if available
    let progressBar = null;
    if (overall === 'running' && status.qualities) {
      const qualities = Object.values(status.qualities).filter(q => q && typeof q === 'object');
      if (qualities.length > 0) {
        const totalProgress = qualities.reduce((sum, q) => sum + (q.progress || 0), 0);
        const avgProgress = Math.round(totalProgress / qualities.length);
        progressBar = (
          <div className="mt-1">
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${avgProgress}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{avgProgress}%</div>
          </div>
        );
      }
    }

    return (
      <div className={`text-xs ${statusColor} mt-1`}>
        <div>
          {statusIcon}
          Transcoding: {statusText}
        </div>
        {progressBar}
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

  const handleDeleteSection = async (sectionId) => {
    if (!confirm('Are you sure you want to delete this section? This will also delete all lessons in this section.')) {
      return;
    }

    const sourceCourse = editedCourse || course;
    if (!sourceCourse || !sourceCourse.sections) return;

    const sectionToDelete = sourceCourse.sections.find(s => s.id === sectionId);
    const sortedSections = [...sourceCourse.sections].sort((a, b) => (a.order || 0) - (b.order || 0));
    const sectionIndex = sortedSections.findIndex(s => s.id === sectionId);

    // OPTIMISTIC UI UPDATE - Remove section immediately
    const updatedSections = [...sortedSections];
    updatedSections.splice(sectionIndex, 1);

    // Reorder the remaining sections
    const reorderedSections = updatedSections.map((section, index) => ({
      ...section,
      order: index
    }));

    const updatedCourse = {
      ...sourceCourse,
      sections: reorderedSections
    };

    setEditedCourse(updatedCourse);
    setCourse(updatedCourse);

    // Delete from backend asynchronously
    (async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}/sections/${sectionToDelete.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete section');
        }

        // Update order in backend
        await Promise.all(
          reorderedSections.map((section) =>
            fetch(`/api/courses/${courseId}/sections/${section.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ order: section.order }),
            })
          )
        );
      } catch (error) {
        console.error('Error deleting section:', error);
        alert('Failed to delete section. Reverting changes.');
        // Revert to original state
        setEditedCourse(sourceCourse);
        setCourse(sourceCourse);
      }
    })();
  };

  const handleEditSectionTitle = async (sectionId, newTitle) => {
    const sourceCourse = editedCourse || course;
    if (!sourceCourse || !sourceCourse.sections) return;

    const sectionToUpdate = sourceCourse.sections.find(s => s.id === sectionId);
    const oldTitle = sectionToUpdate.title;

    // OPTIMISTIC UI UPDATE - Update title immediately
    const updatedSections = sourceCourse.sections.map(section =>
      section.id === sectionToUpdate.id
        ? { ...section, title: newTitle }
        : section
    );

    const updatedCourse = {
      ...sourceCourse,
      sections: updatedSections
    };

    setEditedCourse(updatedCourse);
    setCourse(updatedCourse);
    setEditingSectionTitle(null);

    // Update in backend asynchronously
    (async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}/sections/${sectionToUpdate.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: newTitle }),
        });

        if (!response.ok) {
          throw new Error('Failed to update section title');
        }
      } catch (error) {
        console.error('Error updating section title:', error);
        alert('Failed to update section title. Reverting changes.');
        // Revert to original title
        const revertedSections = updatedCourse.sections.map(section =>
          section.id === sectionToUpdate.id
            ? { ...section, title: oldTitle }
            : section
        );
        const revertedCourse = {
          ...updatedCourse,
          sections: revertedSections
        };
        setEditedCourse(revertedCourse);
        setCourse(revertedCourse);
      }
    })();
  };

  const handleChangeLessonVideo = async (sectionId, lessonIndex, newVideoId) => {
    const sourceCourse = editedCourse || course;
    if (!sourceCourse || !sourceCourse.sections) return;

    const sectionToUpdate = sourceCourse.sections.find(s => s.id === sectionId);
    const lessonToUpdate = sectionToUpdate.lessons[lessonIndex];
    const oldVideoId = lessonToUpdate.video_id;

    // OPTIMISTIC UI UPDATE - Update video immediately
    const updatedSections = sourceCourse.sections.map(section => {
      if (section.id === sectionToUpdate.id) {
        return {
          ...section,
          lessons: section.lessons.map(lesson =>
            lesson.id === lessonToUpdate.id
              ? { ...lesson, video_id: newVideoId }
              : lesson
          )
        };
      }
      return section;
    });

    const updatedCourse = {
      ...sourceCourse,
      sections: updatedSections
    };

    setEditedCourse(updatedCourse);
    setCourse(updatedCourse);
    setChangingLessonVideo(null);

    // Update in backend asynchronously
    (async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}/lessons/${lessonToUpdate.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ video_id: newVideoId }),
        });

        if (!response.ok) {
          throw new Error('Failed to update lesson video');
        }
      } catch (error) {
        console.error('Error updating lesson video:', error);
        alert('Failed to update lesson video. Reverting changes.');
        // Revert to original video
        const revertedSections = updatedCourse.sections.map(section => {
          if (section.id === sectionToUpdate.id) {
            return {
              ...section,
              lessons: section.lessons.map(lesson =>
                lesson.id === lessonToUpdate.id
                  ? { ...lesson, video_id: oldVideoId }
                  : lesson
              )
            };
          }
          return section;
        });
        const revertedCourse = {
          ...updatedCourse,
          sections: revertedSections
        };
        setEditedCourse(revertedCourse);
        setCourse(revertedCourse);
      }
    })();
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

        // Trigger transcoding for all videos in the course
        const videoIds = [];
        if (updatedCourse.sections) {
          updatedCourse.sections.forEach(section => {
            section.lessons.forEach(lesson => {
              if (lesson.video_id) {
                videoIds.push(lesson.video_id);
              }
            });
          });
        }

        if (videoIds.length > 0) {
          console.log('Video IDs to transcode:', videoIds);
          alert(`Starting transcoding for ${videoIds.length} video(s) in the course.`);

          for (const videoId of videoIds) {
            if (!videoId) {
              console.warn('Skipping empty video ID');
              continue;
            }

            try {
              console.log(`Starting transcoding for video: ${videoId}`);

              // Update video transcoding status to 'transcoding'
              const updateResponse = await fetch(`/api/videos/${videoId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ transcoding_status: 'transcoding' }),
              });

              if (!updateResponse.ok) {
                console.error(`Failed to update video ${videoId} status:`, await updateResponse.text());
              }

              // Trigger transcoding
              const transcodeResponse = await fetch(`/api/transcode/${videoId}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ qualities: ['360p', '480p', '720p'] }),
              });

              if (!transcodeResponse.ok) {
                console.error(`Failed to start transcoding for video ${videoId}:`, await transcodeResponse.text());
              } else {
                console.log(`Successfully started transcoding for video ${videoId}`);
              }
            } catch (error) {
              console.error(`Failed to start transcoding for video ${videoId}:`, error);
            }
          }

          // Start polling for transcoding status updates
          const pollInterval = setInterval(async () => {
            try {
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

              // Check if all videos are transcoded
              const allComplete = statuses.every(({ status }) =>
                status && (status.overall === 'ok' || status.overall === 'completed')
              );
              const anyFailed = statuses.some(({ status }) =>
                status && status.overall === 'error'
              );

              if (allComplete) {
                clearInterval(pollInterval);

                // Update all videos to 'completed' status
                for (const videoId of videoIds) {
                  try {
                    await fetch(`/api/videos/${videoId}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ transcoding_status: 'completed' }),
                    });
                  } catch (error) {
                    console.warn(`Failed to update transcoding status for video ${videoId}:`, error);
                  }
                }

                alert('Transcoding completed successfully!');
              } else if (anyFailed) {
                clearInterval(pollInterval);

                // Update failed videos
                for (const { videoId, status } of statuses) {
                  if (status && status.overall === 'error') {
                    try {
                      await fetch(`/api/videos/${videoId}`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ transcoding_status: 'failed' }),
                      });
                    } catch (error) {
                      console.warn(`Failed to update transcoding status for video ${videoId}:`, error);
                    }
                  }
                }

                alert('Transcoding failed for one or more videos. Please check the video status.');
              }
            } catch (error) {
              console.error('Error polling transcoding status:', error);
            }
          }, 3000); // Poll every 3 seconds

          // Stop polling after 30 minutes
          setTimeout(() => {
            clearInterval(pollInterval);
          }, 30 * 60 * 1000);
        }
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

  const updateCourseField = (field, value) => {
    const sourceCourse = editedCourse || course;
    if (!sourceCourse) return;

    const updatedCourse = { ...sourceCourse, [field]: value };
    setEditedCourse(updatedCourse);
    setCourse(updatedCourse);
  };

  const handlePublish = async () => {
    try {
      // Step 1: Set course status to 'draft' first
      const draftResponse = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...course, status: 'draft' }),
      });

      if (!draftResponse.ok) {
        console.error('Failed to set course to draft');
        alert('Failed to initiate publish process');
        return;
      }

      const draftCourse = await draftResponse.json();
      if (!draftCourse.sections) {
        draftCourse.sections = course.sections || [];
      }
      setCourse(draftCourse);
      setEditedCourse({ ...draftCourse, sections: draftCourse.sections || [] });

      // Step 2: Collect all video IDs from the course
      const videoIds = [];
      if (course.sections) {
        course.sections.forEach(section => {
          section.lessons.forEach(lesson => {
            if (lesson.video_id) {
              videoIds.push(lesson.video_id);
            }
          });
        });
      }

      if (videoIds.length === 0) {
        // No videos to transcode, publish immediately
        const publishResponse = await fetch(`/api/courses/${courseId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...course, status: 'published' }),
        });

        if (publishResponse.ok) {
          const publishedCourse = await publishResponse.json();
          if (!publishedCourse.sections) {
            publishedCourse.sections = course.sections || [];
          }
          setCourse(publishedCourse);
          setEditedCourse({ ...publishedCourse, sections: publishedCourse.sections || [] });
          alert('Course published successfully!');
        }
        return;
      }

      // Step 3: Start transcoding for all videos
      console.log('Video IDs to transcode (publish):', videoIds);
      alert(`Starting transcoding for ${videoIds.length} video(s). The course will be automatically published when transcoding completes.`);

      for (const videoId of videoIds) {
        if (!videoId) {
          console.warn('Skipping empty video ID');
          continue;
        }

        try {
          console.log(`Starting transcoding for video: ${videoId}`);

          // Update video transcoding status to 'transcoding'
          const updateResponse = await fetch(`/api/videos/${videoId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ transcoding_status: 'transcoding' }),
          });

          if (!updateResponse.ok) {
            console.error(`Failed to update video ${videoId} status:`, await updateResponse.text());
          }

          // Trigger transcoding
          const transcodeResponse = await fetch(`/api/transcode/${videoId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ qualities: ['360p', '480p', '720p'] }),
          });

          if (!transcodeResponse.ok) {
            console.error(`Failed to start transcoding for video ${videoId}:`, await transcodeResponse.text());
          } else {
            console.log(`Successfully started transcoding for video ${videoId}`);
          }
        } catch (error) {
          console.error(`Failed to start transcoding for video ${videoId}:`, error);
        }
      }

      // Step 4: Poll transcoding status and auto-publish when complete
      const pollInterval = setInterval(async () => {
        try {
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

          // Check if all videos are transcoded
          const allComplete = statuses.every(({ status }) =>
            status && (status.overall === 'ok' || status.overall === 'completed')
          );
          const anyFailed = statuses.some(({ status }) =>
            status && status.overall === 'error'
          );

          if (allComplete) {
            clearInterval(pollInterval);

            // Update all videos to 'completed' status
            for (const videoId of videoIds) {
              try {
                await fetch(`/api/videos/${videoId}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ transcoding_status: 'completed' }),
                });
              } catch (error) {
                console.warn(`Failed to update transcoding status for video ${videoId}:`, error);
              }
            }

            // Auto-publish the course
            const publishResponse = await fetch(`/api/courses/${courseId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ ...course, status: 'published' }),
            });

            if (publishResponse.ok) {
              const publishedCourse = await publishResponse.json();
              if (!publishedCourse.sections) {
                publishedCourse.sections = course.sections || [];
              }
              setCourse(publishedCourse);
              setEditedCourse({ ...publishedCourse, sections: publishedCourse.sections || [] });
              alert('Transcoding completed! Course has been published successfully.');
            }
          } else if (anyFailed) {
            clearInterval(pollInterval);

            // Update failed videos
            for (const { videoId, status } of statuses) {
              if (status && status.overall === 'error') {
                try {
                  await fetch(`/api/videos/${videoId}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ transcoding_status: 'failed' }),
                  });
                } catch (error) {
                  console.warn(`Failed to update transcoding status for video ${videoId}:`, error);
                }
              }
            }

            alert('Transcoding failed for one or more videos. Course remains in draft status. Please check the video status and try again.');
          }
        } catch (error) {
          console.error('Error polling transcoding status:', error);
        }
      }, 3000); // Poll every 3 seconds

      // Stop polling after 30 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
      }, 30 * 60 * 1000);

    } catch (error) {
      console.error('Error publishing course:', error);
      alert('Failed to publish course: ' + error.message);
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

    const sourceCourse = isEditing && editedCourse ? editedCourse : course;

    try {
      const response = await fetch(`/api/courses/${courseId}/sections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newSectionTitle,
          order: (sourceCourse.sections || []).length
        }),
      });

      if (response.ok) {
        const newSection = await response.json();
        const updatedCourse = {
          ...sourceCourse,
          sections: [...(sourceCourse.sections || []), newSection]
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

  const handleAddLesson = async (sectionId) => {
    if (!newLesson.title.trim()) return;

    const sourceCourse = isEditing && editedCourse ? editedCourse : course;
    const section = sourceCourse.sections.find(s => s.id === sectionId);

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

        // Update the section in the original sections array
        const updatedSections = sourceCourse.sections.map(s => {
          if (s.id === section.id) {
            return {
              ...s,
              lessons: [...(s.lessons || []), newLessonData]
            };
          }
          return s;
        });

        const updatedCourse = {
          ...sourceCourse,
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

    // Use editedCourse when in editing mode, otherwise use course
    const sourceCourse = isEditing && editedCourse ? editedCourse : course;

    // Check if we're reordering sections
    const activeSection = sourceCourse.sections.find(s => s.id === activeId);
    const overSection = sourceCourse.sections.find(s => s.id === overId);

    if (activeSection && overSection) {
      // Sort sections by order for drag operations
      const sortedSections = [...sourceCourse.sections].sort((a, b) => (a.order || 0) - (b.order || 0));
      const activeIndex = sortedSections.findIndex(s => s.id === activeId);
      const overIndex = sortedSections.findIndex(s => s.id === overId);

      const reorderedSections = arrayMove(sortedSections, activeIndex, overIndex);

      // Update the order property for each section
      const updatedSections = reorderedSections.map((section, index) => ({
        ...section,
        order: index
      }));

      // OPTIMISTIC UI UPDATE - Update state immediately for fluid UX
      const updatedCourse = {
        ...sourceCourse,
        sections: updatedSections
      };
      setCourse(updatedCourse);
      setEditedCourse({ ...updatedCourse, sections: updatedCourse.sections });

      // Update order in the backend asynchronously (don't await)
      Promise.all(
        updatedSections.map((section, index) =>
          fetch(`/api/courses/${courseId}/sections/${section.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...section, order: index }),
          })
        )
      ).catch(error => {
        console.error('Error updating section order:', error);
        // Optionally: Show a toast notification or revert the change
        alert('Failed to save section order. Please try again.');
        // Revert to original state
        setCourse(sourceCourse);
        setEditedCourse(sourceCourse);
      });
    }
    // Check if we're reordering lessons within a section
    else {
      // Find the section and lesson for active and over
      let activeSection, activeLesson, overSection, overLesson;

      for (const section of sourceCourse.sections) {
        if (section.lessons) {
          const activeLessonInSection = section.lessons.find(l => l.id === activeId);
          const overLessonInSection = section.lessons.find(l => l.id === overId);

          if (activeLessonInSection) {
            activeSection = section;
            activeLesson = activeLessonInSection;
          }
          if (overLessonInSection) {
            overSection = section;
            overLesson = overLessonInSection;
          }
        }
      }

      if (activeSection && overSection && activeSection.id === overSection.id) {
        const activeLessonIndex = activeSection.lessons.findIndex(l => l.id === activeId);
        const overLessonIndex = overSection.lessons.findIndex(l => l.id === overId);

        const reorderedLessons = arrayMove(activeSection.lessons, activeLessonIndex, overLessonIndex);

        // Update the order property for each lesson
        const updatedLessons = reorderedLessons.map((lesson, index) => ({
          ...lesson,
          order: index
        }));

        // Update the section in the original course.sections array
        const updatedSections = sourceCourse.sections.map(s => {
          if (s.id === activeSection.id) {
            return {
              ...s,
              lessons: updatedLessons
            };
          }
          return s;
        });

        // OPTIMISTIC UI UPDATE - Update state immediately for fluid UX
        const updatedCourse = {
          ...sourceCourse,
          sections: updatedSections
        };
        setCourse(updatedCourse);
        setEditedCourse({ ...updatedCourse, sections: updatedCourse.sections });

        // Update order in the backend asynchronously (don't await)
        Promise.all(
          updatedLessons.map((lesson, index) =>
            fetch(`/api/courses/${courseId}/lessons/${lesson.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ ...lesson, order: index }),
            })
          )
        ).catch(error => {
          console.error('Error updating lesson order:', error);
          // Optionally: Show a toast notification or revert the change
          alert('Failed to save lesson order. Please try again.');
          // Revert to original state
          setCourse(sourceCourse);
          setEditedCourse(sourceCourse);
        });
      }
    }
  };

  const handleVideoUpload = async () => {
    if (!videoFile) return;

    setUploadingVideo(true);
    setUploadProgress(0);

    try {
      // Upload video in chunks
      const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
      const totalChunks = Math.ceil(videoFile.size / CHUNK_SIZE);

      // Initialize upload
      const initForm = new FormData();
      initForm.append('filename', videoFile.name);
      initForm.append('total_chunks', totalChunks.toString());

      const initResp = await fetch(`/api/courses/${courseId}/upload/init`, {
        method: 'POST',
        body: initForm,
      });

      if (!initResp.ok) throw new Error('Failed to initialize upload');
      const { upload_id } = await initResp.json();

      // Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, videoFile.size);
        const chunk = videoFile.slice(start, end);

        const chunkForm = new FormData();
        chunkForm.append('upload_id', upload_id);
        chunkForm.append('index', i.toString());
        chunkForm.append('file', chunk);

        const chunkResp = await fetch(`/api/courses/${courseId}/upload/chunk`, {
          method: 'POST',
          body: chunkForm,
        });

        if (!chunkResp.ok) throw new Error(`Failed to upload chunk ${i}`);
        setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      // Complete upload
      const completeForm = new FormData();
      completeForm.append('upload_id', upload_id);

      const completeResp = await fetch(`/api/courses/${courseId}/upload/complete`, {
        method: 'POST',
        body: completeForm,
      });

      if (!completeResp.ok) throw new Error('Failed to complete upload');

      const uploadResult = await completeResp.json();
      const videoHash = uploadResult.hash;

      // Refresh available videos
      await fetchAvailableVideos();

      // Trigger transcoding for the uploaded video
      try {
        const transcodeResp = await fetch(`/api/transcode/${videoHash}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}) // Empty body for default transcoding
        });

        if (transcodeResp.ok) {
          console.log('Transcoding started successfully for video:', videoHash);
          alert(`Transcoding started successfully for video: ${videoHash}`);
        } else {
          const errorText = await transcodeResp.text();
          console.warn('Failed to start transcoding:', errorText);
          alert(`Failed to start transcoding: ${errorText}`);
        }
      } catch (transcodeError) {
        console.warn('Error triggering transcoding:', transcodeError);
        alert(`Error triggering transcoding: ${transcodeError.message}`);
        // Don't fail the upload if transcoding fails
      }

      // Reset form
      setVideoFile(null);
      setShowUploadDialog(false);
      setUploadProgress(0);

      alert('Video uploaded successfully! Transcoding has been started.');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploadingVideo(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="flex justify-center items-center h-screen p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="flex justify-center items-center h-screen p-6">
          <p className="text-black dark:text-white">Course not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/courses')}
                className="text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
                title="Back to Courses"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-3xl font-bold text-black dark:text-white">Course Preview</h1>
            </div>
            <div className="flex gap-4">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setEditedCourse({ ...course });
                      setIsEditing(true);
                    }}
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
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-6">
              <div className="w-48 h-32 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
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
                      onChange={(e) => updateCourseField('title', e.target.value)}
                      className="w-full bg-gray-200 dark:bg-gray-700 text-black dark:text-white text-2xl font-bold px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                      placeholder="Course Title"
                    />
                    <input
                      type="text"
                      value={editedCourse.subtitle || ''}
                      onChange={(e) => updateCourseField('subtitle', e.target.value)}
                      className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                      placeholder="Course Subtitle"
                    />
                    <div className="flex gap-4">
                      <select
                        value={editedCourse.category || ''}
                        onChange={(e) => updateCourseField('category', e.target.value)}
                        className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Select Category</option>
                        <option value="Programming">Programming</option>
                        <option value="Design">Design</option>
                        <option value="Business">Business</option>
                        <option value="Marketing">Marketing</option>
                      </select>
                      <select
                        value={editedCourse.level || ''}
                        onChange={(e) => updateCourseField('level', e.target.value)}
                        className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Select Level</option>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                      <select
                        value={editedCourse.language || ''}
                        onChange={(e) => updateCourseField('language', e.target.value)}
                        className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
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
                    <h2 className="text-2xl font-bold text-black dark:text-white mb-2">{course.title}</h2>
                    {course.subtitle && (
                      <p className="text-gray-700 dark:text-gray-300 mb-4">{course.subtitle}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
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
                      onClick={() => setShowUploadDialog(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Upload Video
                    </button>
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
                    <SortableContext items={sortedSections.map(section => section.id)} strategy={verticalListSortingStrategy}>
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
                            isEditing={isEditing}
                            onDeleteSection={handleDeleteSection}
                            editingSectionTitle={editingSectionTitle}
                            setEditingSectionTitle={setEditingSectionTitle}
                            onEditSectionTitle={handleEditSectionTitle}
                          >
                              {addingLesson === section.id && (
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
                                        onClick={() => handleAddLesson(addingLesson)}
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

                              {activeSection === section.id && (
                                <SortableContext items={section.lessons ? section.lessons.map(lesson => lesson.id) : []} strategy={verticalListSortingStrategy}>
                                  <div className="px-4 pb-4 space-y-2">
                                    {section.lessons && section.lessons.map((lesson, lessonIndex) => (
                                      <SortableLesson
                                        key={lesson.id}
                                        lesson={lesson}
                                        lessonIndex={lessonIndex}
                                        sectionIndex={sectionIndex}
                                        setSelectedVideo={setSelectedVideo}
                                        isReordering={isReordering}
                                        isEditing={isEditing}
                                        onChangeLessonVideo={handleChangeLessonVideo}
                                        changingLessonVideo={changingLessonVideo}
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
                                        <div className="flex items-center gap-2">
                                          {lesson.duration && (
                                            <span className="text-gray-400 text-sm">
                                              {Math.floor(lesson.duration / 60)}:{(lesson.duration % 60).toString().padStart(2, '0')}
                                            </span>
                                          )}
                                          {isEditing && lesson.type === 'video' && (
                                            <>
                                              {lesson.video_id && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleChangeLessonVideo(section.id, lessonIndex, null);
                                                  }}
                                                  className="text-red-400 hover:text-red-300 p-1"
                                                  title="Remove Video"
                                                >
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                  </svg>
                                                </button>
                                              )}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setChangingLessonVideo({ sectionId: section.id, lessonIndex });
                                                }}
                                                className="text-gray-400 hover:text-white p-1"
                                                title="Change Video"
                                              >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </SortableLesson>
                                    ))}
                                  </div>
                                </SortableContext>
                              )}

                              {changingLessonVideo && changingLessonVideo.sectionId === section.id && (
                                <div className="px-4 pb-4">
                                  <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                                    <h4 className="text-white font-medium">Change Video for Lesson</h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                      {availableVideos.map((video) => (
                                        <div
                                          key={video.hash}
                                          onClick={() => handleChangeLessonVideo(changingLessonVideo.sectionId, changingLessonVideo.lessonIndex, video.hash)}
                                          className="flex items-center gap-3 p-2 bg-gray-600 rounded hover:bg-gray-500 cursor-pointer transition-colors"
                                        >
                                          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                          </svg>
                                          <div className="flex-1">
                                            <p className="text-white text-sm font-medium">{video.title || video.filename}</p>
                                            {renderTranscodeStatus(video.hash)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => setChangingLessonVideo(null)}
                                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </div>
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

              {/* Transcoding Status Card */}
              {Object.keys(transcodeStatus).length > 0 && (
                <div className="bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-white mb-4">Video Transcoding Status</h4>
                  <div className="space-y-4">
                    {Object.entries(transcodeStatus).map(([videoId, status]) => {
                      const overall = status?.overall || 'unknown';
                      const qualities = status?.qualities || {};
                      const qualityEntries = Object.entries(qualities).filter(([q]) => q !== 'original');

                      let statusColor = 'text-gray-400';
                      let statusText = 'Unknown';
                      let statusIcon = null;

                      if (overall === 'ok' || overall === 'completed') {
                        statusColor = 'text-green-400';
                        statusText = 'Completed';
                        statusIcon = '✓';
                      } else if (overall === 'running') {
                        statusColor = 'text-blue-400';
                        statusText = 'Processing...';
                        statusIcon = '⟳';
                      } else if (overall === 'error') {
                        statusColor = 'text-red-400';
                        statusText = 'Failed';
                        statusIcon = '✗';
                      } else if (overall === 'stopped') {
                        statusColor = 'text-yellow-400';
                        statusText = 'Stopped';
                        statusIcon = '⏸';
                      }

                      return (
                        <div key={videoId} className="bg-gray-700 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-medium text-sm">
                              Video {videoId.slice(0, 8)}...
                            </span>
                            <span className={`text-sm font-medium ${statusColor}`}>
                              {statusIcon} {statusText}
                            </span>
                          </div>

                          {qualityEntries.length > 0 && (
                            <div className="space-y-2">
                              {qualityEntries.map(([quality, qStatus]) => {
                                const progress = qStatus.progress || 0;
                                let qColor = 'text-gray-400';
                                let qIcon = '...';

                                if (qStatus.status === 'ok') {
                                  qColor = 'text-green-400';
                                  qIcon = '✓';
                                } else if (qStatus.status === 'error') {
                                  qColor = 'text-red-400';
                                  qIcon = '✗';
                                } else if (qStatus.status === 'running') {
                                  qColor = 'text-blue-400';
                                  qIcon = `${progress}%`;
                                }

                                return (
                                  <div key={quality} className="flex items-center justify-between text-xs">
                                    <span className="text-gray-300">{quality}</span>
                                    <div className="flex items-center space-x-2">
                                      <div className="w-12 bg-gray-600 rounded-full h-1">
                                        <div
                                          className={`h-1 rounded-full transition-all duration-300 ${
                                            qStatus.status === 'ok' ? 'bg-green-500' :
                                            qStatus.status === 'error' ? 'bg-red-500' :
                                            qStatus.status === 'running' ? 'bg-blue-500' : 'bg-gray-500'
                                          }`}
                                          style={{ width: `${progress}%` }}
                                        />
                                      </div>
                                      <span className={qColor}>{qIcon}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                      onChange={(e) => updateCourseField('description', e.target.value)}
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

      {/* Upload Video Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Upload Video for Course</h3>

            {!uploadingVideo ? (
              <>
                <div className="mb-4">
                  <label className="block text-gray-300 mb-2">Select Video File</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files[0])}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                  {videoFile && (
                    <p className="text-gray-400 text-sm mt-2">
                      Selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowUploadDialog(false);
                      setVideoFile(null);
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVideoUpload}
                    disabled={!videoFile}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Upload
                  </button>
                </div>
              </>
            ) : (
              <div>
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-300 mb-2">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-gray-400 text-sm">Please wait while your video is being uploaded...</p>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
  );
}