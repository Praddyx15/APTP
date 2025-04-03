import { db } from '../database/db';
import { 
  knowledgeGraphNodes, 
  knowledgeGraphEdges,
  documents as documentsTable
} from '../database/schema';
import { eq, and, like, or, inArray } from 'drizzle-orm';
import { Logger } from '../utils/logger';
import { KnowledgeGraph, KnowledgeGraphNode, KnowledgeGraphEdge } from '../types/knowledge-graph';

/**
 * Service for retrieving and manipulating knowledge graph data
 */
export class KnowledgeGraphService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('KnowledgeGraphService');
  }

  /**
   * Get the complete knowledge graph across all documents accessible to the user
   * @param userId - User ID for access control
   * @returns Promise<KnowledgeGraph> - Complete knowledge graph
   */
  public async getCompleteKnowledgeGraph(userId: string): Promise<KnowledgeGraph> {
    try {
      // Get all documents accessible to the user
      const userDocuments = await db
        .select({ id: documentsTable.id })
        .from(documentsTable)
        .where(and(
          eq(documentsTable.uploadedBy, userId),
          eq(documentsTable.createKnowledgeGraph, true),
          eq(documentsTable.processingStatus, 'complete')
        ));
      
      const documentIds = userDocuments.map(doc => doc.id);
      
      if (documentIds.length === 0) {
        return { nodes: [], edges: [] };
      }

      // Fetch all nodes for these documents
      const nodes = await db
        .select()
        .from(knowledgeGraphNodes)
        .where(inArray(knowledgeGraphNodes.documentId, documentIds));

      // Fetch all edges for these documents
      const edges = await db
        .select()
        .from(knowledgeGraphEdges)
        .where(inArray(knowledgeGraphEdges.documentId, documentIds));

      return { nodes, edges };
    } catch (error) {
      this.logger.error(`Failed to retrieve complete knowledge graph: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to retrieve knowledge graph');
    }
  }

  /**
   * Get knowledge graph data for a specific document
   * @param documentId - Document ID
   * @param userId - User ID for access control
   * @returns Promise<KnowledgeGraph | null> - Document knowledge graph or null if not found
   */
  public async getDocumentKnowledgeGraph(
    documentId: string,
    userId: string
  ): Promise<KnowledgeGraph | null> {
    try {
      // Check if document exists and user has access
      const documentExists = await db
        .select({ id: documentsTable.id })
        .from(documentsTable)
        .where(and(
          eq(documentsTable.id, documentId),
          eq(documentsTable.uploadedBy, userId)
        ));

      if (documentExists.length === 0) {
        return null;
      }

      // Fetch nodes for this document
      const nodes = await db
        .select()
        .from(knowledgeGraphNodes)
        .where(eq(knowledgeGraphNodes.documentId, documentId));

      // Fetch edges for this document
      const edges = await db
        .select()
        .from(knowledgeGraphEdges)
        .where(eq(knowledgeGraphEdges.documentId, documentId));

      return { nodes, edges };
    } catch (error) {
      this.logger.error(`Failed to retrieve document knowledge graph: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to retrieve document knowledge graph');
    }
  }

  /**
   * Search for nodes in the knowledge graph
   * @param query - Search query
   * @param userId - User ID for access control
   * @returns Promise<KnowledgeGraph> - Search results as a subgraph
   */
  public async searchKnowledgeGraph(
    query: string,
    userId: string
  ): Promise<KnowledgeGraph> {
    try {
      // Get all documents accessible to the user
      const userDocuments = await db
        .select({ id: documentsTable.id })
        .from(documentsTable)
        .where(and(
          eq(documentsTable.uploadedBy, userId),
          eq(documentsTable.createKnowledgeGraph, true),
          eq(documentsTable.processingStatus, 'complete')
        ));
      
      const documentIds = userDocuments.map(doc => doc.id);
      
      if (documentIds.length === 0) {
        return { nodes: [], edges: [] };
      }

      // Search for nodes matching the query
      const nodes = await db
        .select()
        .from(knowledgeGraphNodes)
        .where(and(
          inArray(knowledgeGraphNodes.documentId, documentIds),
          or(
            like(knowledgeGraphNodes.label, `%${query}%`),
            like(knowledgeGraphNodes.description, `%${query}%`)
          )
        ));

      if (nodes.length === 0) {
        return { nodes: [], edges: [] };
      }

      // Get node IDs for edge filtering
      const nodeIds = nodes.map(node => node.id);

      // Fetch all edges connected to these nodes
      const edges = await db
        .select()
        .from(knowledgeGraphEdges)
        .where(and(
          inArray(knowledgeGraphEdges.documentId, documentIds),
          or(
            inArray(knowledgeGraphEdges.source, nodeIds),
            inArray(knowledgeGraphEdges.target, nodeIds)
          )
        ));

      // Find connected nodes that weren't in the original search results
      const connectedNodeIds = new Set<string>();
      edges.forEach(edge => {
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
      });

      // Get missing nodes
      const missingNodeIds = Array.from(connectedNodeIds).filter(id => !nodeIds.includes(id));
      
      if (missingNodeIds.length > 0) {
        const additionalNodes = await db
          .select()
          .from(knowledgeGraphNodes)
          .where(inArray(knowledgeGraphNodes.id, missingNodeIds));
        
        nodes.push(...additionalNodes);
      }

      return { nodes, edges };
    } catch (error) {
      this.logger.error(`Failed to search knowledge graph: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to search knowledge graph');
    }
  }

  /**
   * Get details for a specific node and its connected nodes
   * @param nodeId - Node ID
   * @param userId - User ID for access control
   * @returns Promise<KnowledgeGraph | null> - Node with connections or null if not found
   */
  public async getNodeWithConnections(
    nodeId: string,
    userId: string
  ): Promise<KnowledgeGraph | null> {
    try {
      // Get node details
      const nodes = await db
        .select()
        .from(knowledgeGraphNodes)
        .where(eq(knowledgeGraphNodes.id, nodeId));

      if (nodes.length === 0) {
        return null;
      }

      const node = nodes[0];

      // Check if user has access to this document
      const documentAccess = await db
        .select()
        .from(documentsTable)
        .where(and(
          eq(documentsTable.id, node.documentId),
          eq(documentsTable.uploadedBy, userId)
        ));

      if (documentAccess.length === 0) {
        return null;
      }

      // Get all edges connected to this node
      const edges = await db
        .select()
        .from(knowledgeGraphEdges)
        .where(or(
          eq(knowledgeGraphEdges.source, nodeId),
          eq(knowledgeGraphEdges.target, nodeId)
        ));

      // Get all connected nodes
      const connectedNodeIds = new Set<string>();
      edges.forEach(edge => {
        if (edge.source !== nodeId) connectedNodeIds.add(edge.source);
        if (edge.target !== nodeId) connectedNodeIds.add(edge.target);
      });

      // Get connected node details
      const connectedNodes: KnowledgeGraphNode[] = [];
      if (connectedNodeIds.size > 0) {
        const additionalNodes = await db
          .select()
          .from(knowledgeGraphNodes)
          .where(inArray(knowledgeGraphNodes.id, Array.from(connectedNodeIds)));
        
        connectedNodes.push(...additionalNodes);
      }

      return {
        nodes: [node, ...connectedNodes],
        edges
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve node details: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to retrieve node details');
    }
  }

  /**
   * Get all available concept categories from the knowledge graph
   * @param userId - User ID for access control
   * @returns Promise<{category: string; count: number}[]> - Categories with counts
   */
  public async getConceptCategories(
    userId: string
  ): Promise<{category: string; count: number}[]> {
    try {
      // Get all documents accessible to the user
      const userDocuments = await db
        .select({ id: documentsTable.id })
        .from(documentsTable)
        .where(and(
          eq(documentsTable.uploadedBy, userId),
          eq(documentsTable.createKnowledgeGraph, true),
          eq(documentsTable.processingStatus, 'complete')
        ));
      
      const documentIds = userDocuments.map(doc => doc.id);
      
      if (documentIds.length === 0) {
        return [];
      }

      // Get all categories with counts
      const categories = await db
        .select({
          category: knowledgeGraphNodes.category
        })
        .from(knowledgeGraphNodes)
        .where(inArray(knowledgeGraphNodes.documentId, documentIds))
        .groupBy(knowledgeGraphNodes.category);

      // Count nodes for each category
      const categoryCounts: {category: string; count: number}[] = [];
      
      for (const cat of categories) {
        const count = await db
          .select({ count: db.fn.count() })
          .from(knowledgeGraphNodes)
          .where(and(
            inArray(knowledgeGraphNodes.documentId, documentIds),
            eq(knowledgeGraphNodes.category, cat.category)
          ));
        
        categoryCounts.push({
          category: cat.category,
          count: Number(count[0].count)
        });
      }

      return categoryCounts;
    } catch (error) {
      this.logger.error(`Failed to retrieve concept categories: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to retrieve concept categories');
    }
  }
}