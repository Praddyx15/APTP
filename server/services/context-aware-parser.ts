/**
 * Context-aware Document Parser
 * 
 * This service provides intelligent parsing of documents based on context:
 * - Detects document context (aviation regulations, technical manuals, etc.)
 * - Extracts domain-specific information based on document type
 * - Maintains contextual relationships between document segments
 * - Uses semantic understanding to improve extraction quality
 */

import { ExtractionResult } from './document-extraction';
import { DocumentStructure, DocumentElement, StructureType } from './document-structure';
import { DocumentClassification, DocumentCategory } from './document-classification';
import { storage } from '../storage';
import { logger } from '../core';

export enum ContextType {
  REGULATORY = 'regulatory',
  TECHNICAL_MANUAL = 'technical_manual',
  TRAINING_MATERIAL = 'training_material',
  OPERATING_PROCEDURE = 'operating_procedure',
  CHECKLIST = 'checklist',
  MAINTENANCE_DOCUMENT = 'maintenance_document',
  SAFETY_BULLETIN = 'safety_bulletin',
  GENERAL = 'general'
}

export interface ContextualEntity {
  id: string;
  type: string;
  value: string;
  context: string;
  confidence: number;
  beginOffset: number;
  endOffset: number;
  metadata?: Record<string, any>;
  relatedEntities?: string[];
}

export interface SectionContext {
  id: string;
  title?: string;
  contextType: ContextType;
  parentContext?: string;
  confidence: number;
  entities: ContextualEntity[];
  contextualImportance: number; // 0-100 scale
  regulatoryReferences?: string[];
}

export interface DocumentContext {
  documentId: number;
  primaryContext: ContextType;
  sections: SectionContext[];
  entities: ContextualEntity[];
  contextualScore: number;
  processingTimeMs: number;
  keyInsights: string[];
  crossReferences: Array<{source: string, target: string, type: string}>;
}

export interface ContextParsingOptions {
  minEntityConfidence?: number;
  extractReferences?: boolean;
  detectCrossReferences?: boolean;
  maxEntitiesPerSection?: number;
  useHistoricalContext?: boolean;
  enforceDomainSpecificRules?: boolean;
}

const DEFAULT_OPTIONS: ContextParsingOptions = {
  minEntityConfidence: 0.75,
  extractReferences: true,
  detectCrossReferences: true,
  maxEntitiesPerSection: 100,
  useHistoricalContext: true,
  enforceDomainSpecificRules: true
};

/**
 * Context-aware parsing of documents
 */
export async function parseDocumentContext(
  document: ExtractionResult | DocumentStructure | DocumentClassification,
  options: ContextParsingOptions = DEFAULT_OPTIONS
): Promise<DocumentContext> {
  const startTime = Date.now();
  
  // Initialize the document context
  let docContext: DocumentContext = {
    documentId: 0, // Will be set if available
    primaryContext: ContextType.GENERAL,
    sections: [],
    entities: [],
    contextualScore: 0,
    processingTimeMs: 0,
    keyInsights: [],
    crossReferences: []
  };

  let documentText = '';
  let documentStructure: DocumentStructure | null = null;

  // Extract document id and content based on input type
  if ('metadata' in document && 'text' in document) {
    // It's an ExtractionResult
    documentText = document.text;
    docContext.documentId = (document.metadata as any).documentId || 0;
    
    // Convert extraction to structure if needed
    documentStructure = await importStructureFromExtraction(document);
  } else if ('elements' in document && 'hierarchy' in document) {
    // It's a DocumentStructure
    documentStructure = document;
    documentText = extractTextFromStructure(document);
    docContext.documentId = (document.metadata as any).documentId || 0;
  } else if ('category' in document && 'subjects' in document) {
    // It's a DocumentClassification
    docContext.documentId = (document as any).documentId || 0;
    docContext.primaryContext = mapCategoryToContextType(document.category);
    
    // Try to fetch document from storage if ID is available
    if (docContext.documentId && storage.getDocument) {
      try {
        const doc = await storage.getDocument(docContext.documentId);
        if (doc && doc.currentVersionId && storage.getDocumentVersion) {
          const version = await storage.getDocumentVersion(doc.currentVersionId);
          if (version && version.content) {
            documentText = version.content.toString();
          }
        }
      } catch (error) {
        logger.error('Failed to fetch document for context parsing', { error });
      }
    }
  }

  // Determine primary context type
  if (docContext.primaryContext === ContextType.GENERAL) {
    docContext.primaryContext = detectPrimaryContext(documentText);
  }
  
  // Process document structure if available
  if (documentStructure) {
    docContext.sections = extractSectionContexts(documentStructure, docContext.primaryContext, options);
  } else if (documentText) {
    // Fall back to basic section extraction if structure is not available
    docContext.sections = extractSectionsFromText(documentText, docContext.primaryContext, options);
  }
  
  // Extract entities based on primary context
  docContext.entities = extractEntitiesByContext(documentText, docContext.primaryContext, options);
  
  // Process cross-references if enabled
  if (options.detectCrossReferences) {
    docContext.crossReferences = detectCrossReferences(docContext);
  }
  
  // Generate key insights
  docContext.keyInsights = generateKeyInsights(docContext);
  
  // Calculate contextual score
  docContext.contextualScore = calculateContextualScore(docContext);
  
  // Record processing time
  docContext.processingTimeMs = Date.now() - startTime;
  
  return docContext;
}

