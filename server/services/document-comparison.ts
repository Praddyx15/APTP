/**
 * Document Comparison Service
 * 
 * Provides document comparison capabilities:
 * - Side-by-side text comparison
 * - Element-level change detection
 * - Structural differences highlighting
 * - Content similarity scoring
 * - Version difference tracking
 */

import { ExtractionResult } from './document-extraction';
import { DocumentElement, DocumentStructure, StructureType } from './document-structure';
import { logger } from '../core/logger';

export enum ChangeType {
  ADDED = 'added',
  REMOVED = 'removed',
  MODIFIED = 'modified',
  MOVED = 'moved',
  UNCHANGED = 'unchanged'
}

export enum ChangeSignificance {
  MAJOR = 'major',
  MINOR = 'minor',
  TRIVIAL = 'trivial'
}

export interface ElementChange {
  type: ChangeType;
  significance: ChangeSignificance;
  elementType: StructureType;
  before?: DocumentElement;
  after?: DocumentElement;
  position?: {
    before: number;
    after: number;
  };
  content?: {
    before?: string;
    after?: string;
  };
  similarity?: number;
  metadata?: Record<string, any>;
}

export interface DocumentComparison {
  timestamp: Date;
  overallSimilarity: number;
  structureSimilarity: number;
  contentSimilarity: number;
  changes: ElementChange[];
  summary: {
    total: number;
    added: number;
    removed: number;
    modified: number;
    moved: number;
    unchanged: number;
    major: number;
    minor: number;
    trivial: number;
  };
  statistics: {
    addedChars: number;
    removedChars: number;
    changedChars: number;
    processingTime: number;
  };
  impactAnalysis?: {
    category: string;
    severity: string;
    affectedAreas: string[];
    recommendations: string[];
    regulatoryImpact: boolean;
  };
}

export interface ComparisonOptions {
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
  ignoreFormatting?: boolean;
  includeImpactAnalysis?: boolean;
  similarityThreshold?: number;
  significanceThresholds?: {
    major: number;
    minor: number;
  };
}

const DEFAULT_OPTIONS: ComparisonOptions = {
  ignoreWhitespace: true,
  ignoreCase: false,
  ignoreFormatting: false,
  includeImpactAnalysis: true,
  similarityThreshold: 0.8,
  significanceThresholds: {
    major: 0.3, // Changes with similarity < 0.3 are major
    minor: 0.7  // Changes with similarity < 0.7 are minor, others are trivial
  }
};

/**
 * Compare two document structures
 */
