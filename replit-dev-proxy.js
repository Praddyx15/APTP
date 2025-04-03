/**
 * Replit Development Proxy
 * 
 * This proxy server handles Replit's specific environment challenges by:
 * 1. Adding proper CORS headers to all responses
 * 2. Proxying WebSocket connections for HMR (Hot Module Replacement)
 * 3. Making the application accessible from all Replit domains
 */

// Run pre-start setup to configure environment
require('./pre-start-setup');

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Configuration
const DEV_SERVER_PORT = process.env.PORT || 3000;
const PROXY_PORT = process.env.PROXY_PORT || 8080;

// Create Express app
const app = express();

// Use Morgan for request logging in development
app.use(morgan('dev'));

// Enable CORS for all routes (important for Replit environment)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept']
}));

// Add security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Log request URL and method
app.use((req, res, next) => {
  console.log(`[PROXY] ${req.method} ${req.url}`);
  next();
});

// Detect if we need to handle the specific problematic domain
const specificDomain = process.env.SPECIFIC_DOMAIN || 'c4c63b04-8137-449e-93ce-043996d346d0-00-2ytirv4mg9c5l.kirk.replit.dev';

// Create Vite Dev Server proxy
const viteDevServerProxy = createProxyMiddleware({
  target: `http://localhost:${DEV_SERVER_PORT}`,
  changeOrigin: true,
  ws: true, // enable WebSocket proxy for HMR
  logLevel: 'debug',
  onProxyRes: (proxyRes, req, res) => {
    // Add additional CORS headers to proxied responses
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, Content-Type, X-Auth-Token, X-Requested-With';
    
    // Security headers
    proxyRes.headers['X-Content-Type-Options'] = 'nosniff';
    proxyRes.headers['X-Frame-Options'] = 'DENY';
    proxyRes.headers['X-XSS-Protection'] = '1; mode=block';
    
    // Log proxied response status
    console.log(`[PROXY] Response: ${proxyRes.statusCode}`);
  }
});

// Apply the proxy middleware to all routes
app.use('/', viteDevServerProxy);

// Create an HTTP server
const server = http.createServer(app);

// Handle WebSocket connections
server.on('upgrade', (req, socket, head) => {
  viteDevServerProxy.upgrade(req, socket, head);
});

// Function to create a .env file with the problematic domain
function setupEnvFile() {
  const envFile = path.join(process.cwd(), '.env');
  try {
    let envContent = '';
    if (fs.existsSync(envFile)) {
      envContent = fs.readFileSync(envFile, 'utf-8');
    }
    
    // Ensure VITE_ALLOWED_HOSTS includes our domains
    if (!envContent.includes('VITE_ALLOWED_HOSTS=')) {
      envContent += `\nVITE_ALLOWED_HOSTS=${specificDomain},localhost,127.0.0.1,*.replit.dev,*.replit.co`;
      fs.writeFileSync(envFile, envContent);
      console.log('Created .env file with required host configuration');
    }
  } catch (err) {
    console.error('Error setting up .env file:', err);
  }
}

// Start the proxy server
server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`\x1b[32m[REPLIT-DEV-PROXY]\x1b[0m Proxy server running on port ${PROXY_PORT}`);
  console.log(`\x1b[32m[REPLIT-DEV-PROXY]\x1b[0m Access the application at:`);
  console.log(`\x1b[32m[REPLIT-DEV-PROXY]\x1b[0m - Local: http://localhost:${PROXY_PORT}`);
  
  // Set up .env file
  setupEnvFile();
  
  // Log Replit URL if we're in Replit environment
  if (process.env.REPL_ID && process.env.REPL_SLUG && process.env.REPL_OWNER) {
    console.log(`\x1b[32m[REPLIT-DEV-PROXY]\x1b[0m - Replit: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
  }
  
  console.log(`\x1b[32m[REPLIT-DEV-PROXY]\x1b[0m The application is now accessible from problematic hosts`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\x1b[33m[REPLIT-DEV-PROXY]\x1b[0m Shutting down the proxy server...');
  server.close(() => {
    console.log('\x1b[33m[REPLIT-DEV-PROXY]\x1b[0m Server shut down successfully');
    process.exit(0);
  });
});