import { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";

// Define the schema for session creation/updates
const sessionSchema = z.object({
  programId: z.number(),
  moduleId: z.number(),
  instructorId: z.number(),
  status: z.string().default('scheduled'),
  startTime: z.string().or(z.date()).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  endTime: z.string().or(z.date()).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  trainees: z.array(z.number()).optional(),
  resourceId: z.number().nullable().optional(),
  notes: z.string().optional(),
  location: z.string().optional(),
  title: z.string().optional(),
});

const sessionUpdateSchema = sessionSchema.partial();

export function registerScheduleRoutes(app: Express) {
  // Get all sessions
  app.get("/api/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllSessions();
      
      // Get trainees for each session
      const sessionsWithTrainees = await Promise.all(
        sessions.map(async (session) => {
          const trainees = await storage.getSessionTrainees(session.id);
          return {
            ...session,
            trainees,
          };
        })
      );
      
      res.json(sessionsWithTrainees);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Get sessions for a specific instructor
  app.get("/api/sessions/instructor/:instructorId", async (req, res) => {
    try {
      const instructorId = parseInt(req.params.instructorId);
      const sessions = await storage.getSessionsByInstructor(instructorId);
      
      // Get trainees for each session
      const sessionsWithTrainees = await Promise.all(
        sessions.map(async (session) => {
          const trainees = await storage.getSessionTrainees(session.id);
          return {
            ...session,
            trainees,
          };
        })
      );
      
      res.json(sessionsWithTrainees);
    } catch (error) {
      console.error("Error fetching instructor sessions:", error);
      res.status(500).json({ message: "Failed to fetch instructor sessions" });
    }
  });

  // Get sessions for a specific trainee
  app.get("/api/sessions/trainee/:traineeId", async (req, res) => {
    try {
      const traineeId = parseInt(req.params.traineeId);
      const sessions = await storage.getSessionsByTrainee(traineeId);
      
      // Get all trainees for each session
      const sessionsWithTrainees = await Promise.all(
        sessions.map(async (session) => {
          const trainees = await storage.getSessionTrainees(session.id);
          return {
            ...session,
            trainees,
          };
        })
      );
      
      res.json(sessionsWithTrainees);
    } catch (error) {
      console.error("Error fetching trainee sessions:", error);
      res.status(500).json({ message: "Failed to fetch trainee sessions" });
    }
  });

  // Get sessions for a specific module
  app.get("/api/sessions/module/:moduleId", async (req, res) => {
    try {
      const moduleId = parseInt(req.params.moduleId);
      const allSessions = await storage.getAllSessions();
      
      const filteredSessions = allSessions.filter(session => session.moduleId === moduleId);
      
      // Get trainees for each session
      const sessionsWithTrainees = await Promise.all(
        filteredSessions.map(async (session) => {
          const trainees = await storage.getSessionTrainees(session.id);
          return {
            ...session,
            trainees,
          };
        })
      );
      
      res.json(sessionsWithTrainees);
    } catch (error) {
      console.error("Error fetching module sessions:", error);
      res.status(500).json({ message: "Failed to fetch module sessions" });
    }
  });

  // Get sessions for a specific program
  app.get("/api/sessions/program/:programId", async (req, res) => {
    try {
      const programId = parseInt(req.params.programId);
      const allSessions = await storage.getAllSessions();
      
      const filteredSessions = allSessions.filter(session => session.programId === programId);
      
      // Get trainees for each session
      const sessionsWithTrainees = await Promise.all(
        filteredSessions.map(async (session) => {
          const trainees = await storage.getSessionTrainees(session.id);
          return {
            ...session,
            trainees,
          };
        })
      );
      
      res.json(sessionsWithTrainees);
    } catch (error) {
      console.error("Error fetching program sessions:", error);
      res.status(500).json({ message: "Failed to fetch program sessions" });
    }
  });

  // Get a specific session
  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Get trainees for this session
      const trainees = await storage.getSessionTrainees(sessionId);
      
      res.json({
        ...session,
        trainees,
      });
    } catch (error) {
      console.error("Error fetching session details:", error);
      res.status(500).json({ message: "Failed to fetch session details" });
    }
  });

  // Create a new session
  app.post("/api/protected/sessions", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Validate the session data
      const validatedData = sessionSchema.parse({
        ...req.body,
        instructorId: req.body.instructorId || req.user.id,
      });
      
      // Create the session
      const { trainees, ...sessionData } = validatedData;
      const session = await storage.createSession(sessionData);
      
      // Add trainees to the session if provided
      if (trainees && trainees.length > 0) {
        await Promise.all(
          trainees.map(traineeId => 
            storage.addTraineeToSession({
              sessionId: session.id,
              traineeId
            })
          )
        );
      }
      
      // Get the updated session with trainees
      const sessionTrainees = await storage.getSessionTrainees(session.id);
      
      res.status(201).json({
        ...session,
        trainees: sessionTrainees,
      });
    } catch (error) {
      console.error("Error creating session:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  // Update a session
  app.put("/api/protected/sessions/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Check permission (admin, the instructor of the session, or ato_admin)
      if (req.user.role !== 'admin' && 
          req.user.role !== 'ato_admin' && 
          session.instructorId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to update this session" });
      }
      
      // Validate the update data
      const { trainees, ...updateData } = sessionUpdateSchema.parse(req.body);
      
      // Update the session
      const updatedSession = await storage.updateSession(sessionId, updateData);
      
      // Update trainees if provided
      if (trainees !== undefined) {
        // Get current trainees
        const currentTrainees = await storage.getSessionTrainees(sessionId);
        
        // Remove trainees that are not in the new list
        for (const traineeId of currentTrainees) {
          if (!trainees.includes(traineeId)) {
            await storage.removeTraineeFromSession(sessionId, traineeId);
          }
        }
        
        // Add new trainees
        for (const traineeId of trainees) {
          if (!currentTrainees.includes(traineeId)) {
            await storage.addTraineeToSession({
              sessionId,
              traineeId
            });
          }
        }
      }
      
      // Check if status was updated to completed
      if (updateData.status === 'completed' && session.status !== 'completed') {
        try {
          // Get trainees for achievement triggers
          const sessionTrainees = await storage.getSessionTrainees(sessionId);
          
          // Process achievement triggers for each trainee
          for (const traineeId of sessionTrainees) {
            // Trigger session completion achievement
            await storage.checkAchievementTriggers({
              userId: traineeId,
              type: 'session_completion',
              value: 1,
              metadata: {
                sessionId: sessionId,
                moduleId: session.moduleId,
                programId: session.programId,
                instructorId: session.instructorId
              }
            });
            
            // Trigger flight hours achievement if applicable
            if (updatedSession.endTime && updatedSession.startTime) {
              const sessionDurationHours = 
                (updatedSession.endTime.getTime() - updatedSession.startTime.getTime()) / (1000 * 60 * 60);
              
              await storage.checkAchievementTriggers({
                userId: traineeId,
                type: 'flight_hours',
                value: sessionDurationHours,
                metadata: {
                  sessionId: sessionId,
                  moduleId: session.moduleId,
                  programId: session.programId
                }
              });
            }
            
            console.log(`Processed achievement triggers for trainee ${traineeId} after session completion`);
          }
        } catch (achievementError) {
          console.error("Error processing achievement triggers:", achievementError);
          // Don't fail the request if achievement processing fails
        }
      }
      
      // Get the updated list of trainees
      const updatedTrainees = await storage.getSessionTrainees(sessionId);
      
      res.json({
        ...updatedSession,
        trainees: updatedTrainees,
      });
    } catch (error) {
      console.error("Error updating session:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  // Delete a session
  app.delete("/api/protected/sessions/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Check permission (admin, the instructor of the session, or ato_admin)
      if (req.user.role !== 'admin' && 
          req.user.role !== 'ato_admin' && 
          session.instructorId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to delete this session" });
      }
      
      // Delete the session
      await storage.deleteSession(sessionId);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting session:", error);
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  // Add a trainee to a session
  app.post("/api/protected/sessions/:id/trainees", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Check permission (admin, the instructor of the session, or ato_admin)
      if (req.user.role !== 'admin' && 
          req.user.role !== 'ato_admin' && 
          session.instructorId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to modify this session" });
      }
      
      const { traineeId } = req.body;
      if (!traineeId) {
        return res.status(400).json({ message: "Trainee ID is required" });
      }
      
      // Add the trainee to the session
      await storage.addTraineeToSession({
        sessionId,
        traineeId
      });
      
      // Get the updated list of trainees
      const trainees = await storage.getSessionTrainees(sessionId);
      
      res.status(201).json({
        sessionId,
        trainees
      });
    } catch (error) {
      console.error("Error adding trainee to session:", error);
      res.status(500).json({ message: "Failed to add trainee to session" });
    }
  });

  // Remove a trainee from a session
  app.delete("/api/protected/sessions/:id/trainees/:traineeId", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Check permission (admin, the instructor of the session, or ato_admin)
      if (req.user.role !== 'admin' && 
          req.user.role !== 'ato_admin' && 
          session.instructorId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to modify this session" });
      }
      
      const traineeId = parseInt(req.params.traineeId);
      
      // Remove the trainee from the session
      await storage.removeTraineeFromSession(sessionId, traineeId);
      
      // Get the updated list of trainees
      const trainees = await storage.getSessionTrainees(sessionId);
      
      res.json({
        sessionId,
        trainees
      });
    } catch (error) {
      console.error("Error removing trainee from session:", error);
      res.status(500).json({ message: "Failed to remove trainee from session" });
    }
  });

  // Get weekly schedule for an instructor
  app.get("/api/schedule/instructor/:instructorId/weekly", async (req, res) => {
    try {
      const instructorId = parseInt(req.params.instructorId);
      const weeklySchedule = await storage.getInstructorWeeklySchedule(instructorId);
      res.json(weeklySchedule);
    } catch (error) {
      console.error("Error fetching instructor weekly schedule:", error);
      res.status(500).json({ message: "Failed to fetch instructor weekly schedule" });
    }
  });

  // Get today's sessions for an instructor
  app.get("/api/schedule/instructor/:instructorId/today", async (req, res) => {
    try {
      const instructorId = parseInt(req.params.instructorId);
      const todaySessions = await storage.getInstructorTodaySessions(instructorId);
      res.json(todaySessions);
    } catch (error) {
      console.error("Error fetching instructor today sessions:", error);
      res.status(500).json({ message: "Failed to fetch instructor today sessions" });
    }
  });
}