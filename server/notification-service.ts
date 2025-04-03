/**
 * WebSocket Notification Service
 * 
 * Handles broadcasting real-time notifications to connected clients
 * based on channels (user ID, role, organization, etc.)
 */

// WebSocket connection manager from server setup
import { getWebSocketServer } from './websocket-server';
import { WebSocket } from 'ws';

/**
 * Channel subscriptions for each connection
 * Map of connection ID to list of channels subscribed to
 */
const connectionSubscriptions = new Map<string, Set<string>>();

/**
 * Channel subscribers 
 * Map of channel name to list of connection IDs
 */
const channelSubscribers = new Map<string, Set<string>>();

/**
 * Subscribe a connection to a channel
 * @param connectionId Unique identifier for the WebSocket connection
 * @param channel Channel name to subscribe to
 */
export function subscribeToChannel(connectionId: string, channel: string): boolean {
  try {
    // Add channel to connection's subscriptions
    if (!connectionSubscriptions.has(connectionId)) {
      connectionSubscriptions.set(connectionId, new Set<string>());
    }
    connectionSubscriptions.get(connectionId)!.add(channel);
    
    // Add connection to channel's subscribers
    if (!channelSubscribers.has(channel)) {
      channelSubscribers.set(channel, new Set<string>());
    }
    channelSubscribers.get(channel)!.add(connectionId);
    
    console.log(`[INFO] WebSocket client subscribed to: ${channel}`);
    return true;
  } catch (error) {
    console.error('[ERROR] Failed to subscribe to channel:', error);
    return false;
  }
}

/**
 * Unsubscribe a connection from a channel
 * @param connectionId Unique identifier for the WebSocket connection
 * @param channel Channel name to unsubscribe from
 */
export function unsubscribeFromChannel(connectionId: string, channel: string): boolean {
  try {
    // Remove channel from connection's subscriptions
    if (connectionSubscriptions.has(connectionId)) {
      connectionSubscriptions.get(connectionId)!.delete(channel);
    }
    
    // Remove connection from channel's subscribers
    if (channelSubscribers.has(channel)) {
      channelSubscribers.get(channel)!.delete(connectionId);
      
      // Clean up empty channels
      if (channelSubscribers.get(channel)!.size === 0) {
        channelSubscribers.delete(channel);
      }
    }
    
    console.log(`[INFO] WebSocket client unsubscribed from: ${channel}`);
    return true;
  } catch (error) {
    console.error('[ERROR] Failed to unsubscribe from channel:', error);
    return false;
  }
}

/**
 * Unsubscribe a connection from all channels
 * @param connectionId Unique identifier for the WebSocket connection
 */
export function unsubscribeFromAllChannels(connectionId: string): void {
  try {
    // Get all channels the connection is subscribed to
    const channels = connectionSubscriptions.get(connectionId);
    
    if (channels) {
      // Remove connection from each channel's subscribers
      for (const channel of channels) {
        if (channelSubscribers.has(channel)) {
          channelSubscribers.get(channel)!.delete(connectionId);
          
          // Clean up empty channels
          if (channelSubscribers.get(channel)!.size === 0) {
            channelSubscribers.delete(channel);
          }
        }
      }
      
      // Remove connection's subscriptions
      connectionSubscriptions.delete(connectionId);
    }
    
    console.log(`[INFO] WebSocket client unsubscribed from all channels`);
  } catch (error) {
    console.error('[ERROR] Failed to unsubscribe from all channels:', error);
  }
}

/**
 * Broadcast a notification to all subscribers of a channel
 * @param channel Channel name to broadcast to
 * @param data Notification data to broadcast
 */
export function broadcastNotification(channel: string, data: any): void {
  try {
    const wss = getWebSocketServer();
    if (!wss) {
      console.error('[ERROR] WebSocket server not initialized');
      return;
    }
    
    if (!channelSubscribers.has(channel)) {
      // No subscribers for this channel
      return;
    }
    
    const message = JSON.stringify({
      type: 'notification',
      channel,
      data,
      timestamp: new Date().toISOString()
    });
    
    const subscribers = channelSubscribers.get(channel)!;
    let sentCount = 0;
    
    wss.clients.forEach((client: WebSocket) => {
      const connectionId = (client as any).id;
      
      if (subscribers.has(connectionId) && client.readyState === WebSocket.OPEN) {
        client.send(message);
        sentCount++;
      }
    });
    
    if (sentCount > 0) {
      console.log(`[INFO] Broadcast notification to ${sentCount} clients on channel: ${channel}`);
    }
  } catch (error) {
    console.error('[ERROR] Failed to broadcast notification:', error);
  }
}