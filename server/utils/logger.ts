/**
 * Logger Utility
 * Provides centralized logging with context and severity levels
 */

interface LoggerOptions {
  level?: 'debug' | 'info' | 'warn' | 'error';
  context?: string;
}

class Logger {
  private level: string;
  private context: string;
  private seen?: WeakSet<any>;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level || 'info';
    this.context = options.context || 'App';
  }

  /**
   * Create a child logger with a specific context
   * @param context - Context name for the child logger
   * @returns Logger instance with the specified context
   */
  child(context: string): Logger {
    return new Logger({
      level: this.level as 'debug' | 'info' | 'warn' | 'error',
      context: `${this.context}:${context}`
    });
  }

  /**
   * Log a debug message
   * @param message - Message to log
   * @param data - Optional data to include in the log
   */
  debug(message: string, data?: any): void {
    if (['debug'].includes(this.level)) {
      this.log('DEBUG', message, data);
    }
  }

  /**
   * Log an info message
   * @param message - Message to log
   * @param data - Optional data to include in the log
   */
  info(message: string, data?: any): void {
    if (['debug', 'info'].includes(this.level)) {
      this.log('INFO', message, data);
    }
  }

  /**
   * Log a warning message
   * @param message - Message to log
   * @param data - Optional data to include in the log
   */
  warn(message: string, data?: any): void {
    if (['debug', 'info', 'warn'].includes(this.level)) {
      this.log('WARN', message, data);
    }
  }

  /**
   * Log an error message
   * @param message - Message to log
   * @param data - Optional data to include in the log
   */
  error(message: string, data?: any): void {
    // Always log errors regardless of level
    this.log('ERROR', message, data);
  }

  /**
   * Internal method to format and output logs
   * @param level - Log level
   * @param message - Log message
   * @param data - Optional data
   */
  private log(level: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const contextStr = this.context ? `[${this.context}] ` : '';
    const dataStr = data ? ` ${JSON.stringify(data, this.replacer)}` : '';
    
    console.log(`${timestamp} ${level} ${contextStr}${message}${dataStr}`);
  }

  /**
   * Replacer function for JSON.stringify to handle circular references
   */
  private replacer(key: string, value: any): any {
    if (typeof value === 'object' && value !== null) {
      if (this.seen && this.seen.has(value)) {
        return '[Circular]';
      }
      
      this.seen = this.seen || new WeakSet();
      this.seen.add(value);
    }
    
    return value;
  }
}

// Export a singleton instance with default options
export const logger = new Logger({
  level: process.env.LOG_LEVEL as any || 'info'
});