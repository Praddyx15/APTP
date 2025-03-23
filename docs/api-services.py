// src/frontend/services/apiClient.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Configure base API client with interceptors for auth and error handling
export const createApiClient = (baseURL: string, getAuthToken: () => string | null): AxiosInstance => {
  const apiClient = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Request interceptor for auth token
  apiClient.interceptors.request.use(
    (config: AxiosRequestConfig) => {
      const token = getAuthToken();
      if (token && config.headers) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling
  apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error) => {
      // Handle session expiry - redirect to login
      if (error.response && error.response.status === 401) {
        window.location.href = '/login';
      }

      // Handle server errors
      if (error.response && error.response.status >= 500) {
        console.error('Server error:', error.response.data);
      }

      return Promise.reject(error);
    }
  );

  return apiClient;
};

// src/frontend/services/authService.ts
import { User, Permission, UserRole } from '../components/auth/UserAuth';

// Token storage helpers
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

const getStoredUser = (): User | null => {
  const userData = localStorage.getItem(USER_KEY);
  return userData ? JSON.parse(userData) : null;
};

const setStoredUser = (user: User): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

const clearStoredUser = (): void => {
  localStorage.removeItem(USER_KEY);
};

// Create API client for auth endpoints
const apiClient = createApiClient('/api/auth', getToken);

