/**
 * Prepare the environment for application start
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  console.log('Creating uploads directory');
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Ensure client/src symlink exists in project root
const srcLink = path.join(__dirname, 'src');
const srcTarget = path.join(__dirname, 'client', 'src');

// Only create symlink if it doesn't exist and target exists
if (!fs.existsSync(srcLink) && fs.existsSync(srcTarget)) {
  try {
    console.log('Creating src symlink for client files');
    fs.symlinkSync(srcTarget, srcLink, 'dir');
  } catch (error) {
    console.warn('Failed to create symlink:', error.message);
    // Just continue, this is not critical
  }
}

// Get Replit domain
const getDomain = () => {
  if (process.env.REPLIT_DOMAIN) {
    return process.env.REPLIT_DOMAIN;
  }
  
  try {
    const replitConfigPath = path.join(__dirname, '.replit');
    if (fs.existsSync(replitConfigPath)) {
      const content = fs.readFileSync(replitConfigPath, 'utf-8');
      const match = content.match(/\bdomain\s*=\s*["']([^"']+)["']/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (err) {
    console.warn('Error reading .replit file:', err.message);
  }
  
  return null;
};

// Update .env file with Replit domain if detected
const updateEnv = () => {
  const domain = getDomain();
  if (!domain) {
    console.log('No Replit domain found, skipping .env update');
    return;
  }
  
  const envPath = path.join(__dirname, '.env');
  let content = '';
  
  try {
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf-8');
    }
    
    // Update REPLIT_DOMAIN if not already set
    if (!content.includes('REPLIT_DOMAIN=')) {
      content += `\nREPLIT_DOMAIN=${domain}`;
      fs.writeFileSync(envPath, content);
      console.log(`Updated .env with REPLIT_DOMAIN=${domain}`);
    }
  } catch (err) {
    console.warn('Error updating .env file:', err.message);
  }
};

updateEnv();

console.log('Pre-start setup complete');