/**
 * API routes index
 */

import { Router } from 'express';
import documentRoutes from './document-routes.js';
import knowledgeGraphRoutes from './knowledge-graph-routes.js';

const router = Router();

// Register routes
router.use('/documents', documentRoutes);
router.use('/knowledge-graphs', knowledgeGraphRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default router;
