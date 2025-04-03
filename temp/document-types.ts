/**
 * Types related to documents in the system
 */

/**
 * Document processing status
 */
export type DocumentProcessingStatus = 'pending' | 'processing' | 'complete' | 'error';

/**
 * Document type
 */
export type DocumentType = 'pdf' | 'docx' | 'doc' | 'xlsx' | 'xls' | 'pptx' | 'ppt' | 'txt' | 'html' | 'md' | 'jpg' | 'jpeg' | 'png' | 'tiff' | 'tif';

/**
 * Document entity as stored in the database
 */
export interface Document {
  id: number;
  title: string;
  description?: string;
  fileType: DocumentType;
  fileName: string;
  filePath: string;
  url?: string;
  fileSize: number;
  uploadedById: number;
  uploadedByRole: string;
  sharedWith?: any[];
  isProcessed: boolean;
  metadata?: Record<string, any>;
  tags?: string[];
  currentVersionId?: number;
  createKnowledgeGraph: boolean;
  processingStatus: DocumentProcessingStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Document content entity with extracted data
 */
export interface DocumentContent {
  id: number;
  documentId: number;
  textContent?: string;
  structuredContent?: Record<string, any>;
  sections?: any[];
  extractedKeywords?: string[];
  confidenceScore?: number;
  extractionTime?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Insert types using zod schemas
 */
export type InsertDocument = {
  title: string;
  description?: string;
  fileType: DocumentType;
  fileName: string;
  filePath: string;
  url?: string;
  fileSize: number;
  uploadedById: number;
  uploadedByRole: string;
  sharedWith: any[];
  isProcessed: boolean;
  metadata: Record<string, any>;
  tags?: string[];
  createKnowledgeGraph: boolean;
  processingStatus: DocumentProcessingStatus;
};

export type InsertDocumentContent = {
  documentId: number;
  textContent?: string;
  structuredContent?: Record<string, any>;
  sections?: any[];
  extractedKeywords?: string[];
  confidenceScore?: number;
  extractionTime?: number;
};

/**
 * Document upload request
 */
export interface DocumentUploadRequest {
  title: string;
  description?: string;
  createKnowledgeGraph: boolean;
}

/**
 * Document upload response
 */
export interface DocumentUploadResponse {
  success: boolean;
  document?: Document;
  message?: string;
}

/**
 * Document retrieval response
 */
export interface DocumentResponse {
  success: boolean;
  document?: Document;
  message?: string;
}

/**
 * List documents response
 */
export interface DocumentListResponse {
  success: boolean;
  documents: Document[];
  total: number;
  page: number;
  pageSize: number;
  message?: string;
}
