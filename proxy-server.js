/**
 * External access proxy server for Advanced Pilot Training Platform
 * This allows access to the application from outside the Replit environment.
 */

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get current directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create express app
const app = express();

// Get Replit domain from environment
const replit_domain = process.env.REPLIT_DOMAIN || 'c4c63b04-8137-449e-93ce-043996d346d0-2ytirv4mg9c5l.kirk.replit.dev';

// Configure CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Log all requests (helpful for debugging)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API proxy - forward API requests to the backend server
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api'
  },
  onError: (err, req, res) => {
    console.error('API Proxy Error:', err);
    res.status(500).send('API Proxy Error');
  }
}));

// Create a root route that shows status information
app.get('/', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Advanced Pilot Training Platform - Development Proxy</title>
        <style>
          body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #3b82f6; }
          .panel { background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .success { background: #d1fae5; border-left: 4px solid #10b981; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; }
          .error { background: #fee2e2; border-left: 4px solid #ef4444; }
          code { background: #e5e7eb; padding: 2px 5px; border-radius: 3px; font-family: monospace; }
          a { color: #3b82f6; text-decoration: none; }
          a:hover { text-decoration: underline; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 8px 16px; border-radius: 4px; margin-top: 10px; }
          .button:hover { background: #2563eb; text-decoration: none; }
        </style>
      </head>
      <body>
        <h1>Advanced Pilot Training Platform</h1>
        <div class="panel success">
          <h2>Development Proxy Server</h2>
          <p>This proxy server is running and ready to forward requests.</p>
        </div>
        
        <div class="panel">
          <h2>Server Information</h2>
          <ul>
            <li><strong>Node Environment:</strong> ${process.env.NODE_ENV || 'development'}</li>
            <li><strong>Replit Domain:</strong> ${replit_domain}</li>
            <li><strong>API Server:</strong> http://localhost:5000</li>
          </ul>
        </div>
        
        <div class="panel">
          <h2>Access Points</h2>
          <ul>
            <li><a href="/app" class="button">Go to Application</a></li>
            <li><a href="/api/health" target="_blank">API Health Check</a></li>
          </ul>
        </div>
      </body>
    </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Create an /app route that directly serves index.html with modified client config
app.get('/app', (req, res) => {
  try {
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    
    // Inject configuration to point to the correct API endpoint
    const scriptTag = `
    <script>
      // Configuration for API and WebSocket endpoints
      window.API_BASE_URL = '/api';
      window.WS_URL = window.location.protocol === 'https:' ? 'wss:' : 'ws:' + '//' + window.location.host + '/ws';
    </script>
    `;
    
    // Insert script tag before the closing head tag
    html = html.replace('</head>', scriptTag + '</head>');
    
    // Send the modified HTML
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error serving app page:', error);
    res.status(500).send('Error loading application');
  }
});

// Static file serving for client assets
app.use(express.static(path.join(__dirname, 'client')));

// Fallback route handler for SPA
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).send('API route not found');
  }
  
  res.redirect('/app');
});

// Start the server
const PORT = process.env.PROXY_PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`External access: https://${replit_domain}`);
});