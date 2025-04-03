/**
 * Session plan service for API interactions
 */

export interface SessionPlanGenerationParams {
  title: string;
  description: string;
  syllabusId: string;
  objectiveDescriptions: string[];
  duration: number;
  equipmentList?: Array<{
    name: string;
    type: string;
    required: boolean;
  }>;
  activityStructure?: 'standard' | 'intensive' | 'custom';
}

export const sessionPlanService = {
  /**
   * Generate a session plan
   */
  async generateSessionPlan(params: SessionPlanGenerationParams) {
    const response = await fetch('/api/session-plans/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate session plan');
    }
    
    return await response.json();
  }
};
