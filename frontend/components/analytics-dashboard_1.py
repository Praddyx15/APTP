// src/frontend/components/analytics/AnalyticsDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Tabs, Tab } from '../ui/Tabs';
import { DataTable, Column } from '../ui/DataTable';

// Types
export interface TraineeMetrics {
  id: string;
  name: string;
  overallScore: number;
  completedModules: number;
  totalModules: number;
  lastAssessmentDate: Date;
  riskLevel: 'low' | 'medium' | 'high';
  trend: 'improving' | 'stable' | 'declining';
  programCompletion: number;
  competencyScores: {
    competencyId: string;
    competencyName: string;
    score: number;
  }[];
}

export interface ProgramMetrics {
  id: string;
  name: string;
  traineesCount: number;
  avgCompletion: number;
  avgScore: number;
  moduleCompletionRates: {
    moduleId: string;
    moduleName: string;
    completionRate: number;
  }[];
  complianceStatus: 'compliant' | 'nonCompliant' | 'partiallyCompliant';
  startDate: Date;
  endDate: Date;
  instructors: string[];
}

export interface ComplianceMetric {
  requirementId: string;
  requirementName: string;
  description: string;
  status: 'met' | 'notMet' | 'partiallyMet';
  coverage: number;
  importance: 'critical' | 'high' | 'medium' | 'low';
  regulationReference: string;
}

export interface DashboardMetrics {
  overallStats: {
    activeTrainees: number;
    completedTrainees: number;
    avgProgramScore: number;
    complianceRate: number;
  };
  trainees: TraineeMetrics[];
  programs: ProgramMetrics[];
  complianceMetrics: ComplianceMetric[];
}

interface DataPoint {
  name: string;
  value: number;
}

