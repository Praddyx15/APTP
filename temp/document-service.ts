import { Logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import { documentUtils } from '../utils/document-utils';
import { db } from '../db';
import { 
  documents, 
  documentContent, 
  knowledgeGraphNodes, 
  knowledgeGraphEdges 
} from '@shared/schema';
import { Document, DocumentContent, InsertDocument } from '@shared/document-types';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Service for managing documents
 */
export class DocumentService {
  private logger: Logger;
  private documentsDir: string;
  
  constructor() {
    this.logger = new Logger('DocumentService');
    this.documentsDir = path.join(process.cwd(), 'uploads');
    
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
    tags?: string[];
  }): Promise<Document> {
    try {
      // Create the document record in the database
      const insertData: InsertDocument = {
        title: data.title,
        description: data.description,
        fileType: data.fileType as any, // Cast to match DocumentType
        fileName: data.fileName,
        fileSize: data.fileSize,
        uploadedById: data.uploadedById,
        uploadedByRole: data.uploadedByRole,
        filePath: data.filePath || '',
        url: data.url || '',
        isProcessed: data.isProcessed || false,
        tags: data.tags || [],
        createKnowledgeGraph: data.createKnowledgeGraph || false,
        processingStatus: (data.processingStatus || 'pending') as any, // Cast to match DocumentProcessingStatus
        sharedWith: [],
        metadata: {}
      };

      const [newDocument] = await db
        .insert(documents)
        .values(insertData)
        .returning();
      
      return newDocument;
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
  public async updateDocument(documentId: number | string, data: Partial<InsertDocument>): Promise<Document> {
    try {
      const docId = typeof documentId === 'string' ? parseInt(documentId, 10) : documentId;
      
      // Add updatedAt timestamp
      const updateData = {
        ...data,
        updatedAt: new Date()
      };
      
      const [updatedDocument] = await db
        .update(documents)
        .set(updateData)
        .where(eq(documents.id, docId))
        .returning();
      
      if (!updatedDocument) {
        throw new Error(`Document with ID ${docId} not found`);
      }
      
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
  public async getDocumentById(documentId: string | number, userId: number): Promise<Document | undefined> {
    try {
      const docId = typeof documentId === 'string' ? parseInt(documentId, 10) : documentId;
      
      const [document] = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.id, docId),
            eq(documents.uploadedById, userId)
          )
        );
      
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
  public async getDocuments(userId: number, page: number = 1, pageSize: number = 10): Promise<{ 
    documents: Document[]; 
    total: number; 
    page: number; 
    pageSize: number; 
    totalPages: number 
  }> {
    try {
      // Calculate offset for pagination
      const offset = (page - 1) * pageSize;
      
      // Get total count
      const countResult = await db
        .select({ count: db.fn.count() })
        .from(documents)
        .where(eq(documents.uploadedById, userId));
      
      const total = Number(countResult[0].count) || 0;
      const totalPages = Math.ceil(total / pageSize);
      
      // Get documents with pagination
      const results = await db
        .select()
        .from(documents)
        .where(eq(documents.uploadedById, userId))
        .orderBy(desc(documents.createdAt))
        .limit(pageSize)
        .offset(offset);
      
      return {
        documents: results,
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
  public async getDocumentContent(documentId: string | number): Promise<{
    content: string;
    structure: any;
  }> {
    try {
      const docId = typeof documentId === 'string' ? parseInt(documentId, 10) : documentId;
      
      // Check if content exists in the database
      const [content] = await db
        .select()
        .from(documentContent)
        .where(eq(documentContent.documentId, docId));
      
      if (content) {
        return {
          content: content.textContent || '',
          structure: content.structuredContent || {
            metadata: {}
          }
        };
      }
      
      // If no content found, get the document
      const [document] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, docId));
      
      if (!document) {
        throw new Error(`Document with ID ${docId} not found`);
      }
      
      // Return basic placeholder content
      // In a real application, this would extract content from the file
      return {
        content: `${document.title}\n\nDocument content being processed...`,
        structure: {
          fileType: document.fileType,
          pageCount: 1,
          metadata: {
            title: document.title,
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
   * Save document content
   * @param documentId - Document ID
   * @param content - Text content
   * @param structure - Document structure
   * @returns Created/updated document content
   */
  public async saveDocumentContent(
    documentId: number,
    content: string,
    structure: any,
    keywords: string[] = []
  ): Promise<DocumentContent> {
    try {
      // Check if content already exists
      const [existingContent] = await db
        .select()
        .from(documentContent)
        .where(eq(documentContent.documentId, documentId));
      
      if (existingContent) {
        // Update existing content
        const [updatedContent] = await db
          .update(documentContent)
          .set({
            textContent: content,
            structuredContent: structure,
            extractedKeywords: keywords,
            updatedAt: new Date()
          })
          .where(eq(documentContent.id, existingContent.id))
          .returning();
        
        return updatedContent;
      } else {
        // Create new content
        const [newContent] = await db
          .insert(documentContent)
          .values({
            documentId,
            textContent: content,
            structuredContent: structure,
            extractedKeywords: keywords
          })
          .returning();
        
        return newContent;
      }
    } catch (error) {
      this.logger.error(`Failed to save document content: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Delete document
   * @param documentId - Document ID
   * @param userId - User ID for authorization
   * @returns Whether deletion was successful
   */
  public async deleteDocument(documentId: string | number, userId: number): Promise<boolean> {
    try {
      const docId = typeof documentId === 'string' ? parseInt(documentId, 10) : documentId;
      
      // Get the document to check ownership and retrieve file path
      const document = await this.getDocumentById(docId, userId);
      
      if (!document) {
        return false;
      }
      
      // Delete the physical file if it exists
      if (document.filePath && existsSync(document.filePath)) {
        await fs.unlink(document.filePath);
      }
      
      // Delete the document from the database
      // Note: Related records like document content and knowledge graph entries
      // should be deleted automatically via CASCADE constraints
      await db
        .delete(documents)
        .where(eq(documents.id, docId));
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete document: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}

// Export singleton instance
export const documentService = new DocumentService();