// Auth service implementation
export const authService = {
  login: async (username: string, password: string): Promise<User> => {
    try {
      const response = await apiClient.post('/login', { username, password });
      const { token, user } = response.data;
      
      setToken(token);
      setStoredUser(user);
      
      return user;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Login failed');
      }
      throw new Error('Login failed: Network error');
    }
  },
  
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      clearToken();
      clearStoredUser();
    }
  },
  
  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post('/forgot-password', { email });
  },
  
  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await apiClient.post('/reset-password', { token, newPassword });
  },
  
  getCurrentUser: async (): Promise<User | null> => {
    // First check if we have a stored user and token
    const token = getToken();
    const storedUser = getStoredUser();
    
    if (!token) {
      return null;
    }
    
    // If we have a token but no stored user, fetch the user data
    if (!storedUser) {
      try {
        const response = await apiClient.get('/me');
        const user = response.data;
        setStoredUser(user);
        return user;
      } catch (error) {
        clearToken();
        return null;
      }
    }
    
    // Validate token by making a request
    try {
      const response = await apiClient.get('/validate-token');
      if (response.data.valid) {
        return storedUser;
      } else {
        clearToken();
        clearStoredUser();
        return null;
      }
    } catch (error) {
      clearToken();
      clearStoredUser();
      return null;
    }
  },
  
  updateProfile: async (userId: string, updates: Partial<User>): Promise<User> => {
    const response = await apiClient.put(`/users/${userId}`, updates);
    const updatedUser = response.data;
    setStoredUser(updatedUser);
    return updatedUser;
  },
  
  changePassword: async (userId: string, currentPassword: string, newPassword: string): Promise<void> => {
    await apiClient.post(`/users/${userId}/change-password`, {
      currentPassword,
      newPassword
    });
  },
  
  uploadProfilePhoto: async (userId: string, file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('photo', file);
    
    const response = await apiClient.post(`/users/${userId}/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    const photoUrl = response.data.photoUrl;
    
    // Update stored user with new photo URL
    const user = getStoredUser();
    if (user) {
      user.photoUrl = photoUrl;
      setStoredUser(user);
    }
    
    return photoUrl;
  }
};

// src/frontend/services/syllabusService.ts
import { TrainingElement } from '../components/syllabus/SyllabusBuilder';

// Create API client for syllabus endpoints
const syllabusApiClient = createApiClient('/api/syllabus', getToken);

export const syllabusService = {
  getSyllabusElements: async (syllabusId: string): Promise<TrainingElement[]> => {
    const response = await syllabusApiClient.get(`/${syllabusId}/elements`);
    return response.data;
  },
  
  saveSyllabus: async (syllabusId: string, elements: TrainingElement[]): Promise<void> => {
    await syllabusApiClient.put(`/${syllabusId}/elements`, { elements });
  },
  
  getTemplates: async (): Promise<any[]> => {
    const response = await syllabusApiClient.get('/templates');
    return response.data;
  },
  
  applyTemplate: async (syllabusId: string, templateId: string): Promise<TrainingElement[]> => {
    const response = await syllabusApiClient.post(`/${syllabusId}/apply-template`, { templateId });
    return response.data;
  },
  
  checkCompliance: async (syllabusId: string, frameworkId: string): Promise<any> => {
    const response = await syllabusApiClient.post(`/${syllabusId}/check-compliance`, { frameworkId });
    return response.data;
  },
  
  createVersion: async (syllabusId: string, name: string, elements: TrainingElement[]): Promise<void> => {
    await syllabusApiClient.post(`/${syllabusId}/versions`, { name, elements });
  },
  
  getVersions: async (syllabusId: string): Promise<any[]> => {
    const response = await syllabusApiClient.get(`/${syllabusId}/versions`);
    return response.data;
  },
  
  bulkUpdateElements: async (syllabusId: string, elementIds: string[], updates: Partial<TrainingElement>): Promise<void> => {
    await syllabusApiClient.post(`/${syllabusId}/bulk-update`, { elementIds, updates });
  }
};

// src/frontend/services/documentService.ts
import { Document, DocumentStatus, DocumentType } from '../components/document/DocumentManagement';

// Create API client for document endpoints
const documentApiClient = createApiClient('/api/documents', getToken);

export const documentService = {
  getDocuments: async (): Promise<Document[]> => {
    const response = await documentApiClient.get('/');
    return response.data;
  },
  
  uploadDocument: async (file: File, onProgress?: (progress: number) => void): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await documentApiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      }
    });
    
    return response.data;
  },
  
  deleteDocument: async (documentId: string): Promise<void> => {
    await documentApiClient.delete(`/${documentId}`);
  },
  
  processDocument: async (documentId: string): Promise<Document> => {
    const response = await documentApiClient.post(`/${documentId}/process`);
    return response.data;
  },
  
  getDocumentContent: async (documentId: string, pageNumber: number): Promise<any> => {
    const response = await documentApiClient.get(`/${documentId}/content`, {
      params: { page: pageNumber }
    });
    return response.data;
  },
  
  updateDocumentTags: async (documentId: string, tags: string[]): Promise<Document> => {
    const response = await documentApiClient.put(`/${documentId}/tags`, { tags });
    return response.data;
  },
  
  updateDocumentCategory: async (documentId: string, categoryId: string): Promise<Document> => {
    const response = await documentApiClient.put(`/${documentId}/category`, { categoryId });
    return response.data;
  },
  
  getDocumentAnnotations: async (documentId: string): Promise<any[]> => {
    const response = await documentApiClient.get(`/${documentId}/annotations`);
    return response.data;
  },
  
  createAnnotation: async (documentId: string, annotation: any): Promise<any> => {
    const response = await documentApiClient.post(`/${documentId}/annotations`, annotation);
    return response.data;
  },
  
  updateAnnotation: async (documentId: string, annotationId: string, updates: any): Promise<any> => {
    const response = await documentApiClient.put(`/${documentId}/annotations/${annotationId}`, updates);
    return response.data;
  },
  
  deleteAnnotation: async (documentId: string, annotationId: string): Promise<void> => {
    await documentApiClient.delete(`/${documentId}/annotations/${annotationId}`);
  }
};

// src/frontend/services/assessmentService.ts
import { 
  Competency, 
  CompetencyLevel, 
  TraineePerformance 
} from '../components/assessment/AssessmentInterface';

// Create API client for assessment endpoints
const assessmentApiClient = createApiClient('/api/assessments', getToken);

export const assessmentService = {
  getAssessmentForm: async (assessmentId: string): Promise<any> => {
    const response = await assessmentApiClient.get(`/${assessmentId}/form`);
    return response.data;
  },
  
  getCompetencies: async (): Promise<Competency[]> => {
    const response = await assessmentApiClient.get('/competencies');
    return response.data;
  },
  
  savePerformance: async (performance: TraineePerformance): Promise<void> => {
    await assessmentApiClient.post('/performance', performance);
  },
  
  getTraineePerformance: async (traineeId: string, assessmentId: string): Promise<TraineePerformance | null> => {
    try {
      const response = await assessmentApiClient.get(`/performance/${traineeId}/${assessmentId}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response && error.response.status === 404) {
        return null;
      }
      throw error;
    }
  },
  
  getTraineeHistory: async (traineeId: string): Promise<any[]> => {
    const response = await assessmentApiClient.get(`/history/${traineeId}`);
    return response.data;
  },
  
  compareTraineePerformance: async (traineeId: string, assessmentIds: string[]): Promise<any> => {
    const response = await assessmentApiClient.post(`/compare/${traineeId}`, { assessmentIds });
    return response.data;
  }
};

