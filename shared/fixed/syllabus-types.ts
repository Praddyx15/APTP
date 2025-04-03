/**
 * Syllabus Types
 * Contains type definitions for syllabus generation and management
 */
import { z } from 'zod';

/**
 * Syllabus generation options
 */
export interface SyllabusGenerationOptions {
  templateId?: string;
  title: string;
  description: string;
  courseLength: 'short' | 'standard' | 'extended' | 'comprehensive';
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  includeCategories?: string[];
  additionalNotes?: string;
  includeKnowledgeGraph?: boolean;
  userId?: number;
}

/**
 * Zod schema for syllabus generation options
 */
export const syllabusGenerationOptionsSchema = z.object({
  templateId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  courseLength: z.enum(['short', 'standard', 'extended', 'comprehensive']),
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  includeCategories: z.array(z.string()).optional(),
  additionalNotes: z.string().optional(),
  includeKnowledgeGraph: z.boolean().optional(),
  userId: z.number().optional()
});

/**
 * Syllabus import schema
 */
export const syllabusImportSchema = z.object({
  documentId: z.number(),
  options: syllabusGenerationOptionsSchema
});

/**
 * Syllabus generation progress tracking
 */
export interface SyllabusGenerationProgress {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  stage: string;
  percent: number;
  message: string;
  startTime: string;
  endTime: string | null;
}

/**
 * Syllabus unit
 */
export interface SyllabusUnit {
  title: string;
  description: string;
  duration: number; // in hours
  learningObjectives: SyllabusObjective[];
  concepts: string[];
}

/**
 * Syllabus objective
 */
export interface SyllabusObjective {
  id: string;
  description: string;
  type: 'knowledge' | 'skill' | 'attitude';
  bloomLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
}

/**
 * Syllabus assessment
 */
export interface SyllabusAssessment {
  id: string;
  title: string;
  description: string;
  type: 'quiz' | 'exercise' | 'exam' | 'practical';
  passingScore: number;
  duration: number; // in minutes
  questions?: {
    id: string;
    text: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
    options?: string[];
    correctAnswer?: string | string[];
    points: number;
  }[];
}

/**
 * Syllabus module
 */
export interface SyllabusModule {
  name: string;
  type: 'ground_school' | 'simulator' | 'flight' | 'briefing' | 'debriefing';
  recommendedDuration: number; // in hours
}

/**
 * Syllabus lesson
 */
export interface SyllabusLesson {
  name: string;
  type: 'theory' | 'demonstration' | 'practice' | 'assessment';
  content: string;
  duration: number; // in minutes
  moduleIndex: number;
}

/**
 * Regulatory compliance
 */
export interface RegulatoryCompliance {
  authority: string;
  regulations: {
    id: string;
    title: string;
    reference: string;
    complianceNotes: string;
  }[];
  complianceStatus: 'compliant' | 'partial' | 'pending_review';
}

/**
 * Generated syllabus
 */
export interface GeneratedSyllabus {
  id: string;
  name: string;
  description: string;
  programType: string;
  aircraftType?: string;
  totalDuration: number; // in days
  units: SyllabusUnit[];
  assessments: SyllabusAssessment[];
  modules: SyllabusModule[];
  lessons: SyllabusLesson[];
  regulatoryCompliance: RegulatoryCompliance;
  resources: {
    id: string;
    title: string;
    type: string;
    url: string;
  }[];
  createdAt: string;
  createdBy: number;
}

/**
 * Syllabus template
 */
export interface SyllabusTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  suitableFor: string[];
  structure: {
    units: Partial<SyllabusUnit>[];
    assessmentTypes: {
      type: string;
      count: number;
      description: string;
    }[];
  };
}

/**
 * Training program
 */
export interface TrainingProgram {
  id: number;
  name: string;
  description: string;
  programType: string;
  aircraftType: string;
  regulatoryAuthority: string;
  durationDays: number;
  status: string;
  createdById: number;
  createdAt: Date;
  updatedAt: Date;
}