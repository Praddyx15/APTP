import { Express, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { logger } from '../core/logger';
import { generateSyllabusFromDocument } from '../services/syllabus-generator';
import { SyllabusGenerationOptions, SyllabusTemplate, GeneratedSyllabus, syllabusGenerationOptionsSchema } from '@shared/syllabus-types';
import { ExtractedCompetency, ExtractedModule, ExtractedLesson } from '@shared/syllabus-types';
import { extractTextFromDocument } from '../services/document-extraction';
import { v4 as uuidv4 } from 'uuid';

// Track ongoing generations
const activeGenerations = new Map<string, {
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  documentId: number;
  syllabusId?: number;
  options: SyllabusGenerationOptions;
  error?: string;
  startTime: Date;
}>();

/**
 * Register syllabus-related routes
 */
export function registerSyllabusRoutes(app: Express) {
  /**
   * Get all syllabus templates
   */
  app.get('/api/syllabus/templates', async (req: Request, res: Response) => {
    try {
      const templates = await storage.getAllSyllabusTemplates();
      res.json(templates);
    } catch (error) {
      logger.error('Error fetching syllabus templates', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch syllabus templates' });
    }
  });

  /**
   * Get syllabus template by ID
   */
  app.get('/api/syllabus/templates/:id', async (req: Request, res: Response) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getSyllabusTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      res.json(template);
    } catch (error) {
      logger.error('Error fetching syllabus template', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch syllabus template' });
    }
  });

  /**
   * Create syllabus template
   */
  app.post('/api/syllabus/templates', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Validate template data
      const templateSchema = z.object({
        name: z.string(),
        description: z.string(),
        programType: z.string(),
        aircraftType: z.string().optional(),
        regulatoryAuthority: z.string().optional(),
        modules: z.array(z.any()),
        lessons: z.array(z.any()),
        createdById: z.number(),
      });
      
      const templateData = templateSchema.parse({
        ...req.body,
        createdById: req.user.id,
      });
      
      // Create template
      const template = await storage.createSyllabusTemplate(templateData);
      
      res.status(201).json(template);
    } catch (error) {
      logger.error('Error creating syllabus template', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid template data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to create syllabus template' });
    }
  });

  /**
   * Update syllabus template
   */
  app.put('/api/syllabus/templates/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const templateId = parseInt(req.params.id);
      const template = await storage.getSyllabusTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      // Update template
      const updatedTemplate = await storage.updateSyllabusTemplate(templateId, req.body);
      
      res.json(updatedTemplate);
    } catch (error) {
      logger.error('Error updating syllabus template', { context: { error } });
      res.status(500).json({ error: 'Failed to update syllabus template' });
    }
  });

  /**
   * Delete syllabus template
   */
  app.delete('/api/syllabus/templates/:id', async (req: Request, res: Response) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getSyllabusTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      // Delete template
      await storage.deleteSyllabusTemplate(templateId);
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting syllabus template', { context: { error } });
      res.status(500).json({ error: 'Failed to delete syllabus template' });
    }
  });

  /**
   * Generate syllabus from document
   */
  app.post('/api/syllabus/generate', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Validate request schema
      const requestSchema = z.object({
        documentId: z.number(),
        options: syllabusGenerationOptionsSchema,
      });
      
      const { documentId, options } = requestSchema.parse(req.body);
      
      // Get document
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Create a generation ID
      const generationId = uuidv4();
      
      // Store the generation status
      activeGenerations.set(generationId, {
        progress: 0,
        status: 'pending',
        documentId,
        options,
        startTime: new Date(),
      });
      
      // Start the generation process in the background
      processSyllabusGeneration(generationId, documentId, options, req.user.id);
      
      // Return the generation ID immediately
      res.status(202).json({
        message: 'Syllabus generation started',
        generationId,
      });
    } catch (error) {
      logger.error('Error starting syllabus generation', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to start syllabus generation' });
    }
  });

  /**
   * Get syllabus generation progress
   */
  app.get('/api/syllabus/generation/:id/progress', (req: Request, res: Response) => {
    try {
      const generationId = req.params.id;
      const generation = activeGenerations.get(generationId);
      
      if (!generation) {
        return res.status(404).json({ error: 'Generation not found' });
      }
      
      // Return the progress
      res.json({
        progress: generation.progress,
        status: generation.status,
        documentId: generation.documentId,
        syllabusId: generation.syllabusId,
        startTime: generation.startTime,
        error: generation.error,
      });
    } catch (error) {
      logger.error('Error getting syllabus generation progress', { context: { error } });
      res.status(500).json({ error: 'Failed to get generation progress' });
    }
  });

  /**
   * Get syllabus by ID
   */
  app.get('/api/syllabus/:id', async (req: Request, res: Response) => {
    try {
      const syllabusId = parseInt(req.params.id);
      const program = await storage.getProgram(syllabusId);
      
      if (!program) {
        return res.status(404).json({ error: 'Syllabus not found' });
      }
      
      // Get modules and lessons for this syllabus
      const modules = await storage.getModulesByProgram(syllabusId);
      const allLessons = [];
      
      for (const module of modules) {
        const lessons = await storage.getLessonsByModule(module.id);
        allLessons.push(...lessons);
      }
      
      // Return the full syllabus data
      res.json({
        ...program,
        modules,
        lessons: allLessons,
      });
    } catch (error) {
      logger.error('Error fetching syllabus', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch syllabus' });
    }
  });

  /**
   * Get all syllabi
   */
  app.get('/api/syllabus', async (req: Request, res: Response) => {
    try {
      const programs = await storage.getAllPrograms();
      res.json(programs);
    } catch (error) {
      logger.error('Error fetching syllabi', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch syllabi' });
    }
  });
}

/**
 * Process syllabus generation
 */
async function processSyllabusGeneration(
  generationId: string,
  documentId: number,
  options: SyllabusGenerationOptions,
  userId: number
): Promise<void> {
  try {
    // Update status to processing
    const generation = activeGenerations.get(generationId);
    if (!generation) return;
    
    generation.status = 'processing';
    activeGenerations.set(generationId, generation);
    
    // Create a progress updater function
    const updateProgress = (progress: number) => {
      const gen = activeGenerations.get(generationId);
      if (gen) {
        gen.progress = progress;
        activeGenerations.set(generationId, gen);
      }
    };
    
    // Start at 10%
    updateProgress(10);
    
    // Generate syllabus
    const syllabus = await generateSyllabusFromDocument(documentId, options);
    
    // Update progress to 70%
    updateProgress(70);
    
    // Save the syllabus as a training program
    const program = await storage.saveSyllabusAsProgram(syllabus, userId);
    
    // Update progress to 100%
    updateProgress(100);
    
    // Update generation status
    const updatedGeneration = activeGenerations.get(generationId);
    if (updatedGeneration) {
      updatedGeneration.status = 'completed';
      updatedGeneration.syllabusId = program.id;
      activeGenerations.set(generationId, updatedGeneration);
      
      // Remove the generation from active generations after 1 hour
      setTimeout(() => {
        activeGenerations.delete(generationId);
      }, 60 * 60 * 1000);
    }
  } catch (error) {
    logger.error('Error generating syllabus', { context: { error, documentId, generationId } });
    
    // Update generation status
    const updatedGeneration = activeGenerations.get(generationId);
    if (updatedGeneration) {
      updatedGeneration.status = 'failed';
      updatedGeneration.error = error instanceof Error ? error.message : 'Unknown error';
      activeGenerations.set(generationId, updatedGeneration);
      
      // Remove the generation from active generations after 1 hour
      setTimeout(() => {
        activeGenerations.delete(generationId);
      }, 60 * 60 * 1000);
    }
  }
}