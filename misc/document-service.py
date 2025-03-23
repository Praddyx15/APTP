// services/documentService.ts
import apiClient, { ApiResponse } from './api';

// Document types
export type DocumentType = 'PDF' | 'DOCX' | 'XLSX' | 'HTML' | 'PPTX';

// Document status
export type ProcessingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

// Document metadata
export interface DocumentMetadata {
  id: string;
  title: string;
  description?: string;
  type: DocumentType;
  size: number;
  createdAt: string;
  updatedAt: string;
  status: ProcessingStatus;
  progress?: number;
  tags?: string[];
  ownerId: string;
  version: number;
  complianceStatus?: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING';
}

// Extracted content from document
export interface DocumentContent {
  text: string;
  entities: {
    type: string;
    value: string;
    confidence: number;
    position: { start: number; end: number };
  }[];
  sections: {
    title: string;
    content: string;
    level: number;
  }[];
  tables: {
    id: string;
    caption?: string;
    data: string[][];
  }[];
  regulatoryReferences?: {
    standard: string;
    section: string;
    text: string;
  }[];
}

// Upload options
export interface UploadOptions {
  tags?: string[];
  description?: string;
  shouldProcess?: boolean;
  onProgress?: (percentage: number) => void;
}

// Document service class
class DocumentService {
  private readonly baseUrl = '/document';

  // Get all documents
  async getAllDocuments(): Promise<DocumentMetadata[]> {
    const response = await apiClient.get<DocumentMetadata[]>(`${this.baseUrl}`);
    return response.data;
  }

  // Get document by ID
  async getDocumentById(id: string): Promise<DocumentMetadata> {
    const response = await apiClient.get<DocumentMetadata>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  // Get document content by ID
  async getDocumentContent(id: string): Promise<DocumentContent> {
    const response = await apiClient.get<DocumentContent>(`${this.baseUrl}/${id}/content`);
    return response.data;
  }

  // Upload a single document
  async uploadDocument(
    file: File,
    options: UploadOptions = {}
  ): Promise<DocumentMetadata> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options.tags) {
      options.tags.forEach(tag => {
        formData.append('tags[]', tag);
      });
    }
    
    if (options.description) {
      formData.append('description', options.description);
    }
    
    formData.append('shouldProcess', options.shouldProcess !== false ? 'true' : 'false');
    
    const response = await apiClient.request<DocumentMetadata>({
      method: 'POST',
      url: `${this.baseUrl}/upload`,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (options.onProgress && progressEvent.total) {
          const percentage = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          options.onProgress(percentage);
        }
      },
    });
    
    return response.data;
  }

  // Upload multiple documents
  async uploadDocuments(
    files: File[],
    options: UploadOptions = {}
  ): Promise<DocumentMetadata[]> {
    const formData = new FormData();
    
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });
    
    if (options.tags) {
      options.tags.forEach(tag => {
        formData.append('tags[]', tag);
      });
    }
    
    if (options.description) {
      formData.append('description', options.description);
    }
    
    formData.append('shouldProcess', options.shouldProcess !== false ? 'true' : 'false');
    
    const response = await apiClient.request<DocumentMetadata[]>({
      method: 'POST',
      url: `${this.baseUrl}/batch-upload`,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (options.onProgress && progressEvent.total) {
          const percentage = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          options.onProgress(percentage);
        }
      },
    });
    
    return response.data;
  }

  // Get document processing status
  async getProcessingStatus(id: string): Promise<{ status: ProcessingStatus; progress?: number }> {
    const response = await apiClient.get<{ status: ProcessingStatus; progress?: number }>(
      `${this.baseUrl}/${id}/status`
    );
    return response.data;
  }

  // Delete document
  async deleteDocument(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  // Update document metadata
  async updateDocument(
    id: string,
    updates: {
      title?: string;
      description?: string;
      tags?: string[];
    }
  ): Promise<DocumentMetadata> {
    const response = await apiClient.patch<DocumentMetadata>(
      `${this.baseUrl}/${id}`,
      updates
    );
    return response.data;
  }

  // Get document version history
  async getVersionHistory(id: string): Promise<DocumentMetadata[]> {
    const response = await apiClient.get<DocumentMetadata[]>(
      `${this.baseUrl}/${id}/versions`
    );
    return response.data;
  }

  // Get document preview URL
  getPreviewUrl(id: string): string {
    return `${process.env.NEXT_PUBLIC_API_URL}${this.baseUrl}/${id}/preview`;
  }

  // Download original document
  async downloadDocument(id: string): Promise<Blob> {
    const response = await apiClient.request<Blob>({
      method: 'GET',
      url: `${this.baseUrl}/${id}/download`,
      responseType: 'blob',
    });
    return response.data;
  }

  // Extract regulatory compliance information
  async extractComplianceInfo(id: string): Promise<{
    standard: string;
    section: string;
    compliant: boolean;
    details: string;
  }[]> {
    const response = await apiClient.get<{
      standard: string;
      section: string;
      compliant: boolean;
      details: string;
    }[]>(`${this.baseUrl}/${id}/compliance`);
    return response.data;
  }
}

export const documentService = new DocumentService();
export default documentService;
