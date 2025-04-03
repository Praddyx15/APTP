/**
 * Document Classification Service
 * 
 * Provides content classification capabilities for documents:
 * - Category classification (technical, regulatory, operational, etc.)
 * - Subject matter identification (aircraft systems, procedures, regulations)
 * - Importance/priority ranking
 * - Content tagging
 * - Document relation clustering
 */

import { ExtractionResult } from './document-extraction';
import { DocumentStructure } from './document-structure';
import { logger } from '../core/logger';

export enum DocumentCategory {
  TECHNICAL = 'technical',
  REGULATORY = 'regulatory',
  OPERATIONAL = 'operational',
  TRAINING = 'training',
  ASSESSMENT = 'assessment',
  REFERENCE = 'reference',
  UNCLASSIFIED = 'unclassified'
}

export enum SubjectArea {
  AIRCRAFT_SYSTEMS = 'aircraft_systems',
  FLIGHT_PROCEDURES = 'flight_procedures',
  EMERGENCY_PROCEDURES = 'emergency_procedures',
  REGULATIONS = 'regulations',
  METEOROLOGY = 'meteorology',
  NAVIGATION = 'navigation',
  HUMAN_FACTORS = 'human_factors',
  COMMUNICATIONS = 'communications',
  GENERAL = 'general'
}

export enum PriorityLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface DocumentClassification {
  category: DocumentCategory;
  subjects: SubjectArea[];
  priority: PriorityLevel;
  tags: string[];
  confidence: number;
  relatedDocumentIds?: number[];
  metadata: {
    keyTerms: Record<string, number>; // term -> frequency
    regulatoryReferences?: string[];
    aircraftTypes?: string[];
    processingTime: number;
  };
}

export interface ClassificationOptions {
  includeRelatedDocuments?: boolean;
  maxRelatedDocuments?: number;
  minConfidenceThreshold?: number;
  includeRegExPatterns?: Record<string, RegExp>;
  includeKeyTerms?: boolean;
}

const DEFAULT_OPTIONS: ClassificationOptions = {
  includeRelatedDocuments: false,
  maxRelatedDocuments: 5,
  minConfidenceThreshold: 0.6,
  includeKeyTerms: true
};

// Stop words that should be ignored during classification
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'because', 'as', 'what', 'which',
  'this', 'that', 'these', 'those', 'then', 'just', 'so', 'than', 'such', 'when',
  'while', 'who', 'whom', 'where', 'why', 'how', 'all', 'any', 'both', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
  'own', 'same', 'too', 'very', 's', 't', 'can', 'will', 'don', 'should', 'now'
]);

