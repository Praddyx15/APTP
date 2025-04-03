/**
 * API Integration Layer - Type-safe API client hooks using React Query
 * Implements error handling, retry logic, caching, and optimistic updates
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from 'react-query';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { useAuth } from './AuthProvider';

// Base API configuration
const API_URL = process.env.REACT_APP_API_URL || '';
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

// Create axios instance with defaults
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request/response interceptors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    // Customize error handling
    if (error.response) {
      const status = error.response.status;
      
      // Handle specific error codes
      if (status === 401) {
        // Token expired or invalid
        console.error('Authentication error. Please login again.');
        // This will be handled by the auth provider's interceptor
      } else if (status === 403) {
        console.error('You do not have permission to access this resource.');
      } else if (status === 404) {
        console.error('Resource not found.');
      } else if (status === 429) {
        console.error('Too many requests. Please try again later.');
      } else if (status >= 500) {
        console.error('Server error. Please try again later.');
      }
    } else if (error.request) {
      // No response received
      console.error('No response received from server. Please check your connection.');
    } else {
      // Other errors
      console.error('An error occurred:', error.message);
    }
    
    return Promise.reject(error);
  }
);

/**
 * Custom hook to create authenticated API client
 * Automatically adds auth token to requests
 */
export const useApiClient = () => {
  const { token } = useAuth();
  
  const client = {
    get: <T>(url: string, config?: AxiosRequestConfig) => 
      apiClient.get<ApiResponse<T>>(url, {
        ...config,
        headers: {
          ...config?.headers,
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      }),
    
    post: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
      apiClient.post<ApiResponse<T>>(url, data, {
        ...config,
        headers: {
          ...config?.headers,
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      }),
    
    put: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
      apiClient.put<ApiResponse<T>>(url, data, {
        ...config,
        headers: {
          ...config?.headers,
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      }),
    
    patch: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
      apiClient.patch<ApiResponse<T>>(url, data, {
        ...config,
        headers: {
          ...config?.headers,
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      }),
    
    delete: <T>(url: string, config?: AxiosRequestConfig) => 
      apiClient.delete<ApiResponse<T>>(url, {
        ...config,
        headers: {
          ...config?.headers,
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      }),
  };
  
  return client;
};

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
  const apiClient = useApiClient();
  
  return useQuery<Trainee, AxiosError<ApiError>>(
    ['trainee', traineeId],
    async () => {
      const response = await apiClient.get<Trainee>(`/trainees/${traineeId}`);
      return response.data.data;
    },
    {
      enabled: !!traineeId,
      staleTime: DEFAULT_STALE_TIME,
      retry: (failureCount, error) => {
        // Don't retry on 404s
        if (error.response?.status === 404) return false;
        return failureCount < 3;
      }
    }
  );
}

/**
 * Get a list of all trainees
 */
export function useTrainees(options?: {
  programId?: number;
  instructorId?: number;
  status?: 'active' | 'inactive' | 'onHold';
}) {
  const apiClient = useApiClient();
  
  return useQuery<Trainee[], AxiosError<ApiError>>(
    ['trainees', options],
    async () => {
      const queryParams = new URLSearchParams();
      if (options?.programId) queryParams.append('programId', options.programId.toString());
      if (options?.instructorId) queryParams.append('instructorId', options.instructorId.toString());
      if (options?.status) queryParams.append('status', options.status);
      
      const response = await apiClient.get<Trainee[]>(`/trainees?${queryParams.toString()}`);
      return response.data.data;
    },
    {
      staleTime: DEFAULT_STALE_TIME,
      keepPreviousData: true,
    }
  );
}

/**
 * Create a new trainee
 */
export function useCreateTrainee() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  
  return useMutation<
    Trainee,
    AxiosError<ApiError>,
    Omit<Trainee, 'id' | 'completedHours'>
  >(
    async (newTrainee) => {
      const response = await apiClient.post<Trainee>('/trainees', newTrainee);
      return response.data.data;
    },
    {
      onSuccess: (data) => {
        // Update cache
        queryClient.setQueryData(['trainee', data.id], data);
        queryClient.invalidateQueries('trainees');
      },
    }
  );
}

/**
 * Update an existing trainee
 */
export function useUpdateTrainee() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  
  return useMutation<
    Trainee,
    AxiosError<ApiError>,
    { id: number; data: Partial<Trainee> }
  >(
    async ({ id, data }) => {
      const response = await apiClient.patch<Trainee>(`/trainees/${id}`, data);
      return response.data.data;
    },
    {
      onSuccess: (data) => {
        // Update cache
        queryClient.setQueryData(['trainee', data.id], data);
        queryClient.invalidateQueries('trainees');
      },
      // Optimistic update
      onMutate: async ({ id, data }) => {
        await queryClient.cancelQueries(['trainee', id]);
        
        const previousTrainee = queryClient.getQueryData<Trainee>(['trainee', id]);
        
        if (previousTrainee) {
          queryClient.setQueryData<Trainee>(['trainee', id], {
            ...previousTrainee,
            ...data,
          });
        }
        
        return { previousTrainee };
      },
      onError: (err, variables, context) => {
        // Rollback on error
        if (context?.previousTrainee) {
          queryClient.setQueryData(['trainee', variables.id], context.previousTrainee);
        }
      },
    }
  );
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
  const apiClient = useApiClient();
  
  return useQuery<TrainingProgram, AxiosError<ApiError>>(
    ['trainingProgram', programId],
    async () => {
      const response = await apiClient.get<TrainingProgram>(`/training-programs/${programId}`);
      return response.data.data;
    },
    {
      enabled: !!programId,
      staleTime: DEFAULT_STALE_TIME,
    }
  );
}

/**
 * Get a list of all training programs
 */
export function useTrainingPrograms(options?: {
  status?: 'active' | 'inactive' | 'draft';
  regulatoryAuthority?: string;
}) {
  const apiClient = useApiClient();
  
  return useQuery<TrainingProgram[], AxiosError<ApiError>>(
    ['trainingPrograms', options],
    async () => {
      const queryParams = new URLSearchParams();
      if (options?.status) queryParams.append('status', options.status);
      if (options?.regulatoryAuthority) 
        queryParams.append('regulatoryAuthority', options.regulatoryAuthority);
      
      const response = await apiClient.get<TrainingProgram[]>(
        `/training-programs?${queryParams.toString()}`
      );
      return response.data.data;
    },
    {
      staleTime: DEFAULT_STALE_TIME,
    }
  );
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
  const apiClient = useApiClient();
  
  return useQuery<TrainingData, AxiosError<ApiError>>(
    ['trainingData', traineeId],
    async () => {
      const response = await apiClient.get<TrainingData>(`/trainees/${traineeId}/training-data`);
      return response.data.data;
    },
    {
      enabled: !!traineeId,
      staleTime: DEFAULT_STALE_TIME / 2, // More frequent updates
    }
  );
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
  const apiClient = useApiClient();
  
  return useQuery<Instructor, AxiosError<ApiError>>(
    ['instructor', instructorId],
    async () => {
      const response = await apiClient.get<Instructor>(`/instructors/${instructorId}`);
      return response.data.data;
    },
    {
      enabled: !!instructorId,
      staleTime: DEFAULT_STALE_TIME,
    }
  );
}

/**
 * Get a list of all instructors
 */
export function useInstructors(options?: {
  specialization?: string;
  status?: 'active' | 'inactive';
  available?: boolean;
}) {
  const apiClient = useApiClient();
  
  return useQuery<Instructor[], AxiosError<ApiError>>(
    ['instructors', options],
    async () => {
      const queryParams = new URLSearchParams();
      if (options?.specialization) queryParams.append('specialization', options.specialization);
      if (options?.status) queryParams.append('status', options.status);
      if (options?.available !== undefined) 
        queryParams.append('available', options.available.toString());
      
      const response = await apiClient.get<Instructor[]>(`/instructors?${queryParams.toString()}`);
      return response.data.data;
    },
    {
      staleTime: DEFAULT_STALE_TIME,
    }
  );
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
  const apiClient = useApiClient();
  
  return useQuery<
    { 
      resource: Resource;
      availableSlots: { date: string; startTime: string; endTime: string }[] 
    }[],
    AxiosError<ApiError>
  >(
    ['resourceAvailability', options],
    async () => {
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
      
      const response = await apiClient.get<any>(`/resources/availability?${queryParams.toString()}`);
      return response.data.data;
    },
    {
      enabled: !!options.startDate && !!options.endDate,
      staleTime: 60 * 1000, // 1 minute
    }
  );
}

/**
 * Get resource schedule
 */
export function useResourceSchedule(resourceId?: number) {
  const apiClient = useApiClient();
  
  return useQuery<
    {
      date: string;
      slots: {
        startTime: string;
        endTime: string;
        sessionId?: string;
        traineeId?: number;
        instructorId?: number;
      }[];
    }[],
    AxiosError<ApiError>
  >(
    ['resourceSchedule', resourceId],
    async () => {
      const response = await apiClient.get<any>(`/resources/${resourceId}/schedule`);
      return response.data.data;
    },
    {
      enabled: !!resourceId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
}

/**
 * Reserve a resource
 */
export function useReserveResource() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  
  return useMutation<
    { success: boolean; reservationId: string },
    AxiosError<ApiError>,
    {
      resourceId: number;
      date: string;
      startTime: string;
      endTime: string;
      sessionId?: string;
      traineeId?: number;
      instructorId?: number;
    }
  >(
    async (reservation) => {
      const response = await apiClient.post<any>('/resources/reserve', reservation);
      return response.data.data;
    },
    {
      onSuccess: (data, variables) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries(['resourceAvailability']);
        queryClient.invalidateQueries(['resourceSchedule', variables.resourceId]);
      },
    }
  );
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
  const apiClient = useApiClient();
  
  return useQuery<TrainingSession[], AxiosError<ApiError>>(
    ['trainingSessions', options],
    async () => {
      const queryParams = new URLSearchParams();
      if (options?.traineeId) queryParams.append('traineeId', options.traineeId.toString());
      if (options?.instructorId) queryParams.append('instructorId', options.instructorId.toString());
      if (options?.moduleId) queryParams.append('moduleId', options.moduleId);
      if (options?.startDate) queryParams.append('startDate', options.startDate.toISOString());
      if (options?.endDate) queryParams.append('endDate', options.endDate.toISOString());
      if (options?.status) queryParams.append('status', options.status);
      
      const response = await apiClient.get<TrainingSession[]>(
        `/training-sessions?${queryParams.toString()}`
      );
      return response.data.data;
    },
    {
      staleTime: DEFAULT_STALE_TIME,
    }
  );
}

/**
 * Get a single training session
 */
export function useTrainingSession(sessionId: string) {
  const apiClient = useApiClient();
  
  return useQuery<TrainingSession, AxiosError<ApiError>>(
    ['trainingSession', sessionId],
    async () => {
      const response = await apiClient.get<TrainingSession>(`/training-sessions/${sessionId}`);
      return response.data.data;
    },
    {
      enabled: !!sessionId,
      staleTime: DEFAULT_STALE_TIME,
    }
  );
}

/**
 * Create a new training session
 */
export function useCreateTrainingSession() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  
  return useMutation<
    TrainingSession,
    AxiosError<ApiError>,
    Omit<TrainingSession, 'id'> 
  >(
    async (newSession) => {
      const response = await apiClient.post<TrainingSession>('/training-sessions', newSession);
      return response.data.data;
    },
    {
      onSuccess: (data) => {
        // Update cache
        queryClient.setQueryData(['trainingSession', data.id], data);
        queryClient.invalidateQueries('trainingSessions');
        
        // Invalidate affected trainee data
        data.traineeIds.forEach(traineeId => {
          queryClient.invalidateQueries(['trainingData', traineeId]);
        });
        
        // Invalidate resource schedules
        data.resources.forEach(resource => {
          queryClient.invalidateQueries(['resourceSchedule', resource.id]);
        });
      },
    }
  );
}

/**
 * Update a training session
 */
export function useUpdateTrainingSession() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  
  return useMutation<
    TrainingSession,
    AxiosError<ApiError>,
    { id: string; data: Partial<TrainingSession> }
  >(
    async ({ id, data }) => {
      const response = await apiClient.patch<TrainingSession>(`/training-sessions/${id}`, data);
      return response.data.data;
    },
    {
      onSuccess: (data) => {
        // Update cache
        queryClient.setQueryData(['trainingSession', data.id], data);
        queryClient.invalidateQueries('trainingSessions');
        
        // Invalidate affected trainee data
        data.traineeIds.forEach(traineeId => {
          queryClient.invalidateQueries(['trainingData', traineeId]);
        });
      },
      // Optimistic update
      onMutate: async ({ id, data }) => {
        await queryClient.cancelQueries(['trainingSession', id]);
        
        const previousSession = queryClient.getQueryData<TrainingSession>(['trainingSession', id]);
        
        if (previousSession) {
          queryClient.setQueryData<TrainingSession>(['trainingSession', id], {
            ...previousSession,
            ...data,
          });
        }
        
        return { previousSession };
      },
      onError: (err, variables, context) => {
        // Rollback on error
        if (context?.previousSession) {
          queryClient.setQueryData(
            ['trainingSession', variables.id], 
            context.previousSession
          );
        }
      },
    }
  );
}

