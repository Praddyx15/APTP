/**
 * API Versioning Module
 * 
 * This module provides API versioning capabilities:
 * - Supports multiple API versions
 * - Proper version routing
 * - Version deprecation management
 * - Backward compatibility handling
 */

import { Request, Response, NextFunction, Router, Express } from 'express';
import { logger } from '../core';

export interface ApiVersion {
  version: string;
  status: 'stable' | 'beta' | 'deprecated' | 'sunset';
  releaseDate: Date;
  deprecationDate?: Date;
  sunsetDate?: Date;
  router: Router;
}

export interface ApiVersionOptions {
  defaultVersion?: string;
  deprecationHeaderName?: string;
  enableVersionHeader?: boolean;
  enableVersionParam?: boolean;
}

const DEFAULT_OPTIONS: ApiVersionOptions = {
  defaultVersion: 'v1',
  deprecationHeaderName: 'X-API-Deprecated',
  enableVersionHeader: true,
  enableVersionParam: true
};

class ApiVersioning {
  private versions: Map<string, ApiVersion> = new Map();
  private options: ApiVersionOptions;
  
  constructor(options: ApiVersionOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Register a new API version
   */
  registerVersion(version: ApiVersion): Router {
    // Normalize version string (ensure it starts with 'v')
    const versionKey = version.version.startsWith('v') 
      ? version.version 
      : `v${version.version}`;
    
    // Store the version
    this.versions.set(versionKey, {
      ...version,
      version: versionKey
    });
    
    logger.info(`API version ${versionKey} registered`, {
      status: version.status,
      releaseDate: version.releaseDate,
      deprecationDate: version.deprecationDate,
      sunsetDate: version.sunsetDate
    });
    
    return version.router;
  }
  
  /**
   * Apply API versioning to the Express application
   */
  applyVersioning(app: Express): void {
    if (this.versions.size === 0) {
      logger.warn('No API versions registered');
      return;
    }
    
    // Apply version identification and deprecation middleware
    app.use('/api', this.versionDetectionMiddleware());
    
    // Mount each version's router at the appropriate path
    for (const [version, versionInfo] of this.versions.entries()) {
      // Mount at /api/v1, /api/v2, etc.
      app.use(`/api/${version}`, versionInfo.router);
      
      // For v1, also mount at /api for backward compatibility
      if (version === this.options.defaultVersion) {
        logger.info(`Mounting default API version ${version} at /api`);
        app.use('/api', versionInfo.router);
      }
    }
  }
  
  /**
   * Get all registered API versions
   */
  getVersions(): ApiVersion[] {
    return Array.from(this.versions.values());
  }
  
  /**
   * Get a specific API version
   */
  getVersion(version: string): ApiVersion | undefined {
    const versionKey = version.startsWith('v') ? version : `v${version}`;
    return this.versions.get(versionKey);
  }
  
  /**
   * Deprecate an API version
   */
  deprecateVersion(version: string, sunsetDate?: Date): void {
    const versionKey = version.startsWith('v') ? version : `v${version}`;
    const versionInfo = this.versions.get(versionKey);
    
    if (!versionInfo) {
      logger.warn(`Cannot deprecate non-existent API version: ${versionKey}`);
      return;
    }
    
    versionInfo.status = 'deprecated';
    versionInfo.deprecationDate = new Date();
    
    if (sunsetDate) {
      versionInfo.sunsetDate = sunsetDate;
    }
    
    logger.info(`API version ${versionKey} deprecated`, {
      deprecationDate: versionInfo.deprecationDate,
      sunsetDate: versionInfo.sunsetDate
    });
  }
  
  /**
   * Create middleware for version detection and deprecation warnings
   */
  private versionDetectionMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Extract version from URL path: /api/v1/...
      const urlParts = req.path.split('/');
      let requestedVersion = '';
      
      // Check URL path for version (format: /api/v1/...)
      if (urlParts.length > 1) {
        const potentialVersion = urlParts[1];
        if (potentialVersion && potentialVersion.startsWith('v')) {
          requestedVersion = potentialVersion;
        }
      }
      
      // Check header for version
      if (!requestedVersion && this.options.enableVersionHeader) {
        const headerVersion = req.header('Accept-Version');
        if (headerVersion) {
          requestedVersion = headerVersion.startsWith('v') 
            ? headerVersion 
            : `v${headerVersion}`;
        }
      }
      
      // Check query param for version
      if (!requestedVersion && this.options.enableVersionParam && req.query.version) {
        const queryVersion = req.query.version as string;
        requestedVersion = queryVersion.startsWith('v') 
          ? queryVersion 
          : `v${queryVersion}`;
      }
      
      // Default to latest stable version if none specified
      if (!requestedVersion) {
        requestedVersion = this.options.defaultVersion!;
      }
      
      // Store the detected version in request object
      (req as any).apiVersion = requestedVersion;
      
      // Add version to response header
      if (this.options.enableVersionHeader) {
        res.setHeader('X-API-Version', requestedVersion);
      }
      
      // Check if requested version exists
      const versionInfo = this.versions.get(requestedVersion);
      if (!versionInfo && requestedVersion !== this.options.defaultVersion) {
        // Version doesn't exist, fallback to default
        logger.warn(`Requested API version ${requestedVersion} not found, using default`, {
          requestPath: req.path,
          defaultVersion: this.options.defaultVersion
        });
        (req as any).apiVersion = this.options.defaultVersion;
      } else if (versionInfo) {
        // Add deprecation header if version is deprecated
        if (versionInfo.status === 'deprecated' && this.options.deprecationHeaderName) {
          const message = versionInfo.sunsetDate 
            ? `This API version is deprecated and will be removed after ${versionInfo.sunsetDate.toISOString().split('T')[0]}` 
            : 'This API version is deprecated';
          
          res.setHeader(this.options.deprecationHeaderName, message);
        }
        
        // Block access to sunset versions
        if (versionInfo.status === 'sunset') {
          return res.status(410).json({
            error: 'API_VERSION_SUNSET',
            message: 'This API version has been sunset and is no longer available',
            recommendedVersion: this.options.defaultVersion
          });
        }
      }
      
      next();
    };
  }
}

// Create and export a singleton instance
export const apiVersioning = new ApiVersioning();

export default apiVersioning;