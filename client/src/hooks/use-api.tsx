/**
 * API Integration Layer - Type-safe API client hooks using TanStack Query v5
 * Implements error handling, retry logic, caching, and optimistic updates
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Base API configuration
const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const DEFAULT_CACHE_TIME = 30 * 60 * 1000; // 30 minutes

// Error type
export interface ApiError {
  statusCode: number;
  message: string;
  details?: any;
  timestamp: string;
}

// API Response wrapper
export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  timestamp: string;
}

// ======== TRAINEE DATA HOOKS ========

export interface Trainee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  status: 'active' | 'inactive' | 'onHold';
  trainingProgramId: number;
  startDate: string;
  expectedEndDate: string;
  completedHours: number;
  requiredHours: number;
  instructorId?: number;
  currentModuleId?: string;
}

/**
 * Get data for a single trainee
 */
export function useTrainee(traineeId: number) {
  return useQuery({
    queryKey: ['trainee', traineeId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/trainees/${traineeId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch trainee data');
      }
      return await res.json();
    },
    enabled: !!traineeId,
    staleTime: DEFAULT_STALE_TIME,
    retry: (failureCount, error: any) => {
      // Don't retry on 404s
      if (error.status === 404) return false;
      return failureCount < 3;
    }
  });
}

/**
 * Get a list of all trainees
 */
