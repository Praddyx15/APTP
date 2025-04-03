/**
 * Authentication hook for user management
 */

import { createContext, ReactNode, useContext, useMemo } from 'react';
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from '@tanstack/react-query';
import { apiRequest, queryClient } from '../lib/query-client';
import { useToast } from './use-toast';

type User = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  organizationType: string | null;
  organizationName: string | null;
  [key: string]: any;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  organizationType?: string;
  organizationName?: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ['/api/user'],
    queryFn: async ({ queryKey }) => {
      try {
        const response = await fetch(queryKey[0], {
          credentials: 'include',
        });
        
        if (response.status === 401) {
          return null;
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching user:', error);
        return null;
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest('POST', '/api/login', credentials);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(['/api/user'], user);
      toast({
        title: 'Login successful',
        description: `Welcome back, ${user.firstName}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid username or password',
        variant: 'destructive',
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      const res = await apiRequest('POST', '/api/register', userData);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(['/api/user'], user);
      toast({
        title: 'Registration successful',
        description: `Welcome, ${user.firstName}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Registration failed',
        description: error.message || 'Could not create account',
        variant: 'destructive',
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/logout');
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/user'], null);
      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Logout failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const value = useMemo(
    () => ({
      user,
      isLoading,
      error,
      loginMutation,
      logoutMutation,
      registerMutation,
    }),
    [user, isLoading, error, loginMutation, logoutMutation, registerMutation]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
