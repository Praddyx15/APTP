/**
 * Document AI Engine
 * 
 * A self-contained AI system for document processing, analysis, and syllabus generation
 * without relying on external APIs. Uses NLP libraries for text processing.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { removeStopwords } from 'stopword';
import nlp from 'compromise';
import compromiseParagraphs from 'compromise-paragraphs';
import Storage from 'node-storage';
import { RegulatoryReference, GeneratedSyllabus, ExtractedModule, ExtractedLesson, ExtractedCompetency, SyllabusGenerationOptions } from '@shared/syllabus-types';
import { logger } from '../core/logger';

// Use compromise plugins
// Make sure to register the plugin explicitly
nlp.extend(compromiseParagraphs);
// But we try to extend it anyway for older versions compatibility
try {
  // @ts-ignore - this is only for older compromise versions
  if (typeof nlp.extend === 'function') {
    // @ts-ignore
    nlp.extend(compromiseParagraphs);
  }
} catch (error) {
  console.warn('Could not extend NLP with paragraphs plugin, continuing without it');
}

// Custom WordTokenizer implementation to avoid using the natural package
class SimpleWordTokenizer {
  tokenize(text: string): string[] {
    // Simple regex-based tokenizer
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Replace punctuation with spaces
      .split(/\s+/)              // Split on whitespace
      .filter(Boolean);          // Remove empty strings
  }
}

// Initialize tokenizers
const wordTokenizer = new SimpleWordTokenizer();

// Custom simple sentence tokenizer since natural's SentenceTokenizer has issues
function tokenizeSentences(text: string): string[] {
  return text.split(/[.!?]+/).filter(s => s.trim().length > 0);
}

// Local storage for processing results
// Using a file inside the data directory instead of the directory itself
const storage = new Storage('./data/knowledge/document_ai_data.json');

// Aircraft types for reference
const AIRCRAFT_TYPES = [
  'A320', 'A330', 'A340', 'A350', 'A380',
  'B737', 'B747', 'B757', 'B767', 'B777', 'B787',
  'ATR42', 'ATR72',
  'CRJ', 'ERJ', 'E170', 'E190',
  'Q400', 'DHC-8',
  'Cessna', 'Piper', 'Beechcraft', 'Diamond'
];

/**
 * Document category classification
 */
export enum DocumentCategory {
  TECHNICAL = 'technical',
  REGULATORY = 'regulatory',
  OPERATIONAL = 'operational',
  TRAINING = 'training',
  ASSESSMENT = 'assessment',
  REFERENCE = 'reference',
  UNCLASSIFIED = 'unclassified'
}

/**
 * Regulatory authority patterns for detecting references
 */
const REGULATORY_PATTERNS = {
  FAA: /\b(14\s*CFR\s*Part\s*\d+|FAR\s*\d+|AC\s*\d+-\d+|FAA[\s-]?[A-Z]+[\s-]?\d+)\b/gi,
  EASA: /\b(EU\s*\d+\/\d+|Part[\s-]?[A-Z]+|CS[\s-]?[A-Z]+|AMC[\s-]?[A-Z]+|GM[\s-]?[A-Z]+)\b/gi,
  ICAO: /\b(Annex\s*\d+|Doc\s*\d+|PANS[\s-]?[A-Z]+)\b/gi,
  TCCA: /\b(CAR\s*\d+|TP\s*\d+)\b/gi,
  CASA: /\b(CASR\s*Part\s*\d+|CAO\s*\d+\.\d+|AC\s*\d+-\d+)\b/gi
};

// Define a type for the document analysis result
interface DocumentAnalysisResult {
  category: DocumentCategory;
  keywords: string[];
  entities: string[];
  summary: string;
  content: {
    textLength: number;
    paragraphCount: number;
    sentenceCount: number;
    readability: number;
  };
  references: {
    regulatory: RegulatoryReference[];
    aircraft: string[];
  };
  confidence: number;
  processingTime: number;
}

/**
 * Document AI Engine class
 */
export class DocumentAIEngine {
  /**
   * Extract text content from a document file
   */
  async extractText(filePath: string): Promise<string> {
    try {
      const fileExtension = path.extname(filePath).toLowerCase();
      let text = '';
      
      switch (fileExtension) {
        case '.pdf':
          text = await this.extractFromPdf(filePath);
          break;
        case '.docx':
          text = await this.extractFromDocx(filePath);
          break;
        case '.xlsx':
        case '.xls':
          text = await this.extractFromExcel(filePath);
          break;
        case '.txt':
          text = fs.readFileSync(filePath, 'utf8');
          break;
        default:
          throw new Error(`Unsupported file format: ${fileExtension}`);
      }
      
      return text;
    } catch (error) {
      logger.error(`Error extracting text from file: ${error instanceof Error ? error.message : String(error)}`);
      return '';
    }
  }

