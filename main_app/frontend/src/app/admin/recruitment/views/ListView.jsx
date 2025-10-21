'use client';

import { useState } from 'react';
import { Star, Mail, Phone, MessageCircle, Calendar, DollarSign, MapPin, User, ChevronDown, ChevronUp } from 'lucide-react';

export default function ListView({ stages, onCandidateClick }) {
  const [expandedStages, setExpandedStages] = useState(
    stages.reduce((acc, stage) => ({ ...acc, [stage.id]: true }), {})
  );
  const [sortBy, setSortBy] = useState('name'); // name, rating, dateAdded, stage
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc

  const toggleStageExpansion = (stageId) => {
    setExpandedStages(prev => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  const sortCandidates = (candidates) => {
    const sorted = [...candidates];
    
    sorted.sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'name':
          compareValue = a.student_name.localeCompare(b.student_name);
          break;
        case 'rating':
          compareValue = (a.rating || 0) - (b.rating || 0);
          break;
        case 'dateAdded':
          compareValue = new Date(a.added_at) - new Date(b.added_at);
          break;
        case 'stage':
          compareValue = a.position - b.position;
          break;
        default:
          compareValue = 0;
      }
      
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
    
    return sorted;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  return (
    <div className="space-y-4">
      {/* Sort Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="name">Name</option>
          <option value="rating">Rating</option>
          <option value="dateAdded">Date Added</option>
          <option value="stage">Stage Position</option>
        </select>
        
        <button
          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          {sortOrder === 'asc' ? (
            <>
              <ChevronUp size={16} />
              Ascending
            </>
          ) : (
            <>
              <ChevronDown size={16} />
              Descending
            </>
          )}
        </button>
      </div>

      {/* List View by Stage */}
      {stages.map((stage) => (
        <div key={stage.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Stage Header */}
          <div
            className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleStageExpansion(stage.id)}
            style={{ borderLeft: `4px solid ${stage.color}` }}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {expandedStages[stage.id] ? (
                  <ChevronDown size={20} className="text-gray-500" />
                ) : (
                  <ChevronUp size={20} className="text-gray-500" />
                )}
                <h3 className="font-semibold text-gray-900">{stage.name}</h3>
              </div>
              <span
                className="px-2.5 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: stage.color }}
              >
                {stage.candidates?.length || 0}
              </span>
            </div>
          </div>

          {/* Candidates List */}
          {expandedStages[stage.id] && stage.candidates && stage.candidates.length > 0 && (
            <div className="divide-y divide-gray-100">
              {sortCandidates(stage.candidates).map((candidate) => (
                <div
                  key={candidate.id}
                  onClick={() => onCandidateClick(candidate.id)}
                  className="px-4 py-3 hover:bg-purple-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    {/* Left: Candidate Info */}
                    <div className="flex items-center gap-4 flex-1">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {candidate.student_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>

                      {/* Name & Job */}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-gray-900 truncate">{candidate.student_name}</h4>
                        <p className="text-sm text-gray-600 truncate">{candidate.job_title}</p>
                      </div>
                    </div>

                    {/* Center: Contact & Details */}
                    <div className="flex items-center gap-6 mx-8">
                      {/* Rating */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-500">Rating</span>
                        {renderStars(candidate.rating)}
                      </div>

                      {/* Email */}
                      {candidate.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail size={16} className="text-gray-400" />
                          <span className="truncate max-w-[150px]">{candidate.email}</span>
                        </div>
                      )}

                      {/* Phone */}
                      {candidate.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone size={16} className="text-gray-400" />
                          <span>{candidate.phone}</span>
                        </div>
                      )}

                      {/* Comments Count */}
                      {candidate.comments_count > 0 && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <MessageCircle size={16} className="text-gray-400" />
                          <span>{candidate.comments_count}</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Metadata */}
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      {/* Date Added */}
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <span>{formatDate(candidate.added_at)}</span>
                      </div>

                      {/* Salary */}
                      {candidate.salary_expectation && (
                        <div className="flex items-center gap-2">
                          <DollarSign size={16} className="text-gray-400" />
                          <span>${candidate.salary_expectation.toLocaleString()}</span>
                        </div>
                      )}

                      {/* Location */}
                      {candidate.location && (
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-gray-400" />
                          <span className="truncate max-w-[100px]">{candidate.location}</span>
                        </div>
                      )}

                      {/* Recruiter */}
                      {candidate.recruiter_name && (
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-gray-400" />
                          <span className="truncate max-w-[100px]">{candidate.recruiter_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  {candidate.tags && candidate.tags.length > 0 && (
                    <div className="flex gap-2 mt-2 ml-14">
                      {candidate.tags.slice(0, 5).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {candidate.tags.length > 5 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          +{candidate.tags.length - 5}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {expandedStages[stage.id] && (!stage.candidates || stage.candidates.length === 0) && (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No candidates in this stage
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
