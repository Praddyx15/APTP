/**
 * Document Upload Page
 * Allows users to upload new documents with metadata
 */

import { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { documentService } from '../services/document-service';
import { DocumentCategory, DocumentStatus } from '../../../shared/document-types';

export default function DocumentUploadPage() {
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other' as DocumentCategory,
    status: 'draft' as DocumentStatus,
    tags: '',
    createKnowledgeGraph: false,
  });
  
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    
    if (!selectedFile) {
      setFile(null);
      setFileError('');
      return;
    }
    
    // Check file size (max 50MB)
    if (selectedFile.size > 50 * 1024 * 1024) {
      setFileError('File size must be less than 50MB');
      setFile(null);
      return;
    }
    
    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'text/plain',
      'text/markdown',
      'text/csv',
    ];
    
    if (!allowedTypes.includes(selectedFile.type)) {
      setFileError('Unsupported file type. Please upload PDF, Word, Excel, PowerPoint, or text documents.');
      setFile(null);
      return;
    }
    
    setFile(selectedFile);
    setFileError('');
    
    // Auto-fill title if empty
    if (!formData.title) {
      setFormData((prev) => ({
        ...prev,
        title: selectedFile.name.replace(/\.[^/.]+$/, '') // Remove file extension
      }));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setFileError('Please select a file to upload');
      return;
    }
    
    try {
      setIsUploading(true);
      
      // Prepare upload data
      const uploadData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        status: formData.status,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        processingOptions: {
          extractText: true,
          analyzeContent: true,
          createKnowledgeGraph: formData.createKnowledgeGraph,
          extractEntities: true,
          generateSummary: true,
          identifyRegulations: false,
          performCompliance: false,
          ocrEnabled: true
        }
      };
      
      // Simulate progress (in a real app, this would use upload progress events)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);
      
      // Upload document
      const result = await documentService.uploadDocument(uploadData, file);
      
      // Clear interval and set complete
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Redirect to document details page
      setTimeout(() => {
        setLocation(`/documents/${result.id}`);
      }, 500);
      
    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      console.error('Upload error:', error);
      alert('Failed to upload document. Please try again.');
    }
  };
  
  const handleCancel = () => {
    setLocation('/documents');
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Upload Document</h1>
        <button
          onClick={handleCancel}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
        >
          Cancel
        </button>
      </div>
      
      <div className="bg-card rounded-lg shadow-md p-6 border">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                fileError ? 'border-red-300 bg-red-50' : 'border-border hover:border-primary/50 hover:bg-primary/5'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                ref={fileInputRef}
                disabled={isUploading}
              />
              
              {file ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-primary">
                    Selected file: {file.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    disabled={isUploading}
                  >
                    Change file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-lg font-medium">
                    Drag and drop your file here
                  </div>
                  <div className="text-sm text-muted-foreground">
                    or click to browse
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Supported formats: PDF, Word, Excel, PowerPoint, Text (Max: 50MB)
                  </div>
                </div>
              )}
              
              {fileError && (
                <div className="mt-2 text-sm text-red-600">
                  {fileError}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Document Title *
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  disabled={isUploading}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="category" className="text-sm font-medium">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isUploading}
                >
                  <option value="regulation">Regulation</option>
                  <option value="syllabus">Syllabus</option>
                  <option value="training">Training</option>
                  <option value="manual">Manual</option>
                  <option value="aircraft">Aircraft</option>
                  <option value="procedure">Procedure</option>
                  <option value="form">Form</option>
                  <option value="report">Report</option>
                  <option value="certificate">Certificate</option>
                  <option value="guidance">Guidance</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
                disabled={isUploading}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="status" className="text-sm font-medium">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isUploading}
                >
                  <option value="draft">Draft</option>
                  <option value="review">Review</option>
                  <option value="approved">Approved</option>
                  <option value="published">Published</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="tags" className="text-sm font-medium">
                  Tags (comma separated)
                </label>
                <input
                  id="tags"
                  name="tags"
                  type="text"
                  value={formData.tags}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. safety, procedures, training"
                  disabled={isUploading}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                id="createKnowledgeGraph"
                name="createKnowledgeGraph"
                type="checkbox"
                checked={formData.createKnowledgeGraph}
                onChange={handleCheckboxChange}
                className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                disabled={isUploading}
              />
              <label
                htmlFor="createKnowledgeGraph"
                className="text-sm font-medium text-gray-700"
              >
                Create knowledge graph from document
              </label>
            </div>
          </div>
          
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-primary h-2.5 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              disabled={isUploading || !file}
            >
              {isUploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