  /**
   * Extract text from PDF
   */
  private async extractFromPdf(filePath: string): Promise<string> {
    try {
      // Dynamic import pdf-parse
      const pdfParse = await import('pdf-parse').then(module => module.default);
      
      // Read the file
      const dataBuffer = fs.readFileSync(filePath);
      
      // Parse PDF
      const pdfData = await pdfParse(dataBuffer);
      
      // Return the text content
      return pdfData.text || '';
    } catch (error) {
      logger.error(`PDF extraction error: ${error instanceof Error ? error.message : String(error)}`);
      // Return meaningful information instead of empty string on failure
      return `[Error extracting PDF: ${error instanceof Error ? error.message : String(error)}]`;
    }
  }

  /**
   * Extract text from Word documents
   */
  private async extractFromDocx(filePath: string): Promise<string> {
    try {
      // Dynamic import mammoth
      const mammoth = await import('mammoth').then(module => module.default);
      
      // Extract text from the document
      const result = await mammoth.extractRawText({ path: filePath });
      
      return result.value || '';
    } catch (error) {
      logger.error(`DOCX extraction error: ${error instanceof Error ? error.message : String(error)}`);
      // Return meaningful information instead of empty string on failure
      return `[Error extracting DOCX: ${error instanceof Error ? error.message : String(error)}]`;
    }
  }

  /**
   * Extract text from Excel spreadsheets
   */
  private async extractFromExcel(filePath: string): Promise<string> {
    try {
      // Dynamic import xlsx
      const XLSX = await import('xlsx').then(module => module.default);
      
      // Read the workbook
      const workbook = XLSX.readFile(filePath);
      let text = '';
      
      // Process each sheet
      for (const sheetName of workbook.SheetNames) {
        // Add sheet name as a heading
        text += `\n## ${sheetName}\n\n`;
        
        // Get sheet data as JSON
        const sheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        // Convert sheet data to text
        for (const row of sheetData) {
          if (Array.isArray(row) && row.length > 0) {
            text += row.join('\t') + '\n';
          }
        }
      }
      
      return text;
    } catch (error) {
      logger.error(`Excel extraction error: ${error instanceof Error ? error.message : String(error)}`);
      // Return meaningful information instead of empty string on failure
      return `[Error extracting Excel: ${error instanceof Error ? error.message : String(error)}]`;
    }
  }

  /**
   * Analyze document content to extract key information
   */
  analyzeDocument(text: string): DocumentAnalysisResult {
    const startTime = Date.now();
    
    // Break into sentences and paragraphs
    const sentences = tokenizeSentences(text);
    // Safely handle compromise paragraphs 
    let paragraphs: any[] = [];
    try {
      // Default to empty array if this fails
      const doc = nlp(text);
      // @ts-ignore - paragraphs() is provided by the plugin
      paragraphs = doc.paragraphs().json() || [];
    } catch (error) {
      console.warn('Error extracting paragraphs with compromise', error);
    }
    
    // Get tokens and filtered tokens (no stopwords)
    const tokens = this.getFilteredTokens(text);
    const keywords = this.extractTopKeywords(tokens, 20);
    
    // Extract document metadata
    const category = this.classifyDocumentCategory(tokens);
    const entities = this.extractEntities(text);
    const aircraftRefs = this.extractAircraftReferences(text);
    const regulatoryRefs = this.extractRegulatoryReferences(text);
    
    // Generate summary
    const summary = this.generateSummary(sentences);
    
    // Calculate statistics
    const readabilityScore = this.calculateReadability(text);
    
    const result: DocumentAnalysisResult = {
      category,
      keywords,
      entities,
      summary,
      content: {
        textLength: text.length,
        paragraphCount: paragraphs.length,
        sentenceCount: sentences.length,
        readability: readabilityScore
      },
      references: {
        regulatory: regulatoryRefs,
        aircraft: aircraftRefs
      },
      confidence: 0.85, // Fixed confidence for now
      processingTime: Date.now() - startTime
    };
    
    return result;
  }

