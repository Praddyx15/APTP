/**
 * Document Structure Recognition Service
 * 
 * This service is responsible for analyzing document structure and extracting:
 * - Headers and sections
 * - Tables and lists
 * - References and citations
 * - Content hierarchy
 * - Key-value pairs and form fields
 */

import { ExtractionResult } from './document-extraction';
import { logger } from '../core/logger';

/**
 * Types of document structures we can recognize
 */
export enum StructureType {
  HEADING = 'heading',
  SECTION = 'section',
  PARAGRAPH = 'paragraph',
  LIST = 'list',
  LIST_ITEM = 'list_item',
  TABLE = 'table',
  TABLE_CELL = 'table_cell',
  KEY_VALUE = 'key_value',
  FORM_FIELD = 'form_field',
  REFERENCE = 'reference',
  CITATION = 'citation',
  FOOTNOTE = 'footnote',
}

/**
 * Structured document element
 */
export interface DocumentElement {
  type: StructureType;
  text: string;
  level?: number;
  metadata?: {
    confidence?: number;
    pageNumber?: number;
    boundingBox?: [number, number, number, number]; // [x1, y1, x2, y2]
    references?: string[];
    [key: string]: any;
  };
  children?: DocumentElement[];
  parent?: DocumentElement;
}

/**
 * Complete document structure results
 */
export interface DocumentStructure {
  title?: string;
  elements: DocumentElement[];
  hierarchy: DocumentElement; // Root element with the complete hierarchy
  metadata: {
    processingTime: number;
    confidence: number;
    pageCount?: number;
    format?: string;
    language?: string;
  };
}

/**
 * Options for controlling structure recognition
 */
export interface StructureRecognitionOptions {
  recognizeHeadings?: boolean;
  recognizeSections?: boolean;
  recognizeTables?: boolean;
  recognizeLists?: boolean;
  recognizeKeyValue?: boolean;
  recognizeReferences?: boolean;
  minHeadingConfidence?: number;
  minTableConfidence?: number;
  language?: string;
}

/**
 * Default options for structure recognition
 */
const DEFAULT_OPTIONS: StructureRecognitionOptions = {
  recognizeHeadings: true,
  recognizeSections: true,
  recognizeTables: true,
  recognizeLists: true,
  recognizeKeyValue: true,
  recognizeReferences: true,
  minHeadingConfidence: 0.7,
  minTableConfidence: 0.7,
  language: 'eng',
};

/**
 * Main function to analyze document structure
 */
