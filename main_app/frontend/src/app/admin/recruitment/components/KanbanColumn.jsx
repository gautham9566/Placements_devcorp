'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Download, Plus } from 'lucide-react';
import CandidateCard from './CandidateCard';

export default function KanbanColumn({ stage, onCandidateClick }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Use candidates or cards (for backward compatibility)
  const items = stage.candidates || stage.cards || [];

  const handleExport = () => {
    // Export candidates in this column to CSV
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Job Title', 'Company', 'Rating', 'Time in Stage'],
      ...items.map(card => [
        card.candidate_name || card.student_name,
        card.candidate_email || card.email,
        card.candidate_phone || card.phone || '',
        card.job_title,
        card.company_name,
        card.rating,
        card.time_in_stage,
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${stage.name}-candidates.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`flex flex-col w-80 bg-gray-50 rounded-lg`}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-gray-200 bg-white rounded-t-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-gray-500 hover:text-gray-700"
            >
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
            <h3 className="font-semibold text-gray-900">{stage.name}</h3>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: stage.color }}
            >
              {stage.count}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleExport}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Export list"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Add candidate"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Cards Container */}
      {!isCollapsed && (
        <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-300px)]">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <p>No candidates in this stage</p>
            </div>
          ) : (
            items.filter(card => card && card.id).map((card) => (
              <CandidateCard
                key={card.id}
                candidate={card}
                onClick={() => onCandidateClick(card)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
