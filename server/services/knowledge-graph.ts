/**
 * Knowledge Graph Construction Service
 * 
 * Builds knowledge graphs from documents:
 * - Extract entities, concepts, and relationships
 * - Construct a graph representation of document knowledge
 * - Link related concepts across documents
 * - Detect hierarchical relationships between topics
 * - Support traversal and querying of knowledge
 */
import { ExtractionResult } from './document-extraction';
import { DocumentStructure, DocumentElement, StructureType } from './document-structure';
import { logger } from '../core/logger';
import { 
  KnowledgeGraphNode, 
  KnowledgeGraphEdge,
  InsertKnowledgeGraphNode,
  InsertKnowledgeGraphEdge 
} from '@shared/schema';
import { storage } from '../storage';

// Node types for knowledge graph
export enum NodeType {
  CONCEPT = 'concept',
  ENTITY = 'entity',
  TOPIC = 'topic',
  TERM = 'term',
  REFERENCE = 'reference',
  REQUIREMENT = 'requirement',
  PROCEDURE = 'procedure',
  SYSTEM = 'system',
  DOCUMENT = 'document'
}

// Edge relationships between nodes
export enum EdgeRelationship {
  RELATED_TO = 'related_to',
  PART_OF = 'part_of',
  HAS_PART = 'has_part',
  DERIVED_FROM = 'derived_from',
  REFERENCED_BY = 'referenced_by',
  REFERENCES = 'references',
  DEPENDS_ON = 'depends_on',
  PREREQUISITE_FOR = 'prerequisite_for',
  SIMILAR_TO = 'similar_to',
  CONTRASTS_WITH = 'contrasts_with',
  DEFINED_IN = 'defined_in',
  DEFINES = 'defines',
  SUCCEEDED_BY = 'succeeded_by',
  PRECEDES = 'precedes'
}

// Knowledge extraction result
export interface KnowledgeExtractionResult {
  documentId: number;
  nodes: Array<{
    id: string;
    type: NodeType;
    content: string;
    metadata?: Record<string, any>;
    importance: number;
    confidence: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    relationship: EdgeRelationship;
    weight: number;
    metadata?: Record<string, any>;
    confidence: number;
  }>;
  statistics: {
    nodeCount: number;
    edgeCount: number;
    averageNodeDegree: number;
    mostConnectedNodes: Array<{id: string, connections: number}>;
    processingTime: number;
  };
}

// Knowledge graph extraction options
export interface KnowledgeExtractionOptions {
  extractEntities?: boolean;
  extractConcepts?: boolean;
  extractRelationships?: boolean;
  minimumConfidence?: number;
  useExistingNodes?: boolean;
  connectToExistingGraph?: boolean;
  filterNodeTypes?: NodeType[];
  maxNodes?: number;
  maxEdgesPerNode?: number;
}

// Default options
const DEFAULT_OPTIONS: KnowledgeExtractionOptions = {
  extractEntities: true,
  extractConcepts: true,
  extractRelationships: true,
  minimumConfidence: 0.5,
  useExistingNodes: true,
  connectToExistingGraph: true,
  maxNodes: 100,
  maxEdgesPerNode: 20
};

// Entity extraction patterns
const ENTITY_PATTERNS: Record<string, RegExp> = {
  regulatoryReference: /([A-Z]{2,4}[-|\s]?[0-9]{1,4}[A-Z]?|Part\s[0-9]{1,4})/gi,
  aircraftType: /([A-Z]{1,2}[-|\s]?[0-9]{1,4}[A-Z]?|\b[A-Z][a-z]+\s[0-9]{2,3}[-|\/]?[0-9]{0,3})/g,
  systemComponent: /(\w+(\s\w+){0,3})\s(system|component|module|unit|assembly)/gi,
  procedureName: /(normal|abnormal|emergency|alternate|standard)\s(\w+(\s\w+){0,4})\s(procedure|checklist|operation)/gi,
  maneuver: /(\w+(\s\w+){0,3})\s(maneuver|manoeuvre|approach|departure|arrival)/gi,
  weatherCondition: /(vmc|imc|ifr|vfr|icing|turbulence|windshear|crosswind)/gi
};

