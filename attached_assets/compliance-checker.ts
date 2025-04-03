/**
 * ComplianceChecker - A utility for validating training plans against regulatory requirements,
 * tracking required training hours by category, generating compliance reports, and 
 * recommending remediation for compliance gaps.
 */

import { EventEmitter } from 'events';

// Types for regulatory compliance
export interface RegulationType {
  id: string;
  name: string;
  authority: string; // e.g., 'FAA', 'EASA', 'ICAO'
  version: string;
  effectiveDate: string; // ISO date string
  requirements: RequirementDefinition[];
  categoryHours: Record<string, number>; // Minimum hours by training category
  totalRequiredHours: number;
  assessmentRequirements: AssessmentRequirement[];
  instructorRequirements?: InstructorRequirement[];
  documentationRequirements?: DocumentationRequirement[];
}

export interface RequirementDefinition {
  id: string;
  code: string; // e.g., '121.427(a)'
  title: string;
  description: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  minimumHours?: number;
  requiredElements?: string[]; // Required elements/modules
  requiredActivities?: string[]; // Required activity types
  assessmentRequired?: boolean;
  recurrencyPeriod?: number; // in months
  referenceDocs?: string[];
}

export interface AssessmentRequirement {
  id: string;
  title: string;
  minimumScore: number; // e.g., 80 for 80%
  requiredTopics: string[];
  assessmentType: 'written' | 'practical' | 'both';
  gradingCriteria?: string;
  minimumAttemptsAllowed?: number;
  maximumAttemptsAllowed?: number;
}

export interface InstructorRequirement {
  id: string;
  title: string;
  requiredCertifications: string[];
  minimumExperience: number; // in months
  recurrencyTraining?: string;
  specializations?: string[];
}

export interface DocumentationRequirement {
  id: string;
  title: string;
  documentType: string;
  retentionPeriod: number; // in months
  requiredSignatures?: string[];
  template?: string;
  electronicSubmissionAllowed?: boolean;
}

// Training plan interfaces
export interface TrainingPlan {
  id: string;
  traineeId: number;
  programId: number;
  programName: string;
  regulationTypeId: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  modules: TrainingModule[];
  sessions: TrainingSession[];
  assessmentPlan: AssessmentPlan;
  totalPlannedHours: number;
  status: 'draft' | 'approved' | 'in-progress' | 'completed';
}

export interface TrainingModule {
  id: string;
  title: string;
  category: string;
  requiredHours: number;
  plannedHours: number;
  scheduledSessions: string[]; // Session IDs
  requiredElements: string[];
  assessmentIds: string[];
  status: 'pending' | 'in-progress' | 'completed';
  completionDate?: string;
}

export interface TrainingSession {
  id: string;
  title: string;
  moduleId: string;
  activityType: string;
  plannedDuration: number; // in minutes
  actualDuration?: number; // in minutes
  instructorId?: number;
  scheduledDate?: string;
  completionDate?: string;
  status: 'planned' | 'scheduled' | 'completed' | 'cancelled';
  elements: string[]; // Training elements covered
  assessmentId?: string;
}

export interface AssessmentPlan {
  assessments: Assessment[];
  minimumPassingScore: number;
  remedialTrainingRequired: boolean;
  maxAttempts: number;
}

export interface Assessment {
  id: string;
  title: string;
  type: 'written' | 'practical' | 'both';
  moduleIds: string[];
  elements: string[];
  minimumScore: number;
  plannedDate?: string;
  completionDate?: string;
  actualScore?: number;
  passed?: boolean;
  attemptNumber?: number;
  feedback?: string;
}

// Compliance tracking interfaces
export interface ComplianceResult {
  compliant: boolean;
  requirementsMet: RequirementStatus[];
  requirementsNotMet: RequirementStatus[];
  hoursRequirements: {
    totalRequired: number;
    totalPlanned: number;
    totalCompleted: number;
    compliant: boolean;
    byCategory: {
      category: string;
      required: number;
      planned: number;
      completed: number;
      compliant: boolean;
    }[];
  };
  assessmentRequirements: {
    compliant: boolean;
    details: {
      requirementId: string;
      title: string;
      met: boolean;
      details: string;
    }[];
  };
  recommendations: ComplianceRecommendation[];
  complianceScore: number; // 0-100
  status: 'fully-compliant' | 'partially-compliant' | 'non-compliant';
  timestamp: string;
}

export interface RequirementStatus {
  requirementId: string;
  code: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  met: boolean;
  details: string;
  evidence?: any;
}

export interface ComplianceRecommendation {
  requirementId: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  actionItems: string[];
  deadline?: string;
}

export interface HoursTracker {
  traineeId: number;
  category: string;
  requiredHours: number;
  completedHours: number;
  plannedHours: number;
  remainingHours: number;
  sessions: {
    sessionId: string;
    title: string;
    date: string;
    duration: number;
    status: 'planned' | 'completed';
  }[];
  complianceStatus: 'compliant' | 'at-risk' | 'non-compliant';
  lastUpdated: string;
}

