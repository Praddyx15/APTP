import { apiRequest } from './queryClient';

// Default export for the document processor module
export default {
  processDocument,
  getProcessingStatus,
  getDocumentMetadata,
  getExtractedText,
  getOCRResults,
  getKnowledgeGraph,
  getDocumentSummary,
  uploadDocument,
  compareDocuments,
  combineKnowledgeGraphs
};

// Bloom's Taxonomy levels
export enum BloomLevel {
  REMEMBER = 'remember',
  UNDERSTAND = 'understand',
  APPLY = 'apply',
  ANALYZE = 'analyze',
  EVALUATE = 'evaluate',
  CREATE = 'create'
}

// Document types that can be processed
export type DocumentType = 
  | 'syllabus' 
  | 'manual' 
  | 'checklist' 
  | 'training_record' 
  | 'regulation' 
  | 'assessment' 
  | 'other';

// Processing modes
export type ProcessingMode = 
  | 'ocr' 
  | 'text_extraction' 
  | 'knowledge_graph' 
  | 'summarization' 
  | 'full';

// Processing result interfaces
export interface DocumentMetadata {
  documentId: string;
  title: string;
  documentType: DocumentType;
  pageCount: number;
  createdAt: string;
  lastModified: string;
  fileSize: number;
  mimeType: string;
  author?: string;
  organization?: string;
  tags?: string[];
}

export interface OCRResult {
  pageNumber: number;
  text: string;
  confidence: number;
  boundingBoxes?: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    confidence: number;
  }[];
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: 'concept' | 'procedure' | 'rule' | 'skill' | 'reference';
  importance: number;
  pageReferences: number[];
  description?: string;
}

export interface KnowledgeGraphLink {
  source: string;
  target: string;
  type: 'includes' | 'requires' | 'relates_to' | 'contradicts' | 'exemplifies';
  strength: number;
  description?: string;
}

export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  links: KnowledgeGraphLink[];
}

// Syllabus-related interfaces
export interface SyllabusSection {
  id: string;
  title: string;
  level: number;
  content: string;
  subsections: SyllabusSection[];
  pageNumber?: number;
  pageRange?: { start: number; end: number };
}

export interface LearningObjective {
  id: string;
  text: string;
  section: string;
  sectionId: string;
  type: 'knowledge' | 'skill' | 'attitude' | 'unknown';
  blooms?: BloomLevel;
  regulations?: string[];
  keywords: string[];
}

export interface SyllabusStructure {
  title: string;
  author?: string;
  date?: string;
  version?: string;
  sections: SyllabusSection[];
  metadata: Record<string, any>;
  toc?: TableOfContents[];
  modules?: {
    id: string;
    title: string;
    description: string;
    duration: number;
    priority: number;
    learningObjectives: LearningObjective[];
  }[];
}

export interface TableOfContents {
  title: string;
  level: number;
  pageNumber: number;
}

export interface DocumentSummary {
  overallSummary: string;
  keyPoints: string[];
  chapterSummaries?: {
    title: string;
    summary: string;
  }[];
}

export interface ProcessingProgress {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep?: string;
  estimatedTimeRemaining?: number;
  message?: string;
}

export interface ProcessingResult {
  documentId: string;
  metadata: DocumentMetadata;
  ocrResults?: OCRResult[];
  extractedText?: string;
  knowledgeGraph?: KnowledgeGraph;
  summary?: DocumentSummary;
  processingTime?: number;
}

// Processing options
export interface ProcessingOptions {
  documentType?: DocumentType;
  mode: ProcessingMode;
  language?: string;
  extractTables?: boolean;
  extractImages?: boolean;
  ocrOptions?: {
    enhanceResolution?: boolean;
    detectOrientation?: boolean;
    languages?: string[];
  };
  knowledgeGraphOptions?: {
    focusAreas?: string[];
    detailLevel?: 'high' | 'medium' | 'low';
    includeReferences?: boolean;
  };
}

// Main document processing function
export async function processDocument(
  documentId: string,
  options: ProcessingOptions
): Promise<ProcessingResult> {
  try {
    const response = await apiRequest('POST', `/api/documents/${documentId}/process`, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Document processing failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error processing document:', error);
    throw error;
  }
}

// Monitor document processing progress
export async function getProcessingStatus(
  documentId: string,
  jobId: string
): Promise<ProcessingProgress> {
  try {
    const response = await apiRequest('GET', `/api/documents/${documentId}/process/${jobId}/status`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to get processing status');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting processing status:', error);
    throw error;
  }
}

// Get document metadata
export async function getDocumentMetadata(documentId: string): Promise<DocumentMetadata> {
  try {
    const response = await apiRequest('GET', `/api/documents/${documentId}/metadata`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to get document metadata');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting document metadata:', error);
    throw error;
  }
}

// Get extracted text from a document
export async function getExtractedText(documentId: string): Promise<string> {
  try {
    const response = await apiRequest('GET', `/api/documents/${documentId}/text`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to get extracted text');
    }
    
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error getting extracted text:', error);
    throw error;
  }
}

// Get OCR results for a document
export async function getOCRResults(documentId: string): Promise<OCRResult[]> {
  try {
    const response = await apiRequest('GET', `/api/documents/${documentId}/ocr`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to get OCR results');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting OCR results:', error);
    throw error;
  }
}

// Get knowledge graph for a document
export async function getKnowledgeGraph(documentId: string): Promise<KnowledgeGraph> {
  try {
    const response = await apiRequest('GET', `/api/documents/${documentId}/knowledge-graph`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to get knowledge graph');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting knowledge graph:', error);
    throw error;
  }
}

// Get document summary
export async function getDocumentSummary(documentId: string): Promise<DocumentSummary> {
  try {
    const response = await apiRequest('GET', `/api/documents/${documentId}/summary`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to get document summary');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting document summary:', error);
    throw error;
  }
}

// Upload a document for processing
export async function uploadDocument(
  file: File,
  metadata?: Partial<DocumentMetadata>
): Promise<{ documentId: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }
    
    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Document upload failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
}

// Compare two documents and highlight differences
export async function compareDocuments(
  documentId1: string,
  documentId2: string
): Promise<{
  differences: {
    type: 'addition' | 'deletion' | 'modification';
    section: string;
    page1?: number;
    page2?: number;
    contentBefore?: string;
    contentAfter?: string;
  }[];
  similarityScore: number;
}> {
  try {
    const response = await apiRequest('POST', '/api/documents/compare', {
      documentId1,
      documentId2
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Document comparison failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error comparing documents:', error);
    throw error;
  }
}

// Create a combined knowledge graph from multiple documents
export async function combineKnowledgeGraphs(
  documentIds: string[]
): Promise<KnowledgeGraph> {
  try {
    const response = await apiRequest('POST', '/api/documents/combine-knowledge-graphs', {
      documentIds
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to combine knowledge graphs');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error combining knowledge graphs:', error);
    throw error;
  }
}