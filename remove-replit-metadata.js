/**
 * Script to remove Replit-specific code from all files
 * 
 * This script traverses your project and removes all Replit-specific code,
 * making the project suitable for deployment outside Replit.
 * 
 * Usage:
 *   node remove-replit-metadata.js [directory]
 */

const fs = require('fs').promises;
const path = require('path');

// Exclude directories
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build'];

// File extensions to process
const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.html', '.css'];

// Patterns to replace
const REPLIT_PATTERNS = [
  // Data attributes
  { regex: /data-replit-[a-z-]+="[^"]*"/g, replacement: '' },
  
  // Import statements
  { regex: /import\s+.*?from\s+['"]@replit\/.*?['"]/g, replacement: '// Import removed: Replit-specific' },
  
  // Require statements
  { regex: /(?:const|let|var)\s+.*?\s*=\s*require\s*\(\s*['"]@replit\/.*?['"]\s*\)/g, replacement: '// Require removed: Replit-specific' },
  
  // Replit URLs
  { regex: /https:\/\/[a-z0-9-]+\.replit\.(app|dev)/g, replacement: '' },
  
  // Replit-specific Vite plugins
  { regex: /@replit\/vite-plugin-[a-z-]+/g, replacement: '/* Replit plugin removed */' },
  
  // Replit environment variables
  { regex: /process\.env\.REPLIT_[A-Z_]+/g, replacement: 'undefined /* Replit env removed */' },
  
  // Replit-specific HTML meta tags
  { regex: /<meta.*?data-replit.*?>/g, replacement: '' },
  
  // Replit-specific script tags
  { regex: /<script.*?replit.*?<\/script>/g, replacement: '' },
  
  // Replit-specific comments
  { regex: /\/\/\s*Replit.*$/gm, replacement: '' },
  { regex: /\/\*\s*Replit[\s\S]*?\*\//g, replacement: '' },
  
  // Replit code blocks
  { regex: /if\s*\(\s*process\.env\.REPLIT\s*\)\s*\{[\s\S]*?\}/g, replacement: '/* Replit-specific block removed */' },
  { regex: /if\s*\(\s*typeof\s+Replit\s*!==\s*['"]undefined['"]\s*\)\s*\{[\s\S]*?\}/g, replacement: '/* Replit-specific block removed */' },
];

/**
 * Process a single file to remove Replit-specific code
 * @param {string} filePath - Path to the file
 */
async function processFile(filePath) {
  try {
    // Read the file
    const content = await fs.readFile(filePath, 'utf8');
    
    // Apply all replacement patterns
    let newContent = content;
    let hasChanges = false;
    
    for (const pattern of REPLIT_PATTERNS) {
      const replacedContent = newContent.replace(pattern.regex, pattern.replacement);
      
      if (replacedContent !== newContent) {
        hasChanges = true;
        newContent = replacedContent;
      }
    }
    
    // Only write back if changes were made
    if (hasChanges) {
      await fs.writeFile(filePath, newContent, 'utf8');
      console.log(`Cleaned: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

/**
 * Find all matching files in a directory recursively
 * @param {string} dir - Directory to search
 * @returns {Promise<string[]>} Array of file paths
 */
async function findFiles(dir) {
  const results = [];
  
  try {
    const files = await fs.readdir(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isDirectory()) {
        // Skip excluded directories
        if (EXCLUDE_DIRS.includes(file)) {
          continue;
        }
        
        // Recursively process subdirectories
        const subDirFiles = await findFiles(filePath);
        results.push(...subDirFiles);
      } else {
        // Check if the file has a matching extension
        const ext = path.extname(file).toLowerCase();
        if (EXTENSIONS.includes(ext)) {
          results.push(filePath);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return results;
}

/**
 * Main function to clean all files
 * @param {string} directory - Directory to process
 */
async function cleanFiles(directory) {
  try {
    // Find all matching files
    const files = await findFiles(directory);
    console.log(`Found ${files.length} files to process`);
    
    // Process each file
    for (const filePath of files) {
      await processFile(filePath);
    }
    
    console.log('File cleaning completed successfully!');
  } catch (error) {
    console.error('Error cleaning files:', error);
    process.exit(1);
  }
}

// Get directory from command line argument or use current directory
const directory = process.argv[2] || process.cwd();
cleanFiles(directory);