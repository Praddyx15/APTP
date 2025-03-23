// src/frontend/components/instructor/InstructorDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { DataTable, Column } from '../ui/DataTable';
import { Alert } from '../ui/Alert';
import { Link } from 'react-router-dom';

// Types
export interface InstructorTrainingSession {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  location?: string;
  trainees: {
    id: string;
    name: string;
    email: string;
    status: 'confirmed' | 'pending' | 'attended' | 'absent';
  }[];
}

export interface InstructorAssessment {
  id: string;
  title: string;
  traineeName: string;
  traineeId: string;
  date: Date;
  status: 'pending_review' | 'graded' | 'scheduled';
  score?: number;
  maxScore: number;
  sessionId?: string;
}

export interface TraineeOverview {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
  progress: number;
  lastActivity?: Date;
  currentModule?: string;
  pendingAssessments: number;
  overallScore?: number;
  status: 'active' | 'inactive' | 'on_leave';
}

// Instructor Dashboard Component
interface InstructorDashboardProps {
  instructor: {
    id: string;
    name: string;
  };
  trainingSessions: InstructorTrainingSession[];
  assessments: InstructorAssessment[];
  trainees: TraineeOverview[];
  onCreateSession: () => void;
  onScheduleAssessment: () => void;
  onGradeAssessment: (assessmentId: string) => void;
  onViewSession: (sessionId: string) => void;
  onViewTrainee: (traineeId: string) => void;
  onExportTraineeReport: (traineeId: string) => Promise<void>;
}

