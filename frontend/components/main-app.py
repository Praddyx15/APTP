// src/frontend/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LoginForm } from './components/auth/UserAuth';
import { AuthProvider, useAuth, ProtectedRoute, Permission } from './components/auth/UserAuth';
import { NotificationProvider } from './components/notifications/NotificationSystem';
import { MainDashboard } from './components/dashboard/MainDashboard';
import { SyllabusBuilder } from './components/syllabus/SyllabusBuilder';
import { SyllabusCustomization } from './components/syllabus/SyllabusCustomization';
import { DocumentManagement } from './components/document/DocumentManagement';
import { DocumentViewer } from './components/document/DocumentViewer';
import { AssessmentInterface } from './components/assessment/AssessmentInterface';
import { SimulatorIntegration } from './components/simulator/SimulatorIntegration';
import { ComplianceEngine } from './components/compliance/ComplianceEngine';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { TraineePerformance } from './components/trainee/TraineePerformance';
import { InstructorDashboard } from './components/instructor/InstructorDashboard';
import { NotificationPage } from './components/notifications/NotificationSystem';
import { UserProfile } from './components/auth/UserAuth';

// Import services
import { authService } from './services/authService';
import { notificationService } from './services/notificationService';

// Main Routes Component
const AppRoutes = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginForm onLogin={authService.login} onForgotPassword={authService.forgotPassword} isLoading={false} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<MainDashboard recentActivities={[]} notifications={[]} onNotificationRead={() => Promise.resolve()} onNotificationClear={() => Promise.resolve()} onAllNotificationsRead={() => Promise.resolve()} />} />
        
        {/* Syllabus Routes */}
        <Route path="/syllabus" element={
          <ProtectedRoute requiredPermissions={[Permission.EDIT_SYLLABUS]}>
            <Navigate to="/syllabus/builder" replace />
          </ProtectedRoute>
        } />
        <Route path="/syllabus/builder" element={
          <ProtectedRoute requiredPermissions={[Permission.EDIT_SYLLABUS]}>
            <SyllabusBuilder 
              syllabusElements={[]} 
              onSave={() => Promise.resolve()} 
              onElementEdit={() => {}} 
              onCheckCompliance={() => {}}
            />
          </ProtectedRoute>
        } />
        <Route path="/syllabus/customization" element={
          <ProtectedRoute requiredPermissions={[Permission.EDIT_SYLLABUS]}>
            <SyllabusCustomization 
              elements={[]} 
              templates={[]} 
              complianceRequirements={[]}
              exercises={[]}
              versions={[]}
              onSave={() => Promise.resolve()}
              onApplyTemplate={() => Promise.resolve([])}
              onCheckCompliance={() => Promise.resolve({
                isCompliant: true,
                requirementsMet: [],
                requirementsNotMet: [],
                requirementsPartiallyMet: [],
                details: [],
                overallStatus: 'compliant'
              })}
              onCreateVersion={() => Promise.resolve()}
              onBulkEdit={() => Promise.resolve()}
            />
          </ProtectedRoute>
        } />
        
        {/* Document Routes */}
        <Route path="/documents" element={
          <ProtectedRoute requiredPermissions={[Permission.UPLOAD_DOCUMENTS]}>
            <Navigate to="/documents/upload" replace />
          </ProtectedRoute>
        } />
        <Route path="/documents/upload" element={
          <ProtectedRoute requiredPermissions={[Permission.UPLOAD_DOCUMENTS]}>
            <DocumentManagement 
              documents={[]} 
              onUpload={() => Promise.resolve()} 
              onDelete={() => Promise.resolve()} 
              onPreview={() => {}}
              onProcess={() => Promise.resolve()}
              onCategorize={() => Promise.resolve()}
              onTagsUpdate={() => Promise.resolve()}
            />
          </ProtectedRoute>
        } />
        <Route path="/documents/viewer/:id" element={
          <ProtectedRoute requiredPermissions={[Permission.UPLOAD_DOCUMENTS]}>
            <DocumentViewer 
              documentId=""
              metadata={{
                title: '',
                totalPages: 0,
                fileType: '',
                fileSize: 0
              }}
              pages={[]}
              onAnnotationCreate={() => Promise.resolve({
                id: '',
                pageNumber: 0,
                x: 0,
                y: 0,
                width: 0,
                height: 0,
                text: '',
                type: 'note'
              })}
              onAnnotationUpdate={() => Promise.resolve()}
              onAnnotationDelete={() => Promise.resolve()}
            />
          </ProtectedRoute>
        } />
        
        {/* Assessment Routes */}
        <Route path="/assessment" element={
          <ProtectedRoute requiredPermissions={[Permission.CREATE_ASSESSMENT]}>
            <Navigate to="/assessment/create" replace />
          </ProtectedRoute>
        } />
        <Route path="/assessment/create" element={
          <ProtectedRoute requiredPermissions={[Permission.CREATE_ASSESSMENT]}>
            <AssessmentInterface 
              trainee={{
                id: '',
                name: ''
              }}
              assessmentForm={{
                id: '',
                name: '',
                description: '',
                competencies: [],
                categories: []
              }}
              onSave={() => Promise.resolve()}
              onCompare={() => {}}
              instructor={{
                id: '',
                name: ''
              }}
            />
          </ProtectedRoute>
        } />
        <Route path="/assessment/grade/:id" element={
          <ProtectedRoute requiredPermissions={[Permission.GRADE_ASSESSMENT]}>
            <AssessmentInterface 
              trainee={{
                id: '',
                name: ''
              }}
              assessmentForm={{
                id: '',
                name: '',
                description: '',
                competencies: [],
                categories: []
              }}
              onSave={() => Promise.resolve()}
              onCompare={() => {}}
              instructor={{
                id: '',
                name: ''
              }}
            />
          </ProtectedRoute>
        } />
        
        {/* Simulator Routes */}
        <Route path="/simulator" element={<Navigate to="/simulator/connect" replace />} />
        <Route path="/simulator/connect" element={
          <SimulatorIntegration
            onConnect={() => Promise.resolve()}
            onDisconnect={() => Promise.resolve()}
            onStart={() => Promise.resolve()}
            onStop={() => Promise.resolve()}
            onPause={() => Promise.resolve()}
            onResume={() => Promise.resolve()}
            onReset={() => Promise.resolve()}
            onParameterChange={() => Promise.resolve()}
            connectionStatus="disconnected"
            parameters={[]}
            events={[]}
            scenarios={[]}
            isRunning={false}
            isPaused={false}
          />
        } />
        
        {/* Compliance Routes */}
        <Route path="/compliance" element={
          <ProtectedRoute requiredPermissions={[Permission.CHECK_COMPLIANCE]}>
            <Navigate to="/compliance/requirements" replace />
          </ProtectedRoute>
        } />
        <Route path="/compliance/requirements" element={
          <ProtectedRoute requiredPermissions={[Permission.CHECK_COMPLIANCE]}>
            <ComplianceEngine
              frameworks={[]}
              trainingPrograms={[]}
              mappings={[]}
              reports={[]}
              onCheckCompliance={() => Promise.resolve({
                id: '',
                trainingProgramId: '',
                trainingProgramName: '',
                frameworkId: '',
                frameworkName: '',
                generatedDate: new Date(),
                generatedBy: '',
                overallStatus: 'unknown',
                requirementStatuses: []
              })}
              onGenerateReport={() => Promise.resolve('')}
              onAddMapping={() => Promise.resolve()}
              onUpdateMapping={() => Promise.resolve()}
              onExportReport={() => Promise.resolve()}
            />
          </ProtectedRoute>
        } />
        
        {/* Analytics Routes */}
        <Route path="/analytics" element={
          <ProtectedRoute requiredPermissions={[Permission.VIEW_ANALYTICS]}>
            <Navigate to="/analytics/dashboard" replace />
          </ProtectedRoute>
        } />
        <Route path="/analytics/dashboard" element={
          <ProtectedRoute requiredPermissions={[Permission.VIEW_ANALYTICS]}>
            <AnalyticsDashboard
              metrics={{
                overallStats: {
                  activeTrainees: 0,
                  completedTrainees: 0,
                  avgProgramScore: 0,
                  complianceRate: 0
                },
                trainees: [],
                programs: [],
                complianceMetrics: []
              }}
              onGenerateReport={() => {}}
              onTraineeSelect={() => {}}
              onProgramSelect={() => {}}
              dateRange={{
                startDate: new Date(),
                endDate: new Date()
              }}
              onDateRangeChange={() => {}}
            />
          </ProtectedRoute>
        } />
        
        {/* Trainee Routes */}
        <Route path="/trainee/performance/:id" element={
          <TraineePerformance
            trainee={{
              id: '',
              firstName: '',
              lastName: '',
              email: '',
              status: 'active',
              enrolledPrograms: []
            }}
            programs={[]}
            progress={[]}
            assessments={[]}
            competencies={[]}
            metrics={[]}
            onExportReport={() => Promise.resolve()}
          />
        } />
        
        {/* Instructor Routes */}
        <Route path="/instructor/dashboard" element={
          <InstructorDashboard
            instructor={{
              id: '',
              name: ''
            }}
            trainingSessions={[]}
            assessments={[]}
            trainees={[]}
            onCreateSession={() => {}}
            onScheduleAssessment={() => {}}
            onGradeAssessment={() => {}}
            onViewSession={() => {}}
            onViewTrainee={() => {}}
            onExportTraineeReport={() => Promise.resolve()}
          />
        } />
        
        {/* User Profile & Settings */}
        <Route path="/profile" element={
          <UserProfile
            user={{
              id: '',
              username: '',
              email: '',
              firstName: '',
              lastName: '',
              role: 'trainee',
              permissions: []
            }}
            onUpdateProfile={() => Promise.resolve()}
            onChangePassword={() => Promise.resolve()}
            onUploadProfilePhoto={() => Promise.resolve('')}
          />
        } />
        
        {/* Notifications */}
        <Route path="/notifications" element={
          <NotificationPage
            notifications={[]}
            onMarkAsRead={() => Promise.resolve()}
            onDelete={() => Promise.resolve()}
            onMarkAllAsRead={() => Promise.resolve()}
            onClearAll={() => Promise.resolve()}
            onFilter={() => {}}
            categories={[]}
          />
        } />
        
        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
};

// Main App Component
const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider authService={authService}>
        <NotificationProvider notificationService={notificationService}>
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
