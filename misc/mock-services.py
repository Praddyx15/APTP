// src/frontend/services/mockAuth.ts
import { User, UserRole, Permission } from '../components/auth/UserAuth';

// Mock users for development
const mockUsers: User[] = [
  {
    id: 'user-1',
    username: 'admin',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: UserRole.ADMIN,
    permissions: [
      Permission.VIEW_DASHBOARD,
      Permission.EDIT_SYLLABUS,
      Permission.APPROVE_SYLLABUS,
      Permission.CREATE_ASSESSMENT,
      Permission.GRADE_ASSESSMENT,
      Permission.MANAGE_USERS,
      Permission.VIEW_ANALYTICS,
      Permission.EXPORT_REPORTS,
      Permission.CHECK_COMPLIANCE,
      Permission.UPLOAD_DOCUMENTS
    ],
    lastLogin: new Date(),
    photoUrl: '',
    organization: 'Training Academy',
    department: 'Administration'
  },
  {
    id: 'user-2',
    username: 'instructor',
    email: 'instructor@example.com',
    firstName: 'John',
    lastName: 'Instructor',
    role: UserRole.INSTRUCTOR,
    permissions: [
      Permission.VIEW_DASHBOARD,
      Permission.EDIT_SYLLABUS,
      Permission.CREATE_ASSESSMENT,
      Permission.GRADE_ASSESSMENT,
      Permission.VIEW_ANALYTICS
    ],
    lastLogin: new Date(),
    photoUrl: '',
    organization: 'Training Academy',
    department: 'Flight Instruction'
  },
  {
    id: 'user-3',
    username: 'trainee',
    email: 'trainee@example.com',
    firstName: 'Sarah',
    lastName: 'Trainee',
    role: UserRole.TRAINEE,
    permissions: [
      Permission.VIEW_DASHBOARD
    ],
    lastLogin: new Date(),
    photoUrl: '',
    organization: 'Training Academy',
    department: 'Student Pilots'
  },
  {
    id: 'user-4',
    username: 'compliance',
    email: 'compliance@example.com',
    firstName: 'Robert',
    lastName: 'Officer',
    role: UserRole.COMPLIANCE_OFFICER,
    permissions: [
      Permission.VIEW_DASHBOARD,
      Permission.CHECK_COMPLIANCE,
      Permission.VIEW_ANALYTICS,
      Permission.EXPORT_REPORTS
    ],
    lastLogin: new Date(),
    photoUrl: '',
    organization: 'Training Academy',
    department: 'Compliance'
  },
  {
    id: 'user-5',
    username: 'content',
    email: 'content@example.com',
    firstName: 'Maria',
    lastName: 'Manager',
    role: UserRole.CONTENT_MANAGER,
    permissions: [
      Permission.VIEW_DASHBOARD,
      Permission.EDIT_SYLLABUS,
      Permission.UPLOAD_DOCUMENTS
    ],
    lastLogin: new Date(),
    photoUrl: '',
    organization: 'Training Academy',
    department: 'Content Development'
  }
];

// Mock Auth Service
export const mockAuthService = {
  // Login function
  login: async (username: string, password: string): Promise<User> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Find user
    const user = mockUsers.find(user => user.username === username);
    
    if (!user) {
      throw new Error('Invalid username or password.');
    }
    
    // In a real app, you would check the password here
    // For the mock, we'll just pretend all passwords are 'password'
    if (password !== 'password') {
      throw new Error('Invalid username or password.');
    }
    
    // Update last login
    user.lastLogin = new Date();
    
    // Store in localStorage for persistence (only in development)
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    return user;
  },
  
  // Logout function
  logout: async (): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Remove from localStorage
    localStorage.removeItem('currentUser');
  },
  
  // Get current user
  getCurrentUser: async (): Promise<User | null> => {
    // Check localStorage
    const userJson = localStorage.getItem('currentUser');
    
    if (!userJson) {
      return null;
    }
    
    try {
      const user = JSON.parse(userJson) as User;
      
      // Convert date strings back to Date objects
      if (user.lastLogin) {
        user.lastLogin = new Date(user.lastLogin);
      }
      
      return user;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return null;
    }
  },
  
  // Update profile
  updateProfile: async (userId: string, updates: Partial<User>): Promise<User> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 700));
    
    // Find user
    const userIndex = mockUsers.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found.');
    }
    
    // Update user
    const updatedUser = {
      ...mockUsers[userIndex],
      ...updates
    };
    
    mockUsers[userIndex] = updatedUser;
    
    // Update in localStorage if it's the current user
    const currentUserJson = localStorage.getItem('currentUser');
    if (currentUserJson) {
      const currentUser = JSON.parse(currentUserJson) as User;
      
      if (currentUser.id === userId) {
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      }
    }
    
    return updatedUser;
  },
  
  // Change password (mock implementation)
  changePassword: async (userId: string, currentPassword: string, newPassword: string): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // In a real app, you would verify the current password and update the password
    // For the mock, we'll just check if the current password is 'password'
    if (currentPassword !== 'password') {
      throw new Error('Current password is incorrect.');
    }
    
    // Password updated successfully (in a real app)
    console.log(`Password updated for user ${userId}`);
  },
  
  // Forgot password
  forgotPassword: async (email: string): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Find user by email
    const user = mockUsers.find(user => user.email === email);
    
    if (!user) {
      // We don't want to reveal whether an email exists in the system
      // So we'll just return success regardless
      return;
    }
    
    // In a real app, you would send a password reset email
    console.log(`Password reset link sent to ${email}`);
  },
  
  // Upload profile photo (mock implementation)
  uploadProfilePhoto: async (userId: string, file: File): Promise<string> => {
    // Simulate API delay and upload
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In a real app, you would upload the file to a server or cloud storage
    // For the mock, we'll just return a fake URL
    const photoUrl = `https://example.com/photos/${userId}/profile.jpg`;
    
    // Update user
    const userIndex = mockUsers.findIndex(user => user.id === userId);
    
    if (userIndex !== -1) {
      mockUsers[userIndex].photoUrl = photoUrl;
      
      // Update in localStorage if it's the current user
      const currentUserJson = localStorage.getItem('currentUser');
      if (currentUserJson) {
        const currentUser = JSON.parse(currentUserJson) as User;
        
        if (currentUser.id === userId) {
          currentUser.photoUrl = photoUrl;
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
      }
    }
    
    return photoUrl;
  }
};