export interface ComplianceReport {
  programId: number;
  programName: string;
  regulationType: string;
  authority: string;
  reportDate: string;
  trainees: {
    traineeId: number;
    name: string;
    complianceScore: number;
    status: 'fully-compliant' | 'partially-compliant' | 'non-compliant';
    criticalIssues: number;
    highIssues: number;
  }[];
  overallCompliance: {
    totalTrainees: number;
    compliantTrainees: number;
    compliancePercentage: number;
    averageComplianceScore: number;
    byRequirement: {
      requirementId: string;
      code: string;
      title: string;
      compliancePercentage: number;
    }[];
  };
  categories: {
    category: string;
    compliancePercentage: number;
    averageHoursCompleted: number;
    requiredHours: number;
  }[];
  criticalFindings: {
    requirementId: string;
    code: string;
    title: string;
    affectedTrainees: number;
    details: string;
  }[];
  recommendations: string[];
}

/**
 * ComplianceChecker class for training plan validation and compliance reporting
 */
export class ComplianceChecker extends EventEmitter {
  private regulationTypes: Map<string, RegulationType> = new Map();
  private trainingPlanCache: Map<string, TrainingPlan> = new Map();
  private complianceResultCache: Map<string, ComplianceResult> = new Map();
  private hoursByTrainee: Map<number, Map<string, HoursTracker>> = new Map();
  
  /**
   * Create a new ComplianceChecker instance
   * @param apiClient Optional API client for data fetching
   */
  constructor(private apiClient?: any) {
    super();
  }
  
  /**
   * Load regulation types from API or configuration
   * @param regulationTypes Array of regulation types to load
   */
  public async loadRegulationTypes(regulationTypes?: RegulationType[]): Promise<void> {
    try {
      if (regulationTypes) {
        // Load directly from provided data
        regulationTypes.forEach(type => {
          this.regulationTypes.set(type.id, type);
        });
      } else if (this.apiClient) {
        // Load from API
        const types = await this.apiClient.getRegulationTypes();
        types.forEach((type: RegulationType) => {
          this.regulationTypes.set(type.id, type);
        });
      } else {
        throw new Error('Either regulation types or API client must be provided');
      }
    } catch (error) {
      console.error('Failed to load regulation types:', error);
      throw error;
    }
  }
  
  /**
   * Validate a training plan against regulatory requirements
   * @param plan Training plan to validate
   * @param regulationTypeId ID of the regulation type to validate against
   * @returns Compliance validation result
   */
  public validateTrainingPlan(
    plan: TrainingPlan,
    regulationTypeId?: string
  ): ComplianceResult {
    try {
      // Use the plan's regulation type if not specified
      const regTypeId = regulationTypeId || plan.regulationTypeId;
      
      // Load regulation type
      const regType = this.regulationTypes.get(regTypeId);
      if (!regType) {
        throw new Error(`Regulation type ${regTypeId} not found`);
      }
      
      // Cache the plan for future reference
      this.trainingPlanCache.set(plan.id, plan);
      
      // Check if we have a cached result that's still valid
      const cacheKey = `${plan.id}:${regTypeId}`;
      const cachedResult = this.complianceResultCache.get(cacheKey);
      if (cachedResult && this.isRecentResult(cachedResult.timestamp)) {
        return cachedResult;
      }
      
      // Validate requirements
      const requirementResults = this.validateRequirements(plan, regType);
      
      // Validate hours
      const hoursResults = this.validateHours(plan, regType);
      
      // Validate assessments
      const assessmentResults = this.validateAssessments(plan, regType);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(
        requirementResults.requirementsNotMet,
        hoursResults,
        assessmentResults,
        regType
      );
      
      // Calculate overall compliance score
      const complianceScore = this.calculateComplianceScore(
        requirementResults,
        hoursResults,
        assessmentResults,
        regType
      );
      
      // Determine overall status
      let status: 'fully-compliant' | 'partially-compliant' | 'non-compliant';
      
      if (complianceScore >= 95) {
        status = 'fully-compliant';
      } else if (complianceScore >= 75) {
        status = 'partially-compliant';
      } else {
        status = 'non-compliant';
      }
      
      // Create compliance result
      const result: ComplianceResult = {
        compliant: status === 'fully-compliant',
        requirementsMet: requirementResults.requirementsMet,
        requirementsNotMet: requirementResults.requirementsNotMet,
        hoursRequirements: hoursResults,
        assessmentRequirements: assessmentResults,
        recommendations,
        complianceScore,
        status,
        timestamp: new Date().toISOString()
      };
      
      // Cache the result
      this.complianceResultCache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Error validating training plan:', error);
      throw error;
    }
  }
  
