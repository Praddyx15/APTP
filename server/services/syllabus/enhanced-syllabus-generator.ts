/**
 * Enhanced Syllabus Generator Service
 * 
 * An improved version of the syllabus generator that leverages AI
 * to extract and organize training content from documents.
 */

import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../../utils/logger';
import { db } from '../../db';
import { eq } from 'drizzle-orm';
import { documents, documentContent } from '@shared/schema';
import { DocumentType, ProcessingStatus } from '@shared/document-types';
import { DocumentAnalysisService } from '../document-analysis-service';
import { 
  SyllabusGenerationOptions, 
  SyllabusGenerationProgress,
  GeneratedSyllabus,
  SyllabusTemplate,
  ExtractedModule,
  ExtractedLesson,
  ExtractedCompetency,
  RegulatoryReference
} from '@shared/syllabus-types';

// Generation job tracking
interface SyllabusGenerationJob {
  id: string;
  documentId: string;
  userId: string;
  options: SyllabusGenerationOptions;
  progress: SyllabusGenerationProgress;
  syllabus: GeneratedSyllabus | null;
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
}

// Job storage (in-memory for now, would use database in production)
const jobStore = new Map<string, SyllabusGenerationJob>();

export class EnhancedSyllabusGenerator {
  private logger: Logger;
  private documentAnalysisService: DocumentAnalysisService;
  
  constructor() {
    this.logger = new Logger('EnhancedSyllabusGenerator');
    this.documentAnalysisService = new DocumentAnalysisService();
  }
  
  /**
   * Start a syllabus generation job based on a document
   * @param documentId - Document ID
   * @param options - Generation options
   * @param userId - User ID
   * @returns Job ID and initial progress
   */
  public async startSyllabusGeneration(
    documentId: string,
    options: SyllabusGenerationOptions,
    userId: string
  ): Promise<{ jobId: string, progress: SyllabusGenerationProgress }> {
    try {
      // Check if document exists
      const [document] = await db.select()
        .from(documents)
        .where(eq(documents.id, documentId));
        
      if (!document) {
        throw new Error(`Document with ID ${documentId} not found`);
      }
      
      // Create generation job
      const jobId = uuidv4();
      const progress: SyllabusGenerationProgress = {
        documentId: parseInt(documentId),
        status: 'queued',
        progress: 0,
        message: 'Syllabus generation queued',
        estimatedTimeRemaining: 60,
      };
      
      const job: SyllabusGenerationJob = {
        id: jobId,
        documentId,
        userId,
        options,
        progress,
        syllabus: null,
        startedAt: new Date(),
        completedAt: null,
        error: null
      };
      
      // Store job
      jobStore.set(jobId, job);
      
      // Start generation in background
      this.generateSyllabusInBackground(jobId).catch(error => {
        this.logger.error(`Error in background syllabus generation: ${error}`);
        
        // Update job with error
        const failedJob = jobStore.get(jobId);
        if (failedJob) {
          failedJob.error = error.message;
          failedJob.progress.status = 'failed';
          failedJob.progress.message = `Failed: ${error.message}`;
          failedJob.completedAt = new Date();
          jobStore.set(jobId, failedJob);
        }
      });
      
      return { jobId, progress };
    } catch (error) {
      this.logger.error(`Failed to start syllabus generation: ${error}`);
      throw error;
    }
  }
  
