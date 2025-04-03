import { Router } from "express";
import { storage } from "../storage";
import { RoleType } from "@shared/risk-assessment-types";

export const riskAssessmentRouter = Router();

// Get all risk assessments with optional filtering
riskAssessmentRouter.get("/", async (req, res) => {
  try {
    const { userId, category, status } = req.query;
    
    const filters: any = {};
    if (userId) filters.userId = Number(userId);
    if (category) filters.category = category as string;
    if (status) filters.status = status as string;
    
    const assessments = await storage.getAllRiskAssessments(filters);
    res.json(assessments);
  } catch (error) {
    console.error("Error fetching risk assessments:", error);
    res.status(500).json({ error: "Failed to fetch risk assessments" });
  }
});

// Get a specific risk assessment by ID
riskAssessmentRouter.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const assessment = await storage.getRiskAssessment(id);
    
    if (!assessment) {
      return res.status(404).json({ error: "Risk assessment not found" });
    }
    
    res.json(assessment);
  } catch (error) {
    console.error("Error fetching risk assessment:", error);
    res.status(500).json({ error: "Failed to fetch risk assessment" });
  }
});

// Create a new risk assessment
riskAssessmentRouter.post("/", async (req, res) => {
  try {
    const assessment = await storage.createRiskAssessment(req.body);
    res.status(201).json(assessment);
  } catch (error) {
    console.error("Error creating risk assessment:", error);
    res.status(500).json({ error: "Failed to create risk assessment" });
  }
});

// Update a risk assessment
riskAssessmentRouter.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const assessment = await storage.updateRiskAssessment(id, req.body);
    
    if (!assessment) {
      return res.status(404).json({ error: "Risk assessment not found" });
    }
    
    res.json(assessment);
  } catch (error) {
    console.error("Error updating risk assessment:", error);
    res.status(500).json({ error: "Failed to update risk assessment" });
  }
});

// Delete a risk assessment
riskAssessmentRouter.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const success = await storage.deleteRiskAssessment(id);
    
    if (!success) {
      return res.status(404).json({ error: "Risk assessment not found" });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting risk assessment:", error);
    res.status(500).json({ error: "Failed to delete risk assessment" });
  }
});

// Get incidents for a specific risk assessment
riskAssessmentRouter.get("/:id/incidents", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const incidents = await storage.getRiskIncidentsByAssessment(id);
    res.json(incidents);
  } catch (error) {
    console.error("Error fetching risk incidents:", error);
    res.status(500).json({ error: "Failed to fetch risk incidents" });
  }
});

// Create a new incident for a risk assessment
riskAssessmentRouter.post("/:id/incidents", async (req, res) => {
  try {
    const incident = await storage.createRiskIncident({
      ...req.body,
      riskAssessmentId: Number(req.params.id)
    });
    res.status(201).json(incident);
  } catch (error) {
    console.error("Error creating risk incident:", error);
    res.status(500).json({ error: "Failed to create risk incident" });
  }
});

// Get trends for a specific risk assessment
riskAssessmentRouter.get("/:id/trends", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const trends = await storage.getRiskTrendsByAssessment(id);
    res.json(trends);
  } catch (error) {
    console.error("Error fetching risk trends:", error);
    res.status(500).json({ error: "Failed to fetch risk trends" });
  }
});

// Create a new trend record for a risk assessment
riskAssessmentRouter.post("/:id/trends", async (req, res) => {
  try {
    const trend = await storage.createRiskTrend({
      ...req.body,
      riskAssessmentId: Number(req.params.id)
    });
    res.status(201).json(trend);
  } catch (error) {
    console.error("Error creating risk trend:", error);
    res.status(500).json({ error: "Failed to create risk trend" });
  }
});

