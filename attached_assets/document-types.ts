/**
 * Types for document management and processing
 */

export enum DocumentProcessingStatus {
  pending = 'pending',
  processing = 'processing',
  complete = 'completed',
  error = 'failed'
}

export type DocumentCategory = 
  | 'regulation' 
  | 'syllabus' 
  | 'training' 
  | 'manual' 
  | 'aircraft' 
  | 'procedure'
  | 'form'
  | 'report'
  | 'certificate'
  | 'guidance'
  | 'other';

export type DocumentStatus = 
  | 'draft'
  | 'review'
  | 'approved'
  | 'published'
  | 'archived'
  | 'deprecated';

export interface DocumentMetadata {
  author?: string;
  organization?: string;
  creationDate?: string;
  modificationDate?: string;
  version?: string;
  regulatoryBody?: string;
  applicability?: string;
  reviewDate?: string;
  keywords?: string[];
  language?: string;
  pageCount?: number;
  documentNumber?: string;
  revision?: string;
  classification?: string;
  securityLevel?: string;
  [key: string]: any; // Allow for additional metadata fields
}

export interface DocumentTag {
  id: number;
  name: string;
  category?: string;
  color?: string;
}

export interface DocumentPermission {
  role: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  canApprove: boolean;
}

export interface DocumentProcessingOptions {
  extractText: boolean;
  analyzeContent: boolean;
  createKnowledgeGraph: boolean;
  extractEntities: boolean;
  generateSummary: boolean;
  identifyRegulations: boolean;
  performCompliance: boolean;
  ocrEnabled: boolean;
}

export interface DocumentAnalysisResult {
  summary?: string;
  keyTopics?: string[];
  entities?: {
    regulations?: string[];
    aircraft?: string[];
    procedures?: string[];
    locations?: string[];
    organizations?: string[];
    people?: string[];
    dates?: string[];
    [key: string]: string[] | undefined;
  };
  sentiment?: {
    score: number;
    label: 'positive' | 'neutral' | 'negative';
  };
  readabilityScore?: number;
  wordCount?: number;
  extractedText?: string;
  compliance?: {
    regulationIds: string[];
    compliant: boolean;
    issues?: string[];
  };
  [key: string]: any; // Allow for additional analysis results
}

export interface DocumentVersion {
  id: number;
  documentId: number;
  version: string;
  createdAt: string;
  createdBy: number;
  filePath: string;
  notes?: string;
  changes?: string[];
}

export interface Document {
  id: number;
  title: string;
  description?: string;
  filePath?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy: number;
  uploadedAt: string;
  category?: DocumentCategory;
  status: DocumentStatus;
  tags?: DocumentTag[];
  metadata?: DocumentMetadata;
  permissions?: DocumentPermission[];
  processingOptions?: DocumentProcessingOptions;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
  analysisComplete?: boolean;
  analysisDate?: string;
  analysisResult?: DocumentAnalysisResult;
  extractedMetadata?: any;
  versions?: DocumentVersion[];
  currentVersionId?: number;
  createKnowledgeGraph?: boolean;
  knowledgeGraphGenerated?: boolean;
  knowledgeGraphId?: string;
  organizationId?: number;
  sharingStatus?: 'private' | 'organization' | 'public';
  isTemplate?: boolean;
  parentDocumentId?: number;
  relatedDocumentIds?: number[];
  bookmarks?: { userId: number; createdAt: string }[];
  lastAccessedAt?: string;
  lastAccessedBy?: number;
  expiryDate?: string;
  archived?: boolean;
  archivedAt?: string;
  archivedBy?: number;
}

export interface DocumentSearchOptions {
  query?: string;
  categories?: DocumentCategory[];
  statuses?: DocumentStatus[];
  tagIds?: number[];
  uploadedBy?: number;
  uploadedDateStart?: string;
  uploadedDateEnd?: string;
  metadataFilters?: { key: string; value: string }[];
  sortBy?: 'title' | 'uploadedAt' | 'category' | 'status' | 'fileSize';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface DocumentSearchResult {
  documents: Document[];
  total: number;
  limit: number;
  offset: number;
}

export interface DocumentUploadRequest {
  title: string;
  description?: string;
  category?: DocumentCategory;
  tags?: string[];
  metadata?: DocumentMetadata;
  processingOptions?: DocumentProcessingOptions;
  sharingStatus?: 'private' | 'organization' | 'public';
  status?: DocumentStatus;
}

export interface DocumentUpdateRequest {
  title?: string;
  description?: string;
  category?: DocumentCategory;
  tags?: string[] | DocumentTag[];
  metadata?: DocumentMetadata;
  processingOptions?: DocumentProcessingOptions;
  status?: DocumentStatus;
  sharingStatus?: 'private' | 'organization' | 'public';
}

export interface DocumentVersionUpdateRequest {
  version: string;
  notes?: string;
  changes?: string[];
}
