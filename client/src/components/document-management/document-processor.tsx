import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  FileText, 
  AlertTriangle, 
  Check, 
  Loader2, 
  ListChecks, 
  BookOpenText, 
  BookText,
  PencilRuler, 
  FileSpreadsheet,
  FileStack, 
  BarChart,
  Tag
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface DocumentProcessorProps {
  documentId: number;
  onProcessingComplete?: () => void;
}

export default function DocumentProcessor({ documentId, onProcessingComplete }: DocumentProcessorProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('info');
  
  // Fetch document info
  const { data: document, isLoading: isLoadingDoc } = useQuery({
    queryKey: [`/api/documents/${documentId}`],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${documentId}`);
      if (!res.ok) throw new Error('Failed to fetch document');
      return await res.json();
    }
  });
  
  // Fetch document analysis
  const { data: analysis, isLoading: isLoadingAnalysis } = useQuery({
    queryKey: [`/api/documents/${documentId}/analysis`],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${documentId}/analysis`);
      if (!res.ok) {
        if (res.status === 404) {
          return null; // No analysis yet, but not an error
        }
        throw new Error('Failed to fetch document analysis');
      }
      return await res.json();
    },
    enabled: !!document,
  });
  
  // Process document mutation
  const processDocumentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/documents/${documentId}/process`, {
        method: 'POST',
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to process document');
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Processing Started',
        description: 'Document processing has been initiated successfully',
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}/analysis`] });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}`] });
      
      // Optionally call the completion handler
      if (onProcessingComplete) {
        onProcessingComplete();
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Processing Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Generate Training Forms mutation
  const generateTrainingFormsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/documents/${documentId}/generate-forms`, {
        method: 'POST',
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to generate training forms');
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Training Forms Generated',
        description: `Created ${data.count} training forms based on document content`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Form Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Generate Session Plans mutation
  const generateSessionPlansMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/documents/${documentId}/generate-sessions`, {
        method: 'POST',
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to generate session plans');
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Session Plans Generated',
        description: `Created ${data.count} session plans based on document content`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Session Plan Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Extract Compliance Procedures mutation
  const extractComplianceMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/documents/${documentId}/extract-compliance`, {
        method: 'POST',
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to extract compliance procedures');
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Compliance Procedures Extracted',
        description: `Identified ${data.count} compliance procedures from document`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Compliance Extraction Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  if (isLoadingDoc) {
    return (
      <Card>
        <CardContent className="pt-6 flex flex-col items-center justify-center h-52">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading document information...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!document) {
    return (
      <Card>
        <CardContent className="pt-6 flex flex-col items-center justify-center h-52">
          <AlertTriangle className="h-8 w-8 text-destructive mb-4" />
          <h3 className="text-lg font-medium mb-2">Document Not Found</h3>
          <p className="text-muted-foreground text-center">
            The requested document could not be found or you don't have access to it.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Processor
            </CardTitle>
            <CardDescription>
              Extract information and generate resources from document content
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {document.isProcessed ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                Processed
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                Pending Processing
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="w-full">
            <TabsTrigger value="info" className="flex-1">Document Info</TabsTrigger>
            <TabsTrigger value="analysis" className="flex-1">Analysis Results</TabsTrigger>
            <TabsTrigger value="actions" className="flex-1">Generation Actions</TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent className="pt-6">
          <TabsContent value="info">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Document Title</h3>
                  <p className="font-medium">{document.title}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Document Type</h3>
                  <p className="font-medium">{document.fileType}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Category</h3>
                  <p className="font-medium capitalize">{document.category || 'Uncategorized'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Processing Status</h3>
                  <div className="flex items-center gap-2">
                    {document.isProcessed ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Processed</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="font-medium">Not Processed</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {document.description && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                  <p>{document.description}</p>
                </div>
              )}
              
              {document.tags && document.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {document.tags.map((tag: string, index: number) => (
                      <Badge variant="outline" key={index} className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="analysis">
            {isLoadingAnalysis ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading analysis results...</p>
              </div>
            ) : analysis ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-100 text-blue-800 p-2 rounded-full">
                            <BookOpenText className="h-4 w-4" />
                          </div>
                          <h3 className="font-medium">Category</h3>
                        </div>
                        <Badge className="capitalize">{analysis.category}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="bg-green-100 text-green-800 p-2 rounded-full">
                            <FileStack className="h-4 w-4" />
                          </div>
                          <h3 className="font-medium">Content Size</h3>
                        </div>
                        <Badge variant="outline">
                          {analysis.contentStats?.paragraphCount || 0} paragraphs
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="bg-purple-100 text-purple-800 p-2 rounded-full">
                            <BarChart className="h-4 w-4" />
                          </div>
                          <h3 className="font-medium">Confidence</h3>
                        </div>
                        <Badge variant="outline">
                          {Math.round(analysis.confidence * 100)}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Summary</h3>
                    <p className="text-sm">{analysis.summary}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Keywords</h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.keywords?.slice(0, 10).map((keyword: string, index: number) => (
                        <Badge key={index} variant="secondary">{keyword}</Badge>
                      ))}
                      {analysis.keywords?.length > 10 && (
                        <Badge variant="outline">+{analysis.keywords.length - 10} more</Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Regulatory References</h3>
                  {analysis.references?.regulatory?.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {analysis.references.regulatory.map((ref: any, index: number) => (
                        <div key={index} className="border rounded-md p-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{ref.code}</span>
                            <Badge className="text-xs">{ref.authority}</Badge>
                          </div>
                          {ref.description && <p className="text-xs truncate">{ref.description}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No regulatory references found</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-muted/30 rounded-full p-4 mb-4">
                  <AlertTriangle className="h-8 w-8 text-amber-500" />
                </div>
                <h3 className="text-lg font-medium mb-2">Not Processed Yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  This document hasn't been analyzed yet. Start processing to extract information.
                </p>
                <Button 
                  onClick={() => {
                    processDocumentMutation.mutate();
                  }}
                  disabled={processDocumentMutation.isPending}
                  className="gap-2"
                >
                  {processDocumentMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Process Document
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="actions">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-amber-100 text-amber-800 p-2 rounded-full">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">Generate Training Forms</h3>
                      <p className="text-sm text-muted-foreground">
                        Create structured training forms based on document content
                      </p>
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    disabled={!document.isProcessed || generateTrainingFormsMutation.isPending}
                    onClick={() => generateTrainingFormsMutation.mutate()}
                  >
                    {generateTrainingFormsMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      'Generate Forms'
                    )}
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-green-100 text-green-800 p-2 rounded-full">
                      <PencilRuler className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">Generate Session Plans</h3>
                      <p className="text-sm text-muted-foreground">
                        Create training session plans from document material
                      </p>
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    disabled={!document.isProcessed || generateSessionPlansMutation.isPending}
                    onClick={() => generateSessionPlansMutation.mutate()}
                  >
                    {generateSessionPlansMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      'Generate Plans'
                    )}
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-100 text-blue-800 p-2 rounded-full">
                      <ListChecks className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">Extract Compliance Procedures</h3>
                      <p className="text-sm text-muted-foreground">
                        Identify and extract regulatory compliance procedures
                      </p>
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    disabled={!document.isProcessed || extractComplianceMutation.isPending}
                    onClick={() => extractComplianceMutation.mutate()}
                  >
                    {extractComplianceMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Extracting...
                      </>
                    ) : (
                      'Extract Procedures'
                    )}
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-purple-100 text-purple-800 p-2 rounded-full">
                      <BookText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">Process Document</h3>
                      <p className="text-sm text-muted-foreground">
                        {document.isProcessed 
                          ? 'Re-process document to update analysis' 
                          : 'Process document to extract information'}
                      </p>
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    disabled={processDocumentMutation.isPending}
                    onClick={() => processDocumentMutation.mutate()}
                  >
                    {processDocumentMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : document.isProcessed ? (
                      'Re-process Document'
                    ) : (
                      'Process Document'
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
      
      <CardFooter className="flex justify-between border-t p-6">
        <p className="text-xs text-muted-foreground">
          {document.isProcessed 
            ? `Last processed: ${new Date(document.updatedAt).toLocaleString()}` 
            : 'Document has not been processed yet'}
        </p>
      </CardFooter>
    </Card>
  );
}