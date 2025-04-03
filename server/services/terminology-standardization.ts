/**
 * Terminology Standardization Service
 * 
 * This service provides standardization of aviation terminology across documents:
 * - Maintains a glossary of standard aviation terms
 * - Identifies and normalizes variations in terminology
 * - Supports term mapping across multiple languages
 * - Provides consistent terminology for document processing
 */

import { SupportedLanguage } from './language-translation';
import { logger } from '../core';

export interface Term {
  id: string;
  standardForm: string;
  domain: string;
  definition: string;
  notes?: string;
  translations: Record<SupportedLanguage, string>;
  variations: string[];
  tags: string[];
  sources?: string[];
  lastUpdated: Date;
}

export interface Glossary {
  domain: string;
  terms: Term[];
  metadata: {
    version: string;
    lastUpdated: Date;
    termCount: number;
    languageCoverage: SupportedLanguage[];
    sourceInfo?: string;
  };
}

export interface TermRecognitionResult {
  originalText: string;
  standardizedText: string;
  replacements: Array<{
    original: string;
    standardized: string;
    position: number;
    confidence: number;
  }>;
  statistics: {
    replacementCount: number;
    uniqueTermsReplaced: number;
    languageSpecificReplacements: Record<SupportedLanguage, number>;
    processingTime: number;
  };
}

export interface StandardizationOptions {
  language?: SupportedLanguage;
  preserveCase?: boolean;
  onlyFullTerms?: boolean;
  markReplacements?: boolean;
  minConfidence?: number;
  domains?: string[];
  ignoreList?: string[];
}

const DEFAULT_OPTIONS: StandardizationOptions = {
  preserveCase: false,
  onlyFullTerms: false,
  markReplacements: false,
  minConfidence: 0.75,
  domains: ['aviation', 'general']
};

// Main aviation terminology glossary
let aviationGlossary: Glossary;

/**
 * Initialize the terminology service with standard glossaries
 */
export function initializeTerminologyService(): void {
  // Initialize the aviation glossary
  aviationGlossary = createAviationGlossary();
  logger.info(`Terminology service initialized with ${aviationGlossary.terms.length} standard terms`);
}

/**
 * Standardize terminology in text
 */
export function standardizeTerminology(
  text: string,
  options: StandardizationOptions = DEFAULT_OPTIONS
): TermRecognitionResult {
  const startTime = Date.now();
  
  // Set default options
  const mergedOptions: StandardizationOptions = {
    ...DEFAULT_OPTIONS,
    ...options
  };
  
  const language = mergedOptions.language || SupportedLanguage.ENGLISH;
  
  // Initialize result
  const result: TermRecognitionResult = {
    originalText: text,
    standardizedText: text,
    replacements: [],
    statistics: {
      replacementCount: 0,
      uniqueTermsReplaced: 0,
      languageSpecificReplacements: Object.values(SupportedLanguage).reduce((acc, lang) => {
        acc[lang] = 0;
        return acc;
      }, {} as Record<SupportedLanguage, number>),
      processingTime: 0
    }
  };
  
  // Filter terms by domain if specified
  let termsToUse = aviationGlossary.terms;
  if (mergedOptions.domains && mergedOptions.domains.length > 0) {
    termsToUse = termsToUse.filter(term => 
      mergedOptions.domains!.includes(term.domain)
    );
  }
  
  // Create a set of terms to ignore
  const ignoreSet = new Set<string>(mergedOptions.ignoreList || []);
  
  // Create a map for tracking unique terms that were replaced
  const replacedTerms = new Map<string, boolean>();
  
  // Process each term in the glossary
  for (const term of termsToUse) {
    // Get the standard form in the target language
    const standardForm = term.translations[language] || term.standardForm;
    
    // Skip if this term is in the ignore list
    if (ignoreSet.has(standardForm)) {
      continue;
    }
    
    // Get variations for this language
    const variations = [
      ...term.variations,
      ...Object.entries(term.translations)
        .filter(([lang, _]) => lang !== language)
        .map(([_, translation]) => translation)
    ];
    
    // Add the standard form itself as a variation to catch case differences
    if (!mergedOptions.preserveCase) {
      variations.push(standardForm);
    }
    
    // Process each variation
    for (const variation of variations) {
      // Skip empty variations
      if (!variation || variation.trim().length === 0) {
        continue;
      }
      
      // Skip if this variation is the same as the standard form and we're preserving case
      if (mergedOptions.preserveCase && variation === standardForm) {
        continue;
      }
      
      // Create a regular expression for finding the term
      let termRegex: RegExp;
      if (mergedOptions.onlyFullTerms) {
        // Match only whole words
        termRegex = new RegExp(`\\b${escapeRegExp(variation)}\\b`, 'g');
      } else {
        // Match the term anywhere
        termRegex = new RegExp(escapeRegExp(variation), 'g');
      }
      
      // Find all matches
      const matches = [...result.standardizedText.matchAll(termRegex)];
      
      // Process each match
      for (const match of matches) {
        const matchText = match[0];
        const position = match.index || 0;
        
        // Determine confidence based on match quality
        const confidence = calculateConfidence(matchText, variation, standardForm);
        
        // Skip if confidence is below threshold
        if (confidence < mergedOptions.minConfidence!) {
          continue;
        }
        
        // Get the replacement text with correct case preserved if needed
        const replacement = mergedOptions.preserveCase
          ? preserveCase(matchText, standardForm)
          : standardForm;
        
        // Add markers if requested
        const replacementText = mergedOptions.markReplacements
          ? `[${replacement}]`
          : replacement;
        
        // Perform the replacement
        result.standardizedText = 
          result.standardizedText.substring(0, position) +
          replacementText +
          result.standardizedText.substring(position + matchText.length);
        
        // Record the replacement
        result.replacements.push({
          original: matchText,
          standardized: replacement,
          position,
          confidence
        });
        
        // Track statistics
        result.statistics.replacementCount++;
        result.statistics.languageSpecificReplacements[language]++;
        replacedTerms.set(term.id, true);
      }
    }
  }
  
  // Update unique terms count
  result.statistics.uniqueTermsReplaced = replacedTerms.size;
  
  // Record processing time
  result.statistics.processingTime = Date.now() - startTime;
  
  return result;
}

