import { Router, Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth-middleware';
import { knowledgeGraphService } from '../services/knowledge-graph-service';
import { documentAnalysisService } from '../services/document-analysis-service';
import { Logger } from '../utils/logger';

const router = Router();
const logger = new Logger('KnowledgeGraphRoutes');

/**
 * @route POST /api/knowledge-graphs/document/:documentId
 * @desc Create a knowledge graph from a document
 * @access Private
 */
router.post('/document/:documentId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    
    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required'
      });
    }
    
    const graph = await knowledgeGraphService.createGraphFromDocument(documentId);
    
    if (!graph) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create knowledge graph'
      });
    }
    
    return res.status(201).json({
      success: true,
      knowledgeGraph: graph
    });
  } catch (error) {
    logger.error(`Failed to create knowledge graph: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to create knowledge graph',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/knowledge-graphs/multiple
 * @desc Create a knowledge graph from multiple documents
 * @access Private
 */
router.post('/multiple', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { documentIds } = req.body;
    
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Document IDs are required'
      });
    }
    
    const graph = await knowledgeGraphService.createGraphFromMultipleDocuments(documentIds);
    
    if (!graph) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create knowledge graph'
      });
    }
    
    return res.status(201).json({
      success: true,
      knowledgeGraph: graph
    });
  } catch (error) {
    logger.error(`Failed to create knowledge graph: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to create knowledge graph',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/knowledge-graphs
 * @desc Get all knowledge graphs
 * @access Private
 */
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const graphs = await knowledgeGraphService.getAllKnowledgeGraphs();
    
    return res.status(200).json({
      success: true,
      knowledgeGraphs: graphs
    });
  } catch (error) {
    logger.error(`Failed to retrieve knowledge graphs: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve knowledge graphs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/knowledge-graphs/:graphId
 * @desc Get knowledge graph by ID
 * @access Private
 */
router.get('/:graphId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { graphId } = req.params;
    
    if (!graphId) {
      return res.status(400).json({
        success: false,
        message: 'Knowledge graph ID is required'
      });
    }
    
    const graph = await knowledgeGraphService.getKnowledgeGraph(graphId);
    
    if (!graph) {
      return res.status(404).json({
        success: false,
        message: 'Knowledge graph not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      knowledgeGraph: graph
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
 * @route GET /api/knowledge-graphs/document/:documentId
 * @desc Get knowledge graphs for a document
 * @access Private
 */
router.get('/document/:documentId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    
    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required'
      });
    }
    
    const graphs = await knowledgeGraphService.getKnowledgeGraphsForDocument(documentId);
    
    return res.status(200).json({
      success: true,
      knowledgeGraphs: graphs
    });
  } catch (error) {
    logger.error(`Failed to retrieve knowledge graphs: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve knowledge graphs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route DELETE /api/knowledge-graphs/:graphId
 * @desc Delete knowledge graph by ID
 * @access Private
 */
router.delete('/:graphId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { graphId } = req.params;
    
    if (!graphId) {
      return res.status(400).json({
        success: false,
        message: 'Knowledge graph ID is required'
      });
    }
    
    const success = await knowledgeGraphService.deleteKnowledgeGraph(graphId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Knowledge graph not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Knowledge graph deleted successfully'
    });
  } catch (error) {
    logger.error(`Failed to delete knowledge graph: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete knowledge graph',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
