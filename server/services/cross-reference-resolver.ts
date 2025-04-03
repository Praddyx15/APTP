/**
 * Cross-Document Reference Resolver
 * 
 * This service identifies and resolves references between documents:
 * - Detects citations and references to other documents
 * - Links related content across the document corpus
 * - Builds a graph of document relationships
 * - Enhances knowledge retrieval with connected information
 */

import { ExtractionResult } from './document-extraction';
import { DocumentStructure, DocumentElement } from './document-structure';
import { DocumentContext, ContextualEntity } from './context-aware-parser';
import { KnowledgeExtractionResult } from './knowledge-graph';
import { storage } from '../storage';
import { logger } from '../core';

export interface DocumentReference {
  id: string;
  sourceDocumentId: number;
  targetDocumentId: number;
  referenceType: ReferenceType;
  sourceLocation: {
    section?: string;
    pageNumber?: number;
    offset?: number;
  };
  targetLocation?: {
    section?: string;
    pageNumber?: number;
    offset?: number;
  };
  confidence: number;
  text: string;
  extractedIdentifier?: string;
  resolvedTimestamp: Date;
  metadata?: Record<string, any>;
}

export enum ReferenceType {
  CITATION = 'citation',
  REGULATORY = 'regulatory',
  TECHNICAL = 'technical',
  SEE_ALSO = 'see_also',
  PREREQUISITE = 'prerequisite',
  SUPPLEMENTARY = 'supplementary',
  VERSION = 'version',
  AMENDMENT = 'amendment',
  DERIVED_FROM = 'derived_from'
}

export interface CrossReferenceIndex {
  documentId: number;
  documentTitle: string;
  references: {
    inbound: DocumentReference[];
    outbound: DocumentReference[];
  };
  lastUpdated: Date;
  statistics: {
    totalReferences: number;
    inboundCount: number;
    outboundCount: number;
    byType: Record<ReferenceType, number>;
  };
}

export interface CrossReferenceOptions {
  minConfidence?: number;
  maxReferencesPerDocument?: number;
  includeFullText?: boolean;
  resolveTargetContent?: boolean;
  detectImplicitReferences?: boolean;
  useSimilarityMatching?: boolean;
  similarityThreshold?: number;
}

const DEFAULT_OPTIONS: CrossReferenceOptions = {
  minConfidence: 0.6,
  maxReferencesPerDocument: 100,
  includeFullText: false,
  resolveTargetContent: true,
  detectImplicitReferences: true,
  useSimilarityMatching: true,
  similarityThreshold: 0.75
};

/**
 * Identify cross-document references
 */
export async function identifyCrossReferences(
  documentId: number,
  options: CrossReferenceOptions = DEFAULT_OPTIONS
): Promise<DocumentReference[]> {
  // Retrieve the document content
  const document = await storage.getDocument(documentId);
  if (!document) {
    throw new Error(`Document not found: ${documentId}`);
  }

  let documentContent = '';
  let documentStructure: DocumentStructure | null = null;
  
  // Get the latest version content
  if (document.currentVersionId) {
    const version = await storage.getDocumentVersion(document.currentVersionId);
    if (version && version.content) {
      documentContent = version.content.toString();
    }
  }
  
  if (!documentContent) {
    throw new Error(`No content available for document: ${documentId}`);
  }
  
  // Identify references in the document
  const references: DocumentReference[] = [];
  
  // Get all documents for matching references
  const allDocuments = await storage.getAllDocuments();
  
  // 1. Look for explicit references by title
  await identifyExplicitReferences(documentId, document.title, documentContent, allDocuments, references);
  
  // 2. Look for regulatory references
  identifyRegulatoryReferences(documentId, documentContent, references);
  
  // 3. Look for standard citation patterns
  identifyCitationPatterns(documentId, documentContent, references);
  
  // 4. Process detected references
  const processedReferences = processReferences(references, options);
  
  // 5. Resolve target documents
  if (options.resolveTargetContent) {
    await resolveTargetDocuments(processedReferences, allDocuments);
  }
  
  return processedReferences;
}

/**
 * Build a cross-reference index for the document corpus
 */
