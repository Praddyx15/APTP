// src/frontend/components/document/DocumentManagement.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { DataTable, Column } from '../ui/DataTable';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/Alert';

// Types
export enum DocumentStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum DocumentType {
  PDF = 'pdf',
  DOCX = 'docx',
  XLSX = 'xlsx',
  PPTX = 'pptx',
  HTML = 'html',
  OTHER = 'other'
}

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  size: number;
  uploadedAt: Date;
  status: DocumentStatus;
  progress?: number;
  error?: string;
  tags?: string[];
  category?: string;
  processingResults?: {
    extractedContent?: boolean;
    extractedStructure?: boolean;
    extractedRegulations?: boolean;
    confidence?: number;
  };
}

export interface DocumentCategory {
  id: string;
  name: string;
}

// Type guard for accepted file types
const isAcceptedFileType = (type: string): type is DocumentType => {
  return Object.values(DocumentType).includes(type as DocumentType);
};

// Convert file object to document object
const fileToDocument = (file: File): Omit<Document, 'id'> => {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  let type: DocumentType;
  
  switch (extension) {
    case 'pdf':
      type = DocumentType.PDF;
      break;
    case 'docx':
    case 'doc':
      type = DocumentType.DOCX;
      break;
    case 'xlsx':
    case 'xls':
      type = DocumentType.XLSX;
      break;
    case 'pptx':
    case 'ppt':
      type = DocumentType.PPTX;
      break;
    case 'html':
    case 'htm':
      type = DocumentType.HTML;
      break;
    default:
      type = DocumentType.OTHER;
  }
  
  return {
    name: file.name,
    type,
    size: file.size,
    uploadedAt: new Date(),
    status: DocumentStatus.PENDING,
    progress: 0
  };
};

// Format file size for display
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Component for uploading and managing documents
interface DocumentManagementProps {
  documents: Document[];
  categories?: DocumentCategory[];
  onUpload: (files: File[]) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
  onPreview: (documentId: string) => void;
  onProcess: (documentId: string) => Promise<void>;
  onCategorize: (documentId: string, categoryId: string) => Promise<void>;
  onTagsUpdate: (documentId: string, tags: string[]) => Promise<void>;
}

