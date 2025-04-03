/**
 * Document Detail Page
 * Displays document details and content with options to analyze and generate knowledge graph
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation, useParams, Link } from 'wouter';
import { documentService } from '../services/document-service';
import { DocumentProcessingStatus } from '../../../shared/document-types';

interface DocumentDetailPageProps {
  id?: string;
}

export default function DocumentDetailPage({ id: propId }: DocumentDetailPageProps = {}) {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'details' | 'content' | 'analysis'>('details');
  
  // Use either the prop ID or the one from the params
  const id = propId || params.id;
  
  const documentId = parseInt(id);
  
  const {
    data: document,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['/api/documents', documentId],
    queryFn: () => documentService.getDocument(documentId),
    enabled: !isNaN(documentId),
  });
  
  const {
    data: documentContent,
    isLoading: isContentLoading,
    error: contentError,
  } = useQuery({
    queryKey: ['/api/documents', documentId, 'content'],
    queryFn: () => documentService.getDocumentContent(documentId),
    enabled: !isNaN(documentId) && document?.processingStatus === 'completed',
  });
  
  const processDocumentMutation = useMutation({
    mutationFn: () => documentService.processDocument(documentId),
    onSuccess: () => {
      refetch();
    },
  });
  
  const generateKnowledgeGraphMutation = useMutation({
    mutationFn: () => documentService.generateKnowledgeGraph(documentId),
    onSuccess: (data) => {
      refetch();
      // Redirect to knowledge graph page
      setLocation(`/knowledge-graphs/${data.graphId}`);
    },
  });
  
  const handleProcessDocument = () => {
    processDocumentMutation.mutate();
  };
  
  const handleGenerateKnowledgeGraph = () => {
    generateKnowledgeGraphMutation.mutate();
  };
  
  const handleDownload = () => {
    window.open(`/api/documents/${documentId}/download`, '_blank');
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }
  
  if (error || !document) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> Document not found or failed to load.</span>
        </div>
        <div className="mt-4">
          <Link href="/documents">
            <a className="text-primary hover:underline">
              &larr; Back to documents
            </a>
          </Link>
        </div>
      </div>
    );
  }
  
  const isProcessing = document.processingStatus === 'processing';
  const isProcessed = document.processingStatus === 'completed';
  const hasProcessingError = document.processingStatus === 'failed';
  const needsProcessing = document.processingStatus === 'pending' || hasProcessingError;
  
  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <Link href="/documents">
          <a className="text-primary hover:underline">
            &larr; Back to documents
          </a>
        </Link>
      </div>
      
      <div className="flex flex-col lg:flex-row justify-between lg:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">{document.title}</h1>
          {document.description && (
            <p className="text-muted-foreground">{document.description}</p>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
          >
            Download
          </button>
          
          <Link href={`/documents/${documentId}/edit`}>
            <a className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600">
              Edit
            </a>
          </Link>
          
          {needsProcessing && (
            <button
              onClick={handleProcessDocument}
              disabled={processDocumentMutation.isPending}
              className="px-3 py-1.5 bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:opacity-50"
            >
              {processDocumentMutation.isPending ? 'Processing...' : 'Process Document'}
            </button>
          )}
          
          {isProcessed && !document.knowledgeGraphGenerated && (
            <button
              onClick={handleGenerateKnowledgeGraph}
              disabled={generateKnowledgeGraphMutation.isPending}
              className="px-3 py-1.5 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50"
            >
              {generateKnowledgeGraphMutation.isPending ? 'Generating...' : 'Generate Knowledge Graph'}
            </button>
          )}
          
          {document.knowledgeGraphGenerated && document.knowledgeGraphId && (
            <Link href={`/knowledge-graphs/${document.knowledgeGraphId}`}>
              <a className="px-3 py-1.5 bg-purple-500 text-white rounded-md hover:bg-purple-600">
                View Knowledge Graph
              </a>
            </Link>
          )}
        </div>
      </div>
      
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'details'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'content'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('content')}
          disabled={!isProcessed}
        >
          Content
        </button>
        
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'analysis'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('analysis')}
          disabled={!isProcessed}
        >
          Analysis
        </button>
      </div>
      
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg shadow-md p-6 border">
            <h2 className="text-xl font-semibold mb-4">Document Information</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">File Name:</span>
                <span className="col-span-2 font-medium">{document.fileName || 'N/A'}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">File Type:</span>
                <span className="col-span-2 font-medium">{document.fileType?.toUpperCase() || 'N/A'}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">File Size:</span>
                <span className="col-span-2 font-medium">{formatFileSize(document.fileSize)}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Upload Date:</span>
                <span className="col-span-2 font-medium">{formatDate(document.uploadedAt)}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Category:</span>
                <span className="col-span-2 font-medium">{document.category || 'Uncategorized'}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Status:</span>
                <span className="col-span-2 font-medium">{document.status}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Tags:</span>
                <div className="col-span-2">
                  {document.tags && document.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {document.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="px-2 py-0.5 bg-muted rounded-full text-xs"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No tags</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg shadow-md p-6 border">
            <h2 className="text-xl font-semibold mb-4">Processing Information</h2>
            
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Processing Status:</span>
                <div className="col-span-2">
                  {isProcessing && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      Processing
                    </span>
                  )}
                  
                  {isProcessed && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      Completed
                    </span>
                  )}
                  
                  {hasProcessingError && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                      Failed
                    </span>
                  )}
                  
                  {needsProcessing && !hasProcessingError && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                      Pending
                    </span>
                  )}
                </div>
              </div>
              
              {isProcessed && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Analysis Date:</span>
                    <span className="col-span-2 font-medium">
                      {formatDate(document.analysisDate)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Word Count:</span>
                    <span className="col-span-2 font-medium">
                      {documentContent?.wordCount || 'N/A'}
                    </span>
                  </div>
                </>
              )}
              
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Knowledge Graph:</span>
                <div className="col-span-2">
                  {document.knowledgeGraphGenerated ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      Generated
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                      Not Generated
                    </span>
                  )}
                </div>
              </div>
              
              {hasProcessingError && document.processingError && (
                <div className="col-span-3 mt-2">
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    Error: {document.processingError}
                  </div>
                </div>
              )}
            </div>
            
            {isProcessing && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-primary h-2.5 rounded-full animate-pulse w-3/4"></div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Document processing in progress. This may take a few moments...
                </p>
              </div>
            )}
            
            {needsProcessing && (
              <div className="mt-4">
                <button
                  onClick={handleProcessDocument}
                  disabled={processDocumentMutation.isPending}
                  className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:opacity-50"
                >
                  {processDocumentMutation.isPending ? 'Processing...' : 'Process Document'}
                </button>
                <p className="text-sm text-muted-foreground mt-2">
                  Process this document to extract content and enable analysis.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'content' && (
        <div className="bg-card rounded-lg shadow-md p-6 border">
          <h2 className="text-xl font-semibold mb-4">Document Content</h2>
          
          {!isProcessed && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Document content is not available. The document needs to be processed first.
              </p>
              <button
                onClick={handleProcessDocument}
                disabled={processDocumentMutation.isPending || isProcessing}
                className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:opacity-50"
              >
                {processDocumentMutation.isPending || isProcessing ? 'Processing...' : 'Process Document'}
              </button>
            </div>
          )}
          
          {isProcessed && isContentLoading && (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}
          
          {isProcessed && contentError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline"> Failed to load document content.</span>
            </div>
          )}
          
          {isProcessed && documentContent && documentContent.extractedText && (
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap bg-muted p-4 rounded-md">
                {documentContent.extractedText}
              </pre>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'analysis' && (
        <div className="bg-card rounded-lg shadow-md p-6 border">
          <h2 className="text-xl font-semibold mb-4">Document Analysis</h2>
          
          {!isProcessed && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Document analysis is not available. The document needs to be processed first.
              </p>
              <button
                onClick={handleProcessDocument}
                disabled={processDocumentMutation.isPending || isProcessing}
                className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:opacity-50"
              >
                {processDocumentMutation.isPending || isProcessing ? 'Processing...' : 'Process Document'}
              </button>
            </div>
          )}
          
          {isProcessed && isContentLoading && (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}
          
          {isProcessed && contentError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline"> Failed to load document analysis.</span>
            </div>
          )}
          
          {isProcessed && documentContent && (
            <div className="space-y-8">
              {documentContent.summary && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Summary</h3>
                  <div className="bg-muted p-4 rounded-md">
                    <p>{documentContent.summary}</p>
                  </div>
                </div>
              )}
              
              {documentContent.keyTopics && documentContent.keyTopics.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Key Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {documentContent.keyTopics.map((topic: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {!document.knowledgeGraphGenerated && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-2">Knowledge Graph</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate a knowledge graph to visualize relationships between concepts in this document.
                  </p>
                  <button
                    onClick={handleGenerateKnowledgeGraph}
                    disabled={generateKnowledgeGraphMutation.isPending}
                    className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50"
                  >
                    {generateKnowledgeGraphMutation.isPending ? 'Generating...' : 'Generate Knowledge Graph'}
                  </button>
                </div>
              )}
              
              {document.knowledgeGraphGenerated && document.knowledgeGraphId && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-2">Knowledge Graph</h3>
                  <p className="text-muted-foreground mb-4">
                    A knowledge graph has been generated for this document.
                  </p>
                  <Link 
                    href={`/knowledge-graphs/${document.knowledgeGraphId}`}
                    className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 inline-block"
                  >
                    View Knowledge Graph
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
