'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '../../../components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, Clock, CheckCircle, User, Calendar, Tag } from 'lucide-react';

const TicketCard = ({ ticket }) => {
  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'open':
        return {
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <AlertTriangle className="w-3 h-3" />
        };
      case 'in-progress':
        return {
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: <Clock className="w-3 h-3" />
        };
      case 'resolved':
        return {
          className: 'bg-green-100 text-green-800 border-green-200',
          icon: <CheckCircle className="w-3 h-3" />
        };
      default:
        return {
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <AlertTriangle className="w-3 h-3" />
        };
    }
  };

  const getPriorityBadgeVariant = (priority) => {
    switch (priority) {
      case 'high':
        return {
          className: 'bg-red-100 text-red-800 border-red-200',
          icon: <AlertTriangle className="w-3 h-3" />
        };
      case 'medium':
        return {
          className: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: <Clock className="w-3 h-3" />
        };
      case 'low':
        return {
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <CheckCircle className="w-3 h-3" />
        };
      default:
        return {
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <CheckCircle className="w-3 h-3" />
        };
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
    <Link href={`/admin/helpandsupport/tickets/${ticket.id}`} className="block">
      <Card className="h-full hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-gray-300 bg-white ">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 leading-tight mt-5">{ticket.title}</h3>
            {/* Badges */}
            <div className="flex gap-1.5 flex-wrap items-center">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getPriorityBadgeVariant(ticket.priority).className}`}>
                {getPriorityBadgeVariant(ticket.priority).icon}
                {ticket.priority}
              </span>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeVariant(ticket.status).className}`}>
                {getStatusBadgeVariant(ticket.status).icon}
                {ticket.status.replace('-', ' ')}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                <Tag className="w-3 h-3" />
                {ticket.category.replace('-', ' ')}
              </span>
            </div>
            
            {/* Description */}
            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{ticket.description}</p>
            
            {/* Footer */}
            <div className="flex items-center justify-between border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="h-7 w-7 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-xs font-medium text-white flex-shrink-0">
                  {getCreatorInitial()}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-gray-700 leading-tight">{getCreatorName()}</span>
                  <span className="text-gray-400 flex items-center gap-1 leading-tight">
                    <Calendar className="w-3 h-3" />
                    {formatDate(getCreationDate())}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default TicketCard;