// Get role-specific visualization data
riskAssessmentRouter.get("/visualizations/:role", async (req, res) => {
  try {
    const role = req.params.role as RoleType;
    let visualizationData: any = {};
    
    switch (role) {
      case RoleType.TRAINEE:
        // Return trainee radar data
        visualizationData = {
          type: "radar",
          data: [
            { skill: "Technical Knowledge", value: 82, fullMark: 100 },
            { skill: "Flight Controls", value: 75, fullMark: 100 },
            { skill: "Navigation", value: 86, fullMark: 100 },
            { skill: "Communication", value: 90, fullMark: 100 },
            { skill: "Emergency Procedures", value: 68, fullMark: 100 },
            { skill: "Decision Making", value: 72, fullMark: 100 },
          ]
        };
        break;
        
      case RoleType.AIRLINE:
        // Return airline compliance data
        visualizationData = {
          type: "compliance",
          data: [
            { regulation: "EASA FCL.055", status: "compliant", value: 92, dueDate: new Date(2025, 6, 15) },
            { regulation: "EASA FCL.625", status: "partial", value: 78, dueDate: new Date(2025, 4, 30) },
            { regulation: "FAA 14 CFR 61.58", status: "compliant", value: 95, dueDate: new Date(2025, 9, 10) },
            { regulation: "ICAO Annex 1", status: "non-compliant", value: 63, dueDate: new Date(2025, 3, 5) },
            { regulation: "EASA Part-MED", status: "compliant", value: 88, dueDate: new Date(2025, 8, 22) },
          ]
        };
        break;
        
      case RoleType.EXAMINER:
        // Return examiner performance data
        visualizationData = {
          type: "heatmap",
          data: [
            { competency: "Radio Communications", value: 88, average: 75 },
            { competency: "Instrument Approach", value: 72, average: 70 },
            { competency: "Emergency Procedures", value: 63, average: 65 },
            { competency: "Crosswind Landing", value: 78, average: 68 },
            { competency: "Cockpit Management", value: 92, average: 78 },
            { competency: "Situational Awareness", value: 81, average: 72 },
          ]
        };
        break;
        
      case RoleType.INSTRUCTOR:
        // Return instructor analytics data
        visualizationData = {
          type: "lineChart",
          data: [
            { competency: "Technical Knowledge", value: 78, average: 72 },
            { competency: "Flight Controls", value: 65, average: 68 },
            { competency: "Navigation", value: 82, average: 75 },
            { competency: "Communication", value: 88, average: 80 },
            { competency: "Emergency Procedures", value: 71, average: 65 },
            { competency: "Decision Making", value: 76, average: 70 },
          ]
        };
        break;
        
      case RoleType.ATO:
        // Return ATO certification data
        visualizationData = {
          type: "pieChart",
          data: [
            { name: "Active", value: 35, color: "#1bc5bd" },
            { name: "Pending Renewal", value: 12, color: "#ffa800" },
            { name: "In Approval Process", value: 8, color: "#3699ff" },
            { name: "Expired", value: 5, color: "#f64e60" },
          ]
        };
        break;
        
      default:
        return res.status(400).json({ error: "Invalid role specified" });
    }
    
    // Include risk matrix data for all roles
    const riskAssessments = await storage.getAllRiskAssessments({ status: 'active' });
    const riskMatrixData = riskAssessments.map(assessment => ({
      severity: assessment.severity,
      occurrence: assessment.occurrence, 
      detection: assessment.detection,
      value: assessment.severity * assessment.occurrence * assessment.detection,
      title: assessment.title,
      category: assessment.category
    }));
    
    visualizationData.riskMatrix = {
      type: "3d-matrix",
      data: riskMatrixData.length > 0 ? riskMatrixData : [
        { 
          severity: 4, 
          occurrence: 3, 
          detection: 2, 
          value: 24, 
          title: "Engine Failure", 
          category: "technical" 
        },
        { 
          severity: 3, 
          occurrence: 2, 
          detection: 4, 
          value: 24, 
          title: "Navigation Error", 
          category: "operational" 
        },
        { 
          severity: 5, 
          occurrence: 1, 
          detection: 2, 
          value: 10, 
          title: "Hydraulic System Failure", 
          category: "technical" 
        },
        { 
          severity: 2, 
          occurrence: 4, 
          detection: 3, 
          value: 24, 
          title: "Communication Loss", 
          category: "operational" 
        },
        { 
          severity: 4, 
          occurrence: 2, 
          detection: 3, 
          value: 24, 
          title: "Weather Hazard", 
          category: "environmental" 
        },
      ]
    };
    
    res.json(visualizationData);
  } catch (error) {
    console.error("Error fetching visualization data:", error);
    res.status(500).json({ error: "Failed to fetch visualization data" });
  }
});

export default riskAssessmentRouter;