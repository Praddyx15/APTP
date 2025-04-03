/**
 * Core Module
 * 
 * Initializes and exports all core components for the application:
 * - Configuration Manager
 * - Logger
 * - Error Handler
 * - Security Manager
 * - Database Manager
 */

import { configManager } from './config-manager';
import { logger, initializeLogger } from './logger';
import { errorHandler } from './error-handler';
import { securityManager } from './security-manager';
import { dbManager } from './db-manager';

// Re-export all components
export {
  configManager,
  logger,
  errorHandler,
  securityManager,
  dbManager
};

// Export error handler components specifically for ease of use
export const {
  AppError,
  globalErrorHandler,
  asyncHandler,
  handleAsync,
  ErrorType,
  zodErrorToAppError
} = errorHandler;

/**
 * Initialize the core components in the correct order
 * to handle dependencies between them
 */
export function initializeCore() {
  // Initialize in correct order to handle dependencies
  
  // 1. Configuration should be initialized first
  // (already initialized by import)
  
  // 2. Connect the logger and config manager to break circular dependency
  import('./logger').then(loggerModule => {
    loggerModule.setConfigManager(configManager);
  });
  
  // 3. Initialize logger
  initializeLogger();
  
  // 4. Log initialization status
  logger.info('Core components initialized successfully', {
    components: ['configManager', 'logger', 'errorHandler', 'securityManager', 'dbManager']
  });
  
  return {
    configManager,
    logger,
    errorHandler,
    securityManager,
    dbManager
  };
}