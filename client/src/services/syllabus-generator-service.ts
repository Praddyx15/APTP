/**
 * Syllabus generator service for API interactions
 */

export interface SyllabusGenerationParams {
  title: string;
  description: string;
  type: 'initial' | 'recurrent' | 'conversion' | 'upgrade' | 'specialized';
  regulatoryFramework: string;
  aircraftType?: string;
  targetDuration: number;
  targetAudience: string[];
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
}

export const syllabusGeneratorService = {
  /**
   * Generate a training syllabus
   */
  async generateSyllabus(params: SyllabusGenerationParams) {
    const response = await fetch('/api/syllabuses/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate syllabus');
    }
    
    return await response.json();
  }
};
