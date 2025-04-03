import { 
  User, 
  InsertUser, 
  TrainingProgram, 
  InsertTrainingProgram,
  Module,
  InsertModule,
  Lesson,
  InsertLesson,
  Session,
  InsertSession,
  SessionTrainee,
  InsertSessionTrainee,
  Assessment,
  InsertAssessment,
  Grade,
  InsertGrade,
  Document,
  InsertDocument,
  DocumentVersion,
  InsertDocumentVersion,
  Resource,
  InsertResource,
  Notification,
  InsertNotification,
  KnowledgeGraphNode,
  InsertKnowledgeGraphNode,
  KnowledgeGraphEdge,
  InsertKnowledgeGraphEdge,
  DocumentAnalysis,
  MfaCredential,
  InsertMfaCredential,
  InsertDocumentAnalysis,
  SessionPlan,
  InsertSessionPlan,
  RegulatoryRequirement,
  InsertRegulatoryRequirement,
  ProgramCompliance,
  InsertProgramCompliance,
  AuditLog,
  InsertAuditLog,
  PerformanceMetric,
  InsertPerformanceMetric,
  PredictiveModel,
  InsertPredictiveModel,
  SkillDecayPrediction,
  InsertSkillDecayPrediction,
  SessionReplay,
  InsertSessionReplay,
  SessionEvent,
  InsertSessionEvent,
  Achievement,
  InsertAchievement,
  UserAchievement,
  InsertUserAchievement,
  Leaderboard,
  InsertLeaderboard,
  LeaderboardEntry,
  InsertLeaderboardEntry,
  SharedScenario,
  InsertSharedScenario
} from "@shared/schema";
import {
  RiskAssessment,
  InsertRiskAssessment,
  RiskIncident,
  InsertRiskIncident,
  RiskTrend,
  InsertRiskTrend
} from "@shared/risk-assessment-types";
import { 
  SyllabusGenerationOptions, 
  GeneratedSyllabus, 
  ExtractedModule, 
  ExtractedLesson,
  SyllabusTemplate,
  SyllabusVersion,
  ComplianceImpact,
  RegulatoryReference
} from "@shared/syllabus-types";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  
  // Trainee specific methods
  getTraineePrograms(traineeId: number): Promise<TrainingProgram[]>;
  getTraineeSessionsByDateRange(traineeId: number, startDate: Date, endDate: Date): Promise<Session[]>;
  getTraineePerformanceMetrics(traineeId: number): Promise<any[]>;
  getRecommendedResourcesForUser(userId: number): Promise<Resource[]>;
  getRecentAssessments(traineeId: number, limit?: number): Promise<Assessment[]>;
  getTrainingGoalsForUser(userId: number): Promise<{id: number, name: string, progress: number}[]>;
  getTraineeRiskData(traineeId: number): Promise<any>;
  
  // Risk Assessment methods
  getRiskAssessment(id: number): Promise<RiskAssessment | undefined>;
  getAllRiskAssessments(filters?: { userId?: number, category?: string, status?: string }): Promise<RiskAssessment[]>;
  createRiskAssessment(assessment: InsertRiskAssessment): Promise<RiskAssessment>;
  updateRiskAssessment(id: number, assessment: Partial<RiskAssessment>): Promise<RiskAssessment | undefined>;
  deleteRiskAssessment(id: number): Promise<boolean>;
  
  // Risk Incident methods
  getRiskIncident(id: number): Promise<RiskIncident | undefined>;
  getRiskIncidentsByAssessment(assessmentId: number): Promise<RiskIncident[]>;
  createRiskIncident(incident: InsertRiskIncident): Promise<RiskIncident>;
  updateRiskIncident(id: number, incident: Partial<RiskIncident>): Promise<RiskIncident | undefined>;
  
  // Risk Trend methods
  getRiskTrendsByAssessment(assessmentId: number): Promise<RiskTrend[]>;
  createRiskTrend(trend: InsertRiskTrend): Promise<RiskTrend>;
  
  // Risk Assessment methods
  getRiskAssessment(id: number): Promise<RiskAssessment | undefined>;
  getRiskAssessmentsByUser(userId: number): Promise<RiskAssessment[]>;
  getRiskAssessmentsByCategory(category: string): Promise<RiskAssessment[]>;
  createRiskAssessment(assessment: InsertRiskAssessment): Promise<RiskAssessment>;
  updateRiskAssessment(id: number, assessment: Partial<RiskAssessment>): Promise<RiskAssessment | undefined>;
  deleteRiskAssessment(id: number): Promise<boolean>;
  
  // Risk Incident methods
  getRiskIncident(id: number): Promise<RiskIncident | undefined>;
  getRiskIncidentsByAssessment(assessmentId: number): Promise<RiskIncident[]>;
  createRiskIncident(incident: InsertRiskIncident): Promise<RiskIncident>;
  updateRiskIncident(id: number, incident: Partial<RiskIncident>): Promise<RiskIncident | undefined>;
  deleteRiskIncident(id: number): Promise<boolean>;
  
  // Risk Trend methods
  getRiskTrend(id: number): Promise<RiskTrend | undefined>;
  getRiskTrendsByAssessment(assessmentId: number): Promise<RiskTrend[]>;
  createRiskTrend(trend: InsertRiskTrend): Promise<RiskTrend>;
  getRiskTrendsTimeRange(assessmentId: number, startDate: Date, endDate: Date): Promise<RiskTrend[]>;
  
  // Syllabus Generator methods
  generateSyllabusFromDocument(documentId: number, options: SyllabusGenerationOptions): Promise<GeneratedSyllabus>;
  saveSyllabusAsProgram(syllabus: GeneratedSyllabus, createdById: number): Promise<TrainingProgram>;
  
  // Syllabus Template methods
  getSyllabusTemplate(id: number): Promise<SyllabusTemplate | undefined>;
  getAllSyllabusTemplates(): Promise<SyllabusTemplate[]>;
  getSyllabusTemplatesByType(programType: string): Promise<SyllabusTemplate[]>;
  createSyllabusTemplate(template: SyllabusTemplate): Promise<SyllabusTemplate>;
  updateSyllabusTemplate(id: number, template: Partial<SyllabusTemplate>): Promise<SyllabusTemplate | undefined>;
  deleteSyllabusTemplate(id: number): Promise<boolean>;
  
  // Syllabus Version Control methods
  getSyllabusVersionHistory(syllabusId: number): Promise<SyllabusVersion[]>;
  createSyllabusVersion(syllabusId: number, version: SyllabusVersion): Promise<SyllabusVersion>;
  compareSyllabusVersions(syllabusId: number, version1: string, version2: string): Promise<{
    addedModules: ExtractedModule[];
    removedModules: ExtractedModule[];
    modifiedModules: Array<{before: ExtractedModule, after: ExtractedModule}>;
    complianceImpact: ComplianceImpact;
  }>;
  
  // Compliance Analysis methods
  analyzeComplianceImpact(syllabusId: number, changes: any): Promise<ComplianceImpact>;
  getRegulatoryReferences(authority: string, version?: string): Promise<RegulatoryReference[]>;

  // Training Program methods
  getProgram(id: number): Promise<TrainingProgram | undefined>;
  getAllPrograms(): Promise<TrainingProgram[]>;
  createProgram(program: InsertTrainingProgram): Promise<TrainingProgram>;
  updateProgram(id: number, program: Partial<TrainingProgram>): Promise<TrainingProgram | undefined>;
  deleteProgram(id: number): Promise<boolean>;

  // Module methods
  getModule(id: number): Promise<Module | undefined>;
  getModulesByProgram(programId: number): Promise<Module[]>;
  createModule(module: InsertModule): Promise<Module>;
  updateModule(id: number, module: Partial<Module>): Promise<Module | undefined>;
  deleteModule(id: number): Promise<boolean>;

  // Lesson methods
  getLesson(id: number): Promise<Lesson | undefined>;
  getLessonsByModule(moduleId: number): Promise<Lesson[]>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  updateLesson(id: number, lesson: Partial<Lesson>): Promise<Lesson | undefined>;
  deleteLesson(id: number): Promise<boolean>;

  // Session methods
  getSession(id: number): Promise<Session | undefined>;
  getAllSessions(filters?: {
    programId?: number;
    moduleId?: number;
    status?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<Session[]>;
  getSessionsByInstructor(instructorId: number): Promise<Session[]>;
  getSessionsByTrainee(traineeId: number): Promise<Session[]>;
  getSessionsInDateRange(startDate: Date, endDate: Date): Promise<Session[]>;
  getTraineeSessionsInDateRange(traineeId: number, startDate: Date, endDate: Date): Promise<Session[]>;
  getInstructorSessionsInDateRange(instructorId: number, startDate: Date, endDate: Date): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: number, session: Partial<Session>): Promise<Session | undefined>;
  deleteSession(id: number): Promise<boolean>;

  // Session Trainee methods
  getSessionTrainees(sessionId: number): Promise<number[]>;
  getSessionAttendees(sessionId: number): Promise<SessionTrainee[]>;
  addTraineeToSession(sessionTrainee: InsertSessionTrainee): Promise<SessionTrainee>;
  updateSessionAttendance(sessionId: number, traineeId: number, updates: {
    present: boolean;
    notes?: string;
  }): Promise<SessionTrainee>;
  removeTraineeFromSession(sessionId: number, traineeId: number): Promise<boolean>;
  
  // Session Plan methods
  getSessionPlan(sessionId: number): Promise<SessionPlan | undefined>;
  createSessionPlan(plan: InsertSessionPlan): Promise<SessionPlan>;
  updateSessionPlan(id: number, plan: Partial<SessionPlan>): Promise<SessionPlan | undefined>;
  generateSessionPlan(options: {
    sessionId: number;
    documentIds?: number[];
    previousSessionId?: number;
    analysisDepth?: string;
  }): Promise<SessionPlan>;
  
  // Session Events methods
  getSessionEvents(sessionId: number): Promise<SessionEvent[]>;
  addSessionEvent(event: InsertSessionEvent): Promise<SessionEvent>;

  // Assessment methods
  getAssessment(id: number): Promise<Assessment | undefined>;
  getAllAssessments(): Promise<Assessment[]>;
  getAssessmentsByTrainee(traineeId: number): Promise<Assessment[]>;
  getAssessmentsByInstructor(instructorId: number): Promise<Assessment[]>;
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  updateAssessment(id: number, assessment: Partial<Assessment>): Promise<Assessment | undefined>;
  deleteAssessment(id: number): Promise<boolean>;
  getTraineePerformanceMetrics(traineeId: number): Promise<any>;
  getInstructorAssessmentRatings(instructorId: number): Promise<any>;
  getInstructorTraineesPerformance(instructorId: number): Promise<any>;
  getInstructorPendingGradesheets(instructorId: number): Promise<any>;
  getInstructorWeeklySchedule(instructorId: number): Promise<any>;
  getInstructorTodaySessions(instructorId: number): Promise<any>;

  // Grade methods
  getGrade(id: number): Promise<Grade | undefined>;
  getGradesByAssessment(assessmentId: number): Promise<Grade[]>;
  createGrade(grade: InsertGrade): Promise<Grade>;
  updateGrade(id: number, grade: Partial<Grade>): Promise<Grade | undefined>;
  deleteGrade(id: number): Promise<boolean>;
  
  // Document methods
  getDocument(id: number): Promise<Document | undefined>;
  getAllDocuments(): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  
  // Document Version methods
  getDocumentVersion(id: number): Promise<DocumentVersion | undefined>;
  getDocumentVersionsByDocument(documentId: number): Promise<DocumentVersion[]>;
  createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion>;
  updateDocumentCurrentVersion(documentId: number, versionId: number): Promise<Document | undefined>;

  // Resource methods
  getResource(id: number): Promise<Resource | undefined>;
  getAllResources(): Promise<Resource[]>;
  createResource(resource: InsertResource): Promise<Resource>;
  updateResource(id: number, resource: Partial<Resource>): Promise<Resource | undefined>;
  deleteResource(id: number): Promise<boolean>;

  // Notification methods
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotificationStatus(id: number, status: string): Promise<Notification | undefined>;

  // Knowledge Graph methods
  getKnowledgeGraphNodes(options?: { nodeType?: string, documentId?: number }): Promise<KnowledgeGraphNode[]>;
  getKnowledgeGraphNode(id: number): Promise<KnowledgeGraphNode | undefined>;
  createKnowledgeGraphNode(node: InsertKnowledgeGraphNode): Promise<KnowledgeGraphNode>;
  updateKnowledgeGraphNode(id: number, node: Partial<KnowledgeGraphNode>): Promise<KnowledgeGraphNode | undefined>;
  deleteKnowledgeGraphNode(id: number): Promise<boolean>;
  
  getKnowledgeGraphEdges(options?: { sourceNodeId?: number, targetNodeId?: number, relationship?: string }): Promise<KnowledgeGraphEdge[]>;
  getKnowledgeGraphEdge(id: number): Promise<KnowledgeGraphEdge | undefined>;
  createKnowledgeGraphEdge(edge: InsertKnowledgeGraphEdge): Promise<KnowledgeGraphEdge>;
  deleteKnowledgeGraphEdge(id: number): Promise<boolean>;
  
  // Document Analysis methods
  getDocumentAnalysis(id: number): Promise<DocumentAnalysis | undefined>;
  getDocumentAnalysisByDocument(documentId: number, analysisType?: string): Promise<DocumentAnalysis[]>;
  createDocumentAnalysis(analysis: InsertDocumentAnalysis): Promise<DocumentAnalysis>;
  updateDocumentAnalysisStatus(id: number, status: string, results?: any): Promise<DocumentAnalysis | undefined>;
  
  // Regulatory Requirements methods
  getRegulatoryRequirement(id: number): Promise<RegulatoryRequirement | undefined>;
  getRegulatoryRequirementByCode(code: string, authority: string): Promise<RegulatoryRequirement | undefined>;
  getAllRegulatoryRequirements(authority?: string): Promise<RegulatoryRequirement[]>;
  createRegulatoryRequirement(requirement: InsertRegulatoryRequirement): Promise<RegulatoryRequirement>;
  updateRegulatoryRequirement(id: number, requirement: Partial<RegulatoryRequirement>): Promise<RegulatoryRequirement | undefined>;
  deleteRegulatoryRequirement(id: number): Promise<boolean>;
  
  // Program Compliance methods
  getProgramCompliance(id: number): Promise<ProgramCompliance | undefined>;
  getProgramCompliancesByProgram(programId: number): Promise<ProgramCompliance[]>;
  createProgramCompliance(compliance: InsertProgramCompliance): Promise<ProgramCompliance>;
  updateProgramCompliance(id: number, compliance: Partial<ProgramCompliance>): Promise<ProgramCompliance | undefined>;
  deleteProgramCompliance(id: number): Promise<boolean>;
  
  // Audit Log methods
  getAuditLog(id: number): Promise<AuditLog | undefined>;
  getAuditLogsByEntity(entityType: string, entityId: number): Promise<AuditLog[]>;
  getAuditLogsByUser(userId: number): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  verifyAuditLog(id: number, blockchainTransactionId: string): Promise<AuditLog | undefined>;
  
  // Performance Metrics methods
  getPerformanceMetric(id: number): Promise<PerformanceMetric | undefined>;
  getPerformanceMetricsByTrainee(traineeId: number): Promise<PerformanceMetric[]>;
  getPerformanceMetricsBySession(sessionId: number): Promise<PerformanceMetric[]>;
  createPerformanceMetric(metric: InsertPerformanceMetric): Promise<PerformanceMetric>;
  
  // Predictive Models methods
  getPredictiveModel(id: number): Promise<PredictiveModel | undefined>;
  getAllPredictiveModels(active?: boolean): Promise<PredictiveModel[]>;
  createPredictiveModel(model: InsertPredictiveModel): Promise<PredictiveModel>;
  updatePredictiveModel(id: number, model: Partial<PredictiveModel>): Promise<PredictiveModel | undefined>;
  deletePredictiveModel(id: number): Promise<boolean>;
  
  // Skill Decay Predictions methods
  getSkillDecayPrediction(id: number): Promise<SkillDecayPrediction | undefined>;
  getSkillDecayPredictionsByTrainee(traineeId: number): Promise<SkillDecayPrediction[]>;
  createSkillDecayPrediction(prediction: InsertSkillDecayPrediction): Promise<SkillDecayPrediction>;
  updateSkillDecayPrediction(id: number, prediction: Partial<SkillDecayPrediction>): Promise<SkillDecayPrediction | undefined>;
  
  // Session Replay methods
  getSessionReplay(id: number): Promise<SessionReplay | undefined>;
  getSessionReplaysBySession(sessionId: number): Promise<SessionReplay[]>;
  createSessionReplay(replay: InsertSessionReplay): Promise<SessionReplay>;
  
  // Session Events methods
  getSessionEvent(id: number): Promise<SessionEvent | undefined>;
  getSessionEventsByReplay(replayId: number): Promise<SessionEvent[]>;
  createSessionEvent(event: InsertSessionEvent): Promise<SessionEvent>;
  
  // Achievements methods
  getAchievement(id: number): Promise<Achievement | undefined>;
  getAllAchievements(active?: boolean): Promise<Achievement[]>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  updateAchievement(id: number, achievement: Partial<Achievement>): Promise<Achievement | undefined>;
  deleteAchievement(id: number): Promise<boolean>;
  
  // User Achievements methods
  getUserAchievement(id: number): Promise<UserAchievement | undefined>;
  getUserAchievementsByUser(userId: number): Promise<UserAchievement[]>;
  createUserAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement>;
  updateUserAchievement(id: number, userAchievement: Partial<UserAchievement>): Promise<UserAchievement | undefined>;
  
  // Leaderboards methods
  getLeaderboard(id: number): Promise<Leaderboard | undefined>;
  getAllLeaderboards(active?: boolean): Promise<Leaderboard[]>;
  createLeaderboard(leaderboard: InsertLeaderboard): Promise<Leaderboard>;
  updateLeaderboard(id: number, leaderboard: Partial<Leaderboard>): Promise<Leaderboard | undefined>;
  deleteLeaderboard(id: number): Promise<boolean>;
  
  // Leaderboard Entries methods
  getLeaderboardEntry(id: number): Promise<LeaderboardEntry | undefined>;
  getLeaderboardEntriesByLeaderboard(leaderboardId: number): Promise<LeaderboardEntry[]>;
  createLeaderboardEntry(entry: InsertLeaderboardEntry): Promise<LeaderboardEntry>;
  updateLeaderboardEntry(id: number, entry: Partial<LeaderboardEntry>): Promise<LeaderboardEntry | undefined>;
  
  // Shared Scenarios methods
  getSharedScenario(id: number): Promise<SharedScenario | undefined>;
  getAllSharedScenarios(status?: string): Promise<SharedScenario[]>;
  getSharedScenariosByUser(userId: number): Promise<SharedScenario[]>;
  createSharedScenario(scenario: InsertSharedScenario): Promise<SharedScenario>;
  updateSharedScenario(id: number, scenario: Partial<SharedScenario>): Promise<SharedScenario | undefined>;
  deleteSharedScenario(id: number): Promise<boolean>;
  verifySharedScenario(id: number, verifiedById: number): Promise<SharedScenario | undefined>;
  incrementScenarioDownloadCount(id: number): Promise<SharedScenario | undefined>;

  // MFA methods
  getMfaCredential(id: number): Promise<MfaCredential | undefined>;
  getMfaCredentialsByUser(userId: number): Promise<MfaCredential[]>;
  getMfaCredentialByUserAndType(userId: number, type: string): Promise<MfaCredential | undefined>;
  createMfaCredential(credential: InsertMfaCredential): Promise<MfaCredential>;
  updateMfaCredential(id: number, credential: Partial<MfaCredential>): Promise<MfaCredential | undefined>;
  deleteMfaCredential(id: number): Promise<boolean>;
  
  // User update method
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Session store for authentication
  sessionStore: session.Store;
  
  // Initialize sample user data for testing (only for development)
  initializeSampleUser(): void;
}

