/**
 * Session API hooks for Advanced Pilot Training Platform
 * Provides React Query hooks for working with training sessions
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TrainingSession, SessionCreateRequest, SessionUpdateRequest, SessionResponse } from '@shared/session-types';
import { apiRequest } from '@/lib/queryClient';

/**
 * Hook to get all sessions
 * @param filters Optional filters for sessions
 */
export function useAllSessions(filters?: {
  startDate?: string;
  endDate?: string;
  type?: string;
  status?: string;
}) {
  const queryParams = new URLSearchParams();
  
  if (filters?.startDate) queryParams.append('startDate', filters.startDate);
  if (filters?.endDate) queryParams.append('endDate', filters.endDate);
  if (filters?.type) queryParams.append('type', filters.type);
  if (filters?.status) queryParams.append('status', filters.status);
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  return useQuery<{ 
    success: boolean; 
    sessions: TrainingSession[];
    total: number; 
  }>({
    queryKey: ['/api/sessions', filters],
    queryFn: async () => {
      const response = await fetch(`/api/sessions${queryString}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      return response.json();
    }
  });
}

/**
 * Hook to get a specific session by ID
 * @param id Session ID
 */
export function useSession(id: string | undefined) {
  return useQuery<{ 
    success: boolean; 
    session: TrainingSession;
  }>({
    queryKey: ['/api/sessions', id],
    queryFn: async () => {
      if (!id) throw new Error('Session ID is required');
      const response = await fetch(`/api/sessions/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch session');
      }
      return response.json();
    },
    enabled: !!id // Only run query if ID is provided
  });
}

/**
 * Hook to get sessions for a specific trainee
 * @param traineeId Trainee ID
 */
export function useTraineeSessions(traineeId: string | undefined) {
  return useQuery<{ 
    success: boolean; 
    sessions: TrainingSession[];
    total: number;
  }>({
    queryKey: ['/api/sessions/trainee', traineeId],
    queryFn: async () => {
      if (!traineeId) throw new Error('Trainee ID is required');
      const response = await fetch(`/api/sessions/trainee/${traineeId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trainee sessions');
      }
      return response.json();
    },
    enabled: !!traineeId // Only run query if trainee ID is provided
  });
}

/**
 * Hook to get sessions for a specific instructor
 * @param instructorId Instructor ID
 */
export function useInstructorSessions(instructorId: string | undefined) {
  return useQuery<{ 
    success: boolean; 
    sessions: TrainingSession[];
    total: number;
  }>({
    queryKey: ['/api/sessions/instructor', instructorId],
    queryFn: async () => {
      if (!instructorId) throw new Error('Instructor ID is required');
      const response = await fetch(`/api/sessions/instructor/${instructorId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch instructor sessions');
      }
      return response.json();
    },
    enabled: !!instructorId // Only run query if instructor ID is provided
  });
}

/**
 * Hook to get upcoming sessions for dashboard
 */
export function useUpcomingSessions() {
  return useQuery<{ 
    success: boolean; 
    sessions: TrainingSession[];
    total: number;
  }>({
    queryKey: ['/api/sessions/dashboard/upcoming'],
    queryFn: async () => {
      const response = await fetch('/api/sessions/dashboard/upcoming');
      if (!response.ok) {
        throw new Error('Failed to fetch upcoming sessions');
      }
      return response.json();
    }
  });
}

/**
 * Hook to create a new session
 */
export function useCreateSession() {
  const queryClient = useQueryClient();
  
  return useMutation<SessionResponse, Error, SessionCreateRequest>({
    mutationFn: async (data: SessionCreateRequest) => {
      const response = await apiRequest('POST', '/api/sessions', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create session');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions/dashboard/upcoming'] });
    }
  });
}

/**
 * Hook to update an existing session
 */
export function useUpdateSession() {
  const queryClient = useQueryClient();
  
  return useMutation<SessionResponse, Error, SessionUpdateRequest>({
    mutationFn: async (data: SessionUpdateRequest) => {
      const response = await apiRequest('PUT', `/api/sessions/${data.id}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update session');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', data.session?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions/dashboard/upcoming'] });
    }
  });
}

/**
 * Hook to delete a session
 */
export function useDeleteSession() {
  const queryClient = useQueryClient();
  
  return useMutation<SessionResponse, Error, string>({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/sessions/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete session');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions/dashboard/upcoming'] });
    }
  });
}