/**
 * Map document category to context type
 */
function mapCategoryToContextType(category: DocumentCategory): ContextType {
  switch (category) {
    case DocumentCategory.REGULATORY:
      return ContextType.REGULATORY;
    case DocumentCategory.TECHNICAL:
      return ContextType.TECHNICAL_MANUAL;
    case DocumentCategory.TRAINING:
      return ContextType.TRAINING_MATERIAL;
    case DocumentCategory.OPERATIONAL:
      return ContextType.OPERATING_PROCEDURE;
    case DocumentCategory.ASSESSMENT:
      return ContextType.TRAINING_MATERIAL;
    case DocumentCategory.REFERENCE:
      return ContextType.GENERAL;
    default:
      return ContextType.GENERAL;
  }
}

/**
 * Detect the primary context type of a document
 */
function detectPrimaryContext(text: string): ContextType {
  // Simplified context detection based on keyword frequency
  const contextScores: Record<ContextType, number> = {
    [ContextType.REGULATORY]: 0,
    [ContextType.TECHNICAL_MANUAL]: 0,
    [ContextType.TRAINING_MATERIAL]: 0,
    [ContextType.OPERATING_PROCEDURE]: 0,
    [ContextType.CHECKLIST]: 0,
    [ContextType.MAINTENANCE_DOCUMENT]: 0,
    [ContextType.SAFETY_BULLETIN]: 0,
    [ContextType.GENERAL]: 0
  };
  
  // Regulatory keywords
  if (/\b(regulation|compliance|rule|requirement|law|statute|directive|standard|certification)\b/i.test(text)) {
    contextScores[ContextType.REGULATORY] += 5;
  }
  if (/\b(EASA|FAA|CAA|ICAO|part 61|part 91|part 121|part 135|CFR|CAR)\b/i.test(text)) {
    contextScores[ContextType.REGULATORY] += 10;
  }
  
  // Technical manual keywords
  if (/\b(manual|technical|specification|aircraft|system|component|engine|avionics)\b/i.test(text)) {
    contextScores[ContextType.TECHNICAL_MANUAL] += 5;
  }
  if (/\b(installation|operation|maintenance|troubleshooting|diagram|schematic)\b/i.test(text)) {
    contextScores[ContextType.TECHNICAL_MANUAL] += 3;
  }
  
  // Training material keywords
  if (/\b(training|learn|course|study|instructor|student|lesson|syllabus|curriculum)\b/i.test(text)) {
    contextScores[ContextType.TRAINING_MATERIAL] += 5;
  }
  if (/\b(exam|test|assessment|exercise|module|objective|competency|skill)\b/i.test(text)) {
    contextScores[ContextType.TRAINING_MATERIAL] += 3;
  }
  
  // Operating procedure keywords
  if (/\b(procedure|operation|protocol|step|instruction|sequence|flight|pilot)\b/i.test(text)) {
    contextScores[ContextType.OPERATING_PROCEDURE] += 5;
  }
  if (/\b(normal|abnormal|emergency|takeoff|landing|cruise|approach|departure)\b/i.test(text)) {
    contextScores[ContextType.OPERATING_PROCEDURE] += 3;
  }
  
  // Checklist keywords
  if (/\b(checklist|check|item|verify|confirm|complete|pre-flight|post-flight)\b/i.test(text)) {
    contextScores[ContextType.CHECKLIST] += 8;
  }
  if (/□|\[\s*\]|\(\s*\)|✓|✗/.test(text)) {
    contextScores[ContextType.CHECKLIST] += 10;
  }
  
  // Maintenance document keywords
  if (/\b(maintenance|repair|overhaul|inspection|service|replacement|part|tool)\b/i.test(text)) {
    contextScores[ContextType.MAINTENANCE_DOCUMENT] += 5;
  }
  if (/\b(scheduled|unscheduled|periodic|life-limited|time-controlled|airworthiness)\b/i.test(text)) {
    contextScores[ContextType.MAINTENANCE_DOCUMENT] += 3;
  }
  
  // Safety bulletin keywords
  if (/\b(safety|bulletin|alert|warning|caution|notice|advisory|incident|accident)\b/i.test(text)) {
    contextScores[ContextType.SAFETY_BULLETIN] += 5;
  }
  if (/\b(immediate|attention|critical|urgent|hazard|danger|risk|mandatory)\b/i.test(text)) {
    contextScores[ContextType.SAFETY_BULLETIN] += 3;
  }
  
  // Find the context with the highest score
  let highestScore = 0;
  let primaryContext = ContextType.GENERAL;
  
  for (const [context, score] of Object.entries(contextScores)) {
    if (score > highestScore) {
      highestScore = score;
      primaryContext = context as ContextType;
    }
  }
  
  return primaryContext;
}

