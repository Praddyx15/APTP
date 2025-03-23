// src/frontend/routes/Routes.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, Permission, ProtectedRoute } from '../components/auth/UserAuth';
import { AppLayout } from '../components/layout/AppLayout';

// Auth Pages
import { LoginForm } from '../components/auth/UserAuth';

// Dashboard Pages
import { MainDashboard } from '../components/dashboard/MainDashboard';

// Syllabus Pages
import { SyllabusBuilder } from '../components/syllabus/SyllabusBuilder';
import { SyllabusCustomization } from '../components/syllabus/SyllabusCustomization';

// Document Pages
import { DocumentManagement } from '../components/document/DocumentManagement';
import { DocumentViewer } from '../components/document/DocumentViewer';

// Assessment Pages
import { AssessmentInterface } from '../components/assessment/AssessmentInterface';

// Simulator Pages
import { SimulatorIntegration } from '../components/simulator/SimulatorIntegration';

// Compliance Pages
import { ComplianceEngine } from '../components/compliance/ComplianceEngine';

// Analytics Pages
import { AnalyticsDashboard } from '../components/analytics/AnalyticsDashboard';

// Instructor Pages
import { InstructorDashboard } from '../components/instructor/InstructorDashboard';

// Trainee Pages
import { TraineePerformance } from '../components/trainee/TraineePerformance';

// User Pages
import { UserProfile } from '../components/auth/UserAuth';

// Notification Pages
import { NotificationPage } from '../components/notifications/NotificationSystem';

