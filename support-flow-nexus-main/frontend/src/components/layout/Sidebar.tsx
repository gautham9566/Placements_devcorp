import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Ticket, Users, BarChart3, Settings, X, PlusCircle, BookOpen, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTickets } from '@/contexts/TicketContext'; 
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  to: string;
  icon: React.ReactNode;
  badge?: string | number;
  roles: string[];
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { tickets } = useTickets();
  
  // Count open tickets for badge
  const openTicketsCount = tickets.filter(ticket => ticket.status === 'open').length;
  
  // Count tickets assigned to the current agent
  const assignedTicketsCount = user?.role === 'agent' ? 
    tickets.filter(ticket => ticket.assignedTo?.id === user.id).length : 0;
  
  const navigation: NavItem[] = [
    { 
      name: 'Dashboard', 
      to: '/', 
      icon: <Home className="w-5 h-5" />, 
      roles: ['admin', 'agent', 'customer'] 
    },
    { 
      name: 'Tickets', 
      to: '/tickets', 
      icon: <Ticket className="w-5 h-5" />, 
      badge: user?.role === 'admin' ? openTicketsCount : 
             user?.role === 'agent' ? assignedTicketsCount : 
             tickets.filter(t => t.createdBy?.id === user?.id).length,
      roles: ['admin', 'agent', 'customer'] 
    },
    { 
      name: 'Create Ticket', 
      to: '/tickets/new', 
      icon: <PlusCircle className="w-5 h-5" />, 
      roles: ['customer'] 
    },
    { 
      name: 'Knowledge Base', 
      to: '/knowledge', 
      icon: <BookOpen className="w-5 h-5" />, 
      roles: ['admin', 'agent', 'customer'] 
    },
    { 
      name: 'Users', 
      to: '/users', 
      icon: <Users className="w-5 h-5" />, 
      roles: ['admin'] 
    },
    { 
      name: 'Analytics', 
      to: '/analytics', 
      icon: <BarChart3 className="w-5 h-5" />, 
      roles: ['admin', 'agent'] 
    },
    { 
      name: 'Feedback Analysis', 
      to: '/feedback-analysis', 
      icon: <MessageSquare className="w-5 h-5" />, 
      roles: ['admin', 'agent'] 
    },
    { 
      name: 'Settings', 
      to: '/settings', 
      icon: <Settings className="w-5 h-5" />, 
      roles: ['admin', 'agent', 'customer'] 
    },
  ];

  // Filter navigation items based on user role
  const filteredNavigation = user ? navigation.filter(
    item => item.roles.includes(user.role)
  ) : [];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-sidebar text-sidebar-foreground transition duration-300 ease-in-out md:relative md:translate-x-0 md:z-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          <span className="text-lg font-bold">Support Flow Nexus</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="md:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="py-4">
          <nav className="px-2 space-y-1">
            {filteredNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.to}
                className={({ isActive }) =>
                  `group flex items-center py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`
                }
                end={item.to === '/'}
              >
                {item.icon}
                <span className="ml-3">{item.name}</span>
                {item.badge !== undefined && Number(item.badge) > 0 && (
                  <Badge className="ml-auto" variant="outline">
                    {item.badge}
                  </Badge>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
        
        {user?.role === 'customer' && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border">
            <Button 
              variant="default" 
              className="w-full"
              asChild
            >
              <NavLink to="/tickets/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Support Ticket
              </NavLink>
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;