// Components
interface KPICardProps {
  title: string;
  value: string | number;
  description?: string;
  change?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  description,
  change,
  icon
}) => {
  return (
    <Card className="h-full">
      <div className="flex items-start">
        {icon && (
          <div className="flex-shrink-0 p-3 rounded-md bg-blue-100 text-blue-600">
            {icon}
          </div>
        )}
        
        <div className={icon ? 'ml-4' : ''}>
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          <div className="mt-1 flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            
            {change && (
              <p className={`ml-2 flex items-baseline text-sm font-semibold ${
                change.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {change.isPositive ? (
                  <svg className="self-center flex-shrink-0 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="self-center flex-shrink-0 h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                <span>{Math.abs(change.value)}%</span>
              </p>
            )}
          </div>
          
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
      </div>
    </Card>
  );
};

interface ProgressBarProps {
  percentage: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  colorVariant?: 'default' | 'success' | 'warning' | 'danger';
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  label,
  size = 'md',
  colorVariant = 'default'
}) => {
  // Determine height based on size
  const heightClass = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  }[size];
  
  // Determine color based on variant
  const colorClass = {
    default: 'bg-blue-600',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500'
  }[colorVariant];

  // Determine color based on percentage when variant is default
  const dynamicColorClass = colorVariant === 'default' 
    ? percentage >= 80 ? 'bg-green-500' : percentage >= 60 ? 'bg-blue-500' : percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
    : colorClass;

  return (
    <div>
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm font-medium text-gray-700">{percentage}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${heightClass}`}>
        <div
          className={`${heightClass} rounded-full ${dynamicColorClass}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

interface ComplianceStatusProps {
  status: 'compliant' | 'nonCompliant' | 'partiallyCompliant';
  details?: string;
}

const ComplianceStatus: React.FC<ComplianceStatusProps> = ({ status, details }) => {
  let statusClass = '';
  let statusText = '';
  let statusIcon = null;
  
  switch (status) {
    case 'compliant':
      statusClass = 'bg-green-100 text-green-800';
      statusText = 'Compliant';
      statusIcon = (
        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
      break;
    case 'nonCompliant':
      statusClass = 'bg-red-100 text-red-800';
      statusText = 'Non-Compliant';
      statusIcon = (
        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
      break;
    case 'partiallyCompliant':
      statusClass = 'bg-yellow-100 text-yellow-800';
      statusText = 'Partially Compliant';
      statusIcon = (
        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
      break;
  }
  
  return (
    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium ${statusClass}`}>
      {statusIcon}
      {statusText}
    </div>
  );
};

// Placeholders for charts
const BarChartPlaceholder: React.FC<{ title: string }> = ({ title }) => (
  <div className="h-64 bg-gray-100 flex flex-col items-center justify-center p-4">
    <p className="text-gray-500 mb-2">{title}</p>
    <p className="text-sm text-gray-400">Bar chart visualization would be displayed here</p>
  </div>
);

const LineChartPlaceholder: React.FC<{ title: string }> = ({ title }) => (
  <div className="h-64 bg-gray-100 flex flex-col items-center justify-center p-4">
    <p className="text-gray-500 mb-2">{title}</p>
    <p className="text-sm text-gray-400">Line chart visualization would be displayed here</p>
  </div>
);

const PieChartPlaceholder: React.FC<{ title: string }> = ({ title }) => (
  <div className="h-64 bg-gray-100 flex flex-col items-center justify-center p-4 rounded-lg">
    <p className="text-gray-500 mb-2">{title}</p>
    <p className="text-sm text-gray-400">Pie chart visualization would be displayed here</p>
  </div>
);

// Main Analytics Dashboard
interface AnalyticsDashboardProps {
  metrics: DashboardMetrics;
  onGenerateReport: (reportType: string, filters: any) => void;
  onTraineeSelect: (traineeId: string) => void;
  onProgramSelect: (programId: string) => void;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  metrics,
  onGenerateReport,
  onTraineeSelect,
  onProgramSelect,
  dateRange,
  onDateRangeChange
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'trainees' | 'programs' | 'compliance'>('overview');
  const [reportType, setReportType] = useState('summary');
  const [showReportModal, setShowReportModal] = useState(false);
  const [filters, setFilters] = useState({
    program: '',
    status: '',
    performanceThreshold: ''
  });

  // Trainee Table Columns
  const traineeColumns: Column<TraineeMetrics>[] = [
    {
      key: 'name',
      header: 'Trainee Name',
      render: (trainee) => (
        <div className="font-medium text-blue-600 hover:text-blue-900">
          {trainee.name}
        </div>
      ),
      sortable: true
    },
    {
      key: 'overallScore',
      header: 'Score',
      render: (trainee) => (
        <div className="flex items-center">
          <span className={`font-medium ${
            trainee.overallScore >= 80 ? 'text-green-600' :
            trainee.overallScore >= 60 ? 'text-blue-600' :
            trainee.overallScore >= 40 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {trainee.overallScore}%
          </span>

          <span className="ml-2">
            {trainee.trend === 'improving' ? (
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            ) : trainee.trend === 'declining' ? (
              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </span>
        </div>
      ),
      sortable: true
    },
    {
      key: 'riskLevel',
      header: 'Risk Level',
      render: (trainee) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          trainee.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
          trainee.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {trainee.riskLevel.charAt(0).toUpperCase() + trainee.riskLevel.slice(1)}
        </span>
      ),
      sortable: true
    },
    {
      key: 'programCompletion',
      header: 'Completion',
      render: (trainee) => (
        <div className="w-24">
          <ProgressBar
            percentage={trainee.programCompletion}
            size="sm"
          />
        </div>
      ),
      sortable: true
    },
    {
      key: 'lastAssessmentDate',
      header: 'Last Assessment',
      render: (trainee) => new Date(trainee.lastAssessmentDate).toLocaleDateString(),
      sortable: true
    }
  ];

  // Program Table Columns
  const programColumns: Column<ProgramMetrics>[] = [
    {
      key: 'name',
      header: 'Program Name',
      render: (program) => (
        <div className="font-medium text-blue-600 hover:text-blue-900">
          {program.name}
        </div>
      ),
      sortable: true
    },
    {
      key: 'traineesCount',
      header: 'Trainees',
      render: (program) => program.traineesCount,
      sortable: true
    },
    {
      key: 'avgCompletion',
      header: 'Avg. Completion',
      render: (program) => (
        <div className="w-24">
          <ProgressBar
            percentage={program.avgCompletion}
            size="sm"
          />
        </div>
      ),
      sortable: true
    },
    {
      key: 'avgScore',
      header: 'Avg. Score',
      render: (program) => (
        <span className={`font-medium ${
          program.avgScore >= 80 ? 'text-green-600' :
          program.avgScore >= 60 ? 'text-blue-600' :
          program.avgScore >= 40 ? 'text-yellow-600' :
          'text-red-600'
        }`}>
          {program.avgScore}%
        </span>
      ),
      sortable: true
    },
    {
      key: 'complianceStatus',
      header: 'Compliance',
      render: (program) => (
        <ComplianceStatus status={program.complianceStatus} />
      ),
      sortable: true
    },
    {
      key: 'dateRange',
      header: 'Date Range',
      render: (program) => (
        <span>
          {new Date(program.startDate).toLocaleDateString()} - {new Date(program.endDate).toLocaleDateString()}
        </span>
      )
    }
  ];

  // Compliance Table Columns
  const complianceColumns: Column<ComplianceMetric>[] = [
    {
      key: 'requirementName',
      header: 'Requirement',
      render: (compliance) => (
        <div>
          <div className="font-medium">{compliance.requirementName}</div>
          <div className="text-sm text-gray-500">{compliance.description}</div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'status',
      header: 'Status',
      render: (compliance) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
          compliance.status === 'met' ? 'bg-green-100 text-green-800' :
          compliance.status === 'partiallyMet' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {compliance.status === 'met' ? 'Met' :
           compliance.status === 'partiallyMet' ? 'Partially Met' :
           'Not Met'}
        </span>
      ),
      sortable: true
    },
    {
      key: 'coverage',
      header: 'Coverage',
      render: (compliance) => (
        <div className="w-24">
          <ProgressBar
            percentage={compliance.coverage}
            size="sm"
            colorVariant={
              compliance.status === 'met' ? 'success' :
              compliance.status === 'partiallyMet' ? 'warning' :
              'danger'
            }
          />
        </div>
      ),
      sortable: true
    },
    {
      key: 'importance',
      header: 'Importance',
      render: (compliance) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          compliance.importance === 'critical' ? 'bg-red-100 text-red-800' :
          compliance.importance === 'high' ? 'bg-orange-100 text-orange-800' :
          compliance.importance === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-green-100 text-green-800'
        }`}>
          {compliance.importance.charAt(0).toUpperCase() + compliance.importance.slice(1)}
        </span>
      ),
      sortable: true
    },
    {
      key: 'regulationReference',
      header: 'Regulation Ref.',
      render: (compliance) => compliance.regulationReference,
      sortable: true
    }
  ];

  const tabs: Tab[] = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <KPICard
              title="Active Trainees"
              value={metrics.overallStats.activeTrainees}
              change={{ value: 5.2, isPositive: true }}
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
              }
            />
            
            <KPICard
              title="Completed Training"
              value={metrics.overallStats.completedTrainees}
              description="Trainees who completed their program"
              change={{ value: 8.1, isPositive: true }}
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                </svg>
              }
            />
            
            <KPICard
              title="Average Score"
              value={`${metrics.overallStats.avgProgramScore}%`}
              change={{ value: 2.3, isPositive: true }}
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              }
            />
            
            <KPICard
              title="Compliance Rate"
              value={`${metrics.overallStats.complianceRate}%`}
              change={{ value: 1.2, isPositive: false }}
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
              }
            />
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 mb-6">
            <Card>
              <h3 className="text-lg font-medium mb-4">Program Completion Rates</h3>
              <BarChartPlaceholder title="Program vs. Completion %" />
            </Card>
            
            <Card>
              <h3 className="text-lg font-medium mb-4">Score Trends (Last 6 Months)</h3>
              <LineChartPlaceholder title="Month vs. Average Score" />
            </Card>
          </div>
          
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 mb-6">
            <Card>
              <h3 className="text-lg font-medium mb-4">Compliance Status</h3>
              <PieChartPlaceholder title="Compliance Distribution" />
            </Card>
            
            <Card>
              <h3 className="text-lg font-medium mb-4">Risk Assessment</h3>
              <PieChartPlaceholder title="Trainee Risk Levels" />
            </Card>
            
            <Card>
              <h3 className="text-lg font-medium mb-4">Top Competencies</h3>
              <BarChartPlaceholder title="Competency vs. Average Score" />
            </Card>
          </div>
          
          {/* Recent Activity (Top 5 Trainees) */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Recent Trainee Activity</h3>
              <Button
                variant="outline"
                size="small"
                onClick={() => setActiveTab('trainees')}
              >
                View All
              </Button>
            </div>
            
            <DataTable
              columns={traineeColumns}
              data={metrics.trainees.slice(0, 5)}
              keyExtractor={(trainee) => trainee.id}
              onRowClick={(trainee) => onTraineeSelect(trainee.id)}
            />
          </Card>
        </div>
      )
    },
    {
      id: 'trainees',
      label: 'Trainees',
      content: (
        <div>
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <h3 className="text-lg font-medium mb-2 sm:mb-0">Trainee Performance</h3>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={filters.program}
                  onChange={(e) => setFilters({ ...filters, program: e.target.value })}
                >
                  <option value="">All Programs</option>
                  {metrics.programs.map(program => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
                
                <select
                  className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="onHold">On Hold</option>
                </select>
                
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => {
                    setReportType('traineePerformance');
                    setShowReportModal(true);
                  }}
                >
                  Export Report
                </Button>
              </div>
            </div>
            
            <DataTable
              columns={traineeColumns}
              data={metrics.trainees}
              keyExtractor={(trainee) => trainee.id}
              onRowClick={(trainee) => onTraineeSelect(trainee.id)}
              pagination={{
                pageSize: 10,
                totalItems: metrics.trainees.length,
                currentPage: 1,
                onPageChange: () => {}
              }}
            />
          </Card>
        </div>
      )
    },
    {
      id: 'programs',
      label: 'Programs',
      content: (
        <div>
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <h3 className="text-lg font-medium mb-2 sm:mb-0">Training Programs</h3>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => {
                    setReportType('programEffectiveness');
                    setShowReportModal(true);
                  }}
                >
                  Export Report
                </Button>
              </div>
            </div>
            
            <DataTable
              columns={programColumns}
              data={metrics.programs}
              keyExtractor={(program) => program.id}
              onRowClick={(program) => onProgramSelect(program.id)}
              pagination={{
                pageSize: 10,
                totalItems: metrics.programs.length,
                currentPage: 1,
                onPageChange: () => {}
              }}
            />
          </Card>
          
          {/* Program Effectiveness Charts */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 mt-6">
            <Card>
              <h3 className="text-lg font-medium mb-4">Module Completion Rates</h3>
              <BarChartPlaceholder title="Module vs. Completion %" />
            </Card>
            
            <Card>
              <h3 className="text-lg font-medium mb-4">Program Success Metrics</h3>
              <BarChartPlaceholder title="Program vs. Success Metrics" />
            </Card>
          </div>
        </div>
      )
    },
    {
      id: 'compliance',
      label: 'Compliance',
      content: (
        <div>
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <h3 className="text-lg font-medium mb-2 sm:mb-0">Regulatory Compliance</h3>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={filters.program}
                  onChange={(e) => setFilters({ ...filters, program: e.target.value })}
                >
                  <option value="">All Programs</option>
                  {metrics.programs.map(program => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
                
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => {
                    setReportType('complianceStatus');
                    setShowReportModal(true);
                  }}
                >
                  Export Report
                </Button>
              </div>
            </div>
            
            <DataTable
              columns={complianceColumns}
              data={metrics.complianceMetrics}
              keyExtractor={(compliance) => compliance.requirementId}
              pagination={{
                pageSize: 10,
                totalItems: metrics.complianceMetrics.length,
                currentPage: 1,
                onPageChange: () => {}
              }}
            />
          </Card>
          
          {/* Compliance Charts */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 mt-6">
            <Card>
              <h3 className="text-lg font-medium mb-4">Compliance by Importance</h3>
              <PieChartPlaceholder title="Compliance Status by Importance Level" />
            </Card>
            
            <Card>
              <h3 className="text-lg font-medium mb-4">Compliance Trend</h3>
              <LineChartPlaceholder title="Compliance Rate Over Time" />
            </Card>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="analytics-dashboard">
      {/* Date Range Selector */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold mb-2 sm:mb-0">Training Analytics Dashboard</h2>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center">
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mr-2">
                From:
              </label>
              <input
                type="date"
                id="start-date"
                className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={dateRange.startDate.toISOString().split('T')[0]}
                onChange={(e) => onDateRangeChange(new Date(e.target.value), dateRange.endDate)}
              />
            </div>
            
            <div className="flex items-center">
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mr-2">
                To:
              </label>
              <input
                type="date"
                id="end-date"
                className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={dateRange.endDate.toISOString().split('T')[0]}
                onChange={(e) => onDateRangeChange(dateRange.startDate, new Date(e.target.value))}
              />
            </div>
            
            <Button
              variant="primary"
              onClick={() => {
                setReportType('summary');
                setShowReportModal(true);
              }}
            >
              Generate Report
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Main content tabs */}
      <Tabs
        tabs={tabs}
        defaultTabId="overview"
        onChange={(tabId) => setActiveTab(tabId as any)}
      />
      
      {/* Report generation modal (placeholder) */}
      {showReportModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Generate Report
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Select the type of report you want to generate and any filters to apply.
                      </p>
                      
                      <div className="mt-4">
                        <label htmlFor="report-type" className="block text-sm font-medium text-gray-700 mb-1">
                          Report Type
                        </label>
                        <select
                          id="report-type"
                          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                          value={reportType}
                          onChange={(e) => setReportType(e.target.value)}
                        >
                          <option value="summary">Summary Report</option>
                          <option value="traineePerformance">Trainee Performance Report</option>
                          <option value="programEffectiveness">Program Effectiveness Report</option>
                          <option value="complianceStatus">Compliance Status Report</option>
                        </select>
                      </div>
                      
                      <div className="mt-4">
                        <label htmlFor="report-program" className="block text-sm font-medium text-gray-700 mb-1">
                          Program
                        </label>
                        <select
                          id="report-program"
                          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                          value={filters.program}
                          onChange={(e) => setFilters({ ...filters, program: e.target.value })}
                        >
                          <option value="">All Programs</option>
                          {metrics.programs.map(program => (
                            <option key={program.id} value={program.id}>
                              {program.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="mt-4">
                        <label htmlFor="performance-threshold" className="block text-sm font-medium text-gray-700 mb-1">
                          Performance Threshold
                        </label>
                        <select
                          id="performance-threshold"
                          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                          value={filters.performanceThreshold}
                          onChange={(e) => setFilters({ ...filters, performanceThreshold: e.target.value })}
                        >
                          <option value="">No Threshold</option>
                          <option value="below40">Below 40%</option>
                          <option value="below60">Below 60%</option>
                          <option value="above80">Above 80%</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    onGenerateReport(reportType, filters);
                    setShowReportModal(false);
                  }}
                >
                  Generate
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowReportModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};