/**
 * Extract contexts from document structure
 */
function extractSectionContexts(
  structure: DocumentStructure, 
  primaryContext: ContextType,
  options: ContextParsingOptions
): SectionContext[] {
  const sectionContexts: SectionContext[] = [];
  
  // Process the document hierarchy
  processElementForSectionContext(structure.hierarchy, null, sectionContexts, primaryContext, options);
  
  return sectionContexts;
}

/**
 * Process a document element for section context
 */
function processElementForSectionContext(
  element: DocumentElement,
  parentId: string | null,
  sections: SectionContext[],
  primaryContext: ContextType,
  options: ContextParsingOptions
) {
  // Only create sections for headings and sections
  if (element.type === StructureType.HEADING || element.type === StructureType.SECTION) {
    const sectionId = `section-${sections.length + 1}`;
    
    // Determine the context type for this section
    const sectionContextType = detectSectionContext(element.text, primaryContext);
    const confidence = calculateContextConfidence(element.text, sectionContextType);
    
    // Extract entities for this section
    const entities = extractEntitiesByContext(
      element.text, 
      sectionContextType,
      options
    );
    
    // Create the section context
    const sectionContext: SectionContext = {
      id: sectionId,
      title: element.text,
      contextType: sectionContextType,
      parentContext: parentId,
      confidence,
      entities,
      contextualImportance: calculateSectionImportance(element, sectionContextType, entities)
    };
    
    if (options.extractReferences) {
      sectionContext.regulatoryReferences = extractRegulatoryReferences(element.text);
    }
    
    sections.push(sectionContext);
    
    // Process children if available
    if (element.children && element.children.length > 0) {
      element.children.forEach(child => {
        processElementForSectionContext(child, sectionId, sections, primaryContext, options);
      });
    }
  } else if (element.children && element.children.length > 0) {
    // Process children for other element types
    element.children.forEach(child => {
      processElementForSectionContext(child, parentId, sections, primaryContext, options);
    });
  }
}

/**
 * Extract sections from text when no structure is available
 */
function extractSectionsFromText(
  text: string,
  primaryContext: ContextType,
  options: ContextParsingOptions
): SectionContext[] {
  const sections: SectionContext[] = [];
  
  // Basic section extraction using regex for headings
  // This is a simplified approach - in a real system, more sophisticated NLP would be used
  const headingPattern = /^(#{1,6}\s+|\d+(\.\d+)*\s+|\w+\.\s+)(.+)$/gm;
  const matches = [...text.matchAll(headingPattern)];
  
  if (matches.length === 0) {
    // If no headings found, treat the entire document as one section
    const entities = extractEntitiesByContext(text, primaryContext, options);
    
    sections.push({
      id: 'section-1',
      contextType: primaryContext,
      confidence: 0.7,
      entities,
      contextualImportance: 50
    });
    
    return sections;
  }
  
  // Process each heading as a section
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const sectionTitle = match[3].trim();
    const startPos = match.index!;
    const endPos = i < matches.length - 1 ? matches[i + 1].index! : text.length;
    
    const sectionText = text.substring(startPos, endPos);
    const sectionContextType = detectSectionContext(sectionText, primaryContext);
    const entities = extractEntitiesByContext(sectionText, sectionContextType, options);
    
    sections.push({
      id: `section-${i + 1}`,
      title: sectionTitle,
      contextType: sectionContextType,
      confidence: calculateContextConfidence(sectionText, sectionContextType),
      entities,
      contextualImportance: calculateSectionImportanceFromText(sectionText, entities),
      regulatoryReferences: options.extractReferences ? extractRegulatoryReferences(sectionText) : undefined
    });
  }
  
  return sections;
}

/**
 * Detect the context type for a section
 */
function detectSectionContext(text: string, documentContext: ContextType): ContextType {
  // First, try to detect a specific context from the text
  const detectedContext = detectPrimaryContext(text);
  
  // If we detected something specific (not GENERAL), use that
  if (detectedContext !== ContextType.GENERAL) {
    return detectedContext;
  }
  
  // Otherwise, inherit from document context
  return documentContext;
}

/**
 * Calculate confidence score for context detection
 */
