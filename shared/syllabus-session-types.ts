/**
 * Types to connect syllabus and session planning
 */

import { GeneratedSyllabus } from './syllabus-types';
import { TrainingSession, SessionResource } from './session-types';

/**
 * Options for session plan generation
 */
export interface SessionPlanGenerationOptions {
  syllabusId: string;
  title: string;
  description?: string;
  templateId?: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  dailyStartTime: string; // Format: HH:MM
  dailyEndTime: string; // Format: HH:MM
  maxSessionsPerDay: number;
  includeLunchBreaks: boolean;
  includeRecapSessions: boolean;
  resourceAllocation: {
    instructors: string[];
    rooms: string[];
    equipment: string[];
  };
  additionalNotes?: string;
}

/**
 * Session plan data structure
 */
export interface SessionPlanData {
  id: string;
  title: string;
  description?: string;
  syllabusId: string;
  sessions: TrainingSession[];
  resources: SessionResource[];
  startDate: string;
  endDate: string;
  status: 'draft' | 'published' | 'archived';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Session plan generation job
 */
export interface SessionPlanGenerationJob {
  id: string;
  options: SessionPlanGenerationOptions;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  result: SessionPlanData | null;
  error: string | null;
  startTime: string;
  endTime: string | null;
}

/**
 * Session template definition
 */
export interface SessionTemplate {
  id: string;
  name: string;
  description: string;
  sessionTypes: {
    type: string;
    defaultDuration: number; // minutes
    description: string;
  }[];
  defaultSequence: string[]; // Types in recommended order
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response for session plan generation
 */
export interface SessionPlanGenerationResponse {
  success: boolean;
  jobId?: string;
  error?: string;
  message: string;
}