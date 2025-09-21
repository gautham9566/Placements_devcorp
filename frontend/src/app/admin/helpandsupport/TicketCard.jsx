'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '../../../components/ui/card';
import { formatDistanceToNow } from 'date-fns';

const TicketCard = ({ ticket }) => {
  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityBadgeVariant = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
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

  // Get the creator's name from various possible fields
  const getCreatorName = () => {
    const creator = ticket.createdBy || ticket.created_by;
    if (creator) {
      return creator.name || creator.username || creator.email || 'Unknown User';
    }
    return 'Unknown User';
  };

  // Get the creator's initial for the avatar
  const getCreatorInitial = () => {
    const name = getCreatorName();
    return name.charAt(0).toUpperCase();
  };

  // Get the creation date from various possible fields
  const getCreationDate = () => {
    return ticket.createdAt || ticket.created_at || ticket.created_at_date;
  };

  return (
    <Link href={`/admin/helpandsupport/tickets/${ticket.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Title */}
            <h3 className="text-base font-medium text-gray-900 line-clamp-1 mb-3 mt-6">{ticket.title}</h3>
            
            {/* Badges */}
            <div className="flex gap-2 flex-wrap">
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${getPriorityBadgeVariant(ticket.priority)}`}>
                {ticket.priority}
              </span>
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusBadgeVariant(ticket.status)}`}>
                {ticket.status.replace('-', ' ')}
              </span>
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                {ticket.category.replace('-', ' ')}
              </span>
            </div>
            
            {/* Description */}
            <p className="text-sm text-gray-600 line-clamp-2">{ticket.description}</p>
            
            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <div className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                  {getCreatorInitial()}
                </div>
                <span>{getCreatorName()}</span>
              </div>
              <div className="text-xs text-gray-400">
                {formatDate(getCreationDate())}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default TicketCard;
