'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Plus, Ticket, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import TicketCard from './TicketCard';
import { ticketsAPI } from '../../../api/helpandsupport';
import { getUserData } from '../../../utils/auth';

const Dashboard = () => {
	const [tickets, setTickets] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// Fetch tickets on component mount
	useEffect(() => {
		const fetchTickets = async () => {
			try {
				setLoading(true);
				
				// Get current user to filter tickets
				const currentUser = getUserData();
				const params = {};
				
				// If user is logged in, filter tickets by user ID
				if (currentUser && currentUser.id) {
					params.user_id = currentUser.id;
				}
				
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
			} catch (err) {
				console.error('Error fetching tickets:', err);
				setError('Failed to load tickets. Please try again later.');
				// Keep showing previous tickets if any
			} finally {
				setLoading(false);
			}
		};

		fetchTickets();
	}, []);

	// Filter tickets by status
	const filterTickets = (statuses) => {
		return tickets.filter((ticket) => statuses.includes(ticket.status));
	};

	// Stats
	const openTickets = filterTickets(['open']).length;
	const inProgressTickets = filterTickets(['in-progress', 'in_progress']).length;
	const resolvedTickets = filterTickets(['resolved']).length;
	const totalTickets = tickets.length;

	// Get recent tickets - show 6 most recent, sorted by creation date (descending)
	const recentTickets = [...tickets]
		.sort(
			(a, b) =>
				new Date(b.createdAt || b.created_at || 0).getTime() -
				new Date(a.createdAt || a.created_at || 0).getTime()
		)
		.slice(0, 6);

	return (
		<div className="space-y-6 pb-8">
			<div className="flex justify-between items-center">
				<h1 className="text-3xl font-bold tracking-tight">
					Help & Support Dashboard
				</h1>
				<Button asChild className="bg-blue-600 hover:bg-blue-700">
					<Link href="/admin/helpandsupport/new">
						<Plus className="mr-2 h-4 w-4" /> New Ticket
					</Link>
				</Button>
			</div>

			{loading ? (
				<div className="flex justify-center py-10">
					<div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
				</div>
			) : error ? (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
					{error}
					<Button
						onClick={() => window.location.reload()}
						variant="link"
						className="text-red-700 underline pl-2"
					>
						Retry
					</Button>
				</div>
			) : (
				<>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						<Card className="bg-white border shadow-sm">
							<CardContent className="p-4">
								<div className="flex flex-row items-center justify-between space-y-0 pb-2">
									<div>
										<p className="text-sm font-medium mt-6">
											My Tickets
										</p>
										<p className="text-2xl font-bold">
											{totalTickets}
										</p>
										<p className="text-xs text-gray-500 mt-1">
											Tickets I've created
										</p>
									</div>
									<Ticket className="h-7 w-7 text-gray-700" />
								</div>
							</CardContent>
						</Card>

						<Card className="bg-white border shadow-sm">
							<CardContent className="p-4">
								<div className="flex flex-row items-center justify-between space-y-0 pb-2">
									<div>
										<p className="text-sm font-medium mt-6">Open</p>
										<p className="text-2xl font-bold text-blue-600">
											{openTickets}
										</p>
										<p className="text-xs text-gray-500 mt-1">
											Tickets waiting for response
										</p>
									</div>
									<AlertCircle className="h-7 w-7 text-blue-500" />
								</div>
							</CardContent>
						</Card>

						<Card className="bg-white border shadow-sm">
							<CardContent className="p-4">
								<div className="flex flex-row items-center justify-between space-y-0 pb-2">
									<div>
										<p className="text-sm font-medium mt-6">
											In Progress
										</p>
										<p className="text-2xl font-bold text-yellow-600">
											{inProgressTickets}
										</p>
										<p className="text-xs text-gray-500 mt-1">
											Tickets being worked on
										</p>
									</div>
									<Clock className="h-7 w-7 text-yellow-500" />
								</div>
							</CardContent>
						</Card>

						<Card className="bg-white border shadow-sm">
							<CardContent className="p-4">
								<div className="flex flex-row items-center justify-between space-y-0 pb-2">
									<div>
										<p className="text-sm font-medium mt-6">Resolved</p>
										<p className="text-2xl font-bold text-green-600">
											{resolvedTickets}
										</p>
										<p className="text-xs text-gray-500 mt-1">
											Successfully resolved tickets
										</p>
									</div>
									<CheckCircle className="h-7 w-7 text-green-500" />
								</div>
							</CardContent>
						</Card>
					</div>

					<div className="mt-8">
						<div className="flex flex-row items-center justify-between space-y-0 pb-2 mb-4">
							<h2 className="text-xl font-semibold">My Recent Tickets</h2>
							<Button variant="outline" asChild className="text-sm">
								<Link href="/admin/helpandsupport/tickets">View All</Link>
							</Button>
						</div>

						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							{recentTickets.length > 0 ? (
								recentTickets.map((ticket) => (
									<TicketCard key={ticket.id} ticket={ticket} />
								))
							) : (
								<Card className="col-span-full p-6 text-center">
									<p className="text-muted-foreground">No tickets found</p>
									<Button className="mt-4" asChild>
										<Link href="/admin/helpandsupport/new">
											Create Your First Ticket
										</Link>
									</Button>
								</Card>
							)}
						</div>
					</div>
				</>
			)}
		</div>
	);
};

export default Dashboard;
