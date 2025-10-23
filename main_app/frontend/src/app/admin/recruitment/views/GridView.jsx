'use client';

import { useState } from 'react';
import { Star, Mail, Phone, MessageCircle, Clock, MapPin, DollarSign, Briefcase } from 'lucide-react';

export default function GridView({ stages, onCandidateClick }) {
  const [selectedStages, setSelectedStages] = useState(stages.map(s => s.id));
  const [gridSize, setGridSize] = useState('medium'); // small, medium, large

  const toggleStageFilter = (stageId) => {
    setSelectedStages(prev => 
      prev.includes(stageId)
        ? prev.filter(id => id !== stageId)
        : [...prev, stageId]
    );
  };

  const toggleAllStages = () => {
    if (selectedStages.length === stages.length) {
      setSelectedStages([]);
    } else {
      setSelectedStages(stages.map(s => s.id));
    }
  };

  const getFilteredCandidates = () => {
    return stages
      .filter(stage => selectedStages.includes(stage.id))
      .flatMap(stage => 
        (stage.candidates || []).map(candidate => ({
          ...candidate,
          stageColor: stage.color,
          stageName: stage.name
        }))
      );
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={star <= (rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const gridSizeClasses = {
    small: 'grid-cols-6',
    medium: 'grid-cols-4',
    large: 'grid-cols-3'
  };

  const cardSizeClasses = {
    small: 'p-3',
    medium: 'p-4',
    large: 'p-5'
  };

  const filteredCandidates = getFilteredCandidates();

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          {/* Stage Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            
            <button
              onClick={toggleAllStages}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${selectedStages.length === stages.length
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              All ({stages.reduce((sum, s) => sum + (s.candidates?.length || 0), 0)})
            </button>

            {stages.map(stage => (
              <button
                key={stage.id}
                onClick={() => toggleStageFilter(stage.id)}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border
                  ${selectedStages.includes(stage.id)
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                  }
                `}
                style={{
                  backgroundColor: selectedStages.includes(stage.id) ? stage.color : undefined,
                  borderColor: selectedStages.includes(stage.id) ? stage.color : '#e5e7eb'
                }}
              >
                {stage.name} ({stage.candidates?.length || 0})
              </button>
            ))}
          </div>

          {/* Grid Size Toggle */}
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => setGridSize('small')}
              className={`
                px-3 py-1 rounded text-xs font-medium transition-colors
                ${gridSize === 'small' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'}
              `}
            >
              Small
            </button>
            <button
              onClick={() => setGridSize('medium')}
              className={`
                px-3 py-1 rounded text-xs font-medium transition-colors
                ${gridSize === 'medium' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'}
              `}
            >
              Medium
            </button>
            <button
              onClick={() => setGridSize('large')}
              className={`
                px-3 py-1 rounded text-xs font-medium transition-colors
                ${gridSize === 'large' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'}
              `}
            >
              Large
            </button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredCandidates.length} candidates
      </div>

      {/* Grid */}
      <div className={`grid ${gridSizeClasses[gridSize]} gap-4`}>
        {filteredCandidates.map((candidate) => (
          <div
            key={candidate.id}
            onClick={() => onCandidateClick(candidate.id)}
            className={`
              ${cardSizeClasses[gridSize]}
              bg-white rounded-lg border-2 cursor-pointer
              transition-all hover:shadow-lg hover:-translate-y-1
            `}
            style={{ borderColor: candidate.stageColor }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {candidate.student_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              
              <div
                className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: candidate.stageColor }}
              >
                {candidate.stageName}
              </div>
            </div>

            {/* Name & Job */}
            <div className="mb-3">
              <h4 className="font-semibold text-gray-900 mb-1 truncate">
                {candidate.student_name}
              </h4>
              <p className="text-sm text-gray-600 truncate flex items-center gap-1">
                <Briefcase size={12} />
                {candidate.job_title}
              </p>
            </div>

            {/* Rating */}
            <div className="mb-3">
              {renderStars(candidate.rating)}
            </div>

            {/* Contact Info */}
            <div className="space-y-2 mb-3">
              {candidate.email && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Mail size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">{candidate.email}</span>
                </div>
              )}
              
              {candidate.phone && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Phone size={14} className="text-gray-400 flex-shrink-0" />
                  <span>{candidate.phone}</span>
                </div>
              )}

              {candidate.location && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">{candidate.location}</span>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>{candidate.time_in_stage || formatDate(candidate.added_at)}</span>
              </div>

              {candidate.comments_count > 0 && (
                <div className="flex items-center gap-1">
                  <MessageCircle size={12} />
                  <span>{candidate.comments_count}</span>
                </div>
              )}
            </div>

            {/* Salary */}
            {candidate.salary_expectation && (
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                <DollarSign size={12} className="text-gray-400" />
                <span className="font-medium">${candidate.salary_expectation.toLocaleString()}</span>
              </div>
            )}

            {/* Tags */}
            {candidate.tags && candidate.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-2">
                {candidate.tags.slice(0, 2).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full"
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
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredCandidates.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="text-gray-400 mb-2">
            <Briefcase size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No candidates found</h3>
          <p className="text-sm text-gray-600">
            Try adjusting your filters to see more candidates
          </p>
        </div>
      )}
    </div>
  );
}
