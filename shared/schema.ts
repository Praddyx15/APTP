import { pgTable, text, serial, integer, boolean, timestamp, json, jsonb, date, real, foreignKey, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(), // 'instructor' or 'trainee'
  organizationType: text("organization_type"), // 'ATO', 'Airline', 'Personal', 'Admin'
  organizationName: text("organization_name"),
  authProvider: text("auth_provider"), // 'local', 'google', 'microsoft'
  authProviderId: text("auth_provider_id"),
  profilePicture: text("profile_picture"),
  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaMethod: text("mfa_method"), // 'totp', 'biometric', 'recovery'
  lastLoginAt: timestamp("last_login_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  organizationType: true,
  organizationName: true,
  authProvider: true,
  authProviderId: true,
  profilePicture: true,
  mfaEnabled: true,
  mfaMethod: true,
  lastLoginAt: true,
});

// Training Program schema
export const trainingPrograms = pgTable("training_programs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  programType: text("program_type").default("type_rating"),
  aircraftType: text("aircraft_type"),
  regulatoryAuthority: text("regulatory_authority"),
  durationDays: integer("duration_days"),
  status: text("status").default("draft"),
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProgramSchema = createInsertSchema(trainingPrograms).pick({
  name: true,
  description: true,
  programType: true,
  aircraftType: true,
  regulatoryAuthority: true,
  durationDays: true,
  status: true,
  createdById: true,
});

// Module schema
export const modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  programId: integer("program_id").notNull(),
});

export const insertModuleSchema = createInsertSchema(modules).pick({
  name: true,
  programId: true,
});

// Lesson schema
export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  moduleId: integer("module_id").notNull(),
  type: text("type").notNull(), // 'video', 'document', 'interactive'
  content: text("content").notNull(), // URL or embedded content
});

export const insertLessonSchema = createInsertSchema(lessons).pick({
  name: true,
  moduleId: true,
  type: true,
  content: true,
});

// Session schema
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull(),
  moduleId: integer("module_id").notNull(),
  status: text("status").notNull(), // 'scheduled', 'in progress', 'completed'
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  resourceId: integer("resource_id"),
  instructorId: integer("instructor_id").notNull(),
});

export const insertSessionSchema = createInsertSchema(sessions).pick({
  programId: true,
  moduleId: true,
  status: true,
  startTime: true,
  endTime: true,
  resourceId: true,
  instructorId: true,
});

// Session Trainees (junction table)
export const sessionTrainees = pgTable("session_trainees", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  traineeId: integer("trainee_id").notNull(),
});

export const insertSessionTraineeSchema = createInsertSchema(sessionTrainees).pick({
  sessionId: true,
  traineeId: true,
});

// Assessment schema
export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  traineeId: integer("trainee_id").notNull(),
  sessionId: integer("session_id").notNull(),
  moduleId: integer("module_id").notNull(),
  instructorId: integer("instructor_id").notNull(),
  date: timestamp("date").notNull(),
  status: text("status").notNull(), // 'pending', 'graded'
});

export const insertAssessmentSchema = createInsertSchema(assessments).pick({
  traineeId: true,
  sessionId: true,
  moduleId: true,
  instructorId: true,
  date: true,
  status: true,
});

// Grade schema
export const grades = pgTable("grades", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id").notNull(),
  competencyAreaId: text("competency_area_id").notNull(),
  score: integer("score").notNull(),
  comments: text("comments"),
});

export const insertGradeSchema = createInsertSchema(grades).pick({
  assessmentId: true,
  competencyAreaId: true,
  score: true,
  comments: true,
});

// Enhanced Document schema
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  fileType: text("file_type").notNull(), // pdf, docx, xlsx, pptx, etc.
  url: text("url").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedById: integer("uploaded_by_id").notNull(),
  uploadedByRole: text("uploaded_by_role").notNull(), // instructor, examiner, admin
  sharedWith: jsonb("shared_with").default('[]'),
  isProcessed: boolean("is_processed").default(false),
  metadata: jsonb("metadata").default('{}'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  fileName: text("file_name"),
  tags: text("tags").array(),
  currentVersionId: integer("current_version_id"),
  createKnowledgeGraph: boolean("create_knowledge_graph").default(false),
  processingStatus: text("processing_status").default('pending'), // pending, processing, complete, error
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  title: true,
  description: true,
  fileType: true,
  url: true,
  filePath: true,
  fileSize: true,
  uploadedById: true,
  uploadedByRole: true,
  sharedWith: true,
  isProcessed: true,
  metadata: true,
  fileName: true,
  tags: true,
  createKnowledgeGraph: true,
  processingStatus: true,
});