// Terms associated with each document category
const CATEGORY_TERMS: Record<DocumentCategory, string[]> = {
  [DocumentCategory.TECHNICAL]: [
    'system', 'component', 'engine', 'hydraulic', 'electrical', 'avionics', 'autopilot',
    'fuel', 'landing gear', 'flaps', 'spoilers', 'thrust', 'power', 'oil', 'maintenance',
    'pressure', 'temperature', 'valve', 'pump', 'circuit', 'wiring', 'brake', 'indicator',
    'display', 'computer', 'technical', 'engineering', 'specification', 'tolerance'
  ],
  [DocumentCategory.REGULATORY]: [
    'regulation', 'compliance', 'law', 'requirement', 'standard', 'authority', 'approved',
    'certification', 'certificate', 'license', 'inspection', 'faa', 'easa', 'icao', 'caa',
    'part', 'section', 'paragraph', 'subpart', 'appendix', 'advisory', 'circular', 'directive',
    'legal', 'authorize', 'enforce', 'mandatory', 'prohibited', 'restriction', 'violation'
  ],
  [DocumentCategory.OPERATIONAL]: [
    'operation', 'procedure', 'checklist', 'sop', 'standard', 'flight', 'preflight', 'takeoff',
    'landing', 'cruise', 'descent', 'climb', 'approach', 'taxi', 'maneuver', 'technique',
    'performance', 'weight', 'balance', 'fuel', 'calculation', 'speed', 'altitude', 'heading',
    'navigation', 'clearance', 'instruction', 'vector', 'route', 'waypoint', 'flight plan'
  ],
  [DocumentCategory.TRAINING]: [
    'training', 'lesson', 'course', 'syllabus', 'instructor', 'student', 'trainee', 'pilot',
    'learning', 'objective', 'skill', 'knowledge', 'competency', 'proficiency', 'exercise',
    'practice', 'simulator', 'scenario', 'briefing', 'debriefing', 'evaluation', 'assessment',
    'grade', 'feedback', 'progress', 'curriculum', 'module', 'demonstration', 'instruction'
  ],
  [DocumentCategory.ASSESSMENT]: [
    'assessment', 'test', 'exam', 'evaluation', 'check', 'checkride', 'proficiency', 'skill',
    'performance', 'measure', 'criteria', 'standard', 'satisfactory', 'unsatisfactory', 'pass',
    'fail', 'grading', 'score', 'result', 'outcome', 'competent', 'deficiency', 'remedial',
    'oral', 'practical', 'written', 'question', 'answer', 'rating', 'examiner', 'instructor'
  ],
  [DocumentCategory.REFERENCE]: [
    'manual', 'handbook', 'guide', 'reference', 'publication', 'document', 'information',
    'data', 'chart', 'diagram', 'illustration', 'figure', 'table', 'appendix', 'index',
    'glossary', 'definition', 'terminology', 'abbreviation', 'acronym', 'section', 'chapter',
    'page', 'revision', 'edition', 'volume', 'supplement', 'library', 'collection'
  ],
  [DocumentCategory.UNCLASSIFIED]: [
    'general', 'miscellaneous', 'other', 'additional', 'various', 'supplementary', 'extra'
  ]
};

// Terms associated with each subject area
const SUBJECT_TERMS: Record<SubjectArea, string[]> = {
  [SubjectArea.AIRCRAFT_SYSTEMS]: [
    'system', 'engine', 'hydraulic', 'electrical', 'avionics', 'fuel', 'oil', 'landing gear',
    'flaps', 'spoilers', 'thrust reverser', 'brake', 'pressurization', 'air conditioning',
    'oxygen', 'fire suppression', 'anti-ice', 'autopilot', 'flight control', 'instruments',
    'navigation', 'communication', 'radar', 'warning', 'indicating', 'lighting', 'power'
  ],
  [SubjectArea.FLIGHT_PROCEDURES]: [
    'procedure', 'checklist', 'normal', 'standard', 'operation', 'takeoff', 'landing',
    'cruise', 'climb', 'descent', 'approach', 'taxi', 'startup', 'shutdown', 'preflight',
    'postflight', 'departure', 'arrival', 'holding', 'missed approach', 'go-around',
    'performance', 'technique', 'maneuver', 'configuration', 'speed', 'altitude'
  ],
  [SubjectArea.EMERGENCY_PROCEDURES]: [
    'emergency', 'abnormal', 'failure', 'malfunction', 'warning', 'caution', 'alert',
    'fire', 'engine failure', 'hydraulic failure', 'electrical failure', 'decompression',
    'evacuation', 'ditching', 'forced landing', 'engine out', 'rejected takeoff', 'aborted',
    'smoke', 'fumes', 'loss of control', 'uncommanded', 'system failure', 'emergency descent'
  ],
  [SubjectArea.REGULATIONS]: [
    'regulation', 'law', 'rule', 'requirement', 'compliance', 'standard', 'certification',
    'airworthiness', 'authorization', 'approval', 'limitation', 'restriction', 'prohibition',
    'faa', 'easa', 'icao', 'caa', 'authority', 'directive', 'order', 'advisory', 'circular',
    'part', 'subpart', 'section', 'paragraph', 'legal', 'enforcement', 'violation'
  ],
  [SubjectArea.METEOROLOGY]: [
    'weather', 'meteorology', 'cloud', 'precipitation', 'wind', 'turbulence', 'visibility',
    'ceiling', 'temperature', 'pressure', 'front', 'storm', 'thunderstorm', 'icing', 'fog',
    'haze', 'snow', 'rain', 'forecast', 'metar', 'taf', 'sigmet', 'airmet', 'chart', 'radar',
    'satellite', 'jet stream', 'shear', 'gust', 'microburst', 'downdraft', 'updraft'
  ],
  [SubjectArea.NAVIGATION]: [
    'navigation', 'route', 'waypoint', 'fix', 'radial', 'bearing', 'heading', 'course',
    'track', 'distance', 'position', 'latitude', 'longitude', 'vor', 'ndb', 'ils', 'dme',
    'gps', 'rnav', 'lnav', 'vnav', 'approach', 'sid', 'star', 'departure', 'arrival',
    'airway', 'intersection', 'chart', 'map', 'procedure', 'planning', 'flight plan'
  ],
  [SubjectArea.HUMAN_FACTORS]: [
    'human factors', 'crew', 'resource management', 'crm', 'decision making', 'judgment',
    'situational awareness', 'workload', 'fatigue', 'stress', 'communication', 'teamwork',
    'leadership', 'followership', 'error', 'mistake', 'violation', 'attitude', 'behavior',
    'performance', 'incapacitation', 'psychological', 'physiological', 'attention', 'memory'
  ],
  [SubjectArea.COMMUNICATIONS]: [
    'communication', 'radio', 'phraseology', 'clearance', 'readback', 'transmission',
    'frequency', 'callsign', 'broadcast', 'instruction', 'atc', 'tower', 'approach',
    'departure', 'center', 'ground', 'atis', 'transponder', 'squawk', 'aviation english',
    'standard phraseology', 'emergency communication', 'lost communication', 'reporting'
  ],
  [SubjectArea.GENERAL]: [
    'general', 'introduction', 'overview', 'background', 'fundamental', 'basic', 'principle',
    'concept', 'theory', 'philosophy', 'approach', 'method', 'practice', 'information',
    'knowledge', 'aviation', 'aeronautical', 'aerospace', 'pilot', 'crew', 'airman'
  ]
};