export async function buildCrossReferenceIndex(
  options: CrossReferenceOptions = DEFAULT_OPTIONS
): Promise<Map<number, CrossReferenceIndex>> {
  const indexMap = new Map<number, CrossReferenceIndex>();
  
  // Get all documents
  const allDocuments = await storage.getAllDocuments();
  
  // Process each document
  for (const document of allDocuments) {
    logger.info(`Building cross-reference index for document: ${document.id} - ${document.title}`);
    
    try {
      // Initialize the index for this document
      const index: CrossReferenceIndex = {
        documentId: document.id,
        documentTitle: document.title,
        references: {
          inbound: [],
          outbound: []
        },
        lastUpdated: new Date(),
        statistics: {
          totalReferences: 0,
          inboundCount: 0,
          outboundCount: 0,
          byType: Object.values(ReferenceType).reduce((acc, type) => {
            acc[type] = 0;
            return acc;
          }, {} as Record<ReferenceType, number>)
        }
      };
      
      // Identify outbound references for this document
      const outboundReferences = await identifyCrossReferences(document.id, options);
      index.references.outbound = outboundReferences;
      index.statistics.outboundCount = outboundReferences.length;
      
      // Track references by type
      for (const ref of outboundReferences) {
        index.statistics.byType[ref.referenceType]++;
      }
      
      indexMap.set(document.id, index);
    } catch (error) {
      logger.error(`Error processing document ${document.id} for cross-reference index`, { error });
    }
  }
  
  // Process inbound references
  for (const [documentId, index] of indexMap.entries()) {
    // Find all references where this document is the target
    for (const [otherDocId, otherIndex] of indexMap.entries()) {
      if (documentId === otherDocId) continue;
      
      // Find references from other documents to this one
      const inboundFromOther = otherIndex.references.outbound.filter(
        ref => ref.targetDocumentId === documentId
      );
      
      // Add to this document's inbound references
      index.references.inbound.push(...inboundFromOther);
    }
    
    // Update statistics
    index.statistics.inboundCount = index.references.inbound.length;
    index.statistics.totalReferences = index.statistics.inboundCount + index.statistics.outboundCount;
  }
  
  return indexMap;
}

/**
 * Get cross-document references for a specific document
 */
export async function getDocumentReferences(
  documentId: number,
  options: CrossReferenceOptions = DEFAULT_OPTIONS
): Promise<{inbound: DocumentReference[], outbound: DocumentReference[]}> {
  // Identify outbound references from this document
  const outboundReferences = await identifyCrossReferences(documentId, options);
  
  // Find inbound references to this document from other documents
  const inboundReferences: DocumentReference[] = [];
  
  // Get all documents
  const allDocuments = await storage.getAllDocuments();
  
  // Check each other document for references to this one
  for (const otherDoc of allDocuments) {
    if (otherDoc.id === documentId) continue;
    
    try {
      // Look for references to the current document
      const refsFromOther = await identifyCrossReferences(otherDoc.id, options);
      
      // Filter for references to the target document
      const inboundFromOther = refsFromOther.filter(
        ref => ref.targetDocumentId === documentId
      );
      
      inboundReferences.push(...inboundFromOther);
    } catch (error) {
      logger.error(`Error checking document ${otherDoc.id} for references to ${documentId}`, { error });
    }
  }
  
  return {
    inbound: inboundReferences,
    outbound: outboundReferences
  };
}

/**
 * Visualize the cross-reference graph for a set of documents
 */
export function generateCrossReferenceGraph(
  references: DocumentReference[],
  documentMap: Map<number, { id: number, title: string }>
): { nodes: any[], edges: any[] } {
  const nodes: any[] = [];
  const edges: any[] = [];
  const nodeSet = new Set<number>();
  
  // Create nodes for all documents
  for (const [id, doc] of documentMap.entries()) {
    nodeSet.add(id);
    nodes.push({
      id: id.toString(),
      label: doc.title,
      type: 'document'
    });
  }
  
  // Create edges for all references
  for (const ref of references) {
    const sourceId = ref.sourceDocumentId;
    const targetId = ref.targetDocumentId;
    
    // Ensure both documents exist in our node set
    if (!nodeSet.has(sourceId) || !nodeSet.has(targetId)) {
      continue;
    }
    
    edges.push({
      id: ref.id,
      source: sourceId.toString(),
      target: targetId.toString(),
      label: ref.referenceType,
      type: ref.referenceType
    });
  }
  
  return { nodes, edges };
}

/**
 * Identify explicit references to other documents
 */
