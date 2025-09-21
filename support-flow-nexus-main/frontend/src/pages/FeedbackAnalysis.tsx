import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { feedbackAPI } from '@/services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import { format } from 'date-fns';
import { Star } from 'lucide-react';

interface FeedbackStats {
  averageRating: number;
  totalFeedback: number;
  ratingDistribution: { rating: number; count: number }[];
  sentimentDistribution: { sentiment: string; count: number }[];
}

interface Feedback {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  ticket: {
    id: number;
    title: string;
  };
  customer: {
    name: string;
  };
}

const FeedbackAnalysis: React.FC = () => {
  const [showFeedbackList, setShowFeedbackList] = useState(false);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleShowFeedback = async () => {
    setIsLoading(true);
    try {
      const response = await ticketsAPI.getAllFeedback();
      setFeedbackList(response);
      setShowFeedbackList(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch feedback list',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const { data: stats, isLoading: statsLoading } = useQuery<FeedbackStats>({
    queryKey: ['feedbackStats'],
    queryFn: feedbackAPI.getStats
  });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Feedback Analysis</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.averageRating.toFixed(1)} / 5.0
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={handleShowFeedback}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalFeedback}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.ratingDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rating" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sentiment Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.sentimentDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sentiment" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showFeedbackList} onOpenChange={setShowFeedbackList}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Feedback List</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {feedbackList.map((feedback) => (
                  <Card key={feedback.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                          Ticket #{feedback.ticket.id}: {feedback.ticket.title}
                        </CardTitle>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: feedback.rating }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </div>
                      <CardDescription>{feedback.customer.name}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{feedback.comment}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(feedback.createdAt), 'PPP')}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeedbackAnalysis;



