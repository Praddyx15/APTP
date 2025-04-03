import { Express, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { storage } from '../storage';
import { logger } from '../core/logger';
import { v4 as uuidv4 } from 'uuid';
import { insertResourceSchema } from '@shared/schema';

// Configure storage for resource files
const resourceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'resources');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const originalExtension = path.extname(file.originalname);
    cb(null, `resource-${uniqueSuffix}${originalExtension}`);
  }
});

// Configure upload middleware
const upload = multer({
  storage: resourceStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for resources
  },
  fileFilter: (req, file, cb) => {
    // Allow all files for resources (can be restricted as needed)
    cb(null, true);
  }
});

/**
 * Register resource-related routes
 */
export function registerResourceRoutes(app: Express) {
  /**
   * Get all resources
   */
  app.get('/api/resources', async (req: Request, res: Response) => {
    try {
      // Parse query parameters
      const category = req.query.category as string | undefined;
      const type = req.query.type as string | undefined;
      const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;
      
      // Get resources with optional filters
      const resources = await storage.getResources({ category, type, tags });
      
      res.json(resources);
    } catch (error) {
      logger.error('Error fetching resources', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch resources' });
    }
  });

  /**
   * Get resource by ID
   */
  app.get('/api/resources/:id', async (req: Request, res: Response) => {
    try {
      const resourceId = parseInt(req.params.id);
      const resource = await storage.getResource(resourceId);
      
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      
      // Increment download count if requested
      if (req.query.download === 'true') {
        await storage.incrementResourceDownloadCount(resourceId);
      }
      
      res.json(resource);
    } catch (error) {
      logger.error('Error fetching resource', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch resource' });
    }
  });

  /**
   * Upload a resource
   */
  app.post('/api/resources', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Validate that file was uploaded if required
      if (req.body.type !== 'link' && !req.file) {
        return res.status(400).json({ error: 'File is required for non-link resources' });
      }
      
      // Prepare resource data
      const resourceData = {
        title: req.body.title,
        description: req.body.description,
        type: req.body.type,
        category: req.body.category,
        url: req.body.type === 'link' ? req.body.url : req.file ? req.file.path : null,
        tags: req.body.tags ? JSON.parse(req.body.tags) : null,
        createdById: req.user.id,
        status: req.body.status || 'active',
      };
      
      // Validate resource data
      const validData = insertResourceSchema.parse(resourceData);
      
      // Save resource to database
      const resource = await storage.createResource(validData);
      
      res.status(201).json(resource);
    } catch (error) {
      logger.error('Error creating resource', { context: { error } });
      
      // Clean up file if it was uploaded
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          logger.error('Error deleting file after failed upload', { context: { error: unlinkError } });
        }
      }
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid resource data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to create resource' });
    }
  });

  /**
   * Update resource
   */
  app.put('/api/resources/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const resourceId = parseInt(req.params.id);
      const resource = await storage.getResource(resourceId);
      
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      
      // Check if user has permission to update
      if (req.user.role !== 'admin' && resource.createdById !== req.user.id) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      // Update resource
      const updatedResource = await storage.updateResource(resourceId, req.body);
      
      res.json(updatedResource);
    } catch (error) {
      logger.error('Error updating resource', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid resource data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to update resource' });
    }
  });

  /**
   * Delete resource
   */
  app.delete('/api/resources/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const resourceId = parseInt(req.params.id);
      const resource = await storage.getResource(resourceId);
      
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      
      // Check if user has permission to delete
      if (req.user.role !== 'admin' && resource.createdById !== req.user.id) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      // Delete resource
      await storage.deleteResource(resourceId);
      
      // Delete the file if it exists and is not a link
      if (resource.type !== 'link' && resource.url && fs.existsSync(resource.url)) {
        fs.unlinkSync(resource.url);
      }
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting resource', { context: { error } });
      res.status(500).json({ error: 'Failed to delete resource' });
    }
  });

  /**
   * Rate a resource
   */
  app.post('/api/resources/:id/rate', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const resourceId = parseInt(req.params.id);
      const resource = await storage.getResource(resourceId);
      
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      
      // Validate rating schema
      const ratingSchema = z.object({
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      });
      
      const { rating, comment } = ratingSchema.parse(req.body);
      
      // Add rating
      await storage.addResourceRating(resourceId, req.user.id, rating, comment);
      
      res.status(201).json({ message: 'Rating added successfully' });
    } catch (error) {
      logger.error('Error rating resource', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid rating data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to rate resource' });
    }
  });

  /**
   * Get ratings for a resource
   */
  app.get('/api/resources/:id/ratings', async (req: Request, res: Response) => {
    try {
      const resourceId = parseInt(req.params.id);
      const resource = await storage.getResource(resourceId);
      
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      
      const ratings = await storage.getResourceRatings(resourceId);
      
      res.json(ratings);
    } catch (error) {
      logger.error('Error fetching resource ratings', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch resource ratings' });
    }
  });

  /**
   * Get popular resources
   */
  app.get('/api/resources/popular', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      const resources = await storage.getPopularResources(limit);
      
      res.json(resources);
    } catch (error) {
      logger.error('Error fetching popular resources', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch popular resources' });
    }
  });

  /**
   * Get recent resources
   */
  app.get('/api/resources/recent', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      const resources = await storage.getRecentResources(limit);
      
      res.json(resources);
    } catch (error) {
      logger.error('Error fetching recent resources', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch recent resources' });
    }
  });

  /**
   * Search resources
   */
  app.post('/api/resources/search', async (req: Request, res: Response) => {
    try {
      // Validate search schema
      const searchSchema = z.object({
        query: z.string(),
        categories: z.array(z.string()).optional(),
        types: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        sortBy: z.enum(['title', 'date', 'downloads', 'rating']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      });
      
      const searchParams = searchSchema.parse(req.body);
      
      const results = await storage.searchResources(searchParams);
      
      res.json(results);
    } catch (error) {
      logger.error('Error searching resources', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid search parameters', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to search resources' });
    }
  });

  /**
   * Download resource (redirect to file)
   */
  app.get('/api/resources/:id/download', async (req: Request, res: Response) => {
    try {
      const resourceId = parseInt(req.params.id);
      const resource = await storage.getResource(resourceId);
      
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      
      // Check if resource is downloadable
      if (resource.type === 'link') {
        return res.redirect(resource.url);
      }
      
      // Check if file exists
      if (!resource.url || !fs.existsSync(resource.url)) {
        return res.status(404).json({ error: 'Resource file not found' });
      }
      
      // Increment download count
      await storage.incrementResourceDownloadCount(resourceId);
      
      // Get file details
      const fileName = path.basename(resource.url);
      const filePath = resource.url;
      
      // Stream the file
      res.download(filePath, fileName);
    } catch (error) {
      logger.error('Error downloading resource', { context: { error } });
      res.status(500).json({ error: 'Failed to download resource' });
    }
  });

  /**
   * Get resource categories
   */
  app.get('/api/resource-categories', async (req: Request, res: Response) => {
    try {
      const categories = await storage.getResourceCategories();
      
      res.json(categories);
    } catch (error) {
      logger.error('Error fetching resource categories', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch resource categories' });
    }
  });

  /**
   * Get resource types
   */
  app.get('/api/resource-types', async (req: Request, res: Response) => {
    try {
      const types = await storage.getResourceTypes();
      
      res.json(types);
    } catch (error) {
      logger.error('Error fetching resource types', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch resource types' });
    }
  });
  
  /**
   * Share resource with users
   */
  app.post('/api/resources/:id/share', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const resourceId = parseInt(req.params.id);
      const resource = await storage.getResource(resourceId);
      
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      
      // Check if user has permission to share
      if (req.user.role !== 'admin' && resource.createdById !== req.user.id) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      // Validate share schema
      const shareSchema = z.object({
        emails: z.array(z.string().email()),
        message: z.string().optional(),
        notifyUsers: z.boolean().optional(),
      });
      
      const { emails, message, notifyUsers = true } = shareSchema.parse(req.body);
      
      // Share resource
      const shareResults = await storage.shareResource(resourceId, {
        sharedById: req.user.id,
        emails,
        message,
        notifyUsers,
      });
      
      res.status(200).json(shareResults);
    } catch (error) {
      logger.error('Error sharing resource', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid share parameters', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to share resource' });
    }
  });
  
  /**
   * Get shares for a resource
   */
  app.get('/api/resources/:id/shares', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const resourceId = parseInt(req.params.id);
      const resource = await storage.getResource(resourceId);
      
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      
      // Check if user has permission to view shares
      if (req.user.role !== 'admin' && resource.createdById !== req.user.id) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      // Get shares
      const shares = await storage.getResourceShares(resourceId);
      
      res.json(shares);
    } catch (error) {
      logger.error('Error fetching resource shares', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch resource shares' });
    }
  });
  
  /**
   * Delete a share
   */
  app.delete('/api/resources/:id/shares/:shareId', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const resourceId = parseInt(req.params.id);
      const shareId = parseInt(req.params.shareId);
      
      const resource = await storage.getResource(resourceId);
      
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      
      // Check if user has permission to delete share
      if (req.user.role !== 'admin' && resource.createdById !== req.user.id) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      // Delete share
      await storage.deleteResourceShare(shareId);
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting resource share', { context: { error } });
      res.status(500).json({ error: 'Failed to delete resource share' });
    }
  });
}