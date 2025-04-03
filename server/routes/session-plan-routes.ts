/**
 * Session Plan Routes
 * 
 * API routes for generating, retrieving, and managing session plans
 */
import express, { Express, Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth-middleware';
import { SessionPlanGeneratorService } from '../services/session/session-plan-generator-service';
import { Logger } from '../utils/logger';

const router = express.Router();
const logger = new Logger('SessionPlanRoutes');
const sessionPlanService = new SessionPlanGeneratorService();

/**
 * Generate a new session plan
 * POST /api/session-plans/generate
 */
router.post('/generate', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    
    // Validate permissions
    if (!['admin', 'ato', 'instructor', 'airline'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot generate session plans'
      });
    }
    
    // Generate session plan
    const generationResult = await sessionPlanService.startSessionPlanGeneration({
      ...req.body,
      createdBy: userId
    });
    
    return res.status(202).json({
      success: true,
      message: 'Session plan generation started',
      generationId: generationResult.generationId,
      progress: generationResult.progress
    });
  } catch (error) {
    logger.error(`Error generating session plan: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate session plan',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get session plan generation progress
 * GET /api/session-plans/generation/:id/progress
 */
router.get('/generation/:id/progress', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get progress
    const progress = await sessionPlanService.getSessionPlanGenerationProgress(id);
    
    return res.status(200).json({
      success: true,
      progress
    });
  } catch (error) {
    logger.error(`Error getting session plan progress: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get session plan generation progress',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get a generated session plan
 * GET /api/session-plans/generation/:id/result
 */
router.get('/generation/:id/result', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get generated plan
    const plan = await sessionPlanService.getGeneratedSessionPlan(id);
    
    return res.status(200).json({
      success: true,
      plan
    });
  } catch (error) {
    logger.error(`Error getting generated session plan: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get generated session plan',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Save a session plan after generation
 * POST /api/session-plans
 */
router.post('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    
    // Validate permissions
    if (!['admin', 'ato', 'instructor', 'airline'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot save session plans'
      });
    }
    
    // Save the session plan
    const result = await sessionPlanService.saveSessionPlan(req.body, userId);
    
    return res.status(201).json({
      success: true,
      message: 'Session plan saved successfully',
      sessionPlan: result
    });
  } catch (error) {
    logger.error(`Error saving session plan: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to save session plan',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get all session templates
 * GET /api/session-plans/templates
 */
router.get('/templates', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Get templates
    const templates = await sessionPlanService.getSessionTemplates();
    
    return res.status(200).json({
      success: true,
      templates
    });
  } catch (error) {
    logger.error(`Error getting session templates: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get session templates',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create a new session template
 * POST /api/session-plans/templates
 */
router.post('/templates', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    
    // Validate permissions
    if (!['admin', 'ato', 'instructor', 'airline'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot create session templates'
      });
    }
    
    // Create template
    const template = await sessionPlanService.createSessionTemplate(req.body, userId);
    
    return res.status(201).json({
      success: true,
      message: 'Session template created successfully',
      template
    });
  } catch (error) {
    logger.error(`Error creating session template: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to create session template',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get all session plans
 * GET /api/session-plans
 */
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    
    // Get session plans
    const result = await sessionPlanService.getSessionPlans(req.user.id, page, pageSize);
    
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error(`Error getting session plans: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get session plans',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get a specific session plan
 * GET /api/session-plans/:id
 */
router.get('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get session plan
    const sessionPlan = await sessionPlanService.getSessionPlanById(id);
    
    if (!sessionPlan) {
      return res.status(404).json({
        success: false,
        message: 'Session plan not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      sessionPlan
    });
  } catch (error) {
    logger.error(`Error getting session plan: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get session plan',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update a session plan
 * PATCH /api/session-plans/:id
 */
router.patch('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Validate permissions
    if (!['admin', 'ato', 'instructor', 'airline'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot update session plans'
      });
    }
    
    // Update session plan
    const result = await sessionPlanService.updateSessionPlan(id, req.body, userId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Session plan not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Session plan updated successfully',
      sessionPlan: result
    });
  } catch (error) {
    logger.error(`Error updating session plan: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to update session plan',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Delete a session plan
 * DELETE /api/session-plans/:id
 */
router.delete('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Validate permissions
    if (!['admin', 'ato', 'instructor', 'airline'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot delete session plans'
      });
    }
    
    // Delete session plan
    const success = await sessionPlanService.deleteSessionPlan(id, userId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Session plan not found or you do not have permission to delete it'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Session plan deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting session plan: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete session plan',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Register session plan routes
 */
export function registerSessionPlanRoutes(app: Express) {
  app.use('/api/session-plans', router);
  console.log('Session plan routes registered');
}

export default router;