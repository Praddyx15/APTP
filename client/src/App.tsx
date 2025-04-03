/**
 * Main application component with routing and global providers
 */

import { Switch, Route, useLocation } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';
import { AuthProvider } from './hooks/use-auth';
import { ProtectedRoute } from './components/auth/protected-route';
import { Toaster } from './components/ui/toaster';

// Pages
import HomePage from './pages/home-page';
import AuthPage from './pages/auth-page';
import NotFound from './pages/not-found';
import DocumentManagementPage from './pages/document-management-page';
import DocumentUploadPage from './pages/document-upload-page';
import DocumentDetailPage from './pages/document-detail-page';
import KnowledgeGraphPage from './pages/knowledge-graph-page';

// Layout components
import { MainLayout } from './components/layout/main-layout';

function App() {
  const [location] = useLocation();
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen bg-background text-foreground">
          <Switch>
            <Route path="/auth">
              <AuthPage />
            </Route>
            
            <Route path="/">
              <MainLayout>
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              </MainLayout>
            </Route>
            
            <Route path="/documents">
              <MainLayout>
                <ProtectedRoute>
                  <DocumentManagementPage />
                </ProtectedRoute>
              </MainLayout>
            </Route>
            
            <Route path="/documents/upload">
              <MainLayout>
                <ProtectedRoute>
                  <DocumentUploadPage />
                </ProtectedRoute>
              </MainLayout>
            </Route>
            
            <Route path="/documents/:id">
              {(params) => (
                <MainLayout>
                  <ProtectedRoute>
                    <DocumentDetailPage id={params.id} />
                  </ProtectedRoute>
                </MainLayout>
              )}
            </Route>
            
            <Route path="/knowledge-graphs/:id">
              {(params) => (
                <MainLayout>
                  <ProtectedRoute>
                    <KnowledgeGraphPage id={params.id} />
                  </ProtectedRoute>
                </MainLayout>
              )}
            </Route>
            
            <Route>
              <NotFound />
            </Route>
          </Switch>
        </div>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
