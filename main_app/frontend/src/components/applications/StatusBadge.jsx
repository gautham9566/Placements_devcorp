import React from 'react';
import { CheckCircle, Clock, Eye, XCircle, Award } from 'lucide-react';

export default function StatusBadge({ status }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'APPLIED':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <Clock className="w-3 h-3" />,
          label: 'Applied'
        };
      case 'UNDER_REVIEW':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: <Eye className="w-3 h-3" />,
          label: 'Under Review'
        };
      case 'SHORTLISTED':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: <CheckCircle className="w-3 h-3" />,
          label: 'Shortlisted'
        };
      case 'REJECTED':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: <XCircle className="w-3 h-3" />,
          label: 'Rejected'
        };
      case 'HIRED':
        return {
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: <Award className="w-3 h-3" />,
          label: 'Hired'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <Clock className="w-3 h-3" />,
          label: status || 'Unknown'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
} 