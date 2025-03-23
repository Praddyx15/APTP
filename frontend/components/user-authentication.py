// src/frontend/components/auth/UserAuth.tsx
import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { Form } from '../ui/Form';

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: Permission[];
  photoUrl?: string;
  organization?: string;
  department?: string;
  lastLogin?: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  INSTRUCTOR = 'instructor',
  TRAINEE = 'trainee',
  CONTENT_MANAGER = 'content_manager',
  COMPLIANCE_OFFICER = 'compliance_officer'
}

export enum Permission {
  VIEW_DASHBOARD = 'view_dashboard',
  EDIT_SYLLABUS = 'edit_syllabus',
  APPROVE_SYLLABUS = 'approve_syllabus',
  CREATE_ASSESSMENT = 'create_assessment',
  GRADE_ASSESSMENT = 'grade_assessment',
  MANAGE_USERS = 'manage_users',
  VIEW_ANALYTICS = 'view_analytics',
  EXPORT_REPORTS = 'export_reports',
  CHECK_COMPLIANCE = 'check_compliance',
  UPLOAD_DOCUMENTS = 'upload_documents'
}

// Login Form Component
interface LoginFormProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  isLoading: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  onForgotPassword,
  isLoading
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!username || !password) {
      setError('Username and password are required.');
      return;
    }
    
    try {
      await onLogin(username, password);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed. Please try again.');
    }
  };
  
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email) {
      setError('Email is required.');
      return;
    }
    
    try {
      await onForgotPassword(email);
      setError(null);
      alert('Password reset link has been sent to your email.');
      setShowForgotPassword(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send reset link. Please try again.');
    }
  };
  
  return (
    <Card className="max-w-md mx-auto">
      <div className="px-4 py-5 sm:p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Advanced Pilot Training Platform
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Sign in to your account
          </p>
        </div>
        
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        
        {!showForgotPassword ? (
          <Form onSubmit={handleSubmit}>
            <Input
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>
              
              <div className="text-sm">
                <button
                  type="button"
                  className="font-medium text-blue-600 hover:text-blue-500"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot your password?
                </button>
              </div>
            </div>
            
            <Button
              variant="primary"
              type="submit"
              className="w-full"
              isLoading={isLoading}
              disabled={isLoading}
            >
              Sign In
            </Button>
          </Form>
        ) : (
          <Form onSubmit={handleForgotPassword}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowForgotPassword(false)}
              >
                Back to Login
              </Button>
              
              <Button
                variant="primary"
                type="submit"
                isLoading={isLoading}
                disabled={isLoading}
              >
                Send Reset Link
              </Button>
            </div>
          </Form>
        )}
      </div>
    </Card>
  );
};

// User Profile Component
interface UserProfileProps {
  user: User;
  onUpdateProfile: (updates: Partial<User>) => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onUploadProfilePhoto: (file: File) => Promise<string>;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  onUpdateProfile,
  onChangePassword,
  onUploadProfilePhoto
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    organization: user.organization || '',
    department: user.department || ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    
    try {
      await onUpdateProfile(formData);
      setSuccessMessage('Profile updated successfully.');
      setIsEditing(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onChangePassword(passwordData.currentPassword, passwordData.newPassword);
      setSuccessMessage('Password changed successfully.');
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to change password.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const photoUrl = await onUploadProfilePhoto(file);
      await onUpdateProfile({ photoUrl });
      setSuccessMessage('Profile photo updated successfully.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to upload profile photo.');
    }
  };
  
  // Function to get human-readable role name
  const getRoleName = (role: UserRole): string => {
    switch (role) {
      case UserRole.ADMIN:
        return 'Administrator';
      case UserRole.INSTRUCTOR:
        return 'Instructor';
      case UserRole.TRAINEE:
        return 'Trainee';
      case UserRole.CONTENT_MANAGER:
        return 'Content Manager';
      case UserRole.COMPLIANCE_OFFICER:
        return 'Compliance Officer';
      default:
        return role;
    }
  };
  
