'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  Plus,
  LayoutGrid,
  List,
  Calendar,
  Grid,
  Bell,
  X,
  Download,
  RefreshCw,
  Settings,
} from 'lucide-react';
import KanbanColumn from './components/KanbanColumn';
import CandidateCard from './components/CandidateCard';
import CandidateDetailModal from './components/CandidateDetailModal';
import ListView from './views/ListView';
import CalendarView from './views/CalendarView';
import GridView from './views/GridView';
import { getKanbanBoard, moveCandidateStage, getSharedBoard } from '../../../api/ats';

export default function RecruitmentBoard() {
  const searchParams = useSearchParams();
  const sharedToken = searchParams.get('token');

  // State
  const [boardData, setBoardData] = useState(null);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI State
  const [viewMode, setViewMode] = useState('kanban'); // kanban, list, calendar, grid
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState('ALL');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);
  
  // Candidate detail modal
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Load board data
  useEffect(() => {
    loadBoardData();
  }, [sharedToken]);

  const loadBoardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = sharedToken
        ? await getSharedBoard(sharedToken)
        : await getKanbanBoard();

      if (response.data) {
        const data = sharedToken ? response.data.board : response.data;
        setBoardData(data);
        setStages(data.stages || []);
      }
    } catch (err) {
      console.error('Failed to load board data:', err);
      setError('Failed to load recruitment board. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateClick = (candidate) => {
    setSelectedCandidate(candidate);
    setShowDetailModal(true);
  };

  const handleRemoveTag = (tag) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const filteredStages = stages.map(stage => {
    const items = stage.candidates || stage.cards || [];
    return {
      ...stage,
      candidates: items.filter(card => {
        // Search filter
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const matchesSearch = 
            card.candidate_name?.toLowerCase().includes(searchLower) ||
            card.candidate_email?.toLowerCase().includes(searchLower) ||
            card.job_title?.toLowerCase().includes(searchLower) ||
            card.company_name?.toLowerCase().includes(searchLower);
          if (!matchesSearch) return false;
        }

        // Job filter
        if (selectedJob !== 'ALL' && card.job_title !== selectedJob) {
          return false;
        }

        // Tag filter
        if (selectedTags.length > 0) {
          const cardTags = card.tags || [];
          const hasAllTags = selectedTags.every(tag => cardTags.includes(tag));
          if (!hasAllTags) return false;
        }

        return true;
      }),
      cards: items.filter(card => {
        // Search filter
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const matchesSearch = 
            card.candidate_name?.toLowerCase().includes(searchLower) ||
            card.candidate_email?.toLowerCase().includes(searchLower) ||
            card.job_title?.toLowerCase().includes(searchLower) ||
            card.company_name?.toLowerCase().includes(searchLower);
          if (!matchesSearch) return false;
        }

        // Job filter
        if (selectedJob !== 'ALL' && card.job_title !== selectedJob) {
          return false;
        }

        // Tag filter
        if (selectedTags.length > 0) {
          const cardTags = card.tags || [];
          const hasAllTags = selectedTags.every(tag => cardTags.includes(tag));
          if (!hasAllTags) return false;
        }

        return true;
      }),
    };
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading recruitment board...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <p className="text-red-800 font-medium mb-4">{error}</p>
            <button
              onClick={loadBoardData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold text-gray-900">Recruitment</h1>
              <nav className="flex items-center gap-4">
                <button className="text-purple-600 font-medium border-b-2 border-purple-600 pb-1">
                  Applications
                </button>
                <button className="text-gray-600 hover:text-gray-900">
                  Reporting
                </button>
                <button className="text-gray-600 hover:text-gray-900">
                  Configuration
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {boardData?.pipeline?.organization_name || 'Caffeine Junction - Coffeeland'}
              </span>
              <button className="relative p-2 text-gray-600 hover:text-gray-900">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>

          {/* Secondary Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                <Plus className="w-4 h-4" />
                New
              </button>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search candidates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 w-80"
                />
              </div>

              {/* Filters */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>

              {/* Active Tags */}
              {selectedTags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* View Toggle Buttons */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded ${
                  viewMode === 'kanban'
                    ? 'bg-white text-purple-600 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Kanban View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${
                  viewMode === 'list'
                    ? 'bg-white text-purple-600 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`p-2 rounded ${
                  viewMode === 'calendar'
                    ? 'bg-white text-purple-600 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Calendar View"
              >
                <Calendar className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${
                  viewMode === 'grid'
                    ? 'bg-white text-purple-600 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Kanban Board */}
      {viewMode === 'kanban' && (
        <div className="p-6 overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-6">
            {filteredStages.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                onCandidateClick={handleCandidateClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="p-6">
          <ListView
            stages={filteredStages}
            onCandidateClick={handleCandidateClick}
          />
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="p-6">
          <CalendarView
            stages={filteredStages}
            onCandidateClick={handleCandidateClick}
          />
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="p-6">
          <GridView
            stages={filteredStages}
            onCandidateClick={handleCandidateClick}
          />
        </div>
      )}

      {/* Candidate Detail Modal */}
      {showDetailModal && selectedCandidate && (
        <CandidateDetailModal
          candidate={selectedCandidate}
          stages={stages}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedCandidate(null);
          }}
          onUpdate={loadBoardData}
        />
      )}
    </div>
  );
}