// Helper function to determine competency level based on score percentage
function getCompetencyLevel(scorePercentage: number): string {
  if (scorePercentage >= 90) return 'Expert';
  if (scorePercentage >= 80) return 'Proficient';
  if (scorePercentage >= 70) return 'Competent';
  if (scorePercentage >= 60) return 'Basic';
  return 'Novice';
}

export class MemStorage implements IStorage {
  // Session store for authentication
  sessionStore: session.Store;
  
  // Risk Assessment methods
  async getRiskAssessment(id: number): Promise<RiskAssessment | undefined> {
    return this.riskAssessments.get(id);
  }

  async getAllRiskAssessments(filters?: { userId?: number, category?: string, status?: string }): Promise<RiskAssessment[]> {
    let assessments = Array.from(this.riskAssessments.values());
    
    // Apply filters if provided
    if (filters) {
      if (filters.userId !== undefined) {
        assessments = assessments.filter(a => a.userId === filters.userId);
      }
      if (filters.category !== undefined) {
        assessments = assessments.filter(a => a.category === filters.category);
      }
      if (filters.status !== undefined) {
        assessments = assessments.filter(a => a.status === filters.status);
      }
    }
    
    return assessments;
  }

  async getRiskAssessmentsByUser(userId: number): Promise<RiskAssessment[]> {
    return Array.from(this.riskAssessments.values()).filter(a => a.userId === userId);
  }

  async getRiskAssessmentsByCategory(category: string): Promise<RiskAssessment[]> {
    return Array.from(this.riskAssessments.values()).filter(a => a.category === category);
  }

  async createRiskAssessment(assessment: InsertRiskAssessment): Promise<RiskAssessment> {
    const id = this.riskAssessmentIdCounter++;
    const now = new Date();
    
    const newAssessment: RiskAssessment = {
      id,
      ...assessment,
      createdAt: now,
      updatedAt: now,
      incidentCount: assessment.incidentCount || 0
    };
    
    this.riskAssessments.set(id, newAssessment);
    
    // Create initial risk trend entry for this assessment
    const trendId = this.riskTrendIdCounter++;
    const trend: RiskTrend = {
      id: trendId,
      riskAssessmentId: id,
      recordDate: now,
      severity: assessment.severity,
      occurrence: assessment.occurrence,
      detection: assessment.detection,
      riskScore: assessment.severity * assessment.occurrence * assessment.detection,
      createdAt: now
    };
    
    this.riskTrends.set(trendId, trend);
    
    return newAssessment;
  }

  async updateRiskAssessment(id: number, assessment: Partial<RiskAssessment>): Promise<RiskAssessment | undefined> {
    const existingAssessment = this.riskAssessments.get(id);
    if (!existingAssessment) return undefined;
    
    const updatedAssessment = {
      ...existingAssessment,
      ...assessment,
      updatedAt: new Date()
    };
    
    this.riskAssessments.set(id, updatedAssessment);
    
    // If risk factors changed, create a new trend entry
    if (
      assessment.severity !== undefined || 
      assessment.occurrence !== undefined || 
      assessment.detection !== undefined
    ) {
      const trendId = this.riskTrendIdCounter++;
      const now = new Date();
      const trend: RiskTrend = {
        id: trendId,
        riskAssessmentId: id,
        recordDate: now,
        severity: updatedAssessment.severity,
        occurrence: updatedAssessment.occurrence,
        detection: updatedAssessment.detection,
        riskScore: updatedAssessment.severity * updatedAssessment.occurrence * updatedAssessment.detection,
        createdAt: now
      };
      
      this.riskTrends.set(trendId, trend);
    }
    
    return updatedAssessment;
  }

  async deleteRiskAssessment(id: number): Promise<boolean> {
    if (!this.riskAssessments.has(id)) return false;
    
    // Delete related incidents
    const incidents = Array.from(this.riskIncidents.values())
      .filter(incident => incident.riskAssessmentId === id);
    
    for (const incident of incidents) {
      this.riskIncidents.delete(incident.id);
    }
    
    // Delete related trends
    const trends = Array.from(this.riskTrends.values())
      .filter(trend => trend.riskAssessmentId === id);
    
    for (const trend of trends) {
      this.riskTrends.delete(trend.id);
    }
    
    // Delete the assessment
    return this.riskAssessments.delete(id);
  }

  // Risk Incident methods
  async getRiskIncident(id: number): Promise<RiskIncident | undefined> {
    return this.riskIncidents.get(id);
  }

  async getRiskIncidentsByAssessment(assessmentId: number): Promise<RiskIncident[]> {
    return Array.from(this.riskIncidents.values())
      .filter(incident => incident.riskAssessmentId === assessmentId);
  }

  async createRiskIncident(incident: InsertRiskIncident): Promise<RiskIncident> {
    const id = this.riskIncidentIdCounter++;
    const now = new Date();
    
    const newIncident: RiskIncident = {
      id,
      ...incident,
      createdAt: now,
      updatedAt: now
    };
    
    this.riskIncidents.set(id, newIncident);
    
    // Update incident count on the associated risk assessment
    const assessment = this.riskAssessments.get(incident.riskAssessmentId);
    if (assessment) {
      assessment.incidentCount = (assessment.incidentCount || 0) + 1;
      this.riskAssessments.set(assessment.id, assessment);
    }
    
    return newIncident;
  }

  async updateRiskIncident(id: number, incident: Partial<RiskIncident>): Promise<RiskIncident | undefined> {
    const existingIncident = this.riskIncidents.get(id);
    if (!existingIncident) return undefined;
    
    const updatedIncident = {
      ...existingIncident,
      ...incident,
      updatedAt: new Date()
    };
    
    this.riskIncidents.set(id, updatedIncident);
    return updatedIncident;
  }

  async deleteRiskIncident(id: number): Promise<boolean> {
    const incident = this.riskIncidents.get(id);
    if (!incident) return false;
    
    // Decrement the incident count on the associated risk assessment
    const assessment = this.riskAssessments.get(incident.riskAssessmentId);
    if (assessment && assessment.incidentCount > 0) {
      assessment.incidentCount -= 1;
      this.riskAssessments.set(assessment.id, assessment);
    }
    
    return this.riskIncidents.delete(id);
  }

  // Risk Trend methods
  async getRiskTrend(id: number): Promise<RiskTrend | undefined> {
    return this.riskTrends.get(id);
  }

  async getRiskTrendsByAssessment(assessmentId: number): Promise<RiskTrend[]> {
    return Array.from(this.riskTrends.values())
      .filter(trend => trend.riskAssessmentId === assessmentId)
      .sort((a, b) => a.recordDate.getTime() - b.recordDate.getTime());
  }

  async getRiskTrendsTimeRange(assessmentId: number, startDate: Date, endDate: Date): Promise<RiskTrend[]> {
    return Array.from(this.riskTrends.values())
      .filter(trend => 
        trend.riskAssessmentId === assessmentId &&
        trend.recordDate >= startDate &&
        trend.recordDate <= endDate
      )
      .sort((a, b) => a.recordDate.getTime() - b.recordDate.getTime());
  }

  async createRiskTrend(trend: InsertRiskTrend): Promise<RiskTrend> {
    const id = this.riskTrendIdCounter++;
    const now = new Date();
    
    const newTrend: RiskTrend = {
      id,
      ...trend,
      createdAt: now
    };
    
    this.riskTrends.set(id, newTrend);
    return newTrend;
  }
  private users: Map<number, User>;
  private programs: Map<number, TrainingProgram>;
  private modules: Map<number, Module>;
  private lessons: Map<number, Lesson>;
  private sessions: Map<number, Session>;
  private documentAnalyses: Map<number, DocumentAnalysis>;
  private sessionTrainees: Map<number, SessionTrainee>;
  private assessments: Map<number, Assessment>;
  private grades: Map<number, Grade>;
  private documents: Map<number, Document>;
  private riskAssessments: Map<number, RiskAssessment>;
  private riskIncidents: Map<number, RiskIncident>;
  private riskTrends: Map<number, RiskTrend>;
  private documentVersions: Map<number, DocumentVersion>;
  private resources: Map<number, Resource>;
  private notifications: Map<number, Notification>;
  private syllabusTemplates: Map<number, SyllabusTemplate>;
  private syllabusVersions: Map<number, SyllabusVersion[]>;
  private regulatoryReferences: Map<string, RegulatoryReference[]>;
  private knowledgeGraphNodes: Map<number, KnowledgeGraphNode>;
  private knowledgeGraphEdges: Map<number, KnowledgeGraphEdge>;
  private regulatoryRequirements: Map<number, RegulatoryRequirement>;
  private programCompliances: Map<number, ProgramCompliance>;
  private sessionPlans: Map<number, SessionPlan>;
  private auditLogs: Map<number, AuditLog>;
  private performanceMetrics: Map<number, PerformanceMetric>;
  private predictiveModels: Map<number, PredictiveModel>;
  private skillDecayPredictions: Map<number, SkillDecayPrediction>;
  private sessionReplays: Map<number, SessionReplay>;
  private sessionEvents: Map<number, SessionEvent>;
  private achievements: Map<number, Achievement>;
  private userAchievements: Map<number, UserAchievement>;
  private leaderboards: Map<number, Leaderboard>;
  private leaderboardEntries: Map<number, LeaderboardEntry>;
  private sharedScenarios: Map<number, SharedScenario>;

  private userIdCounter: number;
  private programIdCounter: number;
  private moduleIdCounter: number;
  private lessonIdCounter: number;
  private sessionIdCounter: number;
  private sessionTraineeIdCounter: number;
  private assessmentIdCounter: number;
  private gradeIdCounter: number;
  private documentIdCounter: number;
  private documentVersionIdCounter: number;
  private resourceIdCounter: number;
  private notificationIdCounter: number;
  private syllabusTemplateIdCounter: number;
  private knowledgeGraphNodeIdCounter: number;
  private knowledgeGraphEdgeIdCounter: number;
  private documentAnalysisIdCounter: number;
  private regulatoryRequirementIdCounter: number;
  private programComplianceIdCounter: number;
  private auditLogIdCounter: number;
  private performanceMetricIdCounter: number;
  private predictiveModelIdCounter: number;
  private skillDecayPredictionIdCounter: number;
  private sessionReplayIdCounter: number;
  private sessionEventIdCounter: number;
  private achievementIdCounter: number;
  private userAchievementIdCounter: number;
  private leaderboardIdCounter: number;
  private leaderboardEntryIdCounter: number;
  private sharedScenarioIdCounter: number;
  private mfaCredentialIdCounter: number;
  private sessionPlanIdCounter: number;
  private mfaCredentials: Map<number, MfaCredential>;

  constructor() {
    this.users = new Map();
    this.programs = new Map();
    this.modules = new Map();
    this.lessons = new Map();
    this.sessions = new Map();
    this.sessionTrainees = new Map();
    this.assessments = new Map();
    this.grades = new Map();
    this.documents = new Map();
    this.documentVersions = new Map();
    this.resources = new Map();
    this.notifications = new Map();
    this.syllabusTemplates = new Map();
    this.syllabusVersions = new Map();
    this.regulatoryReferences = new Map();
    this.knowledgeGraphNodes = new Map();
    this.knowledgeGraphEdges = new Map();
    this.documentAnalyses = new Map();
    this.regulatoryRequirements = new Map();
    this.programCompliances = new Map();
    this.auditLogs = new Map();
    this.performanceMetrics = new Map();
    this.predictiveModels = new Map();
    this.skillDecayPredictions = new Map();
    this.sessionReplays = new Map();
    this.sessionEvents = new Map();
    this.achievements = new Map();
    this.userAchievements = new Map();
    this.leaderboards = new Map();
    this.leaderboardEntries = new Map();
    this.sharedScenarios = new Map();
    this.mfaCredentials = new Map();
    this.sessionPlans = new Map();
    this.riskAssessments = new Map();
    this.riskIncidents = new Map();
    this.riskTrends = new Map();

    this.userIdCounter = 1;
    this.programIdCounter = 1;
    this.moduleIdCounter = 1;
    this.lessonIdCounter = 1;
    this.sessionIdCounter = 1;
    this.sessionTraineeIdCounter = 1;
    this.assessmentIdCounter = 1;
    this.gradeIdCounter = 1;
    this.documentIdCounter = 1;
    this.documentVersionIdCounter = 1;
    this.resourceIdCounter = 1;
    this.notificationIdCounter = 1;
    this.syllabusTemplateIdCounter = 1;
    this.knowledgeGraphNodeIdCounter = 1;
    this.knowledgeGraphEdgeIdCounter = 1;
    this.documentAnalysisIdCounter = 1;
    this.regulatoryRequirementIdCounter = 1;
    this.programComplianceIdCounter = 1;
    this.auditLogIdCounter = 1;
    this.performanceMetricIdCounter = 1;
    this.predictiveModelIdCounter = 1;
    this.skillDecayPredictionIdCounter = 1;
    this.sessionReplayIdCounter = 1;
    this.sessionEventIdCounter = 1;
    this.achievementIdCounter = 1;
    this.userAchievementIdCounter = 1;
    this.leaderboardIdCounter = 1;
    this.leaderboardEntryIdCounter = 1;
    this.sharedScenarioIdCounter = 1;
    this.mfaCredentialIdCounter = 1;
    this.sessionPlanIdCounter = 1;
    this.riskAssessmentIdCounter = 1;
    this.riskIncidentIdCounter = 1;
    this.riskTrendIdCounter = 1;

    // Initialize with some common regulatory references
    this.initializeRegulatoryReferences();
    
    // Initialize sample user
    this.initializeSampleUser();
    
    // Initialize sample achievements
    this.initializeSampleAchievements();
    
    // Initialize sample leaderboards
    this.initializeSampleLeaderboards();
    
    // Initialize sample risk assessments
    this.initializeSampleRiskAssessments();

    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }
  
