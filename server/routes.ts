import type { Express } from 'express';
import { createServer, type Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import documentRoutes from './routes/document-routes.js';
import knowledgeGraphRoutes from './routes/knowledge-graph-routes.js';
import { setupAuth } from './auth.js';

export function registerRoutes(app: Express): Server {
  // Set up authentication
  setupAuth(app);

  // Register document routes
  app.use('/api/documents', documentRoutes);

  // Register knowledge graph routes
  app.use('/api/knowledge-graph', knowledgeGraphRoutes);

  // Create HTTP server
  const httpServer = createServer(app);

  // Set up WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.info('WebSocket client connected');
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      message: 'Connected to APTP WebSocket Server',
      timestamp: new Date()
    }));
    
    // Handle messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        // Handle message based on type
        console.log('Received message:', data);
        
        // Echo back for now
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'echo',
            data,
            timestamp: new Date()
          }));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.info('WebSocket client disconnected');
    });
  });

  // Broadcast function
  (global as any).broadcastNotification = (channel: string, data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'notification',
          channel,
          data,
          timestamp: new Date()
        }));
      }
    });
  };

  console.info('WebSocket server initialized');

  return httpServer;
}