// Typical aviation terms to detect as concepts
const AVIATION_CONCEPTS = [
  'takeoff', 'landing', 'approach', 'departure', 'cruise', 'climb', 'descent',
  'flaps', 'gear', 'thrust', 'power', 'speed', 'altitude', 'heading', 'course',
  'navigation', 'communication', 'transponder', 'autopilot', 'autothrottle',
  'flight plan', 'fuel', 'weight', 'balance', 'center of gravity', 'trim',
  'stall', 'v1', 'vr', 'v2', 'vref', 'vmca', 'vmcl', 'vmo', 'mmo', 'bank angle',
  'pitch', 'roll', 'yaw', 'rudder', 'aileron', 'elevator', 'stabilizer',
  'circuit breaker', 'checklist', 'caution', 'warning', 'advisory',
  'engine', 'hydraulic', 'electrical', 'pneumatic', 'environmental', 'pressurization',
  'oxygen', 'fire', 'icing', 'deicing', 'anti-ice', 'weather radar', 'tcas', 'egpws',
  'landing gear', 'brakes', 'nosewheel steering', 'flap', 'slat', 'spoiler',
  'thrust reverser', 'cowl', 'pylon', 'nacelle', 'inlet', 'exhaust', 'combustion',
  'compressor', 'turbine', 'rotor', 'stator', 'blade', 'fuel flow', 'oil pressure',
  'radio', 'navigation', 'vor', 'ils', 'gps', 'rnav', 'cdi', 'hsi', 'adf', 'dme',
  'altimeter', 'asi', 'vsi', 'attitude', 'heading', 'turn coordinator', 'compass',
  'mcp', 'fmc', 'cdu', 'efis', 'eicas', 'ecam', 'pfd', 'nd', 'sd', 'fma',
  'ceiling', 'visibility', 'wind', 'precipitation', 'fog', 'cloud', 'thunderstorm',
  'holding', 'procedure turn', 'circling', 'go-around', 'missed approach', 'diversion',
  'emergency', 'abnormal', 'alternate', 'evacuation', 'ditching', 'fire', 'failure'
];

// Term relationship patterns to detect
const RELATIONSHIP_PATTERNS = [
  { pattern: /is\s(a|an)\s(type\sof|part\sof)/, relationship: EdgeRelationship.PART_OF },
  { pattern: /contains|consists\sof|includes/, relationship: EdgeRelationship.HAS_PART },
  { pattern: /depends\son|requires/, relationship: EdgeRelationship.DEPENDS_ON },
  { pattern: /is\srequired\sfor|enables/, relationship: EdgeRelationship.PREREQUISITE_FOR },
  { pattern: /refers\sto|references/, relationship: EdgeRelationship.REFERENCES },
  { pattern: /is\sreferenced\sby|mentioned\sin/, relationship: EdgeRelationship.REFERENCED_BY },
  { pattern: /derived\sfrom|based\son/, relationship: EdgeRelationship.DERIVED_FROM },
  { pattern: /similar\sto|like|resembles/, relationship: EdgeRelationship.SIMILAR_TO },
  { pattern: /different\sfrom|unlike|contrasts\swith/, relationship: EdgeRelationship.CONTRASTS_WITH },
  { pattern: /defined\s(in|by)|described\sin/, relationship: EdgeRelationship.DEFINED_IN },
  { pattern: /defines|describes/, relationship: EdgeRelationship.DEFINES },
  { pattern: /followed\sby|leads\sto|precedes/, relationship: EdgeRelationship.PRECEDES },
  { pattern: /follows|comes\safter/, relationship: EdgeRelationship.SUCCEEDED_BY }
];

/**
 * Extract knowledge graph from a document
 */