async function identifyExplicitReferences(
  sourceDocId: number,
  sourceTitle: string,
  content: string,
  allDocuments: any[],
  references: DocumentReference[]
): Promise<void> {
  // For each other document, look for references to its title
  for (const targetDoc of allDocuments) {
    // Skip self-references
    if (targetDoc.id === sourceDocId) {
      continue;
    }
    
    const targetTitle = targetDoc.title;
    if (!targetTitle || targetTitle.length < 4) {
      continue; // Skip documents with very short titles to avoid false positives
    }
    
    // Check for exact title matches
    const exactRegex = new RegExp(`"${escapeRegExp(targetTitle)}"`, 'gi');
    const exactMatches = [...content.matchAll(exactRegex)];
    
    for (const match of exactMatches) {
      addReferenceFromMatch(
        sourceDocId,
        targetDoc.id,
        match,
        ReferenceType.CITATION,
        0.9,
        references
      );
    }
    
    // Check for title references with "see" or similar language
    const refRegex = new RegExp(`(see|refer to|in|as described in|according to)\\s+["']?${escapeRegExp(targetTitle)}["']?`, 'gi');
    const refMatches = [...content.matchAll(refRegex)];
    
    for (const match of refMatches) {
      addReferenceFromMatch(
        sourceDocId,
        targetDoc.id,
        match,
        ReferenceType.SEE_ALSO,
        0.85,
        references
      );
    }
    
    // Check for version or amendment references
    const versionRegex = new RegExp(`(version|revision|amendment|update)\\s+(of|to)\\s+["']?${escapeRegExp(targetTitle)}["']?`, 'gi');
    const versionMatches = [...content.matchAll(versionRegex)];
    
    for (const match of versionMatches) {
      const refType = match[1].toLowerCase().includes('version') || match[1].toLowerCase().includes('revision')
        ? ReferenceType.VERSION
        : ReferenceType.AMENDMENT;
        
      addReferenceFromMatch(
        sourceDocId,
        targetDoc.id,
        match,
        refType,
        0.8,
        references
      );
    }
  }
}

/**
 * Identify regulatory references
 */
function identifyRegulatoryReferences(
  sourceDocId: number,
  content: string,
  references: DocumentReference[]
): void {
  // Common regulatory reference patterns
  const regulatoryPatterns = [
    // FAA FARs
    {
      pattern: /\b(14 CFR\s+|\bFAR\s+)?Part\s+(\d+)(\.\d+)*\b/gi,
      confidence: 0.85
    },
    // FAA Advisory Circulars
    {
      pattern: /\bAC\s+(\d+-\d+[A-Z]?)\b/g,
      confidence: 0.9
    },
    // EASA regulations
    {
      pattern: /\bEASA\s+(Part-[A-Z]+|CS-[A-Z]+|AMC-[A-Z]+)\b/g,
      confidence: 0.9
    },
    // ICAO annexes
    {
      pattern: /\bICAO\s+Annex\s+(\d+)\b/gi,
      confidence: 0.9
    },
    // Transport Canada
    {
      pattern: /\bCAR\s+(\d+)(\.\d+)*\b/gi,
      confidence: 0.85
    },
    // UK CAA
    {
      pattern: /\bCAP\s+(\d+)\b/gi,
      confidence: 0.85
    },
    // Generic section references
    {
      pattern: /\b§\s*(\d+)(\.\d+)*\b/g,
      confidence: 0.7
    }
  ];
  
  for (const { pattern, confidence } of regulatoryPatterns) {
    const matches = [...content.matchAll(pattern)];
    
    for (const match of matches) {
      // For regulatory references, we don't have a specific target document ID
      // So we set it to -1 as a marker for an external reference
      addReferenceFromMatch(
        sourceDocId,
        -1, // External reference
        match,
        ReferenceType.REGULATORY,
        confidence,
        references,
        match[0] // Save the regulation identifier
      );
    }
  }
}

/**
 * Identify standard citation patterns
 */
function identifyCitationPatterns(
  sourceDocId: number,
  content: string,
  references: DocumentReference[]
): void {
  // Common citation patterns
  const citationPatterns = [
    // Academic-style citations (Author, Year)
    {
      pattern: /\(([A-Z][a-z]+(\s+et\s+al\.)?),\s+(\d{4})\)/g,
      confidence: 0.8,
      type: ReferenceType.CITATION
    },
    // Footnote-style citations [1], [2], etc.
    {
      pattern: /\[(\d+)\]/g,
      confidence: 0.7,
      type: ReferenceType.CITATION
    },
    // IEEE-style citations
    {
      pattern: /\[\d+\]/g,
      confidence: 0.75,
      type: ReferenceType.CITATION
    },
    // Title-based citations "Title of Document"
    {
      pattern: /"([^"]{10,})"/g,
      confidence: 0.6,
      type: ReferenceType.CITATION
    },
    // URL citations
    {
      pattern: /https?:\/\/[^\s)]+/g,
      confidence: 0.9,
      type: ReferenceType.SUPPLEMENTARY
    }
  ];
  
  for (const { pattern, confidence, type } of citationPatterns) {
    const matches = [...content.matchAll(pattern)];
    
    for (const match of matches) {
      // For citation patterns, we don't have a specific target document ID
      // So we set it to -1 as a marker for a reference that needs resolution
      addReferenceFromMatch(
        sourceDocId,
        -1, // Unknown target, needs resolution
        match,
        type,
        confidence,
        references,
        match[0] // Save the citation text for later resolution
      );
    }
  }
}

/**
 * Add a reference from a regex match
 */
