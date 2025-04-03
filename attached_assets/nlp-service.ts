import nlp from 'compromise';
import { Logger } from '../utils/logger';

// Define aviation concept categories
const AVIATION_CATEGORIES = [
  'flight_operations',
  'aircraft_systems',
  'navigation',
  'regulations',
  'emergency_procedures',
  'weather',
  'communications',
  'training',
  'maintenance',
  'safety'
];

// Important aviation-specific terms to look for
const AVIATION_TERMS = {
  flight_operations: [
    'takeoff', 'landing', 'cruise', 'climb', 'descent', 'approach', 'departure', 'flight planning',
    'weight and balance', 'performance calculation', 'holding pattern', 'traffic pattern'
  ],
  aircraft_systems: [
    'engine', 'propeller', 'hydraulic system', 'electrical system', 'fuel system', 'avionics',
    'landing gear', 'flight controls', 'pressurization', 'anti-ice', 'autopilot', 'aircraft instruments'
  ],
  navigation: [
    'VOR', 'ILS', 'GPS', 'waypoint', 'airway', 'SID', 'STAR', 'approach plate', 'chart',
    'navigation', 'route', 'flight plan', 'sectional', 'terminal procedure', 'enroute'
  ],
  regulations: [
    'FAR', 'regulation', 'compliance', 'certification', 'license', 'rating', 'authorization',
    'airworthiness directive', 'service bulletin', 'requirement', 'limitation', 'restriction'
  ],
  emergency_procedures: [
    'emergency', 'failure', 'malfunction', 'abnormal procedure', 'evacuation', 'forced landing',
    'engine out', 'fire', 'ditching', 'decompression', 'system failure', 'engine failure'
  ],
  weather: [
    'METAR', 'TAF', 'turbulence', 'thunderstorm', 'ceiling', 'visibility', 'wind shear',
    'precipitation', 'icing', 'fog', 'frontal system', 'weather radar'
  ],
  communications: [
    'ATC', 'clearance', 'radio communication', 'frequency', 'transponder', 'ATIS', 'CTAF',
    'readback', 'phraseology', 'radio', 'transmission', 'communication failure'
  ],
  training: [
    'training program', 'syllabus', 'lesson plan', 'flight instructor', 'ground school',
    'simulator', 'checkride', 'proficiency check', 'training record', 'qualification', 'curriculum'
  ],
  maintenance: [
    'maintenance procedure', 'inspection', 'overhaul', 'repair', 'replacement', 'service',
    'test flight', 'maintenance record', 'component', 'part', 'tool', 'mechanic'
  ],
  safety: [
    'safety procedure', 'safety management system', 'risk assessment', 'hazard', 'safety report',
    'incident', 'accident', 'prevention', 'crew resource management', 'human factors', 'fatigue'
  ]
};

// Relationship types in aviation knowledge
const RELATIONSHIP_PATTERNS = [
  {
    type: 'PREREQUISITE_FOR',
    patterns: [
      '% is required for %',
      '% is a prerequisite for %',
      '% must be completed before %',
      '% precedes %',
      'before %',
      'prior to %'
    ]
  },
  {
    type: 'PART_OF',
    patterns: [
      '% is part of %',
      '% belongs to %',
      '% is a component of %',
      '% is included in %',
      '% comprises %',
      '% contains %'
    ]
  },
  {
    type: 'RELATED_TO',
    patterns: [
      '% relates to %',
      '% is associated with %',
      '% connects to %',
      '% and %',
      '% is similar to %',
      '% like %'
    ]
  },
  {
    type: 'CAUSES',
    patterns: [
      '% causes %',
      '% leads to %',
      '% results in %',
      '% triggers %',
      '% induces %',
      'if % then %'
    ]
  },
  {
    type: 'FOLLOWS',
    patterns: [
      '% follows %',
      '% after %',
      'following %',
      '% succeeds %',
      '% is performed after %',
      'subsequent to %'
    ]
  }
];

// Types for concept and relationship extraction
export type AviationConcept = {
  name: string;
  category: string;
  description: string;
  importance?: number;
  contextSentence?: string;
};

export type ConceptRelationship = {
  source: string;
  target: string;
  type: string;
  strength?: number;
  context?: string;
};

const logger = new Logger('NLPService');

/**
 * Extract aviation-specific concepts from text
 * @param text - Document text content
 * @returns Promise<AviationConcept[]> - Extracted concepts
 */