export async function extractKnowledgeGraph(
  document: ExtractionResult | DocumentStructure,
  documentId: number,
  options: KnowledgeExtractionOptions = DEFAULT_OPTIONS
): Promise<KnowledgeExtractionResult> {
  const startTime = Date.now();
  
  try {
    // Initialize result structure
    const result: KnowledgeExtractionResult = {
      documentId,
      nodes: [],
      edges: [],
      statistics: {
        nodeCount: 0,
        edgeCount: 0,
        averageNodeDegree: 0,
        mostConnectedNodes: [],
        processingTime: 0
      }
    };
    
    // Extract text from document
    const text = extractTextFromDocument(document);
    
    // Extract document structure if available
    const structure = 'elements' in document ? document : null;
    
    // Extract entities if requested
    if (options.extractEntities !== false) {
      await extractEntities(text, structure, result);
    }
    
    // Extract concepts if requested
    if (options.extractConcepts !== false) {
      await extractConcepts(text, structure, result);
    }
    
    // Extract relationships if requested
    if (options.extractRelationships !== false) {
      extractRelationships(text, result);
    }
    
    // Connect document node to all extracted nodes
    const documentNodeId = createDocumentNode(documentId, text.substring(0, 100), result);
    
    // Connect to existing graph if requested
    if (options.connectToExistingGraph) {
      await connectToExistingGraph(result, documentId, options);
    }
    
    // Filter results based on confidence
    filterByConfidence(result, options.minimumConfidence || DEFAULT_OPTIONS.minimumConfidence || 0.5);
    
    // Limit the number of nodes and edges
    limitGraphSize(result, options);
    
    // Calculate statistics
    calculateStatistics(result);
    
    // Update processing time
    result.statistics.processingTime = Date.now() - startTime;
    
    return result;
  } catch (error) {
    logger.error('Error during knowledge graph extraction', { error, documentId });
    throw error;
  }
}

/**
 * Save extracted knowledge graph to the database
 */
export async function saveKnowledgeGraph(
  result: KnowledgeExtractionResult
): Promise<{
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}> {
  try {
    // Save nodes
    const savedNodes: KnowledgeGraphNode[] = [];
    for (const node of result.nodes) {
      const nodeData: InsertKnowledgeGraphNode = {
        content: node.content,
        nodeType: node.type,
        documentId: result.documentId,
        metadata: node.metadata || null
      };
      
      const savedNode = await storage.createKnowledgeGraphNode(nodeData);
      savedNodes.push(savedNode);
    }
    
    // Create a mapping from temporary IDs to database IDs
    const idMap = new Map<string, number>();
    result.nodes.forEach((node, index) => {
      idMap.set(node.id, savedNodes[index].id);
    });
    
    // Save edges
    const savedEdges: KnowledgeGraphEdge[] = [];
    for (const edge of result.edges) {
      const sourceId = idMap.get(edge.source);
      const targetId = idMap.get(edge.target);
      
      if (sourceId && targetId) {
        const edgeData: InsertKnowledgeGraphEdge = {
          sourceNodeId: sourceId,
          targetNodeId: targetId,
          relationship: edge.relationship,
          weight: edge.weight,
          metadata: edge.metadata || null
        };
        
        const savedEdge = await storage.createKnowledgeGraphEdge(edgeData);
        savedEdges.push(savedEdge);
      }
    }
    
    return { nodes: savedNodes, edges: savedEdges };
  } catch (error) {
    logger.error('Error saving knowledge graph', { error, documentId: result.documentId });
    throw error;
  }
}

/**
 * Extract text from a document
 */
function extractTextFromDocument(document: ExtractionResult | DocumentStructure): string {
  if ('text' in document) {
    return document.text;
  } else if ('elements' in document) {
    return document.elements.map(element => element.text).join(' ');
  }
  return '';
}

/**
 * Extract entities from text
 */
async function extractEntities(
  text: string,
  structure: DocumentStructure | null,
  result: KnowledgeExtractionResult
): Promise<void> {
  // Extract entities using patterns
  for (const [entityType, pattern] of Object.entries(ENTITY_PATTERNS)) {
    const matches = [...text.matchAll(pattern)];
    
    for (const match of matches) {
      const entityText = match[0].trim();
      if (entityText.length < 3) continue; // Skip very short entities
      
      // Convert entity type to node type
      let nodeType: NodeType;
      switch (entityType) {
        case 'regulatoryReference':
          nodeType = NodeType.REFERENCE;
          break;
        case 'systemComponent':
          nodeType = NodeType.SYSTEM;
          break;
        case 'procedureName':
          nodeType = NodeType.PROCEDURE;
          break;
        default:
          nodeType = NodeType.ENTITY;
      }
      
      // Generate a unique ID for the entity
      const nodeId = `entity_${entityType}_${entityText.replace(/\s+/g, '_').toLowerCase()}`;
      
      // Check if the entity already exists to avoid duplicates
      if (!result.nodes.some(node => node.id === nodeId)) {
        result.nodes.push({
          id: nodeId,
          type: nodeType,
          content: entityText,
          metadata: {
            entityType,
            position: match.index,
            matchGroup: match[0]
          },
          importance: calculateEntityImportance(entityText, entityType),
          confidence: 0.9 // Regex patterns have high confidence
        });
      }
    }
  }
  
  // Extract entities from structure if available
  if (structure) {
    extractEntitiesFromStructure(structure, result);
  }
}

