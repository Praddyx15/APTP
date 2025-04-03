import { Express, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { logger } from '../core/logger';
import { insertNotificationSchema } from '@shared/schema';

/**
 * Register notification-related routes
 */
export function registerNotificationRoutes(app: Express) {
  /**
   * Get user notifications
   */
  app.get('/api/protected/notifications', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get user notifications
      const notifications = await storage.getUserNotifications(req.user.id);
      
      res.json(notifications);
    } catch (error) {
      logger.error('Error fetching notifications', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  /**
   * Get notification by ID
   */
  app.get('/api/protected/notifications/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const notificationId = parseInt(req.params.id);
      const notification = await storage.getNotification(notificationId);
      
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      // Check if notification belongs to user
      if (notification.userId !== req.user.id) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      res.json(notification);
    } catch (error) {
      logger.error('Error fetching notification', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch notification' });
    }
  });

  /**
   * Create notification
   */
  app.post('/api/protected/notifications', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Validate that user has permission (admin, instructor, examiner)
      if (req.user.role !== 'admin' && req.user.role !== 'instructor' && req.user.role !== 'examiner') {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      // Validate notification data
      const notificationSchema = z.object({
        userId: z.number(),
        type: z.string(),
        title: z.string(),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        link: z.string().optional(),
        metadata: z.record(z.any()).optional(),
        senderId: z.number().optional(),
      });
      
      const notificationData = notificationSchema.parse({
        ...req.body,
        senderId: req.user.id,
      });
      
      // Create notification
      const notification = await storage.createNotification(notificationData);
      
      res.status(201).json(notification);
    } catch (error) {
      logger.error('Error creating notification', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid notification data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to create notification' });
    }
  });

  /**
   * Mark notification as read
   */
  app.put('/api/protected/notifications/:id/read', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const notificationId = parseInt(req.params.id);
      const notification = await storage.getNotification(notificationId);
      
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      // Check if notification belongs to user
      if (notification.userId !== req.user.id) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      // Mark as read
      await storage.markNotificationAsRead(notificationId);
      
      res.json({ success: true });
    } catch (error) {
      logger.error('Error marking notification as read', { context: { error } });
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  /**
   * Mark all notifications as read
   */
  app.put('/api/protected/notifications/read-all', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Mark all as read
      await storage.markAllNotificationsAsRead(req.user.id);
      
      res.json({ success: true });
    } catch (error) {
      logger.error('Error marking all notifications as read', { context: { error } });
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  });

  /**
   * Delete notification
   */
  app.delete('/api/protected/notifications/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const notificationId = parseInt(req.params.id);
      const notification = await storage.getNotification(notificationId);
      
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      // Check if notification belongs to user
      if (notification.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      // Delete notification
      await storage.deleteNotification(notificationId);
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting notification', { context: { error } });
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  });

  /**
   * Send notification to multiple users
   */
  app.post('/api/protected/notifications/batch', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Validate that user has permission (admin, instructor, examiner)
      if (req.user.role !== 'admin' && req.user.role !== 'instructor' && req.user.role !== 'examiner') {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      // Validate batch notification data
      const batchSchema = z.object({
        userIds: z.array(z.number()),
        type: z.string(),
        title: z.string(),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        link: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      });
      
      const { userIds, ...notificationData } = batchSchema.parse(req.body);
      
      // Create notifications
      const results = await Promise.all(
        userIds.map(async (userId) => {
          try {
            const notification = await storage.createNotification({
              ...notificationData,
              userId,
              senderId: req.user?.id,
            });
            return { userId, success: true, notification };
          } catch (error) {
            return { userId, success: false, error: (error as Error).message };
          }
        })
      );
      
      res.status(201).json({
        success: true,
        results,
      });
    } catch (error) {
      logger.error('Error sending batch notifications', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid batch notification data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to send batch notifications' });
    }
  });

  /**
   * Get user notification preferences
   */
  app.get('/api/protected/notification-preferences', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get notification preferences
      const preferences = await storage.getUserNotificationPreferences(req.user.id);
      
      res.json(preferences);
    } catch (error) {
      logger.error('Error fetching notification preferences', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch notification preferences' });
    }
  });

  /**
   * Update user notification preferences
   */
  app.put('/api/protected/notification-preferences', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Validate preferences schema
      const preferencesSchema = z.object({
        emailEnabled: z.boolean().optional(),
        pushEnabled: z.boolean().optional(),
        inAppEnabled: z.boolean().optional(),
        notifyOnAssessment: z.boolean().optional(),
        notifyOnSession: z.boolean().optional(),
        notifyOnMessage: z.boolean().optional(),
        notifyOnResource: z.boolean().optional(),
        notifyOnAnnouncement: z.boolean().optional(),
        notifyOnGrade: z.boolean().optional(),
      });
      
      const preferences = preferencesSchema.parse(req.body);
      
      // Update preferences
      await storage.updateUserNotificationPreferences(req.user.id, preferences);
      
      res.json({ success: true, preferences });
    } catch (error) {
      logger.error('Error updating notification preferences', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid preferences data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to update notification preferences' });
    }
  });

  /**
   * Send announcement to all users
   */
  app.post('/api/protected/announcements', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Validate that user has permission (admin only)
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied. Only admins can create announcements.' });
      }
      
      // Validate announcement data
      const announcementSchema = z.object({
        title: z.string(),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        link: z.string().optional(),
        roleFilter: z.array(z.string()).optional(),
        organizationTypeFilter: z.array(z.string()).optional(),
        validUntil: z.string().optional(), // ISO date string
      });
      
      const announcement = announcementSchema.parse(req.body);
      
      // Get users based on filters
      let users = await storage.getAllUsers();
      
      // Apply role filter if provided
      if (announcement.roleFilter && announcement.roleFilter.length > 0) {
        users = users.filter(user => announcement.roleFilter?.includes(user.role));
      }
      
      // Apply organization type filter if provided
      if (announcement.organizationTypeFilter && announcement.organizationTypeFilter.length > 0) {
        users = users.filter(user => 
          user.organizationType && 
          announcement.organizationTypeFilter?.includes(user.organizationType)
        );
      }
      
      // Create notification for each user
      const results = await Promise.all(
        users.map(async (user) => {
          try {
            const notification = await storage.createNotification({
              userId: user.id,
              type: 'announcement',
              title: announcement.title,
              message: announcement.message,
              priority: announcement.priority || 'medium',
              link: announcement.link,
              senderId: req.user?.id,
              metadata: {
                validUntil: announcement.validUntil,
                isAnnouncement: true,
              },
            });
            return { userId: user.id, success: true };
          } catch (error) {
            return { userId: user.id, success: false, error: (error as Error).message };
          }
        })
      );
      
      res.status(201).json({
        success: true,
        userCount: users.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
      });
    } catch (error) {
      logger.error('Error creating announcement', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid announcement data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to create announcement' });
    }
  });
}