/**
 * Cancel a training session
 */
export function useCancelTrainingSession() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  
  return useMutation<
    { success: boolean },
    AxiosError<ApiError>,
    { sessionId: string; reason: string }
  >(
    async ({ sessionId, reason }) => {
      const response = await apiClient.post<any>(`/training-sessions/${sessionId}/cancel`, { reason });
      return response.data.data;
    },
    {
      onSuccess: (data, variables) => {
        // Invalidate queries
        queryClient.invalidateQueries(['trainingSession', variables.sessionId]);
        queryClient.invalidateQueries('trainingSessions');
        
        // Get session data to invalidate related resources
        const session = queryClient.getQueryData<TrainingSession>(
          ['trainingSession', variables.sessionId]
        );
        
        if (session) {
          // Invalidate trainee data
          session.traineeIds.forEach(traineeId => {
            queryClient.invalidateQueries(['trainingData', traineeId]);
          });
          
          // Invalidate resource schedules
          session.resources.forEach(resource => {
            queryClient.invalidateQueries(['resourceSchedule', resource.id]);
          });
        }
      },
    }
  );
}

// ======== ASSESSMENT HOOKS ========

export interface Assessment {
  id: string;
  title: string;
  description: string;
  moduleId: string;
  skillIds: string[];
  questionCount: number;
  passingScore: number;
  timeLimit: number; // in minutes
  attempts: {
    traineeId: number;
    attemptDate: string;
    score: number;
    passed: boolean;
    timeSpent: number; // in minutes
  }[];
}

