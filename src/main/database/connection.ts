import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import { app } from 'electron';
import * as fs from 'fs';
import { logger } from '../services/logger.service';

export class DatabaseConnection {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor(customPath?: string) {
    this.dbPath = this.determineDatabasePath(customPath);
    this.ensureDirectoryExists();
    logger.info('database', 'Database connection initialized', { dbPath: this.dbPath });
  }

  /**
   * Determine the database path (custom or default)
   */
  private determineDatabasePath(customPath?: string): string {
    if (customPath && customPath.trim()) {
      // Use custom path
      return path.join(customPath, 'hvac-crosswalk.db');
    } else {
      // Default: user data directory
      const userDataPath = app.getPath('userData');
      return path.join(userDataPath, 'hvac-crosswalk.db');
    }
  }

  /**
   * Ensure the database directory exists
   */
  private ensureDirectoryExists(): void {
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      logger.debug('database', 'Creating database directory', { dbDir });
      fs.mkdirSync(dbDir, { recursive: true });
      logger.info('database', 'Database directory created', { dbDir });
    } else {
      logger.debug('database', 'Database directory already exists', { dbDir });
    }
  }

  /**
   * Update the database location (requires reconnection)
   */
  async setDatabasePath(customPath?: string): Promise<void> {
    // Close existing connection
    if (this.db) {
      await this.close();
    }

    // Update path and ensure directory exists
    this.dbPath = this.determineDatabasePath(customPath);
    this.ensureDirectoryExists();

    // Reconnect if we were previously connected
    await this.connect();
  }

  /**
   * Get current database path
   */
  getDatabasePath(): string {
    return this.dbPath;
  }

  /**
   * Initialize the database connection
   */
  async connect(): Promise<void> {
    logger.info('database', 'Attempting to connect to database', { dbPath: this.dbPath });
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          logger.database('connect', 'database', false, `Connection failed: ${err.message}`, err);
          reject(err);
        } else {
          const connectTime = Date.now() - startTime;
          logger.database('connect', 'database', true, `Connected to SQLite database at: ${this.dbPath}`);
          logger.debug('database', 'Connection established', { connectTimeMs: connectTime });
          
          // Enable foreign keys
          this.db!.run('PRAGMA foreign_keys = ON', (pragmaErr) => {
            if (pragmaErr) {
              logger.warn('database', 'Failed to enable foreign keys', pragmaErr);
            } else {
              logger.debug('database', 'Foreign keys enabled');
            }
          });
          resolve();
        }
      });
    });
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (!this.db) {
      logger.debug('database', 'No active connection to close');
      return;
    }

    logger.info('database', 'Closing database connection');
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        const closeTime = Date.now() - startTime;
        if (err) {
          logger.database('close', 'database', false, `Failed to close connection: ${err.message}`, err);
          reject(err);
        } else {
          logger.database('close', 'database', true, 'Database connection closed');
          logger.debug('database', 'Connection closed', { closeTimeMs: closeTime });
          this.db = null;
          resolve();
        }
      });
    });
  }

  /**
   * Get the database instance
   */
  getDatabase(): sqlite3.Database {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  /**
   * Run a SQL query (for INSERT, UPDATE, DELETE)
   */
  async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    const db = this.getDatabase();
    const startTime = Date.now();
    const operation = sql.trim().split(' ')[0].toUpperCase();
    
    logger.debug('database', `Executing SQL ${operation}`, { 
      sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
      paramCount: params.length 
    });
    
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        const executionTime = Date.now() - startTime;
        if (err) {
          logger.database(operation.toLowerCase(), 'query', false, `SQL ${operation} failed (${executionTime}ms): ${err.message}`, err);
          reject(err);
        } else {
          logger.database(operation.toLowerCase(), 'query', true, `SQL ${operation} succeeded (${executionTime}ms) - Changes: ${this.changes}`);
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Get a single row
   */
  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const db = this.getDatabase();
    const startTime = Date.now();
    
    logger.debug('database', 'Executing SQL get', { 
      sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
      paramCount: params.length 
    });
    
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        const executionTime = Date.now() - startTime;
        if (err) {
          logger.database('get', 'query', false, `SQL get failed (${executionTime}ms): ${err.message}`, err);
          reject(err);
        } else {
          logger.database('get', 'query', true, `SQL get succeeded (${executionTime}ms)`);
          resolve(row as T);
        }
      });
    });
  }

  /**
   * Get multiple rows
   */
  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const db = this.getDatabase();
    const startTime = Date.now();
    
    logger.debug('database', 'Executing SQL all', { 
      sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
      paramCount: params.length 
    });
    
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        const executionTime = Date.now() - startTime;
        if (err) {
          logger.database('all', 'query', false, `SQL all failed (${executionTime}ms): ${err.message}`, err);
          reject(err);
        } else {
          logger.database('all', 'query', true, `SQL all succeeded (${executionTime}ms) - Rows: ${rows.length}`);
          resolve(rows as T[]);
        }
      });
    });
  }

  /**
   * Execute multiple SQL statements (for migrations)
   */
  async exec(sql: string): Promise<void> {
    const db = this.getDatabase();
    
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) {
          console.error('Database exec error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Start a transaction
   */
  async beginTransaction(): Promise<void> {
    logger.info('database', 'Beginning transaction');
    await this.run('BEGIN TRANSACTION');
  }

  /**
   * Commit a transaction
   */
  async commit(): Promise<void> {
    logger.info('database', 'Committing transaction');
    await this.run('COMMIT');
  }

  /**
   * Rollback a transaction
   */
  async rollback(): Promise<void> {
    logger.warn('database', 'Rolling back transaction');
    await this.run('ROLLBACK');
  }
}

// Singleton instance
let dbInstance: DatabaseConnection | null = null;

export function getDatabase(): DatabaseConnection {
  if (!dbInstance) {
    dbInstance = new DatabaseConnection();
  }
  return dbInstance;
}