function calculateContextConfidence(text: string, contextType: ContextType): number {
  if (contextType === ContextType.GENERAL) {
    return 0.5; // Lower confidence for general context
  }
  
  const contextScores: Record<ContextType, number> = {
    [ContextType.REGULATORY]: 0,
    [ContextType.TECHNICAL_MANUAL]: 0,
    [ContextType.TRAINING_MATERIAL]: 0,
    [ContextType.OPERATING_PROCEDURE]: 0,
    [ContextType.CHECKLIST]: 0,
    [ContextType.MAINTENANCE_DOCUMENT]: 0,
    [ContextType.SAFETY_BULLETIN]: 0,
    [ContextType.GENERAL]: 0
  };
  
  // Simple keyword matching to assess confidence
  // This would be more sophisticated in a production system
  
  // Count the keyword matches for the detected context
  let keywordCount = 0;
  let totalWordCount = text.split(/\s+/).length;
  
  switch (contextType) {
    case ContextType.REGULATORY:
      keywordCount = (text.match(/\b(regulation|compliance|rule|requirement|law|statute|directive|standard|certification|EASA|FAA|CAA|ICAO|part 61|part 91|part 121|part 135|CFR|CAR)\b/gi) || []).length;
      break;
    case ContextType.TECHNICAL_MANUAL:
      keywordCount = (text.match(/\b(manual|technical|specification|aircraft|system|component|engine|avionics|installation|operation|maintenance|troubleshooting|diagram|schematic)\b/gi) || []).length;
      break;
    case ContextType.TRAINING_MATERIAL:
      keywordCount = (text.match(/\b(training|learn|course|study|instructor|student|lesson|syllabus|curriculum|exam|test|assessment|exercise|module|objective|competency|skill)\b/gi) || []).length;
      break;
    case ContextType.OPERATING_PROCEDURE:
      keywordCount = (text.match(/\b(procedure|operation|protocol|step|instruction|sequence|flight|pilot|normal|abnormal|emergency|takeoff|landing|cruise|approach|departure)\b/gi) || []).length;
      break;
    case ContextType.CHECKLIST:
      keywordCount = (text.match(/\b(checklist|check|item|verify|confirm|complete|pre-flight|post-flight)\b|(□|\[\s*\]|\(\s*\)|✓|✗)/gi) || []).length;
      break;
    case ContextType.MAINTENANCE_DOCUMENT:
      keywordCount = (text.match(/\b(maintenance|repair|overhaul|inspection|service|replacement|part|tool|scheduled|unscheduled|periodic|life-limited|time-controlled|airworthiness)\b/gi) || []).length;
      break;
    case ContextType.SAFETY_BULLETIN:
      keywordCount = (text.match(/\b(safety|bulletin|alert|warning|caution|notice|advisory|incident|accident|immediate|attention|critical|urgent|hazard|danger|risk|mandatory)\b/gi) || []).length;
      break;
    default:
      return 0.5;
  }
  
  // Calculate confidence based on keyword density
  if (totalWordCount === 0) {
    return 0.5;
  }
  
  const keywordDensity = keywordCount / totalWordCount;
  
  // Map density to confidence score (0.5-1.0)
  // Even with no keywords, we maintain 0.5 confidence based on the document-level detection
  return Math.min(0.5 + (keywordDensity * 5), 1.0);
}

/**
 * Calculate importance of a section based on structure info
 */
function calculateSectionImportance(
  element: DocumentElement, 
  contextType: ContextType,
  entities: ContextualEntity[]
): number {
  let importance = 50; // Start with a neutral score
  
  // Adjust based on heading level (if applicable)
  if (element.type === StructureType.HEADING && typeof element.level === 'number') {
    // Higher level headings (h1, h2) are more important
    importance += (6 - Math.min(element.level, 6)) * 5;
  }
  
  // Adjust based on position in document
  if (element.metadata && typeof element.metadata.pageNumber === 'number') {
    // Entities on first pages might be more important in some contexts
    if (element.metadata.pageNumber === 1) {
      importance += 5;
    }
  }
  
  // Adjust based on entities
  importance += Math.min(entities.length * 2, 20);
  
  // Adjust based on context type
  switch (contextType) {
    case ContextType.SAFETY_BULLETIN:
    case ContextType.REGULATORY:
      importance += 10; // Safety and regulatory content is usually high importance
      break;
    case ContextType.OPERATING_PROCEDURE:
    case ContextType.CHECKLIST:
      importance += 5; // Operational content is moderately high importance
      break;
  }
  
  // Cap at 0-100 range
  return Math.max(0, Math.min(100, importance));
}

/**
 * Calculate importance of a section based only on text
 */
function calculateSectionImportanceFromText(
  text: string,
  entities: ContextualEntity[]
): number {
  let importance = 50; // Start with a neutral score
  
  // Check if the section seems to be a high-level heading
  if (/^#\s|^1\.\s/.test(text)) {
    importance += 15;
  } else if (/^#{2}\s|^\d+\.\d+\s/.test(text)) {
    importance += 10;
  }
  
  // Check for keyword indicators of importance
  if (/\b(important|critical|essential|key|significant|mandatory|required|necessary)\b/i.test(text)) {
    importance += 10;
  }
  
  // Check for warning/safety language
  if (/\b(warning|caution|danger|alert|attention|safety|hazard)\b/i.test(text)) {
    importance += 15;
  }
  
  // Adjust based on entities
  importance += Math.min(entities.length * 2, 20);
  
  // Section length can be an indicator of importance
  const wordCount = text.split(/\s+/).length;
  if (wordCount > 200) {
    importance += 5; // Longer sections might be more substantive
  }
  
  // Cap at 0-100 range
  return Math.max(0, Math.min(100, importance));
}

