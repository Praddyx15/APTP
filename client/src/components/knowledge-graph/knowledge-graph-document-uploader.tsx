import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, UploadCloud, File, X, CheckCircle2, Network } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function KnowledgeGraphDocumentUploader() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isKnowledgeGraphDoc, setIsKnowledgeGraphDoc] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [documentId, setDocumentId] = useState<number | null>(null);

  // Define mutation for document upload
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const next = prev + Math.random() * 15;
          return next > 95 ? 95 : next;
        });
      }, 500);
      
      try {
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData
        });
        
        // Clear interval and set to complete
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        if (!response.ok) {
          throw new Error(`Upload failed with status: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        clearInterval(progressInterval);
        console.error("Document upload error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Document upload succeeded:", data);
      
      // Reset form fields
      setFile(null);
      setTitle('');
      setDescription('');
      setIsKnowledgeGraphDoc(true);
      setUploadProgress(0);
      
      // Invalidate documents query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      
      // Also invalidate knowledge graph data to refresh with new document content
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-graph'] });
      
      // Show success message
      toast({
        title: "Document uploaded successfully",
        description: "Your document has been uploaded and will be processed for the knowledge graph.",
        variant: "default",
      });
      
      // Use our helper function to handle the success state
      if (data && data.id) {
        forceSuccessState(data.id);
      } else {
        // Even without an ID, we should still show the success state
        setUploadSuccess(true);
      }
    },
    onError: (error: Error) => {
      setUploadProgress(0);
      toast({
        title: "Upload failed",
        description: `Failed to upload document: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Configure dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      
      // Set default title from filename
      if (!title) {
        setTitle(selectedFile.name.split('.')[0].replace(/[_-]/g, ' '));
      }
    }
  }, [title]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt']
    },
    maxFiles: 1,
    maxSize: 30 * 1024 * 1024, // 30MB
  });
  
  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Direct state update to force success view after upload
  const forceSuccessState = (documentId: number) => {
    console.log("Forcing success state with document ID:", documentId);
    // This sets both state variables needed for success view
    setDocumentId(documentId);
    setUploadSuccess(true);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }
    
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please provide a title for the document",
        variant: "destructive",
      });
      return;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('isPublic', 'true'); // Make knowledge graph documents public by default
    
    // Add tags
    const tags = ['knowledge-graph'];
    if (isKnowledgeGraphDoc) {
      tags.push('syllabus');
      tags.push('training-material');
    }
    
    // Handle tags correctly - this is the fix for the validation error
    // Send tags as individual form entries with the same name
    tags.forEach(tag => {
      formData.append('tags', tag);
    });
    
    // Reset success state if somehow already true
    setUploadSuccess(false);
    
    // Start upload
    setUploadProgress(0);
    uploadMutation.mutate(formData);
  };
  
  // Remove selected file
  const removeFile = () => {
    setFile(null);
  };
  
  // Handle generating knowledge graph
  const handleGenerateKnowledgeGraph = () => {
    // Reset upload success for next document
    setUploadSuccess(false);
    
    // Invalidate knowledge graph data to refresh with new document content
    queryClient.invalidateQueries({ queryKey: ['/api/knowledge-graph'] });
    
    // Navigate to the visualization tab - try multiple approaches
    
    // Approach 1: Try direct DOM method
    if (window.setActiveKnowledgeGraphTab && typeof window.setActiveKnowledgeGraphTab === 'function') {
      console.log("Using global tab changing function");
      window.setActiveKnowledgeGraphTab('visualize');
    } 
    // Approach 2: Try custom event
    else {
      // First try to locate the element with the data attribute
      const tabSwitcher = document.querySelector('[data-tab-switcher]');
      if (tabSwitcher) {
        console.log("Found tab switcher element:", tabSwitcher);
        // Create custom event with bubbling enabled
        const event = new CustomEvent('tabChange', { 
          detail: 'visualize',
          bubbles: true,  // Allow event to bubble up through DOM
          composed: true  // Allow event to cross the shadow DOM boundary
        });
        // This will trigger the parent component to switch tabs
        tabSwitcher.dispatchEvent(event);
        console.log("Tab change event dispatched to switcher");
        
        // Also try document level event as fallback
        document.dispatchEvent(new CustomEvent('tabChange', { 
          detail: 'visualize',
          bubbles: true,
          composed: true
        }));
      } else {
        console.error("Could not find tab switcher element with data-tab-switcher attribute");
        
        // Fallback to document level event
        document.dispatchEvent(new CustomEvent('tabChange', { 
          detail: 'visualize',
          bubbles: true,
          composed: true
        }));
      }
    }
    
    toast({
      title: "Generating Knowledge Graph",
      description: "The knowledge graph is being updated with your document content.",
      variant: "default",
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      {uploadSuccess ? (
        <div className="space-y-6">
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <h3 className="text-lg font-semibold text-green-800">Upload Successful!</h3>
            </div>
            <p className="text-green-700 mb-6">
              Your document has been successfully uploaded and is being processed. You can now generate
              a knowledge graph to visualize the relationships between concepts in your document.
            </p>
            <Button 
              onClick={handleGenerateKnowledgeGraph}
              className="w-full"
              size="lg"
            >
              <Network className="mr-2 h-5 w-5" />
              Generate Knowledge Graph
            </Button>
          </div>
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => setUploadSuccess(false)}
            >
              Upload Another Document
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File upload area */}
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            
            {file ? (
              <div className="flex flex-col items-center justify-center">
                <File className="h-12 w-12 text-primary mb-2" />
                <p className="text-base font-medium mb-1">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                  className="mt-2"
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4">
                <UploadCloud className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-base font-medium">
                  Drag and drop a file here, or click to select
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Supported formats: PDF, DOCX, XLSX, PPTX, TXT (Max 30MB)
                </p>
              </div>
            )}
          </div>
          
          {/* Document details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter document title"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter document description"
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="knowledge-graph"
                checked={isKnowledgeGraphDoc}
                onCheckedChange={setIsKnowledgeGraphDoc}
              />
              <Label htmlFor="knowledge-graph" className="cursor-pointer">
                Process document for Knowledge Graph visualization
              </Label>
            </div>
          </div>
          
          {/* Upload button */}
          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={!file || uploadMutation.isPending}
              className="w-full max-w-xs"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Upload for Knowledge Graph
                </>
              )}
            </Button>
          </div>
          
          {/* For testing - visible only in development */}
          {process.env.NODE_ENV === 'development' && !uploadMutation.isPending && (
            <div className="flex justify-center mt-4">
              <Button
                type="button" 
                variant="outline"
                size="sm"
                onClick={() => {
                  // This is just for testing - simulates a successful upload
                  forceSuccessState(999);
                }}
                className="text-xs"
              >
                DEV: Test Success State
              </Button>
            </div>
          )}
          
          {/* Upload progress */}
          {uploadMutation.isPending && (
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">Uploading document...</p>
                    <p className="text-sm text-muted-foreground">{Math.round(uploadProgress)}%</p>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                  {uploadProgress === 100 && (
                    <div className="flex items-center gap-2 text-green-600 mt-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <p className="text-sm">Upload complete! Processing for knowledge graph...</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      )}
    </div>
  );
}