function addReferenceFromMatch(
  sourceDocId: number,
  targetDocId: number,
  match: RegExpMatchArray,
  refType: ReferenceType,
  confidence: number,
  references: DocumentReference[],
  identifier?: string
): void {
  const matchText = match[0];
  const matchPos = match.index || 0;
  
  // Create a unique ID
  const refId = `ref-${sourceDocId}-${targetDocId}-${matchPos}`;
  
  // Add the reference
  references.push({
    id: refId,
    sourceDocumentId: sourceDocId,
    targetDocumentId: targetDocId,
    referenceType: refType,
    sourceLocation: {
      offset: matchPos
    },
    confidence,
    text: matchText,
    extractedIdentifier: identifier,
    resolvedTimestamp: new Date()
  });
}

/**
 * Process references based on options
 */
function processReferences(
  references: DocumentReference[],
  options: CrossReferenceOptions
): DocumentReference[] {
  // Filter by confidence
  let processed = references.filter(ref => 
    ref.confidence >= (options.minConfidence || DEFAULT_OPTIONS.minConfidence!)
  );
  
  // Sort by confidence
  processed.sort((a, b) => b.confidence - a.confidence);
  
  // Limit the number of references
  if (options.maxReferencesPerDocument) {
    processed = processed.slice(0, options.maxReferencesPerDocument);
  }
  
  return processed;
}

/**
 * Resolve target documents for references
 */
async function resolveTargetDocuments(
  references: DocumentReference[],
  allDocuments: any[]
): Promise<void> {
  // Create a map for efficient document lookup
  const documentMap = new Map<number, any>();
  for (const doc of allDocuments) {
    documentMap.set(doc.id, doc);
  }
  
  // Resolve each reference
  for (const ref of references) {
    // Skip already resolved references
    if (ref.targetDocumentId > 0 && documentMap.has(ref.targetDocumentId)) {
      continue;
    }
    
    // Skip external references (regulatory references)
    if (ref.targetDocumentId === -1 && ref.referenceType === ReferenceType.REGULATORY) {
      continue;
    }
    
    // Try to resolve by citation or identifier
    if (ref.extractedIdentifier) {
      await resolveByCitation(ref, allDocuments);
    }
  }
}

/**
 * Resolve a reference by citation or identifier
 */
async function resolveByCitation(
  reference: DocumentReference,
  allDocuments: any[]
): Promise<void> {
  if (!reference.extractedIdentifier) {
    return;
  }
  
  const citation = reference.extractedIdentifier;
  
  // Check if it's an author/year citation
  const authorYearMatch = citation.match(/\(([A-Z][a-z]+(\s+et\s+al\.)?),\s+(\d{4})\)/);
  if (authorYearMatch) {
    const author = authorYearMatch[1];
    const year = authorYearMatch[3];
    
    // Look for document with matching metadata
    for (const doc of allDocuments) {
      if (doc.metadata && doc.metadata.author && doc.metadata.year) {
        if (doc.metadata.author.includes(author) && doc.metadata.year === year) {
          reference.targetDocumentId = doc.id;
          return;
        }
      }
    }
  }
  
  // Check if it's a numbered citation
  const numberedMatch = citation.match(/\[(\d+)\]/);
  if (numberedMatch) {
    // Numbered citations are difficult to resolve without context
    // This would require analyzing the references/bibliography section
    // For now, we leave it unresolved
    return;
  }
  
  // Check if it's a title citation
  const titleMatch = citation.match(/"([^"]{10,})"/);
  if (titleMatch) {
    const citedTitle = titleMatch[1];
    
    // Look for document with similar title
    for (const doc of allDocuments) {
      if (doc.title && calculateStringSimilarity(citedTitle, doc.title) > 0.8) {
        reference.targetDocumentId = doc.id;
        return;
      }
    }
  }
  
  // Check if it's a URL citation
  const urlMatch = citation.match(/https?:\/\/[^\s)]+/);
  if (urlMatch) {
    const url = urlMatch[0];
    
    // Look for document with matching URL
    for (const doc of allDocuments) {
      if (doc.url && doc.url === url) {
        reference.targetDocumentId = doc.id;
        return;
      }
    }
    
    // Create the reference as an external link
    reference.targetDocumentId = -2; // Special marker for external URL
    reference.metadata = { ...(reference.metadata || {}), url };
  }
}

/**
 * Calculate string similarity (Jaccard index of word sets)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().split(/\W+/).filter(w => w.length > 1));
  const words2 = new Set(str2.toLowerCase().split(/\W+/).filter(w => w.length > 1));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Escape special characters in string for use in regex
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract content fragment around a match position
 */
function extractContextFragment(text: string, position: number, length: number = 150): string {
  const startPos = Math.max(0, position - length / 2);
  const endPos = Math.min(text.length, position + length / 2);
  
  let fragment = text.substring(startPos, endPos);
  
  if (startPos > 0) {
    fragment = '...' + fragment;
  }
  
  if (endPos < text.length) {
    fragment = fragment + '...';
  }
  
  return fragment;
}