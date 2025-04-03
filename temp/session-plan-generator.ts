import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';
import { OpenAI } from 'openai';
import { documentService } from './document-service';
import { terminologyService } from './terminology-service';
import { 
  SessionPlan, 
  SessionPlanRequest, 
  SessionPlanTemplate, 
  SessionActivity, 
  LearningObjective 
} from '@shared/session-types';
import { db } from '../db';
import { 
  sessionPlans, 
  sessionActivities, 
  learningObjectives
} from '@shared/schema';
import config from '../config';

/**
 * Generates training session plans based on syllabus/document input
 */
export class SessionPlanGeneratorService {
  private logger: Logger;
  private openai: OpenAI | null = null;
  
  constructor() {
    this.logger = new Logger('SessionPlanGenerator');
    
    // Setup OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else if (process.env.XAI_API_KEY) {
      // If xAI key is available, use it with the compatible endpoint
      this.openai = new OpenAI({
        baseURL: "https://api.x.ai/v1",
        apiKey: process.env.XAI_API_KEY
      });
    } else {
      this.logger.warn('No OpenAI or xAI API key found. Session plan AI generation will use fallback templates.');
    }
  }
  
  /**
   * Generate a session plan from input parameters
   * @param request - Session plan generation request
   * @returns Generated session plan
   */
  public async generateSessionPlan(request: SessionPlanRequest): Promise<SessionPlan> {
    try {
      this.logger.info(`Generating session plan for ${request.title}`);
      
      let sessionPlanContent: Partial<SessionPlan> = {
        id: 0, // Will be assigned by DB
        title: request.title,
        description: request.description,
        syllabusId: request.syllabusId,
        duration: request.duration,
        targetAudience: request.targetAudience,
        requirementsText: request.requirements,
        equipmentList: request.equipment || [],
        createdById: request.userId,
        status: 'draft',
        sessionType: request.sessionType,
        sessionCode: this.generateSessionCode(request.sessionType)
      };
      
      // If AI is available, use it to generate enhanced content
      if (this.openai && !request.useTemplate) {
        const enhancedPlan = await this.generateSessionPlanWithAI(request);
        sessionPlanContent = {
          ...sessionPlanContent,
          description: enhancedPlan.description || sessionPlanContent.description,
          learningObjectiveText: enhancedPlan.learningObjectiveText,
          assessmentCriteria: enhancedPlan.assessmentCriteria,
          notesForInstructors: enhancedPlan.notesForInstructors
        };
      } else if (request.templateId) {
        // Use template as a base
        const template = await this.getSessionPlanTemplate(request.templateId);
        sessionPlanContent = {
          ...sessionPlanContent,
          learningObjectiveText: template.learningObjectiveText,
          assessmentCriteria: template.assessmentCriteria,
          notesForInstructors: template.notesForInstructors
        };
      }
      
      // Insert into database
      const [sessionPlan] = await db
        .insert(sessionPlans)
        .values(sessionPlanContent)
        .returning();
      
      // Generate and add activities
      const activities = await this.generateSessionActivities(sessionPlan.id, request);
      
      // Generate learning objectives
      const objectives = await this.generateLearningObjectives(sessionPlan.id, sessionPlanContent.learningObjectiveText || '');
      
      // Return complete session plan with relationships
      return {
        ...sessionPlan,
        activities,
        learningObjectives: objectives
      };
    } catch (error) {
      this.logger.error(`Failed to generate session plan: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Generate activities for a session plan
   * @param sessionPlanId - Session plan ID
   * @param request - Session plan request
   * @returns List of session activities
   */
  private async generateSessionActivities(
    sessionPlanId: number, 
    request: SessionPlanRequest
  ): Promise<SessionActivity[]> {
    try {
      const activities: Partial<SessionActivity>[] = [];
      
      // Start with intro activity
      activities.push({
        sessionPlanId,
        title: 'Introduction and Briefing',
        description: `Introduction to the session on ${request.title}. Overview of objectives and expected outcomes.`,
        duration: Math.round(request.duration * 0.1), // 10% of total time
        activityType: 'briefing',
        sequence: 1,
        resources: []
      });
      
      // Main activity - depends on session type
      switch (request.sessionType) {
        case 'classroom':
          activities.push({
            sessionPlanId,
            title: `${request.title} - Theory Presentation`,
            description: `Presentation of theoretical content about ${request.title}.`,
            duration: Math.round(request.duration * 0.6), // 60% of total time
            activityType: 'theory',
            sequence: 2,
            resources: []
          });
          break;
        case 'simulator':
          activities.push({
            sessionPlanId,
            title: `${request.title} - Simulator Exercises`,
            description: `Practical exercises in the simulator focused on ${request.title}.`,
            duration: Math.round(request.duration * 0.7), // 70% of total time
            activityType: 'simulator',
            sequence: 2,
            resources: []
          });
          break;
        case 'aircraft':
          activities.push({
            sessionPlanId,
            title: `${request.title} - Flight Training`,
            description: `In-aircraft practical training for ${request.title}.`,
            duration: Math.round(request.duration * 0.7), // 70% of total time
            activityType: 'flight',
            sequence: 2,
            resources: []
          });
          break;
        default:
          activities.push({
            sessionPlanId,
            title: `${request.title} - Main Activity`,
            description: `Main learning activity for ${request.title}.`,
            duration: Math.round(request.duration * 0.6), // 60% of total time
            activityType: 'theory',
            sequence: 2,
            resources: []
          });
      }
      
      // Add assessment activity
      activities.push({
        sessionPlanId,
        title: 'Skills Assessment',
        description: `Assessment of learned skills and knowledge related to ${request.title}.`,
        duration: Math.round(request.duration * 0.2), // 20% of total time
        activityType: 'assessment',
        sequence: 3,
        resources: []
      });
      
      // Closing activity
      activities.push({
        sessionPlanId,
        title: 'Debriefing and Questions',
        description: 'Recap of key learning points, feedback, and addressing questions.',
        duration: Math.round(request.duration * 0.1), // 10% of total time
        activityType: 'debriefing',
        sequence: 4,
        resources: []
      });
      
      // Insert activities into database
      const dbActivities = [];
      for (const activity of activities) {
        const [insertedActivity] = await db
          .insert(sessionActivities)
          .values(activity)
          .returning();
        
        dbActivities.push(insertedActivity);
      }
      
      return dbActivities;
    } catch (error) {
      this.logger.error(`Failed to generate session activities: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Generate learning objectives from objectives text
   * @param sessionPlanId - Session plan ID
   * @param objectivesText - Text containing learning objectives
   * @returns List of learning objectives
   */
  private async generateLearningObjectives(
    sessionPlanId: number, 
    objectivesText: string
  ): Promise<LearningObjective[]> {
    try {
      // Parse objectives from text
      const objectives: Partial<LearningObjective>[] = [];
      
      if (!objectivesText) {
        // Default objectives if none provided
        objectives.push({
          sessionPlanId,
          text: 'Understand the key concepts presented in the session',
          taxonomyLevel: 'understanding',
          assessmentMethod: 'written test'
        });
        objectives.push({
          sessionPlanId,
          text: 'Apply the learned skills in practical scenarios',
          taxonomyLevel: 'application',
          assessmentMethod: 'practical demonstration'
        });
      } else {
        // Extract objectives from text
        const lines = objectivesText.split('\n');
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.length > 5) {
            objectives.push({
              sessionPlanId,
              text: trimmedLine.replace(/^[•\-*]\s*/, ''), // Remove bullet points
              taxonomyLevel: this.determineTaxonomyLevel(trimmedLine),
              assessmentMethod: this.determineAssessmentMethod(trimmedLine)
            });
          }
        }
      }
      
      // Insert objectives into database
      const dbObjectives = [];
      for (const objective of objectives) {
        const [insertedObjective] = await db
          .insert(learningObjectives)
          .values(objective)
          .returning();
        
        dbObjectives.push(insertedObjective);
      }
      
      return dbObjectives;
    } catch (error) {
      this.logger.error(`Failed to generate learning objectives: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Generate session plan using AI
   * @param request - Session plan request
   * @returns Enhanced session plan content
   */
  private async generateSessionPlanWithAI(request: SessionPlanRequest): Promise<Partial<SessionPlan>> {
    try {
      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }
      
      // Get aviation terminology to include in the prompt
      const relevantTerms = await terminologyService.getTermsByCategory(request.sessionType);
      
      // Get document content if document ID is provided
      let documentContext = '';
      if (request.documentId) {
        const { content } = await documentService.getDocumentContent(request.documentId);
        documentContext = `Based on the following document content (summarized):\n${content.substring(0, 2000)}...\n\n`;
      }
      
      // Craft prompt
      const prompt = `
        ${documentContext}
        Create a detailed aviation training session plan for "${request.title}" with the following parameters:
        - Session type: ${request.sessionType}
        - Duration: ${request.duration} minutes
        - Target audience: ${request.targetAudience}
        - Requirements: ${request.requirements || 'None specified'}
        - Equipment: ${request.equipment?.join(', ') || 'None specified'}
        
        Include the following sections:
        1. A detailed description of the session (1-2 paragraphs)
        2. 4-6 specific learning objectives written using Bloom's taxonomy verbs
        3. Detailed assessment criteria to evaluate trainee performance
        4. Notes for instructors on key points, common mistakes, and safety considerations
        
        Use these aviation-specific terms where appropriate: ${relevantTerms.slice(0, 10).join(', ')}
        
        Ensure all content adheres to aviation safety standards and regulations.
      `;
      
      // Call AI API
      const completion = await this.openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an aviation training expert specialized in creating effective training materials for pilots and aviation personnel. Use specific aviation terminology and follow industry best practices."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: process.env.XAI_API_KEY ? "grok-2-1212" : "gpt-4-turbo",
        temperature: 0.7,
        max_tokens: 1500
      });
      
      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('Empty response from AI');
      }
      
      // Parse the response sections
      const sections = this.parseAIResponse(response);
      
      return {
        description: sections.description,
        learningObjectiveText: sections.learningObjectives,
        assessmentCriteria: sections.assessmentCriteria,
        notesForInstructors: sections.instructorNotes
      };
    } catch (error) {
      this.logger.error(`AI generation failed: ${error instanceof Error ? error.message : String(error)}`);
      
      // Return basic template as fallback
      return {
        description: request.description,
        learningObjectiveText: 'Understand key concepts\nDemonstrate practical application\nAnalyze scenarios',
        assessmentCriteria: 'Written assessment\nPractical demonstration\nInstructor evaluation',
        notesForInstructors: 'Ensure safety procedures are followed\nAdapt to individual learning needs'
      };
    }
  }
  
  /**
   * Parse AI response into structured sections
   * @param response - AI-generated text
   * @returns Structured sections
   */
  private parseAIResponse(response: string): {
    description: string;
    learningObjectives: string;
    assessmentCriteria: string;
    instructorNotes: string;
  } {
    // Default values
    let description = '';
    let learningObjectives = '';
    let assessmentCriteria = '';
    let instructorNotes = '';
    
    // Try to extract sections
    try {
      // Find Description section
      const descMatch = response.match(/description:?(.*?)(?=learning objectives:|learning objectives|objectives:|objectives|assessment criteria:|assessment criteria|assessment:|assessment|notes for instructors:|notes for instructors|instructor notes:|instructor notes|$)/is);
      if (descMatch && descMatch[1]) {
        description = descMatch[1].trim();
      }
      
      // Find Learning Objectives section
      const objMatch = response.match(/learning objectives:?(.*?)(?=assessment criteria:|assessment criteria|assessment:|assessment|notes for instructors:|notes for instructors|instructor notes:|instructor notes|$)/is);
      if (objMatch && objMatch[1]) {
        learningObjectives = objMatch[1].trim();
      }
      
      // Find Assessment Criteria section
      const assMatch = response.match(/assessment criteria:?(.*?)(?=notes for instructors:|notes for instructors|instructor notes:|instructor notes|$)/is);
      if (assMatch && assMatch[1]) {
        assessmentCriteria = assMatch[1].trim();
      }
      
      // Find Instructor Notes section
      const notesMatch = response.match(/(?:notes for instructors|instructor notes):?(.*?)$/is);
      if (notesMatch && notesMatch[1]) {
        instructorNotes = notesMatch[1].trim();
      }
      
      // If no structured sections found, use basic parser
      if (!description && !learningObjectives && !assessmentCriteria && !instructorNotes) {
        const paragraphs = response.split('\n\n');
        
        if (paragraphs.length >= 1) description = paragraphs[0];
        if (paragraphs.length >= 2) learningObjectives = paragraphs[1];
        if (paragraphs.length >= 3) assessmentCriteria = paragraphs[2];
        if (paragraphs.length >= 4) instructorNotes = paragraphs[3];
      }
    } catch (error) {
      this.logger.error(`Error parsing AI response: ${error instanceof Error ? error.message : String(error)}`);
      // Use response as description if parsing fails
      description = response;
    }
    
    return {
      description,
      learningObjectives,
      assessmentCriteria,
      instructorNotes
    };
  }
  
  /**
   * Generate a unique session code
   * @param sessionType - Type of session
   * @returns Session code
   */
  private generateSessionCode(sessionType: string): string {
    const prefix = sessionType.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().substring(6, 12);
    return `${prefix}-${timestamp}`;
  }
  
  /**
   * Determine taxonomy level from objective text
   * @param objectiveText - Learning objective text
   * @returns Taxonomy level
   */
  private determineTaxonomyLevel(objectiveText: string): string {
    const text = objectiveText.toLowerCase();
    
    // Bloom's taxonomy verb analysis
    if (text.includes('create') || text.includes('design') || text.includes('develop')) {
      return 'creation';
    } else if (text.includes('evaluate') || text.includes('assess') || text.includes('judge')) {
      return 'evaluation';
    } else if (text.includes('analyze') || text.includes('compare') || text.includes('examine')) {
      return 'analysis';
    } else if (text.includes('apply') || text.includes('implement') || text.includes('use')) {
      return 'application';
    } else if (text.includes('understand') || text.includes('explain') || text.includes('describe')) {
      return 'understanding';
    } else {
      return 'knowledge';
    }
  }
  
  /**
   * Determine assessment method from objective text
   * @param objectiveText - Learning objective text
   * @returns Assessment method
   */
  private determineAssessmentMethod(objectiveText: string): string {
    const text = objectiveText.toLowerCase();
    
    if (text.includes('fly') || text.includes('operate') || text.includes('demonstrate')) {
      return 'practical demonstration';
    } else if (text.includes('discuss') || text.includes('explain verbally') || text.includes('briefing')) {
      return 'oral assessment';
    } else if (text.includes('identify') || text.includes('list') || text.includes('recall')) {
      return 'written test';
    } else if (text.includes('scenario') || text.includes('simulator')) {
      return 'simulator assessment';
    } else {
      return 'multiple methods';
    }
  }
  
  /**
   * Get a session plan template
   * @param templateId - Template ID
   * @returns Session plan template
   */
  private async getSessionPlanTemplate(templateId: number): Promise<SessionPlanTemplate> {
    // In a real application, this would fetch from a database
    // For now, return a basic template
    return {
      id: templateId,
      title: 'Standard Training Session',
      description: 'Template for standard training sessions',
      sessionType: 'classroom',
      learningObjectiveText: 'Understand key concepts\nDemonstrate practical application\nAnalyze scenarios',
      assessmentCriteria: 'Written assessment\nPractical demonstration\nInstructor evaluation',
      notesForInstructors: 'Focus on safety procedures\nAddress common misconceptions\nAdapt to individual learning needs',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}

// Export singleton instance
export const sessionPlanGeneratorService = new SessionPlanGeneratorService();
