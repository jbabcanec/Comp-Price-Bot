import { DatabaseConnection, getDatabase } from './connection';
import { DatabaseMigrator } from './migrations/migrator';
import { ProductsRepository } from './repositories/products.repo';
import { MappingsRepository } from './repositories/mappings.repo';
import { HistoryRepository } from './repositories/history.repo';
import { CompetitorDataRepository } from './repositories/competitorData.repo';
import { logger } from '../services/logger.service';

export class DatabaseService {
  private db: DatabaseConnection;
  private migrator: DatabaseMigrator;
  
  // Repository instances
  public products: ProductsRepository;
  public mappings: MappingsRepository;
  public history: HistoryRepository;
  public competitorData: CompetitorDataRepository;

  constructor() {
    logger.debug('database', 'Creating DatabaseService instance');
    this.db = getDatabase();
    this.migrator = new DatabaseMigrator(this.db);
    
    // Initialize repositories
    this.products = new ProductsRepository(this.db);
    this.mappings = new MappingsRepository(this.db);
    this.history = new HistoryRepository(this.db);
    this.competitorData = new CompetitorDataRepository(this.db);
    logger.debug('database', 'DatabaseService repositories initialized');
  }

  /**
   * Initialize the database connection and run migrations
   */
  async initialize(): Promise<void> {
    const startTime = Date.now();
    try {
      logger.info('database', 'Starting database initialization');
      
      // Connect to database
      await this.db.connect();
      
      // Run migrations
      logger.info('database', 'Running database migrations');
      await this.migrator.migrate();
      
      const initTime = Date.now() - startTime;
      logger.info('database', 'Database initialized successfully', { initTimeMs: initTime });
    } catch (error) {
      const initTime = Date.now() - startTime;
      logger.error('database', 'Database initialization failed', 
        error instanceof Error ? error : new Error(String(error)), 
        { initTimeMs: initTime });
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    await this.db.close();
  }

  /**
   * Get the raw database connection (for advanced operations)
   */
  getRawConnection(): DatabaseConnection {
    return this.db;
  }

  /**
   * Get current database version
   */
  async getVersion(): Promise<number> {
    return this.migrator.getCurrentVersion();
  }

  /**
   * Health check - verify database is working
   */
  async healthCheck(): Promise<boolean> {
    logger.debug('database', 'Running database health check');
    const startTime = Date.now();
    
    try {
      const version = await this.getVersion();
      const checkTime = Date.now() - startTime;
      
      logger.info('database', 'Database health check passed', { 
        version, 
        checkTimeMs: checkTime 
      });
      return true;
    } catch (error) {
      const checkTime = Date.now() - startTime;
      logger.error('database', 'Database health check failed', 
        error instanceof Error ? error : new Error(String(error)),
        { checkTimeMs: checkTime });
      return false;
    }
  }
}

// Singleton instance
let dbServiceInstance: DatabaseService | null = null;

export function getDatabaseService(): DatabaseService {
  if (!dbServiceInstance) {
    dbServiceInstance = new DatabaseService();
  }
  return dbServiceInstance;
}

// Export types and repositories for use in other modules
export { DatabaseConnection } from './connection';
export { ProductsRepository } from './repositories/products.repo';
export { MappingsRepository } from './repositories/mappings.repo';