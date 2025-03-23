// src/frontend/components/dashboard/MainDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';
import { useAuth, Permission } from '../auth/UserAuth';

// Types
interface DashboardTile {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  requiredPermission?: Permission;
  highlight?: boolean;
}

interface QuickAction {
  id: string;
  title: string;
  link: string;
  icon: React.ReactNode;
  requiredPermission?: Permission;
}

interface RecentActivity {
  id: string;
  type: 'syllabus' | 'assessment' | 'document' | 'compliance' | 'user';
  action: string;
  details: string;
  timestamp: Date;
  user: {
    id: string;
    name: string;
    photoUrl?: string;
  };
  link?: string;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  timestamp: Date;
  isRead: boolean;
  link?: string;
}

interface TraineeProgress {
  traineeName: string;
  traineeId: string;
  programName: string;
  programId: string;
  progress: number;
  lastActivity: Date;
  status: 'on_track' | 'behind' | 'ahead' | 'completed';
}

interface UpcomingTraining {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  trainees: number;
  instructors: string[];
  location?: string;
}

// Dashboard Component
interface MainDashboardProps {
  recentActivities: RecentActivity[];
  notifications: NotificationItem[];
  traineeProgress?: TraineeProgress[];
  upcomingTraining?: UpcomingTraining[];
  onNotificationRead: (id: string) => Promise<void>;
  onNotificationClear: (id: string) => Promise<void>;
  onAllNotificationsRead: () => Promise<void>;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  recentActivities,
  notifications,
  traineeProgress,
  upcomingTraining,
  onNotificationRead,
  onNotificationClear,
  onAllNotificationsRead
}) => {
  const { user } = useAuth();
  const [unreadNotifications, setUnreadNotifications] = useState<NotificationItem[]>([]);
  
  useEffect(() => {
    setUnreadNotifications(notifications.filter(notification => !notification.isRead));
  }, [notifications]);
  
  // Dashboard tiles based on user role
  const dashboardTiles: DashboardTile[] = [
    {
      id: 'syllabus',
      title: 'Syllabus Builder',
      description: 'Create and manage training syllabi with drag-and-drop modules and regulatory compliance checking.',
      icon: (
        <svg className="h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
        </svg>
      ),
      link: '/syllabus',
      requiredPermission: Permission.EDIT_SYLLABUS
    },
    {
      id: 'documents',
      title: 'Document Management',
      description: 'Upload and process training materials, regulations, and references for content extraction.',
      icon: (
        <svg className="h-8 w-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
        </svg>
      ),
      link: '/documents',
      requiredPermission: Permission.UPLOAD_DOCUMENTS
    },
    {
      id: 'assessment',
      title: 'Assessment & Grading',
      description: 'Create, administer, and grade training assessments with performance tracking.',
      icon: (
        <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      ),
      link: '/assessment',
      requiredPermission: Permission.CREATE_ASSESSMENT
    },
    {
      id: 'compliance',
      title: 'Compliance Engine',
      description: 'Verify training content against regulatory frameworks and generate compliance reports.',
      icon: (
        <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
        </svg>
      ),
      link: '/compliance',
      requiredPermission: Permission.CHECK_COMPLIANCE
    },
    {
      id: 'simulator',
      title: 'Simulator Integration',
      description: 'Connect to flight simulators, configure scenarios, and track performance metrics.',
      icon: (
        <svg className="h-8 w-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"></path>
        </svg>
      ),
      link: '/simulator'
    },
    {
      id: 'analytics',
      title: 'Analytics & Reports',
      description: 'View comprehensive analytics on training effectiveness and generate custom reports.',
      icon: (
        <svg className="h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
        </svg>
      ),
      link: '/analytics',
      requiredPermission: Permission.VIEW_ANALYTICS
    }
  ];
  
  // Quick actions based on user role
  const quickActions: QuickAction[] = [
    {
      id: 'create-syllabus',
      title: 'Create New Syllabus',
      link: '/syllabus/new',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
        </svg>
      ),
      requiredPermission: Permission.EDIT_SYLLABUS
    },
    {
      id: 'upload-document',
      title: 'Upload Document',
      link: '/documents/upload',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"></path>
        </svg>
      ),
      requiredPermission: Permission.UPLOAD_DOCUMENTS
    },
    {
      id: 'create-assessment',
      title: 'Create Assessment',
      link: '/assessment/new',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
        </svg>
      ),
      requiredPermission: Permission.CREATE_ASSESSMENT
    },
    {
      id: 'check-compliance',
      title: 'Check Compliance',
      link: '/compliance/check',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
        </svg>
      ),
      requiredPermission: Permission.CHECK_COMPLIANCE
    },
    {
      id: 'generate-report',
      title: 'Generate Report',
      link: '/analytics/reports',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
        </svg>
      ),
      requiredPermission: Permission.EXPORT_REPORTS
    }
  ];
  
  // Filter tiles and actions based on user permissions
  const filteredTiles = dashboardTiles.filter(tile => 
    !tile.requiredPermission || user?.permissions.includes(tile.requiredPermission)
  );
  
  const filteredActions = quickActions.filter(action => 
    !action.requiredPermission || user?.permissions.includes(action.requiredPermission)
  );
  
  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  };
  
  // Get icon for activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'syllabus':
        return (
          <div className="p-2 rounded-full bg-blue-100">
            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
          </div>
        );
      case 'assessment':
        return (
          <div className="p-2 rounded-full bg-green-100">
            <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        );
      case 'document':
        return (
          <div className="p-2 rounded-full bg-purple-100">
            <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
          </div>
        );
      case 'compliance':
        return (
          <div className="p-2 rounded-full bg-red-100">
            <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
            </svg>
          </div>
        );
      case 'user':
        return (
          <div className="p-2 rounded-full bg-yellow-100">
            <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-full bg-gray-100">
            <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        );
    }
  };
  
  // Get icon for notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info':
        return (
          <div className="p-2 rounded-full bg-blue-100">
            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="p-2 rounded-full bg-yellow-100">
            <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
        );
      case 'success':
        return (
          <div className="p-2 rounded-full bg-green-100">
            <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="p-2 rounded-full bg-red-100">
            <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-full bg-gray-100">
            <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
            </svg>
          </div>
        );
    }
  };
  
  // Get status badge for trainee progress
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on_track':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            On Track
          </span>
        );
      case 'behind':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Behind
          </span>
        );
      case 'ahead':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Ahead
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        );
    }
  };
  
  return (
    <div className="main-dashboard">
      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName}
        </h1>
        <p className="text-gray-500">
          Here's what's happening with your training programs.
        </p>
      </div>
      
      {/* Quick Actions */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-lg font-medium">Quick Actions</h2>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {filteredActions.map(action => (
            <Link 
              key={action.id} 
              to={action.link} 
              className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="p-2 rounded-full bg-white shadow-sm mb-2">
                {action.icon}
              </div>
              <span className="text-sm font-medium text-center">{action.title}</span>
            </Link>
          ))}
        </div>
      </Card>
      
      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Recent Activity */}
        <div className="md:col-span-2">
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Recent Activity</h2>
            </div>
            
            {recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.slice(0, 5).map(activity => (
                  <div key={activity.id} className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.action}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTimeAgo(activity.timestamp)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500">{activity.details}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        by {activity.user.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                No recent activity to display.
              </div>
            )}
            
            {recentActivities.length > 5 && (
              <div className="mt-4 text-center">
                <Link to="/activity" className="text-sm text-blue-600 hover:text-blue-500">
                  View all activity
                </Link>
              </div>
            )}
          </Card>
        </div>
        
        {/* Notifications */}
        <div>
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">
                Notifications
                {unreadNotifications.length > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {unreadNotifications.length}
                  </span>
                )}
              </h2>
              
              {notifications.length > 0 && (
                <Button
                  variant="outline"
                  size="small"
                  onClick={onAllNotificationsRead}
                >
                  Mark All Read
                </Button>
              )}
            </div>
            
            {notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`flex items-start p-3 rounded-lg ${!notification.isRead ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex-shrink-0 mr-3">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <div className="flex">
                          {!notification.isRead && (
                            <button
                              onClick={() => onNotificationRead(notification.id)}
                              className="text-blue-600 hover:text-blue-500 mr-1"
                              title="Mark as read"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => onNotificationClear(notification.id)}
                            className="text-gray-400 hover:text-gray-500"
                            title="Clear notification"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTimeAgo(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                No new notifications.
              </div>
            )}
          </Card>
        </div>
      </div>
      
      {/* Main Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {filteredTiles.map(tile => (
          <Link
            key={tile.id}
            to={tile.link}
            className={`group block rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
              tile.highlight ? 'border-2 border-blue-500' : 'border border-gray-200'
            }`}
          >
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  {tile.icon}
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                  {tile.title}
                </h3>
              </div>
              <p className="text-gray-500">{tile.description}</p>
            </div>
          </Link>
        ))}
      </div>
      
      {/* Trainee Dashboard Specific Sections */}
      {user?.role === 'trainee' && traineeProgress && (
        <div className="mb-6">
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Your Training Progress</h2>
              <Link to="/training/progress" className="text-sm text-blue-600 hover:text-blue-500">
                View Details
              </Link>
            </div>
            
            <div className="space-y-4">
              {traineeProgress.map((program, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h3 className="font-medium">{program.programName}</h3>
                      <p className="text-sm text-gray-500">
                        Last activity: {formatTimeAgo(program.lastActivity)}
                      </p>
                    </div>
                    {getStatusBadge(program.status)}
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                    <div
                      className={`h-2.5 rounded-full ${
                        program.status === 'behind' ? 'bg-red-600' :
                        program.status === 'ahead' ? 'bg-blue-600' :
                        program.status === 'completed' ? 'bg-purple-600' :
                        'bg-green-600'
                      }`}
                      style={{ width: `${program.progress}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span>{program.progress}% complete</span>
                    <span>100%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
      
      {/* Instructor Dashboard Specific Sections */}
      {user?.role === 'instructor' && upcomingTraining && (
        <div className="mb-6">
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Upcoming Training Sessions</h2>
              <Link to="/instructor/schedule" className="text-sm text-blue-600 hover:text-blue-500">
                View Schedule
              </Link>
            </div>
            
            <div className="space-y-4">
              {upcomingTraining.map(training => (
                <div key={training.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{training.title}</h3>
                      <p className="text-sm text-gray-500">{training.description}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {new Date(training.startDate).toLocaleDateString()} - {new Date(training.endDate).toLocaleDateString()}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {training.trainees} Trainees
                        </span>
                        {training.location && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {training.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      to={`/instructor/training/${training.id}`}
                      className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
