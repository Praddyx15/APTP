import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  FileSearch,
  Loader2,
  AlertCircle,
  Check,
  CheckCircle2,
  Brain,
  ListTree,
  BookOpen,
  FileBarChart2,
  Network,
  RefreshCw,
  Compass,
  Sparkles,
  Plus,
  Copy,
  Download,
  ArrowRight,
} from 'lucide-react';

interface DocumentExtractorProps {
  documentId: number;
  onExtracted?: (data: any) => void;
}

// Document interface to type the data from API
interface DocumentData {
  id: number;
  title: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedBy: number;
  uploadedAt: string;
  description?: string;
  tags?: string[];
  isFavorite?: boolean;
  category?: string;
  status?: string;
}

type ExtractionMethod = 'basic' | 'advanced' | 'ai';

interface ExtractionOptions {
  extractText: boolean;
  extractStructure: boolean;
  extractMetadata: boolean;
  extractTableOfContents: boolean;
  extractTables: boolean;
  extractRegulations?: boolean;
  extractImages?: boolean;
  performOCR?: boolean;
  detectLanguage?: boolean;
  buildKnowledgeGraph?: boolean;
  confidence?: number;
}

export function DocumentExtractor({ documentId, onExtracted }: DocumentExtractorProps) {
  const [extractionMethod, setExtractionMethod] = useState<ExtractionMethod>('basic');
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('text');
  const [options, setOptions] = useState<ExtractionOptions>({
    extractText: true,
    extractStructure: true,
    extractMetadata: true,
    extractTableOfContents: true,
    extractTables: true,
    extractRegulations: false,
    extractImages: false,
    performOCR: false,
    detectLanguage: false,
    buildKnowledgeGraph: false,
    confidence: 70,
  });

  const { toast } = useToast();

  // Fetch document details
  const { data: document, isLoading: isLoadingDocument } = useQuery<DocumentData>({
    queryKey: [`/api/documents/${documentId}`],
    // Use default fetcher
  });

  // Extract document content mutation
  const extractDocumentMutation = useMutation({
    mutationFn: async (params: {
      documentId: number;
      method: ExtractionMethod;
      options: ExtractionOptions;
    }) => {
      setIsExtracting(true);
      setProgress(0);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const increment = Math.random() * 15;
          const newProgress = Math.min(prev + increment, 95);
          return newProgress;
        });
      }, 800);
      
      // Make API request
      try {
        const response = await apiRequest(
          'POST',
          `/api/documents/${params.documentId}/extract`,
          {
            method: params.method,
            options: params.options
          }
        );
        
        clearInterval(progressInterval);
        setProgress(100);
        
        return await response.json();
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: (data) => {
      setIsExtracting(false);
      setExtractedData(data);
      setActiveTab('text');
      
      toast({
        title: "Extraction successful",
        description: "Document content has been successfully extracted.",
        variant: "default",
      });
      
      if (onExtracted) {
        onExtracted(data);
      }
    },
    onError: (error: Error) => {
      setIsExtracting(false);
      setProgress(0);
      
      toast({
        title: "Extraction failed",
        description: error.message || "There was an error extracting document content. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle option toggle
  const handleOptionToggle = (option: keyof ExtractionOptions) => {
    setOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  // Handle method selection
  const handleMethodSelection = (method: ExtractionMethod) => {
    setExtractionMethod(method);
    
    // Update options based on method
    if (method === 'basic') {
      setOptions({
        extractText: true,
        extractStructure: true,
        extractMetadata: true,
        extractTableOfContents: true,
        extractTables: true,
        extractRegulations: false,
        extractImages: false,
        performOCR: false,
        detectLanguage: false,
        buildKnowledgeGraph: false,
        confidence: 70,
      });
    } else if (method === 'advanced') {
      setOptions({
        extractText: true,
        extractStructure: true,
        extractMetadata: true,
        extractTableOfContents: true,
        extractTables: true,
        extractRegulations: true,
        extractImages: true,
        performOCR: true,
        detectLanguage: true,
        buildKnowledgeGraph: false,
        confidence: 85,
      });
    } else if (method === 'ai') {
      setOptions({
        extractText: true,
        extractStructure: true,
        extractMetadata: true,
        extractTableOfContents: true,
        extractTables: true,
        extractRegulations: true,
        extractImages: true,
        performOCR: true,
        detectLanguage: true,
        buildKnowledgeGraph: true,
        confidence: 95,
      });
    }
  };

  // Handle extract button click
  const handleExtract = () => {
    extractDocumentMutation.mutate({
      documentId,
      method: extractionMethod,
      options,
    });
  };

  // Handle copy to clipboard
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The extracted content has been copied to your clipboard.",
      variant: "default",
    });
  };

  // Handle download extraction
  const handleDownloadExtraction = () => {
    if (!extractedData) return;
    
    const jsonStr = JSON.stringify(extractedData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Use the global window.document object for DOM operations
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `extraction-${documentId}.json`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download started",
      description: "The extracted data is being downloaded as JSON.",
      variant: "default",
    });
  };

  if (isLoadingDocument) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Extract Content</CardTitle>
          <CardDescription>Loading document information...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!document) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertCircle className="mr-2 h-5 w-5" />
            Document Not Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>The requested document could not be found or you don't have permission to access it.</p>
        </CardContent>
      </Card>
    );
  }

  // Function to highlight regex matches
  const highlightMatches = (text: string, pattern: string) => {
    try {
      const regex = new RegExp(pattern, 'g');
      return text.replace(regex, (match) => `<mark class="bg-yellow-200 dark:bg-yellow-800">${match}</mark>`);
    } catch (error) {
      return text;
    }
  };

  // Format file size utility
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileSearch className="mr-2 h-5 w-5" />
          Extract Document Content
        </CardTitle>
        <CardDescription>
          Extract and analyze content from "{document?.title || 'Document'}"
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {extractedData ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Extraction Complete
                </Badge>
                <Badge variant="outline">
                  {extractionMethod === 'basic' ? 'Basic' : extractionMethod === 'advanced' ? 'Advanced' : 'AI'} Extraction
                </Badge>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadExtraction}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setExtractedData(null);
                    setProgress(0);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Extraction
                </Button>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
                <TabsTrigger value="text">Text</TabsTrigger>
                <TabsTrigger value="structure">Structure</TabsTrigger>
                <TabsTrigger value="tables">Tables</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
                <TabsTrigger value="toc" className="hidden md:block">Table of Contents</TabsTrigger>
                <TabsTrigger value="graph" className="hidden lg:block">Knowledge Graph</TabsTrigger>
              </TabsList>
              
              <TabsContent value="text" className="space-y-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium">Extracted Text</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleCopyToClipboard(extractedData.text || '')}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <div className="border rounded-md bg-muted/20 p-4 overflow-auto max-h-[400px]">
                  <pre className="whitespace-pre-wrap text-sm">{extractedData.text || 'No text extracted'}</pre>
                </div>
              </TabsContent>
              
              <TabsContent value="structure" className="space-y-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium">Document Structure</h3>
                  <Badge variant="outline">
                    {extractedData.structure?.elements?.length || 0} Elements
                  </Badge>
                </div>
                <div className="border rounded-md bg-muted/20 p-4 overflow-auto max-h-[400px]">
                  {extractedData.structure?.elements?.length > 0 ? (
                    <Accordion type="multiple" className="w-full">
                      {extractedData.structure.elements.map((element: any, index: number) => (
                        <AccordionItem key={index} value={`item-${index}`}>
                          <AccordionTrigger className="hover:bg-muted/50 px-2 rounded-md">
                            <div className="flex items-center gap-2">
                              {element.type === 'heading' ? (
                                <BookOpen className="h-4 w-4 text-primary" />
                              ) : element.type === 'paragraph' ? (
                                <FileText className="h-4 w-4 text-blue-500" />
                              ) : element.type === 'list' ? (
                                <ListTree className="h-4 w-4 text-green-500" />
                              ) : element.type === 'table' ? (
                                <FileBarChart2 className="h-4 w-4 text-orange-500" />
                              ) : (
                                <FileText className="h-4 w-4 text-gray-500" />
                              )}
                              <span>
                                {element.type.charAt(0).toUpperCase() + element.type.slice(1)}
                                {element.level ? ` (Level ${element.level})` : ''}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-6 py-2 bg-muted/10 rounded-md">
                            <p className="text-sm mb-2">{element.text}</p>
                            {Object.entries(element.metadata || {}).length > 0 && (
                              <div className="mt-2 border-t pt-2">
                                <p className="text-xs font-medium mb-1 text-muted-foreground">Metadata:</p>
                                <div className="grid grid-cols-2 gap-1">
                                  {Object.entries(element.metadata).map(([key, value]: [string, any]) => (
                                    <div key={key} className="flex items-center gap-1 text-xs">
                                      <span className="font-medium">{key}:</span>
                                      <span>{typeof value === 'object' ? JSON.stringify(value) : value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <p className="text-muted-foreground text-center py-6">No structure extracted</p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="tables" className="space-y-4 mt-4">
                <h3 className="text-lg font-medium mb-4">Extracted Tables</h3>
                {extractedData.tables?.length > 0 ? (
                  <div className="space-y-6">
                    {extractedData.tables.map((table: any, index: number) => (
                      <div key={index} className="border rounded-md overflow-hidden">
                        <div className="bg-muted p-2 flex items-center justify-between">
                          <h4 className="font-medium">Table {index + 1}</h4>
                          <Badge variant="outline" className="text-xs">
                            {table.rows} rows × {table.columns} columns
                          </Badge>
                        </div>
                        <div className="overflow-auto max-h-[300px]">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-muted/50">
                                {table.headers.map((header: string, i: number) => (
                                  <th key={i} className="border border-border p-2 text-sm font-medium">
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {table.data.map((row: any[], rowIndex: number) => (
                                <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-muted/20" : ""}>
                                  {row.map((cell, cellIndex) => (
                                    <td key={cellIndex} className="border border-border p-2 text-sm">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border rounded-md p-8 text-center">
                    <p className="text-muted-foreground">No tables found in the document</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="metadata" className="space-y-4 mt-4">
                <h3 className="text-lg font-medium mb-4">Document Metadata</h3>
                <div className="border rounded-md bg-muted/20 p-4">
                  {extractedData.metadata && Object.keys(extractedData.metadata).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(extractedData.metadata).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex flex-col space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">{key}</p>
                          <p className="text-sm">{
                            typeof value === 'object' 
                              ? JSON.stringify(value) 
                              : String(value)
                          }</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-muted-foreground">No metadata extracted</p>
                  )}
                </div>
                
                {extractedData.regulations && extractedData.regulations.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Regulatory References</h3>
                    <div className="border rounded-md bg-muted/20 p-4">
                      <div className="space-y-2">
                        {extractedData.regulations.map((reg: any, index: number) => (
                          <div key={index} className="p-3 bg-muted/30 rounded-md">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                {reg.authority}
                              </Badge>
                              <span className="text-sm font-medium">{reg.code}</span>
                            </div>
                            <p className="text-sm">{reg.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="toc" className="space-y-4 mt-4">
                <h3 className="text-lg font-medium mb-4">Table of Contents</h3>
                <div className="border rounded-md bg-muted/20 p-4 overflow-auto max-h-[400px]">
                  {extractedData.toc && extractedData.toc.length > 0 ? (
                    <div className="space-y-2">
                      {extractedData.toc.map((item: any, index: number) => (
                        <div 
                          key={index} 
                          className="flex items-start"
                          style={{ marginLeft: `${(item.level - 1) * 20}px` }}
                        >
                          <div className="flex items-center gap-2">
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className={`${item.level === 1 ? 'font-medium' : ''}`}>
                              {item.text}
                            </span>
                            {item.pageNumber && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (page {item.pageNumber})
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-muted-foreground">No table of contents extracted</p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="graph" className="space-y-4 mt-4">
                <h3 className="text-lg font-medium mb-4">Knowledge Graph</h3>
                <div className="border rounded-md bg-muted/20 p-4 flex flex-col items-center justify-center min-h-[400px]">
                  {extractedData.knowledgeGraph && 
                   extractedData.knowledgeGraph.nodes && 
                   extractedData.knowledgeGraph.nodes.length > 0 ? (
                    <div className="w-full h-full">
                      <div className="flex items-center justify-between mb-4">
                        <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                          {extractedData.knowledgeGraph.nodes.length} Nodes
                        </Badge>
                        <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {extractedData.knowledgeGraph.edges.length} Connections
                        </Badge>
                      </div>
                      <div className="border rounded p-4 bg-muted/10">
                        <p className="text-sm text-center text-muted-foreground">
                          Interactive knowledge graph visualization will be available in a future update.
                        </p>
                        <div className="mt-4 max-h-[250px] overflow-auto">
                          <h4 className="text-sm font-medium mb-2">Key Concepts:</h4>
                          <div className="flex flex-wrap gap-2">
                            {extractedData.knowledgeGraph.nodes.map((node: any, index: number) => (
                              <Badge 
                                key={index} 
                                variant="outline" 
                                className="py-1 px-2 bg-muted/50"
                              >
                                {node.content}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Knowledge graph extraction requires AI extraction method
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Select Extraction Method</h3>
              <RadioGroup 
                value={extractionMethod} 
                onValueChange={(value) => handleMethodSelection(value as ExtractionMethod)}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <div className="relative">
                  <RadioGroupItem
                    value="basic"
                    id="basic"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="basic"
                    className="flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  >
                    <FileText className="h-8 w-8 text-muted-foreground peer-data-[state=checked]:text-primary" />
                    <div className="font-medium">Basic Extraction</div>
                    <p className="text-xs text-center text-muted-foreground">Extract text and basic document structure</p>
                    <Badge variant="outline" className="mt-2">Standard</Badge>
                  </Label>
                </div>
                
                <div className="relative">
                  <RadioGroupItem
                    value="advanced"
                    id="advanced"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="advanced"
                    className="flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  >
                    <Compass className="h-8 w-8 text-muted-foreground peer-data-[state=checked]:text-primary" />
                    <div className="font-medium">Advanced Extraction</div>
                    <p className="text-xs text-center text-muted-foreground">Includes OCR, tables, and regulatory references</p>
                    <Badge variant="outline" className="mt-2">Enhanced</Badge>
                  </Label>
                </div>
                
                <div className="relative">
                  <RadioGroupItem
                    value="ai"
                    id="ai"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="ai"
                    className="flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  >
                    <Brain className="h-8 w-8 text-muted-foreground peer-data-[state=checked]:text-primary" />
                    <div className="font-medium">AI Extraction</div>
                    <p className="text-xs text-center text-muted-foreground">Full analysis with knowledge graph and insights</p>
                    <Badge 
                      variant="outline" 
                      className="mt-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            <Separator />
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Extraction Options</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => {
                    // Reset to default options based on selected method
                    handleMethodSelection(extractionMethod);
                  }}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reset to Defaults
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="text" 
                      checked={options.extractText}
                      onCheckedChange={() => handleOptionToggle('extractText')}
                      disabled={true} // Always required
                    />
                    <label
                      htmlFor="text"
                      className="text-sm font-medium leading-none"
                    >
                      Extract text
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="structure" 
                      checked={options.extractStructure}
                      onCheckedChange={() => handleOptionToggle('extractStructure')}
                    />
                    <label
                      htmlFor="structure"
                      className="text-sm font-medium leading-none"
                    >
                      Extract document structure
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="metadata" 
                      checked={options.extractMetadata}
                      onCheckedChange={() => handleOptionToggle('extractMetadata')}
                    />
                    <label
                      htmlFor="metadata"
                      className="text-sm font-medium leading-none"
                    >
                      Extract metadata
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="toc" 
                      checked={options.extractTableOfContents}
                      onCheckedChange={() => handleOptionToggle('extractTableOfContents')}
                    />
                    <label
                      htmlFor="toc"
                      className="text-sm font-medium leading-none"
                    >
                      Extract table of contents
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="tables" 
                      checked={options.extractTables}
                      onCheckedChange={() => handleOptionToggle('extractTables')}
                    />
                    <label
                      htmlFor="tables"
                      className="text-sm font-medium leading-none"
                    >
                      Extract tables
                    </label>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="regulations" 
                      checked={options.extractRegulations}
                      onCheckedChange={() => handleOptionToggle('extractRegulations')}
                      disabled={extractionMethod === 'basic'}
                    />
                    <label
                      htmlFor="regulations"
                      className={`text-sm font-medium leading-none ${extractionMethod === 'basic' ? 'text-muted-foreground' : ''}`}
                    >
                      Extract regulatory references
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="images" 
                      checked={options.extractImages}
                      onCheckedChange={() => handleOptionToggle('extractImages')}
                      disabled={extractionMethod === 'basic'}
                    />
                    <label
                      htmlFor="images"
                      className={`text-sm font-medium leading-none ${extractionMethod === 'basic' ? 'text-muted-foreground' : ''}`}
                    >
                      Extract images
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="ocr" 
                      checked={options.performOCR}
                      onCheckedChange={() => handleOptionToggle('performOCR')}
                      disabled={extractionMethod === 'basic'}
                    />
                    <label
                      htmlFor="ocr"
                      className={`text-sm font-medium leading-none ${extractionMethod === 'basic' ? 'text-muted-foreground' : ''}`}
                    >
                      Perform OCR on images
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="language" 
                      checked={options.detectLanguage}
                      onCheckedChange={() => handleOptionToggle('detectLanguage')}
                      disabled={extractionMethod === 'basic'}
                    />
                    <label
                      htmlFor="language"
                      className={`text-sm font-medium leading-none ${extractionMethod === 'basic' ? 'text-muted-foreground' : ''}`}
                    >
                      Detect language
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="knowledge-graph" 
                      checked={options.buildKnowledgeGraph}
                      onCheckedChange={() => handleOptionToggle('buildKnowledgeGraph')}
                      disabled={extractionMethod !== 'ai'}
                    />
                    <label
                      htmlFor="knowledge-graph"
                      className={`text-sm font-medium leading-none ${extractionMethod !== 'ai' ? 'text-muted-foreground' : ''}`}
                    >
                      Build knowledge graph
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {isExtracting ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Extracting content...</p>
                  <p className="text-sm text-muted-foreground">{Math.round(progress)}%</p>
                </div>
                <Progress value={progress} />
                <div className="text-center text-sm text-muted-foreground">
                  {progress < 30 ? (
                    "Processing document..."
                  ) : progress < 60 ? (
                    "Analyzing content structure..."
                  ) : progress < 90 ? (
                    "Extracting data elements..."
                  ) : (
                    "Finalizing extraction..."
                  )}
                </div>
              </div>
            ) : (
              <Button 
                onClick={handleExtract}
                className="w-full"
              >
                <FileSearch className="mr-2 h-4 w-4" />
                Extract Document Content
              </Button>
            )}
          </div>
        )}
      </CardContent>
      
      {!extractedData && !isExtracting && (
        <CardFooter className="flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground pt-6 gap-2 border-t">
          <div>
            <p>Document: {document?.title || 'Unknown'} ({document?.fileSize ? formatFileSize(document.fileSize) : '0 Bytes'})</p>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <p>{extractionMethod === 'basic' ? 'Basic' : extractionMethod === 'advanced' ? 'Advanced' : 'AI'} extraction selected</p>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}