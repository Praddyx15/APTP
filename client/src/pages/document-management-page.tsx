/**
 * Document Management Page
 * Displays a list of documents with options to view, edit, and delete
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { documentService } from '../services/document-service';
import { Document, DocumentCategory } from '../../../shared/document-types';

export default function DocumentManagementPage() {
  const [, setLocation] = useLocation();
  const [sortBy, setSortBy] = useState<string>('uploadedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterByType, setFilterByType] = useState<string>('');
  
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['/api/documents', { sortBy, sortOrder, filterByType }],
    queryFn: () => documentService.getDocuments({
      sortBy,
      sortOrder,
      filterByType: filterByType || undefined,
    }),
  });
  
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterByType(e.target.value);
  };
  
  const handleUploadClick = () => {
    setLocation('/documents/upload');
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'review':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'published':
        return 'bg-purple-100 text-purple-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      case 'deprecated':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Document Management</h1>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Document Management</h1>
        </div>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> Failed to load documents.</span>
        </div>
      </div>
    );
  }
  
  const documents = data?.documents || [];
  const pagination = data?.pagination || { total: 0, limit: 10, offset: 0, hasMore: false };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Document Management</h1>
        <button
          onClick={handleUploadClick}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Upload Document
        </button>
      </div>
      
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span>Filter by type:</span>
          <select
            value={filterByType}
            onChange={handleFilterChange}
            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All types</option>
            <option value="pdf">PDF</option>
            <option value="docx">Word Document</option>
            <option value="xlsx">Excel Spreadsheet</option>
            <option value="pptx">PowerPoint Presentation</option>
            <option value="txt">Text Document</option>
          </select>
        </div>
        
        <div>
          <span className="text-sm text-muted-foreground">
            Showing {documents.length} of {pagination.total} documents
          </span>
        </div>
      </div>
      
      {documents.length === 0 ? (
        <div className="bg-card rounded-lg shadow-md p-8 text-center border">
          <h3 className="text-xl font-medium mb-2">No Documents Found</h3>
          <p className="text-muted-foreground mb-6">
            There are no documents matching your criteria. Upload your first document to get started.
          </p>
          <button
            onClick={handleUploadClick}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Upload Document
          </button>
        </div>
      ) : (
        <div className="bg-card rounded-lg shadow-md overflow-hidden border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th
                    className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center">
                      Title
                      {sortBy === 'title' && (
                        <span className="ml-1">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Category
                  </th>
                  <th
                    className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer"
                    onClick={() => handleSort('uploadedAt')}
                  >
                    <div className="flex items-center">
                      Uploaded
                      {sortBy === 'uploadedAt' && (
                        <span className="ml-1">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Type
                  </th>
                  <th
                    className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer"
                    onClick={() => handleSort('fileSize')}
                  >
                    <div className="flex items-center">
                      Size
                      {sortBy === 'fileSize' && (
                        <span className="ml-1">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.map((document: Document) => (
                  <tr key={document.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link href={`/documents/${document.id}`}>
                        <a className="font-medium text-primary hover:underline">
                          {document.title}
                        </a>
                      </Link>
                      {document.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                          {document.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {document.category || 'Uncategorized'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(document.uploadedAt)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground uppercase text-xs">
                      {document.fileType}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatFileSize(document.fileSize)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(document.status)}`}>
                        {document.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-2">
                        <Link href={`/documents/${document.id}`}>
                          <a className="p-1 text-primary hover:text-primary/80">
                            View
                          </a>
                        </Link>
                        <Link href={`/documents/${document.id}/edit`}>
                          <a className="p-1 text-amber-600 hover:text-amber-500">
                            Edit
                          </a>
                        </Link>
                        <button
                          className="p-1 text-red-600 hover:text-red-500"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this document?')) {
                              documentService.deleteDocument(document.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
