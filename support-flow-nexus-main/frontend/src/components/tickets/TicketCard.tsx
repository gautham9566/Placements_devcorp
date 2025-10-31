import React from 'react';
import { Link } from 'react-router-dom';
import { Ticket } from '@/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface TicketCardProps {
  ticket: Ticket;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket }) => {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'open':
        return 'ticket-status-open';
      case 'in-progress':
        return 'ticket-status-in-progress';
      case 'resolved':
        return 'ticket-status-resolved';
      default:
        return '';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'ticket-priority-high';
      case 'medium':
        return 'ticket-priority-medium';
      case 'low':
        return 'ticket-priority-low';
      default:
        return '';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <Link to={`/tickets/${ticket.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-lg font-semibold line-clamp-1">{ticket.title}</h3>
              <div className="flex gap-2 flex-wrap mt-1">
                <Badge variant="outline" className={getPriorityBadgeVariant(ticket.priority)}>
                  {ticket.priority}
                </Badge>
                <Badge className={getStatusBadgeVariant(ticket.status)}>
                  {ticket.status.replace('-', ' ')}
                </Badge>
                <Badge variant="outline">{ticket.category.replace('-', ' ')}</Badge>
              </div>
            </div>
          </div>

          
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3 mb-2">{ticket.description}</p>
        </CardContent>
        <CardFooter className="border-t pt-3 flex justify-between">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Avatar className="h-6 w-6">
              <AvatarImage src={ticket.createdBy?.avatar} />
              <AvatarFallback>{ticket.createdBy?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <span>{ticket.createdBy?.name}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(ticket.createdAt)}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
};

export default TicketCard;