  // Initialize sample risk assessments data
  private initializeSampleRiskAssessments() {
    // Create sample risk assessments
    const weather: RiskAssessment = {
      id: this.riskAssessmentIdCounter++,
      userId: 2, // instructor
      title: 'Severe Weather Operations',
      description: 'Risk assessment for flight operations during severe weather conditions',
      severity: 4, // High severity
      occurrence: 3, // Medium occurrence
      detection: 2, // Good detection capability
      category: 'environmental',
      status: 'active',
      mitigationPlan: 'Enhanced weather briefing, conservative go/no-go decisions, designated alternate airports',
      incidentCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { affectedAircraft: ['C172', 'PA28'] }
    };

    const maintenance: RiskAssessment = {
      id: this.riskAssessmentIdCounter++,
      userId: 7, // ATO
      title: 'Maintenance Procedure Compliance',
      description: 'Risk assessment for ensuring proper maintenance procedures are followed',
      severity: 3, // Medium severity
      occurrence: 2, // Low occurrence
      detection: 3, // Medium detection capability
      category: 'technical',
      status: 'active',
      mitigationPlan: 'Dual sign-off process, maintenance verification checklist, scheduled audits',
      incidentCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { regulations: ['FAA Part 43', 'EASA Part M'] }
    };

    // Create sample incidents
    const maintenanceIncident: RiskIncident = {
      id: this.riskIncidentIdCounter++,
      riskAssessmentId: maintenance.id,
      reportedById: 2, // instructor
      incidentDate: new Date(new Date().setDate(new Date().getDate() - 15)),
      description: 'Maintenance log discrepancy found during pre-flight inspection',
      severity: 2, // Low severity incident
      impact: 'Flight delayed by 2 hours while paperwork was corrected',
      resolution: 'Maintenance logbook procedures updated, staff retrained',
      isResolved: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { aircraft: 'C172', registration: 'N12345' }
    };

    // Create risk trends
    const weatherTrend1: RiskTrend = {
      id: this.riskTrendIdCounter++,
      riskAssessmentId: weather.id,
      recordDate: new Date(new Date().setDate(new Date().getDate() - 30)),
      severity: 4,
      occurrence: 4,
      detection: 3,
      riskScore: 48, // 4 * 4 * 3
      createdAt: new Date()
    };

    const weatherTrend2: RiskTrend = {
      id: this.riskTrendIdCounter++,
      riskAssessmentId: weather.id,
      recordDate: new Date(new Date().setDate(new Date().getDate() - 15)),
      severity: 4,
      occurrence: 3,
      detection: 3,
      riskScore: 36, // 4 * 3 * 3
      createdAt: new Date()
    };

    const weatherTrend3: RiskTrend = {
      id: this.riskTrendIdCounter++,
      riskAssessmentId: weather.id,
      recordDate: new Date(),
      severity: 4,
      occurrence: 3,
      detection: 2,
      riskScore: 24, // 4 * 3 * 2 (improving detection)
      createdAt: new Date()
    };

    const maintenanceTrend1: RiskTrend = {
      id: this.riskTrendIdCounter++,
      riskAssessmentId: maintenance.id,
      recordDate: new Date(new Date().setDate(new Date().getDate() - 30)),
      severity: 3,
      occurrence: 3,
      detection: 4,
      riskScore: 36, // 3 * 3 * 4
      createdAt: new Date()
    };

    const maintenanceTrend2: RiskTrend = {
      id: this.riskTrendIdCounter++,
      riskAssessmentId: maintenance.id,
      recordDate: new Date(new Date().setDate(new Date().getDate() - 15)),
      severity: 3,
      occurrence: 2,
      detection: 3,
      riskScore: 18, // 3 * 2 * 3
      createdAt: new Date()
    };

    const maintenanceTrend3: RiskTrend = {
      id: this.riskTrendIdCounter++,
      riskAssessmentId: maintenance.id,
      recordDate: new Date(),
      severity: 3,
      occurrence: 2,
      detection: 3,
      riskScore: 18, // 3 * 2 * 3 (stable)
      createdAt: new Date()
    };

    // Store in maps
    this.riskAssessments.set(weather.id, weather);
    this.riskAssessments.set(maintenance.id, maintenance);
    this.riskIncidents.set(maintenanceIncident.id, maintenanceIncident);
    
    this.riskTrends.set(weatherTrend1.id, weatherTrend1);
    this.riskTrends.set(weatherTrend2.id, weatherTrend2);
    this.riskTrends.set(weatherTrend3.id, weatherTrend3);
    this.riskTrends.set(maintenanceTrend1.id, maintenanceTrend1);
    this.riskTrends.set(maintenanceTrend2.id, maintenanceTrend2);
    this.riskTrends.set(maintenanceTrend3.id, maintenanceTrend3);

    console.log('Initialized sample risk assessments:', 
      this.riskAssessments.size, 
      'risk assessments created with IDs:', 
      Array.from(this.riskAssessments.keys()).join(', ')
    );
  }

  // Helper method to convert string requirements to RegulatoryReference objects
  private getRegulatoryRequirementsArray(authority: string, requirementNames: string[]): RegulatoryReference[] {
    const references = this.regulatoryReferences.get(authority) || [];
    
    // For each requirement name, find a matching regulatory reference or create a generic one
    return requirementNames.map(name => {
      const matchingRef = references.find(ref => ref.description.includes(name) || ref.code.includes(name));
      if (matchingRef) {
        return matchingRef;
      }
      
      // Create a generic reference if no match found
      return {
        code: name,
        authority,
        version: '2023',
        description: name,
        effectiveDate: new Date()
      };
    });
  }

  // Initialize a sample user for testing
  private initializeSampleUser() {
    // Add admin user
    const adminUser: User = {
      id: this.userIdCounter++,
      username: 'admin',
      password: 'Admin@123', // Plaintext for testing
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      organizationType: 'Admin',
      organizationName: 'Aviation Training Platform',
      authProvider: 'local',
      status: 'active',
      lastLogin: null,
      profilePicture: null,
      authProviderId: null,
      preferences: null,
      bio: null,
      phone: null,
      notificationSettings: null
    };

    // Add ATO/Airline user
    const atoUser: User = {
      id: this.userIdCounter++,
      username: 'ato_airline',
      password: 'ATO@airline123', // Plaintext for testing
      email: 'Airline@example.com',
      firstName: 'Airline',
      lastName: 'Instructor',
      role: 'instructor',
      createdAt: new Date(),
      updatedAt: new Date(),
      organizationType: 'ATO',
      organizationName: 'Flight Academy',
      authProvider: 'local',
      status: 'active',
      lastLogin: null,
      profilePicture: null,
      authProviderId: null,
      preferences: null,
      bio: null,
      phone: null,
      notificationSettings: null
    };

    // Add student user
    const studentUser: User = {
      id: this.userIdCounter++,
      username: 'student',
      password: 'Student@123', // Plaintext for testing
      email: 'student@example.com',
      firstName: 'Student',
      lastName: 'Trainee',
      role: 'trainee',
      createdAt: new Date(),
      updatedAt: new Date(),
      organizationType: 'Airline',
      organizationName: 'Skyways Airlines',
      authProvider: 'local',
      status: 'active',
      lastLogin: null,
      profilePicture: null,
      authProviderId: null,
      preferences: null,
      bio: null,
      phone: null,
      notificationSettings: null
    };

    // Additional users for testing
    const secondStudent: User = {
      id: this.userIdCounter++,
      username: 'student2',
      password: 'Student@123', // Plaintext for testing
      email: 'student2@example.com',
      firstName: 'Second',
      lastName: 'Student',
      role: 'trainee',
      createdAt: new Date(),
      updatedAt: new Date(),
      organizationType: 'Airline',
      organizationName: 'Global Airlines',
      authProvider: 'local',
      status: 'active',
      lastLogin: null,
      profilePicture: null,
      authProviderId: null,
      preferences: null,
      bio: null,
      phone: null,
      notificationSettings: null
    };

    const secondAirline: User = {
      id: this.userIdCounter++,
      username: 'airline2',
      password: 'ATO@airline123', // Plaintext for testing
      email: 'ATO@example.com',
      firstName: 'ATO',
      lastName: 'Manager',
      role: 'instructor',
      createdAt: new Date(),
      updatedAt: new Date(),
      organizationType: 'ATO',
      organizationName: 'Advanced Training Organization',
      authProvider: 'local',
      status: 'active',
      lastLogin: null,
      profilePicture: null,
      authProviderId: null,
      preferences: null,
      bio: null,
      phone: null,
      notificationSettings: null
    };

    // Add ATO examiner user
    const atoExaminer: User = {
      id: this.userIdCounter++,
      username: 'examiner',
      password: 'Examiner@123', // Plaintext for testing
      email: 'examiner@ato.com',
      firstName: 'ATO',
      lastName: 'Examiner',
      role: 'examiner',
      createdAt: new Date(),
      updatedAt: new Date(),
      organizationType: 'ATO',
      organizationName: 'Aviation Training Organization',
      authProvider: 'local',
      status: 'active',
      lastLogin: null,
      profilePicture: null,
      authProviderId: null,
      preferences: null,
      bio: null,
      phone: null,
      notificationSettings: null
    };
    
    // Add Airline instructor (separate from ATO)
    const airlineInstructor: User = {
      id: this.userIdCounter++,
      username: 'airline',
      password: 'Airline@123', // Plaintext for testing
      email: 'instructor@airline.com',
      firstName: 'Airline',
      lastName: 'Instructor',
      role: 'instructor',
      createdAt: new Date(),
      updatedAt: new Date(),
      organizationType: 'Airline',
      organizationName: 'Skyways Airlines',
      authProvider: 'local',
      status: 'active',
      lastLogin: null,
      profilePicture: null,
      authProviderId: null,
      preferences: null,
      bio: null,
      phone: null,
      notificationSettings: null
    };

    // Add ATO student (different from Airline student)
    const atoStudent: User = {
      id: this.userIdCounter++,
      username: 'atostudent',
      password: 'Student@123', // Plaintext for testing
      email: 'student@ato.com',
      firstName: 'ATO',
      lastName: 'Student',
      role: 'trainee',
      createdAt: new Date(),
      updatedAt: new Date(),
      organizationType: 'ATO',
      organizationName: 'Aviation Training Organization',
      authProvider: 'local',
      status: 'active',
      lastLogin: null,
      profilePicture: null,
      authProviderId: null,
      preferences: null,
      bio: null,
      phone: null,
      notificationSettings: null
    };

    this.users.set(adminUser.id, adminUser);
    this.users.set(atoUser.id, atoUser);
    this.users.set(studentUser.id, studentUser);
    this.users.set(secondStudent.id, secondStudent);
    this.users.set(secondAirline.id, secondAirline);
    this.users.set(atoExaminer.id, atoExaminer);
    this.users.set(airlineInstructor.id, airlineInstructor);
    this.users.set(atoStudent.id, atoStudent);
    
    console.log('Initialized sample users:', 
      this.users.size, 
      'users created with IDs:', 
      Array.from(this.users.keys()).join(', ')
    );
  }

  // Initialize regulatory references for different authorities
  private initializeRegulatoryReferences() {
    // FAA references
    this.regulatoryReferences.set('faa', [
      {
        code: 'FAR 61.31',
        authority: 'faa',
        version: '2023',
        description: 'Type rating requirements, additional training, and authorization requirements',
        url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61/subpart-A/section-61.31',
        effectiveDate: new Date('2023-01-01')
      },
      {
        code: 'FAR 61.58',
        authority: 'faa',
        version: '2023',
        description: 'Pilot proficiency check requirements',
        url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61/subpart-A/section-61.58',
        effectiveDate: new Date('2023-01-01')
      }
    ]);

    // EASA references
    this.regulatoryReferences.set('easa', [
      {
        code: 'EASA FCL.725',
        authority: 'easa',
        version: '2023',
        description: 'Requirements for the issue of class and type ratings',
        url: 'https://www.easa.europa.eu/document-library/easy-access-rules/easy-access-rules-aircrew-regulation-eu-no-11782011',
        effectiveDate: new Date('2023-01-01')
      },
      {
        code: 'EASA FCL.740',
        authority: 'easa',
        version: '2023',
        description: 'Validity and renewal of class and type ratings',
        url: 'https://www.easa.europa.eu/document-library/easy-access-rules/easy-access-rules-aircrew-regulation-eu-no-11782011',
        effectiveDate: new Date('2023-01-01')
      },
      {
        code: 'EASA FCL.735.A',
        authority: 'easa',
        version: '2023',
        description: 'Multi-crew cooperation training course — aeroplanes',
        url: 'https://www.easa.europa.eu/document-library/easy-access-rules/easy-access-rules-aircrew-regulation-eu-no-11782011',
        effectiveDate: new Date('2023-01-01')
      }
    ]);

    // ICAO references
    this.regulatoryReferences.set('icao', [
      {
        code: 'ICAO Annex 1',
        authority: 'icao',
        version: '12',
        description: 'Personnel Licensing',
        url: 'https://www.icao.int/safety/airnavigation/nationalitymarks/annexes_booklet_en.pdf',
        effectiveDate: new Date('2018-07-16')
      }
    ]);
  }

