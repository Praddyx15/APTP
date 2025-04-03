/**
 * Session Plan Generator Types
 * Type definitions for training session plans
 */

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
  type: 'lecture' | 'demonstration' | 'practice' | 'assessment' | 'discussion' | 'simulation';
  materials?: string[];
  objectives: string[]; // IDs of related objectives
  instructorNotes?: string;
  studentInstructions?: string;
}

export interface AssessmentMethod {
  id: string;
  title: string;
  description: string;
  type: 'oral' | 'written' | 'performance' | 'observation';
  passingCriteria: string;
  objectives: string[]; // IDs of related objectives
  rubric?: {
    criteria: string;
    levels: {
      description: string;
      points: number;
    }[];
  }[];
}

export interface SessionPlan {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  objectives: TrainingObjective[];
  equipment: Equipment[];
  activities: LearningActivity[];
  assessments: AssessmentMethod[];
  preRequisites?: {
    knowledge: string[];
    skills: string[];
    completedSessions?: string[];
  };
  references: {
    id: string;
    title: string;
    source: string;
    location?: string;
    type: 'document' | 'video' | 'website' | 'manual' | 'regulation';
  }[];
  notes?: string;
  version?: string;
  status: 'draft' | 'review' | 'approved' | 'active' | 'archived';
  syllabus_id?: string;
  module_id?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface SessionPlanGenerationOptions {
  title: string;
  description?: string;
  duration?: number;
  objectiveCategories?: ('knowledge' | 'skill' | 'attitude')[];
  objectiveCount?: number;
  objectiveLevel?: 'basic' | 'intermediate' | 'advanced';
  activityTypes?: ('lecture' | 'demonstration' | 'practice' | 'assessment' | 'discussion' | 'simulation')[];
  includedEquipment?: string[];
  assessmentTypes?: ('oral' | 'written' | 'performance' | 'observation')[];
  references?: {
    id: number;
    title: string;
    type: string;
  }[];
  syllabusId?: string;
  moduleId?: string;
  customInstructions?: string;
}