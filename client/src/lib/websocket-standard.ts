/**
 * Standard WebSocket client utility for Advanced Pilot Training Platform
 * This is a non-Replit specific implementation for deployment outside of Replit
 */

// Connection state enum
export enum ConnectionState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

// Message handler type
export type MessageHandler = (data: any) => void;

// WebSocket client class
export class WebSocketClient {
  private socket: WebSocket | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 2000; // 2 seconds
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private url: string;
  private subscriptions: Set<string> = new Set();

  constructor(url?: string) {
    // Determine WebSocket URL
    if (url) {
      this.url = url;
    } else {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      this.url = `${protocol}//${host}/ws`;
    }

    // Initialize connection
    this.connect();
  }

  // Connect to WebSocket server
  private connect() {
    console.log("[WebSocket] Connecting to", this.url);
    
    try {
      this.socket = new WebSocket(this.url);
      
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error("[WebSocket] Connection error:", error);
      this.scheduleReconnect();
    }
  }

  // Handle connection open
  private handleOpen() {
    console.log("[WebSocket] Connected");
    
    // Reset reconnect attempts
    this.reconnectAttempt = 0;
    
    // Set up ping interval to keep connection alive
    this.pingInterval = setInterval(() => {
      this.send({ type: "ping" });
    }, 25000); // 25 seconds
    
    // Dispatch connection event
    this.dispatch("connection", { status: "connected" });
    
    // Reconnect all previous subscriptions
    this.restoreSubscriptions();
  }

  // Restore previous channel subscriptions after reconnect
  private restoreSubscriptions() {
    if (this.subscriptions.size > 0) {
      console.log(`[WebSocket] Restoring ${this.subscriptions.size} subscriptions`);
      
      this.subscriptions.forEach((channel) => {
        this.subscribe(channel);
      });
    }
  }

  // Handle connection close
  private handleClose(event: CloseEvent) {
    console.log("[WebSocket] Connection closed", event.code);
    
    // Clear ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // Schedule reconnect if not closing intentionally
    this.scheduleReconnect();
    
    // Dispatch disconnect event
    this.dispatch("disconnect", { code: event.code, reason: event.reason });
  }

  // Handle incoming message
  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      
      // Handle system messages
      if (data.type === "pong") {
        // Ping-pong response received, connection is alive
        return;
      }
      
      // Dispatch to appropriate handlers based on message type
      this.dispatch(data.type, data);
      
      // Also dispatch message to channel-specific handlers if present
      if (data.channel) {
        this.dispatch(`channel:${data.channel}`, data);
      }
    } catch (error) {
      console.error("[WebSocket] Message parsing error:", error);
    }
  }

  // Handle connection error
  private handleError(event: Event) {
    console.error("[WebSocket] Error:", event);
    
    // Dispatch error event
    this.dispatch("error", { event });
  }

  // Schedule reconnection attempt
  private scheduleReconnect() {
    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // Check if max reconnect attempts reached
    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      console.warn("[WebSocket] Maximum reconnect attempts reached");
      this.dispatch("reconnect_failed", { attempts: this.reconnectAttempt });
      return;
    }
    
    // Schedule reconnect with exponential backoff
    this.reconnectAttempt++;
    const delay = Math.min(30000, this.reconnectDelay * Math.pow(1.5, this.reconnectAttempt - 1));
    
    console.warn(`[WebSocket] Reconnecting in ${(delay / 1000).toFixed(1)}s (attempt ${this.reconnectAttempt}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
    
    // Dispatch reconnect event
    this.dispatch("reconnecting", { attempt: this.reconnectAttempt });
  }

  // Manually trigger reconnect
  public reconnect(): void {
    console.log("[WebSocket] Manual reconnect triggered");
    
    // Close current connection if open
    if (this.socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(this.socket.readyState)) {
      this.socket.close();
    }
    
    // Reset reconnect attempt counter for manual reconnect
    this.reconnectAttempt = 0;
    
    // Connect immediately
    this.connect();
  }

  // Send message to server
  public send(dataOrChannel: any, message?: any): boolean {
    // Case: send(channel, message)
    if (typeof dataOrChannel === 'string' && message !== undefined) {
      return this.sendToChannel(dataOrChannel, message);
    }
    
    // Case: send(data)
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn("[WebSocket] Cannot send message, connection not open");
      return false;
    }
    
    try {
      const data = dataOrChannel;
      const messageText = typeof data === "string" ? data : JSON.stringify(data);
      this.socket.send(messageText);
      return true;
    } catch (error) {
      console.error("[WebSocket] Send error:", error);
      return false;
    }
  }

  // Send message to specific channel (private method)
  private sendToChannel(channel: string, message: any): boolean {
    return this.send({
      type: "message",
      channel,
      data: message,
      timestamp: Date.now(),
    });
  }

  // Subscribe to message type
  public on(type: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    
    this.messageHandlers.get(type)?.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.off(type, handler);
    };
  }

  // Unsubscribe from message type
  public off(type: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type);
    
    if (handlers) {
      handlers.delete(handler);
      
      if (handlers.size === 0) {
        this.messageHandlers.delete(type);
      }
    }
  }

  // Dispatch message to handlers
  private dispatch(type: string, data: any): void {
    const handlers = this.messageHandlers.get(type);
    
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[WebSocket] Error in handler for '${type}':`, error);
        }
      });
    }
    
    // Also dispatch to 'all' handlers
    const allHandlers = this.messageHandlers.get("all");
    
    if (allHandlers) {
      allHandlers.forEach(handler => {
        try {
          handler({ type, ...data });
        } catch (error) {
          console.error("[WebSocket] Error in 'all' handler:", error);
        }
      });
    }
  }

  // Get connection state
  public getState(): ConnectionState {
    if (!this.socket) {
      return ConnectionState.CLOSED;
    }
    
    // Convert browser WebSocket readyState to our ConnectionState enum
    // They have the same values, but TypeScript wants us to be explicit
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING:
        return ConnectionState.CONNECTING;
      case WebSocket.OPEN:
        return ConnectionState.OPEN;
      case WebSocket.CLOSING:
        return ConnectionState.CLOSING;
      case WebSocket.CLOSED:
        return ConnectionState.CLOSED;
      default:
        return ConnectionState.CLOSED;
    }
  }

  // Check if connection is open
  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  // Close connection
  public close(): void {
    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // Close socket
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    // Clear all handlers
    this.messageHandlers.clear();
    
    // Clear subscriptions
    this.subscriptions.clear();
  }

  // Subscribe to a channel
  public subscribe(channel: string): boolean {
    // Add to local subscription set
    this.subscriptions.add(channel);
    
    // Send subscription request to server
    return this.send({
      type: "subscribe",
      channel,
      timestamp: Date.now(),
    });
  }

  // Unsubscribe from a channel
  public unsubscribe(channel: string): boolean {
    // Remove from local subscription set
    this.subscriptions.delete(channel);
    
    // Send unsubscription request to server
    return this.send({
      type: "unsubscribe",
      channel,
      timestamp: Date.now(),
    });
  }
}

// Create singleton instance
let instance: WebSocketClient | null = null;

// Get WebSocket client instance
export function getWebSocketClient(url?: string): WebSocketClient {
  if (!instance) {
    instance = new WebSocketClient(url);
  }
  
  return instance;
}

// Reset WebSocket client
export function resetWebSocketClient(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}

// Export as default for compatibility
export default {
  WebSocketClient,
  getWebSocketClient,
  resetWebSocketClient,
  ConnectionState
};