  // Syllabus Generator methods
  async generateSyllabusFromDocument(documentId: number, options: SyllabusGenerationOptions): Promise<GeneratedSyllabus> {
    // Get the document
    const document = await this.getDocument(documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // In a real implementation, this would use NLP/ML to extract content from the document
    // For this prototype, we'll generate a sample syllabus based on the options
    
    // Create modules based on program type
    let modules: ExtractedModule[] = [];
    let lessons: ExtractedLesson[] = [];
    let totalDuration = options.defaultDuration;
    
    if (options.programType === 'initial_type_rating') {
      // Sample modules for initial type rating
      modules = [
        {
          name: "Aircraft Systems Knowledge",
          description: "Overview of aircraft systems including hydraulics, electrical, and avionics",
          type: "ground",
          competencies: [
            {
              name: "Systems Knowledge",
              description: "Understanding of aircraft systems operation and limitations",
              assessmentCriteria: ["Can explain system components", "Can describe normal operation", "Can identify failure modes"]
            }
          ],
          recommendedDuration: 40,
          regulatoryRequirements: ["FAR 61.31", "EASA FCL.725"]
        },
        {
          name: "Normal Procedures",
          description: "Standard operating procedures for normal flight operations",
          type: "simulator",
          competencies: [
            {
              name: "SOP Application",
              description: "Correct application of standard operating procedures",
              assessmentCriteria: ["Follows checklist sequence", "Performs procedures accurately", "Maintains appropriate CRM"]
            }
          ],
          recommendedDuration: 24,
          regulatoryRequirements: ["FAR 61.31(a)", "EASA FCL.725(a)"]
        },
        {
          name: "Emergency Procedures",
          description: "Procedures for handling aircraft emergencies and abnormal situations",
          type: "simulator",
          competencies: [
            {
              name: "Emergency Response",
              description: "Effective handling of emergency situations",
              assessmentCriteria: ["Correctly identifies emergency", "Follows appropriate checklist", "Maintains aircraft control"]
            }
          ],
          recommendedDuration: 16,
          regulatoryRequirements: ["FAR 61.31(b)", "EASA FCL.725(b)"]
        }
      ];
      
      // Sample lessons for each module
      lessons = [
        {
          name: "Hydraulic System Overview",
          description: "Detailed study of the aircraft hydraulic system",
          content: "Content extracted from document page 24-36: hydraulic system description",
          type: "document",
          moduleIndex: 0,
          duration: 120,
          learningObjectives: ["Understand hydraulic system architecture", "Identify hydraulic system components"]
        },
        {
          name: "Electrical System",
          description: "Study of aircraft electrical systems",
          content: "Content extracted from document page 37-48: electrical system description",
          type: "document",
          moduleIndex: 0,
          duration: 120,
          learningObjectives: ["Understand electrical system architecture", "Identify electrical failures"]
        },
        {
          name: "Normal Takeoff Procedures",
          description: "Procedures for normal takeoff operations",
          content: "Content extracted from document page 112-115: takeoff procedures",
          type: "video",
          moduleIndex: 1,
          duration: 90,
          learningObjectives: ["Perform normal takeoff checklist", "Apply correct takeoff technique"]
        },
        {
          name: "Engine Fire During Takeoff",
          description: "Handling engine fire emergency during takeoff",
          content: "Content extracted from document page 245-248: engine fire procedures",
          type: "interactive",
          moduleIndex: 2,
          duration: 120,
          learningObjectives: ["Identify engine fire indications", "Apply engine fire checklist", "Decision making for takeoff abort or continuation"]
        }
      ];
    } else if (options.programType === 'recurrent') {
      // Sample modules for recurrent training
      modules = [
        {
          name: "Systems Review",
          description: "Review of critical aircraft systems",
          type: "ground",
          competencies: [
            {
              name: "Systems Knowledge",
              description: "Retention of aircraft systems knowledge",
              assessmentCriteria: ["Recalls system components", "Explains system operation", "Describes failure modes"]
            }
          ],
          recommendedDuration: 8,
          regulatoryRequirements: ["FAR 61.58", "EASA FCL.740"]
        },
        {
          name: "Emergency Procedures Review",
          description: "Review of emergency and abnormal procedures",
          type: "simulator",
          competencies: [
            {
              name: "Emergency Management",
              description: "Effective handling of emergency and abnormal situations",
              assessmentCriteria: ["Correctly identifies situation", "Applies appropriate procedure", "Maintains aircraft control"]
            }
          ],
          recommendedDuration: 4,
          regulatoryRequirements: ["FAR 61.58(a)", "EASA FCL.740(a)"]
        }
      ];
      
      totalDuration = 3; // 3 days for recurrent
      
      // Add sample lessons for recurrent training
      lessons = [
        {
          name: "Critical Systems Review",
          description: "Review of critical aircraft systems",
          content: "Content extracted from document page 10-15: critical systems summary",
          type: "document",
          moduleIndex: 0,
          duration: 180,
          learningObjectives: ["Recall hydraulic system architecture", "Recall electrical system operation"]
        },
        {
          name: "Engine Failure Scenarios",
          description: "Review of engine failure scenarios",
          content: "Content extracted from document page 200-205: engine failure procedures",
          type: "interactive",
          moduleIndex: 1,
          duration: 240,
          learningObjectives: ["Review engine failure indications", "Practice engine failure checklists"]
        }
      ];
    } else if (options.programType === 'joc_mcc') {
      // Sample modules for JOC/MCC
      modules = [
        {
          name: "Multi-Crew Cooperation Principles",
          description: "Fundamentals of crew coordination and communication",
          type: "ground",
          competencies: [
            {
              name: "CRM Application",
              description: "Effective application of CRM principles",
              assessmentCriteria: ["Demonstrates clear communication", "Shows situational awareness", "Applies workload management"]
            }
          ],
          recommendedDuration: 16,
          regulatoryRequirements: ["EASA FCL.735.A"]
        },
        {
          name: "Task Sharing and Crew Coordination",
          description: "Practical application of task sharing in normal and abnormal situations",
          type: "simulator",
          competencies: [
            {
              name: "Task Management",
              description: "Effective distribution and execution of flight deck tasks",
              assessmentCriteria: ["Clear role definition", "Proper task handover", "Cross-verification procedures"]
            }
          ],
          recommendedDuration: 20,
          regulatoryRequirements: ["EASA FCL.735.A(b)"]
        }
      ];
      
      totalDuration = 10; // 10 days for JOC/MCC
      
      // Add sample lessons for JOC/MCC
      lessons = [
        {
          name: "CRM Fundamentals",
          description: "Fundamentals of Crew Resource Management",
          content: "Content extracted from document page 50-65: CRM principles",
          type: "interactive",
          moduleIndex: 0,
          duration: 240,
          learningObjectives: ["Understand CRM principles", "Apply communication techniques"]
        },
        {
          name: "PF/PM Coordination",
          description: "Coordination between Pilot Flying and Pilot Monitoring",
          content: "Content extracted from document page 70-85: PF/PM duties",
          type: "video",
          moduleIndex: 1,
          duration: 180,
          learningObjectives: ["Define PF/PM responsibilities", "Practice crew coordination"]
        }
      ];
    }
    
    // Create regulatory references for the syllabus
    const authority = options.regulatoryAuthority || 'easa';
    const metRequirements = ['Basic training requirements', 'Minimum training hours'];
    const partiallyMetRequirements = ['Specific aircraft procedures'];
    
    // Return the generated syllabus
    return {
      name: `${options.programType.charAt(0).toUpperCase() + options.programType.slice(1)} Training Program${options.aircraftType ? ` - ${options.aircraftType}` : ''}`,
      description: `Training program generated from document "${document.title}"`,
      programType: options.programType,
      aircraftType: options.aircraftType,
      regulatoryAuthority: options.regulatoryAuthority,
      totalDuration,
      modules,
      lessons,
      regulatoryCompliance: {
        authority: authority,
        requirementsMet: metRequirements.map(name => ({
          code: name,
          authority,
          version: '2023',
          description: name,
          effectiveDate: new Date()
        })),
        requirementsPartiallyMet: partiallyMetRequirements.map(name => ({
          code: name,
          authority,
          version: '2023',
          description: name,
          effectiveDate: new Date()
        })),
        requirementsNotMet: []
      },
      version: '1.0.0',
      versionHistory: [{
        versionNumber: '1.0.0',
        changedBy: 1, // System user ID
        changeDate: new Date(),
        changeDescription: 'Initial syllabus generation',
        complianceImpact: {
          affectedRequirements: [],
          impactLevel: 'none',
          description: 'Initial version',
          mitigationSteps: [],
          approvalRequired: false
        }
      }],
      confidenceScore: 85 // 85% confidence in extraction accuracy
    };
  }
  
  async saveSyllabusAsProgram(syllabus: GeneratedSyllabus, createdById: number): Promise<TrainingProgram> {
    // Create a new program
    const program = await this.createProgram({
      name: syllabus.name,
      description: syllabus.description,
      createdById
    });
    
    // Create modules for the program
    for (let i = 0; i < syllabus.modules.length; i++) {
      const moduleData = syllabus.modules[i];
      const module = await this.createModule({
        name: moduleData.name,
        programId: program.id
      });
      
      // Find lessons for this module
      const moduleLessons = syllabus.lessons.filter(l => l.moduleIndex === i);
      
      // Create lessons for the module
      for (const lessonData of moduleLessons) {
        await this.createLesson({
          name: lessonData.name,
          moduleId: module.id,
          type: lessonData.type,
          content: lessonData.content
        });
      }
    }
    
    return program;
  }
  
  // Syllabus Template methods
  async getSyllabusTemplate(id: number): Promise<SyllabusTemplate | undefined> {
    return this.syllabusTemplates.get(id);
  }
  
  async getAllSyllabusTemplates(): Promise<SyllabusTemplate[]> {
    return Array.from(this.syllabusTemplates.values());
  }
  
  async getSyllabusTemplatesByType(programType: string): Promise<SyllabusTemplate[]> {
    return Array.from(this.syllabusTemplates.values()).filter(
      template => template.programType === programType
    );
  }
  
  async createSyllabusTemplate(template: SyllabusTemplate): Promise<SyllabusTemplate> {
    const id = this.syllabusTemplateIdCounter++;
    const newTemplate: SyllabusTemplate = {
      ...template,
      id,
      createdAt: template.createdAt || new Date(),
      updatedAt: new Date()
    };
    this.syllabusTemplates.set(id, newTemplate);
    return newTemplate;
  }
  
  async updateSyllabusTemplate(id: number, template: Partial<SyllabusTemplate>): Promise<SyllabusTemplate | undefined> {
    const existingTemplate = this.syllabusTemplates.get(id);
    if (!existingTemplate) return undefined;
    
    const updatedTemplate = { 
      ...existingTemplate, 
      ...template,
      updatedAt: new Date()
    };
    this.syllabusTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }
  
  async deleteSyllabusTemplate(id: number): Promise<boolean> {
    return this.syllabusTemplates.delete(id);
  }
  
  // Syllabus Version Control methods
  async getSyllabusVersionHistory(syllabusId: number): Promise<SyllabusVersion[]> {
    return this.syllabusVersions.get(syllabusId) || [];
  }
  
  async createSyllabusVersion(syllabusId: number, version: SyllabusVersion): Promise<SyllabusVersion> {
    const existingVersions = this.syllabusVersions.get(syllabusId) || [];
    existingVersions.push(version);
    this.syllabusVersions.set(syllabusId, existingVersions);
    return version;
  }
  
  async compareSyllabusVersions(syllabusId: number, version1: string, version2: string): Promise<{
    addedModules: ExtractedModule[];
    removedModules: ExtractedModule[];
    modifiedModules: Array<{before: ExtractedModule, after: ExtractedModule}>;
    complianceImpact: ComplianceImpact;
  }> {
    // In a real implementation, this would perform an actual diff between versions
    // For this prototype, return a placeholder result
    return {
      addedModules: [],
      removedModules: [],
      modifiedModules: [],
      complianceImpact: {
        affectedRequirements: [],
        impactLevel: 'none',
        description: 'No significant regulatory impact detected',
        mitigationSteps: [],
        approvalRequired: false
      }
    };
  }
  
  // Compliance Analysis methods
  async analyzeComplianceImpact(syllabusId: number, changes: any): Promise<ComplianceImpact> {
    // In a real implementation, this would analyze the regulatory impact of proposed changes
    // For this prototype, return a placeholder result
    return {
      affectedRequirements: [],
      impactLevel: 'low',
      description: 'Minor changes with low regulatory impact',
      mitigationSteps: ['Document changes in training records'],
      approvalRequired: false
    };
  }
  
  async getRegulatoryReferences(authority: string, version?: string): Promise<RegulatoryReference[]> {
    const references = this.regulatoryReferences.get(authority) || [];
    if (version) {
      return references.filter(ref => ref.version === version);
    }
    return references;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = {
      ...user,
      id,
      organizationType: user.organizationType || null,
      organizationName: user.organizationName || null,
      authProvider: user.authProvider || "local",
      authProviderId: user.authProviderId || null,
      profilePicture: user.profilePicture || null
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === role);
  }
  
  // Trainee specific methods
  async getTraineePrograms(traineeId: number): Promise<TrainingProgram[]> {
    // Find programs where the trainee is enrolled
    const traineePrograms: TrainingProgram[] = [];
    
    // Check each program for the trainee's sessions
    for (const program of this.programs.values()) {
      // Check if trainee has any sessions in this program
      const hasSessionsInProgram = Array.from(this.sessions.values()).some(session => {
        const trainees = this.getSessionTrainees(session.id);
        return session.programId === program.id && trainees.includes(traineeId);
      });
      
      if (hasSessionsInProgram) {
        // Calculate completion percentage based on completed vs. total sessions
        const programSessions = Array.from(this.sessions.values()).filter(s => s.programId === program.id);
        const traineeCompletedSessions = programSessions.filter(s => {
          const trainees = this.getSessionTrainees(s.id);
          return trainees.includes(traineeId) && s.status === 'completed';
        });
        
        const completionPercentage = programSessions.length > 0 
          ? Math.round((traineeCompletedSessions.length / programSessions.length) * 100) 
          : 0;
        
        // Add program with completion data
        traineePrograms.push({
          ...program,
          completionPercentage,
          phase: this.getProgramPhaseForTrainee(program.id, traineeId)
        });
      }
    }
    
    return traineePrograms;
  }
  
  private getProgramPhaseForTrainee(programId: number, traineeId: number): string {
    // Get all modules for this program
    const modules = Array.from(this.modules.values()).filter(m => m.programId === programId);
    
    // Sort modules by sequence
    modules.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    
    // Find the current module based on sessions
    for (const module of modules) {
      const moduleSessions = Array.from(this.sessions.values()).filter(s => 
        s.programId === programId && s.moduleId === module.id
      );
      
      // Check if trainee has incomplete sessions in this module
      const hasIncompleteSessions = moduleSessions.some(s => {
        const trainees = this.getSessionTrainees(s.id);
        return trainees.includes(traineeId) && s.status !== 'completed';
      });
      
      if (hasIncompleteSessions) {
        return module.name || 'Current Module';
      }
    }
    
    // If all modules are complete or no modules found
    return 'Advanced';
  }
  
  async getTraineeSessionsByDateRange(traineeId: number, startDate: Date, endDate: Date): Promise<Session[]> {
    const result: Session[] = [];
    
    // Get all sessions
    for (const session of this.sessions.values()) {
      // Check if trainee is in this session
      const trainees = await this.getSessionTrainees(session.id);
      
      if (trainees.includes(traineeId)) {
        // Check if session is in date range
        if (session.startTime >= startDate && session.startTime <= endDate) {
          result.push(session);
        }
      }
    }
    
    // Sort by start time
    return result.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }
  
  async getTraineePerformanceMetrics(traineeId: number): Promise<any[]> {
    const metrics: any[] = [];
    
    // Get trainee assessments
    const assessments = await this.getAssessmentsByTrainee(traineeId);
    
    // Group assessments by competency area
    const competencyScores = new Map<string, number[]>();
    
    for (const assessment of assessments) {
      // Get grades for this assessment
      const grades = await this.getGradesByAssessment(assessment.id);
      
      for (const grade of grades) {
        const competencyId = grade.competencyAreaId;
        if (!competencyScores.has(competencyId)) {
          competencyScores.set(competencyId, []);
        }
        competencyScores.get(competencyId)?.push(grade.score);
      }
    }
    
    // Calculate average score for each competency
    const competencyAreas = ['Technical Knowledge', 'Communication', 'Flight Skills', 'Decision Making', 'CRM'];
    let index = 0;
    
    for (const [competencyId, scores] of competencyScores.entries()) {
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      
      metrics.push({
        id: index++,
        name: competencyAreas[index % competencyAreas.length], // Use a predefined name or the competencyId
        value: Math.round(avgScore)
      });
    }
    
    // If no metrics were found, add sample data
    if (metrics.length === 0) {
      metrics.push({ id: 0, name: 'Technical Knowledge', value: 75 });
      metrics.push({ id: 1, name: 'Communication', value: 68 });
      metrics.push({ id: 2, name: 'Flight Skills', value: 80 });
      metrics.push({ id: 3, name: 'Decision Making', value: 70 });
      metrics.push({ id: 4, name: 'CRM', value: 65 });
    }
    
    return metrics;
  }
  
  async getRecommendedResourcesForUser(userId: number): Promise<Resource[]> {
    const resources: Resource[] = [];
    
    // Get user info to tailor recommendations
    const user = await this.getUser(userId);
    if (!user) return resources;
    
    // Get all resources
    const allResources = Array.from(this.resources.values());
    
    // Get user's sessions to determine relevant topics
    const userSessions = await this.getSessionsByTrainee(userId);
    
    // Extract module IDs from sessions
    const moduleIds = userSessions.map(session => session.moduleId);
    
    // Get modules user is studying
    const modules = Array.from(this.modules.values()).filter(module => 
      moduleIds.includes(module.id)
    );
    
    // Filter resources relevant to user's modules
    for (const resource of allResources) {
      // Check if resource is related to any of the user's modules
      const isRelevant = modules.some(module => 
        resource.title.toLowerCase().includes(module.name.toLowerCase()) ||
        (resource.tags && resource.tags.some(tag => 
          module.name.toLowerCase().includes(tag.toLowerCase())
        ))
      );
      
      if (isRelevant) {
        resources.push(resource);
      }
    }
    
    // Limit to 5 recommendations
    return resources.slice(0, 5);
  }
  
  async getRecentAssessments(traineeId: number, limit: number = 5): Promise<Assessment[]> {
    // Get all assessments for this trainee
    const traineeAssessments = await this.getAssessmentsByTrainee(traineeId);
    
    // Sort by date (newest first)
    traineeAssessments.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    // Return limited number
    return traineeAssessments.slice(0, limit);
  }
  
  async getTrainingGoalsForUser(userId: number): Promise<{id: number, name: string, progress: number}[]> {
    const goals: {id: number, name: string, progress: number}[] = [];
    
    // Get user's achievements which can represent goals
    const userAchievements = await this.getUserAchievementsByUser(userId);
    
    // Add each achievement as a goal with its progress
    for (const userAchiev of userAchievements) {
      const achievement = await this.getAchievement(userAchiev.achievementId);
      if (achievement) {
        goals.push({
          id: userAchiev.id,
          name: achievement.name,
          progress: userAchiev.progress || 0
        });
      }
    }
    
    // If no goals found, create sample goals based on likely training needs
    if (goals.length === 0) {
      // Try to base goals on user's training program
      const user = await this.getUser(userId);
      if (user) {
        // Get trainee's programs
        const programs = await this.getTraineePrograms(userId);
        
        if (programs.length > 0) {
          // Add program-specific goals
          const programName = programs[0].name;
          
          goals.push({
            id: 1,
            name: `Complete ${programName} Training`,
            progress: programs[0].completionPercentage || 65
          });
          
          goals.push({
            id: 2,
            name: "Pass Final Assessment",
            progress: 45
          });
          
          goals.push({
            id: 3,
            name: "Complete Required Flight Hours",
            progress: 70
          });
        } else {
          // Generic aviation training goals
          goals.push({
            id: 1,
            name: "Complete Ground School",
            progress: 75
          });
          
          goals.push({
            id: 2,
            name: "Master Emergency Procedures",
            progress: 60
          });
          
          goals.push({
            id: 3,
            name: "Complete Cross-Country Requirements",
            progress: 50
          });
        }
      }
    }
    
    return goals;
  }
  
  async getTraineeRiskData(traineeId: number): Promise<any> {
    // Create 3D visualization data for trainee's risk assessment
    
    // Get trainee's assessment data to build visualization
    const assessments = await this.getAssessmentsByTrainee(traineeId);
    const performanceMetrics = await this.getTraineePerformanceMetrics(traineeId);
    const sessions = await this.getSessionsByTrainee(traineeId);
    
    // Calculate visualization data
    
    // Position nodes in 3D space with good distribution
    const createPosition = (index: number, total: number) => {
      const angle = (index / total) * Math.PI * 2;
      const radius = 2 + Math.random() * 0.5;
      const height = -1 + Math.random() * 2;
      return [
        Math.sin(angle) * radius,
        height,
        Math.cos(angle) * radius
      ];
    };
    
    // Color scale from green to yellow to red
    const getColor = (value: number) => {
      if (value >= 80) return "#10b981"; // green
      if (value >= 65) return "#84cc16"; // green-yellow
      if (value >= 50) return "#facc15"; // yellow
      if (value >= 35) return "#f97316"; // orange
      return "#ef4444"; // red
    };
    
    // Convert performance metrics to 3D nodes
    const performanceNodes = performanceMetrics.map((metric, idx) => ({
      label: metric.name,
      value: metric.value,
      color: getColor(metric.value),
      position: createPosition(idx, performanceMetrics.length)
    }));
    
    // Session metrics
    const sessionTypes = new Map<string, number>();
    let totalSessions = 0;
    
    for (const session of sessions) {
      const type = session.type || 'Other';
      totalSessions++;
      
      const currentCount = sessionTypes.get(type) || 0;
      sessionTypes.set(type, currentCount + 1);
    }
    
    const sessionNodes = Array.from(sessionTypes.entries()).map(([type, count], idx) => {
      const percentage = (count / totalSessions) * 100;
      return {
        label: type,
        value: percentage,
        color: getColor(percentage),
        position: createPosition(idx + performanceMetrics.length, sessionTypes.size)
      };
    });
    
    // Competency areas from assessments
    const competencyMap = new Map<string, number[]>();
    
    for (const assessment of assessments) {
      const grades = await this.getGradesByAssessment(assessment.id);
      
      for (const grade of grades) {
        const area = grade.competencyAreaId;
        if (!competencyMap.has(area)) {
          competencyMap.set(area, []);
        }
        competencyMap.get(area)?.push(grade.score);
      }
    }
    
    const competencyNodes = Array.from(competencyMap.entries()).map(([area, scores], idx) => {
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      return {
        label: area,
        value: avgScore,
        color: getColor(avgScore),
        position: createPosition(idx + performanceMetrics.length + sessionTypes.size, competencyMap.size)
      };
    });
    
    // Create connections between related nodes
    const connections: { from: number[], to: number[], color: string }[] = [];
    
    // Connect performance nodes to competency nodes
    for (let i = 0; i < performanceNodes.length; i++) {
      for (let j = 0; j < competencyNodes.length; j++) {
        if (Math.random() > 0.7) { // Only connect some nodes
          connections.push({
            from: performanceNodes[i].position as number[],
            to: competencyNodes[j].position as number[],
            color: performanceNodes[i].color
          });
        }
      }
    }
    
    // Connect session nodes to competency nodes
    for (let i = 0; i < sessionNodes.length; i++) {
      for (let j = 0; j < competencyNodes.length; j++) {
        if (Math.random() > 0.6) { // Only connect some nodes
          connections.push({
            from: sessionNodes[i].position as number[],
            to: competencyNodes[j].position as number[],
            color: sessionNodes[i].color
          });
        }
      }
    }
    
    // Finalize visualization data
    return {
      performance: performanceNodes,
      sessions: sessionNodes,
      competencies: competencyNodes,
      connections
    };
  }

  // Training Program methods
  async getProgram(id: number): Promise<TrainingProgram | undefined> {
    return this.programs.get(id);
  }

  async getAllPrograms(): Promise<TrainingProgram[]> {
    return Array.from(this.programs.values());
  }

  async createProgram(program: InsertTrainingProgram): Promise<TrainingProgram> {
    const id = this.programIdCounter++;
    const newProgram: TrainingProgram = { 
      ...program, 
      id,
      description: program.description || null 
    };
    this.programs.set(id, newProgram);
    return newProgram;
  }

  async updateProgram(id: number, program: Partial<TrainingProgram>): Promise<TrainingProgram | undefined> {
    const existingProgram = this.programs.get(id);
    if (!existingProgram) return undefined;

    const updatedProgram = { ...existingProgram, ...program };
    this.programs.set(id, updatedProgram);
    return updatedProgram;
  }

  async deleteProgram(id: number): Promise<boolean> {
    return this.programs.delete(id);
  }

  // Module methods
  async getModule(id: number): Promise<Module | undefined> {
    return this.modules.get(id);
  }

  async getModulesByProgram(programId: number): Promise<Module[]> {
    return Array.from(this.modules.values()).filter(
      module => module.programId === programId
    );
  }

  async createModule(module: InsertModule): Promise<Module> {
    const id = this.moduleIdCounter++;
    const newModule: Module = { ...module, id };
    this.modules.set(id, newModule);
    return newModule;
  }

  async updateModule(id: number, module: Partial<Module>): Promise<Module | undefined> {
    const existingModule = this.modules.get(id);
    if (!existingModule) return undefined;

    const updatedModule = { ...existingModule, ...module };
    this.modules.set(id, updatedModule);
    return updatedModule;
  }

  async deleteModule(id: number): Promise<boolean> {
    return this.modules.delete(id);
  }

  // Lesson methods
  async getLesson(id: number): Promise<Lesson | undefined> {
    return this.lessons.get(id);
  }

  async getLessonsByModule(moduleId: number): Promise<Lesson[]> {
    return Array.from(this.lessons.values()).filter(
      lesson => lesson.moduleId === moduleId
    );
  }

  async createLesson(lesson: InsertLesson): Promise<Lesson> {
    const id = this.lessonIdCounter++;
    const newLesson: Lesson = { ...lesson, id };
    this.lessons.set(id, newLesson);
    return newLesson;
  }

  async updateLesson(id: number, lesson: Partial<Lesson>): Promise<Lesson | undefined> {
    const existingLesson = this.lessons.get(id);
    if (!existingLesson) return undefined;

    const updatedLesson = { ...existingLesson, ...lesson };
    this.lessons.set(id, updatedLesson);
    return updatedLesson;
  }

  async deleteLesson(id: number): Promise<boolean> {
    return this.lessons.delete(id);
  }

  // Session methods
  async getSession(id: number): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async getAllSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values());
  }

  async getSessionsByInstructor(instructorId: number): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(
      session => session.instructorId === instructorId
    );
  }

  async getSessionsByTrainee(traineeId: number): Promise<Session[]> {
    const traineeSessionIds = new Set(
      Array.from(this.sessionTrainees.values())
        .filter(st => st.traineeId === traineeId)
        .map(st => st.sessionId)
    );
    
    return Array.from(this.sessions.values()).filter(
      session => traineeSessionIds.has(session.id)
    );
  }

  async createSession(session: InsertSession): Promise<Session> {
    const id = this.sessionIdCounter++;
    const newSession: Session = { 
      ...session, 
      id,
      resourceId: session.resourceId || null
    };
    this.sessions.set(id, newSession);
    return newSession;
  }

  async updateSession(id: number, session: Partial<Session>): Promise<Session | undefined> {
    const existingSession = this.sessions.get(id);
    if (!existingSession) return undefined;

    const updatedSession = { ...existingSession, ...session };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteSession(id: number): Promise<boolean> {
    return this.sessions.delete(id);
  }

  // Session Trainee methods
  async getSessionTrainees(sessionId: number): Promise<number[]> {
    return Array.from(this.sessionTrainees.values())
      .filter(st => st.sessionId === sessionId)
      .map(st => st.traineeId);
  }

  async addTraineeToSession(sessionTrainee: InsertSessionTrainee): Promise<SessionTrainee> {
    const id = this.sessionTraineeIdCounter++;
    const newSessionTrainee: SessionTrainee = { ...sessionTrainee, id };
    this.sessionTrainees.set(id, newSessionTrainee);
    return newSessionTrainee;
  }

  async removeTraineeFromSession(sessionId: number, traineeId: number): Promise<boolean> {
    const sessionTraineeToRemove = Array.from(this.sessionTrainees.values()).find(
      st => st.sessionId === sessionId && st.traineeId === traineeId
    );
    
    if (!sessionTraineeToRemove) return false;
    return this.sessionTrainees.delete(sessionTraineeToRemove.id);
  }

  // Assessment methods
  async getAssessment(id: number): Promise<Assessment | undefined> {
    return this.assessments.get(id);
  }

  async getAllAssessments(): Promise<Assessment[]> {
    return Array.from(this.assessments.values());
  }

  async getAssessmentsByTrainee(traineeId: number): Promise<Assessment[]> {
    return Array.from(this.assessments.values()).filter(
      assessment => assessment.traineeId === traineeId
    );
  }

  async getAssessmentsByInstructor(instructorId: number): Promise<Assessment[]> {
    return Array.from(this.assessments.values()).filter(
      assessment => assessment.assessorId === instructorId
    );
  }

  async createAssessment(assessment: InsertAssessment): Promise<Assessment> {
    const id = this.assessmentIdCounter++;
    const now = new Date();
    const newAssessment: Assessment = { 
      ...assessment, 
      id,
      createdAt: now,
      updatedAt: now,
      status: assessment.status || 'pending'
    };
    this.assessments.set(id, newAssessment);
    return newAssessment;
  }

  async updateAssessment(id: number, assessment: Partial<Assessment>): Promise<Assessment | undefined> {
    const existingAssessment = this.assessments.get(id);
    if (!existingAssessment) return undefined;

    const updatedAssessment = { 
      ...existingAssessment, 
      ...assessment,
      updatedAt: new Date()
    };
    this.assessments.set(id, updatedAssessment);
    return updatedAssessment;
  }

  async deleteAssessment(id: number): Promise<boolean> {
    // First delete all related grades
    const gradesToDelete = await this.getGradesByAssessment(id);
    for (const grade of gradesToDelete) {
      await this.deleteGrade(grade.id);
    }
    
    return this.assessments.delete(id);
  }

  async getTraineePerformanceMetrics(traineeId: number): Promise<any> {
    // Get all assessments for the trainee
    const assessments = await this.getAssessmentsByTrainee(traineeId);
    
    // Get all grades for these assessments
    const allGrades: Grade[] = [];
    for (const assessment of assessments) {
      const grades = await this.getGradesByAssessment(assessment.id);
      allGrades.push(...grades);
    }
    
    // Calculate metrics
    const totalAssessments = assessments.length;
    const completedAssessments = assessments.filter(a => a.status === 'completed').length;
    const pendingAssessments = assessments.filter(a => a.status === 'pending').length;
    const failedAssessments = assessments.filter(a => a.status === 'failed').length;
    
    // Calculate average scores
    let totalScore = 0;
    let totalMaximumScore = 0;
    
    allGrades.forEach(grade => {
      totalScore += grade.score;
      totalMaximumScore += grade.maximumScore;
    });
    
    const averageScore = totalMaximumScore > 0 ? (totalScore / totalMaximumScore) * 100 : 0;
    
    // Group assessments by competency area
    const competencyAreas = assessments.reduce((acc, assessment) => {
      const area = assessment.competencyArea || 'Unknown';
      if (!acc[area]) {
        acc[area] = [];
      }
      acc[area].push(assessment);
      return acc;
    }, {} as Record<string, Assessment[]>);
    
    // Calculate competency area metrics
    const competencyMetrics = Object.entries(competencyAreas).map(([area, areaAssessments]) => {
      // Get grades for this area
      const areaGrades: Grade[] = [];
      areaAssessments.forEach(assessment => {
        const grades = allGrades.filter(g => g.assessmentId === assessment.id);
        areaGrades.push(...grades);
      });
      
      // Calculate average score for this area
      let areaTotalScore = 0;
      let areaTotalMaximumScore = 0;
      
      areaGrades.forEach(grade => {
        areaTotalScore += grade.score;
        areaTotalMaximumScore += grade.maximumScore;
      });
      
      const areaAverageScore = areaTotalMaximumScore > 0 ? (areaTotalScore / areaTotalMaximumScore) * 100 : 0;
      
      return {
        area,
        assessmentCount: areaAssessments.length,
        averageScore: areaAverageScore,
        competencyLevel: getCompetencyLevel(areaAverageScore)
      };
    });
    
    // Progress over time calculation
    const timeBasedProgress = assessments
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(assessment => {
        const assessmentGrades = allGrades.filter(g => g.assessmentId === assessment.id);
        let assessmentScore = 0;
        let assessmentMaxScore = 0;
        
        assessmentGrades.forEach(grade => {
          assessmentScore += grade.score;
          assessmentMaxScore += grade.maximumScore;
        });
        
        const scorePercentage = assessmentMaxScore > 0 ? (assessmentScore / assessmentMaxScore) * 100 : 0;
        
        return {
          date: assessment.date,
          score: scorePercentage,
          competencyArea: assessment.competencyArea || 'Unknown',
          status: assessment.status
        };
      });
    
    // Return comprehensive performance metrics
    return {
      traineeId,
      totalAssessments,
      completedAssessments,
      pendingAssessments,
      failedAssessments,
      overallScore: averageScore,
      competencyLevel: getCompetencyLevel(averageScore),
      competencyBreakdown: competencyMetrics,
      progressOverTime: timeBasedProgress,
      lastAssessmentDate: assessments.length > 0 ? 
        assessments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date : 
        null
    };
  }

  async getInstructorAssessmentRatings(instructorId: number): Promise<any> {
    // Get all assessments conducted by this instructor
    const assessments = await this.getAssessmentsByInstructor(instructorId);
    
    // Get all trainees from these assessments
    const traineeIds = [...new Set(assessments.map(a => a.traineeId))];
    
    // Get average ratings for this instructor
    const ratings: any[] = [];
    for (const assessment of assessments) {
      if (assessment.instructorRating) {
        ratings.push(assessment.instructorRating);
      }
    }
    
    const averageRating = ratings.length > 0 ? 
      ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 
      0;
    
    // Return ratings summary
    return {
      instructorId,
      assessmentsCount: assessments.length,
      uniqueTraineesCount: traineeIds.length,
      averageRating,
      ratingsCount: ratings.length,
      recentAssessments: assessments
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)
        .map(a => ({
          id: a.id,
          traineeId: a.traineeId,
          date: a.date,
          competencyArea: a.competencyArea,
          status: a.status,
          rating: a.instructorRating
        }))
    };
  }

  async getInstructorTraineesPerformance(instructorId: number): Promise<any> {
    // Get all assessments conducted by this instructor
    const assessments = await this.getAssessmentsByInstructor(instructorId);
    
    // Get all trainees from these assessments
    const traineeIds = [...new Set(assessments.map(a => a.traineeId))];
    
    // Get performance metrics for each trainee
    const traineesPerformance = await Promise.all(
      traineeIds.map(async traineeId => {
        const metrics = await this.getTraineePerformanceMetrics(traineeId);
        const trainee = await this.getUser(traineeId);
        
        return {
          traineeId,
          traineeName: trainee ? `${trainee.firstName} ${trainee.lastName}` : `Unknown (${traineeId})`,
          metrics
        };
      })
    );
    
    return {
      instructorId,
      traineesCount: traineeIds.length,
      assessmentsCount: assessments.length,
      traineesPerformance
    };
  }

  async getInstructorPendingGradesheets(instructorId: number): Promise<any> {
    // Get all assessments for this instructor
    const assessments = await this.getAssessmentsByInstructor(instructorId);
    
    // Filter to get only pending gradesheets
    const pendingAssessments = assessments.filter(a => 
      a.status === 'pending' || a.status === 'in_progress'
    );
    
    // Enhance with trainee information
    const pendingGradesheets = await Promise.all(
      pendingAssessments.map(async assessment => {
        const trainee = await this.getUser(assessment.traineeId);
        const grades = await this.getGradesByAssessment(assessment.id);
        
        return {
          assessmentId: assessment.id,
          traineeId: assessment.traineeId,
          traineeName: trainee ? `${trainee.firstName} ${trainee.lastName}` : `Unknown (${assessment.traineeId})`,
          date: assessment.date,
          dueDate: assessment.dueDate,
          competencyArea: assessment.competencyArea,
          status: assessment.status,
          gradesCount: grades.length,
          isOverdue: assessment.dueDate ? new Date(assessment.dueDate) < new Date() : false
        };
      })
    );
    
    return {
      instructorId,
      pendingCount: pendingGradesheets.length,
      overdueCount: pendingGradesheets.filter(g => g.isOverdue).length,
      pendingGradesheets: pendingGradesheets.sort((a, b) => {
        // Sort by overdue first, then by due date
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return 0;
      })
    };
  }

  async getInstructorWeeklySchedule(instructorId: number): Promise<any> {
    // Get all sessions for this instructor in the next 7 days
    const today = new Date();
    const oneWeekLater = new Date(today);
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);
    
    const sessions = await this.getSessionsByInstructor(instructorId);
    const upcomingSessions = sessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= today && sessionDate <= oneWeekLater;
    });
    
    // Group sessions by day
    const sessionsByDay: Record<string, any[]> = {};
    for (const session of upcomingSessions) {
      const date = new Date(session.startTime).toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!sessionsByDay[date]) {
        sessionsByDay[date] = [];
      }
      
      // Get trainees for this session
      const traineeIds = await this.getSessionTrainees(session.id);
      const trainees = await Promise.all(
        traineeIds.map(async traineeId => {
          const trainee = await this.getUser(traineeId);
          return {
            id: traineeId,
            name: trainee ? `${trainee.firstName} ${trainee.lastName}` : `Unknown (${traineeId})`
          };
        })
      );
      
      sessionsByDay[date].push({
        sessionId: session.id,
        title: session.title,
        moduleId: session.moduleId,
        lessonId: session.lessonId,
        startTime: session.startTime,
        endTime: session.endTime,
        location: session.location,
        trainees
      });
    }
    
    // Format days for the week
    const formattedSchedule = [];
    const currentDate = new Date(today);
    
    for (let i = 0; i < 7; i++) {
      const dateString = currentDate.toISOString().split('T')[0];
      formattedSchedule.push({
        date: dateString,
        dayName: new Date(dateString).toLocaleDateString('en-US', { weekday: 'long' }),
        sessions: sessionsByDay[dateString] || []
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return {
      instructorId,
      totalUpcomingSessions: upcomingSessions.length,
      weeklySchedule: formattedSchedule
    };
  }

  async getInstructorTodaySessions(instructorId: number): Promise<any> {
    // Get all sessions for this instructor today
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const sessions = await this.getSessionsByInstructor(instructorId);
    const todaySessions = sessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= todayStart && sessionDate <= todayEnd;
    });
    
    // Get detailed information for each session
    const detailedSessions = await Promise.all(
      todaySessions.map(async session => {
        // Get trainees for this session
        const traineeIds = await this.getSessionTrainees(session.id);
        const trainees = await Promise.all(
          traineeIds.map(async traineeId => {
            const trainee = await this.getUser(traineeId);
            return {
              id: traineeId,
              name: trainee ? `${trainee.firstName} ${trainee.lastName}` : `Unknown (${traineeId})`
            };
          })
        );
        
        // Get module and lesson information
        let moduleInfo = null;
        let lessonInfo = null;
        
        if (session.moduleId) {
          const module = await this.getModule(session.moduleId);
          if (module) {
            moduleInfo = {
              id: module.id,
              name: module.name,
              type: module.type
            };
          }
        }
        
        if (session.lessonId) {
          const lesson = await this.getLesson(session.lessonId);
          if (lesson) {
            lessonInfo = {
              id: lesson.id,
              name: lesson.name,
              type: lesson.type
            };
          }
        }
        
        return {
          sessionId: session.id,
          title: session.title,
          startTime: session.startTime,
          endTime: session.endTime,
          location: session.location,
          status: session.status,
          module: moduleInfo,
          lesson: lessonInfo,
          trainees,
          traineesCount: trainees.length,
          notes: session.notes || '',
          resources: session.resources || []
        };
      })
    );
    
    return {
      instructorId,
      today: today.toISOString().split('T')[0],
      sessionsCount: todaySessions.length,
      upcomingSessions: detailedSessions
        .filter(s => new Date(s.startTime) > new Date())
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
      completedSessions: detailedSessions
        .filter(s => new Date(s.endTime) < new Date())
        .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()),
      currentSessions: detailedSessions.filter(s => {
        const now = new Date();
        return new Date(s.startTime) <= now && new Date(s.endTime) >= now;
      })
    };
  }

  // Grade methods
  async getGrade(id: number): Promise<Grade | undefined> {
    return this.grades.get(id);
  }

  async getGradesByAssessment(assessmentId: number): Promise<Grade[]> {
    return Array.from(this.grades.values()).filter(
      grade => grade.assessmentId === assessmentId
    );
  }

  async createGrade(grade: InsertGrade): Promise<Grade> {
    const id = this.gradeIdCounter++;
    const now = new Date();
    const newGrade: Grade = { 
      ...grade, 
      id,
      comments: grade.comments || null,
      createdAt: now,
      updatedAt: now
    };
    this.grades.set(id, newGrade);
    return newGrade;
  }

  async updateGrade(id: number, grade: Partial<Grade>): Promise<Grade | undefined> {
    const existingGrade = this.grades.get(id);
    if (!existingGrade) return undefined;

    const updatedGrade = { 
      ...existingGrade, 
      ...grade,
      updatedAt: new Date()
    };
    this.grades.set(id, updatedGrade);
    return updatedGrade;
  }
  
  async deleteGrade(id: number): Promise<boolean> {
    return this.grades.delete(id);
  }

  // Document methods
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const id = this.documentIdCounter++;
    const now = new Date();
    const newDocument: Document = { 
      ...document, 
      id,
      description: document.description || null,
      fileName: document.fileName || null,
      fileSize: document.fileSize || null,
      tags: document.tags || null,
      currentVersionId: null,
      createdAt: now,
      updatedAt: now
    };
    this.documents.set(id, newDocument);
    return newDocument;
  }
  
  async updateDocument(id: number, document: Partial<Document>): Promise<Document | undefined> {
    const existingDocument = this.documents.get(id);
    if (!existingDocument) return undefined;
    
    const updatedDocument: Document = {
      ...existingDocument,
      ...document,
      updatedAt: new Date()
    };
    
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }

  // Document Version methods
  async getDocumentVersion(id: number): Promise<DocumentVersion | undefined> {
    return this.documentVersions.get(id);
  }

  async getDocumentVersionsByDocument(documentId: number): Promise<DocumentVersion[]> {
    const versions: DocumentVersion[] = [];
    for (const version of this.documentVersions.values()) {
      if (version.documentId === documentId) {
        versions.push(version);
      }
    }
    return versions;
  }

  async createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion> {
    const id = this.documentVersionIdCounter++;
    
    const newVersion: DocumentVersion = {
      ...version,
      id,
      fileSize: version.fileSize || null,
      changeDescription: version.changeDescription || null,
      changeDate: version.changeDate || new Date()
    };

    this.documentVersions.set(id, newVersion);
    return newVersion;
  }
  
  async updateDocumentCurrentVersion(documentId: number, versionId: number): Promise<Document | undefined> {
    const document = this.documents.get(documentId);
    if (!document) return undefined;
    
    const version = this.documentVersions.get(versionId);
    if (!version) return undefined;
    
    // Ensure the version belongs to this document
    if (version.documentId !== documentId) return undefined;
    
    const updatedDocument: Document = {
      ...document,
      currentVersionId: versionId,
      updatedAt: new Date()
    };
    
    this.documents.set(documentId, updatedDocument);
    return updatedDocument;
  }

  // Resource methods
  async getResource(id: number): Promise<Resource | undefined> {
    return this.resources.get(id);
  }

  async getAllResources(): Promise<Resource[]> {
    return Array.from(this.resources.values());
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    const id = this.resourceIdCounter++;
    const newResource: Resource = { ...resource, id };
    this.resources.set(id, newResource);
    return newResource;
  }

  async updateResource(id: number, resource: Partial<Resource>): Promise<Resource | undefined> {
    const existingResource = this.resources.get(id);
    if (!existingResource) return undefined;

    const updatedResource = { ...existingResource, ...resource };
    this.resources.set(id, updatedResource);
    return updatedResource;
  }

  async deleteResource(id: number): Promise<boolean> {
    return this.resources.delete(id);
  }

  // Notification methods
  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values()).filter(
      notification => notification.recipientId === userId
    );
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = this.notificationIdCounter++;
    const newNotification: Notification = { ...notification, id };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  async updateNotificationStatus(id: number, status: string): Promise<Notification | undefined> {
    const existingNotification = this.notifications.get(id);
    if (!existingNotification) return undefined;

    const updatedNotification = { ...existingNotification, status };
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }

  // Knowledge Graph methods
  async getKnowledgeGraphNodes(options?: { nodeType?: string, documentId?: number }): Promise<KnowledgeGraphNode[]> {
    const nodes = Array.from(this.knowledgeGraphNodes.values());
    
    if (!options) return nodes;
    
    return nodes.filter(node => {
      if (options.nodeType && node.nodeType !== options.nodeType) return false;
      if (options.documentId && node.documentId !== options.documentId) return false;
      return true;
    });
  }

  async getKnowledgeGraphNode(id: number): Promise<KnowledgeGraphNode | undefined> {
    return this.knowledgeGraphNodes.get(id);
  }

  async createKnowledgeGraphNode(node: InsertKnowledgeGraphNode): Promise<KnowledgeGraphNode> {
    const id = this.knowledgeGraphNodeIdCounter++;
    const now = new Date();
    const newNode: KnowledgeGraphNode = {
      ...node,
      id,
      createdAt: node.createdAt || now,
      updatedAt: node.updatedAt || now
    };
    
    this.knowledgeGraphNodes.set(id, newNode);
    return newNode;
  }

  async updateKnowledgeGraphNode(id: number, node: Partial<KnowledgeGraphNode>): Promise<KnowledgeGraphNode | undefined> {
    const existingNode = this.knowledgeGraphNodes.get(id);
    if (!existingNode) return undefined;

    const updatedNode = { 
      ...existingNode, 
      ...node,
      updatedAt: new Date()
    };
    
    this.knowledgeGraphNodes.set(id, updatedNode);
    return updatedNode;
  }

  async deleteKnowledgeGraphNode(id: number): Promise<boolean> {
    // Delete all edges connected to this node first
    const edges = Array.from(this.knowledgeGraphEdges.values());
    const connectedEdges = edges.filter(edge => 
      edge.sourceNodeId === id || edge.targetNodeId === id
    );
    
    for (const edge of connectedEdges) {
      this.knowledgeGraphEdges.delete(edge.id);
    }
    
    return this.knowledgeGraphNodes.delete(id);
  }

  async getKnowledgeGraphEdges(options?: { sourceNodeId?: number, targetNodeId?: number, relationship?: string }): Promise<KnowledgeGraphEdge[]> {
    const edges = Array.from(this.knowledgeGraphEdges.values());
    
    if (!options) return edges;
    
    return edges.filter(edge => {
      if (options.sourceNodeId && edge.sourceNodeId !== options.sourceNodeId) return false;
      if (options.targetNodeId && edge.targetNodeId !== options.targetNodeId) return false;
      if (options.relationship && edge.relationship !== options.relationship) return false;
      return true;
    });
  }

  async getKnowledgeGraphEdge(id: number): Promise<KnowledgeGraphEdge | undefined> {
    return this.knowledgeGraphEdges.get(id);
  }

  async createKnowledgeGraphEdge(edge: InsertKnowledgeGraphEdge): Promise<KnowledgeGraphEdge> {
    const id = this.knowledgeGraphEdgeIdCounter++;
    const now = new Date();
    const newEdge: KnowledgeGraphEdge = {
      ...edge,
      id,
      createdAt: edge.createdAt || now
    };
    
    this.knowledgeGraphEdges.set(id, newEdge);
    return newEdge;
  }

  async deleteKnowledgeGraphEdge(id: number): Promise<boolean> {
    return this.knowledgeGraphEdges.delete(id);
  }

  // Document Analysis methods
  async getDocumentAnalysis(id: number): Promise<DocumentAnalysis | undefined> {
    return this.documentAnalyses.get(id);
  }

  async getDocumentAnalysisByDocument(documentId: number, analysisType?: string): Promise<DocumentAnalysis[]> {
    return Array.from(this.documentAnalyses.values())
      .filter(analysis => {
        if (analysis.documentId !== documentId) return false;
        if (analysisType && analysis.analysisType !== analysisType) return false;
        return true;
      });
  }

  async createDocumentAnalysis(analysis: InsertDocumentAnalysis): Promise<DocumentAnalysis> {
    const id = this.documentAnalysisIdCounter++;
    const newAnalysis: DocumentAnalysis = {
      ...analysis,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: analysis.status || 'pending',
      results: analysis.results || null
    };
    this.documentAnalyses.set(id, newAnalysis);
    return newAnalysis;
  }

  async updateDocumentAnalysisStatus(id: number, status: string, results?: any): Promise<DocumentAnalysis | undefined> {
    const analysis = this.documentAnalyses.get(id);
    if (!analysis) return undefined;
    
    const updatedAnalysis: DocumentAnalysis = {
      ...analysis,
      status,
      results: results !== undefined ? results : analysis.results,
      updatedAt: new Date()
    };
    
    this.documentAnalyses.set(id, updatedAnalysis);
    return updatedAnalysis;
  }

  // Regulatory Requirements methods
  async getRegulatoryRequirement(id: number): Promise<RegulatoryRequirement | undefined> {
    return this.regulatoryRequirements.get(id);
  }

  async getRegulatoryRequirementByCode(code: string, authority: string): Promise<RegulatoryRequirement | undefined> {
    return Array.from(this.regulatoryRequirements.values())
      .find(req => req.code === code && req.authority === authority);
  }

  async getAllRegulatoryRequirements(authority?: string): Promise<RegulatoryRequirement[]> {
    const requirements = Array.from(this.regulatoryRequirements.values());
    if (authority) {
      return requirements.filter(req => req.authority === authority);
    }
    return requirements;
  }

  async createRegulatoryRequirement(requirement: InsertRegulatoryRequirement): Promise<RegulatoryRequirement> {
    const id = this.regulatoryRequirementIdCounter++;
    const newRequirement: RegulatoryRequirement = {
      ...requirement,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.regulatoryRequirements.set(id, newRequirement);
    return newRequirement;
  }

  async updateRegulatoryRequirement(id: number, requirement: Partial<RegulatoryRequirement>): Promise<RegulatoryRequirement | undefined> {
    const existingRequirement = this.regulatoryRequirements.get(id);
    if (!existingRequirement) return undefined;
    
    const updatedRequirement: RegulatoryRequirement = {
      ...existingRequirement,
      ...requirement,
      updatedAt: new Date()
    };
    this.regulatoryRequirements.set(id, updatedRequirement);
    return updatedRequirement;
  }

  async deleteRegulatoryRequirement(id: number): Promise<boolean> {
    return this.regulatoryRequirements.delete(id);
  }

  // Program Compliance methods
  async getProgramCompliance(id: number): Promise<ProgramCompliance | undefined> {
    return this.programCompliances.get(id);
  }

  async getProgramCompliancesByProgram(programId: number): Promise<ProgramCompliance[]> {
    return Array.from(this.programCompliances.values())
      .filter(compliance => compliance.programId === programId);
  }

  async createProgramCompliance(compliance: InsertProgramCompliance): Promise<ProgramCompliance> {
    const id = this.programComplianceIdCounter++;
    const newCompliance: ProgramCompliance = {
      ...compliance,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.programCompliances.set(id, newCompliance);
    return newCompliance;
  }

  async updateProgramCompliance(id: number, compliance: Partial<ProgramCompliance>): Promise<ProgramCompliance | undefined> {
    const existingCompliance = this.programCompliances.get(id);
    if (!existingCompliance) return undefined;
    
    const updatedCompliance: ProgramCompliance = {
      ...existingCompliance,
      ...compliance,
      updatedAt: new Date()
    };
    this.programCompliances.set(id, updatedCompliance);
    return updatedCompliance;
  }

  async deleteProgramCompliance(id: number): Promise<boolean> {
    return this.programCompliances.delete(id);
  }

  // Audit Log methods
  async getAuditLog(id: number): Promise<AuditLog | undefined> {
    return this.auditLogs.get(id);
  }

  async getAuditLogsByEntity(entityType: string, entityId: number): Promise<AuditLog[]> {
    return Array.from(this.auditLogs.values())
      .filter(log => log.entityType === entityType && log.entityId === entityId);
  }

  async getAuditLogsByUser(userId: number): Promise<AuditLog[]> {
    return Array.from(this.auditLogs.values())
      .filter(log => log.userId === userId);
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const id = this.auditLogIdCounter++;
    const newLog: AuditLog = {
      ...log,
      id,
      timestamp: log.timestamp || new Date(),
      metadata: log.metadata || null,
      blockchainTransactionId: log.blockchainTransactionId || null,
      verified: log.verified || false
    };
    this.auditLogs.set(id, newLog);
    return newLog;
  }

  async verifyAuditLog(id: number, blockchainTransactionId: string): Promise<AuditLog | undefined> {
    const log = this.auditLogs.get(id);
    if (!log) return undefined;
    
    const verifiedLog: AuditLog = {
      ...log,
      blockchainTransactionId,
      verified: true
    };
    this.auditLogs.set(id, verifiedLog);
    return verifiedLog;
  }

  // Performance Metrics methods
  async getPerformanceMetric(id: number): Promise<PerformanceMetric | undefined> {
    return this.performanceMetrics.get(id);
  }

  async getPerformanceMetricsByTrainee(traineeId: number): Promise<PerformanceMetric[]> {
    return Array.from(this.performanceMetrics.values())
      .filter(metric => metric.traineeId === traineeId);
  }

  async getPerformanceMetricsBySession(sessionId: number): Promise<PerformanceMetric[]> {
    return Array.from(this.performanceMetrics.values())
      .filter(metric => metric.sessionId === sessionId);
  }

  async createPerformanceMetric(metric: InsertPerformanceMetric): Promise<PerformanceMetric> {
    const id = this.performanceMetricIdCounter++;
    const newMetric: PerformanceMetric = { 
      ...metric, 
      id,
      context: metric.context || null,
      confidence: metric.confidence || 1.0
    };
    this.performanceMetrics.set(id, newMetric);
    return newMetric;
  }

  // Predictive Models methods
  async getPredictiveModel(id: number): Promise<PredictiveModel | undefined> {
    return this.predictiveModels.get(id);
  }

  async getAllPredictiveModels(active?: boolean): Promise<PredictiveModel[]> {
    const models = Array.from(this.predictiveModels.values());
    if (active !== undefined) {
      return models.filter(model => model.active === active);
    }
    return models;
  }

  async createPredictiveModel(model: InsertPredictiveModel): Promise<PredictiveModel> {
    const id = this.predictiveModelIdCounter++;
    const now = new Date();
    const newModel: PredictiveModel = {
      ...model,
      id,
      trainingData: model.trainingData || null,
      accuracy: model.accuracy || null,
      createdAt: model.createdAt || now,
      updatedAt: model.updatedAt || now,
      active: model.active !== undefined ? model.active : true
    };
    this.predictiveModels.set(id, newModel);
    return newModel;
  }

  async updatePredictiveModel(id: number, model: Partial<PredictiveModel>): Promise<PredictiveModel | undefined> {
    const existingModel = this.predictiveModels.get(id);
    if (!existingModel) return undefined;

    const updatedModel = { ...existingModel, ...model, updatedAt: new Date() };
    this.predictiveModels.set(id, updatedModel);
    return updatedModel;
  }

  async deletePredictiveModel(id: number): Promise<boolean> {
    return this.predictiveModels.delete(id);
  }

  // Skill Decay Predictions methods
  async getSkillDecayPrediction(id: number): Promise<SkillDecayPrediction | undefined> {
    return this.skillDecayPredictions.get(id);
  }

  async getSkillDecayPredictionsByTrainee(traineeId: number): Promise<SkillDecayPrediction[]> {
    return Array.from(this.skillDecayPredictions.values())
      .filter(prediction => prediction.traineeId === traineeId);
  }

  async createSkillDecayPrediction(prediction: InsertSkillDecayPrediction): Promise<SkillDecayPrediction> {
    const id = this.skillDecayPredictionIdCounter++;
    const now = new Date();
    const newPrediction: SkillDecayPrediction = {
      ...prediction,
      id,
      createdAt: prediction.createdAt || now
    };
    this.skillDecayPredictions.set(id, newPrediction);
    return newPrediction;
  }

  async updateSkillDecayPrediction(id: number, prediction: Partial<SkillDecayPrediction>): Promise<SkillDecayPrediction | undefined> {
    const existingPrediction = this.skillDecayPredictions.get(id);
    if (!existingPrediction) return undefined;

    const updatedPrediction = { ...existingPrediction, ...prediction };
    this.skillDecayPredictions.set(id, updatedPrediction);
    return updatedPrediction;
  }

  // Session Replay methods
  async getSessionReplay(id: number): Promise<SessionReplay | undefined> {
    return this.sessionReplays.get(id);
  }

  async getSessionReplaysBySession(sessionId: number): Promise<SessionReplay[]> {
    return Array.from(this.sessionReplays.values())
      .filter(replay => replay.sessionId === sessionId);
  }

  async createSessionReplay(replay: InsertSessionReplay): Promise<SessionReplay> {
    const id = this.sessionReplayIdCounter++;
    const now = new Date();
    const newReplay: SessionReplay = {
      ...replay,
      id,
      metadata: replay.metadata || null,
      createdAt: replay.createdAt || now
    };
    this.sessionReplays.set(id, newReplay);
    return newReplay;
  }

  // Session Events methods
  async getSessionEvent(id: number): Promise<SessionEvent | undefined> {
    return this.sessionEvents.get(id);
  }

  async getSessionEventsByReplay(replayId: number): Promise<SessionEvent[]> {
    return Array.from(this.sessionEvents.values())
      .filter(event => event.replayId === replayId);
  }

  async createSessionEvent(event: InsertSessionEvent): Promise<SessionEvent> {
    const id = this.sessionEventIdCounter++;
    const newEvent: SessionEvent = {
      ...event,
      id,
      severity: event.severity || null,
      parameters: event.parameters || null
    };
    this.sessionEvents.set(id, newEvent);
    return newEvent;
  }

  // Achievements methods
  async getAchievement(id: number): Promise<Achievement | undefined> {
    return this.achievements.get(id);
  }

  async getAllAchievements(active?: boolean): Promise<Achievement[]> {
    const achievements = Array.from(this.achievements.values());
    if (active !== undefined) {
      return achievements.filter(achievement => achievement.active === active);
    }
    return achievements;
  }

  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const id = this.achievementIdCounter++;
    const newAchievement: Achievement = {
      ...achievement,
      id,
      criteria: achievement.criteria || null,
      imageUrl: achievement.imageUrl || null,
      active: achievement.active !== undefined ? achievement.active : true
    };
    this.achievements.set(id, newAchievement);
    return newAchievement;
  }

  async updateAchievement(id: number, achievement: Partial<Achievement>): Promise<Achievement | undefined> {
    const existingAchievement = this.achievements.get(id);
    if (!existingAchievement) return undefined;

    const updatedAchievement = { ...existingAchievement, ...achievement };
    this.achievements.set(id, updatedAchievement);
    return updatedAchievement;
  }

  async deleteAchievement(id: number): Promise<boolean> {
    return this.achievements.delete(id);
  }

  // User Achievements methods
  async getUserAchievement(id: number): Promise<UserAchievement | undefined> {
    return this.userAchievements.get(id);
  }

  async getUserAchievementsByUser(userId: number): Promise<UserAchievement[]> {
    return Array.from(this.userAchievements.values())
      .filter(userAchievement => userAchievement.userId === userId);
  }

  async createUserAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement> {
    const id = this.userAchievementIdCounter++;
    const now = new Date();
    const newUserAchievement: UserAchievement = {
      ...userAchievement,
      id,
      notes: userAchievement.notes || null,
      awardedAt: userAchievement.awardedAt || now
    };
    this.userAchievements.set(id, newUserAchievement);
    return newUserAchievement;
  }

  async updateUserAchievement(id: number, userAchievement: Partial<UserAchievement>): Promise<UserAchievement | undefined> {
    const existingUserAchievement = this.userAchievements.get(id);
    if (!existingUserAchievement) return undefined;

    const updatedUserAchievement = { ...existingUserAchievement, ...userAchievement };
    this.userAchievements.set(id, updatedUserAchievement);
    return updatedUserAchievement;
  }
  
  async grantAchievementToUser(
    userId: number, 
    achievementId: number, 
    options: {
      progress?: number;
      metadata?: Record<string, any>;
      grantedById: number;
      notes?: string;
    }
  ): Promise<UserAchievement> {
    // Check if user exists
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Check if achievement exists
    const achievement = await this.getAchievement(achievementId);
    if (!achievement) {
      throw new Error(`Achievement with ID ${achievementId} not found`);
    }
    
    // Check if user already has this achievement
    const existingUserAchievement = Array.from(this.userAchievements.values()).find(
      ua => ua.userId === userId && ua.achievementId === achievementId
    );
    
    if (existingUserAchievement) {
      // Update progress if needed
      if (options.progress !== undefined && options.progress > existingUserAchievement.progress) {
        const updatedUserAchievement = await this.updateUserAchievement(
          existingUserAchievement.id,
          { 
            progress: options.progress,
            metadata: options.metadata || existingUserAchievement.metadata,
            grantedById: options.grantedById,
            notes: options.notes || existingUserAchievement.notes
          }
        );
        
        // If progress reaches 100, mark as awarded
        if (options.progress >= 100 && !existingUserAchievement.awardedAt) {
          return this.updateUserAchievement(
            existingUserAchievement.id,
            { awardedAt: new Date() }
          ) as Promise<UserAchievement>;
        }
        
        return updatedUserAchievement as UserAchievement;
      }
      
      return existingUserAchievement;
    }
    
    // Create new user achievement
    const newUserAchievement: InsertUserAchievement = {
      userId,
      achievementId,
      progress: options.progress || 100, // Default to 100% if not specified
      metadata: options.metadata || null,
      grantedById: options.grantedById,
      notes: options.notes || null,
      awardedAt: options.progress && options.progress < 100 ? null : new Date()
    };
    
    const createdUserAchievement = await this.createUserAchievement(newUserAchievement);
    
    // Add notification about achievement
    await this.createNotification({
      userId,
      type: 'achievement',
      title: `Achievement Unlocked: ${achievement.name}`,
      content: achievement.description,
      metadata: { achievementId, userAchievementId: createdUserAchievement.id },
      isRead: false,
      priority: 'medium',
      expiresAt: null,
      sendEmail: false
    });
    
    // Update user points if the achievement grants points
    if (achievement.points && createdUserAchievement.awardedAt) {
      // Here you could implement logic to update user points in a separate table
      // For simplicity, let's just log that points have been granted
      console.log(`User ${userId} earned ${achievement.points} points for achievement ${achievementId}`);
    }
    
    return createdUserAchievement;
  }
  
  async checkAchievementTriggers(
    triggerData: {
      userId: number;
      type: string;
      value: number;
      metadata?: Record<string, any>;
    }
  ): Promise<UserAchievement[]> {
    // Get user
    const user = await this.getUser(triggerData.userId);
    if (!user) {
      throw new Error(`User with ID ${triggerData.userId} not found`);
    }
    
    // Get all achievements that might be triggered by this action
    const achievementsToCheck = Array.from(this.achievements.values())
      .filter(achievement => {
        // Access criteria.triggerType
        const criteriaObj = achievement.criteria as Record<string, any>;
        return criteriaObj?.triggerType === triggerData.type && achievement.active === true;
      });
    
    const grantedAchievements: UserAchievement[] = [];
    
    // Check each relevant achievement
    for (const achievement of achievementsToCheck) {
      // Access criteria properties
      const criteriaObj = achievement.criteria as Record<string, any>;
      const threshold = criteriaObj?.threshold || 0;
      
      // Skip if user already has this achievement fully unlocked
      const existingUserAchievement = Array.from(this.userAchievements.values()).find(
        ua => ua.userId === triggerData.userId && ua.achievementId === achievement.id && ua.awardedAt !== null
      );
      
      if (existingUserAchievement) continue;
      
      let shouldGrant = false;
      let progress = 0;
      
      // Evaluate achievement criteria based on the trigger type
      switch (triggerData.type) {
        case 'session_completion':
          if (threshold > 0) {
            // Get current completion count
            let completionCount = 1; // Start with the current completion
            
            // Add any existing progress from an in-progress achievement
            if (existingUserAchievement && existingUserAchievement.progress !== null) {
              const existingProgress = existingUserAchievement.progress || 0;
              completionCount += existingProgress;
            }
            
            progress = Math.min(100, Math.floor((completionCount / threshold) * 100));
            shouldGrant = completionCount >= threshold;
          }
          break;
          
        case 'assessment_score':
          if (threshold > 0) {
            progress = Math.min(100, Math.floor((triggerData.value / threshold) * 100));
            shouldGrant = triggerData.value >= threshold;
          }
          break;
          
        case 'module_completion':
          if (threshold > 0) {
            // Get current completion count
            let completionCount = 1; // Start with the current completion
            
            // Add any existing progress from an in-progress achievement
            if (existingUserAchievement && existingUserAchievement.progress !== null) {
              const existingProgress = existingUserAchievement.progress || 0;
              completionCount += existingProgress;
            }
            
            progress = Math.min(100, Math.floor((completionCount / threshold) * 100));
            shouldGrant = completionCount >= threshold;
          }
          break;
          
        case 'flight_hours':
          if (threshold > 0) {
            // Get current hours
            let totalHours = triggerData.value; // Start with current session hours
            
            // Add any existing progress from an in-progress achievement
            if (existingUserAchievement && existingUserAchievement.progress !== null) {
              const existingProgress = existingUserAchievement.progress || 0;
              totalHours += existingProgress;
            }
            
            progress = Math.min(100, Math.floor((totalHours / threshold) * 100));
            shouldGrant = totalHours >= threshold;
          }
          break;
          
        case 'login_streak':
          if (threshold > 0) {
            progress = Math.min(100, Math.floor((triggerData.value / threshold) * 100));
            shouldGrant = triggerData.value >= threshold;
          }
          break;
          
        case 'resource_contribution':
          if (threshold > 0) {
            // Get current count
            let resourceCount = 1; // Start with the current contribution
            
            // Add any existing progress from an in-progress achievement
            if (existingUserAchievement && existingUserAchievement.progress !== null) {
              const existingProgress = existingUserAchievement.progress || 0;
              resourceCount += existingProgress;
            }
            
            progress = Math.min(100, Math.floor((resourceCount / threshold) * 100));
            shouldGrant = resourceCount >= threshold;
          }
          break;
          
        // Add more trigger types as needed
      }
      
      // Update or create user achievement based on progress
      if (progress > 0) {
        // Prepare metadata
        const metadata = {
          lastChecked: new Date(),
          triggerData: triggerData
        };
        
        // Grant or update achievement
        const userAchievement = await this.grantAchievementToUser(
          triggerData.userId,
          achievement.id,
          {
            progress: shouldGrant ? 100 : progress,
            metadata: metadata,
            awardedAt: shouldGrant ? new Date() : undefined
          }
        );
        
        if (shouldGrant) {
          grantedAchievements.push(userAchievement);
          
          // Create notification for the user
          try {
            await this.createNotification({
              recipientId: triggerData.userId,
              type: 'achievement',
              content: `You've earned the "${achievement.name}" achievement! ${achievement.description}`,
              status: 'unread'
            });
          } catch (notificationError) {
            console.error("Failed to create achievement notification:", notificationError);
          }
        }
      }
    }
    
    return grantedAchievements;
  }

  // Leaderboards methods
  async getLeaderboard(id: number): Promise<Leaderboard | undefined> {
    return this.leaderboards.get(id);
  }

  async getAllLeaderboards(active?: boolean): Promise<Leaderboard[]> {
    const leaderboards = Array.from(this.leaderboards.values());
    if (active !== undefined) {
      return leaderboards.filter(leaderboard => leaderboard.active === active);
    }
    return leaderboards;
  }

  async createLeaderboard(leaderboard: InsertLeaderboard): Promise<Leaderboard> {
    const id = this.leaderboardIdCounter++;
    const now = new Date();
    const newLeaderboard: Leaderboard = {
      ...leaderboard,
      id,
      criteria: leaderboard.criteria || null,
      startDate: leaderboard.startDate || now,
      endDate: leaderboard.endDate || null,
      active: leaderboard.active !== undefined ? leaderboard.active : true
    };
    this.leaderboards.set(id, newLeaderboard);
    return newLeaderboard;
  }

  async updateLeaderboard(id: number, leaderboard: Partial<Leaderboard>): Promise<Leaderboard | undefined> {
    const existingLeaderboard = this.leaderboards.get(id);
    if (!existingLeaderboard) return undefined;

    const updatedLeaderboard = { ...existingLeaderboard, ...leaderboard };
    this.leaderboards.set(id, updatedLeaderboard);
    return updatedLeaderboard;
  }

  async deleteLeaderboard(id: number): Promise<boolean> {
    return this.leaderboards.delete(id);
  }

  // Leaderboard Entries methods
  async getLeaderboardEntry(id: number): Promise<LeaderboardEntry | undefined> {
    return this.leaderboardEntries.get(id);
  }

  async getLeaderboardEntriesByLeaderboard(leaderboardId: number): Promise<LeaderboardEntry[]> {
    return Array.from(this.leaderboardEntries.values())
      .filter(entry => entry.leaderboardId === leaderboardId)
      .sort((a, b) => b.score - a.score); // Sort by score descending
  }

  async createLeaderboardEntry(entry: InsertLeaderboardEntry): Promise<LeaderboardEntry> {
    const id = this.leaderboardEntryIdCounter++;
    const now = new Date();
    const newEntry: LeaderboardEntry = {
      ...entry,
      id,
      updatedAt: now
    };
    this.leaderboardEntries.set(id, newEntry);
    return newEntry;
  }

  async updateLeaderboardEntry(id: number, entry: Partial<LeaderboardEntry>): Promise<LeaderboardEntry | undefined> {
    const existingEntry = this.leaderboardEntries.get(id);
    if (!existingEntry) return undefined;

    const updatedEntry = { 
      ...existingEntry, 
      ...entry,
      updatedAt: new Date()
    };
    this.leaderboardEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  // Shared Scenarios methods
  async getSharedScenario(id: number): Promise<SharedScenario | undefined> {
    return this.sharedScenarios.get(id);
  }

  async getAllSharedScenarios(status?: string): Promise<SharedScenario[]> {
    const scenarios = Array.from(this.sharedScenarios.values());
    if (status) {
      return scenarios.filter(scenario => scenario.status === status);
    }
    return scenarios;
  }

  async getSharedScenariosByUser(userId: number): Promise<SharedScenario[]> {
    return Array.from(this.sharedScenarios.values())
      .filter(scenario => scenario.createdById === userId);
  }

  async createSharedScenario(scenario: InsertSharedScenario): Promise<SharedScenario> {
    const id = this.sharedScenarioIdCounter++;
    const now = new Date();
    const newScenario: SharedScenario = {
      ...scenario,
      id,
      verifiedById: scenario.verifiedById || null,
      verifiedAt: scenario.verifiedAt || null,
      downloadCount: 0,
      rating: null,
      createdAt: now,
      updatedAt: now,
      status: scenario.status || 'pending',
      aircraft: scenario.aircraft || null
    };
    this.sharedScenarios.set(id, newScenario);
    return newScenario;
  }

  async updateSharedScenario(id: number, scenario: Partial<SharedScenario>): Promise<SharedScenario | undefined> {
    const existingScenario = this.sharedScenarios.get(id);
    if (!existingScenario) return undefined;

    const updatedScenario = { 
      ...existingScenario, 
      ...scenario,
      updatedAt: new Date() 
    };
    this.sharedScenarios.set(id, updatedScenario);
    return updatedScenario;
  }

  async deleteSharedScenario(id: number): Promise<boolean> {
    return this.sharedScenarios.delete(id);
  }

  async verifySharedScenario(id: number, verifiedById: number): Promise<SharedScenario | undefined> {
    const scenario = this.sharedScenarios.get(id);
    if (!scenario) return undefined;

    const verifiedScenario = {
      ...scenario,
      verifiedById,
      verifiedAt: new Date(),
      status: 'verified',
      updatedAt: new Date()
    };
    this.sharedScenarios.set(id, verifiedScenario);
    return verifiedScenario;
  }

  async incrementScenarioDownloadCount(id: number): Promise<SharedScenario | undefined> {
    const scenario = this.sharedScenarios.get(id);
    if (!scenario) return undefined;

    const updatedScenario = {
      ...scenario,
      downloadCount: scenario.downloadCount + 1,
      updatedAt: new Date()
    };
    this.sharedScenarios.set(id, updatedScenario);
    return updatedScenario;
  }

  // MFA methods
  async getMfaCredential(id: number): Promise<MfaCredential | undefined> {
    return this.mfaCredentials.get(id);
  }

  async getMfaCredentialsByUser(userId: number): Promise<MfaCredential[]> {
    return Array.from(this.mfaCredentials.values())
      .filter(cred => cred.userId === userId);
  }

  async getMfaCredentialByUserAndType(userId: number, type: string): Promise<MfaCredential | undefined> {
    return Array.from(this.mfaCredentials.values())
      .find(cred => cred.userId === userId && cred.type === type);
  }

  async createMfaCredential(credential: InsertMfaCredential): Promise<MfaCredential> {
    const id = this.mfaCredentialIdCounter++;
    const newCredential: MfaCredential = {
      id,
      ...credential,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.mfaCredentials.set(id, newCredential);
    return newCredential;
  }

  async updateMfaCredential(id: number, credential: Partial<MfaCredential>): Promise<MfaCredential | undefined> {
    const existingCredential = this.mfaCredentials.get(id);
    if (!existingCredential) return undefined;

    const updatedCredential = {
      ...existingCredential,
      ...credential,
      updatedAt: new Date()
    };
    this.mfaCredentials.set(id, updatedCredential);
    return updatedCredential;
  }

  async deleteMfaCredential(id: number): Promise<boolean> {
    if (!this.mfaCredentials.has(id)) return false;
    return this.mfaCredentials.delete(id);
  }

  // SessionPlan methods
  async getSessionPlan(sessionId: number): Promise<SessionPlan | undefined> {
    // Find the session plan that matches the sessionId
    for (const plan of this.sessionPlans.values()) {
      if (plan.sessionId === sessionId) {
        return plan;
      }
    }
    return undefined;
  }

  async createSessionPlan(plan: InsertSessionPlan): Promise<SessionPlan> {
    const id = this.sessionPlanIdCounter++;
    const now = new Date();
    
    const newPlan: SessionPlan = {
      id,
      sessionId: plan.sessionId,
      previousSessionId: plan.previousSessionId || null,
      previousTopicsCovered: plan.previousTopicsCovered || [],
      currentTopics: plan.currentTopics || [],
      nextTopics: plan.nextTopics || [],
      notes: plan.notes || null,
      resources: plan.resources || [],
      progressIndicators: plan.progressIndicators || {},
      createdAt: now,
      updatedAt: now
    };
    
    this.sessionPlans.set(id, newPlan);
    return newPlan;
  }

  async updateSessionPlan(id: number, plan: Partial<SessionPlan>): Promise<SessionPlan | undefined> {
    const existingPlan = this.sessionPlans.get(id);
    if (!existingPlan) {
      return undefined;
    }
    
    const updatedPlan: SessionPlan = {
      ...existingPlan,
      ...plan,
      updatedAt: new Date()
    };
    
    this.sessionPlans.set(id, updatedPlan);
    return updatedPlan;
  }

  async generateSessionPlan(options: {
    sessionId: number;
    documentIds?: number[];
    previousSessionId?: number;
    analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
  }): Promise<SessionPlan> {
    // Import the service here to avoid circular dependency
    const { generateSessionPlanFromDocuments } = await import('./services/document-to-session-service');
    
    // Use the document-to-session service to generate a plan
    const planData = await generateSessionPlanFromDocuments({
      sessionId: options.sessionId,
      documentIds: options.documentIds || [],
      previousSessionId: options.previousSessionId,
      analysisDepth: options.analysisDepth || 'detailed'
    });
    
    // Create the session plan
    return this.createSessionPlan(planData);
  }

  // User update method
  async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;

    const updatedUser = {
      ...existingUser,
      ...user,
      updatedAt: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    if (!this.users.has(id)) return false;
    return this.users.delete(id);
  }

  // Initialize sample achievements
  private initializeSampleAchievements() {
    // Achievement categories: training, skills, participation, milestones
    
    // Training achievements
    const trainingCompletion = {
      id: this.achievementIdCounter++,
      name: "Training Completion",
      description: "Complete any training program",
      category: "training",
      points: 50,
      criteria: {},
      badgeUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true,
      triggerType: "module_completion",
      threshold: 1
    };

    const perfectScore = {
      id: this.achievementIdCounter++,
      name: "Perfect Score",
      description: "Achieve a perfect score on any assessment",
      category: "skills",
      points: 100,
      criteria: {},
      badgeUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true,
      triggerType: "assessment_score",
      threshold: 100
    };

    const sessionStreak = {
      id: this.achievementIdCounter++,
      name: "Session Streak",
      description: "Complete 5 training sessions in a row",
      category: "participation",
      points: 75,
      criteria: {},
      badgeUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true,
      triggerType: "session_completion",
      threshold: 5
    };

    const loginStreak = {
      id: this.achievementIdCounter++,
      name: "Login Streak",
      description: "Log in to the platform for 7 consecutive days",
      category: "participation",
      points: 30,
      criteria: {},
      badgeUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true,
      triggerType: "login_streak",
      threshold: 7
    };

    const resourceContributor = {
      id: this.achievementIdCounter++,
      name: "Resource Contributor",
      description: "Share 3 resources with other users",
      category: "participation",
      points: 60,
      criteria: {},
      badgeUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true,
      triggerType: "resource_contribution",
      threshold: 3
    };

    const emergencyMaster = {
      id: this.achievementIdCounter++,
      name: "Emergency Procedures Master",
      description: "Successfully complete all emergency procedure assessments",
      category: "skills",
      points: 120,
      criteria: {},
      badgeUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true,
      triggerType: "assessment_score",
      threshold: 90
    };

    const typeRatingAchievement = {
      id: this.achievementIdCounter++,
      name: "Type Rating Achievement",
      description: "Complete a type rating training program",
      category: "milestones",
      points: 200,
      criteria: {},
      badgeUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true,
      triggerType: "module_completion",
      threshold: 10
    };

    const firstFlight = {
      id: this.achievementIdCounter++,
      name: "First Solo Flight",
      description: "Complete your first solo flight session",
      category: "milestones",
      points: 150,
      criteria: {},
      badgeUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true,
      triggerType: "session_completion",
      threshold: 1
    };

    // Add achievements to storage
    this.achievements.set(trainingCompletion.id, trainingCompletion);
    this.achievements.set(perfectScore.id, perfectScore);
    this.achievements.set(sessionStreak.id, sessionStreak);
    this.achievements.set(loginStreak.id, loginStreak);
    this.achievements.set(resourceContributor.id, resourceContributor);
    this.achievements.set(emergencyMaster.id, emergencyMaster);
    this.achievements.set(typeRatingAchievement.id, typeRatingAchievement);
    this.achievements.set(firstFlight.id, firstFlight);

    // Grant some sample achievements to users for testing
    // Student user (ID: 3) has earned some achievements
    const studentFirstAchievement: UserAchievement = {
      id: this.userAchievementIdCounter++,
      userId: 3, // student user
      achievementId: firstFlight.id,
      progress: 100,
      metadata: {},
      awardedAt: new Date(new Date().setDate(new Date().getDate() - 14)), // 14 days ago
      grantedById: 2 // Instructor
    };

    const studentSecondAchievement: UserAchievement = {
      id: this.userAchievementIdCounter++,
      userId: 3, // student user
      achievementId: trainingCompletion.id,
      progress: 100,
      metadata: {},
      awardedAt: new Date(new Date().setDate(new Date().getDate() - 7)), // 7 days ago
      grantedById: 2 // Instructor
    };

    // Add sample progress for an achievement that isn't completed yet
    const studentInProgressAchievement: UserAchievement = {
      id: this.userAchievementIdCounter++,
      userId: 3, // student user
      achievementId: sessionStreak.id,
      progress: 60, // 60% completed (3 of 5 sessions)
      metadata: {},
      awardedAt: null, // Not completed yet
      grantedById: 2 // Instructor
    };

    // Store user achievements
    this.userAchievements.set(studentFirstAchievement.id, studentFirstAchievement);
    this.userAchievements.set(studentSecondAchievement.id, studentSecondAchievement);
    this.userAchievements.set(studentInProgressAchievement.id, studentInProgressAchievement);

    console.log('Initialized sample achievements:', 
      this.achievements.size, 
      'achievements created with IDs:', 
      Array.from(this.achievements.keys()).join(', ')
    );
  }

  // Initialize sample leaderboards
  private initializeSampleLeaderboards() {
    // Create a "Weekly Training Progress" leaderboard
    const weeklyLeaderboard = {
      id: this.leaderboardIdCounter++,
      name: "Weekly Training Progress",
      description: "Top trainees based on weekly training progress",
      category: "training",
      timeframe: "weekly",
      scoreType: "progress",
      active: true,
      criteria: {},
      startDate: new Date(new Date().setDate(new Date().getDate() - 7)), // 1 week ago
      endDate: new Date(new Date().setDate(new Date().getDate() + 7)), // 1 week from now
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create a "Monthly Achievement Points" leaderboard
    const monthlyLeaderboard = {
      id: this.leaderboardIdCounter++,
      name: "Monthly Achievement Points",
      description: "Top users based on achievement points earned this month",
      category: "achievements",
      timeframe: "monthly",
      scoreType: "points",
      active: true,
      criteria: {},
      startDate: new Date(new Date().setDate(1)), // Start of current month
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1, 0)), // End of current month
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store leaderboards
    this.leaderboards.set(weeklyLeaderboard.id, weeklyLeaderboard);
    this.leaderboards.set(monthlyLeaderboard.id, monthlyLeaderboard);

    // Add sample entries to the leaderboards
    // Weekly leaderboard entries
    const weeklyEntry1 = {
      id: this.leaderboardEntryIdCounter++,
      leaderboardId: weeklyLeaderboard.id,
      userId: 3, // student
      score: 85,
      rank: 1,
      metadata: {},
      calculatedAt: new Date(),
      updatedAt: new Date()
    };

    const weeklyEntry2 = {
      id: this.leaderboardEntryIdCounter++,
      leaderboardId: weeklyLeaderboard.id,
      userId: 4, // second student
      score: 72,
      rank: 2,
      metadata: {},
      calculatedAt: new Date(),
      updatedAt: new Date()
    };

    const weeklyEntry3 = {
      id: this.leaderboardEntryIdCounter++,
      leaderboardId: weeklyLeaderboard.id,
      userId: 8, // ATO student
      score: 68,
      rank: 3,
      metadata: {},
      calculatedAt: new Date(),
      updatedAt: new Date()
    };

    // Monthly leaderboard entries
    const monthlyEntry1 = {
      id: this.leaderboardEntryIdCounter++,
      leaderboardId: monthlyLeaderboard.id,
      userId: 3, // student
      score: 250, // achievement points
      rank: 1,
      metadata: {},
      calculatedAt: new Date(),
      updatedAt: new Date()
    };

    const monthlyEntry2 = {
      id: this.leaderboardEntryIdCounter++,
      leaderboardId: monthlyLeaderboard.id,
      userId: 8, // ATO student
      score: 200, // achievement points
      rank: 2,
      metadata: {},
      calculatedAt: new Date(),
      updatedAt: new Date()
    };

    const monthlyEntry3 = {
      id: this.leaderboardEntryIdCounter++,
      leaderboardId: monthlyLeaderboard.id,
      userId: 4, // second student
      score: 150, // achievement points
      rank: 3,
      metadata: {},
      calculatedAt: new Date(),
      updatedAt: new Date()
    };

    // Store leaderboard entries
    this.leaderboardEntries.set(weeklyEntry1.id, weeklyEntry1);
    this.leaderboardEntries.set(weeklyEntry2.id, weeklyEntry2);
    this.leaderboardEntries.set(weeklyEntry3.id, weeklyEntry3);
    this.leaderboardEntries.set(monthlyEntry1.id, monthlyEntry1);
    this.leaderboardEntries.set(monthlyEntry2.id, monthlyEntry2);
    this.leaderboardEntries.set(monthlyEntry3.id, monthlyEntry3);

    console.log('Initialized sample leaderboards:', 
      this.leaderboards.size, 
      'leaderboards created with IDs:', 
      Array.from(this.leaderboards.keys()).join(', ')
    );
  }
}

export const storage = new MemStorage();