/**
 * Extract entities from document structure
 */
function extractEntitiesFromStructure(
  structure: DocumentStructure,
  result: KnowledgeExtractionResult
): void {
  // Extract references from document elements
  const references = structure.elements.filter(
    el => el.type === StructureType.REFERENCE || el.type === StructureType.CITATION
  );
  
  for (const ref of references) {
    const nodeId = `entity_reference_${ref.text.replace(/\s+/g, '_').toLowerCase()}`;
    
    if (!result.nodes.some(node => node.id === nodeId)) {
      result.nodes.push({
        id: nodeId,
        type: NodeType.REFERENCE,
        content: ref.text,
        metadata: {
          entityType: 'reference',
          position: ref.metadata?.pageNumber,
          structureType: ref.type
        },
        importance: 0.8,
        confidence: 0.9
      });
    }
  }
  
  // Extract key-value pairs as entities
  const keyValues = structure.elements.filter(
    el => el.type === StructureType.KEY_VALUE
  );
  
  for (const kv of keyValues) {
    if (kv.text.includes(':')) {
      const [key, value] = kv.text.split(':', 2).map(s => s.trim());
      const nodeId = `entity_key_value_${key.replace(/\s+/g, '_').toLowerCase()}`;
      
      if (!result.nodes.some(node => node.id === nodeId)) {
        result.nodes.push({
          id: nodeId,
          type: NodeType.ENTITY,
          content: key,
          metadata: {
            entityType: 'key',
            value,
            position: kv.metadata?.pageNumber
          },
          importance: 0.7,
          confidence: 0.85
        });
      }
    }
  }
}

/**
 * Calculate importance score for entities
 */
function calculateEntityImportance(
  entityText: string,
  entityType: string
): number {
  // Base importance by entity type
  let importance = 0.5;
  
  switch (entityType) {
    case 'regulatoryReference':
      importance = 0.9;
      break;
    case 'aircraftType':
      importance = 0.85;
      break;
    case 'systemComponent':
      importance = 0.8;
      break;
    case 'procedureName':
      importance = 0.85;
      break;
    case 'maneuver':
      importance = 0.75;
      break;
    case 'weatherCondition':
      importance = 0.7;
      break;
  }
  
  // Adjust by text length (longer entities might be more specific)
  const lengthFactor = Math.min(entityText.length / 20, 1) * 0.1;
  importance += lengthFactor;
  
  // Cap at 1.0
  return Math.min(importance, 1.0);
}

/**
 * Extract concepts from text
 */
async function extractConcepts(
  text: string,
  structure: DocumentStructure | null,
  result: KnowledgeExtractionResult
): Promise<void> {
  // First, extract headings as concepts if structure is available
  if (structure) {
    extractConceptsFromStructure(structure, result);
  }
  
  // Extract aviation-specific concepts
  for (const concept of AVIATION_CONCEPTS) {
    // Look for the concept in the text
    const regex = new RegExp(`\\b${concept}\\b`, 'gi');
    const matches = [...text.matchAll(regex)];
    
    if (matches.length > 0) {
      const nodeId = `concept_${concept.replace(/\s+/g, '_').toLowerCase()}`;
      
      // Check if the concept already exists
      if (!result.nodes.some(node => node.id === nodeId)) {
        result.nodes.push({
          id: nodeId,
          type: NodeType.CONCEPT,
          content: concept,
          metadata: {
            occurrences: matches.length,
            positions: matches.map(m => m.index)
          },
          importance: calculateConceptImportance(concept, matches.length, text.length),
          confidence: 0.8
        });
      }
    }
  }
  
  // Extract key terms from text using frequency analysis
  const terms = extractKeyTerms(text);
  for (const [term, frequency] of Object.entries(terms)) {
    // Skip terms that are too short or already in our nodes
    if (term.length < 4 || result.nodes.some(node => 
      node.content.toLowerCase() === term.toLowerCase()
    )) {
      continue;
    }
    
    const nodeId = `term_${term.replace(/\s+/g, '_').toLowerCase()}`;
    
    result.nodes.push({
      id: nodeId,
      type: NodeType.TERM,
      content: term,
      metadata: {
        frequency
      },
      importance: calculateTermImportance(term, frequency, text.length),
      confidence: 0.7
    });
  }
}

