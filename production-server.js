/**
 * Production server for Advanced Pilot Training Platform
 * This server serves the production build without Vite's host restrictions
 */
import express from 'express';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { createServer } from 'http';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Build the application if dist folder doesn't exist
if (!fs.existsSync(path.join(__dirname, 'dist'))) {
  console.log('Building application...');
  execSync('npm run build', { stdio: 'inherit' });
}

// Import server from dist folder
async function startServer() {
  try {
    // Dynamically import the ESM server module
    const { app } = await import('./dist/index.js');

    // Set up static file serving for the Vite build output
    app.use(express.static(path.join(__dirname, 'dist/public')));

    // For any other request, serve the index.html (client-side routing)
    app.get('*', (req, res) => {
      // Skip API routes
      if (req.path.startsWith('/api')) {
        return res.status(404).send('API route not found');
      }
      res.sendFile(path.join(__dirname, 'dist/public/index.html'));
    });

    // Get port from environment variable or use default
    const PORT = process.env.PORT || 5000;

    // Create HTTP server
    const httpServer = createServer(app);

    // Start the server
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Production server running on http://0.0.0.0:${PORT}`);
    });

    return httpServer;
  } catch (error) {
    console.error('Failed to start production server:', error);
    process.exit(1);
  }
}

startServer();