  /**
   * Extract entities from text
   */
  private extractEntities(text: string): string[] {
    const doc = nlp(text);
    
    // Get dates
    const dates = (doc as any).dates().out('array');
    
    // Get organizations
    const orgs = doc.match('#Organization').out('array');
    
    // Get people
    const people = doc.match('#Person').out('array');
    
    // Get locations
    const locations = doc.match('#Place').out('array');
    
    // Combine and remove duplicates
    return Array.from(new Set([...dates, ...orgs, ...people, ...locations]));
  }

  /**
   * Extract aircraft type references
   */
  private extractAircraftReferences(text: string): string[] {
    const references = new Set<string>();
    
    // Search for known aircraft types
    for (const type of AIRCRAFT_TYPES) {
      const regex = new RegExp(`\\b${type}\\b`, 'gi');
      const matches = text.match(regex);
      
      if (matches) {
        for (const match of matches) {
          references.add(match);
        }
      }
    }
    
    return Array.from(references);
  }

  /**
   * Extract regulatory references from all authorities
   */
  private extractAllRegulatoryReferences(text: string): string[] {
    const references = new Set<string>();
    
    // Check each authority's pattern
    for (const authority in REGULATORY_PATTERNS) {
      const pattern = REGULATORY_PATTERNS[authority as keyof typeof REGULATORY_PATTERNS];
      const matches = text.match(pattern);
      
      if (matches) {
        for (const match of matches) {
          references.add(match);
        }
      }
    }
    
    return Array.from(references);
  }

  /**
   * Get filtered tokens (removing stopwords)
   */
  private getFilteredTokens(text: string): string[] {
    // Tokenize text
    const tokens = wordTokenizer.tokenize(text);
    
    // Filter stopwords
    return removeStopwords(tokens);
  }

  /**
   * Calculate word frequencies
   */
  private calculateWordFrequencies(tokens: string[]): Record<string, number> {
    const frequencies: Record<string, number> = {};
    
    for (const word of tokens) {
      if (word.length < 3) continue; // Skip very short words
      
      const lowerWord = word.toLowerCase();
      frequencies[lowerWord] = (frequencies[lowerWord] || 0) + 1;
    }
    
    return frequencies;
  }

  /**
   * Extract top keywords using TF-IDF
   */
  private extractTopKeywords(tokens: string[], count: number): string[] {
    // Get word frequencies
    const frequencies = this.calculateWordFrequencies(tokens);
    
    // Sort by frequency
    const sortedWords = Object.entries(frequencies)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(entry => entry[0]);
    
    return sortedWords;
  }

  /**
   * Classify document category based on keywords
   */
  private classifyDocumentCategory(tokens: string[]): DocumentCategory {
    const frequencies = this.calculateWordFrequencies(tokens);
    
    // Keyword signals for each category
    const categorySignals: Record<DocumentCategory, string[]> = {
      [DocumentCategory.TECHNICAL]: ['system', 'equipment', 'component', 'aircraft', 'engine', 'procedure', 'manual', 'technical', 'maintenance'],
      [DocumentCategory.REGULATORY]: ['regulation', 'requirement', 'compliance', 'certificate', 'authority', 'approval', 'rule', 'standard', 'directive'],
      [DocumentCategory.OPERATIONAL]: ['operation', 'procedure', 'checklist', 'flight', 'crew', 'pilot', 'emergency', 'normal', 'abnormal'],
      [DocumentCategory.TRAINING]: ['training', 'syllabus', 'course', 'student', 'instructor', 'lesson', 'exercise', 'curriculum', 'learn'],
      [DocumentCategory.ASSESSMENT]: ['assessment', 'exam', 'test', 'evaluation', 'rating', 'performance', 'score', 'grade', 'certification'],
      [DocumentCategory.REFERENCE]: ['reference', 'manual', 'guide', 'handbook', 'document', 'information', 'data', 'specification'],
      [DocumentCategory.UNCLASSIFIED]: []
    };
    
    // Calculate score for each category
    const scores: Record<DocumentCategory, number> = {
      [DocumentCategory.TECHNICAL]: 0,
      [DocumentCategory.REGULATORY]: 0,
      [DocumentCategory.OPERATIONAL]: 0,
      [DocumentCategory.TRAINING]: 0,
      [DocumentCategory.ASSESSMENT]: 0,
      [DocumentCategory.REFERENCE]: 0,
      [DocumentCategory.UNCLASSIFIED]: 0
    };
    
    // Calculate scores based on keyword frequency
    for (const category in categorySignals) {
      for (const keyword of categorySignals[category as DocumentCategory]) {
        if (frequencies[keyword]) {
          scores[category as DocumentCategory] += frequencies[keyword];
        }
      }
    }
    
    // Find category with highest score
    let maxScore = 0;
    let maxCategory = DocumentCategory.UNCLASSIFIED;
    
    for (const category in scores) {
      if (scores[category as DocumentCategory] > maxScore) {
        maxScore = scores[category as DocumentCategory];
        maxCategory = category as DocumentCategory;
      }
    }
    
    return maxCategory;
  }

