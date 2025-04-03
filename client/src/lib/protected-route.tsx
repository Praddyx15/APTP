import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/contexts/auth-context'; // Still import UserRole from original context
import { Loader2 } from 'lucide-react';
import { Redirect, Route } from 'wouter';
import { FC, useEffect, useState } from 'react';

type ComponentType = FC<any> | (() => React.JSX.Element);

export function ProtectedRoute({
  path,
  component: Component,
  roles,
}: {
  path: string;
  component: ComponentType;
  roles?: UserRole | UserRole[];
}) {
  const { user, isLoading } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  // Check authorization once we have the user info
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setAuthorized(false);
      } else if (roles) {
        // Handle role check manually since hasRole might not exist in the new auth hook
        if (Array.isArray(roles)) {
          setAuthorized(roles.includes(user.role as UserRole));
        } else {
          setAuthorized(user.role === roles);
        }
      } else {
        setAuthorized(true);
      }
    }
  }, [isLoading, user, roles]);

  // Show loading state while checking authorization
  if (isLoading || authorized === null) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Route>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Redirect to unauthorized page if not authorized for this specific route
  if (!authorized) {
    return (
      <Route path={path}>
        <Redirect to="/unauthorized" />
      </Route>
    );
  }

  // Wrap Component with a function that returns JSX to satisfy type requirements
  const RouteComponent = () => <Component />;
  return <Route path={path} component={RouteComponent} />;
}