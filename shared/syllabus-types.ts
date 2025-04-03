/**
 * Syllabus Generator Types
 * Type definitions for aviation training syllabuses
 */

import { TrainingObjective } from './session-plan-types';

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
  source: string;
  type: 'regulatory' | 'organizational' | 'industry' | 'custom';
  reference?: string;
  modules?: string[]; // IDs of modules that address this requirement
}

export interface SyllabusResource {
  id: string;
  title: string;
  type: 'document' | 'manual' | 'video' | 'interactive' | 'equipment' | 'facility';
  description?: string;
  location?: string;
  access_instructions?: string;
  modules?: string[]; // IDs of modules that use this resource
}

export interface SyllabusProgression {
  id: string;
  title: string;
  description: string;
  milestones: {
    id: string;
    title: string;
    description: string;
    requiredModules: string[];
    assessments: {
      id: string;
      title: string;
      type: 'knowledge' | 'performance' | 'combined';
      passingCriteria: string;
    }[];
  }[];
}

export interface TrainingSyllabus {
  id: string;
  title: string;
  description: string;
  version: string;
  status: 'draft' | 'review' | 'approved' | 'active' | 'archived';
  effective_date?: string;
  expiry_date?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  certificate_type?: string;
  rating_type?: string;
  regulatory_basis?: string[];
  target_audience?: string;
  prerequisites?: {
    certificates?: string[];
    ratings?: string[];
    experience?: string;
    knowledge?: string;
    other?: string;
  };
  modules: SyllabusModule[];
  requirements?: SyllabusRequirement[];
  resources?: SyllabusResource[];
  progression?: SyllabusProgression;
  notes?: string;
  references?: {
    id: string;
    title: string;
    type: string;
    source: string;
  }[];
  metadata?: {
    [key: string]: any;
  };
}

export interface SyllabusGenerationOptions {
  title: string;
  description?: string;
  certificateType?: string;
  ratingType?: string;
  regulatoryBasis?: string[];
  targetAudience?: string;
  prerequisites?: {
    certificates?: string[];
    ratings?: string[];
    experience?: string;
  };
  moduleCount?: number;
  includeSimulator?: boolean;
  includeAircraft?: boolean;
  duration?: number; // Total duration in hours
  customInstructions?: string;
  useDocuments?: number[]; // Document IDs to use as sources
}