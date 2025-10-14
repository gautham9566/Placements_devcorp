"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../../components/admin/Sidebar';
import TopHeader from '../../../../components/admin/TopHeader';

const STEPS = [
	{
		id: 1,
		title: 'Basic Information & Landing Page',
		description: 'Course details, description, and promotional content'
	},
	{
		id: 2,
		title: 'Video Upload',
		description: 'Upload and assign videos to lessons'
	},
	{
		id: 3,
		title: 'Course Structure',
		description: 'Sections and lessons'
	},
	{
		id: 4,
		title: 'Review & Publish',
		description: 'Review and publish course'
	}
];

export default function CreateCoursePage() {
	const router = useRouter();
	const [currentStep, setCurrentStep] = useState(1);
	const [courseData, setCourseData] = useState({
		// Step 1: Basic Information
		title: '',
		subtitle: '',
		category: '',
		subcategory: '',
		level: 'Beginner',
		language: 'English',

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

	const handleSaveDraft = async () => {
		try {
			// Create the course as draft
			const courseResponse = await fetch('/api/courses', {
				method: 'POST',
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
					status: 'draft',
				}),
			});

			if (!courseResponse.ok) {
				throw new Error('Failed to create course');
			}

			const { course_id } = await courseResponse.json();

			// Upload course thumbnail if provided
			if (courseData.thumbnailFile) {
				const formData = new FormData();
				formData.append('file', courseData.thumbnailFile);

				const thumbnailResponse = await fetch(`/api/courses/${course_id}/thumbnail`, {
					method: 'POST',
					body: formData,
				});

				if (!thumbnailResponse.ok) {
					console.warn('Failed to upload course thumbnail, continuing...');
				}
			}

			// Add sections and lessons
			for (const section of courseData.sections) {
				const sectionResponse = await fetch(`/api/courses/${course_id}/sections`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						title: section.title,
						order: section.order,
						learning_objectives: section.learningObjectives,
					}),
				});

				if (!sectionResponse.ok) {
					throw new Error('Failed to create section');
				}

				const { section_id } = await sectionResponse.json();

				// Add lessons to section
				for (const lesson of section.lessons) {
					const lessonResponse = await fetch(`/api/courses/${course_id}/lessons`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							section_id: section_id,
							title: lesson.title,
							description: lesson.description,
							type: lesson.type,
							video_id: lesson.video_id,
							duration: lesson.duration,
							order: lesson.order,
							resources: [],
							downloadable: false,
						}),
					});

					if (!lessonResponse.ok) {
						throw new Error('Failed to create lesson');
					}
				}
			}

			// Trigger transcoding for all videos in the course
			const videoIds = [];
			for (const section of courseData.sections) {
				for (const lesson of section.lessons) {
					if (lesson.video_id) {
						videoIds.push(lesson.video_id);
					}
				}
			}

			// Start transcoding for each video
			for (const videoId of videoIds) {
				try {
					await fetch(`/api/transcode/${videoId}`, {
						method: 'POST',
					});
				} catch (error) {
					console.warn(`Failed to start transcoding for video ${videoId}:`, error);
				}
			}

			alert('Course saved as draft successfully!');
			router.push('/admin/courses');
		} catch (error) {
			console.error('Error saving course as draft:', error);
			alert('Failed to save course as draft: ' + error.message);
		}
	};

	const handlePublish = async () => {
		try {
			// Create the course
			const courseResponse = await fetch('/api/courses', {
				method: 'POST',
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

			if (!courseResponse.ok) {
				throw new Error('Failed to create course');
			}

			const { course_id } = await courseResponse.json();

			// Upload course thumbnail if provided
			if (courseData.thumbnailFile) {
				const formData = new FormData();
				formData.append('file', courseData.thumbnailFile);

				const thumbnailResponse = await fetch(`/api/courses/${course_id}/thumbnail`, {
					method: 'POST',
					body: formData,
				});

				if (!thumbnailResponse.ok) {
					console.warn('Failed to upload course thumbnail, continuing...');
				}
			}

			// Add sections and lessons
			for (const section of courseData.sections) {
				const sectionResponse = await fetch(`/api/courses/${course_id}/sections`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						title: section.title,
						order: section.order,
						learning_objectives: section.learningObjectives,
					}),
				});

				if (!sectionResponse.ok) {
					throw new Error('Failed to create section');
				}

				const { section_id } = await sectionResponse.json();

				// Add lessons to section
				for (const lesson of section.lessons) {
					const lessonResponse = await fetch(`/api/courses/${course_id}/lessons`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							section_id: section_id,
							title: lesson.title,
							description: lesson.description,
							type: lesson.type,
							video_id: lesson.video_id,
							duration: lesson.duration,
							order: lesson.order,
							resources: [],
							downloadable: false,
						}),
					});

					if (!lessonResponse.ok) {
						throw new Error('Failed to create lesson');
					}
				}
			}

			// Publish the course
			const publishResponse = await fetch(`/api/courses/${course_id}/publish`, {
				method: 'POST',
			});

			if (!publishResponse.ok) {
				throw new Error('Failed to publish course');
			}

			// Trigger transcoding for all videos in the course
			const videoIds = [];
			for (const section of courseData.sections) {
				for (const lesson of section.lessons) {
					if (lesson.video_id) {
						videoIds.push(lesson.video_id);
					}
				}
			}

			// Start transcoding for each video
			for (const videoId of videoIds) {
				try {
					await fetch(`/api/transcode/${videoId}`, {
						method: 'POST',
					});
				} catch (error) {
					console.warn(`Failed to start transcoding for video ${videoId}:`, error);
				}
			}

			alert('Course published successfully!');
			router.push('/admin/courses');
		} catch (error) {
			console.error('Error publishing course:', error);
			alert('Failed to publish course: ' + error.message);
		}
	};

	const updateCourseData = (updates) => {
		setCourseData(prev => ({ ...prev, ...updates }));
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
				return <ReviewPublishStep courseData={courseData} onPublish={handlePublish} onSaveDraft={handleSaveDraft} />;
			default:
				return null;
		}
	};

	return (
		<div className="flex min-h-screen bg-gray-900">
			<Sidebar />
			<div className="flex-1 ml-64">
				<TopHeader />
				<div className="p-6">
					{/* Header */}
					<div className="flex justify-between items-center mb-8">
						<h1 className="text-3xl font-bold text-white">Create New Course</h1>
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
							{currentStep === STEPS.length ? 'Publish Course' : 'Next'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

// Step Components
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
				<p className="text-sm text-gray-500 mt-1">
					{courseData.title.length}/120
				</p>
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
				<p className="text-sm text-gray-500 mt-1">
					{courseData.subtitle.length}/220
				</p>
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
				{courseData.thumbnailFile && (
					<div className="mt-2">
						<img
							src={URL.createObjectURL(courseData.thumbnailFile)}
							alt="Course thumbnail preview"
							className="w-32 h-18 object-cover rounded-lg border border-gray-600"
						/>
					</div>
				)}
			</div>
			<div>
				<label className="block text-sm font-medium text-gray-300 mb-2">
					Course Description *
				</label>
				<textarea
					value={courseData.description}
					onChange={(e) => updateCourseData({ description: e.target.value })}
					rows={6}
					className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder="Describe your course..."
				/>
			</div>
			<div>
				<label className="block text-sm font-medium text-gray-300 mb-2">
					What students will learn
				</label>
				<div className="space-y-2">
					{courseData.whatYouWillLearn.map((item, index) => (
						<input
							key={index}
							type="text"
							value={item}
							onChange={(e) => {
								const updated = [...courseData.whatYouWillLearn];
								updated[index] = e.target.value;
								updateCourseData({ whatYouWillLearn: updated });
							}}
							className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="Learning objective"
						/>
					))}
					<button
						onClick={() => updateCourseData({ whatYouWillLearn: [...courseData.whatYouWillLearn, ''] })}
						className="text-blue-400 hover:text-blue-300 text-sm"
					>
						+ Add learning objective
					</button>
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

function VideoUploadStep({ courseData, updateCourseData }) {
	const [uploading, setUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState({});
	const [selectedFiles, setSelectedFiles] = useState([]);
	const [uploadedVideos, setUploadedVideos] = useState(courseData.videos || []);
	const [transcodeStatus, setTranscodeStatus] = useState({});

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

				// Add to uploaded videos
				const newVideo = {
					hash: hash,
					filename: file.name,
					uploaded_at: new Date().toISOString(),
				};
				uploadedVideosList.push(newVideo);
			}

			// Update state with all uploaded videos
			const updatedVideos = [...uploadedVideos, ...uploadedVideosList];
			setUploadedVideos(updatedVideos);
			updateCourseData({ videos: updatedVideos });

			setSelectedFiles([]);
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
												{uploading && uploadProgress[index] !== undefined && ` (${uploadProgress[index]}%)`}
											</p>
										</div>
										{uploading && uploadProgress[index] !== undefined && (
											<div className="w-16 bg-gray-500 rounded-full h-1 ml-2">
												<div
													className="bg-blue-600 h-1 rounded-full transition-all duration-300"
													style={{ width: `${uploadProgress[index]}%` }}
												/>
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
													ID: {video.hash.slice(0, 8)}... | Uploaded: {new Date(video.uploaded_at).toLocaleDateString()}
												</p>
											</div>
											<button
												onClick={() => removeVideo(video.hash)}
												className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
											>
												Remove
											</button>
										</div>
										{status && (
											<div className="mt-2">
												<div className="flex items-center justify-between mb-1">
													<span className="text-sm text-gray-300">Transcoding:</span>
													<span className={`text-sm font-medium ${
														overallStatus === 'ok' ? 'text-green-400' :
														overallStatus === 'error' ? 'text-red-400' :
														overallStatus === 'running' ? 'text-blue-400' : 'text-yellow-400'
													}`}>
														{overallStatus === 'ok' ? 'Complete' :
														 overallStatus === 'error' ? 'Error' :
														 overallStatus === 'running' ? 'Processing...' :
														 overallStatus === 'stopped' ? 'Stopped' : 'Pending'}
													</span>
												</div>
												{totalQualities > 0 && (
													<div className="mb-2">
														<div className="w-full bg-gray-600 rounded-full h-2">
															<div
																className="bg-green-600 h-2 rounded-full transition-all duration-300"
																style={{ width: `${completedQualities / totalQualities * 100}%` }}
															/>
														</div>
														<p className="text-xs text-gray-400 mt-1">
															{completedQualities}/{totalQualities} qualities processed
														</p>
													</div>
												)}
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
																				qStatus.status === 'running' ? 'bg-blue-600' : 'bg-gray-500'
																			}`}
																			style={{ width: `${qStatus.progress || 0}%` }}
																		/>
																	</div>
																	<span className={`${
																		qStatus.status === 'ok' ? 'text-green-400' :
																		qStatus.status === 'error' ? 'text-red-400' :
																		qStatus.status === 'running' ? 'text-blue-400' : 'text-gray-400'
																	}`}>
																		{qStatus.status === 'ok' ? '✓' :
																		 qStatus.status === 'error' ? '✗' :
																		 qStatus.status === 'running' ? `${qStatus.progress || 0}%` : '...'}
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
				<div className="mt-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
					<h4 className="text-md font-medium text-blue-300 mb-2">Video Assignment</h4>
					<p className="text-sm text-gray-300">
						After uploading videos here, go to the "Course Structure" step to assign videos to specific lessons. Each video lesson can be linked to one of the uploaded videos above.
					</p>
				</div>
			</div>
		</div>
	);
}

function ReviewPublishStep({ courseData, onPublish, onSaveDraft }) {
	return (
		<div className="space-y-6">
			<div className="text-center">
				<h3 className="text-xl font-semibold text-white mb-4">Review Your Course</h3>
				<p className="text-gray-400">Please review all information before publishing.</p>
			</div>
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
										• {lesson.title} ({lesson.type}){lesson.video_id && <span className="text-blue-400"> - Video assigned</span>}
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			</div>
			<div className="flex justify-center space-x-4">
				<button
					onClick={onSaveDraft}
					className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
				>
					Save as Draft
				</button>
				<button
					onClick={onPublish}
					className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
				>
					Publish Course
				</button>
			</div>
		</div>
	);
}