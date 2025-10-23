"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  X,
  Mail,
  Phone,
  Smartphone,
  Linkedin,
  GraduationCap,
  Star,
  MapPin,
  Tag,
  MessageSquare,
  FileText,
  Send,
  XCircle,
  Clock,
  CheckCircle,
  Circle,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import {
  getCandidateCard,
  getCandidateComments,
  getCandidateHistory,
  addCandidateComment,
  updateCandidateCard,
  moveCandidateStage,
  getSharedBoard,
} from '@/api/ats.js';

// Dynamically import PDFViewer to avoid SSR issues with react-pdf
const PDFViewer = dynamic(() => import('../../../../components/PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-600">Loading PDF viewer...</p>
      </div>
    </div>
  ),
});

export default function CandidateDetailModal({ candidate: initialCandidate, onClose, onUpdate }) {
  const params = useParams();
  const router = useRouter();
  const routeCandidateId = params?.candidateId;
  const token = params?.token;

  // If neither a prop candidate nor route candidateId is available yet, show initial loading
  if (!initialCandidate && !routeCandidateId) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-0">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-full h-[80vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading candidate details...</p>
          </div>
        </div>
      </div>
    );
  }

  const [candidate, setCandidate] = useState(initialCandidate || {});
  const [isFetching, setIsFetching] = useState(false);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('summary'); // summary, skills
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(initialCandidate?.rating || 0);
  const [stages, setStages] = useState([]);
  const [permissionLevel, setPermissionLevel] = useState('VIEW');
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    loadCandidateDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate?.id, routeCandidateId]);

  const loadCandidateDetails = async () => {
    const idToLoad = candidate?.id || routeCandidateId;
    if (!idToLoad) return;

    setIsFetching(true);
    try {
      // Load candidate details, comments, history, and shared board data
      const [candidateRes, commentsRes, historyRes, sharedBoardRes] = await Promise.all([
        getCandidateCard(idToLoad),
        getCandidateComments(idToLoad),
        getCandidateHistory(idToLoad),
        token ? getSharedBoard(token) : Promise.resolve(null),
      ]);

      if (candidateRes.data) {
        setCandidate(candidateRes.data);
        setRating(candidateRes.data.rating || 0);
      }
      if (commentsRes.data) setComments(commentsRes.data);
      if (historyRes.data) setHistory(historyRes.data);
      
      // Set pipeline data and permission level if available
      if (sharedBoardRes?.data?.board?.stages) {
        setStages(sharedBoardRes.data.board.stages);
      }
      if (sharedBoardRes?.data?.link?.permission_level) {
        setPermissionLevel(sharedBoardRes.data.link.permission_level);
      }
      
    } catch (err) {
      console.error('Failed to load candidate details:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      setLoading(true);
      const idToUse = candidate?.id || routeCandidateId;
      if (!idToUse) throw new Error('Candidate ID is not available');
      await addCandidateComment(idToUse, {
        content: newComment,
        is_internal: true,
      });
      setNewComment('');
      await loadCandidateDetails();
    } catch (err) {
      console.error('Failed to add comment:', err);
      alert('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveToNextStage = async () => {
    if (!candidate || !candidate.current_stage || !stages.length) return;

    setIsMoving(true);
    try {
      // Find current stage index
      const currentStageIndex = stages.findIndex(stage => stage.id === candidate.current_stage);
      if (currentStageIndex === -1 || currentStageIndex === stages.length - 1) {
        // Already in the last stage
        alert('Candidate is already in the final stage');
        return;
      }

      const nextStage = stages[currentStageIndex + 1];

      await moveCandidateStage(candidate.id, {
        candidate_id: candidate.id,
        from_stage_id: candidate.current_stage,
        to_stage_id: nextStage.id,
      });

      // Reload candidate details to get updated data
      await loadCandidateDetails();
    } catch (error) {
      console.error('Failed to move candidate:', error);
      alert('Failed to move candidate to next stage. Please try again.');
    } finally {
      setIsMoving(false);
    }
  };

  const handleMoveToPreviousStage = async () => {
    if (!candidate || !candidate.current_stage || !stages.length) return;

    setIsMoving(true);
    try {
      // Find current stage index
      const currentStageIndex = stages.findIndex(stage => stage.id === candidate.current_stage);
      if (currentStageIndex === -1 || currentStageIndex === 0) {
        // Already in the first stage
        alert('Candidate is already in the first stage');
        return;
      }

      const previousStage = stages[currentStageIndex - 1];

      await moveCandidateStage(candidate.id, {
        candidate_id: candidate.id,
        from_stage_id: candidate.current_stage,
        to_stage_id: previousStage.id,
      });

      // Reload candidate details to get updated data
      await loadCandidateDetails();
    } catch (error) {
      console.error('Failed to move candidate:', error);
      alert('Failed to move candidate to previous stage. Please try again.');
    } finally {
      setIsMoving(false);
    }
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, i) => (
      <button
        key={i}
        onClick={() => handleRatingChange(i + 1)}
        className="focus:outline-none"
      >
        <Star
          className={`w-5 h-5 ${
            i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          } hover:fill-yellow-300 hover:text-yellow-300 transition-colors`}
        />
      </button>
    ));
  };

  const getStageStatus = (stageName) => {
    // Determine status based on candidate's current position in the full pipeline
    if (!stages.length || !candidate.stage_name) return 'pending';

    const currentStageIndex = stages.findIndex(stage => stage.id === candidate.current_stage);
    const targetStageIndex = stages.findIndex(stage => stage.name === stageName);

    if (targetStageIndex === -1) return 'pending';
    if (targetStageIndex < currentStageIndex) return 'completed';
    if (targetStageIndex === currentStageIndex) return 'active';
    return 'pending';
  };

  const getFilteredPipelineStages = () => {
    // Return all stages from the recruitment pipeline
    return stages;
  };

  return (
    <div className='w-full min-h-screen flex-1 p-0'>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-full h-[90vh] flex flex-col mx-auto">
        {isFetching && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-2"></div>
              <p className="text-sm text-white">Loading candidate...</p>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center gap-4 p-6 border-b border-gray-200">
          <button
            onClick={() => {
              if (onClose) onClose();
              else router.back();
            }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            {candidate?.candidate_name || 'Candidate'} - {candidate?.job_title || '—'}
          </h2>
        </div>

        {/* Main Content */}
  <div className="flex-1 overflow-hidden flex w-full">
          {/* Left Panel - Candidate Information */}
          <div className="basis-1/3 border-r border-gray-200 overflow-y-auto p-6 space-y-6 min-w-0">
            {/* Personal Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                Contact Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <a href={`mailto:${candidate.candidate_email}`} className="text-blue-600 hover:underline">
                    {candidate.candidate_email || 'Not provided'}
                  </a>
                </div>
                {candidate.candidate_phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${candidate.candidate_phone}`} className="text-gray-700">
                      {candidate.candidate_phone}
                    </a>
                  </div>
                )}
                {candidate.candidate_id && (
                  <div className="flex items-center gap-3 text-sm">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">ID: {candidate.candidate_id}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Job & Company Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Position</h3>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-gray-500">Job Title: </span>
                  <span className="text-gray-700 font-medium">{candidate.job_title || 'Not specified'}</span>
                </div>
                {candidate.company_name && (
                  <div className="text-sm">
                    <span className="text-gray-500">Company: </span>
                    <span className="text-gray-700 font-medium">{candidate.company_name}</span>
                  </div>
                )}
                {candidate.job_location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">{candidate.job_location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Current Stage */}
            {candidate.stage_name && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Current Stage</h3>
       <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
         style={{ backgroundColor: candidate?.stage_color ? `${candidate.stage_color}20` : undefined, color: candidate?.stage_color || undefined }}>
                  {candidate.stage_name}
                </div>
                {candidate.time_in_stage && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>Time in stage: {candidate.time_in_stage}</span>
                  </div>
                )}
              </div>
            )}

            {/* Interviewers */}
            {candidate.interviewers && candidate.interviewers.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Interviewers</h3>
                <div className="space-y-2">
                  {candidate.interviewers.map((interviewer, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium">
                        {interviewer.avatar}
                      </div>
                      <span className="text-sm text-gray-700">{interviewer.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recruiter */}
            {candidate.recruiter && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Recruiter</h3>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-sm font-medium">
                    {candidate.recruiter.avatar}
                  </div>
                  <span className="text-sm text-gray-700">{candidate.recruiter.name}</span>
                </div>
              </div>
            )}

            {/* Star Rating */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Evaluation</h3>
              <div className="flex items-center gap-1">{renderStars()}</div>
            </div>

            {/* Source & Medium */}
            <div className="space-y-3">
              {candidate.source && (
                <div>
                  <label className="text-xs text-gray-500">Source</label>
                  <p className="text-sm text-gray-700">{candidate.source}</p>
                </div>
              )}
              {candidate.medium && (
                <div>
                  <label className="text-xs text-gray-500">Medium</label>
                  <p className="text-sm text-gray-700">{candidate.medium}</p>
                </div>
              )}
              {candidate.referred_by && (
                <div>
                  <label className="text-xs text-gray-500">Referred By</label>
                  <p className="text-sm text-gray-700">{candidate.referred_by}</p>
                </div>
              )}
            </div>

            {/* Availability */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Availability</h3>
              <span className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                {candidate.availability_status || 'Directly Available'}
              </span>
            </div>

            {/* Tags */}
            {candidate.tags && candidate.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {candidate.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Center Panel - Job Details & Actions */}
          <div className="flex-1 overflow-y-auto p-6 min-w-0">
            {/* Action Buttons */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={handleMoveToPreviousStage}
                disabled={isMoving}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Refuse
              </button>
              {(permissionLevel === 'EDIT' || permissionLevel === 'FULL') && (
                <button
                  onClick={handleMoveToNextStage}
                  disabled={isMoving}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isMoving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Moving...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      Move to Next Stage
                    </>
                  )}
                </button>
              )}
              <div className="ml-auto text-sm text-gray-600">
                Current Stage: {candidate.stage_name || 'Unknown'}
              </div>
            </div>

            {/* Job & Contract Section */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="text-xs text-gray-500 uppercase">Applied Job</label>
                <p className="text-sm font-medium text-gray-900">{candidate.job_title || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase">Company</label>
                <p className="text-sm font-medium text-gray-900">
                  {candidate.company_name || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase">Expected Salary</label>
                <p className="text-sm font-medium text-gray-900">
                  {candidate.expected_salary ? `$${candidate.expected_salary.toLocaleString()}` : 'Not specified'}
                </p>
                {candidate.extra_advantages && (
                  <p className="text-xs text-gray-600">{candidate.extra_advantages}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase">Proposed Salary</label>
                <p className="text-sm font-medium text-gray-900">
                  {candidate.proposed_salary ? `$${candidate.proposed_salary.toLocaleString()}` : 'Not specified'}
                </p>
              </div>
              {candidate.applied_at && (
                <div>
                  <label className="text-xs text-gray-500 uppercase">Applied On</label>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(candidate.applied_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-4">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'summary'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Application Summary
                </button>
                <button
                  onClick={() => setActiveTab('skills')}
                  className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'skills'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Skills
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 max-h-60 overflow-y-auto">
              {activeTab === 'summary' && (
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700">
                    {candidate.notes || 'No application notes available.'}
                  </p>
                </div>
              )}
              {activeTab === 'skills' && (
                <div className="flex flex-wrap gap-2">
                  {candidate.tags && candidate.tags.length > 0 ? (
                    candidate.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No skills/tags specified</p>
                  )}
                </div>
              )}
            </div>

            {/* Pipeline Status Bar */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Recruitment Pipeline</h3>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {getFilteredPipelineStages().map((stage, index) => {
                  const status = getStageStatus(stage.name);
                  return (
                    <div key={stage.id} className="flex items-center flex-shrink-0">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            status === 'completed'
                              ? 'bg-green-100 text-green-600'
                              : status === 'active'
                              ? 'bg-purple-100 text-purple-600'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {status === 'completed' ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : status === 'active' ? (
                            <Clock className="w-5 h-5" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </div>
                        <span className="text-xs text-gray-600 mt-1">
                          {stage.name}
                        </span>
                      </div>
                      {index < getFilteredPipelineStages().length - 1 && (
                        <div
                          className={`h-0.5 w-12 mx-2 ${
                            status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Comments Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Comments ({comments.length})
              </h3>
              <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                        {comment.author_avatar}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {comment.author_name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                ))}
              </div>

              {/* Add Comment */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder="Add a comment..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleAddComment}
                  disabled={loading || !newComment.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel - Resume Viewer */}
          <div className="basis-1/3 border-l border-gray-200 overflow-y-auto bg-gray-50 min-w-0">
            {candidate.resume_url ? (
              <PDFViewer resumeUrl={candidate.resume_url} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <FileText className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No Resume Available</h3>
                <p className="text-sm text-gray-500">
                  This candidate hasn't uploaded a resume yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
