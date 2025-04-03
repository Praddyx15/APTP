/**
 * Document Service
 * Manages document storage, retrieval, and processing
 */

import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../utils/logger';
import { 
  Document,
  DocumentUpdateRequest,
  DocumentAnalysisResult,
  DocumentSearchOptions,
  DocumentSearchResult,
  DocumentCategory,
  DocumentStatus,
  DocumentTag
} from '../../shared/document-types';

export class DocumentService {
  private logger;
  private documents: Map<number, Document>;
  private nextId: number;
  private uploadDir: string;

  constructor() {
    this.logger = logger.child('DocumentService');
    this.documents = new Map<number, Document>();
    this.nextId = 1;
    this.uploadDir = process.env.UPLOAD_DIR || 'uploads';
    
    // Ensure upload directory exists
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      this.logger.error(`Error creating upload directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get a document by ID
   * @param id - Document ID
   * @returns Promise<Document | undefined> - Document or undefined if not found
   */
  async getDocument(id: number): Promise<Document | undefined> {
    try {
      return this.documents.get(id);
    } catch (error) {
      this.logger.error(`Error getting document: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get all documents with optional filtering and pagination
   * @param options - Search options
   * @returns Promise<DocumentSearchResult> - Search results with pagination info
   */
  async getAllDocuments(options?: DocumentSearchOptions): Promise<DocumentSearchResult> {
    try {
      let docs = Array.from(this.documents.values());
      const totalBeforeFilters = docs.length;
      const limit = options?.limit || 100;
      const offset = options?.offset || 0;
      
      // Apply filters
      if (options) {
        // Text search
        if (options.query) {
          const query = options.query.toLowerCase();
          docs = docs.filter(doc => 
            doc.title.toLowerCase().includes(query) || 
            (doc.description && doc.description.toLowerCase().includes(query))
          );
        }
        
        // Category filter
        if (options.categories && options.categories.length > 0) {
          docs = docs.filter(doc => 
            doc.category && options.categories!.includes(doc.category)
          );
        }
        
        // Status filter
        if (options.statuses && options.statuses.length > 0) {
          docs = docs.filter(doc => 
            options.statuses!.includes(doc.status)
          );
        }
        
        // Tags filter
        if (options.tagIds && options.tagIds.length > 0) {
          docs = docs.filter(doc => 
            doc.tags && doc.tags.some(tag => options.tagIds!.includes(tag.id))
          );
        }
        
        // User filter
        if (options.uploadedBy !== undefined) {
          docs = docs.filter(doc => 
            doc.uploadedBy === options.uploadedBy
          );
        }
        
        // Date range filters
        if (options.uploadedDateStart) {
          const startDate = new Date(options.uploadedDateStart).getTime();
          docs = docs.filter(doc => 
            new Date(doc.uploadedAt).getTime() >= startDate
          );
        }
        
        if (options.uploadedDateEnd) {
          const endDate = new Date(options.uploadedDateEnd).getTime();
          docs = docs.filter(doc => 
            new Date(doc.uploadedAt).getTime() <= endDate
          );
        }
        
        // Metadata filters
        if (options.metadataFilters && options.metadataFilters.length > 0) {
          docs = docs.filter(doc => {
            if (!doc.metadata) return false;
            
            return options.metadataFilters!.every(filter => {
              const value = doc.metadata![filter.key];
              return value !== undefined && String(value).toLowerCase().includes(filter.value.toLowerCase());
            });
          });
        }
        
        // Sort
        if (options.sortBy) {
          const sortField = options.sortBy;
          const sortDirection = options.sortOrder === 'desc' ? -1 : 1;
          
          docs.sort((a, b) => {
            if (sortField === 'title') {
              return sortDirection * a.title.localeCompare(b.title);
            } else if (sortField === 'uploadedAt') {
              return sortDirection * (new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
            } else if (sortField === 'category') {
              return sortDirection * ((a.category || '').localeCompare(b.category || ''));
            } else if (sortField === 'status') {
              return sortDirection * a.status.localeCompare(b.status);
            } else if (sortField === 'fileSize') {
              return sortDirection * ((a.fileSize || 0) - (b.fileSize || 0));
            }
            return 0;
          });
        }
      }
      
      // Apply pagination
      const paginatedDocs = docs.slice(offset, offset + limit);
      
      return {
        documents: paginatedDocs,
        total: docs.length,
        limit,
        offset
      };
    } catch (error) {
      this.logger.error(`Error getting all documents: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create a new document
   * @param document - Document data
   * @returns Promise<Document> - Created document
   */
  async createDocument(document: Partial<Document>): Promise<Document> {
    try {
      const id = this.nextId++;
      
      const newDocument: Document = {
        ...document as any,
        id,
        status: document.status || 'draft',
        uploadedAt: document.uploadedAt || new Date().toISOString(),
        processingStatus: 'pending',
        analysisComplete: false
      };
      
      this.documents.set(id, newDocument);
      
      this.logger.info(`Document created: ${id} - ${newDocument.title}`);
      
      return newDocument;
    } catch (error) {
      this.logger.error(`Error creating document: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update an existing document
   * @param id - Document ID
   * @param updates - Updated document data
   * @returns Promise<Document | undefined> - Updated document or undefined if not found
   */
  async updateDocument(id: number, updates: DocumentUpdateRequest): Promise<Document | undefined> {
    try {
      const document = this.documents.get(id);
      
      if (!document) {
        return undefined;
      }
      
      // Handle tags separately
      let updatedTags = document.tags || [];
      
      if (updates.tags) {
        if (Array.isArray(updates.tags)) {
          if (typeof updates.tags[0] === 'string') {
            // Convert string tags to DocumentTag objects
            updatedTags = (updates.tags as string[]).map((tagName, index) => ({
              id: -(index + 1), // Temporary negative ID
              name: tagName
            }));
          } else {
            // Use provided DocumentTag objects
            updatedTags = updates.tags as DocumentTag[];
          }
        }
      }
      
      // Update document
      const updatedDocument: Document = {
        ...document,
        ...updates,
        tags: updatedTags
      };
      
      this.documents.set(id, updatedDocument);
      
      this.logger.info(`Document updated: ${id} - ${updatedDocument.title}`);
      
      return updatedDocument;
    } catch (error) {
      this.logger.error(`Error updating document: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete a document
   * @param id - Document ID
   * @returns Promise<boolean> - True if deletion succeeded
   */
  async deleteDocument(id: number): Promise<boolean> {
    try {
      const document = this.documents.get(id);
      
      if (!document) {
        return false;
      }
      
      // Delete the file if it exists
      if (document.filePath) {
        const filePath = path.join(this.uploadDir, document.filePath);
        try {
          await fs.unlink(filePath);
        } catch (fileError) {
          this.logger.warn(`Could not delete file for document ${id}: ${fileError instanceof Error ? fileError.message : String(fileError)}`);
        }
      }
      
      // Remove from the map
      this.documents.delete(id);
      
      this.logger.info(`Document deleted: ${id}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error deleting document: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get document content (extracted text)
   * @param id - Document ID
   * @returns Promise<DocumentAnalysisResult | undefined> - Document content or undefined if not found
   */
  async getDocumentContent(id: number): Promise<DocumentAnalysisResult | undefined> {
    try {
      const document = this.documents.get(id);
      
      if (!document) {
        return undefined;
      }
      
      return document.analysisResult;
    } catch (error) {
      this.logger.error(`Error getting document content: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Process a document (extract text, analyze content)
   * @param id - Document ID
   * @returns Promise<Document | undefined> - Processed document or undefined if not found
   */
  async processDocument(id: number): Promise<Document | undefined> {
    try {
      const document = this.documents.get(id);
      
      if (!document) {
        throw new Error(`Document not found: ${id}`);
      }
      
      // Update processing status
      const processingDoc: Document = {
        ...document,
        processingStatus: 'processing'
      };
      
      this.documents.set(id, processingDoc);
      
      this.logger.info(`Started processing document: ${id} - ${document.title}`);
      
      try {
        // In a real implementation, this would use document processing libraries
        // and OCR technologies to extract text and analyze content
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get file path
        const filePath = document.filePath ? 
          path.join(this.uploadDir, document.filePath) : 
          undefined;
        
        // Try to read the file
        let fileContent = '';
        if (filePath) {
          try {
            const fileBuffer = await fs.readFile(filePath);
            
            // This is a simplified text extraction based on file type
            // In a real app, you would use specialized libraries for each file type
            if (document.fileType === 'txt' || document.fileType === 'md') {
              fileContent = fileBuffer.toString('utf8');
            } else {
              // For other file types, we'd use specialized extraction libraries
              // For this example, we'll use placeholder text
              fileContent = `Sample content for ${document.title}. This is a placeholder for actual document content that would be extracted using specialized libraries for ${document.fileType} files.`;
            }
          } catch (fileError) {
            this.logger.error(`Error reading file for document ${id}: ${fileError instanceof Error ? fileError.message : String(fileError)}`);
            fileContent = `Could not extract text from file: ${fileError instanceof Error ? fileError.message : String(fileError)}`;
          }
        }
        
        // Generate a simple analysis result
        const wordCount = fileContent.split(/\s+/).length;
        const keywords = this.extractKeywords(fileContent);
        
        const analysisResult: DocumentAnalysisResult = {
          extractedText: fileContent,
          summary: this.generateSummary(fileContent),
          keyTopics: keywords,
          wordCount,
          readabilityScore: this.calculateReadabilityScore(fileContent),
          entities: this.extractEntities(fileContent)
        };
        
        // Update document with analysis results
        const updatedDocument: Document = {
          ...processingDoc,
          processingStatus: 'completed',
          analysisComplete: true,
          analysisDate: new Date().toISOString(),
          analysisResult
        };
        
        this.documents.set(id, updatedDocument);
        
        this.logger.info(`Document processing completed: ${id} - ${document.title}`);
        
        return updatedDocument;
      } catch (processingError) {
        // Handle processing errors
        const errorMessage = processingError instanceof Error ? processingError.message : String(processingError);
        
        const errorDocument: Document = {
          ...processingDoc,
          processingStatus: 'failed',
          processingError: errorMessage
        };
        
        this.documents.set(id, errorDocument);
        
        this.logger.error(`Document processing failed: ${id} - ${errorMessage}`);
        
        return errorDocument;
      }
    } catch (error) {
      this.logger.error(`Error in document processing: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Generate a simple summary of text
   * @param text - Text to summarize
   * @returns string - Summary
   */
  private generateSummary(text: string): string {
    // In a real app, use a summarization algorithm or API
    // This is a very simple implementation that just gets the first paragraph
    
    if (!text || text.length === 0) {
      return 'No content available for summarization.';
    }
    
    const paragraphs = text.split(/\n\s*\n/);
    const firstParagraph = paragraphs[0].trim();
    
    if (firstParagraph.length > 200) {
      return firstParagraph.substring(0, 197) + '...';
    }
    
    return firstParagraph;
  }

  /**
   * Extract keywords from text
   * @param text - Text to analyze
   * @returns string[] - Keywords
   */
  private extractKeywords(text: string): string[] {
    // In a real app, use NLP libraries for keyword extraction
    // This is a very simple implementation that just gets common words
    
    if (!text || text.length === 0) {
      return [];
    }
    
    const stopWords = new Set([
      'the', 'and', 'or', 'is', 'are', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 
      'with', 'by', 'about', 'as', 'from', 'of', 'this', 'that', 'these', 'those',
      'it', 'its', 'they', 'them', 'their', 'he', 'she', 'his', 'her', 'we', 'our',
      'you', 'your', 'be', 'been', 'being', 'was', 'were', 'has', 'have', 'had'
    ]);
    
    // Tokenize and count words
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => 
        word.length > 3 && !stopWords.has(word)
      );
    
    const wordCount: {[key: string]: number} = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Get top keywords
    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Calculate a readability score
   * @param text - Text to analyze
   * @returns number - Readability score (0-100)
   */
  private calculateReadabilityScore(text: string): number {
    // In a real app, use established readability metrics
    // This is a very simplified implementation
    
    if (!text || text.length === 0) {
      return 0;
    }
    
    // Split into sentences and words
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.trim().length > 0);
    
    if (sentences.length === 0 || words.length === 0) {
      return 0;
    }
    
    // Calculate average sentence length
    const avgSentenceLength = words.length / sentences.length;
    
    // Calculate average word length
    const avgWordLength = text.replace(/[^\w]/g, '').length / words.length;
    
    // Combine metrics into a score (0-100)
    // Lower avg sentence length and word length are generally more readable
    const readabilityScore = Math.max(0, Math.min(100, 
      100 - (avgSentenceLength * 5) - (avgWordLength * 10)
    ));
    
    return Math.round(readabilityScore);
  }

  /**
   * Extract entities from text
   * @param text - Text to analyze
   * @returns Object with categorized entities
   */
  private extractEntities(text: string): DocumentAnalysisResult['entities'] {
    // In a real app, use NLP libraries for named entity recognition
    // This is a very simple implementation with regex patterns
    
    if (!text || text.length === 0) {
      return {};
    }
    
    // Simple patterns for finding dates
    const datePattern = /\b\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?,? \d{2,4}\b/gi;
    const dateMatches = text.match(datePattern) || [];
    const dates = Array.from(new Set(dateMatches));
    
    // Pattern for organizations (simple - looks for capitalized terms ending in Inc, LLC, etc.)
    const orgPattern = /\b[A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)*(?: Inc\.| LLC| Ltd\.| Corp\.| Company| Organization| Authority| Agency)\b/g;
    const orgMatches = text.match(orgPattern) || [];
    const organizations = Array.from(new Set(orgMatches));
    
    return {
      dates,
      organizations
    };
  }
}

// Export singleton instance
export const documentService = new DocumentService();