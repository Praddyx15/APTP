import { apiRequest } from './queryClient';

// Default export for the session plan generator module
export default {
  generateTrainingSession,
  saveTrainingSession,
  getTrainingSession,
  updateTrainingSession,
  assignTrainingSession,
  getSessionTemplates,
  createSessionTemplate
};

export interface TrainingSession {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  duration: number; // in minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  exercises: Exercise[];
  resources: Resource[];
  assessmentCriteria: string[];
  isTemplate?: boolean;
}

export interface Exercise {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  type: 'briefing' | 'simulator' | 'aircraft' | 'theory' | 'debriefing';
  competencyAreas: string[];
}

export interface Resource {
  id: string;
  title: string;
  type: 'document' | 'video' | 'image' | 'link';
  url: string;
  description?: string;
}

export interface SessionGenerationParams {
  traineeId?: string;
  trainingPhase: string;
  aircraftType: string;
  focusAreas?: string[];
  previousSessionIds?: string[];
  preferences?: {
    duration?: number;
    includeBriefing?: boolean;
    includeDebriefing?: boolean;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  };
  includeExtraResources?: boolean;
  useTemplate?: string;
  // Added from the session plan interface
  title?: string;
  description?: string;
  syllabusId?: string;
  startDate?: string;
  endDate?: string;
  dailyStartTime?: string;
  dailyEndTime?: string;
  maxSessionsPerDay?: number;
  includeLunchBreaks?: boolean;
  includeRecapSessions?: boolean;
  resourceAllocation?: {
    instructors: string[];
    rooms: string[];
    equipment: string[];
  };
  additionalNotes?: string;
}

/**
 * Generates a training session plan based on parameters
 * 
 * This function can work in two modes:
 * 1. AI-powered generation (default): Creates a new session based on inputs and trainee history
 * 2. Template-based: Adapts an existing template to the specific trainee needs
 */
export async function generateTrainingSession(params: SessionGenerationParams): Promise<TrainingSession> {
  try {
    // Prepare the request with all the necessary parameters
    const requestData = {
      ...params,
      // Set default values for any required fields that aren't provided
      title: params.title || `${params.trainingPhase} - ${params.aircraftType} Training`,
      syllabusId: params.syllabusId || 'default',
      startDate: params.startDate || new Date().toISOString(),
      endDate: params.endDate || new Date(Date.now() + 86400000).toISOString(), // Next day by default
      resourceAllocation: params.resourceAllocation || {
        instructors: [],
        rooms: [],
        equipment: []
      }
    };

    // Make the API request to start generation
    const response = await apiRequest('POST', '/api/session-plans/generate', requestData);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to generate training session');
    }
    
    // Get the generation ID and initial progress
    const generationResponse = await response.json();
    const generationId = generationResponse.generationId;
    
    // Poll for progress and completion
    let isComplete = false;
    let resultData;
    
    while (!isComplete) {
      // Wait for a reasonable polling interval
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check generation progress
      const progressResponse = await apiRequest('GET', `/api/session-plans/generation/${generationId}/progress`);
      
      if (!progressResponse.ok) {
        throw new Error('Failed to check generation progress');
      }
      
      const progressData = await progressResponse.json();
      
      // Check if generation is complete
      if (progressData.status === 'completed') {
        isComplete = true;
        
        // Get the generated session plan
        const resultResponse = await apiRequest('GET', `/api/session-plans/generation/${generationId}/result`);
        
        if (!resultResponse.ok) {
          throw new Error('Failed to retrieve generated session plan');
        }
        
        resultData = await resultResponse.json();
      } else if (progressData.status === 'failed') {
        throw new Error(progressData.message || 'Session plan generation failed');
      }
      
      // If not complete, continue polling
    }
    
    // Convert the session plan data to a TrainingSession object
    const sessionPlan = resultData.plan;
    
    // Create a unified training session from the plan
    const trainingSession: TrainingSession = {
      id: sessionPlan.id,
      title: sessionPlan.title,
      description: sessionPlan.description || '',
      objectives: sessionPlan.objectives || [],
      duration: sessionPlan.duration || 0,
      difficulty: sessionPlan.difficulty || 'intermediate',
      prerequisites: sessionPlan.prerequisites || [],
      exercises: sessionPlan.exercises || [],
      resources: sessionPlan.resources.map((resource: any) => ({
        id: resource.id,
        title: resource.name,
        type: 'document',
        url: `/resources/${resource.id}`,
        description: `${resource.type}: ${resource.name}`
      })),
      assessmentCriteria: sessionPlan.assessmentCriteria || []
    };
    
    return trainingSession;
  } catch (error) {
    console.error('Error generating training session:', error);
    throw error;
  }
}

/**
 * Saves a training session to the database
 */
export async function saveTrainingSession(session: TrainingSession): Promise<TrainingSession> {
  try {
    const response = await apiRequest('POST', '/api/session-plans', session);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to save training session');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving training session:', error);
    throw error;
  }
}

/**
 * Gets a training session by ID
 */
export async function getTrainingSession(sessionId: string): Promise<TrainingSession> {
  try {
    const response = await apiRequest('GET', `/api/session-plans/${sessionId}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to retrieve training session');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error retrieving training session:', error);
    throw error;
  }
}

/**
 * Updates an existing training session
 */
export async function updateTrainingSession(sessionId: string, updates: Partial<TrainingSession>): Promise<TrainingSession> {
  try {
    const response = await apiRequest('PATCH', `/api/session-plans/${sessionId}`, updates);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to update training session');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating training session:', error);
    throw error;
  }
}

/**
 * Assigns a training session to a trainee
 */
export async function assignTrainingSession(sessionId: string, traineeId: string, scheduledDate?: Date): Promise<void> {
  try {
    const response = await apiRequest('POST', `/api/session-plans/${sessionId}/assign`, { 
      traineeId, 
      scheduledDate: scheduledDate?.toISOString() 
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to assign training session');
    }
  } catch (error) {
    console.error('Error assigning training session:', error);
    throw error;
  }
}

/**
 * Gets all session templates
 */
export async function getSessionTemplates(): Promise<TrainingSession[]> {
  try {
    const response = await apiRequest('GET', '/api/session-plans/templates');
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to retrieve session templates');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error retrieving session templates:', error);
    throw error;
  }
}

/**
 * Creates a new session template
 */
export async function createSessionTemplate(template: Omit<TrainingSession, 'id' | 'isTemplate'>): Promise<TrainingSession> {
  try {
    const templateData = { ...template, isTemplate: true };
    const response = await apiRequest('POST', '/api/session-plans/templates', templateData);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create session template');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating session template:', error);
    throw error;
  }
}