import { DatabaseConnection, getDatabase } from './connection';
import { DatabaseMigrator } from './migrations/migrator';
import { ProductsRepository } from './repositories/products.repo';
import { MappingsRepository } from './repositories/mappings.repo';

export class DatabaseService {
  private db: DatabaseConnection;
  private migrator: DatabaseMigrator;
  
  // Repository instances
  public products: ProductsRepository;
  public mappings: MappingsRepository;

  constructor() {
    this.db = getDatabase();
    this.migrator = new DatabaseMigrator(this.db);
    
    // Initialize repositories
    this.products = new ProductsRepository(this.db);
    this.mappings = new MappingsRepository(this.db);
  }

  /**
   * Initialize the database connection and run migrations
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing database...');
      
      // Connect to database
      await this.db.connect();
      
      // Run migrations
      await this.migrator.migrate();
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
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
    try {
      const version = await this.getVersion();
      console.log(`Database health check passed - version: ${version}`);
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
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