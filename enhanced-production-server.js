/**
 * Advanced Pilot Training Platform - Enhanced Production Server
 * 
 * This server is designed to work around the Replit host restrictions by:
 * 1. Setting proper CORS headers
 * 2. Serving the static files with the right content-type
 * 3. Handling API requests
 * 4. Making the application accessible from Replit domains
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { configureHostAccess } from './public-server.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// First run the environment setup
import setupViteEnvironment from './vite-env-setup.js';
setupViteEnvironment();

// Import the server index dynamically to get API routes
import { dirname } from 'path';

// Configuration
const PORT = process.env.PORT || 5001;
const DIST_DIR = path.join(__dirname, 'dist');

async function startServer() {
  // Create Express app
  const app = express();
  
  // Log requests in development mode
  app.use(morgan('dev'));

  // Use middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP to avoid issues with inline scripts
  }));
  app.use(compression());
  app.use(express.json());
  
  // Configure CORS
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept']
  }));
  
  // Add additional headers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, X-Auth-Token, X-Requested-With');
    next();
  });
  
  // Configure host access based on allowed hosts in environment
  configureHostAccess(app);
  
  // Dynamically import the server API routes
  try {
    const { default: setupApiRoutes } = await import('./server/api-routes.js');
    setupApiRoutes(app);
    console.log('API routes loaded successfully');
  } catch (err) {
    console.error('Failed to load API routes:', err);
    
    // Fallback to basic API endpoint
    app.get('/api/status', (req, res) => {
      res.json({ status: 'ok', message: 'API is running but routes failed to load' });
    });
  }
  
  // Host detection for Replit domain
  const REPLIT_DOMAIN = process.env.REPLIT_DOMAIN || (process.env.REPL_ID ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : null);

  // Inject environment variables for client
  const injectEnvMiddleware = (req, res, next) => {
    if (req.path === '/index.html' || req.path === '/') {
      try {
        const indexPath = path.join(DIST_DIR, 'index.html');
        let html = fs.readFileSync(indexPath, 'utf8');
        
        // Inject environment variables as a global object
        const runtimeEnv = {
          VITE_DEV_SERVER_URL: REPLIT_DOMAIN ? `https://${REPLIT_DOMAIN}` : `http://localhost:${PORT}`,
          VITE_API_URL: `/api`,
          VITE_REPLIT_DOMAIN: REPLIT_DOMAIN || '',
        };
        
        const envScript = `<script>window.__ENV__ = ${JSON.stringify(runtimeEnv)};</script>`;
        html = html.replace('</head>', `${envScript}</head>`);
        
        res.send(html);
        return;
      } catch (err) {
        console.error('Error injecting environment variables:', err);
      }
    }
    next();
  };
  
  // Serve static files with environment injection
  app.use(injectEnvMiddleware);
  app.use(express.static(DIST_DIR));
  
  // Serve index.html for any non-API routes for SPA routing
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    });
  });
  
  // Start the server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Production server running on http://0.0.0.0:${PORT}`);
    
    // Log additional access URLs
    if (REPLIT_DOMAIN) {
      console.log(`Application is accessible at: https://${REPLIT_DOMAIN}`);
    }
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});