/**
 * Extract entity information based on context type
 */
function extractEntitiesByContext(
  text: string,
  contextType: ContextType,
  options: ContextParsingOptions
): ContextualEntity[] {
  const entities: ContextualEntity[] = [];
  
  // Define context-specific entity extraction patterns
  let patterns: Array<{
    type: string;
    pattern: RegExp;
    confidence: number;
    context: string;
  }> = [];
  
  // Common aviation entities for all contexts
  const commonPatterns = [
    {
      type: 'aircraft_type',
      pattern: /\b([A-Z]+-\d+|[A-Z]\d+|Boeing \d+|Airbus [A-Z]\d+|Cessna \d+|Piper [A-Za-z0-9-]+)\b/g,
      confidence: 0.85,
      context: 'aviation'
    },
    {
      type: 'airport',
      pattern: /\b([A-Z]{3,4})\b/g, // Simplified; real implementation would check against airport code database
      confidence: 0.6,
      context: 'aviation'
    }
  ];
  
  // Add common aviation patterns
  patterns.push(...commonPatterns);
  
  // Add context-specific patterns
  switch (contextType) {
    case ContextType.REGULATORY:
      patterns.push(
        {
          type: 'regulation',
          pattern: /\b(14 CFR|Part \d+(\.\d+)*|§\s*\d+(\.\d+)*|FAR \d+(\.\d+)*|EASA Part-[A-Z]+|CAR \d+|ICAO Annex \d+)\b/g,
          confidence: 0.9,
          context: 'regulatory'
        },
        {
          type: 'requirement',
          pattern: /\b(shall|must|required|mandatory|necessary)\b/g,
          confidence: 0.75,
          context: 'regulatory'
        },
        {
          type: 'date',
          pattern: /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4}|[A-Z][a-z]+ \d{1,2}, \d{4})\b/g,
          confidence: 0.8,
          context: 'regulatory'
        }
      );
      break;
      
    case ContextType.TECHNICAL_MANUAL:
      patterns.push(
        {
          type: 'system',
          pattern: /\b(hydraulic|electrical|avionics|fuel|engine|landing gear|flight control|navigation|communications)\s+system\b/gi,
          confidence: 0.85,
          context: 'technical'
        },
        {
          type: 'component',
          pattern: /\b(valve|pump|actuator|sensor|switch|relay|circuit|breaker|indicator|display|filter|regulator|controller)\b/gi,
          confidence: 0.8,
          context: 'technical'
        },
        {
          type: 'measurement',
          pattern: /\b(\d+(\.\d+)?\s*(kg|mm|cm|m|ft|in|lb|psi|hPa|kPa|°C|°F|kt|nm))\b/g,
          confidence: 0.9,
          context: 'technical'
        }
      );
      break;
      
    case ContextType.TRAINING_MATERIAL:
      patterns.push(
        {
          type: 'learning_objective',
          pattern: /\b(learning objective|after completing this|by the end of this|students will|be able to)\b/gi,
          confidence: 0.8,
          context: 'training'
        },
        {
          type: 'competency',
          pattern: /\b(competency|skill|knowledge|ability|proficiency|understand|demonstrate|perform)\b/gi,
          confidence: 0.75,
          context: 'training'
        },
        {
          type: 'assessment',
          pattern: /\b(test|exam|quiz|assessment|evaluation|check|grade)\b/gi,
          confidence: 0.8,
          context: 'training'
        }
      );
      break;
      
    case ContextType.OPERATING_PROCEDURE:
      patterns.push(
        {
          type: 'procedure_step',
          pattern: /\b(\d+\)|\d+\.|[A-Z]\)|•)\s+([A-Z][^.!?]*[.!?])/g,
          confidence: 0.85,
          context: 'procedure'
        },
        {
          type: 'flight_phase',
          pattern: /\b(takeoff|departure|climb|cruise|descent|approach|landing|taxi)\b/gi,
          confidence: 0.9,
          context: 'procedure'
        },
        {
          type: 'flight_parameter',
          pattern: /\b(speed|altitude|heading|course|flaps|gear|throttle|power|trim|V\d|V[A-Z]|IAS|TAS|FL\d+)\b/gi,
          confidence: 0.85,
          context: 'procedure'
        }
      );
      break;
      
    case ContextType.CHECKLIST:
      patterns.push(
        {
          type: 'checklist_item',
          pattern: /\b([A-Z][A-Za-z\s]+)[\s.]+\.{2,}[\s.]*([A-Za-z0-9]+)/g,
          confidence: 0.9,
          context: 'checklist'
        },
        {
          type: 'checklist_action',
          pattern: /\b(check|verify|confirm|ensure|set|position|place|move|select|press|pull|push|rotate|test)\b/gi,
          confidence: 0.8,
          context: 'checklist'
        },
        {
          type: 'checkbox',
          pattern: /□|\[\s*\]|\(\s*\)|☐/g,
          confidence: 0.95,
          context: 'checklist'
        }
      );
      break;
      
    case ContextType.MAINTENANCE_DOCUMENT:
      patterns.push(
        {
          type: 'part_number',
          pattern: /\b([A-Z0-9]+-[A-Z0-9]+|P\/N \d+)\b/g,
          confidence: 0.9,
          context: 'maintenance'
        },
        {
          type: 'maintenance_action',
          pattern: /\b(inspect|replace|remove|install|service|lubricate|clean|adjust|repair|overhaul|check)\b/gi,
          confidence: 0.85,
          context: 'maintenance'
        },
        {
          type: 'tool',
          pattern: /\b(wrench|screwdriver|pliers|socket|torque|gauge|meter|tester|kit|tool)\b/gi,
          confidence: 0.8,
          context: 'maintenance'
        }
      );
      break;
      
    case ContextType.SAFETY_BULLETIN:
      patterns.push(
        {
          type: 'safety_action',
          pattern: /\b(immediately|without delay|urgent|promptly|as soon as possible|prior to further flight)\b/gi,
          confidence: 0.9,
          context: 'safety'
        },
        {
          type: 'hazard',
          pattern: /\b(hazard|danger|risk|unsafe|critical|serious|severe|failure|malfunction|problem|issue)\b/gi,
          confidence: 0.85,
          context: 'safety'
        },
        {
          type: 'reference_number',
          pattern: /\b(SB-\d+|SIL-\d+|AD \d+-\d+-\d+|SA-\d+)\b/g,
          confidence: 0.9,
          context: 'safety'
        }
      );
      break;
  }
  
  // Extract entities based on patterns
  const entityMap = new Map<string, ContextualEntity>(); // Used to deduplicate
  
  for (const patternInfo of patterns) {
    const matches = [...text.matchAll(patternInfo.pattern)];
    
    for (const match of matches) {
      const value = match[0];
      const confidence = patternInfo.confidence;
      
      // Skip entities that don't meet confidence threshold
      if (confidence < (options.minEntityConfidence || 0)) {
        continue;
      }
      
      const entityId = `${patternInfo.type}-${value}-${match.index}`;
      
      // Skip if we've already extracted this entity
      if (entityMap.has(entityId)) {
        continue;
      }
      
      const entity: ContextualEntity = {
        id: entityId,
        type: patternInfo.type,
        value,
        context: patternInfo.context,
        confidence,
        beginOffset: match.index || 0,
        endOffset: (match.index || 0) + value.length
      };
      
      entityMap.set(entityId, entity);
    }
  }
  
  return Array.from(entityMap.values()).slice(
    0, options.maxEntitiesPerSection || 100
  );
}

