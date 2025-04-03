/**
 * DocumentProcessor - System for extracting syllabus information from PDF documents
 * and parsing structured content with section/chapter identification.
 */

import * as pdfjs from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';
import natural from 'natural';
import { EventEmitter } from 'events';

// Dynamically import pdfjs worker
import('pdfjs-dist/build/pdf.worker.entry');

// Set PDF.js workerSrc (needed for browser environment)
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
}

// Syllabus structure interfaces
export interface SyllabusSection {
  id: string;
  title: string;
  level: number;
  content: string;
  subsections: SyllabusSection[];
  pageNumber?: number;
  pageRange?: { start: number; end: number };
}

export interface SyllabusStructure {
  title: string;
  author?: string;
  date?: string;
  version?: string;
  sections: SyllabusSection[];
  metadata: Record<string, any>;
  toc?: TableOfContents[];
}

export interface TableOfContents {
  title: string;
  level: number;
  pageNumber: number;
}

export interface LearningObjective {
  id: string;
  text: string;
  section: string;
  sectionId: string;
  type: 'knowledge' | 'skill' | 'attitude' | 'unknown';
  blooms?: BloomLevel;
  regulations?: string[];
  keywords: string[];
}

export enum BloomLevel {
  REMEMBER = 'remember',
  UNDERSTAND = 'understand',
  APPLY = 'apply',
  ANALYZE = 'analyze',
  EVALUATE = 'evaluate',
  CREATE = 'create'
}

// Progress tracking interface
export interface ProgressEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  stage: 'extraction' | 'parsing' | 'objectives' | 'all';
  progress: number; // 0-100
  message: string;
  error?: Error;
}

// Document Processor Options
export interface DocumentProcessorOptions {
  enableNLP?: boolean;
  maxPagesToProcess?: number;
  sectionPatterns?: RegExp[];
  objectivePatterns?: RegExp[];
  abortSignal?: AbortSignal;
  regulationPatterns?: RegExp[];
  tokenSeparator?: RegExp;
}

/**
 * Main DocumentProcessor class for syllabus extraction and processing
 */
export class DocumentProcessor extends EventEmitter {
  private options: DocumentProcessorOptions;
  private tokenizer: natural.WordTokenizer;
  private stemmer: (word: string) => string;
  private tagger: natural.BrillPOSTagger;
  
  // Bloom's Taxonomy keywords by level
  private bloomKeywords = {
    [BloomLevel.REMEMBER]: ['define', 'describe', 'identify', 'know', 'label', 'list', 'match', 'name', 'outline', 'recall', 'recognize', 'select', 'state'],
    [BloomLevel.UNDERSTAND]: ['comprehend', 'convert', 'defend', 'distinguish', 'estimate', 'explain', 'extend', 'generalize', 'give example', 'infer', 'interpret', 'paraphrase', 'predict', 'rewrite', 'summarize', 'translate'],
    [BloomLevel.APPLY]: ['apply', 'change', 'compute', 'construct', 'demonstrate', 'discover', 'manipulate', 'modify', 'operate', 'predict', 'prepare', 'produce', 'relate', 'show', 'solve', 'use'],
    [BloomLevel.ANALYZE]: ['analyze', 'break down', 'compare', 'contrast', 'diagram', 'deconstruct', 'differentiate', 'discriminate', 'distinguish', 'identify', 'illustrate', 'infer', 'outline', 'relate', 'select', 'separate'],
    [BloomLevel.EVALUATE]: ['appraise', 'compare', 'conclude', 'contrast', 'criticize', 'critique', 'defend', 'describe', 'discriminate', 'evaluate', 'explain', 'interpret', 'justify', 'relate', 'summarize', 'support'],
    [BloomLevel.CREATE]: ['categorize', 'combine', 'compile', 'compose', 'create', 'design', 'devise', 'establish', 'formulate', 'generate', 'modify', 'organize', 'plan', 'rearrange', 'reconstruct', 'relate', 'reorganize', 'revise']
  };

  // Default section patterns
  private defaultSectionPatterns = [
    /^(Chapter|Section)\s+(\d+)\.(\d+)?\.?(\d+)?\.?\s+(.+)$/i,
    /^(\d+)\.(\d+)?\.?(\d+)?\.?\s+(.+)$/i,
    /^([A-Z])\.(\d+)?\.?(\d+)?\.?\s+(.+)$/i
  ];

