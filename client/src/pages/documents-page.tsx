import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import PageHeader from '../components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUp, Filter, RefreshCw, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import DocumentListStatus from '../components/document-management/document-list-status';

export default function DocumentsPage() {
  const [_, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [currentTab, setCurrentTab] = useState('all');
  
  // Fetch documents
  const { 
    data: documents, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['/api/documents'],
    queryFn: async () => {
      const res = await fetch('/api/documents');
      if (!res.ok) {
        throw new Error('Failed to fetch documents');
      }
      return res.json();
    },
  });
  
  // Filter documents based on search query, category, and tab
  const filteredDocuments = documents?.filter((doc: any) => {
    // Search query filter
    const matchesQuery = searchQuery === '' || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.tags && doc.tags.some((tag: string) => 
        tag.toLowerCase().includes(searchQuery.toLowerCase())));
    
    // Category filter
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    
    // Tab filter
    let matchesTab = true;
    if (currentTab === 'my-documents') {
      matchesTab = doc.isOwnedByCurrentUser;
    } else if (currentTab === 'shared-with-me') {
      matchesTab = doc.isSharedWithCurrentUser && !doc.isOwnedByCurrentUser;
    } else if (currentTab === 'public') {
      matchesTab = doc.isPublic;
    }
    
    return matchesQuery && matchesCategory && matchesTab;
  });

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-6">
      <PageHeader
        title="Document Management"
        description="Upload, manage, and share training documents and manuals"
        actions={
          <Button 
            onClick={() => navigate('/document-upload')}
            className="gap-1"
          >
            <FileUp className="h-4 w-4" />
            Upload Document
          </Button>
        }
      />
      
      <Tabs 
        defaultValue="all" 
        className="space-y-6"
        onValueChange={setCurrentTab}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="all">All Documents</TabsTrigger>
            <TabsTrigger value="my-documents">My Documents</TabsTrigger>
            <TabsTrigger value="shared-with-me">Shared With Me</TabsTrigger>
            <TabsTrigger value="public">Public Library</TabsTrigger>
          </TabsList>
          
          <div className="flex flex-1 sm:max-w-md gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search documents..." 
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-auto gap-1">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Category</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="training">Training Material</SelectItem>
                <SelectItem value="manual">Manuals</SelectItem>
                <SelectItem value="regulatory">Regulatory Documents</SelectItem>
                <SelectItem value="procedure">Procedures</SelectItem>
                <SelectItem value="checklist">Checklists</SelectItem>
                <SelectItem value="report">Reports</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => refetch()}
              title="Refresh documents"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <TabsContent value="all" className="mt-6">
          <DocumentListStatus 
            documents={filteredDocuments} 
            isLoading={isLoading} 
            error={error as Error | null}
            onRefresh={refetch}
          />
        </TabsContent>
        
        <TabsContent value="my-documents" className="mt-6">
          <DocumentListStatus 
            documents={filteredDocuments} 
            isLoading={isLoading} 
            error={error as Error | null}
            onRefresh={refetch}
          />
        </TabsContent>
        
        <TabsContent value="shared-with-me" className="mt-6">
          <DocumentListStatus 
            documents={filteredDocuments} 
            isLoading={isLoading} 
            error={error as Error | null}
            onRefresh={refetch}
          />
        </TabsContent>
        
        <TabsContent value="public" className="mt-6">
          <DocumentListStatus 
            documents={filteredDocuments} 
            isLoading={isLoading} 
            error={error as Error | null}
            onRefresh={refetch}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}