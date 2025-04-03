/**
 * ConfigurationManager 
 * 
 * Handles application-wide settings with support for:
 * - Loading from multiple sources (environment, files, database)
 * - Type-safe access to configuration values
 * - Change notification and validation
 * - Thread safety for concurrent access
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { z } from 'zod';

// Use console logging instead of importing logger to avoid circular dependency
const consoleLog = {
  error: (message: string, context?: any) => console.error(message, context),
  warn: (message: string, context?: any) => console.warn(message, context),
  info: (message: string, context?: any) => console.info(message, context),
  debug: (message: string, context?: any) => console.debug(message, context)
};

type ConfigSource = 'environment' | 'file' | 'database' | 'default';

/**
 * Define our configuration schema using Zod
 */
const serverConfigSchema = z.object({
  environment: z.enum(['development', 'test', 'production']).default('development'),
  port: z.number().int().positive().default(5000),
  host: z.string().default('0.0.0.0'),
  corsOrigins: z.array(z.string()).default(['*']),
  trustedProxies: z.array(z.string()).default([]),
  requestSizeLimit: z.string().default('50mb'),
  compressionLevel: z.number().min(0).max(9).default(6),
  rateLimitEnabled: z.boolean().default(true),
  requestTimeout: z.number().int().positive().default(60000),
  compressionEnabled: z.boolean().default(true),
  baseUrl: z.string().optional(),
});

const databaseConfigSchema = z.object({
  type: z.enum(['postgres', 'sqlite', 'mysql']).default('postgres'),
  host: z.string().default('localhost'),
  port: z.number().int().positive().default(5432),
  username: z.string().default('postgres'),
  password: z.string().optional(),
  database: z.string().default('aptp'),
  poolSize: z.number().int().positive().default(10),
  idleTimeout: z.number().int().positive().default(30000),
  connectionTimeout: z.number().int().positive().default(2000),
  ssl: z.boolean().default(false),
  slowQueryThreshold: z.number().int().positive().default(1000),
  queryTimeout: z.number().int().nonnegative().default(30000),
  maxCompilationCacheSize: z.number().int().nonnegative().default(100),
});

const loggingConfigSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  format: z.enum(['json', 'text']).default('json'),
  colorize: z.boolean().default(true),
  stdout: z.boolean().default(true),
  file: z.boolean().default(true),
  directory: z.string().default('./logs'),
  maxSize: z.number().int().positive().default(10 * 1024 * 1024), // 10MB
  maxFiles: z.number().int().positive().default(10),
  rotationFrequency: z.enum(['daily', 'hourly', 'size-based']).default('daily'),
  timestampFormat: z.string().default('YYYY-MM-DD HH:mm:ss.SSS'),
  includeContext: z.boolean().default(true),
});

const securityConfigSchema = z.object({
  jwtSecret: z.string().optional(),
  jwtIssuer: z.string().default('aptp-auth'),
  jwtExpiresIn: z.string().default('1d'),
  saltRounds: z.number().int().min(8).max(16).default(10),
  encryptionKey: z.string().optional(),
  csrfProtection: z.boolean().default(true),
  rateLimitWindow: z.number().int().positive().default(15 * 60 * 1000), // 15 minutes
  rateLimitMax: z.number().int().positive().default(100),
  helmetEnabled: z.boolean().default(true),
  corsEnabled: z.boolean().default(true),
});

const storageConfigSchema = z.object({
  type: z.enum(['local', 'azure', 's3']).default('local'),
  localBasePath: z.string().default('./uploads'),
  s3Region: z.string().optional(),
  s3Bucket: z.string().optional(),
  s3AccessKey: z.string().optional(),
  s3SecretKey: z.string().optional(),
  azureConnectionString: z.string().optional(),
  azureContainer: z.string().optional(),
});

const performanceConfigSchema = z.object({
  metricsEnabled: z.boolean().default(true),
  metricsInterval: z.number().int().positive().default(60000), // 1 minute
  samplingRate: z.number().min(0).max(1).default(0.1), // 10% sampling
  tracingEnabled: z.boolean().default(false),
  profilingEnabled: z.boolean().default(false),
  slowRequestThreshold: z.number().int().positive().default(1000), // 1 second
  longTaskThreshold: z.number().int().positive().default(50), // 50ms
  memoryWarningThreshold: z.number().int().positive().default(1024 * 1024 * 1024), // 1GB
  cpuWarningThreshold: z.number().min(0).max(1).default(0.8), // 80% CPU usage
});