/**
 * Add a new term to the glossary
 */
export function addTermToGlossary(
  standardForm: string,
  domain: string,
  definition: string,
  variations: string[] = [],
  translations: Record<SupportedLanguage, string> = {} as Record<SupportedLanguage, string>,
  tags: string[] = []
): Term {
  // Create a unique ID
  const id = `term-${aviationGlossary.terms.length + 1}`;
  
  // Create the new term
  const newTerm: Term = {
    id,
    standardForm,
    domain,
    definition,
    variations,
    translations,
    tags,
    lastUpdated: new Date()
  };
  
  // Add to the glossary
  aviationGlossary.terms.push(newTerm);
  
  // Update glossary metadata
  aviationGlossary.metadata.termCount = aviationGlossary.terms.length;
  aviationGlossary.metadata.lastUpdated = new Date();
  
  // Update language coverage
  const languages = new Set(aviationGlossary.metadata.languageCoverage);
  Object.keys(translations).forEach(lang => languages.add(lang as SupportedLanguage));
  aviationGlossary.metadata.languageCoverage = Array.from(languages);
  
  return newTerm;
}

/**
 * Search for terms in the glossary
 */
export function searchGlossary(
  query: string,
  options: {
    domains?: string[];
    exactMatch?: boolean;
    includeVariations?: boolean;
    includeTranslations?: boolean;
    language?: SupportedLanguage;
  } = {}
): Term[] {
  const searchQuery = query.toLowerCase();
  
  return aviationGlossary.terms.filter(term => {
    // Filter by domain if specified
    if (options.domains && options.domains.length > 0) {
      if (!options.domains.includes(term.domain)) {
        return false;
      }
    }
    
    // Check standard form
    if (options.exactMatch) {
      if (term.standardForm.toLowerCase() === searchQuery) {
        return true;
      }
    } else {
      if (term.standardForm.toLowerCase().includes(searchQuery)) {
        return true;
      }
    }
    
    // Check variations if requested
    if (options.includeVariations) {
      for (const variation of term.variations) {
        if (options.exactMatch) {
          if (variation.toLowerCase() === searchQuery) {
            return true;
          }
        } else {
          if (variation.toLowerCase().includes(searchQuery)) {
            return true;
          }
        }
      }
    }
    
    // Check translations if requested
    if (options.includeTranslations) {
      const language = options.language || SupportedLanguage.ENGLISH;
      const translation = term.translations[language];
      
      if (translation) {
        if (options.exactMatch) {
          if (translation.toLowerCase() === searchQuery) {
            return true;
          }
        } else {
          if (translation.toLowerCase().includes(searchQuery)) {
            return true;
          }
        }
      }
    }
    
    return false;
  });
}

