
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import TicketForm from '@/components/tickets/TicketForm';

const CreateTicket: React.FC = () => {
  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link to="/tickets">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Create a New Ticket</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Support Ticket Request</CardTitle>
          <CardDescription>
            Fill out the form below to submit a new support ticket.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TicketForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTicket;
