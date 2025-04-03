import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

// Define user roles
export enum UserRole {
  ATO = 'ATO',
  AIRLINE = 'AIRLINE',
  INSTRUCTOR = 'INSTRUCTOR',
  TRAINEE = 'TRAINEE'
}

// User interface
export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
}

// Auth state interface
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

// Auth context interface
interface AuthContextType extends AuthState {
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<boolean>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  clearError: () => void;
}

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API endpoints
const API_URL = process.env.REACT_APP_API_URL || '';
const LOGIN_ENDPOINT = `${API_URL}/auth/login`;
const REFRESH_ENDPOINT = `${API_URL}/auth/refresh`;
const LOGOUT_ENDPOINT = `${API_URL}/auth/logout`;

// Token storage keys
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const TOKEN_EXPIRY_KEY = 'auth_expiry';

// Token refresh configuration
const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000; // 14 minutes
const TOKEN_EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Initialize state
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: true,
    error: null
  });
  
  // Set up axios interceptor for adding auth token to requests
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      (config) => {
        if (authState.token) {
          config.headers['Authorization'] = `Bearer ${authState.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, [authState.token]);
  
  // Set up automatic token refresh
  useEffect(() => {
    let refreshTimer: NodeJS.Timeout | null = null;
    
    if (authState.isAuthenticated && authState.token) {
      refreshTimer = setInterval(() => {
        refreshSession().catch(() => {
          // If refresh fails, log the user out
          handleLogout();
        });
      }, TOKEN_REFRESH_INTERVAL);
    }
    
    return () => {
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, [authState.isAuthenticated, authState.token]);
  
  // Initialize auth state from localStorage on first load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);
        const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
        
        if (storedToken && storedUser && expiryTime) {
          const user = JSON.parse(storedUser) as User;
          const expiry = parseInt(expiryTime, 10);
          
          // Check if token is expired
          if (Date.now() > expiry) {
            // Try to refresh the token
            const refreshed = await refreshSession();
            if (!refreshed) {
              handleLogout();
            }
          } else {
            setAuthState({
              isAuthenticated: true,
              user,
              token: storedToken,
              loading: false,
              error: null
            });
          }
        } else {
          // No stored credentials
          setAuthState(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error('Failed to initialize auth state:', error);
        setAuthState({
          isAuthenticated: false,
          user: null,
          token: null,
          loading: false,
          error: 'Failed to initialize authentication state'
        });
      }
    };
    
    initializeAuth();
  }, []);
  
  // Handle login
  const handleLogin = async (credentials: { username: string; password: string }) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await axios.post(LOGIN_ENDPOINT, credentials);
      const { token, user, expiresIn = 900 } = response.data; // expiresIn in seconds
      
      if (!token || !user) {
        throw new Error('Invalid response from server');
      }
      
      // Calculate expiry time (current time + expiresIn in milliseconds)
      const expiryTime = Date.now() + (expiresIn * 1000);
      
      // Store auth data
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
      
      setAuthState({
        isAuthenticated: true,
        user,
        token,
        loading: false,
        error: null
      });
      
      // Redirect to dashboard or intended page
      const origin = location.state?.from?.pathname || '/dashboard';
      navigate(origin);
    } catch (error: any) {
      console.error('Login failed:', error);
      
      let errorMessage = 'Authentication failed. Please try again.';
      if (error.response?.status === 401) {
        errorMessage = 'Invalid username or password';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: errorMessage
      }));
    }
  };
  
  // Handle logout
  const handleLogout = useCallback(() => {
    try {
      // Call logout endpoint if authenticated (but don't wait for it)
      if (authState.token) {
        axios.post(LOGOUT_ENDPOINT, {}, {
          headers: { Authorization: `Bearer ${authState.token}` }
        }).catch(err => console.error('Logout API error:', err));
      }
    } finally {
      // Clear stored auth data
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      
      // Reset auth state
      setAuthState({
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null
      });
      
      // Redirect to login page
      navigate('/login');
    }
  }, [authState.token, navigate]);
  
  // Refresh user session
  const refreshSession = async (): Promise<boolean> => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      
      if (!storedToken) {
        return false;
      }
      
      const response = await axios.post(REFRESH_ENDPOINT, {}, {
        headers: { Authorization: `Bearer ${storedToken}` }
      });
      
      const { token, expiresIn = 900 } = response.data; // expiresIn in seconds
      
      if (!token) {
        throw new Error('Invalid response from refresh token endpoint');
      }
      
      // Calculate new expiry time
      const expiryTime = Date.now() + (expiresIn * 1000);
      
      // Update token in localStorage
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
      
      // Update auth state
      setAuthState(prev => ({
        ...prev,
        token,
        loading: false,
        error: null
      }));
      
      return true;
    } catch (error) {
      console.error('Session refresh failed:', error);
      return false;
    }
  };
  
  // Check if user has specified role(s)
  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!authState.user) return false;
    
    if (Array.isArray(roles)) {
      return roles.includes(authState.user.role);
    }
    
    return authState.user.role === roles;
  };
  
  // Clear error
  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }));
  };
  
  // Provide auth context
  const value: AuthContextType = {
    ...authState,
    login: handleLogin,
    logout: handleLogout,
    refreshSession,
    hasRole,
    clearError
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// HOC to protect routes
export const withAuth = (WrappedComponent: React.ComponentType, allowedRoles?: UserRole[]) => {
  return (props: any) => {
    const { isAuthenticated, loading, user, hasRole } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    useEffect(() => {
      if (!loading && !isAuthenticated) {
        // Redirect to login if not authenticated
        navigate('/login', { state: { from: location } });
      } else if (!loading && isAuthenticated && allowedRoles && user) {
        // Check role-based access
        if (!hasRole(allowedRoles)) {
          // Redirect to unauthorized page
          navigate('/unauthorized');
        }
      }
    }, [loading, isAuthenticated, user, navigate, location, hasRole]);
    
    if (loading) {
      return <div>Loading...</div>; // Or your loading component
    }
    
    if (!isAuthenticated) {
      return null; // Will redirect in useEffect
    }
    
    if (allowedRoles && !hasRole(allowedRoles)) {
      return null; // Will redirect in useEffect
    }
    
    return <WrappedComponent {...props} />;
  };
};

// Example usage in routes:
/*
import { AuthProvider, useAuth, withAuth, UserRole } from './AuthProvider';

// In your app component
function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={withAuth(DashboardPage)} />
          <Route 
            path="/admin" 
            element={withAuth(AdminPage, [UserRole.ATO, UserRole.AIRLINE])} 
          />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

// In your login component
function LoginPage() {
  const { login, error, clearError } = useAuth();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;
    await login({ username, password });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <input name="username" type="text" required />
      <input name="password" type="password" required />
      <button type="submit">Login</button>
    </form>
  );
}
*/
