/**
 * Advanced Pilot Training Platform Launcher
 * This script runs the pre-start setup and then starts the server
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Get current directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Run setup script first
console.log('Running environment setup...');
import('./vite-env-setup.js')
  .then(module => {
    const setupViteEnvironment = module.default;
    setupViteEnvironment();
    
    // Now start the proxy server
    console.log('Starting proxy server...');
    const proxyServer = spawn('node', ['proxy-server.js'], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    // Listen for proxy server process events
    proxyServer.on('error', (error) => {
      console.error('Error starting proxy server:', error);
      process.exit(1);
    });
    
    // Handle signals for clean shutdown
    process.on('SIGINT', () => {
      console.log('Shutting down proxy server...');
      proxyServer.kill('SIGINT');
    });
    
    process.on('SIGTERM', () => {
      console.log('Shutting down proxy server...');
      proxyServer.kill('SIGTERM');
    });
    
    console.log('Advanced Pilot Training Platform is now running');
    console.log('Access it at: https://' + (process.env.REPLIT_DOMAIN || 'localhost:8080'));
  })
  .catch(error => {
    console.error('Failed to run setup:', error);
    process.exit(1);
  });