import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  FileTextIcon, 
  NetworkIcon, 
  DownloadIcon, 
  AlertCircleIcon 
} from 'lucide-react';

interface DocumentViewerProps {
  documentId: string;
}

interface DocumentContent {
  content: string;
  structure: any;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ documentId }) => {
  const [activeTab, setActiveTab] = useState('content');

  // Fetch document content
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/documents/${documentId}/content`],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/documents/${documentId}/content`);
        return await response.json() as DocumentContent;
      } catch (error) {
        throw new Error('Failed to load document content');
      }
    },
  });

  // Handle document download
  const handleDownload = async () => {
    try {
      const response = await apiRequest('GET', `/api/documents/${documentId}/download`, null, {
        responseType: 'blob'
      });
      
      // Create a download link and trigger it
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use a default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'document';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load document content. The document may still be processing or an error occurred.
        </AlertDescription>
      </Alert>
    );
  }

  // Render document content
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="content" className="flex items-center gap-1">
              <FileTextIcon className="h-4 w-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="structure" className="flex items-center gap-1">
              <NetworkIcon className="h-4 w-4" />
              Structure
            </TabsTrigger>
          </TabsList>
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-auto flex items-center gap-1"
            onClick={handleDownload}
          >
            <DownloadIcon className="h-4 w-4" />
            Download
          </Button>
        </Tabs>
      </div>

      <TabsContent value="content" className="mt-0">
        <div className="p-4 border rounded-md bg-white">
          <div className="prose max-w-none">
            {data?.content ? (
              <div dangerouslySetInnerHTML={{ __html: formatContent(data.content) }} />
            ) : (
              <p className="text-muted-foreground">No content available</p>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="structure" className="mt-0">
        <div className="p-4 border rounded-md bg-white">
          {data?.structure ? (
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(data.structure, null, 2)}
            </pre>
          ) : (
            <p className="text-muted-foreground">No structure data available</p>
          )}
        </div>
      </TabsContent>
    </div>
  );
};

// Format document content for display
function formatContent(content: string): string {
  // Convert line breaks to paragraphs
  const withParagraphs = content
    .split(/\n\n+/)
    .filter(paragraph => paragraph.trim().length > 0)
    .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
  
  return withParagraphs;
}

export default DocumentViewer;