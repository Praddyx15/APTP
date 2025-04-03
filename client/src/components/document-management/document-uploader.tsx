import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, Input, Progress, Alert, Card, Label } from '@/components/ui';
import { Upload, FileText, File, PlusCircle } from 'lucide-react';
import DocumentService from '@/services/document-service';
import { useToast } from '@/hooks/use-toast';

// Maximum file size in bytes (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown'
];

export interface DocumentUploaderProps {
  onUploadComplete?: (documentId: number) => void;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onUploadComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [createKnowledgeGraph, setCreateKnowledgeGraph] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!selectedFile) {
        throw new Error('No file selected');
      }
      
      return DocumentService.uploadDocument(
        selectedFile,
        {
          title: title || selectedFile.name,
          description,
          createKnowledgeGraph
        },
        setUploadProgress
      );
    },
    onSuccess: (data) => {
      toast({
        title: 'Upload successful',
        description: 'Document was uploaded and is being processed.',
        variant: 'default',
      });
      
      resetForm();
      
      if (onUploadComplete && data.document) {
        onUploadComplete(data.document.id);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    
    if (!files || files.length === 0) {
      setSelectedFile(null);
      return;
    }
    
    const file = files[0];
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: `Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        variant: 'destructive',
      });
      return;
    }
    
    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast({
        title: 'Unsupported file type',
        description: 'Please upload a PDF, Word, Excel, or text file',
        variant: 'destructive',
      });
      return;
    }
    
    setSelectedFile(file);
    // Auto-populate title from filename
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, "")); // Remove file extension
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }
    
    if (!title) {
      toast({
        title: 'Title required',
        description: 'Please provide a title for this document',
        variant: 'destructive',
      });
      return;
    }
    
    uploadMutation.mutate();
  };

  const handleSelectFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setTitle('');
    setDescription('');
    setCreateKnowledgeGraph(true);
    setUploadProgress(0);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold mb-4">Upload Document</h3>
      
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        accept={ALLOWED_MIME_TYPES.join(',')}
      />
      
      <div className="space-y-4">
        {!uploadMutation.isPending && (
          <>
            <div className="mb-4">
              <Label htmlFor="title">Document Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter document title"
              />
            </div>
            
            <div className="mb-4">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter document description"
              />
            </div>
            
            <div className="flex items-center mb-4">
              <input 
                type="checkbox" 
                id="createKnowledgeGraph"
                checked={createKnowledgeGraph}
                onChange={(e) => setCreateKnowledgeGraph(e.target.checked)}
                className="mr-2"
              />
              <Label htmlFor="createKnowledgeGraph">Generate Knowledge Graph</Label>
            </div>
            
            {selectedFile ? (
              <div className="p-4 border rounded-md mb-4 flex items-center">
                <FileText className="h-8 w-8 mr-3 text-blue-500" />
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
            ) : (
              <Button 
                onClick={handleSelectFile} 
                className="w-full h-24 border-dashed flex flex-col items-center justify-center bg-primary-50"
                variant="outline"
              >
                <Upload className="h-8 w-8 mb-2" />
                <span>Click to select a document</span>
                <span className="text-xs text-gray-500 mt-1">PDF, Word, Excel, Text (Max: 50MB)</span>
              </Button>
            )}
            
            <Button 
              onClick={handleUpload}
              disabled={!selectedFile || !title}
              className="w-full"
              variant="default"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </>
        )}
        
        {uploadMutation.isPending && (
          <div className="space-y-4">
            <p className="text-center">Uploading document...</p>
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-center text-sm text-gray-500">
              {uploadProgress < 100 ? `${uploadProgress}% complete` : 'Processing document...'}
            </p>
          </div>
        )}
        
        {uploadMutation.isError && (
          <Alert variant="destructive">
            <p>Upload failed: {uploadMutation.error.message}</p>
          </Alert>
        )}
        
        {uploadMutation.isSuccess && (
          <Alert variant="default">
            <p>Document uploaded successfully!</p>
          </Alert>
        )}
      </div>
    </Card>
  );
};

export default DocumentUploader;
