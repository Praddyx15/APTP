/**
 * WebSocketClient - Enhanced WebSocket connection manager with robust reconnection,
 * subscription management, message validation, and status monitoring.
 */

// Message type interface 
export interface WebSocketMessage {
  type: string;
  payload: any;
  channel?: string;
  id?: string;
}

// Connection status enum
export enum ConnectionStatus {
  CONNECTING = 'connecting',
  OPEN = 'open',
  CLOSING = 'closing',
  CLOSED = 'closed',
  ERROR = 'error'
}

// Event handler type
type EventHandler = (data: any) => void;

// WebSocket client options interface
export interface WebSocketClientOptions {
  url: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  reconnectBackoffMultiplier?: number;
  maxReconnectInterval?: number;
  autoConnect?: boolean;
  protocols?: string | string[];
  authToken?: string;
  debug?: boolean;
}

// Default options
const DEFAULT_OPTIONS: WebSocketClientOptions = {
  url: '',
  reconnect: true,
  reconnectInterval: 1000,
  maxReconnectAttempts: 10,
  reconnectBackoffMultiplier: 1.5,
  maxReconnectInterval: 30000,
  autoConnect: true,
  debug: false
};

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private options: WebSocketClientOptions;
  private status: ConnectionStatus = ConnectionStatus.CLOSED;
  private reconnectAttempts: number = 0;
  private reconnectTimer: any = null;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private subscriptions: Set<string> = new Set();
  private messageQueue: WebSocketMessage[] = [];
  private connectionStatusHandlers: Set<(status: ConnectionStatus) => void> = new Set();

  /**
   * Create a new WebSocketClient
   * @param options WebSocketClient configuration options or URL string
   */
  constructor(options: WebSocketClientOptions | string) {
    this.options = typeof options === 'string' 
      ? { ...DEFAULT_OPTIONS, url: options } 
      : { ...DEFAULT_OPTIONS, ...options };
    
    if (!this.options.url) {
      throw new Error('WebSocket URL is required');
    }

    if (this.options.autoConnect) {
      this.connect();
    }
  }

  /**
   * Get the current connection status
   */
  public getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): void {
    if (this.socket && (this.status === ConnectionStatus.CONNECTING || this.status === ConnectionStatus.OPEN)) {
      this.log('WebSocket is already connected or connecting');
      return;
    }

    this.setStatus(ConnectionStatus.CONNECTING);
    
    try {
      // Create a new WebSocket connection
      this.socket = new WebSocket(this.buildUrl(), this.options.protocols);
      
      // Set up WebSocket event handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
    } catch (error) {
      this.log('Error creating WebSocket:', error);
      this.setStatus(ConnectionStatus.ERROR);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the WebSocket server
   * @param code Close code
   * @param reason Close reason
   */
  public disconnect(code?: number, reason?: string): void {
    if (!this.socket) {
      this.setStatus(ConnectionStatus.CLOSED);
      return;
    }
    
    this.cancelReconnect();
    
    if (this.status === ConnectionStatus.OPEN) {
      this.setStatus(ConnectionStatus.CLOSING);
      this.socket.close(code, reason);
    } else {
      this.setStatus(ConnectionStatus.CLOSED);
    }
  }

  /**
   * Send a message to the WebSocket server
   * @param data Message data (object will be stringified)
   * @returns True if sent successfully, false otherwise
   */
  public send(data: any): boolean {
    // Format data as a WebSocketMessage if it's not already
    const message = this.formatMessage(data);

    if (this.status !== ConnectionStatus.OPEN) {
      // Queue the message for later if not connected
      this.log('WebSocket not connected, queueing message:', message);
      this.messageQueue.push(message);
      return false;
    }

    try {
      this.socket!.send(JSON.stringify(message));
      return true;
    } catch (error) {
      this.log('Error sending message:', error);
      return false;
    }
  }

  /**
   * Subscribe to a channel
   * @param channel Channel name
   * @returns True if subscription request was sent
   */
  public subscribe(channel: string): boolean {
    if (!channel) {
      this.log('Invalid channel name');
      return false;
    }

    this.subscriptions.add(channel);
    
    // If connected, send subscription message
    if (this.status === ConnectionStatus.OPEN) {
      return this.send({
        type: 'subscribe',
        channel,
        payload: {}
      });
    }
    
    return true; // Will subscribe when connected
  }

  /**
   * Unsubscribe from a channel
   * @param channel Channel name
   * @returns True if unsubscription request was sent
   */
  public unsubscribe(channel: string): boolean {
    if (!channel) {
      this.log('Invalid channel name');
      return false;
    }

    this.subscriptions.delete(channel);
    
    // If connected, send unsubscription message
    if (this.status === ConnectionStatus.OPEN) {
      return this.send({
        type: 'unsubscribe',
        channel,
        payload: {}
      });
    }
    
    return true;
  }

  /**
   * Register an event handler for a specific message type
   * @param type Message type to listen for
   * @param handler Function to call when message is received
   * @returns Function to remove the handler
   */
  public on(type: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set());
    }
    
    this.eventHandlers.get(type)!.add(handler);
    
    // Return a function to remove this handler
    return () => {
      const handlers = this.eventHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(type);
        }
      }
    };
  }

  /**
   * Register a handler for all message types
   * @param handler Function to call for all messages
   * @returns Function to remove the handler
   */
  public onMessage(handler: EventHandler): () => void {
    return this.on('*', handler);
  }

  /**
   * Register a handler for connection status changes
   * @param handler Function to call when status changes
   * @returns Function to remove the handler
   */
  public onStatusChange(handler: (status: ConnectionStatus) => void): () => void {
    this.connectionStatusHandlers.add(handler);
    
    // Return a function to remove this handler
    return () => {
      this.connectionStatusHandlers.delete(handler);
    };
  }

  /**
   * Set authentication token
   * @param token Authentication token
   */
  public setAuthToken(token: string | null): void {
    if (token) {
      this.options.authToken = token;
    } else {
      delete this.options.authToken;
    }
    
    // If connected, reconnect to apply the new token
    if (this.status === ConnectionStatus.OPEN) {
      this.reconnect();
    }
  }

  /**
   * Force a reconnection
   */
  public reconnect(): void {
    this.disconnect();
    this.connect();
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(event: Event): void {
    this.log('WebSocket connected');
    this.setStatus(ConnectionStatus.OPEN);
    this.reconnectAttempts = 0;
    
    // Resubscribe to all channels
    this.subscriptions.forEach(channel => {
      this.send({
        type: 'subscribe',
        channel,
        payload: {}
      });
    });
    
    // Send any queued messages
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
    
    // Emit open event
    this.emit('connection', { status: 'connected' });
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    this.log(`WebSocket closed: ${event.code} ${event.reason}`);
    this.setStatus(ConnectionStatus.CLOSED);
    this.socket = null;
    
    // Emit close event
    this.emit('connection', { 
      status: 'disconnected', 
      code: event.code, 
      reason: event.reason 
    });
    
    // Attempt to reconnect if enabled
    this.scheduleReconnect();
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    this.log('WebSocket error:', event);
    this.setStatus(ConnectionStatus.ERROR);
    
    // Emit error event
    this.emit('error', { event });
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      if (!this.validateMessage(message)) {
        this.log('Invalid message format:', message);
        return;
      }
      
      // Emit to specific type handlers
      this.emit(message.type, message.payload);
      
      // Emit to channel handlers if applicable
      if (message.channel) {
        this.emit(`channel:${message.channel}`, message.payload);
      }
      
      // Emit to catch-all handlers
      this.emit('*', message);
      
    } catch (error) {
      this.log('Error parsing message:', error, event.data);
    }
  }

  /**
   * Validate message format
   * @param message Message to validate
   * @returns True if valid, false otherwise
   */
  private validateMessage(message: any): message is WebSocketMessage {
    return (
      message &&
      typeof message === 'object' &&
      typeof message.type === 'string' &&
      message.hasOwnProperty('payload')
    );
  }

  /**
   * Format message to ensure it matches WebSocketMessage interface
   * @param data Message data
   * @returns Formatted message
   */
  private formatMessage(data: any): WebSocketMessage {
    if (this.validateMessage(data)) {
      return data;
    }
    
    if (typeof data === 'object') {
      return {
        type: data.type || 'message',
        payload: data.hasOwnProperty('payload') ? data.payload : data,
        channel: data.channel,
        id: data.id || this.generateId()
      };
    }
    
    return {
      type: 'message',
      payload: data,
      id: this.generateId()
    };
  }

  /**
   * Emit an event to all registered handlers
   * @param type Event type
   * @param data Event data
   */
  private emit(type: string, data: any): void {
    // Call specific type handlers
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.log(`Error in "${type}" event handler:`, error);
        }
      });
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (
      !this.options.reconnect ||
      (this.options.maxReconnectAttempts !== undefined && 
       this.reconnectAttempts >= this.options.maxReconnectAttempts)
    ) {
      this.log(`Not reconnecting: reconnect=${this.options.reconnect}, attempts=${this.reconnectAttempts}, max=${this.options.maxReconnectAttempts}`);
      return;
    }
    
    this.cancelReconnect();
    
    // Calculate backoff interval with exponential growth
    const backoffFactor = Math.pow(
      this.options.reconnectBackoffMultiplier || 1, 
      this.reconnectAttempts
    );
    
    const interval = Math.min(
      (this.options.reconnectInterval || 1000) * backoffFactor,
      this.options.maxReconnectInterval || 30000
    );
    
    this.log(`Scheduling reconnect in ${interval}ms (attempt ${this.reconnectAttempts + 1})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, interval);
  }

  /**
   * Cancel any pending reconnection
   */
  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Update connection status and notify listeners
   * @param status New connection status
   */
  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;
    
    this.status = status;
    
    // Notify all status change handlers
    this.connectionStatusHandlers.forEach(handler => {
      try {
        handler(status);
      } catch (error) {
        this.log('Error in status change handler:', error);
      }
    });
  }

  /**
   * Build WebSocket URL with authentication token if available
   * @returns Complete WebSocket URL
   */
  private buildUrl(): string {
    const url = new URL(this.options.url);
    
    // Add auth token as a query parameter if provided
    if (this.options.authToken) {
      url.searchParams.set('token', this.options.authToken);
    }
    
    return url.toString();
  }

  /**
   * Generate a unique message ID
   * @returns Unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
  }

  /**
   * Log a message if debug is enabled
   * @param message Log message
   * @param args Additional arguments
   */
  private log(message: string, ...args: any[]): void {
    if (this.options.debug) {
      console.log(`[WebSocketClient] ${message}`, ...args);
    }
  }

  /**
   * Clean up resources when done
   */
  public destroy(): void {
    this.disconnect();
    this.cancelReconnect();
    this.eventHandlers.clear();
    this.connectionStatusHandlers.clear();
    this.subscriptions.clear();
    this.messageQueue = [];
  }
}