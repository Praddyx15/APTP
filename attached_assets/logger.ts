/**
 * Simple logger utility for consistent logging throughout the application
 */
export class Logger {
  private serviceName: string;

  /**
   * Create a new logger instance
   * @param serviceName - Name of the service or component using this logger
   */
  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Format the log message with timestamp and service name
   * @param level - Log level
   * @param message - Log message
   * @returns Formatted log message
   */
  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${this.serviceName}] ${message}`;
  }

  /**
   * Log an informational message
   * @param message - Message to log
   */
  public info(message: string): void {
    console.log(this.formatMessage('INFO', message));
  }

  /**
   * Log a warning message
   * @param message - Message to log
   */
  public warn(message: string): void {
    console.warn(this.formatMessage('WARN', message));
  }

  /**
   * Log an error message
   * @param message - Message to log
   */
  public error(message: string): void {
    console.error(this.formatMessage('ERROR', message));
  }

  /**
   * Log a debug message
   * @param message - Message to log
   */
  public debug(message: string): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('DEBUG', message));
    }
  }
}