"use client";

import React, { useState, useEffect } from 'react';

/**
 * CommentsSection Component
 * 
 * A reusable component for displaying and managing comments on videos and courses.
 * Features:
 * - Display nested comments with replies
 * - Add new comments
 * - Reply to existing comments
 * - View comment timestamps
 * - Admin indicators for admin replies
 * - Expandable/collapsible comments section
 * - Expandable/collapsible replies for each comment
 * - Filter comments by scope (all comments or current video only for courses)
 * 
 * @param {Object} props
 * @param {string} props.contentType - Type of content ('video' or 'course')
 * @param {string} props.contentId - ID of the content (video hash or course id)
 * @param {string} props.lmsUsername - Username of the current user
 * @param {boolean} props.isAdmin - Whether the current user is an admin
 * @param {string} props.currentVideoId - Current video ID (for course filtering)
 * @param {boolean} props.defaultExpanded - Whether comments should be expanded by default
 */
export default function CommentsSection({ contentType, contentId, lmsUsername, isAdmin = false, currentVideoId = null, defaultExpanded = false }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // comment id being replied to
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(defaultExpanded);
  const [expandedReplies, setExpandedReplies] = useState(new Set()); // Set of comment ids with expanded replies
  const [commentFilter, setCommentFilter] = useState('all'); // 'all' or 'current_video'
  const [showCommentInput, setShowCommentInput] = useState(false); // Separate state for comment input

  useEffect(() => {
    if (contentType && contentId) {
      fetchComments();
    }
  }, [contentType, contentId, commentFilter, currentVideoId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      let url = `/api/engagement/comments?content_type=${contentType}&content_id=${contentId}`;
      
      // For courses, add video_id filter if filtering by current video
      if (contentType === 'course' && commentFilter === 'current_video' && currentVideoId) {
        url += `&video_id=${currentVideoId}`;
      }
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      } else {
        console.error('Failed to fetch comments');
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim() || !lmsUsername) return;

    try {
      setSubmitting(true);
      const commentData = {
        lms_username: lmsUsername,
        content_type: contentType,
        content_id: contentId,
        comment_text: newComment.trim(),
        is_admin_reply: isAdmin,
      };
      
      // For courses, include the current video ID
      if (contentType === 'course' && currentVideoId) {
        commentData.video_id = currentVideoId;
      }
      
      const response = await fetch('/api/engagement/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commentData),
      });

      if (response.ok) {
        setNewComment('');
        setShowCommentInput(false); // Hide comment input after successful submission
        await fetchComments(); // Refresh comments
      } else {
        console.error('Failed to submit comment');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId) => {
    if (!replyText.trim() || !lmsUsername) return;

    try {
      setSubmitting(true);
      const replyData = {
        lms_username: lmsUsername,
        content_type: contentType,
        content_id: contentId,
        comment_text: replyText.trim(),
        parent_id: parentId,
        is_admin_reply: isAdmin,
      };
      
      // For courses, include the current video ID
      if (contentType === 'course' && currentVideoId) {
        replyData.video_id = currentVideoId;
      }
      
      const response = await fetch('/api/engagement/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(replyData),
      });

      if (response.ok) {
        setReplyText('');
        setReplyingTo(null);
        await fetchComments(); // Refresh comments
      } else {
        console.error('Failed to submit reply');
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return dateString;
    }
  };

  const renderComment = (comment, isReply = false) => (
    <div 
      key={comment.id} 
      className={`${isReply ? 'mt-3' : 'mb-6'}`}
    >
      <div className="flex items-start space-x-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-semibold text-sm">
            {comment.lms_username?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-semibold text-sm text-gray-900 dark:text-white">
                {comment.lms_username}
              </span>
              {comment.is_admin_reply && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                  Admin
                </span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatDate(comment.created_at)}
              </span>
            </div>
            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
              {comment.comment_text}
            </p>
          </div>

          {/* Reply Button */}
          {!isReply && (
            <button
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Reply
            </button>
          )}

          {/* Reply Form */}
          {replyingTo === comment.id && (
            <div className="mt-3 ml-1">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  // Prevent video player from capturing space key
                  e.stopPropagation();
                }}
                placeholder="Write a reply..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              <div className="flex justify-end space-x-2 mt-2">
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyText('');
                  }}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubmitReply(comment.id)}
                  disabled={submitting || !replyText.trim()}
                  className="px-4 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Posting...' : 'Reply'}
                </button>
              </div>
            </div>
          )}

          {/* Nested Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => toggleReplies(comment.id)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline mb-2"
              >
                {expandedReplies.has(comment.id) ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
              </button>
              {expandedReplies.has(comment.id) && (
                <div className="flex flex-wrap gap-3">
                  {comment.replies.map(reply => renderComment(reply, true))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {/* Comments Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center justify-between cursor-pointer hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm dark:hover:shadow-md rounded-lg px-4 py-3 transition-all duration-200 border border-transparent hover:border-blue-200 dark:hover:border-gray-700 flex-1 mr-4"
              onClick={() => setCommentsExpanded(!commentsExpanded)}
            >
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  Comments
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                </p>
              </div>
              <svg
                className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${commentsExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            <div className="flex items-center space-x-3">
              {/* Filter dropdown for courses */}
              {contentType === 'course' && (
                <div className="relative">
                  <select
                    value={commentFilter}
                    onChange={(e) => setCommentFilter(e.target.value)}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 dark:border-gray-600"
                    disabled={!currentVideoId && commentFilter === 'current_video'}
                  >
                    <option value="all">All Course Comments</option>
                    <option value="current_video" disabled={!currentVideoId}>
                      {currentVideoId ? 'Current Video Comments' : 'Select a Video First'}
                    </option>
                  </select>
                </div>
              )}

              {/* Add Comment Button */}
              <button
                onClick={() => setShowCommentInput(!showCommentInput)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showCommentInput
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {showCommentInput ? 'Cancel' : 'Add Comment'}
              </button>
            </div>
          </div>
        </div>

        {/* Comments List */}
        {(commentsExpanded || showCommentInput) && (
          <div className="px-6 pb-6">
            {/* New Comment Form */}
            {showCommentInput && (
              <div className="mb-8">
                <form onSubmit={handleSubmitComment}>
                  <div className="flex items-start space-x-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-sm">
                        {lmsUsername?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>

                    {/* Input */}
                    <div className="flex-1">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          // Prevent video player from capturing space key
                          e.stopPropagation();
                        }}
                        placeholder="Add a comment..."
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                      />
                      <div className="flex justify-end mt-2 space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCommentInput(false);
                            setNewComment('');
                          }}
                          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitting || !newComment.trim()}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {submitting ? 'Posting...' : 'Comment'}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {commentsExpanded && (
              <>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-12">
                    <svg
                      className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    <p className="text-gray-600 dark:text-gray-400">
                      No comments yet. Be the first to comment!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {comments.map(comment => renderComment(comment))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
