/**
 * Syllabus Generator
 * Generates structured training syllabuses for aviation training programs
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { TrainingObjective } from './session-plan-generator';

// Syllabus types
export interface SyllabusModule {
  id: string;
  title: string;
  description: string;
  order: number;
  duration: number; // in hours
  objectives: TrainingObjective[];
  submodules?: SyllabusModule[];
  prerequisites?: string[];
  assessments?: {
    id: string;
    title: string;
    type: 'knowledge' | 'performance' | 'combined';
    passingCriteria: string;
  }[];
}

export interface SyllabusRequirement {
  id: string;
  description: string;
  reference: string;
  category: string;
}

export interface Syllabus {
  id: string;
  title: string;
  description: string;
  version: string;
  status: 'draft' | 'review' | 'approved' | 'active' | 'archived';
  type: 'initial' | 'recurrent' | 'conversion' | 'upgrade' | 'specialized';
  totalDuration: number; // in hours
  targetAudience: string[];
  requirements: SyllabusRequirement[];
  modules: SyllabusModule[];
  metadata: {
    createdBy: number;
    createdAt: string;
    lastModifiedBy?: number;
    lastModifiedAt?: string;
    approvedBy?: number;
    approvedAt?: string;
    organization?: string;
    regulatoryFramework?: string;
    aircraftType?: string;
    validUntil?: string;
    [key: string]: any;
  };
}

export class SyllabusGenerator {
  private logger;

  constructor() {
    this.logger = logger.child('SyllabusGenerator');
  }

  /**
   * Generate a complete training syllabus based on provided parameters
   * @param params - Syllabus generation parameters
   * @returns Promise<Syllabus> - Generated syllabus
   */
  public async generateSyllabus(params: {
    title: string;
    description: string;
    type: 'initial' | 'recurrent' | 'conversion' | 'upgrade' | 'specialized';
    regulatoryFramework: string;
    aircraftType?: string;
    targetDuration: number; // in hours
    targetAudience: string[];
    userId: number;
    structureType?: 'modular' | 'progressive' | 'integrated';
    moduleDescriptions?: Array<{
      title: string;
      description: string;
      objectives: string[];
      duration?: number;
    }>;
    requirements?: Array<{
      description: string;
      reference: string;
      category: string;
    }>;
  }): Promise<Syllabus> {
    try {
      this.logger.info(`Generating syllabus: ${params.title}`);
      
      // Generate requirements
      const requirements: SyllabusRequirement[] = params.requirements ?
        params.requirements.map(req => ({
          id: uuidv4(),
          description: req.description,
          reference: req.reference,
          category: req.category
        })) : 
        this.generateDefaultRequirements(params.regulatoryFramework, params.type);
      
      // Generate modules
      const modules = await this.generateModules(
        params.moduleDescriptions || [],
        params.targetDuration,
        params.structureType || 'modular',
        params.type
      );
      
      // Calculate total duration from modules
      const totalDuration = modules.reduce((sum, module) => sum + module.duration, 0);
      
      // Create syllabus
      const syllabus: Syllabus = {
        id: uuidv4(),
        title: params.title,
        description: params.description,
        version: '1.0',
        status: 'draft',
        type: params.type,
        totalDuration,
        targetAudience: params.targetAudience,
        requirements,
        modules,
        metadata: {
          createdBy: params.userId,
          createdAt: new Date().toISOString(),
          organization: 'Aviation Training Organization',
          regulatoryFramework: params.regulatoryFramework,
          aircraftType: params.aircraftType
        }
      };
      
      this.logger.info(`Syllabus generated: ${syllabus.id}`);
      
      return syllabus;
    } catch (error) {
      this.logger.error(`Error generating syllabus: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Generate default regulatory requirements
   * @param regulatoryFramework - Regulatory framework (e.g., 'EASA', 'FAA')
   * @param type - Syllabus type
   * @returns SyllabusRequirement[] - Generated requirements
   */
  private generateDefaultRequirements(
    regulatoryFramework: string,
    type: 'initial' | 'recurrent' | 'conversion' | 'upgrade' | 'specialized'
  ): SyllabusRequirement[] {
    // This is a simplified implementation
    // In a real app, we would have a database of actual regulatory requirements
    
    const requirements: SyllabusRequirement[] = [];
    
    // Common requirements for all syllabus types
    requirements.push({
      id: uuidv4(),
      description: 'Approved training program compliant with regulatory standards',
      reference: `${regulatoryFramework} Training Standards`,
      category: 'program'
    });
    
    requirements.push({
      id: uuidv4(),
      description: 'Qualified instructors with appropriate certifications',
      reference: `${regulatoryFramework} Instructor Requirements`,
      category: 'personnel'
    });
    
    requirements.push({
      id: uuidv4(),
      description: 'Approved training facilities and equipment',
      reference: `${regulatoryFramework} Facility Requirements`,
      category: 'facilities'
    });
    
    // Type-specific requirements
    switch (type) {
      case 'initial':
        requirements.push({
          id: uuidv4(),
          description: 'Comprehensive theoretical knowledge training',
          reference: `${regulatoryFramework} Initial Training Requirements`,
          category: 'training'
        });
        requirements.push({
          id: uuidv4(),
          description: 'Practical skill assessments on all required competencies',
          reference: `${regulatoryFramework} Initial Training Assessment`,
          category: 'assessment'
        });
        break;
        
      case 'recurrent':
        requirements.push({
          id: uuidv4(),
          description: 'Periodic review of critical knowledge areas',
          reference: `${regulatoryFramework} Recurrent Training Requirements`,
          category: 'training'
        });
        requirements.push({
          id: uuidv4(),
          description: 'Proficiency checks at specified intervals',
          reference: `${regulatoryFramework} Recurrent Training Assessment`,
          category: 'assessment'
        });
        break;
        
      case 'conversion':
        requirements.push({
          id: uuidv4(),
          description: 'Training on differences between aircraft types or variants',
          reference: `${regulatoryFramework} Conversion Training Requirements`,
          category: 'training'
        });
        requirements.push({
          id: uuidv4(),
          description: 'Practical assessment on new aircraft type or variant',
          reference: `${regulatoryFramework} Conversion Training Assessment`,
          category: 'assessment'
        });
        break;
        
      case 'upgrade':
        requirements.push({
          id: uuidv4(),
          description: 'Additional training for higher crew position responsibilities',
          reference: `${regulatoryFramework} Upgrade Training Requirements`,
          category: 'training'
        });
        requirements.push({
          id: uuidv4(),
          description: 'Leadership and crew management assessment',
          reference: `${regulatoryFramework} Upgrade Training Assessment`,
          category: 'assessment'
        });
        break;
        
      case 'specialized':
        requirements.push({
          id: uuidv4(),
          description: 'Specialized operational procedures training',
          reference: `${regulatoryFramework} Specialized Training Requirements`,
          category: 'training'
        });
        requirements.push({
          id: uuidv4(),
          description: 'Specialized skill assessments',
          reference: `${regulatoryFramework} Specialized Training Assessment`,
          category: 'assessment'
        });
        break;
    }
    
    return requirements;
  }

  /**
   * Generate syllabus modules
   * @param moduleDescriptions - Module descriptions provided by user
   * @param targetDuration - Target total duration
   * @param structureType - Syllabus structure type
   * @param syllabusType - Syllabus type
   * @returns Promise<SyllabusModule[]> - Generated modules
   */
  private async generateModules(
    moduleDescriptions: Array<{
      title: string;
      description: string;
      objectives: string[];
      duration?: number;
    }>,
    targetDuration: number,
    structureType: 'modular' | 'progressive' | 'integrated',
    syllabusType: 'initial' | 'recurrent' | 'conversion' | 'upgrade' | 'specialized'
  ): Promise<SyllabusModule[]> {
    // If moduleDescriptions are provided, use them to generate modules
    if (moduleDescriptions.length > 0) {
      return moduleDescriptions.map((desc, index) => {
        // Calculate duration if not provided
        const duration = desc.duration || Math.round(targetDuration / moduleDescriptions.length);
        
        // Generate objectives
        const objectives = desc.objectives.map(objDesc => ({
          id: uuidv4(),
          description: objDesc,
          category: this.categorizeObjective(objDesc),
          level: this.determineObjectiveLevel(objDesc),
          references: []
        }));
        
        // Create module
        return {
          id: uuidv4(),
          title: desc.title,
          description: desc.description,
          order: index + 1,
          duration,
          objectives,
          assessments: [
            {
              id: uuidv4(),
              title: `${desc.title} Assessment`,
              type: 'combined',
              passingCriteria: 'Minimum 80% on knowledge assessment and satisfactory performance evaluation'
            }
          ]
        };
      });
    }
    
    // If no moduleDescriptions provided, generate default modules based on syllabus type
    return this.generateDefaultModules(targetDuration, structureType, syllabusType);
  }

  /**
   * Generate default modules based on syllabus type
   * @param targetDuration - Target total duration
   * @param structureType - Syllabus structure type
   * @param syllabusType - Syllabus type
   * @returns SyllabusModule[] - Generated default modules
   */
  private generateDefaultModules(
    targetDuration: number,
    structureType: 'modular' | 'progressive' | 'integrated',
    syllabusType: 'initial' | 'recurrent' | 'conversion' | 'upgrade' | 'specialized'
  ): SyllabusModule[] {
    const modules: SyllabusModule[] = [];
    
    // Different module structures based on syllabus type
    switch (syllabusType) {
      case 'initial':
        modules.push(this.createModule('Theoretical Knowledge', 1, Math.round(targetDuration * 0.4), [
          'Understand aviation regulations and requirements',
          'Explain aircraft systems and operation principles',
          'Describe normal and emergency procedures',
          'Identify meteorological factors affecting flight operations'
        ]));
        
        modules.push(this.createModule('Basic Flight Skills', 2, Math.round(targetDuration * 0.3), [
          'Demonstrate basic aircraft control techniques',
          'Perform standard take-off and landing procedures',
          'Execute basic maneuvers according to standard procedures',
          'Apply proper communication protocols'
        ]));
        
        modules.push(this.createModule('Advanced Operations', 3, Math.round(targetDuration * 0.2), [
          'Conduct complex flight planning for various scenarios',
          'Perform advanced aircraft handling techniques',
          'Demonstrate effective crew resource management',
          'Execute emergency and abnormal procedures'
        ]));
        
        modules.push(this.createModule('Final Assessment', 4, Math.round(targetDuration * 0.1), [
          'Demonstrate integrated knowledge of all training areas',
          'Perform comprehensive flight operations sequence',
          'Apply effective decision-making in normal and abnormal situations',
          'Exhibit professional standards of airmanship'
        ]));
        break;
        
      case 'recurrent':
        modules.push(this.createModule('Regulatory Updates', 1, Math.round(targetDuration * 0.2), [
          'Identify changes in aviation regulations',
          'Apply updated procedural requirements',
          'Demonstrate knowledge of new operational guidelines'
        ]));
        
        modules.push(this.createModule('Emergency Procedures Review', 2, Math.round(targetDuration * 0.3), [
          'Perform required emergency procedures',
          'Demonstrate evacuation techniques',
          'Execute systems failure response protocols',
          'Apply crew coordination during emergency scenarios'
        ]));
        
        modules.push(this.createModule('Operational Proficiency', 3, Math.round(targetDuration * 0.4), [
          'Perform standard operational procedures',
          'Demonstrate proper aircraft handling techniques',
          'Execute normal and non-normal checklists',
          'Apply appropriate decision-making processes'
        ]));
        
        modules.push(this.createModule('Assessment', 4, Math.round(targetDuration * 0.1), [
          'Demonstrate continued proficiency in all required areas',
          'Apply knowledge of updated procedures and regulations',
          'Perform to required standards in operational scenarios'
        ]));
        break;
        
      case 'conversion':
        modules.push(this.createModule('Aircraft Systems Differences', 1, Math.round(targetDuration * 0.3), [
          'Identify key differences in aircraft systems',
          'Explain operation of new or modified systems',
          'Describe performance characteristics differences',
          'Understand limitations and operational considerations'
        ]));
        
        modules.push(this.createModule('Operational Procedures', 2, Math.round(targetDuration * 0.3), [
          'Apply standard operating procedures for new aircraft type',
          'Perform normal checklist procedures',
          'Execute abnormal and emergency procedures',
          'Demonstrate appropriate use of automation systems'
        ]));
        
        modules.push(this.createModule('Handling Skills', 3, Math.round(targetDuration * 0.3), [
          'Demonstrate proper handling techniques for new aircraft type',
          'Perform take-off and landing procedures',
          'Execute normal maneuvers within prescribed limits',
          'Apply appropriate techniques for abnormal situations'
        ]));
        
        modules.push(this.createModule('Final Evaluation', 4, Math.round(targetDuration * 0.1), [
          'Demonstrate integrated knowledge of new aircraft type',
          'Perform to required standards in operational scenarios',
          'Apply effective decision-making appropriate to aircraft type'
        ]));
        break;
      
      default:
        // Generic modules for other types
        modules.push(this.createModule('Theoretical Knowledge', 1, Math.round(targetDuration * 0.3), [
          'Understand required theoretical concepts',
          'Explain relevant procedures and requirements',
          'Describe applicable systems and operations'
        ]));
        
        modules.push(this.createModule('Practical Skills', 2, Math.round(targetDuration * 0.5), [
          'Demonstrate required operational skills',
          'Perform standard procedures accurately',
          'Execute required maneuvers within standards',
          'Apply proper techniques in various scenarios'
        ]));
        
        modules.push(this.createModule('Assessment', 3, Math.round(targetDuration * 0.2), [
          'Demonstrate integrated knowledge and skills',
          'Perform to required standards in assessment scenarios',
          'Apply effective decision-making in evaluated situations'
        ]));
    }
    
    // Add prerequisites based on structure type
    if (structureType === 'progressive') {
      // Each module requires completion of the previous module
      for (let i = 1; i < modules.length; i++) {
        modules[i].prerequisites = [modules[i-1].id];
      }
    }
    
    return modules;
  }

  /**
   * Create a syllabus module with given parameters
   * @param title - Module title
   * @param order - Module order in syllabus
   * @param duration - Module duration in hours
   * @param objectiveDescriptions - Array of objective descriptions
   * @returns SyllabusModule - Created module
   */
  private createModule(
    title: string,
    order: number,
    duration: number,
    objectiveDescriptions: string[]
  ): SyllabusModule {
    // Generate objectives
    const objectives = objectiveDescriptions.map(desc => ({
      id: uuidv4(),
      description: desc,
      category: this.categorizeObjective(desc),
      level: this.determineObjectiveLevel(desc),
      references: []
    }));
    
    // Create assessment
    const assessments = [
      {
        id: uuidv4(),
        title: `${title} Assessment`,
        type: 'combined' as 'knowledge' | 'performance' | 'combined',
        passingCriteria: 'Minimum 80% on knowledge assessment and satisfactory performance evaluation'
      }
    ];
    
    // Create module
    return {
      id: uuidv4(),
      title,
      description: `This module covers ${title.toLowerCase()} aspects of the training program.`,
      order,
      duration,
      objectives,
      assessments
    };
  }

  /**
   * Categorize an objective based on text description
   * @param description - Objective description
   * @returns 'knowledge' | 'skill' | 'attitude' - Objective category
   */
  private categorizeObjective(description: string): 'knowledge' | 'skill' | 'attitude' {
    const lowerDesc = description.toLowerCase();
    
    // Keywords for different categories
    const knowledgeKeywords = ['understand', 'describe', 'identify', 'explain', 'list', 'define', 'recall', 'recognize'];
    const skillKeywords = ['perform', 'demonstrate', 'apply', 'execute', 'conduct', 'operate', 'implement', 'use'];
    const attitudeKeywords = ['value', 'appreciate', 'accept', 'adapt', 'advocate', 'comply', 'follow', 'practice'];
    
    // Check for keyword matches
    for (const keyword of knowledgeKeywords) {
      if (lowerDesc.includes(keyword)) {
        return 'knowledge';
      }
    }
    
    for (const keyword of skillKeywords) {
      if (lowerDesc.includes(keyword)) {
        return 'skill';
      }
    }
    
    for (const keyword of attitudeKeywords) {
      if (lowerDesc.includes(keyword)) {
        return 'attitude';
      }
    }
    
    // Default to knowledge if no clear indicators
    return 'knowledge';
  }

  /**
   * Determine objective difficulty level from description
   * @param description - Objective description
   * @returns 'basic' | 'intermediate' | 'advanced' - Objective level
   */
  private determineObjectiveLevel(description: string): 'basic' | 'intermediate' | 'advanced' {
    const lowerDesc = description.toLowerCase();
    
    // Keywords for different levels
    const basicKeywords = ['basic', 'fundamental', 'introduction', 'simple', 'elementary', 'initial'];
    const advancedKeywords = ['advanced', 'complex', 'comprehensive', 'expert', 'mastery', 'proficient'];
    
    // Check for keyword matches
    for (const keyword of basicKeywords) {
      if (lowerDesc.includes(keyword)) {
        return 'basic';
      }
    }
    
    for (const keyword of advancedKeywords) {
      if (lowerDesc.includes(keyword)) {
        return 'advanced';
      }
    }
    
    // Default to intermediate if no clear indicators
    return 'intermediate';
  }
}

// Export singleton instance
export const syllabusGenerator = new SyllabusGenerator();
