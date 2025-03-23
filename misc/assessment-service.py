// services/assessmentService.ts
import apiClient, { ApiResponse } from './api';

// Assessment type
export type AssessmentType = 'theoretical' | 'practical' | 'simulator' | 'checkride';

// Rating scale (1-4)
export type RatingScale = 1 | 2 | 3 | 4;

// Competency assessment
export interface CompetencyAssessment {
  id: string;
  competencyId: string;
  competencyName: string;
  rating: RatingScale;
  comments?: string;
  evidenceIds?: string[]; // References to evidence files
}

// Assessment status
export type AssessmentStatus = 
  'draft' | 
  'in_progress' | 
  'completed' | 
  'submitted' | 
  'approved' | 
  'rejected';

// Assessment item
export interface AssessmentItem {
  id: string;
  moduleId: string;
  moduleName: string;
  lessonId: string;
  lessonName: string;
  exerciseId: string;
  exerciseName: string;
  type: AssessmentType;
  status: AssessmentStatus;
  competencies: CompetencyAssessment[];
  overallRating?: RatingScale;
  instructorId: string;
  instructorName: string;
  traineeId: string;
  traineeName: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  duration?: number; // in minutes
  location?: string;
  notes?: string;
  signature?: {
    instructorSignature: string;
    traineeSignature?: string;
    signedAt: string;
  };
  biometricData?: {
    heartRate?: number[];
    eyeTracking?: any;
    stressLevel?: number[];
    timestamps: string[];
  };
}

// New assessment request
export interface NewAssessmentRequest {
  moduleId: string;
  lessonId: string;
  exerciseId: string;
  type: AssessmentType;
  traineeId: string;
  instructorId?: string; // If not provided, current user is assumed
  scheduledDate?: string;
  duration?: number;
  location?: string;
}

// Assessment update request
export interface AssessmentUpdateRequest {
  status?: AssessmentStatus;
  competencies?: CompetencyAssessment[];
  overallRating?: RatingScale;
  notes?: string;
  completedAt?: string;
  duration?: number;
  location?: string;
}

// Assessment service
class AssessmentService {
  private readonly baseUrl = '/assessment';

  // Get all assessments
  async getAllAssessments(
    status?: AssessmentStatus,
    traineeId?: string,
    instructorId?: string,
    from?: string,
    to?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ assessments: AssessmentItem[]; total: number }> {
    const params: any = { limit, offset };
    if (status) params.status = status;
    if (traineeId) params.traineeId = traineeId;
    if (instructorId) params.instructorId = instructorId;
    if (from) params.from = from;
    if (to) params.to = to;
    
    const response = await apiClient.get<{ assessments: AssessmentItem[]; total: number }>(
      `${this.baseUrl}`,
      params
    );
    return response.data;
  }

  // Get assessment by ID
  async getAssessment(id: string): Promise<AssessmentItem> {
    const response = await apiClient.get<AssessmentItem>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  // Create a new assessment
  async createAssessment(assessment: NewAssessmentRequest): Promise<AssessmentItem> {
    const response = await apiClient.post<AssessmentItem>(`${this.baseUrl}`, assessment);
    return response.data;
  }

  // Update an assessment
  async updateAssessment(id: string, updates: AssessmentUpdateRequest): Promise<AssessmentItem> {
    const response = await apiClient.put<AssessmentItem>(`${this.baseUrl}/${id}`, updates);
    return response.data;
  }

  // Submit an assessment for approval
  async submitAssessment(id: string, signature?: string): Promise<AssessmentItem> {
    const response = await apiClient.post<AssessmentItem>(
      `${this.baseUrl}/${id}/submit`,
      { signature }
    );
    return response.data;
  }

  // Approve an assessment (trainee signature)
  async approveAssessment(id: string, signature: string): Promise<AssessmentItem> {
    const response = await apiClient.post<AssessmentItem>(
      `${this.baseUrl}/${id}/approve`,
      { signature }
    );
    return response.data;
  }

  // Reject an assessment (trainee feedback)
  async rejectAssessment(id: string, reason: string): Promise<AssessmentItem> {
    const response = await apiClient.post<AssessmentItem>(
      `${this.baseUrl}/${id}/reject`,
      { reason }
    );
    return response.data;
  }

  // Upload evidence (photos, videos, documents)
  async uploadEvidence(
    assessmentId: string,
    competencyId: string,
    file: File,
    onProgress?: (percentage: number) => void
  ): Promise<{ id: string; fileUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.request<{ id: string; fileUrl: string }>({
      method: 'POST',
      url: `${this.baseUrl}/${assessmentId}/competency/${competencyId}/evidence`,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentage = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentage);
        }
      },
    });
    
    return response.data;
  }

  // Delete evidence
  async deleteEvidence(assessmentId: string, evidenceId: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${assessmentId}/evidence/${evidenceId}`);
  }

  // Add biometric data
  async addBiometricData(
    assessmentId: string,
    data: {
      heartRate?: number[];
      eyeTracking?: any;
      stressLevel?: number[];
      timestamps: string[];
    }
  ): Promise<AssessmentItem> {
    const response = await apiClient.post<AssessmentItem>(
      `${this.baseUrl}/${assessmentId}/biometrics`,
      data
    );
    return response.data;
  }

  // Get performance history for a trainee
  async getTraineePerformanceHistory(
    traineeId: string,
    competencyId?: string,
    limit: number = 10
  ): Promise<{
    assessments: AssessmentItem[];
    averageRating: number;
    trend: 'improving' | 'declining' | 'stable';
    changeRate: number;
  }> {
    const params: any = { limit };
    if (competencyId) params.competencyId = competencyId;
    
    const response = await apiClient.get<{
      assessments: AssessmentItem[];
      averageRating: number;
      trend: 'improving' | 'declining' | 'stable';
      changeRate: number;
    }>(`${this.baseUrl}/trainee/${traineeId}/history`, params);
    
    return response.data;
  }

  // Get assessment statistics
  async getAssessmentStatistics(
    traineeId?: string,
    instructorId?: string,
    from?: string,
    to?: string
  ): Promise<{
    totalAssessments: number;
    completedAssessments: number;
    averageRating: number;
    ratingDistribution: Record<RatingScale, number>;
    completionTime: { average: number; min: number; max: number };
    byType: Record<AssessmentType, number>;
  }> {
    const params: any = {};
    if (traineeId) params.traineeId = traineeId;
    if (instructorId) params.instructorId = instructorId;
    if (from) params.from = from;
    if (to) params.to = to;
    
    const response = await apiClient.get<{
      totalAssessments: number;
      completedAssessments: number;
      averageRating: number;
      ratingDistribution: Record<RatingScale, number>;
      completionTime: { average: number; min: number; max: number };
      byType: Record<AssessmentType, number>;
    }>(`${this.baseUrl}/statistics`, params);
    
    return response.data;
  }
}

export const assessmentService = new AssessmentService();
export default assessmentService;
