/**
 * Vite Environment Setup for Replit
 * 
 * This script sets up environment variables needed for Vite to work properly in Replit.
 * It ensures that the application is accessible both within Replit and externally.
 * 
 * The script:
 * 1. Detects the Replit domain from environment
 * 2. Sets VITE_ALLOWED_HOSTS to include all necessary hosts
 * 3. Sets VITE_DEV_SERVER_URL to ensure proper HMR (Hot Module Replacement)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect Replit environment
const isReplit = process.env.REPL_ID && process.env.REPL_OWNER;
const replitSlug = process.env.REPL_SLUG || 'unknown-repl';
const replitId = process.env.REPL_ID || 'unknown-id';
const replitOwner = process.env.REPL_OWNER || 'unknown-owner';

// Get the Replit domain (falls back to localhost if not available)
const getReplitDomain = () => {
  // Try to get from environment
  if (process.env.REPLIT_DOMAIN) {
    return process.env.REPLIT_DOMAIN;
  }
  
  // Try reading from Replit .replit file if it exists
  try {
    const replitConfigPath = path.join(process.cwd(), '.replit');
    if (fs.existsSync(replitConfigPath)) {
      const content = fs.readFileSync(replitConfigPath, 'utf-8');
      const domainMatch = content.match(/domain\s*=\s*["']([^"']+)["']/);
      if (domainMatch && domainMatch[1]) {
        return domainMatch[1];
      }
    }
  } catch (err) {
    console.error('Error reading .replit file:', err);
  }
  
  // Fallback to constructing domain from REPL_ID
  if (replitId !== 'unknown-id') {
    return `${replitId}.id.repl.co`;
  }
  
  // Ultimate fallback
  return 'localhost';
};

// Get the Replit Webview Service domain
const getWebviewDomain = () => {
  // This is the pattern Replit uses for webview domains
  if (replitId !== 'unknown-id') {
    return `${replitId}.id.repl.co`;
  }
  return null;
};

// Main setup function
const setupViteEnvironment = () => {
  const envFile = path.join(process.cwd(), '.env');
  const replitDomain = getReplitDomain();
  const webviewDomain = getWebviewDomain();
  
  // Prepare list of all domains that need to be allowed
  const allowedHosts = [
    'localhost', 
    '127.0.0.1',
    'replit.dev',
    '*.replit.dev',
    '*.repl.co',
    '*.repl.run',
    '*.replit.app',
    replitDomain,
    'c4c63b04-8137-449e-93ce-043996d346d0-2ytirv4mg9c5l.kirk.replit.dev'
  ];
  
  if (webviewDomain) {
    allowedHosts.push(webviewDomain);
  }
  
  // Add any custom domain if specified
  if (process.env.CUSTOM_DOMAIN) {
    allowedHosts.push(process.env.CUSTOM_DOMAIN);
  }
  
  // Compile environment variables to add
  const envVars = {
    // Force Vite to allow the Replit domain
    VITE_ALLOWED_HOSTS: allowedHosts.join(','),
    
    // Add any other Vite-specific environment variables here
    VITE_DEV_SERVER_URL: replitDomain ? `https://${replitDomain}` : 'http://localhost:3000',
    
    // Set the host to 0.0.0.0 to make sure it's accessible externally
    HOST: '0.0.0.0',
    
    // Set port (Replit prefers port 3000)
    PORT: '3000'
  };
  
  // Write to .env file
  let envContent = '';
  try {
    if (fs.existsSync(envFile)) {
      envContent = fs.readFileSync(envFile, 'utf-8');
    }
  } catch (err) {
    console.warn('No existing .env file found or error reading it:', err);
  }
  
  // Update environment variables in memory
  for (const [key, value] of Object.entries(envVars)) {
    process.env[key] = value;
    
    // Add to .env file content if not already there
    if (!envContent.includes(`${key}=`)) {
      envContent += `\n${key}=${value}`;
    }
  }
  
  // Write updated .env file
  try {
    fs.writeFileSync(envFile, envContent.trim());
    console.log('Updated .env file with Vite configuration');
  } catch (err) {
    console.error('Error writing .env file:', err);
  }
  
  // Also create a public-server.js file to configure server for public access
  const publicServerContent = `/**
 * Public server configuration for Advanced Pilot Training Platform
 * This module configures Express to allow external access
 */

const path = require('path');
const fs = require('fs');

/**
 * Configure Express app to allow trusted hosts
 * @param {Express} app - Express application instance
 */
export function configureHostAccess(app) {
  const allowedHosts = [
    'localhost',
    '127.0.0.1',
    '::1',
    ${allowedHosts.map(host => `'${host}'`).join(',\n    ')}
  ];
  
  app.use((req, res, next) => {
    const host = req.hostname;
    const isAllowed = allowedHosts.some(allowedHost => {
      if (allowedHost.startsWith('*.')) {
        const suffix = allowedHost.slice(1); // e.g., ".replit.dev"
        return host.endsWith(suffix);
      }
      return host === allowedHost;
    });
    
    if (isAllowed) {
      next();
    } else {
      res.status(403).send('Host not allowed');
    }
  });
}`;

  // Write the public server configuration
  try {
    fs.writeFileSync(path.join(process.cwd(), 'public-server.js'), publicServerContent);
    console.log('Created public-server.js for host access configuration');
  } catch (err) {
    console.error('Error writing public-server.js:', err);
  }
  
  console.log('Vite environment setup complete with the following configuration:');
  for (const [key, value] of Object.entries(envVars)) {
    console.log(`  ${key}=${value}`);
  }
};

// Export the setup function
export default setupViteEnvironment;

// Execute the setup if this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupViteEnvironment();
}