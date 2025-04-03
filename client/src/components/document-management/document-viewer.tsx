import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription,
  Skeleton
} from '@/components/ui';
import { FileText, Graph, AlertTriangle } from 'lucide-react';
import DocumentService from '@/services/document-service';
import KnowledgeGraphVisualization from '@/components/knowledge-graph/knowledge-graph-visualization';

export interface DocumentViewerProps {
  documentId: number;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ documentId }) => {
  const [activeTab, setActiveTab] = useState('content');

  // Fetch document details
  const { data: documentData, isLoading: isLoadingDocument, error: documentError } = useQuery({
    queryKey: [`/api/documents/${documentId}`],
    queryFn: () => DocumentService.getDocument(documentId)
  });

  // Fetch document content
  const { data: contentData, isLoading: isLoadingContent, error: contentError } = useQuery({
    queryKey: [`/api/documents/${documentId}/content`],
    queryFn: () => DocumentService.getDocumentContent(documentId),
    enabled: activeTab === 'content' // Only fetch when content tab is active
  });

  const document = documentData?.document;
  const content = contentData?.content;
  
  // Function to render document sections
  const renderDocumentSections = () => {
    if (!content?.sections || content.sections.length === 0) {
      return (
        <div className="whitespace-pre-wrap font-mono text-sm bg-slate-50 p-4 rounded">
          {content?.textContent || 'No content available'}
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {content.sections.map((section, index) => (
          <div key={index} className="border-l-4 border-slate-200 pl-4">
            <h3 
              className={`font-semibold ${
                section.level === 1 ? 'text-xl' : 
                section.level === 2 ? 'text-lg' : 
                section.level === 3 ? 'text-base' : 'text-sm'
              } mb-2`}
            >
              {section.title}
            </h3>
            <div className="whitespace-pre-wrap text-sm">
              {section.content}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (isLoadingDocument) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (documentError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading document: {(documentError as Error).message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!document) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Document not found
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="mr-2 h-5 w-5" />
          {document.title}
        </CardTitle>
        {document.description && (
          <CardDescription>{document.description}</CardDescription>
        )}
        <div className="flex gap-2 text-sm text-muted-foreground">
          <span>Uploaded: {new Date(document.createdAt).toLocaleDateString()}</span>
          <span>•</span>
          <span>Size: {(document.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
          <span>•</span>
          <span>Type: {document.mimeType.split('/')[1].toUpperCase()}</span>
        </div>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6">
        <TabsList>
          <TabsTrigger value="content">
            <FileText className="h-4 w-4 mr-2" />
            Document Content
          </TabsTrigger>
          <TabsTrigger 
            value="knowledge-graph"
            disabled={!document.createKnowledgeGraph}
          >
            <Graph className="h-4 w-4 mr-2" />
            Knowledge Graph
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="content" className="py-4">
          {isLoadingContent ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : contentError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Error loading content: {(contentError as Error).message}
              </AlertDescription>
            </Alert>
          ) : !content ? (
            <Alert>
              <AlertDescription>
                No content available for this document. The document may still be processing.
              </AlertDescription>
            </Alert>
          ) : (
            renderDocumentSections()
          )}
        </TabsContent>
        
        <TabsContent value="knowledge-graph" className="py-4">
          {document.createKnowledgeGraph ? (
            <KnowledgeGraphVisualization documentId={document.id} />
          ) : (
            <Alert>
              <AlertDescription>
                This document doesn't have a knowledge graph.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default DocumentViewer;