/**
 * Get term by standard form
 */
export function getTermByStandardForm(standardForm: string): Term | undefined {
  return aviationGlossary.terms.find(
    term => term.standardForm.toLowerCase() === standardForm.toLowerCase()
  );
}

/**
 * Check if a term exists in the glossary
 */
export function termExists(term: string): boolean {
  return aviationGlossary.terms.some(t => 
    t.standardForm.toLowerCase() === term.toLowerCase() || 
    t.variations.some(v => v.toLowerCase() === term.toLowerCase())
  );
}

/**
 * Get all terms for a specific domain
 */
export function getTermsByDomain(domain: string): Term[] {
  return aviationGlossary.terms.filter(term => term.domain === domain);
}

/**
 * Export the glossary to JSON
 */
export function exportGlossary(): string {
  return JSON.stringify(aviationGlossary, null, 2);
}

/**
 * Calculate confidence score for term replacement
 */
function calculateConfidence(
  matchText: string,
  variation: string,
  standardForm: string
): number {
  // Base confidence
  let confidence = 0.8;
  
  // Adjust based on term length (longer terms are more likely to be correct matches)
  confidence += Math.min((variation.length / 20) * 0.1, 0.1);
  
  // Exact match with variation
  if (matchText.toLowerCase() === variation.toLowerCase()) {
    confidence += 0.1;
  }
  
  // Acronym detection
  const isAcronym = /^[A-Z]{2,}$/.test(matchText);
  if (isAcronym) {
    confidence -= 0.05; // Slightly reduce confidence for acronyms as they might be ambiguous
  }
  
  // Cap confidence at 1.0
  return Math.min(confidence, 1.0);
}

/**
 * Preserve the case pattern of the original text in the replacement
 */
function preserveCase(original: string, replacement: string): string {
  // If original is all uppercase, make replacement all uppercase
  if (original === original.toUpperCase()) {
    return replacement.toUpperCase();
  }
  
  // If original is capitalized, capitalize the replacement
  if (original[0] === original[0].toUpperCase() && original.slice(1) === original.slice(1).toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase();
  }
  
  // Otherwise, use the replacement as-is
  return replacement;
}

/**
 * Escape special characters in string for use in regex
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create the aviation glossary with standard terms
 */
