/**
 * Session Plan Generator Service
 * Creates training session plans based on user requirements and syllabus components
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { 
  SessionPlan, 
  SessionPlanGenerationOptions,
  TrainingObjective,
  Equipment,
  LearningActivity,
  AssessmentMethod
} from '../../shared/session-plan-types';

export class SessionPlanService {
  private logger;
  private sessionPlans: Map<string, SessionPlan>;

  constructor() {
    this.logger = logger.child('SessionPlanService');
    this.sessionPlans = new Map<string, SessionPlan>();
    
    this.logger.info('Session Plan Service initialized');
  }

  /**
   * Get a session plan by ID
   * @param id - Session plan ID
   * @returns Promise<SessionPlan | undefined> - Session plan or undefined if not found
   */
  async getSessionPlan(id: string): Promise<SessionPlan | undefined> {
    try {
      return this.sessionPlans.get(id);
    } catch (error) {
      this.logger.error(`Error getting session plan: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get all session plans with optional filtering
   * @param options - Filter options
   * @returns Promise<SessionPlan[]> - Array of session plans
   */
  async getAllSessionPlans(options?: {
    createdBy?: number;
    syllabusId?: string;
    moduleId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<SessionPlan[]> {
    try {
      // Get all session plans
      let plans = Array.from(this.sessionPlans.values());
      
      // Apply filters
      if (options?.createdBy) {
        plans = plans.filter(plan => plan.created_by === options.createdBy);
      }
      
      if (options?.syllabusId) {
        plans = plans.filter(plan => plan.syllabus_id === options.syllabusId);
      }
      
      if (options?.moduleId) {
        plans = plans.filter(plan => plan.module_id === options.moduleId);
      }
      
      if (options?.status) {
        plans = plans.filter(plan => plan.status === options.status);
      }
      
      // Apply pagination
      if (options?.limit || options?.offset) {
        const offset = options?.offset || 0;
        const limit = options?.limit || plans.length;
        plans = plans.slice(offset, offset + limit);
      }
      
      return plans;
    } catch (error) {
      this.logger.error(`Error getting all session plans: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Generate a new session plan based on options
   * @param options - Session plan generation options
   * @param userId - ID of the user generating the plan
   * @returns Promise<SessionPlan> - Generated session plan
   */
  async generateSessionPlan(options: SessionPlanGenerationOptions, userId: number): Promise<SessionPlan> {
    try {
      this.logger.info(`Generating session plan: ${options.title}`);
      
      const now = new Date().toISOString();
      const id = uuidv4();
      
      // Generate objectives
      const objectives = this.generateObjectives(options);
      
      // Generate equipment list
      const equipment = this.generateEquipment(options);
      
      // Generate learning activities
      const activities = this.generateActivities(options, objectives);
      
      // Generate assessment methods
      const assessments = this.generateAssessments(options, objectives);
      
      // Create the session plan
      const sessionPlan: SessionPlan = {
        id,
        title: options.title,
        description: options.description || `Training session plan for ${options.title}`,
        duration: options.duration || 120, // Default to 2 hours
        objectives,
        equipment,
        activities,
        assessments,
        references: [],
        status: 'draft',
        syllabus_id: options.syllabusId,
        module_id: options.moduleId,
        created_by: userId,
        created_at: now,
        updated_at: now
      };
      
      // Add references if any
      if (options.references && options.references.length > 0) {
        sessionPlan.references = options.references.map(ref => ({
          id: uuidv4(),
          title: ref.title,
          source: ref.type,
          type: 'document'
        }));
      }
      
      // Store the session plan
      this.sessionPlans.set(id, sessionPlan);
      
      this.logger.info(`Session plan generated: ${id}`);
      
      return sessionPlan;
    } catch (error) {
      this.logger.error(`Error generating session plan: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Generate training objectives based on options
   * @param options - Session plan generation options
   * @returns TrainingObjective[] - Array of training objectives
   */
  private generateObjectives(options: SessionPlanGenerationOptions): TrainingObjective[] {
    const count = options.objectiveCount || 3;
    const level = options.objectiveLevel || 'intermediate';
    const categories = options.objectiveCategories || ['knowledge', 'skill', 'attitude'];
    
    const objectives: TrainingObjective[] = [];
    
    // Generate knowledge objectives
    if (categories.includes('knowledge')) {
      objectives.push({
        id: uuidv4(),
        description: `Demonstrate comprehensive understanding of ${options.title} theory and principles`,
        category: 'knowledge',
        level: level,
        references: []
      });
    }
    
    // Generate skill objectives
    if (categories.includes('skill')) {
      objectives.push({
        id: uuidv4(),
        description: `Perform ${options.title} procedures accurately and efficiently`,
        category: 'skill',
        level: level,
        references: []
      });
    }
    
    // Generate attitude objectives
    if (categories.includes('attitude')) {
      objectives.push({
        id: uuidv4(),
        description: `Demonstrate professionalism and situational awareness during ${options.title}`,
        category: 'attitude',
        level: level,
        references: []
      });
    }
    
    // Add additional objectives if needed
    while (objectives.length < count) {
      const category = categories[Math.floor(Math.random() * categories.length)] as 'knowledge' | 'skill' | 'attitude';
      
      let description = '';
      if (category === 'knowledge') {
        description = `Explain the key factors affecting ${options.title}`;
      } else if (category === 'skill') {
        description = `Apply correct techniques for ${options.title} in various scenarios`;
      } else {
        description = `Maintain appropriate decision-making processes during ${options.title}`;
      }
      
      objectives.push({
        id: uuidv4(),
        description,
        category,
        level,
        references: []
      });
    }
    
    return objectives;
  }

  /**
   * Generate equipment list based on options
   * @param options - Session plan generation options
   * @returns Equipment[] - Array of equipment items
   */
  private generateEquipment(options: SessionPlanGenerationOptions): Equipment[] {
    const equipment: Equipment[] = [];
    
    // Add basic equipment
    equipment.push({
      id: uuidv4(),
      name: 'Training materials',
      type: 'documentation',
      required: true
    });
    
    // Add included equipment if specified
    if (options.includedEquipment) {
      options.includedEquipment.forEach(item => {
        equipment.push({
          id: uuidv4(),
          name: item,
          type: 'specialized',
          required: true
        });
      });
    }
    
    return equipment;
  }

  /**
   * Generate learning activities based on objectives
   * @param options - Session plan generation options
   * @param objectives - Training objectives
   * @returns LearningActivity[] - Array of learning activities
   */
  private generateActivities(options: SessionPlanGenerationOptions, objectives: TrainingObjective[]): LearningActivity[] {
    const activities: LearningActivity[] = [];
    const totalDuration = options.duration || 120;
    const activityTypes = options.activityTypes || ['lecture', 'demonstration', 'practice', 'assessment'];
    
    // Calculate time allocation
    let remainingDuration = totalDuration;
    
    // Introduction (10% of time)
    const introDuration = Math.round(totalDuration * 0.1);
    remainingDuration -= introDuration;
    
    activities.push({
      id: uuidv4(),
      title: `Introduction to ${options.title}`,
      description: `Overview of ${options.title} session, objectives, and expected outcomes`,
      duration: introDuration,
      type: 'lecture',
      objectives: objectives.map(o => o.id)
    });
    
    // Main activities (80% of time)
    const mainDuration = Math.round(totalDuration * 0.8);
    let allocatedMainDuration = 0;
    
    // Split main duration across activity types
    const typeCount = activityTypes.length;
    const durationPerType = Math.floor(mainDuration / typeCount);
    
    activityTypes.forEach((type, index) => {
      const isLast = index === activityTypes.length - 1;
      const duration = isLast ? mainDuration - allocatedMainDuration : durationPerType;
      allocatedMainDuration += duration;
      
      const relevantObjectives = objectives
        .filter(o => {
          if (type === 'lecture') return o.category === 'knowledge';
          if (type === 'demonstration') return o.category === 'knowledge' || o.category === 'skill';
          if (type === 'practice') return o.category === 'skill';
          if (type === 'assessment') return true;
          if (type === 'discussion' as any) return o.category === 'attitude';
          if (type === 'simulation' as any) return o.category === 'skill' || o.category === 'attitude';
          return true;
        })
        .map(o => o.id);
      
      if (relevantObjectives.length === 0) {
        relevantObjectives.push(...objectives.map(o => o.id));
      }
      
      let title = '';
      let description = '';
      
      switch (type) {
        case 'lecture':
          title = `${options.title} Theory and Concepts`;
          description = `Presentation and explanation of key concepts related to ${options.title}`;
          break;
        case 'demonstration':
          title = `${options.title} Demonstration`;
          description = `Instructor demonstration of proper techniques and procedures for ${options.title}`;
          break;
        case 'practice':
          title = `${options.title} Practical Application`;
          description = `Guided practice of ${options.title} skills and procedures`;
          break;
        case 'assessment':
          title = `${options.title} Skills Assessment`;
          description = `Evaluation of learner performance on ${options.title} tasks`;
          break;
        case 'discussion' as any:
          title = `${options.title} Discussion and Analysis`;
          description = `Group discussion of ${options.title} applications and challenges`;
          break;
        case 'simulation' as any:
          title = `${options.title} Simulation Exercise`;
          description = `Simulated scenario applying ${options.title} knowledge and skills in realistic conditions`;
          break;
      }
      
      activities.push({
        id: uuidv4(),
        title,
        description,
        duration,
        type: type as any,
        objectives: relevantObjectives
      });
    });
    
    // Conclusion (10% of time)
    const conclusionDuration = totalDuration - (introDuration + allocatedMainDuration);
    
    activities.push({
      id: uuidv4(),
      title: `${options.title} Summary and Review`,
      description: `Review of key points, Q&A, and session wrap-up`,
      duration: conclusionDuration,
      type: 'discussion' as any,
      objectives: objectives.map(o => o.id)
    });
    
    return activities;
  }

  /**
   * Generate assessment methods based on objectives
   * @param options - Session plan generation options
   * @param objectives - Training objectives
   * @returns AssessmentMethod[] - Array of assessment methods
   */
  private generateAssessments(options: SessionPlanGenerationOptions, objectives: TrainingObjective[]): AssessmentMethod[] {
    const assessments: AssessmentMethod[] = [];
    const assessmentTypes = options.assessmentTypes || ['oral', 'written', 'performance'];
    
    // Group objectives by category
    const knowledgeObjectives = objectives.filter(o => o.category === 'knowledge').map(o => o.id);
    const skillObjectives = objectives.filter(o => o.category === 'skill').map(o => o.id);
    const attitudeObjectives = objectives.filter(o => o.category === 'attitude').map(o => o.id);
    
    // Create assessments based on available types
    if (assessmentTypes.includes('oral') && knowledgeObjectives.length > 0) {
      assessments.push({
        id: uuidv4(),
        title: `${options.title} Oral Assessment`,
        description: `Verbal questioning to assess understanding of ${options.title} concepts and principles`,
        type: 'oral',
        passingCriteria: 'Learner must correctly answer at least 80% of questions',
        objectives: knowledgeObjectives
      });
    }
    
    if (assessmentTypes.includes('written') && knowledgeObjectives.length > 0) {
      assessments.push({
        id: uuidv4(),
        title: `${options.title} Written Assessment`,
        description: `Written test covering key concepts and theory related to ${options.title}`,
        type: 'written',
        passingCriteria: 'Minimum score of 80% required to pass',
        objectives: knowledgeObjectives
      });
    }
    
    if (assessmentTypes.includes('performance') && skillObjectives.length > 0) {
      assessments.push({
        id: uuidv4(),
        title: `${options.title} Performance Assessment`,
        description: `Practical demonstration of ${options.title} skills and procedures`,
        type: 'performance',
        passingCriteria: 'Successful completion of all critical tasks with no major errors',
        objectives: [...skillObjectives, ...attitudeObjectives]
      });
    }
    
    if (assessmentTypes.includes('observation' as any) && attitudeObjectives.length > 0) {
      assessments.push({
        id: uuidv4(),
        title: `${options.title} Behavioral Observation`,
        description: `Observation of learner attitudes and behaviors during ${options.title} activities`,
        type: 'observation' as any,
        passingCriteria: 'Consistent demonstration of professional attitude and appropriate behaviors',
        objectives: attitudeObjectives
      });
    }
    
    return assessments;
  }

  /**
   * Update an existing session plan
   * @param id - Session plan ID
   * @param updates - Updated session plan data
   * @returns Promise<SessionPlan | undefined> - Updated session plan or undefined if not found
   */
  async updateSessionPlan(id: string, updates: Partial<SessionPlan>): Promise<SessionPlan | undefined> {
    try {
      const sessionPlan = this.sessionPlans.get(id);
      
      if (!sessionPlan) {
        return undefined;
      }
      
      // Create updated session plan
      const updatedPlan = {
        ...sessionPlan,
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      // Save updated plan
      this.sessionPlans.set(id, updatedPlan);
      
      return updatedPlan;
    } catch (error) {
      this.logger.error(`Error updating session plan: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete a session plan
   * @param id - Session plan ID
   * @returns Promise<boolean> - True if deletion succeeded
   */
  async deleteSessionPlan(id: string): Promise<boolean> {
    try {
      const exists = this.sessionPlans.has(id);
      
      if (!exists) {
        return false;
      }
      
      // Delete the session plan
      this.sessionPlans.delete(id);
      
      return true;
    } catch (error) {
      this.logger.error(`Error deleting session plan: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

// Create and export service instance
export const sessionPlanService = new SessionPlanService();