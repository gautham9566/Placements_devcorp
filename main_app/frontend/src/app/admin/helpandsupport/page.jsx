'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { 
  Plus, 
  Ticket, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  MessageSquare,
  Users,
  TrendingUp,
  Activity
} from 'lucide-react';
import TicketCard from './TicketCard';
import { ticketsAPI } from '../../../api/helpandsupport';
import { getUserData } from '../../../utils/auth';
import { useTheme } from '../../../contexts/ThemeContext';
import { useNotification } from '../../../contexts/NotificationContext';

const Dashboard = () => {
	const { theme } = useTheme();
	const { showError, showSuccess } = useNotification();
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
				showError('Failed to Load Tickets', 'Unable to fetch your support tickets. Please check your connection and try again.');
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

	// Dashboard cards configuration
	const dashboardCards = [
		{
			title: 'Total Tickets',
			value: loading ? '...' : totalTickets,
			icon: <Ticket className="w-8 h-8" />,
			color: 'from-blue-500 to-blue-600',
			bgColor: 'bg-blue-50',
			iconColor: 'text-blue-600',
			description: 'All your support tickets'
		},
		{
			title: 'Open Tickets',
			value: loading ? '...' : openTickets,
			icon: <AlertCircle className="w-8 h-8" />,
			color: 'from-orange-500 to-orange-600',
			bgColor: 'bg-orange-50',
			iconColor: 'text-orange-600',
			description: 'Tickets waiting for response'
		},
		{
			title: 'In Progress',
			value: loading ? '...' : inProgressTickets,
			icon: <Activity className="w-8 h-8" />,
			color: 'from-yellow-500 to-yellow-600',
			bgColor: 'bg-yellow-50',
			iconColor: 'text-yellow-600',
			description: 'Tickets being worked on'
		},
		{
			title: 'Resolved',
			value: loading ? '...' : resolvedTickets,
			icon: <CheckCircle className="w-8 h-8" />,
			color: 'from-green-500 to-green-600',
			bgColor: 'bg-green-50',
			iconColor: 'text-green-600',
			description: 'Successfully resolved tickets'
		}
	];

	// Get recent tickets - show 6 most recent, sorted by creation date (descending)
	const recentTickets = [...tickets]
		.sort(
			(a, b) =>
				new Date(b.createdAt || b.created_at || 0).getTime() -
				new Date(a.createdAt || a.created_at || 0).getTime()
		)
		.slice(0, 6);

	return (
		<div className="p-6 ml-20 overflow-y-auto h-full">
			{/* Welcome Section */}
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900 mb-2">Help & Support Center</h1>
				<p className="text-gray-600">Manage your support tickets and get help when you need it.</p>
			</div>
	
			{loading ? (
				<div className="flex justify-center py-20">
					<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
				</div>
			) : error ? (
				<div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-8">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="font-medium">Failed to Load Tickets</h3>
							<p className="text-sm mt-1">{error}</p>
						</div>
						<Button
							onClick={() => window.location.reload()}
							variant="outline"
							size="sm"
							className="text-red-700 border-red-300 hover:bg-red-50"
						>
							Retry
						</Button>
					</div>
				</div>
			) : (
				<>
					{/* Stats Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
						{dashboardCards.map((card, index) => (
							<div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
								<div className="p-6">
									<div className="flex items-center justify-between mb-4">
										<div className={`p-3 rounded-lg ${card.bgColor} flex-shrink-0`}>
											<div className={card.iconColor}>
												{card.icon}
											</div>
										</div>
										<div className="text-right">
											<h3 className="text-2xl font-bold text-gray-900">{card.value}</h3>
										</div>
									</div>
									<div className="space-y-1">
										<p className="text-gray-600 text-sm font-medium">{card.title}</p>
										<p className="text-gray-500 text-xs">{card.description}</p>
									</div>
								</div>
							</div>
						))}
					</div>

			{/* Recent Tickets Section */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
					<div>
						<h2 className="text-xl font-semibold text-gray-900 mb-1">Recent Tickets</h2>
						<p className="text-gray-600 text-sm">Your most recent support tickets</p>
					</div>
					<div className="flex gap-3 mt-4 md:mt-0">
						<Button variant="outline" asChild>
							<Link href="/admin/helpandsupport/tickets">View All Tickets</Link>
						</Button>
						<Button asChild className="bg-blue-600 hover:bg-blue-700">
							<Link href="/admin/helpandsupport/new">
								<Plus className="mr-2 h-4 w-4" /> New Ticket
							</Link>
						</Button>
					</div>
				</div>

				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{recentTickets.length > 0 ? (
						recentTickets.map((ticket) => (
							<TicketCard key={ticket.id} ticket={ticket} />
						))
					) : (
						<Card className="col-span-full p-8 text-center border-2 border-dashed border-gray-200">
							<MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
							<p className="text-gray-500 mb-4">No tickets found</p>
							<Button asChild>
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
