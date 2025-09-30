'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { ChevronLeft, Plus, Search } from 'lucide-react';
import TicketCard from '../TicketCard';
import { ticketsAPI } from '../../../../api/helpandsupport';
import { getUserData } from '../../../../utils/auth';

const TicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Fetch tickets from the API
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const currentUser = getUserData();
        if (!currentUser) return;
        
        const params = {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: searchTerm || undefined,
          user_id: currentUser.id
        };
        
        const response = await ticketsAPI.getTickets(params);
        
        // Handle different response formats
        let ticketData = [];
        if (Array.isArray(response)) {
          ticketData = response;
        } else if (response.data && Array.isArray(response.data)) {
          ticketData = response.data;
        } else if (response.results && Array.isArray(response.results)) {
          ticketData = response.results;
        }
        
        setTickets(ticketData);
        setError(null);
        setCurrentPage(1); // Reset to first page on new fetch
      } catch (err) {
        console.error('Error fetching tickets:', err);
        setError('Failed to load tickets. Please try again later.');
        // Keep showing previous tickets if any
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [statusFilter, searchTerm]);

  // Filter tickets based on search term
  const filteredTickets = tickets
    // Sort by created date descending (recent first)
    .slice()
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
      const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
      return dateB - dateA;
    })
    .filter(ticket => {
      const matchesSearch = !searchTerm || 
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ticket.description && ticket.description.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });

  // Pagination calculations
  const totalTickets = filteredTickets.length;
  const totalPages = Math.ceil(totalTickets / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTickets = filteredTickets.slice(indexOfFirstItem, indexOfLastItem);

  // Pagination controls (matching students list style)
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    // Show up to 5 page numbers, centered around currentPage
    const getPageNumbers = () => {
      const maxVisible = 5;
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisible - 1);
      if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
      }
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    };
    const pageNumbers = getPageNumbers();

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 mt-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
              currentPage === 1
                ? 'bg-gray-100 text-gray-400'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
              currentPage === totalPages
                ? 'bg-gray-100 text-gray-400'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing page <span className="font-medium">{currentPage}</span> of{' '}
              <span className="font-medium">{totalPages}</span> ({totalTickets} total tickets)
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                  currentPage === 1
                    ? 'text-gray-300'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              {/* Page Numbers */}
              {pageNumbers.map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    pageNum === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'bg-white hover:bg-gray-50 border border-gray-300 text-gray-700'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                  currentPage === totalPages
                    ? 'text-gray-300'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/helpandsupport">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">My Support Tickets</h1>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-4 items-center w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        
        <Button asChild>
          <Link href="/admin/helpandsupport/new">
            <Plus className="mr-2 h-4 w-4" /> New Ticket
          </Link>
        </Button>
      </div>

      {loading && (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading tickets...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-10">
          <p className="text-red-500">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {currentTickets.length > 0 ? (
              currentTickets.map(ticket => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))
            ) : (
              <Card className="p-6 text-center col-span-full">
                <p className="text-gray-500">No tickets found matching your criteria</p>
                <Button className="mt-4" asChild>
                  <Link href="/admin/helpandsupport/new">Create Your First Ticket</Link>
                </Button>
              </Card>
            )}
          </div>
          {renderPagination()}
        </>
      )}
    </div>
  );
};

export default TicketsPage;
