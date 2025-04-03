/**
 * Knowledge Graph System
 * Creates and manages knowledge graphs from document content
 */

import { 
  KnowledgeGraph, 
  KnowledgeNode, 
  KnowledgeEdge, 
  NodeType, 
  EdgeType,
  GraphSearchOptions,
  GraphQueryResult
} from '../../shared/knowledge-graph-types';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { documentService } from './document-service';

export class KnowledgeGraphService {
  private logger;
  private graphs: Map<string, KnowledgeGraph>;

  constructor() {
    this.logger = logger.child('KnowledgeGraphService');
    this.graphs = new Map<string, KnowledgeGraph>();
  }

  /**
   * Get a knowledge graph by ID
   * @param id - Knowledge graph ID
   * @returns Promise<KnowledgeGraph | undefined> - Knowledge graph data or undefined if not found
   */
  public async getKnowledgeGraph(id: string): Promise<KnowledgeGraph | undefined> {
    try {
      // For a real implementation, this would query a database
      return this.graphs.get(id);
    } catch (error) {
      this.logger.error(`Error getting knowledge graph: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get all knowledge graphs with optional filtering
   * @param options - Filter options
   * @returns Promise<KnowledgeGraph[]> - Array of knowledge graphs
   */
  public async getAllKnowledgeGraphs(options?: {
    documentId?: number;
    createdBy?: number;
    limit?: number;
    offset?: number;
  }): Promise<KnowledgeGraph[]> {
    try {
      // For a real implementation, this would query a database with filters
      let graphs = Array.from(this.graphs.values());
      
      // Apply filters
      if (options?.documentId) {
        graphs = graphs.filter(graph => 
          graph.documentIds.includes(options.documentId!)
        );
      }
      
      if (options?.createdBy) {
        graphs = graphs.filter(graph => 
          graph.createdBy === options.createdBy
        );
      }
      
      // Apply pagination
      if (options?.limit || options?.offset) {
        const offset = options?.offset || 0;
        const limit = options?.limit || graphs.length;
        graphs = graphs.slice(offset, offset + limit);
      }
      
      return graphs;
    } catch (error) {
      this.logger.error(`Error getting all knowledge graphs: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create a knowledge graph from document content
   * @param documentId - Document ID
   * @param content - Optional document content (if not provided, will be fetched from documentService)
   * @returns Promise<KnowledgeGraph> - Created knowledge graph
   */
  public async createFromDocument(documentId: number, content?: string): Promise<KnowledgeGraph> {
    try {
      this.logger.info(`Creating knowledge graph from document: ${documentId}`);
      
      // Get document
      const document = await documentService.getDocument(documentId);
      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }
      
      // Get content if not provided
      let textContent = content || '';
      if (!textContent) {
        const documentContent = await documentService.getDocumentContent(documentId);
        if (!documentContent || !documentContent.extractedText) {
          throw new Error(`Document content not found: ${documentId}`);
        }
        textContent = documentContent.extractedText || '';
      }
      
      // For this implementation, we're creating a simple knowledge graph
      // In a real application, this would use NLP and entity extraction
      
      // Create graph ID
      const graphId = uuidv4();
      
      // Initial graph structure
      const graph: KnowledgeGraph = {
        id: graphId,
        name: `Knowledge Graph for ${document.title}`,
        description: `Auto-generated knowledge graph from document ${document.title}`,
        documentIds: [documentId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: document.uploadedBy,
        nodes: [],
        edges: [],
        metadata: {
          version: '1.0',
          status: 'draft',
          tags: document.tags?.map(tag => tag.name) || []
        }
      };
      
      // Generate simple text-based graph
      const { nodes, edges } = await this.generateBasicGraph(textContent, document.title, documentId);
      
      graph.nodes = nodes;
      graph.edges = edges;
      
      // Update metadata
      graph.metadata!.nodeCount = nodes.length;
      graph.metadata!.edgeCount = edges.length;
      graph.metadata!.lastAnalyzedAt = new Date().toISOString();
      
      // Save graph
      this.graphs.set(graphId, graph);
      
      // Update document with knowledge graph ID
      await documentService.updateDocument(documentId, {
        knowledgeGraphGenerated: true,
        knowledgeGraphId: graphId
      });
      
      this.logger.info(`Knowledge graph created: ${graphId} with ${nodes.length} nodes and ${edges.length} edges`);
      
      return graph;
    } catch (error) {
      this.logger.error(`Error creating knowledge graph from document: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Generate a basic graph from text content
   * @param text - Document text content
   * @param documentTitle - Document title
   * @param documentId - Document ID
   * @returns Promise<{nodes: KnowledgeNode[], edges: KnowledgeEdge[]}> - Generated nodes and edges
   */
  private async generateBasicGraph(
    text: string, 
    documentTitle: string,
    documentId: number
  ): Promise<{nodes: KnowledgeNode[], edges: KnowledgeEdge[]}> {
    // This is a very simplified implementation
    // In a real app, use NLP techniques like entity extraction
    
    const nodes: KnowledgeNode[] = [];
    const edges: KnowledgeEdge[] = [];
    
    // Create document node
    const documentNode: KnowledgeNode = {
      id: uuidv4(),
      label: documentTitle,
      type: NodeType.Document,
      documentId,
      level: 0,
      confidence: 1.0
    };
    
    nodes.push(documentNode);
    
    // Extract topics from content (very basic)
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
    
    // Extract common words as potential entities/concepts
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    // Count word occurrences
    const wordCount: {[key: string]: number} = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Filter stop words
    const stopWords = new Set([
      'this', 'that', 'these', 'those', 'with', 'from', 'have', 'will',
      'would', 'could', 'should', 'their', 'there', 'which', 'about',
      'when', 'what', 'where', 'here', 'some', 'such'
    ]);
    
    // Get top concepts (most frequent words excluding stop words)
    const topConcepts = Object.entries(wordCount)
      .filter(([word]) => !stopWords.has(word))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    
    // Create nodes and edges for top concepts
    topConcepts.forEach(([word, count], index) => {
      const conceptNode: KnowledgeNode = {
        id: uuidv4(),
        label: word.charAt(0).toUpperCase() + word.slice(1), // Capitalize
        type: NodeType.Concept,
        properties: {
          frequency: count,
          rank: index + 1
        },
        documentId,
        level: 1,
        confidence: Math.min(1.0, count / 100) // Simple confidence based on frequency
      };
      
      nodes.push(conceptNode);
      
      // Connect to document node
      const edge: KnowledgeEdge = {
        id: uuidv4(),
        source: documentNode.id,
        target: conceptNode.id,
        type: EdgeType.Mentions,
        weight: Math.min(1.0, count / 100), // Weight based on frequency
        documentId
      };
      
      edges.push(edge);
      
      // Try to find this concept in sentences to extract context
      const relatedSentences = sentences.filter(sentence => 
        sentence.toLowerCase().includes(word)
      );
      
      if (relatedSentences.length > 0) {
        conceptNode.context = relatedSentences[0]; // Use first sentence as context
      }
    });
    
    // Try to identify some related concepts
    for (let i = 0; i < topConcepts.length; i++) {
      const [word1] = topConcepts[i];
      const node1 = nodes.find(n => n.label.toLowerCase() === word1.charAt(0).toUpperCase() + word1.slice(1).toLowerCase());
      
      if (!node1) continue;
      
      // Check if any sentence contains both concepts
      for (let j = i + 1; j < topConcepts.length; j++) {
        const [word2] = topConcepts[j];
        const node2 = nodes.find(n => n.label.toLowerCase() === word2.charAt(0).toUpperCase() + word2.slice(1).toLowerCase());
        
        if (!node2) continue;
        
        // Find sentences containing both concepts
        const commonSentences = sentences.filter(sentence => 
          sentence.toLowerCase().includes(word1) && sentence.toLowerCase().includes(word2)
        );
        
        if (commonSentences.length > 0) {
          // Create relationship edge
          const relationEdge: KnowledgeEdge = {
            id: uuidv4(),
            source: node1.id,
            target: node2.id,
            type: EdgeType.Relates,
            weight: Math.min(1.0, commonSentences.length / 10), // Weight based on co-occurrence
            properties: {
              coOccurrences: commonSentences.length,
              context: commonSentences[0].substring(0, 100) + '...' // First occurrence as context
            },
            documentId
          };
          
          edges.push(relationEdge);
        }
      }
    }
    
    return { nodes, edges };
  }

  /**
   * Update a knowledge graph
   * @param id - Knowledge graph ID
   * @param data - Updated graph data
   * @returns Promise<KnowledgeGraph | undefined> - Updated knowledge graph or undefined if not found
   */
  public async updateKnowledgeGraph(id: string, data: Partial<KnowledgeGraph>): Promise<KnowledgeGraph | undefined> {
    try {
      const graph = this.graphs.get(id);
      if (!graph) {
        return undefined;
      }
      
      // Update fields
      const updatedGraph = {
        ...graph,
        ...data,
        updatedAt: new Date().toISOString()
      };
      
      // Update metadata
      if (updatedGraph.metadata) {
        updatedGraph.metadata.nodeCount = updatedGraph.nodes.length;
        updatedGraph.metadata.edgeCount = updatedGraph.edges.length;
      }
      
      // Save updated graph
      this.graphs.set(id, updatedGraph);
      
      return updatedGraph;
    } catch (error) {
      this.logger.error(`Error updating knowledge graph: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete a knowledge graph
   * @param id - Knowledge graph ID
   * @returns Promise<boolean> - True if deletion succeeded
   */
  public async deleteKnowledgeGraph(id: string): Promise<boolean> {
    try {
      const exists = this.graphs.has(id);
      if (!exists) {
        return false;
      }
      
      // Delete graph
      this.graphs.delete(id);
      
      return true;
    } catch (error) {
      this.logger.error(`Error deleting knowledge graph: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Search a knowledge graph
   * @param graphId - Knowledge graph ID
   * @param options - Search options
   * @returns Promise<GraphQueryResult> - Search results
   */
  public async searchGraph(graphId: string, options: GraphSearchOptions): Promise<GraphQueryResult> {
    try {
      const graph = this.graphs.get(graphId);
      if (!graph) {
        throw new Error(`Knowledge graph not found: ${graphId}`);
      }
      
      let nodes = [...graph.nodes];
      let edges = [...graph.edges];
      
      // Apply filters
      if (options.nodeTypes && options.nodeTypes.length > 0) {
        nodes = nodes.filter(node => options.nodeTypes!.includes(node.type));
      }
      
      if (options.edgeTypes && options.edgeTypes.length > 0) {
        edges = edges.filter(edge => options.edgeTypes!.includes(edge.type));
      }
      
      if (!options.includeHidden) {
        nodes = nodes.filter(node => !node.hidden);
        edges = edges.filter(edge => !edge.hidden);
      }
      
      // Text search
      if (options.query && options.query.trim() !== '') {
        const query = options.query.toLowerCase();
        nodes = nodes.filter(node => 
          node.label.toLowerCase().includes(query) || 
          node.context?.toLowerCase().includes(query) ||
          JSON.stringify(node.properties).toLowerCase().includes(query)
        );
        
        // Only include edges where both source and target nodes are included
        const nodeIds = new Set(nodes.map(node => node.id));
        edges = edges.filter(edge => 
          nodeIds.has(edge.source) && nodeIds.has(edge.target)
        );
      }
      
      // Handle start node traversal
      if (options.startNodeId) {
        const startNode = nodes.find(node => node.id === options.startNodeId);
        if (!startNode) {
          throw new Error(`Start node not found: ${options.startNodeId}`);
        }
        
        // Find connected nodes within maxDepth
        const connectedNodes = this.findConnectedNodes(
          options.startNodeId,
          nodes,
          edges,
          options.maxDepth || 2
        );
        
        nodes = nodes.filter(node => connectedNodes.has(node.id));
        
        // Only include edges where both source and target nodes are included
        const nodeIds = new Set(nodes.map(node => node.id));
        edges = edges.filter(edge => 
          nodeIds.has(edge.source) && nodeIds.has(edge.target)
        );
      }
      
      // Apply result limit
      if (options.maxResults && nodes.length > options.maxResults) {
        nodes = nodes.slice(0, options.maxResults);
        
        // Only include edges where both source and target nodes are included
        const nodeIds = new Set(nodes.map(node => node.id));
        edges = edges.filter(edge => 
          nodeIds.has(edge.source) && nodeIds.has(edge.target)
        );
      }
      
      return {
        nodes,
        edges,
        totalResults: nodes.length,
        hasMore: options.maxResults ? nodes.length >= options.maxResults : false
      };
    } catch (error) {
      this.logger.error(`Error searching knowledge graph: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find nodes connected to a start node within a specified depth
   * @param startNodeId - Starting node ID
   * @param allNodes - All nodes in the graph
   * @param allEdges - All edges in the graph
   * @param maxDepth - Maximum traversal depth
   * @returns Set<string> - Set of connected node IDs
   */
  private findConnectedNodes(
    startNodeId: string,
    allNodes: KnowledgeNode[],
    allEdges: KnowledgeEdge[],
    maxDepth: number
  ): Set<string> {
    const visited = new Set<string>([startNodeId]);
    const queue: Array<{nodeId: string, depth: number}> = [{nodeId: startNodeId, depth: 0}];
    
    while (queue.length > 0) {
      const {nodeId, depth} = queue.shift()!;
      
      // Stop if maximum depth reached
      if (depth >= maxDepth) {
        continue;
      }
      
      // Find all edges connected to this node
      const connectedEdges = allEdges.filter(edge => 
        edge.source === nodeId || edge.target === nodeId
      );
      
      // Add connected nodes to visited and queue
      for (const edge of connectedEdges) {
        const connectedNodeId = edge.source === nodeId ? edge.target : edge.source;
        
        if (!visited.has(connectedNodeId)) {
          visited.add(connectedNodeId);
          queue.push({nodeId: connectedNodeId, depth: depth + 1});
        }
      }
    }
    
    return visited;
  }
}

// Export singleton instance
export const knowledgeGraphService = new KnowledgeGraphService();