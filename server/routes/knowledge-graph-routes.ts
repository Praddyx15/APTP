/**
 * Knowledge graph API routes
 */

import { Router, Request, Response } from 'express';
import { knowledgeGraphService } from '../services/knowledge-graph-service.js';
import { GraphSearchOptions } from '../shared/knowledge-graph-types.js';
import { logger } from '../utils/logger.js';

// Create router
const router = Router();
const serviceLogger = logger.child('KnowledgeGraphRoutes');

// Authentication middleware
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// GET /api/knowledge-graphs - Get all knowledge graphs
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const documentId = req.query.documentId ? parseInt(req.query.documentId as string) : undefined;
    const createdBy = req.query.createdBy ? parseInt(req.query.createdBy as string) : undefined;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const graphs = await knowledgeGraphService.getAllKnowledgeGraphs({
      documentId,
      createdBy,
      limit,
      offset
    });
    
    res.json(graphs);
  } catch (error) {
    serviceLogger.error(`Error in GET /knowledge-graphs: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/knowledge-graphs/:id - Get knowledge graph by ID
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    const graph = await knowledgeGraphService.getKnowledgeGraph(id);
    if (!graph) {
      return res.status(404).json({ error: 'Knowledge graph not found' });
    }
    
    res.json(graph);
  } catch (error) {
    serviceLogger.error(`Error in GET /knowledge-graphs/:id: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/knowledge-graphs/:id/search - Search within a knowledge graph
router.get('/:id/search', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    // Extract search options from query parameters
    const searchOptions: GraphSearchOptions = {
      query: req.query.query as string,
      nodeTypes: req.query.nodeTypes ? (req.query.nodeTypes as string).split(',') : undefined,
      edgeTypes: req.query.edgeTypes ? (req.query.edgeTypes as string).split(',') : undefined,
      startNodeId: req.query.startNodeId as string,
      maxDepth: req.query.maxDepth ? parseInt(req.query.maxDepth as string) : undefined,
      maxResults: req.query.maxResults ? parseInt(req.query.maxResults as string) : undefined,
      includeHidden: req.query.includeHidden === 'true'
    };
    
    // Perform search
    const results = await knowledgeGraphService.searchGraph(id, searchOptions);
    
    res.json(results);
  } catch (error) {
    serviceLogger.error(`Error in GET /knowledge-graphs/:id/search: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
