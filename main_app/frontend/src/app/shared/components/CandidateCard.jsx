'use client';

import { User, Star } from 'lucide-react';

export default function CandidateCard({ candidate, onClick }) {
  if (!candidate) return null;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-semibold">
            {candidate.candidate_avatar || candidate.candidate_name?.[0] || 'U'}
          </div>

          {/* Name, Position and Rating (stars moved under the job title) */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">
              {candidate.candidate_name || 'Unknown'}
            </h4>
            <p className="text-sm text-gray-600 truncate">{candidate.job_title || 'Position'}</p>

            {/* Evaluation Rating moved below the job title */}
            <div className="mt-1 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    (candidate.rating || 0) >= star
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      
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
        <div className="text-xs text-gray-500">
          {candidate.company_name || 'Company'}
        </div>
      </div>
    </div>
  );
}
