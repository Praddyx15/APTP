/**
 * Types for knowledge graph implementation
 */

export interface KnowledgeNode {
  id: string;
  label: string;
  type: NodeType;
  properties?: {
    [key: string]: any;
  };
  documentId?: number;
  parentId?: string;
  position?: {
    x: number;
    y: number;
  };
  level?: number;
  confidence?: number;
  context?: string;
  timestamp?: string;
  group?: string;
  category?: string;
  weight?: number;
  hidden?: boolean;
}

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type: EdgeType;
  properties?: {
    [key: string]: any;
  };
  weight?: number;
  confidence?: number;
  bidirectional?: boolean;
  timestamp?: string;
  documentId?: number;
  hidden?: boolean;
}

export enum NodeType {
  Concept = 'concept',
  Entity = 'entity',
  Procedure = 'procedure',
  Regulation = 'regulation',
  Topic = 'topic',
  Task = 'task',
  Aircraft = 'aircraft',
  AircraftSystem = 'aircraft_system',
  AircraftComponent = 'aircraft_component',
  ManeuverPhase = 'maneuver_phase',
  Condition = 'condition',
  Performance = 'performance',
  Limitation = 'limitation',
  Emergency = 'emergency',
  FlightPhase = 'flight_phase',
  TrainingObjective = 'training_objective',
  Location = 'location',
  Airport = 'airport',
  AircraftType = 'aircraft_type',
  Person = 'person',
  Organization = 'organization',
  Document = 'document'
}

export enum EdgeType {
  Relates = 'relates',
  Contains = 'contains',
  Requires = 'requires',
  Causes = 'causes',
  Follows = 'follows',
  Precedes = 'precedes',
  Implements = 'implements',
  PartOf = 'part_of',
  ComposedOf = 'composed_of',
  HasPhase = 'has_phase',
  HasComponent = 'has_component',
  HasProcedure = 'has_procedure',
  ReferencedIn = 'referenced_in',
  Influences = 'influences',
  Authorizes = 'authorizes',
  Restricts = 'restricts',
  Supersedes = 'supersedes',
  DependsOn = 'depends_on',
  UsedFor = 'used_for',
  LocatedAt = 'located_at',
  ManagedBy = 'managed_by',
  ResponsibleFor = 'responsible_for',
  DerivedFrom = 'derived_from',
  Mentions = 'mentions'
}

export interface KnowledgeGraph {
  id: string;
  name: string;
  description?: string;
  documentIds: number[];
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  metadata?: {
    version?: string;
    domainSpecific?: boolean;
    status?: 'draft' | 'complete' | 'updated' | 'archived';
    nodeCount?: number;
    edgeCount?: number;
    lastAnalyzedAt?: string;
    tags?: string[];
    [key: string]: any;
  };
}

export interface GraphSearchOptions {
  query?: string;
  nodeTypes?: NodeType[];
  edgeTypes?: EdgeType[];
  documentIds?: number[];
  startNodeId?: string;
  maxDepth?: number;
  maxResults?: number;
  includeHidden?: boolean;
}

export interface GraphQueryResult {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  subGraphId?: string;
  totalResults: number;
  hasMore: boolean;
}

export interface NodeSearchResult {
  node: KnowledgeNode;
  score: number;
  documentIds?: number[];
  relatedNodeCount: number;
}

export interface GraphStatistics {
  nodeCount: number;
  edgeCount: number;
  nodeTypeDistribution: {
    [key in NodeType]?: number;
  };
  edgeTypeDistribution: {
    [key in EdgeType]?: number;
  };
  documentCoverage: {
    documentId: number;
    nodeCount: number;
    edgeCount: number;
  }[];
  densityScore: number;
  connectivityScore: number;
  avgNodeDegree: number;
  clusterCount: number;
}

export interface GraphUpdateOperation {
  addNodes?: KnowledgeNode[];
  updateNodes?: KnowledgeNode[];
  removeNodeIds?: string[];
  addEdges?: KnowledgeEdge[];
  updateEdges?: KnowledgeEdge[];
  removeEdgeIds?: string[];
}

export interface GraphMergeOptions {
  sourceGraphId: string;
  targetGraphId: string;
  conflictResolution: 'sourceOverwrite' | 'targetOverwrite' | 'keepBoth' | 'skipConflicts';
  mergeMetadata: boolean;
  includeOrphaned: boolean;
}

