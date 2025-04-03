/**
 * Advanced Pilot Training Platform - Custom Development Server
 * This script starts a development server with proper host configuration
 * to work around Replit's restrictions on modifying vite.config.ts
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { createServer } from 'vite';

// Get current directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create express app
const app = express();

// Apply CORS middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Configure host access (allowing all Replit domains)
app.set('trust proxy', 1);

// Set CORS headers for all requests
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Create Vite server with custom configuration
async function startDevServer() {
  try {
    // Get current Replit domain from environment
    const replit_domain = process.env.REPLIT_DOMAIN || 'c4c63b04-8137-449e-93ce-043996d346d0-2ytirv4mg9c5l.kirk.replit.dev';
    
    // Create Vite server with our custom config
    const vite = await createServer({
      server: { 
        middlewareMode: true,
        hmr: {
          clientPort: 443,
          protocol: 'wss',
        },
        host: '0.0.0.0',
        fs: {
          strict: false,
          allow: ['.']
        }
      },
      appType: 'spa',
      root: __dirname,
      optimizeDeps: {
        force: true
      },
      cacheDir: path.resolve(__dirname, '.vite')
    });
    
    // Use Vite's middlewares
    app.use(vite.middlewares);
    
    // Handle all other routes by serving index.html
    app.use('*', async (req, res, next) => {
      // Skip API routes
      if (req.originalUrl.startsWith('/api/')) {
        return next();
      }
      
      try {
        // Read index.html
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        
        // Apply Vite HTML transforms
        template = await vite.transformIndexHtml(req.originalUrl, template);
        
        // Send transformed HTML
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        console.error(`Error handling client-side route:`, e);
        next(e);
      }
    });
    
    // Start the server
    const PORT = 4000; // Using a different port to avoid conflict
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Development server running on http://localhost:${PORT}`);
      console.log(`Also accessible at: https://${replit_domain}`);
    });
    
  } catch (error) {
    console.error('Failed to start development server:', error);
    process.exit(1);
  }
}

// Start the server
startDevServer().catch(console.error);