  /**
   * Track required hours by category for a trainee
   * @param traineeId Trainee ID
   * @param category Training category
   * @returns Hours tracker for the specified category
   */
  public trackRequiredHours(traineeId: number, category: string): HoursTracker {
    try {
      // Initialize trainee map if it doesn't exist
      if (!this.hoursByTrainee.has(traineeId)) {
        this.hoursByTrainee.set(traineeId, new Map());
      }
      
      const traineeHours = this.hoursByTrainee.get(traineeId)!;
      
      // Check if we already have a tracker for this category
      if (traineeHours.has(category)) {
        return traineeHours.get(category)!;
      }
      
      // Get training plan for this trainee
      const trainingPlan = this.findTrainingPlanForTrainee(traineeId);
      if (!trainingPlan) {
        throw new Error(`No training plan found for trainee ${traineeId}`);
      }
      
      // Get regulation type
      const regType = this.regulationTypes.get(trainingPlan.regulationTypeId);
      if (!regType) {
        throw new Error(`Regulation type ${trainingPlan.regulationTypeId} not found`);
      }
      
      // Calculate hours for the specific category
      const requiredHours = regType.categoryHours[category] || 0;
      
      // Get modules for this category
      const categoryModules = trainingPlan.modules.filter(m => m.category === category);
      
      // Calculate planned hours
      const plannedHours = categoryModules.reduce((sum, module) => sum + module.plannedHours, 0);
      
      // Get completed sessions for this category
      const completedSessions = trainingPlan.sessions.filter(session => {
        // Check if session belongs to a module in this category and is completed
        const module = categoryModules.find(m => m.id === session.moduleId);
        return module && session.status === 'completed';
      });
      
      // Calculate completed hours
      const completedHours = completedSessions.reduce((sum, session) => {
        return sum + (session.actualDuration || session.plannedDuration) / 60;
      }, 0);
      
      // Calculate remaining hours
      const remainingHours = Math.max(0, requiredHours - completedHours);
      
      // Map session data
      const sessionData = trainingPlan.sessions
        .filter(session => {
          const module = categoryModules.find(m => m.id === session.moduleId);
          return module !== undefined;
        })
        .map(session => ({
          sessionId: session.id,
          title: session.title,
          date: session.completionDate || session.scheduledDate || '',
          duration: (session.actualDuration || session.plannedDuration) / 60,
          status: session.status === 'completed' ? 'completed' : 'planned'
        }));
      
      // Determine compliance status
      let complianceStatus: 'compliant' | 'at-risk' | 'non-compliant';
      
      if (completedHours >= requiredHours) {
        complianceStatus = 'compliant';
      } else if (completedHours + (plannedHours - completedHours) >= requiredHours) {
        complianceStatus = 'at-risk';
      } else {
        complianceStatus = 'non-compliant';
      }
      
      // Create hours tracker
      const hoursTracker: HoursTracker = {
        traineeId,
        category,
        requiredHours,
        completedHours,
        plannedHours,
        remainingHours,
        sessions: sessionData,
        complianceStatus,
        lastUpdated: new Date().toISOString()
      };
      
      // Cache the tracker
      traineeHours.set(category, hoursTracker);
      
      return hoursTracker;
    } catch (error) {
      console.error(`Error tracking hours for trainee ${traineeId}, category ${category}:`, error);
      throw error;
    }
  }
  
