/**
 * Development server integration for Vite
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Serve the Vite development server in development mode
 */
export function serve(app: express.Express) {
  // In development, Vite runs on its own
  // and we attach it to our Express server
  console.log('Initializing Vite development server...');
  
  const createViteServer = async () => {
    const { createServer } = await import('vite');
    
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: path.resolve(__dirname, '../'),
    });
    
    // Use Vite's connect instance as middleware
    app.use(vite.middlewares);
    
    // Handle client-side routing by serving index.html for any paths not handled by the API
    app.use('*', async (req, res, next) => {
      // Skip API routes
      if (req.originalUrl.startsWith('/api/')) {
        return next();
      }
      
      try {
        // Read index.html
        let template = fs.readFileSync(
          path.resolve(__dirname, '../index.html'),
          'utf-8'
        );
        
        // Apply Vite HTML transforms
        template = await vite.transformIndexHtml(req.originalUrl, template);
        
        // Send the transformed HTML
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        console.error(`Error handling client-side route:`, e);
        next(e);
      }
    });
  };
  
  createViteServer().catch(err => {
    console.error('Failed to initialize Vite server:', err);
  });
}
