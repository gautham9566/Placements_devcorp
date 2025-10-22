'use client';

import { useEffect, useState } from 'react';
import {
  Search,
  Eye,
  Share2,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Building2,
  Briefcase,
  Link2 as LinkIcon
} from 'lucide-react';
import { getShareableLinks } from '../../../api/ats';
import client from '../../../api/client';

export default function ATSLinksPage() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedLinkId, setCopiedLinkId] = useState(null);
  const [deletingLinkId, setDeletingLinkId] = useState(null);

  // Load shareable links
  const loadLinks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getShareableLinks();
      const linksData = response.data?.results || response.data || [];
      setLinks(Array.isArray(linksData) ? linksData : []);
    } catch (err) {
      console.error('Error loading shareable links:', err);
      setError(err.message || 'Failed to load shareable links');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
  }, []);

  // Filter links based on search term
  const filteredLinks = links.filter(link => {
    if (!link || typeof link !== 'object') return false;

    // If no search term, include all links
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      (link.pipeline_name && link.pipeline_name.toLowerCase().includes(searchLower)) ||
      (link.job_title && link.job_title.toLowerCase().includes(searchLower)) ||
      (link.company_name && link.company_name.toLowerCase().includes(searchLower)) ||
      (link.job_id && link.job_id.toString().includes(searchLower)) ||
      (link.token && link.token.toLowerCase().includes(searchLower)) ||
      (link.applications_view && 'applications view'.includes(searchLower))
    );
  });

  // Copy link to clipboard
  const copyToClipboard = async (linkId, token) => {
    try {
      const fullUrl = `${window.location.origin}/admin/recruitment/shared/${token}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedLinkId(linkId);
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  // Delete link
  const deleteLink = async (linkId) => {
    if (!confirm('Are you sure you want to delete this shareable link?')) {
      return;
    }

    try {
      setDeletingLinkId(linkId);
      await client.delete(`/api/v1/jobs/ats/links/${linkId}/`);
      setLinks(links.filter(link => link.id !== linkId));
    } catch (err) {
      console.error('Error deleting link:', err);
      alert('Failed to delete link');
    } finally {
      setDeletingLinkId(null);
    }
  };

  // Open link in new tab
  const viewLink = (token) => {
    const fullUrl = `${window.location.origin}/admin/recruitment/shared/${token}`;
    window.open(fullUrl, '_blank');
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get permission level display
  const getPermissionDisplay = (level) => {
    const displays = {
      'VIEW': 'View Only',
      'COMMENT': 'View & Comment',
      'EDIT': 'View, Comment & Edit',
      'FULL': 'Full Access'
    };
    return displays[level] || level;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
          <p className="text-gray-600">Loading ATS links...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Links</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadLinks}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ATS Shareable Links</h1>
          <p className="text-gray-600 mt-1">Manage shareable links for recruitment pipelines</p>
        </div>
        <button
          onClick={loadLinks}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by job title, company name, job ID, or token..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Links Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job ID / Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Link
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <LinkIcon className="mx-auto text-gray-400 mb-4" size={48} />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No shareable links found</h3>
                    <p className="text-gray-600">
                      {searchTerm ? 'Try adjusting your search terms.' : 'Create your first shareable link to get started.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLinks.map((link) => (
                  <tr key={link?.id || Math.random()} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Briefcase className="text-gray-400 mr-2" size={16} />
                        <span className="text-sm font-medium text-gray-900">
                          {link?.applications_view ? 'Applications View' : (link?.job_id || 'N/A')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building2 className="text-gray-400 mr-2" size={16} />
                        <span className="text-sm text-gray-900">
                          {link?.applications_view ? 'All Companies' : (link?.company_name || 'N/A')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                          {link?.token || 'N/A'}
                        </code>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          link?.can_access
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {link?.can_access ? 'Active' : 'Expired'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {getPermissionDisplay(link?.permission_level)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(link?.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {/* View Action */}
                        <button
                          onClick={() => link?.token && viewLink(link.token)}
                          disabled={!link?.token}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors disabled:opacity-50"
                          title="View link"
                        >
                          <Eye size={16} />
                        </button>

                        {/* Share/Copy Action */}
                        <button
                          onClick={() => link?.id && link?.token && copyToClipboard(link.id, link.token)}
                          disabled={!link?.id || !link?.token}
                          className={`p-1 rounded transition-colors ${
                            copiedLinkId === link?.id
                              ? 'text-green-600 bg-green-50'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                          title="Copy link"
                        >
                          {copiedLinkId === link?.id ? <Check size={16} /> : <Copy size={16} />}
                        </button>

                        {/* Delete Action */}
                        <button
                          onClick={() => link?.id && deleteLink(link.id)}
                          disabled={!link?.id || deletingLinkId === link?.id}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Delete link"
                        >
                          {deletingLinkId === link?.id ? (
                            <RefreshCw size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Total Links: {filteredLinks.length}</span>
          <span>Active Links: {filteredLinks.filter(link => link?.can_access).length}</span>
        </div>
      </div>
    </div>
  );
}
