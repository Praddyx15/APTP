/**
 * V1 API Router
 * 
 * This module consolidates all v1 API routes into a single router
 */

import { Router } from 'express';
import userRoutes from './routes/v1-user-routes';
import documentRoutes from './routes/v1-document-routes';

const v1Router = Router();

// Mount all v1 API routes
v1Router.use(userRoutes);
v1Router.use(documentRoutes);

// Health check endpoint
v1Router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: 'v1',
    timestamp: new Date().toISOString()
  });
});

export default v1Router;