/**
 * Get a list of assessments
 */
export function useAssessments(options?: {
  moduleId?: string;
  skillId?: string;
}) {
  const apiClient = useApiClient();
  
  return useQuery<Assessment[], AxiosError<ApiError>>(
    ['assessments', options],
    async () => {
      const queryParams = new URLSearchParams();
      if (options?.moduleId) queryParams.append('moduleId', options.moduleId);
      if (options?.skillId) queryParams.append('skillId', options.skillId);
      
      const response = await apiClient.get<Assessment[]>(`/assessments?${queryParams.toString()}`);
      return response.data.data;
    },
    {
      staleTime: DEFAULT_STALE_TIME,
    }
  );
}

/**
 * Get trainee assessment attempts
 */
export function useTraineeAssessments(traineeId: number) {
  const apiClient = useApiClient();
  
  return useQuery<
    {
      assessmentId: string;
      title: string;
      moduleId: string;
      moduleName: string;
      attempts: {
        attemptDate: string;
        score: number;
        passed: boolean;
        timeSpent: number;
      }[];
    }[],
    AxiosError<ApiError>
  >(
    ['traineeAssessments', traineeId],
    async () => {
      const response = await apiClient.get<any>(`/trainees/${traineeId}/assessments`);
      return response.data.data;
    },
    {
      enabled: !!traineeId,
      staleTime: DEFAULT_STALE_TIME,
    }
  );
}

