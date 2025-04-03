/**
 * Syllabus Schemas
 * Zod validation schemas for syllabus-related functionality
 */
import { z } from 'zod';
import { SyllabusGenerationOptions } from './syllabus-types';

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