export const InstructorDashboard: React.FC<InstructorDashboardProps> = ({
  instructor,
  trainingSessions,
  assessments,
  trainees,
  onCreateSession,
  onScheduleAssessment,
  onGradeAssessment,
  onViewSession,
  onViewTrainee,
  onExportTraineeReport
}) => {
  const [upcomingSessions, setUpcomingSessions] = useState<InstructorTrainingSession[]>([]);
  const [pendingAssessments, setPendingAssessments] = useState<InstructorAssessment[]>([]);
  const [alertMessage, setAlertMessage] = useState<{type: 'success' | 'error'; message: string} | null>(null);
  
  useEffect(() => {
    // Filter upcoming sessions
    const now = new Date();
    setUpcomingSessions(
      trainingSessions
        .filter(session => new Date(session.startDate) > now)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    );
    
    // Filter pending assessments
    setPendingAssessments(
      assessments
        .filter(assessment => assessment.status === 'pending_review')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
  }, [trainingSessions, assessments]);
  
  // Handle exporting trainee report
  const handleExportTraineeReport = async (traineeId: string) => {
    try {
      await onExportTraineeReport(traineeId);
      setAlertMessage({
        type: 'success',
        message: 'Trainee report exported successfully.'
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to export report: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-800';
    
    switch (status) {
      case 'scheduled':
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        break;
      case 'in_progress':
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
        break;
      case 'completed':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case 'cancelled':
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        break;
      case 'pending_review':
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
        break;
      case 'graded':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case 'confirmed':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case 'pending':
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
        break;
      case 'attended':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case 'absent':
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        break;
      case 'active':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case 'inactive':
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-800';
        break;
      case 'on_leave':
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        break;
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        {status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
      </span>
    );
  };
  
  // Format Date Range
  const formatDateRange = (startDate: Date, endDate: Date) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const isSameDay = start.toDateString() === end.toDateString();
    
    if (isSameDay) {
      return `${start.toLocaleDateString()} ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };
  
  // Define table columns for trainees
  const traineeColumns: Column<TraineeOverview>[] = [
    {
      key: 'name',
      header: 'Trainee',
      render: (trainee) => (
        <div className="flex items-center">
          {trainee.profileImage ? (
            <img 
              src={trainee.profileImage} 
              alt={trainee.name}
              className="h-8 w-8 rounded-full mr-2"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gray-200 mr-2 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">
                {trainee.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
          )}
          <div>
            <div className="font-medium">{trainee.name}</div>
            <div className="text-sm text-gray-500">{trainee.email}</div>
          </div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (trainee) => (
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{trainee.progress}%</span>
            {trainee.currentModule && <span>{trainee.currentModule}</span>}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${trainee.progress}%` }}
            ></div>
          </div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'status',
      header: 'Status',
      render: (trainee) => getStatusBadge(trainee.status),
      sortable: true
    },
    {
      key: 'pendingAssessments',
      header: 'Pending',
      render: (trainee) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          trainee.pendingAssessments > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {trainee.pendingAssessments}
        </span>
      ),
      sortable: true
    },
    {
      key: 'score',
      header: 'Score',
      render: (trainee) => (
        <span className="font-medium">
          {trainee.overallScore ? `${trainee.overallScore}%` : 'N/A'}
        </span>
      ),
      sortable: true
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (trainee) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewTrainee(trainee.id);
            }}
            className="text-blue-600 hover:text-blue-900"
            title="View Details"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleExportTraineeReport(trainee.id);
            }}
            className="text-green-600 hover:text-green-900"
            title="Export Report"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
          </button>
        </div>
      )
    }
  ];
  
  // Define table columns for upcoming sessions
  const sessionColumns: Column<InstructorTrainingSession>[] = [
    {
      key: 'title',
      header: 'Session',
      render: (session) => (
        <div>
          <div className="font-medium">{session.title}</div>
          <div className="text-xs text-gray-500">{formatDateRange(session.startDate, session.endDate)}</div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'trainees',
      header: 'Trainees',
      render: (session) => (
        <div className="flex items-center space-x-1">
          <span className="font-medium">{session.trainees.length}</span>
          {session.trainees.length > 0 && (
            <div className="flex -space-x-2 overflow-hidden">
              {session.trainees.slice(0, 3).map((trainee, index) => (
                <div 
                  key={index}
                  className="inline-block h-6 w-6 rounded-full bg-gray-200 border border-white flex items-center justify-center text-xs"
                  title={trainee.name}
                >
                  {trainee.name.split(' ').map(n => n[0]).join('')}
                </div>
              ))}
              {session.trainees.length > 3 && (
                <div className="inline-block h-6 w-6 rounded-full bg-gray-300 border border-white flex items-center justify-center text-xs text-gray-600">
                  +{session.trainees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      ),
      sortable: true
    },
    {
      key: 'status',
      header: 'Status',
      render: (session) => getStatusBadge(session.status),
      sortable: true
    },
    {
      key: 'location',
      header: 'Location',
      render: (session) => session.location || 'Online',
      sortable: true
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (session) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewSession(session.id);
            }}
            className="text-blue-600 hover:text-blue-900"
            title="View Session"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
          </button>
        </div>
      )
    }
  ];
  
  // Define table columns for pending assessments
  const assessmentColumns: Column<InstructorAssessment>[] = [
    {
      key: 'title',
      header: 'Assessment',
      render: (assessment) => (
        <div>
          <div className="font-medium">{assessment.title}</div>
          <div className="text-xs text-gray-500">{new Date(assessment.date).toLocaleDateString()}</div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'traineeName',
      header: 'Trainee',
      render: (assessment) => assessment.traineeName,
      sortable: true
    },
    {
      key: 'status',
      header: 'Status',
      render: (assessment) => getStatusBadge(assessment.status),
      sortable: true
    },
    {
      key: 'score',
      header: 'Score',
      render: (assessment) => (
        <span className="font-medium">
          {assessment.score !== undefined ? `${assessment.score}/${assessment.maxScore}` : 'Not graded'}
        </span>
      ),
      sortable: true
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (assessment) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGradeAssessment(assessment.id);
            }}
            className="text-blue-600 hover:text-blue-900"
            title="Grade Assessment"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
        </div>
      )
    }
  ];
  
  return (
    <div className="instructor-dashboard">
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Instructor Dashboard</h1>
        <p className="text-gray-500">
          Welcome back, {instructor.name}. Manage your training sessions and assessments.
        </p>
      </div>
      
      {/* Quick Actions */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-lg font-medium">Quick Actions</h2>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button
            onClick={onCreateSession}
            className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="p-2 rounded-full bg-white shadow-sm mb-2">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <span className="text-sm font-medium text-center">Create Training Session</span>
          </button>
          
          <button
            onClick={onScheduleAssessment}
            className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="p-2 rounded-full bg-white shadow-sm mb-2">
              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
              </svg>
            </div>
            <span className="text-sm font-medium text-center">Schedule Assessment</span>
          </button>
          
          <Link
            to="/instructor/trainees"
            className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="p-2 rounded-full bg-white shadow-sm mb-2">
              <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <span className="text-sm font-medium text-center">View All Trainees</span>
          </Link>
        </div>
      </Card>
      
      {/* Statistics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Upcoming Sessions</p>
              <p className="text-2xl font-semibold">{upcomingSessions.length}</p>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Assessments</p>
              <p className="text-2xl font-semibold">{pendingAssessments.length}</p>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Trainees</p>
              <p className="text-2xl font-semibold">{trainees.filter(t => t.status === 'active').length}</p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Trainees Overview */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-lg font-medium">Trainee Overview</h2>
          <Link
            to="/instructor/trainees"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            View All
          </Link>
        </div>
        
        <DataTable
          columns={traineeColumns}
          data={trainees.slice(0, 5)}
          keyExtractor={(trainee) => trainee.id}
          onRowClick={(trainee) => onViewTrainee(trainee.id)}
          emptyMessage="No trainees assigned to you."
        />
      </Card>
      
      {/* Upcoming Training Sessions */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-lg font-medium">Upcoming Training Sessions</h2>
          <Link
            to="/instructor/schedule"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            View Schedule
          </Link>
        </div>
        
        {upcomingSessions.length > 0 ? (
          <DataTable
            columns={sessionColumns}
            data={upcomingSessions.slice(0, 5)}
            keyExtractor={(session) => session.id}
            onRowClick={(session) => onViewSession(session.id)}
          />
        ) : (
          <div className="p-8 text-center text-gray-500">
            No upcoming training sessions scheduled.
          </div>
        )}
      </Card>
      
      {/* Pending Assessments */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-lg font-medium">Pending Assessments</h2>
          <Link
            to="/instructor/assessments"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            View All
          </Link>
        </div>
        
        {pendingAssessments.length > 0 ? (
          <DataTable
            columns={assessmentColumns}
            data={pendingAssessments.slice(0, 5)}
            keyExtractor={(assessment) => assessment.id}
            onRowClick={(assessment) => onGradeAssessment(assessment.id)}
          />
        ) : (
          <div className="p-8 text-center text-gray-500">
            No pending assessments to review.
          </div>
        )}
      </Card>
    </div>
  );
};
