/**
 * AI Response Caching Service
 * 
 * Implements intelligent caching for OpenAI API responses to:
 * - Reduce API costs by avoiding duplicate calls
 * - Improve response times for repeated queries
 * - Provide offline fallback for previously seen data
 * - Support cache warming strategies
 */

import { createHash } from 'crypto';
import { logger } from './logger.service';
import { getDatabaseService } from '../database';
import { CompetitorProduct, OurProduct } from '@shared/types/matching.types';

export interface CacheEntry {
  id?: number;
  cache_key: string;
  competitor_sku: string;
  competitor_company: string;
  our_sku?: string;
  confidence: number;
  match_method: string;
  reasoning: string;
  ai_response: string; // Full JSON response from OpenAI
  created_at: Date;
  expires_at: Date;
  hit_count: number;
  last_accessed: Date;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  expiredEntries: number;
  cacheSize: number; // Size in bytes
  oldestEntry?: Date;
  newestEntry?: Date;
}

export interface CacheConfig {
  ttlDays: number;           // Time to live in days
  maxEntries: number;        // Maximum cache entries
  cleanupIntervalHours: number; // How often to run cleanup
  enableWarmup: boolean;     // Enable cache warming
  warmupBatchSize: number;   // Products to warm up at once
}

export class AICacheService {
  private db: any;
  private config: CacheConfig;
  private stats: { hits: number; misses: number } = { hits: 0, misses: 0 };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttlDays: 30,                    // 30 day default TTL
      maxEntries: 10000,              // 10k entries max
      cleanupIntervalHours: 24,       // Daily cleanup
      enableWarmup: true,             // Enable warming
      warmupBatchSize: 10,            // 10 products at once
      ...config
    };
  }

  async initialize(): Promise<void> {
    this.db = await getDatabaseService();
    await this.createCacheTable();
    await this.scheduleCleanup();
    logger.info('ai-cache', 'AI Cache Service initialized', {
      ttlDays: this.config.ttlDays,
      maxEntries: this.config.maxEntries
    });
  }

  /**
   * Generate a unique cache key for a competitor product + our products combination
   */
  generateCacheKey(competitor: CompetitorProduct, ourProducts: OurProduct[]): string {
    // Create a deterministic hash based on:
    // 1. Competitor data (SKU, company, specs)
    // 2. Our products catalog (for context)
    const competitorData = {
      sku: competitor.sku,
      company: competitor.company,
      model: competitor.model,
      specifications: competitor.specifications || {}
    };

    // Include top 20 most relevant our products for context
    const relevantProducts = ourProducts
      .slice(0, 20)
      .map(p => ({ sku: p.sku, model: p.model, type: p.type, tonnage: p.tonnage, seer: p.seer }));

    const cacheData = {
      competitor: competitorData,
      context: relevantProducts,
      version: '1.0' // Version for cache invalidation
    };

    const hash = createHash('sha256')
      .update(JSON.stringify(cacheData))
      .digest('hex');

    return `ai_match_${hash.substring(0, 16)}`;
  }

  /**
   * Get cached AI response if available and not expired
   */
  async getCachedResponse(cacheKey: string): Promise<CacheEntry | null> {
    try {
      const query = `
        SELECT * FROM ai_response_cache 
        WHERE cache_key = ? AND expires_at > datetime('now')
        LIMIT 1
      `;
      
      const entry = await this.db.get(query, [cacheKey]);
      
      if (entry) {
        // Update hit count and last accessed
        await this.updateHitStats(cacheKey);
        this.stats.hits++;
        
        logger.debug('ai-cache', 'Cache hit', { 
          cacheKey, 
          competitorSku: entry.competitor_sku,
          hitCount: entry.hit_count + 1
        });
        
        return {
          ...entry,
          reasoning: JSON.parse(entry.reasoning || '[]'),
          created_at: new Date(entry.created_at),
          expires_at: new Date(entry.expires_at),
          last_accessed: new Date(entry.last_accessed)
        };
      }
      
      this.stats.misses++;
      logger.debug('ai-cache', 'Cache miss', { cacheKey });
      return null;
      
    } catch (error) {
      logger.error('ai-cache', 'Failed to get cached response', error as Error);
      return null;
    }
  }

  /**
   * Store AI response in cache
   */
  async setCachedResponse(
    cacheKey: string,
    competitor: CompetitorProduct,
    matchResult: any
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.config.ttlDays);

      const entry: Omit<CacheEntry, 'id'> = {
        cache_key: cacheKey,
        competitor_sku: competitor.sku,
        competitor_company: competitor.company,
        our_sku: matchResult.matches?.[0]?.ourSku || null,
        confidence: matchResult.matches?.[0]?.confidence || 0,
        match_method: matchResult.matches?.[0]?.matchMethod || 'ai_enhanced',
        reasoning: JSON.stringify(matchResult.matches?.[0]?.reasoning || []),
        ai_response: JSON.stringify(matchResult),
        created_at: new Date(),
        expires_at: expiresAt,
        hit_count: 0,
        last_accessed: new Date()
      };

      const query = `
        INSERT OR REPLACE INTO ai_response_cache (
          cache_key, competitor_sku, competitor_company, our_sku,
          confidence, match_method, reasoning, ai_response,
          created_at, expires_at, hit_count, last_accessed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.run(query, [
        entry.cache_key,
        entry.competitor_sku,
        entry.competitor_company,
        entry.our_sku,
        entry.confidence,
        entry.match_method,
        entry.reasoning,
        entry.ai_response,
        entry.created_at.toISOString(),
        entry.expires_at.toISOString(),
        entry.hit_count,
        entry.last_accessed.toISOString()
      ]);

      logger.debug('ai-cache', 'Response cached', {
        cacheKey,
        competitorSku: competitor.sku,
        expiresAt: expiresAt.toISOString()
      });

      // Cleanup if we exceed max entries
      await this.enforceMaxEntries();

    } catch (error) {
      logger.error('ai-cache', 'Failed to cache response', error as Error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      const queries = await Promise.all([
        this.db.get('SELECT COUNT(*) as total FROM ai_response_cache'),
        this.db.get('SELECT COUNT(*) as expired FROM ai_response_cache WHERE expires_at <= datetime("now")'),
        this.db.get('SELECT SUM(length(ai_response)) as size FROM ai_response_cache'),
        this.db.get('SELECT MIN(created_at) as oldest, MAX(created_at) as newest FROM ai_response_cache'),
        this.db.get('SELECT SUM(hit_count) as totalHits FROM ai_response_cache')
      ]);

      const [total, expired, size, dates, hits] = queries;
      const totalHits = hits?.totalHits || 0;
      const totalRequests = this.stats.hits + this.stats.misses || 1;

      return {
        totalEntries: total?.total || 0,
        hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0,
        missRate: totalRequests > 0 ? (this.stats.misses / totalRequests) * 100 : 0,
        totalHits: totalHits,
        totalMisses: this.stats.misses,
        expiredEntries: expired?.expired || 0,
        cacheSize: size?.size || 0,
        oldestEntry: dates?.oldest ? new Date(dates.oldest) : undefined,
        newestEntry: dates?.newest ? new Date(dates.newest) : undefined
      };
    } catch (error) {
      logger.error('ai-cache', 'Failed to get cache stats', error as Error);
      return {
        totalEntries: 0,
        hitRate: 0,
        missRate: 0,
        totalHits: 0,
        totalMisses: 0,
        expiredEntries: 0,
        cacheSize: 0
      };
    }
  }

  /**
   * Clean up expired entries and enforce size limits
   */
  async cleanup(): Promise<{ removedExpired: number; removedOldest: number }> {
    let removedExpired = 0;
    let removedOldest = 0;

    try {
      // Remove expired entries
      const expiredResult = await this.db.run(
        'DELETE FROM ai_response_cache WHERE expires_at <= datetime("now")'
      );
      removedExpired = expiredResult.changes || 0;

      // Enforce max entries by removing oldest
      const countResult = await this.db.get('SELECT COUNT(*) as total FROM ai_response_cache');
      const currentCount = countResult?.total || 0;

      if (currentCount > this.config.maxEntries) {
        const excessCount = currentCount - this.config.maxEntries;
        const oldestResult = await this.db.run(`
          DELETE FROM ai_response_cache 
          WHERE id IN (
            SELECT id FROM ai_response_cache 
            ORDER BY last_accessed ASC 
            LIMIT ?
          )
        `, [excessCount]);
        removedOldest = oldestResult.changes || 0;
      }

      if (removedExpired > 0 || removedOldest > 0) {
        logger.info('ai-cache', 'Cache cleanup completed', {
          removedExpired,
          removedOldest,
          remainingEntries: currentCount - removedExpired - removedOldest
        });
      }

    } catch (error) {
      logger.error('ai-cache', 'Cache cleanup failed', error as Error);
    }

    return { removedExpired, removedOldest };
  }

  /**
   * Cache warming strategy for frequently accessed products
   */
  async warmCache(competitors: CompetitorProduct[], ourProducts: OurProduct[]): Promise<number> {
    if (!this.config.enableWarmup) return 0;

    let warmedCount = 0;
    const batchSize = this.config.warmupBatchSize;

    try {
      // Process in batches to avoid overwhelming the system
      for (let i = 0; i < competitors.length; i += batchSize) {
        const batch = competitors.slice(i, i + batchSize);
        
        for (const competitor of batch) {
          const cacheKey = this.generateCacheKey(competitor, ourProducts);
          const cached = await this.getCachedResponse(cacheKey);
          
          if (!cached) {
            // This would trigger actual AI matching to warm the cache
            // Implementation would call the sequential matching service
            logger.debug('ai-cache', 'Cache warming candidate', {
              sku: competitor.sku,
              company: competitor.company
            });
            warmedCount++;
          }
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info('ai-cache', 'Cache warming completed', { warmedCount });
    } catch (error) {
      logger.error('ai-cache', 'Cache warming failed', error as Error);
    }

    return warmedCount;
  }

  /**
   * Clear all cache entries (for testing or reset)
   */
  async clearCache(): Promise<number> {
    try {
      const result = await this.db.run('DELETE FROM ai_response_cache');
      const deletedCount = result.changes || 0;
      
      this.stats.hits = 0;
      this.stats.misses = 0;
      
      logger.info('ai-cache', 'Cache cleared', { deletedCount });
      return deletedCount;
    } catch (error) {
      logger.error('ai-cache', 'Failed to clear cache', error as Error);
      return 0;
    }
  }

  // Private helper methods

  private async createCacheTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ai_response_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cache_key TEXT UNIQUE NOT NULL,
        competitor_sku TEXT NOT NULL,
        competitor_company TEXT NOT NULL,
        our_sku TEXT,
        confidence REAL NOT NULL,
        match_method TEXT NOT NULL,
        reasoning TEXT NOT NULL, -- JSON array
        ai_response TEXT NOT NULL, -- Full JSON response
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        hit_count INTEGER DEFAULT 0,
        last_accessed TEXT NOT NULL,
        
        INDEX idx_cache_key ON ai_response_cache(cache_key),
        INDEX idx_expires_at ON ai_response_cache(expires_at),
        INDEX idx_competitor ON ai_response_cache(competitor_sku, competitor_company),
        INDEX idx_last_accessed ON ai_response_cache(last_accessed)
      )
    `;

    await this.db.exec(createTableQuery);
  }

  private async updateHitStats(cacheKey: string): Promise<void> {
    await this.db.run(`
      UPDATE ai_response_cache 
      SET hit_count = hit_count + 1, last_accessed = datetime('now')
      WHERE cache_key = ?
    `, [cacheKey]);
  }

  private async enforceMaxEntries(): Promise<void> {
    const countResult = await this.db.get('SELECT COUNT(*) as total FROM ai_response_cache');
    const currentCount = countResult?.total || 0;

    if (currentCount > this.config.maxEntries) {
      const excessCount = currentCount - this.config.maxEntries;
      await this.db.run(`
        DELETE FROM ai_response_cache 
        WHERE id IN (
          SELECT id FROM ai_response_cache 
          ORDER BY hit_count ASC, last_accessed ASC 
          LIMIT ?
        )
      `, [excessCount]);
    }
  }

  private async scheduleCleanup(): Promise<void> {
    // Run initial cleanup
    await this.cleanup();

    // Schedule periodic cleanup
    setInterval(async () => {
      await this.cleanup();
    }, this.config.cleanupIntervalHours * 60 * 60 * 1000);
  }
}