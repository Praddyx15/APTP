import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, Upload, File, FileText, X } from 'lucide-react';
import documentProcessor, { SyllabusStructure, ProgressEvent } from '@/lib/document-processor';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface DocumentUploaderProps {
  onProcessingComplete?: (result: SyllabusStructure) => void;
  maxSize?: number; // in MB
  acceptedFileTypes?: string[];
  allowMultiple?: boolean;
  className?: string;
}

export function DocumentUploader({
  onProcessingComplete,
  maxSize = 15, // 15MB default
  acceptedFileTypes = ['.pdf', '.docx', '.xlsx', '.xls'],
  allowMultiple = false,
  className = '',
}: DocumentUploaderProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');

  // File processing function
  const processFile = async (file: File): Promise<SyllabusStructure> => {
    return new Promise((resolve, reject) => {
      // Set up progress listener
      const handleProgress = (event: ProgressEvent) => {
        if (event.type === 'error') {
          console.error('Document processing error:', event.error);
          reject(new Error(event.message));
          return;
        }
        
        setProgress(event.progress);
        setProcessingMessage(event.message);
        
        if (event.type === 'complete') {
          // Remove progress listener
          documentProcessor.removeListener('progress', handleProgress);
        }
      };
      
      documentProcessor.on('progress', handleProgress);
      
      // Process file based on type
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result;
          
          if (!buffer) {
            reject(new Error('Failed to read file'));
            return;
          }
          
          let result: SyllabusStructure;
          
          if (file.name.endsWith('.pdf')) {
            result = await documentProcessor.processPdfDocument(buffer as ArrayBuffer);
          } else if (file.name.endsWith('.docx')) {
            result = await documentProcessor.processWordDocument(buffer as ArrayBuffer);
          } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            result = await documentProcessor.processExcelDocument(buffer as ArrayBuffer);
          } else {
            reject(new Error('Unsupported file format'));
            return;
          }
          
          resolve(result);
        } catch (error) {
          // Remove progress listener on error
          documentProcessor.removeListener('progress', handleProgress);
          reject(error);
        }
      };
      
      reader.onerror = () => {
        // Remove progress listener on error
        documentProcessor.removeListener('progress', handleProgress);
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  };
  
  // Save document mutation
  const saveDocumentMutation = useMutation({
    mutationFn: async (data: { title: string; content: SyllabusStructure; fileType: string; fileName: string }) => {
      const response = await apiRequest('POST', '/api/documents', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Document saved successfully',
        description: 'Your document has been processed and saved.',
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to save document',
        description: error.message || 'An error occurred while saving the document.',
        variant: 'destructive',
      });
    },
  });

  // Process button handler
  const handleProcess = async () => {
    if (files.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select at least one file to process.',
        variant: 'destructive',
      });
      return;
    }
    
    setProcessing(true);
    setProgress(0);
    setProcessingMessage('Starting document processing...');
    
    try {
      // Process all selected files (or just the first one if multiple aren't allowed)
      const filesToProcess = allowMultiple ? files : [files[0]];
      const results: SyllabusStructure[] = [];
      
      for (const file of filesToProcess) {
        const result = await processFile(file);
        results.push(result);
        
        // Save the document
        await saveDocumentMutation.mutateAsync({
          title: result.title || file.name,
          content: result,
          fileType: file.type,
          fileName: file.name,
        });
      }
      
      // Return the results
      if (onProcessingComplete) {
        onProcessingComplete(results[0]);
      }
      
      toast({
        title: 'Processing complete',
        description: `Successfully processed ${results.length} document(s).`,
        variant: 'default',
      });
      
      // Clear files after successful processing
      setFiles([]);
    } catch (error) {
      toast({
        title: 'Processing failed',
        description: error.message || 'An error occurred during document processing.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Validate file types and size
    const validFiles = acceptedFiles.filter(file => {
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!acceptedFileTypes.includes(fileExt)) {
        toast({
          title: 'Invalid file type',
          description: `File "${file.name}" is not an accepted file type. Please upload ${acceptedFileTypes.join(', ')} files.`,
          variant: 'destructive',
        });
        return false;
      }
      
      if (file.size > maxSize * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `File "${file.name}" exceeds the maximum size of ${maxSize}MB.`,
          variant: 'destructive',
        });
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length > 0) {
      if (allowMultiple) {
        setFiles(prevFiles => [...prevFiles, ...validFiles]);
      } else {
        setFiles(validFiles.slice(0, 1));
      }
    }
  }, [acceptedFileTypes, allowMultiple, maxSize, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: allowMultiple ? undefined : 1,
    disabled: processing,
  });

  // Remove a file from the list
  const removeFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  return (
    <div className={`w-full ${className}`}>
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer 
          transition-colors duration-200 
          ${isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 dark:border-gray-700'} 
          ${processing ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-2">
          <Upload className="w-12 h-12 text-gray-400" />
          <h3 className="text-lg font-medium">
            {isDragActive ? 'Drop files here' : 'Drag and drop files here'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            or <span className="text-primary">browse</span> to select files
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Accepted file types: {acceptedFileTypes.join(', ')} (Max: {maxSize}MB)
          </p>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium">Selected files:</h4>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li 
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 rounded-md bg-gray-50 dark:bg-gray-800"
              >
                <div className="flex items-center space-x-3">
                  {file.type.includes('pdf') ? (
                    <File className="w-5 h-5 text-red-500" />
                  ) : (
                    <FileText className="w-5 h-5 text-blue-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium truncate max-w-xs">{file.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                
                {!processing && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="h-8 w-8"
                    aria-label="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Processing status */}
      {processing && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{processingMessage}</p>
            <p className="text-sm font-medium">{progress}%</p>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex justify-end">
        <Button 
          onClick={handleProcess}
          disabled={files.length === 0 || processing}
          className="flex items-center space-x-2"
        >
          {processing ? (
            <>
              <LoaderCircle className="w-4 h-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>Process {files.length} {files.length === 1 ? 'file' : 'files'}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}