/**
 * Extract regulatory references from text
 */
function extractRegulatoryReferences(text: string): string[] {
  const references: Set<string> = new Set();
  
  // Common regulatory reference patterns
  const patterns = [
    // FAA FARs
    /\b(14 CFR\s+|\bFAR\s+)?Part\s+(\d+)(\.\d+)*\b/gi,
    // FAA Advisory Circulars
    /\bAC\s+(\d+-\d+[A-Z]?)\b/g,
    // EASA regulations
    /\bEASA\s+(Part-[A-Z]+|CS-[A-Z]+|AMC-[A-Z]+)\b/g,
    // ICAO annexes
    /\bICAO\s+Annex\s+(\d+)\b/gi,
    // Transport Canada
    /\bCAR\s+(\d+)(\.\d+)*\b/gi,
    // UK CAA
    /\bCAP\s+(\d+)\b/gi,
    // Generic section references
    /\b§\s*(\d+)(\.\d+)*\b/g
  ];
  
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      references.add(match[0]);
    }
  }
  
  return Array.from(references);
}

/**
 * Generate key insights from the document context
 */
function generateKeyInsights(context: DocumentContext): string[] {
  const insights: string[] = [];
  
  // Insights based on context type
  switch (context.primaryContext) {
    case ContextType.REGULATORY:
      insights.push('Document contains regulatory content that may require compliance tracking.');
      break;
    case ContextType.TECHNICAL_MANUAL:
      insights.push('Technical manual with detailed system and component information.');
      break;
    case ContextType.TRAINING_MATERIAL:
      insights.push('Training material with learning objectives and competency requirements.');
      break;
    case ContextType.OPERATING_PROCEDURE:
      insights.push('Operating procedures document with specific flight phase instructions.');
      break;
    case ContextType.CHECKLIST:
      insights.push('Checklist with sequential verification items.');
      break;
    case ContextType.MAINTENANCE_DOCUMENT:
      insights.push('Maintenance document with service and inspection requirements.');
      break;
    case ContextType.SAFETY_BULLETIN:
      insights.push('Safety bulletin with critical safety information.');
      break;
  }
  
  // Add insight about most important sections
  const importantSections = context.sections
    .filter(s => s.contextualImportance > 75)
    .sort((a, b) => b.contextualImportance - a.contextualImportance)
    .slice(0, 3);
  
  if (importantSections.length > 0) {
    const sectionTitles = importantSections
      .map(s => s.title || `Section ${s.id}`)
      .join(', ');
    insights.push(`Key sections identified: ${sectionTitles}`);
  }
  
  // Add insight about entity types
  const entityTypes = new Set<string>();
  for (const entity of context.entities) {
    entityTypes.add(entity.type);
  }
  
  if (entityTypes.size > 0) {
    const topTypes = Array.from(entityTypes).slice(0, 5).join(', ');
    insights.push(`Contains information about: ${topTypes}`);
  }
  
  // Add insight about references if present
  const allReferences: string[] = [];
  for (const section of context.sections) {
    if (section.regulatoryReferences && section.regulatoryReferences.length > 0) {
      allReferences.push(...section.regulatoryReferences);
    }
  }
  
  if (allReferences.length > 0) {
    const uniqueReferences = Array.from(new Set(allReferences));
    if (uniqueReferences.length > 3) {
      insights.push(`References ${uniqueReferences.length} regulatory standards.`);
    } else {
      insights.push(`References regulatory standards: ${uniqueReferences.join(', ')}`);
    }
  }
  
  // Add insight about cross-references if present
  if (context.crossReferences.length > 0) {
    insights.push(`Contains ${context.crossReferences.length} cross-references between content sections.`);
  }
  
  return insights;
}

