import { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";

/**
 * Register all routes and set up the HTTP server with WebSocket support
 * This version is specifically for non-Replit environments
 * @param app Express application instance
 * @returns HTTP Server instance
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes (/api/register, /api/login, /api/logout, /api/user)
  setupAuth(app);

  // Standard HTTP routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/version", (req, res) => {
    res.json({ version: "1.0.0", environment: process.env.NODE_ENV });
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Add WebSocket server
  const wss = new WebSocketServer({
    server: httpServer,
    path: process.env.WS_PATH || "/ws",
  });

  // WebSocket connection handling
  wss.on("connection", (ws: WebSocket) => {
    console.log("[INFO] WebSocket client connected");

    // Setup ping-pong to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);

    // Send welcome message
    ws.send(JSON.stringify({
      type: "connection",
      message: "Connected to Advanced Pilot Training Platform",
      timestamp: new Date().toISOString(),
    }));

    // Message handler
    ws.on("message", async (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`[INFO] WebSocket message received: ${data.type}`);

        // Handle different message types
        switch (data.type) {
          case "ping":
            ws.send(JSON.stringify({
              type: "pong",
              timestamp: new Date().toISOString(),
            }));
            break;

          case "subscribe":
            // Handle channel subscriptions here
            ws.send(JSON.stringify({
              type: "subscription_ack",
              channel: data.channel,
              timestamp: new Date().toISOString(),
            }));
            break;

          // Add more message type handlers as needed

          default:
            ws.send(JSON.stringify({
              type: "error",
              message: `Unknown message type: ${data.type}`,
              timestamp: new Date().toISOString(),
            }));
            break;
        }
      } catch (error) {
        console.error("[ERROR] WebSocket message processing error:", error);
        
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "error",
            message: "Failed to process message",
            error: (error as Error).message,
            timestamp: new Date().toISOString(),
          }));
        }
      }
    });

    // Connection close handler
    ws.on("close", () => {
      console.log("[INFO] WebSocket client disconnected");
      clearInterval(pingInterval);
    });

    // Error handler
    ws.on("error", (error) => {
      console.error("[ERROR] WebSocket error:", error);
      clearInterval(pingInterval);
    });
  });

  // Broadcast function for sending messages to all connected clients
  (wss as any).broadcast = function broadcast(data: any) {
    const message = typeof data === "string" ? data : JSON.stringify(data);
    
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // Attach broadcast function to global scope for use in other modules
  global.broadcast = (wss as any).broadcast;

  // Add more routes here

  return httpServer;
}

// Define global broadcast function
declare global {
  var broadcast: (data: any) => void;
}