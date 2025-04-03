import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';
import { documentService } from './document-service';
import { ParsedDocument, DocumentNode, DocumentEdge } from '@shared/knowledge-graph-types';
import { knowledgeGraphService } from './knowledge-graph-service';
import { DocumentAIEngine } from './document-ai-engine';
import { db } from '../db';
import {
  knowledgeGraphNodes,
  knowledgeGraphEdges,
  documentContent
} from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Service for analyzing documents and extracting knowledge
 */
export class DocumentAnalysisService {
  private logger: Logger;
  private aiEngine: DocumentAIEngine;
  
  constructor() {
    this.logger = new Logger('DocumentAnalysisService');
    this.aiEngine = new DocumentAIEngine();
  }
  
  /**
   * Process and analyze a document
   * @param documentId - Document ID
   * @returns Success status
   */
  public async processDocument(documentId: number): Promise<boolean> {
    try {
      this.logger.info(`Processing document: ${documentId}`);
      
      // Update document status
      await documentService.updateDocument(documentId, {
        processingStatus: 'processing'
      });
      
      // Get the document
      const document = await documentService.getDocumentById(documentId, 0);
      
      if (!document || !document.filePath) {
        this.logger.error(`Document not found or missing file path: ${documentId}`);
        await documentService.updateDocument(documentId, {
          processingStatus: 'error'
        });
        return false;
      }
      
      // Extract text content using AI Engine
      const extractionResult = await this.aiEngine.extractText(document.filePath, document.fileType);
      
      if (!extractionResult.success) {
        this.logger.error(`Failed to extract content: ${extractionResult.error}`);
        await documentService.updateDocument(documentId, {
          processingStatus: 'error'
        });
        return false;
      }
      
      // Save the extracted content
      await documentService.saveDocumentContent(
        documentId,
        extractionResult.text,
        extractionResult.structure,
        extractionResult.keywords
      );
      
      // Generate knowledge graph if requested
      if (document.createKnowledgeGraph) {
        await this.generateKnowledgeGraph(documentId, extractionResult.text);
      }
      
      // Update document status to complete
      await documentService.updateDocument(documentId, {
        processingStatus: 'complete',
        isProcessed: true
      });
      
      this.logger.info(`Document ${documentId} processed successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to process document: ${error instanceof Error ? error.message : String(error)}`);
      // Update document status to error
      await documentService.updateDocument(documentId, {
        processingStatus: 'error'
      });
      return false;
    }
  }
  
  /**
   * Generate a knowledge graph from document content
   * @param documentId - Document ID
   * @param content - Text content
   * @returns Success status
   */
  private async generateKnowledgeGraph(documentId: number, content: string): Promise<boolean> {
    try {
      this.logger.info(`Generating knowledge graph for document: ${documentId}`);
      
      // Generate knowledge graph using AI
      const graph = await this.aiEngine.generateKnowledgeGraph(content);
      
      if (!graph || !graph.nodes || !graph.edges) {
        this.logger.error(`Failed to generate knowledge graph for document: ${documentId}`);
        return false;
      }
      
      // Save nodes and edges to database
      for (const node of graph.nodes) {
        await db.insert(knowledgeGraphNodes).values({
          documentId,
          nodeId: node.id,
          label: node.label,
          type: node.type,
          data: node.data,
          position: node.position
        });
      }
      
      for (const edge of graph.edges) {
        await db.insert(knowledgeGraphEdges).values({
          documentId,
          edgeId: edge.id,
          sourceId: edge.source,
          targetId: edge.target,
          label: edge.label,
          data: edge.data
        });
      }
      
      this.logger.info(`Knowledge graph generated with ${graph.nodes.length} nodes and ${graph.edges.length} edges`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to generate knowledge graph: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Extract specific information from a document
   * @param documentId - Document ID
   * @param extractionType - Type of information to extract
   * @returns Extracted data
   */
  public async extractInformation(
    documentId: number, 
    extractionType: string
  ): Promise<any> {
    try {
      // Get document content
      const [content] = await db
        .select()
        .from(documentContent)
        .where(eq(documentContent.documentId, documentId));
      
      if (!content || !content.textContent) {
        throw new Error(`No content found for document ${documentId}`);
      }
      
      // Based on extraction type, extract different information
      switch (extractionType) {
        case 'syllabus':
          return await this.aiEngine.extractSyllabus(content.textContent);
        case 'trainingObjectives':
          return await this.aiEngine.extractTrainingObjectives(content.textContent);
        case 'regulations':
          return await this.aiEngine.extractRegulations(content.textContent);
        case 'procedures':
          return await this.aiEngine.extractProcedures(content.textContent);
        default:
          throw new Error(`Unknown extraction type: ${extractionType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to extract ${extractionType}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

// Export singleton instance
export const documentAnalysisService = new DocumentAnalysisService();
