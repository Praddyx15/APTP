// src/frontend/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, ProtectedRoute } from './components/auth/UserAuth';
import { NotificationProvider } from './components/notifications/NotificationSystem';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LoginForm } from './components/auth/UserAuth';
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
import { UserProfile } from './components/auth/UserAuth';
import { NotificationPage } from './components/notifications/NotificationSystem';

// Services (mocked for this example)
import { mockAuthService } from './services/mockAuth';
import { mockNotificationService } from './services/mockNotifications';

// Main App with routing
const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginForm onLogin={mockAuthService.login} onForgotPassword={mockAuthService.forgotPassword} isLoading={false} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <AppLayout>
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={
          user?.role === 'instructor' 
            ? <InstructorDashboard 
                instructor={{ id: user.id, name: `${user.firstName} ${user.lastName}` }}
                trainingSessions={[]}
                assessments={[]}
                trainees={[]}
                onCreateSession={() => {}}
                onScheduleAssessment={() => {}}
                onGradeAssessment={() => {}}
                onViewSession={() => {}}
                onViewTrainee={() => {}}
                onExportTraineeReport={async () => {}}
              /> 
            : <MainDashboard 
                recentActivities={[]}
                notifications={[]}
                onNotificationRead={async () => {}}
                onNotificationClear={async () => {}}
                onAllNotificationsRead={async () => {}}
              />
        } />

        {/* Syllabus */}
        <Route path="/syllabus" element={
          <ProtectedRoute requiredPermissions={['edit_syllabus']}>
            <SyllabusBuilder 
              syllabusElements={[]}
              onSave={() => {}}
              onElementEdit={() => {}}
              onCheckCompliance={() => {}}
            />
          </ProtectedRoute>
        } />
        <Route path="/syllabus/customization" element={
          <ProtectedRoute requiredPermissions={['edit_syllabus']}>
            <SyllabusCustomization 
              elements={[]}
              templates={[]}
              complianceRequirements={[]}
              exercises={[]}
              versions={[]}
              onSave={async () => {}}
              onApplyTemplate={async () => []}
              onCheckCompliance={async () => ({ isCompliant: true, requirementsMet: [], requirementsNotMet: [], requirementsPartiallyMet: [], details: [], overallStatus: 'compliant' })}
              onCreateVersion={async () => {}}
              onBulkEdit={async () => {}}
            />
          </ProtectedRoute>
        } />

        {/* Documents */}
        <Route path="/documents" element={
          <ProtectedRoute requiredPermissions={['upload_documents']}>
            <DocumentManagement 
              documents={[]}
              onUpload={async () => {}}
              onDelete={async () => {}}
              onPreview={() => {}}
              onProcess={async () => {}}
              onCategorize={async () => {}}
              onTagsUpdate={async () => {}}
            />
          </ProtectedRoute>
        } />
        <Route path="/documents/viewer/:id" element={
          <ProtectedRoute>
            <DocumentViewer 
              documentId=""
              metadata={{
                title: "",
                totalPages: 0,
                fileType: "",
                fileSize: 0
              }}
              pages={[]}
              onAnnotationCreate={async () => ({ id: "", pageNumber: 0, x: 0, y: 0, width: 0, height: 0, text: "", type: "note" })}
              onAnnotationUpdate={async () => {}}
              onAnnotationDelete={async () => {}}
            />
          </ProtectedRoute>
        } />

        {/* Assessment */}
        <Route path="/assessment" element={
          <ProtectedRoute requiredPermissions={['create_assessment']}>
            <AssessmentInterface 
              trainee={{ id: "", name: "" }}
              assessmentForm={{ id: "", name: "", description: "", competencies: [], categories: [] }}
              onSave={async () => {}}
              onCompare={() => {}}
              instructor={{ id: "", name: "" }}
            />
          </ProtectedRoute>
        } />

        {/* Simulator */}
        <Route path="/simulator" element={
          <ProtectedRoute>
            <SimulatorIntegration 
              onConnect={async () => {}}
              onDisconnect={async () => {}}
              onStart={async () => {}}
              onStop={async () => {}}
              onPause={async () => {}}
              onResume={async () => {}}
              onReset={async () => {}}
              onParameterChange={async () => {}}
              connectionStatus="disconnected"
              parameters={[]}
              events={[]}
              scenarios={[]}
              isRunning={false}
              isPaused={false}
            />
          </ProtectedRoute>
        } />

        {/* Compliance */}
        <Route path="/compliance" element={
          <ProtectedRoute requiredPermissions={['check_compliance']}>
            <ComplianceEngine 
              frameworks={[]}
              trainingPrograms={[]}
              mappings={[]}
              reports={[]}
              onCheckCompliance={async () => ({ id: "", trainingProgramId: "", trainingProgramName: "", frameworkId: "", frameworkName: "", generatedDate: new Date(), generatedBy: "", overallStatus: "compliant", requirementStatuses: [] })}
              onGenerateReport={async () => ""}
              onAddMapping={async () => {}}
              onUpdateMapping={async () => {}}
              onExportReport={async () => {}}
            />
          </ProtectedRoute>
        } />

        {/* Analytics */}
        <Route path="/analytics" element={
          <ProtectedRoute requiredPermissions={['view_analytics']}>
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

        {/* Trainee Performance */}
        <Route path="/trainee/:id" element={
          <ProtectedRoute>
            <TraineePerformance 
              trainee={{ id: "", firstName: "", lastName: "", email: "", status: "active", enrolledPrograms: [] }}
              programs={[]}
              progress={[]}
              assessments={[]}
              competencies={[]}
              metrics={[]}
              onExportReport={async () => {}}
            />
          </ProtectedRoute>
        } />

        {/* Profile & Settings */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <UserProfile 
              user={user}
              onUpdateProfile={async () => {}}
              onChangePassword={async () => {}}
              onUploadProfilePhoto={async () => ""}
            />
          </ProtectedRoute>
        } />

        {/* Notifications */}
        <Route path="/notifications" element={
          <ProtectedRoute>
            <NotificationPage 
              notifications={[]}
              onMarkAsRead={async () => {}}
              onDelete={async () => {}}
              onMarkAllAsRead={async () => {}}
              onClearAll={async () => {}}
              onFilter={() => {}}
              categories={[]}
            />
          </ProtectedRoute>
        } />

        {/* Fallback for unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
};

// Main App Component
const App = () => {
  return (
    <Router>
      <AuthProvider authService={mockAuthService}>
        <NotificationProvider notificationService={mockNotificationService}>
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