/**
 * Record a new assessment attempt
 */
export function useSubmitAssessment() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  
  return useMutation<
    { 
      success: boolean; 
      score: number; 
      passed: boolean; 
      feedback: { 
        skillId: string; 
        proficiency: number; 
        feedback: string 
      }[] 
    },
    AxiosError<ApiError>,
    {
      assessmentId: string;
      traineeId: number;
      answers: { questionId: string; selectedOptionId: string }[];
      timeSpent: number;
    }
  >(
    async (submission) => {
      const response = await apiClient.post<any>('/assessments/submit', submission);
      return response.data.data;
    },
    {
      onSuccess: (data, variables) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries(['traineeAssessments', variables.traineeId]);
        queryClient.invalidateQueries(['trainingData', variables.traineeId]);
        queryClient.invalidateQueries(['assessments']);
      },
    }
  );
}

// Example usage of API hooks:
/*
import { useTrainingData, useTrainingSession, useSubmitAssessment } from './ApiClient';

function TraineeDetailView({ traineeId }) {
  // Fetch training data
  const { data, isLoading, error } = useTrainingData(traineeId);
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div>
      <h1>Trainee Progress</h1>
      <ProgressBar value={data.progressSummary.overallProgress} />
      <h2>Completed Modules</h2>
      <ModuleList modules={data.completedModules} />
      <h2>Upcoming Sessions</h2>
      <SessionList sessions={data.upcomingSessions} />
    </div>
  );
}

function SessionDetail({ sessionId }) {
  // Fetch session data
  const { data: session, isLoading } = useTrainingSession(sessionId);
  
  // Cancel session mutation
  const { mutate: cancelSession, isLoading: isCancelling } = useCancelTrainingSession();
  
  const handleCancel = () => {
    cancelSession({ 
      sessionId, 
      reason: 'Instructor unavailable' 
    }, {
      onSuccess: () => {
        showSuccessNotification('Session cancelled successfully');
        navigate('/sessions');
      },
      onError: (error) => {
        showErrorNotification(`Failed to cancel session: ${error.response?.data.message}`);
      }
    });
  };
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div>
      <h1>{session.title}</h1>
      <p>{session.description}</p>
      <SessionDetails session={session} />
      <Button onClick={handleCancel} disabled={isCancelling}>
        {isCancelling ? 'Cancelling...' : 'Cancel Session'}
      </Button>
    </div>
  );
}
*/