const AppRoutes: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          !isAuthenticated 
            ? <LoginForm onLogin={() => {}} onForgotPassword={() => {}} isLoading={false} />
            : <Navigate to="/" replace />
        } />
        
        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout>
              <MainDashboard 
                recentActivities={[]}
                notifications={[]}
                onNotificationRead={() => Promise.resolve()}
                onNotificationClear={() => Promise.resolve()}
                onAllNotificationsRead={() => Promise.resolve()}
              />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        {/* Syllabus Routes */}
        <Route path="/syllabus" element={
          <ProtectedRoute requiredPermissions={[Permission.EDIT_SYLLABUS]}>
            <AppLayout>
              <Navigate to="/syllabus/builder" replace />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/syllabus/builder" element={
          <ProtectedRoute requiredPermissions={[Permission.EDIT_SYLLABUS]}>
            <AppLayout>
              <SyllabusBuilder 
                syllabusElements={[]}
                onSave={() => {}}
                onElementEdit={() => {}}
                onCheckCompliance={() => {}}
              />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/syllabus/customization" element={
          <ProtectedRoute requiredPermissions={[Permission.EDIT_SYLLABUS]}>
            <AppLayout>
              <SyllabusCustomization 
                elements={[]}
                templates={[]}
                complianceRequirements={[]}
                exercises={[]}
                versions={[]}
                onSave={() => Promise.resolve()}
                onApplyTemplate={() => Promise.resolve([])}
                onCheckCompliance={() => Promise.resolve({} as any)}
                onCreateVersion={() => Promise.resolve()}
                onBulkEdit={() => Promise.resolve()}
              />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        {/* Document Routes */}
        <Route path="/documents" element={
          <ProtectedRoute requiredPermissions={[Permission.UPLOAD_DOCUMENTS]}>
            <AppLayout>
              <Navigate to="/documents/library" replace />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/documents/library" element={
          <ProtectedRoute requiredPermissions={[Permission.UPLOAD_DOCUMENTS]}>
            <AppLayout>
              <DocumentManagement 
                documents={[]}
                onUpload={() => Promise.resolve()}
                onDelete={() => Promise.resolve()}
                onPreview={() => {}}
                onProcess={() => Promise.resolve()}
                onCategorize={() => Promise.resolve()}
                onTagsUpdate={() => Promise.resolve()}
              />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/documents/viewer/:id" element={
          <ProtectedRoute requiredPermissions={[Permission.UPLOAD_DOCUMENTS]}>
            <AppLayout>
              <DocumentViewer 
                documentId=""
                metadata={{
                  title: "",
                  totalPages: 0,
                  fileType: "",
                  fileSize: 0
                }}
                pages={[]}
                onAnnotationCreate={() => Promise.resolve({} as any)}
                onAnnotationUpdate={() => Promise.resolve()}
                onAnnotationDelete={() => Promise.resolve()}
              />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        {/* Assessment Routes */}
        <Route path="/assessment" element={
          <ProtectedRoute requiredPermissions={[Permission.CREATE_ASSESSMENT]}>
            <AppLayout>
              <Navigate to="/assessment/list" replace />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/assessment/grade/:id" element={
          <ProtectedRoute requiredPermissions={[Permission.GRADE_ASSESSMENT]}>
            <AppLayout>
              <AssessmentInterface 
                trainee={{
                  id: "",
                  name: ""
                }}
                assessmentForm={{
                  id: "",
                  name: "",
                  description: "",
                  competencies: [],
                  categories: []
                }}
                onSave={() => Promise.resolve()}
                onCompare={() => {}}
                instructor={{
                  id: "",
                  name: ""
                }}
              />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        {/* Simulator Routes */}
        <Route path="/simulator" element={
          <ProtectedRoute>
            <AppLayout>
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
            </AppLayout>
          </ProtectedRoute>
        } />
        
        {/* Compliance Routes */}
        <Route path="/compliance" element={
          <ProtectedRoute requiredPermissions={[Permission.CHECK_COMPLIANCE]}>
            <AppLayout>
              <ComplianceEngine 
                frameworks={[]}
                trainingPrograms={[]}
                mappings={[]}
                reports={[]}
                onCheckCompliance={() => Promise.resolve({} as any)}
                onGenerateReport={() => Promise.resolve("")}
                onAddMapping={() => Promise.resolve()}
                onUpdateMapping={() => Promise.resolve()}
                onExportReport={() => Promise.resolve()}
              />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        {/* Analytics Routes */}
        <Route path="/analytics" element={
          <ProtectedRoute requiredPermissions={[Permission.VIEW_ANALYTICS]}>
            <AppLayout>
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
            </AppLayout>
          </ProtectedRoute>
        } />
        
        {/* Instructor Routes */}
        <Route path="/instructor" element={
          <ProtectedRoute>
            <AppLayout>
              <InstructorDashboard 
                instructor={{
                  id: "",
                  name: ""
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
            </AppLayout>
          </ProtectedRoute>
        } />
        
        {/* Trainee Routes */}
        <Route path="/trainee/:id" element={
          <ProtectedRoute>
            <AppLayout>
              <TraineePerformance 
                trainee={{
                  id: "",
                  firstName: "",
                  lastName: "",
                  email: "",
                  status: "active",
                  enrolledPrograms: []
                }}
                programs={[]}
                progress={[]}
                assessments={[]}
                competencies={[]}
                metrics={[]}
                onExportReport={() => Promise.resolve()}
              />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        {/* User Routes */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <AppLayout>
              <UserProfile 
                user={{
                  id: "",
                  username: "",
                  email: "",
                  firstName: "",
                  lastName: "",
                  role: "trainee" as any,
                  permissions: []
                }}
                onUpdateProfile={() => Promise.resolve()}
                onChangePassword={() => Promise.resolve()}
                onUploadProfilePhoto={() => Promise.resolve("")}
              />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        {/* Notification Routes */}
        <Route path="/notifications" element={
          <ProtectedRoute>
            <AppLayout>
              <NotificationPage 
                notifications={[]}
                onMarkAsRead={() => Promise.resolve()}
                onDelete={() => Promise.resolve()}
                onMarkAllAsRead={() => Promise.resolve()}
                onClearAll={() => Promise.resolve()}
                onFilter={() => {}}
                categories={[]}
              />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        {/* Fallback Route */}
        <Route path="*" element={
          <Navigate to="/" replace />
        } />
      </Routes>
    </Router>
  );
};

export default AppRoutes;