  /**
   * Generate syllabus in background
   * @param jobId - Job ID
   */
  private async generateSyllabusInBackground(jobId: string): Promise<void> {
    // Get job
    const job = jobStore.get(jobId);
    if (!job) {
      throw new Error(`Syllabus generation job ${jobId} not found`);
    }
    
    try {
      // Update progress to processing
      this.updateProgress(jobId, 'processing', 5, 'Preparing to extract document content');
      
      // Get document content
      const [content] = await db.select()
        .from(documentContent)
        .where(eq(documentContent.documentId, parseInt(job.documentId)));
        
      if (!content || !content.textContent) {
        throw new Error(`No text content found for document ${job.documentId}`);
      }
      
      // Extract document structure
      this.updateProgress(jobId, 'extracting_structure', 15, 'Extracting document structure');
      
      // Example sections (in production would be extracted from content)
      const sections = content.sections || [];
      
      // Extract training modules
      this.updateProgress(jobId, 'identifying_modules', 30, 'Identifying training modules');
      
      // Generate modules from content (simplified for demo)
      const modules = this.extractModulesFromContent(content.textContent);
      
      // Create lessons
      this.updateProgress(jobId, 'creating_lessons', 50, 'Creating lessons from content');
      
      // Generate lessons (simplified for demo)
      const lessons = this.extractLessonsFromContent(content.textContent, modules);
      
      // Map to regulatory requirements
      this.updateProgress(jobId, 'mapping_compliance', 70, 'Mapping to regulatory requirements');
      
      // Generate compliance mapping (simplified for demo)
      const regulatoryCompliance = this.generateComplianceMapping(job.options);
      
      // Finalize syllabus
      this.updateProgress(jobId, 'completed', 100, 'Syllabus generation completed');
      
      // Create syllabus
      const syllabus: GeneratedSyllabus = {
        name: job.options.title || 'Generated Syllabus',
        description: job.options.description || 'Automatically generated syllabus',
        programType: job.options.courseLength || 'standard',
        totalDuration: this.calculateTotalDuration(modules),
        modules,
        lessons,
        regulatoryCompliance,
        confidenceScore: 85,
        version: '1.0.0',
        createdFrom: {
          documentId: parseInt(job.documentId)
        },
        createdAt: new Date()
      };
      
      // Update job with completed syllabus
      job.syllabus = syllabus;
      job.completedAt = new Date();
      job.progress.status = 'completed';
      job.progress.progress = 100;
      job.progress.message = 'Syllabus generation completed successfully';
      job.progress.syllabusId = parseInt(job.documentId); // Placeholder
      jobStore.set(jobId, job);
      
    } catch (error) {
      this.logger.error(`Error generating syllabus: ${error}`);
      
      // Update job with error
      job.error = error.message;
      job.progress.status = 'failed';
      job.progress.message = `Failed: ${error.message}`;
      job.completedAt = new Date();
      jobStore.set(jobId, job);
      
      throw error;
    }
  }
  
  /**
   * Get generation progress
   * @param jobId - Job ID
   * @returns Current progress information
   */
  public getGenerationProgress(jobId: string): SyllabusGenerationProgress {
    const job = jobStore.get(jobId);
    if (!job) {
      throw new Error(`Syllabus generation job ${jobId} not found`);
    }
    
    return job.progress;
  }
  
  /**
   * Get generated syllabus
   * @param jobId - Job ID
   * @returns Generated syllabus
   */
  public getGeneratedSyllabus(jobId: string): GeneratedSyllabus {
    const job = jobStore.get(jobId);
    if (!job) {
      throw new Error(`Syllabus generation job ${jobId} not found`);
    }
    
    if (!job.syllabus) {
      throw new Error(`Syllabus not yet generated for job ${jobId}`);
    }
    
    return job.syllabus;
  }
  
  /**
   * Update job progress
   * @param jobId - Job ID
   * @param status - Status
   * @param progress - Progress percentage
   * @param message - Status message
   */
  private updateProgress(
    jobId: string,
    status: string,
    progress: number,
    message: string
  ): void {
    const job = jobStore.get(jobId);
    if (job) {
      job.progress.status = status as any;
      job.progress.progress = progress;
      job.progress.message = message;
      job.progress.estimatedTimeRemaining = Math.max(0, 60 - Math.floor(progress / 2));
      
      jobStore.set(jobId, job);
    }
  }
  
  /**
   * Extract modules from content
   * @param content - Document text content
   * @returns Extracted modules
   */
  private extractModulesFromContent(content: string): ExtractedModule[] {
    // In a real implementation, this would use NLP to identify modules
    // Simplified version for demonstration
    
    // Look for module-like sections in the content
    const moduleRegex = /(?:module|section|unit|phase)\s*(\d+|[ivxlcdm]+)?\s*[:\-–—]?\s*([^\.]+)/gi;
    const matches = [...content.matchAll(moduleRegex)];
    
    // Create modules with found sections
    const modules: ExtractedModule[] = [];
    
    for (let i = 0; i < Math.min(matches.length, 5); i++) {
      const moduleNumber = matches[i][1] || `${i + 1}`;
      const moduleName = matches[i][2].trim();
      
      modules.push({
        name: `Module ${moduleNumber}: ${moduleName}`,
        description: `Module extracted from document content.`,
        type: this.determineModuleType(moduleName),
        competencies: this.generateCompetencies(moduleName, 2),
        recommendedDuration: Math.floor(Math.random() * 20) + 4,
        regulatoryRequirements: []
      });
    }
    
    // Ensure we have at least 3 modules
    if (modules.length < 3) {
      const moduleTypes = ['ground', 'simulator', 'aircraft'];
      
      for (let i = modules.length; i < 3; i++) {
        modules.push({
          name: `Module ${i + 1}: ${moduleTypes[i % 3]} Training`,
          description: 'Automatically generated module',
          type: moduleTypes[i % 3],
          competencies: this.generateCompetencies(`${moduleTypes[i % 3]} Training`, 2),
          recommendedDuration: Math.floor(Math.random() * 20) + 4,
          regulatoryRequirements: []
        });
      }
    }
    
    return modules;
  }
  