/**
 * Extract concepts from document structure
 */
function extractConceptsFromStructure(
  structure: DocumentStructure,
  result: KnowledgeExtractionResult
): void {
  // Extract headings as topics
  const headings = structure.elements.filter(
    el => el.type === StructureType.HEADING
  );
  
  for (const heading of headings) {
    const nodeId = `topic_${heading.text.replace(/\s+/g, '_').toLowerCase()}`;
    
    if (!result.nodes.some(node => node.id === nodeId)) {
      result.nodes.push({
        id: nodeId,
        type: NodeType.TOPIC,
        content: heading.text,
        metadata: {
          level: heading.level,
          position: heading.metadata?.pageNumber
        },
        importance: calculateHeadingImportance(heading),
        confidence: 0.95
      });
    }
    
    // If this heading has a parent heading (in a hierarchy), add an edge
    if (heading.parent && heading.parent.type === StructureType.HEADING) {
      const parentId = `topic_${heading.parent.text.replace(/\s+/g, '_').toLowerCase()}`;
      
      if (result.nodes.some(node => node.id === parentId)) {
        result.edges.push({
          source: parentId,
          target: nodeId,
          relationship: EdgeRelationship.HAS_PART,
          weight: 0.9,
          confidence: 0.9
        });
      }
    }
  }
}

/**
 * Calculate importance score for headings
 */
function calculateHeadingImportance(heading: DocumentElement): number {
  // Higher-level headings are more important (level 1 = highest)
  const level = heading.level || 1;
  const levelImportance = 1 - ((level - 1) * 0.2);
  
  // Longer headings might be more specific and slightly less important as general topics
  const lengthFactor = Math.max(0, 1 - (heading.text.length / 50) * 0.2);
  
  // Combine factors
  return Math.max(0.3, Math.min(1.0, levelImportance * lengthFactor));
}

/**
 * Calculate importance score for concepts
 */
function calculateConceptImportance(
  concept: string,
  occurrences: number,
  textLength: number
): number {
  // Base importance - aviation concepts are important
  const baseImportance = 0.7;
  
  // More occurrences indicate higher importance
  const frequencyFactor = Math.min(occurrences / 10, 1) * 0.2;
  
  // Normalized by document length
  const normalizedFrequency = occurrences / (textLength / 1000);
  const normalizedFactor = Math.min(normalizedFrequency / 0.5, 1) * 0.1;
  
  return Math.min(baseImportance + frequencyFactor + normalizedFactor, 1.0);
}

/**
 * Calculate importance score for terms
 */
function calculateTermImportance(
  term: string,
  frequency: number,
  textLength: number
): number {
  // Base importance for terms
  const baseImportance = 0.5;
  
  // More occurrences indicate higher importance
  const frequencyFactor = Math.min(frequency / 15, 1) * 0.3;
  
  // Normalized by document length
  const normalizedFrequency = frequency / (textLength / 1000);
  const normalizedFactor = Math.min(normalizedFrequency / 0.8, 1) * 0.2;
  
  return Math.min(baseImportance + frequencyFactor + normalizedFactor, 1.0);
}

/**
 * Extract key terms from text using frequency analysis
 */
function extractKeyTerms(text: string): Record<string, number> {
  // Tokenize text into words
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3) // Skip small words
    .filter(word => !isStopWord(word)); // Skip stop words
  
  // Count word frequencies
  const wordFreq: Record<string, number> = {};
  for (const word of words) {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  }
  
  // Sort by frequency and take top terms
  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .reduce((obj, [term, freq]) => ({...obj, [term]: freq}), {});
}