function createAviationGlossary(): Glossary {
  return {
    domain: 'aviation',
    terms: [
      // Flight operations terms
      {
        id: 'term-1',
        standardForm: 'Approach',
        domain: 'aviation',
        definition: 'The phase of flight immediately before landing when the aircraft is maneuvered into position for landing.',
        translations: {
          [SupportedLanguage.ENGLISH]: 'Approach',
          [SupportedLanguage.SPANISH]: 'Aproximación',
          [SupportedLanguage.FRENCH]: 'Approche',
          [SupportedLanguage.GERMAN]: 'Anflug'
        },
        variations: ['approach procedure', 'final approach', 'approach phase'],
        tags: ['flight phase', 'operations'],
        lastUpdated: new Date()
      },
      {
        id: 'term-2',
        standardForm: 'Take-off',
        domain: 'aviation',
        definition: 'The phase of flight in which an aircraft goes from the ground to flying in the air.',
        translations: {
          [SupportedLanguage.ENGLISH]: 'Take-off',
          [SupportedLanguage.SPANISH]: 'Despegue',
          [SupportedLanguage.FRENCH]: 'Décollage',
          [SupportedLanguage.GERMAN]: 'Start'
        },
        variations: ['takeoff', 'take off', 'departure', 'lift-off'],
        tags: ['flight phase', 'operations'],
        lastUpdated: new Date()
      },
      {
        id: 'term-3',
        standardForm: 'Flight Level',
        domain: 'aviation',
        definition: 'A standard nominal altitude of an aircraft, in hundreds of feet, based on a standardized air pressure.',
        translations: {
          [SupportedLanguage.ENGLISH]: 'Flight Level',
          [SupportedLanguage.SPANISH]: 'Nivel de Vuelo',
          [SupportedLanguage.FRENCH]: 'Niveau de Vol',
          [SupportedLanguage.GERMAN]: 'Flugfläche'
        },
        variations: ['FL', 'flight lvl', 'altitude'],
        tags: ['navigation', 'altitude'],
        lastUpdated: new Date()
      },
      
      // Aircraft systems terms
      {
        id: 'term-4',
        standardForm: 'Hydraulic System',
        domain: 'aviation',
        definition: 'A system that uses hydraulic fluid under pressure to transmit power in an aircraft.',
        translations: {
          [SupportedLanguage.ENGLISH]: 'Hydraulic System',
          [SupportedLanguage.SPANISH]: 'Sistema Hidráulico',
          [SupportedLanguage.FRENCH]: 'Système Hydraulique',
          [SupportedLanguage.GERMAN]: 'Hydrauliksystem'
        },
        variations: ['hydraulics', 'hydraulic', 'hyd system', 'hyd'],
        tags: ['aircraft systems', 'technical'],
        lastUpdated: new Date()
      },
      {
        id: 'term-5',
        standardForm: 'Autopilot',
        domain: 'aviation',
        definition: 'A system that automatically controls the trajectory of an aircraft without constant control by the pilot.',
        translations: {
          [SupportedLanguage.ENGLISH]: 'Autopilot',
          [SupportedLanguage.SPANISH]: 'Piloto Automático',
          [SupportedLanguage.FRENCH]: 'Pilote Automatique',
          [SupportedLanguage.GERMAN]: 'Autopilot'
        },
        variations: ['A/P', 'auto pilot', 'automated flight system', 'flight director'],
        tags: ['aircraft systems', 'avionics'],
        lastUpdated: new Date()
      },
      
      // Navigation terms
      {
        id: 'term-6',
        standardForm: 'VOR',
        domain: 'aviation',
        definition: 'VHF Omnidirectional Range, a type of radio navigation system for aircraft.',
        translations: {
          [SupportedLanguage.ENGLISH]: 'VOR',
          [SupportedLanguage.SPANISH]: 'VOR',
          [SupportedLanguage.FRENCH]: 'VOR',
          [SupportedLanguage.GERMAN]: 'VOR'
        },
        variations: ['VHF Omnidirectional Range', 'omni', 'V.O.R.'],
        tags: ['navigation', 'equipment'],
        lastUpdated: new Date()
      },
      {
        id: 'term-7',
        standardForm: 'ILS',
        domain: 'aviation',
        definition: 'Instrument Landing System, a precision runway approach aid based on two radio beams.',
        translations: {
          [SupportedLanguage.ENGLISH]: 'ILS',
          [SupportedLanguage.SPANISH]: 'ILS',
          [SupportedLanguage.FRENCH]: 'ILS',
          [SupportedLanguage.GERMAN]: 'ILS'
        },
        variations: ['Instrument Landing System', 'instrument approach', 'I.L.S.'],
        tags: ['navigation', 'approach', 'equipment'],
        lastUpdated: new Date()
      },
      
      // Meteorology terms
      {
        id: 'term-8',
        standardForm: 'METAR',
        domain: 'aviation',
        definition: 'Meteorological Aerodrome Report, a format for reporting weather information for aviation.',
        translations: {
          [SupportedLanguage.ENGLISH]: 'METAR',
          [SupportedLanguage.SPANISH]: 'METAR',
          [SupportedLanguage.FRENCH]: 'METAR',
          [SupportedLanguage.GERMAN]: 'METAR'
        },
        variations: ['Meteorological Aerodrome Report', 'weather report', 'M.E.T.A.R.'],
        tags: ['meteorology', 'weather'],
        lastUpdated: new Date()
      },
      {
        id: 'term-9',
        standardForm: 'TAF',
        domain: 'aviation',
        definition: 'Terminal Aerodrome Forecast, a format for reporting weather forecast information for aviation.',
        translations: {
          [SupportedLanguage.ENGLISH]: 'TAF',
          [SupportedLanguage.SPANISH]: 'TAF',
          [SupportedLanguage.FRENCH]: 'TAF',
          [SupportedLanguage.GERMAN]: 'TAF'
        },
        variations: ['Terminal Aerodrome Forecast', 'Terminal Area Forecast', 'weather forecast', 'T.A.F.'],
        tags: ['meteorology', 'weather'],
        lastUpdated: new Date()
      },
      
      // Communication terms
      {
        id: 'term-10',
        standardForm: 'ATIS',
        domain: 'aviation',
        definition: 'Automatic Terminal Information Service, a continuous broadcast of recorded aeronautical information.',
        translations: {
          [SupportedLanguage.ENGLISH]: 'ATIS',
          [SupportedLanguage.SPANISH]: 'ATIS',
          [SupportedLanguage.FRENCH]: 'ATIS',
          [SupportedLanguage.GERMAN]: 'ATIS'
        },
        variations: ['Automatic Terminal Information Service', 'A.T.I.S.', 'terminal information'],
        tags: ['communications', 'ATC'],
        lastUpdated: new Date()
      },
      {
        id: 'term-11',
        standardForm: 'Clearance',
        domain: 'aviation',
        definition: 'Authorization by air traffic control for an aircraft to proceed under specified conditions.',
        translations: {
          [SupportedLanguage.ENGLISH]: 'Clearance',
          [SupportedLanguage.SPANISH]: 'Autorización',
          [SupportedLanguage.FRENCH]: 'Autorisation',
          [SupportedLanguage.GERMAN]: 'Freigabe'
        },
        variations: ['ATC clearance', 'cleared', 'authorization'],
        tags: ['communications', 'ATC'],
        lastUpdated: new Date()
      },
      
      // Regulatory terms
      {
        id: 'term-12',
        standardForm: 'Part 91',
        domain: 'regulatory',
        definition: 'General Operating and Flight Rules in the Federal Aviation Regulations (FARs).',
        translations: {
          [SupportedLanguage.ENGLISH]: 'Part 91',
          [SupportedLanguage.SPANISH]: 'Parte 91',
          [SupportedLanguage.FRENCH]: 'Partie 91',
          [SupportedLanguage.GERMAN]: 'Teil 91'
        },
        variations: ['FAR 91', '14 CFR 91', 'FAR Part 91'],
        tags: ['regulations', 'FAA'],
        lastUpdated: new Date()
      },
      {
        id: 'term-13',
        standardForm: 'Part 121',
        domain: 'regulatory',
        definition: 'Operating Requirements: Domestic, Flag, and Supplemental Operations in the Federal Aviation Regulations.',
        translations: {
          [SupportedLanguage.ENGLISH]: 'Part 121',
          [SupportedLanguage.SPANISH]: 'Parte 121',
          [SupportedLanguage.FRENCH]: 'Partie 121',
          [SupportedLanguage.GERMAN]: 'Teil 121'
        },
        variations: ['FAR 121', '14 CFR 121', 'FAR Part 121'],
        tags: ['regulations', 'FAA', 'air carrier'],
        lastUpdated: new Date()
      },
      
      // Training terms
      {
        id: 'term-14',
        standardForm: 'Type Rating',
        domain: 'training',
        definition: 'A qualification required to fly a specific aircraft type that requires additional training beyond the basic pilot certificate.',
        translations: {
          [SupportedLanguage.ENGLISH]: 'Type Rating',
          [SupportedLanguage.SPANISH]: 'Habilitación de Tipo',
          [SupportedLanguage.FRENCH]: 'Qualification de Type',
          [SupportedLanguage.GERMAN]: 'Musterberechtigung'
        },
        variations: ['aircraft type rating', 'type qualification', 'type cert'],
        tags: ['training', 'certification'],
        lastUpdated: new Date()
      },
      {
        id: 'term-15',
        standardForm: 'Simulator',
        domain: 'training',
        definition: 'A device that replicates aircraft flight and the environment in which it flies for pilot training, design, or other purposes.',
        translations: {
          [SupportedLanguage.ENGLISH]: 'Simulator',
          [SupportedLanguage.SPANISH]: 'Simulador',
          [SupportedLanguage.FRENCH]: 'Simulateur',
          [SupportedLanguage.GERMAN]: 'Simulator'
        },
        variations: ['flight simulator', 'SIM', 'FTD', 'flight training device'],
        tags: ['training', 'equipment'],
        lastUpdated: new Date()
      },
      
      // Safety terms
      {
        id: 'term-16',
        standardForm: 'TCAS',
        domain: 'aviation',
        definition: 'Traffic Collision Avoidance System, an aircraft system that monitors surrounding airspace for other transponder-equipped aircraft.',
        translations: {
          [SupportedLanguage.ENGLISH]: 'TCAS',
          [SupportedLanguage.SPANISH]: 'TCAS',
          [SupportedLanguage.FRENCH]: 'TCAS',
          [SupportedLanguage.GERMAN]: 'TCAS'
        },
        variations: ['Traffic Collision Avoidance System', 'collision avoidance', 'T.C.A.S.', 'traffic alert'],
        tags: ['safety', 'equipment', 'avionics'],
        lastUpdated: new Date()
      },
      {
        id: 'term-17',
        standardForm: 'EGPWS',
        domain: 'aviation',
        definition: 'Enhanced Ground Proximity Warning System, an aircraft system that warns pilots if their aircraft is in immediate danger of flying into the ground.',
        translations: {
          [SupportedLanguage.ENGLISH]: 'EGPWS',
          [SupportedLanguage.SPANISH]: 'EGPWS',
          [SupportedLanguage.FRENCH]: 'EGPWS',
          [SupportedLanguage.GERMAN]: 'EGPWS'
        },
        variations: ['Enhanced GPWS', 'ground proximity warning', 'terrain warning', 'GPWS'],
        tags: ['safety', 'equipment', 'avionics'],
        lastUpdated: new Date()
      },
      
      // Common aircraft types
      {
        id: 'term-18',
        standardForm: 'Boeing 737',
        domain: 'aviation',
        definition: 'A narrow-body aircraft produced by Boeing Commercial Airplanes.',
        translations: {
          [SupportedLanguage.ENGLISH]: 'Boeing 737',
          [SupportedLanguage.SPANISH]: 'Boeing 737',
          [SupportedLanguage.FRENCH]: 'Boeing 737',
          [SupportedLanguage.GERMAN]: 'Boeing 737'
        },
        variations: ['B737', 'B-737', '737', 'Boeing B737'],
        tags: ['aircraft', 'airliners'],
        lastUpdated: new Date()
      },
      {
        id: 'term-19',
        standardForm: 'Airbus A320',
        domain: 'aviation',
        definition: 'A narrow-body aircraft produced by Airbus.',
        translations: {
          [SupportedLanguage.ENGLISH]: 'Airbus A320',
          [SupportedLanguage.SPANISH]: 'Airbus A320',
          [SupportedLanguage.FRENCH]: 'Airbus A320',
          [SupportedLanguage.GERMAN]: 'Airbus A320'
        },
        variations: ['A320', 'A-320', 'Airbus 320', 'A320 Family'],
        tags: ['aircraft', 'airliners'],
        lastUpdated: new Date()
      },
      
      // Standard procedures
      {
        id: 'term-20',
        standardForm: 'Standard Operating Procedure',
        domain: 'aviation',
        definition: 'A set of step-by-step instructions to help pilots and crew carry out complex routine operations.',
        translations: {
          [SupportedLanguage.ENGLISH]: 'Standard Operating Procedure',
          [SupportedLanguage.SPANISH]: 'Procedimiento Operativo Estándar',
          [SupportedLanguage.FRENCH]: 'Procédure d\'Exploitation Standard',
          [SupportedLanguage.GERMAN]: 'Standardbetriebsverfahren'
        },
        variations: ['SOP', 'standard procedure', 'ops procedure', 'S.O.P.'],
        tags: ['operations', 'procedures'],
        lastUpdated: new Date()
      }
    ],
    metadata: {
      version: '1.0',
      lastUpdated: new Date(),
      termCount: 20,
      languageCoverage: [
        SupportedLanguage.ENGLISH,
        SupportedLanguage.SPANISH,
        SupportedLanguage.FRENCH,
        SupportedLanguage.GERMAN
      ],
      sourceInfo: 'Aviation industry standard terminology'
    }
  };
}

// Initialize the service when the module is loaded
initializeTerminologyService();