/**
 * Types for knowledge graph implementation
 */

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