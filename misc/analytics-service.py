// services/analyticsService.ts
import apiClient, { ApiResponse } from './api';

// Performance data point
export interface PerformanceDataPoint {
  date: string;
  value: number;
  benchmark?: number;
}

// Competency rating
export interface CompetencyRating {
  id: string;
  name: string;
  rating: number; // 1-4 scale
  previousRating?: number;
}

// Training progress
export interface TrainingProgress {
  moduleId: string;
  moduleName: string;
  completed: number;
  total: number;
  percentage: number;
}

// Performance trend
export interface PerformanceTrend {
  trendType: 'improving' | 'declining' | 'stable';
  changeRate: number; // Percentage
  period: string; // e.g., "last 30 days"
}

// Trainee summary
export interface TraineeSummary {
  id: string;
  name: string;
  averageRating: number;
  completedModules: number;
  totalModules: number;
  lastActivity: string;
  trend: PerformanceTrend;
}

// Fleet statistics
export interface FleetStatistics {
  totalTrainees: number;
  activeTrainees: number;
  averageCompletionRate: number;
  averageRating: number;
  trainingHours: number;
  costPerHour: number;
}

// KPI metric
export interface KpiMetric {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  target?: number;
  unit?: string;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
}

// Analytics service
class AnalyticsService {
  private readonly baseUrl = '/analytics';

  // Get KPI dashboard metrics
  async getKpiMetrics(): Promise<KpiMetric[]> {
    const response = await apiClient.get<KpiMetric[]>(`${this.baseUrl}/kpi`);
    return response.data;
  }

  // Get trainee performance over time
  async getTraineePerformance(
    traineeId: string,
    period: 'week' | 'month' | 'quarter' | 'year' = 'month',
    competencyId?: string
  ): Promise<PerformanceDataPoint[]> {
    const response = await apiClient.get<PerformanceDataPoint[]>(
      `${this.baseUrl}/trainee/${traineeId}/performance`,
      {
        period,
        competencyId,
      }
    );
    return response.data;
  }

  // Get trainee competency ratings
  async getTraineeCompetencies(traineeId: string): Promise<CompetencyRating[]> {
    const response = await apiClient.get<CompetencyRating[]>(
      `${this.baseUrl}/trainee/${traineeId}/competencies`
    );
    return response.data;
  }

  // Get trainee training progress
  async getTraineeProgress(traineeId: string): Promise<TrainingProgress[]> {
    const response = await apiClient.get<TrainingProgress[]>(
      `${this.baseUrl}/trainee/${traineeId}/progress`
    );
    return response.data;
  }

  // Get all trainees summary
  async getTraineesSummary(
    limit: number = 10,
    offset: number = 0,
    sortBy: string = 'name',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<TraineeSummary[]> {
    const response = await apiClient.get<TraineeSummary[]>(
      `${this.baseUrl}/trainees`,
      {
        limit,
        offset,
        sortBy,
        sortOrder,
      }
    );
    return response.data;
  }

  // Get fleet statistics
  async getFleetStatistics(): Promise<FleetStatistics> {
    const response = await apiClient.get<FleetStatistics>(`${this.baseUrl}/fleet`);
    return response.data;
  }

  // Get performance comparison between trainees
  async getPerformanceComparison(
    traineeIds: string[],
    metric: string,
    period: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<{
    traineeId: string;
    traineeName: string;
    data: PerformanceDataPoint[];
  }[]> {
    const response = await apiClient.get<{
      traineeId: string;
      traineeName: string;
      data: PerformanceDataPoint[];
    }[]>(`${this.baseUrl}/comparison`, {
      traineeIds: traineeIds.join(','),
      metric,
      period,
    });
    return response.data;
  }

  // Get simulator telemetry data
  async getSimulatorTelemetry(
    sessionId: string,
    metrics: string[],
    startTime?: string,
    endTime?: string,
    resolution: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<{
    timestamp: string;
    values: Record<string, number>;
  }[]> {
    const response = await apiClient.get<{
      timestamp: string;
      values: Record<string, number>;
    }[]>(`${this.baseUrl}/simulator/${sessionId}/telemetry`, {
      metrics: metrics.join(','),
      startTime,
      endTime,
      resolution,
    });
    return response.data;
  }

  // Get predictive insights
  async getPredictiveInsights(traineeId: string): Promise<{
    predictedCompletionDate: string;
    predictedFinalScore: number;
    riskAreas: {
      competencyId: string;
      competencyName: string;
      riskLevel: 'high' | 'medium' | 'low';
      recommendation: string;
    }[];
    confidenceScore: number;
  }> {
    const response = await apiClient.get<{
      predictedCompletionDate: string;
      predictedFinalScore: number;
      riskAreas: {
        competencyId: string;
        competencyName: string;
        riskLevel: 'high' | 'medium' | 'low';
        recommendation: string;
      }[];
      confidenceScore: number;
    }>(`${this.baseUrl}/trainee/${traineeId}/predictions`);
    return response.data;
  }

  // Export analytics data
  async exportAnalytics(
    format: 'csv' | 'json' | 'pdf',
    filters: {
      startDate?: string;
      endDate?: string;
      traineeIds?: string[];
      metrics?: string[];
      groupBy?: string;
    }
  ): Promise<Blob> {
    const response = await apiClient.request<Blob>({
      method: 'POST',
      url: `${this.baseUrl}/export`,
      data: {
        format,
        ...filters,
      },
      responseType: 'blob',
    });
    return response.data;
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
