/**
 * WebSocket Server for real-time communications
 */
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { subscribeToChannel, unsubscribeFromChannel, unsubscribeFromAllChannels } from './notification-service';
import * as http from 'http';

let wss: WebSocketServer | null = null;

/**
 * Initialize WebSocket server with the HTTP server
 * @param server HTTP server instance
 */
export function initializeWebSocketServer(server: http.Server): WebSocketServer {
  const path = '/ws';
  console.log(`[INFO] Initializing WebSocket server on path: ${path}`);
  
  wss = new WebSocketServer({ server, path });
  
  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    const connectionId = uuidv4();
    (ws as any).id = connectionId;
    
    const ip = req.socket.remoteAddress;
    console.log(`[INFO] WebSocket client connected from ${ip}`);
    
    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      message: 'Connected to APTP WebSocket Server',
      timestamp: new Date().toISOString()
    }));
    
    // Handle messages
    ws.on('message', (message: Buffer) => {
      try {
        const msgData = JSON.parse(message.toString());
        
        // Handle different message types
        if (msgData.type === 'subscribe' && msgData.channel) {
          subscribeToChannel(connectionId, msgData.channel);
          
          // Confirm subscription
          ws.send(JSON.stringify({
            type: 'subscribe',
            status: 'success',
            channel: msgData.channel,
            timestamp: new Date().toISOString()
          }));
        } 
        else if (msgData.type === 'unsubscribe' && msgData.channel) {
          unsubscribeFromChannel(connectionId, msgData.channel);
          
          // Confirm unsubscription
          ws.send(JSON.stringify({
            type: 'unsubscribe',
            status: 'success',
            channel: msgData.channel,
            timestamp: new Date().toISOString()
          }));
        }
        else if (msgData.type === 'ping') {
          // Respond to ping with pong
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error('[ERROR] Invalid WebSocket message:', error);
        
        // Send error response
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        }));
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('[INFO] WebSocket client disconnected');
      unsubscribeFromAllChannels(connectionId);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('[ERROR] WebSocket error:', error);
    });
  });
  
  console.log('[INFO] WebSocket server initialized');
  return wss;
}

/**
 * Get the WebSocket server instance
 */
export function getWebSocketServer(): WebSocketServer | null {
  return wss;
}