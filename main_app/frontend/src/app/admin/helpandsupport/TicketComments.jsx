'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ticketsAPI } from '../../../api/helpandsupport';

const TicketComments = ({ ticket }) => {
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchComments = async () => {
    if (!ticket || !ticket.id) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await ticketsAPI.getComments(ticket.id);
      
      // Handle different response formats
      let commentData = [];
      if (Array.isArray(response)) {
        commentData = response;
      } else if (response.data && Array.isArray(response.data)) {
        commentData = response.data;
      } else if (response.results && Array.isArray(response.results)) {
        commentData = response.results;
      }
      
      setComments(commentData);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    setIsSubmitting(true);
    try {
      await ticketsAPI.addComment(ticket.id, comment);
      setComment('');
      // Refetch comments to show the new one
      await fetchComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add your comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch comments when ticket changes
  useEffect(() => {
    if (ticket?.id) {
      fetchComments();
    }
  }, [ticket?.id]);

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'N/A';
      
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateString);
        return 'Invalid date';
      }
      
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error('Error formatting date:', error, 'for date string:', dateString);
      return 'Invalid date';
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Discussion</h3>
      
      {/* Comment form */}
      <div className="space-y-4">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full min-h-[100px] px-3 py-3 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
          rows={4}
        />
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || !comment.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
        >
          {isSubmitting ? 'Posting...' : 'Post Comment'}
        </Button>
      </div>
      
      {/* Loading and error states */}
      {loading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-blue-500"></div>
          <p className="mt-2 text-sm text-gray-500">Loading comments...</p>
        </div>
      )}
      
      {error && !loading && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md">
          {error}
          <Button 
            onClick={fetchComments} 
            variant="link" 
            className="text-red-700 underline pl-2"
          >
            Retry
          </Button>
        </div>
      )}
      
      {/* Comments list */}
      <div className="space-y-4 mt-8">
        {!loading && !error && Array.isArray(comments) && comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium">
                  {(comment.user?.name || comment.user?.username || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {comment.user?.name || comment.user?.username || 'Anonymous'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(comment.created_at || comment.createdAt)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          !loading && !error && (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default TicketComments;
