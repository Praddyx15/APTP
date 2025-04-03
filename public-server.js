/**
 * Public server configuration for Advanced Pilot Training Platform
 * This module configures Express to allow external access
 */

import path from 'path';
import fs from 'fs';

/**
 * Configure Express app to allow trusted hosts
 * @param {Express} app - Express application instance
 */
export function configureHostAccess(app) {
  const allowedHosts = [
    'localhost',
    '127.0.0.1',
    '::1',
    'localhost',
    '127.0.0.1',
    'replit.dev',
    '*.replit.dev',
    '*.repl.co',
    '*.repl.run',
    '*.replit.app',
    'c4c63b04-8137-449e-93ce-043996d346d0.id.repl.co',
    'c4c63b04-8137-449e-93ce-043996d346d0-2ytirv4mg9c5l.kirk.replit.dev',
    'c4c63b04-8137-449e-93ce-043996d346d0.id.repl.co'
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
}