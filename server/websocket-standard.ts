/**
 * WebSocket server implementation that works in any environment
 * Designed to be compatible with standard deployments outside of Replit
 */

import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { Express } from 'express';

interface WebSocketMessage {
  type: string;
  topic?: string;
  data?: any;
  timestamp: number;
}

export function setupWebSocketServer(server: Server) {
  // Create WebSocket server
  const wss = new WebSocketServer({ server, path: '/ws' });

  console.log('[WebSocket] Server initialized on path /ws');

  // Client tracking
  const clients: Map<WebSocket, { subscriptions: Set<string> }> = new Map();

  // Setup connection handler
  wss.on('connection', (ws: WebSocket) => {
    console.log('[WebSocket] Client connected');
    clients.set(ws, { subscriptions: new Set() });

    // Setup message handler
    ws.on('message', (message: string) => {
      try {
        const parsedMessage: WebSocketMessage = JSON.parse(message);
        
        // Handle ping messages
        if (parsedMessage.type === 'ping') {
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }));
          return;
        }
        
        // Handle subscription messages
        if (parsedMessage.type === 'subscribe' && parsedMessage.data?.topic) {
          const topic = parsedMessage.data.topic;
          const clientData = clients.get(ws);
          if (clientData) {
            clientData.subscriptions.add(topic);
            console.log(`[WebSocket] Client subscribed to topic: ${topic}`);
          }
          return;
        }
        
        // Handle other messages (can be expanded as needed)
        console.log(`[WebSocket] Received message: ${parsedMessage.type}`);
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error);
      }
    });

    // Setup close handler
    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected');
      clients.delete(ws);
    });

    // Setup error handler
    ws.on('error', (error) => {
      console.error('[WebSocket] Client error:', error);
      clients.delete(ws);
    });
  });

  // Function to broadcast to all connected clients
  function broadcast(topic: string, data: any) {
    const message: WebSocketMessage = {
      type: 'message',
      topic,
      data,
      timestamp: Date.now()
    };
    
    const messageString = JSON.stringify(message);
    
    clients.forEach((clientData, client) => {
      if (client.readyState === WebSocket.OPEN && clientData.subscriptions.has(topic)) {
        client.send(messageString);
      }
    });
    
    console.log(`[WebSocket] Broadcast to topic ${topic}: ${clients.size} total clients`);
  }

  return {
    broadcast
  };
}

export default setupWebSocketServer;