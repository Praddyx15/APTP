/**
 * Types related to training syllabuses in the system
 */

/**
 * Course types
 */
export type CourseType = 'ppl' | 'cpl' | 'atpl' | 'ir' | 'type_rating' | 'recurrent' | 'custom';

/**
 * Syllabus entity
 */
export interface Syllabus {
  id: number;
  title: string;
  description: string;
  courseType: CourseType;
  regulationRef?: string;
  totalHours: number;
  overview?: string;
  prerequisites?: string;
  objectives?: string;
  assessmentStrategy?: string;
  createdById: number;
  createdAt?: Date;
  updatedAt?: Date;
  phases?: SyllabusPhase[];
  units?: SyllabusUnit[];
}

/**
 * Syllabus phase entity
 */
export interface SyllabusPhase {
  id: number;
  syllabusId: number;
  name: string;
  description: string;
  sequence: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Syllabus unit entity
 */
export interface SyllabusUnit {
  id: number;
  syllabusId: number;
  phaseId: number;
  title: string;
  description: string;
  hours: number;
  sequence: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Syllabus unit content entity
 */
export interface SyllabusUnitContent {
  id: number;
  unitId: number;
  contentType: string;
  content: string;
  sequence: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Request to generate a syllabus
 */
export interface SyllabusGenerationRequest {
  title: string;
  description: string;
  courseType: string;
  regulationRef?: string;
  totalHours: number;
  documentId?: number;
  templateId?: number;
  userId: number;
}

/**
 * Syllabus import schema
 */
export interface SyllabusImportSchema {
  title: string;
  description: string;
  courseType: string;
  regulationRef?: string;
  totalHours: number;
  overview?: string;
  prerequisites?: string;
  objectives?: string;
  assessmentStrategy?: string;
  phases: {
    name: string;
    description: string;
    sequence: number;
    units: {
      title: string;
      description: string;
      hours: number;
      sequence: number;
    }[];
  }[];
}

/**
 * Syllabus export format
 */
export interface SyllabusExport {
  metadata: {
    title: string;
    description: string;
    courseType: string;
    regulationRef?: string;
    totalHours: number;
    exportDate: string;
    exportVersion: string;
  };
  content: {
    overview?: string;
    prerequisites?: string;
    objectives?: string;
    assessmentStrategy?: string;
    phases: {
      name: string;
      description: string;
      sequence: number;
      units: {
        title: string;
        description: string;
        hours: number;
        sequence: number;
      }[];
    }[];
  };
}
