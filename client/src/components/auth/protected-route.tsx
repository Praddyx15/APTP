/**
 * Protected route component for authenticated routes
 */

import { useAuth } from '../../hooks/use-auth';
import { useLocation } from 'wouter';
import { useEffect } from 'react';

export function ProtectedRoute({ 
  children, 
  requiredRoles 
}: { 
  children: React.ReactNode; 
  requiredRoles?: string[] 
}) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // Redirect to login if not authenticated
        setLocation('/auth');
      } else if (requiredRoles && !requiredRoles.includes(user.role)) {
        // Redirect to home if user doesn't have required role
        setLocation('/');
      }
    }
  }, [isLoading, user, requiredRoles, setLocation]);

  if (isLoading) {
    // Return loading state
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
    </div>;
  }

  // Only render children if authenticated and has required role
  if (!user || (requiredRoles && !requiredRoles.includes(user.role))) {
    return null;
  }

  // Render children if authenticated and has required role
  return <>{children}</>;
}
