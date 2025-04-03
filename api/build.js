/**
 * Build script for creating serverless function deployment
 * This script is used during the Vercel build process to prepare the API
 * for serverless deployment.
 */

const fs = require('fs');
const path = require('path');

// Define paths
const serverDir = path.join(__dirname, '..', 'server');
const sharedDir = path.join(__dirname, '..', 'shared');
const apiDir = __dirname;

// Ensure required directories exist
if (!fs.existsSync(serverDir)) {
  console.error('Server directory not found:', serverDir);
  process.exit(1);
}

if (!fs.existsSync(sharedDir)) {
  console.error('Shared directory not found:', sharedDir);
  process.exit(1);
}

// Modify paths in imports if needed for serverless environment
function processServerFiles() {
  console.log('Processing server files for serverless deployment...');
  
  // Add any server file processing logic here
  // For example, modifying import paths or adding serverless-specific code
}

// Process schema files for serverless compatibility
function processSchemaFiles() {
  console.log('Processing schema files...');
  
  // Add any schema processing logic here
  // For example, ensuring schema build-time versions are available
}

// Create any additional needed files
function createHelperFiles() {
  console.log('Creating helper files...');
  
  // Add code to create any needed helper files for serverless deployment
}

// Ensure consistent environment variables
function setupEnvironment() {
  console.log('Setting up environment...');
  
  // Set NODE_ENV to 'production' if not already set
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
  }
  
  // Ensure other required environment variables are present
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = 'aptp-default-serverless-secret';
    console.warn('WARNING: Using default SESSION_SECRET. Set this in environment variables for better security.');
  }
}

// Main build process
async function build() {
  console.log('Starting API build for serverless deployment...');
  
  try {
    // Process all needed files and setup
    setupEnvironment();
    processServerFiles();
    processSchemaFiles();
    createHelperFiles();
    
    console.log('API build for serverless deployment completed successfully.');
  } catch (error) {
    console.error('Error during API build:', error);
    process.exit(1);
  }
}

// Run the build process
build();