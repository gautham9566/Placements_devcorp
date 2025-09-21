import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TicketProvider } from "@/contexts/TicketContext";

import AppLayout from "@/components/layout/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import TicketsList from "@/pages/TicketsList";
import CreateTicket from "@/pages/CreateTicket";
import TicketDetails from "@/pages/TicketDetails";
import UsersList from "@/pages/UsersList";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import { KnowledgeBasePage } from "@/pages/KnowledgeBasePage";
import Unauthorized from "@/pages/Unauthorized";
import NotFound from "@/pages/NotFound";
import FeedbackAnalysis from '@/pages/FeedbackAnalysis';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <TicketProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/unauthorized" element={<Unauthorized />} />
                
                {/* Protected routes for all authenticated users */}
                <Route 
                  path="/" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/tickets" 
                  element={
                    <ProtectedRoute>
                      <TicketsList />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/tickets/new" 
                  element={
                    <ProtectedRoute>
                      <CreateTicket />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/tickets/:id" 
                  element={
                    <ProtectedRoute>
                      <TicketDetails />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Knowledge Base (all users) */}
                <Route 
                  path="/knowledge" 
                  element={
                    <ProtectedRoute>
                      <KnowledgeBasePage />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Analytics and Feedback Analysis (admin & agent only) */}
                <Route 
                  path="/analytics" 
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'agent']}>
                      <Analytics />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/feedback-analysis" 
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'agent']}>
                      <FeedbackAnalysis />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Settings page (all users) */}
                <Route 
                  path="/settings" 
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Admin-only routes */}
                <Route 
                  path="/users" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <UsersList />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Fallback for undefined routes */}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TicketProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

