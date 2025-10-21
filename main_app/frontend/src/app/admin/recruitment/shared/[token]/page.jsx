'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Eye, 
  Clock, 
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Lock,
  Edit3,
  MessageSquare
} from 'lucide-react';
import { getSharedBoard } from '@/api/ats.js';
import KanbanColumn from '../../components/KanbanColumn';

export default function SharedRecruitmentBoard() {
  const params = useParams();
  const router = useRouter();
  const token = params.token;
  
  const [boardData, setBoardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      loadSharedBoard();
    }
  }, [token]);

  const loadSharedBoard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getSharedBoard(token);
      setBoardData(response.data);
    } catch (err) {
      console.error('Error loading shared board:', err);
      if (err.response?.status === 404) {
        setError('This link is invalid or has expired.');
      } else if (err.response?.status === 403) {
        setError('Access to this board is no longer available.');
      } else {
        setError('Failed to load recruitment board. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateClick = (candidateOrId) => {
    // Extract candidate ID
    let candidateId;
    
    if (candidateOrId && typeof candidateOrId === 'object') {
      candidateId = candidateOrId.id;
    } else {
      candidateId = candidateOrId;
    }
    
    // Redirect to candidate detail page
    if (candidateId) {
      router.push(`/admin/recruitment/shared/${token}/candidate/${candidateId}`);
    }
  };

  const getPermissionBadge = (level) => {
    const badges = {
      VIEW: { color: 'bg-blue-100 text-blue-700', icon: Eye, text: 'View Only' },
      COMMENT: { color: 'bg-green-100 text-green-700', icon: MessageSquare, text: 'Can Comment' },
      EDIT: { color: 'bg-purple-100 text-purple-700', icon: Edit3, text: 'Can Edit' },
      FULL: { color: 'bg-orange-100 text-orange-700', icon: Lock, text: 'Full Access' },
    };
    
    const badge = badges[level] || badges.VIEW;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon size={14} />
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading recruitment board...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait while we fetch the data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg border border-red-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={loadSharedBoard}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!boardData?.board) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Data Available</h2>
            <p className="text-gray-600">The recruitment board is empty.</p>
          </div>
        </div>
      </div>
    );
  }

  const { board, link } = boardData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {board.pipeline?.name || 'Recruitment Board'}
              </h1>
              {board.pipeline?.organization_name && (
                <p className="text-sm text-gray-600 mt-1">
                  {board.pipeline.organization_name}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {/* Permission Badge */}
              {getPermissionBadge(link.permission_level)}
              
              {/* Access Info */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Eye size={16} />
                <span>{link.access_count} views</span>
              </div>
            </div>
          </div>
          
          {/* Expiry Warning */}
          {link.expires_at && (
            <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Clock size={16} className="text-yellow-600" />
              <span className="text-sm text-yellow-700">
                This link expires on {new Date(link.expires_at).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Board Stats */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-600">
              <strong className="text-gray-900">{board.stats?.total_candidates || 0}</strong> Total Candidates
            </span>
          </div>
          
          {board.stats?.avg_time_in_pipeline && (
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600">
                Avg. Time in Pipeline: <strong className="text-gray-900">{board.stats.avg_time_in_pipeline}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="p-6">
        <div className="flex gap-4 overflow-x-auto pb-6">
          {board.stages?.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              onCandidateClick={handleCandidateClick}
              isSharedView={true}
              canDrag={link.permission_level === 'EDIT' || link.permission_level === 'FULL'}
            />
          ))}
        </div>

        {/* Empty State */}
        {(!board.stages || board.stages.length === 0) && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Stages Available</h3>
            <p className="text-gray-600">The recruitment pipeline hasn't been configured yet.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 py-4 px-6 text-center text-sm text-gray-500">
        <p>Shared via secure link • Read-only access</p>
      </div>
    </div>
  );
}