// src/frontend/services/mockNotifications.ts
import { Notification, NotificationType } from '../components/notifications/NotificationSystem';

// Example notifications for development
const createMockNotifications = (): Notification[] => {
  const now = new Date();
  
  return [
    {
      id: 'notification-1',
      title: 'New Assessment Assigned',
      message: 'You have been assigned a new flight assessment for tomorrow at 10:00 AM.',
      type: NotificationType.INFO,
      createdAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
      link: '/assessment/123',
      category: 'Assessment',
      source: 'System',
      isExpanded: false
    },
    {
      id: 'notification-2',
      title: 'Document Processing Complete',
      message: 'Your flight manual document has been processed successfully. View it in the documents section.',
      type: NotificationType.SUCCESS,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      readAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
      link: '/documents/456',
      category: 'Documents',
      source: 'System',
      isExpanded: false
    },
    {
      id: 'notification-3',
      title: 'Compliance Issue Detected',
      message: 'A compliance issue has been detected in the Advanced Navigation training module. Please review and address this issue as soon as possible.',
      type: NotificationType.WARNING,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      link: '/compliance/789',
      category: 'Compliance',
      source: 'Compliance Engine',
      isExpanded: false
    },
    {
      id: 'notification-4',
      title: 'System Maintenance',
      message: 'The system will be down for maintenance on Saturday, March 20, 2025 from 2:00 AM to 4:00 AM UTC. Please plan accordingly.',
      type: NotificationType.INFO,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      readAt: new Date(now.getTime() - 1.5 * 24 * 60 * 60 * 1000), // 1.5 days ago
      category: 'System',
      source: 'Admin',
      isExpanded: false
    },
    {
      id: 'notification-5',
      title: 'Simulator Connection Failed',
      message: 'The connection to the flight simulator failed. Please check your network connection and try again.',
      type: NotificationType.ERROR,
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      link: '/simulator',
      category: 'Simulator',
      source: 'System',
      isExpanded: false
    }
  ];
};

// Mock notifications array with initial data
let mockNotificationsList = createMockNotifications();

// Mock notification callbacks
type NotificationCallback = (notification: Notification) => void;
const notificationCallbacks: NotificationCallback[] = [];

// Mock new notifications every minute (for development)
setInterval(() => {
  if (notificationCallbacks.length > 0) {
    const types = [NotificationType.INFO, NotificationType.SUCCESS, NotificationType.WARNING, NotificationType.ERROR];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    const newNotification: Notification = {
      id: `notification-${Date.now()}`,
      title: `New ${randomType} Notification`,
      message: `This is a random ${randomType} notification generated for development purposes.`,
      type: randomType,
      createdAt: new Date(),
      category: 'System',
      source: 'Development',
      isExpanded: false
    };
    
    mockNotificationsList.unshift(newNotification);
    
    // Call all callbacks
    notificationCallbacks.forEach(callback => callback(newNotification));
  }
}, 60000); // Every minute

// Mock Notification Service
export const mockNotificationService = {
  // Get notifications
  getNotifications: async (): Promise<Notification[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return mockNotificationsList;
  },
  
  // Mark as read
  markAsRead: async (id: string): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Update notification
    mockNotificationsList = mockNotificationsList.map(notification => {
      if (notification.id === id && !notification.readAt) {
        return {
          ...notification,
          readAt: new Date()
        };
      }
      return notification;
    });
  },
  
  // Mark all as read
  markAllAsRead: async (): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Update all unread notifications
    mockNotificationsList = mockNotificationsList.map(notification => {
      if (!notification.readAt) {
        return {
          ...notification,
          readAt: new Date()
        };
      }
      return notification;
    });
  },
  
  // Delete notification
  deleteNotification: async (id: string): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Remove notification
    mockNotificationsList = mockNotificationsList.filter(notification => notification.id !== id);
  },
  
  // Clear all notifications
  clearAll: async (): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Clear all notifications
    mockNotificationsList = [];
  },
  
  // Subscribe to new notifications
  subscribeToNotifications: (callback: NotificationCallback): (() => void) => {
    notificationCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = notificationCallbacks.indexOf(callback);
      if (index !== -1) {
        notificationCallbacks.splice(index, 1);
      }
    };
  }
};

