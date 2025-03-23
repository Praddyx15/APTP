// src/frontend/components/trainee/TraineePerformance.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Tabs, Tab } from '../ui/Tabs';
import { DataTable, Column } from '../ui/DataTable';

// Types
export interface Trainee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: 'active' | 'inactive' | 'on_leave';
  profileImage?: string;
  organization?: string;
  department?: string;
  enrolledPrograms: string[];
}

export interface TrainingProgram {
  id: string;
  name: string;
  description: string;
  modules: TrainingModule[];
  startDate?: Date;
  endDate?: Date;
  status: 'active' | 'completed' | 'archived' | 'draft';
  completionCriteria: {
    requiredModules: string[];
    minimumScore: number;
    mandatoryAssessments: string[];
  };
}

export interface TrainingModule {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  lessons: TrainingLesson[];
  status: 'active' | 'completed' | 'locked';
  isMandatory: boolean;
}

export interface TrainingLesson {
  id: string;
  name: string;
  description: string;
  content: string;
  exercises: TrainingExercise[];
  duration: number; // in minutes
  status: 'active' | 'completed' | 'locked';
  isMandatory: boolean;
}

export interface TrainingExercise {
  id: string;
  name: string;
  description: string;
  type: 'knowledge_check' | 'simulation' | 'practical' | 'assessment';
  status: 'active' | 'completed' | 'locked';
  score?: number;
  maxScore: number;
  attempts: number;
  isMandatory: boolean;
}

export interface TraineeProgress {
  traineeId: string;
  programId: string;
  overallProgress: number; // percentage
  overallScore: number;
  startDate: Date;
  lastActivityDate: Date;
  estimatedCompletion?: Date;
  status: 'on_track' | 'behind' | 'ahead' | 'completed';
  moduleProgress: {
    moduleId: string;
    status: 'not_started' | 'in_progress' | 'completed';
    progress: number;
    score?: number;
    startDate?: Date;
    completionDate?: Date;
    lessonProgress: {
      lessonId: string;
      status: 'not_started' | 'in_progress' | 'completed';
      progress: number;
      score?: number;
      exerciseProgress: {
        exerciseId: string;
        status: 'not_started' | 'in_progress' | 'completed';
        score?: number;
        attempts: number;
        lastAttemptDate?: Date;
        timeSpent: number; // in minutes
      }[];
    }[];
  }[];
}

export interface TraineeAssessment {
  id: string;
  traineeId: string;
  programId: string;
  moduleId: string;
  lessonId?: string;
  exerciseId?: string;
  assessmentName: string;
  score: number;
  maxScore: number;
  date: Date;
  completionTime: number; // in minutes
  feedbackItems: {
    aspect: string;
    score: number;
    maxScore: number;
    feedback: string;
    type: 'strength' | 'improvement' | 'neutral';
  }[];
  instructorId?: string;
  instructorName?: string;
  status: 'passed' | 'failed' | 'pending_review';
}

export interface CompetencyRating {
  id: string;
  traineeId: string;
  competencyId: string;
  competencyName: string;
  competencyCategory: string;
  rating: 1 | 2 | 3 | 4 | 5;
  maxRating: 5;
  instructorId?: string;
  instructorName?: string;
  date: Date;
  notes?: string;
  trend: 'improving' | 'declining' | 'stable';
  previousRatings: {
    rating: number;
    date: Date;
  }[];
}

export interface PerformanceMetric {
  id: string;
  traineeId: string;
  metricName: string;
  metricCategory: string;
  value: number;
  unit: string;
  date: Date;
  benchmark?: number;
  percentile?: number;
  isHigherBetter: boolean;
  trend: 'improving' | 'declining' | 'stable';
  history: {
    value: number;
    date: Date;
  }[];
}

// Trainee Performance Component
interface TraineePerformanceProps {
  trainee: Trainee;
  programs: TrainingProgram[];
  progress: TraineeProgress[];
  assessments: TraineeAssessment[];
  competencies: CompetencyRating[];
  metrics: PerformanceMetric[];
  onExportReport: (traineeId: string, programId?: string) => Promise<void>;
}

