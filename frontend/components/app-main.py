// src/frontend/App.tsx
import React from 'react';
import { AuthProvider } from './components/auth/UserAuth';
import { NotificationProvider } from './components/notifications/NotificationSystem';
import AppRoutes from './routes/Routes';
import { ThemeProvider } from './theme/Theme';

// Mock authentication service for demo purposes
const authService = {
  login: async (username: string, password: string) => {
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In a real app, this would make an API call
    if (username === 'admin' && password === 'password') {
      return {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        permissions: [
          'view_dashboard',
          'edit_syllabus',
          'approve_syllabus',
          'create_assessment',
          'grade_assessment',
          'manage_users',
          'view_analytics',
          'export_reports',
          'check_compliance',
          'upload_documents'
        ],
        lastLogin: new Date()
      };
    }
    
    if (username === 'instructor' && password === 'password') {
      return {
        id: '2',
        username: 'instructor',
        email: 'instructor@example.com',
        firstName: 'Instructor',
        lastName: 'User',
        role: 'instructor',
        permissions: [
          'view_dashboard',
          'create_assessment',
          'grade_assessment',
          'view_analytics'
        ],
        lastLogin: new Date()
      };
    }
    
    if (username === 'trainee' && password === 'password') {
      return {
        id: '3',
        username: 'trainee',
        email: 'trainee@example.com',
        firstName: 'Trainee',
        lastName: 'User',
        role: 'trainee',
        permissions: [
          'view_dashboard'
        ],
        lastLogin: new Date()
      };
    }
    
    throw new Error('Invalid credentials');
  },
  
  logout: async () => {
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 300));
    // In a real app, this would make an API call to invalidate session
    return;
  },
  
  forgotPassword: async (email: string) => {
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 500));
    // In a real app, this would trigger a password reset email
    if (!email) {
      throw new Error('Email is required');
    }
    return;
  },
  
  updateProfile: async (userId: string, updates: any) => {
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 500));
    // In a real app, this would update the user profile in the backend
    return {
      ...updates,
      id: userId
    };
  },
  
  changePassword: async (userId: string, currentPassword: string, newPassword: string) => {
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 500));
    // In a real app, this would verify current password and update to new password
    if (currentPassword === 'wrong') {
      throw new Error('Current password is incorrect');
    }
    return;
  },
  
  uploadProfilePhoto: async (userId: string, file: File) => {
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 1000));
    // In a real app, this would upload the file and return the URL
    return 'https://example.com/photos/profile.jpg';
  },
  
  getCurrentUser: async () => {
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 300));
    // In a real app, this would check for an active session
    // and return the user data if authenticated
    
    // For demo purposes, return null (not authenticated)
    return null;
  }
};

// Mock notification service for demo purposes
const notificationService = {
  getNotifications: async () => {
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return mock notifications
    return [
      {
        id: '1',
        title: 'New Assessment Assigned',
        message: 'You have been assigned a new assessment to complete by June 15th.',
        type: 'info',
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        category: 'Assessment',
        source: 'System'
      },
      {
        id: '2',
        title: 'Compliance Check Failed',
        message: 'Your recent syllabus update does not meet regulatory compliance. Please review the issues.',
        type: 'error',
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        readAt: new Date(Date.now() - 43200000), // 12 hours ago
        category: 'Compliance',
        source: 'System',
        link: '/compliance/check/123'
      },
      {
        id: '3',
        title: 'Training Session Reminder',
        message: 'Your scheduled training session starts tomorrow at 10:00 AM.',
        type: 'warning',
        createdAt: new Date(Date.now() - 172800000), // 2 days ago
        category: 'Schedule',
        source: 'System'
      }
    ];
  },
  
  markAsRead: async (id: string) => {
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 300));
    // In a real app, this would update the notification status in the backend
    return;
  },
  
  markAllAsRead: async () => {
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 300));
    // In a real app, this would update all notifications status in the backend
    return;
  },
  
  deleteNotification: async (id: string) => {
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 300));
    // In a real app, this would delete the notification in the backend
    return;
  },
  
  clearAll: async () => {
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 300));
    // In a real app, this would delete all notifications in the backend
    return;
  },
  
  subscribeToNotifications: (callback: (notification: any) => void) => {
    // In a real app, this would set up a WebSocket or long polling
    // to receive real-time notifications
    
    // For demo purposes, simulate a new notification every 30 seconds
    const interval = setInterval(() => {
      const mockNotification = {
        id: `new-${Date.now()}`,
        title: 'New System Update',
        message: 'The system has been updated with new features. Check it out!',
        type: 'info',
        createdAt: new Date(),
        category: 'System',
        source: 'System'
      };
      
      callback(mockNotification);
    }, 30000);
    
    // Return cleanup function
    return () => clearInterval(interval);
  }
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider authService={authService}>
        <NotificationProvider notificationService={notificationService}>
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;