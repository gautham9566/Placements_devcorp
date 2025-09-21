'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card';
import { Button } from '../../../../../components/ui/button';
import { ChevronLeft, Paperclip, Image, File, Send, X, AlertCircle, ChevronDown, ChevronUp, Info } from 'lucide-react';
import TicketComments from '../../TicketComments';
import { ticketsAPI, helpAuthAPI } from '../../../../../api/helpandsupport';
import { format } from 'date-fns';
import FeedbackModal from '../../FeedbackModal';

const TicketDetail = () => {
  const params = useParams();
  const ticketId = params.id;
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('comments');
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Format date with proper timezone
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return format(date, 'MMMM d, yyyy \'at\' h:mm a');
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  // Format time for chat messages
  const formatMessageTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return format(date, 'h:mm a');
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  };

  // Fetch ticket data
  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Ensure we're logged in
        await helpAuthAPI.ensureLoggedIn();
        
        // Fetch the ticket
        const ticketData = await ticketsAPI.getTicket(ticketId);
        setTicket(ticketData);
        
        // Fetch comments after ticket is loaded
        fetchComments(false); // Don't preserve local comments on initial load
      } catch (error) {
        console.error('Error fetching ticket:', error);
        setError('Failed to load ticket. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId]);

  // Fetch comments for the ticket
  const fetchComments = async (preserveLocalComments = false) => {
    try {
      setCommentsLoading(true);
      const response = await ticketsAPI.getComments(ticketId);
      console.log('Raw API response:', response);
      
      // Handle different response formats
      let commentsData = [];
      if (Array.isArray(response)) {
        commentsData = response;
      } else if (response && typeof response === 'object') {
        if (Array.isArray(response.data)) {
          commentsData = response.data;
        } else if (response.comments && Array.isArray(response.comments)) {
          commentsData = response.comments;
        } else if (response.results && Array.isArray(response.results)) {
          commentsData = response.results;
        }
      }
      
      // Get current user info for better direction determination
      const currentUser = localStorage.getItem('user') || sessionStorage.getItem('user');
      let currentUserData = null;
      if (currentUser) {
        try {
          currentUserData = JSON.parse(currentUser);
        } catch (e) {
          console.error('Error parsing current user data:', e);
        }
      }
      console.log('Current user data for comment processing:', currentUserData);
      
      // If preserving local comments, merge with existing comments
      if (preserveLocalComments) {
        const existingComments = comments.filter(c => c._isLocalComment);
        commentsData = [...existingComments.map(c => c._originalData), ...commentsData];
      }
      
      // Normalize the comment data structure
      const normalizedComments = commentsData.map(comment => {
        // Determine message direction based on message metadata or sender info
        let isSentMessage = false;
        
        console.log('Processing comment for direction:', comment);
        
        // Look for explicit direction indicators first
        if (comment.direction === 'sent' || comment.type === 'sent') {
          isSentMessage = true;
          console.log('Comment marked as sent by direction/type');
        } else if (comment.direction === 'received' || comment.type === 'received') {
          isSentMessage = false;
          console.log('Comment marked as received by direction/type');
        } else if (comment.sender_type === 'admin' || comment.from === 'admin' || comment.sender === 'admin') {
          isSentMessage = true;
          console.log('Comment marked as sent by sender_type/from/sender = admin');
        } else if (comment.sender_type === 'user' || comment.from === 'user' || comment.sender === 'user') {
          isSentMessage = false;
          console.log('Comment marked as received by sender_type/from/sender = user');
        } else if (comment.created_by === 'admin' || comment.user_type === 'admin') {
          isSentMessage = true;
          console.log('Comment marked as sent by created_by/user_type = admin');
        } else if (comment.created_by === 'user' || comment.user_type === 'user') {
          isSentMessage = false;
          console.log('Comment marked as received by created_by/user_type = user');
        } else {
          // Since we're in the admin interface, we need to determine if this comment
          // was sent by the current admin user or received from a user
          
          console.log('Current user data for this comment:', currentUserData);
          
          if (currentUserData) {
            // Check if the comment was created by the current admin user
            if (comment.created_by === currentUserData.id || comment.user_id === currentUserData.id) {
              isSentMessage = true;
              console.log('Comment marked as sent by current user ID match');
            } else if (currentUserData.user_type === 'admin' || currentUserData.role === 'admin') {
              // If current user is admin and comment doesn't match their ID,
              // it's likely a user message (received)
              isSentMessage = false;
              console.log('Comment marked as received (admin interface, not from current admin)');
            } else {
              isSentMessage = false;
              console.log('Comment marked as received (user interface)');
            }
          } else {
            // No user data available, try to infer from comment content or other clues
            // Look for admin-specific patterns in the content
            const adminPatterns = [
              'Thank you for your feedback',
              'Thank you for your patience',
              'Ticket status changed to',
              'Attached file:'
            ];
            
            // Also check for admin email patterns
            const adminEmailPatterns = [
              'admin@',
              'admin1@',
              'support@',
              'help@'
            ];
            
            const isAdminMessage = adminPatterns.some(pattern => 
              comment.content && comment.content.includes(pattern)
            ) || adminEmailPatterns.some(pattern => 
              comment.created_by_email && comment.created_by_email.includes(pattern)
            ) || adminEmailPatterns.some(pattern => 
              comment.user_email && comment.user_email.includes(pattern)
            );
            
            if (isAdminMessage) {
              isSentMessage = true;
              console.log('Comment marked as sent by admin pattern detection');
            } else {
              // Default to received (left side) when we can't determine
              isSentMessage = false;
              console.log('Comment marked as received (default fallback)');
            }
          }
        }
        
        const normalizedComment = {
          id: comment.id || comment._id || `comment-${Date.now()}-${Math.random()}`,
          content: comment.content || comment.message || comment.text || '',
          // For display: true = sent message (right side), false = received message (left side)
          is_sent: isSentMessage,
          created_at: comment.created_at || comment.createdAt || comment.timestamp || new Date().toISOString(),
          attachment: comment.attachment || comment.file || null,
          // Keep original data for debugging
          _originalData: comment,
          // Preserve local comment flag if it exists
          _isLocalComment: comment._isLocalComment || false
        };
        
        console.log('Final normalized comment:', normalizedComment);
        return normalizedComment;
      });
      
      console.log('Normalized comments:', normalizedComments);
      setComments(normalizedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Scroll to bottom of messages when new ones arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      // For non-image files, just show the file name
      setFilePreview(null);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    if ((!message.trim() && !selectedFile) || sendingMessage) return;
    
    try {
      setSendingMessage(true);
      
      // Send message content if there is text
      let newComment = null;
      if (message.trim()) {
        newComment = await ticketsAPI.addComment(ticketId, message.trim());
        console.log('New comment created:', newComment);
        
        // Add the new comment to the list immediately for better UX
        const formattedComment = {
          id: newComment.id || newComment._id || Date.now(),
          content: message.trim(),
          is_sent: true, // Messages we send are always sent messages (right side)
          created_at: new Date().toISOString(),
          _originalData: newComment,
          _isLocalComment: true // Mark as locally added comment
        };
        
        setComments(prevComments => [...prevComments, formattedComment]);
      }
      
      // Upload file if selected
      if (selectedFile) {
        const attachment = await ticketsAPI.addAttachment(ticketId, selectedFile);
        console.log('File uploaded:', attachment);
        
        // If we didn't send a text message with the file, create a comment about the attachment
        if (!message.trim()) {
          const fileComment = await ticketsAPI.addComment(
            ticketId, 
            `Attached file: ${selectedFile.name}`
          );
          
          // Add file comment with correct format
          const formattedFileComment = {
            id: fileComment.id || Date.now(),
            content: `Attached file: ${selectedFile.name}`,
            is_sent: true, // File uploads we send are sent messages (right side)
            created_at: new Date().toISOString(),
            attachment: {
              url: attachment.url || '#',
              filename: selectedFile.name,
              type: selectedFile.type,
              size: selectedFile.size
            },
            _originalData: fileComment,
            _isLocalComment: true // Mark as locally added comment
          };
          
          setComments(prevComments => [...prevComments, formattedFileComment]);
        }
      }
      
      // Clear the input after sending
      setMessage('');
      clearSelectedFile();
      
      // Refresh comments after a short delay to ensure server has processed everything
      // But preserve the locally added comments to prevent them from jumping sides
      setTimeout(() => {
        fetchComments(true); // Preserve local comments
      }, 1000); // Increased delay to ensure server processing
      
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle ticket status change
  const handleStatusChange = async (newStatus) => {
    try {
      await ticketsAPI.updateTicket(ticketId, { status: newStatus });
      
      // Update the ticket in state
      setTicket(prev => ({ ...prev, status: newStatus }));
      
      // Add a system comment about the status change
      await ticketsAPI.addComment(
        ticketId,
        `Ticket status changed to ${newStatus}`
      );
      
      // Refresh comments
      fetchComments(false);
      
    } catch (error) {
      console.error('Error updating ticket status:', error);
      alert('Failed to update ticket status. Please try again.');
    }
  };

  // Handle reassign ticket
  const handleReassign = async () => {
    // Implement reassignment functionality
    // This would typically open a modal to select a new assignee
    alert('Reassign functionality would open a user selection modal');
  };

  // Helper to check if feedback was already submitted (localStorage + backend)
  const checkFeedbackStatus = async (ticketId, userId) => {
    // Check localStorage first
    const feedbackKey = `ticket_feedback_${ticketId}_${userId}`;
    if (localStorage.getItem(feedbackKey)) return true;
    // Check backend
    try {
      const feedback = await ticketsAPI.checkFeedback(ticketId);
      if (feedback && feedback.user_id === userId) {
        localStorage.setItem(feedbackKey, '1');
        return true;
      }
    } catch (e) {}
    return false;
  };

  // Watch for ticket status change to 'resolved' and show feedback modal if not already submitted
  useEffect(() => {
    if (ticket && ticket.status === 'resolved') {
      const currentUser = localStorage.getItem('user');
      let userId = null;
      if (currentUser) {
        try { userId = JSON.parse(currentUser).id; } catch {}
      }
      if (userId && ticket.createdBy?.id === userId) {
        checkFeedbackStatus(ticket.id, userId).then((alreadySubmitted) => {
          setFeedbackSubmitted(alreadySubmitted);
          setShowFeedbackModal(!alreadySubmitted);
        });
      }
    } else {
      setShowFeedbackModal(false);
    }
  }, [ticket]);

  // Feedback submit handler
  const handleFeedbackSubmit = async ({ rating, comment }) => {
    setFeedbackLoading(true);
    const currentUser = localStorage.getItem('user');
    let userId = null;
    if (currentUser) {
      try { userId = JSON.parse(currentUser).id; } catch {}
    }
    try {
      await ticketsAPI.submitFeedback(ticket.id, { rating, comment });
      // Mark as submitted in localStorage
      if (userId) {
        localStorage.setItem(`ticket_feedback_${ticket.id}_${userId}`, '1');
      }
      setFeedbackSubmitted(true);
      setShowFeedbackModal(false);
    } catch (e) {
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Add polling useEffect for auto-refreshing comments
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await ticketsAPI.getComments(ticketId);
        let commentsData = [];
        if (Array.isArray(response)) {
          commentsData = response;
        } else if (response && typeof response === 'object') {
          if (Array.isArray(response.data)) {
            commentsData = response.data;
          } else if (response.comments && Array.isArray(response.comments)) {
            commentsData = response.comments;
          } else if (response.results && Array.isArray(response.results)) {
            commentsData = response.results;
          }
        }
        // Normalize the comment data structure (reuse your normalization logic)
        const normalizedComments = commentsData.map(comment => {
          let isSentMessage = false;
          // ... (copy your normalization logic here, or call a helper if possible)
          if (comment.direction === 'sent' || comment.type === 'sent') {
            isSentMessage = true;
          } else if (comment.direction === 'received' || comment.type === 'received') {
            isSentMessage = false;
          } else if (comment.sender_type === 'admin' || comment.from === 'admin' || comment.sender === 'admin') {
            isSentMessage = true;
          } else if (comment.sender_type === 'user' || comment.from === 'user' || comment.sender === 'user') {
            isSentMessage = false;
          } else if (comment.created_by === 'admin' || comment.user_type === 'admin') {
            isSentMessage = true;
          } else if (comment.created_by === 'user' || comment.user_type === 'user') {
            isSentMessage = false;
          }
          return {
            id: comment.id || comment._id || `comment-${Date.now()}-${Math.random()}`,
            content: comment.content || comment.message || comment.text || '',
            is_sent: isSentMessage,
            created_at: comment.created_at || comment.createdAt || comment.timestamp || new Date().toISOString(),
            attachment: comment.attachment || comment.file || null,
            _originalData: comment,
            _isLocalComment: comment._isLocalComment || false
          };
        });
        // Only update state if there are new comments
        setComments(prevComments => {
          // Get all existing IDs
          const existingIds = new Set(prevComments.map(c => c.id));
          // Filter out comments that are already present
          const newOnes = normalizedComments.filter(c => !existingIds.has(c.id));
          if (newOnes.length === 0) return prevComments; // No new comments
          // Merge and sort
          const merged = [...prevComments, ...newOnes];
          return merged.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        });
      } catch (e) {
        // Optionally handle error
      }
    }, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [ticketId]);

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/helpandsupport/tickets">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Loading...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 pb-8">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/helpandsupport/tickets">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Error</h1>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-500">{error}</p>
            <Button className="mt-4" asChild>
              <Link href="/admin/helpandsupport/tickets">Back to Tickets</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="space-y-6 pb-8">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/helpandsupport/tickets">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Ticket Not Found</h1>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">The requested ticket could not be found.</p>
            <Button className="mt-4" asChild>
              <Link href="/admin/helpandsupport/tickets">Back to Tickets</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 mt-16">
      {/* Added mt-16 to push content below the fixed admin dashboard bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/helpandsupport">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight truncate">Ticket #{ticket.id}</h1>
        </div>

        <span className="px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded-md font-medium">
          {ticket.status}
        </span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column - main content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Chat Interface with Ticket Details Hover */}
          <Card className="shadow-md">
            <div className="flex flex-col h-[680px]">
              {/* Chat Header with Ticket Info Button */}
              <div className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-lg">Conversation</h3>
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 text-xs"
                        onClick={() => setShowTicketDetails(!showTicketDetails)}
                      >
                        <Info className="h-4 w-4" />
                        Ticket Details
                      </Button>
                      
                      {/* Ticket Details Popup */}
                      {showTicketDetails && (
                        <div className="absolute top-full left-0 mt-2 z-50 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-lg">{ticket.title}</h4>
                            <button 
                              onClick={() => setShowTicketDetails(false)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          
                          <div className="mb-3 flex gap-2">
                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full font-medium">
                              {ticket.priority}
                            </span>
                            <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full font-medium">
                              {ticket.category}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-700 mb-3 whitespace-pre-line">
                            {ticket.description}
                          </p>
                          
                          <div className="text-xs text-gray-500 border-t pt-2 mt-2">
                            <p>Created: {formatDate(ticket.createdAt)}</p>
                            <p>Assigned to: {ticket.assignedTo?.name || 'admin'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      className="text-xs bg-gray-100 px-3 py-1.5 rounded-full text-gray-600 hover:bg-gray-200 transition"
                      onClick={() => {
                        setMessage("Thank you for your feedback");
                      }}
                    >
                      Thank you for your feedback
                    </button>
                    <button 
                      className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-200 transition"
                      onClick={() => {
                        setMessage("Thank you for your patience");
                      }}
                    >
                      Thank you for your patience
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Messages */}
              <div className="flex-1 p-6 space-y-6 overflow-y-auto ">
                {/* System Message with Ticket Info */}
                <div className="flex justify-center">
                  <div className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm max-w-md text-center">
                    <p>Ticket #{ticket.id} opened - {ticket.title}</p>
                    <p className="text-xs text-gray-500 mt-1">Click on "Ticket Details" to view more information</p>
                  </div>
                </div>
                
                {/* Render actual comments */}
                {commentsLoading ? (
                  <div className="flex justify-center">
                    <div className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm">
                      Loading comments...
                    </div>
                  </div>
                ) : comments && comments.length > 0 ? (
                  [...comments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((comment, index) => {
                    // Log each comment as it's being rendered for debugging
                    console.log(`Rendering comment ${index}:`, comment);
                    console.log(`Original data for comment ${index}:`, comment._originalData);
                    
                    // Determine alignment: sent messages (right), received messages (left)
                    const commentClass = comment.is_sent ? 'justify-end' : 'justify-start';
                    console.log(`Comment ${index} direction:`, commentClass, 'is_sent:', comment.is_sent);
                    
                    return (
                      <div key={comment.id || index} className={`flex ${commentClass}`}>
                        <div className={`${comment.is_sent 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white border border-gray-200 shadow-sm'} px-4 py-3 rounded-lg max-w-md`}
                        >
                          <p>{comment.content}</p>
                          <div className={`text-xs ${comment.is_sent ? 'text-blue-100' : 'text-gray-400'} mt-1 text-right`}>
                            {formatMessageTime(comment.created_at || comment.createdAt)}
                          </div>
                          
                          {/* Render attachment if present */}
                          {comment.attachment && (
                            <div className={`mt-2 p-1 rounded ${comment.is_sent ? 'bg-white' : 'bg-gray-100'}`}>
                              {comment.attachment.type?.startsWith('image/') ? (
                                <img 
                                  src={comment.attachment.url} 
                                  alt="Attachment" 
                                  className="rounded max-w-xs w-full h-auto" 
                                />
                              ) : (
                                <div className="flex items-center p-2 rounded bg-gray-100">
                                  <File className="h-6 w-6 text-blue-600 mr-2" />
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">{comment.attachment.filename}</div>
                                    <div className="text-xs text-gray-500">
                                      {comment.attachment.type} • {Math.round(comment.attachment.size / 1024)} KB
                                    </div>
                                  </div>
                                  <a 
                                    href={comment.attachment.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    Download
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex justify-center">
                    <div className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm">
                      No comments yet. Start the conversation!
                    </div>
                  </div>
                )}
                
                {/* Invisible element to scroll to */}
                <div ref={messagesEndRef} />
              </div>
              
              {/* File Preview Area (visible only when a file is selected) */}
              {selectedFile && (
                <div className="p-4 bg-blue-50 border-t border-blue-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {filePreview ? (
                        <div className="w-16 h-16 rounded border overflow-hidden mr-3 bg-white flex items-center justify-center">
                          <img src={filePreview} alt="Preview" className="max-w-full max-h-full" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded border bg-gray-100 flex items-center justify-center mr-3">
                          <File className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={clearSelectedFile}
                      className="p-1 hover:bg-blue-100 rounded-full"
                    >
                      <X className="h-5 w-5 text-blue-600" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Message Input with Attachment Option */}
              <div className="p-4 bg-white">
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => fileInputRef.current.click()}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-blue-600 transition-colors"
                    title="Attach file"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <input 
                    type="text" 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..." 
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={sendingMessage}
                  />
                  <button 
                    className={`${sendingMessage 
                      ? 'bg-blue-300' 
                      : 'bg-blue-500 hover:bg-blue-600'} text-white p-2 rounded-lg transition-colors flex items-center justify-center`
                    }
                    onClick={handleSendMessage}
                    disabled={sendingMessage}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                  
                  {/* Hidden file input */}
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />
                </div>
                <div className="mt-2 text-xs text-gray-500 pl-2">
                  Supported formats: Images, PDF, DOC, XLSX, TXT (Max: 10MB)
                </div>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Right column - Ticket info */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Ticket Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Submitted By</p>
                <div className="flex items-center space-x-2">
                  <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                    {ticket.createdBy?.name?.charAt(0) || 'a'}
                  </div>
                  <span className="text-sm font-medium">{ticket.createdBy?.name || 'admin1'}</span>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 mb-1">Assigned To</p>
                <div className="flex items-center space-x-2">
                  <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                    {ticket.assignedTo?.name?.charAt(0) || 'a'}
                  </div>
                  <span className="text-sm font-medium">{ticket.assignedTo?.name || 'admin'}</span>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 mb-1">Created At</p>
                <p className="text-sm">{formatDate(ticket.createdAt)}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 mb-1">Last Updated</p>
                <p className="text-sm">{formatDate(ticket.updatedAt)}</p>
              </div>
              
              <div className="pt-2">
                <Button 
                  className="w-full"
                  onClick={() => handleStatusChange(ticket.status === 'open' ? 'resolved' : 'open')}
                >
                  {ticket.status === 'open' ? 'Mark as Resolved' : 'Reopen Ticket'}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full mt-2"
                  onClick={handleReassign}
                >
                  Reassign Ticket
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Feedback Modal */}
      <FeedbackModal
        open={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={handleFeedbackSubmit}
        loading={feedbackLoading}
      />
    </div>
  );
};

export default TicketDetail;