/**
 * Check if a word is a stop word
 */
function isStopWord(word: string): boolean {
  const stopWords = [
    'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when',
    'at', 'from', 'by', 'on', 'off', 'for', 'in', 'out', 'over', 'to', 
    'into', 'with', 'about', 'against', 'between', 'during', 'without',
    'before', 'after', 'above', 'below', 'up', 'down', 'this', 'that',
    'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
    'should', 'can', 'could', 'may', 'might', 'must', 'of', 'also', 'as'
  ];
  return stopWords.includes(word);
}

/**
 * Extract relationships between entities and concepts
 */
function extractRelationships(
  text: string,
  result: KnowledgeExtractionResult
): void {
  const nodes = result.nodes;
  
  // Sort nodes by importance to prioritize important relationships
  const sortedNodes = [...nodes].sort((a, b) => b.importance - a.importance);
  
  // Create a mapping of content to node IDs
  const contentToId = new Map<string, string>();
  for (const node of nodes) {
    contentToId.set(node.content.toLowerCase(), node.id);
  }
  
  // Relationship extraction from text patterns
  for (const { pattern, relationship } of RELATIONSHIP_PATTERNS) {
    const matches = [...text.matchAll(pattern)];
    
    for (const match of matches) {
      // Look for node mentions in the 40 characters before and after the match
      const position = match.index || 0;
      const contextStart = Math.max(0, position - 40);
      const contextEnd = Math.min(text.length, position + match[0].length + 40);
      const context = text.substring(contextStart, contextEnd);
      
      // Identify nodes in the context
      const mentionedNodes: string[] = [];
      
      for (const node of sortedNodes) {
        if (context.toLowerCase().includes(node.content.toLowerCase())) {
          mentionedNodes.push(node.id);
          if (mentionedNodes.length >= 2) break; // We need at least two nodes for a relationship
        }
      }
      
      // If we found at least two nodes, create a relationship
      if (mentionedNodes.length >= 2) {
        result.edges.push({
          source: mentionedNodes[0],
          target: mentionedNodes[1],
          relationship,
          weight: 0.7,
          metadata: {
            context: match[0],
            fullContext: context
          },
          confidence: 0.7
        });
      }
    }
  }
  
  // Find co-occurrence relationships
  findCooccurrenceRelationships(text, result);
  
  // Connect hierarchical relationships between nodes
  connectHierarchicalNodes(result);
}

/**
 * Find co-occurrence relationships between nodes
 */
function findCooccurrenceRelationships(
  text: string,
  result: KnowledgeExtractionResult
): void {
  const nodes = result.nodes;
  const paragraphs = text.split(/\n\s*\n/);
  
  // Count co-occurrences within paragraphs
  const cooccurrences: Record<string, Record<string, number>> = {};
  
  for (const node of nodes) {
    cooccurrences[node.id] = {};
  }
  
  for (const paragraph of paragraphs) {
    const mentionedNodes: string[] = [];
    
    for (const node of nodes) {
      if (paragraph.toLowerCase().includes(node.content.toLowerCase())) {
        mentionedNodes.push(node.id);
      }
    }
    
    // Record co-occurrences
    for (let i = 0; i < mentionedNodes.length; i++) {
      for (let j = i + 1; j < mentionedNodes.length; j++) {
        const node1 = mentionedNodes[i];
        const node2 = mentionedNodes[j];
        
        cooccurrences[node1][node2] = (cooccurrences[node1][node2] || 0) + 1;
        cooccurrences[node2][node1] = (cooccurrences[node2][node1] || 0) + 1;
      }
    }
  }
  
  // Add edges for significant co-occurrences
  for (const [node1, connections] of Object.entries(cooccurrences)) {
    for (const [node2, count] of Object.entries(connections)) {
      if (count >= 2) { // Minimum co-occurrence threshold
        // Check if we already have a relationship between these nodes
        const existingEdge = result.edges.find(edge => 
          (edge.source === node1 && edge.target === node2) ||
          (edge.source === node2 && edge.target === node1)
        );
        
        if (!existingEdge) {
          result.edges.push({
            source: node1,
            target: node2,
            relationship: EdgeRelationship.RELATED_TO,
            weight: Math.min(count / 5, 1), // Scale weight by co-occurrence count
            metadata: {
              cooccurrenceCount: count
            },
            confidence: 0.6 + Math.min(count / 10, 0.3) // Higher confidence for more co-occurrences
          });
        }
      }
    }
  }
}