// Document content (extracted data) schema
export const documentContent = pgTable("document_content", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documents.id, { onDelete: 'cascade' }),
  textContent: text("text_content"),
  structuredContent: jsonb("structured_content").default('{}'),
  sections: jsonb("sections").default('[]'),
  extractedKeywords: jsonb("extracted_keywords").default('[]'),
  confidenceScore: real("confidence_score").default(0),
  extractionTime: integer("extraction_time"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDocumentContentSchema = createInsertSchema(documentContent).pick({
  documentId: true,
  textContent: true,
  structuredContent: true,
  sections: true,
  extractedKeywords: true,
  confidenceScore: true,
  extractionTime: true,
});

// Training sessions schema
export const trainingSessions = pgTable("training_sessions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  documentId: integer("document_id").references(() => documents.id, { onDelete: 'set null' }),
  instructorId: integer("instructor_id").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location"),
  sessionType: text("session_type").notNull(), // ground, simulator, aircraft
  sessionStatus: text("session_status").default('scheduled'), // scheduled, in_progress, completed, cancelled
  prerequisites: jsonb("prerequisites").default('[]'),
  objectives: jsonb("objectives").default('[]'),
  materialsRequired: jsonb("materials_required").default('[]'),
  sessionNotes: text("session_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTrainingSessionSchema = createInsertSchema(trainingSessions).pick({
  title: true,
  description: true,
  documentId: true,
  instructorId: true,
  startTime: true,
  endTime: true,
  location: true,
  sessionType: true,
  sessionStatus: true,
  prerequisites: true,
  objectives: true,
  materialsRequired: true,
  sessionNotes: true,
});

// Session attendees junction table
export const sessionAttendees = pgTable("session_attendees", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => trainingSessions.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull(),
  status: text("status").default('confirmed'), // confirmed, pending, absent, attended
  feedback: text("feedback"),
  attendanceRecorded: boolean("attendance_recorded").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSessionAttendeeSchema = createInsertSchema(sessionAttendees).pick({
  sessionId: true,
  userId: true,
  status: true,
  feedback: true,
  attendanceRecorded: true,
});

// Session plans for tracking what was done and what will be done
export const sessionPlans = pgTable("session_plans", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => trainingSessions.id, { onDelete: 'cascade' }),
  previousSessionId: integer("previous_session_id").references(() => trainingSessions.id, { onDelete: 'set null' }),
  previousTopicsCovered: jsonb("previous_topics_covered").default('[]'),
  currentTopics: jsonb("current_topics").default('[]'),
  nextTopics: jsonb("next_topics").default('[]'),
  notes: text("notes"),
  resources: jsonb("resources").default('[]'),
  progressIndicators: jsonb("progress_indicators").default('{}'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSessionPlanSchema = createInsertSchema(sessionPlans).pick({
  sessionId: true,
  previousSessionId: true,
  previousTopicsCovered: true,
  currentTopics: true,
  nextTopics: true,
  notes: true,
  resources: true,
  progressIndicators: true,
});

// Compliance procedures schema
export const complianceProcedures = pgTable("compliance_procedures", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documents.id, { onDelete: 'cascade' }),
  procedureName: text("procedure_name").notNull(),
  regulatoryReference: text("regulatory_reference"),
  description: text("description"),
  requirements: jsonb("requirements").default('[]'),
  checklistItems: jsonb("checklist_items").default('[]'),
  complianceStatus: text("compliance_status").default('pending'), // pending, compliant, non_compliant
  lastUpdatedById: integer("last_updated_by_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertComplianceProcedureSchema = createInsertSchema(complianceProcedures).pick({
  documentId: true,
  procedureName: true,
  regulatoryReference: true,
  description: true,
  requirements: true,
  checklistItems: true,
  complianceStatus: true,
  lastUpdatedById: true,
});

// Document sharing schema
export const documentShares = pgTable("document_shares", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documents.id, { onDelete: 'cascade' }),
  sharedById: integer("shared_by_id").notNull(),
  sharedWithId: integer("shared_with_id").notNull(),
  sharedAt: timestamp("shared_at").notNull().defaultNow(),
  accessLevel: text("access_level").default('read'), // read, edit, admin
  notificationSent: boolean("notification_sent").default(false),
  isRead: boolean("is_read").default(false),
  lastAccessed: timestamp("last_accessed"),
});