  /**
   * Generate a comprehensive compliance report for a training program
   * @param programId Program ID
   * @returns Compliance report
   */
  public async generateComplianceReport(programId: number): Promise<ComplianceReport> {
    try {
      // Get program details
      const program = await this.getProgramDetails(programId);
      
      // Get all trainees in the program
      const trainees = await this.getProgramTrainees(programId);
      
      // Get regulation type
      const regType = this.regulationTypes.get(program.regulationTypeId);
      if (!regType) {
        throw new Error(`Regulation type ${program.regulationTypeId} not found`);
      }
      
      // Validate each trainee's training plan
      const traineeComplianceData = await Promise.all(
        trainees.map(async trainee => {
          try {
            // Get training plan
            const plan = await this.getTraineePlan(trainee.id);
            
            // Validate plan
            const compliance = this.validateTrainingPlan(plan, regType.id);
            
            return {
              traineeId: trainee.id,
              name: `${trainee.firstName} ${trainee.lastName}`,
              complianceScore: compliance.complianceScore,
              status: compliance.status,
              criticalIssues: compliance.requirementsNotMet.filter(r => r.priority === 'critical').length,
              highIssues: compliance.requirementsNotMet.filter(r => r.priority === 'high').length,
              compliance
            };
          } catch (error) {
            console.error(`Error processing trainee ${trainee.id}:`, error);
            return {
              traineeId: trainee.id,
              name: `${trainee.firstName} ${trainee.lastName}`,
              complianceScore: 0,
              status: 'non-compliant' as const,
              criticalIssues: 0,
              highIssues: 0,
              compliance: null
            };
          }
        })
      );
      
      // Filter out failed trainee validations
      const validTraineeData = traineeComplianceData.filter(
        data => data.compliance !== null
      );
      
      // Calculate overall compliance statistics
      const totalTrainees = validTraineeData.length;
      const compliantTrainees = validTraineeData.filter(
        data => data.status === 'fully-compliant'
      ).length;
      
      const compliancePercentage = totalTrainees > 0 
        ? (compliantTrainees / totalTrainees) * 100 
        : 0;
      
      const averageComplianceScore = totalTrainees > 0
        ? validTraineeData.reduce((sum, data) => sum + data.complianceScore, 0) / totalTrainees
        : 0;
      
      // Calculate compliance by requirement
      const requirementComplianceMap = new Map<string, {
        count: number;
        total: number;
        code: string;
        title: string;
      }>();
      
      // Initialize with all requirements
      regType.requirements.forEach(req => {
        requirementComplianceMap.set(req.id, {
          count: 0,
          total: 0,
          code: req.code,
          title: req.title
        });
      });
      
      // Count compliance by requirement
      validTraineeData.forEach(data => {
        if (!data.compliance) return;
        
        // Count met requirements
        data.compliance.requirementsMet.forEach(req => {
          const reqData = requirementComplianceMap.get(req.requirementId);
          if (reqData) {
            reqData.count++;
            reqData.total++;
          }
        });
        
        // Count not met requirements
        data.compliance.requirementsNotMet.forEach(req => {
          const reqData = requirementComplianceMap.get(req.requirementId);
          if (reqData) {
            reqData.total++;
          }
        });
      });
      
      // Calculate compliance percentage by requirement
      const byRequirement = Array.from(requirementComplianceMap.entries())
        .map(([requirementId, data]) => ({
          requirementId,
          code: data.code,
          title: data.title,
          compliancePercentage: data.total > 0 
            ? (data.count / data.total) * 100 
            : 0
        }))
        .sort((a, b) => a.compliancePercentage - b.compliancePercentage);
      
      // Calculate compliance by category
      const categoryData = new Map<string, {
        total: number;
        compliant: number;
        hoursCompleted: number;
        requiredHours: number;
      }>();
      
      // Initialize with all categories
      Object.keys(regType.categoryHours).forEach(category => {
        categoryData.set(category, {
          total: 0,
          compliant: 0,
          hoursCompleted: 0,
          requiredHours: regType.categoryHours[category]
        });
      });
      
      // Collect category compliance data
      validTraineeData.forEach(data => {
        if (!data.compliance) return;
        
        Object.keys(regType.categoryHours).forEach(category => {
          const catData = categoryData.get(category);
          if (!catData) return;
          
          catData.total++;
          
          // Check hours compliance
          const categoryHours = data.compliance.hoursRequirements.byCategory.find(
            c => c.category === category
          );
          
          if (categoryHours) {
            if (categoryHours.compliant) {
              catData.compliant++;
            }
            catData.hoursCompleted += categoryHours.completed;
          }
        });
      });
      
      // Format category compliance data
      const categories = Array.from(categoryData.entries())
        .map(([category, data]) => ({
          category,
          compliancePercentage: data.total > 0 
            ? (data.compliant / data.total) * 100 
            : 0,
          averageHoursCompleted: data.total > 0 
            ? data.hoursCompleted / data.total 
            : 0,
          requiredHours: data.requiredHours
        }))
        .sort((a, b) => a.compliancePercentage - b.compliancePercentage);
      
      // Identify critical findings
      const criticalFindings: ComplianceReport['criticalFindings'] = [];
      
      // Collect critical requirement issues
      regType.requirements
        .filter(req => req.priority === 'critical')
        .forEach(req => {
          // Count trainees affected by this critical issue
          const affectedTrainees = validTraineeData.filter(data => 
            data.compliance?.requirementsNotMet.some(r => r.requirementId === req.id)
          );
          
          if (affectedTrainees.length > 0) {
            // Get details from first occurrence
            const details = affectedTrainees[0].compliance!.requirementsNotMet.find(
              r => r.requirementId === req.id
            )!.details;
            
            criticalFindings.push({
              requirementId: req.id,
              code: req.code,
              title: req.title,
              affectedTrainees: affectedTrainees.length,
              details
            });
          }
        });
      
      // Sort critical findings by number of affected trainees
      criticalFindings.sort((a, b) => b.affectedTrainees - a.affectedTrainees);
      
      // Generate overall recommendations
      const recommendations: string[] = [];
      
      // Add recommendations for low compliance requirements
      byRequirement
        .filter(req => req.compliancePercentage < 70)
        .slice(0, 3)
        .forEach(req => {
          recommendations.push(
            `Improve compliance with requirement ${req.code} (${req.title}) - current compliance: ${req.compliancePercentage.toFixed(1)}%`
          );
        });
      
      // Add recommendations for category hour deficiencies
      categories
        .filter(cat => cat.compliancePercentage < 80)
        .slice(0, 3)
        .forEach(cat => {
          recommendations.push(
            `Increase training hours in ${cat.category} category - current average: ${cat.averageHoursCompleted.toFixed(1)} hours, required: ${cat.requiredHours} hours`
          );
        });
      
      // Add general recommendation if overall compliance is low
      if (compliancePercentage < 70) {
        recommendations.push(
          'Conduct comprehensive program review to address significant compliance gaps'
        );
      }
      
      // Create compliance report
      const report: ComplianceReport = {
        programId,
        programName: program.name,
        regulationType: regType.name,
        authority: regType.authority,
        reportDate: new Date().toISOString(),
        trainees: traineeComplianceData.map(data => ({
          traineeId: data.traineeId,
          name: data.name,
          complianceScore: data.complianceScore,
          status: data.status,
          criticalIssues: data.criticalIssues,
          highIssues: data.highIssues
        })),
        overallCompliance: {
          totalTrainees,
          compliantTrainees,
          compliancePercentage,
          averageComplianceScore,
          byRequirement
        },
        categories,
        criticalFindings,
        recommendations
      };
      
      return report;
    } catch (error) {
      console.error(`Error generating compliance report for program ${programId}:`, error);
      throw error;
    }
  }
  
