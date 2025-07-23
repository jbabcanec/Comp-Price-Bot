import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import { app } from 'electron';
import * as fs from 'fs';

export class DatabaseConnection {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor(customPath?: string) {
    this.dbPath = this.determineDatabasePath(customPath);
    this.ensureDirectoryExists();
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
      fs.mkdirSync(dbDir, { recursive: true });
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
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Database connection error:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database at:', this.dbPath);
          // Enable foreign keys
          this.db!.run('PRAGMA foreign_keys = ON');
          resolve();
        }
      });
    });
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          console.error('Database close error:', err);
          reject(err);
        } else {
          console.log('Database connection closed');
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
    
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) {
          console.error('Database run error:', err);
          reject(err);
        } else {
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
    
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Database get error:', err);
          reject(err);
        } else {
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
    
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Database all error:', err);
          reject(err);
        } else {
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
    await this.run('BEGIN TRANSACTION');
  }

  /**
   * Commit a transaction
   */
  async commit(): Promise<void> {
    await this.run('COMMIT');
  }

  /**
   * Rollback a transaction
   */
  async rollback(): Promise<void> {
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