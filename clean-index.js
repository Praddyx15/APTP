/**
 * Specialized HTML cleaner for client/index.html
 * 
 * This script specifically targets the client/index.html file to remove Replit-specific
 * metadata and configurations, ensuring it works correctly outside of Replit.
 */

const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');

// Path to the index.html file
const indexPath = path.join(process.cwd(), 'client', 'index.html');

async function cleanIndexHtml() {
  try {
    console.log(`Processing index.html at: ${indexPath}`);
    
    // Read the HTML file
    const html = await fs.readFile(indexPath, 'utf8');
    
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
    
    // Fix base href if needed
    if ($('base').length === 0) {
      $('head').prepend('<base href="/" />');
    }
    
    // Fix viewport meta tag if needed
    if ($('meta[name="viewport"]').length === 0) {
      $('head').append('<meta name="viewport" content="width=device-width, initial-scale=1.0" />');
    }
    
    // Add standard favicon if not present
    if ($('link[rel="icon"]').length === 0) {
      $('head').append('<link rel="icon" type="image/png" href="/favicon.png" />');
    }
    
    // Clean up the HTML
    let cleanedHtml = $.html();
    
    // Remove Replit-specific comments
    cleanedHtml = cleanedHtml.replace(/<!--.*replit.*-->/gi, '');
    
    // Replace hard-coded Replit URLs
    cleanedHtml = cleanedHtml.replace(/https:\/\/[a-z0-9-]+\.replit\.app/g, '');
    cleanedHtml = cleanedHtml.replace(/https:\/\/[a-z0-9-]+\.replit\.dev/g, '');
    
    // Write the cleaned HTML back to the file
    await fs.writeFile(indexPath, cleanedHtml, 'utf8');
    console.log(`✓ Successfully cleaned: ${indexPath}`);
  } catch (error) {
    console.error(`❌ Error processing index.html:`, error);
  }
}

// Run the cleaning function
cleanIndexHtml();