/**
 * Calculate overall contextual score for the document
 */
function calculateContextualScore(context: DocumentContext): number {
  let score = 50; // Start with neutral score
  
  // Factor 1: Context confidence across sections
  const avgConfidence = context.sections.reduce(
    (sum, section) => sum + section.confidence, 
    0
  ) / Math.max(1, context.sections.length);
  
  score += (avgConfidence - 0.5) * 20; // Adjust by -10 to +10 based on confidence
  
  // Factor 2: Entity richness
  const entityDensity = context.entities.length / 
    Math.max(1, context.sections.reduce((sum, s) => sum + s.entities.length, 0));
  
  score += Math.min(entityDensity * 15, 15); // Up to +15 for entity richness
  
  // Factor 3: Cross-reference density
  const crossRefDensity = context.crossReferences.length / Math.max(1, context.sections.length);
  score += Math.min(crossRefDensity * 10, 10); // Up to +10 for cross-references
  
  // Factor 4: Contextual clarity (is it strongly one context or mixed?)
  const contextTypeCounts: Record<ContextType, number> = {
    [ContextType.REGULATORY]: 0,
    [ContextType.TECHNICAL_MANUAL]: 0,
    [ContextType.TRAINING_MATERIAL]: 0,
    [ContextType.OPERATING_PROCEDURE]: 0,
    [ContextType.CHECKLIST]: 0,
    [ContextType.MAINTENANCE_DOCUMENT]: 0,
    [ContextType.SAFETY_BULLETIN]: 0,
    [ContextType.GENERAL]: 0
  };
  
  for (const section of context.sections) {
    contextTypeCounts[section.contextType]++;
  }
  
  const totalSections = context.sections.length;
  const primaryContextPercentage = (contextTypeCounts[context.primaryContext] / Math.max(1, totalSections)) * 100;
  
  // If document is strongly one context type, boost score
  if (primaryContextPercentage > 80) {
    score += 10;
  } else if (primaryContextPercentage > 60) {
    score += 5;
  } else {
    score -= 5; // Mixed context types
  }
  
  // Cap at 0-100 range
  return Math.max(0, Math.min(100, score));
}

/**
 * Detect cross-references between document sections
 */