export function useTrainees(options?: {
  programId?: number;
  instructorId?: number;
  status?: 'active' | 'inactive' | 'onHold';
}) {
  return useQuery({
    queryKey: ['trainees', options],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (options?.programId) queryParams.append('programId', options.programId.toString());
      if (options?.instructorId) queryParams.append('instructorId', options.instructorId.toString());
      if (options?.status) queryParams.append('status', options.status);
      
      const res = await apiRequest('GET', `/api/trainees?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch trainees');
      }
      return await res.json();
    },
    staleTime: DEFAULT_STALE_TIME,
    placeholderData: (previousData) => previousData, // Keep previous data while refetching
  });
}

/**
 * Create a new trainee
 */
export function useCreateTrainee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newTrainee: Omit<Trainee, 'id' | 'completedHours'>) => {
      const res = await apiRequest('POST', '/api/trainees', newTrainee);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create trainee');
      }
      return await res.json();
    },
    onSuccess: (data) => {
      // Update cache
      queryClient.setQueryData(['trainee', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['trainees'] });
      
      toast({
        title: 'Success',
        description: 'Trainee created successfully',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create trainee',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update an existing trainee
 */
export function useUpdateTrainee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Trainee> }) => {
      const res = await apiRequest('PATCH', `/api/trainees/${id}`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update trainee');
      }
      return await res.json();
    },
    onSuccess: (data) => {
      // Update cache
      queryClient.setQueryData(['trainee', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['trainees'] });
      
      toast({
        title: 'Success',
        description: 'Trainee updated successfully',
        variant: 'default',
      });
    },
    // Optimistic update
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['trainee', id] });
      
      const previousTrainee = queryClient.getQueryData<Trainee>(['trainee', id]);
      
      if (previousTrainee) {
        queryClient.setQueryData<Trainee>(['trainee', id], {
          ...previousTrainee,
          ...data,
        });
      }
      
      return { previousTrainee };
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousTrainee) {
        queryClient.setQueryData(['trainee', variables.id], context.previousTrainee);
      }
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to update trainee',
        variant: 'destructive',
      });
    },
  });
}

// ======== TRAINING PROGRAM HOOKS ========

export interface TrainingProgram {
  id: number;
  name: string;
  description: string;
  totalHours: number;
  syllabusId: number;
  regulatoryAuthority: string;
  modules: string[]; // Array of module IDs
  status: 'active' | 'inactive' | 'draft';
  createdAt: string;
  updatedAt: string;
}

/**
 * Get data for a single training program
 */
export function useTrainingProgram(programId: number) {
  return useQuery({
    queryKey: ['trainingProgram', programId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/training-programs/${programId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch training program');
      }
      return await res.json();
    },
    enabled: !!programId,
    staleTime: DEFAULT_STALE_TIME,
  });
}

/**
 * Get a list of all training programs
 */
export function useTrainingPrograms(options?: {
  status?: 'active' | 'inactive' | 'draft';
  regulatoryAuthority?: string;
}) {
  return useQuery({
    queryKey: ['trainingPrograms', options],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (options?.status) queryParams.append('status', options.status);
      if (options?.regulatoryAuthority) 
        queryParams.append('regulatoryAuthority', options.regulatoryAuthority);
      
      const res = await apiRequest('GET', `/api/training-programs?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch training programs');
      }
      return await res.json();
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

// ======== TRAINING DATA HOOKS ========

export interface TrainingData {
  traineeId: number;
  completedModules: {
    moduleId: string;
    name: string;
    completionDate: string;
    score: number;
    instructorId: number;
    status: 'completed' | 'inProgress' | 'failed';
  }[];
  upcomingSessions: {
    id: string;
    date: string;
    moduleId: string;
    moduleName: string;
    instructorId: number;
    duration: number;
    location: string;
  }[];
  progressSummary: {
    overallProgress: number; // 0-100
    hoursCompleted: number;
    hoursRemaining: number;
    currentPhase: string;
    estimatedCompletionDate: string;
  };
  assessmentResults: {
    assessmentId: string;
    name: string;
    date: string;
    score: number;
    passingScore: number;
    attemptNumber: number;
    skillIds: string[];
  }[];
}

/**
 * Get comprehensive training data for a trainee
 */
export function useTrainingData(traineeId: number) {
  return useQuery({
    queryKey: ['trainingData', traineeId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/trainees/${traineeId}/training-data`);
      if (!res.ok) {
        throw new Error('Failed to fetch training data');
      }
      return await res.json();
    },
    enabled: !!traineeId,
    staleTime: DEFAULT_STALE_TIME / 2, // More frequent updates
  });
}

// ======== INSTRUCTOR HOOKS ========

export interface Instructor {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  specializations: string[];
  certifications: string[];
  status: 'active' | 'inactive';
  maxTrainees: number;
  currentTrainees: number;
  rating: number; // 1-5 rating
}

/**
 * Get data for a single instructor
 */
export function useInstructor(instructorId: number) {
  return useQuery({
    queryKey: ['instructor', instructorId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/instructors/${instructorId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch instructor data');
      }
      return await res.json();
    },
    enabled: !!instructorId,
    staleTime: DEFAULT_STALE_TIME,
  });
}

/**
 * Get a list of all instructors
 */
export function useInstructors(options?: {
  specialization?: string;
  status?: 'active' | 'inactive';
  available?: boolean;
}) {
  return useQuery({
    queryKey: ['instructors', options],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (options?.specialization) queryParams.append('specialization', options.specialization);
      if (options?.status) queryParams.append('status', options.status);
      if (options?.available !== undefined) 
        queryParams.append('available', options.available.toString());
      
      const res = await apiRequest('GET', `/api/instructors?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch instructors');
      }
      return await res.json();
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

// ======== RESOURCE SCHEDULING HOOKS ========

export interface Resource {
  id: number;
  name: string;
  type: 'classroom' | 'simulator' | 'equipment';
  location: string;
  capacity?: number;
  features: string[];
  status: 'available' | 'maintenance' | 'reserved';
}

/**
 * Get a list of available resources
 */
export function useResourceAvailability(options: {
  startDate: Date;
  endDate: Date;
  resourceType?: 'classroom' | 'simulator' | 'equipment';
  location?: string;
  features?: string[];
}) {
  return useQuery({
    queryKey: ['resourceAvailability', options],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.append('startDate', options.startDate.toISOString());
      queryParams.append('endDate', options.endDate.toISOString());
      if (options.resourceType) queryParams.append('type', options.resourceType);
      if (options.location) queryParams.append('location', options.location);
      if (options.features) {
        options.features.forEach(feature => {
          queryParams.append('features', feature);
        });
      }
      
      const res = await apiRequest('GET', `/api/resources/availability?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch resource availability');
      }
      return await res.json();
    },
    enabled: !!options.startDate && !!options.endDate,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Reserve a resource
 */
export function useReserveResource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (reservation: {
      resourceId: number;
      date: string;
      startTime: string;
      endTime: string;
      sessionId?: string;
      traineeId?: number;
      instructorId?: number;
    }) => {
      const res = await apiRequest('POST', '/api/resources/reserve', reservation);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to reserve resource');
      }
      return await res.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['resourceAvailability'] });
      queryClient.invalidateQueries({ queryKey: ['resourceSchedule', variables.resourceId] });
      
      toast({
        title: 'Success',
        description: 'Resource reserved successfully',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reserve resource',
        variant: 'destructive',
      });
    },
  });
}

// ======== SESSION MANAGEMENT HOOKS ========

export interface TrainingSession {
  id: string;
  title: string;
  description: string;
  moduleId: string;
  moduleName: string;
  traineeIds: number[];
  instructorId: number;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  location: string;
  resources: {
    id: number;
    type: string;
    name: string;
  }[];
  status: 'scheduled' | 'inProgress' | 'completed' | 'cancelled';
  activities: {
    id: string;
    title: string;
    duration: number;
    type: string;
    order: number;
  }[];
}

/**
 * Get a list of scheduled training sessions
 */
export function useTrainingSessions(options?: {
  traineeId?: number;
  instructorId?: number;
  moduleId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: 'scheduled' | 'inProgress' | 'completed' | 'cancelled';
}) {
  return useQuery({
    queryKey: ['trainingSessions', options],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (options?.traineeId) queryParams.append('traineeId', options.traineeId.toString());
      if (options?.instructorId) queryParams.append('instructorId', options.instructorId.toString());
      if (options?.moduleId) queryParams.append('moduleId', options.moduleId);
      if (options?.startDate) queryParams.append('startDate', options.startDate.toISOString());
      if (options?.endDate) queryParams.append('endDate', options.endDate.toISOString());
      if (options?.status) queryParams.append('status', options.status);
      
      const res = await apiRequest('GET', `/api/sessions?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch training sessions');
      }
      return await res.json();
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

/**
 * Create a new training session
 */
export function useCreateTrainingSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (session: Omit<TrainingSession, 'id'>) => {
      const res = await apiRequest('POST', '/api/sessions', session);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create training session');
      }
      return await res.json();
    },
    onSuccess: (data) => {
      // Invalidate sessions query to refetch
      queryClient.invalidateQueries({ queryKey: ['trainingSessions'] });
      
      toast({
        title: 'Success',
        description: 'Training session created successfully',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create training session',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update a training session status
 */
export function useUpdateSessionStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      status 
    }: { 
      sessionId: string; 
      status: 'scheduled' | 'inProgress' | 'completed' | 'cancelled';
      notes?: string;
    }) => {
      const res = await apiRequest('PATCH', `/api/sessions/${sessionId}/status`, { status });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update session status');
      }
      return await res.json();
    },
    onSuccess: (data) => {
      // Invalidate sessions query to refetch
      queryClient.invalidateQueries({ queryKey: ['trainingSessions'] });
      
      toast({
        title: 'Success',
        description: 'Session status updated successfully',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update session status',
        variant: 'destructive',
      });
    },
  });
}

// ======== COMPLIANCE HOOKS ========

export interface RegulationType {
  id: string;
  name: string;
  authority: string;
  version: string;
  effectiveDate: string;
}

export interface ComplianceRequirement {
  requirementId: string;
  code: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  met: boolean;
  details: string;
}

export interface HoursRequirement {
  category: string;
  required: number;
  planned: number;
  completed: number;
  compliant: boolean;
}

export interface ComplianceResult {
  programId: string;
  compliant: boolean;
  requirementsMet: ComplianceRequirement[];
  requirementsNotMet: ComplianceRequirement[];
  hoursRequirements: {
    totalRequired: number;
    totalPlanned: number;
    totalCompleted: number;
    compliant: boolean;
    byCategory: HoursRequirement[];
  };
  recommendations: {
    requirementId: string;
    title: string;
    description: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    actionItems: string[];
  }[];
  complianceScore: number;
  status: 'fully-compliant' | 'partially-compliant' | 'non-compliant';
  timestamp: string;
}

/**
 * Get regulatory requirements
 */
export function useRegulatoryRequirements() {
  return useQuery({
    queryKey: ['/api/regulatory-requirements'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/regulatory-requirements');
      if (!res.ok) {
        throw new Error('Failed to fetch regulatory requirements');
      }
      return await res.json();
    },
    staleTime: DEFAULT_STALE_TIME * 24, // Less frequent updates (24 hours)
  });
}

/**
 * Get compliance check results for a program
 */
export function useComplianceCheck(programId: string) {
  return useQuery({
    queryKey: ['/api/compliance', programId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/compliance/${programId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch compliance data');
      }
      return await res.json();
    },
    enabled: !!programId,
    staleTime: DEFAULT_STALE_TIME,
  });
}

/**
 * Generate a compliance report
 */
export function useGenerateComplianceReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (programId: string) => {
      const res = await apiRequest('POST', `/api/compliance/${programId}/report`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to generate compliance report');
      }
      return await res.json();
    },
    onSuccess: (data, programId) => {
      // Invalidate compliance data to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/compliance', programId] });
      
      toast({
        title: 'Success',
        description: 'Compliance report generated successfully',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate compliance report',
        variant: 'destructive',
      });
    },
  });
}

// ======== PERFORMANCE ANALYTICS HOOKS ========

export interface PerformanceMetric {
  traineeId: number;
  metric: string;
  value: number;
  timestamp: string;
  sessionId?: string;
  assessmentId?: string;
}

export interface PerformanceTrend {
  metric: string;
  data: {
    timestamp: string;
    value: number;
  }[];
  average: number;
  min: number;
  max: number;
}

/**
 * Get performance metrics for a trainee
 */
export function useTraineePerformance(traineeId: number, options?: {
  metrics?: string[];
  startDate?: Date;
  endDate?: Date;
}) {
  return useQuery({
    queryKey: ['traineePerformance', traineeId, options],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (options?.metrics) {
        options.metrics.forEach(metric => {
          queryParams.append('metrics', metric);
        });
      }
      if (options?.startDate) queryParams.append('startDate', options.startDate.toISOString());
      if (options?.endDate) queryParams.append('endDate', options.endDate.toISOString());
      
      const res = await apiRequest('GET', `/api/trainees/${traineeId}/performance?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch trainee performance data');
      }
      return await res.json();
    },
    enabled: !!traineeId,
    staleTime: DEFAULT_STALE_TIME,
  });
}

/**
 * Get performance trends for a trainee
 */
export function usePerformanceTrends(traineeId: number, options?: {
  metrics?: string[];
  period?: 'week' | 'month' | 'year';
}) {
  return useQuery({
    queryKey: ['performanceTrends', traineeId, options],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (options?.metrics) {
        options.metrics.forEach(metric => {
          queryParams.append('metrics', metric);
        });
      }
      if (options?.period) queryParams.append('period', options.period);
      
      const res = await apiRequest('GET', `/api/trainees/${traineeId}/performance/trends?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch performance trends');
      }
      return await res.json();
    },
    enabled: !!traineeId,
    staleTime: DEFAULT_STALE_TIME,
  });
}

// ======== DOCUMENT MANAGEMENT HOOKS ========

export interface Document {
  id: string;
  title: string;
  description: string;
  type: string;
  url: string;
  fileSize: number;
  uploadedBy: number;
  uploadedAt: string;
  tags: string[];
  status: 'active' | 'archived';
  version: number;
}

/**
 * Get a list of documents
 */
export function useDocuments(options?: {
  type?: string;
  tags?: string[];
  uploadedBy?: number;
  status?: 'active' | 'archived';
}) {
  return useQuery({
    queryKey: ['documents', options],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (options?.type) queryParams.append('type', options.type);
      if (options?.tags) {
        options.tags.forEach(tag => {
          queryParams.append('tags', tag);
        });
      }
      if (options?.uploadedBy) queryParams.append('uploadedBy', options.uploadedBy.toString());
      if (options?.status) queryParams.append('status', options.status);
      
      const res = await apiRequest('GET', `/api/documents?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch documents');
      }
      return await res.json();
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

/**
 * Upload a new document
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      file, 
      metadata 
    }: { 
      file: File; 
      metadata: {
        title: string;
        description?: string;
        type: string;
        tags?: string[];
      }
    }) => {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify(metadata));
      
      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
        // No content-type header - browser sets it with boundary for multipart/form-data
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to upload document');
      }
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate documents query to refetch
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      
      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload document',
        variant: 'destructive',
      });
    },
  });
}