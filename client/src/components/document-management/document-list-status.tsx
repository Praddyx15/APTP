import React from 'react';
import { format } from 'date-fns';
import { Loader2, FileText, AlertCircle, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type Document = {
  id: number;
  title: string;
  description: string | null;
  fileType: string;
  fileSize: number;
  uploadedById: number;
  uploadedByName?: string;
  uploadedByAvatar?: string;
  uploadedAt: Date | string;
  isProcessed: boolean;
  category: string;
  tags?: string[];
  isPublic?: boolean;
  isOwnedByCurrentUser?: boolean;
  isSharedWithCurrentUser?: boolean;
  viewCount?: number;
  lastViewed?: Date | string | null;
};

interface DocumentListStatusProps {
  documents: Document[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRefresh: () => void;
}

export default function DocumentListStatus({ 
  documents, 
  isLoading, 
  error, 
  onRefresh 
}: DocumentListStatusProps) {
  const { toast } = useToast();
  
  // Empty state
  if (!isLoading && !error && (!documents || documents.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="bg-muted/30 rounded-full p-4 mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No documents found</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          No documents match your current filters or there are no documents uploaded yet.
        </p>
        <Button onClick={onRefresh} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
    );
  }
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading documents...</p>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="bg-destructive/10 rounded-full p-4 mb-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-medium mb-2">Failed to load documents</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          {error.message || "An error occurred while fetching documents. Please try again later."}
        </p>
        <Button onClick={onRefresh} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }
  
  // Format file size function
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  // Document category colors
  const getCategoryColor = (category: string): string => {
    switch (category.toLowerCase()) {
      case 'training': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'manual': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
      case 'regulatory': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'procedure': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'checklist': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'report': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };
  
  // Format date function
  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return 'Unknown';
    try {
      return format(new Date(date), 'MMM d, yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  // Document content render
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents && documents.map((doc) => (
        <Card key={doc.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-3">
              <div className="bg-primary/10 p-2 rounded">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium line-clamp-1">{doc.title}</h3>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span>{doc.fileType.toUpperCase()}</span>
                  <span>•</span>
                  <span>{formatFileSize(doc.fileSize)}</span>
                </div>
              </div>
            </div>
            {doc.isPublic && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-xs">Public</Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This document is available to all users</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          <div className="p-4 flex-1">
            {doc.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {doc.description}
              </p>
            )}
            
            {doc.tags && doc.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {doc.tags.slice(0, 3).map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {doc.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{doc.tags.length - 3} more
                  </Badge>
                )}
              </div>
            )}
            
            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-xs ${getCategoryColor(doc.category)}`}>
                  {doc.category}
                </Badge>
                
                {doc.isProcessed ? (
                  <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs">
                    Processed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 text-xs">
                    Pending
                  </Badge>
                )}
              </div>
              
              {doc.viewCount !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {doc.viewCount} views
                </span>
              )}
            </div>
          </div>
          
          <div className="p-4 border-t bg-muted/10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar className="h-6 w-6">
                <AvatarImage src={doc.uploadedByAvatar} alt={doc.uploadedByName || 'User'} />
                <AvatarFallback>
                  {(doc.uploadedByName?.charAt(0) || 'U').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="block font-medium">{doc.uploadedByName || 'Unknown user'}</span>
                <span>Uploaded {formatDate(doc.uploadedAt)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2" 
                onClick={() => {
                  // View document function
                  toast({
                    title: "Document Viewer",
                    description: "Document viewer functionality coming soon",
                  });
                }}
              >
                View
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}