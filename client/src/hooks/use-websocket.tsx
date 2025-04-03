import { useEffect, useState, useCallback } from 'react';
import { useWebSocket as useWebSocketContext, Notification as WebSocketNotification } from '@/providers/websocket-provider';
import { ConnectionStatus } from '@/lib/websocket';

/**
 * Custom hook for using WebSockets in components
 * 
 * @param options Configuration options for the WebSocket hook
 * @returns WebSocket state and methods
 */
export function useWebSocket(options?: {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: any) => void;
  onNotification?: (notification: WebSocketNotification) => void;
}) {
  const {
    isConnected,
    connectionStatus,
    notifications,
    unreadCount,
    sendMessage,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useWebSocketContext();
  
  // Handle connection status changes
  useEffect(() => {
    if (connectionStatus === ConnectionStatus.OPEN && options?.onOpen) {
      options.onOpen();
    } else if (
      (connectionStatus === ConnectionStatus.CLOSED || 
       connectionStatus === ConnectionStatus.ERROR) && 
      options?.onClose
    ) {
      options.onClose();
    }
    
    if (connectionStatus === ConnectionStatus.ERROR && options?.onError) {
      options.onError({ message: 'WebSocket connection error' });
    }
  }, [connectionStatus, options]);
  
  // Handle new notifications
  useEffect(() => {
    if (notifications.length > 0 && options?.onNotification) {
      // Find unread notifications and call the handler for each one
      const unreadNotifications = notifications.filter(n => !n.read);
      unreadNotifications.forEach(notification => {
        // Explicitly cast to WebSocketNotification to avoid type issues
        options.onNotification?.(notification as WebSocketNotification);
      });
    }
  }, [notifications, options]);
  
  /**
   * Send a notification to a specific user or channel
   */
  const sendNotification = useCallback((
    params: {
      title: string;
      message: string;
      type?: 'info' | 'warning' | 'success' | 'error';
      userId?: number | string;
      role?: string;
      organization?: string;
      link?: string;
      data?: any;
    }
  ) => {
    const { title, message, type = 'info', userId, role, organization, link, data } = params;
    let channel = 'general';
    
    // Determine the appropriate channel
    if (userId) {
      channel = `user:${userId}`;
    } else if (role) {
      channel = `role:${role}`;
    } else if (organization) {
      channel = `org:${organization}`;
    }
    
    return sendMessage('notification', {
      id: Date.now().toString(),
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      link,
      data,
    }, channel);
  }, [sendMessage]);
  
  return {
    isConnected,
    connectionStatus,
    notifications,
    unreadCount,
    sendMessage,
    sendNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}