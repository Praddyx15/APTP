// src/frontend/components/notifications/NotificationSystem.tsx
import React, { useState, useEffect, createContext, useContext } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { DataTable, Column } from '../ui/DataTable';

// Types
export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error'
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: Date;
  readAt?: Date;
  link?: string;
  category?: string;
  source?: string;
  isExpanded?: boolean;
}

// Notification Card Component
interface NotificationCardProps {
  notification: Notification;
  onRead: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onExpand: (id: string) => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onRead,
  onDelete,
  onExpand
}) => {
  // Determine icon based on notification type
  const getIcon = () => {
    switch (notification.type) {
      case NotificationType.INFO:
        return (
          <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      case NotificationType.SUCCESS:
        return (
          <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      case NotificationType.WARNING:
        return (
          <svg className="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        );
      case NotificationType.ERROR:
        return (
          <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
          </svg>
        );
    }
  };

  // Get background color based on type and read status
  const getBackgroundColor = () => {
    if (notification.readAt) {
      return 'bg-white';
    }
    
    switch (notification.type) {
      case NotificationType.INFO:
        return 'bg-blue-50';
      case NotificationType.SUCCESS:
        return 'bg-green-50';
      case NotificationType.WARNING:
        return 'bg-yellow-50';
      case NotificationType.ERROR:
        return 'bg-red-50';
      default:
        return 'bg-gray-50';
    }
  };

  // Format time
  const formatTime = (date: Date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }
    
    return notificationDate.toLocaleDateString();
  };

  return (
    <div className={`border rounded-lg p-4 mb-4 ${getBackgroundColor()}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">
          {getIcon()}
        </div>
        <div className="flex-grow">
          <div className="flex justify-between">
            <h3 className="text-sm font-medium">{notification.title}</h3>
            <div className="flex space-x-2">
              {!notification.readAt && (
                <button
                  className="text-blue-500 hover:text-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRead(notification.id);
                  }}
                  title="Mark as read"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </button>
              )}
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification.id);
                }}
                title="Delete"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
          <div 
            className={`mt-1 text-sm ${notification.isExpanded ? '' : 'line-clamp-2'}`}
            onClick={() => onExpand(notification.id)}
          >
            {notification.message}
          </div>
          <div className="mt-2 flex justify-between items-center">
            <div className="text-xs text-gray-500 flex space-x-2">
              <span>{formatTime(notification.createdAt)}</span>
              {notification.category && (
                <span>• {notification.category}</span>
              )}
              {notification.source && (
                <span>• {notification.source}</span>
              )}
            </div>
            {notification.link && (
              <a href={notification.link} className="text-sm text-blue-500 hover:text-blue-700">
                View
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Notification List Component
interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onClearAll: () => Promise<void>;
  onExpand: (id: string) => void;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onMarkAsRead,
  onDelete,
  onMarkAllAsRead,
  onClearAll,
  onExpand
}) => {
  const unreadCount = notifications.filter(n => !n.readAt).length;
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-medium">Notifications</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="flex space-x-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="small"
              onClick={onMarkAllAsRead}
            >
              Mark All as Read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="small"
              onClick={onClearAll}
            >
              Clear All
            </Button>
          )}
        </div>
      </div>
      
      {notifications.length > 0 ? (
        <div>
          {notifications.map(notification => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onRead={onMarkAsRead}
              onDelete={onDelete}
              onExpand={onExpand}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
          </svg>
          <p className="mt-2">No notifications to display</p>
        </div>
      )}
    </div>
  );
};

// Notification Page Component
interface NotificationPageProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onClearAll: () => Promise<void>;
  onFilter: (filter: { type?: NotificationType; readStatus?: 'read' | 'unread'; category?: string }) => void;
  categories: string[];
}

export const NotificationPage: React.FC<NotificationPageProps> = ({
  notifications,
  onMarkAsRead,
  onDelete,
  onMarkAllAsRead,
  onClearAll,
  onFilter,
  categories
}) => {
  const [activeFilter, setActiveFilter] = useState<{
    type?: NotificationType;
    readStatus?: 'read' | 'unread';
    category?: string;
  }>({});
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());

  // Handle expand notification content
  const handleExpand = (id: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Apply filters
  const applyFilter = (newFilter: { type?: NotificationType; readStatus?: 'read' | 'unread'; category?: string }) => {
    setActiveFilter(newFilter);
    onFilter(newFilter);
  };

  // Handle mark as read
  const handleMarkAsRead = async (id: string) => {
    try {
      await onMarkAsRead(id);
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to mark notification as read: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await onDelete(id);
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to delete notification: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await onMarkAllAsRead();
      setAlertMessage({
        type: 'success',
        message: 'All notifications marked as read'
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to mark all notifications as read: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Handle clear all
  const handleClearAll = async () => {
    try {
      await onClearAll();
      setAlertMessage({
        type: 'success',
        message: 'All notifications cleared'
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to clear all notifications: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Enhanced notifications with expanded state
  const enhancedNotifications = notifications.map(notification => ({
    ...notification,
    isExpanded: expandedNotifications.has(notification.id)
  }));

  return (
    <div className="notification-page">
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-gray-500">View and manage your notifications</p>
      </div>
      
      <Card className="mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant={activeFilter.type === undefined ? 'primary' : 'outline'}
            size="small"
            onClick={() => applyFilter({ ...activeFilter, type: undefined })}
          >
            All
          </Button>
          <Button
            variant={activeFilter.type === NotificationType.INFO ? 'primary' : 'outline'}
            size="small"
            onClick={() => applyFilter({ ...activeFilter, type: NotificationType.INFO })}
          >
            Info
          </Button>
          <Button
            variant={activeFilter.type === NotificationType.SUCCESS ? 'primary' : 'outline'}
            size="small"
            onClick={() => applyFilter({ ...activeFilter, type: NotificationType.SUCCESS })}
          >
            Success
          </Button>
          <Button
            variant={activeFilter.type === NotificationType.WARNING ? 'primary' : 'outline'}
            size="small"
            onClick={() => applyFilter({ ...activeFilter, type: NotificationType.WARNING })}
          >
            Warning
          </Button>
          <Button
            variant={activeFilter.type === NotificationType.ERROR ? 'primary' : 'outline'}
            size="small"
            onClick={() => applyFilter({ ...activeFilter, type: NotificationType.ERROR })}
          >
            Error
          </Button>
          
          <div className="ml-auto"></div>
          
          <Button
            variant={activeFilter.readStatus === undefined ? 'primary' : 'outline'}
            size="small"
            onClick={() => applyFilter({ ...activeFilter, readStatus: undefined })}
          >
            All
          </Button>
          <Button
            variant={activeFilter.readStatus === 'unread' ? 'primary' : 'outline'}
            size="small"
            onClick={() => applyFilter({ ...activeFilter, readStatus: 'unread' })}
          >
            Unread
          </Button>
          <Button
            variant={activeFilter.readStatus === 'read' ? 'primary' : 'outline'}
            size="small"
            onClick={() => applyFilter({ ...activeFilter, readStatus: 'read' })}
          >
            Read
          </Button>
        </div>
        
        {categories.length > 0 && (
          <div className="mb-4">
            <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Category
            </label>
            <select
              id="category-filter"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={activeFilter.category || ''}
              onChange={(e) => applyFilter({ ...activeFilter, category: e.target.value || undefined })}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <NotificationList
          notifications={enhancedNotifications}
          onMarkAsRead={handleMarkAsRead}
          onDelete={handleDelete}
          onMarkAllAsRead={handleMarkAllAsRead}
          onClearAll={handleClearAll}
          onExpand={handleExpand}
        />
      </Card>
    </div>
  );
};

// Toast Notification Component
interface ToastNotificationProps {
  notification: Notification;
  onDismiss: () => void;
  autoHideDuration?: number;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  notification,
  onDismiss,
  autoHideDuration = 5000
}) => {
  // Auto-dismiss notification after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, autoHideDuration);
    
    return () => clearTimeout(timer);
  }, [onDismiss, autoHideDuration]);

  // Get background color based on type
  const getBackgroundColor = () => {
    switch (notification.type) {
      case NotificationType.INFO:
        return 'bg-blue-50 border-blue-500';
      case NotificationType.SUCCESS:
        return 'bg-green-50 border-green-500';
      case NotificationType.WARNING:
        return 'bg-yellow-50 border-yellow-500';
      case NotificationType.ERROR:
        return 'bg-red-50 border-red-500';
      default:
        return 'bg-gray-50 border-gray-500';
    }
  };

  // Get icon based on notification type
  const getIcon = () => {
    switch (notification.type) {
      case NotificationType.INFO:
        return (
          <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      case NotificationType.SUCCESS:
        return (
          <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      case NotificationType.WARNING:
        return (
          <svg className="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        );
      case NotificationType.ERROR:
        return (
          <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
          </svg>
        );
    }
  };

  return (
    <div className={`max-w-md w-full shadow-lg rounded-lg pointer-events-auto border-l-4 ${getBackgroundColor()}`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">{notification.title}</p>
            <p className="mt-1 text-sm text-gray-500">{notification.message}</p>
            {notification.link && (
              <div className="mt-2">
                <a href={notification.link} className="text-sm text-blue-500 hover:text-blue-700">
                  View details
                </a>
              </div>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="bg-transparent rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={onDismiss}
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Toast Container Component
interface ToastContainerProps {
  toasts: Notification[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss
}) => {
  if (toasts.length === 0) return null;
  
  return (
    <div className="fixed inset-0 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end z-50">
      <div className="flex flex-col space-y-2">
        {toasts.map(toast => (
          <ToastNotification
            key={toast.id}
            notification={toast}
            onDismiss={() => onDismiss(toast.id)}
          />
        ))}
      </div>
    </div>
  );
};

// Notification Settings Component
interface NotificationPreference {
  id: string;
  category: string;
  description: string;
  email: boolean;
  inApp: boolean;
  push: boolean;
}

interface NotificationSettingsProps {
  preferences: NotificationPreference[];
  onUpdatePreference: (id: string, updates: Partial<NotificationPreference>) => Promise<void>;
  onUpdateAll: (updates: { email?: boolean; inApp?: boolean; push?: boolean }) => Promise<void>;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  preferences,
  onUpdatePreference,
  onUpdateAll
}) => {
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Calculate "all" toggle states
  const allEmail = preferences.every(p => p.email);
  const allInApp = preferences.every(p => p.inApp);
  const allPush = preferences.every(p => p.push);

  // Handle toggle for specific preference
  const handleToggle = async (id: string, field: 'email' | 'inApp' | 'push', value: boolean) => {
    try {
      await onUpdatePreference(id, { [field]: value });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to update preference: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Handle toggle all
  const handleToggleAll = async (field: 'email' | 'inApp' | 'push', value: boolean) => {
    try {
      await onUpdateAll({ [field]: value });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to update all preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  return (
    <div className="notification-settings">
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notification Preferences</h1>
        <p className="text-gray-500">Manage how you receive notifications</p>
      </div>
      
      <Card>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
                <div className="mt-1">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={allEmail}
                    onChange={(e) => handleToggleAll('email', e.target.checked)}
                  />
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                In-App
                <div className="mt-1">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={allInApp}
                    onChange={(e) => handleToggleAll('inApp', e.target.checked)}
                  />
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Push
                <div className="mt-1">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={allPush}
                    onChange={(e) => handleToggleAll('push', e.target.checked)}
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {preferences.map((pref) => (
              <tr key={pref.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{pref.category}</div>
                  <div className="text-sm text-gray-500">{pref.description}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={pref.email}
                    onChange={(e) => handleToggle(pref.id, 'email', e.target.checked)}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={pref.inApp}
                    onChange={(e) => handleToggle(pref.id, 'inApp', e.target.checked)}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={pref.push}
                    onChange={(e) => handleToggle(pref.id, 'push', e.target.checked)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

// Notification Service Context & Provider
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  toasts: Notification[];
  markAsRead: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  showToast: (notification: Omit<Notification, 'id' | 'createdAt' | 'readAt'>) => void;
  dismissToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
  notificationService: {
    getNotifications: () => Promise<Notification[]>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    clearAll: () => Promise<void>;
    subscribeToNotifications: (callback: (notification: Notification) => void) => () => void;
  };
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  notificationService
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<Notification[]>([]);
  
  // Load notifications on mount
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const notifs = await notificationService.getNotifications();
        setNotifications(notifs);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };
    
    loadNotifications();
    
    // Subscribe to new notifications
    const unsubscribe = notificationService.subscribeToNotifications((notification) => {
      setNotifications(prev => [notification, ...prev]);
      showToast({
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link: notification.link,
        category: notification.category,
        source: notification.source
      });
    });
    
    return unsubscribe;
  }, [notificationService]);
  
  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.readAt).length;
  
  // Mark notification as read
  const markAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications(prev => 
      prev.map(n => 
        n.id === id ? { ...n, readAt: new Date() } : n
      )
    );
  };
  
  // Delete notification
  const deleteNotification = async (id: string) => {
    await notificationService.deleteNotification(id);
    setNotifications(prev => 
      prev.filter(n => n.id !== id)
    );
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications(prev => 
      prev.map(n => ({ ...n, readAt: n.readAt || new Date() }))
    );
  };
  
  // Clear all notifications
  const clearAll = async () => {
    await notificationService.clearAll();
    setNotifications([]);
  };
  
  // Show toast notification
  const showToast = (notification: Omit<Notification, 'id' | 'createdAt' | 'readAt'>) => {
    const toast: Notification = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      ...notification
    };
    
    setToasts(prev => [toast, ...prev]);
  };
  
  // Dismiss toast
  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
  const value = {
    notifications,
    unreadCount,
    toasts,
    markAsRead,
    deleteNotification,
    markAllAsRead,
    clearAll,
    showToast,
    dismissToast
  };
  
  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </NotificationContext.Provider>
  );
};
