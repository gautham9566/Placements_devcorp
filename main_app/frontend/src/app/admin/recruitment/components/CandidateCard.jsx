'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { User } from 'lucide-react';

export default function CandidateCard({ candidate, onClick, isDragging = false }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: candidate.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  // Render helper removed: rating and SMS functionality were removed per user request

  const handleCardClick = (e) => {
    // Only trigger onClick if it's not a drag operation
    if (!isSortableDragging && onClick) {
      onClick(candidate);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleCardClick}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow ${
        isDragging || isSortableDragging ? 'shadow-lg' : ''
      }`}
    >
      {/* Drag Handle - Add this for better UX */}
      <div 
        {...listeners}
        {...attributes}
        role="button"
        tabIndex={0}
        className="cursor-grab active:cursor-grabbing mb-2"
        onKeyDown={(e) => {
          // Allow keyboard dragging start with space/enter for accessibility (handled by dnd-kit sensors)
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
          }
        }}
      >
        <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto"></div>
      </div>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-semibold">
            {candidate.candidate_avatar || candidate.candidate_name?.[0] || 'U'}
          </div>

          {/* Name and Position */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">
              {candidate.candidate_name || 'Unknown'}
            </h4>
            <p className="text-sm text-gray-600 truncate">{candidate.job_title || 'Position'}</p>
          </div>
        </div>

        {/* Action Menu removed per request */}
      </div>

      {/* Contact Info removed: phone & SMS hidden per request */}

      {/* Rating and Time removed per request */}

      {/* Tags */}
      {candidate.tags && candidate.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {candidate.tags.slice(0, 2).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
          {candidate.tags.length > 2 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
              +{candidate.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {/* Reply/comment count removed per request */}
        <div className="text-xs text-gray-500">
          {candidate.company_name || 'Company'}
        </div>
      </div>
    </div>
  );
}
