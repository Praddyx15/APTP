/**
 * Database Manager
 * 
 * Provides database connection management with:
 * - Connection pooling for PostgreSQL
 * - Prepared statement caching
 * - Transaction management
 * - Query builders for common operations
 * - Migrations support
 */

import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as fs from 'fs';
import * as path from 'path';
import { configManager } from './config-manager';
import { logger } from './logger';
import { AppError, ErrorType } from './error-handler';

interface QueryParams {
  text: string;
  values?: any[];
  name?: string;
}

interface PreparedStatement {
  name: string;
  text: string;
  values?: any[];
}

class DatabaseManager {
  private static instance: DatabaseManager;
  private pool: pg.Pool;
  private drizzleDb: pg.Pool | null = null;
  private preparedStatements: Map<string, PreparedStatement> = new Map();
  private migrationLock: boolean = false;

  private constructor() {
    const dbConfig = {
      host: configManager.getValue('database', 'host') || 'localhost',
      port: configManager.getValue('database', 'port') || 5432,
      database: configManager.getValue('database', 'name') || 'aptp',
      user: configManager.getValue('database', 'user') || 'postgres',
      password: configManager.getValue('database', 'password') || 'postgres',
      max: configManager.getValue('database', 'poolSize') || 20,
      idleTimeoutMillis: configManager.getValue('database', 'idleTimeout') || 30000,
      connectionTimeoutMillis: configManager.getValue('database', 'connectionTimeout') || 2000,
    };

    // Create a connection pool
    this.pool = new pg.Pool(dbConfig);
    
    // Set up event listeners
    this.setupPoolEventListeners();
    
    // Initialize Drizzle
    this.initializeDrizzle();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialize Drizzle ORM
   */
  private initializeDrizzle(): void {
    try {
      // Create a separate pool for Drizzle to use
      const drizzleConfig = {
        host: configManager.getValue('database', 'host') || 'localhost',
        port: configManager.getValue('database', 'port') || 5432,
        database: configManager.getValue('database', 'name') || 'aptp',
        user: configManager.getValue('database', 'user') || 'postgres',
        password: configManager.getValue('database', 'password') || 'postgres'
      };

      this.drizzleDb = new pg.Pool(drizzleConfig);
      
      // This creates a drizzle instance but we don't store it as it's created on demand
      drizzle(this.drizzleDb);
      
      logger.info('Drizzle ORM initialized');
    } catch (error) {
      logger.error('Failed to initialize Drizzle ORM', { error });
    }
  }

  /**
   * Get the Drizzle ORM instance
   */
  public getDrizzle(): pg.Pool {
    if (!this.drizzleDb) {
      throw new AppError('Drizzle ORM not initialized', ErrorType.DATABASE);
    }
    return this.drizzleDb;
  }

  /**
   * Run database migrations
   */
  public async runMigrations(migrationDirectory = './migrations'): Promise<void> {
    if (this.migrationLock) {
      logger.warn('Migration already in progress, skipping this request');
      return;
    }

    try {
      this.migrationLock = true;
      logger.info('Running database migrations', { directory: migrationDirectory });

      if (!this.drizzleDb) {
        this.initializeDrizzle();
      }

      if (this.drizzleDb) {
        const db = drizzle(this.drizzleDb);
        
        // Check if the migration directory exists
        if (!fs.existsSync(migrationDirectory)) {
          fs.mkdirSync(migrationDirectory, { recursive: true });
          logger.info('Created migration directory', { directory: migrationDirectory });
        }
        
        // Run migrations
        await migrate(db, { migrationsFolder: migrationDirectory });
        logger.info('Database migrations completed successfully');
      } else {
        throw new AppError('Drizzle ORM not initialized', ErrorType.DATABASE);
      }
    } catch (error) {
      logger.error('Failed to run migrations', { error });
      throw new AppError(
        `Migration failed: ${(error as Error).message}`,
        ErrorType.DATABASE
      );
    } finally {
      this.migrationLock = false;
    }
  }

  /**
   * Get a client from the connection pool
   */
  public async getClient(): Promise<pg.PoolClient> {
    try {
      const client = await this.pool.connect();
      return client;
    } catch (error) {
      logger.error('Failed to get database client', { error });
      throw new AppError(
        `Failed to get database client: ${(error as Error).message}`,
        ErrorType.DATABASE
      );
    }
  }

  /**
   * Execute a query
   */
  public async query<T extends pg.QueryResultRow>(
    textOrConfig: string | QueryParams,
    values?: any[]
  ): Promise<pg.QueryResult<T>> {
    try {
      let query: QueryParams;
      
      if (typeof textOrConfig === 'string') {
        query = { text: textOrConfig, values };
      } else {
        query = textOrConfig;
      }
      
      // We're passing the query with any potential values to the logger to help with debugging
      logger.debug('Executing query', { query: query.text, params: query.values });
      
      const start = Date.now();
      const result = await this.pool.query<T>(query);
      const duration = Date.now() - start;
      
      logger.debug('Query completed', {
        query: query.text,
        rowCount: result.rowCount,
        duration: `${duration}ms`
      });
      
      return result;
    } catch (error) {
      logger.error('Query failed', {
        query: typeof textOrConfig === 'string' ? textOrConfig : textOrConfig.text,
        values,
        error
      });
      
      throw new AppError(
        `Query failed: ${(error as Error).message}`,
        ErrorType.DATABASE
      );
    }
  }

  /**
   * Execute a prepared statement
   */
  public async executeStatement<T extends pg.QueryResultRow>(
    name: string,
    values?: any[]
  ): Promise<pg.QueryResult<T>> {
    const statement = this.preparedStatements.get(name);
    
    if (!statement) {
      throw new AppError(`Prepared statement "${name}" not found`, ErrorType.DATABASE);
    }
    
    try {
      return await this.query<T>({
        name,
        text: statement.text,
        values: values || statement.values
      });
    } catch (error) {
      logger.error('Failed to execute prepared statement', {
        name,
        error
      });
      
      throw new AppError(
        `Failed to execute prepared statement: ${(error as Error).message}`,
        ErrorType.DATABASE
      );
    }
  }

  /**
   * Prepare a statement
   */
  public async prepareStatement(
    name: string,
    text: string,
    values?: any[]
  ): Promise<void> {
    try {
      this.preparedStatements.set(name, { name, text, values });
      
      // Actually prepare the statement on the server
      await this.query({
        text: `PREPARE ${name} AS ${text}`,
      });
      
      logger.debug('Prepared statement', { name, text });
    } catch (error) {
      logger.error('Failed to prepare statement', {
        name,
        text,
        error
      });
      
      throw new AppError(
        `Failed to prepare statement: ${(error as Error).message}`,
        ErrorType.DATABASE
      );
    }
  }

  /**
   * Execute a transaction
   */
  public async transaction<T extends pg.QueryResultRow>(
    callback: (client: pg.PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      
      logger.error('Transaction failed', { error });
      
      throw new AppError(
        `Transaction failed: ${(error as Error).message}`,
        ErrorType.DATABASE
      );
    } finally {
      client.release();
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  public async transactionQueries<T extends pg.QueryResultRow = any>(
    queries: QueryParams[]
  ): Promise<pg.QueryResult<T>[]> {
    return this.transaction(async (client) => {
      const results: pg.QueryResult<T>[] = [];
      
      for (const query of queries) {
        const result = await client.query<T>(query);
        results.push(result);
      }
      
      return results;
    });
  }

  /**
   * Build a simple INSERT query
   */
  public buildInsertQuery(
    table: string,
    data: Record<string, any>,
    returning: string = '*'
  ): QueryParams {
    const columns = Object.keys(data);
    const values = Object.values(data);
    
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    
    const text = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders})
      ${returning ? `RETURNING ${returning}` : ''}
    `;
    
    return { text, values };
  }

  /**
   * Build a simple UPDATE query
   */
  public buildUpdateQuery(
    table: string,
    data: Record<string, any>,
    where: string,
    whereParams: any[] = [],
    returning: string = '*'
  ): QueryParams {
    const columns = Object.keys(data);
    const values = Object.values(data);
    
    const setClause = columns
      .map((col, i) => `${col} = $${i + 1}`)
      .join(', ');
    
    // Replace placeholders in the where clause
    let paramIndex = values.length;
    const processedWhere = where.replace(/\$\d+/g, () => {
      paramIndex++;
      return `$${paramIndex}`;
    });
    
    const text = `
      UPDATE ${table}
      SET ${setClause}
      WHERE ${processedWhere}
      ${returning ? `RETURNING ${returning}` : ''}
    `;
    
    return { text, values: [...values, ...whereParams] };
  }

  /**
   * Close the connection pool
   */
  public async close(): Promise<void> {
    try {
      await this.pool.end();
      
      if (this.drizzleDb) {
        await this.drizzleDb.end();
      }
      
      logger.info('Database connections closed');
    } catch (error) {
      logger.error('Failed to close database connections', { error });
    }
  }

  /**
   * Set up event listeners on the connection pool
   */
  private setupPoolEventListeners(): void {
    this.pool.on('connect', (client) => {
      logger.debug('New database connection established');
    });

    this.pool.on('acquire', (client) => {
      logger.debug('Database client acquired from pool');
    });

    this.pool.on('remove', (client) => {
      logger.debug('Database client removed from pool');
    });

    this.pool.on('error', (err, client) => {
      logger.error('Unexpected error on idle database client', { error: err });
    });
  }
}

export const dbManager = DatabaseManager.getInstance();