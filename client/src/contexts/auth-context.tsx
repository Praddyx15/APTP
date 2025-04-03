import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useRoute } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';

// User roles enum
export enum UserRole {
  TRAINEE = 'trainee',
  INSTRUCTOR = 'instructor',
  EXAMINER = 'examiner',
  ADMIN = 'admin',
  QUALITY_MANAGER = 'quality_manager',
  CHIEF_INSTRUCTOR = 'chief_instructor',
  ATO_MANAGER = 'ato_manager',
  AIRLINE_MANAGER = 'airline_manager'
}

// Organization types
export enum OrganizationType {
  ATO = 'ato',
  AIRLINE = 'airline'
}

// User interface
export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  organizationType: OrganizationType | null;
  organizationName: string | null;
  authProvider: string | null;
  authProviderId: string | null;
  profilePicture: string | null;
  mfaEnabled: boolean | null;
  lastLoginAt: string | null;
}

// Login credentials
interface LoginCredentials {
  username: string;
  password: string;
}

// Registration form data
interface RegisterData {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword?: string; // Used for validation only
  role?: UserRole;
  organizationType?: OrganizationType;
  organizationName?: string;
}

// Auth context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole[] | UserRole) => boolean;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [matchUnauthorized] = useRoute('/unauthorized');
  
  // State to track when auth is checked (to prevent flashing)
  const [authChecked, setAuthChecked] = useState(false);
  
  // Fetch current user
  const {
    data: user,
    error,
    isLoading,
    isSuccess
  } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/user');
        
        if (!res.ok) {
          if (res.status === 401) return null;
          throw new Error('Failed to fetch user');
        }
        
        return await res.json();
      } catch (err) {
        console.error('Error fetching user:', err);
        return null;
      }
    },
    retry: false
  });
  
  // Set authChecked to true once the query completes
  useEffect(() => {
    if (!isLoading) {
      setAuthChecked(true);
    }
  }, [isLoading]);
  
  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const res = await apiRequest('POST', '/api/login', credentials);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Login failed');
      }
      
      return await res.json();
    },
    onSuccess: (userData: User) => {
      queryClient.setQueryData(['/api/user'], userData);
      toast({
        title: 'Login successful',
        description: `Welcome back, ${userData.firstName}!`,
      });
      navigate('/');
    },
    onError: (err: Error) => {
      toast({
        title: 'Login failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  });
  
  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const { confirmPassword, ...registrationData } = data;
      const res = await apiRequest('POST', '/api/register', registrationData);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Registration failed');
      }
      
      return await res.json();
    },
    onSuccess: (userData: User) => {
      queryClient.setQueryData(['/api/user'], userData);
      toast({
        title: 'Registration successful',
        description: `Welcome, ${userData.firstName}!`,
      });
      navigate('/');
    },
    onError: (err: Error) => {
      toast({
        title: 'Registration failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  });
  
  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/logout');
      
      if (!res.ok) {
        throw new Error('Logout failed');
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/user'], null);
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
      navigate('/auth');
    },
    onError: () => {
      toast({
        title: 'Logout failed',
        description: 'There was an error logging out. Please try again.',
        variant: 'destructive',
      });
    }
  });
  
  // Login handler
  const login = async (credentials: LoginCredentials) => {
    await loginMutation.mutateAsync(credentials);
  };
  
  // Register handler
  const register = async (data: RegisterData) => {
    await registerMutation.mutateAsync(data);
  };
  
  // Logout handler
  const logout = async () => {
    await logoutMutation.mutateAsync();
  };
  
  // Check if user has specific role(s)
  const hasRole = (roles: UserRole[] | UserRole): boolean => {
    if (!user) return false;
    
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    
    return user.role === roles;
  };
  
  // Redirect to auth page if not authorized and not already on the unauthorized page
  useEffect(() => {
    if (authChecked && !isLoading && !user && !matchUnauthorized && window.location.pathname !== '/auth') {
      navigate('/auth');
    }
  }, [user, isLoading, authChecked, navigate, matchUnauthorized]);
  
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isLoading && !authChecked,
        isAuthenticated: !!user,
        error,
        login,
        register,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook for using auth context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}