export async function compareDocumentStructures(
  before: DocumentStructure,
  after: DocumentStructure,
  options: ComparisonOptions = DEFAULT_OPTIONS
): Promise<DocumentComparison> {
  const startTime = Date.now();
  
  try {
    // Initialize comparison result
    const result: DocumentComparison = {
      timestamp: new Date(),
      overallSimilarity: 0,
      structureSimilarity: 0,
      contentSimilarity: 0,
      changes: [],
      summary: {
        total: 0,
        added: 0,
        removed: 0,
        modified: 0,
        moved: 0,
        unchanged: 0,
        major: 0,
        minor: 0,
        trivial: 0
      },
      statistics: {
        addedChars: 0,
        removedChars: 0,
        changedChars: 0,
        processingTime: 0
      }
    };
    
    // Compare document structures recursively
    compareElements(before.hierarchy, after.hierarchy, result, options);
    
    // Calculate overall similarities
    result.structureSimilarity = calculateStructuralSimilarity(before.hierarchy, after.hierarchy);
    result.contentSimilarity = calculateTextSimilarity(
      getAllText(before.elements),
      getAllText(after.elements)
    );
    result.overallSimilarity = (result.structureSimilarity + result.contentSimilarity) / 2;
    
    // Calculate summary statistics
    result.summary.total = result.changes.length;
    result.summary.added = result.changes.filter(c => c.type === ChangeType.ADDED).length;
    result.summary.removed = result.changes.filter(c => c.type === ChangeType.REMOVED).length;
    result.summary.modified = result.changes.filter(c => c.type === ChangeType.MODIFIED).length;
    result.summary.moved = result.changes.filter(c => c.type === ChangeType.MOVED).length;
    result.summary.unchanged = result.changes.filter(c => c.type === ChangeType.UNCHANGED).length;
    result.summary.major = result.changes.filter(c => c.significance === ChangeSignificance.MAJOR).length;
    result.summary.minor = result.changes.filter(c => c.significance === ChangeSignificance.MINOR).length;
    result.summary.trivial = result.changes.filter(c => c.significance === ChangeSignificance.TRIVIAL).length;
    
    // Calculate character statistics
    calculateCharStatistics(result);
    
    // Add impact analysis if requested
    if (options.includeImpactAnalysis) {
      result.impactAnalysis = analyzeImpact(result);
    }
    
    // Record processing time
    result.statistics.processingTime = Date.now() - startTime;
    
    return result;
  } catch (error) {
    logger.error('Document comparison error', { context: { error } });
    throw new Error(`Document comparison failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Compare two extraction results
 */
export async function compareExtractionResults(
  before: ExtractionResult,
  after: ExtractionResult,
  options: ComparisonOptions = DEFAULT_OPTIONS
): Promise<DocumentComparison> {
  // Create simple document structures from extraction results
  const beforeStructure: DocumentStructure = {
    title: before.metadata.title,
    elements: [],
    hierarchy: {
      type: StructureType.SECTION,
      text: before.metadata.title || 'Document Root',
      level: 0,
      children: []
    },
    metadata: {
      processingTime: 0,
      confidence: 1,
      pageCount: before.metadata.pageCount,
      format: before.metadata.format,
      language: before.metadata.language
    }
  };
  
  const afterStructure: DocumentStructure = {
    title: after.metadata.title,
    elements: [],
    hierarchy: {
      type: StructureType.SECTION,
      text: after.metadata.title || 'Document Root',
      level: 0,
      children: []
    },
    metadata: {
      processingTime: 0,
      confidence: 1,
      pageCount: after.metadata.pageCount,
      format: after.metadata.format,
      language: after.metadata.language
    }
  };
  
  // Add headings if available
  if (before.structured?.headings) {
    for (const heading of before.structured.headings) {
      const headingElement: DocumentElement = {
        type: StructureType.HEADING,
        text: heading.text,
        level: heading.level,
        metadata: {
          pageNumber: heading.pageIndex
        }
      };
      beforeStructure.elements.push(headingElement);
      addToHierarchy(beforeStructure.hierarchy, headingElement);
    }
  }
  
  if (after.structured?.headings) {
    for (const heading of after.structured.headings) {
      const headingElement: DocumentElement = {
        type: StructureType.HEADING,
        text: heading.text,
        level: heading.level,
        metadata: {
          pageNumber: heading.pageIndex
        }
      };
      afterStructure.elements.push(headingElement);
      addToHierarchy(afterStructure.hierarchy, headingElement);
    }
  }
  
  // Add paragraphs from main text
  if (before.text) {
    const paragraphs = before.text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    for (const paragraph of paragraphs) {
      const paragraphElement: DocumentElement = {
        type: StructureType.PARAGRAPH,
        text: paragraph,
      };
      beforeStructure.elements.push(paragraphElement);
      addToHierarchy(beforeStructure.hierarchy, paragraphElement);
    }
  }
  
  if (after.text) {
    const paragraphs = after.text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    for (const paragraph of paragraphs) {
      const paragraphElement: DocumentElement = {
        type: StructureType.PARAGRAPH,
        text: paragraph,
      };
      afterStructure.elements.push(paragraphElement);
      addToHierarchy(afterStructure.hierarchy, paragraphElement);
    }
  }
  
  // Now compare the structures
  return compareDocumentStructures(beforeStructure, afterStructure, options);
}

/**
 * Compare text documents
 */
export async function compareTextDocuments(
  beforeText: string,
  afterText: string,
  options: ComparisonOptions = DEFAULT_OPTIONS
): Promise<DocumentComparison> {
  // Create extraction results from plain text
  const beforeResult: ExtractionResult = {
    text: beforeText,
    metadata: {
      title: 'Before Document',
      format: 'TEXT',
      extractionEngine: 'direct'
    }
  };
  
  const afterResult: ExtractionResult = {
    text: afterText,
    metadata: {
      title: 'After Document',
      format: 'TEXT',
      extractionEngine: 'direct'
    }
  };
  
  // Compare the extraction results
  return compareExtractionResults(beforeResult, afterResult, options);
}

/**
 * Clean whitespace from text
 */
function cleanWhitespace(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compare document elements recursively
 */
function compareElements(
  before: DocumentElement,
  after: DocumentElement,
  result: DocumentComparison,
  options: ComparisonOptions
): void {
  // Calculate similarity between elements
  const similarity = calculateElementSimilarity(before, after, options);
  
  // Determine the type of change
  let changeType = ChangeType.UNCHANGED;
  if (similarity < 1.0) {
    changeType = ChangeType.MODIFIED;
  }
  
  // Determine significance of change
  const significance = determineChangeSignificance(before, after, similarity, options);
  
  // Create a change record
  const change: ElementChange = {
    type: changeType,
    significance,
    elementType: before.type,
    before,
    after,
    similarity,
    content: {
      before: before.text,
      after: after.text,
    },
  };
  
  // Add to changes list
  result.changes.push(change);
  
  // Compare child elements
  if (before.children && after.children) {
    compareChildElements(before.children, after.children, result, options);
  } else if (before.children) {
    // All children were removed
    processRemovedElements(before.children, result);
  } else if (after.children) {
    // All children were added
    processAddedElements(after.children, result);
  }
}

/**
 * Compare child elements
 */
function compareChildElements(
  beforeElements: DocumentElement[],
  afterElements: DocumentElement[],
  result: DocumentComparison,
  options: ComparisonOptions
): void {
  // We need to match corresponding elements in the before and after sets
  // This is a simplified approach using the Levenshtein distance for matching
  
  // Create a similarity matrix
  const matchMatrix = new Map<number, Map<number, number>>();
  const unmatched = new Set<number>();
  
  // Fill the similarity matrix
  for (let i = 0; i < beforeElements.length; i++) {
    matchMatrix.set(i, new Map<number, number>());
    unmatched.add(i);
    
    for (let j = 0; j < afterElements.length; j++) {
      const similarity = calculateElementSimilarity(beforeElements[i], afterElements[j], options);
      matchMatrix.get(i)!.set(j, similarity);
    }
  }
  
  const matches: [number, number][] = [];
  const unmatchedAfter = new Set<number>(Array.from({ length: afterElements.length }, (_, i) => i));
  
  // Greedy matching - take the best matches first
  while (unmatched.size > 0 && unmatchedAfter.size > 0) {
    let bestMatch: [number, number] | null = null;
    let bestSimilarity = -1;
    
    // Find the best match
    for (const i of unmatched) {
      for (const j of unmatchedAfter) {
        const similarity = matchMatrix.get(i)!.get(j)!;
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = [i, j];
        }
      }
    }
    
    // If we found a good match, add it
    if (bestMatch && bestSimilarity >= options.similarityThreshold!) {
      matches.push(bestMatch);
      unmatched.delete(bestMatch[0]);
      unmatchedAfter.delete(bestMatch[1]);
    } else {
      // No more good matches
      break;
    }
  }
  
  // Process matched elements
  for (const [beforeIndex, afterIndex] of matches) {
    compareElements(beforeElements[beforeIndex], afterElements[afterIndex], result, options);
  }
  
  // Process unmatched before elements (removed)
  for (const i of unmatched) {
    // Record removed element
    const removedElement = beforeElements[i];
    const change: ElementChange = {
      type: ChangeType.REMOVED,
      significance: ChangeSignificance.MAJOR, // Removal is always major
      elementType: removedElement.type,
      before: removedElement,
      content: {
        before: removedElement.text
      }
    };
    result.changes.push(change);
    
    // Process children recursively
    if (removedElement.children) {
      processRemovedElements(removedElement.children, result);
    }
  }
  
  // Process unmatched after elements (added)
  for (const j of unmatchedAfter) {
    // Record added element
    const addedElement = afterElements[j];
    const change: ElementChange = {
      type: ChangeType.ADDED,
      significance: ChangeSignificance.MAJOR, // Addition is always major
      elementType: addedElement.type,
      after: addedElement,
      content: {
        after: addedElement.text
      }
    };
    result.changes.push(change);
    
    // Process children recursively
    if (addedElement.children) {
      processAddedElements(addedElement.children, result);
    }
  }
}

/**
 * Process all elements in a subtree as removed
 */
function processRemovedElements(elements: DocumentElement[], result: DocumentComparison): void {
  for (const element of elements) {
    const change: ElementChange = {
      type: ChangeType.REMOVED,
      significance: ChangeSignificance.MAJOR, // Removal is always major
      elementType: element.type,
      before: element,
      content: {
        before: element.text
      }
    };
    result.changes.push(change);
    
    // Process children recursively
    if (element.children) {
      processRemovedElements(element.children, result);
    }
  }
}

/**
 * Process all elements in a subtree as added
 */
function processAddedElements(elements: DocumentElement[], result: DocumentComparison): void {
  for (const element of elements) {
    const change: ElementChange = {
      type: ChangeType.ADDED,
      significance: ChangeSignificance.MAJOR, // Addition is always major
      elementType: element.type,
      after: element,
      content: {
        after: element.text
      }
    };
    result.changes.push(change);
    
    // Process children recursively
    if (element.children) {
      processAddedElements(element.children, result);
    }
  }
}

/**
 * Compare text blocks (paragraphs)
 */
function compareTextBlocks(
  before: string,
  after: string,
  result: DocumentComparison,
  options: ComparisonOptions
): void {
  // Clean text if needed
  let beforeText = before;
  let afterText = after;
  
  if (options.ignoreWhitespace) {
    beforeText = cleanWhitespace(beforeText);
    afterText = cleanWhitespace(afterText);
  }
  
  if (options.ignoreCase) {
    beforeText = beforeText.toLowerCase();
    afterText = afterText.toLowerCase();
  }
  
  // Calculate similarity
  const similarity = calculateTextSimilarity(beforeText, afterText);
  
  // Determine change type
  let changeType = ChangeType.UNCHANGED;
  if (similarity < 1.0) {
    changeType = ChangeType.MODIFIED;
  }
  
  // Determine significance
  const significance = similarity < options.significanceThresholds!.major
    ? ChangeSignificance.MAJOR
    : similarity < options.significanceThresholds!.minor
      ? ChangeSignificance.MINOR
      : ChangeSignificance.TRIVIAL;
  
  // Create change record
  const change: ElementChange = {
    type: changeType,
    significance,
    elementType: StructureType.PARAGRAPH,
    content: {
      before: beforeText,
      after: afterText
    },
    similarity
  };
  
  // Add to changes list
  result.changes.push(change);
}

/**
 * Calculate similarity between two elements
 */
function calculateElementSimilarity(
  before: DocumentElement,
  after: DocumentElement,
  options: ComparisonOptions
): number {
  // If types don't match, lower similarity
  if (before.type !== after.type) {
    return 0.5 * calculateTextSimilarity(before.text, after.text);
  }
  
  // For textual elements, compare text
  return calculateTextSimilarity(before.text, after.text);
}

/**
 * Calculate text similarity using cosine similarity of word frequencies
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  // Skip calculation for empty texts
  if (!text1 && !text2) return 1.0;
  if (!text1 || !text2) return 0.0;
  
  // Tokenize text into words
  const words1 = text1.toLowerCase().split(/\W+/).filter(w => w.length > 0);
  const words2 = text2.toLowerCase().split(/\W+/).filter(w => w.length > 0);
  
  // Calculate word frequencies
  const freqs1: Record<string, number> = {};
  const freqs2: Record<string, number> = {};
  
  for (const word of words1) {
    freqs1[word] = (freqs1[word] || 0) + 1;
  }
  
  for (const word of words2) {
    freqs2[word] = (freqs2[word] || 0) + 1;
  }
  
  // Calculate dot product
  let dotProduct = 0;
  for (const word in freqs1) {
    if (word in freqs2) {
      dotProduct += freqs1[word] * freqs2[word];
    }
  }
  
  // Calculate magnitudes
  const mag1 = Math.sqrt(Object.values(freqs1).reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(Object.values(freqs2).reduce((sum, val) => sum + val * val, 0));
  
  // Calculate cosine similarity
  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (mag1 * mag2);
}

/**
 * Calculate structural similarity between two documents
 */
function calculateStructuralSimilarity(doc1: any, doc2: any): number {
  // This is a simplified approach using element types and hierarchy structure
  // A more sophisticated approach would consider the full structure
  
  // If both documents have the same root type, that's a good start
  let similarity = doc1.type === doc2.type ? 0.5 : 0.3;
  
  // If they have children, check the children structure
  if (doc1.children && doc2.children) {
    // If they have the same number of children, that's promising
    if (doc1.children.length === doc2.children.length) {
      similarity += 0.3;
      
      // Check if children types match
      let matchingTypes = 0;
      for (let i = 0; i < doc1.children.length; i++) {
        if (doc1.children[i].type === doc2.children[i].type) {
          matchingTypes++;
        }
      }
      
      // Add bonus for matching child types
      similarity += 0.2 * (matchingTypes / doc1.children.length);
    } else {
      // Different number of children - penalize but still check types
      similarity += 0.1;
      
      // Find the minimum number of children to compare
      const minChildren = Math.min(doc1.children.length, doc2.children.length);
      
      // Check matching types in the overlapping children
      let matchingTypes = 0;
      for (let i = 0; i < minChildren; i++) {
        if (doc1.children[i].type === doc2.children[i].type) {
          matchingTypes++;
        }
      }
      
      // Add bonus for matching child types
      similarity += 0.1 * (matchingTypes / minChildren);
    }
  } else if (!doc1.children && !doc2.children) {
    // Both have no children, which is a match
    similarity += 0.5;
  } else {
    // One has children, the other doesn't
    similarity += 0.1;
  }
  
  // Cap at 1.0
  return Math.min(similarity, 1.0);
}

/**
 * Determine significance of an element change
 */
function determineChangeSignificance(
  before: DocumentElement,
  after: DocumentElement,
  similarity: number,
  options: ComparisonOptions
): ChangeSignificance {
  // Use the thresholds from options
  if (similarity < options.significanceThresholds!.major) {
    return ChangeSignificance.MAJOR;
  } else if (similarity < options.significanceThresholds!.minor) {
    return ChangeSignificance.MINOR;
  } else {
    return ChangeSignificance.TRIVIAL;
  }
}

/**
 * Determine significance of a text change
 */
function determineTextChangeSignificance(
  before: string,
  after: string,
  similarity: number,
  options: ComparisonOptions
): ChangeSignificance {
  // Headings and critical content have stricter thresholds
  const containsCriticalTerms = (text: string) => 
    /\b(warning|caution|danger|important|critical|safety|emergency|required|mandatory|must|never|always)\b/i.test(text);
  
  const isCritical = containsCriticalTerms(before) || containsCriticalTerms(after);
  
  // Apply stricter thresholds for critical content
  const majorThreshold = isCritical 
    ? options.significanceThresholds!.major + 0.1 
    : options.significanceThresholds!.major;
  
  const minorThreshold = isCritical
    ? options.significanceThresholds!.minor + 0.1
    : options.significanceThresholds!.minor;
  
  // Determine significance based on thresholds
  if (similarity < majorThreshold) {
    return ChangeSignificance.MAJOR;
  } else if (similarity < minorThreshold) {
    return ChangeSignificance.MINOR;
  } else {
    return ChangeSignificance.TRIVIAL;
  }
}

/**
 * Add an element to the document hierarchy
 */
function addToHierarchy(root: DocumentElement, element: DocumentElement): void {
  // For simplicity, we'll just add it to the root
  // In a real implementation, you'd find the right place in the hierarchy
  if (!root.children) {
    root.children = [];
  }
  
  root.children.push(element);
  element.parent = root;
}

/**
 * Calculate character-level statistics
 */
function calculateCharStatistics(result: DocumentComparison): void {
  // Initialize counters
  let addedChars = 0;
  let removedChars = 0;
  let changedChars = 0;
  
  // Process each change
  for (const change of result.changes) {
    if (change.type === ChangeType.ADDED && change.content?.after) {
      addedChars += change.content.after.length;
    } else if (change.type === ChangeType.REMOVED && change.content?.before) {
      removedChars += change.content.before.length;
    } else if (change.type === ChangeType.MODIFIED) {
      // Calculate character-level diff
      const beforeLength = change.content?.before?.length || 0;
      const afterLength = change.content?.after?.length || 0;
      
      if (beforeLength > afterLength) {
        removedChars += beforeLength - afterLength;
      } else {
        addedChars += afterLength - beforeLength;
      }
      
      // Estimate changed characters - this is a simplification
      changedChars += Math.min(beforeLength, afterLength) * (1 - (change.similarity || 0));
    }
  }
  
  // Update statistics
  result.statistics.addedChars = addedChars;
  result.statistics.removedChars = removedChars;
  result.statistics.changedChars = Math.round(changedChars);
}

/**
 * Analyze impact of changes
 */
function analyzeImpact(result: DocumentComparison): {
  category: string;
  severity: string;
  affectedAreas: string[];
  recommendations: string[];
  regulatoryImpact: boolean;
} {
  // Determine severity based on change significance counts
  let severity = 'low';
  if (result.summary.major > 0) {
    severity = result.summary.major > 5 ? 'high' : 'medium';
  } else if (result.summary.minor > 10) {
    severity = 'medium';
  }
  
  // Look for regulatory/safety changes
  const regulatoryImpact = result.changes.some(change => {
    const text = change.content?.before || change.content?.after || '';
    return /\b(regulat|compli|safety|certif|approv|authority|faa|easa|caa)\b/i.test(text);
  });
  
  // Extract affected areas from changes
  const affectedAreaPatterns = {
    technical: /\b(system|component|engine|hydraulic|electrical|avionics|fuel)\b/i,
    operational: /\b(procedure|checklist|operation|technique|performance)\b/i,
    training: /\b(training|instruction|learning|student|trainee|instructor)\b/i,
    safety: /\b(safety|caution|warning|emergency|hazard|danger)\b/i,
    regulatory: /\b(requirement|regulation|compliance|standard|law)\b/i
  };
  
  const affectedAreas: string[] = [];
  for (const [area, pattern] of Object.entries(affectedAreaPatterns)) {
    for (const change of result.changes) {
      const text = change.content?.before || change.content?.after || '';
      if (pattern.test(text)) {
        if (!affectedAreas.includes(area)) {
          affectedAreas.push(area);
        }
        break;
      }
    }
  }
  
  // Generate recommendations based on impact
  const recommendations: string[] = [];
  
  if (severity === 'high') {
    recommendations.push('Conduct a thorough review of all major changes');
  }
  
  if (regulatoryImpact) {
    recommendations.push('Verify compliance with regulatory requirements');
    recommendations.push('Document changes for regulatory audit trail');
  }
  
  if (affectedAreas.includes('safety')) {
    recommendations.push('Perform a safety assessment for the changes');
  }
  
  if (affectedAreas.includes('training')) {
    recommendations.push('Update training materials to reflect changes');
  }
  
  if (affectedAreas.includes('operational')) {
    recommendations.push('Update operational procedures and checklists');
  }
  
  // Default recommendation
  if (recommendations.length === 0) {
    recommendations.push('Review changes for accuracy and consistency');
  }
  
  return {
    category: affectedAreas.length > 0 ? affectedAreas[0] : 'general',
    severity,
    affectedAreas,
    recommendations,
    regulatoryImpact
  };
}

/**
 * Concatenate all text from a set of elements
 */
function getAllText(elements: DocumentElement[]): string {
  return elements.map(element => element.text).join(' ');
}