const analyticsConfigSchema = z.object({
  enabled: z.boolean().default(true),
  anonymizeIp: z.boolean().default(true),
  trackingId: z.string().optional(),
  samplingRate: z.number().min(0).max(1).default(1), // 100% sampling
  sessionTimeout: z.number().int().positive().default(30 * 60 * 1000), // 30 minutes
  useragentAnalysis: z.boolean().default(true),
  errorTracking: z.boolean().default(true),
  performanceMonitoring: z.boolean().default(true),
});

// Define the full configuration schema
const configSchema = z.object({
  server: serverConfigSchema,
  database: databaseConfigSchema,
  logging: loggingConfigSchema,
  security: securityConfigSchema,
  storage: storageConfigSchema,
  performance: performanceConfigSchema,
  analytics: analyticsConfigSchema,
});

type Config = z.infer<typeof configSchema>;

/**
 * Configuration Manager class
 * Singleton that manages application configuration
 */
class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: Config;
  private sources: Record<keyof Config, Record<string, ConfigSource>>;
  private eventEmitter: EventEmitter;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.eventEmitter = new EventEmitter();
    
    // Initialize with default values
    this.config = this.getDefaultConfig();
    this.sources = this.initSourceTracking();
    
    // Load configuration from environment variables
    this.loadFromEnvironment();
    
    // Attempt to load from config file if it exists
    try {
      this.loadFromFile();
    } catch (error) {
      consoleLog.warn('Failed to load configuration from file, using defaults and environment variables', {
        error: (error as Error).message
      });
    }
    
    consoleLog.info('Configuration manager initialized');
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * Get the entire configuration object
   */
  public getConfig(): Readonly<Config> {
    return Object.freeze({ ...this.config });
  }

  /**
   * Get a specific section of the configuration
   */
  public get<K extends keyof Config>(section: K): Readonly<Config[K]> {
    return Object.freeze({ ...this.config[section] });
  }

  /**
   * Get a specific configuration value with type safety
   */
  public getValue<K extends keyof Config, S extends keyof Config[K]>(
    section: K,
    key: S
  ): Config[K][S] {
    return this.config[section][key];
  }

  /**
   * Update a configuration value (with validation)
   */
  public setValue<K extends keyof Config, S extends keyof Config[K]>(
    section: K,
    key: S,
    value: Config[K][S],
    source: ConfigSource = 'default'
  ): void {
    const oldValue = this.config[section][key];
    
    // Skip if value hasn't changed
    if (oldValue === value) {
      return;
    }
    
    // Create a copy of the config section
    const sectionCopy = { ...this.config[section] };
    
    // Update the value
    sectionCopy[key] = value;
    
    // Validate the section
    try {
      let validatedSection;
      
      switch (section) {
        case 'server':
          validatedSection = serverConfigSchema.parse(sectionCopy);
          break;
        case 'database':
          validatedSection = databaseConfigSchema.parse(sectionCopy);
          break;
        case 'logging':
          validatedSection = loggingConfigSchema.parse(sectionCopy);
          break;
        case 'security':
          validatedSection = securityConfigSchema.parse(sectionCopy);
          break;
        case 'storage':
          validatedSection = storageConfigSchema.parse(sectionCopy);
          break;
        case 'performance':
          validatedSection = performanceConfigSchema.parse(sectionCopy);
          break;
        case 'analytics':
          validatedSection = analyticsConfigSchema.parse(sectionCopy);
          break;
        default:
          throw new Error(`Unknown configuration section: ${String(section)}`);
      }
      
      // Update the section
      this.config[section] = validatedSection;
      
      // Update the source
      this.sources[section][String(key)] = source;
      
      // Emit a change event
      this.eventEmitter.emit('configChanged', {
        section,
        key,
        oldValue,
        newValue: value,
        source
      });
      
      consoleLog.debug(`Configuration updated: ${String(section)}.${String(key)}`, {
        oldValue,
        newValue: value,
        source
      });
    } catch (error) {
      consoleLog.error(`Invalid configuration value for ${String(section)}.${String(key)}`, {
        value,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Subscribe to configuration changes
   */
  public onChange(callback: (changeEvent: any) => void): void {
    this.eventEmitter.on('configChanged', callback);
  }

  /**
   * Unsubscribe from configuration changes
   */
  public offChange(callback: (changeEvent: any) => void): void {
    this.eventEmitter.off('configChanged', callback);
  }

  /**
   * Get the source of a configuration value
   */
  public getValueSource<K extends keyof Config, S extends keyof Config[K]>(
    section: K,
    key: S
  ): ConfigSource {
    return this.sources[section][String(key)] || 'default';
  }

  /**
   * Reload configuration from all sources
   */
  public reload(): void {
    consoleLog.info('Reloading configuration');
    
    // Reset to defaults
    this.config = this.getDefaultConfig();
    this.sources = this.initSourceTracking();
    
    // Load from environment variables
    this.loadFromEnvironment();
    
    // Load from file
    try {
      this.loadFromFile();
    } catch (error) {
      consoleLog.warn('Failed to load configuration from file during reload', {
        error: (error as Error).message
      });
    }
    
    // Emit a reload event
    this.eventEmitter.emit('configReloaded', {
      timestamp: new Date().toISOString()
    });
    
    consoleLog.info('Configuration reloaded');
  }

  /**
   * Save current configuration to a file
   */
  public saveToFile(filePath: string = './config.json'): void {
    try {
      // Ensure the directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Write the config to the file
      fs.writeFileSync(
        filePath,
        JSON.stringify(this.config, null, 2),
        'utf8'
      );
      
      consoleLog.info(`Configuration saved to ${filePath}`);
    } catch (error) {
      consoleLog.error(`Failed to save configuration to ${filePath}`, {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get default configuration values
   */
  private getDefaultConfig(): Config {
    return configSchema.parse({
      server: {
        environment: process.env.NODE_ENV || 'development',
        port: 5000,
        host: '0.0.0.0',
        corsOrigins: ['*'],
        trustedProxies: [],
        requestSizeLimit: '50mb',
        compressionLevel: 6,
        rateLimitEnabled: true,
        requestTimeout: 60000,
        compressionEnabled: true,
      },
      database: {
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: undefined,
        database: 'aptp',
        poolSize: 10,
        idleTimeout: 30000,
        connectionTimeout: 2000,
        ssl: false,
        slowQueryThreshold: 1000,
        queryTimeout: 30000,
        maxCompilationCacheSize: 100,
      },
      logging: {
        level: 'info',
        format: 'json',
        colorize: true,
        stdout: true,
        file: true,
        directory: './logs',
        maxSize: 10 * 1024 * 1024, // 10MB
        maxFiles: 10,
        rotationFrequency: 'daily',
        timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
        includeContext: true,
      },
      security: {
        jwtSecret: process.env.JWT_SECRET,
        jwtIssuer: 'aptp-auth',
        jwtExpiresIn: '1d',
        saltRounds: 10,
        encryptionKey: process.env.ENCRYPTION_KEY,
        csrfProtection: true,
        rateLimitWindow: 15 * 60 * 1000, // 15 minutes
        rateLimitMax: 100,
        helmetEnabled: true,
        corsEnabled: true,
      },
      storage: {
        type: 'local',
        localBasePath: './uploads',
        s3Region: process.env.S3_REGION,
        s3Bucket: process.env.S3_BUCKET,
        s3AccessKey: process.env.S3_ACCESS_KEY,
        s3SecretKey: process.env.S3_SECRET_KEY,
        azureConnectionString: process.env.AZURE_CONNECTION_STRING,
        azureContainer: process.env.AZURE_CONTAINER,
      },
      performance: {
        metricsEnabled: true,
        metricsInterval: 60000, // 1 minute
        samplingRate: 0.1, // 10% sampling
        tracingEnabled: false,
        profilingEnabled: false,
        slowRequestThreshold: 1000, // 1 second
        longTaskThreshold: 50, // 50ms
        memoryWarningThreshold: 1024 * 1024 * 1024, // 1GB
        cpuWarningThreshold: 0.8, // 80% CPU usage
      },
      analytics: {
        enabled: true,
        anonymizeIp: true,
        trackingId: process.env.ANALYTICS_TRACKING_ID,
        samplingRate: 1, // 100% sampling
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        useragentAnalysis: true,
        errorTracking: true,
        performanceMonitoring: true,
      },
    });
  }

  /**
   * Initialize the source tracking object
   */
  private initSourceTracking(): Record<keyof Config, Record<string, ConfigSource>> {
    const sources: Record<keyof Config, Record<string, ConfigSource>> = {
      server: {},
      database: {},
      logging: {},
      security: {},
      storage: {},
      performance: {},
      analytics: {},
    };
    
    // Initialize all keys to 'default'
    for (const section of Object.keys(this.config) as Array<keyof Config>) {
      for (const key of Object.keys(this.config[section])) {
        sources[section][key] = 'default';
      }
    }
    
    return sources;
  }

  /**
   * Load configuration from environment variables
   */
  private loadFromEnvironment(): void {
    const envVarPattern = /^APTP_([A-Z_]+)_([A-Z_]+)$/;
    
    for (const [key, value] of Object.entries(process.env)) {
      const match = key.match(envVarPattern);
      
      if (match && value !== undefined) {
        const [, sectionUpper, keyUpper] = match;
        
        // Convert the section and key to camelCase
        const section = sectionUpper.toLowerCase() as keyof Config;
        const configKey = keyUpper
          .toLowerCase()
          .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        
        // Check if the section and key are valid
        if (
          Object.hasOwnProperty.call(this.config, section) &&
          Object.hasOwnProperty.call(this.config[section], configKey)
        ) {
          // Parse the value
          const parsedValue = this.parseEnvValue(value);
          
          try {
            // Set the value
            this.setValue(section, configKey as any, parsedValue, 'environment');
          } catch (error) {
            consoleLog.warn(`Invalid environment variable value for ${key}`, {
              value,
              error: (error as Error).message
            });
          }
        }
      }
    }
  }

  /**
   * Load configuration from a file
   */
  private loadFromFile(filePath: string = './config.json'): void {
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const fileConfig = JSON.parse(fileContent);
        
        // Merge the file config with the current config
        for (const section of Object.keys(fileConfig) as Array<keyof Config>) {
          if (Object.hasOwnProperty.call(this.config, section)) {
            this.mergeConfigSection(section, fileConfig[section], 'file');
          }
        }
        
        consoleLog.info(`Configuration loaded from ${filePath}`);
      } catch (error) {
        consoleLog.error(`Failed to load configuration from ${filePath}`, {
          error: (error as Error).message
        });
        throw error;
      }
    }
  }

  /**
   * Recursively merge a configuration section
   */
  private mergeConfigSection<K extends keyof Config>(
    section: K,
    sectionConfig: Record<string, any>,
    configSource: ConfigSource,
  ): void {
    for (const [key, value] of Object.entries(sectionConfig)) {
      if (
        Object.hasOwnProperty.call(this.config[section], key) &&
        value !== undefined
      ) {
        try {
          this.setValue(
            section,
            key as keyof Config[K],
            value,
            configSource
          );
        } catch (error) {
          consoleLog.warn(`Invalid configuration value for ${String(section)}.${key}`, {
            value,
            error: (error as Error).message
          });
        }
      }
    }
  }

  /**
   * Parse environment variable values to appropriate types
   */
  private parseEnvValue(value: string): any {
    // Check if it's a boolean
    if (value.toLowerCase() === 'true') {
      return true;
    }
    if (value.toLowerCase() === 'false') {
      return false;
    }
    
    // Check if it's a number
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return Number(value);
    }
    
    // Check if it's a JSON array or object
    if ((value.startsWith('[') && value.endsWith(']')) || 
        (value.startsWith('{') && value.endsWith('}'))) {
      try {
        return JSON.parse(value);
      } catch (e) {
        // Not valid JSON, return as string
        return value;
      }
    }
    
    // Return as string
    return value;
  }

  /**
   * Emit change events for all changed configuration values
   */
  private emitChangeEvents(oldConfig: Config, newConfig: Config): void {
    for (const section of Object.keys(oldConfig) as Array<keyof Config>) {
      for (const key of Object.keys(oldConfig[section])) {
        const oldValue = oldConfig[section][key as keyof Config[typeof section]];
        const newValue = newConfig[section][key as keyof Config[typeof section]];
        
        if (oldValue !== newValue) {
          this.eventEmitter.emit('configChanged', {
            section,
            key,
            oldValue,
            newValue,
            source: this.sources[section][key]
          });
        }
      }
    }
  }
}

export const configManager = ConfigurationManager.getInstance();
export default configManager;