// src/frontend/services/mockData.ts
// This file contains mock data generators for various components

// Generate random date within a range
export const randomDate = (start: Date, end: Date): Date => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Generate random integer within a range
export const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Generate random element from array
export const randomElement = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// Generate mock data for dashboards
export const generateMockDashboardData = () => {
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  
  // Generate mock trainees
  const trainees = Array.from({ length: 25 }, (_, i) => ({
    id: `trainee-${i + 1}`,
    name: `Trainee ${i + 1}`,
    email: `trainee${i + 1}@example.com`,
    progress: randomInt(0, 100),
    lastActivity: randomDate(oneYearAgo, now),
    currentModule: `Module ${randomInt(1, 10)}`,
    pendingAssessments: randomInt(0, 5),
    overallScore: randomInt(60, 98),
    status: randomElement(['active', 'inactive', 'on_leave'])
  }));
  
  // Generate mock training sessions
  const trainingSessions = Array.from({ length: 10 }, (_, i) => {
    const startDate = randomDate(now, new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()));
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + randomInt(1, 8));
    
    return {
      id: `session-${i + 1}`,
      title: `Training Session ${i + 1}`,
      description: `Description for training session ${i + 1}`,
      startDate,
      endDate,
      status: randomElement(['scheduled', 'in_progress', 'completed', 'cancelled']),
      location: randomElement(['Simulator Room A', 'Classroom 101', 'Hangar B', 'Online']),
      trainees: Array.from({ length: randomInt(3, 12) }, (_, j) => ({
        id: `trainee-${j + 1}`,
        name: `Trainee ${j + 1}`,
        email: `trainee${j + 1}@example.com`,
        status: randomElement(['confirmed', 'pending', 'attended', 'absent'])
      }))
    };
  });
  
  // Generate mock assessments
  const assessments = Array.from({ length: 15 }, (_, i) => ({
    id: `assessment-${i + 1}`,
    title: `Assessment ${i + 1}`,
    traineeName: `Trainee ${randomInt(1, 25)}`,
    traineeId: `trainee-${randomInt(1, 25)}`,
    date: randomDate(oneYearAgo, now),
    status: randomElement(['pending_review', 'graded', 'scheduled']),
    score: randomInt(0, 100),
    maxScore: 100,
    sessionId: randomElement([`session-${randomInt(1, 10)}`, undefined])
  }));
  
  return {
    trainees,
    trainingSessions,
    assessments
  };
};

// Generate mock data for analytics
export const generateMockAnalyticsData = () => {
  // Mock overall stats
  const overallStats = {
    activeTrainees: randomInt(50, 150),
    completedTrainees: randomInt(20, 80),
    avgProgramScore: randomInt(70, 90),
    complianceRate: randomInt(85, 99)
  };
  
  // Generate trainee metrics
  const trainees = Array.from({ length: 30 }, (_, i) => ({
    id: `trainee-${i + 1}`,
    name: `Trainee ${i + 1}`,
    overallScore: randomInt(60, 98),
    completedModules: randomInt(0, 10),
    totalModules: 10,
    lastAssessmentDate: randomDate(new Date(2024, 0, 1), new Date()),
    riskLevel: randomElement(['low', 'medium', 'high']),
    trend: randomElement(['improving', 'stable', 'declining']),
    programCompletion: randomInt(0, 100),
    competencyScores: []
  }));
  
  // Generate program metrics
  const programs = Array.from({ length: 8 }, (_, i) => ({
    id: `program-${i + 1}`,
    name: `Training Program ${i + 1}`,
    traineesCount: randomInt(5, 30),
    avgCompletion: randomInt(0, 100),
    avgScore: randomInt(60, 95),
    moduleCompletionRates: [],
    complianceStatus: randomElement(['compliant', 'nonCompliant', 'partiallyCompliant']),
    startDate: randomDate(new Date(2023, 0, 1), new Date(2024, 0, 1)),
    endDate: randomDate(new Date(2024, 3, 1), new Date(2025, 0, 1)),
    instructors: []
  }));
  
  // Generate compliance metrics
  const complianceMetrics = Array.from({ length: 12 }, (_, i) => ({
    requirementId: `req-${i + 1}`,
    requirementName: `Requirement ${i + 1}`,
    description: `Description for requirement ${i + 1}`,
    status: randomElement(['met', 'notMet', 'partiallyMet']),
    coverage: randomInt(0, 100),
    importance: randomElement(['critical', 'high', 'medium', 'low']),
    regulationReference: `REG-${randomInt(100, 999)}`
  }));
  
  return {
    overallStats,
    trainees,
    programs,
    complianceMetrics
  };
};
