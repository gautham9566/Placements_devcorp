export interface KnowledgeArticle {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string[];
  priority: number;
  created_at: string;
  updated_at: string;
}

export type SortOrder = 'asc' | 'desc';
export type SortField = 'updated_at' | 'created_at' | 'priority' | 'title'; 