  /**
   * Determine module type from name
   * @param moduleName - Module name
   * @returns Module type
   */
  private determineModuleType(moduleName: string): string {
    const name = moduleName.toLowerCase();
    
    if (name.includes('ground') || name.includes('theory') || name.includes('classroom')) {
      return 'ground';
    } else if (name.includes('simulator') || name.includes('sim') || name.includes('device')) {
      return 'simulator';
    } else if (name.includes('aircraft') || name.includes('flight') || name.includes('practical')) {
      return 'aircraft';
    }
    
    // Default
    return 'ground';
  }
  
  /**
   * Extract lessons from content
   * @param content - Document text content
   * @param modules - Extracted modules
   * @returns Extracted lessons
   */
  private extractLessonsFromContent(content: string, modules: ExtractedModule[]): ExtractedLesson[] {
    // In a real implementation, this would use NLP to identify lessons
    // Simplified version for demonstration
    
    const lessons: ExtractedLesson[] = [];
    
    for (let i = 0; i < modules.length; i++) {
      const module = modules[i];
      
      // Create 2-4 lessons per module
      const lessonCount = Math.floor(Math.random() * 3) + 2;
      
      for (let j = 0; j < lessonCount; j++) {
        lessons.push({
          name: `Lesson ${j + 1}: ${this.generateLessonName(module.type, j)}`,
          description: `Lesson for ${module.name}`,
          content: this.generateLessonContent(module.type, j),
          type: this.determineLessonType(module.type),
          moduleIndex: i,
          duration: Math.floor(Math.random() * 60) + 30,
          learningObjectives: this.generateLearningObjectives(module.type, 3)
        });
      }
    }
    
    return lessons;
  }
  
  /**
   * Determine lesson type based on module type
   * @param moduleType - Module type
   * @returns Lesson type
   */
  private determineLessonType(moduleType: string): string {
    switch (moduleType) {
      case 'ground':
        return Math.random() > 0.5 ? 'video' : 'document';
      case 'simulator':
        return Math.random() > 0.5 ? 'interactive' : 'video';
      case 'aircraft':
        return 'interactive';
      default:
        return 'document';
    }
  }
  
  /**
   * Generate lesson name
   * @param moduleType - Module type
   * @param index - Lesson index
   * @returns Lesson name
   */
  private generateLessonName(moduleType: string, index: number): string {
    const groundLessons = [
      'Aviation Fundamentals',
      'Aircraft Systems',
      'Navigation Principles',
      'Meteorology',
      'Regulations and Procedures'
    ];
    
    const simulatorLessons = [
      'Normal Procedures',
      'Emergency Procedures',
      'Instrument Navigation',
      'Abnormal Situations',
      'Crew Resource Management'
    ];
    
    const aircraftLessons = [
      'Pre-flight Preparation',
      'Basic Maneuvers',
      'Takeoffs and Landings',
      'Navigation and Planning',
      'Advanced Maneuvers'
    ];
    
    switch (moduleType) {
      case 'ground':
        return groundLessons[index % groundLessons.length];
      case 'simulator':
        return simulatorLessons[index % simulatorLessons.length];
      case 'aircraft':
        return aircraftLessons[index % aircraftLessons.length];
      default:
        return 'General Knowledge';
    }
  }
  
  /**
   * Generate lesson content
   * @param moduleType - Module type
   * @param index - Lesson index
   * @returns Lesson content
   */
  private generateLessonContent(moduleType: string, index: number): string {
    return `This lesson covers the essential aspects of ${this.generateLessonName(moduleType, index)} for pilot training. The content includes theory, practical examples, and assessment activities.`;
  }
  
