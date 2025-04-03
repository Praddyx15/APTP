import { Logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import { documentUtils } from '../utils/document-utils';

/**
 * Service for managing documents
 */
export class DocumentService {
  private logger: Logger;
  private documentsDir: string;
  private documents: Map<string, any>;
  
  constructor() {
    this.logger = new Logger('DocumentService');
    this.documentsDir = path.join(process.cwd(), 'uploads');
    this.documents = new Map<string, any>();
    
    // Ensure uploads directory exists
    this.ensureUploadsDirectory().catch(err => {
      this.logger.error(`Failed to create uploads directory: ${err instanceof Error ? err.message : String(err)}`);
    });
  }
  
  /**
   * Ensure the uploads directory exists
   */
  private async ensureUploadsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.documentsDir, { recursive: true });
      this.logger.info(`Uploads directory created at ${this.documentsDir}`);
    } catch (error) {
      this.logger.error(`Error creating uploads directory: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Save uploaded file to disk
   * @param file - Multer file object
   * @param documentId - Document ID
   * @returns File path
   */
  public async saveUploadedFile(file: Express.Multer.File, documentId: number): Promise<string> {
    try {
      // Ensure uploads directory exists
      await this.ensureUploadsDirectory();
      
      const subDir = path.join(this.documentsDir, documentId.toString());
      await fs.mkdir(subDir, { recursive: true });
      
      const filePath = path.join(subDir, file.originalname);
      
      // Write buffer to file
      await fs.writeFile(filePath, file.buffer);
      
      return filePath;
    } catch (error) {
      this.logger.error(`Failed to save uploaded file: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Create a document record
   * @param data - Document data
   * @returns Created document
   */
  public async createDocument(data: {
    title: string;
    description?: string;
    fileType: string;
    fileName: string;
    fileSize: number;
    uploadedById: number;
    uploadedByRole: string;
    filePath?: string;
    url?: string;
    createKnowledgeGraph?: boolean;
    processingStatus?: string;
    isProcessed?: boolean;
  }): Promise<any> {
    try {
      // In a real implementation, this would save to the database
      const document = {
        id: Date.now(), // Using timestamp as ID for now
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Store in memory map
      this.documents.set(document.id.toString(), document);
      
      return document;
    } catch (error) {
      this.logger.error(`Failed to create document: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Update document
   * @param documentId - Document ID
   * @param data - Updated fields
   * @returns Updated document
   */
  public async updateDocument(documentId: number | string, data: Partial<any>): Promise<any> {
    try {
      const docId = documentId.toString();
      const document = this.documents.get(docId);
      
      if (!document) {
        throw new Error(`Document with ID ${docId} not found`);
      }
      
      // Update document fields
      const updatedDocument = {
        ...document,
        ...data,
        updatedAt: new Date()
      };
      
      // Store updated document
      this.documents.set(docId, updatedDocument);
      
      return updatedDocument;
    } catch (error) {
      this.logger.error(`Failed to update document: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Get document by ID
   * @param documentId - Document ID
   * @param userId - User ID for authorization
   * @returns Document if found and user is authorized
   */
  public async getDocumentById(documentId: string, userId: number): Promise<any> {
    try {
      const document = this.documents.get(documentId);
      
      if (!document) {
        return undefined;
      }
      
      // Check authorization (very basic)
      if (document.uploadedById !== userId) {
        return undefined;
      }
      
      return document;
    } catch (error) {
      this.logger.error(`Failed to get document: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  /**
   * Get documents with pagination
   * @param userId - User ID
   * @param page - Page number
   * @param pageSize - Page size
   * @returns Paginated documents
   */
  public async getDocuments(userId: number, page: number = 1, pageSize: number = 10): Promise<{ documents: any[]; total: number; page: number; pageSize: number; totalPages: number }> {
    try {
      const userDocuments: any[] = [];
      
      // Filter documents by user ID
      for (const document of this.documents.values()) {
        if (document.uploadedById === userId) {
          userDocuments.push(document);
        }
      }
      
      // Sort by created date (newest first)
      userDocuments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const total = userDocuments.length;
      const totalPages = Math.ceil(total / pageSize);
      const start = (page - 1) * pageSize;
      const end = Math.min(start + pageSize, total);
      const documents = userDocuments.slice(start, end);
      
      return {
        documents,
        total,
        page,
        pageSize,
        totalPages
      };
    } catch (error) {
      this.logger.error(`Failed to get documents: ${error instanceof Error ? error.message : String(error)}`);
      return {
        documents: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0
      };
    }
  }
  
  /**
   * Get document content
   * @param documentId - Document ID
   * @returns Document content
   */
  public async getDocumentContent(documentId: string): Promise<any> {
    try {
      const document = this.documents.get(documentId);
      
      if (!document) {
        throw new Error(`Document with ID ${documentId} not found`);
      }
      
      // For demo purposes, generate content based on file type
      // In a real application, this would be retrieved from a database
      // or extracted from the file on demand
      const content = document.title + "\n\nSample content for " + document.fileType + " document.";
      
      return {
        content,
        structure: {
          fileType: document.fileType,
          pageCount: 1,
          metadata: {
            title: document.title,
            author: "Unknown",
            creationDate: document.createdAt
          }
        }
      };
    } catch (error) {
      this.logger.error(`Failed to get document content: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Delete document
   * @param documentId - Document ID
   * @param userId - User ID for authorization
   * @returns Whether deletion was successful
   */
  public async deleteDocument(documentId: string, userId: number): Promise<boolean> {
    try {
      const document = await this.getDocumentById(documentId, userId);
      
      if (!document) {
        return false;
      }
      
      // Remove the file if it exists
      if (document.filePath && existsSync(document.filePath)) {
        await fs.unlink(document.filePath);
      }
      
      // Remove from the map
      this.documents.delete(documentId);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete document: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}

// Export singleton instance
export const documentService = new DocumentService();
