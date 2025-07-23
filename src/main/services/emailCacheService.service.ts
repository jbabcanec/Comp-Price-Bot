import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';
import { UnifiedEmailProcessingResult } from './unifiedEmailProcessor.service';
import { ExtractedData } from '@shared/types/product.types';

export interface CacheEntry {
  key: string;
  timestamp: number;
  fileHash: string;
  fileSize: number;
  processingResult: UnifiedEmailProcessingResult;
  metadata: {
    fileName: string;
    processedAt: Date;
    processingTime: number;
    totalDataExtracted: number;
  };
}

export interface CacheStats {
  totalEntries: number;
  totalSizeBytes: number;
  hitRate: number;
  oldestEntry: Date;
  newestEntry: Date;
  averageProcessingTime: number;
}

export interface CacheConfig {
  maxSizeBytes: number;
  maxEntries: number;
  maxAgeMs: number;
  cleanupIntervalMs: number;
  compressionEnabled: boolean;
}

export class EmailCacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheDir: string;
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSizeBytes: 500 * 1024 * 1024, // 500MB default
      maxEntries: 1000,
      maxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
      cleanupIntervalMs: 60 * 60 * 1000, // 1 hour
      compressionEnabled: true,
      ...config
    };

    this.cacheDir = path.join(app.getPath('userData'), 'email-cache');
    this.initializeCache();
  }

  /**
   * Initialize cache directory and start cleanup timer
   */
  private async initializeCache(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      await this.loadCacheIndex();
      this.startCleanupTimer();
    } catch (error) {
      console.error('Failed to initialize email cache:', error);
    }
  }

  /**
   * Generate cache key from file path and modification time
   */
  private async generateCacheKey(filePath: string): Promise<string> {
    try {
      const stat = await fs.stat(filePath);
      const content = `${filePath}|${stat.mtime.getTime()}|${stat.size}`;
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      // Fallback to file path hash if stat fails
      return crypto.createHash('sha256').update(filePath).digest('hex');
    }
  }

  /**
   * Calculate file hash for integrity verification
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    try {
      const buffer = await fs.readFile(filePath);
      return crypto.createHash('md5').update(buffer).digest('hex');
    } catch (error) {
      console.warn(`Failed to calculate hash for ${filePath}:`, error);
      return '';
    }
  }

  /**
   * Check if processed result exists in cache
   */
  async getCachedResult(filePath: string): Promise<UnifiedEmailProcessingResult | null> {
    try {
      const cacheKey = await this.generateCacheKey(filePath);
      const entry = this.cache.get(cacheKey);

      if (!entry) {
        this.cacheMisses++;
        return null;
      }

      // Check if entry is expired
      const now = Date.now();
      if (now - entry.timestamp > this.config.maxAgeMs) {
        await this.removeCacheEntry(cacheKey);
        this.cacheMisses++;
        return null;
      }

      // Verify file integrity
      const currentHash = await this.calculateFileHash(filePath);
      if (currentHash && currentHash !== entry.fileHash) {
        await this.removeCacheEntry(cacheKey);
        this.cacheMisses++;
        return null;
      }

      this.cacheHits++;
      console.log(`Cache HIT for ${path.basename(filePath)} - saved ${entry.metadata.processingTime}ms`);
      
      return entry.processingResult;
    } catch (error) {
      console.warn('Cache lookup failed:', error);
      this.cacheMisses++;
      return null;
    }
  }

  /**
   * Store processing result in cache
   */
  async setCachedResult(
    filePath: string, 
    result: UnifiedEmailProcessingResult
  ): Promise<void> {
    try {
      const cacheKey = await this.generateCacheKey(filePath);
      const fileHash = await this.calculateFileHash(filePath);
      const stat = await fs.stat(filePath);

      const entry: CacheEntry = {
        key: cacheKey,
        timestamp: Date.now(),
        fileHash,
        fileSize: stat.size,
        processingResult: result,
        metadata: {
          fileName: path.basename(filePath),
          processedAt: new Date(),
          processingTime: result.processingMetadata.totalProcessingTime,
          totalDataExtracted: result.processingMetadata.dataExtractionStats.totalItemsExtracted
        }
      };

      // Store in memory cache
      this.cache.set(cacheKey, entry);

      // Persist to disk
      await this.persistCacheEntry(entry);

      console.log(`Cached result for ${path.basename(filePath)} - ${result.finalResults.length} items`);

      // Trigger cleanup if needed
      await this.enforceMemoryLimits();
    } catch (error) {
      console.warn('Failed to cache result:', error);
    }
  }

  /**
   * Persist cache entry to disk
   */
  private async persistCacheEntry(entry: CacheEntry): Promise<void> {
    try {
      const filePath = path.join(this.cacheDir, `${entry.key}.json`);
      const data = JSON.stringify(entry, null, 2);
      await fs.writeFile(filePath, data, 'utf8');
    } catch (error) {
      console.warn('Failed to persist cache entry:', error);
    }
  }

  /**
   * Load cache index from disk
   */
  private async loadCacheIndex(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.cacheDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const entry: CacheEntry = JSON.parse(content);
          
          // Check if entry is still valid
          const now = Date.now();
          if (now - entry.timestamp <= this.config.maxAgeMs) {
            this.cache.set(entry.key, entry);
          } else {
            // Remove expired entry
            await fs.unlink(filePath);
          }
        } catch (error) {
          console.warn(`Failed to load cache entry ${file}:`, error);
        }
      }

      console.log(`Loaded ${this.cache.size} cache entries from disk`);
    } catch (error) {
      console.warn('Failed to load cache index:', error);
    }
  }

  /**
   * Remove cache entry from memory and disk
   */
  private async removeCacheEntry(cacheKey: string): Promise<void> {
    try {
      this.cache.delete(cacheKey);
      const filePath = path.join(this.cacheDir, `${cacheKey}.json`);
      
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // File might not exist, ignore error
      }
    } catch (error) {
      console.warn('Failed to remove cache entry:', error);
    }
  }

  /**
   * Enforce memory and size limits
   */
  private async enforceMemoryLimits(): Promise<void> {
    // Enforce entry count limit
    if (this.cache.size > this.config.maxEntries) {
      const entriesToRemove = this.cache.size - this.config.maxEntries;
      const sortedEntries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);

      for (let i = 0; i < entriesToRemove; i++) {
        const [key] = sortedEntries[i];
        await this.removeCacheEntry(key);
      }
    }

    // Enforce size limit (approximate)
    const totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.fileSize, 0);

    if (totalSize > this.config.maxSizeBytes) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);

      let currentSize = totalSize;
      for (const [key, entry] of sortedEntries) {
        if (currentSize <= this.config.maxSizeBytes * 0.8) break; // Leave 20% headroom
        
        await this.removeCacheEntry(key);
        currentSize -= entry.fileSize;
      }
    }
  }

  /**
   * Start periodic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      await this.cleanupExpiredEntries();
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Clean up expired cache entries
   */
  private async cleanupExpiredEntries(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.maxAgeMs) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      await this.removeCacheEntry(key);
    }

    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.cacheHits + this.cacheMisses;
    
    return {
      totalEntries: entries.length,
      totalSizeBytes: entries.reduce((sum, entry) => sum + entry.fileSize, 0),
      hitRate: totalRequests > 0 ? this.cacheHits / totalRequests : 0,
      oldestEntry: entries.length > 0 ? 
        new Date(Math.min(...entries.map(e => e.timestamp))) : 
        new Date(),
      newestEntry: entries.length > 0 ? 
        new Date(Math.max(...entries.map(e => e.timestamp))) : 
        new Date(),
      averageProcessingTime: entries.length > 0 ?
        entries.reduce((sum, e) => sum + e.metadata.processingTime, 0) / entries.length :
        0
    };
  }

  /**
   * Clear all cache entries
   */
  async clearCache(): Promise<void> {
    try {
      // Clear memory cache
      this.cache.clear();

      // Clear disk cache
      const files = await fs.readdir(this.cacheDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      for (const file of jsonFiles) {
        const filePath = path.join(this.cacheDir, file);
        await fs.unlink(filePath);
      }

      // Reset stats
      this.cacheHits = 0;
      this.cacheMisses = 0;

      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Get cache summary for reporting
   */
  getCacheSummary(): string {
    const stats = this.getCacheStats();
    const sizeGB = (stats.totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2);
    const hitRatePercent = (stats.hitRate * 100).toFixed(1);
    
    return [
      `Cache: ${stats.totalEntries} entries`,
      `Size: ${sizeGB}GB`,
      `Hit rate: ${hitRatePercent}%`,
      `Avg processing time saved: ${Math.round(stats.averageProcessingTime)}ms`
    ].join(' | ');
  }

  /**
   * Shutdown cache service
   */
  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    // Final cleanup
    await this.cleanupExpiredEntries();
    console.log('Email cache service shutdown complete');
  }

  /**
   * Preload cache for common email patterns (optimization)
   */
  async preloadCache(emailPaths: string[]): Promise<void> {
    console.log(`Preloading cache for ${emailPaths.length} emails...`);
    
    for (const emailPath of emailPaths) {
      try {
        const cached = await this.getCachedResult(emailPath);
        if (cached) {
          console.log(`✓ ${path.basename(emailPath)} already cached`);
        }
      } catch (error) {
        console.warn(`Failed to check cache for ${emailPath}:`, error);
      }
    }
  }

  /**
   * Get cached extracted data only (lightweight)
   */
  async getCachedExtractedData(filePath: string): Promise<ExtractedData[] | null> {
    const fullResult = await this.getCachedResult(filePath);
    return fullResult ? fullResult.finalResults : null;
  }
}