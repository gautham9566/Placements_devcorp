"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '../../../../../components/admin/Sidebar';
import TopHeader from '../../../../../components/admin/TopHeader';

const STEPS = [
  { id: 1, title: 'Basic Information', description: 'Course title, category, and level' },
  { id: 2, title: 'Video Upload', description: 'Upload and assign videos to lessons' },
  { id: 3, title: 'Course Structure', description: 'Sections and lessons' },
  { id: 4, title: 'Course Landing Page', description: 'Description and promotional content' },
  { id: 5, title: 'Review & Publish', description: 'Review and publish course' }
];

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id;

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [courseData, setCourseData] = useState({
    // Step 1: Basic Information
    title: '',
    subtitle: '',
    category: '',
    subcategory: '',
    level: 'Beginner',
    language: 'English',
    thumbnail_url: '',
    thumbnailFile: null,

    // Step 2: Course Structure
    sections: [],

    // Step 3: Video Upload
    videos: [],

    // Step 4: Course Landing Page
    description: '',
    whatYouWillLearn: [],
    requirements: [],
    targetAudience: '',
    tags: [],

    // Step 5: Review & Publish
    // Will be populated from previous steps
  });

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (response.ok) {
        const course = await response.json();

        // Transform the data to match our form structure
        setCourseData({
          title: course.title || '',
          subtitle: course.subtitle || '',
          category: course.category || '',
          subcategory: course.subcategory || '',
          level: course.level || 'Beginner',
          language: course.language || 'English',
          description: course.description || '',
          thumbnail_url: course.thumbnail_url || '',
          sections: course.sections || [],
          videos: [], // We'll need to fetch videos separately or from course data
        });
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      alert('Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const updateCourseData = (updates) => {
    setCourseData(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    try {
      // Upload course thumbnail if provided
      if (courseData.thumbnailFile) {
        const formData = new FormData();
        formData.append('file', courseData.thumbnailFile);

        const thumbnailResponse = await fetch(`/api/courses/${courseId}/thumbnail`, {
          method: 'POST',
          body: formData,
        });

        if (!thumbnailResponse.ok) {
          console.warn('Failed to upload course thumbnail, continuing...');
        }
      }

      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: courseData.title,
          subtitle: courseData.subtitle,
          description: courseData.description,
          category: courseData.category,
          subcategory: courseData.subcategory,
          level: courseData.level,
          language: courseData.language,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update course');
      }

      alert('Course updated successfully!');
      router.push('/admin/courses');
    } catch (error) {
      console.error('Error updating course:', error);
      alert('Failed to update course: ' + error.message);
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <BasicInformationStep courseData={courseData} updateCourseData={updateCourseData} />;
      case 2:
        return <VideoUploadStep courseData={courseData} updateCourseData={updateCourseData} />;
      case 3:
        return <CourseStructureStep courseData={courseData} updateCourseData={updateCourseData} />;
      case 4:
        return <LandingPageStep courseData={courseData} updateCourseData={updateCourseData} />;
      case 5:
        return <ReviewPublishStep courseData={courseData} onSave={handleSave} />;
      default:
        return null;
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

  return (
    <div className="flex min-h-screen bg-gray-900">
      <Sidebar />
      <div className="flex-1 ml-64">
        <TopHeader />
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white">Edit Course</h1>
            <button
              onClick={() => router.push('/admin/courses')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Courses
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {STEPS.map((step) => (
                <div key={step.id} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.id < currentStep
                      ? 'bg-green-600 text-white'
                      : step.id === currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    {step.id < currentStep ? '✓' : step.id}
                  </div>
                  {step.id < STEPS.length && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      step.id < currentStep ? 'bg-green-600' : 'bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-2">
                {STEPS[currentStep - 1].title}
              </h2>
              <p className="text-gray-400">
                {STEPS[currentStep - 1].description}
              </p>
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Previous
            </button>
            <button
              onClick={nextStep}
              disabled={currentStep === STEPS.length}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {currentStep === STEPS.length ? 'Save Changes' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step Components (same as create page, but imported or copied)

function BasicInformationStep({ courseData, updateCourseData }) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Course Title *
        </label>
        <input
          type="text"
          value={courseData.title}
          onChange={(e) => updateCourseData({ title: e.target.value })}
          maxLength={120}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter course title"
        />
        <p className="text-sm text-gray-500 mt-1">{courseData.title.length}/120</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Subtitle
        </label>
        <input
          type="text"
          value={courseData.subtitle}
          onChange={(e) => updateCourseData({ subtitle: e.target.value })}
          maxLength={220}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter course subtitle"
        />
        <p className="text-sm text-gray-500 mt-1">{courseData.subtitle.length}/220</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Category *
          </label>
          <select
            value={courseData.category}
            onChange={(e) => updateCourseData({ category: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select category</option>
            <option value="Development">Development</option>
            <option value="Business">Business</option>
            <option value="Design">Design</option>
            <option value="Marketing">Marketing</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Level *
          </label>
          <select
            value={courseData.level}
            onChange={(e) => updateCourseData({ level: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
            <option value="All Levels">All Levels</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Primary Language *
        </label>
        <select
          value={courseData.language}
          onChange={(e) => updateCourseData({ language: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="English">English</option>
          <option value="Spanish">Spanish</option>
          <option value="French">French</option>
          <option value="German">German</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Course Thumbnail
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => updateCourseData({ thumbnailFile: e.target.files[0] })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
        />
        <p className="text-sm text-gray-400 mt-1">
          Upload a thumbnail image for your course (recommended: 1280x720px, max 2MB)
        </p>
        {(courseData.thumbnailFile || courseData.thumbnail_url) && (
          <div className="mt-2">
            <img
              src={courseData.thumbnailFile ? URL.createObjectURL(courseData.thumbnailFile) : (courseData.thumbnail_url?.startsWith('http') ? courseData.thumbnail_url : (courseData.thumbnail_url ? `http://localhost:8006${courseData.thumbnail_url}` : '/images/placeholder.svg'))}
              alt="Course thumbnail preview"
              className="w-32 h-18 object-cover rounded-lg border border-gray-600"
              onError={(e) => { e.currentTarget.src = '/images/placeholder.svg'; }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function VideoUploadStep({ courseData, updateCourseData }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedThumbnailFiles, setSelectedThumbnailFiles] = useState([]);
  const [uploadedVideos, setUploadedVideos] = useState(courseData.videos || []);
  const [transcodeStatus, setTranscodeStatus] = useState({});
  const [allVideos, setAllVideos] = useState([]);
  const [videoFilter, setVideoFilter] = useState('All');
  const [videoSearchTerm, setVideoSearchTerm] = useState('');
  const [currentVideoPage, setCurrentVideoPage] = useState(1);
  const videosPerPage = 5;

  // Fetch all videos on mount
  useEffect(() => {
    const fetchAllVideos = async () => {
      try {
        const response = await fetch('/api/videos');
        if (response.ok) {
          const data = await response.json();
          let videosData = [];
          if (Array.isArray(data)) {
            videosData = data;
          } else if (data.videos && Array.isArray(data.videos)) {
            videosData = data.videos;
          }
          const videos = videosData.map(d => ({
            ...d,
            thumbnail_url: d.thumbnail_filename ? `/api/thumbnail/${d.hash}` : null
          }));
          setAllVideos(videos);
        }
      } catch (error) {
        console.error('Failed to fetch videos:', error);
      }
    };

    fetchAllVideos();
  }, []);

  // Poll transcoding status for uploaded videos
  useEffect(() => {
    const pollTranscodingStatus = async () => {
      for (const video of uploadedVideos) {
        try {
          const response = await fetch(`/api/transcode/${video.hash}/status`);
          if (response.ok) {
            const status = await response.json();
            setTranscodeStatus(prev => ({
              ...prev,
              [video.hash]: status
            }));
          }
        } catch (error) {
          console.error(`Failed to fetch transcoding status for ${video.hash}:`, error);
        }
      }
    };

    if (uploadedVideos.length > 0) {
      pollTranscodingStatus();
      const interval = setInterval(pollTranscodingStatus, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [uploadedVideos]);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      setSelectedFiles(files);
    }
  };

  const uploadVideos = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    const newProgress = {};
    selectedFiles.forEach((_, index) => {
      newProgress[index] = 0;
    });
    setUploadProgress(newProgress);

    const uploadedVideosList = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        // Initialize upload
        const initResponse = await fetch('http://localhost:8001/upload/init', {
          method: 'POST',
          body: new URLSearchParams({
            filename: file.name,
            total_chunks: '1' // For simplicity, upload as single chunk
          })
        });

        if (!initResponse.ok) {
          throw new Error(`Failed to initialize upload for ${file.name}`);
        }

        const { upload_id } = await initResponse.json();

        // Upload the file as a single chunk
        const formData = new FormData();
        formData.append('upload_id', upload_id);
        formData.append('index', '0');
        formData.append('file', file);

        const chunkResponse = await fetch('http://localhost:8001/upload/chunk', {
          method: 'POST',
          body: formData
        });

        if (!chunkResponse.ok) {
          throw new Error(`Failed to upload chunk for ${file.name}`);
        }

        setUploadProgress(prev => ({ ...prev, [i]: 50 }));

        // Complete the upload
        const completeResponse = await fetch('http://localhost:8001/upload/complete', {
          method: 'POST',
          body: new URLSearchParams({
            upload_id: upload_id
          })
        });

        if (!completeResponse.ok) {
          throw new Error(`Failed to complete upload for ${file.name}`);
        }

        const { hash } = await completeResponse.json();
        setUploadProgress(prev => ({ ...prev, [i]: 100 }));

        // Upload thumbnail if available (match by filename or index)
        let thumbnailUploaded = false;
        if (selectedThumbnailFiles.length > 0) {
          // Try to match thumbnail by filename (remove extension and compare)
          const videoNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
          const matchingThumbnail = selectedThumbnailFiles.find(thumb => 
            thumb.name.replace(/\.[^/.]+$/, "") === videoNameWithoutExt
          );

          if (matchingThumbnail) {
            try {
              const thumbnailFormData = new FormData();
              thumbnailFormData.append('file', matchingThumbnail);

              const thumbnailResponse = await fetch(`/api/thumbnail/${hash}`, {
                method: 'POST',
                body: thumbnailFormData,
              });

              if (thumbnailResponse.ok) {
                thumbnailUploaded = true;
              }
            } catch (error) {
              console.warn(`Failed to upload thumbnail for ${file.name}:`, error);
            }
          }
        }

        // Add to uploaded videos
        const newVideo = {
          hash: hash,
          filename: file.name,
          uploaded_at: new Date().toISOString(),
          thumbnail_uploaded: thumbnailUploaded
        };
        uploadedVideosList.push(newVideo);
      }

      // Update state with all uploaded videos
      const updatedVideos = [...uploadedVideos, ...uploadedVideosList];
      setUploadedVideos(updatedVideos);
      updateCourseData({ videos: updatedVideos });

      setSelectedFiles([]);
      setSelectedThumbnailFiles([]);
      alert(`${selectedFiles.length} video(s) uploaded successfully!`);

    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  const removeVideo = (hash) => {
    const updatedVideos = uploadedVideos.filter(v => v.hash !== hash);
    setUploadedVideos(updatedVideos);
    updateCourseData({ videos: updatedVideos });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Upload Course Videos</h3>

        {/* File Upload Section */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Video Files
            </label>
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
            <p className="text-sm text-gray-400 mt-1">
              Supported formats: MP4, MOV, AVI, M4V, HEVC (Select multiple files at once)
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Thumbnail Files (optional)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setSelectedThumbnailFiles(Array.from(e.target.files))}
              disabled={uploading}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-600 file:text-white hover:file:bg-green-700"
            />
            <p className="text-sm text-gray-400 mt-1">
              Upload thumbnails for your videos (recommended: 1280x720px, max 2MB each)
            </p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-300 mb-2">Selected Files:</h5>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-600 rounded p-2">
                    <div className="flex-1">
                      <p className="text-sm text-white">{file.name}</p>
                      <p className="text-xs text-gray-400">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                        {uploading && uploadProgress[index] !== undefined && (
                          <span className="ml-2">({uploadProgress[index]}%)</span>
                        )}
                      </p>
                    </div>
                    {uploading && uploadProgress[index] !== undefined && (
                      <div className="w-16 bg-gray-500 rounded-full h-1 ml-2">
                        <div
                          className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress[index]}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploading && (
            <div className="mb-4">
              <p className="text-sm text-gray-400">Uploading videos... Please wait.</p>
            </div>
          )}

          <button
            onClick={uploadVideos}
            disabled={selectedFiles.length === 0 || uploading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {uploading ? 'Uploading...' : `Upload ${selectedFiles.length > 0 ? selectedFiles.length : ''} Video${selectedFiles.length !== 1 ? 's' : ''}`}
          </button>
        </div>

        {/* Uploaded Videos List */}
        <div>
          <h4 className="text-md font-medium text-white mb-3">Uploaded Videos</h4>
          {uploadedVideos.length === 0 ? (
            <p className="text-gray-400 text-sm">No videos uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {uploadedVideos.map((video) => {
                const status = transcodeStatus[video.hash];
                const overallStatus = status?.overall;
                const qualities = status?.qualities || {};
                const completedQualities = Object.values(qualities).filter(q => q.status === 'ok').length;
                const totalQualities = Object.keys(qualities).length;

                return (
                  <div key={video.hash} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-white font-medium">{video.filename}</p>
                        <p className="text-gray-400 text-sm">
                          ID: {video.hash.slice(0, 8)}... |
                          Uploaded: {new Date(video.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => removeVideo(video.hash)}
                        className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                      >
                        Remove
                      </button>
                    </div>

                    {/* Transcoding Status */}
                    {status && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-300">Transcoding:</span>
                          <span className={`text-sm font-medium ${
                            overallStatus === 'ok' ? 'text-green-400' :
                            overallStatus === 'error' ? 'text-red-400' :
                            overallStatus === 'running' ? 'text-blue-400' :
                            'text-yellow-400'
                          }`}>
                            {overallStatus === 'ok' ? 'Complete' :
                             overallStatus === 'error' ? 'Error' :
                             overallStatus === 'running' ? 'Processing...' :
                             overallStatus === 'stopped' ? 'Stopped' :
                             'Pending'}
                          </span>
                        </div>

                        {totalQualities > 0 && (
                          <div className="mb-2">
                            <div className="w-full bg-gray-600 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(completedQualities / totalQualities) * 100}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {completedQualities}/{totalQualities} qualities processed
                            </p>
                          </div>
                        )}

                        {/* Individual Quality Progress */}
                        {overallStatus === 'running' && Object.keys(qualities).length > 0 && (
                          <div className="space-y-1">
                            {Object.entries(qualities).map(([quality, qStatus]) => (
                              <div key={quality} className="flex items-center justify-between text-xs">
                                <span className="text-gray-400">{quality}:</span>
                                <div className="flex items-center space-x-2">
                                  <div className="w-16 bg-gray-600 rounded-full h-1">
                                    <div
                                      className={`h-1 rounded-full transition-all duration-300 ${
                                        qStatus.status === 'ok' ? 'bg-green-600' :
                                        qStatus.status === 'error' ? 'bg-red-600' :
                                        qStatus.status === 'running' ? 'bg-blue-600' :
                                        'bg-gray-500'
                                      }`}
                                      style={{ width: `${qStatus.progress || 0}%` }}
                                    ></div>
                                  </div>
                                  <span className={`${
                                    qStatus.status === 'ok' ? 'text-green-400' :
                                    qStatus.status === 'error' ? 'text-red-400' :
                                    qStatus.status === 'running' ? 'text-blue-400' :
                                    'text-gray-400'
                                  }`}>
                                    {qStatus.status === 'ok' ? '✓' :
                                     qStatus.status === 'error' ? '✗' :
                                     qStatus.status === 'running' ? `${qStatus.progress || 0}%` :
                                     '...'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* All Videos Table */}
        <div className="mt-8">
          <h4 className="text-md font-medium text-white mb-3">All Videos</h4>
          
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search videos..."
                value={videoSearchTerm}
                onChange={(e) => setVideoSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={videoFilter}
              onChange={(e) => setVideoFilter(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Status</option>
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
              <option value="Scheduled">Scheduled</option>
            </select>
          </div>

          {/* Videos Table */}
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-2 items-center p-4 border-b border-gray-700 text-gray-200 font-bold text-sm">
              <div className="col-span-1">Thumbnail</div>
              <div className="col-span-3 min-w-0">Video Title</div>
              <div className="col-span-2 min-w-0">Category</div>
              <div className="col-span-2 min-w-0">Date Added</div>
              <div className="col-span-1 min-w-0">Status</div>
              <div className="col-span-1 min-w-0">Views</div>
              <div className="col-span-2 min-w-0">Actions</div>
            </div>
            
            {(() => {
              const filteredVideos = allVideos.filter(video => {
                if (videoFilter === 'All') return true;
                if (videoFilter === 'Drafts') return !video.status || video.status.toLowerCase() === 'draft';
                return video.status === videoFilter;
              }).filter(video => {
                return video.title?.toLowerCase().includes(videoSearchTerm.toLowerCase()) ||
                       video.filename?.toLowerCase().includes(videoSearchTerm.toLowerCase());
              });

              const totalPages = Math.ceil(filteredVideos.length / videosPerPage);
              const paginatedVideos = filteredVideos.slice(
                (currentVideoPage - 1) * videosPerPage,
                currentVideoPage * videosPerPage
              );

              return (
                <>
                  {paginatedVideos.map(video => {
                    const getStatusChip = (status) => {
                      switch (status?.toLowerCase()) {
                        case 'published':
                          return <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs">{status}</span>;
                        case 'draft':
                          return <span className="bg-gray-500 text-white px-2 py-1 rounded-full text-xs">{status}</span>;
                        case 'scheduled':
                          return <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs">{status}</span>;
                        default:
                          return <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs">{status || 'Unknown'}</span>;
                      }
                    };

                    return (
                      <div key={video.id} className="grid grid-cols-12 gap-2 items-center p-4 border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                        <div className="col-span-1">
                          <img src={(video.thumbnail_url && (video.thumbnail_url.startsWith('http') ? video.thumbnail_url : `/api/thumbnail/${video.hash}`)) || '/images/placeholder.svg'} alt={video.title} className="w-12 h-7 rounded object-cover" onError={(e) => { e.currentTarget.src = '/images/placeholder.svg'; }} />
                        </div>
                        <div className="col-span-3 text-white font-medium min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                          {video.title || video.filename || 'N/A'}
                        </div>
                        <div className="col-span-2 text-gray-400">{video.category || 'N/A'}</div>
                        <div className="col-span-2 text-gray-400">{new Date(video.created_at).toLocaleDateString()}</div>
                        <div className="col-span-1">{getStatusChip(video.status)}</div>
                        <div className="col-span-1 text-gray-400">{video.views || '0'}</div>
                        <div className="col-span-2 flex items-center space-x-1">
                          <button
                            onClick={() => {/* Preview functionality */}}
                            className="text-blue-400 hover:text-blue-300 p-1"
                            title="Preview"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {/* Edit functionality */}}
                            className="text-yellow-400 hover:text-yellow-300 p-1"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {filteredVideos.length === 0 && (
                    <div className="p-8 text-center text-gray-400">
                      No videos found.
                    </div>
                  )}
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center space-x-2 p-4 border-t border-gray-700">
                      <button
                        onClick={() => setCurrentVideoPage(Math.max(1, currentVideoPage - 1))}
                        disabled={currentVideoPage === 1}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded"
                      >
                        Previous
                      </button>
                      <span className="text-gray-400">
                        Page {currentVideoPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentVideoPage(Math.min(totalPages, currentVideoPage + 1))}
                        disabled={currentVideoPage === totalPages}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

function CourseStructureStep({ courseData, updateCourseData }) {
  const [sections, setSections] = useState(courseData.sections || []);

  const addSection = () => {
    const newSection = {
      id: Date.now(),
      title: '',
      order: sections.length + 1,
      learningObjectives: [],
      lessons: []
    };
    const updatedSections = [...sections, newSection];
    setSections(updatedSections);
    updateCourseData({ sections: updatedSections });
  };

  const updateSection = (sectionId, updates) => {
    const updatedSections = sections.map(section =>
      section.id === sectionId ? { ...section, ...updates } : section
    );
    setSections(updatedSections);
    updateCourseData({ sections: updatedSections });
  };

  const addLesson = (sectionId) => {
    const updatedSections = sections.map(section => {
      if (section.id === sectionId) {
        const newLesson = {
          id: Date.now(),
          title: '',
          type: 'video',
          order: section.lessons.length + 1,
          video_id: null,
          description: '',
          duration: null
        };
        return {
          ...section,
          lessons: [...section.lessons, newLesson]
        };
      }
      return section;
    });
    setSections(updatedSections);
    updateCourseData({ sections: updatedSections });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">Course Structure</h3>
        <button
          onClick={addSection}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Add Section
        </button>
      </div>

      {sections.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No sections added yet. Click "Add Section" to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.id} className="bg-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                  placeholder="Section title"
                  className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mr-4"
                />
                <button
                  onClick={() => addLesson(section.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                >
                  Add Lesson
                </button>
              </div>

              {section.lessons.map((lesson) => (
                <div key={lesson.id} className="ml-4 mb-4 p-3 bg-gray-600 rounded-lg">
                  <div className="flex items-center mb-2">
                    <select
                      value={lesson.type}
                      onChange={(e) => {
                        const updatedSections = sections.map(s =>
                          s.id === section.id
                            ? {
                                ...s,
                                lessons: s.lessons.map(l =>
                                  l.id === lesson.id ? { ...l, type: e.target.value } : l
                                )
                              }
                            : s
                        );
                        setSections(updatedSections);
                        updateCourseData({ sections: updatedSections });
                      }}
                      className="w-24 px-2 py-1 bg-gray-500 border border-gray-400 rounded text-white text-sm mr-2"
                    >
                      <option value="video">Video</option>
                      <option value="article">Article</option>
                      <option value="quiz">Quiz</option>
                    </select>
                    <input
                      type="text"
                      value={lesson.title}
                      onChange={(e) => {
                        const updatedSections = sections.map(s =>
                          s.id === section.id
                            ? {
                                ...s,
                                lessons: s.lessons.map(l =>
                                  l.id === lesson.id ? { ...l, title: e.target.value } : l
                                )
                              }
                            : s
                        );
                        setSections(updatedSections);
                        updateCourseData({ sections: updatedSections });
                      }}
                      placeholder="Lesson title"
                      className="flex-1 px-3 py-1 bg-gray-500 border border-gray-400 rounded text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {lesson.type === 'video' && (
                    <div className="mb-2">
                      <select
                        value={lesson.video_id || ''}
                        onChange={(e) => {
                          const updatedSections = sections.map(s =>
                            s.id === section.id
                              ? {
                                  ...s,
                                  lessons: s.lessons.map(l =>
                                    l.id === lesson.id ? { ...l, video_id: e.target.value || null } : l
                                  )
                                }
                              : s
                          );
                          setSections(updatedSections);
                          updateCourseData({ sections: updatedSections });
                        }}
                        className="w-full px-3 py-1 bg-gray-500 border border-gray-400 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select a video...</option>
                        {courseData.videos.map((video) => (
                          <option key={video.hash} value={video.hash}>
                            {video.filename} ({video.hash.slice(0, 8)}...)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="mb-2">
                    <input
                      type="text"
                      value={lesson.description || ''}
                      onChange={(e) => {
                        const updatedSections = sections.map(s =>
                          s.id === section.id
                            ? {
                                ...s,
                                lessons: s.lessons.map(l =>
                                  l.id === lesson.id ? { ...l, description: e.target.value } : l
                                )
                              }
                            : s
                        );
                        setSections(updatedSections);
                        updateCourseData({ sections: updatedSections });
                      }}
                      placeholder="Lesson description (optional)"
                      className="w-full px-3 py-1 bg-gray-500 border border-gray-400 rounded text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LandingPageStep({ courseData, updateCourseData }) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Course Description *
        </label>
        <textarea
          value={courseData.description}
          onChange={(e) => updateCourseData({ description: e.target.value })}
          rows={6}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Describe what students will learn in this course..."
        />
      </div>
    </div>
  );
}

function ReviewPublishStep({ courseData, onSave }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-white mb-4">Review Your Course</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-lg font-medium text-white mb-3">Basic Information</h4>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-400">Title:</span> {courseData.title}</p>
            <p><span className="text-gray-400">Category:</span> {courseData.category}</p>
            <p><span className="text-gray-400">Level:</span> {courseData.level}</p>
            <p><span className="text-gray-400">Language:</span> {courseData.language}</p>
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-lg font-medium text-white mb-3">Course Content</h4>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-400">Sections:</span> {courseData.sections.length}</p>
            <p><span className="text-gray-400">Lessons:</span> {courseData.sections.reduce((total, section) => total + section.lessons.length, 0)}</p>
            <p><span className="text-gray-400">Videos:</span> {courseData.videos.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-700 rounded-lg p-4">
        <h4 className="text-lg font-medium text-white mb-3">Course Structure</h4>
        <div className="space-y-3">
          {courseData.sections.map((section, index) => (
            <div key={index}>
              <p className="text-white font-medium">{section.title}</p>
              <ul className="ml-4 text-sm text-gray-400">
                {section.lessons.map((lesson, lIndex) => (
                  <li key={lIndex}>
                    • {lesson.title} ({lesson.type})
                    {lesson.video_id && <span className="text-blue-400"> - Video assigned</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onSave}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}