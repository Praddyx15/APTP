import { apiRequest } from "@/lib/queryClient";

interface Document {
  id: string;
  title: string;
  documentType: string;
  uploadDate: string;
  status: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  processingStatus: string;
  extractedText?: string;
  keywordGraph?: any;
  analyzeComplete: boolean;
}

export interface DocumentUploadResponse {
  id: string;
  title: string;
  fileName: string;
  success: boolean;
  message?: string;
}

export interface DocumentAnalysisRequest {
  documentId: string;
  options?: {
    extractText?: boolean;
    generateKeywords?: boolean;
    buildKnowledgeGraph?: boolean;
    extractEntities?: boolean;
  };
}

export interface DocumentAnalysisResponse {
  id: string;
  title: string;
  processingStatus: string;
  processingMessage?: string;
  extractedText?: string;
  keywords?: string[];
  entities?: {
    name: string;
    type: string;
    count: number;
  }[];
}

/**
 * Fetches all documents from the server
 */
export const fetchDocuments = async (): Promise<Document[]> => {
  const response = await apiRequest("GET", "/api/documents");
  if (!response.ok) {
    throw new Error("Failed to fetch documents");
  }
  return response.json();
};

/**
 * Fetches a single document by ID
 */
export const fetchDocumentById = async (id: string): Promise<Document> => {
  const response = await apiRequest("GET", `/api/documents/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch document");
  }
  return response.json();
};

/**
 * Uploads a document to the server
 */
export const uploadDocument = async (
  file: File,
  metadata: {
    title: string;
    documentType: string;
  }
): Promise<DocumentUploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", metadata.title);
  formData.append("documentType", metadata.documentType);

  const response = await fetch("/api/documents/upload", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload document: ${errorText}`);
  }

  return response.json();
};

/**
 * Requests analysis of a document
 */
export const analyzeDocument = async (
  request: DocumentAnalysisRequest
): Promise<DocumentAnalysisResponse> => {
  const response = await apiRequest("POST", `/api/documents/${request.documentId}/analyze`, request.options);
  if (!response.ok) {
    throw new Error("Failed to analyze document");
  }
  return response.json();
};

/**
 * Deletes a document by ID
 */
export const deleteDocument = async (id: string): Promise<void> => {
  const response = await apiRequest("DELETE", `/api/documents/${id}`);
  if (!response.ok) {
    throw new Error("Failed to delete document");
  }
};

/**
 * Updates document metadata
 */
export const updateDocumentMetadata = async (
  id: string,
  metadata: Partial<Pick<Document, "title" | "documentType">>
): Promise<Document> => {
  const response = await apiRequest("PATCH", `/api/documents/${id}`, metadata);
  if (!response.ok) {
    throw new Error("Failed to update document metadata");
  }
  return response.json();
};

/**
 * Exports document analysis results
 */
export const exportDocumentAnalysis = async (id: string, format: "json" | "pdf" | "csv"): Promise<Blob> => {
  const response = await apiRequest("GET", `/api/documents/${id}/export?format=${format}`);
  if (!response.ok) {
    throw new Error(`Failed to export document analysis in ${format} format`);
  }
  return response.blob();
};