  /**
   * Check if specific regulatory requirements are met by a training plan
   * @param planId Training plan ID
   * @param requirementIds Array of requirement IDs to check
   * @returns Object with met and unmet requirements
   */
  public async checkSpecificRequirements(
    planId: string,
    requirementIds: string[]
  ): Promise<{ met: RequirementStatus[]; notMet: RequirementStatus[] }> {
    try {
      // Get training plan
      let plan: TrainingPlan;
      
      if (this.trainingPlanCache.has(planId)) {
        plan = this.trainingPlanCache.get(planId)!;
      } else if (this.apiClient) {
        plan = await this.apiClient.getTrainingPlan(planId);
        this.trainingPlanCache.set(planId, plan);
      } else {
        throw new Error(`Training plan ${planId} not found and no API client provided`);
      }
      
      // Get regulation type
      const regType = this.regulationTypes.get(plan.regulationTypeId);
      if (!regType) {
        throw new Error(`Regulation type ${plan.regulationTypeId} not found`);
      }
      
      // Filter requirements to check
      const requirementsToCheck = regType.requirements.filter(req => 
        requirementIds.includes(req.id)
      );
      
      if (requirementsToCheck.length < requirementIds.length) {
        const missing = requirementIds.filter(id => 
          !requirementsToCheck.some(req => req.id === id)
        );
        console.warn(`Requirements not found: ${missing.join(', ')}`);
      }
      
      // Validate requirements
      const met: RequirementStatus[] = [];
      const notMet: RequirementStatus[] = [];
      
      for (const req of requirementsToCheck) {
        const result = this.checkSingleRequirement(plan, req);
        if (result.met) {
          met.push(result);
        } else {
          notMet.push(result);
        }
      }
      
      return { met, notMet };
    } catch (error) {
      console.error(`Error checking requirements for plan ${planId}:`, error);
      throw error;
    }
  }
  
