import { Router, Request, Response } from 'express';
import { KnowledgeGraphService } from '../services/knowledge-graph-service';
import { authenticateUser } from '../middleware/auth-middleware';
import { Logger } from '../utils/logger';

const router = Router();
const logger = new Logger('KnowledgeGraphRoutes');
const knowledgeGraphService = new KnowledgeGraphService();

/**
 * @route GET /api/knowledge-graph
 * @desc Get complete knowledge graph data across all documents
 * @access Private
 */
router.get('/', authenticateUser, async (req: Request, res: Response) => {
  try {
    const graph = await knowledgeGraphService.getCompleteKnowledgeGraph(req.user!.id);
    
    return res.status(200).json({
      success: true,
      data: graph
    });
  } catch (error) {
    logger.error(`Failed to retrieve knowledge graph: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve knowledge graph',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/knowledge-graph/document/:documentId
 * @desc Get knowledge graph data for a specific document
 * @access Private
 */
router.get('/document/:documentId', authenticateUser, async (req: Request, res: Response) => {
  try {
    const documentId = req.params.documentId;
    
    const graph = await knowledgeGraphService.getDocumentKnowledgeGraph(documentId, req.user!.id);
    
    if (!graph) {
      return res.status(404).json({
        success: false,
        message: 'Knowledge graph not found for the specified document'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: graph
    });
  } catch (error) {
    logger.error(`Failed to retrieve document knowledge graph: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve document knowledge graph',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/knowledge-graph/search
 * @desc Search for nodes in the knowledge graph
 * @access Private
 */
router.get('/search', authenticateUser, async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    const results = await knowledgeGraphService.searchKnowledgeGraph(query, req.user!.id);
    
    return res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error(`Failed to search knowledge graph: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to search knowledge graph',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/knowledge-graph/node/:nodeId
 * @desc Get details for a specific node and its connected nodes
 * @access Private
 */
router.get('/node/:nodeId', authenticateUser, async (req: Request, res: Response) => {
  try {
    const nodeId = req.params.nodeId;
    
    const nodeDetails = await knowledgeGraphService.getNodeWithConnections(nodeId, req.user!.id);
    
    if (!nodeDetails) {
      return res.status(404).json({
        success: false,
        message: 'Node not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: nodeDetails
    });
  } catch (error) {
    logger.error(`Failed to retrieve node details: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve node details',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/knowledge-graph/categories
 * @desc Get all available concept categories
 * @access Private
 */
router.get('/categories', authenticateUser, async (req: Request, res: Response) => {
  try {
    const categories = await knowledgeGraphService.getConceptCategories(req.user!.id);
    
    return res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    logger.error(`Failed to retrieve concept categories: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve concept categories',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