/**
 * Connect hierarchical nodes based on type and content
 */
function connectHierarchicalNodes(result: KnowledgeExtractionResult): void {
  const nodes = result.nodes;
  
  // Connect topics to relevant concepts
  const topics = nodes.filter(node => node.type === NodeType.TOPIC);
  const concepts = nodes.filter(node => node.type === NodeType.CONCEPT || node.type === NodeType.TERM);
  
  for (const topic of topics) {
    for (const concept of concepts) {
      // If the concept is mentioned in the topic or vice versa
      if (topic.content.toLowerCase().includes(concept.content.toLowerCase()) ||
          concept.content.toLowerCase().includes(topic.content.toLowerCase())) {
        
        result.edges.push({
          source: topic.id,
          target: concept.id,
          relationship: EdgeRelationship.HAS_PART,
          weight: 0.8,
          confidence: 0.8
        });
      }
    }
  }
  
  // Connect systems to procedures
  const systems = nodes.filter(node => node.type === NodeType.SYSTEM);
  const procedures = nodes.filter(node => node.type === NodeType.PROCEDURE);
  
  for (const system of systems) {
    for (const procedure of procedures) {
      // If the procedure mentions the system
      if (procedure.content.toLowerCase().includes(system.content.toLowerCase())) {
        result.edges.push({
          source: system.id,
          target: procedure.id,
          relationship: EdgeRelationship.REFERENCED_BY,
          weight: 0.85,
          confidence: 0.85
        });
      }
    }
  }
}

/**
 * Create a document node and connect it to all nodes
 */
function createDocumentNode(
  documentId: number,
  title: string,
  result: KnowledgeExtractionResult
): string {
  const documentNodeId = `document_${documentId}`;
  
  // Add document node
  result.nodes.push({
    id: documentNodeId,
    type: NodeType.DOCUMENT,
    content: title,
    metadata: {
      documentId
    },
    importance: 1.0,
    confidence: 1.0
  });
  
  // Connect document to all top-level nodes
  for (const node of result.nodes) {
    if (node.id !== documentNodeId) {
      result.edges.push({
        source: documentNodeId,
        target: node.id,
        relationship: EdgeRelationship.DEFINES,
        weight: 0.9,
        confidence: 0.9
      });
    }
  }
  
  return documentNodeId;
}

/**
 * Connect to existing knowledge graph nodes
 */
async function connectToExistingGraph(
  result: KnowledgeExtractionResult,
  documentId: number,
  options: KnowledgeExtractionOptions
): Promise<void> {
  try {
    // Get existing nodes from the database
    const existingNodes = await storage.getKnowledgeGraphNodes();
    
    if (existingNodes.length === 0) {
      return; // No existing nodes to connect to
    }
    
    // Map existing nodes content to IDs
    const existingContentToId = new Map<string, number>();
    const existingNodeMap = new Map<number, any>();
    
    for (const node of existingNodes) {
      // Skip nodes from the current document
      if (node.documentId === documentId) continue;
      
      existingContentToId.set(node.content.toLowerCase(), node.id);
      existingNodeMap.set(node.id, node);
    }
    
    // Check for similar nodes in current extraction
    for (const node of result.nodes) {
      // Skip the document node
      if (node.type === NodeType.DOCUMENT) continue;
      
      // Check for exact content match
      const exactMatch = existingContentToId.get(node.content.toLowerCase());
      
      if (exactMatch) {
        // Add edge to the existing node
        result.edges.push({
          source: node.id,
          target: `db_${exactMatch}`, // Prefix with db_ to indicate it's a database node
          relationship: EdgeRelationship.SIMILAR_TO,
          weight: 1.0,
          confidence: 0.95
        });
        continue;
      }
      
      // Check for similar content
      for (const [existingContent, existingId] of existingContentToId.entries()) {
        const similarity = calculateTextSimilarity(node.content.toLowerCase(), existingContent);
        
        if (similarity > 0.8) {
          result.edges.push({
            source: node.id,
            target: `db_${existingId}`,
            relationship: EdgeRelationship.SIMILAR_TO,
            weight: similarity,
            confidence: 0.8
          });
          
          // Only connect to the most similar existing node
          break;
        }
      }
    }
  } catch (error) {
    logger.error('Error connecting to existing graph', { error, documentId });
    // Continue without connections to existing graph
  }
}