export const DocumentManagement: React.FC<DocumentManagementProps> = ({
  documents,
  categories = [],
  onUpload,
  onDelete,
  onPreview,
  onProcess,
  onCategorize,
  onTagsUpdate
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [tagsInput, setTagsInput] = useState('');

  // Set up dropzone
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      setIsBatchUploading(true);
      
      // Convert files to document objects
      const newDocuments = acceptedFiles.map(file => ({
        ...fileToDocument(file),
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }));
      
      // Add to uploading files
      setUploadingFiles(prev => [...prev, ...newDocuments]);
      
      // Call upload handler
      await onUpload(acceptedFiles);
      
      // Show success message
      setAlertMessage({
        type: 'success',
        message: `Successfully uploaded ${acceptedFiles.length} document${acceptedFiles.length > 1 ? 's' : ''}.`
      });
    } catch (error) {
      // Show error message
      setAlertMessage({
        type: 'error',
        message: `Error uploading documents: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsBatchUploading(false);
      setUploadingFiles([]);
    }
  }, [onUpload]);
  
  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/html': ['.html', '.htm']
    }
  });

  // Clear alert after 5 seconds
  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  // Handle document preview
  const handlePreview = (documentId: string) => {
    const document = documents.find(doc => doc.id === documentId);
    if (document) {
      setSelectedDocument(document);
      setIsPreviewModalOpen(true);
      onPreview(documentId);
    }
  };

  // Handle document deletion
  const handleDelete = async (documentId: string) => {
    try {
      await onDelete(documentId);
      
      setAlertMessage({
        type: 'success',
        message: 'Document deleted successfully.'
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Error deleting document: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Handle document category update
  const handleCategoryChange = async (documentId: string, categoryId: string) => {
    try {
      await onCategorize(documentId, categoryId);
      
      setAlertMessage({
        type: 'success',
        message: 'Document category updated successfully.'
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Error updating category: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Handle document tags update
  const handleTagsUpdate = async () => {
    if (!selectedDocument) return;
    
    try {
      const tags = tagsInput.split(',').map(tag => tag.trim()).filter(Boolean);
      await onTagsUpdate(selectedDocument.id, tags);
      
      setAlertMessage({
        type: 'success',
        message: 'Tags updated successfully.'
      });
      
      // Close the modal
      setIsPreviewModalOpen(false);
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Error updating tags: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Define table columns
  const columns: Column<Document>[] = [
    {
      key: 'name',
      header: 'Document Name',
      render: (doc) => (
        <div className="flex items-center">
          {/* Document type icon */}
          <span className="mr-2">
            {doc.type === DocumentType.PDF && (
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
            )}
            {doc.type === DocumentType.DOCX && (
              <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
            )}
            {doc.type === DocumentType.XLSX && (
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
            )}
            {doc.type === DocumentType.PPTX && (
              <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
            )}
            {(doc.type === DocumentType.HTML || doc.type === DocumentType.OTHER) && (
              <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
            )}
          </span>
          
          {/* Document name */}
          <span className="font-medium">{doc.name}</span>
        </div>
      ),
      sortable: true
    },
    {
      key: 'size',
      header: 'Size',
      render: (doc) => formatFileSize(doc.size),
      sortable: true
    },
    {
      key: 'uploadedAt',
      header: 'Uploaded',
      render: (doc) => new Date(doc.uploadedAt).toLocaleDateString(),
      sortable: true
    },
    {
      key: 'status',
      header: 'Status',
      render: (doc) => {
        let statusClass = '';
        let statusText = '';
        
        switch (doc.status) {
          case DocumentStatus.PENDING:
            statusClass = 'bg-gray-100 text-gray-800';
            statusText = 'Pending';
            break;
          case DocumentStatus.UPLOADING:
            statusClass = 'bg-blue-100 text-blue-800';
            statusText = `Uploading ${doc.progress ? Math.round(doc.progress) + '%' : ''}`;
            break;
          case DocumentStatus.PROCESSING:
            statusClass = 'bg-yellow-100 text-yellow-800';
            statusText = 'Processing';
            break;
          case DocumentStatus.COMPLETED:
            statusClass = 'bg-green-100 text-green-800';
            statusText = 'Completed';
            break;
          case DocumentStatus.FAILED:
            statusClass = 'bg-red-100 text-red-800';
            statusText = 'Failed';
            break;
        }
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
            {statusText}
          </span>
        );
      },
      sortable: true
    },
    {
      key: 'category',
      header: 'Category',
      render: (doc) => {
        const category = categories.find(cat => cat.id === doc.category);
        
        return (
          <select
            className="block w-full pl-3 pr-10 py-1 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={doc.category || ''}
            onChange={(e) => handleCategoryChange(doc.id, e.target.value)}
          >
            <option value="">Uncategorized</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (doc) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => { e.stopPropagation(); handlePreview(doc.id); }}
            className="text-blue-600 hover:text-blue-900"
            title="Preview"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
          </button>
          
          {doc.status === DocumentStatus.COMPLETED && (
            <button
              onClick={(e) => { e.stopPropagation(); onProcess(doc.id); }}
              className="text-green-600 hover:text-green-900"
              title="Process"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </button>
          )}
          
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
            className="text-red-600 hover:text-red-900"
            title="Delete"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="document-management">
      {/* Alert message */}
      {alertMessage && (
        <div className="mb-4">
          <Alert
            type={alertMessage.type}
            message={alertMessage.message}
            onClose={() => setAlertMessage(null)}
          />
        </div>
      )}
      
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 mb-6 text-center
          ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        `}
      >
        <input {...getInputProps()} />
        
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
        </svg>
        
        {isDragActive ? (
          <p className="mt-2 text-sm text-gray-600">Drop the files here ...</p>
        ) : (
          <div>
            <p className="mt-2 text-sm text-gray-600">
              Drag and drop files here, or
              <button
                type="button"
                className="ml-1 text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
                onClick={open}
              >
                browse
              </button>
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Supported formats: PDF, DOCX, XLSX, PPTX, HTML
            </p>
          </div>
        )}
        
        {isBatchUploading && (
          <div className="mt-4">
            <p className="text-sm text-gray-600">Uploading documents...</p>
            <div className="mt-2 h-1 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full animate-pulse"></div>
            </div>
          </div>
        )}
      </div>
      
      {/* Uploading files progress */}
      {uploadingFiles.length > 0 && (
        <Card className="mb-6">
          <h3 className="text-lg font-medium mb-4">Uploading Files</h3>
          
          {uploadingFiles.map(file => (
            <div key={file.id} className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-sm text-gray-500">{file.progress ? `${Math.round(file.progress)}%` : 'Starting...'}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${file.progress || 0}%` }}
                ></div>
              </div>
            </div>
          ))}
        </Card>
      )}
      
      {/* Documents table */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Documents</h2>
          <Button
            variant="primary"
            onClick={open}
            leftIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
            }
          >
            Upload Documents
          </Button>
        </div>
        
        <DataTable
          columns={columns}
          data={documents}
          keyExtractor={(doc) => doc.id}
          onRowClick={(doc) => handlePreview(doc.id)}
          emptyMessage="No documents uploaded yet. Use the upload button to add documents."
        />
      </Card>
      
      {/* Document preview modal */}
      {selectedDocument && (
        <Modal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          title="Document Details"
          size="lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Document Name</h3>
              <p className="mt-1">{selectedDocument.name}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Document Type</h3>
              <p className="mt-1">{selectedDocument.type.toUpperCase()}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Size</h3>
              <p className="mt-1">{formatFileSize(selectedDocument.size)}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Uploaded</h3>
              <p className="mt-1">{new Date(selectedDocument.uploadedAt).toLocaleString()}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <p className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedDocument.status === DocumentStatus.COMPLETED ? 'bg-green-100 text-green-800' :
                  selectedDocument.status === DocumentStatus.FAILED ? 'bg-red-100 text-red-800' :
                  selectedDocument.status === DocumentStatus.PROCESSING ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedDocument.status}
                </span>
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Category</h3>
              <p className="mt-1">
                {selectedDocument.category ? 
                  categories.find(cat => cat.id === selectedDocument.category)?.name || 'Unknown' :
                  'Uncategorized'
                }
              </p>
            </div>
          </div>
          
          {/* Processing results */}
          {selectedDocument.processingResults && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Processing Results</h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 h-4 w-4 rounded-full ${selectedDocument.processingResults.extractedContent ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="ml-2 text-sm">Content Extraction</span>
                </div>
                
                <div className="flex items-center">
                  <div className={`flex-shrink-0 h-4 w-4 rounded-full ${selectedDocument.processingResults.extractedStructure ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="ml-2 text-sm">Structure Recognition</span>
                </div>
                
                <div className="flex items-center">
                  <div className={`flex-shrink-0 h-4 w-4 rounded-full ${selectedDocument.processingResults.extractedRegulations ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="ml-2 text-sm">Regulations Extraction</span>
                </div>
                
                {selectedDocument.processingResults.confidence !== undefined && (
                  <div className="flex items-center">
                    <span className="text-sm font-medium">{Math.round(selectedDocument.processingResults.confidence * 100)}%</span>
                    <span className="ml-2 text-sm">Confidence Score</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Tags */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Tags</h3>
            
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedDocument.tags && selectedDocument.tags.length > 0 ? (
                selectedDocument.tags.map((tag, index) => (
                  <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-blue-100 text-blue-800">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500">No tags</span>
              )}
            </div>
            
            <div className="mt-2">
              <label htmlFor="tags-input" className="block text-sm font-medium text-gray-700 mb-1">
                Update Tags (comma separated)
              </label>
              <div className="flex">
                <input
                  type="text"
                  id="tags-input"
                  className="flex-grow rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g. training, regulation, procedures"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
                <Button
                  variant="primary"
                  size="small"
                  className="ml-2"
                  onClick={handleTagsUpdate}
                >
                  Update
                </Button>
              </div>
            </div>
          </div>
          
          {/* Document preview (placeholder) */}
          <div className="border rounded-lg p-4 flex items-center justify-center h-64 bg-gray-50">
            <p className="text-gray-500">Document preview would be displayed here</p>
          </div>
          
          <div className="mt-4 flex justify-end space-x-2">
            {selectedDocument.status === DocumentStatus.COMPLETED && (
              <Button
                variant="primary"
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  onProcess(selectedDocument.id);
                }}
              >
                Process Document
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setIsPreviewModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};