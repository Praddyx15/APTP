// src/frontend/components/DocumentUpload/DocumentUpload.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  File, 
  AlertCircle, 
  Check, 
  X,
  Loader, 
  FileText
} from 'lucide-react';

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Types
export interface DocumentFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  processingStage?: string;
  result?: DocumentProcessingResult;
}

export interface DocumentProcessingResult {
  documentId: string;
  status: string;
  summary?: string;
  autoTags?: string[];
  qualityAssessment?: {
    completenessScore: number;
    consistencyScore: number;
    regulatoryComplianceScore: number;
    overallConfidence: number;
    potentialGaps?: string[];
    inconsistencies?: string[];
    complianceIssues?: string[];
  };
  sentiment?: Record<string, number>;
  entities?: Record<string, string[]>;
}

export interface DocumentUploadProps {
  organizationId: string;
  supportedFileTypes?: string[];
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  onUploadComplete?: (results: DocumentProcessingResult[]) => void;
  onUploadError?: (error: string) => void;
  showAdvancedFeatures?: boolean;
}

// Document upload API service
const documentUploadService = {
  uploadDocument: async (
    file: File, 
    organizationId: string, 
    onProgress: (progress: number, stage?: string) => void
  ): Promise<DocumentProcessingResult> => {
    // Mock implementation that would be replaced with actual API calls
    return new Promise((resolve, reject) => {
      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        onProgress(progress, 'uploading');
        
        if (progress >= 100) {
          clearInterval(interval);
          
          // Simulate processing stages
          setTimeout(() => {
            onProgress(30, 'Extracting content');
          }, 300);
          
          setTimeout(() => {
            onProgress(60, 'Recognizing document structure');
          }, 600);
          
          setTimeout(() => {
            onProgress(80, 'Extracting training elements');
          }, 900);
          
          setTimeout(() => {
            onProgress(100, 'Processing completed');
            
            // Simulate processing result
            resolve({
              documentId: `doc-${Date.now()}`,
              status: 'completed',
              summary: `This is a summary of ${file.name}. The document appears to be a training manual covering aviation procedures.`,
              autoTags: ['aviation', 'training', 'procedures', 'safety', 'regulations'],
              qualityAssessment: {
                completenessScore: 0.87,
                consistencyScore: 0.92,
                regulatoryComplianceScore: 0.95,
                overallConfidence: 0.91,
                potentialGaps: ['Missing detailed emergency procedures for engine failure'],
                inconsistencies: ['Different terminology used for checklist items in sections 2 and 3'],
                complianceIssues: ['Limited coverage of FAA Part 91.103 requirements']
              },
              sentiment: {
                positive: 0.65,
                neutral: 0.30,
                negative: 0.05,
                safety_emphasis: 0.85
              },
              entities: {
                aircraft: ['Cessna 172', 'Boeing 737'],
                airports: ['KJFK', 'KLAX', 'KORD'],
                regulations: ['FAA Part 61', 'FAA Part 91']
              }
            });
          }, 1200);
        }
      }, 100);
    });
  }
};

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  organizationId,
  supportedFileTypes = ['.pdf', '.docx', '.xlsx', '.html', '.pptx'],
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 5,
  onUploadComplete,
  onUploadError,
  showAdvancedFeatures = true
}) => {
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [activeTab, setActiveTab] = useState<string>('upload');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check if all documents are processed
  useEffect(() => {
    const allCompleted = documents.length > 0 && 
      documents.every(doc => doc.status === 'completed' || doc.status === 'failed');
    
    if (allCompleted && onUploadComplete) {
      const results = documents
        .filter(doc => doc.status === 'completed' && doc.result)
        .map(doc => doc.result as DocumentProcessingResult);
      
      onUploadComplete(results);
    }
  }, [documents, onUploadComplete]);
  
  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    
    // Check if adding these files would exceed the maximum
    if (documents.length + acceptedFiles.length > maxFiles) {
      setError(`You can only upload up to ${maxFiles} files at a time.`);
      return;
    }
    
    // Filter out files that are too large
    const validFiles = acceptedFiles.filter(file => file.size <= maxFileSize);
    const invalidFiles = acceptedFiles.filter(file => file.size > maxFileSize);
    
    if (invalidFiles.length > 0) {
      setError(`${invalidFiles.length} file(s) exceeded the maximum size of ${formatFileSize(maxFileSize)}.`);
    }
    
    // Create document objects for valid files
    const newDocuments = validFiles.map(file => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      status: 'pending' as const,
      progress: 0
    }));
    
    setDocuments(prev => [...prev, ...newDocuments]);
    
    // Start uploading new documents
    newDocuments.forEach(doc => {
      uploadDocument(doc);
    });
  }, [documents, maxFiles, maxFileSize]);
  
  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: supportedFileTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize: maxFileSize,
    maxFiles
  });
  
  // Upload a document
  const uploadDocument = async (doc: DocumentFile) => {
    // Update status to uploading
    setDocuments(prev => 
      prev.map(d => (d.id === doc.id ? { ...d, status: 'uploading' as const } : d))
    );
    
    try {
      // Upload document and track progress
      const result = await documentUploadService.uploadDocument(
        doc.file,
        organizationId,
        (progress, stage) => {
          setDocuments(prev => 
            prev.map(d => {
              if (d.id === doc.id) {
                const newDoc = { ...d, progress };
                if (stage) {
                  if (stage === 'uploading') {
                    newDoc.status = 'uploading' as const;
                  } else {
                    newDoc.status = 'processing' as const;
                    newDoc.processingStage = stage;
                  }
                }
                return newDoc;
              }
              return d;
            })
          );
        }
      );
      
      // Update with result
      setDocuments(prev => 
        prev.map(d => {
          if (d.id === doc.id) {
            return { 
              ...d, 
              status: 'completed' as const, 
              progress: 100,
              result
            };
          }
          return d;
        })
      );
      
      // Switch to results tab after first successful upload
      setActiveTab('results');
    } catch (err) {
      // Handle error
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      
      setDocuments(prev => 
        prev.map(d => {
          if (d.id === doc.id) {
            return { 
              ...d, 
              status: 'failed' as const, 
              error: errorMessage
            };
          }
          return d;
        })
      );
      
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    }
  };
  
  // Handle manual file selection
  const handleSelectFiles = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Remove a document
  const removeDocument = (docId: string) => {
    setDocuments(prev => prev.filter(d => d.id !== docId));
  };
  
  // Reset everything
  const handleReset = () => {
    setDocuments([]);
    setError(null);
    setActiveTab('upload');
  };
  
  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Get document status badge
  const getStatusBadge = (status: DocumentFile['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'uploading':
        return <Badge variant="secondary">Uploading</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return null;
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Document Upload</CardTitle>
        <CardDescription>
          Upload training documents for processing. Supported formats: 
          {supportedFileTypes.join(', ')}
        </CardDescription>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mx-6">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>
        
        <CardContent>
          <TabsContent value="upload">
            {/* Dropzone area */}
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-10 text-center cursor-pointer
                transition-colors duration-200 ease-in-out
                ${isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary'}
              `}
            >
              <input 
                {...getInputProps()} 
                ref={fileInputRef}
                accept={supportedFileTypes.join(',')}
              />
              
              <div className="flex flex-col items-center justify-center space-y-4">
                <Upload className="h-12 w-12 text-gray-400" />
                
                <div>
                  <p className="text-lg font-medium">
                    {isDragActive ? 'Drop files here' : 'Drag and drop files here'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    or <span className="text-primary cursor-pointer" onClick={handleSelectFiles}>browse</span> to select files
                  </p>
                </div>
                
                <p className="text-xs text-gray-400">
                  Maximum file size: {formatFileSize(maxFileSize)}
                </p>
                <p className="text-xs text-gray-400">
                  Up to {maxFiles} files can be uploaded at once
                </p>
              </div>
            </div>
            
            {/* Error message */}
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {/* File list */}
            {documents.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Files</h3>
                
                <div className="space-y-4">
                  {documents.map(doc => (
                    <div 
                      key={doc.id} 
                      className="flex items-center justify-between border rounded-lg p-4"
                    >
                      <div className="flex items-center space-x-4">
                        <FileText className="h-8 w-8 text-gray-400" />
                        
                        <div>
                          <p className="font-medium">{doc.file.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(doc.file.size)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {getStatusBadge(doc.status)}
                        
                        {(doc.status === 'uploading' || doc.status === 'processing') && (
                          <div className="w-32">
                            <Progress value={doc.progress} className="h-2" />
                            {doc.processingStage && (
                              <p className="text-xs text-gray-500 mt-1">{doc.processingStage}</p>
                            )}
                          </div>
                        )}
                        
                        {doc.status === 'failed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => uploadDocument(doc)}
                          >
                            Retry
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(doc.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="results">
            {documents.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-500">No documents have been uploaded yet.</p>
              </div>
            ) : (
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead>Tags</TableHead>
                      {showAdvancedFeatures && (
                        <TableHead>Quality Score</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  
                  <TableBody>
                    {documents.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.file.name}</TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                        <TableCell>
                          {doc.result?.summary && doc.status === 'completed' ? (
                            <div className="max-w-md">
                              <p className="text-sm truncate">{doc.result.summary}</p>
                            </div>
                          ) : doc.status === 'processing' ? (
                            <div className="flex items-center">
                              <Loader className="h-4 w-4 mr-2 animate-spin" />
                              <span className="text-sm">{doc.processingStage || 'Processing...'}</span>
                            </div>
                          ) : doc.status === 'failed' ? (
                            <p className="text-sm text-red-500">{doc.error || 'Processing failed'}</p>
                          ) : (
                            <p className="text-sm text-gray-500">Not yet processed</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {doc.result?.autoTags && doc.status === 'completed' ? (
                            <div className="flex flex-wrap gap-1">
                              {doc.result.autoTags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="outline">{tag}</Badge>
                              ))}
                              {doc.result.autoTags.length > 3 && (
                                <Badge variant="outline">+{doc.result.autoTags.length - 3} more</Badge>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">-</p>
                          )}
                        </TableCell>
                        {showAdvancedFeatures && (
                          <TableCell>
                            {doc.result?.qualityAssessment && doc.status === 'completed' ? (
                              <div className="flex items-center">
                                <span className="font-medium mr-2">
                                  {Math.round(doc.result.qualityAssessment.overallConfidence * 100)}%
                                </span>
                                {doc.result.qualityAssessment.overallConfidence > 0.8 ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : doc.result.qualityAssessment.overallConfidence > 0.5 ? (
                                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                                ) : (
                                  <X className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">-</p>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
      
      <CardFooter className="flex justify-between">
        <Button
          variant="ghost"
          onClick={handleReset}
          disabled={documents.length === 0}
        >
          Reset
        </Button>
        
        <div className="flex space-x-2">
          <Button 
            variant="secondary"
            onClick={handleSelectFiles}
            disabled={documents.length >= maxFiles}
          >
            Add More Files
          </Button>
          
          <Button 
            variant="default"
            onClick={() => setActiveTab('results')}
            disabled={documents.length === 0}
          >
            View Results
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default DocumentUpload;
