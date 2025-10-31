
import React, { useState } from 'react';
import { Plus, Search, Tag, Filter } from 'lucide-react';
import { useTickets } from '@/contexts/TicketContext';
import { useAuth } from '@/contexts/AuthContext';
import { KnowledgeItem, TicketCategory } from '@/types';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { format } from 'date-fns';

const KnowledgeBase: React.FC = () => {
  const { knowledgeBase, searchKnowledgeBase, addSolutionToKnowledgeBase } = useTickets();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | ''>('');
  const [searchResults, setSearchResults] = useState<KnowledgeItem[]>([]);
  
  // New solution form state
  const [newSolution, setNewSolution] = useState({
    title: '',
    content: '',
    category: 'technical' as TicketCategory,
    tags: ''
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Handle search
  const handleSearch = () => {
    if (!searchTerm && !categoryFilter) {
      setSearchResults([]);
      return;
    }
    
    const results = searchKnowledgeBase(
      searchTerm, 
      categoryFilter ? categoryFilter as TicketCategory : undefined
    );
    setSearchResults(results);
  };

  // Reset search
  const resetSearch = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setSearchResults([]);
  };

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNewSolution(prev => ({ ...prev, [name]: value }));
  };

  // Handle category selection
  const handleCategoryChange = (value: string) => {
    setNewSolution(prev => ({ 
      ...prev, 
      category: value as TicketCategory 
    }));
  };

  // Handle filter category selection
  const handleFilterCategoryChange = (value: string) => {
    setCategoryFilter(value as TicketCategory | '');
  };

  // Submit new solution
  const handleSubmit = async () => {
    try {
      // Split tags by commas and trim whitespace
      const tagsList = newSolution.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag !== '');

      await addSolutionToKnowledgeBase(
        newSolution.title,
        newSolution.content,
        newSolution.category,
        tagsList
      );

      toast.success("Solution added to Knowledge Base");
      
      // Reset form and close dialog
      setNewSolution({
        title: '',
        content: '',
        category: 'technical',
        tags: ''
      });
      setIsDialogOpen(false);
      
      // Reset search to show all items
      resetSearch();
    } catch (error) {
      toast.error("Failed to add solution");
      console.error(error);
    }
  };

  // Get all knowledge items or search results
  const displayedItems = searchResults.length > 0 || searchTerm || categoryFilter 
    ? searchResults 
    : knowledgeBase;

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">
            Find solutions for common problems or contribute your own
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Solution
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Add Solution to Knowledge Base</DialogTitle>
              <DialogDescription>
                Share your solution to help others with similar issues
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="title" className="text-sm font-medium">Title</label>
                <Input
                  id="title"
                  name="title"
                  value={newSolution.title}
                  onChange={handleInputChange}
                  placeholder="Solution title"
                />
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="category" className="text-sm font-medium">Category</label>
                <Select 
                  value={newSolution.category} 
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="feature-request">Feature Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="content" className="text-sm font-medium">Content</label>
                <Textarea
                  id="content"
                  name="content"
                  value={newSolution.content}
                  onChange={handleInputChange}
                  placeholder="Detailed solution"
                  rows={5}
                />
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="tags" className="text-sm font-medium">Tags (comma separated)</label>
                <Input
                  id="tags"
                  name="tags"
                  value={newSolution.tags}
                  onChange={handleInputChange}
                  placeholder="e.g. login, password, authentication"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" onClick={handleSubmit}>
                Submit Solution
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Search & filter section */}
      <div className="bg-card rounded-lg shadow-sm border p-4 mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              className="pl-10"
              placeholder="Search knowledge base..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="w-full sm:w-64">
            <Select 
              value={categoryFilter} 
              onValueChange={handleFilterCategoryChange}
            >
              <SelectTrigger>
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" />
                  <span>{categoryFilter || 'All Categories'}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="feature-request">Feature Request</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button onClick={handleSearch} className="sm:w-auto">
            Search
          </Button>
          
          {(searchTerm || categoryFilter) && (
            <Button variant="outline" onClick={resetSearch} className="sm:w-auto">
              Reset
            </Button>
          )}
        </div>
      </div>
      
      {/* Results section */}
      {displayedItems.length === 0 ? (
        <div className="text-center p-12 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground mb-2">No solutions found</p>
          <p className="text-sm">Try a different search term or add a new solution</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {displayedItems.map((item) => (
            <Card key={item.id} className="flex flex-col h-full">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="flex-1">{item.title}</CardTitle>
                  <Badge variant="outline" className="capitalize">
                    {item.category}
                  </Badge>
                </div>
                <CardDescription>
                  Added by {item.createdBy.name} on {format(new Date(item.createdAt), 'MMM d, yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm">{item.content}</p>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2 border-t pt-4">
                {item.tags.map((tag) => (
                  <div key={tag} className="flex items-center text-xs bg-muted rounded-full px-2.5 py-1">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </div>
                ))}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