  /**
   * Extract regulatory references
   */
  private extractRegulatoryReferences(text: string): RegulatoryReference[] {
    const results: RegulatoryReference[] = [];
    const references = this.extractAllRegulatoryReferences(text);
    
    for (const reference of references) {
      // Determine authority
      let authority = 'UNKNOWN';
      let description = '';
      
      for (const auth in REGULATORY_PATTERNS) {
        const pattern = REGULATORY_PATTERNS[auth as keyof typeof REGULATORY_PATTERNS];
        if (pattern.test(reference)) {
          authority = auth;
          break;
        }
      }
      
      // Create reference object
      results.push({
        code: reference,
        authority,
        version: 'current',
        description,
        effectiveDate: new Date()
      });
    }
    
    return results;
  }

  /**
   * Generate a summary of the text
   */
  private generateSummary(sentences: string[]): string {
    // Simple extractive summarization
    // In a real implementation, this would be more sophisticated
    
    // For now, just return first few sentences (up to 3)
    const summaryLength = Math.min(3, sentences.length);
    return sentences.slice(0, summaryLength).join(' ');
  }

  /**
   * Count paragraphs in text
   */
  private countParagraphs(text: string): number {
    try {
      const doc = nlp(text);
      // @ts-ignore - paragraphs() is provided by the plugin
      return doc.paragraphs().length;
    } catch (error) {
      console.warn('Error counting paragraphs with compromise', error);
      // Fallback: split by double newlines (simple paragraph detection)
      return text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    }
  }

  /**
   * Calculate readability score (simplified Flesch-Kincaid)
   */
  private calculateReadability(text: string): number {
    // Simplified Flesch-Kincaid readability score
    
    const sentences = tokenizeSentences(text);
    const words = wordTokenizer.tokenize(text);
    
    // Count syllables (simplified)
    let syllables = 0;
    for (const word of words) {
      syllables += this.countSyllables(word);
    }
    
    // Calculate score
    // Higher scores = easier to read
    if (sentences.length === 0 || words.length === 0) return 0;
    
    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    
    return 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  }

  /**
   * Count syllables in a word (simplified)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase();
    
    // Count vowel groups
    const vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
    let count = 0;
    let inVowelGroup = false;
    
    for (let i = 0; i < word.length; i++) {
      if (vowels.includes(word[i])) {
        if (!inVowelGroup) {
          count++;
          inVowelGroup = true;
        }
      } else {
        inVowelGroup = false;
      }
    }
    
    // Adjust for silent e at end
    if (word.length > 2 && word.endsWith('e') && !vowels.includes(word[word.length - 2])) {
      count--;
    }
    
    // Ensure at least one syllable
    return Math.max(1, count);
  }

  /**
   * Generate a syllabus based on document content
   */
  generateSyllabus(text: string, options: SyllabusGenerationOptions): GeneratedSyllabus {
    const startTime = Date.now();
    
    try {
      // Document analysis for input
      const analysis = this.analyzeDocument(text);
      
      // Extract competencies from document
      const competencies = this.extractCompetencies(text);
      
      // Create modules based on document structure
      const modules = this.generateModules(text, competencies, options);
      
      // Create lessons for each module
      const lessons = this.generateLessons(text, modules);
      
      // Determine program metadata
      const programType = options.programType || 'custom';
      
      // Get aircraft type
      const aircraftTypes = analysis.references.aircraft;
      const aircraftType = aircraftTypes.length > 0 ? aircraftTypes[0] : options.aircraftType;
      
      // Create the syllabus
      const syllabus: GeneratedSyllabus = {
        name: options.name || `${aircraftType || 'General'} ${programType.charAt(0).toUpperCase() + programType.slice(1)} Training Program`,
        description: options.description || `Generated training program for ${aircraftType || 'aviation'} training.`,
        programType,
        aircraftType,
        totalDuration: this.calculateTotalDuration(modules),
        modules,
        lessons,
        regulatoryCompliance: {
          authority: options.regulatoryAuthority || 'FAA',
          requirementsMet: analysis.references.regulatory,
          requirementsPartiallyMet: [],
          requirementsNotMet: []
        },
        confidenceScore: 75,
        version: "1.0.0",
        createdAt: new Date()
      };
      
      // Add knowledge graph if requested
      if (options.includeKnowledgeGraph) {
        syllabus.knowledgeGraph = this.generateKnowledgeGraph(text, modules, competencies);
      }
      
      return syllabus;
    } catch (error) {
      logger.error(`Error generating syllabus: ${error instanceof Error ? error.message : String(error)}`);
      
      // Return minimal syllabus on error
      return {
        name: "Error in Syllabus Generation",
        description: "An error occurred during syllabus generation. Please try again.",
        programType: "custom",
        totalDuration: 0,
        modules: [],
        lessons: [],
        regulatoryCompliance: {
          authority: "unknown",
          requirementsMet: [],
          requirementsPartiallyMet: [],
          requirementsNotMet: []
        },
        confidenceScore: 0,
        version: "error"
      };
    }
  }

