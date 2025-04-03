/**
 * Syllabus Generator Service
 * Creates aviation training syllabuses based on requirements and regulatory standards
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { 
  TrainingSyllabus, 
  SyllabusGenerationOptions,
  SyllabusModule
} from '../../shared/syllabus-types';
import { TrainingObjective } from '../../shared/session-plan-types';
import { documentService } from './document-service';

export class SyllabusService {
  private logger;
  private syllabuses: Map<string, TrainingSyllabus>;

  constructor() {
    this.logger = logger.child('SyllabusService');
    this.syllabuses = new Map<string, TrainingSyllabus>();
    
    this.logger.info('Syllabus Service initialized');
  }

  /**
   * Get a syllabus by ID
   * @param id - Syllabus ID
   * @returns Promise<TrainingSyllabus | undefined> - Syllabus or undefined if not found
   */
  async getSyllabus(id: string): Promise<TrainingSyllabus | undefined> {
    try {
      return this.syllabuses.get(id);
    } catch (error) {
      this.logger.error(`Error getting syllabus: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get all syllabuses with optional filtering
   * @param options - Filter options
   * @returns Promise<TrainingSyllabus[]> - Array of syllabuses
   */
  async getAllSyllabuses(options?: {
    createdBy?: number;
    certificateType?: string;
    ratingType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<TrainingSyllabus[]> {
    try {
      // Get all syllabuses
      let syllabuses = Array.from(this.syllabuses.values());
      
      // Apply filters
      if (options?.createdBy) {
        syllabuses = syllabuses.filter(syllabus => syllabus.created_by === options.createdBy);
      }
      
      if (options?.certificateType) {
        syllabuses = syllabuses.filter(syllabus => syllabus.certificate_type === options.certificateType);
      }
      
      if (options?.ratingType) {
        syllabuses = syllabuses.filter(syllabus => syllabus.rating_type === options.ratingType);
      }
      
      if (options?.status) {
        syllabuses = syllabuses.filter(syllabus => syllabus.status === options.status);
      }
      
      // Apply pagination
      if (options?.limit || options?.offset) {
        const offset = options?.offset || 0;
        const limit = options?.limit || syllabuses.length;
        syllabuses = syllabuses.slice(offset, offset + limit);
      }
      
      return syllabuses;
    } catch (error) {
      this.logger.error(`Error getting all syllabuses: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Generate a new syllabus based on options
   * @param options - Syllabus generation options
   * @param userId - ID of the user generating the syllabus
   * @returns Promise<TrainingSyllabus> - Generated syllabus
   */
  async generateSyllabus(options: SyllabusGenerationOptions, userId: number): Promise<TrainingSyllabus> {
    try {
      this.logger.info(`Generating syllabus: ${options.title}`);
      
      const now = new Date().toISOString();
      const id = uuidv4();
      
      // Collect document content for reference if specified
      let documentContents: string[] = [];
      if (options.useDocuments && options.useDocuments.length > 0) {
        for (const docId of options.useDocuments) {
          try {
            const docContent = await documentService.getDocumentContent(docId);
            if (docContent && docContent.extractedText) {
              documentContents.push(docContent.extractedText);
            }
          } catch (error) {
            this.logger.warn(`Could not fetch content for document ${docId}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
      
      // Generate modules
      const moduleCount = options.moduleCount || 5;
      const modules = this.generateModules(options, moduleCount, documentContents);
      
      // Create the syllabus
      const syllabus: TrainingSyllabus = {
        id,
        title: options.title,
        description: options.description || `Training syllabus for ${options.title}`,
        version: '1.0',
        status: 'draft',
        effective_date: now,
        created_by: userId,
        created_at: now,
        updated_at: now,
        certificate_type: options.certificateType,
        rating_type: options.ratingType,
        regulatory_basis: options.regulatoryBasis,
        target_audience: options.targetAudience,
        prerequisites: options.prerequisites,
        modules,
        notes: `This syllabus was automatically generated based on requested parameters. Review and customize as needed.`
      };
      
      // Add references if documents were used
      if (options.useDocuments && options.useDocuments.length > 0) {
        syllabus.references = [];
        
        for (const docId of options.useDocuments) {
          try {
            const doc = await documentService.getDocument(docId);
            if (doc) {
              syllabus.references.push({
                id: uuidv4(),
                title: doc.title,
                type: doc.category || 'document',
                source: doc.metadata?.author || 'Unknown'
              });
            }
          } catch (error) {
            this.logger.warn(`Could not fetch document ${docId}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
      
      // Store the syllabus
      this.syllabuses.set(id, syllabus);
      
      this.logger.info(`Syllabus generated: ${id}`);
      
      return syllabus;
    } catch (error) {
      this.logger.error(`Error generating syllabus: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Generate syllabus modules based on options
   * @param options - Syllabus generation options
   * @param moduleCount - Number of modules to generate
   * @param documentContents - Optional document contents for reference
   * @returns SyllabusModule[] - Array of syllabus modules
   */
  private generateModules(
    options: SyllabusGenerationOptions, 
    moduleCount: number,
    documentContents: string[]
  ): SyllabusModule[] {
    const modules: SyllabusModule[] = [];
    
    // Define module templates based on certificate type
    const moduleTemplates = this.getModuleTemplates(options);
    
    // Calculate total duration
    const totalDuration = options.duration || 120; // Default to 120 hours
    const durationPerModule = Math.round(totalDuration / moduleCount);
    
    // Generate each module
    for (let i = 0; i < moduleCount; i++) {
      // Use template if available, otherwise create generic module
      const template = i < moduleTemplates.length ? moduleTemplates[i] : {
        title: `Module ${i + 1}`,
        description: `Generic training module ${i + 1}`
      };
      
      // Generate objectives for this module
      const objectives = this.generateObjectives(template.title, template.description, documentContents);
      
      modules.push({
        id: uuidv4(),
        title: template.title,
        description: template.description,
        order: i + 1,
        duration: durationPerModule,
        objectives,
        assessments: this.generateAssessments(template.title, objectives)
      });
    }
    
    return modules;
  }

  /**
   * Get module templates based on certificate type
   * @param options - Syllabus generation options
   * @returns Array of module templates with title and description
   */
  private getModuleTemplates(options: SyllabusGenerationOptions): Array<{title: string, description: string}> {
    // Default templates
    const defaultTemplates = [
      { 
        title: 'Introduction and Ground Theory', 
        description: 'Fundamental aviation concepts and theoretical knowledge'
      },
      { 
        title: 'Basic Operations and Procedures', 
        description: 'Core operational procedures and basic maneuvers'
      },
      { 
        title: 'Advanced Techniques', 
        description: 'Complex maneuvers and operational scenarios'
      },
      { 
        title: 'Emergency Procedures', 
        description: 'Emergency management and abnormal situations'
      },
      { 
        title: 'Performance Evaluation and Mastery', 
        description: 'Comprehensive skill evaluation and performance mastery'
      }
    ];
    
    // Specialized templates based on certificate type
    if (options.certificateType === 'PPL') {
      return [
        { 
          title: 'Aviation Fundamentals', 
          description: 'Introduction to aviation principles, regulations, and aerodynamics'
        },
        { 
          title: 'Aircraft Systems and Procedures', 
          description: 'Aircraft systems, pre-flight procedures, and basic operations'
        },
        { 
          title: 'Basic Flight Maneuvers', 
          description: 'Fundamental flight maneuvers, patterns, and basic navigation'
        },
        { 
          title: 'Cross-Country Operations', 
          description: 'Navigation, flight planning, and cross-country procedures'
        },
        { 
          title: 'Emergency Operations and Advanced Maneuvers', 
          description: 'Emergency procedures, advanced maneuvers, and night operations'
        },
        { 
          title: 'Performance Standards and Checkride Preparation', 
          description: 'Final skill refinement and preparation for checkride'
        }
      ];
    } else if (options.certificateType === 'CPL') {
      return [
        { 
          title: 'Advanced Aerodynamics and Aircraft Systems', 
          description: 'Complex aerodynamics principles and advanced aircraft systems'
        },
        { 
          title: 'Professional Flight Operations', 
          description: 'Professional standards, commercial procedures, and regulations'
        },
        { 
          title: 'Complex Aircraft Operations', 
          description: 'Operations in complex and high-performance aircraft'
        },
        { 
          title: 'Advanced Navigation and Flight Planning', 
          description: 'Advanced navigation techniques and commercial flight planning'
        },
        { 
          title: 'Commercial Maneuvers and Procedures', 
          description: 'Commercial flight maneuvers and operational procedures'
        },
        { 
          title: 'Emergency Management and Abnormal Situations', 
          description: 'Advanced emergency procedures and complex scenario management'
        },
        { 
          title: 'Commercial Pilot Standards and Evaluation', 
          description: 'Final preparation for commercial pilot certification'
        }
      ];
    } else if (options.certificateType === 'ATP') {
      return [
        { 
          title: 'Advanced Transport Category Aircraft Systems', 
          description: 'Complex transport category aircraft systems and automation'
        },
        { 
          title: 'High-Altitude Operations', 
          description: 'High-altitude aerodynamics, pressurization, and jet operations'
        },
        { 
          title: 'Advanced Navigation and International Procedures', 
          description: 'Advanced navigation systems and international flight operations'
        },
        { 
          title: 'Airline Operations and Procedures', 
          description: 'Standard operating procedures and airline operations'
        },
        { 
          title: 'Crew Resource Management', 
          description: 'Multi-crew operations, CRM principles, and flight deck management'
        },
        { 
          title: 'Advanced Weather and Environmental Hazards', 
          description: 'Weather radar interpretation, windshear, and environmental hazards'
        },
        { 
          title: 'Transport Category Emergency Procedures', 
          description: 'Complex emergency management in transport category aircraft'
        },
        { 
          title: 'ATP Standards and Evaluation', 
          description: 'Final preparation for ATP certification'
        }
      ];
    }
    
    // Add simulator and aircraft modules if specified
    const templates = [...defaultTemplates];
    
    if (options.includeSimulator) {
      templates.push({ 
        title: 'Simulator Training', 
        description: 'Procedural training and scenario-based exercises in simulator'
      });
    }
    
    if (options.includeAircraft) {
      templates.push({ 
        title: 'Aircraft Training', 
        description: 'Practical application of skills in actual aircraft'
      });
    }
    
    return templates;
  }

  /**
   * Generate training objectives for a module
   * @param moduleTitle - Title of the module
   * @param moduleDescription - Description of the module
   * @param documentContents - Optional document contents for reference
   * @returns TrainingObjective[] - Array of training objectives
   */
  private generateObjectives(
    moduleTitle: string, 
    moduleDescription: string,
    documentContents: string[]
  ): TrainingObjective[] {
    const objectives: TrainingObjective[] = [];
    
    // Add knowledge objectives
    objectives.push({
      id: uuidv4(),
      description: `Demonstrate thorough understanding of ${moduleTitle} principles and concepts`,
      category: 'knowledge',
      level: 'intermediate',
      references: []
    });
    
    objectives.push({
      id: uuidv4(),
      description: `Explain the regulatory requirements related to ${moduleTitle}`,
      category: 'knowledge',
      level: 'intermediate',
      references: []
    });
    
    // Add skill objectives
    objectives.push({
      id: uuidv4(),
      description: `Demonstrate proficiency in all ${moduleTitle} procedures and techniques`,
      category: 'skill',
      level: 'intermediate',
      references: []
    });
    
    objectives.push({
      id: uuidv4(),
      description: `Perform ${moduleTitle} maneuvers within standards consistently`,
      category: 'skill',
      level: 'intermediate',
      references: []
    });
    
    // Add attitude objectives
    objectives.push({
      id: uuidv4(),
      description: `Demonstrate sound decision-making and risk management in ${moduleTitle}`,
      category: 'attitude',
      level: 'intermediate',
      references: []
    });
    
    // Use document content to enhance objectives if available
    if (documentContents.length > 0) {
      // This is a simplified approach - in a real implementation, 
      // you would use NLP or similar techniques to extract meaningful objectives
      
      // Just add a reference objective mentioning document content
      objectives.push({
        id: uuidv4(),
        description: `Apply knowledge from reference materials to ${moduleTitle} scenarios`,
        category: 'knowledge',
        level: 'advanced',
        references: []
      });
    }
    
    return objectives;
  }

  /**
   * Generate assessments for a module
   * @param moduleTitle - Title of the module
   * @param objectives - Training objectives for the module
   * @returns Array of assessments
   */
  private generateAssessments(
    moduleTitle: string,
    objectives: TrainingObjective[]
  ): {id: string, title: string, type: 'knowledge' | 'performance' | 'combined', passingCriteria: string}[] {
    return [
      {
        id: uuidv4(),
        title: `${moduleTitle} Knowledge Assessment`,
        type: 'knowledge',
        passingCriteria: 'Minimum score of 80% required'
      },
      {
        id: uuidv4(),
        title: `${moduleTitle} Performance Assessment`,
        type: 'performance',
        passingCriteria: 'All tasks must be completed to standards with no critical errors'
      }
    ];
  }

  /**
   * Update an existing syllabus
   * @param id - Syllabus ID
   * @param updates - Updated syllabus data
   * @returns Promise<TrainingSyllabus | undefined> - Updated syllabus or undefined if not found
   */
  async updateSyllabus(id: string, updates: Partial<TrainingSyllabus>): Promise<TrainingSyllabus | undefined> {
    try {
      const syllabus = this.syllabuses.get(id);
      
      if (!syllabus) {
        return undefined;
      }
      
      // Create updated syllabus
      const updatedSyllabus = {
        ...syllabus,
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      // Update version if major changes
      if (updates.modules || updates.requirements) {
        const versionParts = updatedSyllabus.version.split('.');
        const major = parseInt(versionParts[0]);
        const minor = parseInt(versionParts[1]);
        
        if (updates.modules) {
          // Major version change if modules structure changes
          updatedSyllabus.version = `${major + 1}.0`;
        } else {
          // Minor version change for other updates
          updatedSyllabus.version = `${major}.${minor + 1}`;
        }
      }
      
      // Save updated syllabus
      this.syllabuses.set(id, updatedSyllabus);
      
      return updatedSyllabus;
    } catch (error) {
      this.logger.error(`Error updating syllabus: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete a syllabus
   * @param id - Syllabus ID
   * @returns Promise<boolean> - True if deletion succeeded
   */
  async deleteSyllabus(id: string): Promise<boolean> {
    try {
      const exists = this.syllabuses.has(id);
      
      if (!exists) {
        return false;
      }
      
      // Delete the syllabus
      this.syllabuses.delete(id);
      
      return true;
    } catch (error) {
      this.logger.error(`Error deleting syllabus: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

// Create and export service instance
export const syllabusService = new SyllabusService();