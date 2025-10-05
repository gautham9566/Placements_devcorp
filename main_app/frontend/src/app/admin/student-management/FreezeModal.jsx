'use client';
import { useState } from 'react';
import { X, AlertTriangle, Lock, Unlock } from 'lucide-react';

export default function FreezeModal({ 
  isOpen, 
  onClose, 
  onFreeze, 
  onUnfreeze, 
  studentName, 
  currentFreezeStatus = 'none',
  currentFreezeData = null 
}) {
  const [freezeType, setFreezeType] = useState('complete');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Partial freeze options
  const [minSalary, setMinSalary] = useState('');
  const [allowedJobTiers, setAllowedJobTiers] = useState([]);
  const [allowedJobTypes, setAllowedJobTypes] = useState([]);
  const [allowedCompanies, setAllowedCompanies] = useState([]);

  const jobTierOptions = [
    { value: 'tier1', label: 'Tier 1 (Top Companies)' },
    { value: 'tier2', label: 'Tier 2 (Mid-level Companies)' },
    { value: 'tier3', label: 'Tier 3 (Startups/Small Companies)' }
  ];

  const jobTypeOptions = [
    { value: 'FULL_TIME', label: 'Full Time' },
    { value: 'INTERNSHIP', label: 'Internship' },
    { value: 'CONTRACT', label: 'Contract' },
    { value: 'PART_TIME', label: 'Part Time' }
  ];

  const handleFreeze = async () => {
    if (!reason.trim()) {
      alert('Please provide a reason for freezing the account.');
      return;
    }

    setLoading(true);
    try {
      const freezeData = {
        freeze_type: freezeType,
        reason: reason.trim()
      };

      if (freezeType === 'partial') {
        freezeData.min_salary_requirement = minSalary ? parseFloat(minSalary) : null;
        freezeData.allowed_job_tiers = allowedJobTiers;
        freezeData.allowed_job_types = allowedJobTypes;
        freezeData.allowed_companies = allowedCompanies;
      }

      await onFreeze(freezeData);
      onClose();
    } catch (error) {
      console.error('Error freezing account:', error);
      alert('Failed to freeze account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfreeze = async () => {
    setLoading(true);
    try {
      await onUnfreeze();
      onClose();
    } catch (error) {
      console.error('Error unfreezing account:', error);
      alert('Failed to unfreeze account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJobTierChange = (tier) => {
    setAllowedJobTiers(prev => 
      prev.includes(tier) 
        ? prev.filter(t => t !== tier)
        : [...prev, tier]
    );
  };

  const handleJobTypeChange = (type) => {
    setAllowedJobTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {currentFreezeStatus === 'none' ? 'Freeze Account' : 'Manage Account Freeze'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {currentFreezeStatus === 'none' ? (
          // Freeze Account Form
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="text-blue-600" size={20} />
                <span className="font-semibold text-blue-800">Freeze Account: {studentName}</span>
              </div>
              <p className="text-blue-700 text-sm">
                Choose how you want to restrict this student's account access.
              </p>
            </div>

            {/* Freeze Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Freeze Type *
              </label>
              <div className="space-y-3">
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="freezeType"
                    value="complete"
                    checked={freezeType === 'complete'}
                    onChange={(e) => setFreezeType(e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-800">Complete Freeze</div>
                    <div className="text-sm text-gray-600">
                      Student cannot login to the system at all
                    </div>
                  </div>
                </label>
                
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="freezeType"
                    value="partial"
                    checked={freezeType === 'partial'}
                    onChange={(e) => setFreezeType(e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-800">Partial Freeze</div>
                    <div className="text-sm text-gray-600">
                      Student can login but with restricted job application access
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Freeze *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Enter the reason for freezing this account..."
                required
              />
            </div>

            {/* Partial Freeze Options */}
            {freezeType === 'partial' && (
              <div className="space-y-6 border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800">Partial Freeze Restrictions</h3>
                
                {/* Minimum Salary Requirement */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Salary Requirement (in Lakhs)
                  </label>
                  <input
                    type="number"
                    value={minSalary}
                    onChange={(e) => setMinSalary(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 10 (for 10 LPA minimum)"
                    min="0"
                    step="0.1"
                  />
                </div>

                {/* Allowed Job Tiers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allowed Job Tiers
                  </label>
                  <div className="space-y-2">
                    {jobTierOptions.map(option => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={allowedJobTiers.includes(option.value)}
                          onChange={() => handleJobTierChange(option.value)}
                          className="mr-2"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Allowed Job Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allowed Job Types
                  </label>
                  <div className="space-y-2">
                    {jobTypeOptions.map(option => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={allowedJobTypes.includes(option.value)}
                          onChange={() => handleJobTypeChange(option.value)}
                          className="mr-2"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleFreeze}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Freezing...' : 'Freeze Account'}
              </button>
            </div>
          </div>
        ) : (
          // Current Freeze Status Display
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="text-yellow-600" size={20} />
                <span className="font-semibold text-yellow-800">
                  Account Currently Frozen: {currentFreezeStatus === 'complete' ? 'Complete Freeze' : 'Partial Freeze'}
                </span>
              </div>
              <p className="text-yellow-700 text-sm">
                {currentFreezeData?.freeze_reason || 'No reason provided'}
              </p>
              {currentFreezeData?.freeze_date && (
                <p className="text-yellow-700 text-sm mt-1">
                  Frozen on: {new Date(currentFreezeData.freeze_date).toLocaleDateString()}
                </p>
              )}
            </div>

            {currentFreezeStatus === 'partial' && currentFreezeData?.freeze_restrictions && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Current Restrictions:</h3>
                <div className="space-y-2 text-sm">
                  {currentFreezeData.freeze_restrictions.min_salary_requirement && (
                    <p><strong>Min Salary:</strong> {currentFreezeData.freeze_restrictions.min_salary_requirement} LPA</p>
                  )}
                  {currentFreezeData.freeze_restrictions.allowed_job_tiers?.length > 0 && (
                    <p><strong>Allowed Tiers:</strong> {currentFreezeData.freeze_restrictions.allowed_job_tiers.join(', ')}</p>
                  )}
                  {currentFreezeData.freeze_restrictions.allowed_job_types?.length > 0 && (
                    <p><strong>Allowed Types:</strong> {currentFreezeData.freeze_restrictions.allowed_job_types.join(', ')}</p>
                  )}
                </div>
              </div>
            )}

            {/* Unfreeze Button */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                Close
              </button>
              <button
                onClick={handleUnfreeze}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Unlock size={16} />
                {loading ? 'Unfreezing...' : 'Unfreeze Account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 