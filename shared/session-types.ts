/**
 * Types related to training sessions in the system
 */

/**
 * Session roles for scheduling and permissions
 */
export type SessionRole = 'instructor' | 'trainee' | 'evaluator' | 'observer';

/**
 * Session types
 */
export type SessionType = 'classroom' | 'simulator' | 'aircraft' | 'briefing' | 'debriefing' | 'assessment';

/**
 * Session activity types
 */
export type ActivityType = 'theory' | 'practical' | 'briefing' | 'debriefing' | 'assessment' | 'simulator' | 'flight';

/**
 * Session statuses
 */
export type SessionStatus = 'draft' | 'published' | 'scheduled' | 'completed' | 'cancelled';

/**
 * Learning objective taxonomy levels
 */
export type TaxonomyLevel = 'knowledge' | 'understanding' | 'application' | 'analysis' | 'evaluation' | 'creation';

/**
 * Role permissions for session scheduling
 */
export const roleSchedulingPermissions = {
  'admin': ['create', 'view', 'edit', 'delete', 'approve', 'assign'],
  'instructor': ['create', 'view', 'edit', 'delete', 'assign'],
  'head_of_training': ['create', 'view', 'edit', 'delete', 'approve', 'assign'],
  'quality_manager': ['view', 'approve'],
  'trainee': ['view'],
  'examiner': ['create', 'view', 'edit', 'assign'],
  'operator': ['view', 'edit', 'assign']
};

/**
 * Session plan entity
 */
export interface SessionPlan {
  id: number;
  title: string;
  description: string;
  syllabusId?: number;
  duration: number;
  targetAudience: string;
  requirementsText?: string;
  equipmentList: string[];
  learningObjectiveText?: string;
  assessmentCriteria?: string;
  notesForInstructors?: string;
  createdById: number;
  status: SessionStatus;
  sessionType: string;
  sessionCode: string;
  activities?: SessionActivity[];
  learningObjectives?: LearningObjective[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Session activity entity
 */
export interface SessionActivity {
  id: number;
  sessionPlanId: number;
  title: string;
  description: string;
  duration: number;
  activityType: ActivityType;
  sequence: number;
  resources: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Learning objective entity
 */
export interface LearningObjective {
  id: number;
  sessionPlanId: number;
  text: string;
  taxonomyLevel: TaxonomyLevel;
  assessmentMethod: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Session plan template
 */
export interface SessionPlanTemplate {
  id: number;
  title: string;
  description: string;
  sessionType: string;
  learningObjectiveText: string;
  assessmentCriteria: string;
  notesForInstructors: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request to generate a session plan
 */
export interface SessionPlanRequest {
  title: string;
  description: string;
  sessionType: string;
  syllabusId?: number;
  documentId?: number;
  duration: number;
  targetAudience: string;
  requirements?: string;
  equipment?: string[];
  templateId?: number;
  useTemplate?: boolean;
  userId: number;
}

/**
 * Session scheduling entity
 */
export interface SessionSchedule {
  id: number;
  sessionPlanId: number;
  startTime: Date;
  endTime: Date;
  location: string;
  instructorId: number;
  trainees: number[];
  resources: string[];
  status: SessionStatus;
  notes?: string;
  createdById: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Session participation record
 */
export interface SessionParticipation {
  id: number;
  sessionScheduleId: number;
  userId: number;
  role: SessionRole;
  attended: boolean;
  feedback?: string;
  rating?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
