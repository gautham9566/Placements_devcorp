
import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTickets } from '@/contexts/TicketContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TicketCategory, TicketPriority, TicketStatus } from '@/types';

const COLORS = {
  // Status colors
  open: '#3b82f6', // blue
  'in-progress': '#f59e0b', // yellow
  resolved: '#10b981', // green
  
  // Priority colors
  high: '#ef4444', // red
  medium: '#f59e0b', // orange
  low: '#10b981', // green
  
  // Category colors
  technical: '#8b5cf6', // purple
  billing: '#ec4899', // pink
  general: '#6366f1', // indigo
  'feature-request': '#0ea5e9', // sky
};

const CUSTOM_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

const Analytics: React.FC = () => {
  const { tickets } = useTickets();
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days' | 'all'>('30days');
  
  // Filter tickets based on time range
  const getFilteredTickets = () => {
    if (timeRange === 'all') return tickets;
    
    const now = new Date();
    let daysAgo;
    
    switch (timeRange) {
      case '7days':
        daysAgo = 7;
        break;
      case '30days':
        daysAgo = 30;
        break;
      case '90days':
        daysAgo = 90;
        break;
      default:
        daysAgo = 30;
    }
    
    const dateThreshold = new Date(now.setDate(now.getDate() - daysAgo)).toISOString();
    
    return tickets.filter(ticket => new Date(ticket.createdAt) >= new Date(dateThreshold));
  };
  
  const filteredTickets = getFilteredTickets();
  
  // Prepare data for charts
  const prepareStatusData = () => {
    const statusCounts: Record<TicketStatus, number> = {
      'open': 0,
      'in-progress': 0,
      'resolved': 0
    };
    
    filteredTickets.forEach(ticket => {
      statusCounts[ticket.status]++;
    });
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: COLORS[status as TicketStatus]
    }));
  };
  
  const preparePriorityData = () => {
    const priorityCounts: Record<TicketPriority, number> = {
      'high': 0,
      'medium': 0,
      'low': 0
    };
    
    filteredTickets.forEach(ticket => {
      priorityCounts[ticket.priority]++;
    });
    
    return Object.entries(priorityCounts).map(([priority, count]) => ({
      name: priority.charAt(0).toUpperCase() + priority.slice(1),
      value: count,
      color: COLORS[priority as TicketPriority]
    }));
  };
  
  const prepareCategoryData = () => {
    const categoryCounts: Record<TicketCategory, number> = {
      'technical': 0,
      'billing': 0,
      'general': 0,
      'feature-request': 0
    };
    
    filteredTickets.forEach(ticket => {
      categoryCounts[ticket.category]++;
    });
    
    return Object.entries(categoryCounts).map(([category, count]) => ({
      name: category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      value: count,
      color: COLORS[category as TicketCategory]
    }));
  };
  
  const prepareTimeToResolveData = () => {
    // Only consider resolved tickets
    const resolvedTickets = filteredTickets.filter(ticket => ticket.status === 'resolved');
    
    if (resolvedTickets.length === 0) return [];
    
    // Calculate time to resolve for each category
    const categoryResolveTime: Record<TicketCategory, { total: number, count: number }> = {
      'technical': { total: 0, count: 0 },
      'billing': { total: 0, count: 0 },
      'general': { total: 0, count: 0 },
      'feature-request': { total: 0, count: 0 }
    };
    
    resolvedTickets.forEach(ticket => {
      const createdAt = new Date(ticket.createdAt).getTime();
      const updatedAt = new Date(ticket.updatedAt).getTime();
      const resolveTime = (updatedAt - createdAt) / (1000 * 60 * 60 * 24); // days
      
      categoryResolveTime[ticket.category].total += resolveTime;
      categoryResolveTime[ticket.category].count++;
    });
    
    return Object.entries(categoryResolveTime)
      .filter(([_, data]) => data.count > 0)
      .map(([category, data]) => ({
        name: category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        value: Math.round((data.total / data.count) * 10) / 10, // Average with 1 decimal place
      }));
  };
  
  const statusData = prepareStatusData();
  const priorityData = preparePriorityData();
  const categoryData = prepareCategoryData();
  const resolveTimeData = prepareTimeToResolveData();
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        
        <Select
          value={timeRange}
          onValueChange={(value) => setTimeRange(value as any)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="90days">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Resolution Performance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Tickets by Status</CardTitle>
                <CardDescription>
                  Distribution of tickets by current status
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || CUSTOM_COLORS[index % CUSTOM_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Tickets by Priority</CardTitle>
                <CardDescription>
                  Distribution of tickets by priority level
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || CUSTOM_COLORS[index % CUSTOM_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Tickets by Category</CardTitle>
                <CardDescription>
                  Distribution of tickets by category
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || CUSTOM_COLORS[index % CUSTOM_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Ticket Volume</CardTitle>
              <CardDescription>Number of tickets by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={statusData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Tickets" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Average Resolution Time</CardTitle>
              <CardDescription>Average days to resolve tickets by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={resolveTimeData}
                    layout="vertical"
                    margin={{
                      top: 20,
                      right: 30,
                      left: 60,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" />
                    <Tooltip formatter={(value) => [`${value} days`, 'Avg. Resolution Time']} />
                    <Legend />
                    <Bar dataKey="value" name="Average Days to Resolve" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
