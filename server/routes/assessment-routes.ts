import express from "express";
import { z } from "zod";
import { storage } from "../storage";
import { Assessment, insertAssessmentSchema, InsertAssessment, Grade, insertGradeSchema, InsertGrade } from "@shared/schema";

export function registerAssessmentRoutes(app: express.Express) {
  // Get all assessments
  app.get("/api/assessments", async (req, res) => {
    try {
      const assessments = await storage.getAllAssessments();
      res.json(assessments);
    } catch (error) {
      console.error("Error fetching assessments:", error);
      res.status(500).json({ error: "Failed to fetch assessments" });
    }
  });

  // Get a specific assessment by ID
  app.get("/api/assessments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid assessment ID" });
      }

      const assessment = await storage.getAssessment(id);
      if (!assessment) {
        return res.status(404).json({ error: "Assessment not found" });
      }

      res.json(assessment);
    } catch (error) {
      console.error("Error fetching assessment:", error);
      res.status(500).json({ error: "Failed to fetch assessment" });
    }
  });

  // Get assessments for a trainee
  app.get("/api/assessments/trainee/:traineeId", async (req, res) => {
    try {
      const traineeId = parseInt(req.params.traineeId);
      if (isNaN(traineeId)) {
        return res.status(400).json({ error: "Invalid trainee ID" });
      }

      const assessments = await storage.getAssessmentsByTrainee(traineeId);
      res.json(assessments);
    } catch (error) {
      console.error("Error fetching trainee assessments:", error);
      res.status(500).json({ error: "Failed to fetch trainee assessments" });
    }
  });

  // Get assessments for an instructor
  app.get("/api/assessments/instructor/:instructorId", async (req, res) => {
    try {
      const instructorId = parseInt(req.params.instructorId);
      if (isNaN(instructorId)) {
        return res.status(400).json({ error: "Invalid instructor ID" });
      }

      const assessments = await storage.getAssessmentsByInstructor(instructorId);
      res.json(assessments);
    } catch (error) {
      console.error("Error fetching instructor assessments:", error);
      res.status(500).json({ error: "Failed to fetch instructor assessments" });
    }
  });

  // Create a new assessment
  app.post("/api/assessments", async (req, res) => {
    try {
      const assessmentData = insertAssessmentSchema.parse(req.body);
      const assessment = await storage.createAssessment(assessmentData);
      res.status(201).json(assessment);
    } catch (error) {
      console.error("Error creating assessment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create assessment" });
    }
  });

  // Update an assessment
  app.patch("/api/assessments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid assessment ID" });
      }

      // Don't use insertAssessmentSchema because we're doing a partial update
      const updateData = req.body;
      
      const updatedAssessment = await storage.updateAssessment(id, updateData);
      if (!updatedAssessment) {
        return res.status(404).json({ error: "Assessment not found" });
      }

      res.json(updatedAssessment);
    } catch (error) {
      console.error("Error updating assessment:", error);
      res.status(500).json({ error: "Failed to update assessment" });
    }
  });

  // Delete an assessment
  app.delete("/api/assessments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid assessment ID" });
      }

      const success = await storage.deleteAssessment(id);
      if (!success) {
        return res.status(404).json({ error: "Assessment not found" });
      }

      res.status(204).end();
    } catch (error) {
      console.error("Error deleting assessment:", error);
      res.status(500).json({ error: "Failed to delete assessment" });
    }
  });

  // Get performance metrics for a trainee
  app.get("/api/trainees/:traineeId/performance", async (req, res) => {
    try {
      const traineeId = parseInt(req.params.traineeId);
      if (isNaN(traineeId)) {
        return res.status(400).json({ error: "Invalid trainee ID" });
      }

      const metrics = await storage.getTraineePerformanceMetrics(traineeId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching trainee performance metrics:", error);
      res.status(500).json({ error: "Failed to fetch trainee performance metrics" });
    }
  });

  // Get assessment ratings for an instructor
  app.get("/api/instructors/:instructorId/ratings", async (req, res) => {
    try {
      const instructorId = parseInt(req.params.instructorId);
      if (isNaN(instructorId)) {
        return res.status(400).json({ error: "Invalid instructor ID" });
      }

      const ratings = await storage.getInstructorAssessmentRatings(instructorId);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching instructor ratings:", error);
      res.status(500).json({ error: "Failed to fetch instructor ratings" });
    }
  });

  // Get trainees performance for an instructor
  app.get("/api/instructors/:instructorId/trainees-performance", async (req, res) => {
    try {
      const instructorId = parseInt(req.params.instructorId);
      if (isNaN(instructorId)) {
        return res.status(400).json({ error: "Invalid instructor ID" });
      }

      const traineesPerformance = await storage.getInstructorTraineesPerformance(instructorId);
      res.json(traineesPerformance);
    } catch (error) {
      console.error("Error fetching trainees performance:", error);
      res.status(500).json({ error: "Failed to fetch trainees performance" });
    }
  });

  // Get pending gradesheets for an instructor
  app.get("/api/instructors/:instructorId/pending-gradesheets", async (req, res) => {
    try {
      const instructorId = parseInt(req.params.instructorId);
      if (isNaN(instructorId)) {
        return res.status(400).json({ error: "Invalid instructor ID" });
      }

      const pendingGradesheets = await storage.getInstructorPendingGradesheets(instructorId);
      res.json(pendingGradesheets);
    } catch (error) {
      console.error("Error fetching pending gradesheets:", error);
      res.status(500).json({ error: "Failed to fetch pending gradesheets" });
    }
  });

  // Get weekly schedule for an instructor
  app.get("/api/instructors/:instructorId/weekly-schedule", async (req, res) => {
    try {
      const instructorId = parseInt(req.params.instructorId);
      if (isNaN(instructorId)) {
        return res.status(400).json({ error: "Invalid instructor ID" });
      }

      const weeklySchedule = await storage.getInstructorWeeklySchedule(instructorId);
      res.json(weeklySchedule);
    } catch (error) {
      console.error("Error fetching weekly schedule:", error);
      res.status(500).json({ error: "Failed to fetch weekly schedule" });
    }
  });

  // Get today's sessions for an instructor
  app.get("/api/instructors/:instructorId/today-sessions", async (req, res) => {
    try {
      const instructorId = parseInt(req.params.instructorId);
      if (isNaN(instructorId)) {
        return res.status(400).json({ error: "Invalid instructor ID" });
      }

      const todaySessions = await storage.getInstructorTodaySessions(instructorId);
      res.json(todaySessions);
    } catch (error) {
      console.error("Error fetching today's sessions:", error);
      res.status(500).json({ error: "Failed to fetch today's sessions" });
    }
  });

  // ---------- Grade Routes ----------

  // Get grades for an assessment
  app.get("/api/assessments/:assessmentId/grades", async (req, res) => {
    try {
      const assessmentId = parseInt(req.params.assessmentId);
      if (isNaN(assessmentId)) {
        return res.status(400).json({ error: "Invalid assessment ID" });
      }

      const grades = await storage.getGradesByAssessment(assessmentId);
      res.json(grades);
    } catch (error) {
      console.error("Error fetching grades:", error);
      res.status(500).json({ error: "Failed to fetch grades" });
    }
  });

  // Get a specific grade
  app.get("/api/grades/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid grade ID" });
      }

      const grade = await storage.getGrade(id);
      if (!grade) {
        return res.status(404).json({ error: "Grade not found" });
      }

      res.json(grade);
    } catch (error) {
      console.error("Error fetching grade:", error);
      res.status(500).json({ error: "Failed to fetch grade" });
    }
  });

  // Create a new grade
  app.post("/api/grades", async (req, res) => {
    try {
      const gradeData = insertGradeSchema.parse(req.body);
      const grade = await storage.createGrade(gradeData);
      res.status(201).json(grade);
    } catch (error) {
      console.error("Error creating grade:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create grade" });
    }
  });

  // Update a grade
  app.patch("/api/grades/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid grade ID" });
      }

      // Don't use insertGradeSchema because we're doing a partial update
      const updateData = req.body;
      
      const updatedGrade = await storage.updateGrade(id, updateData);
      if (!updatedGrade) {
        return res.status(404).json({ error: "Grade not found" });
      }

      res.json(updatedGrade);
    } catch (error) {
      console.error("Error updating grade:", error);
      res.status(500).json({ error: "Failed to update grade" });
    }
  });

  // Delete a grade
  app.delete("/api/grades/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid grade ID" });
      }

      const success = await storage.deleteGrade(id);
      if (!success) {
        return res.status(404).json({ error: "Grade not found" });
      }

      res.status(204).end();
    } catch (error) {
      console.error("Error deleting grade:", error);
      res.status(500).json({ error: "Failed to delete grade" });
    }
  });

  // Bulk create grades for an assessment
  app.post("/api/assessments/:assessmentId/grades/bulk", async (req, res) => {
    try {
      const assessmentId = parseInt(req.params.assessmentId);
      if (isNaN(assessmentId)) {
        return res.status(400).json({ error: "Invalid assessment ID" });
      }

      const assessment = await storage.getAssessment(assessmentId);
      if (!assessment) {
        return res.status(404).json({ error: "Assessment not found" });
      }

      // Validate array of grade data
      const gradesDataSchema = z.array(insertGradeSchema);
      const gradesData = gradesDataSchema.parse(req.body);
      
      // Check if all grades belong to the specified assessment
      for (const gradeData of gradesData) {
        if (gradeData.assessmentId !== assessmentId) {
          return res.status(400).json({ 
            error: "All grades must belong to the specified assessment" 
          });
        }
      }

      // Create all grades
      const createdGrades: Grade[] = [];
      for (const gradeData of gradesData) {
        const grade = await storage.createGrade(gradeData);
        createdGrades.push(grade);
      }

      // Update assessment status if needed
      if (assessment.status === 'pending' || assessment.status === 'in_progress') {
        await storage.updateAssessment(assessmentId, { 
          status: 'completed',
          updatedAt: new Date()
        });
        
        // Check for achievement triggers related to assessment completion
        // This can trigger achievements like "Perfect Score" or "Emergency Procedures Master"
        try {
          // Calculate average score for this assessment
          const totalScore = createdGrades.reduce((sum, grade) => sum + grade.score, 0);
          const averageScore = totalScore / createdGrades.length;
          
          // Check achievement triggers related to assessment scores
          await storage.checkAchievementTriggers({
            userId: assessment.traineeId,
            type: 'assessment_score',
            value: averageScore,
            metadata: {
              assessmentId: assessmentId,
              moduleId: assessment.moduleId,
              instructorId: assessment.instructorId
            }
          });
          
          // Also check for module completion achievement triggers
          await storage.checkAchievementTriggers({
            userId: assessment.traineeId,
            type: 'module_completion',
            value: 1, // Completed one module
            metadata: {
              moduleId: assessment.moduleId
            }
          });
          
          console.log(`Checked achievement triggers for trainee ${assessment.traineeId} after assessment completion`);
        } catch (achievementError) {
          console.error("Error processing achievement triggers:", achievementError);
          // Don't fail the request if achievement processing fails
        }
      }

      res.status(201).json(createdGrades);
    } catch (error) {
      console.error("Error bulk creating grades:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to bulk create grades" });
    }
  });
}