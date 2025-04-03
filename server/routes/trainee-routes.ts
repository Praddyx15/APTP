import { Express, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { logger } from '../core/logger';
import { RoleType } from '@shared/risk-assessment-types';

/**
 * Register trainee-specific routes
 */
export function registerTraineeRoutes(app: Express) {
  /**
   * Get trainee profile data
   */
  app.get('/api/trainee/profile', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get user from storage to ensure latest data
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user is a trainee
      if (user.role !== 'trainee') {
        return res.status(403).json({ message: "Access denied: Not a trainee" });
      }

      // Get active training program for this trainee
      const userPrograms = await storage.getTraineePrograms(user.id);
      const activeProgram = userPrograms[0]; // Get the first/most recent one

      // Prepare trainee profile response
      const profile = {
        firstName: user.firstName,
        lastName: user.lastName,
        id: `ST${1000 + user.id}`, // Generate a student ID
        program: activeProgram?.name || "ATPL", // Default to ATPL if no program found
        phase: activeProgram?.phase || "Advanced",
        programCompletion: activeProgram?.completionPercentage || 68,
        flightHours: 142.5, // Mock value until we implement flight logs fully
        theorySessions: 12,
        theorySessions_total: 14,
        daysRemaining: 72,
        criticalPath: true,
        organizationType: user.organizationType
      };

      res.json(profile);
    } catch (error) {
      logger.error('Error fetching trainee profile', { error });
      res.status(500).json({ message: "Failed to get trainee profile", error: error.message });
    }
  });

  /**
   * Get trainee's upcoming schedule
   */
  app.get('/api/trainee/upcoming-schedule', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get upcoming sessions for this trainee
      const today = new Date();
      const inTwoWeeks = new Date();
      inTwoWeeks.setDate(today.getDate() + 14);

      const sessions = await storage.getTraineeSessionsByDateRange(
        req.user.id,
        today,
        inTwoWeeks
      );

      // Format sessions for response
      const schedule = sessions.map(session => {
        const sessionDate = new Date(session.startTime);
        const today = new Date();
        
        // Format the date for display
        let displayDate;
        if (sessionDate.toDateString() === today.toDateString()) {
          displayDate = "Today";
        } else {
          const tomorrow = new Date();
          tomorrow.setDate(today.getDate() + 1);
          if (sessionDate.toDateString() === tomorrow.toDateString()) {
            displayDate = "Tomorrow";
          } else {
            displayDate = `${sessionDate.toLocaleString('default', { month: 'short' })} ${sessionDate.getDate()}`;
          }
        }

        // Format the time
        const startTime = sessionDate.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false
        });
        
        const endTime = new Date(session.endTime).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false
        });

        // Determine status
        let status;
        if (displayDate === "Today") {
          status = "today";
        } else if (session.status === "scheduled") {
          status = "confirmed";
        } else {
          status = "pending";
        }

        return {
          activity: session.title || `${session.type} Session`,
          date: displayDate,
          time: `${startTime}-${endTime}`,
          status
        };
      });

      // Add demo data if none found (to be removed in production)
      if (schedule.length === 0) {
        const defaultSchedule = [
          {
            activity: "B737 Simulator Session",
            date: "Today",
            time: "14:00-17:00",
            status: "today"
          },
          {
            activity: "Emergency Procedures",
            date: "Tomorrow",
            time: "09:00-12:00",
            status: "confirmed"
          },
          {
            activity: "Flight Planning Seminar",
            date: "Mar 29",
            time: "13:00-15:00",
            status: "confirmed"
          },
          {
            activity: "Cross-Country Flight",
            date: "Mar 30",
            time: "10:00-16:00",
            status: "pending"
          }
        ];
        
        res.json(defaultSchedule);
        return;
      }

      res.json(schedule);
    } catch (error) {
      logger.error('Error fetching trainee schedule', { error });
      res.status(500).json({ message: "Failed to get trainee schedule", error: error.message });
    }
  });

  /**
   * Get trainee's performance analytics
   */
  app.get('/api/trainee/performance-analytics', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get performance metrics for this trainee
      const metrics = await storage.getTraineePerformanceMetrics(req.user.id);

      // Extract competency breakdown for radar chart if it exists
      let formattedMetrics = [];
      if (metrics && metrics.competencyBreakdown && Array.isArray(metrics.competencyBreakdown)) {
        formattedMetrics = metrics.competencyBreakdown.map(metric => ({
          skill: metric.area,
          value: metric.averageScore
        }));
      }

      // Add demo data if none found (to be removed in production)
      if (formattedMetrics.length === 0) {
        const defaultMetrics = [
          { skill: "Technical Knowledge", value: 75 },
          { skill: "Procedures", value: 65 },
          { skill: "Decision Making", value: 70 },
          { skill: "Flight Skills", value: 80 },
          { skill: "CRM", value: 68 },
        ];
        
        res.json(defaultMetrics);
        return;
      }

      res.json(formattedMetrics);
    } catch (error) {
      logger.error('Error fetching trainee performance', { error });
      res.status(500).json({ message: "Failed to get trainee performance", error: error.message });
    }
  });

  /**
   * Get trainee's recommended resources
   */
  app.get('/api/trainee/recommended-resources', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get custom recommended resources for this trainee
      const resources = await storage.getRecommendedResourcesForUser(req.user.id);

      // Format resources for response
      const formattedResources = resources.map(resource => {
        let type = "document";
        let action = "Open";
        
        if (resource.url && (resource.url.includes("youtube") || resource.url.includes("vimeo"))) {
          type = "video";
          action = "Watch";
        } else if (resource.url && resource.url.includes("quiz")) {
          type = "quiz";
          action = "Take";
        }

        return {
          title: resource.title,
          type,
          description: `${resource.resourceType || 'Training Material'} • ${resource.fileType || 'PDF Document'}`,
          action
        };
      });

      // Add demo data if none found (to be removed in production)
      if (formattedResources.length === 0) {
        const defaultResources = [
          {
            title: "Emergency Procedures Handbook",
            type: "document",
            description: "B737 Quick Reference • PDF Document",
            action: "Open"
          },
          {
            title: "Decision Making Under Pressure",
            type: "video",
            description: "Training Video • 45 minutes",
            action: "Watch"
          }
        ];
        
        res.json(defaultResources);
        return;
      }

      res.json(formattedResources);
    } catch (error) {
      logger.error('Error fetching recommended resources', { error });
      res.status(500).json({ message: "Failed to get recommended resources", error: error.message });
    }
  });

  /**
   * Get trainee's instructor feedback
   */
  app.get('/api/trainee/instructor-feedback', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get recent assessment feedbacks for this trainee
      const assessments = await storage.getRecentAssessments(req.user.id, 5);
      
      // Get the most recent feedback
      const latestFeedback = assessments.length > 0 ? assessments[0].feedback : "";

      // Add demo data if none found (to be removed in production)
      if (!latestFeedback) {
        const defaultFeedback = req.user.firstName + " demonstrates strong technical knowledge but needs more practice with emergency procedures.";
        res.json(defaultFeedback);
        return;
      }

      res.json(latestFeedback);
    } catch (error) {
      logger.error('Error fetching instructor feedback', { error });
      res.status(500).json({ message: "Failed to get instructor feedback", error: error.message });
    }
  });

  /**
   * Get trainee's training goals
   */
  app.get('/api/trainee/training-goals', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get training goals for this trainee
      const goals = await storage.getTrainingGoalsForUser(req.user.id);

      // Format goals for response
      const formattedGoals = goals.map(goal => ({
        goal: goal.name,
        progress: goal.progress
      }));

      // Add demo data if none found (to be removed in production)
      if (formattedGoals.length === 0) {
        const defaultGoals = [
          {
            goal: "Complete Emergency Procedures Training",
            progress: 75
          },
          {
            goal: "Pass All Theory Exams",
            progress: 85
          },
          {
            goal: "Complete Cross-Country Flight Requirements",
            progress: 60
          }
        ];
        
        res.json(defaultGoals);
        return;
      }

      res.json(formattedGoals);
    } catch (error) {
      logger.error('Error fetching training goals', { error });
      res.status(500).json({ message: "Failed to get training goals", error: error.message });
    }
  });

  /**
   * Get trainee's risk assessment data for 3D visualization
   */
  app.get('/api/trainee/risk-assessment-data', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get risk assessment data for visualization
      const riskData = await storage.getTraineeRiskData(req.user.id);
      
      if (!riskData) {
        // Create default visualization data
        const defaultRiskData = {
          performance: [
            { label: "Flight Skills", value: 78, color: "#3b82f6", position: [2, 1.5, 0] },
            { label: "Technical Knowledge", value: 65, color: "#8b5cf6", position: [-1, 2, 1] },
            { label: "Decision Making", value: 82, color: "#10b981", position: [0, -2, 1.5] },
            { label: "Emergency Procedures", value: 58, color: "#f59e0b", position: [1.5, 0, -2] },
            { label: "Communications", value: 90, color: "#6366f1", position: [-2, -1, -1.5] },
          ],
          sessions: [
            { label: "Ground School", value: 95, color: "#10b981", position: [2.5, -1, 1] },
            { label: "Simulator", value: 60, color: "#f59e0b", position: [-2, 0, 2] },
            { label: "Flight Hours", value: 42, color: "#ef4444", position: [0, 1, -2.5] },
          ],
          competencies: [
            { label: "Navigation", value: 70, color: "#0ea5e9", position: [-1.5, -1.5, 0] },
            { label: "Aircraft Handling", value: 85, color: "#10b981", position: [1, -0.5, 2] },
            { label: "Situational Awareness", value: 63, color: "#f59e0b", position: [0, 2.5, 0] },
            { label: "CRM", value: 76, color: "#8b5cf6", position: [-1, 0.5, -2] },
          ],
          connections: [
            { from: [2, 1.5, 0], to: [1, -0.5, 2], color: "#3b82f6" },
            { from: [-1, 2, 1], to: [0, 2.5, 0], color: "#8b5cf6" },
            { from: [0, -2, 1.5], to: [-1.5, -1.5, 0], color: "#10b981" },
            { from: [1.5, 0, -2], to: [-1, 0.5, -2], color: "#f59e0b" },
            { from: [-2, -1, -1.5], to: [-1, 0.5, -2], color: "#6366f1" },
            { from: [2.5, -1, 1], to: [1, -0.5, 2], color: "#10b981" },
            { from: [-2, 0, 2], to: [0, 2.5, 0], color: "#f59e0b" },
            { from: [0, 1, -2.5], to: [-1, 0.5, -2], color: "#ef4444" },
          ]
        };
        
        res.json(defaultRiskData);
        return;
      }

      res.json(riskData);
    } catch (error) {
      logger.error('Error fetching risk assessment data', { error });
      res.status(500).json({ message: "Failed to get risk assessment data", error: error.message });
    }
  });
}