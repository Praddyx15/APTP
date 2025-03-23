import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

// Layout components
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth pages
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Dashboard pages
import Dashboard from './pages/dashboard/Dashboard';

// Instructor pages
import InstructorDashboard from './pages/instructor/Dashboard';
import TraineeList from './pages/instructor/TraineeList';
import TraineeDetails from './pages/instructor/TraineeDetails';
import Assessment from './pages/instructor/Assessment';
import Debriefing from './pages/instructor/Debriefing';

// Trainee pages
import TraineeDashboard from './pages/trainee/Dashboard';
import TrainingRecords from './pages/trainee/TrainingRecords';
import CourseList from './pages/trainee/CourseList';
import CourseDetails from './pages/trainee/CourseDetails';
import ExerciseDetails from './pages/trainee/ExerciseDetails';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import SyllabusManagement from './pages/admin/SyllabusManagement';
import SyllabusBuilder from './pages/admin/SyllabusBuilder';
import SystemSettings from './pages/admin/SystemSettings';

// Other components
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { useAuthStore } from './stores/authStore';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Auth routes */}
          <Route path="/" element={<AuthLayout />}>
            <Route index element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
            <Route path="login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
          </Route>

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* Common dashboard route - redirects based on user role */}
            <Route
              path="dashboard"
              element={
                user?.role === 'admin' ? (
                  <Navigate to="/admin/dashboard" />
                ) : user?.role === 'instructor' ? (
                  <Navigate to="/instructor/dashboard" />
                ) : (
                  <Navigate to="/trainee/dashboard" />
                )
              }
            />

            {/* Admin routes */}
            <Route path="admin">
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="users"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="syllabi"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <SyllabusManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="syllabi/builder"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <SyllabusBuilder />
                  </ProtectedRoute>
                }
              />
              <Route
                path="syllabi/builder/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <SyllabusBuilder />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <SystemSettings />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Instructor routes */}
            <Route path="instructor">
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                    <InstructorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="trainees"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                    <TraineeList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="trainees/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                    <TraineeDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="assessment"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                    <Assessment />
                  </ProtectedRoute>
                }
              />
              <Route
                path="assessment/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                    <Assessment />
                  </ProtectedRoute>
                }
              />
              <Route
                path="debriefing/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                    <Debriefing />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Trainee routes */}
            <Route path="trainee">
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'instructor', 'trainee']}>
                    <TraineeDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="records"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'instructor', 'trainee']}>
                    <TrainingRecords />
                  </ProtectedRoute>
                }
              />
              <Route
                path="courses"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'instructor', 'trainee']}>
                    <CourseList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="courses/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'instructor', 'trainee']}>
                    <CourseDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="exercises/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'instructor', 'trainee']}>
                    <ExerciseDetails />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Route>

          {/* 404 route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
    </QueryClientProvider>
  );
};

export default App;