export const TraineePerformance: React.FC<TraineePerformanceProps> = ({
  trainee,
  programs,
  progress,
  assessments,
  competencies,
  metrics,
  onExportReport
}) => {
  const [selectedProgramId, setSelectedProgramId] = useState<string | 'all'>('all');
  const [filteredProgress, setFilteredProgress] = useState<TraineeProgress[]>(progress);
  const [filteredAssessments, setFilteredAssessments] = useState<TraineeAssessment[]>(assessments);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Update filtered data when program selection changes
  useEffect(() => {
    if (selectedProgramId === 'all') {
      setFilteredProgress(progress);
      setFilteredAssessments(assessments);
    } else {
      setFilteredProgress(progress.filter(p => p.programId === selectedProgramId));
      setFilteredAssessments(assessments.filter(a => a.programId === selectedProgramId));
    }
  }, [selectedProgramId, progress, assessments]);
  
  // Toggle expanded modules
  const toggleModule = (moduleId: string) => {
    const newExpandedModules = new Set(expandedModules);
    if (newExpandedModules.has(moduleId)) {
      newExpandedModules.delete(moduleId);
    } else {
      newExpandedModules.add(moduleId);
    }
    setExpandedModules(newExpandedModules);
  };
  
  // Toggle expanded lessons
  const toggleLesson = (lessonId: string) => {
    const newExpandedLessons = new Set(expandedLessons);
    if (newExpandedLessons.has(lessonId)) {
      newExpandedLessons.delete(lessonId);
    } else {
      newExpandedLessons.add(lessonId);
    }
    setExpandedLessons(newExpandedLessons);
  };
  
  // Export trainee report
  const handleExportReport = async () => {
    try {
      await onExportReport(trainee.id, selectedProgramId === 'all' ? undefined : selectedProgramId);
      setAlertMessage({
        type: 'success',
        message: 'Performance report exported successfully.'
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to export report: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };
  
  // Get program name by ID
  const getProgramName = (programId: string) => {
    const program = programs.find(p => p.id === programId);
    return program ? program.name : 'Unknown Program';
  };
  
  // Get status badge JSX
  const getStatusBadge = (status: string) => {
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-800';
    
    switch (status) {
      case 'on_track':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case 'behind':
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        break;
      case 'ahead':
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        break;
      case 'completed':
        bgColor = 'bg-purple-100';
        textColor = 'text-purple-800';
        break;
      case 'passed':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case 'failed':
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        break;
      case 'pending_review':
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
        break;
      case 'active':
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        break;
      case 'not_started':
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-800';
        break;
      case 'in_progress':
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
        break;
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        {status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
      </span>
    );
  };
  
  // Get trend indicator
  const getTrendIndicator = (trend: string) => {
    switch (trend) {
      case 'improving':
        return (
          <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
          </svg>
        );
      case 'declining':
        return (
          <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        );
      case 'stable':
      default:
        return (
          <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14"></path>
          </svg>
        );
    }
  };
  
  // Define assessment table columns
  const assessmentColumns: Column<TraineeAssessment>[] = [
    {
      key: 'assessmentName',
      header: 'Assessment',
      render: (assessment) => assessment.assessmentName,
      sortable: true
    },
    {
      key: 'score',
      header: 'Score',
      render: (assessment) => (
        <span className="font-medium">
          {assessment.score} / {assessment.maxScore} ({Math.round((assessment.score / assessment.maxScore) * 100)}%)
        </span>
      ),
      sortable: true
    },
    {
      key: 'status',
      header: 'Status',
      render: (assessment) => getStatusBadge(assessment.status),
      sortable: true
    },
    {
      key: 'date',
      header: 'Date',
      render: (assessment) => new Date(assessment.date).toLocaleDateString(),
      sortable: true
    },
    {
      key: 'program',
      header: 'Program',
      render: (assessment) => getProgramName(assessment.programId),
      sortable: true
    }
  ];
  
  // Define competency table columns
  const competencyColumns: Column<CompetencyRating>[] = [
    {
      key: 'competencyName',
      header: 'Competency',
      render: (competency) => (
        <div>
          <div className="font-medium">{competency.competencyName}</div>
          <div className="text-xs text-gray-500">{competency.competencyCategory}</div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (competency) => (
        <div className="flex items-center space-x-1">
          {Array.from({ length: competency.maxRating }).map((_, i) => (
            <div 
              key={i}
              className={`w-5 h-5 rounded-sm ${i < competency.rating ? 'bg-blue-500' : 'bg-gray-200'}`}
            ></div>
          ))}
          <span className="ml-2 font-medium">
            {competency.rating}/{competency.maxRating}
          </span>
        </div>
      ),
      sortable: true
    },
    {
      key: 'date',
      header: 'Date',
      render: (competency) => new Date(competency.date).toLocaleDateString(),
      sortable: true
    },
    {
      key: 'trend',
      header: 'Trend',
      render: (competency) => (
        <div className="flex items-center">
          {getTrendIndicator(competency.trend)}
          <span className="ml-1 text-sm">
            {competency.trend.charAt(0).toUpperCase() + competency.trend.slice(1)}
          </span>
        </div>
      ),
      sortable: true
    }
  ];
  
  // Define metrics table columns
  const metricColumns: Column<PerformanceMetric>[] = [
    {
      key: 'metricName',
      header: 'Metric',
      render: (metric) => (
        <div>
          <div className="font-medium">{metric.metricName}</div>
          <div className="text-xs text-gray-500">{metric.metricCategory}</div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'value',
      header: 'Value',
      render: (metric) => (
        <span className="font-medium">
          {metric.value} {metric.unit}
        </span>
      ),
      sortable: true
    },
    {
      key: 'benchmark',
      header: 'Benchmark',
      render: (metric) => (
        <div>
          {metric.benchmark ? (
            <div className="font-medium">
              {metric.benchmark} {metric.unit}
              {metric.percentile && (
                <span className="ml-1 text-xs text-gray-500">
                  (P{metric.percentile})
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-500">N/A</span>
          )}
        </div>
      )
    },
    {
      key: 'trend',
      header: 'Trend',
      render: (metric) => (
        <div className="flex items-center">
          {getTrendIndicator(metric.trend)}
          <span className="ml-1 text-sm">
            {metric.trend.charAt(0).toUpperCase() + metric.trend.slice(1)}
          </span>
        </div>
      ),
      sortable: true
    },
    {
      key: 'date',
      header: 'Date',
      render: (metric) => new Date(metric.date).toLocaleDateString(),
      sortable: true
    }
  ];
  
  const tabs: Tab[] = [
    {
      id: 'progress',
      label: 'Progress',
      content: (
        <div className="space-y-6">
          {filteredProgress.length > 0 ? (
            <>
              {filteredProgress.map(progress => {
                // Get the program details
                const program = programs.find(p => p.id === progress.programId);
                if (!program) return null;
                
                return (
                  <Card key={progress.programId} className="mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium">{getProgramName(progress.programId)}</h3>
                        <p className="text-sm text-gray-500">
                          Started: {new Date(progress.startDate).toLocaleDateString()} | 
                          Last Activity: {new Date(progress.lastActivityDate).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="mt-2 md:mt-0 flex flex-wrap gap-2">
                        {getStatusBadge(progress.status)}
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Overall Score: {progress.overallScore}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-1">
                        <div className="text-sm font-medium">Overall Progress</div>
                        <div className="text-sm">{progress.overallProgress}%</div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${
                            progress.status === 'behind' ? 'bg-red-600' :
                            progress.status === 'ahead' ? 'bg-blue-600' :
                            progress.status === 'completed' ? 'bg-purple-600' :
                            'bg-green-600'
                          }`}
                          style={{ width: `${progress.overallProgress}%` }}
                        ></div>
                      </div>
                      
                      {progress.estimatedCompletion && (
                        <p className="text-xs text-gray-500 mt-1">
                          Estimated completion: {new Date(progress.estimatedCompletion).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    
                    <div className="mb-4">
                      <h4 className="text-base font-medium mb-2">Module Progress</h4>
                    </div>
                    
                    <div className="space-y-2">
                      {progress.moduleProgress.map(moduleProgress => {
                        const module = program.modules.find(m => m.id === moduleProgress.moduleId);
                        if (!module) return null;
                        
                        return (
                          <div key={moduleProgress.moduleId}>
                            <div 
                              className={`p-3 rounded-lg cursor-pointer ${
                                expandedModules.has(moduleProgress.moduleId) ? 'bg-gray-100' : 'bg-gray-50 hover:bg-gray-100'
                              }`}
                              onClick={() => toggleModule(moduleProgress.moduleId)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className={`mr-2 ${expandedModules.has(moduleProgress.moduleId) ? 'transform rotate-90' : ''}`}>
                                    <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                                    </svg>
                                  </div>
                                  <div className="font-medium">{module.name}</div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {getStatusBadge(moduleProgress.status)}
                                  <span>{moduleProgress.progress}%</span>
                                </div>
                              </div>
                              
                              <div className="mt-2">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      moduleProgress.status === 'completed' ? 'bg-green-600' :
                                      moduleProgress.status === 'in_progress' ? 'bg-blue-600' :
                                      'bg-gray-400'
                                    }`}
                                    style={{ width: `${moduleProgress.progress}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                            
                            {expandedModules.has(moduleProgress.moduleId) && (
                              <div className="ml-6 mt-2 space-y-2">
                                {moduleProgress.lessonProgress.map(lessonProgress => {
                                  const lesson = module.lessons.find(l => l.id === lessonProgress.lessonId);
                                  if (!lesson) return null;
                                  
                                  return (
                                    <div key={lessonProgress.lessonId}>
                                      <div 
                                        className={`p-3 rounded-lg cursor-pointer ${
                                          expandedLessons.has(lessonProgress.lessonId) ? 'bg-gray-200' : 'bg-gray-100 hover:bg-gray-200'
                                        }`}
                                        onClick={() => toggleLesson(lessonProgress.lessonId)}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center">
                                            <div className={`mr-2 ${expandedLessons.has(lessonProgress.lessonId) ? 'transform rotate-90' : ''}`}>
                                              <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                                              </svg>
                                            </div>
                                            <div className="text-sm font-medium">{lesson.name}</div>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            {getStatusBadge(lessonProgress.status)}
                                            <span className="text-sm">{lessonProgress.progress}%</span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {expandedLessons.has(lessonProgress.lessonId) && (
                                        <div className="ml-6 mt-2 space-y-2">
                                          {lessonProgress.exerciseProgress.map((exerciseProgress, index) => {
                                            const exercise = lesson.exercises.find(e => e.id === exerciseProgress.exerciseId);
                                            if (!exercise) return null;
                                            
                                            return (
                                              <div key={exerciseProgress.exerciseId} className="p-2 bg-white rounded border border-gray-200">
                                                <div className="flex items-center justify-between">
                                                  <div className="text-sm">{exercise.name}</div>
                                                  <div className="flex items-center space-x-2">
                                                    {getStatusBadge(exerciseProgress.status)}
                                                    {exerciseProgress.score !== undefined && (
                                                      <span className="text-sm font-medium">
                                                        {exerciseProgress.score}/{exercise.maxScore}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                  Attempts: {exerciseProgress.attempts} | 
                                                  Time spent: {exerciseProgress.timeSpent} min
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500">No progress data available for the selected program.</p>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'assessments',
      label: 'Assessments',
      content: (
        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-medium">Assessment Results</h3>
          </div>
          
          {filteredAssessments.length > 0 ? (
            <DataTable
              columns={assessmentColumns}
              data={filteredAssessments}
              keyExtractor={(item) => item.id}
              pagination={{
                pageSize: 10,
                totalItems: filteredAssessments.length,
                currentPage: 1,
                onPageChange: () => {}
              }}
            />
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500">No assessment data available for the selected program.</p>
            </div>
          )}
        </Card>
      )
    },
    {
      id: 'competencies',
      label: 'Competencies',
      content: (
        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-medium">Competency Ratings</h3>
          </div>
          
          {competencies.length > 0 ? (
            <DataTable
              columns={competencyColumns}
              data={competencies}
              keyExtractor={(item) => item.id}
              pagination={{
                pageSize: 10,
                totalItems: competencies.length,
                currentPage: 1,
                onPageChange: () => {}
              }}
            />
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500">No competency data available for this trainee.</p>
            </div>
          )}
        </Card>
      )
    },
    {
      id: 'metrics',
      label: 'Performance Metrics',
      content: (
        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-medium">Performance Metrics</h3>
          </div>
          
          {metrics.length > 0 ? (
            <DataTable
              columns={metricColumns}
              data={metrics}
              keyExtractor={(item) => item.id}
              pagination={{
                pageSize: 10,
                totalItems: metrics.length,
                currentPage: 1,
                onPageChange: () => {}
              }}
            />
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500">No performance metrics available for this trainee.</p>
            </div>
          )}
        </Card>
      )
    }
  ];
  
  return (
    <div className="trainee-performance">
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}
      
      {/* Trainee header */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0 mr-4">
              {trainee.profileImage ? (
                <img
                  src={trainee.profileImage}
                  alt={`${trainee.firstName} ${trainee.lastName}`}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-xl font-medium text-gray-500">
                    {trainee.firstName.charAt(0)}{trainee.lastName.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {trainee.firstName} {trainee.lastName}
              </h2>
              <p className="text-sm text-gray-500">{trainee.email}</p>
              <div className="mt-1 flex items-center">
                {getStatusBadge(trainee.status)}
                {trainee.organization && (
                  <span className="ml-2 text-sm text-gray-500">
                    {trainee.organization} {trainee.department ? `(${trainee.department})` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-4 md:mt-0">
            <Button
              variant="outline"
              onClick={handleExportReport}
            >
              Export Performance Report
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Program selector */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center">
          <div className="flex-grow">
            <label htmlFor="program-select" className="block text-sm font-medium text-gray-700">
              Select Training Program
            </label>
            <select
              id="program-select"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
            >
              <option value="all">All Programs</option>
              {programs.map(program => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>
      
      {/* Performance tabs */}
      <Tabs
        tabs={tabs}
        defaultTabId="progress"
      />
    </div>
  );
};
