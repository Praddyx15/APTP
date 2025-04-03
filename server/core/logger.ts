/**
 * Logger Service
 * 
 * Centralized logging service for the application.
 * Handles different log levels and formats.
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  logFilePath?: string;
  includeTimestamp: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const defaultConfig: LoggerConfig = {
  minLevel: 'info',
  enableConsole: true,
  enableFile: false,
  includeTimestamp: true
};

class Logger {
  private config: LoggerConfig;
  private context: Record<string, any> = {};

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }
  
  /**
   * Set context for logging
   */
  setContext(context: Record<string, any>): void {
    this.context = { ...this.context, ...context };
  }
  
  /**
   * Clear context for logging
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Log an error message
   */
  error(message: string, meta: Record<string, any> = {}): void {
    this.log('error', message, meta);
  }

  /**
   * Log a warning message
   */
  warn(message: string, meta: Record<string, any> = {}): void {
    this.log('warn', message, meta);
  }

  /**
   * Log an info message
   */
  info(message: string, meta: Record<string, any> = {}): void {
    this.log('info', message, meta);
  }

  /**
   * Log a debug message
   */
  debug(message: string, meta: Record<string, any> = {}): void {
    this.log('debug', message, meta);
  }

  /**
   * Generic log method
   */
  private log(level: LogLevel, message: string, meta: Record<string, any> = {}): void {
    if (LOG_LEVELS[level] > LOG_LEVELS[this.config.minLevel]) {
      return;
    }

    const timestamp = this.config.includeTimestamp ? new Date().toISOString() : '';
    const metaString = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
    
    const logMessage = [
      timestamp,
      `[${level.toUpperCase()}]`,
      message,
      metaString
    ].filter(Boolean).join(' ');

    // Console logging
    if (this.config.enableConsole) {
      switch (level) {
        case 'error':
          console.error(logMessage);
          break;
        case 'warn':
          console.warn(logMessage);
          break;
        case 'info':
          console.info(logMessage);
          break;
        case 'debug':
          console.debug(logMessage);
          break;
      }
    }

    // File logging could be implemented here
    if (this.config.enableFile && this.config.logFilePath) {
      // Use node fs to write to log file (implementation omitted)
    }
  }
}

// Singleton instance
export const logger = new Logger();

// Allow updating config through config manager
let configManagerInstance: any = null;

export function setConfigManager(configManager: any) {
  configManagerInstance = configManager;
}

// Initialize the logger with configuration
export function initializeLogger() {
  // If we have a config manager, we could use it here
  // Otherwise, use default configuration
  if (configManagerInstance) {
    // Potentially get log configuration from config manager
    // This is a stub for now
  }
  
  logger.info('Logger initialized');
}