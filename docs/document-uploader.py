// components/documents/DocumentUploader.tsx
import React, { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import documentService, { DocumentMetadata, UploadOptions } from '../../services/documentService';
import Button from '../ui/Button';

interface DocumentUploaderProps {
  onUploadComplete?: (documents: DocumentMetadata[]) => void;
  onUploadError?: (error: Error) => void;
  maxFiles?: number;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in bytes
  tags?: string[];
  description?: string;
  autoProcess?: boolean;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onUploadComplete,
  onUploadError,
  maxFiles = 10,
  acceptedFileTypes = ['.pdf', '.docx', '.xlsx', '.html', '.pptx'],
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  tags = [],
  description = '',
  autoProcess = true,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedDocs, setUploadedDocs] = useState<DocumentMetadata[]>([]);
  
  // Accept only specified file types
  const acceptedTypes = acceptedFileTypes.reduce((acc, type) => {
    // Convert file extensions to MIME types
    const mimeType = type === '.pdf' ? 'application/pdf' :
                    type === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                    type === '.xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                    type === '.html' ? 'text/html' :
                    type === '.pptx' ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' :
                    type;
    return { ...acc, [mimeType]: [] };
  }, {});

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle accepted files
    if (acceptedFiles.length > 0) {
      setFiles(prevFiles => [...prevFiles, ...acceptedFiles].slice(0, maxFiles));
    }
    
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const newErrors: Record<string, string> = { ...errors };
      
      rejectedFiles.forEach(rejected => {
        const { file, errors: fileErrors } = rejected;
        const errorMessages = fileErrors.map((err: any) => {
          if (err.code === 'file-too-large') {
            return `File is too large. Max size is ${maxFileSize / (1024 * 1024)}MB.`;
          }
          if (err.code === 'file-invalid-type') {
            return `Invalid file type. Accepted types: ${acceptedFileTypes.join(', ')}.`;
          }
          return err.message;
        }).join(', ');
        
        newErrors[file.name] = errorMessages;
      });
      
      setErrors(newErrors);
    }
  }, [maxFiles, errors, acceptedFileTypes, maxFileSize]);

  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    maxSize: maxFileSize,
    multiple: maxFiles > 1,
  });

  // Handle file removal
  const handleRemoveFile = (index: number) => {
    setFiles(files => files.filter((_, i) => i !== index));
    
    // Also remove any errors for this file
    const removedFile = files[index];
    if (removedFile && errors[removedFile.name]) {
      const newErrors = { ...errors };
      delete newErrors[removedFile.name];
      setErrors(newErrors);
    }
  };

  // Upload files
  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    const uploadedDocuments: DocumentMetadata[] = [];
    
    try {
      // If only one file, use single upload method
      if (files.length === 1) {
        const options: UploadOptions = {
          tags,
          description,
          shouldProcess: autoProcess,
          onProgress: (percentage) => {
            setProgress(prev => ({
              ...prev,
              [files[0].name]: percentage
            }));
          }
        };
        
        const result = await documentService.uploadDocument(files[0], options);
        uploadedDocuments.push(result);
      } 
      // Otherwise use batch upload
      else {
        const options: UploadOptions = {
          tags,
          description,
          shouldProcess: autoProcess,
          onProgress: (percentage) => {
            // For batch uploads, apply the same progress to all files
            const newProgress: Record<string, number> = {};
            files.forEach(file => {
              newProgress[file.name] = percentage;
            });
            setProgress(newProgress);
          }
        };
        
        const results = await documentService.uploadDocuments(files, options);
        uploadedDocuments.push(...results);
      }
      
      // Update state and call callback
      setUploadedDocs(prev => [...prev, ...uploadedDocuments]);
      if (onUploadComplete) {
        onUploadComplete(uploadedDocuments);
      }
      
      // Clear files after successful upload
      setFiles([]);
      setProgress({});
    } catch (error) {
      console.error('Upload error:', error);
      if (onUploadError) {
        onUploadError(error as Error);
      }
      
      // Set general error for all files
      const newErrors: Record<string, string> = {};
      files.forEach(file => {
        newErrors[file.name] = 'Upload failed. Please try again.';
      });
      setErrors(newErrors);
    } finally {
      setUploading(false);
    }
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="w-full space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          p-6 border-2 border-dashed rounded-lg text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
          ${uploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <div className="flex justify-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-12 w-12 text-gray-400"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
              />
            </svg>
          </div>
          <div className="text-gray-700 font-medium">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </div>
          <div className="text-gray-500 text-sm">
            or <span className="text-blue-500">browse files</span>
          </div>
          <div className="text-xs text-gray-400">
            Accepted file types: {acceptedFileTypes.join(', ')}
          </div>
          <div className="text-xs text-gray-400">
            Max file size: {formatFileSize(maxFileSize)}
          </div>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-4 font-medium text-gray-700 border-b border-gray-200 bg-gray-100">
            Files to upload ({files.length}/{maxFiles})
          </div>
          <ul className="divide-y divide-gray-200">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="p-4 flex items-center">
                {/* File icon based on type */}
                <div className="flex-shrink-0 mr-3">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-6 w-6 text-gray-500"
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                    />
                  </svg>
                </div>
                
                {/* File info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {file.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </div>
                  
                  {/* Error message if any */}
                  {errors[file.name] && (
                    <div className="text-xs text-red-500 mt-1">
                      {errors[file.name]}
                    </div>
                  )}
                  
                  {/* Progress bar */}
                  {uploading && progress[file.name] !== undefined && (
                    <div className="w-full mt-2 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out" 
                        style={{ width: `${progress[file.name]}%` }}
                      />
                    </div>
                  )}
                </div>
                
                {/* Remove button */}
                {!uploading && (
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="ml-2 flex-shrink-0 text-gray-400 hover:text-red-500 focus:outline-none"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-5 w-5" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={1.5} 
                        d="M6 18L18 6M6 6l12 12" 
                      />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upload button */}
      {files.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleUpload}
            isLoading={uploading}
            disabled={uploading || Object.keys(errors).length > 0}
            leftIcon={
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                />
              </svg>
            }
          >
            {uploading ? 'Uploading...' : `Upload ${files.length > 1 ? 'Files' : 'File'}`}
          </Button>
        </div>
      )}

      {/* Recently uploaded documents */}
      {uploadedDocs.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-700 mb-3">Recently Uploaded Documents</h3>
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
            {uploadedDocs.map((doc) => (
              <li key={doc.id} className="p-4 flex items-center">
                <div className="flex-shrink-0 mr-3">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-6 w-6 text-green-500"
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">
                    {doc.title}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center">
                    <span className="mr-2">Status: {doc.status}</span>
                    <span>Uploaded: {new Date(doc.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DocumentUploader;