export interface GraphExportOptions {
  format: 'json' | 'graphml' | 'csv' | 'neo4j' | 'visjs';
  includeMetadata: boolean;
  includeHidden: boolean;
  documentIds?: number[];
  nodeTypes?: NodeType[];
  edgeTypes?: EdgeType[];
}

export enum GraphLayoutAlgorithm {
  ForceDirected = 'force_directed',
  Circular = 'circular',
  Hierarchical = 'hierarchical',
  Grid = 'grid',
  Radial = 'radial'
}

export interface GraphVisualizationOptions {
  layout: GraphLayoutAlgorithm;
  nodeFilters?: {
    types?: NodeType[];
    minWeight?: number;
    minConfidence?: number;
    specific?: string[];
  };
  edgeFilters?: {
    types?: EdgeType[];
    minWeight?: number;
    minConfidence?: number;
  };
  groupByType: boolean;
  showLabels: boolean;
  expandedNodeIds?: string[];
  highlightedPath?: string[];
  focusNodeId?: string;
  maxNodesVisible?: number;
  colorScheme?: string;
}

export interface KnowledgeQuery {
  type: 'path' | 'neighborhood' | 'pattern';
  query: string;
  params?: { [key: string]: any };
  constraints?: {
    nodeTypes?: NodeType[];
    edgeTypes?: EdgeType[];
    minConfidence?: number;
    maxDepth?: number;
  };
}

export interface GraphDifference {
  addedNodes: KnowledgeNode[];
  removedNodes: KnowledgeNode[];
  modifiedNodes: Array<{ before: KnowledgeNode; after: KnowledgeNode }>;
  addedEdges: KnowledgeEdge[];
  removedEdges: KnowledgeEdge[];
  modifiedEdges: Array<{ before: KnowledgeEdge; after: KnowledgeEdge }>;
}

export interface GraphVersion {
  id: string;
  graphId: string;
  version: string;
  description?: string;
  timestamp: string;
  createdBy: number;
  nodeCount: number;
  edgeCount: number;
  changes?: GraphDifference;
}

export interface GraphValidationResult {
  isValid: boolean;
  errors: {
    type: 'node' | 'edge';
    id: string;
    message: string;
    severity: 'warning' | 'error';
  }[];
  warnings: {
    type: string;
    message: string;
    affectedIds?: string[];
  }[];
  orphanedNodes?: string[];
  danglingEdges?: string[];
  duplicateNodeIds?: string[];
  duplicateEdgeIds?: string[];
}

export interface KnowledgeGraphRule {
  id: string;
  name: string;
  description?: string;
  nodeTypeConstraints?: {
    [key in NodeType]?: {
      requiredProperties?: string[];
      allowedEdges?: EdgeType[];
      maxOutgoing?: number;
      maxIncoming?: number;
    };
  };
  edgeTypeConstraints?: {
    [key in EdgeType]?: {
      allowedSourceTypes?: NodeType[];
      allowedTargetTypes?: NodeType[];
      requiredProperties?: string[];
      symmetric?: boolean;
      transitive?: boolean;
    };
  };
  structuralRules?: {
    noCycles?: boolean;
    maxDepth?: number;
    requireConnected?: boolean;
  };
}

export interface GraphEmbedding {
  nodeId: string;
  vector: number[];
  dimension: number;
  algorithm: string;
  timestamp: string;
}

export interface SimilarNodeResult {
  nodeId: string;
  similarity: number;
  node: KnowledgeNode;
}

export interface GraphCluster {
  id: string;
  nodes: string[];
  centroidId?: string;
  size: number;
  cohesion: number;
  label?: string;
}

export interface KnowledgeInference {
  id: string;
  description: string;
  confidence: number;
  derivation: {
    sourceNodeIds: string[];
    sourceEdgeIds: string[];
    rules: string[];
  };
  suggestedNodes?: KnowledgeNode[];
  suggestedEdges?: KnowledgeEdge[];
  timestamp: string;
  validated: boolean;
  validatedBy?: number;
}

export interface PathQuery {
  startNodeId: string;
  endNodeId: string;
  maxDepth?: number;
  edgeTypes?: EdgeType[];
  nodeTypes?: NodeType[];
  excludeNodeIds?: string[];
  algorithm?: 'shortest' | 'all' | 'weighted';
}

export interface PathResult {
  paths: Array<{
    nodes: string[];
    edges: string[];
    length: number;
    weight?: number;
  }>;
  totalPaths: number;
}

export interface SubgraphQuery {
  nodeIds: string[];
  includeEdges: boolean;
  expandByHops?: number;
}
