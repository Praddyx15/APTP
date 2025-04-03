import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useToast } from '@/hooks/use-toast';
import { Notification as WebSocketNotification } from '@/providers/websocket-provider';

// Our internal notification format with priority levels
interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
};

type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  isConnected: boolean;
  addNotification: (notification: Notification) => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toast } = useToast();
  
  // Use the WebSocket hook with notification handler
  const { isConnected } = useWebSocket({
    onNotification: (notification: WebSocketNotification) => {
      addNotification({
        id: notification.id || `notification-${Date.now()}`,
        type: notification.type || 'info',
        title: notification.title || 'New Notification',
        message: notification.message || '',
        timestamp: notification.timestamp || new Date().toISOString(),
        read: false,
        priority: getPriorityFromType(notification.type),
        metadata: notification.data
      });
    }
  });

  // Helper to determine priority based on notification type
  const getPriorityFromType = (type?: string): 'low' | 'medium' | 'high' | 'critical' => {
    if (!type) return 'low';
    switch (type) {
      case 'error': return 'high';
      case 'warning': return 'medium';
      case 'critical': return 'critical';
      default: return 'low';
    }
  };

  // Add a new notification
  const addNotification = (newNotification: Notification) => {
    setNotifications(prev => [newNotification, ...prev]);
    
    // Show toast for high priority notifications
    if (newNotification.priority === 'high' || newNotification.priority === 'critical') {
      toast({
        title: newNotification.title,
        description: newNotification.message,
        variant: newNotification.priority === 'critical' ? 'destructive' : undefined
      });
    }
  };

  // Mark a notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  // Remove a notification
  const removeNotification = (id: string) => {
    setNotifications(prev => 
      prev.filter(n => n.id !== id)
    );
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Add sample notification if needed for testing
  useEffect(() => {
    if (import.meta.env.DEV && notifications.length === 0) {
      // Optional: Add a sample notification for testing UI
      addNotification({
        id: `sample-${Date.now()}`,
        type: 'info',
        title: 'Welcome to Aviation TMS',
        message: 'Your training platform is ready to use.',
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'low'
      });
    }
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearAllNotifications,
      isConnected,
      addNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}