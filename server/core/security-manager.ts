/**
 * Security Manager
 * 
 * Provides security features including:
 * - Data encryption/decryption (AES-256)
 * - JWT token generation and verification
 * - Password hashing and verification
 * - CSRF token generation and verification
 * - Rate limiting utilities
 */

import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { configManager } from './config-manager';
import { logger } from './logger';
import { AppError, ErrorType } from './error-handler';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class SecurityManager {
  private static instance: SecurityManager;
  private rateLimitCache: Map<string, RateLimitEntry> = new Map();
  private rateLimitCleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Set up rate limit cache cleanup every minute
    this.rateLimitCleanupInterval = setInterval(() => {
      this.cleanupRateLimitCache();
    }, 60 * 1000);
  }

  public static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  /**
   * Generate a random encryption key
   */
  public generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  public encrypt(data: string, keyString?: string): string {
    try {
      const key = Buffer.from(
        keyString || configManager.getValue('security', 'encryptionKey') || this.generateEncryptionKey(),
        'hex'
      );

      // Generate an initialization vector
      const iv = crypto.randomBytes(16);
      
      // Create the cipher
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      
      // Encrypt the data
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get the auth tag
      const authTag = cipher.getAuthTag();
      
      // Return iv:authTag:encryptedData
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      logger.error('Encryption failed', { error });
      throw new AppError('Encryption failed', ErrorType.INTERNAL);
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  public decrypt(encryptedData: string, keyString?: string): string {
    try {
      const key = Buffer.from(
        keyString || configManager.getValue('security', 'encryptionKey') || '',
        'hex'
      );

      // Split the encrypted data into iv, authTag, and actual encrypted data
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      // Create the decipher
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed', { error });
      throw new AppError('Decryption failed', ErrorType.INTERNAL);
    }
  }

  /**
   * Generate a JWT token
   */
  public generateToken(
    payload: object,
    expiresIn?: string,
    secret?: string
  ): string {
    try {
      const jwtSecret = secret || configManager.getValue('security', 'jwtSecret') || 'default-secret-change-in-production';
      const jwtExpiresIn = expiresIn || configManager.getValue('security', 'jwtExpiresIn') || '1h';
      const issuer = configManager.getValue('security', 'jwtIssuer') || 'aptp-api';

      return jwt.sign(payload, jwtSecret, {
        expiresIn: jwtExpiresIn,
        issuer,
      });
    } catch (error) {
      logger.error('Token generation failed', { error });
      throw new AppError('Token generation failed', ErrorType.INTERNAL);
    }
  }

  /**
   * Verify a JWT token
   */
  public verifyToken<T = any>(token: string): T {
    try {
      const jwtSecret = configManager.getValue('security', 'jwtSecret') || 'default-secret-change-in-production';
      return jwt.verify(token, jwtSecret) as T;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid token', ErrorType.AUTHENTICATION);
      } else if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Token expired', ErrorType.AUTHENTICATION);
      } else {
        logger.error('Token verification failed', { error });
        throw new AppError('Token verification failed', ErrorType.INTERNAL);
      }
    }
  }

  /**
   * Hash a password using bcrypt
   */
  public async hashPassword(password: string): Promise<string> {
    try {
      const saltRounds = configManager.getValue('security', 'saltRounds') || 10;
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      logger.error('Password hashing failed', { error });
      throw new AppError('Password hashing failed', ErrorType.INTERNAL);
    }
  }

  /**
   * Verify a password against a hash
   */
  public async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Password verification failed', { error });
      throw new AppError('Password verification failed', ErrorType.INTERNAL);
    }
  }

  /**
   * Generate a CSRF token
   */
  public generateCsrfToken(): string {
    return randomUUID();
  }

  /**
   * Handle rate limiting
   */
  public checkRateLimit(
    key: string,
    limit: number,
    windowSecs: number
  ): { limited: boolean; remaining: number; resetAt: Date } {
    const now = Date.now();
    const entry = this.rateLimitCache.get(key) || {
      count: 0,
      resetAt: now + windowSecs * 1000,
    };

    // If the reset time has passed, reset the counter
    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowSecs * 1000;
    }

    // Increment the counter
    entry.count++;
    this.rateLimitCache.set(key, entry);

    // Check if limit is exceeded
    const limited = entry.count > limit;
    const remaining = Math.max(0, limit - entry.count);

    return {
      limited,
      remaining,
      resetAt: new Date(entry.resetAt),
    };
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanupRateLimitCache(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.rateLimitCache.entries()) {
      if (now > entry.resetAt) {
        this.rateLimitCache.delete(key);
      }
    }
  }

  /**
   * Generate a random MFA backup code
   */
  public generateBackupCode(): string {
    // Generate a 10-digit random code
    return crypto.randomBytes(5).toString('hex').toUpperCase();
  }

  /**
   * Generate a set of MFA backup codes
   */
  public generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(this.generateBackupCode());
    }
    return codes;
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    if (this.rateLimitCleanupInterval) {
      clearInterval(this.rateLimitCleanupInterval);
      this.rateLimitCleanupInterval = null;
    }
  }
}

export const securityManager = SecurityManager.getInstance();