export async function analyzeDocumentStructure(
  extractionResult: ExtractionResult,
  options: StructureRecognitionOptions = DEFAULT_OPTIONS,
): Promise<DocumentStructure> {
  const startTime = Date.now();
  
  try {
    // Create the root element for the hierarchy
    const root: DocumentElement = {
      type: StructureType.SECTION,
      text: extractionResult.metadata.title || 'Document Root',
      level: 0,
      children: [],
    };
    
    // Initialize the structure result
    const structure: DocumentStructure = {
      title: extractionResult.metadata.title,
      elements: [],
      hierarchy: root,
      metadata: {
        processingTime: 0,
        confidence: 0,
        pageCount: extractionResult.metadata.pageCount,
        format: extractionResult.metadata.format,
        language: extractionResult.metadata.language || options.language,
      },
    };
    
    // Process headings first to establish document hierarchy
    if (options.recognizeHeadings) {
      processHeadings(extractionResult, structure, options);
    }
    
    // Process tables if available in the extraction result
    if (options.recognizeTables && extractionResult.structured?.tables) {
      processTables(extractionResult, structure, options);
    }
    
    // Process the full text for other structural elements
    processFullText(extractionResult, structure, options);
    
    // Calculate processing time and confidence
    structure.metadata.processingTime = Date.now() - startTime;
    structure.metadata.confidence = calculateConfidence(structure);
    
    return structure;
  } catch (error) {
    logger.error('Document structure analysis error', { context: { error } });
    throw new Error(`Document structure analysis failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Process headings to create document hierarchy
 */
function processHeadings(
  extractionResult: ExtractionResult,
  structure: DocumentStructure,
  options: StructureRecognitionOptions,
): void {
  const headings = extractionResult.structured?.headings || [];
  let currentNode = structure.hierarchy;
  let currentLevel = 0;
  
  // Process each heading in order
  for (const heading of headings) {
    const level = heading.level;
    const text = heading.text;
    
    // Create a heading element
    const headingElement: DocumentElement = {
      type: StructureType.HEADING,
      text,
      level,
      metadata: {
        confidence: 0.9, // Headings from extraction are typically reliable
        pageNumber: heading.pageIndex,
      },
      children: [],
    };
    
    // Add to the flat list of elements
    structure.elements.push(headingElement);
    
    // Create a section element that will contain content after this heading
    const sectionElement: DocumentElement = {
      type: StructureType.SECTION,
      text: `${text} Section`,
      level,
      metadata: {
        confidence: 0.85,
        pageNumber: heading.pageIndex,
      },
      children: [],
      parent: headingElement,
    };
    
    // Set the section as a child of the heading
    headingElement.children = [sectionElement];
    
    // Find the correct parent in the hierarchy
    if (level > currentLevel) {
      // This is a child of the previous heading
      if (currentNode.children && currentNode.children.length > 0) {
        // Set parent to the last section under the current node
        const lastChild = currentNode.children[currentNode.children.length - 1];
        currentNode = lastChild.type === StructureType.SECTION ? lastChild : currentNode;
      }
    } else if (level < currentLevel) {
      // This is a higher-level heading, go up the hierarchy
      while (currentNode.parent && currentNode.level && currentNode.level >= level) {
        currentNode = currentNode.parent;
      }
    } else {
      // Same level, navigate to parent
      if (currentNode.parent) {
        currentNode = currentNode.parent;
      }
    }
    
    // Add the heading element to the current node in the hierarchy
    if (currentNode.children) {
      currentNode.children.push(headingElement);
    }
    
    // Update the current node and level
    currentNode = sectionElement;
    currentLevel = level;
  }
}

/**
 * Process tables from the extraction result
 */
function processTables(
  extractionResult: ExtractionResult,
  structure: DocumentStructure,
  options: StructureRecognitionOptions,
): void {
  const tables = extractionResult.structured?.tables || [];
  
  tables.forEach((tableData, tableIndex) => {
    // Create a table element
    const tableElement: DocumentElement = {
      type: StructureType.TABLE,
      text: `Table ${tableIndex + 1}`,
      metadata: {
        confidence: 0.85, // Tables from extraction are typically reliable
      },
      children: [],
    };
    
    // Process each row and cell
    tableData.forEach((row, rowIndex) => {
      const rowElement: DocumentElement = {
        type: StructureType.PARAGRAPH, // Using paragraph for rows
        text: `Row ${rowIndex + 1}`,
        parent: tableElement,
        children: [],
      };
      
      // Process cells
      if (Array.isArray(row)) {
        row.forEach((cell, cellIndex) => {
          const cellElement: DocumentElement = {
            type: StructureType.TABLE_CELL,
            text: String(cell),
            parent: rowElement,
            metadata: {
              columnIndex: cellIndex,
              rowIndex: rowIndex,
            },
          };
          
          rowElement.children?.push(cellElement);
        });
      }
      
      tableElement.children?.push(rowElement);
    });
    
    // Add to the flat list of elements
    structure.elements.push(tableElement);
    
    // Place table in the hierarchy - find the most recent section
    const bestParent = findBestParentForElement(tableElement, structure.hierarchy);
    if (bestParent && bestParent.children) {
      bestParent.children.push(tableElement);
      tableElement.parent = bestParent;
    }
  });
}

/**
 * Process the full text to identify other structural elements
 */
function processFullText(
  extractionResult: ExtractionResult,
  structure: DocumentStructure,
  options: StructureRecognitionOptions,
): void {
  const text = extractionResult.text;
  
  // Split into paragraphs
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  // Iterate through paragraphs and identify structure
  for (const paragraph of paragraphs) {
    const trimmedText = paragraph.trim();
    
    // Skip if empty
    if (trimmedText.length === 0) continue;
    
    // Check for lists
    if (options.recognizeLists && isList(trimmedText)) {
      processLists(trimmedText, structure);
      continue;
    }
    
    // Check for key-value pairs
    if (options.recognizeKeyValue && isKeyValuePair(trimmedText)) {
      processKeyValuePairs(trimmedText, structure);
      continue;
    }
    
    // Check for references
    if (options.recognizeReferences && isReference(trimmedText)) {
      processReferences(trimmedText, structure);
      continue;
    }
    
    // Default to paragraph
    const paragraphElement: DocumentElement = {
      type: StructureType.PARAGRAPH,
      text: trimmedText,
      metadata: {
        confidence: 0.9, // High confidence for basic paragraphs
      },
    };
    
    // Add to flat list
    structure.elements.push(paragraphElement);
    
    // Add to hierarchy in the appropriate section
    const bestParent = findBestParentForElement(paragraphElement, structure.hierarchy);
    if (bestParent && bestParent.children) {
      bestParent.children.push(paragraphElement);
      paragraphElement.parent = bestParent;
    }
  }
}

/**
 * Process lists from text lines
 */
function processLists(
  text: string,
  structure: DocumentStructure,
): void {
  // Split into lines
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  // Create list element
  const listElement: DocumentElement = {
    type: StructureType.LIST,
    text: 'List',
    metadata: {
      confidence: 0.85,
    },
    children: [],
  };
  
  // Process each list item
  for (const line of lines) {
    // Extract the list marker and content
    const match = line.match(/^(\s*[-•*]\s+|\s*\d+[.)]\s+)(.+)$/);
    if (match) {
      const [, marker, content] = match;
      
      // Create list item element
      const listItem: DocumentElement = {
        type: StructureType.LIST_ITEM,
        text: content.trim(),
        metadata: {
          marker: marker.trim(),
          isOrdered: /^\d+[.)]/.test(marker),
          confidence: 0.9,
        },
        parent: listElement,
      };
      
      listElement.children?.push(listItem);
    } else {
      // If no marker found, add as plain text item
      const listItem: DocumentElement = {
        type: StructureType.LIST_ITEM,
        text: line.trim(),
        metadata: {
          confidence: 0.7, // Lower confidence because no clear marker
        },
        parent: listElement,
      };
      
      listElement.children?.push(listItem);
    }
  }
  
  // Add to flat list
  structure.elements.push(listElement);
  
  // Add to hierarchy in the appropriate section
  const bestParent = findBestParentForElement(listElement, structure.hierarchy);
  if (bestParent && bestParent.children) {
    bestParent.children.push(listElement);
    listElement.parent = bestParent;
  }
}

/**
 * Process key-value pairs (like form fields or property lists)
 */
function processKeyValuePairs(
  text: string,
  structure: DocumentStructure,
): void {
  // Split into lines
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  for (const line of lines) {
    // Try to match key: value pattern
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      
      // Create key-value element
      const kvElement: DocumentElement = {
        type: StructureType.KEY_VALUE,
        text: line.trim(),
        metadata: {
          key: key.trim(),
          value: value.trim(),
          confidence: 0.9,
        },
      };
      
      // Add to flat list
      structure.elements.push(kvElement);
      
      // Add to hierarchy in the appropriate section
      const bestParent = findBestParentForElement(kvElement, structure.hierarchy);
      if (bestParent && bestParent.children) {
        bestParent.children.push(kvElement);
        kvElement.parent = bestParent;
      }
    }
  }
}

/**
 * Process references and citations
 */
function processReferences(
  text: string,
  structure: DocumentStructure,
): void {
  // Split into lines
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  for (const line of lines) {
    // Look for patterns like [1], [Smith, 2020], etc.
    const matches = line.match(/\[([^\]]+)\]/g);
    if (matches) {
      // Create citation element
      const citation: DocumentElement = {
        type: StructureType.CITATION,
        text: line.trim(),
        metadata: {
          references: matches.map(m => m.replace(/[\[\]]/g, '').trim()),
          confidence: 0.85,
        },
      };
      
      // Add to flat list
      structure.elements.push(citation);
      
      // Add to hierarchy in the appropriate section
      const bestParent = findBestParentForElement(citation, structure.hierarchy);
      if (bestParent && bestParent.children) {
        bestParent.children.push(citation);
        citation.parent = bestParent;
      }
    }
  }
}

// Helper functions to detect structure types
function isList(text: string): boolean {
  const lines = text.split('\n');
  if (lines.length < 2) return false;
  
  // Check if multiple lines start with list markers
  const listMarkerCount = lines.filter(line => 
    line.trim().match(/^(\s*[-•*]\s+|\s*\d+[.)]\s+)/)
  ).length;
  
  return listMarkerCount >= Math.min(lines.length * 0.5, 3); // At least half or 3 items
}

function isKeyValuePair(text: string): boolean {
  const lines = text.split('\n');
  if (lines.length < 1) return false;
  
  // Check if lines have key: value format
  const keyValueCount = lines.filter(line => 
    line.trim().match(/^([^:]+):\s*(.+)$/)
  ).length;
  
  return keyValueCount >= Math.min(lines.length * 0.5, 2); // At least half or 2 items
}

function isReference(text: string): boolean {
  // Check for citation patterns
  return /\[([^\]]+)\]/.test(text) || 
         /\(\d{4}\)/.test(text) || // (2020)
         /^References:?$/im.test(text);
}

// Utility function to find a section on a specific page
function findSectionOnPageHelper(node: DocumentElement, pageNumber: number): DocumentElement | null {
  if (node.metadata?.pageNumber === pageNumber && node.type === StructureType.SECTION) {
    return node;
  }
  
  if (node.children) {
    for (const child of node.children) {
      const found = findSectionOnPageHelper(child, pageNumber);
      if (found) return found;
    }
  }
  
  return null;
}

// Utility function to find the most recent section in the document
function findMostRecentSectionHelper(node: DocumentElement): DocumentElement | null {
  if (node.type === StructureType.SECTION) {
    // Check children first for deeper sections
    if (node.children) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        const found = findMostRecentSectionHelper(node.children[i]);
        if (found) return found;
      }
    }
    
    // If no deeper section found, return this one
    return node;
  }
  
  // If not a section, check children
  if (node.children) {
    for (let i = node.children.length - 1; i >= 0; i--) {
      const found = findMostRecentSectionHelper(node.children[i]);
      if (found) return found;
    }
  }
  
  return null;
}

function findBestParentForElement(
  element: DocumentElement,
  root: DocumentElement,
): DocumentElement | null {
  // If element has page info, try to find a section on the same page
  if (element.metadata?.pageNumber !== undefined) {
    const sectionOnPage = findSectionOnPageHelper(root, element.metadata.pageNumber);
    if (sectionOnPage) return sectionOnPage;
  }
  
  // Otherwise, find the most recent section
  return findMostRecentSectionHelper(root);
}

/**
 * Calculate overall confidence score
 */
function calculateConfidence(structure: DocumentStructure): number {
  if (structure.elements.length === 0) return 0;
  
  // Calculate average confidence of all elements
  let totalConfidence = 0;
  let elementsWithConfidence = 0;
  
  for (const element of structure.elements) {
    if (element.metadata?.confidence !== undefined) {
      totalConfidence += element.metadata.confidence;
      elementsWithConfidence++;
    }
  }
  
  return elementsWithConfidence > 0 
    ? totalConfidence / elementsWithConfidence 
    : 0.5; // Default confidence if no elements have confidence scores
}