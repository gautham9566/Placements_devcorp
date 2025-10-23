'use client';

import { useState } from 'react';
import { X, Star, ArrowRight, Mail, Phone, MapPin, Calendar, User } from 'lucide-react';
import { moveCandidateStage } from '../../../../api/ats';

export default function CandidateDetailModal({ candidate, onClose, onUpdate, stages = [] }) {
  const [isMoving, setIsMoving] = useState(false);

  if (!candidate) return null;

  const handleMoveToNextStage = async () => {
    if (!candidate || !candidate.current_stage) return;

    setIsMoving(true);
    try {
      // Find current stage index
      const currentStageIndex = stages.findIndex(stage => stage.id === candidate.current_stage.id);
      if (currentStageIndex === -1 || currentStageIndex === stages.length - 1) {
        // Already in the last stage
        alert('Candidate is already in the final stage');
        return;
      }

      const nextStage = stages[currentStageIndex + 1];

      await moveCandidateStage(candidate.id, {
        candidate_id: candidate.id,
        from_stage_id: candidate.current_stage.id,
        to_stage_id: nextStage.id,
      });

      // Close modal and refresh data
      onClose();
      onUpdate();
    } catch (error) {
      console.error('Failed to move candidate:', error);
      alert('Failed to move candidate to next stage. Please try again.');
    } finally {
      setIsMoving(false);
    }
  };

  const renderStars = (rating) => {
    return [1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`w-5 h-5 ${
          (rating || 0) >= star
            ? 'text-yellow-400 fill-current'
            : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Candidate Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Basic Info */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-semibold text-xl">
              {candidate.candidate_avatar || candidate.candidate_name?.[0] || 'U'}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {candidate.candidate_name || 'Unknown'}
              </h3>
              <p className="text-lg text-gray-600 mb-2">{candidate.job_title || 'Position'}</p>
              <p className="text-gray-500">{candidate.company_name || 'Company'}</p>
            </div>
            <div className="flex items-center gap-1">
              {renderStars(candidate.rating)}
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {candidate.candidate_email && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-sm font-medium">{candidate.candidate_email}</p>
                </div>
              </div>
            )}
            {candidate.candidate_phone && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="text-sm font-medium">{candidate.candidate_phone}</p>
                </div>
              </div>
            )}
          </div>

          {/* Current Stage */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Current Stage</h4>
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: candidate.current_stage?.color || '#6366f1' }}
              ></div>
              <span className="font-medium text-gray-900">
                {candidate.current_stage?.name || 'Unknown Stage'}
              </span>
            </div>
          </div>

          {/* Tags */}
          {candidate.tags && candidate.tags.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {candidate.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {candidate.expected_salary && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Expected Salary</p>
                <p className="text-sm font-medium">${candidate.expected_salary}</p>
              </div>
            )}
            {candidate.availability_status && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Availability</p>
                <p className="text-sm font-medium">{candidate.availability_status}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {candidate.notes && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Notes</h4>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{candidate.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={handleMoveToNextStage}
            disabled={isMoving}
            className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isMoving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Moving...
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                Move to Next Stage
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}