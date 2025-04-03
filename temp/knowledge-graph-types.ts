// Types related to knowledge graph generation and visualization

/**
 * Knowledge graph node
 */
export interface DocumentNode {
  id: string;
  label: string;
  type: string; // concept, fact, procedure, etc.
  data?: Record<string, any>;
  position?: { x: number; y: number };
}

/**
 * Knowledge graph edge
 */
export interface DocumentEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  data?: Record<string, any>;
}

/**
 * Knowledge graph with nodes and edges
 */
export interface KnowledgeGraph {
  nodes: DocumentNode[];
  edges: DocumentEdge[];
}

/**
 * Parsed document with extracted content
 */
export interface ParsedDocument {
  title: string;
  content: string;
  sections: DocumentSection[];
  metadata: DocumentMetadata;
  keywords: string[];
}

/**
 * Document section with nested structure
 */
export interface DocumentSection {
  id: string;
  title: string;
  content: string;
  level: number;
  parent?: string;
  children?: DocumentSection[];
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  author?: string;
  creationDate?: string;
  lastModified?: string;
  pageCount?: number;
  keywords?: string[];
  title?: string;
  subject?: string;
  fileType?: string;
  fileSize?: number;
}

/**
 * Knowledge graph node as stored in the database
 */
export interface KnowledgeGraphNode {
  id: number;
  documentId: number;
  nodeId: string;
  label: string;
  type: string;
  data: Record<string, any>;
  position: { x: number; y: number };
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Knowledge graph edge as stored in the database
 */
export interface KnowledgeGraphEdge {
  id: number;
  documentId: number;
  edgeId: string;
  sourceId: string;
  targetId: string;
  label: string;
  data: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Knowledge graph visualization settings
 */
export interface KnowledgeGraphVisualizationSettings {
  layout: 'force' | 'hierarchical' | 'radial';
  nodeSize: number;
  nodeSizeByDegree: boolean;
  edgeWidth: number;
  showLabels: boolean;
  colorScheme: string;
  physics: boolean;
  clustering: boolean;
}

/**
 * Knowledge graph filters
 */
export interface KnowledgeGraphFilters {
  nodeTypes?: string[];
  edgeTypes?: string[];
  keywords?: string[];
  minConnections?: number;
  maxConnections?: number;
}

/**
 * Knowledge graph query
 */
export interface KnowledgeGraphQuery {
  query: string;
  filters?: KnowledgeGraphFilters;
  limit?: number;
  includeNeighbors?: boolean;
  depthLevel?: number;
}

/**
 * Knowledge graph query result
 */
export interface KnowledgeGraphQueryResult {
  graph: KnowledgeGraph;
  matchingNodes: string[];
  matchingEdges: string[];
  score: number;
  executionTime: number;
}