// src/frontend/services/simulatorService.ts
import { 
  SimulatorConnectionStatus,
  SimulatorParameter,
  SimulatorEvent,
  FlightData,
  ExerciseScenario,
  SimulatorScore
} from '../components/simulator/SimulatorIntegration';

// Create API client for simulator endpoints
const simulatorApiClient = createApiClient('/api/simulator', getToken);

// WebSocket for real-time simulator data
let simulatorSocket: WebSocket | null = null;
let simulatorEventListeners: ((event: SimulatorEvent) => void)[] = [];
let flightDataListeners: ((data: FlightData) => void)[] = [];

export const simulatorService = {
  connect: async (): Promise<void> => {
    await simulatorApiClient.post('/connect');
    
    // Connect WebSocket for real-time data
    simulatorSocket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/simulator/ws`);
    
    simulatorSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'event') {
        simulatorEventListeners.forEach(listener => listener(data.event));
      } else if (data.type === 'flightData') {
        flightDataListeners.forEach(listener => listener(data.data));
      }
    };
  },
  
  disconnect: async (): Promise<void> => {
    if (simulatorSocket) {
      simulatorSocket.close();
      simulatorSocket = null;
    }
    
    await simulatorApiClient.post('/disconnect');
  },
  
  getConnectionStatus: async (): Promise<SimulatorConnectionStatus> => {
    const response = await simulatorApiClient.get('/status');
    return response.data.status;
  },
  
  getParameters: async (): Promise<SimulatorParameter[]> => {
    const response = await simulatorApiClient.get('/parameters');
    return response.data;
  },
  
  updateParameter: async (parameterId: string, value: number | boolean | string): Promise<void> => {
    await simulatorApiClient.put(`/parameters/${parameterId}`, { value });
  },
  
  getScenarios: async (): Promise<ExerciseScenario[]> => {
    const response = await simulatorApiClient.get('/scenarios');
    return response.data;
  },
  
  startScenario: async (scenarioId: string): Promise<void> => {
    await simulatorApiClient.post(`/scenarios/${scenarioId}/start`);
  },
  
  stopSimulation: async (): Promise<SimulatorScore> => {
    const response = await simulatorApiClient.post('/stop');
    return response.data;
  },
  
  pauseSimulation: async (): Promise<void> => {
    await simulatorApiClient.post('/pause');
  },
  
  resumeSimulation: async (): Promise<void> => {
    await simulatorApiClient.post('/resume');
  },
  
  resetSimulation: async (): Promise<void> => {
    await simulatorApiClient.post('/reset');
  },
  
  subscribeToEvents: (listener: (event: SimulatorEvent) => void): () => void => {
    simulatorEventListeners.push(listener);
    return () => {
      simulatorEventListeners = simulatorEventListeners.filter(l => l !== listener);
    };
  },
  
  subscribeToFlightData: (listener: (data: FlightData) => void): () => void => {
    flightDataListeners.push(listener);
    return () => {
      flightDataListeners = flightDataListeners.filter(l => l !== listener);
    };
  }
};

// src/frontend/services/complianceService.ts
import {
  RegulatoryFramework,
  RegulatoryRequirement,
  ComplianceTrainingMapping,
  ComplianceReport,
  TrainingProgram,
  ComplianceStatus
} from '../components/compliance/ComplianceEngine';

// Create API client for compliance endpoints
const complianceApiClient = createApiClient('/api/compliance', getToken);

export const complianceService = {
  getFrameworks: async (): Promise<RegulatoryFramework[]> => {
    const response = await complianceApiClient.get('/frameworks');
    return response.data;
  },
  
  getFramework: async (frameworkId: string): Promise<RegulatoryFramework> => {
    const response = await complianceApiClient.get(`/frameworks/${frameworkId}`);
    return response.data;
  },
  
  getTrainingPrograms: async (): Promise<TrainingProgram[]> => {
    const response = await complianceApiClient.get('/programs');
    return response.data;
  },
  
  getTrainingProgram: async (programId: string): Promise<TrainingProgram> => {
    const response = await complianceApiClient.get(`/programs/${programId}`);
    return response.data;
  },
  
  getMappings: async (programId: string, frameworkId?: string): Promise<ComplianceTrainingMapping[]> => {
    const params: any = { programId };
    if (frameworkId) {
      params.frameworkId = frameworkId;
    }
    
    const response = await complianceApiClient.get('/mappings', { params });
    return response.data;
  },
  
  addMapping: async (requirementId: string, syllabusElementId: string, status: ComplianceStatus): Promise<ComplianceTrainingMapping> => {
    const response = await complianceApiClient.post('/mappings', {
      requirementId,
      syllabusElementId,
      status,
      coveragePercent: status === ComplianceStatus.COMPLIANT ? 100 : 
                       status === ComplianceStatus.PARTIALLY_COMPLIANT ? 50 : 0
    });
    return response.data;
  },
  
  updateMapping: async (mappingId: string, updates: Partial<ComplianceTrainingMapping>): Promise<ComplianceTrainingMapping> => {
    const response = await complianceApiClient.put(`/mappings/${mappingId}`, updates);
    return response.data;
  },
  
  checkCompliance: async (programId: string, frameworkId: string): Promise<ComplianceReport> => {
    const response = await complianceApiClient.post('/check', { programId, frameworkId });
    return response.data;
  },
  
  generateReport: async (programId: string, frameworkId: string): Promise<string> => {
    const response = await complianceApiClient.post('/reports', { programId, frameworkId });
    return response.data.reportId;
  },
  
  getReport: async (reportId: string): Promise<ComplianceReport> => {
    const response = await complianceApiClient.get(`/reports/${reportId}`);
    return response.data;
  },
  
  getReports: async (): Promise<ComplianceReport[]> => {
    const response = await complianceApiClient.get('/reports');
    return response.data;
  },
  
  exportReport: async (reportId: string, format: 'pdf' | 'csv'): Promise<void> => {
    window.location.href = `${complianceApiClient.defaults.baseURL}/reports/${reportId}/export?format=${format}`;
  }
};

// src/frontend/services/analyticsService.ts
import { DashboardMetrics } from '../components/analytics/AnalyticsDashboard';

// Create API client for analytics endpoints
const analyticsApiClient = createApiClient('/api/analytics', getToken);

export const analyticsService = {
  getDashboardMetrics: async (startDate: Date, endDate: Date): Promise<DashboardMetrics> => {
    const response = await analyticsApiClient.get('/dashboard', {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });
    return response.data;
  },
  
  generateReport: async (reportType: string, filters: any): Promise<string> => {
    const response = await analyticsApiClient.post('/reports', {
      reportType,
      filters
    });
    return response.data.reportUrl;
  },
  
  getTraineeMetrics: async (traineeId: string): Promise<any> => {
    const response = await analyticsApiClient.get(`/trainees/${traineeId}`);
    return response.data;
  },
  
  getProgramMetrics: async (programId: string): Promise<any> => {
    const response = await analyticsApiClient.get(`/programs/${programId}`);
    return response.data;
  },
  
  getComplianceMetrics: async (): Promise<any> => {
    const response = await analyticsApiClient.get('/compliance');
    return response.data;
  }
};

// src/frontend/services/traineeService.ts
import {
  Trainee,
  TrainingProgram as TraineeProgram,
  TraineeProgress,
  TraineeAssessment,
  CompetencyRating,
  PerformanceMetric
} from '../components/trainee/TraineePerformance';

// Create API client for trainee endpoints
const traineeApiClient = createApiClient('/api/trainees', getToken);

export const traineeService = {
  getTrainee: async (traineeId: string): Promise<Trainee> => {
    const response = await traineeApiClient.get(`/${traineeId}`);
    return response.data;
  },
  
  getTrainees: async (): Promise<Trainee[]> => {
    const response = await traineeApiClient.get('/');
    return response.data;
  },
  
  getTraineePrograms: async (traineeId: string): Promise<TraineeProgram[]> => {
    const response = await traineeApiClient.get(`/${traineeId}/programs`);
    return response.data;
  },
  
  getTraineeProgress: async (traineeId: string, programId?: string): Promise<TraineeProgress[]> => {
    const params: any = {};
    if (programId) {
      params.programId = programId;
    }
    
    const response = await traineeApiClient.get(`/${traineeId}/progress`, { params });
    return response.data;
  },
  
  getTraineeAssessments: async (traineeId: string, programId?: string): Promise<TraineeAssessment[]> => {
    const params: any = {};
    if (programId) {
      params.programId = programId;
    }
    
    const response = await traineeApiClient.get(`/${traineeId}/assessments`, { params });
    return response.data;
  },
  
  getTraineeCompetencies: async (traineeId: string): Promise<CompetencyRating[]> => {
    const response = await traineeApiClient.get(`/${traineeId}/competencies`);
    return response.data;
  },
  
  getTraineeMetrics: async (traineeId: string): Promise<PerformanceMetric[]> => {
    const response = await traineeApiClient.get(`/${traineeId}/metrics`);
    return response.data;
  },
  
  exportTraineeReport: async (traineeId: string, programId?: string): Promise<void> => {
    const params: any = {};
    if (programId) {
      params.programId = programId;
    }
    
    window.location.href = `${traineeApiClient.defaults.baseURL}/${traineeId}/report/export?${new URLSearchParams(params)}`;
  }
};

// src/frontend/services/instructorService.ts
import {
  InstructorTrainingSession,
  InstructorAssessment,
  TraineeOverview
} from '../components/instructor/InstructorDashboard';

// Create API client for instructor endpoints
const instructorApiClient = createApiClient('/api/instructors', getToken);

export const instructorService = {
  getInstructorInfo: async (instructorId: string): Promise<any> => {
    const response = await instructorApiClient.get(`/${instructorId}`);
    return response.data;
  },
  
  getTrainingSessions: async (instructorId: string): Promise<InstructorTrainingSession[]> => {
    const response = await instructorApiClient.get(`/${instructorId}/sessions`);
    return response.data;
  },
  
  getTrainingSession: async (sessionId: string): Promise<InstructorTrainingSession> => {
    const response = await instructorApiClient.get(`/sessions/${sessionId}`);
    return response.data;
  },
  
  createTrainingSession: async (session: Omit<InstructorTrainingSession, 'id'>): Promise<InstructorTrainingSession> => {
    const response = await instructorApiClient.post('/sessions', session);
    return response.data;
  },
  
  updateTrainingSession: async (sessionId: string, updates: Partial<InstructorTrainingSession>): Promise<InstructorTrainingSession> => {
    const response = await instructorApiClient.put(`/sessions/${sessionId}`, updates);
    return response.data;
  },
  
  getAssessments: async (instructorId: string): Promise<InstructorAssessment[]> => {
    const response = await instructorApiClient.get(`/${instructorId}/assessments`);
    return response.data;
  },
  
  getAssessment: async (assessmentId: string): Promise<any> => {
    const response = await instructorApiClient.get(`/assessments/${assessmentId}`);
    return response.data;
  },
  
  scheduleAssessment: async (assessment: Omit<InstructorAssessment, 'id'>): Promise<InstructorAssessment> => {
    const response = await instructorApiClient.post('/assessments', assessment);
    return response.data;
  },
  
  gradeAssessment: async (assessmentId: string, score: number, feedback: any): Promise<InstructorAssessment> => {
    const response = await instructorApiClient.post(`/assessments/${assessmentId}/grade`, { score, feedback });
    return response.data;
  },
  
  getTrainees: async (instructorId: string): Promise<TraineeOverview[]> => {
    const response = await instructorApiClient.get(`/${instructorId}/trainees`);
    return response.data;
  },
  
  getTraineeOverview: async (traineeId: string): Promise<TraineeOverview> => {
    const response = await instructorApiClient.get(`/trainees/${traineeId}`);
    return response.data;
  }
};

// src/frontend/services/notificationService.ts
import { Notification, NotificationType } from '../components/notifications/NotificationSystem';

// Create API client for notification endpoints
const notificationApiClient = createApiClient('/api/notifications', getToken);

// WebSocket for real-time notifications
let notificationSocket: WebSocket | null = null;
let notificationListeners: ((notification: Notification) => void)[] = [];

export const notificationService = {
  getNotifications: async (): Promise<Notification[]> => {
    const response = await notificationApiClient.get('/');
    return response.data;
  },
  
  markAsRead: async (notificationId: string): Promise<void> => {
    await notificationApiClient.post(`/${notificationId}/read`);
  },
  
  markAllAsRead: async (): Promise<void> => {
    await notificationApiClient.post('/read-all');
  },
  
  deleteNotification: async (notificationId: string): Promise<void> => {
    await notificationApiClient.delete(`/${notificationId}`);
  },
  
  clearAll: async (): Promise<void> => {
    await notificationApiClient.delete('/clear-all');
  },
  
  getNotificationPreferences: async (): Promise<any[]> => {
    const response = await notificationApiClient.get('/preferences');
    return response.data;
  },
  
  updateNotificationPreference: async (preferenceId: string, updates: any): Promise<any> => {
    const response = await notificationApiClient.put(`/preferences/${preferenceId}`, updates);
    return response.data;
  },
  
  updateAllNotificationPreferences: async (updates: any): Promise<void> => {
    await notificationApiClient.put('/preferences', updates);
  },
  
  // Setup WebSocket connection for real-time notifications
  setupNotificationSocket: (): void => {
    if (notificationSocket) {
      return;
    }
    
    notificationSocket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/notifications/ws?token=${getToken()}`);
    
    notificationSocket.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      notificationListeners.forEach(listener => listener(notification));
    };
    
    notificationSocket.onclose = () => {
      // Reconnect after a delay
      setTimeout(() => {
        notificationService.setupNotificationSocket();
      }, 5000);
    };
  },
  
  // Subscribe to real-time notifications
  subscribeToNotifications: (callback: (notification: Notification) => void): () => void => {
    notificationListeners.push(callback);
    
    // Setup WebSocket if not already connected
    notificationService.setupNotificationSocket();
    
    return () => {
      notificationListeners = notificationListeners.filter(listener => listener !== callback);
    };
  }
};
