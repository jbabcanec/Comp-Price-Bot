import * as fs from 'fs';
import * as path from 'path';
import { DatabaseConnection } from '../connection';

export interface Migration {
  version: number;
  filename: string;
  sql: string;
}

export class DatabaseMigrator {
  private db: DatabaseConnection;
  private migrationsPath: string;

  constructor(db: DatabaseConnection) {
    this.db = db;
    this.migrationsPath = __dirname;
  }

  /**
   * Initialize the migrations table
   */
  private async initializeMigrationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER UNIQUE NOT NULL,
        filename TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await this.db.exec(sql);
  }

  /**
   * Get all available migration files
   */
  private getMigrationFiles(): Migration[] {
    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql') && file.match(/^\d+_/))
      .sort();

    return files.map(filename => {
      const version = parseInt(filename.split('_')[0], 10);
      const filePath = path.join(this.migrationsPath, filename);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      return { version, filename, sql };
    });
  }

  /**
   * Get applied migrations from database
   */
  private async getAppliedMigrations(): Promise<number[]> {
    try {
      const results = await this.db.all<{ version: number }>(
        'SELECT version FROM migrations ORDER BY version'
      );
      return results.map(r => r.version);
    } catch (error) {
      // Table doesn't exist yet, return empty array
      return [];
    }
  }

  /**
   * Apply a single migration
   */
  private async applyMigration(migration: Migration): Promise<void> {
    console.log(`Applying migration ${migration.version}: ${migration.filename}`);
    
    try {
      await this.db.beginTransaction();
      
      // Execute the migration SQL
      await this.db.exec(migration.sql);
      
      // Record the migration as applied
      await this.db.run(
        'INSERT INTO migrations (version, filename) VALUES (?, ?)',
        [migration.version, migration.filename]
      );
      
      await this.db.commit();
      console.log(`Migration ${migration.version} applied successfully`);
    } catch (error) {
      await this.db.rollback();
      console.error(`Failed to apply migration ${migration.version}:`, error);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    console.log('Starting database migration...');
    
    // Initialize migrations table
    await this.initializeMigrationsTable();
    
    // Get available and applied migrations
    const availableMigrations = this.getMigrationFiles();
    const appliedVersions = await this.getAppliedMigrations();
    
    // Find pending migrations
    const pendingMigrations = availableMigrations.filter(
      migration => !appliedVersions.includes(migration.version)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }
    
    console.log(`Found ${pendingMigrations.length} pending migration(s)`);
    
    // Apply each pending migration
    for (const migration of pendingMigrations) {
      await this.applyMigration(migration);
    }
    
    console.log('Database migration completed successfully');
  }

  /**
   * Get current database version
   */
  async getCurrentVersion(): Promise<number> {
    try {
      const result = await this.db.get<{ version: number }>(
        'SELECT MAX(version) as version FROM migrations'
      );
      return result?.version || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Rollback to a specific version (dangerous!)
   */
  async rollback(targetVersion: number): Promise<void> {
    console.log(`Rolling back to version ${targetVersion}`);
    
    const currentVersion = await this.getCurrentVersion();
    if (targetVersion >= currentVersion) {
      throw new Error('Target version must be lower than current version');
    }
    
    // This is a simple implementation - in production you'd want
    // proper rollback scripts
    console.warn('Rollback not implemented - would require rollback scripts');
    throw new Error('Rollback functionality not implemented');
  }
}