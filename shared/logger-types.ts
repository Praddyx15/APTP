/**
 * Types for logging system
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LoggerOptions {
  minLevel: LogLevel;
  includeTimestamp: boolean;
  service?: string;
}
