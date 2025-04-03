import React, { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import DocumentService from "@/services/document-service";
import { knowledgeGraphService } from "@/services/knowledge-graph-service";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, 
  AlertCircle, 
  Download, 
  BarChart2, 
  ListChecks, 
  Tag, 
  BookOpen, 
  Clock, 
  FileType, 
  Graph, 
  Eye, 
  ArrowLeft
} from "lucide-react";
import { KnowledgeGraph } from "@shared/knowledge-graph-types";
import { Document, DocumentAnalysisResult } from "@shared/document-types";
import KnowledgeGraphVisualization from "@/components/knowledge-graph/knowledge-graph-visualization";

const DocumentAnalysisPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const documentId = parseInt(id);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fetch document details
  const { data: document, isLoading: isLoadingDocument, error: documentError } = useQuery<Document>({
    queryKey: [`/api/documents/${documentId}`],
    queryFn: () => DocumentService.getDocumentById(documentId),
    enabled: !isNaN(documentId)
  });
  
  // Fetch document analysis results
  const { data: analysis, isLoading: isLoadingAnalysis, error: analysisError } = useQuery<DocumentAnalysisResult>({
    queryKey: [`/api/documents/${documentId}/analysis`],
    queryFn: () => DocumentService.getDocumentAnalysis(documentId),
    enabled: !isNaN(documentId) && !!document?.analysisComplete
  });
  
  // Fetch knowledge graph if it has been generated
  const { data: knowledgeGraph, isLoading: isLoadingGraph } = useQuery<KnowledgeGraph>({
    queryKey: [`/api/knowledge-graph/document/${documentId}`],
    queryFn: () => knowledgeGraphService.fetchKnowledgeGraph(documentId),
    enabled: !isNaN(documentId) && !!document?.knowledgeGraphGenerated
  });

  if (isLoadingDocument) {
    return (
      <div className="container max-w-screen-xl mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin mb-4">⏳</div>
                <p>Loading document data...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (documentError) {
    return (
      <div className="container max-w-screen-xl mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading document: {(documentError as Error).message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="container max-w-screen-xl mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Document not found. The requested document may have been deleted or you don't have permission to view it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-screen-xl mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Documents
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6 mb-6">
        {/* Document Info Card */}
        <Card className="w-full md:w-2/3">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{document.title}</CardTitle>
                <CardDescription className="mt-2">
                  {document.description || "No description provided"}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="#" onClick={(e) => {
                  e.preventDefault();
                  DocumentService.downloadDocument(document.id)
                    .then(blob => {
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.style.display = 'none';
                      a.href = url;
                      a.download = document.fileName || `document-${document.id}`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                    });
                }}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Original
                </a>
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4">
              {document.category && (
                <Badge variant="outline" className="text-xs">
                  {document.category}
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {document.fileType}
              </Badge>
              <Badge variant={document.status === 'approved' ? 'success' : 'default'} className="text-xs">
                {document.status}
              </Badge>
              {document.tags && document.tags.map((tag, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {typeof tag === 'string' ? tag : tag.name}
                </Badge>
              ))}
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">File Size</p>
                <p className="font-medium">
                  {document.fileSize ? `${(document.fileSize / 1024 / 1024).toFixed(2)} MB` : "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uploaded By</p>
                <p className="font-medium">User #{document.uploadedBy}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uploaded At</p>
                <p className="font-medium">
                  {new Date(document.uploadedAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Analysis Status</p>
                <p className="font-medium">
                  {document.analysisComplete ? "Complete" : document.processingStatus || "Pending"}
                </p>
              </div>
            </div>
            
            {document.extractedMetadata && (
              <>
                <Separator className="my-4" />
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Extracted Metadata</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(document.extractedMetadata).filter(([key, value]) => 
                      typeof value !== 'object' && value !== null && value !== undefined
                    ).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                        <p className="font-medium">{value?.toString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Analysis Status Card */}
        <Card className="w-full md:w-1/3">
          <CardHeader>
            <CardTitle>Analysis Status</CardTitle>
            <CardDescription>
              Document processing and analysis information
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Text Extraction</span>
                </div>
                <Badge variant={document.processingStatus === 'completed' ? 'success' : 'default'}>
                  {document.processingStatus === 'completed' ? 'Complete' : 'Processing'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <BarChart2 className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Content Analysis</span>
                </div>
                <Badge variant={document.analysisComplete ? 'success' : 'default'}>
                  {document.analysisComplete ? 'Complete' : 'Pending'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Entity Extraction</span>
                </div>
                <Badge variant={document.analysisComplete && analysis?.entities ? 'success' : 'default'}>
                  {document.analysisComplete && analysis?.entities ? 'Complete' : 'Pending'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Graph className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Knowledge Graph</span>
                </div>
                <Badge variant={document.knowledgeGraphGenerated ? 'success' : 'default'}>
                  {document.knowledgeGraphGenerated ? 'Generated' : 'Not Generated'}
                </Badge>
              </div>
              
              {document.processingStatus === 'failed' && document.processingError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {document.processingError}
                  </AlertDescription>
                </Alert>
              )}
              
              {!document.analysisComplete && document.processingStatus !== 'failed' && (
                <Button className="w-full mt-2" disabled={document.processingStatus === 'processing'}>
                  Start Analysis
                </Button>
              )}
              
              {!document.knowledgeGraphGenerated && document.analysisComplete && (
                <Button variant="outline" className="w-full mt-2">
                  Generate Knowledge Graph
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Analysis Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="entities">Entities</TabsTrigger>
          <TabsTrigger value="knowledge-graph" disabled={!document.knowledgeGraphGenerated}>
            Knowledge Graph
          </TabsTrigger>
          <TabsTrigger value="content">Document Content</TabsTrigger>
          <TabsTrigger value="compliance" disabled={!document.processingOptions?.performCompliance}>
            Compliance
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Document Overview</CardTitle>
              <CardDescription>
                Key insights and information extracted from the document
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {isLoadingAnalysis ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin mb-4">⏳</div>
                    <p>Loading analysis data...</p>
                  </div>
                </div>
              ) : analysisError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Error loading analysis: {(analysisError as Error).message}
                  </AlertDescription>
                </Alert>
              ) : !analysis ? (
                <Alert>
                  <BookOpen className="h-4 w-4" />
                  <AlertDescription>
                    No analysis data available. Analysis may not have been performed on this document yet.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  {/* Summary */}
                  {analysis.summary && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Summary</h3>
                      <p className="text-muted-foreground">{analysis.summary}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Key Topics */}
                    <Card>
                      <CardHeader className="py-4">
                        <CardTitle className="text-md">Key Topics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {analysis.keyTopics ? (
                          <div className="flex flex-wrap gap-2">
                            {analysis.keyTopics.map((topic, i) => (
                              <Badge key={i} variant="secondary">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">No key topics identified</p>
                        )}
                      </CardContent>
                    </Card>
                    
                    {/* Stats */}
                    <Card>
                      <CardHeader className="py-4">
                        <CardTitle className="text-md">Document Stats</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {analysis.wordCount !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground text-sm">Word Count</span>
                              <span>{analysis.wordCount.toLocaleString()}</span>
                            </div>
                          )}
                          {analysis.readabilityScore !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground text-sm">Readability Score</span>
                              <span>{analysis.readabilityScore}/100</span>
                            </div>
                          )}
                          {document.extractedMetadata?.pageCount && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground text-sm">Page Count</span>
                              <span>{document.extractedMetadata.pageCount}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Sentiment */}
                    <Card>
                      <CardHeader className="py-4">
                        <CardTitle className="text-md">Document Sentiment</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {analysis.sentiment ? (
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground text-sm">Sentiment</span>
                              <Badge 
                                variant={
                                  analysis.sentiment.label === 'positive' ? 'success' : 
                                  analysis.sentiment.label === 'negative' ? 'destructive' : 'default'
                                }
                              >
                                {analysis.sentiment.label.charAt(0).toUpperCase() + analysis.sentiment.label.slice(1)}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground text-sm">Score</span>
                              <span>{analysis.sentiment.score.toFixed(2)}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">No sentiment analysis available</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Entity Preview */}
                  {analysis.entities && Object.keys(analysis.entities).length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Entity Preview</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(analysis.entities)
                          .filter(([_, values]) => Array.isArray(values) && values.length > 0)
                          .slice(0, 3)
                          .map(([entityType, values]) => (
                            <Card key={entityType}>
                              <CardHeader className="py-3">
                                <CardTitle className="text-sm capitalize">
                                  {entityType.replace(/([A-Z])/g, ' $1')}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="py-2">
                                <div className="flex flex-wrap gap-1">
                                  {(values as string[]).slice(0, 5).map((entity, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {entity}
                                    </Badge>
                                  ))}
                                  {(values as string[]).length > 5 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{(values as string[]).length - 5} more
                                    </Badge>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                      <div className="mt-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setActiveTab("entities")}>
                          View all entities
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Entities Tab */}
        <TabsContent value="entities">
          <Card>
            <CardHeader>
              <CardTitle>Extracted Entities</CardTitle>
              <CardDescription>
                Named entities and key information extracted from the document
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {isLoadingAnalysis ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin mb-4">⏳</div>
                    <p>Loading entity data...</p>
                  </div>
                </div>
              ) : analysisError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Error loading entities: {(analysisError as Error).message}
                  </AlertDescription>
                </Alert>
              ) : !analysis?.entities || Object.keys(analysis.entities).length === 0 ? (
                <Alert>
                  <Tag className="h-4 w-4" />
                  <AlertDescription>
                    No entities were extracted from this document.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  {Object.entries(analysis.entities)
                    .filter(([_, values]) => Array.isArray(values) && values.length > 0)
                    .map(([entityType, values]) => (
                      <div key={entityType}>
                        <h3 className="text-lg font-medium mb-3 capitalize">
                          {entityType.replace(/([A-Z])/g, ' $1')}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {(values as string[]).map((entity, i) => (
                            <Badge key={i} variant="secondary">
                              {entity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Knowledge Graph Tab */}
        <TabsContent value="knowledge-graph">
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Graph</CardTitle>
              <CardDescription>
                Visual representation of relationships between concepts in the document
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {isLoadingGraph ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin mb-4">⏳</div>
                    <p>Loading knowledge graph...</p>
                  </div>
                </div>
              ) : !knowledgeGraph ? (
                <Alert>
                  <Graph className="h-4 w-4" />
                  <AlertDescription>
                    No knowledge graph available for this document.
                  </AlertDescription>
                </Alert>
              ) : (
                <KnowledgeGraphVisualization 
                  documentId={documentId} 
                  width={800}
                  height={600}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Content Tab */}
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Document Content</CardTitle>
              <CardDescription>
                Extracted text content from the document
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {isLoadingAnalysis ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin mb-4">⏳</div>
                    <p>Loading document content...</p>
                  </div>
                </div>
              ) : !analysis?.extractedText ? (
                <Alert>
                  <FileType className="h-4 w-4" />
                  <AlertDescription>
                    No text content has been extracted from this document.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="bg-muted p-4 rounded-md max-h-[600px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {analysis.extractedText}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Compliance Tab */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Check</CardTitle>
              <CardDescription>
                Regulatory compliance assessment results
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {isLoadingAnalysis ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin mb-4">⏳</div>
                    <p>Loading compliance data...</p>
                  </div>
                </div>
              ) : !analysis?.compliance ? (
                <Alert>
                  <ListChecks className="h-4 w-4" />
                  <AlertDescription>
                    No compliance check has been performed on this document.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Badge variant={analysis.compliance.compliant ? 'success' : 'destructive'}>
                      {analysis.compliance.compliant ? 'Compliant' : 'Non-Compliant'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      with {analysis.compliance.regulationIds.length} regulation(s)
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-3">Applicable Regulations</h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.compliance.regulationIds.map((regulation, i) => (
                        <Badge key={i} variant="outline">
                          {regulation}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {analysis.compliance.issues && analysis.compliance.issues.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">Compliance Issues</h3>
                      <ul className="space-y-2">
                        {analysis.compliance.issues.map((issue, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DocumentAnalysisPage;
