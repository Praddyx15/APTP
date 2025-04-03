import { Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { log } from '../vite';

/**
 * Setup routes for handling theme preferences
 */
export function setupThemeRoutes(app: Express) {
  const themeFilePath = path.resolve('theme.json');
  
  // Get current theme
  app.get('/api/theme', (req, res) => {
    try {
      // Read from theme.json file
      if (!fs.existsSync(themeFilePath)) {
        return res.status(404).json({ error: 'Theme file not found' });
      }
      
      const themeData = JSON.parse(fs.readFileSync(themeFilePath, 'utf-8'));
      res.json(themeData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Error reading theme: ${errorMessage}`);
      res.status(500).json({ error: 'Failed to read theme' });
    }
  });
  
  // Update theme (appearance only in this iteration)
  app.post('/api/update-theme', (req, res) => {
    try {
      // Get appearance from request body
      const { appearance } = req.body;
      
      // Read current theme
      if (!fs.existsSync(themeFilePath)) {
        return res.status(404).json({ error: 'Theme file not found' });
      }
      
      const themeData = JSON.parse(fs.readFileSync(themeFilePath, 'utf-8'));
      
      // Update appearance if provided
      if (appearance && ['light', 'dark', 'system'].includes(appearance)) {
        themeData.appearance = appearance;
      }
      
      // Write back to theme.json
      fs.writeFileSync(themeFilePath, JSON.stringify(themeData, null, 2));
      
      res.json({ success: true, theme: themeData });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Error updating theme: ${errorMessage}`);
      res.status(500).json({ error: 'Failed to update theme' });
    }
  });
  
  // Get all theme configuration
  app.get('/api/theme/config', (req, res) => {
    try {
      // Read from theme.json file
      if (!fs.existsSync(themeFilePath)) {
        return res.status(404).json({ error: 'Theme file not found' });
      }
      
      const themeData = JSON.parse(fs.readFileSync(themeFilePath, 'utf-8'));
      
      // Return theme with supported options
      res.json({
        ...themeData,
        supportedThemes: ['light', 'dark', 'system'],
        supportedVariants: ['professional', 'tint', 'vibrant'],
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Error reading theme config: ${errorMessage}`);
      res.status(500).json({ error: 'Failed to read theme configuration' });
    }
  });
}