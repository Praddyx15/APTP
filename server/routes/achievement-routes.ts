import { Express, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { logger } from '../core/logger';
import { insertAchievementSchema, insertUserAchievementSchema, insertLeaderboardSchema, insertLeaderboardEntrySchema } from '@shared/schema';

/**
 * Register achievement-related routes
 */
export function registerAchievementRoutes(app: Express) {
  /**
   * Get all achievements
   */
  app.get('/api/achievements', async (req: Request, res: Response) => {
    try {
      const achievements = await storage.getAllAchievements();
      res.json(achievements);
    } catch (error) {
      logger.error('Error fetching achievements', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch achievements' });
    }
  });

  /**
   * Get achievement by ID
   */
  app.get('/api/achievements/:id', async (req: Request, res: Response) => {
    try {
      const achievementId = parseInt(req.params.id);
      const achievement = await storage.getAchievement(achievementId);
      
      if (!achievement) {
        return res.status(404).json({ error: 'Achievement not found' });
      }
      
      res.json(achievement);
    } catch (error) {
      logger.error('Error fetching achievement', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch achievement' });
    }
  });

  /**
   * Create achievement (admin only)
   */
  app.post('/api/protected/achievements', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied. Only admins can create achievements.' });
      }
      
      // Validate achievement data
      const achievementData = insertAchievementSchema.parse(req.body);
      
      // Create achievement
      const achievement = await storage.createAchievement(achievementData);
      
      res.status(201).json(achievement);
    } catch (error) {
      logger.error('Error creating achievement', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid achievement data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to create achievement' });
    }
  });

  /**
   * Update achievement (admin only)
   */
  app.put('/api/protected/achievements/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied. Only admins can update achievements.' });
      }
      
      const achievementId = parseInt(req.params.id);
      const achievement = await storage.getAchievement(achievementId);
      
      if (!achievement) {
        return res.status(404).json({ error: 'Achievement not found' });
      }
      
      // Update achievement
      const updatedAchievement = await storage.updateAchievement(achievementId, req.body);
      
      res.json(updatedAchievement);
    } catch (error) {
      logger.error('Error updating achievement', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid achievement data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to update achievement' });
    }
  });

  /**
   * Delete achievement (admin only)
   */
  app.delete('/api/protected/achievements/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied. Only admins can delete achievements.' });
      }
      
      const achievementId = parseInt(req.params.id);
      const achievement = await storage.getAchievement(achievementId);
      
      if (!achievement) {
        return res.status(404).json({ error: 'Achievement not found' });
      }
      
      // Delete achievement
      await storage.deleteAchievement(achievementId);
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting achievement', { context: { error } });
      res.status(500).json({ error: 'Failed to delete achievement' });
    }
  });

  /**
   * Get user achievements
   */
  app.get('/api/protected/user-achievements', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get user achievements
      const achievements = await storage.getUserAchievements(req.user.id);
      
      res.json(achievements);
    } catch (error) {
      logger.error('Error fetching user achievements', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch user achievements' });
    }
  });

  /**
   * Grant achievement to user (admin, instructor, examiner only)
   */
  app.post('/api/protected/user-achievements', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (req.user.role !== 'admin' && req.user.role !== 'instructor' && req.user.role !== 'examiner') {
        return res.status(403).json({ error: 'Permission denied. Only admins, instructors, and examiners can grant achievements.' });
      }
      
      // Validate user achievement data
      const userAchievementSchema = z.object({
        userId: z.number(),
        achievementId: z.number(),
        progress: z.number().optional(),
        metadata: z.record(z.any()).optional(),
      });
      
      const userAchievementData = userAchievementSchema.parse(req.body);
      
      // Grant achievement
      const userAchievement = await storage.grantAchievementToUser(
        userAchievementData.userId,
        userAchievementData.achievementId,
        {
          progress: userAchievementData.progress,
          metadata: userAchievementData.metadata,
          grantedById: req.user.id,
        }
      );
      
      res.status(201).json(userAchievement);
    } catch (error) {
      logger.error('Error granting achievement', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid user achievement data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to grant achievement' });
    }
  });

  /**
   * Update user achievement progress
   */
  app.put('/api/protected/user-achievements/:achievementId', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userId = req.user.id;
      const achievementId = parseInt(req.params.achievementId);
      
      // Validate progress data
      const progressSchema = z.object({
        progress: z.number(),
        metadata: z.record(z.any()).optional(),
      });
      
      const { progress, metadata } = progressSchema.parse(req.body);
      
      // Update progress
      const userAchievement = await storage.updateUserAchievementProgress(userId, achievementId, progress, metadata);
      
      res.json(userAchievement);
    } catch (error) {
      logger.error('Error updating achievement progress', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid progress data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to update achievement progress' });
    }
  });

  /**
   * Revoke user achievement (admin only)
   */
  app.delete('/api/protected/user-achievements/:userId/:achievementId', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied. Only admins can revoke achievements.' });
      }
      
      const userId = parseInt(req.params.userId);
      const achievementId = parseInt(req.params.achievementId);
      
      // Revoke achievement
      await storage.revokeUserAchievement(userId, achievementId);
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error revoking achievement', { context: { error } });
      res.status(500).json({ error: 'Failed to revoke achievement' });
    }
  });

  /**
   * Get all leaderboards
   */
  app.get('/api/leaderboards', async (req: Request, res: Response) => {
    try {
      const leaderboards = await storage.getAllLeaderboards();
      res.json(leaderboards);
    } catch (error) {
      logger.error('Error fetching leaderboards', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch leaderboards' });
    }
  });

  /**
   * Get leaderboard by ID
   */
  app.get('/api/leaderboards/:id', async (req: Request, res: Response) => {
    try {
      const leaderboardId = parseInt(req.params.id);
      const leaderboard = await storage.getLeaderboard(leaderboardId);
      
      if (!leaderboard) {
        return res.status(404).json({ error: 'Leaderboard not found' });
      }
      
      // Get entries
      const entries = await storage.getLeaderboardEntries(leaderboardId);
      
      res.json({
        ...leaderboard,
        entries,
      });
    } catch (error) {
      logger.error('Error fetching leaderboard', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  /**
   * Create leaderboard (admin only)
   */
  app.post('/api/protected/leaderboards', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied. Only admins can create leaderboards.' });
      }
      
      // Validate leaderboard data
      const leaderboardData = insertLeaderboardSchema.parse({
        ...req.body,
        createdById: req.user.id,
      });
      
      // Create leaderboard
      const leaderboard = await storage.createLeaderboard(leaderboardData);
      
      res.status(201).json(leaderboard);
    } catch (error) {
      logger.error('Error creating leaderboard', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid leaderboard data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to create leaderboard' });
    }
  });

  /**
   * Update leaderboard (admin only)
   */
  app.put('/api/protected/leaderboards/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied. Only admins can update leaderboards.' });
      }
      
      const leaderboardId = parseInt(req.params.id);
      const leaderboard = await storage.getLeaderboard(leaderboardId);
      
      if (!leaderboard) {
        return res.status(404).json({ error: 'Leaderboard not found' });
      }
      
      // Update leaderboard
      const updatedLeaderboard = await storage.updateLeaderboard(leaderboardId, req.body);
      
      res.json(updatedLeaderboard);
    } catch (error) {
      logger.error('Error updating leaderboard', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid leaderboard data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to update leaderboard' });
    }
  });

  /**
   * Delete leaderboard (admin only)
   */
  app.delete('/api/protected/leaderboards/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied. Only admins can delete leaderboards.' });
      }
      
      const leaderboardId = parseInt(req.params.id);
      const leaderboard = await storage.getLeaderboard(leaderboardId);
      
      if (!leaderboard) {
        return res.status(404).json({ error: 'Leaderboard not found' });
      }
      
      // Delete leaderboard
      await storage.deleteLeaderboard(leaderboardId);
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting leaderboard', { context: { error } });
      res.status(500).json({ error: 'Failed to delete leaderboard' });
    }
  });

  /**
   * Add entry to leaderboard (admin, instructor, examiner only)
   */
  app.post('/api/protected/leaderboards/:id/entries', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (req.user.role !== 'admin' && req.user.role !== 'instructor' && req.user.role !== 'examiner') {
        return res.status(403).json({ error: 'Permission denied. Only admins, instructors, and examiners can add leaderboard entries.' });
      }
      
      const leaderboardId = parseInt(req.params.id);
      const leaderboard = await storage.getLeaderboard(leaderboardId);
      
      if (!leaderboard) {
        return res.status(404).json({ error: 'Leaderboard not found' });
      }
      
      // Validate entry data
      const entrySchema = z.object({
        userId: z.number(),
        score: z.number(),
        metadata: z.record(z.any()).optional(),
      });
      
      const entryData = entrySchema.parse(req.body);
      
      // Add entry
      const entry = await storage.addLeaderboardEntry({
        leaderboardId,
        userId: entryData.userId,
        score: entryData.score,
        metadata: entryData.metadata,
        addedById: req.user.id,
      });
      
      res.status(201).json(entry);
    } catch (error) {
      logger.error('Error adding leaderboard entry', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid entry data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to add leaderboard entry' });
    }
  });

  /**
   * Update leaderboard entry (admin only)
   */
  app.put('/api/protected/leaderboard-entries/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied. Only admins can update leaderboard entries.' });
      }
      
      const entryId = parseInt(req.params.id);
      const entry = await storage.getLeaderboardEntry(entryId);
      
      if (!entry) {
        return res.status(404).json({ error: 'Leaderboard entry not found' });
      }
      
      // Update entry
      const updatedEntry = await storage.updateLeaderboardEntry(entryId, req.body);
      
      res.json(updatedEntry);
    } catch (error) {
      logger.error('Error updating leaderboard entry', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid entry data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to update leaderboard entry' });
    }
  });

  /**
   * Delete leaderboard entry (admin only)
   */
  /**
   * Manual trigger for checking achievements (can be used from any component)
   */
  app.post('/api/protected/achievement-triggers', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Validate trigger data
      const triggerSchema = z.object({
        userId: z.number(),
        type: z.string(),
        value: z.number(),
        metadata: z.record(z.any()).optional(),
      });
      
      const triggerData = triggerSchema.parse(req.body);
      
      // Check if the user has permission to trigger achievements for this user
      if (triggerData.userId !== req.user.id && 
          req.user.role !== 'admin' && 
          req.user.role !== 'instructor' && 
          req.user.role !== 'examiner') {
        return res.status(403).json({ 
          error: 'Permission denied. You can only trigger achievements for your own user or as an admin/instructor/examiner.' 
        });
      }
      
      // Check achievement triggers
      const achievements = await storage.checkAchievementTriggers(triggerData);
      
      res.json({
        triggered: achievements.length > 0,
        achievements,
      });
    } catch (error) {
      logger.error('Error checking achievement triggers', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid trigger data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to check achievement triggers' });
    }
  });

  app.delete('/api/protected/leaderboard-entries/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied. Only admins can delete leaderboard entries.' });
      }
      
      const entryId = parseInt(req.params.id);
      const entry = await storage.getLeaderboardEntry(entryId);
      
      if (!entry) {
        return res.status(404).json({ error: 'Leaderboard entry not found' });
      }
      
      // Delete entry
      await storage.deleteLeaderboardEntry(entryId);
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting leaderboard entry', { context: { error } });
      res.status(500).json({ error: 'Failed to delete leaderboard entry' });
    }
  });

  /**
   * Get user's rank in leaderboard
   */
  app.get('/api/protected/leaderboards/:id/rank', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const leaderboardId = parseInt(req.params.id);
      const leaderboard = await storage.getLeaderboard(leaderboardId);
      
      if (!leaderboard) {
        return res.status(404).json({ error: 'Leaderboard not found' });
      }
      
      // Get user's rank
      const rank = await storage.getUserLeaderboardRank(leaderboardId, req.user.id);
      
      res.json(rank);
    } catch (error) {
      logger.error('Error fetching user rank', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch user rank' });
    }
  });

  /**
   * Check achievements (trigger achievement checks manually)
   */
  app.post('/api/protected/check-achievements', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Trigger achievement checks
      const newAchievements = await storage.checkUserAchievements(req.user.id);
      
      res.json({
        checked: true,
        newAchievements,
      });
    } catch (error) {
      logger.error('Error checking achievements', { context: { error } });
      res.status(500).json({ error: 'Failed to check achievements' });
    }
  });
}