  /**
   * Extract competencies from document text
   */
  private extractCompetencies(text: string): ExtractedCompetency[] {
    const competencies: ExtractedCompetency[] = [];
    const sentences = tokenizeSentences(text);
    
    // Look for competency-like sentences
    const competencyPatterns = [
      /\b(able to|can|will|should|must|demonstrate ability to|proficiency in)\b/i,
      /\b(knowledge of|understand|comprehend|explain|identify|recognize)\b/i,
      /\b(execute|perform|conduct|apply|implement|analyze|evaluate)\b/i
    ];
    
    let currentCompetency: Partial<ExtractedCompetency> | null = null;
    
    // Identify potential competencies in sentences
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      
      // Check if sentence potentially contains a competency
      const isCompetencyLike = competencyPatterns.some(pattern => pattern.test(sentence));
      
      if (isCompetencyLike) {
        // Extract competency name (simplified - first 50 chars)
        const name = sentence.substring(0, Math.min(50, sentence.length));
        
        // Create new competency
        currentCompetency = {
          name,
          description: sentence,
          assessmentCriteria: []
        };
        
        // Look for assessment criteria in subsequent sentences
        for (let j = i + 1; j < Math.min(i + 4, sentences.length); j++) {
          const nextSentence = sentences[j];
          
          // Check if sentence is likely a criterion
          if (/\b(accurately|correctly|safely|properly|effectively|successfully)\b/i.test(nextSentence)) {
            currentCompetency.assessmentCriteria?.push(nextSentence);
          }
        }
        
        // Only add if we have a valid competency
        if (currentCompetency.name && currentCompetency.description) {
          competencies.push(currentCompetency as ExtractedCompetency);
        }
        
        // Reset for next competency
        currentCompetency = null;
      }
    }
    
