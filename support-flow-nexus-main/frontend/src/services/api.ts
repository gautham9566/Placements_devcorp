import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { User, UserRole, Ticket, Comment, KnowledgeItem, TicketStatus } from '@/types';
import { handleApiError } from '@/utils/errorHandler';

const API_BASE_URL = 'http://localhost:5001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for logging
api.interceptors.response.use(
  (response) => {
    console.group('API Response');
    console.log('URL:', response.config.url);
    console.log('Method:', response.config.method?.toUpperCase());
    console.log('Status:', response.status);
    console.log('Response Data:', response.data);
    console.groupEnd();
    return response;
  },
  (error) => {
    handleApiError(error);
    throw error;
  }
);

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

interface LoginResponse {
  access_token: string;
  user: User;
}

// Auth API
export const authAPI = {
  register: async (userData: { email: string; password: string; name: string; role: string }) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  
  login: async (email: string, password: string) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const { access_token, user } = response.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(user));
    return { token: access_token, user };
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  getUsers: async (): Promise<User[]> => {
    try {
      const response: AxiosResponse<User[]> = await api.get('/auth/users');
      return response.data;
    } catch (error) {
      const { message } = handleApiError(error);
      throw new Error(message);
    }
  },
};

interface CreateTicketData {
  title: string;
  description: string;
  category: string;
  priority: string;
}

interface UpdateTicketData {
  status?: string;
  assigned_to_id?: string;
  resolution_stage?: string;
  resolution_notes?: string;
  solution_id?: string;
}

// Tickets API
export const ticketsAPI = {
  createTicket: async (ticketData: {
    title: string;
    description: string;
    category: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
  }) => {
    const response = await api.post('/tickets', ticketData);
    return response.data;
  },
  
  getTickets: async (skip = 0, limit = 100) => {
    const response = await api.get(`/tickets?skip=${skip}&limit=${limit}`);
    return response.data;
  },
  
  getTicket: async (id: number): Promise<Ticket> => {
    try {
      const response = await api.get(`/tickets/${id}`);
      return {
        ...response.data,
        createdBy: response.data.created_by,
        assignedTo: response.data.assigned_to,
        createdAt: new Date(response.data.created_at),
        updatedAt: new Date(response.data.updated_at)
      };
    } catch (error) {
      const { message } = handleApiError(error);
      throw new Error(message);
    }
  },
  
  updateTicket: async (id: string, updateData: {
    status?: TicketStatus;
    assigned_to_id?: string;
    resolution_stage?: string;
    resolution_notes?: string;
    solution_id?: string;
  }) => {
    // Convert frontend status format to backend format
    const backendData = { ...updateData };
    if (backendData.status) {
      backendData.status = backendData.status.replace('-', '_') as any;
    }
    const response = await api.put(`/tickets/${id}`, backendData);
    return response.data;
  },
  
  addComment: async (ticketId: string, content: string) => {
    const response = await api.post(`/tickets/${ticketId}/comments`, { content });
    return response.data;
  },
  
  getComments: async (ticketId: string, skip = 0, limit = 100) => {
    const response = await api.get(`/tickets/${ticketId}/comments?skip=${skip}&limit=${limit}`);
    return response.data;
  },
  
  addAttachment: async (ticketId: string, file: File): Promise<{ id: string; name: string; url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response: AxiosResponse<{ id: string; name: string; url: string }> = await api.post(`/tickets/${ticketId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  submitFeedback: async (ticketId: string, data: { rating: number; comment: string }) => {
    try {
      const response = await api.post(`/tickets/${ticketId}/feedback`, data);
      return response.data;
    } catch (error) {
      const { message } = handleApiError(error);
      throw new Error(message);
    }
  },
  
  // Check if feedback exists for a ticket
  checkFeedback: async (ticketId: string) => {
    try {
      const response = await api.get(`/tickets/${ticketId}/feedback`);
      return response.data;
    } catch (error) {
      throw error; // Let the caller handle the error (404 means no feedback)
    }
  },
  getAllFeedback: async (): Promise<Feedback[]> => {
    const response = await fetch('/api/feedback', {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch feedback');
    }
    
    return response.json();
  },
};

interface CreateArticleData {
  title: string;
  content: string;
  category: string;
  tags: string[];
}

// Knowledge Base API
export const knowledgeAPI = {
  createArticle: async (articleData: {
    title: string;
    content: string;
    category: string;
    tags: string[];
  }) => {
    const response = await api.post('/knowledge', articleData);
    return response.data;
  },
  
  getArticles: async (skip = 0, limit = 100, category?: string) => {
    const params = new URLSearchParams({ skip: skip.toString(), limit: limit.toString() });
    if (category) {
      params.append('category', category);
    }
    const response = await api.get(`/knowledge?${params}`);
    return response.data;
  },
  
  getArticle: async (id: number) => {
    const response = await api.get(`/knowledge/${id}`);
    return response.data;
  },
  
  updateArticle: async (id: number, updateData: {
    title?: string;
    content?: string;
    category?: string;
    tags?: string[];
  }) => {
    const response = await api.put(`/knowledge/${id}`, updateData);
    return response.data;
  },
  
  deleteArticle: async (id: number) => {
    await api.delete(`/knowledge/${id}`);
  },
};

export const feedbackAPI = {
  getStats: async () => {
    const response = await api.get('/feedback/stats');
    return response.data;
  },
};