  // Default learning objective patterns
  private defaultObjectivePatterns = [
    /(?:learning|training)\s+objective\s*(?:#|:|\d+)?\s*(.*)/i,
    /(?:at the end of this (?:module|course|section|training|chapter)|upon completion of this (?:module|course|section|training|chapter))[^.]*(?:trainee|student|participant|learner)[^.]*(?:will be able to|should be able to|shall)[^.]*\s*(.*)/i,
    /(?:trainee|student|participant|learner)s?\s+(?:will|should|shall)\s+(?:be able to|learn to|demonstrate)[^.]*\s*(.*)/i,
    /objective\s*(?:#|:|\d+)?\s*(.*)/i
  ];

  // Default regulation patterns
  private defaultRegulationPatterns = [
    /(?:FAA|EASA|ICAO|CAA)\s+(?:Regulation|Requirement|Standard|Part|AC)\s+(\d+[\w\-\.]*)/i,
    /(?:CFR|Part)\s+(\d+\.\d+)/i,
    /(?:AC|Advisory Circular)\s+(\d+[\w\-\.]*)/i
  ];

  /**
   * Create a new DocumentProcessor instance
   * @param options Configuration options
   */
  constructor(options: DocumentProcessorOptions = {}) {
    super();
    
    this.options = {
      enableNLP: true,
      maxPagesToProcess: 0, // 0 means no limit
      sectionPatterns: this.defaultSectionPatterns,
      objectivePatterns: this.defaultObjectivePatterns,
      regulationPatterns: this.defaultRegulationPatterns,
      tokenSeparator: /\s+/,
      ...options
    };
    
    // Initialize NLP components
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer.stem;
    
    // Initialize POS tagger if NLP is enabled
    if (this.options.enableNLP) {
      const lexicon = new natural.Lexicon('EN', 'N');
      const ruleSet = new natural.RuleSet('EN');
      this.tagger = new natural.BrillPOSTagger(lexicon, ruleSet);
    }
  }

  /**
   * Extract text from a PDF file
   * @param file Buffer or Blob containing the PDF file
   * @returns Extracted text content
   */
  public async extractText(file: Buffer | Blob): Promise<string> {
    // Check if abort requested
    this.checkAbort();
    
    // Emit start event
    this.emitProgress('start', 'extraction', 0, 'Starting PDF text extraction');
    
    try {
      // Load the PDF document
      const data = file instanceof Buffer 
        ? new Uint8Array(file) 
        : file;
        
      const loadingTask = pdfjs.getDocument({ data });
      const pdf = await loadingTask.promise;
      
      // Determine how many pages to process
      const pageCount = pdf.numPages;
      const maxPages = this.options.maxPagesToProcess || pageCount;
      const pagesToProcess = Math.min(pageCount, maxPages);
      
      this.emitProgress('progress', 'extraction', 5, 
        `PDF loaded with ${pageCount} pages. Processing ${pagesToProcess} pages.`);
      
      // Extract text from each page
      let fullText = '';
      let pageTexts: string[] = [];
      
      for (let i = 1; i <= pagesToProcess; i++) {
        // Check if abort requested
        this.checkAbort();
        
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        
        // Process text items
        const pageText = this.processTextItems(content.items as TextItem[]);
        
        pageTexts.push(pageText);
        
        // Update progress
        const progress = Math.round((i / pagesToProcess) * 80) + 5; // 5-85%
        this.emitProgress('progress', 'extraction', progress, 
          `Extracted text from page ${i} of ${pagesToProcess}`);
      }
      
      // Combine page texts with page markers for later section processing
      fullText = pageTexts.map((text, index) => 
        `\n[PAGE_${index + 1}]\n${text}\n[/PAGE_${index + 1}]\n`
      ).join('');
      
      this.emitProgress('progress', 'extraction', 90, 'Text extraction completed');
      
      // Clean up memory
      await pdf.destroy();
      
      this.emitProgress('complete', 'extraction', 100, 'Text extraction completed');
      
      return fullText;
    } catch (error) {
      const err = error as Error;
      this.emitProgress('error', 'extraction', 0, `PDF extraction failed: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * Parse extracted text into structured syllabus content
   * @param text Extracted text from PDF
   * @returns Structured syllabus content
   */
  public async parseStructuredContent(text: string): Promise<SyllabusStructure> {
    // Check if abort requested
    this.checkAbort();
    
    // Emit start event
    this.emitProgress('start', 'parsing', 0, 'Starting structured content parsing');
    
    try {
      // Extract metadata
      this.emitProgress('progress', 'parsing', 10, 'Extracting document metadata');
      const metadata = this.extractMetadata(text);
      
      // Detect and extract table of contents
      this.emitProgress('progress', 'parsing', 20, 'Detecting table of contents');
      const toc = this.extractTableOfContents(text);
      
      // Identify sections using patterns and TOC
      this.emitProgress('progress', 'parsing', 30, 'Identifying document sections');
      const sections = await this.identifySections(text, toc);
      
      // Clean up sections and extract content
      this.emitProgress('progress', 'parsing', 60, 'Extracting section content');
      const cleanedSections = this.processSections(sections, text);
      
      // Construct the final syllabus structure
      const syllabusStructure: SyllabusStructure = {
        title: metadata.title || 'Untitled Document',
        author: metadata.author,
        date: metadata.date,
        version: metadata.version,
        sections: cleanedSections,
        metadata,
        toc
      };
      
      this.emitProgress('complete', 'parsing', 100, 'Content parsing completed');
      
      return syllabusStructure;
    } catch (error) {
      const err = error as Error;
      this.emitProgress('error', 'parsing', 0, `Content parsing failed: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * Identify learning objectives from parsed structure
   * @param content Structured syllabus content
   * @returns Array of identified learning objectives
   */
  public async identifyLearningObjectives(content: SyllabusStructure): Promise<LearningObjective[]> {
    // Check if abort requested
    this.checkAbort();
    
    // Emit start event
    this.emitProgress('start', 'objectives', 0, 'Starting learning objective identification');
    
    try {
      const objectives: LearningObjective[] = [];
      let processedSections = 0;
      const totalSections = this.countSections(content.sections);
      
      // Process each section to find learning objectives
      const processSection = async (section: SyllabusSection, path: string = ''): Promise<void> => {
        // Check if abort requested
        this.checkAbort();
        
        // Update path with current section
        const currentPath = path ? `${path} > ${section.title}` : section.title;
        
        // Extract objectives from this section
        const sectionObjectives = this.extractObjectivesFromText(
          section.content,
          section.id,
          currentPath
        );
        
        objectives.push(...sectionObjectives);
        
        // Process subsections recursively
        for (const subsection of section.subsections) {
          await processSection(subsection, currentPath);
        }
        
        // Update progress
        processedSections++;
        const progress = Math.round((processedSections / totalSections) * 90) + 5; // 5-95%
        this.emitProgress('progress', 'objectives', progress, 
          `Processed ${processedSections} of ${totalSections} sections`);
      };
      
      // Start processing from top-level sections
      for (const section of content.sections) {
        await processSection(section);
      }
      
      // Apply NLP analysis to improve objective classification
      if (this.options.enableNLP && objectives.length > 0) {
        this.emitProgress('progress', 'objectives', 95, 
          'Applying NLP analysis to refine objectives');
        
        await this.enhanceObjectivesWithNLP(objectives);
      }
      
      this.emitProgress('complete', 'objectives', 100, 
        `Identified ${objectives.length} learning objectives`);
      
      return objectives;
    } catch (error) {
      const err = error as Error;
      this.emitProgress('error', 'objectives', 0, `Learning objective identification failed: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * Process a complete syllabus document in one call
   * @param file PDF file as Buffer or Blob
   * @returns Complete extraction results with structure and objectives
   */
  public async processSyllabus(file: Buffer | Blob): Promise<{
    structure: SyllabusStructure;
    objectives: LearningObjective[];
    rawText: string;
  }> {
    // Check if abort requested
    this.checkAbort();
    
    // Emit start event
    this.emitProgress('start', 'all', 0, 'Starting complete syllabus processing');
    
    try {
      // Extract text from PDF
      this.emitProgress('progress', 'all', 5, 'Extracting text from PDF');
      const text = await this.extractText(file);
      
      // Parse into structured content
      this.emitProgress('progress', 'all', 40, 'Parsing structured content');
      const structure = await this.parseStructuredContent(text);
      
      // Identify learning objectives
      this.emitProgress('progress', 'all', 70, 'Identifying learning objectives');
      const objectives = await this.identifyLearningObjectives(structure);
      
      this.emitProgress('complete', 'all', 100, 'Syllabus processing completed');
      
      return {
        structure,
        objectives,
        rawText: text
      };
    } catch (error) {
      const err = error as Error;
      this.emitProgress('error', 'all', 0, `Syllabus processing failed: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * Cancel ongoing processing
   */
  public cancel(): void {
    if (this.options.abortSignal && 'abort' in this.options.abortSignal && typeof this.options.abortSignal.abort === 'function') {
      (this.options.abortSignal as any).abort();
    }
  }

  /**
   * Update processor options
   * @param options New options to apply
   */
  public updateOptions(options: Partial<DocumentProcessorOptions>): void {
    this.options = {
      ...this.options,
      ...options
    };
  }

  /**
   * Generate a document map showing the structure visually
   * @param structure Parsed syllabus structure
   * @returns Text visualization of document structure
   */
  public generateDocumentMap(structure: SyllabusStructure): string {
    let map = `Document Map: ${structure.title}\n`;
    map += `${'='.repeat(structure.title.length + 14)}\n\n`;
    
    const renderSection = (section: SyllabusSection, depth: number = 0): string => {
      const indent = '  '.repeat(depth);
      const pages = section.pageRange 
        ? `[Pages ${section.pageRange.start}-${section.pageRange.end}]` 
        : section.pageNumber 
          ? `[Page ${section.pageNumber}]` 
          : '';
      
      let sectionMap = `${indent}${section.id} ${section.title} ${pages}\n`;
      
      for (const subsection of section.subsections) {
        sectionMap += renderSection(subsection, depth + 1);
      }
      
      return sectionMap;
    };
    
    for (const section of structure.sections) {
      map += renderSection(section);
    }
    
    return map;
  }

  /**
   * Map learning objectives to training requirements
   * @param objectives Identified learning objectives
   * @param requirementsMap Mapping of requirements to patterns
   * @returns Objectives with associated requirements
   */
  public mapToTrainingRequirements(
    objectives: LearningObjective[],
    requirementsMap: Record<string, { name: string; patterns: RegExp[] }>
  ): LearningObjective[] {
    return objectives.map(objective => {
      const matchedRegs: string[] = [];
      
      // Check each requirement against the objective text
      Object.entries(requirementsMap).forEach(([reqId, requirement]) => {
        const matches = requirement.patterns.some(pattern => 
          pattern.test(objective.text)
        );
        
        if (matches) {
          matchedRegs.push(reqId);
        }
      });
      
      return {
        ...objective,
        regulations: [...(objective.regulations || []), ...matchedRegs]
      };
    });
  }

  // PRIVATE METHODS

  /**
   * Process PDF text items into a coherent string
   */
  private processTextItems(items: TextItem[]): string {
    // Group items by vertical position (approximate lines)
    const lines: { y: number; items: TextItem[] }[] = [];
    
    for (const item of items) {
      const y = Math.round(item.transform[5]); // Vertical position, rounded for grouping
      
      // Find existing line or create new one
      let line = lines.find(l => Math.abs(l.y - y) < 2); // Allow small deviation
      if (!line) {
        line = { y, items: [] };
        lines.push(line);
      }
      
      line.items.push(item);
    }
    
    // Sort lines by vertical position (top to bottom)
    lines.sort((a, b) => b.y - a.y);
    
    // Sort items in each line by horizontal position and concatenate
    const processedLines = lines.map(line => {
      // Sort by horizontal position
      line.items.sort((a, b) => a.transform[4] - b.transform[4]);
      
      // Combine items, adding spaces based on horizontal distance
      let lineText = '';
      let lastEndX = 0;
      
      for (const item of line.items) {
        const text = item.str;
        const startX = item.transform[4];
        const itemWidth = item.width || 0;
        
        // Add space if there's a significant gap
        if (lastEndX > 0 && startX - lastEndX > 3) {
          lineText += ' ';
        }
        
        lineText += text;
        lastEndX = startX + itemWidth;
      }
      
      return lineText;
    });
    
    // Join lines with newlines
    return processedLines.join('\n');
  }

  /**
   * Extract basic metadata from document text
   */
  private extractMetadata(text: string): Record<string, any> {
    const metadata: Record<string, any> = {
      title: '',
      author: '',
      date: '',
      version: ''
    };
    
    // Try to find title (typically at the beginning)
    const titleMatch = text.match(/\n([^\n]{5,100})(?: syllabus| course| training| manual| guide| document)/i);
    if (titleMatch) {
      metadata.title = titleMatch[1].trim();
    }
    
    // Look for author pattern
    const authorMatch = text.match(/(?:prepared by|author|created by)[:\s]+([^\n]{3,50})/i);
    if (authorMatch) {
      metadata.author = authorMatch[1].trim();
    }
    
    // Look for date patterns
    const dateMatch = text.match(/(?:date|published|created|revised|updated|version date)[:\s]+([^\n]{3,30})/i);
    if (dateMatch) {
      metadata.date = dateMatch[1].trim();
    }
    
    // Look for version information
    const versionMatch = text.match(/(?:version|revision|release)[:\s]+([^\n]{1,20})/i);
    if (versionMatch) {
      metadata.version = versionMatch[1].trim();
    }
    
    return metadata;
  }

  /**
   * Detect and extract table of contents from document
   */
  private extractTableOfContents(text: string): TableOfContents[] {
    const tocItems: TableOfContents[] = [];
    
    // Look for Table of Contents section
    const tocMatch = text.match(/(?:table of contents|contents|toc)\s*\n([\s\S]+?)(?:\n{2,}|\[PAGE_)/i);
    
    if (!tocMatch) {
      return tocItems;
    }
    
    const tocText = tocMatch[1];
    const tocLines = tocText.split('\n').filter(line => line.trim().length > 0);
    
    // Process TOC lines
    for (const line of tocLines) {
      // Look for patterns like "1. Introduction ................. 5"
      const tocLineMatch = line.match(/^(?:(?:Chapter|Section|Module)\s+)?(\d+(?:\.\d+)*)?\.?\s+([^\d\.][\s\S]+?)(?:\.{2,}|\s{2,})(\d+)$/);
      
      if (tocLineMatch) {
        const [, numberStr, title, pageStr] = tocLineMatch;
        
        // Determine level from the section number (e.g., "1.2.3" -> level 3)
        const level = numberStr ? (numberStr.split('.').length) : 1;
        
        tocItems.push({
          title: title.trim(),
          level,
          pageNumber: parseInt(pageStr, 10)
        });
      }
    }
    
    return tocItems;
  }

  /**
   * Identify document sections based on heading patterns
   */
  private async identifySections(text: string, toc: TableOfContents[]): Promise<SyllabusSection[]> {
    const sections: SyllabusSection[] = [];
    const sectionPatterns = this.options.sectionPatterns || this.defaultSectionPatterns;
    
    // Get page markers to help with page number tracking
    const pageMarkers = this.extractPageMarkers(text);
    
    // Process the text line by line
    const lines = text.split('\n');
    
    let currentPage = 1;
    let sectionId = '';
    let sectionTitle = '';
    let sectionLevel = 0;
    let inSection = false;
    let sectionStart = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for page markers
      const pageMatch = line.match(/\[PAGE_(\d+)\]/);
      if (pageMatch) {
        currentPage = parseInt(pageMatch[1], 10);
        continue;
      }
      
      // Skip empty lines
      if (!line.length) continue;
      
      // Check if the line matches any section pattern
      let sectionMatch = null;
      for (const pattern of sectionPatterns) {
        sectionMatch = line.match(pattern);
        if (sectionMatch) break;
      }
      
      if (sectionMatch) {
        // If we were already in a section, save it
        if (inSection) {
          const sectionContent = lines.slice(sectionStart, i).join('\n');
          
          // Create section object
          sections.push(this.createSectionObject(
            sectionId,
            sectionTitle,
            sectionLevel,
            sectionContent,
            currentPage
          ));
        }
        
        // Extract section info from the current match
        const parts = sectionMatch.filter(p => p !== undefined);
        
        if (parts.length >= 2) {
          // Format varies by pattern, but typically:
          // parts[0] = full match
          // parts[1...n-1] = section number components
          // parts[n] = section title
          
          const titleIndex = parts.length - 1;
          sectionTitle = parts[titleIndex].trim();
          
          // Create section ID from the section number components
          const numberParts = parts.slice(1, titleIndex).filter(p => p);
          sectionId = numberParts.join('.');
          
          // Determine section level from number of components
          sectionLevel = numberParts.length;
          
          // Start capturing content for this section
          inSection = true;
          sectionStart = i + 1;
        }
      }
    }
    
    // Add the last section if we were in one
    if (inSection) {
      const sectionContent = lines.slice(sectionStart).join('\n');
      
      sections.push(this.createSectionObject(
        sectionId,
        sectionTitle,
        sectionLevel,
        sectionContent,
        currentPage
      ));
    }
    
    // Now arrange sections into a proper hierarchy
    return this.buildSectionHierarchy(sections);
  }

  /**
   * Extract page marker positions from text
   */
  private extractPageMarkers(text: string): { page: number; position: number }[] {
    const markers: { page: number; position: number }[] = [];
    const pattern = /\[PAGE_(\d+)\]/g;
    
    let match;
    while ((match = pattern.exec(text)) !== null) {
      markers.push({
        page: parseInt(match[1], 10),
        position: match.index
      });
    }
    
    return markers;
  }

  /**
   * Create section object with proper ID, title, and level
   */
  private createSectionObject(
    id: string,
    title: string,
    level: number,
    content: string,
    pageNumber: number
  ): SyllabusSection {
    return {
      id: id || `section-${Math.random().toString(36).substr(2, 9)}`,
      title: title || 'Untitled Section',
      level: level || 1,
      content: content.trim(),
      subsections: [],
      pageNumber
    };
  }

  /**
   * Build proper section hierarchy from flat list
   */
  private buildSectionHierarchy(sections: SyllabusSection[]): SyllabusSection[] {
    // Make a copy to avoid mutating the original
    const allSections = [...sections].sort((a, b) => {
      // First sort by page number
      if (a.pageNumber !== b.pageNumber) {
        return a.pageNumber - b.pageNumber;
      }
      
      // Then by section ID if available
      if (a.id && b.id) {
        // Split IDs by dots and compare numerically
        const aParts = a.id.split('.').map(p => parseInt(p, 10) || 0);
        const bParts = b.id.split('.').map(p => parseInt(p, 10) || 0);
        
        for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
          if (aParts[i] !== bParts[i]) {
            return aParts[i] - bParts[i];
          }
        }
        
        return aParts.length - bParts.length;
      }
      
      return 0;
    });
    
    // Root-level sections
    const rootSections: SyllabusSection[] = [];
    
    // Process each section
    for (const section of allSections) {
      if (section.level === 1) {
        // Top-level section
        rootSections.push(section);
      } else {
        // Find parent section
        let currentSections = rootSections;
        let found = false;
        
        // Look for parent based on section ID
        if (section.id) {
          const parentParts = section.id.split('.');
          parentParts.pop(); // Remove last part
          const parentId = parentParts.join('.');
          
          // Recursive function to find the parent
          const findParent = (sections: SyllabusSection[], parentId: string): boolean => {
            for (const potentialParent of sections) {
              if (potentialParent.id === parentId) {
                // Found the parent
                potentialParent.subsections.push(section);
                return true;
              }
              
              // Check subsections
              if (potentialParent.subsections.length > 0) {
                if (findParent(potentialParent.subsections, parentId)) {
                  return true;
                }
              }
            }
            
            return false;
          };
          
          found = findParent(rootSections, parentId);
        }
        
        // If no parent found by ID, use level as a fallback
        if (!found) {
          // Find the most recent section with a level one higher
          const targetLevel = section.level - 1;
          
          // Recursive function to find parent by level
          const findParentByLevel = (sections: SyllabusSection[]): boolean => {
            if (sections.length === 0) return false;
            
            // Check the last section at this level
            const lastSection = sections[sections.length - 1];
            
            if (lastSection.level === targetLevel) {
              // Found a suitable parent
              lastSection.subsections.push(section);
              return true;
            }
            
            // Try in the subsections of the last section
            if (lastSection.subsections.length > 0) {
              return findParentByLevel(lastSection.subsections);
            }
            
            return false;
          };
          
          found = findParentByLevel(rootSections);
          
          // If still not found, add as a root section
          if (!found) {
            rootSections.push(section);
          }
        }
      }
    }
    
    return rootSections;
  }

  /**
   * Process sections to clean up content and add page ranges
   */
  private processSections(sections: SyllabusSection[], fullText: string): SyllabusSection[] {
    const processSection = (section: SyllabusSection): SyllabusSection => {
      // Remove page markers and clean up content
      section.content = this.cleanSectionContent(section.content);
      
      // Process subsections recursively
      section.subsections = section.subsections.map(processSection);
      
      return section;
    };
    
    // Process all sections
    return sections.map(processSection);
  }

  /**
   * Clean section content by removing markers and normalizing whitespace
   */
  private cleanSectionContent(content: string): string {
    // Remove page markers
    let cleaned = content.replace(/\[PAGE_\d+\]|\[\/PAGE_\d+\]/g, '');
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // Remove leading/trailing whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  /**
   * Extract learning objectives from text
   */
  private extractObjectivesFromText(text: string, sectionId: string, sectionPath: string): LearningObjective[] {
    const objectives: LearningObjective[] = [];
    const objectivePatterns = this.options.objectivePatterns || this.defaultObjectivePatterns;
    const regulationPatterns = this.options.regulationPatterns || this.defaultRegulationPatterns;
    
    // Split text into sentences (simple approach)
    const sentences = text.replace(/\n/g, ' ').split(/(?<=[.!?])\s+/);
    
    // Find sentences matching objective patterns
    for (const sentence of sentences) {
      for (const pattern of objectivePatterns) {
        const match = sentence.match(pattern);
        
        if (match) {
          // Extract objective text
          const objectiveText = match[1] ? match[1].trim() : sentence.trim();
          
          // Skip if too short
          if (objectiveText.length < 10) continue;
          
          // Check for regulations
          const regulations: string[] = [];
          for (const regPattern of regulationPatterns) {
            const regMatches = objectiveText.match(regPattern);
            if (regMatches && regMatches[1]) {
              regulations.push(regMatches[1]);
            }
          }
          
          // Create a unique ID for this objective
          const id = `obj-${sectionId}-${objectives.length + 1}`;
          
          // Extract keywords
          const keywords = this.extractKeywords(objectiveText);
          
          // Determine objective type based on keywords (simple heuristic)
          const type = this.determineObjectiveType(objectiveText);
          
          // Add to list
          objectives.push({
            id,
            text: objectiveText,
            section: sectionPath,
            sectionId,
            type,
            regulations,
            keywords
          });
          
          break; // Only use the first matching pattern
        }
      }
    }
    
    return objectives;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - tokenize and remove stop words
    const tokens = this.tokenizer.tokenize(text.toLowerCase()) || [];
    
    // Common stop words
    const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
      'to', 'of', 'in', 'on', 'by', 'for', 'with', 'as', 'at', 'be', 'this', 'that', 'it',
      'will', 'shall', 'should', 'can', 'may', 'must', 'have', 'has', 'had', 'do', 'does',
      'did', 'able'];
    
    // Filter tokens and extract keywords
    return tokens
      .filter(token => 
        token.length > 2 && 
        !stopWords.includes(token) && 
        !/^\d+$/.test(token)) // Remove numbers
      .map(token => this.stemmer(token)) // Stem words
      .filter((token, index, self) => self.indexOf(token) === index); // Remove duplicates
  }

  /**
   * Determine objective type based on text analysis
   */
  private determineObjectiveType(text: string): 'knowledge' | 'skill' | 'attitude' | 'unknown' {
    const lowerText = text.toLowerCase();
    
    // Knowledge indicators
    const knowledgeIndicators = [
      'identify', 'define', 'describe', 'explain', 'list', 'recall',
      'recognize', 'understand', 'know', 'state', 'outline'
    ];
    
    // Skill indicators
    const skillIndicators = [
      'demonstrate', 'perform', 'apply', 'use', 'conduct', 'implement',
      'operate', 'create', 'maintain', 'analyze', 'develop', 'practice'
    ];
    
    // Attitude indicators
    const attitudeIndicators = [
      'appreciate', 'aware', 'consider', 'sensitive', 'value', 'respect',
      'follow', 'comply', 'adhere', 'respond', 'accept', 'adapt'
    ];
    
    // Count matches for each category
    let knowledgeCount = 0;
    let skillCount = 0;
    let attitudeCount = 0;
    
    for (const indicator of knowledgeIndicators) {
      if (lowerText.includes(indicator)) {
        knowledgeCount++;
      }
    }
    
    for (const indicator of skillIndicators) {
      if (lowerText.includes(indicator)) {
        skillCount++;
      }
    }
    
    for (const indicator of attitudeIndicators) {
      if (lowerText.includes(indicator)) {
        attitudeCount++;
      }
    }
    
    // Determine type based on highest count
    if (knowledgeCount > skillCount && knowledgeCount > attitudeCount) {
      return 'knowledge';
    } else if (skillCount > knowledgeCount && skillCount > attitudeCount) {
      return 'skill';
    } else if (attitudeCount > knowledgeCount && attitudeCount > skillCount) {
      return 'attitude';
    } else {
      return 'unknown';
    }
  }

  /**
   * Enhance objectives with NLP analysis
   */
  private async enhanceObjectivesWithNLP(objectives: LearningObjective[]): Promise<void> {
    if (!this.options.enableNLP || !this.tagger) return;
    
    for (const objective of objectives) {
      // Analyze the objective text to identify Bloom's taxonomy level
      objective.blooms = this.identifyBloomsLevel(objective.text);
      
      // Improve keywords using POS tagging
      if (this.tagger) {
        const tokens = this.tokenizer.tokenize(objective.text) || [];
        const taggedTokens = this.tagger.tag(tokens).taggedWords;
        
        // Extract nouns and verbs as more meaningful keywords
        const enhancedKeywords = taggedTokens
          .filter(token => 
            token.tag.startsWith('N') || // Nouns
            token.tag.startsWith('V') || // Verbs
            token.tag.startsWith('J')    // Adjectives
          )
          .map(token => this.stemmer(token.token.toLowerCase()))
          .filter((token, index, self) => self.indexOf(token) === index); // Remove duplicates
        
        // Update keywords if we found better ones
        if (enhancedKeywords.length > 0) {
          objective.keywords = enhancedKeywords;
        }
      }
    }
  }

  /**
   * Identify Bloom's taxonomy level from text
   */
  private identifyBloomsLevel(text: string): BloomLevel {
    const lowerText = text.toLowerCase();
    
    // Counts for each Bloom's level
    const levelCounts: Record<BloomLevel, number> = {
      [BloomLevel.REMEMBER]: 0,
      [BloomLevel.UNDERSTAND]: 0,
      [BloomLevel.APPLY]: 0,
      [BloomLevel.ANALYZE]: 0,
      [BloomLevel.EVALUATE]: 0,
      [BloomLevel.CREATE]: 0
    };
    
    // Check for keywords from each level
    Object.entries(this.bloomKeywords).forEach(([level, keywords]) => {
      keywords.forEach(keyword => {
        if (lowerText.includes(keyword)) {
          levelCounts[level as BloomLevel]++;
        }
      });
    });
    
    // Find the level with the highest count
    let maxCount = 0;
    let maxLevel: BloomLevel = BloomLevel.REMEMBER; // Default to lowest level
    
    Object.entries(levelCounts).forEach(([level, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxLevel = level as BloomLevel;
      }
    });
    
    return maxLevel;
  }

  /**
   * Count total sections including subsections
   */
  private countSections(sections: SyllabusSection[]): number {
    let count = sections.length;
    
    for (const section of sections) {
      count += this.countSections(section.subsections);
    }
    
    return count;
  }

  /**
   * Check if abort has been requested
   */
  private checkAbort(): void {
    if (this.options.abortSignal?.aborted) {
      throw new Error('Processing aborted by user');
    }
  }

  /**
   * Emit progress event
   */
  private emitProgress(
    type: ProgressEvent['type'],
    stage: ProgressEvent['stage'],
    progress: number,
    message: string,
    error?: Error
  ): void {
    this.emit('progress', {
      type,
      stage,
      progress,
      message,
      error
    });
  }
}

// Example usage:
/*
// Create a document processor
const processor = new DocumentProcessor({
  enableNLP: true,
  debug: true
});

// Listen for progress events
processor.on('progress', (event: ProgressEvent) => {
  console.log(`[${event.stage}] ${event.type}: ${event.progress}% - ${event.message}`);
  
  if (event.type === 'error') {
    console.error('Error:', event.error);
  }
});

// Process a PDF file
(async () => {
  try {
    // Get PDF file (example using browser File API)
    const fileInput = document.getElementById('pdf-input') as HTMLInputElement;
    const file = fileInput.files?.[0];
    
    if (!file) {
      throw new Error('No file selected');
    }
    
    // Process the file
    const result = await processor.processSyllabus(file);
    
    console.log('Syllabus Structure:', result.structure);
    console.log('Learning Objectives:', result.objectives);
    
    // Generate document map
    const docMap = processor.generateDocumentMap(result.structure);
    console.log('Document Map:');
    console.log(docMap);
    
  } catch (error) {
    console.error('Failed to process syllabus:', error);
  }
})();
*/
