import { Logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import nlpService, { Entity, EntityType, Relationship } from './nlp-service';
import { Document, DocumentContent, DocumentType } from '../../shared/document-types';
import { DocumentService } from './document-service';
import { removeStopwords } from 'stopword';
import compromise from 'compromise';

/**
 * Document analysis result
 */
export interface DocumentAnalysisResult {
  documentId: string;
  entities: Entity[];
  relationships: Relationship[];
  keywords: string[];
  summary: string;
  paragraphs: string[];
  sentences: string[];
}

/**
 * Service for analyzing documents and extracting information
 */
export class DocumentAnalysisService {
  private logger: Logger;
  private documentService: DocumentService;
  
  constructor() {
    this.logger = new Logger('DocumentAnalysisService');
    this.documentService = new DocumentService();
  }
  
  /**
   * Process a document to extract entities, relationships, and knowledge graph
   * @param documentId - Document ID to process
   * @returns Whether processing was successful
   */
  public async processDocument(documentId: string): Promise<boolean> {
    try {
      this.logger.info(`Processing document ${documentId}`);
      
      // Get document content
      const documentContent = await this.documentService.getDocumentContent(documentId);
      
      if (!documentContent) {
        this.logger.error(`Failed to get content for document ${documentId}`);
        return false;
      }
      
      // Extract text content
      const text = documentContent.content || '';
      
      if (!text || text.trim().length === 0) {
        this.logger.error(`Document ${documentId} has no text content`);
        return false;
      }
      
      // Analyze document text
      const analysisResult = await this.analyzeText(documentId, text);
      
      // Update document with analysis results
      await this.documentService.updateDocument(parseInt(documentId), {
        processingStatus: 'completed',
        isProcessed: true,
        entities: analysisResult.entities.length,
        relationships: analysisResult.relationships.length,
        keywords: analysisResult.keywords.join(', '),
        summary: analysisResult.summary
      });
      
      this.logger.info(`Document ${documentId} processed successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Error processing document ${documentId}: ${error instanceof Error ? error.message : String(error)}`);
      
      // Update document status to failed
      await this.documentService.updateDocument(parseInt(documentId), {
        processingStatus: 'failed',
        isProcessed: false
      });
      
      return false;
    }
  }
  
  /**
   * Analyze text content to extract entities, relationships, and information
   * @param documentId - Document ID
   * @param text - Text content to analyze
   * @returns Analysis result with extracted information
   */
  private async analyzeText(documentId: string, text: string): Promise<DocumentAnalysisResult> {
    try {
      // Split text into paragraphs and sentences
      const paragraphs = text.split(/\n\s*\n/);
      
      // Use compromise for NLP tasks
      const doc = compromise(text);
      const sentences = doc.sentences().out('array');
      
      // Extract entities and relationships using NLP service
      const { entities, relationships } = await nlpService.extractEntitiesAndRelationships(text);
      
      // Extract keywords
      const keywords = this.extractKeywords(text);
      
      // Generate summary
      let summary = '';
      if (sentences.length > 0) {
        // Take the first few sentences as a summary (basic approach)
        summary = sentences.slice(0, Math.min(3, sentences.length)).join(' ');
      } else {
        summary = 'No summary available.';
      }
      
      return {
        documentId,
        entities,
        relationships,
        keywords,
        summary,
        paragraphs,
        sentences
      };
    } catch (error) {
      this.logger.error(`Error analyzing text: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Extract keywords from text
   * @param text - Text to extract keywords from
   * @returns Array of keywords
   */
  private extractKeywords(text: string): string[] {
    try {
      // Tokenize the text and convert to lowercase
      const tokens = text.toLowerCase().match(/\b[\w']+\b/g) || [];
      
      // Remove stopwords
      const filteredTokens = removeStopwords(tokens);
      
      // Count word frequencies
      const wordFreq = new Map<string, number>();
      for (const word of filteredTokens) {
        if (word.length < 3) continue; // Skip very short words
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
      
      // Sort by frequency
      const sortedWords = [...wordFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(entry => entry[0]);
      
      return sortedWords;
    } catch (error) {
      this.logger.error(`Error extracting keywords: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
}

// Export singleton instance
export const documentAnalysisService = new DocumentAnalysisService();
