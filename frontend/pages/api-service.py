// lib/api/apiClient.ts
import axios, { AxiosError, AxiosInstance } from 'axios';
import { getSession } from 'next-auth/react';

/**
 * Creates a configured Axios instance for API requests
 */
const createApiClient = (): AxiosInstance => {
  const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000, // 30s timeout
  });

  // Request interceptor for adding auth tokens
  api.interceptors.request.use(
    async (config) => {
      const session = await getSession();
      if (session?.accessToken) {
        config.headers['Authorization'] = `Bearer ${session.accessToken}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for handling errors
  api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config;
      
      // Handle 401 Unauthorized - token expired
      if (error.response?.status === 401 && !originalRequest?.headers['X-Retry']) {
        // Mark this request as retried to prevent infinite loops
        if (originalRequest) originalRequest.headers['X-Retry'] = 'true';
        
        try {
          // Attempt to refresh token
          const session = await getSession();
          if (session?.refreshToken) {
            const refreshResponse = await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh-token`,
              { refreshToken: session.refreshToken }
            );
            
            // Update session
            // This would normally be handled by your session management system
            
            // Retry original request
            if (originalRequest) {
              return api(originalRequest);
            }
          }
        } catch (refreshError) {
          // Token refresh failed, redirect to login
          window.location.href = '/auth/login';
          return Promise.reject(refreshError);
        }
      }
      
      return Promise.reject(error);
    }
  );

  return api;
};

export const apiClient = createApiClient();

// Typed API service functions

/**
 * Document API service
 */
export const documentApi = {
  /**
   * Upload a document for AI processing
   */
  uploadDocument: async (file: File, metadata: { documentType: string; description?: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));
    
    const response = await apiClient.post('/document/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },
  
  /**
   * Get document analysis results by ID
   */
  getDocumentAnalysis: async (documentId: string) => {
    const response = await apiClient.get(`/document/${documentId}/analysis`);
    return response.data;
  },
  
  /**
   * Get all documents for the current user
   */
  getUserDocuments: async (params: { page: number; limit: number; filters?: Record<string, any> }) => {
    const response = await apiClient.get('/document/user-documents', { params });
    return response.data;
  }
};

/**
 * Syllabus API service
 */
export const syllabusApi = {
  /**
   * Get available syllabus templates
   */
  getTemplates: async () => {
    const response = await apiClient.get('/syllabus/templates');
    return response.data;
  },
  
  /**
   * Generate a syllabus from documents
   */
  generateSyllabus: async (params: { documentIds: string[]; templateId?: string; title: string }) => {
    const response = await apiClient.post('/syllabus/generate', params);
    return response.data;
  },
  
  /**
   * Get a syllabus by ID
   */
  getSyllabus: async (syllabusId: string) => {
    const response = await apiClient.get(`/syllabus/${syllabusId}`);
    return response.data;
  },
  
  /**
   * Update a syllabus
   */
  updateSyllabus: async (syllabusId: string, data: any) => {
    const response = await apiClient.put(`/syllabus/${syllabusId}`, data);
    return response.data;
  },
  
  /**
   * Get version history for a syllabus
   */
  getSyllabusVersions: async (syllabusId: string) => {
    const response = await apiClient.get(`/syllabus/${syllabusId}/versions`);
    return response.data;
  }
};

/**
 * Analytics API service
 */
export const analyticsApi = {
  /**
   * Get training performance data
   */
  getPerformanceData: async (params: { traineeId?: string; dateRange: { start: Date; end: Date }; metrics: string[] }) => {
    const response = await apiClient.get('/analytics/performance', { params });
    return response.data;
  },
  
  /**
   * Get skill decay predictions
   */
  getSkillDecayPredictions: async (traineeId: string) => {
    const response = await apiClient.get(`/analytics/trainees/${traineeId}/skill-decay`);
    return response.data;
  },
  
  /**
   * Get real-time simulator data
   */
  getSimulatorData: async (sessionId: string) => {
    const response = await apiClient.get(`/analytics/sessions/${sessionId}/telemetry`);
    return response.data;
  }
};

/**
 * Compliance API service
 */
export const complianceApi = {
  /**
   * Get compliance status for a syllabus
   */
  getSyllabusCompliance: async (syllabusId: string) => {
    const response = await apiClient.get(`/compliance/syllabus/${syllabusId}`);
    return response.data;
  },
  
  /**
   * Get audit logs
   */
  getAuditLogs: async (params: { entityType?: string; entityId?: string; page: number; limit: number }) => {
    const response = await apiClient.get('/compliance/audit-logs', { params });
    return response.data;
  },
  
  /**
   * Get regulatory frameworks
   */
  getRegulatoryFrameworks: async () => {
    const response = await apiClient.get('/compliance/regulatory-frameworks');
    return response.data;
  }
};

/**
 * Debriefing API service
 */
export const debriefingApi = {
  /**
   * Get session details
   */
  getSessionDetails: async (sessionId: string) => {
    const response = await apiClient.get(`/debriefing/sessions/${sessionId}`);
    return response.data;
  },
  
  /**
   * Save session annotations
   */
  saveAnnotations: async (sessionId: string, annotations: any[]) => {
    const response = await apiClient.post(`/debriefing/sessions/${sessionId}/annotations`, { annotations });
    return response.data;
  },
  
  /**
   * Generate session report
   */
  generateReport: async (sessionId: string, options: { format: 'pdf' | 'docx' }) => {
    const response = await apiClient.post(`/debriefing/sessions/${sessionId}/report`, options, {
      responseType: 'blob'
    });
    return response.data;
  }
};

/**
 * User API service
 */
export const userApi = {
  /**
   * Get user profile
   */
  getProfile: async () => {
    const response = await apiClient.get('/user/profile');
    return response.data;
  },
  
  /**
   * Update user profile
   */
  updateProfile: async (data: any) => {
    const response = await apiClient.put('/user/profile', data);
    return response.data;
  },
  
  /**
   * Get user activity
   */
  getUserActivity: async (params: { page: number; limit: number }) => {
    const response = await apiClient.get('/user/activity', { params });
    return response.data;
  }
};

/**
 * WebSocket connection for real-time data
 */
export class WebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  
  constructor(url: string) {
    this.connect(url);
  }
  
  private connect(url: string) {
    this.socket = new WebSocket(url);
    
    this.socket.onopen = () => {
      console.log('WebSocket connected');
    };
    
    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { type, payload } = data;
        
        if (this.listeners.has(type)) {
          this.listeners.get(type)?.forEach(listener => listener(payload));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message', error);
      }
    };
    
    this.socket.onclose = () => {
      console.log('WebSocket disconnected. Reconnecting...');
      setTimeout(() => this.connect(url), 5000);
    };
    
    this.socket.onerror = (error) => {
      console.error('WebSocket error', error);
      this.socket?.close();
    };
  }
  
  subscribe(type: string, callback: (data: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    this.listeners.get(type)?.add(callback);
    
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }
  
  send(type: string, payload: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    } else {
      console.error('WebSocket not connected');
    }
  }
}

export const createWebSocketService = () => {
  if (typeof window !== 'undefined') {
    return new WebSocketService(process.env.NEXT_PUBLIC_WS_URL || '');
  }
  return null;
};