  /**
   * Generate learning objectives
   * @param moduleType - Module type
   * @param count - Number of objectives
   * @returns Learning objectives
   */
  private generateLearningObjectives(moduleType: string, count: number): string[] {
    const groundObjectives = [
      'Understand the principles of flight',
      'Explain aircraft systems and their functions',
      'Describe meteorological concepts',
      'Identify regulatory requirements',
      'Apply navigation principles'
    ];
    
    const simulatorObjectives = [
      'Perform standard operating procedures',
      'Demonstrate emergency procedures',
      'Navigate using instruments',
      'Apply crew resource management',
      'Handle abnormal situations'
    ];
    
    const aircraftObjectives = [
      'Conduct a pre-flight inspection',
      'Execute takeoffs and landings',
      'Navigate using visual references',
      'Perform standard maneuvers',
      'Apply emergency procedures'
    ];
    
    let objectives: string[];
    
    switch (moduleType) {
      case 'ground':
        objectives = groundObjectives;
        break;
      case 'simulator':
        objectives = simulatorObjectives;
        break;
      case 'aircraft':
        objectives = aircraftObjectives;
        break;
      default:
        objectives = groundObjectives;
    }
    
    // Randomize and take count
    return this.shuffleArray([...objectives]).slice(0, count);
  }
  
  /**
   * Generate competencies
   * @param moduleName - Module name
   * @param count - Number of competencies
   * @returns Competencies
   */
  private generateCompetencies(moduleName: string, count: number): ExtractedCompetency[] {
    const allCompetencies: ExtractedCompetency[] = [
      {
        name: 'Knowledge of aircraft systems',
        description: 'Understanding of the various systems that comprise the aircraft',
        assessmentCriteria: ['Describe system components', 'Explain system operation', 'Identify failure modes']
      },
      {
        name: 'Flight planning and navigation',
        description: 'Ability to plan flights and navigate safely',
        assessmentCriteria: ['Create flight plans', 'Calculate fuel requirements', 'Interpret charts']
      },
      {
        name: 'Aircraft handling',
        description: 'Manual control of the aircraft through various maneuvers',
        assessmentCriteria: ['Maintain stable flight', 'Perform standard maneuvers', 'Respond to abnormal situations']
      },
      {
        name: 'Communication',
        description: 'Effective communication with ATC and crew members',
        assessmentCriteria: ['Use standard phraseology', 'Provide clear information', 'Confirm understanding']
      },
      {
        name: 'Decision making',
        description: 'Making appropriate decisions in normal and abnormal situations',
        assessmentCriteria: ['Assess situations', 'Consider alternatives', 'Select appropriate actions']
      }
    ];
    
    // Return random selection based on count
    return this.shuffleArray([...allCompetencies]).slice(0, count);
  }
  
  /**
   * Generate compliance mapping
   * @param options - Generation options
   * @returns Regulatory compliance information
   */
  private generateComplianceMapping(options: SyllabusGenerationOptions): any {
    const authority = options.regulatoryAuthority || 'easa';
    
    const requirementsMet: RegulatoryReference[] = [
      {
        code: 'FCL.010',
        authority: 'EASA',
        version: '2020/358',
        description: 'Definitions and abbreviations',
        url: 'https://www.easa.europa.eu/regulations'
      },
      {
        code: 'FCL.700',
        authority: 'EASA',
        version: '2020/358',
        description: 'Circumstances in which type ratings are required',
        url: 'https://www.easa.europa.eu/regulations'
      }
    ];
    
    const requirementsPartiallyMet: RegulatoryReference[] = [
      {
        code: 'FCL.725',
        authority: 'EASA',
        version: '2020/358',
        description: 'Requirements for the issue of type ratings',
        url: 'https://www.easa.europa.eu/regulations'
      }
    ];
    
    const requirementsNotMet: RegulatoryReference[] = [];
    
    return {
      authority: authority.toUpperCase(),
      requirementsMet,
      requirementsPartiallyMet,
      requirementsNotMet
    };
  }
  
  /**
   * Calculate total duration based on modules
   * @param modules - Training modules
   * @returns Total duration in days
   */
  private calculateTotalDuration(modules: ExtractedModule[]): number {
    // Sum the recommended durations and convert to days
    const totalHours = modules.reduce((total, module) => total + module.recommendedDuration, 0);
    
    // Assuming 6 hours per day of training
    return Math.ceil(totalHours / 6);
  }
  
  /**
   * Shuffle array randomly
   * @param array - Input array
   * @returns Shuffled array
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Export singleton instance
export const enhancedSyllabusGenerator = new EnhancedSyllabusGenerator();
