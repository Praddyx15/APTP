import { Logger } from '../utils/logger';
import { DocumentService } from './document-service';
import nlpService, { Entity, Relationship } from './nlp-service';
import { documentAnalysisService } from './document-analysis-service';
import { v4 as uuidv4 } from 'uuid';

export interface KnowledgeNode {
  id: string;
  name: string;
  type: string;
  properties: {
    documentId?: string;
    contextSentence?: string;
    importance?: number;
    [key: string]: any;
  };
}

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: {
    documentId?: string;
    contextSentence?: string;
    confidence?: number;
    [key: string]: any;
  };
}

export interface KnowledgeGraph {
  id: string;
  name: string;
  description: string;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  createdAt: Date;
  updatedAt: Date;
  sourceDocumentIds: string[];
}

/**
 * Service for managing knowledge graphs
 */
export class KnowledgeGraphService {
  private logger: Logger;
  private documentService: DocumentService;
  private graphs: Map<string, KnowledgeGraph>;
  
  constructor() {
    this.logger = new Logger('KnowledgeGraphService');
    this.documentService = new DocumentService();
    this.graphs = new Map<string, KnowledgeGraph>();
  }
  
  /**
   * Create a knowledge graph from a document
   * @param documentId - Document ID
   * @returns Created knowledge graph
   */
  public async createGraphFromDocument(documentId: string): Promise<KnowledgeGraph | null> {
    try {
      this.logger.info(`Creating knowledge graph from document ${documentId}`);
      
      // Get document content
      const documentContent = await this.documentService.getDocumentContent(documentId);
      
      if (!documentContent) {
        this.logger.error(`Failed to get content for document ${documentId}`);
        return null;
      }
      
      // Extract text content
      const text = documentContent.content || '';
      
      if (!text || text.trim().length === 0) {
        this.logger.error(`Document ${documentId} has no text content`);
        return null;
      }
      
      // Extract entities and relationships
      const { entities, relationships } = await nlpService.extractEntitiesAndRelationships(text);
      
      // Create knowledge graph
      const graph = this.createKnowledgeGraph(documentId, entities, relationships);
      
      // Store the graph
      this.graphs.set(graph.id, graph);
      
      return graph;
    } catch (error) {
      this.logger.error(`Error creating knowledge graph: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
  
  /**
   * Create a knowledge graph from multiple documents
   * @param documentIds - Document IDs
   * @returns Created knowledge graph
   */
  public async createGraphFromMultipleDocuments(documentIds: string[]): Promise<KnowledgeGraph | null> {
    try {
      this.logger.info(`Creating knowledge graph from multiple documents: ${documentIds.join(', ')}`);
      
      if (!documentIds.length) {
        throw new Error('No document IDs provided');
      }
      
      // Create a merged graph
      const graphId = uuidv4();
      const graph: KnowledgeGraph = {
        id: graphId,
        name: `Multi-Document Knowledge Graph (${documentIds.length} docs)`,
        description: `Knowledge graph generated from multiple documents`,
        nodes: [],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        sourceDocumentIds: documentIds
      };
      
      // Process each document
      for (const documentId of documentIds) {
        // Get document content
        const documentContent = await this.documentService.getDocumentContent(documentId);
        
        if (!documentContent || !documentContent.content) {
          this.logger.warn(`Skipping document ${documentId}: No content available`);
          continue;
        }
        
        // Extract entities and relationships
        const { entities, relationships } = await nlpService.extractEntitiesAndRelationships(documentContent.content);
        
        // Add nodes for each entity
        for (const entity of entities) {
          const nodeId = `${documentId}_${entity.id || uuidv4()}`;
          
          graph.nodes.push({
            id: nodeId,
            name: entity.text,
            type: entity.type,
            properties: {
              documentId,
              contextSentence: entity.contextSentence,
              importance: entity.importance || 1
            }
          });
        }
        
        // Add edges for each relationship
        for (const relationship of relationships) {
          const sourceId = `${documentId}_${relationship.sourceId}`;
          const targetId = `${documentId}_${relationship.targetId}`;
          
          // Make sure both source and target nodes exist
          const sourceExists = graph.nodes.some(node => node.id === sourceId);
          const targetExists = graph.nodes.some(node => node.id === targetId);
          
          if (sourceExists && targetExists) {
            graph.edges.push({
              id: uuidv4(),
              source: sourceId,
              target: targetId,
              type: relationship.type,
              properties: {
                documentId,
                contextSentence: relationship.contextSentence,
                confidence: relationship.confidence || 0.5
              }
            });
          }
        }
      }
      
      // Only save if we have nodes
      if (graph.nodes.length > 0) {
        this.graphs.set(graph.id, graph);
        return graph;
      } else {
        this.logger.warn('No nodes were created for the knowledge graph');
        return null;
      }
    } catch (error) {
      this.logger.error(`Error creating knowledge graph: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
  
  /**
   * Create a knowledge graph from entities and relationships
   * @param documentId - Source document ID
   * @param entities - Entities to include in the graph
   * @param relationships - Relationships to include in the graph
   * @returns Created knowledge graph
   */
  private createKnowledgeGraph(documentId: string, entities: Entity[], relationships: Relationship[]): KnowledgeGraph {
    // Generate a unique ID for the graph
    const graphId = uuidv4();
    
    // Create nodes for each entity
    const nodes: KnowledgeNode[] = entities.map(entity => ({
      id: entity.id || uuidv4(),
      name: entity.text,
      type: entity.type,
      properties: {
        documentId,
        contextSentence: entity.contextSentence,
        importance: entity.importance || 1
      }
    }));
    
    // Create edges for each relationship
    const edges: KnowledgeEdge[] = relationships.map(relation => ({
      id: uuidv4(),
      source: relation.sourceId,
      target: relation.targetId,
      type: relation.type,
      properties: {
        documentId,
        contextSentence: relation.contextSentence,
        confidence: relation.confidence || 0.5
      }
    }));
    
    // Create the knowledge graph
    return {
      id: graphId,
      name: `Knowledge Graph for Document ${documentId}`,
      description: `Knowledge graph generated from document ${documentId}`,
      nodes,
      edges,
      createdAt: new Date(),
      updatedAt: new Date(),
      sourceDocumentIds: [documentId]
    };
  }
  
  /**
   * Get knowledge graph by ID
   * @param graphId - Knowledge graph ID
   * @returns Knowledge graph if found
   */
  public async getKnowledgeGraph(graphId: string): Promise<KnowledgeGraph | null> {
    try {
      const graph = this.graphs.get(graphId);
      return graph || null;
    } catch (error) {
      this.logger.error(`Error retrieving knowledge graph: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
  
  /**
   * Get all knowledge graphs
   * @returns Array of knowledge graphs
   */
  public async getAllKnowledgeGraphs(): Promise<KnowledgeGraph[]> {
    try {
      return Array.from(this.graphs.values());
    } catch (error) {
      this.logger.error(`Error retrieving knowledge graphs: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  /**
   * Get knowledge graphs for a document
   * @param documentId - Document ID
   * @returns Array of knowledge graphs for the document
   */
  public async getKnowledgeGraphsForDocument(documentId: string): Promise<KnowledgeGraph[]> {
    try {
      return Array.from(this.graphs.values())
        .filter(graph => graph.sourceDocumentIds.includes(documentId));
    } catch (error) {
      this.logger.error(`Error retrieving knowledge graphs for document: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  /**
   * Delete knowledge graph by ID
   * @param graphId - Knowledge graph ID
   * @returns Whether deletion was successful
   */
  public async deleteKnowledgeGraph(graphId: string): Promise<boolean> {
    try {
      return this.graphs.delete(graphId);
    } catch (error) {
      this.logger.error(`Error deleting knowledge graph: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}

// Export singleton instance
export const knowledgeGraphService = new KnowledgeGraphService();
