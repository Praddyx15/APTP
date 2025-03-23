// services/syllabusService.ts
import apiClient, { ApiResponse } from './api';

// Learning objective
export interface LearningObjective {
  id: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  regulatoryReferences?: {
    standard: string;
    section: string;
    text: string;
  }[];
}

// Competency area
export interface CompetencyArea {
  id: string;
  name: string;
  description: string;
  objectives: LearningObjective[];
}

// Exercise type
export type ExerciseType = 
  'theoretical' | 
  'practical' | 
  'simulation' | 
  'assessment' | 
  'demonstration';

// Exercise
export interface Exercise {
  id: string;
  title: string;
  description: string;
  type: ExerciseType;
  duration: number; // in minutes
  objectives: string[]; // IDs of learning objectives
  prerequisites?: string[]; // IDs of other exercises
  resources?: string[]; // References to training materials
}

// Lesson
export interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  exercises: Exercise[];
}

// Module
export interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
  competencyAreas: string[]; // IDs of competency areas
}

// Syllabus
export interface Syllabus {
  id: string;
  title: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  modules: Module[];
  regulatoryStandards: {
    name: string;
    version: string;
    reference: string;
  }[];
  tags: string[];
}

// Syllabus Template
export interface SyllabusTemplate {
  id: string;
  title: string;
  description: string;
  regulatoryStandards: {
    name: string;
    version: string;
    reference: string;
  }[];
  modules: Partial<Module>[];
}

// Syllabus service
class SyllabusService {
  private readonly baseUrl = '/syllabus';

  // Get all syllabi
  async getAllSyllabi(): Promise<Syllabus[]> {
    const response = await apiClient.get<Syllabus[]>(`${this.baseUrl}`);
    return response.data;
  }

  // Get syllabus by ID
  async getSyllabus(id: string): Promise<Syllabus> {
    const response = await apiClient.get<Syllabus>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  // Create a new syllabus
  async createSyllabus(syllabus: Omit<Syllabus, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<Syllabus> {
    const response = await apiClient.post<Syllabus>(`${this.baseUrl}`, syllabus);
    return response.data;
  }

  // Update an existing syllabus
  async updateSyllabus(id: string, syllabus: Partial<Syllabus>): Promise<Syllabus> {
    const response = await apiClient.put<Syllabus>(`${this.baseUrl}/${id}`, syllabus);
    return response.data;
  }

  // Delete a syllabus
  async deleteSyllabus(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  // Get syllabus version history
  async getSyllabusVersions(id: string): Promise<Syllabus[]> {
    const response = await apiClient.get<Syllabus[]>(`${this.baseUrl}/${id}/versions`);
    return response.data;
  }

  // Get a specific version of a syllabus
  async getSyllabusVersion(id: string, version: string): Promise<Syllabus> {
    const response = await apiClient.get<Syllabus>(`${this.baseUrl}/${id}/versions/${version}`);
    return response.data;
  }

  // Get all competency areas
  async getAllCompetencyAreas(): Promise<CompetencyArea[]> {
    const response = await apiClient.get<CompetencyArea[]>(`${this.baseUrl}/competency-areas`);
    return response.data;
  }

  // Get all learning objectives
  async getAllLearningObjectives(): Promise<LearningObjective[]> {
    const response = await apiClient.get<LearningObjective[]>(`${this.baseUrl}/learning-objectives`);
    return response.data;
  }

  // Generate syllabus from documents
  async generateSyllabus(
    documentIds: string[], 
    options: {
      title: string;
      description?: string;
      regulatoryStandards?: string[];
      tags?: string[];
    }
  ): Promise<Syllabus> {
    const response = await apiClient.post<Syllabus>(`${this.baseUrl}/generate`, {
      documentIds,
      ...options
    });
    return response.data;
  }

  // Get all syllabus templates
  async getAllTemplates(): Promise<SyllabusTemplate[]> {
    const response = await apiClient.get<SyllabusTemplate[]>(`${this.baseUrl}/templates`);
    return response.data;
  }

  // Get template by ID
  async getTemplate(id: string): Promise<SyllabusTemplate> {
    const response = await apiClient.get<SyllabusTemplate>(`${this.baseUrl}/templates/${id}`);
    return response.data;
  }

  // Create syllabus from template
  async createFromTemplate(
    templateId: string,
    options: {
      title: string;
      description?: string;
      customizations?: {
        addModules?: Partial<Module>[];
        removeModuleIds?: string[];
        modifyModules?: {
          id: string;
          changes: Partial<Module>;
        }[];
      };
    }
  ): Promise<Syllabus> {
    const response = await apiClient.post<Syllabus>(
      `${this.baseUrl}/templates/${templateId}/create`,
      options
    );
    return response.data;
  }

  // Check regulatory compliance
  async checkCompliance(
    syllabusId: string,
    standard: string
  ): Promise<{
    isCompliant: boolean;
    missingRequirements: {
      requirement: string;
      description: string;
      severity: 'critical' | 'major' | 'minor';
    }[];
    complianceScore: number;
    recommendations: string[];
  }> {
    const response = await apiClient.get<{
      isCompliant: boolean;
      missingRequirements: {
        requirement: string;
        description: string;
        severity: 'critical' | 'major' | 'minor';
      }[];
      complianceScore: number;
      recommendations: string[];
    }>(`${this.baseUrl}/${syllabusId}/compliance/${standard}`);
    return response.data;
  }
}

export const syllabusService = new SyllabusService();
export default syllabusService;
