/**
 * Session Plan Generator
 * Creates training session plans based on syllabus components
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// Session plan types
export interface TrainingObjective {
  id: string;
  description: string;
  category: 'knowledge' | 'skill' | 'attitude';
  level: 'basic' | 'intermediate' | 'advanced';
  references: string[];
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  required: boolean;
  notes?: string;
}

export interface LearningActivity {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  type: 'briefing' | 'demonstration' | 'practice' | 'assessment' | 'debrief';
  objectives: string[]; // IDs of related objectives
  resources?: string[];
  notes?: string;
}

export interface AssessmentCriteria {
  id: string;
  description: string;
  passingThreshold: string;
  objectiveId: string;
  type: 'knowledge' | 'performance';
}

export interface SessionPlan {
  id: string;
  title: string;
  description: string;
  syllabusId: string;
  duration: number; // in minutes
  objectives: TrainingObjective[];
  equipment: Equipment[];
  activities: LearningActivity[];
  assessments: AssessmentCriteria[];
  prerequisites?: string[];
  notes?: string;
  createdAt: string;
  createdBy: number;
  version: string;
}

export class SessionPlanGenerator {
  private logger;

  constructor() {
    this.logger = logger.child('SessionPlanGenerator');
  }

  /**
   * Generate a session plan based on provided parameters
   * @param params - Session plan parameters
   * @returns Promise<SessionPlan> - Generated session plan
   */
  public async generateSessionPlan(params: {
    title: string;
    description: string;
    syllabusId: string;
    objectiveDescriptions: string[];
    duration: number;
    userId: number;
    equipmentList?: Array<{name: string, type: string, required: boolean}>;
    activityStructure?: 'standard' | 'intensive' | 'custom';
  }): Promise<SessionPlan> {
    try {
      this.logger.info(`Generating session plan: ${params.title}`);
      
      // Generate objectives from descriptions
      const objectives: TrainingObjective[] = params.objectiveDescriptions.map(desc => ({
        id: uuidv4(),
        description: desc,
        category: this.categorizeObjective(desc),
        level: this.determineObjectiveLevel(desc),
        references: []
      }));
      
      // Generate equipment list
      const equipment: Equipment[] = params.equipmentList ? 
        params.equipmentList.map(item => ({
          id: uuidv4(),
          name: item.name,
          type: item.type,
          required: item.required
        })) : 
        this.generateDefaultEquipment(objectives);
      
      // Generate learning activities
      const activities = this.generateActivities(
        objectives, 
        params.duration, 
        params.activityStructure || 'standard'
      );
      
      // Generate assessment criteria
      const assessments = objectives.map(obj => ({
        id: uuidv4(),
        description: `Demonstrate competency in ${obj.description}`,
        passingThreshold: obj.category === 'knowledge' ? '80%' : 'Satisfactory performance',
        objectiveId: obj.id,
        type: obj.category === 'knowledge' ? 'knowledge' : 'performance' as 'knowledge' | 'performance'
      }));
      
      // Create session plan
      const sessionPlan: SessionPlan = {
        id: uuidv4(),
        title: params.title,
        description: params.description,
        syllabusId: params.syllabusId,
        duration: params.duration,
        objectives,
        equipment,
        activities,
        assessments,
        createdAt: new Date().toISOString(),
        createdBy: params.userId,
        version: '1.0'
      };
      
      this.logger.info(`Session plan generated: ${sessionPlan.id}`);
      
      return sessionPlan;
    } catch (error) {
      this.logger.error(`Error generating session plan: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Generate default equipment based on training objectives
   * @param objectives - Training objectives
   * @returns Equipment[] - Generated equipment list
   */
  private generateDefaultEquipment(objectives: TrainingObjective[]): Equipment[] {
    const equipment: Equipment[] = [
      {
        id: uuidv4(),
        name: 'Training materials',
        type: 'documentation',
        required: true
      }
    ];
    
    // Add equipment based on objective categories
    const hasKnowledgeObjectives = objectives.some(obj => obj.category === 'knowledge');
    const hasSkillObjectives = objectives.some(obj => obj.category === 'skill');
    
    if (hasKnowledgeObjectives) {
      equipment.push({
        id: uuidv4(),
        name: 'Presentation equipment',
        type: 'technology',
        required: true
      });
    }
    
    if (hasSkillObjectives) {
      equipment.push({
        id: uuidv4(),
        name: 'Training simulator',
        type: 'simulator',
        required: true
      });
    }
    
    return equipment;
  }

  /**
   * Generate learning activities based on objectives and duration
   * @param objectives - Training objectives
   * @param totalDuration - Total session duration
   * @param structure - Activity structure type
   * @returns LearningActivity[] - Generated activities
   */
  private generateActivities(
    objectives: TrainingObjective[], 
    totalDuration: number,
    structure: 'standard' | 'intensive' | 'custom'
  ): LearningActivity[] {
    const activities: LearningActivity[] = [];
    
    // Group objectives by category
    const knowledgeObjectives = objectives.filter(obj => obj.category === 'knowledge');
    const skillObjectives = objectives.filter(obj => obj.category === 'skill');
    const attitudeObjectives = objectives.filter(obj => obj.category === 'attitude');
    
    // Calculate duration allocations based on structure
    let briefingPercent = 0.2;
    let practicePercent = 0.5;
    let assessmentPercent = 0.2;
    let debriefPercent = 0.1;
    
    switch (structure) {
      case 'intensive':
        briefingPercent = 0.15;
        practicePercent = 0.6;
        assessmentPercent = 0.2;
        debriefPercent = 0.05;
        break;
      case 'custom':
        // Custom structure would be defined by specific requirements
        break;
      // 'standard' uses default values
    }
    
    // Calculate durations
    const briefingDuration = Math.round(totalDuration * briefingPercent);
    const practiceDuration = Math.round(totalDuration * practicePercent);
    const assessmentDuration = Math.round(totalDuration * assessmentPercent);
    const debriefDuration = Math.round(totalDuration * debriefPercent);
    
    // Add briefing activity
    if (knowledgeObjectives.length > 0 || attitudeObjectives.length > 0) {
      activities.push({
        id: uuidv4(),
        title: 'Pre-session briefing',
        description: 'Introduction to concepts and expected outcomes',
        duration: briefingDuration,
        type: 'briefing',
        objectives: [...knowledgeObjectives, ...attitudeObjectives].map(obj => obj.id)
      });
    }
    
    // Add demonstration activity if there are skill objectives
    if (skillObjectives.length > 0) {
      activities.push({
        id: uuidv4(),
        title: 'Skill demonstration',
        description: 'Demonstration of required skills and techniques',
        duration: Math.round(practiceDuration * 0.3),
        type: 'demonstration',
        objectives: skillObjectives.map(obj => obj.id)
      });
      
      // Add practice activity
      activities.push({
        id: uuidv4(),
        title: 'Practical exercises',
        description: 'Guided practice of skills and techniques',
        duration: Math.round(practiceDuration * 0.7),
        type: 'practice',
        objectives: skillObjectives.map(obj => obj.id)
      });
    } else {
      // If no skill objectives, allocate practice time to knowledge application
      activities.push({
        id: uuidv4(),
        title: 'Knowledge application exercises',
        description: 'Application of knowledge through scenarios and problems',
        duration: practiceDuration,
        type: 'practice',
        objectives: knowledgeObjectives.map(obj => obj.id)
      });
    }
    
    // Add assessment activity
    activities.push({
      id: uuidv4(),
      title: 'Performance assessment',
      description: 'Assessment of learned knowledge and skills',
      duration: assessmentDuration,
      type: 'assessment',
      objectives: objectives.map(obj => obj.id)
    });
    
    // Add debrief activity
    activities.push({
      id: uuidv4(),
      title: 'Session debrief',
      description: 'Review of performance and feedback session',
      duration: debriefDuration,
      type: 'debrief',
      objectives: objectives.map(obj => obj.id)
    });
    
    return activities;
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
export const sessionPlanGenerator = new SessionPlanGenerator();