export async function extractConcepts(text: string): Promise<AviationConcept[]> {
  try {
    const concepts: AviationConcept[] = [];
    const doc = nlp(text);
    
    // Split text into sentences for better context
    const sentences = doc.sentences().out('array');
    
    // Process each aviation term category
    Object.entries(AVIATION_TERMS).forEach(([category, terms]) => {
      terms.forEach(term => {
        const matchingSentences = sentences.filter(sentence => 
          sentence.toLowerCase().includes(term.toLowerCase())
        );
        
        if (matchingSentences.length > 0) {
          // Concept found, add it to our list
          concepts.push({
            name: term,
            category,
            description: generateConceptDescription(term, matchingSentences[0]),
            importance: calculateTermImportance(term, matchingSentences.length, text),
            contextSentence: matchingSentences[0]
          });
        }
      });
    });

    // Additionally, extract terms that look like aviation concepts but aren't in our predefined list
    extractAdditionalAviationConcepts(text, concepts);
    
    return concepts;
  } catch (error) {
    logger.error(`Error extracting concepts: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Extract relationships between aviation concepts
 * @param text - Document text content
 * @param concepts - Extracted aviation concepts
 * @returns Promise<ConceptRelationship[]> - Extracted relationships
 */
export async function extractRelationships(
  text: string,
  concepts: AviationConcept[]
): Promise<ConceptRelationship[]> {
  try {
    const relationships: ConceptRelationship[] = [];
    const conceptNames = concepts.map(c => c.name);
    
    // Split text into sentences for relationship extraction
    const sentences = nlp(text).sentences().out('array');
    
    // Check each sentence for relationships between concepts
    sentences.forEach(sentence => {
      // Look for explicit relationship patterns
      RELATIONSHIP_PATTERNS.forEach(pattern => {
        pattern.patterns.forEach(patternStr => {
          // Replace % with concept patterns
          const matchPattern = patternStr.replace(/%/g, '(.+?)');
          const matches = sentence.match(new RegExp(matchPattern, 'i'));
          
          if (matches && matches.length >= 3) {
            const source = findClosestConcept(matches[1], conceptNames);
            const target = findClosestConcept(matches[2], conceptNames);
            
            if (source && target && source !== target) {
              relationships.push({
                source,
                target,
                type: pattern.type,
                strength: 0.8, // High confidence for pattern match
                context: sentence
              });
            }
          }
        });
      });
      
      // Detect co-occurrence based relationships
      detectCoOccurrenceRelationships(sentence, conceptNames, relationships);
    });
    
    // Add hierarchical relationships based on concept categories
    addHierarchicalRelationships(concepts, relationships);
    
    return relationships;
  } catch (error) {
    logger.error(`Error extracting relationships: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Extract additional aviation concepts that aren't in our predefined list
 * @param text - Document text content
 * @param concepts - Existing concepts array to append to
 */
function extractAdditionalAviationConcepts(text: string, concepts: AviationConcept[]): void {
  const doc = nlp(text);
  
  // Look for aviation-specific patterns
  const aviationTerms = doc.match('#Noun (procedure|system|check|training|operation)').out('array');
  
  aviationTerms.forEach(term => {
    // Check if this term is already in our concepts list
    if (!concepts.some(c => c.name.toLowerCase() === term.toLowerCase())) {
      // Determine the best category
      let category = 'training';
      if (term.includes('procedure')) category = 'flight_operations';
      if (term.includes('system')) category = 'aircraft_systems';
      if (term.includes('check')) category = 'safety';
      
      concepts.push({
        name: term,
        category,
        description: `Aviation term related to ${category.replace('_', ' ')}`,
        importance: 0.3 // Lower importance for auto-detected terms
      });
    }
  });
}

/**
 * Generate a description for a concept based on its context
 * @param term - Concept term
 * @param context - Context sentence
 * @returns string - Generated description
 */
function generateConceptDescription(term: string, context: string): string {
  // Extract relevant fragment from context
  const termIndex = context.toLowerCase().indexOf(term.toLowerCase());
  if (termIndex === -1) return `Aviation concept related to ${term}`;
  
  // Get a fragment of the context focused on the term
  const startIndex = Math.max(0, termIndex - 50);
  const endIndex = Math.min(context.length, termIndex + term.length + 100);
  const fragment = context.substring(startIndex, endIndex);
  
  return fragment.trim();
}

/**
 * Calculate the importance of a term based on frequency and context
 * @param term - Concept term
 * @param occurrences - Number of occurrences
 * @param fullText - Complete document text
 * @returns number - Importance score (0-1)
 */
function calculateTermImportance(term: string, occurrences: number, fullText: string): number {
  // Basic importance based on number of occurrences
  const frequency = occurrences / (fullText.length / 1000); // Normalized per 1000 chars
  
  // Factors that increase importance
  let importance = 0.5; // Base importance
  
  // Frequency factor (0-0.3)
  importance += Math.min(0.3, frequency * 0.1);
  
  // Title/heading presence factor (0-0.2)
  if (fullText.match(new RegExp(`#+ .*${term}.*`, 'i'))) {
    importance += 0.2;
  }
  
  // Aviation significance factor (0-0.2)
  const significantTerms = ['critical', 'important', 'essential', 'required', 'mandatory'];
  if (significantTerms.some(sigTerm => fullText.match(new RegExp(`${sigTerm} .*${term}`, 'i')))) {
    importance += 0.2;
  }
  
  return Math.min(1, importance);
}

/**
 * Find the closest concept name to a given text
 * @param text - Text to match
 * @param conceptNames - List of concept names
 * @returns string | null - Best matching concept or null
 */
function findClosestConcept(text: string, conceptNames: string[]): string | null {
  text = text.trim().toLowerCase();
  
  // Direct match
  const directMatch = conceptNames.find(name => text.includes(name.toLowerCase()));
  if (directMatch) return directMatch;
  
  // Find partial matches
  const partialMatches = conceptNames.filter(name => {
    const words = name.toLowerCase().split(' ');
    return words.some(word => text.includes(word));
  });
  
  if (partialMatches.length > 0) {
    // Return the longest partial match as it's likely the most specific
    return partialMatches.sort((a, b) => b.length - a.length)[0];
  }
  
  return null;
}

/**
 * Detect relationships based on concept co-occurrence in the same sentence
 * @param sentence - Text sentence
 * @param conceptNames - List of concept names
 * @param relationships - Relationships array to append to
 */
function detectCoOccurrenceRelationships(
  sentence: string,
  conceptNames: string[],
  relationships: ConceptRelationship[]
): void {
  // Find concepts mentioned in this sentence
  const mentionedConcepts = conceptNames.filter(name => 
    sentence.toLowerCase().includes(name.toLowerCase())
  );
  
  // If we have at least two concepts, create RELATED_TO relationships
  if (mentionedConcepts.length >= 2) {
    for (let i = 0; i < mentionedConcepts.length; i++) {
      for (let j = i + 1; j < mentionedConcepts.length; j++) {
        // Check if this relationship already exists
        const exists = relationships.some(r => 
          (r.source === mentionedConcepts[i] && r.target === mentionedConcepts[j]) ||
          (r.source === mentionedConcepts[j] && r.target === mentionedConcepts[i])
        );
        
        if (!exists) {
          relationships.push({
            source: mentionedConcepts[i],
            target: mentionedConcepts[j],
            type: 'RELATED_TO',
            strength: 0.4, // Lower confidence for co-occurrence
            context: sentence
          });
        }
      }
    }
  }
}

/**
 * Add hierarchical relationships based on concept categories
 * @param concepts - Extracted aviation concepts
 * @param relationships - Relationships array to append to
 */
function addHierarchicalRelationships(
  concepts: AviationConcept[],
  relationships: ConceptRelationship[]
): void {
  // Group concepts by category
  const conceptsByCategory: Record<string, AviationConcept[]> = {};
  
  concepts.forEach(concept => {
    if (!conceptsByCategory[concept.category]) {
      conceptsByCategory[concept.category] = [];
    }
    conceptsByCategory[concept.category].push(concept);
  });
  
  // Known hierarchical relationships between categories
  const categoryHierarchy: Record<string, string[]> = {
    'flight_operations': ['navigation', 'communications', 'emergency_procedures'],
    'aircraft_systems': ['maintenance'],
    'regulations': ['safety']
  };
  
  // Add PART_OF relationships for concepts in hierarchical categories
  Object.entries(categoryHierarchy).forEach(([parentCategory, childCategories]) => {
    const parentConcepts = conceptsByCategory[parentCategory] || [];
    
    childCategories.forEach(childCategory => {
      const childConcepts = conceptsByCategory[childCategory] || [];
      
      // Connect the most important parent concept with each child concept
      if (parentConcepts.length > 0 && childConcepts.length > 0) {
        const mostImportantParent = parentConcepts.sort((a, b) => 
          (b.importance || 0) - (a.importance || 0)
        )[0];
        
        childConcepts.forEach(childConcept => {
          relationships.push({
            source: childConcept.name,
            target: mostImportantParent.name,
            type: 'PART_OF',
            strength: 0.6
          });
        });
      }
    });
  });
}