// Terms associated with each priority level
const PRIORITY_TERMS: Record<PriorityLevel, string[]> = {
  [PriorityLevel.CRITICAL]: [
    'emergency', 'critical', 'urgent', 'warning', 'caution', 'danger', 'hazard', 'safety',
    'required', 'mandatory', 'vital', 'essential', 'immediately', 'prohibit', 'never',
    'always', 'must', 'failure', 'malfunction', 'serious', 'severe', 'extreme', 'life',
    'death', 'fatal', 'accident', 'incident', 'crash', 'fire', 'explosion', 'loss of control'
  ],
  [PriorityLevel.HIGH]: [
    'important', 'significant', 'priority', 'key', 'main', 'major', 'primary', 'fundamental',
    'substantial', 'necessary', 'crucial', 'valuable', 'serious', 'attention', 'ensure',
    'verify', 'check', 'monitor', 'maintain', 'regulation', 'compliance', 'requirement',
    'limitation', 'restriction', 'should', 'recommended', 'strongly', 'advised'
  ],
  [PriorityLevel.MEDIUM]: [
    'procedure', 'standard', 'normal', 'regular', 'routine', 'common', 'typical', 'usual',
    'general', 'conventional', 'moderate', 'average', 'intermediate', 'acceptable', 'suitable',
    'appropriate', 'reasonable', 'adequate', 'sufficient', 'satisfactory', 'may', 'can',
    'might', 'could', 'would', 'guidance', 'recommendation', 'suggestion'
  ],
  [PriorityLevel.LOW]: [
    'supplementary', 'additional', 'extra', 'optional', 'alternative', 'discretionary',
    'elective', 'voluntary', 'non-essential', 'minor', 'minimal', 'marginal', 'slight',
    'trivial', 'incidental', 'background', 'information', 'note', 'reference', 'detail',
    'example', 'illustration', 'clarification', 'explanation', 'description', 'for information'
  ]
};