  return (
    <div className="user-profile">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMessage && <Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />}
      
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="flex-shrink-0 mr-4">
              {user.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-xl font-medium text-gray-500">
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-sm text-gray-500">{getRoleName(user.role)}</p>
              {user.lastLogin && (
                <p className="text-xs text-gray-400">
                  Last login: {new Date(user.lastLogin).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <input
                type="file"
                id="profile-photo"
                className="hidden"
                accept="image/*"
                onChange={handlePhotoUpload}
              />
              <Button
                variant="outline"
                size="small"
                onClick={() => document.getElementById('profile-photo')?.click()}
              >
                Change Photo
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="small"
              onClick={() => setIsChangingPassword(true)}
            >
              Change Password
            </Button>
            
            <Button
              variant={isEditing ? 'primary' : 'outline'}
              size="small"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </div>
        </div>
      </Card>
      
      {isEditing ? (
        <Card>
          <h3 className="text-lg font-medium mb-4">Edit Profile</h3>
          
          <Form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
              />
              
              <Input
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
              />
              
              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              
              <Input
                label="Organization"
                name="organization"
                value={formData.organization}
                onChange={handleInputChange}
              />
              
              <Input
                label="Department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="flex justify-end mt-6 space-x-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              
              <Button
                variant="primary"
                type="submit"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                Save Changes
              </Button>
            </div>
          </Form>
        </Card>
      ) : isChangingPassword ? (
        <Card>
          <h3 className="text-lg font-medium mb-4">Change Password</h3>
          
          <Form onSubmit={handlePasswordSubmit}>
            <Input
              label="Current Password"
              name="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              required
            />
            
            <Input
              label="New Password"
              name="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              required
            />
            
            <Input
              label="Confirm New Password"
              name="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              required
            />
            
            <div className="flex justify-end mt-6 space-x-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsChangingPassword(false)}
              >
                Cancel
              </Button>
              
              <Button
                variant="primary"
                type="submit"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                Change Password
              </Button>
            </div>
          </Form>
        </Card>
      ) : (
        <Card>
          <h3 className="text-lg font-medium mb-4">Profile Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Username</p>
              <p className="mt-1">{user.username}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="mt-1">{user.email}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Organization</p>
              <p className="mt-1">{user.organization || 'Not specified'}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Department</p>
              <p className="mt-1">{user.department || 'Not specified'}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Role</p>
              <p className="mt-1">{getRoleName(user.role)}</p>
            </div>
          </div>
          
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-500 mb-2">Permissions</h4>
            <div className="flex flex-wrap gap-2">
              {user.permissions.map(permission => (
                <span 
                  key={permission} 
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {permission.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

// User Authentication Provider
import { createContext, useContext } from 'react';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  uploadProfilePhoto: (file: File) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
  authService: {
    login: (username: string, password: string) => Promise<User>;
    logout: () => Promise<void>;
    forgotPassword: (email: string) => Promise<void>;
    updateProfile: (userId: string, updates: Partial<User>) => Promise<User>;
    changePassword: (userId: string, currentPassword: string, newPassword: string) => Promise<void>;
    uploadProfilePhoto: (userId: string, file: File) => Promise<string>;
    getCurrentUser: () => Promise<User | null>;
  };
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, authService }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize user on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initAuth();
  }, [authService]);
  
  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const user = await authService.login(username, password);
      setUser(user);
    } finally {
      setIsLoading(false);
    }
  };
  
  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  const forgotPassword = async (email: string) => {
    await authService.forgotPassword(email);
  };
  
  const updateProfile = async (updates: Partial<User>) => {
    if (!user) throw new Error('User not authenticated');
    
    const updatedUser = await authService.updateProfile(user.id, updates);
    setUser(updatedUser);
  };
  
  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error('User not authenticated');
    
    await authService.changePassword(user.id, currentPassword, newPassword);
  };
  
  const uploadProfilePhoto = async (file: File) => {
    if (!user) throw new Error('User not authenticated');
    
    return await authService.uploadProfilePhoto(user.id, file);
  };
  
  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    forgotPassword,
    updateProfile,
    changePassword,
    uploadProfilePhoto
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: Permission[];
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions,
  fallback = <div>You do not have permission to access this page.</div>
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    // In a real app, this would redirect to login
    return <div>Please log in to access this page.</div>;
  }
  
  // Check permissions if required
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasPermission = requiredPermissions.every(permission => 
      user?.permissions.includes(permission)
    );
    
    if (!hasPermission) {
      return <>{fallback}</>;
    }
  }
  
  return <>{children}</>;
};