export const insertDocumentShareSchema = createInsertSchema(documentShares).pick({
  documentId: true,
  sharedById: true,
  sharedWithId: true,
  sharedAt: true,
  accessLevel: true,
  notificationSent: true,
  isRead: true,
  lastAccessed: true,
});

// Document Version schema
export const documentVersions = pgTable("document_versions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  versionNumber: text("version_number").notNull(),
  url: text("url").notNull(),
  changedById: integer("changed_by_id").notNull(),
  changeDate: timestamp("change_date").notNull().defaultNow(),
  changeDescription: text("change_description"),
  fileSize: integer("file_size"),
});

export const insertDocumentVersionSchema = createInsertSchema(documentVersions).pick({
  documentId: true,
  versionNumber: true,
  url: true,
  changedById: true,
  changeDate: true,
  changeDescription: true,
  fileSize: true,
});

// Resource schema
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'simulator', 'classroom'
  location: text("location").notNull(),
  capacity: integer("capacity").notNull(),
});

export const insertResourceSchema = createInsertSchema(resources).pick({
  name: true,
  type: true,
  location: true,
  capacity: true,
});

// Notification schema
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'info', 'warning', 'error'
  content: text("content").notNull(),
  recipientId: integer("recipient_id").notNull(),
  createdAt: timestamp("created_at").notNull(),
  status: text("status").notNull(), // 'sent', 'read'
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  type: true,
  content: true,
  recipientId: true,
  createdAt: true,
  status: true,
});

