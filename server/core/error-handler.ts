/**
 * Error Handler
 * 
 * Provides a centralized error handling system with:
 * - Standardized error types and codes
 * - Consistent error responses
 * - Detailed error logging
 * - Thread-safe error tracking
 */

import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "./logger";

/**
 * Enum of error types for categorizing different errors
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  EXTERNAL_API = 'EXTERNAL_API_ERROR',
  DATABASE = 'DATABASE_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
}

/**
 * Mapping error types to HTTP status codes
 */
const errorTypeToStatusCode = {
  [ErrorType.VALIDATION]: 400,
  [ErrorType.AUTHENTICATION]: 401,
  [ErrorType.AUTHORIZATION]: 403,
  [ErrorType.NOT_FOUND]: 404,
  [ErrorType.CONFLICT]: 409,
  [ErrorType.INTERNAL]: 500,
  [ErrorType.EXTERNAL_API]: 502,
  [ErrorType.DATABASE]: 503,
  [ErrorType.RATE_LIMIT]: 429,
  [ErrorType.TIMEOUT]: 504,
};

/**
 * Custom application error class that extends the built-in Error class
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: any;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    type: ErrorType = ErrorType.INTERNAL,
    statusCode?: number,
    code?: string,
    details: any = null,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.type = type;
    this.statusCode = statusCode || errorTypeToStatusCode[type];
    this.code = code || type;
    this.details = details;
    this.isOperational = isOperational;

    // This is needed because Error breaks prototype chain in transpiled code
    Object.setPrototypeOf(this, AppError.prototype);

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert the error to a JSON object
   */
  public toJSON() {
    return {
      error: {
        type: this.type,
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }

  /**
   * Factory method for validation errors
   */
  public static validation(message: string, details: any = null): AppError {
    return new AppError(
      message,
      ErrorType.VALIDATION,
      400,
      'VALIDATION_ERROR',
      details,
      true
    );
  }

  /**
   * Factory method for not found errors
   */
  public static notFound(
    message: string = 'Resource not found',
    details: any = null
  ): AppError {
    return new AppError(
      message,
      ErrorType.NOT_FOUND,
      404,
      'NOT_FOUND_ERROR',
      details,
      true
    );
  }

  /**
   * Factory method for unauthorized errors
   */
  public static unauthorized(message: string = 'Unauthorized'): AppError {
    return new AppError(
      message,
      ErrorType.AUTHENTICATION,
      401,
      'UNAUTHORIZED_ERROR',
      null,
      true
    );
  }

  /**
   * Factory method for forbidden errors
   */
  public static forbidden(message: string = 'Forbidden'): AppError {
    return new AppError(
      message,
      ErrorType.AUTHORIZATION,
      403,
      'FORBIDDEN_ERROR',
      null,
      true
    );
  }

  /**
   * Factory method for conflict errors
   */
  public static conflict(
    message: string = 'Resource already exists',
    details: any = null
  ): AppError {
    return new AppError(
      message,
      ErrorType.CONFLICT,
      409,
      'CONFLICT_ERROR',
      details,
      true
    );
  }

  /**
   * Factory method for internal errors
   */
  public static internal(message: string = 'Internal server error'): AppError {
    return new AppError(
      message,
      ErrorType.INTERNAL,
      500,
      'INTERNAL_ERROR',
      null,
      true
    );
  }

  /**
   * Factory method for external API errors
   */
  public static externalApi(
    message: string = 'External API error',
    details: any = null
  ): AppError {
    return new AppError(
      message,
      ErrorType.EXTERNAL_API,
      502,
      'EXTERNAL_API_ERROR',
      details,
      true
    );
  }

  /**
   * Factory method for database errors
   */
  public static database(message: string, details: any = null): AppError {
    return new AppError(
      message,
      ErrorType.DATABASE,
      503,
      'DATABASE_ERROR',
      details,
      true
    );
  }

  /**
   * Factory method for rate limit errors
   */
  public static rateLimit(
    message: string = 'Too many requests',
    details: any = null
  ): AppError {
    return new AppError(
      message,
      ErrorType.RATE_LIMIT,
      429,
      'RATE_LIMIT_ERROR',
      details,
      true
    );
  }

  /**
   * Factory method for timeout errors
   */
  public static timeout(
    message: string = 'Request timeout',
    details: any = null
  ): AppError {
    return new AppError(
      message,
      ErrorType.TIMEOUT,
      504,
      'TIMEOUT_ERROR',
      details,
      true
    );
  }
}

/**
 * Convert Zod validation errors to AppError
 */
export function zodErrorToAppError(error: ZodError): AppError {
  const details = error.errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
  }));
  
  return AppError.validation('Validation error', details);
}

/**
 * Global error handler middleware
 */
export function globalErrorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  let error: AppError;
  
  // Convert non-AppError instances to AppError
  if (!(err instanceof AppError)) {
    // Check if it's a Zod error
    if (err instanceof ZodError) {
      error = zodErrorToAppError(err);
    } else {
      error = new AppError(
        err.message || 'An unexpected error occurred',
        ErrorType.INTERNAL,
        500,
        'INTERNAL_ERROR',
        process.env.NODE_ENV === 'development' ? err.stack : null,
        false
      );
    }
  } else {
    error = err;
  }

  // Log the error
  const logContext = {
    errorType: error.type,
    errorCode: error.code,
    statusCode: error.statusCode,
    isOperational: error.isOperational,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    requestId: req.headers['x-request-id'],
  };

  if (error.details) {
    logContext['details'] = error.details;
  }

  if (error.statusCode >= 500) {
    logger.error(`Error: ${error.message}`, logContext, error);
  } else {
    logger.warn(`Error: ${error.message}`, logContext);
  }

  // Send response to client
  res.status(error.statusCode).json(error.toJSON());
}

/**
 * Async handler wrapper to avoid try/catch in every route
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Handle async operations and wrap errors
 */
export async function handleAsync<T>(
  promise: Promise<T>,
  errorMessage: string = 'Operation failed',
  errorType: ErrorType = ErrorType.INTERNAL,
  details: any = null
): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError(
      errorMessage,
      errorType,
      undefined,
      undefined,
      details || (error instanceof Error ? { originalMessage: error.message } : null),
      true
    );
  }
}

// Exporting a single error handler object with all error handling utilities
export const errorHandler = {
  AppError,
  ErrorType,
  globalErrorHandler,
  asyncHandler,
  handleAsync,
  zodErrorToAppError,
};