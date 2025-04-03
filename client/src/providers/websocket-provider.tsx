import React, { createContext, useEffect, useState, useContext, useCallback, ReactNode } from 'react';
import { WebSocketClient, ConnectionStatus } from '@/lib/websocket';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';

// Define the notification types
export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  data?: any;
}

// Define the WebSocket context
interface WebSocketContextType {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  notifications: Notification[];
  unreadCount: number;
  // Methods
  sendMessage: (type: string, payload: any, channel?: string) => boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// WebSocket Provider Props
interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [client, setClient] = useState<WebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.CLOSED);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Initialize WebSocket client
  useEffect(() => {
    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const wsClient = new WebSocketClient({
      url: wsUrl,
      reconnect: true,
      autoConnect: true,
      debug: true,
    });
    
    // Set up status change handler
    const statusUnsubscribe = wsClient.onStatusChange((status) => {
      setConnectionStatus(status);
      setIsConnected(status === ConnectionStatus.OPEN);
    });
    
    // Set up message handlers
    const notificationUnsubscribe = wsClient.on('notification', (notification: Notification) => {
      handleNotification(notification);
    });
    
    // Set up channel subscriptions
    if (user) {
      wsClient.subscribe('general');
      wsClient.subscribe(`user:${user.id}`);
      if (user.role) {
        wsClient.subscribe(`role:${user.role}`);
      }
      if (user.organizationType) {
        wsClient.subscribe(`org:${user.organizationType}`);
      }
    }
    
    // Store the client
    setClient(wsClient);
    
    // Clean up on unmount
    return () => {
      statusUnsubscribe();
      notificationUnsubscribe();
      wsClient.destroy();
    };
  }, [user]); // Recreate when user changes
  
  // Update auth token when user changes
  useEffect(() => {
    if (client && user) {
      // You might need to get an actual WebSocket token here
      // For now, just using user.id as identifier
      client.setAuthToken(user.id.toString());
    }
  }, [client, user]);
  
  // Handle new notifications
  const handleNotification = useCallback((notification: Notification) => {
    // Add notification to state (at the beginning of the array)
    setNotifications(prev => [
      {
        ...notification,
        timestamp: notification.timestamp || new Date().toISOString(),
        read: false
      },
      ...prev
    ]);
    
    // Show toast for the notification
    toast({
      title: notification.title,
      description: notification.message,
      variant: notification.type === 'error' ? 'destructive' : 'default',
    });
  }, []);
  
  // Method to send a WebSocket message
  const sendMessage = useCallback((type: string, payload: any, channel?: string) => {
    if (!client) return false;
    
    return client.send({
      type,
      payload,
      channel
    });
  }, [client]);
  
  // Method to mark a notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true } 
          : notification
      )
    );
  }, []);
  
  // Method to mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);
  
  // Method to clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);
  
  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Create context value
  const contextValue: WebSocketContextType = {
    isConnected,
    connectionStatus,
    notifications,
    unreadCount,
    sendMessage,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
  
  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook to use WebSocket context
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

// Export a separate hook for accessing and manipulating notifications
export const useNotifications = () => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications 
  } = useWebSocket();
  
  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
};