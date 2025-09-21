
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTickets } from '@/contexts/TicketContext';
import { TicketPriority, TicketStatus } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter } from 'lucide-react';
import TicketCard from '@/components/tickets/TicketCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const TicketsList: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<TicketPriority[]>([]);
  const [activeTab, setActiveTab] = useState<TicketStatus | 'all'>('all');
  
  const { tickets, filterTickets } = useTickets();
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const handleStatusChange = (status: TicketStatus) => {
    setSelectedStatus(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };
  
  const handlePriorityChange = (priority: TicketPriority) => {
    setSelectedPriorities(prev => {
      if (prev.includes(priority)) {
        return prev.filter(p => p !== priority);
      } else {
        return [...prev, priority];
      }
    });
  };
  
  const handleTabChange = (value: string) => {
    setActiveTab(value as TicketStatus | 'all');
    if (value === 'all') {
      setSelectedStatus([]);
    } else {
      setSelectedStatus([value as TicketStatus]);
    }
  };
  
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStatus([]);
    setSelectedPriorities([]);
    setActiveTab('all');
  };
  
  // Apply filters
  const filteredTickets = filterTickets(
    selectedStatus.length > 0 ? selectedStatus : undefined,
    selectedPriorities.length > 0 ? selectedPriorities : undefined,
    searchQuery
  );

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
        <Button asChild>
          <Link to="/tickets/new">
            <Plus className="mr-2 h-4 w-4" /> New Ticket
          </Link>
        </Button>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            className="pl-8"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>Filter</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Priority</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={selectedPriorities.includes('high')}
                onCheckedChange={() => handlePriorityChange('high')}
              >
                High
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={selectedPriorities.includes('medium')}
                onCheckedChange={() => handlePriorityChange('medium')}
              >
                Medium
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={selectedPriorities.includes('low')}
                onCheckedChange={() => handlePriorityChange('low')}
              >
                Low
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {(searchQuery || selectedPriorities.length > 0) && (
            <Button variant="ghost" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTickets.length > 0 ? (
              filteredTickets.map(ticket => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))
            ) : (
              <Card className="col-span-full p-6 text-center">
                <CardContent className="pt-6">
                  <p className="text-muted-foreground mb-4">No tickets found matching your criteria</p>
                  <Button onClick={clearFilters} variant="outline">Clear Filters</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        {['open', 'in-progress', 'resolved'].map((status) => (
          <TabsContent key={status} value={status} className="mt-0">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTickets.length > 0 ? (
                filteredTickets.map(ticket => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))
              ) : (
                <Card className="col-span-full p-6 text-center">
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground mb-4">No {status.replace('-', ' ')} tickets found</p>
                    <Button onClick={clearFilters} variant="outline">Clear Filters</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default TicketsList;