/**
 * Calculate text similarity using Jaccard similarity of word sets
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  if (text1 === text2) return 1;
  if (!text1 || !text2) return 0;
  
  // Tokenize texts into word sets
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  // Handle empty sets
  if (words1.size === 0 || words2.size === 0) {
    return 0;
  }
  
  // Calculate intersection
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  
  // Calculate Jaccard similarity: intersection size / union size
  return intersection.size / (words1.size + words2.size - intersection.size);
}

/**
 * Filter result by confidence threshold
 */
function filterByConfidence(
  result: KnowledgeExtractionResult,
  threshold: number
): void {
  // Filter nodes
  result.nodes = result.nodes.filter(node => node.confidence >= threshold);
  
  // Get set of valid node IDs
  const validNodeIds = new Set(result.nodes.map(node => node.id));
  
  // Filter edges
  result.edges = result.edges.filter(edge => 
    edge.confidence >= threshold &&
    validNodeIds.has(edge.source) &&
    validNodeIds.has(edge.target)
  );
}

/**
 * Limit the graph size based on options
 */
function limitGraphSize(
  result: KnowledgeExtractionResult,
  options: KnowledgeExtractionOptions
): void {
  const maxNodes = options.maxNodes || DEFAULT_OPTIONS.maxNodes || 100;
  const maxEdgesPerNode = options.maxEdgesPerNode || DEFAULT_OPTIONS.maxEdgesPerNode || 20;
  
  // If we have more nodes than maxNodes, keep only the most important ones
  if (result.nodes.length > maxNodes) {
    result.nodes.sort((a, b) => b.importance - a.importance);
    result.nodes = result.nodes.slice(0, maxNodes);
    
    // Get set of valid node IDs
    const validNodeIds = new Set(result.nodes.map(node => node.id));
    
    // Filter edges to only those connecting to valid nodes
    result.edges = result.edges.filter(edge => 
      validNodeIds.has(edge.source) && validNodeIds.has(edge.target)
    );
  }
  
  // Limit the number of edges per node
  const edgesByNode: Record<string, any[]> = {};
  
  for (const node of result.nodes) {
    edgesByNode[node.id] = [];
  }
  
  for (const edge of result.edges) {
    edgesByNode[edge.source].push(edge);
  }
  
  // Keep only the strongest edges for each node
  const limitedEdges: typeof result.edges = [];
  
  for (const [nodeId, edges] of Object.entries(edgesByNode)) {
    if (edges.length > maxEdgesPerNode) {
      // Sort by weight and confidence
      edges.sort((a, b) => (b.weight * b.confidence) - (a.weight * a.confidence));
      limitedEdges.push(...edges.slice(0, maxEdgesPerNode));
    } else {
      limitedEdges.push(...edges);
    }
  }
  
  result.edges = limitedEdges;
}

/**
 * Calculate graph statistics
 */
function calculateStatistics(result: KnowledgeExtractionResult): void {
  const nodeCount = result.nodes.length;
  const edgeCount = result.edges.length;
  
  // Calculate node degrees
  const nodeDegrees: Record<string, number> = {};
  
  for (const node of result.nodes) {
    nodeDegrees[node.id] = 0;
  }
  
  for (const edge of result.edges) {
    nodeDegrees[edge.source]++;
    nodeDegrees[edge.target]++;
  }
  
  // Calculate average degree
  const totalDegree = Object.values(nodeDegrees).reduce((sum, degree) => sum + degree, 0);
  const averageNodeDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;
  
  // Find most connected nodes
  const mostConnected = Object.entries(nodeDegrees)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, connections]) => ({ id, connections }));
  
  // Update statistics
  result.statistics.nodeCount = nodeCount;
  result.statistics.edgeCount = edgeCount;
  result.statistics.averageNodeDegree = averageNodeDegree;
  result.statistics.mostConnectedNodes = mostConnected;
}