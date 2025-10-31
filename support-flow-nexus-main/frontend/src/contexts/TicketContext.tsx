import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Ticket, TicketStatus, TicketPriority, TicketCategory, Comment, User, Resolution, ResolutionStage, KnowledgeItem } from '@/types';
import { useAuth } from './AuthContext';
import { ticketsAPI, knowledgeAPI, authAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface TicketContextType {
  tickets: Ticket[];
  knowledgeBase: KnowledgeItem[];
  getTicketById: (id: string) => Promise<Ticket>;
  createTicket: (
    title: string,
    description: string,
    category: TicketCategory,
    priority: TicketPriority
  ) => Promise<Ticket>;
  updateTicketStatus: (id: string, status: TicketStatus) => Promise<Ticket>;
  assignTicket: (id: string, agentId: string, agentName: string) => Promise<Ticket>;
  addComment: (ticketId: string, content: string) => Promise<Comment>;
  filterTickets: (
    status?: TicketStatus[],
    priority?: TicketPriority[],
    search?: string
  ) => Ticket[];
  getAgents: () => Promise<User[]>;
  updateResolution: (
    ticketId: string, 
    stage: ResolutionStage, 
    notes: string
  ) => Promise<Ticket>;
  addSolutionToKnowledgeBase: (
    title: string,
    content: string,
    category: TicketCategory,
    tags: string[]
  ) => Promise<KnowledgeItem>;
  searchKnowledgeBase: (search: string, category?: TicketCategory) => KnowledgeItem[];
  linkSolutionToTicket: (ticketId: string, solutionId: string) => Promise<Ticket>;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

// Separate the hook into a named function declaration
function useTickets() {
  const context = useContext(TicketContext);
  if (context === undefined) {
    throw new Error('useTickets must be used within a TicketProvider');
  }
  return context;
}

export { useTickets };

export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeItem[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [ticketsData, knowledgeData] = await Promise.all([
          ticketsAPI.getTickets(),
          knowledgeAPI.getArticles()
        ]);
        setTickets(ticketsData);
        setKnowledgeBase(knowledgeData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load data',
          variant: 'destructive',
        });
      }
    };

    if (user) {
      loadData();
    }
  }, [user]);

  const getTicketById = useCallback(async (id: string): Promise<Ticket> => {
    try {
      const ticket = await ticketsAPI.getTicket(id);
      // Update the ticket in local state if it exists
      setTickets(prev => prev.map(t => t.id === id ? ticket : t));
      return ticket;
    } catch (error) {
      console.error('Error fetching ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch ticket details',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  const createTicket = async (
    title: string,
    description: string,
    category: TicketCategory,
    priority: TicketPriority
  ): Promise<Ticket> => {
    try {
      const newTicket = await ticketsAPI.createTicket({
        title,
        description,
        category,
        priority
      });
      setTickets(prev => [...prev, newTicket]);
      return newTicket;
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to create ticket',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateTicketStatus = async (id: string, status: TicketStatus): Promise<Ticket> => {
    try {
      const updatedTicket = await ticketsAPI.updateTicket(id, { status });
      setTickets(prev => prev.map(t => t.id === id ? updatedTicket : t));
      return updatedTicket;
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ticket status',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const assignTicket = async (id: string, agentId: string, agentName: string): Promise<Ticket> => {
    try {
      const updatedTicket = await ticketsAPI.updateTicket(id, { assigned_to_id: agentId });
      setTickets(prev => prev.map(t => t.id === id ? updatedTicket : t));
      return updatedTicket;
    } catch (error) {
      console.error('Error assigning ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign ticket',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const addComment = async (ticketId: string, content: string): Promise<Comment> => {
    try {
      const newComment = await ticketsAPI.addComment(ticketId, content);
      
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) {
        const updatedComments = [
          {
            ...newComment,
            userName: newComment.user?.name || 'Unknown User',
            userAvatar: newComment.user?.avatar || '',
            userId: newComment.user?.id || '',
          },
          ...(ticket.comments || [])
        ];
        
        const updatedTicket = {
          ...ticket,
          comments: updatedComments
        };
        
        setTickets(prev => prev.map(t => t.id === ticketId ? updatedTicket : t));
      }
      
      return {
        ...newComment,
        userName: newComment.user?.name || 'Unknown User',
        userAvatar: newComment.user?.avatar || '',
        userId: newComment.user?.id || '',
      };
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  };

  const filterTickets = (
    status?: TicketStatus[],
    priority?: TicketPriority[],
    search?: string
  ): Ticket[] => {
    let filtered = [...tickets];

    if (status && status.length > 0) {
      filtered = filtered.filter(ticket => status.includes(ticket.status));
    }

    if (priority && priority.length > 0) {
      filtered = filtered.filter(ticket => priority.includes(ticket.priority));
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(ticket =>
        ticket.title.toLowerCase().includes(searchLower) ||
        ticket.description.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  const getAgents = useCallback(async (): Promise<User[]> => {
    try {
      const users = await authAPI.getUsers();
      return users.filter(user => user.role === 'admin' || user.role === 'agent');
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch agents',
        variant: 'destructive',
      });
      return [];
    }
  }, [toast]);

  const updateResolution = async (
    ticketId: string,
    stage: ResolutionStage,
    notes: string
  ): Promise<Ticket> => {
    try {
      const updatedTicket = await ticketsAPI.updateTicket(ticketId, {
        resolution_stage: stage,
        resolution_notes: notes
      });
      setTickets(prev => prev.map(t => t.id === ticketId ? updatedTicket : t));
      return updatedTicket;
    } catch (error) {
      console.error('Error updating resolution:', error);
      toast({
        title: 'Error',
        description: 'Failed to update resolution',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const addSolutionToKnowledgeBase = async (
    title: string,
    content: string,
    category: TicketCategory,
    tags: string[]
  ): Promise<KnowledgeItem> => {
    try {
      const newArticle = await knowledgeAPI.createArticle({
        title,
        content,
        category,
        tags
      });
      setKnowledgeBase(prev => [...prev, newArticle]);
      return newArticle;
    } catch (error) {
      console.error('Error adding solution:', error);
      toast({
        title: 'Error',
        description: 'Failed to add solution',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const searchKnowledgeBase = (search: string, category?: TicketCategory): KnowledgeItem[] => {
    let filtered = [...knowledgeBase];

    if (category) {
      filtered = filtered.filter(article => article.category === category);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(searchLower) ||
        article.content.toLowerCase().includes(searchLower) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  };

  const linkSolutionToTicket = async (ticketId: string, solutionId: string): Promise<Ticket> => {
    try {
      const updatedTicket = await ticketsAPI.updateTicket(ticketId, { solution_id: solutionId });
      setTickets(prev => prev.map(t => t.id === ticketId ? updatedTicket : t));
      return updatedTicket;
    } catch (error) {
      console.error('Error linking solution:', error);
      toast({
        title: 'Error',
        description: 'Failed to link solution',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return (
    <TicketContext.Provider value={{
      tickets,
      knowledgeBase,
      getTicketById,
      createTicket,
      updateTicketStatus,
      assignTicket,
      addComment,
      filterTickets,
      getAgents,
      updateResolution,
      addSolutionToKnowledgeBase,
      searchKnowledgeBase,
      linkSolutionToTicket
    }}>
      {children}
    </TicketContext.Provider>
  );
};