  /**
   * Identify compliance gaps and generate a remediation plan
   * @param traineeId Trainee ID
   * @returns Array of compliance recommendations
   */
  public async generateRemediationPlan(
    traineeId: number
  ): Promise<ComplianceRecommendation[]> {
    try {
      // Get training plan for trainee
      const plan = await this.getTraineePlan(traineeId);
      
      // Validate plan
      const compliance = this.validateTrainingPlan(plan);
      
      // Return recommendations
      return compliance.recommendations;
    } catch (error) {
      console.error(`Error generating remediation plan for trainee ${traineeId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get compliance status summary for a trainee
   * @param traineeId Trainee ID
   * @returns Compliance summary
   */
  public async getTraineeComplianceSummary(
    traineeId: number
  ): Promise<{
    complianceScore: number;
    status: 'fully-compliant' | 'partially-compliant' | 'non-compliant';
    criticalIssues: number;
    highIssues: number;
    categoryCompliance: { category: string; compliant: boolean; hoursStatus: string }[];
  }> {
    try {
      // Get training plan for trainee
      const plan = await this.getTraineePlan(traineeId);
      
      // Validate plan
      const compliance = this.validateTrainingPlan(plan);
      
      // Format category compliance
      const categoryCompliance = compliance.hoursRequirements.byCategory.map(cat => ({
        category: cat.category,
        compliant: cat.compliant,
        hoursStatus: `${cat.completed}/${cat.required} hours`
      }));
      
      return {
        complianceScore: compliance.complianceScore,
        status: compliance.status,
        criticalIssues: compliance.requirementsNotMet.filter(r => 
          r.priority === 'critical'
        ).length,
        highIssues: compliance.requirementsNotMet.filter(r => 
          r.priority === 'high'
        ).length,
        categoryCompliance
      };
    } catch (error) {
      console.error(`Error getting compliance summary for trainee ${traineeId}:`, error);
      throw error;
    }
  }
  
  // PRIVATE METHODS
  
  /**
   * Validate requirements for a training plan
   */
  private validateRequirements(
    plan: TrainingPlan,
    regType: RegulationType
  ): {
    requirementsMet: RequirementStatus[];
    requirementsNotMet: RequirementStatus[];
  } {
    const requirementsMet: RequirementStatus[] = [];
    const requirementsNotMet: RequirementStatus[] = [];
    
    // Check each requirement
    for (const req of regType.requirements) {
      const result = this.checkSingleRequirement(plan, req);
      
      if (result.met) {
        requirementsMet.push(result);
      } else {
        requirementsNotMet.push(result);
      }
    }
    
    return { requirementsMet, requirementsNotMet };
  }
  
  /**
   * Check if a single requirement is met by a training plan
   */
  private checkSingleRequirement(
    plan: TrainingPlan,
    requirement: RequirementDefinition
  ): RequirementStatus {
    let met = true;
    let details = '';
    
    // Check minimum hours if specified
    if (requirement.minimumHours !== undefined) {
      const modulesByCategory = plan.modules.filter(
        m => m.category === requirement.category
      );
      
      const plannedHours = modulesByCategory.reduce(
        (sum, module) => sum + module.plannedHours, 
        0
      );
      
      if (plannedHours < requirement.minimumHours) {
        met = false;
        details += `Insufficient hours planned: ${plannedHours} of ${requirement.minimumHours} required. `;
      }
    }
    
    // Check required elements if specified
    if (requirement.requiredElements && requirement.requiredElements.length > 0) {
      const missingElements = requirement.requiredElements.filter(element => 
        !plan.modules.some(module => module.requiredElements.includes(element))
      );
      
      if (missingElements.length > 0) {
        met = false;
        details += `Missing required elements: ${missingElements.join(', ')}. `;
      }
    }
    
    // Check required activities if specified
    if (requirement.requiredActivities && requirement.requiredActivities.length > 0) {
      const missingActivities = requirement.requiredActivities.filter(activity => 
        !plan.sessions.some(session => session.activityType === activity)
      );
      
      if (missingActivities.length > 0) {
        met = false;
        details += `Missing required activities: ${missingActivities.join(', ')}. `;
      }
    }
    
    // Check assessment requirement if specified
    if (requirement.assessmentRequired) {
      const hasAssessment = plan.assessmentPlan.assessments.some(assessment => 
        assessment.elements.some(element => 
          requirement.requiredElements?.includes(element)
        )
      );
      
      if (!hasAssessment) {
        met = false;
        details += 'Required assessment not included. ';
      }
    }
    
    // If requirement is met but no details provided, add a standard message
    if (met && !details) {
      details = 'All requirements satisfied.';
    }
    
    return {
      requirementId: requirement.id,
      code: requirement.code,
      title: requirement.title,
      priority: requirement.priority,
      met,
      details: details.trim()
    };
  }
  
  /**
   * Validate hours requirements for a training plan
   */
  private validateHours(
    plan: TrainingPlan,
    regType: RegulationType
  ): ComplianceResult['hoursRequirements'] {
    const totalRequired = regType.totalRequiredHours;
    const totalPlanned = plan.totalPlannedHours;
    
    // Calculate completed hours
    const totalCompleted = plan.sessions
      .filter(session => session.status === 'completed')
      .reduce((sum, session) => {
        return sum + (session.actualDuration || session.plannedDuration) / 60;
      }, 0);
    
    // Track hours by category
    const categoriesResult: {
      category: string;
      required: number;
      planned: number;
      completed: number;
      compliant: boolean;
    }[] = [];
    
    // Check each category
    for (const [category, requiredHours] of Object.entries(regType.categoryHours)) {
      const categoryModules = plan.modules.filter(m => m.category === category);
      
      // Calculate planned hours for this category
      const plannedHours = categoryModules.reduce(
        (sum, module) => sum + module.plannedHours, 
        0
      );
      
      // Calculate completed hours for this category
      const completedSessions = plan.sessions.filter(session => {
        // Check if session belongs to a module in this category and is completed
        const module = categoryModules.find(m => m.id === session.moduleId);
        return module !== undefined && session.status === 'completed';
      });
      
      const completedHours = completedSessions.reduce((sum, session) => {
        return sum + (session.actualDuration || session.plannedDuration) / 60;
      }, 0);
      
      // Check compliance
      const compliant = plannedHours >= requiredHours;
      
      categoriesResult.push({
        category,
        required: requiredHours,
        planned: plannedHours,
        completed: completedHours,
        compliant
      });
    }
    
    return {
      totalRequired,
      totalPlanned,
      totalCompleted,
      compliant: totalPlanned >= totalRequired,
      byCategory: categoriesResult
    };
  }
  
  /**
   * Validate assessment requirements for a training plan
   */
  private validateAssessments(
    plan: TrainingPlan,
    regType: RegulationType
  ): ComplianceResult['assessmentRequirements'] {
    const details: {
      requirementId: string;
      title: string;
      met: boolean;
      details: string;
    }[] = [];
    
    let allMet = true;
    
    // Check each assessment requirement
    for (const req of regType.assessmentRequirements) {
      let met = true;
      let reqDetails = '';
      
      // Check minimum score
      if (plan.assessmentPlan.minimumPassingScore < req.minimumScore) {
        met = false;
        reqDetails += `Minimum passing score (${plan.assessmentPlan.minimumPassingScore}%) is below required (${req.minimumScore}%). `;
      }
      
      // Check required topics
      const missingTopics = req.requiredTopics.filter(topic => 
        !plan.assessmentPlan.assessments.some(assessment => 
          assessment.elements.includes(topic)
        )
      );
      
      if (missingTopics.length > 0) {
        met = false;
        reqDetails += `Missing required assessment topics: ${missingTopics.join(', ')}. `;
      }
      
      // Check assessment type
      if (req.assessmentType === 'both') {
        const hasWritten = plan.assessmentPlan.assessments.some(a => 
          a.type === 'written' || a.type === 'both'
        );
        const hasPractical = plan.assessmentPlan.assessments.some(a => 
          a.type === 'practical' || a.type === 'both'
        );
        
        if (!hasWritten || !hasPractical) {
          met = false;
          reqDetails += 'Both written and practical assessments are required. ';
        }
      } else if (!plan.assessmentPlan.assessments.some(a => 
        a.type === req.assessmentType || a.type === 'both'
      )) {
        met = false;
        reqDetails += `${req.assessmentType} assessment is required. `;
      }
      
      // Add to results
      details.push({
        requirementId: req.id,
        title: req.title,
        met,
        details: met ? 'All assessment requirements satisfied.' : reqDetails.trim()
      });
      
      if (!met) {
        allMet = false;
      }
    }
    
    return {
      compliant: allMet,
      details
    };
  }
  
  /**
   * Generate recommendations based on compliance results
   */
  private generateRecommendations(
    unmetRequirements: RequirementStatus[],
    hoursResults: ComplianceResult['hoursRequirements'],
    assessmentResults: ComplianceResult['assessmentRequirements'],
    regType: RegulationType
  ): ComplianceRecommendation[] {
    const recommendations: ComplianceRecommendation[] = [];
    
    // Add recommendations for unmet requirements
    unmetRequirements.forEach(req => {
      const requirement = regType.requirements.find(r => r.id === req.requirementId);
      if (!requirement) return;
      
      const actionItems: string[] = [];
      
      // Add specific action items based on requirement type
      if (requirement.minimumHours !== undefined) {
        const categoryResult = hoursResults.byCategory.find(c => 
          c.category === requirement.category
        );
        
        if (categoryResult && categoryResult.planned < requirement.minimumHours) {
          const shortfall = requirement.minimumHours - categoryResult.planned;
          actionItems.push(
            `Add ${shortfall} more hours of ${requirement.category} training`
          );
        }
      }
      
      if (requirement.requiredElements) {
        const missingElements = req.details.match(/Missing required elements: ([^.]+)/);
        if (missingElements && missingElements[1]) {
          actionItems.push(
            `Include missing elements: ${missingElements[1]}`
          );
        }
      }
      
      if (requirement.requiredActivities) {
        const missingActivities = req.details.match(/Missing required activities: ([^.]+)/);
        if (missingActivities && missingActivities[1]) {
          actionItems.push(
            `Add required activities: ${missingActivities[1]}`
          );
        }
      }
      
      if (requirement.assessmentRequired && req.details.includes('assessment not included')) {
        actionItems.push(
          `Add assessment covering ${requirement.title} content`
        );
      }
      
      // Add general recommendation if no specific items
      if (actionItems.length === 0) {
        actionItems.push(
          `Review and address: ${req.details}`
        );
      }
      
      // Add recommendation
      recommendations.push({
        requirementId: req.requirementId,
        title: `Address ${req.code}: ${req.title}`,
        description: req.details,
        priority: req.priority,
        actionItems
      });
    });
    
    // Add recommendations for assessment requirements
    if (!assessmentResults.compliant) {
      assessmentResults.details.filter(d => !d.met).forEach(detail => {
        const actionItems: string[] = [];
        
        if (detail.details.includes('Minimum passing score')) {
          actionItems.push(
            'Increase minimum passing score to meet regulatory requirements'
          );
        }
        
        if (detail.details.includes('Missing required assessment topics')) {
          const missingTopics = detail.details.match(/Missing required assessment topics: ([^.]+)/);
          if (missingTopics && missingTopics[1]) {
            actionItems.push(
              `Include missing assessment topics: ${missingTopics[1]}`
            );
          }
        }
        
        if (detail.details.includes('Both written and practical')) {
          actionItems.push(
            'Add both written and practical assessment components'
          );
        } else if (detail.details.includes('assessment is required')) {
          const type = detail.details.match(/(\w+) assessment is required/);
          if (type && type[1]) {
            actionItems.push(
              `Add ${type[1]} assessment component`
            );
          }
        }
        
        // Add general recommendation if no specific items
        if (actionItems.length === 0) {
          actionItems.push(
            `Review and address: ${detail.details}`
          );
        }
        
        recommendations.push({
          requirementId: detail.requirementId,
          title: `Address assessment requirement: ${detail.title}`,
          description: detail.details,
          priority: 'high', // Assessment issues are typically high priority
          actionItems
        });
      });
    }
    
    // Add recommendations for category hours
    hoursResults.byCategory
      .filter(cat => !cat.compliant)
      .forEach(cat => {
        const shortfall = cat.required - cat.planned;
        
        recommendations.push({
          requirementId: '', // No specific requirement ID for this
          title: `Increase ${cat.category} training hours`,
          description: `Current plan includes ${cat.planned} hours, but ${cat.required} hours are required`,
          priority: 'medium',
          actionItems: [
            `Add ${shortfall} more hours of ${cat.category} training activities`
          ]
        });
      });
    
    // Sort recommendations by priority
    const priorityOrder = {
      'critical': 0,
      'high': 1,
      'medium': 2,
      'low': 3
    };
    
    recommendations.sort((a, b) => 
      priorityOrder[a.priority] - priorityOrder[b.priority]
    );
    
    return recommendations;
  }
  
  /**
   * Calculate overall compliance score
   */
  private calculateComplianceScore(
    requirementsResults: {
      requirementsMet: RequirementStatus[];
      requirementsNotMet: RequirementStatus[];
    },
    hoursResults: ComplianceResult['hoursRequirements'],
    assessmentResults: ComplianceResult['assessmentRequirements'],
    regType: RegulationType
  ): number {
    // Define weights for different components
    const weights = {
      criticalRequirements: 0.30,
      highRequirements: 0.20,
      otherRequirements: 0.10,
      totalHours: 0.15,
      categoryHours: 0.15,
      assessments: 0.10
    };
    
    // Calculate requirements score
    const totalRequirements = requirementsResults.requirementsMet.length + 
      requirementsResults.requirementsNotMet.length;
    
    // Count critical, high, and other requirements
    const criticalMet = requirementsResults.requirementsMet.filter(
      r => r.priority === 'critical'
    ).length;
    const criticalTotal = criticalMet + requirementsResults.requirementsNotMet.filter(
      r => r.priority === 'critical'
    ).length;
    
    const highMet = requirementsResults.requirementsMet.filter(
      r => r.priority === 'high'
    ).length;
    const highTotal = highMet + requirementsResults.requirementsNotMet.filter(
      r => r.priority === 'high'
    ).length;
    
    const otherMet = requirementsResults.requirementsMet.filter(
      r => r.priority !== 'critical' && r.priority !== 'high'
    ).length;
    const otherTotal = totalRequirements - criticalTotal - highTotal;
    
    // Calculate component scores
    const criticalScore = criticalTotal > 0 
      ? (criticalMet / criticalTotal) * 100 
      : 100;
    
    const highScore = highTotal > 0 
      ? (highMet / highTotal) * 100 
      : 100;
    
    const otherScore = otherTotal > 0 
      ? (otherMet / otherTotal) * 100 
      : 100;
    
    // Calculate hours score
    const totalHoursScore = hoursResults.totalRequired > 0
      ? Math.min(100, (hoursResults.totalPlanned / hoursResults.totalRequired) * 100)
      : 100;
    
    // Calculate category hours score
    const categoryScores = hoursResults.byCategory.map(cat => 
      cat.required > 0
        ? Math.min(100, (cat.planned / cat.required) * 100)
        : 100
    );
    
    const categoryHoursScore = categoryScores.length > 0
      ? categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length
      : 100;
    
    // Calculate assessment score
    const assessmentScore = assessmentResults.compliant ? 100 : 0;
    
    // Calculate weighted score
    const weightedScore = 
      (criticalScore * weights.criticalRequirements) +
      (highScore * weights.highRequirements) +
      (otherScore * weights.otherRequirements) +
      (totalHoursScore * weights.totalHours) +
      (categoryHoursScore * weights.categoryHours) +
      (assessmentScore * weights.assessments);
    
    // Round to one decimal place
    return Math.round(weightedScore * 10) / 10;
  }
  
  /**
   * Find a training plan for a specific trainee
   */
  private findTrainingPlanForTrainee(traineeId: number): TrainingPlan | undefined {
    // Check cache first
    for (const plan of this.trainingPlanCache.values()) {
      if (plan.traineeId === traineeId) {
        return plan;
      }
    }
    
    return undefined;
  }
  
  /**
   * Check if a timestamp is recent enough to use from cache
   */
  private isRecentResult(timestamp: string): boolean {
    const resultDate = new Date(timestamp);
    const now = new Date();
    
    // Consider results within the last hour to be recent
    const oneHour = 60 * 60 * 1000; // ms
    return now.getTime() - resultDate.getTime() < oneHour;
  }
  
  /**
   * Get program details from API
   */
  private async getProgramDetails(
    programId: number
  ): Promise<{ name: string; regulationTypeId: string }> {
    if (!this.apiClient) {
      throw new Error('API client required to fetch program details');
    }
    
    try {
      return await this.apiClient.getProgram(programId);
    } catch (error) {
      console.error(`Error fetching program details for ${programId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all trainees in a program
   */
  private async getProgramTrainees(
    programId: number
  ): Promise<{ id: number; firstName: string; lastName: string }[]> {
    if (!this.apiClient) {
      throw new Error('API client required to fetch program trainees');
    }
    
    try {
      return await this.apiClient.getProgramTrainees(programId);
    } catch (error) {
      console.error(`Error fetching trainees for program ${programId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get training plan for a trainee
   */
  private async getTraineePlan(traineeId: number): Promise<TrainingPlan> {
    // Check if we already have this plan in cache
    const cachedPlan = this.findTrainingPlanForTrainee(traineeId);
    if (cachedPlan) {
      return cachedPlan;
    }
    
    if (!this.apiClient) {
      throw new Error('API client required to fetch trainee plan');
    }
    
    try {
      const plan = await this.apiClient.getTraineePlan(traineeId);
      
      // Cache the plan
      this.trainingPlanCache.set(plan.id, plan);
      
      return plan;
    } catch (error) {
      console.error(`Error fetching training plan for trainee ${traineeId}:`, error);
      throw error;
    }
  }
}

// Example usage:
/*
import { ComplianceChecker, RegulationType, TrainingPlan } from './ComplianceChecker';

// Create sample regulation type
const faaRegulation: RegulationType = {
  id: 'faa-part-121',
  name: 'FAA Part 121',
  authority: 'FAA',
  version: '2023-01',
  effectiveDate: '2023-01-01',
  requirements: [
    {
      id: 'req-1',
      code: '121.427(a)',
      title: 'Recurrent training',
      description: 'Each certificate holder must establish and maintain a recurrent training program.',
      category: 'recurrent',
      priority: 'critical',
      minimumHours: 20,
      requiredElements: ['emergency-procedures', 'systems-knowledge']
    },
    // More requirements...
  ],
  categoryHours: {
    'recurrent': 20,
    'ground': 10,
    'flight': 10
  },
  totalRequiredHours: 40,
  assessmentRequirements: [
    {
      id: 'assessment-1',
      title: 'Systems Knowledge Assessment',
      minimumScore: 80,
      requiredTopics: ['systems-knowledge'],
      assessmentType: 'written'
    }
    // More assessment requirements...
  ]
};

// Initialize compliance checker
const complianceChecker = new ComplianceChecker(apiClient);

// Load regulation types
await complianceChecker.loadRegulationTypes([faaRegulation]);

// Validate a training plan
const plan: TrainingPlan = await apiClient.getTrainingPlan('plan-123');
const complianceResult = complianceChecker.validateTrainingPlan(plan);

console.log(`Compliance score: ${complianceResult.complianceScore}%`);
console.log(`Status: ${complianceResult.status}`);

if (complianceResult.requirementsNotMet.length > 0) {
  console.log('Unmet requirements:');
  complianceResult.requirementsNotMet.forEach(req => {
    console.log(`- ${req.code}: ${req.title} - ${req.details}`);
  });
}

// Track hours for a specific category
const hoursTracker = complianceChecker.trackRequiredHours(1001, 'recurrent');
console.log(`Recurrent training: ${hoursTracker.completedHours}/${hoursTracker.requiredHours} hours completed`);

// Generate compliance report for a program
const report = await complianceChecker.generateComplianceReport(2001);
console.log(`Program compliance: ${report.overallCompliance.compliancePercentage}%`);
*/