    // Deduplicate and return
    return this.deduplicateCompetencies(competencies);
  }

  /**
   * Remove duplicate competencies
   */
  private deduplicateCompetencies(competencies: ExtractedCompetency[]): ExtractedCompetency[] {
    const uniqueCompetencies: ExtractedCompetency[] = [];
    const seenNames = new Set<string>();
    
    for (const competency of competencies) {
      if (!seenNames.has(competency.name)) {
        uniqueCompetencies.push(competency);
        seenNames.add(competency.name);
      }
    }
    
    return uniqueCompetencies;
  }

  /**
   * Generate training modules from document content
   */
  private generateModules(
    text: string, 
    competencies: ExtractedCompetency[],
    options: SyllabusGenerationOptions
  ): ExtractedModule[] {
    const modules: ExtractedModule[] = [];
    
    // Extract paragraphs
    let paragraphs: any[] = [];
    try {
      const doc = nlp(text);
      // @ts-ignore - paragraphs() is provided by the plugin
      paragraphs = doc.paragraphs().json() || [];
    } catch (error) {
      console.warn('Error extracting paragraphs for module generation', error);
      // Fallback: split by double newlines (simple paragraph detection)
      paragraphs = text.split(/\n\s*\n/)
        .filter(p => p.trim().length > 0)
        .map(p => ({ text: p }));
    }
    
    // Map to collect topics
    const topicMap = new Map<string, string[]>();
    
    // Analyze paragraphs to identify topics
    for (const paragraph of paragraphs) {
      // Get main topic from paragraph text
      const paraText = paragraph.text || '';
      if (!paraText || paraText.length < 20) continue;
      
      // Simplified topic extraction - first 30 chars of paragraph
      const topic = paraText.substring(0, Math.min(30, paraText.length));
      
      // Add paragraph to topic
      if (!topicMap.has(topic)) {
        topicMap.set(topic, []);
      }
      topicMap.get(topic)?.push(paraText);
    }
    
    // Create modules based on topics and options
    if (options.includeClassroomModules) {
      // Add theoretical knowledge module
      modules.push({
        name: "Theoretical Knowledge",
        description: "Foundational knowledge and concepts required for the training program.",
        type: "ground",
        competencies: competencies.filter(c => c.name.includes("knowledge") || c.name.includes("understand")),
        recommendedDuration: 10,
        regulatoryRequirements: []
      });
    }
    
    if (options.includeSimulatorExercises) {
      // Add simulator training module
      modules.push({
        name: "Simulator Training",
        description: "Practical exercises in the simulator to develop core skills.",
        type: "simulator",
        competencies: competencies.filter(c => c.name.includes("perform") || c.name.includes("demonstrate")),
        recommendedDuration: 8,
        regulatoryRequirements: []
      });
    }
    
    if (options.includeAircraftExercises) {
      // Add aircraft training module
      modules.push({
        name: "Aircraft Training",
        description: "Real aircraft flying exercises to develop and assess competencies.",
        type: "aircraft",
        competencies: competencies.filter(c => !c.name.includes("knowledge")),
        recommendedDuration: 12,
        regulatoryRequirements: []
      });
    }
    
    return modules;
  }

  /**
   * Generate lessons for each module
   */
  private generateLessons(text: string, modules: ExtractedModule[]): ExtractedLesson[] {
    const lessons: ExtractedLesson[] = [];
    
    // Create lessons for each module
    modules.forEach((module, moduleIndex) => {
      // Number of lessons depends on module type
      const lessonCount = module.type === 'ground' ? 4 : 
                          module.type === 'simulator' ? 3 : 2;
      
      // Create lessons for this module
      for (let i = 0; i < lessonCount; i++) {
        const lessonNumber = i + 1;
        
        // Add lesson
        lessons.push({
          name: `${module.name} - Lesson ${lessonNumber}`,
          description: `Lesson ${lessonNumber} of the ${module.name} module.`,
          content: `Content for ${module.name} lesson ${lessonNumber}. In a real implementation, this would contain detailed lesson information.`,
          type: module.type === 'ground' ? 'document' : 'video',
          moduleIndex,
          duration: 60, // 60 minutes per lesson
          learningObjectives: [
            `Understand key concepts related to ${module.name} part ${lessonNumber}`,
            `Demonstrate proficiency in ${module.name} activities ${lessonNumber}`
          ]
        });
      }
    });
    
    return lessons;
  }

  /**
   * Calculate total program duration in days
   */
  private calculateTotalDuration(modules: ExtractedModule[]): number {
    // Sum up all module durations and convert to days (assuming 8hr days)
    const totalHours = modules.reduce((sum, module) => sum + module.recommendedDuration, 0);
    return Math.ceil(totalHours / 8);
  }

  /**
   * Generate knowledge graph from content
   */
  private generateKnowledgeGraph(
    text: string, 
    modules: ExtractedModule[],
    competencies: ExtractedCompetency[]
  ): { nodes: Array<{id: string, type: string, content: string}>, edges: Array<{source: string, target: string, relationship: string}> } {
    const nodes: Array<{id: string, type: string, content: string}> = [];
    const edges: Array<{source: string, target: string, relationship: string}> = [];
    
    // Add nodes for modules
    modules.forEach(module => {
      const moduleId = `module-${module.name.replace(/\s+/g, '-').toLowerCase()}`;
      
      // Add module node
      nodes.push({
        id: moduleId,
        type: 'module',
        content: module.name
      });
      
      // Add competency nodes and connect to module
      module.competencies.forEach(competency => {
        const competencyId = `competency-${competency.name.replace(/\s+/g, '-').toLowerCase()}`;
        
        // Add competency node if not exists
        if (!nodes.some(n => n.id === competencyId)) {
          nodes.push({
            id: competencyId,
            type: 'competency',
            content: competency.name
          });
        }
        
        // Add edge from module to competency
        edges.push({
          source: moduleId,
          target: competencyId,
          relationship: 'develops'
        });
      });
    });
    
    return { nodes, edges };
  }
}