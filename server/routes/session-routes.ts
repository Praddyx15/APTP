/**
 * Session management API routes
 * Handles training session creation, updates, and retrieval
 */
import express, { Express, Request, Response } from 'express';
import { sessionService } from '../services/session-service';
import { isAuthenticated } from '../middleware/auth-middleware';
import { SessionCreateRequest, SessionUpdateRequest } from '@shared/session-types';

const router = express.Router();

/**
 * Get all sessions (for admin, ATO, airline)
 * GET /api/sessions
 */
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Parse query parameters for filtering
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      type: req.query.type as string,
      status: req.query.status as string
    };

    // Only allow certain roles to view all sessions
    if (!['admin', 'ato', 'airline'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot view all sessions'
      });
    }

    const sessions = await sessionService.getAllSessions(filters);
    
    return res.status(200).json({
      success: true,
      sessions,
      total: sessions.length
    });
  } catch (error) {
    console.error('Error getting sessions:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get a specific session by ID
 * GET /api/sessions/:id
 */
router.get('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = await sessionService.getSessionById(id);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Error getting session:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get sessions for a specific trainee
 * GET /api/sessions/trainee/:traineeId
 */
router.get('/trainee/:traineeId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { traineeId } = req.params;
    
    // Check if user is requesting their own data or has admin/ato permission
    if (req.user.id !== traineeId && !['admin', 'ato', 'airline'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot view sessions for this trainee'
      });
    }
    
    const sessions = await sessionService.getTraineeSessions(traineeId);
    
    return res.status(200).json({
      success: true,
      sessions,
      total: sessions.length
    });
  } catch (error) {
    console.error('Error getting trainee sessions:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get sessions for a specific instructor
 * GET /api/sessions/instructor/:instructorId
 */
router.get('/instructor/:instructorId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { instructorId } = req.params;
    
    // Check if user is requesting their own data or has admin/ato permission
    if (req.user.id !== instructorId && !['admin', 'ato', 'airline'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot view sessions for this instructor'
      });
    }
    
    const sessions = await sessionService.getInstructorSessions(instructorId);
    
    return res.status(200).json({
      success: true,
      sessions,
      total: sessions.length
    });
  } catch (error) {
    console.error('Error getting instructor sessions:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get upcoming sessions for dashboard
 * GET /api/sessions/dashboard/upcoming
 */
router.get('/dashboard/upcoming', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const sessions = await sessionService.getUpcomingSessions(
      req.user.id,
      req.user.role
    );
    
    return res.status(200).json({
      success: true,
      sessions,
      total: sessions.length
    });
  } catch (error) {
    console.error('Error getting upcoming sessions:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Create a new session
 * POST /api/sessions
 */
router.post('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Check if user has permission to create sessions
    if (!['admin', 'ato', 'instructor', 'airline'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot create sessions'
      });
    }
    
    const sessionData: SessionCreateRequest = req.body;
    
    const result = await sessionService.createSession(sessionData, req.user.id);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    return res.status(201).json(result);
  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Update an existing session
 * PUT /api/sessions/:id
 */
router.put('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Check if user has permission to update sessions
    if (!['admin', 'ato', 'instructor', 'airline'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot update sessions'
      });
    }
    
    const { id } = req.params;
    const sessionData: SessionUpdateRequest = {
      ...req.body,
      id
    };
    
    const result = await sessionService.updateSession(sessionData, req.user.id);
    
    if (!result.success) {
      return res.status(result.error === 'not_found' ? 404 : 400).json(result);
    }
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error updating session:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Delete a session
 * DELETE /api/sessions/:id
 */
router.delete('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Check if user has permission to delete sessions
    if (!['admin', 'ato', 'airline'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot delete sessions'
      });
    }
    
    const { id } = req.params;
    
    const result = await sessionService.deleteSession(id, req.user.id);
    
    if (!result.success) {
      return res.status(result.error === 'not_found' ? 404 : 400).json(result);
    }
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error deleting session:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Register session routes with the Express app
 */
export function registerSessionRoutes(app: Express) {
  app.use('/api/sessions', router);
  console.log('Session routes registered');
}

// Export the router for use in testing
export default router;