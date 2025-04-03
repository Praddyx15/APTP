import { Express, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { logger } from '../core/logger';
import { 
  insertProgramSchema, 
  insertModuleSchema, 
  insertLessonSchema,
  insertSessionSchema,
  insertSessionTraineeSchema,
  TrainingProgram,
  Module,
  Lesson,
  Session
} from '@shared/schema';

/**
 * Register training-related routes
 */
export function registerTrainingRoutes(app: Express) {
  /**
   * Get all training programs
   */
  app.get('/api/programs', async (req: Request, res: Response) => {
    try {
      const programs = await storage.getAllPrograms();
      res.json(programs);
    } catch (error) {
      logger.error('Error fetching training programs', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch training programs' });
    }
  });

  /**
   * Get training program by ID
   */
  app.get('/api/programs/:id', async (req: Request, res: Response) => {
    try {
      const programId = parseInt(req.params.id);
      const program = await storage.getProgram(programId);
      
      if (!program) {
        return res.status(404).json({ error: 'Program not found' });
      }
      
      res.json(program);
    } catch (error) {
      logger.error('Error fetching training program', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch training program' });
    }
  });

  /**
   * Create training program
   */
  app.post('/api/programs', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Validate program data
      const programData = insertProgramSchema.parse({
        ...req.body,
        createdById: req.user.id,
      });
      
      // Create program
      const program = await storage.createProgram(programData);
      
      res.status(201).json(program);
    } catch (error) {
      logger.error('Error creating training program', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid program data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to create training program' });
    }
  });

  /**
   * Update training program
   */
  app.put('/api/programs/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const programId = parseInt(req.params.id);
      const program = await storage.getProgram(programId);
      
      if (!program) {
        return res.status(404).json({ error: 'Program not found' });
      }
      
      // Update program
      const updatedProgram = await storage.updateProgram(programId, req.body);
      
      res.json(updatedProgram);
    } catch (error) {
      logger.error('Error updating training program', { context: { error } });
      res.status(500).json({ error: 'Failed to update training program' });
    }
  });

  /**
   * Delete training program
   */
  app.delete('/api/programs/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const programId = parseInt(req.params.id);
      const program = await storage.getProgram(programId);
      
      if (!program) {
        return res.status(404).json({ error: 'Program not found' });
      }
      
      // Check if user has permission (admin or creator)
      if (req.user.role !== 'admin' && program.createdById !== req.user.id) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      // Delete program
      await storage.deleteProgram(programId);
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting training program', { context: { error } });
      res.status(500).json({ error: 'Failed to delete training program' });
    }
  });

  /**
   * Get all modules for a program
   */
  app.get('/api/programs/:id/modules', async (req: Request, res: Response) => {
    try {
      const programId = parseInt(req.params.id);
      const program = await storage.getProgram(programId);
      
      if (!program) {
        return res.status(404).json({ error: 'Program not found' });
      }
      
      const modules = await storage.getModulesByProgram(programId);
      res.json(modules);
    } catch (error) {
      logger.error('Error fetching modules', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch modules' });
    }
  });

  /**
   * Create module for a program
   */
  app.post('/api/programs/:id/modules', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const programId = parseInt(req.params.id);
      const program = await storage.getProgram(programId);
      
      if (!program) {
        return res.status(404).json({ error: 'Program not found' });
      }
      
      // Validate module data
      const moduleData = insertModuleSchema.parse({
        ...req.body,
        programId,
        createdById: req.user.id,
      });
      
      // Create module
      const module = await storage.createModule(moduleData);
      
      res.status(201).json(module);
    } catch (error) {
      logger.error('Error creating module', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid module data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to create module' });
    }
  });

  /**
   * Get module by ID
   */
  app.get('/api/modules/:id', async (req: Request, res: Response) => {
    try {
      const moduleId = parseInt(req.params.id);
      const module = await storage.getModule(moduleId);
      
      if (!module) {
        return res.status(404).json({ error: 'Module not found' });
      }
      
      res.json(module);
    } catch (error) {
      logger.error('Error fetching module', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch module' });
    }
  });

  /**
   * Update module
   */
  app.put('/api/modules/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const moduleId = parseInt(req.params.id);
      const module = await storage.getModule(moduleId);
      
      if (!module) {
        return res.status(404).json({ error: 'Module not found' });
      }
      
      // Update module
      const updatedModule = await storage.updateModule(moduleId, req.body);
      
      res.json(updatedModule);
    } catch (error) {
      logger.error('Error updating module', { context: { error } });
      res.status(500).json({ error: 'Failed to update module' });
    }
  });

  /**
   * Delete module
   */
  app.delete('/api/modules/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const moduleId = parseInt(req.params.id);
      const module = await storage.getModule(moduleId);
      
      if (!module) {
        return res.status(404).json({ error: 'Module not found' });
      }
      
      // Delete module
      await storage.deleteModule(moduleId);
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting module', { context: { error } });
      res.status(500).json({ error: 'Failed to delete module' });
    }
  });

  /**
   * Get all lessons for a module
   */
  app.get('/api/modules/:id/lessons', async (req: Request, res: Response) => {
    try {
      const moduleId = parseInt(req.params.id);
      const module = await storage.getModule(moduleId);
      
      if (!module) {
        return res.status(404).json({ error: 'Module not found' });
      }
      
      const lessons = await storage.getLessonsByModule(moduleId);
      res.json(lessons);
    } catch (error) {
      logger.error('Error fetching lessons', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch lessons' });
    }
  });

  /**
   * Create lesson for a module
   */
  app.post('/api/modules/:id/lessons', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const moduleId = parseInt(req.params.id);
      const module = await storage.getModule(moduleId);
      
      if (!module) {
        return res.status(404).json({ error: 'Module not found' });
      }
      
      // Validate lesson data
      const lessonData = insertLessonSchema.parse({
        ...req.body,
        moduleId,
        createdById: req.user.id,
      });
      
      // Create lesson
      const lesson = await storage.createLesson(lessonData);
      
      res.status(201).json(lesson);
    } catch (error) {
      logger.error('Error creating lesson', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid lesson data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to create lesson' });
    }
  });

  /**
   * Get lesson by ID
   */
  app.get('/api/lessons/:id', async (req: Request, res: Response) => {
    try {
      const lessonId = parseInt(req.params.id);
      const lesson = await storage.getLesson(lessonId);
      
      if (!lesson) {
        return res.status(404).json({ error: 'Lesson not found' });
      }
      
      res.json(lesson);
    } catch (error) {
      logger.error('Error fetching lesson', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch lesson' });
    }
  });

  /**
   * Update lesson
   */
  app.put('/api/lessons/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const lessonId = parseInt(req.params.id);
      const lesson = await storage.getLesson(lessonId);
      
      if (!lesson) {
        return res.status(404).json({ error: 'Lesson not found' });
      }
      
      // Update lesson
      const updatedLesson = await storage.updateLesson(lessonId, req.body);
      
      res.json(updatedLesson);
    } catch (error) {
      logger.error('Error updating lesson', { context: { error } });
      res.status(500).json({ error: 'Failed to update lesson' });
    }
  });

  /**
   * Delete lesson
   */
  app.delete('/api/lessons/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const lessonId = parseInt(req.params.id);
      const lesson = await storage.getLesson(lessonId);
      
      if (!lesson) {
        return res.status(404).json({ error: 'Lesson not found' });
      }
      
      // Delete lesson
      await storage.deleteLesson(lessonId);
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting lesson', { context: { error } });
      res.status(500).json({ error: 'Failed to delete lesson' });
    }
  });

  /**
   * Get all sessions
   */
  app.get('/api/sessions', async (req: Request, res: Response) => {
    try {
      const sessions = await storage.getAllSessions();
      res.json(sessions);
    } catch (error) {
      logger.error('Error fetching sessions', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });

  /**
   * Get sessions by instructor
   */
  app.get('/api/instructor/:id/sessions', async (req: Request, res: Response) => {
    try {
      const instructorId = parseInt(req.params.id);
      const sessions = await storage.getSessionsByInstructor(instructorId);
      res.json(sessions);
    } catch (error) {
      logger.error('Error fetching instructor sessions', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch instructor sessions' });
    }
  });

  /**
   * Get sessions by trainee
   */
  app.get('/api/trainee/:id/sessions', async (req: Request, res: Response) => {
    try {
      const traineeId = parseInt(req.params.id);
      const sessions = await storage.getSessionsByTrainee(traineeId);
      res.json(sessions);
    } catch (error) {
      logger.error('Error fetching trainee sessions', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch trainee sessions' });
    }
  });

  /**
   * Create session
   */
  app.post('/api/sessions', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Validate session data
      const sessionData = insertSessionSchema.parse({
        ...req.body,
        createdById: req.user.id,
      });
      
      // Create session
      const session = await storage.createSession(sessionData);
      
      // Add trainees if provided
      if (req.body.trainees && Array.isArray(req.body.trainees)) {
        for (const traineeId of req.body.trainees) {
          await storage.addTraineeToSession({
            sessionId: session.id,
            traineeId,
          });
        }
      }
      
      res.status(201).json(session);
    } catch (error) {
      logger.error('Error creating session', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid session data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to create session' });
    }
  });

  /**
   * Get session by ID
   */
  app.get('/api/sessions/:id', async (req: Request, res: Response) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      // Get trainees for this session
      const traineeIds = await storage.getSessionTrainees(sessionId);
      
      res.json({
        ...session,
        trainees: traineeIds,
      });
    } catch (error) {
      logger.error('Error fetching session', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch session' });
    }
  });

  /**
   * Update session
   */
  app.put('/api/sessions/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      // Update session
      const updatedSession = await storage.updateSession(sessionId, req.body);
      
      // Update trainees if provided
      if (req.body.trainees && Array.isArray(req.body.trainees)) {
        // Get current trainees
        const currentTraineeIds = await storage.getSessionTrainees(sessionId);
        
        // Remove trainees not in the new list
        for (const traineeId of currentTraineeIds) {
          if (!req.body.trainees.includes(traineeId)) {
            await storage.removeTraineeFromSession(sessionId, traineeId);
          }
        }
        
        // Add new trainees
        for (const traineeId of req.body.trainees) {
          if (!currentTraineeIds.includes(traineeId)) {
            await storage.addTraineeToSession({
              sessionId,
              traineeId,
            });
          }
        }
      }
      
      res.json(updatedSession);
    } catch (error) {
      logger.error('Error updating session', { context: { error } });
      res.status(500).json({ error: 'Failed to update session' });
    }
  });

  /**
   * Delete session
   */
  app.delete('/api/sessions/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      // Delete session
      await storage.deleteSession(sessionId);
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting session', { context: { error } });
      res.status(500).json({ error: 'Failed to delete session' });
    }
  });

  /**
   * Add trainee to session
   */
  app.post('/api/sessions/:id/trainees', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      // Validate trainee data
      const traineeSchema = z.object({
        traineeId: z.number(),
      });
      
      const { traineeId } = traineeSchema.parse(req.body);
      
      // Add trainee to session
      const sessionTrainee = await storage.addTraineeToSession({
        sessionId,
        traineeId,
      });
      
      res.status(201).json(sessionTrainee);
    } catch (error) {
      logger.error('Error adding trainee to session', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid trainee data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to add trainee to session' });
    }
  });

  /**
   * Remove trainee from session
   */
  app.delete('/api/sessions/:sessionId/trainees/:traineeId', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const sessionId = parseInt(req.params.sessionId);
      const traineeId = parseInt(req.params.traineeId);
      
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      // Remove trainee from session
      await storage.removeTraineeFromSession(sessionId, traineeId);
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error removing trainee from session', { context: { error } });
      res.status(500).json({ error: 'Failed to remove trainee from session' });
    }
  });

  /**
   * Get trainees for session
   */
  app.get('/api/sessions/:id/trainees', async (req: Request, res: Response) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      const traineeIds = await storage.getSessionTrainees(sessionId);
      
      // Get trainee details
      const trainees = [];
      for (const traineeId of traineeIds) {
        const trainee = await storage.getUser(traineeId);
        if (trainee) {
          trainees.push(trainee);
        }
      }
      
      res.json(trainees);
    } catch (error) {
      logger.error('Error fetching session trainees', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch session trainees' });
    }
  });

  /**
   * Enroll trainees in a program
   */
  app.post('/api/programs/:id/enroll', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const programId = parseInt(req.params.id);
      const program = await storage.getProgram(programId);
      
      if (!program) {
        return res.status(404).json({ error: 'Program not found' });
      }
      
      // Validate request
      const enrollmentSchema = z.object({
        traineeIds: z.array(z.number()),
      });
      
      const { traineeIds } = enrollmentSchema.parse(req.body);
      
      // Enroll trainees
      const enrollmentResults = await Promise.all(
        traineeIds.map(async (traineeId) => {
          try {
            await storage.enrollTraineeInProgram(programId, traineeId);
            return { traineeId, success: true };
          } catch (error) {
            return { traineeId, success: false, error: (error as Error).message };
          }
        })
      );
      
      res.json({
        programId,
        enrollments: enrollmentResults,
      });
    } catch (error) {
      logger.error('Error enrolling trainees', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid enrollment data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to enroll trainees' });
    }
  });

  /**
   * Get trainees enrolled in a program
   */
  app.get('/api/programs/:id/trainees', async (req: Request, res: Response) => {
    try {
      const programId = parseInt(req.params.id);
      const program = await storage.getProgram(programId);
      
      if (!program) {
        return res.status(404).json({ error: 'Program not found' });
      }
      
      const trainees = await storage.getProgramTrainees(programId);
      res.json(trainees);
    } catch (error) {
      logger.error('Error fetching program trainees', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch program trainees' });
    }
  });

  /**
   * Get trainee progress in a program
   */
  app.get('/api/programs/:programId/trainees/:traineeId/progress', async (req: Request, res: Response) => {
    try {
      const programId = parseInt(req.params.programId);
      const traineeId = parseInt(req.params.traineeId);
      
      const program = await storage.getProgram(programId);
      
      if (!program) {
        return res.status(404).json({ error: 'Program not found' });
      }
      
      const trainee = await storage.getUser(traineeId);
      
      if (!trainee) {
        return res.status(404).json({ error: 'Trainee not found' });
      }
      
      const progress = await storage.getTraineeProgress(programId, traineeId);
      res.json(progress);
    } catch (error) {
      logger.error('Error fetching trainee progress', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch trainee progress' });
    }
  });
}