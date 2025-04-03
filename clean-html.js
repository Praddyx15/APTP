/**
 * HTML Cleaner for Advanced Pilot Training Platform
 * 
 * This script removes Replit-specific metadata from HTML files to prepare
 * the project for deployment outside of Replit.
 * 
 * Usage:
 *   node clean-html.js [directory]
 */

const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');

/**
 * Process a single HTML file to remove Replit-specific metadata
 * @param {string} filePath - Path to the HTML file
 */
async function processHtmlFile(filePath) {
  try {
    // Read the HTML file
    const html = await fs.readFile(filePath, 'utf8');

    // Load HTML into cheerio
    const $ = cheerio.load(html);

    // Remove Replit-specific attributes
    $('[data-replit-metadata]').removeAttr('data-replit-metadata');
    $('[data-replit-environment]').removeAttr('data-replit-environment');
    $('[data-replit-host]').removeAttr('data-replit-host');
    $('[data-replit-id]').removeAttr('data-replit-id');

    // Remove Replit-specific script tags
    $('script[src*="replit"]').remove();
    $('script:contains("replit")').remove();

    // Remove Replit-specific link tags
    $('link[href*="replit"]').remove();

    // Remove Replit-specific comments
    let cleanedHtml = $.html();
    cleanedHtml = cleanedHtml.replace(/<!--.*replit.*-->/gi, '');

    // Write the cleaned HTML back to the file
    await fs.writeFile(filePath, cleanedHtml, 'utf8');
    console.log(`Cleaned: ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

/**
 * Find all HTML files in a directory recursively
 * @param {string} dir - Directory to search
 * @returns {Promise<string[]>} Array of HTML file paths
 */
async function findHtmlFiles(dir) {
  const files = await fs.readdir(dir);
  const htmlFiles = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = await fs.stat(filePath);

    if (stats.isDirectory() && file !== 'node_modules' && file !== '.git') {
      // Recursively search subdirectories
      const subDirHtmlFiles = await findHtmlFiles(filePath);
      htmlFiles.push(...subDirHtmlFiles);
    } else if (file.endsWith('.html')) {
      // Add HTML file to the list
      htmlFiles.push(filePath);
    }
  }

  return htmlFiles;
}

/**
 * Main function to clean all HTML files in a directory
 * @param {string} directory - Directory to process
 */
async function cleanHtmlFiles(directory) {
  try {
    // Find all HTML files in the directory
    const htmlFiles = await findHtmlFiles(directory);
    console.log(`Found ${htmlFiles.length} HTML files to clean`);

    // Process each HTML file
    for (const filePath of htmlFiles) {
      await processHtmlFile(filePath);
    }

    console.log('HTML cleaning completed successfully!');
  } catch (error) {
    console.error('Error cleaning HTML files:', error);
    process.exit(1);
  }
}

// Get directory from command line argument or use current directory
const directory = process.argv[2] || process.cwd();
cleanHtmlFiles(directory);