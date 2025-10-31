
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTickets } from '@/contexts/TicketContext';
import { Ticket, Comment } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { ticketsAPI } from '@/services/api';

interface TicketCommentsProps {
  ticket: Ticket;
}

const TicketComments: React.FC<TicketCommentsProps> = ({ ticket }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { addComment } = useTickets();
  const { toast } = useToast();

  const fetchComments = async () => {
    try {
      const data = await ticketsAPI.getComments(ticket.id);
      // Sort comments by date in descending order (newest first)
      const sortedComments = data
        .map(comment => ({
          ...comment,
          userName: comment.user?.name || 'Unknown User',
          userAvatar: comment.user?.avatar || '',
          userId: comment.user?.id || '',
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setComments(sortedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch comments',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    setIsSubmitting(true);
    try {
      const newComment = await addComment(ticket.id, comment);
      // Add the new comment at the beginning of the array
      setComments(prev => [
        {
          ...newComment,
          userName: user?.name || 'Unknown User',
          userAvatar: user?.avatar || '',
          userId: user?.id || '',
        },
        ...prev
      ]);
      setComment('');
      toast({
        title: 'Comment Added',
        description: 'Your comment has been added successfully',
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'There was an error adding your comment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch comments when component mounts
  useEffect(() => {
    fetchComments();
  }, [ticket.id]);

  // Add debug logging
  useEffect(() => {
    console.log('Current comments:', comments);
  }, [comments]);

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'N/A';
      
      // Parse the backend date format (YYYY-MM-DDTHH:mm:ss.SSSSSS)
      const date = new Date(dateString);
      
      // Validate the date
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
      
      {/* Comment form - only show if ticket is not resolved */}
      {ticket.status !== 'resolved' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment..."
            className="min-h-[100px]"
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </Button>
        </form>
      )}
      
      {/* Comments list */}
      <div className="space-y-4 mt-6">
        {Array.isArray(comments) && comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <Avatar>
                    <AvatarImage src={comment.user?.avatar} />
                    <AvatarFallback>{(comment.user?.name || 'U').charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{comment.user?.name || 'Unknown User'}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(comment.createdAt)}
                    </div>
                  </div>
                </div>
                {user && user.id === comment.user?.id && (
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                )}
              </div>
              <p className="text-sm whitespace-pre-line">{comment.content}</p>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground text-center py-4">No comments yet</p>
        )}
      </div>
    </div>
  );
};

export default TicketComments;
