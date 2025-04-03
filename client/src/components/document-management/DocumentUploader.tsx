import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileUpIcon, FileTextIcon, FilePdfIcon, FileSpreadsheetIcon, FileIcon, AlertCircleIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'application/pdf', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain',
  'text/markdown'
];

// Get file icon based on file type
const getFileIcon = (fileType: string) => {
  if (fileType.includes('pdf')) return <FilePdfIcon className="h-6 w-6 text-red-500" />;
  if (fileType.includes('word') || fileType.includes('text')) return <FileTextIcon className="h-6 w-6 text-blue-500" />;
  if (fileType.includes('excel') || fileType.includes('sheet')) return <FileSpreadsheetIcon className="h-6 w-6 text-green-500" />;
  return <FileIcon className="h-6 w-6 text-gray-500" />;
};

// Upload status enum
export enum UploadStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}

interface DocumentUploaderProps {
  onUploadComplete?: (documentId: string) => void;
  createKnowledgeGraph?: boolean;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ 
  onUploadComplete,
  createKnowledgeGraph = true
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(UploadStatus.IDLE);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadStatus(UploadStatus.UPLOADING);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      formData.append('createKnowledgeGraph', String(createKnowledgeGraph));
      
      const response = await apiRequest('POST', '/api/documents', formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentage);
          }
        },
      });
      
      return await response.json();
    },
    onSuccess: (response) => {
      if (response.success) {
        setUploadStatus(UploadStatus.COMPLETE);
        queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
        
        toast({
          title: "Upload Successful",
          description: "Document has been uploaded successfully.",
        });
        
        if (onUploadComplete && response.document) {
          onUploadComplete(response.document.id);
        }
      } else {
        setUploadStatus(UploadStatus.ERROR);
        setErrorMessage(`Upload failed: ${response.message || 'Unknown error'}`);
      }
    },
    onError: (error: Error) => {
      setUploadStatus(UploadStatus.ERROR);
      setErrorMessage(`Upload failed: ${error.message}`);
      
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    setErrorMessage(null);
    
    if (!files || files.length === 0) {
      setSelectedFile(null);
      return;
    }

    const file = files[0];
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(`File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      setSelectedFile(null);
      return;
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setErrorMessage('File type not supported. Please upload PDF, Word, Excel, or text documents.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  // Handle upload button click
  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  // Handle select file button click
  const handleSelectFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Reset upload state
  const resetUpload = () => {
    setSelectedFile(null);
    setUploadStatus(UploadStatus.IDLE);
    setUploadProgress(0);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Document</CardTitle>
        <CardDescription>
          Upload aviation-related documents to build your knowledge graph
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
          accept={ALLOWED_FILE_TYPES.join(',')}
        />

        {uploadStatus === UploadStatus.IDLE && (
          <div className="space-y-6">
            <Button 
              variant="outline" 
              onClick={handleSelectFile}
              className="w-full h-24 border-dashed flex flex-col items-center justify-center gap-2"
            >
              <FileUpIcon className="h-6 w-6" />
              <span>Select File to Upload</span>
            </Button>

            {selectedFile && (
              <Card className="p-4">
                <div className="flex items-center gap-4">
                  {getFileIcon(selectedFile.type)}
                  <div className="flex-1">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button 
                  className="mt-4 w-full"
                  onClick={handleUpload}
                >
                  Upload Document
                </Button>
              </Card>
            )}

            <div className="text-sm text-muted-foreground">
              <p>Supported formats: PDF, Word, Excel, Text files</p>
              <p>Maximum file size: 50MB</p>
            </div>
          </div>
        )}

        {(uploadStatus === UploadStatus.UPLOADING || uploadStatus === UploadStatus.PROCESSING) && (
          <div className="space-y-4">
            <p>
              {uploadStatus === UploadStatus.UPLOADING 
                ? `Uploading: ${uploadProgress.toFixed(0)}%` 
                : 'Processing document...'}
            </p>
            <Progress 
              value={uploadStatus === UploadStatus.UPLOADING ? uploadProgress : 100} 
              className="h-2 w-full"
            />
            {uploadStatus === UploadStatus.PROCESSING && (
              <p className="text-sm text-muted-foreground">
                Extracting content and generating preview. This may take a few moments.
              </p>
            )}
          </div>
        )}

        {uploadStatus === UploadStatus.COMPLETE && (
          <Alert variant="default" className="bg-green-50 border-green-200">
            <AlertCircleIcon className="h-4 w-4 text-green-500" />
            <AlertTitle>Upload Complete</AlertTitle>
            <AlertDescription>
              Your document has been successfully uploaded and processed.
              <Button variant="outline" onClick={resetUpload} className="mt-2">
                Upload Another
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {uploadStatus === UploadStatus.ERROR && errorMessage && (
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {errorMessage}
              <Button variant="outline" onClick={resetUpload} className="mt-2">
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentUploader;