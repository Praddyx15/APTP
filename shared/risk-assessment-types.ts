import { z } from 'zod';
import { pgTable, serial, text, integer, date, jsonb, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

// Risk assessment data types
export const riskAssessments = pgTable('risk_assessments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  severity: integer('severity').notNull(), // 1-5 scale
  occurrence: integer('occurrence').notNull(), // 1-5 scale
  detection: integer('detection').notNull(), // 1-5 scale
  category: text('category').notNull(), // e.g., 'technical', 'operational', 'environmental'
  status: text('status').notNull().default('active'), // 'active', 'mitigated', 'archived'
  mitigationPlan: text('mitigation_plan'),
  incidentCount: integer('incident_count').default(0),
  createdAt: date('created_at').defaultNow().notNull(),
  updatedAt: date('updated_at').defaultNow().notNull(),
  metadata: jsonb('metadata')
});

export const insertRiskAssessmentSchema = createInsertSchema(riskAssessments).pick({
  userId: true,
  title: true,
  description: true,
  severity: true,
  occurrence: true,
  detection: true,
  category: true,
  status: true,
  mitigationPlan: true,
  incidentCount: true,
  metadata: true
});

export type RiskAssessment = typeof riskAssessments.$inferSelect;
export type InsertRiskAssessment = z.infer<typeof insertRiskAssessmentSchema>;

// Risk incident data types
export const riskIncidents = pgTable('risk_incidents', {
  id: serial('id').primaryKey(),
  riskAssessmentId: integer('risk_assessment_id').notNull(),
  reportedById: integer('reported_by_id').notNull(),
  incidentDate: date('incident_date').notNull(),
  description: text('description').notNull(),
  severity: integer('severity').notNull(), // 1-5 scale
  impact: text('impact'),
  resolution: text('resolution'),
  isResolved: boolean('is_resolved').default(false),
  createdAt: date('created_at').defaultNow().notNull(),
  updatedAt: date('updated_at').defaultNow().notNull(),
  metadata: jsonb('metadata')
});

export const insertRiskIncidentSchema = createInsertSchema(riskIncidents).pick({
  riskAssessmentId: true,
  reportedById: true,
  incidentDate: true,
  description: true,
  severity: true,
  impact: true,
  resolution: true,
  isResolved: true,
  metadata: true
});

export type RiskIncident = typeof riskIncidents.$inferSelect;
export type InsertRiskIncident = z.infer<typeof insertRiskIncidentSchema>;

// Risk trends data types for historical tracking
export const riskTrends = pgTable('risk_trends', {
  id: serial('id').primaryKey(),
  riskAssessmentId: integer('risk_assessment_id').notNull(),
  recordDate: date('record_date').notNull(),
  severity: integer('severity').notNull(),
  occurrence: integer('occurrence').notNull(),
  detection: integer('detection').notNull(),
  riskScore: integer('risk_score').notNull(), // Calculated as severity * occurrence * detection
  createdAt: date('created_at').defaultNow().notNull()
});

export const insertRiskTrendSchema = createInsertSchema(riskTrends).pick({
  riskAssessmentId: true,
  recordDate: true,
  severity: true,
  occurrence: true,
  detection: true,
  riskScore: true
});

export type RiskTrend = typeof riskTrends.$inferSelect;
export type InsertRiskTrend = z.infer<typeof insertRiskTrendSchema>;

// Types for role-specific visualizations
export enum RoleType {
  TRAINEE = 'trainee',
  AIRLINE = 'airline',
  EXAMINER = 'examiner',
  INSTRUCTOR = 'instructor',
  ATO = 'ato'
}

export interface SkillRadarData {
  skill: string;
  value: number;
  fullMark: number;
}

export interface ComplianceData {
  regulation: string;
  status: 'compliant' | 'partial' | 'non-compliant';
  value: number;
  dueDate?: Date;
}

export interface PerformanceData {
  competency: string;
  value: number;
  average: number;
}

export interface DashboardVisualizationConfig {
  role: RoleType;
  primaryColor: string;
  gradientColors: string[];
  chartType: 'radar' | 'bar' | 'line' | 'heatmap' | 'pie' | '3d-risk';
  showAverage?: boolean;
  showTrend?: boolean;
}

export interface RiskMatrixData {
  severity: number;
  occurrence: number;
  detection: number;
  value: number;
  title?: string;
  category?: string;
}

export interface RiskMatrixConfig {
  minValue: number;
  maxValue: number;
  colors: {
    veryLow: string;
    low: string;
    medium: string;
    high: string;
    veryHigh: string;
  };
  animate: boolean;
  showLabels: boolean;
  rotationSpeed?: number;
}