// Regex patterns for common aviation-related information
const REGEX_PATTERNS: Record<string, RegExp> = {
  aircraftType: /\b([A-Z]{1,4}-[A-Z0-9]{1,5}|B7[0-9]{2}|A[0-9]{3}|CRJ[0-9]{3}|E[0-9]{3}|MD-[0-9]{2})\b/g,
  regulatoryReference: /\b(14\s?CFR\s+Part\s+\d+(\.\d+)?|FAR\s+\d+(\.\d+)?|EASA\s+Part\s+[A-Z]+-[A-Z0-9]+)\b/gi,
  airportCode: /\b[A-Z]{3,4}\b/g,
  altitude: /\b\d{1,3}(?:,\d{3})*\s*(?:ft|feet)\b/gi,
  speed: /\b\d{1,3}\s*(?:kts?|knots?|KIAS)\b/gi,
  heading: /\b(?:heading|HDG)\s+\d{1,3}\b/gi,
  frequency: /\b1[0-9]{2}\.[0-9]{1,3}\b/g,
  flightLevel: /\b(?:FL|Flight Level)\s*\d{1,3}\b/gi,
  date: /\b(?:0?[1-9]|[12][0-9]|3[01])[\/-](?:0?[1-9]|1[012])[\/-](?:19|20)\d\d\b/g
};

/**
 * Main function to classify document content
 */