// Knowledge Graph - Nodes
export const knowledgeGraphNodes = pgTable("knowledge_graph_nodes", {
  id: text("id").primaryKey(), // Using string ID for better compatibility with the provided code
  label: text("label").notNull(), // Display name of the concept
  category: text("category").notNull(), // Category (e.g., flight_operations, aircraft_systems)
  description: text("description"), // Description or context
  importance: real("importance").default(0.5).notNull(), // Importance score between 0-1
  documentId: integer("document_id").notNull().references(() => documents.id, { onDelete: 'cascade' }),  // Source document
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertKnowledgeGraphNodeSchema = createInsertSchema(knowledgeGraphNodes).pick({
  id: true,
  label: true,
  category: true,
  description: true,
  importance: true,
  documentId: true,
  createdAt: true,
  updatedAt: true,
});

// Knowledge Graph - Edges (Relationships)
export const knowledgeGraphEdges = pgTable("knowledge_graph_edges", {
  id: serial("id").primaryKey(),
  sourceId: text("source_id").notNull(), // References string ID in nodes table
  targetId: text("target_id").notNull(), // References string ID in nodes table
  type: text("type").notNull(), // Relationship type: 'prerequisite', 'related', 'part_of', etc.
  strength: real("strength").default(1.0), // Relationship strength (0-1)
  documentId: integer("document_id").notNull().references(() => documents.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertKnowledgeGraphEdgeSchema = createInsertSchema(knowledgeGraphEdges).pick({
  sourceId: true,
  targetId: true,
  type: true,
  strength: true,
  documentId: true,
  createdAt: true,
});

// Document Analysis Results
export const documentAnalysis = pgTable("document_analysis", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  analysisType: text("analysis_type").notNull(), // 'text_extraction', 'structure_recognition', 'entity_extraction'
  status: text("status").notNull(), // 'pending', 'processing', 'completed', 'failed'
  results: jsonb("results"),
  confidence: real("confidence"), // 0.0 to 1.0
  processingTime: integer("processing_time"), // in milliseconds
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  error: text("error"),
});

export const insertDocumentAnalysisSchema = createInsertSchema(documentAnalysis).pick({
  documentId: true,
  analysisType: true,
  status: true,
  results: true,
  confidence: true,
  processingTime: true,
  createdAt: true,
  completedAt: true,
  error: true,
});

// Regulatory Compliance Tracking
export const regulatoryRequirements = pgTable("regulatory_requirements", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(), // 'FAR 61.31', 'EASA FCL.725', etc.
  authority: text("authority").notNull(), // 'faa', 'easa', 'icao', etc.
  title: text("title").notNull(),
  description: text("description").notNull(),
  text: text("text").notNull(), // Full text of the requirement
  version: text("version").notNull(),
  effectiveDate: date("effective_date").notNull(),
  expirationDate: date("expiration_date"),
  parentId: integer("parent_id"), // For hierarchical organization
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRegulatoryRequirementSchema = createInsertSchema(regulatoryRequirements).pick({
  code: true,
  authority: true,
  title: true,
  description: true,
  text: true,
  version: true,
  effectiveDate: true,
  expirationDate: true,
  parentId: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
});

// Compliance Tracking for Programs
export const programCompliance = pgTable("program_compliance", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull(),
  requirementId: integer("requirement_id").notNull(),
  status: text("status").notNull(), // 'compliant', 'partially_compliant', 'non_compliant'
  evidence: text("evidence"),
  notes: text("notes"),
  checkedBy: integer("checked_by"), // User ID
  checkedAt: timestamp("checked_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProgramComplianceSchema = createInsertSchema(programCompliance).pick({
  programId: true,
  requirementId: true,
  status: true,
  evidence: true,
  notes: true,
  checkedBy: true,
  checkedAt: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
});

// Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // 'program', 'module', 'lesson', 'document', etc.
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(), // 'create', 'update', 'delete', 'access'
  userId: integer("user_id").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  verified: boolean("verified").default(false),
  blockchainTransactionId: text("blockchain_transaction_id"), // For blockchain verification
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).pick({
  entityType: true,
  entityId: true,
  action: true,
  userId: true,
  timestamp: true,
  details: true,
  ipAddress: true,
  userAgent: true,
  verified: true,
  blockchainTransactionId: true,
});

// Performance Analytics - Trainee Performance
export const performanceMetrics = pgTable("performance_metrics", {
  id: serial("id").primaryKey(),
  traineeId: integer("trainee_id").notNull(),
  sessionId: integer("session_id").notNull(),
  metricType: text("metric_type").notNull(), // 'reaction_time', 'cognitive_workload', 'procedural_compliance'
  value: real("value").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  context: jsonb("context"), // Additional data about when/where the metric was recorded
  source: text("source").notNull(), // 'simulator', 'assessment', 'observation'
  confidence: real("confidence").default(1.0),
});

export const insertPerformanceMetricSchema = createInsertSchema(performanceMetrics).pick({
  traineeId: true,
  sessionId: true,
  metricType: true,
  value: true,
  timestamp: true,
  context: true,
  source: true,
  confidence: true,
});

// Predictive Models
export const predictiveModels = pgTable("predictive_models", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  modelType: text("model_type").notNull(), // 'skill_decay', 'checkride_outcome', 'intervention_need'
  parameters: jsonb("parameters").notNull(),
  trainingData: jsonb("training_data"),
  accuracy: real("accuracy"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdById: integer("created_by_id").notNull(),
  active: boolean("active").default(true),
});

export const insertPredictiveModelSchema = createInsertSchema(predictiveModels).pick({
  name: true,
  description: true,
  modelType: true,
  parameters: true,
  trainingData: true,
  accuracy: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  active: true,
});

// Skill Decay Predictions
export const skillDecayPredictions = pgTable("skill_decay_predictions", {
  id: serial("id").primaryKey(),
  traineeId: integer("trainee_id").notNull(),
  competencyId: text("competency_id").notNull(),
  initialProficiency: real("initial_proficiency").notNull(),
  currentPrediction: real("current_prediction").notNull(),
  lastAssessedDate: timestamp("last_assessed_date").notNull(),
  predictedDecayRate: real("predicted_decay_rate").notNull(),
  recommendedRefresherDate: timestamp("recommended_refresher_date").notNull(),
  modelId: integer("model_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSkillDecayPredictionSchema = createInsertSchema(skillDecayPredictions).pick({
  traineeId: true,
  competencyId: true,
  initialProficiency: true,
  currentPrediction: true,
  lastAssessedDate: true,
  predictedDecayRate: true,
  recommendedRefresherDate: true,
  modelId: true,
  createdAt: true,
  updatedAt: true,
});

// Session Replay Data
export const sessionReplays = pgTable("session_replays", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  dataType: text("data_type").notNull(), // 'telemetry', 'events', 'annotations'
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  dataUrl: text("data_url").notNull(), // URL to stored data file or blob
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSessionReplaySchema = createInsertSchema(sessionReplays).pick({
  sessionId: true,
  dataType: true,
  startTime: true,
  endTime: true,
  dataUrl: true,
  metadata: true,
  createdAt: true,
});

// Session Events for Replay
export const sessionEvents = pgTable("session_events", {
  id: serial("id").primaryKey(),
  replayId: integer("replay_id").notNull(),
  eventType: text("event_type").notNull(), // 'critical_deviation', 'instructor_comment', 'system_alert'
  timestamp: timestamp("timestamp").notNull(),
  description: text("description").notNull(),
  severity: text("severity"), // 'info', 'warning', 'critical'
  parameters: jsonb("parameters"),
  createdBy: integer("created_by").notNull(),
});

export const insertSessionEventSchema = createInsertSchema(sessionEvents).pick({
  replayId: true,
  eventType: true,
  timestamp: true,
  description: true,
  severity: true,
  parameters: true,
  createdBy: true,
});

// Gamification - Achievements
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // 'training', 'performance', 'collaboration'
  criteria: jsonb("criteria").notNull(),
  points: integer("points").default(0),
  badgeUrl: text("badge_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  active: boolean("active").default(true),
});

export const insertAchievementSchema = createInsertSchema(achievements).pick({
  name: true,
  description: true,
  category: true,
  criteria: true,
  points: true,
  badgeUrl: true,
  createdAt: true,
  updatedAt: true,
  active: true,
});

// Gamification - User Achievements
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  achievementId: integer("achievement_id").notNull(),
  awardedAt: timestamp("awarded_at").notNull().defaultNow(),
  progress: integer("progress").default(100), // percentage complete, 100 means fully achieved
  metadata: jsonb("metadata"),
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).pick({
  userId: true,
  achievementId: true,
  awardedAt: true,
  progress: true,
  metadata: true,
});

// Gamification - Leaderboards
export const leaderboards = pgTable("leaderboards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // 'training_progress', 'performance', 'achievements'
  timeframe: text("timeframe").notNull(), // 'daily', 'weekly', 'monthly', 'all_time'
  scoreType: text("score_type").notNull(), // 'points', 'completion_rate', 'performance_score'
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLeaderboardSchema = createInsertSchema(leaderboards).pick({
  name: true,
  description: true,
  category: true,
  timeframe: true,
  scoreType: true,
  active: true,
  createdAt: true,
  updatedAt: true,
});

// Gamification - Leaderboard Entries
export const leaderboardEntries = pgTable("leaderboard_entries", {
  id: serial("id").primaryKey(),
  leaderboardId: integer("leaderboard_id").notNull(),
  userId: integer("user_id").notNull(),
  score: real("score").notNull(),
  rank: integer("rank"),
  calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
  metadata: jsonb("metadata"),
});

export const insertLeaderboardEntrySchema = createInsertSchema(leaderboardEntries).pick({
  leaderboardId: true,
  userId: true,
  score: true,
  rank: true,
  calculatedAt: true,
  metadata: true,
});

// Community Content - Shared Scenarios
export const sharedScenarios = pgTable("shared_scenarios", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  content: jsonb("content").notNull(),
  type: text("type").notNull(), // 'simulator', 'classroom', 'assessment'
  tags: text("tags").array(),
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  averageRating: real("average_rating"),
  downloadCount: integer("download_count").default(0),
  status: text("status").notNull().default('draft'), // 'draft', 'published', 'verified'
  verifiedById: integer("verified_by_id"),
  verifiedAt: timestamp("verified_at"),
});

export const insertSharedScenarioSchema = createInsertSchema(sharedScenarios).pick({
  title: true,
  description: true,
  content: true,
  type: true,
  tags: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  averageRating: true,
  downloadCount: true,
  status: true,
  verifiedById: true,
  verifiedAt: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// MFA Credentials schema
export const mfaCredentials = pgTable("mfa_credentials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'totp', 'biometric', 'recovery'
  secret: text("secret"),
  biometricType: text("biometric_type"), // 'fingerprint', 'face', 'voice'
  biometricTemplate: text("biometric_template"),
  recoveryCodes: text("recovery_codes").array(),
  lastUsed: timestamp("last_used"),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  metadata: jsonb("metadata")
});

export const insertMfaCredentialSchema = createInsertSchema(mfaCredentials).pick({
  userId: true,
  type: true,
  secret: true,
  biometricType: true,
  biometricTemplate: true,
  recoveryCodes: true,
  enabled: true,
  lastUsed: true,
  metadata: true
});

export type MfaCredential = typeof mfaCredentials.$inferSelect;
export type InsertMfaCredential = z.infer<typeof insertMfaCredentialSchema>;

export type TrainingProgram = typeof trainingPrograms.$inferSelect;
export type InsertTrainingProgram = z.infer<typeof insertProgramSchema>;

export type Module = typeof modules.$inferSelect;
export type InsertModule = z.infer<typeof insertModuleSchema>;

export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type SessionTrainee = typeof sessionTrainees.$inferSelect;
export type InsertSessionTrainee = z.infer<typeof insertSessionTraineeSchema>;

export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;

export type Grade = typeof grades.$inferSelect;
export type InsertGrade = z.infer<typeof insertGradeSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentVersion = z.infer<typeof insertDocumentVersionSchema>;

export type Resource = typeof resources.$inferSelect;
export type InsertResource = z.infer<typeof insertResourceSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type KnowledgeGraphNode = typeof knowledgeGraphNodes.$inferSelect;
export type InsertKnowledgeGraphNode = z.infer<typeof insertKnowledgeGraphNodeSchema>;

export type KnowledgeGraphEdge = typeof knowledgeGraphEdges.$inferSelect;
export type InsertKnowledgeGraphEdge = z.infer<typeof insertKnowledgeGraphEdgeSchema>;

export type DocumentAnalysis = typeof documentAnalysis.$inferSelect;
export type InsertDocumentAnalysis = z.infer<typeof insertDocumentAnalysisSchema>;

export type RegulatoryRequirement = typeof regulatoryRequirements.$inferSelect;
export type InsertRegulatoryRequirement = z.infer<typeof insertRegulatoryRequirementSchema>;

export type ProgramCompliance = typeof programCompliance.$inferSelect;
export type InsertProgramCompliance = z.infer<typeof insertProgramComplianceSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type InsertPerformanceMetric = z.infer<typeof insertPerformanceMetricSchema>;

export type PredictiveModel = typeof predictiveModels.$inferSelect;
export type InsertPredictiveModel = z.infer<typeof insertPredictiveModelSchema>;



export type SkillDecayPrediction = typeof skillDecayPredictions.$inferSelect;
export type InsertSkillDecayPrediction = z.infer<typeof insertSkillDecayPredictionSchema>;

export type SessionReplay = typeof sessionReplays.$inferSelect;
export type InsertSessionReplay = z.infer<typeof insertSessionReplaySchema>;

export type SessionEvent = typeof sessionEvents.$inferSelect;
export type InsertSessionEvent = z.infer<typeof insertSessionEventSchema>;

export type SessionPlan = typeof sessionPlans.$inferSelect;
export type InsertSessionPlan = z.infer<typeof insertSessionPlanSchema>;

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;

export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;

export type Leaderboard = typeof leaderboards.$inferSelect;
export type InsertLeaderboard = z.infer<typeof insertLeaderboardSchema>;

export type LeaderboardEntry = typeof leaderboardEntries.$inferSelect;
export type InsertLeaderboardEntry = z.infer<typeof insertLeaderboardEntrySchema>;

export type SharedScenario = typeof sharedScenarios.$inferSelect;
export type InsertSharedScenario = z.infer<typeof insertSharedScenarioSchema>;

// Extended schemas for API communication
export const extendedSessionSchema = z.object({
  id: z.number().optional(),
  programId: z.number(),
  moduleId: z.number(),
  status: z.enum(['scheduled', 'in progress', 'completed']),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  resourceId: z.number().optional(),
  instructorId: z.number(),
  trainees: z.array(z.number()),
});

export type ExtendedSession = z.infer<typeof extendedSessionSchema>;