function detectCrossReferences(context: DocumentContext): Array<{source: string, target: string, type: string}> {
  const crossReferences: Array<{source: string, target: string, type: string}> = [];
  
  // Create a map of section titles for efficient lookup
  const sectionTitleMap = new Map<string, string>();
  for (const section of context.sections) {
    if (section.title) {
      sectionTitleMap.set(section.title.toLowerCase(), section.id);
    }
  }
  
  // Look for references to other sections in each section
  for (const sourceSection of context.sections) {
    const sourceText = sourceSection.title || '';
    
    // Skip sections without text content
    if (!sourceText) {
      continue;
    }
    
    // Common cross-reference patterns
    const patterns = [
      /\b(see|refer to|as described in|as shown in|as mentioned in|as discussed in)\s+([^.,;:]+)/gi,
      /\b(section|chapter|part)\s+(\d+(\.\d+)*)/gi,
      /\b(above|below|following|previous)\s+(section|chapter|figure|table)/gi
    ];
    
    for (const pattern of patterns) {
      const matches = [...sourceText.matchAll(pattern)];
      
      for (const match of matches) {
        const refType = match[1] ? match[1].toLowerCase() : 'reference';
        const refTarget = match[2] ? match[2].toLowerCase().trim() : '';
        
        // Look for a matching section
        for (const [title, id] of sectionTitleMap.entries()) {
          if (title.includes(refTarget) || refTarget.includes(title)) {
            // Skip self-references
            if (id !== sourceSection.id) {
              crossReferences.push({
                source: sourceSection.id,
                target: id,
                type: refType
              });
            }
          }
        }
        
        // Look for numeric section references
        if (/^\d+(\.\d+)*$/.test(refTarget)) {
          const targetSection = context.sections.find(s => {
            return s.title && s.title.startsWith(refTarget);
          });
          
          if (targetSection && targetSection.id !== sourceSection.id) {
            crossReferences.push({
              source: sourceSection.id,
              target: targetSection.id,
              type: refType
            });
          }
        }
      }
    }
  }
  
  return crossReferences;
}

/**
 * Convert extraction result to document structure
 */
async function importStructureFromExtraction(extraction: ExtractionResult): Promise<DocumentStructure> {
  // If the extraction already has structural information, use that
  if (extraction.structured && extraction.structured.headings) {
    // This is a simplified conversion
    const rootElement: DocumentElement = {
      type: StructureType.SECTION,
      text: extraction.metadata.title || 'Document Root',
      children: []
    };
    
    // Create a basic hierarchy based on headings
    let currentParent = rootElement;
    let previousLevel = 0;
    const parentStack: DocumentElement[] = [rootElement];
    
    for (const heading of extraction.structured.headings) {
      const headingElement: DocumentElement = {
        type: StructureType.HEADING,
        text: heading.text,
        level: heading.level,
        metadata: {
          pageNumber: heading.pageIndex
        },
        children: []
      };
      
      // Adjust parent based on heading level
      if (heading.level > previousLevel) {
        // Going deeper, push current parent to stack
        parentStack.push(currentParent);
        currentParent = parentStack[parentStack.length - 1];
      } else if (heading.level < previousLevel) {
        // Going up, pop from stack
        for (let i = 0; i < (previousLevel - heading.level); i++) {
          parentStack.pop();
        }
        currentParent = parentStack[parentStack.length - 1];
      }
      
      // Add heading to current parent
      currentParent.children!.push(headingElement);
      
      // Create a section element for the heading content
      const sectionElement: DocumentElement = {
        type: StructureType.SECTION,
        text: heading.text,
        parent: headingElement,
        children: []
      };
      
      headingElement.children!.push(sectionElement);
      currentParent = sectionElement;
      previousLevel = heading.level;
    }
    
    // Create the structure object
    return {
      title: extraction.metadata.title,
      elements: [rootElement],
      hierarchy: rootElement,
      metadata: {
        processingTime: extraction.metadata.processTime || 0,
        confidence: extraction.metadata.confidence || 0.7,
        pageCount: extraction.metadata.pageCount,
        format: extraction.metadata.format,
        language: extraction.metadata.language
      }
    };
  }
  
  // If no structural information, create a basic structure
  const paragraphs = extraction.text.split(/\n\s*\n/);
  const rootElement: DocumentElement = {
    type: StructureType.SECTION,
    text: extraction.metadata.title || 'Document Root',
    children: []
  };
  
  // Add each paragraph as a paragraph element
  for (const paragraph of paragraphs) {
    if (paragraph.trim().length === 0) {
      continue;
    }
    
    const paragraphElement: DocumentElement = {
      type: StructureType.PARAGRAPH,
      text: paragraph.trim(),
      parent: rootElement
    };
    
    rootElement.children!.push(paragraphElement);
  }
  
  return {
    title: extraction.metadata.title,
    elements: [rootElement, ...rootElement.children!],
    hierarchy: rootElement,
    metadata: {
      processingTime: extraction.metadata.processTime || 0,
      confidence: extraction.metadata.confidence || 0.5,
      pageCount: extraction.metadata.pageCount,
      format: extraction.metadata.format,
      language: extraction.metadata.language
    }
  };
}

/**
 * Extract text from document structure
 */
function extractTextFromStructure(structure: DocumentStructure): string {
  let text = '';
  
  function extractTextFromElement(element: DocumentElement): void {
    text += element.text + '\n';
    
    if (element.children && element.children.length > 0) {
      for (const child of element.children) {
        extractTextFromElement(child);
      }
    }
  }
  
  extractTextFromElement(structure.hierarchy);
  return text;
}