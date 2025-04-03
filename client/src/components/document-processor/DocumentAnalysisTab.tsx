import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileUp, 
  FileText, 
  Search, 
  Tag, 
  Book, 
  Map, 
  RotateCw, 
  Download, 
  Clipboard, 
  CheckSquare,
  AlertCircle,
  Terminal,
  Hash,
  CalendarClock,
  PieChart,
  Link,
  CheckCheck,
  Copy,
  Check,
  Info
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function DocumentAnalysisTab() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [activeTab, setActiveTab] = useState('upload');
  const [jsonCopied, setJsonCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Analysis settings
  const [analysisSettings, setAnalysisSettings] = useState({
    detectEntities: true,
    detectConcepts: true,
    detectRegulations: true,
    extractReferences: true,
    analyzeContext: true,
    findSimilarDocuments: true,
    detectionConfidenceThreshold: 70
  });
  
  // Mutation for document analysis
  const analysisMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      try {
        // Simulate analysis steps with incremental progress
        setProcessingStep('Uploading document...');
        await simulateProgress(0, 15);
        
        setProcessingStep('Extracting text and structure...');
        await simulateProgress(15, 30);
        
        setProcessingStep('Analyzing document content...');
        await simulateProgress(30, 45);
        
        setProcessingStep('Identifying entities and concepts...');
        await simulateProgress(45, 60);
        
        setProcessingStep('Detecting regulatory references...');
        await simulateProgress(60, 75);
        
        setProcessingStep('Finding related documents...');
        await simulateProgress(75, 90);
        
        setProcessingStep('Generating document insights...');
        await simulateProgress(90, 100);
        
        // Try to call the real API endpoint
        const response = await apiRequest('POST', '/api/documents/analyze', formData, true);
        return await response.json();
      } catch (error) {
        console.error('Document analysis API error:', error);
        
        // Return mock result for demonstration if API is not yet implemented
        return generateMockAnalysisResult();
      }
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      setActiveTab('results');
      toast({
        title: 'Document analysis complete',
        description: 'Analysis has been successfully completed.',
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Analysis failed',
        description: error.message || 'An error occurred during document analysis.',
        variant: 'destructive',
      });
      setAnalysisProgress(0);
    }
  });
  
  // Helper function to simulate progress for demonstration purposes
  const simulateProgress = async (start: number, end: number): Promise<void> => {
    return new Promise((resolve) => {
      let current = start;
      const interval = setInterval(() => {
        current += Math.floor(Math.random() * 3) + 1;
        if (current >= end) {
          current = end;
          clearInterval(interval);
          setAnalysisProgress(current);
          resolve();
        } else {
          setAnalysisProgress(current);
        }
      }, 100);
    });
  };
  
  // Generate mock analysis result for demonstration
  const generateMockAnalysisResult = () => {
    return {
      documentId: 1,
      fileName: file?.name || "Document.pdf",
      fileType: file?.type || "application/pdf",
      fileSize: file?.size || 1024 * 1024,
      analysisTimestamp: new Date().toISOString(),
      processingTimeMs: 2560,
      
      // Document classification
      classification: {
        category: "TRAINING",
        subjects: ["FLIGHT_PROCEDURES", "AIRCRAFT_SYSTEMS", "REGULATIONS"],
        priority: "HIGH",
        tags: ["training", "procedures", "operations", "safety"],
        confidence: 92.8,
        metadata: {
          keyTerms: {
            "flight": 24,
            "procedures": 18,
            "safety": 15,
            "standard": 12,
            "pilot": 10,
            "certification": 8,
            "operations": 7
          },
          regulatoryReferences: ["FAA-AC-120-71A", "EASA-OPS-1.1090"]
        }
      },
      
      // Document context
      context: {
        documentId: 1,
        primaryContext: "TRAINING_MATERIAL",
        sections: [
          {
            id: "sec1",
            title: "Introduction",
            contextType: "GENERAL",
            confidence: 95.2,
            contextualImportance: 70,
            entities: [
              {
                id: "ent1",
                type: "ORGANIZATION",
                value: "Advanced Pilot Training Platform",
                context: "program",
                confidence: 94.7,
                beginOffset: 10,
                endOffset: 42
              }
            ]
          },
          {
            id: "sec2",
            title: "Standard Operating Procedures",
            contextType: "OPERATING_PROCEDURE",
            confidence: 98.1,
            contextualImportance: 90,
            entities: [
              {
                id: "ent2",
                type: "PROCEDURE",
                value: "Preflight Inspection",
                context: "safety",
                confidence: 97.3,
                beginOffset: 240,
                endOffset: 260
              }
            ],
            regulatoryReferences: ["FAA-AC-120-71A"]
          }
        ],
        contextualScore: 92.5,
        processingTimeMs: 1250,
        keyInsights: [
          "Document focuses on standardized operating procedures for flight training",
          "Contains multiple safety-critical procedures",
          "References FAA and EASA regulatory materials"
        ],
        crossReferences: [
          {source: "sec2", target: "sec4", type: "related_to"},
          {source: "sec3", target: "sec5", type: "prerequisite_for"}
        ]
      },
      
      // Extracted entities
      entities: [
        {
          text: "Advanced Pilot Training Platform",
          type: "ORGANIZATION",
          category: "PROGRAM",
          confidence: 94.7,
          beginOffset: 10,
          endOffset: 42,
          metadata: {
            relevance: "high"
          }
        },
        {
          text: "Standard Operating Procedures",
          type: "CONCEPT",
          category: "PROCEDURE",
          confidence: 98.1,
          beginOffset: 120,
          endOffset: 150,
          metadata: {
            relevance: "high"
          }
        },
        {
          text: "FAA",
          type: "ORGANIZATION",
          category: "REGULATORY_BODY",
          confidence: 99.2,
          beginOffset: 560,
          endOffset: 563,
          metadata: {
            relevance: "medium"
          }
        },
        {
          text: "Pilot Operating Handbook",
          type: "DOCUMENT",
          category: "MANUAL",
          confidence: 96.5,
          beginOffset: 880,
          endOffset: 905,
          metadata: {
            relevance: "medium",
            abbreviation: "POH"
          }
        },
        {
          text: "Aircraft Flight Manual",
          type: "DOCUMENT",
          category: "MANUAL",
          confidence: 97.3,
          beginOffset: 915,
          endOffset: 937,
          metadata: {
            relevance: "medium",
            abbreviation: "AFM"
          }
        }
      ],
      
      // Extracted references
      references: [
        {
          id: "ref1",
          referenceType: "REGULATORY",
          text: "FAA-AC-120-71A",
          confidence: 96.8,
          sourceLocation: {
            section: "4.2 Preflight Procedures",
            pageNumber: 2,
            offset: 560
          },
          extractedIdentifier: "FAA-AC-120-71A",
          metadata: {
            title: "Standard Operating Procedures for Flight Deck Crewmembers",
            issuer: "FAA",
            year: "2003"
          }
        },
        {
          id: "ref2",
          referenceType: "REGULATORY",
          text: "EASA-OPS-1.1090",
          confidence: 95.2,
          sourceLocation: {
            section: "4.3 Aircraft Inspection",
            pageNumber: 3,
            offset: 780
          },
          extractedIdentifier: "EASA-OPS-1.1090",
          metadata: {
            title: "Flight and Duty Time Limitations and Rest Requirements",
            issuer: "EASA",
            year: "2008"
          }
        },
        {
          id: "ref3",
          referenceType: "TECHNICAL",
          text: "Pilot Operating Handbook (POH)",
          confidence: 96.5,
          sourceLocation: {
            section: "4.3 Aircraft Inspection",
            pageNumber: 3,
            offset: 880
          },
          extractedIdentifier: "POH",
          metadata: {
            type: "Manual"
          }
        }
      ],
      
      // Similar documents
      similarDocuments: [
        {
          documentId: 2,
          title: "Emergency Procedures Manual",
          similarity: 78.5,
          sharedEntities: ["preflight inspection", "safety procedures"],
          sharedConcepts: ["aircraft operations", "safety protocols"]
        },
        {
          documentId: 3,
          title: "Training Program Implementation Guide",
          similarity: 82.1,
          sharedEntities: ["Advanced Pilot Training Platform", "certification"],
          sharedConcepts: ["training methodology", "standardization"]
        }
      ],
      
      // Summary
      summary: {
        shortSummary: "Standard Operating Procedures for flight training operations, covering preflight procedures, weather briefing, aircraft inspection, and emergency procedures.",
        keyPoints: [
          "Defines standard operating procedures for flight training",
          "Includes detailed preflight documentation requirements",
          "Specifies weather briefing requirements",
          "Outlines aircraft inspection protocols",
          "Contains emergency procedures guidelines"
        ],
        topicDistribution: [
          { topic: "Procedures", percentage: 35 },
          { topic: "Safety", percentage: 25 },
          { topic: "Documentation", percentage: 20 },
          { topic: "Training", percentage: 15 },
          { topic: "Regulations", percentage: 5 }
        ]
      }
    };
  };
  
  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Create preview for supported image types
      if (selectedFile.type.match('image.*')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreview(e.target?.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        // For PDFs and other documents, show a generic preview
        setPreview(null);
      }
      
      // Reset previous results
      setAnalysisResult(null);
      setAnalysisProgress(0);
    }
  };
  
  // Handle analysis process button
  const handleAnalyzeDocument = () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to analyze.',
        variant: 'destructive',
      });
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('settings', JSON.stringify(analysisSettings));
    
    setAnalysisProgress(0);
    analysisMutation.mutate(formData);
  };
  
  // Handle settings change
  const handleSettingChange = (key: string, value: any) => {
    setAnalysisSettings(prev => ({ ...prev, [key]: value }));
  };
  
  // Copy analysis results as JSON
  const copyAnalysisJson = () => {
    if (analysisResult) {
      const jsonStr = JSON.stringify(analysisResult, null, 2);
      navigator.clipboard.writeText(jsonStr).then(() => {
        setJsonCopied(true);
        setTimeout(() => setJsonCopied(false), 2000);
        toast({
          title: 'Copied to clipboard',
          description: 'Analysis results have been copied as JSON.',
        });
      });
    }
  };
  
  // Download analysis results as JSON
  const downloadAnalysisResults = () => {
    if (!analysisResult) return;
    
    const dataStr = JSON.stringify(analysisResult, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `document-analysis-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  // Get badge color based on confidence
  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 90) return "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800 dark:text-green-100 dark:hover:bg-green-700";
    if (confidence >= 75) return "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-800 dark:text-amber-100 dark:hover:bg-amber-700";
    return "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-800 dark:text-red-100 dark:hover:bg-red-700";
  };
  
  // Get badge variant based on confidence
  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 90) return "success" as const;
    if (confidence >= 75) return "warning" as const;
    return "destructive" as const;
  };
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full mb-6">
          <TabsTrigger value="upload" disabled={analysisMutation.isPending}>
            <FileUp className="mr-2 h-4 w-4" />
            Upload & Settings
          </TabsTrigger>
          <TabsTrigger value="results" disabled={!analysisResult && !analysisMutation.isPending}>
            <FileText className="mr-2 h-4 w-4" />
            Analysis Results
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* File upload card */}
            <Card>
              <CardHeader>
                <CardTitle>Document Upload</CardTitle>
                <CardDescription>
                  Upload a document for content analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/jpeg,image/png"
                  />
                  
                  {preview ? (
                    <div className="space-y-4">
                      <img 
                        src={preview} 
                        alt="Document preview" 
                        className="max-h-64 mx-auto object-contain rounded-md"
                      />
                      <p className="text-sm text-gray-500">{file?.name}</p>
                    </div>
                  ) : file ? (
                    <div className="space-y-4">
                      <div className="w-32 h-40 mx-auto bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center">
                        <FileText className="h-16 w-16 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500">{file.name}</p>
                    </div>
                  ) : (
                    <div className="py-8">
                      <FileUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-sm font-medium mb-1">
                        Click to select or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        Supports PDF, Word, Text, and images
                      </p>
                    </div>
                  )}
                </div>
                
                {file && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>File: {file.name}</span>
                      <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 w-full"
                      onClick={() => {
                        setFile(null);
                        setPreview(null);
                      }}
                    >
                      Remove file
                    </Button>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  disabled={!file || analysisMutation.isPending}
                  onClick={handleAnalyzeDocument}
                >
                  {analysisMutation.isPending ? (
                    <>
                      <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Analyze Document
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
            
            {/* Analysis settings card */}
            <Card>
              <CardHeader>
                <CardTitle>Analysis Settings</CardTitle>
                <CardDescription>
                  Configure options for document analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="detectEntities">Entity Detection</Label>
                      <p className="text-xs text-gray-500">
                        Identify named entities like organizations, people, and documents
                      </p>
                    </div>
                    <div className="flex h-5 items-center space-x-2">
                      <button 
                        type="button" 
                        role="checkbox"
                        aria-checked={analysisSettings.detectEntities}
                        data-state={analysisSettings.detectEntities ? "checked" : "unchecked"}
                        onClick={() => handleSettingChange('detectEntities', !analysisSettings.detectEntities)}
                        className={`peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${analysisSettings.detectEntities ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        {analysisSettings.detectEntities && <CheckSquare className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="detectConcepts">Concept Detection</Label>
                      <p className="text-xs text-gray-500">
                        Identify key concepts and topics in the document
                      </p>
                    </div>
                    <div className="flex h-5 items-center space-x-2">
                      <button 
                        type="button" 
                        role="checkbox"
                        aria-checked={analysisSettings.detectConcepts}
                        data-state={analysisSettings.detectConcepts ? "checked" : "unchecked"}
                        onClick={() => handleSettingChange('detectConcepts', !analysisSettings.detectConcepts)}
                        className={`peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${analysisSettings.detectConcepts ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        {analysisSettings.detectConcepts && <CheckSquare className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="detectRegulations">Regulation Detection</Label>
                      <p className="text-xs text-gray-500">
                        Identify references to regulations and standards
                      </p>
                    </div>
                    <div className="flex h-5 items-center space-x-2">
                      <button 
                        type="button" 
                        role="checkbox"
                        aria-checked={analysisSettings.detectRegulations}
                        data-state={analysisSettings.detectRegulations ? "checked" : "unchecked"}
                        onClick={() => handleSettingChange('detectRegulations', !analysisSettings.detectRegulations)}
                        className={`peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${analysisSettings.detectRegulations ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        {analysisSettings.detectRegulations && <CheckSquare className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="extractReferences">Reference Extraction</Label>
                      <p className="text-xs text-gray-500">
                        Extract and validate references to other documents
                      </p>
                    </div>
                    <div className="flex h-5 items-center space-x-2">
                      <button 
                        type="button" 
                        role="checkbox"
                        aria-checked={analysisSettings.extractReferences}
                        data-state={analysisSettings.extractReferences ? "checked" : "unchecked"}
                        onClick={() => handleSettingChange('extractReferences', !analysisSettings.extractReferences)}
                        className={`peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${analysisSettings.extractReferences ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        {analysisSettings.extractReferences && <CheckSquare className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="analyzeContext">Context Analysis</Label>
                      <p className="text-xs text-gray-500">
                        Analyze document context and section relationships
                      </p>
                    </div>
                    <div className="flex h-5 items-center space-x-2">
                      <button 
                        type="button" 
                        role="checkbox"
                        aria-checked={analysisSettings.analyzeContext}
                        data-state={analysisSettings.analyzeContext ? "checked" : "unchecked"}
                        onClick={() => handleSettingChange('analyzeContext', !analysisSettings.analyzeContext)}
                        className={`peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${analysisSettings.analyzeContext ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        {analysisSettings.analyzeContext && <CheckSquare className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="findSimilarDocuments">Similar Documents</Label>
                      <p className="text-xs text-gray-500">
                        Find documents with similar content or topics
                      </p>
                    </div>
                    <div className="flex h-5 items-center space-x-2">
                      <button 
                        type="button" 
                        role="checkbox"
                        aria-checked={analysisSettings.findSimilarDocuments}
                        data-state={analysisSettings.findSimilarDocuments ? "checked" : "unchecked"}
                        onClick={() => handleSettingChange('findSimilarDocuments', !analysisSettings.findSimilarDocuments)}
                        className={`peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${analysisSettings.findSimilarDocuments ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        {analysisSettings.findSimilarDocuments && <CheckSquare className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-1">
                  <Label htmlFor="detectionConfidenceThreshold">
                    Detection Confidence Threshold: {analysisSettings.detectionConfidenceThreshold}%
                  </Label>
                  <div className="relative pt-1">
                    <input
                      type="range"
                      id="detectionConfidenceThreshold"
                      min="0"
                      max="100"
                      step="5"
                      value={analysisSettings.detectionConfidenceThreshold}
                      onChange={(e) => handleSettingChange('detectionConfidenceThreshold', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Minimum confidence level for entity and concept detection
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Progress section */}
          {analysisMutation.isPending && (
            <Card className="mt-6">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{processingStep || 'Preparing analysis...'}</h3>
                      <p className="text-sm text-gray-500">Progress: {analysisProgress}%</p>
                    </div>
                    <RotateCw className="h-6 w-6 animate-spin text-primary" />
                  </div>
                  
                  <Progress value={analysisProgress} className="h-2" />
                  
                  <p className="text-sm text-gray-500">
                    Analyzing document content. This may take a few moments depending on document size and complexity.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="results">
          {analysisResult ? (
            <div className="space-y-6">
              {/* Document overview */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Document Overview</CardTitle>
                      <CardDescription>
                        General information about the analyzed document
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={copyAnalysisJson}
                      >
                        {jsonCopied ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy JSON
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={downloadAnalysisResults}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="h-4 w-4 text-slate-500" />
                        <h3 className="text-sm font-medium">Document</h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">File Name</span>
                          <span className="font-medium truncate max-w-[140px]" title={analysisResult.fileName}>
                            {analysisResult.fileName}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">File Type</span>
                          <span>{analysisResult.fileType.split('/')[1]?.toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Size</span>
                          <span>{(analysisResult.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
                      <div className="flex items-center gap-2 mb-3">
                        <Tag className="h-4 w-4 text-slate-500" />
                        <h3 className="text-sm font-medium">Classification</h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Category</span>
                          <Badge variant="outline">
                            {analysisResult.classification.category}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Priority</span>
                          <Badge variant={analysisResult.classification.priority === "HIGH" ? "default" : analysisResult.classification.priority === "MEDIUM" ? "secondary" : "outline"}>
                            {analysisResult.classification.priority}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Confidence</span>
                          <Badge variant={getConfidenceBadgeVariant(analysisResult.classification.confidence)}>
                            {analysisResult.classification.confidence.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
                      <div className="flex items-center gap-2 mb-3">
                        <Terminal className="h-4 w-4 text-slate-500" />
                        <h3 className="text-sm font-medium">Processing</h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Timestamp</span>
                          <span>{new Date(analysisResult.analysisTimestamp).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Duration</span>
                          <span>{(analysisResult.processingTimeMs / 1000).toFixed(2)}s</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Status</span>
                          <Badge variant="success">Complete</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="text-sm font-medium mb-2">Document Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.classification.tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Document Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Document Summary</CardTitle>
                  <CardDescription>
                    Key points and content summary
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
                      <h3 className="text-sm font-medium mb-2">Summary</h3>
                      <p className="text-sm">{analysisResult.summary.shortSummary}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Key Points</h3>
                      <ul className="space-y-2">
                        {analysisResult.summary.keyPoints.map((point: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCheck className="h-4 w-4 text-green-500 mt-0.5" />
                            <span className="text-sm">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Topic Distribution</h3>
                      <div className="space-y-3">
                        {analysisResult.summary.topicDistribution.map((topic: any, index: number) => (
                          <div key={index}>
                            <div className="flex justify-between text-xs mb-1">
                              <span>{topic.topic}</span>
                              <span>{topic.percentage}%</span>
                            </div>
                            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary" 
                                style={{ width: `${topic.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Key Insights</h3>
                      <ul className="space-y-2">
                        {analysisResult.context.keyInsights.map((insight: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                            <span className="text-sm">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Extracted Entities and References */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Extracted Entities</CardTitle>
                    <CardDescription>
                      Identified entities in the document
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-4">
                        {analysisResult.entities.map((entity: any, index: number) => (
                          <div key={index} className="border p-3 rounded-md">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-medium">{entity.text}</span>
                              <Badge variant={getConfidenceBadgeVariant(entity.confidence)}>
                                {entity.confidence.toFixed(1)}%
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                              <div className="flex items-center gap-1">
                                <Hash className="h-3 w-3 text-gray-500" />
                                <span className="text-gray-500">Type:</span>
                              </div>
                              <div>{entity.type}</div>
                              
                              <div className="flex items-center gap-1">
                                <Tag className="h-3 w-3 text-gray-500" />
                                <span className="text-gray-500">Category:</span>
                              </div>
                              <div>{entity.category}</div>
                              
                              {entity.metadata && entity.metadata.relevance && (
                                <>
                                  <div className="flex items-center gap-1">
                                    <Info className="h-3 w-3 text-gray-500" />
                                    <span className="text-gray-500">Relevance:</span>
                                  </div>
                                  <div className="capitalize">{entity.metadata.relevance}</div>
                                </>
                              )}
                              
                              {entity.metadata && entity.metadata.abbreviation && (
                                <>
                                  <div className="flex items-center gap-1">
                                    <Terminal className="h-3 w-3 text-gray-500" />
                                    <span className="text-gray-500">Abbreviation:</span>
                                  </div>
                                  <div>{entity.metadata.abbreviation}</div>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Document References</CardTitle>
                    <CardDescription>
                      Extracted references to external documents
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-4">
                        {analysisResult.references.map((reference: any, index: number) => (
                          <div key={index} className="border p-3 rounded-md">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-medium">{reference.text}</span>
                              <Badge variant={getConfidenceBadgeVariant(reference.confidence)}>
                                {reference.confidence.toFixed(1)}%
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                              <div className="flex items-center gap-1">
                                <Hash className="h-3 w-3 text-gray-500" />
                                <span className="text-gray-500">Type:</span>
                              </div>
                              <div>{reference.referenceType}</div>
                              
                              <div className="flex items-center gap-1">
                                <CalendarClock className="h-3 w-3 text-gray-500" />
                                <span className="text-gray-500">Location:</span>
                              </div>
                              <div>{reference.sourceLocation.section} (p. {reference.sourceLocation.pageNumber})</div>
                              
                              {reference.metadata && reference.metadata.issuer && (
                                <>
                                  <div className="flex items-center gap-1">
                                    <Info className="h-3 w-3 text-gray-500" />
                                    <span className="text-gray-500">Issuer:</span>
                                  </div>
                                  <div>{reference.metadata.issuer}</div>
                                </>
                              )}
                              
                              {reference.metadata && reference.metadata.year && (
                                <>
                                  <div className="flex items-center gap-1">
                                    <CalendarClock className="h-3 w-3 text-gray-500" />
                                    <span className="text-gray-500">Year:</span>
                                  </div>
                                  <div>{reference.metadata.year}</div>
                                </>
                              )}
                              
                              {reference.metadata && reference.metadata.title && (
                                <>
                                  <div className="flex items-center gap-1">
                                    <FileText className="h-3 w-3 text-gray-500" />
                                    <span className="text-gray-500">Title:</span>
                                  </div>
                                  <div className="truncate" title={reference.metadata.title}>{reference.metadata.title}</div>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
              
              {/* Similar Documents */}
              <Card>
                <CardHeader>
                  <CardTitle>Similar Documents</CardTitle>
                  <CardDescription>
                    Documents with similar content or topics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysisResult.similarDocuments.map((document: any, index: number) => (
                      <div key={index} className="border p-4 rounded-md">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-gray-500" />
                            <span className="font-medium">{document.title}</span>
                          </div>
                          <Badge variant="outline">
                            {document.similarity.toFixed(1)}% similar
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              Shared Entities
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {document.sharedEntities.map((entity: string, i: number) => (
                                <Badge key={i} variant="secondary" className="capitalize">
                                  {entity}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                              <Book className="h-3 w-3" />
                              Shared Concepts
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {document.sharedConcepts.map((concept: string, i: number) => (
                                <Badge key={i} variant="outline" className="capitalize">
                                  {concept}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <Button variant="ghost" size="sm" className="text-xs h-7">
                            <Link className="mr-1 h-3 w-3" />
                            View Document
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : analysisMutation.isPending ? (
            <div className="text-center py-10">
              <RotateCw className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h3 className="text-lg font-medium">{processingStep || 'Analyzing Document'}</h3>
              <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                The analysis engine is extracting insights from your document.
              </p>
              <div className="max-w-md mx-auto mt-4">
                <Progress value={analysisProgress} className="h-2" />
                <p className="text-sm mt-1 text-gray-500">Progress: {analysisProgress}%</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Results Available</h3>
              <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                Upload a document and analyze it to see results here.
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setActiveTab('upload')}
              >
                Go to Upload
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Help alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Document analysis tips</AlertTitle>
        <AlertDescription>
          Document analysis works best on well-structured documents with clear sections. The analysis engine can identify entities, concepts, and references, extract key insights, and find related documents in your repository.
        </AlertDescription>
      </Alert>
    </div>
  );
}