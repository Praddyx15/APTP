/**
 * Document service for API interactions
 */

import { apiRequest, queryClient } from '../lib/query-client';
import { Document, DocumentUploadRequest, DocumentUpdateRequest } from '../../../shared/document-types';

export const documentService = {
  /**
   * Get all documents with optional filtering
   */
  async getDocuments(params: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    filterByType?: string;
  } = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params.filterByType) queryParams.append('filterByType', params.filterByType);
    
    const queryString = queryParams.toString();
    const url = `/api/documents${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiRequest('GET', url);
    return await response.json();
  },
  
  /**
   * Get a document by ID
   */
  async getDocument(id: number) {
    const response = await apiRequest('GET', `/api/documents/${id}`);
    return await response.json() as Document;
  },
  
  /**
   * Upload a new document
   */
  async uploadDocument(data: DocumentUploadRequest, file: File) {
    const formData = new FormData();
    
    // Add file
    formData.append('file', file);
    
    // Add metadata as JSON string fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    });
    
    const response = await fetch('/api/documents', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload document');
    }
    
    // Invalidate documents cache
    queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
    
    return await response.json() as Document;
  },
  
  /**
   * Update a document
   */
  async updateDocument(id: number, data: DocumentUpdateRequest) {
    const response = await apiRequest('PUT', `/api/documents/${id}`, data);
    
    // Invalidate document and documents cache
    queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
    queryClient.invalidateQueries({ queryKey: ['/api/documents', id] });
    
    return await response.json() as Document;
  },
  
  /**
   * Delete a document
   */
  async deleteDocument(id: number) {
    await apiRequest('DELETE', `/api/documents/${id}`);
    
    // Invalidate documents cache
    queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
  },
  
  /**
   * Process a document
   */
  async processDocument(id: number) {
    const response = await apiRequest('POST', `/api/documents/${id}/process`);
    
    // Invalidate document cache
    queryClient.invalidateQueries({ queryKey: ['/api/documents', id] });
    
    return await response.json();
  },
  
  /**
   * Get document content
   */
  async getDocumentContent(id: number) {
    const response = await apiRequest('GET', `/api/documents/${id}/content`);
    return await response.json();
  },
  
  /**
   * Generate knowledge graph for document
   */
  async generateKnowledgeGraph(id: number) {
    const response = await apiRequest('POST', `/api/documents/${id}/knowledge-graph`);
    
    // Invalidate document cache
    queryClient.invalidateQueries({ queryKey: ['/api/documents', id] });
    
    return await response.json();
  },
  
  /**
   * Get document knowledge graph
   */
  async getDocumentKnowledgeGraph(id: number) {
    const response = await apiRequest('GET', `/api/documents/${id}/knowledge-graph`);
    return await response.json();
  }
};