export async function classifyDocument(
  document: { text: string } | ExtractionResult | DocumentStructure,
  options: ClassificationOptions = DEFAULT_OPTIONS
): Promise<DocumentClassification> {
  const startTime = Date.now();
  
  try {
    // Extract text from the document
    const text = extractText(document);
    
    // Tokenize the text
    const tokens = tokenizeText(text);
    
    // Calculate term frequencies
    const termFrequencies = calculateTermFrequencies(tokens);
    
    // Calculate scores for each category
    const categoryScores = calculateCategoryScores(termFrequencies);
    const topCategory = determineTopCategory(categoryScores);
    
    // Calculate scores for each subject
    const subjectScores = calculateSubjectScores(termFrequencies);
    const topSubjects = determineTopSubjects(subjectScores, 3);
    
    // Calculate scores for priority
    const priorityScores = calculatePriorityScores(termFrequencies);
    const topPriority = determineTopPriority(priorityScores);
    
    // Extract key terms if requested
    const keyTerms = options.includeKeyTerms === true 
      ? extractKeyTerms(termFrequencies) 
      : {};
    
    // Extract tags
    const tags = extractTags(text, termFrequencies, topCategory);
    
    // Extract regulatory references and aircraft types using regex
    const regulatoryReferences = extractRegexMatches(text, REGEX_PATTERNS.regulatoryReference);
    const aircraftTypes = extractRegexMatches(text, REGEX_PATTERNS.aircraftType);
    
    // Extract additional regex patterns if provided
    let additionalTags: string[] = [];
    if (options.includeRegExPatterns === true) {
      // Extract using standard patterns
      Object.keys(REGEX_PATTERNS).forEach(key => {
        if (key !== 'regulatoryReference' && key !== 'aircraftType') {
          additionalTags = additionalTags.concat(extractRegexMatches(text, REGEX_PATTERNS[key]));
        }
      });
    } else if (typeof options.includeRegExPatterns === 'object') {
      // Extract using custom patterns
      Object.values(options.includeRegExPatterns).forEach(pattern => {
        additionalTags = additionalTags.concat(extractRegexMatches(text, pattern));
      });
    }
    
    // Calculate confidence score
    const confidence = calculateConfidenceScore(categoryScores, topCategory, subjectScores, topSubjects);
    
    // Create classification result
    const classification: DocumentClassification = {
      category: topCategory,
      subjects: topSubjects,
      priority: topPriority,
      tags: [...new Set([...tags, ...additionalTags])], // Remove duplicates
      confidence,
      metadata: {
        keyTerms,
        regulatoryReferences: regulatoryReferences.length > 0 ? regulatoryReferences : undefined,
        aircraftTypes: aircraftTypes.length > 0 ? aircraftTypes : undefined,
        processingTime: Date.now() - startTime,
      }
    };
    
    // Include related documents if requested
    if (options.includeRelatedDocuments) {
      // This would require document storage access to find similar documents
      // For now, we'll leave this as a placeholder
      classification.relatedDocumentIds = [];
    }
    
    return classification;
  } catch (error) {
    logger.error('Document classification error', { context: { error } });
    throw new Error(`Document classification failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract text from different document formats
 */
function extractText(document: { text: string } | ExtractionResult | DocumentStructure): string {
  if ('text' in document) {
    return document.text;
  } else if ('elements' in document) {
    // It's a DocumentStructure - concatenate all text from elements
    return document.elements.map(element => element.text).join(' ');
  }
  
  // Fallback for unexpected format
  return '';
}

/**
 * Tokenize text into words
 */
function tokenizeText(text: string): string[] {
  // Normalize text: lowercase and remove punctuation
  const normalizedText = text.toLowerCase()
    .replace(/[^\w\s]|_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Split into tokens and filter out stop words and numbers
  return normalizedText.split(' ')
    .filter(word => word.length > 1)
    .filter(word => !STOP_WORDS.has(word))
    .filter(word => isNaN(Number(word)));
}

/**
 * Check if a word is a stop word
 */
function isStopWord(word: string): boolean {
  return STOP_WORDS.has(word.toLowerCase());
}

/**
 * Calculate term frequencies from tokens
 */
function calculateTermFrequencies(tokens: string[]): Record<string, number> {
  const frequencies: Record<string, number> = {};
  
  for (const token of tokens) {
    frequencies[token] = (frequencies[token] || 0) + 1;
  }
  
  return frequencies;
}

/**
 * Calculate category scores based on term frequencies
 */
function calculateCategoryScores(termFrequencies: Record<string, number>): Record<DocumentCategory, number> {
  const scores: Record<DocumentCategory, number> = {
    [DocumentCategory.TECHNICAL]: 0,
    [DocumentCategory.REGULATORY]: 0,
    [DocumentCategory.OPERATIONAL]: 0,
    [DocumentCategory.TRAINING]: 0,
    [DocumentCategory.ASSESSMENT]: 0,
    [DocumentCategory.REFERENCE]: 0,
    [DocumentCategory.UNCLASSIFIED]: 0,
  };
  
  // Calculate scores for each category
  for (const category of Object.keys(CATEGORY_TERMS) as DocumentCategory[]) {
    const categoryTerms = CATEGORY_TERMS[category];
    let score = 0;
    
    // Check for exact terms
    for (const term of categoryTerms) {
      // For multi-word terms, check if the phrase appears in the original text
      if (term.includes(' ')) {
        const termWords = term.split(' ');
        let termScore = 0;
        
        // Check if all words in the term are in the frequencies
        for (const word of termWords) {
          if (termFrequencies[word]) {
            termScore += termFrequencies[word];
          }
        }
        
        if (termScore > 0) {
          // Adjust score based on number of words matched
          score += termScore / termWords.length;
        }
      } else if (termFrequencies[term]) {
        // Single word term
        score += termFrequencies[term] * 2; // Higher weight for exact matches
      }
    }
    
    // Check for partial matches (terms that contain the category words)
    for (const term in termFrequencies) {
      const categoryWord = category.toLowerCase();
      if (term.includes(categoryWord)) {
        score += termFrequencies[term] * 3; // Even higher weight for terms containing the category name
      }
    }
    
    scores[category] = score;
  }
  
  // Normalize scores
  const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
  if (total > 0) {
    for (const category of Object.keys(scores) as DocumentCategory[]) {
      scores[category] = scores[category] / total;
    }
  }
  
  return scores;
}

/**
 * Determine the top category based on scores
 */
function determineTopCategory(scores: Record<DocumentCategory, number>): DocumentCategory {
  let topCategory = DocumentCategory.UNCLASSIFIED;
  let topScore = 0;
  
  for (const category of Object.keys(scores) as DocumentCategory[]) {
    if (scores[category] > topScore) {
      topScore = scores[category];
      topCategory = category;
    }
  }
  
  return topCategory;
}

/**
 * Calculate subject scores based on term frequencies
 */
function calculateSubjectScores(termFrequencies: Record<string, number>): Record<SubjectArea, number> {
  const scores: Record<SubjectArea, number> = {
    [SubjectArea.AIRCRAFT_SYSTEMS]: 0,
    [SubjectArea.FLIGHT_PROCEDURES]: 0,
    [SubjectArea.EMERGENCY_PROCEDURES]: 0,
    [SubjectArea.REGULATIONS]: 0,
    [SubjectArea.METEOROLOGY]: 0,
    [SubjectArea.NAVIGATION]: 0,
    [SubjectArea.HUMAN_FACTORS]: 0,
    [SubjectArea.COMMUNICATIONS]: 0,
    [SubjectArea.GENERAL]: 0,
  };
  
  // Calculate scores for each subject
  for (const subject of Object.keys(SUBJECT_TERMS) as SubjectArea[]) {
    const subjectTerms = SUBJECT_TERMS[subject];
    let score = 0;
    
    // Check for exact terms
    for (const term of subjectTerms) {
      // For multi-word terms, check if the phrase appears in the original text
      if (term.includes(' ')) {
        const termWords = term.split(' ');
        let termScore = 0;
        
        // Check if all words in the term are in the frequencies
        for (const word of termWords) {
          if (termFrequencies[word]) {
            termScore += termFrequencies[word];
          }
        }
        
        if (termScore > 0) {
          // Adjust score based on number of words matched
          score += termScore / termWords.length;
        }
      } else if (termFrequencies[term]) {
        // Single word term
        score += termFrequencies[term] * 2; // Higher weight for exact matches
      }
    }
    
    scores[subject] = score;
  }
  
  // Normalize scores
  const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
  if (total > 0) {
    for (const subject of Object.keys(scores) as SubjectArea[]) {
      scores[subject] = scores[subject] / total;
    }
  }
  
  return scores;
}

/**
 * Determine the top subject areas based on scores
 */
function determineTopSubjects(scores: Record<SubjectArea, number>, limit: number = 3): SubjectArea[] {
  // Sort subjects by score
  const sortedSubjects = Object.entries(scores)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .map(([subject]) => subject as SubjectArea);
  
  // Return top N subjects
  return sortedSubjects.slice(0, limit);
}

/**
 * Calculate priority scores based on term frequencies
 */
function calculatePriorityScores(termFrequencies: Record<string, number>): Record<PriorityLevel, number> {
  const scores: Record<PriorityLevel, number> = {
    [PriorityLevel.CRITICAL]: 0,
    [PriorityLevel.HIGH]: 0,
    [PriorityLevel.MEDIUM]: 0,
    [PriorityLevel.LOW]: 0,
  };
  
  // Calculate scores for each priority level
  for (const priority of Object.keys(PRIORITY_TERMS) as PriorityLevel[]) {
    const priorityTerms = PRIORITY_TERMS[priority];
    let score = 0;
    
    // Check for exact terms
    for (const term of priorityTerms) {
      // For multi-word terms, check if the phrase appears in the original text
      if (term.includes(' ')) {
        const termWords = term.split(' ');
        let termScore = 0;
        
        // Check if all words in the term are in the frequencies
        for (const word of termWords) {
          if (termFrequencies[word]) {
            termScore += termFrequencies[word];
          }
        }
        
        if (termScore > 0) {
          // Adjust score based on number of words matched
          score += termScore / termWords.length;
        }
      } else if (termFrequencies[term]) {
        // Single word term
        score += termFrequencies[term] * 2; // Higher weight for exact matches
      }
    }
    
    scores[priority] = score;
  }
  
  // Normalize scores
  const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
  if (total > 0) {
    for (const priority of Object.keys(scores) as PriorityLevel[]) {
      scores[priority] = scores[priority] / total;
    }
  }
  
  return scores;
}

/**
 * Determine the top priority based on scores
 */
function determineTopPriority(scores: Record<PriorityLevel, number>): PriorityLevel {
  let topPriority = PriorityLevel.MEDIUM; // Default to medium
  let topScore = 0;
  
  for (const priority of Object.keys(scores) as PriorityLevel[]) {
    if (scores[priority] > topScore) {
      topScore = scores[priority];
      topPriority = priority;
    }
  }
  
  return topPriority;
}

/**
 * Extract tags from term frequencies and other metadata
 */
function extractTags(
  text: string,
  termFrequencies: Record<string, number>,
  category: DocumentCategory,
): string[] {
  const tags: Set<string> = new Set();
  
  // Add top terms as tags
  const topTerms = Object.entries(termFrequencies)
    .sort(([, freqA], [, freqB]) => freqB - freqA)
    .slice(0, 15)
    .map(([term]) => term);
  
  for (const term of topTerms) {
    if (term.length > 3) { // Only include meaningful terms
      tags.add(term);
    }
  }
  
  // Add category-specific tags
  const categoryTerms = CATEGORY_TERMS[category];
  for (const term of categoryTerms) {
    if (text.toLowerCase().includes(term.toLowerCase())) {
      // Convert multi-word terms to camelCase for tags
      if (term.includes(' ')) {
        const camelCase = term
          .split(' ')
          .map((word, index) => 
            index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
          )
          .join('');
        tags.add(camelCase);
      } else {
        tags.add(term);
      }
    }
  }
  
  // Add regex matches
  for (const pattern of [
    REGEX_PATTERNS.airportCode,
    REGEX_PATTERNS.altitude,
    REGEX_PATTERNS.speed,
    REGEX_PATTERNS.heading,
    REGEX_PATTERNS.flightLevel
  ]) {
    const matches = extractRegexMatches(text, pattern);
    for (const match of matches) {
      tags.add(match);
    }
  }
  
  return Array.from(tags);
}

/**
 * Extract matches from text using a regex pattern
 */
function extractRegexMatches(text: string, pattern: RegExp): string[] {
  const matches: string[] = [];
  let match;
  
  // Reset regex to avoid issues with global flag
  const regex = new RegExp(pattern.source, pattern.flags);
  
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[0]);
    
    // Prevent infinite loops for zero-width matches
    if (match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
  }
  
  return matches;
}

/**
 * Extract key terms from term frequencies
 */
function extractKeyTerms(termFrequencies: Record<string, number>): Record<string, number> {
  // Sort terms by frequency
  const sortedTerms = Object.entries(termFrequencies)
    .sort(([, freqA], [, freqB]) => freqB - freqA);
  
  // Take top 30 terms
  const topTerms = sortedTerms.slice(0, 30);
  
  // Convert back to record
  const keyTerms: Record<string, number> = {};
  for (const [term, freq] of topTerms) {
    keyTerms[term] = freq;
  }
  
  return keyTerms;
}

/**
 * Calculate the overall confidence score
 */
function calculateConfidenceScore(
  categoryScores: Record<DocumentCategory, number>,
  topCategory: DocumentCategory,
  subjectScores: Record<SubjectArea, number>,
  topSubjects: SubjectArea[],
): number {
  // Confidence based on how dominant the top category is
  const categoryConfidence = categoryScores[topCategory];
  
  // Confidence based on how dominant the top subjects are
  const subjectConfidence = topSubjects.reduce(
    (sum, subject) => sum + subjectScores[subject], 
    0
  ) / topSubjects.length;
  
  // Combined confidence - weighted average
  return 0.6 * categoryConfidence + 0.4 * subjectConfidence;
}

/**
 * Compare two documents for similarity
 */
export function compareDocuments(doc1: string, doc2: string): number {
  // Tokenize both documents
  const tokens1 = tokenizeText(doc1);
  const tokens2 = tokenizeText(doc2);
  
  // Calculate term frequencies
  const termFreq1 = calculateTermFrequencies(tokens1);
  const termFreq2 = calculateTermFrequencies(tokens2);
  
  // Get all unique terms
  const allTerms = new Set([...Object.keys(termFreq1), ...Object.keys(termFreq2)]);
  
  // Calculate dot product
  let dotProduct = 0;
  for (const term of allTerms) {
    const freq1 = termFreq1[term] || 0;
    const freq2 = termFreq2[term] || 0;
    dotProduct += freq1 * freq2;
  }
  
  // Calculate magnitudes
  const mag1 = Math.sqrt(Object.values(termFreq1).reduce((sum, freq) => sum + Math.pow(freq, 2), 0));
  const mag2 = Math.sqrt(Object.values(termFreq2).reduce((sum, freq) => sum + Math.pow(freq, 2), 0));
  
  // Calculate cosine similarity
  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (mag1 * mag2);
}