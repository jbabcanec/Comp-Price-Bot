import { EventEmitter } from 'events';
import * as os from 'os';

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
}

export interface MemoryThresholds {
  warning: number;    // 70% of available memory
  critical: number;   // 85% of available memory
  emergency: number;  // 95% of available memory
}

export interface MemoryManagerConfig {
  monitoringInterval: number; // milliseconds
  gcInterval: number;         // milliseconds
  maxImageCacheSize: number;  // MB
  maxBufferPoolSize: number;  // MB
  enableAutoGC: boolean;
  enableBufferPool: boolean;
  thresholds: MemoryThresholds;
}

export interface ImageProcessingPool {
  buffers: Buffer[];
  maxSize: number;
  currentSize: number;
  hits: number;
  misses: number;
}

export class MemoryManager extends EventEmitter {
  private config: MemoryManagerConfig;
  private monitoringTimer?: NodeJS.Timeout;
  private gcTimer?: NodeJS.Timeout;
  private imageCache: Map<string, { buffer: Buffer; lastAccessed: number; size: number }> = new Map();
  private bufferPool: ImageProcessingPool;
  private memoryStats = {
    peakUsage: 0,
    gcCount: 0,
    cacheEvictions: 0,
    emergencyCleanups: 0
  };

  constructor(config?: Partial<MemoryManagerConfig>) {
    super();
    
    this.config = {
      monitoringInterval: 10000, // 10 seconds
      gcInterval: 30000,         // 30 seconds
      maxImageCacheSize: 200,    // 200MB
      maxBufferPoolSize: 100,    // 100MB
      enableAutoGC: true,
      enableBufferPool: true,
      thresholds: {
        warning: 0.70,
        critical: 0.85,
        emergency: 0.95
      },
      ...config
    };

    this.bufferPool = {
      buffers: [],
      maxSize: this.config.maxBufferPoolSize * 1024 * 1024, // Convert to bytes
      currentSize: 0,
      hits: 0,
      misses: 0
    };

    this.startMonitoring();
  }

  /**
   * Start memory monitoring
   */
  private startMonitoring(): void {
    this.monitoringTimer = setInterval(() => {
      this.checkMemoryUsage();
    }, this.config.monitoringInterval);

    if (this.config.enableAutoGC) {
      this.gcTimer = setInterval(() => {
        this.performGarbageCollection();
      }, this.config.gcInterval);
    }
  }

  /**
   * Check current memory usage and trigger cleanup if needed
   */
  private checkMemoryUsage(): void {
    const usage = this.getMemoryUsage();
    const totalSystemMemory = os.totalmem();
    const usageRatio = usage.rss / totalSystemMemory;

    // Update peak usage
    if (usage.rss > this.memoryStats.peakUsage) {
      this.memoryStats.peakUsage = usage.rss;
    }

    this.emit('memory-update', { usage, usageRatio });

    // Check thresholds and trigger appropriate actions
    if (usageRatio >= this.config.thresholds.emergency) {
      this.handleEmergencyMemory();
    } else if (usageRatio >= this.config.thresholds.critical) {
      this.handleCriticalMemory();
    } else if (usageRatio >= this.config.thresholds.warning) {
      this.handleWarningMemory();
    }
  }

  /**
   * Handle emergency memory situation
   */
  private handleEmergencyMemory(): void {
    console.error('EMERGENCY: Memory usage critical, performing aggressive cleanup');
    
    this.memoryStats.emergencyCleanups++;
    
    // Clear all caches immediately
    this.clearImageCache();
    this.clearBufferPool();
    
    // Force garbage collection
    this.forceGarbageCollection();
    
    this.emit('emergency-cleanup', {
      action: 'emergency-cleanup',
      reason: 'Memory usage exceeded emergency threshold'
    });
  }

  /**
   * Handle critical memory situation
   */
  private handleCriticalMemory(): void {
    console.warn('CRITICAL: Memory usage high, performing cleanup');
    
    // Evict 50% of image cache
    this.evictImageCache(0.5);
    
    // Clean buffer pool
    this.cleanBufferPool(0.3);
    
    // Force garbage collection
    this.forceGarbageCollection();
    
    this.emit('critical-cleanup', {
      action: 'critical-cleanup',
      reason: 'Memory usage exceeded critical threshold'
    });
  }

  /**
   * Handle warning memory situation
   */
  private handleWarningMemory(): void {
    console.warn('WARNING: Memory usage elevated, performing light cleanup');
    
    // Evict old entries from image cache
    this.evictOldCacheEntries();
    
    // Clean unused buffers
    this.cleanBufferPool(0.1);
    
    this.emit('warning-cleanup', {
      action: 'warning-cleanup',
      reason: 'Memory usage exceeded warning threshold'
    });
  }

  /**
   * Get optimized buffer for image processing
   */
  getProcessingBuffer(size: number): Buffer {
    if (!this.config.enableBufferPool) {
      return Buffer.alloc(size);
    }

    // Look for suitable buffer in pool
    const suitableBufferIndex = this.bufferPool.buffers.findIndex(
      buffer => buffer.length >= size && buffer.length <= size * 1.5
    );

    if (suitableBufferIndex !== -1) {
      const buffer = this.bufferPool.buffers.splice(suitableBufferIndex, 1)[0];
      this.bufferPool.currentSize -= buffer.length;
      this.bufferPool.hits++;
      
      // Reset buffer content
      buffer.fill(0);
      return buffer.subarray(0, size);
    }

    // No suitable buffer found, create new one
    this.bufferPool.misses++;
    return Buffer.alloc(size);
  }

  /**
   * Return buffer to pool for reuse
   */
  returnProcessingBuffer(buffer: Buffer): void {
    if (!this.config.enableBufferPool) {
      return; // Pool disabled
    }

    // Don't pool very small or very large buffers
    if (buffer.length < 1024 || buffer.length > 50 * 1024 * 1024) {
      return;
    }

    // Check if pool has space
    if (this.bufferPool.currentSize + buffer.length > this.bufferPool.maxSize) {
      return; // Pool full
    }

    this.bufferPool.buffers.push(buffer);
    this.bufferPool.currentSize += buffer.length;
  }

  /**
   * Cache processed image with memory management
   */
  cacheImage(key: string, imageBuffer: Buffer): void {
    const size = imageBuffer.length;
    const currentCacheSize = this.getCurrentImageCacheSize();
    
    // Check if adding this image would exceed cache limit
    if (currentCacheSize + size > this.config.maxImageCacheSize * 1024 * 1024) {
      // Evict entries to make space
      this.evictImageCacheToFit(size);
    }

    this.imageCache.set(key, {
      buffer: imageBuffer,
      lastAccessed: Date.now(),
      size
    });
  }

  /**
   * Get cached image
   */
  getCachedImage(key: string): Buffer | null {
    const entry = this.imageCache.get(key);
    if (entry) {
      entry.lastAccessed = Date.now();
      return entry.buffer;
    }
    return null;
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): MemoryUsage {
    return process.memoryUsage();
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): {
    current: MemoryUsage;
    peak: number;
    system: {
      total: number;
      free: number;
      usagePercent: number;
    };
    cache: {
      imageCache: {
        entries: number;
        sizeBytes: number;
        sizeMB: number;
      };
      bufferPool: {
        buffers: number;
        sizeBytes: number;
        sizeMB: number;
        hits: number;
        misses: number;
        hitRate: number;
      };
    };
    stats: {
      peakUsage: number;
      gcCount: number;
      cacheEvictions: number;
      emergencyCleanups: number;
    };
  } {
    const current = this.getMemoryUsage();
    const totalSystemMemory = os.totalmem();
    const freeSystemMemory = os.freemem();
    const currentCacheSize = this.getCurrentImageCacheSize();

    return {
      current,
      peak: this.memoryStats.peakUsage,
      system: {
        total: totalSystemMemory,
        free: freeSystemMemory,
        usagePercent: (current.rss / totalSystemMemory) * 100
      },
      cache: {
        imageCache: {
          entries: this.imageCache.size,
          sizeBytes: currentCacheSize,
          sizeMB: currentCacheSize / (1024 * 1024)
        },
        bufferPool: {
          buffers: this.bufferPool.buffers.length,
          sizeBytes: this.bufferPool.currentSize,
          sizeMB: this.bufferPool.currentSize / (1024 * 1024),
          hits: this.bufferPool.hits,
          misses: this.bufferPool.misses,
          hitRate: this.bufferPool.hits + this.bufferPool.misses > 0 
            ? this.bufferPool.hits / (this.bufferPool.hits + this.bufferPool.misses)
            : 0
        }
      },
      stats: { ...this.memoryStats }
    };
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
      this.memoryStats.gcCount++;
      this.emit('gc-performed', { forced: true });
    } else {
      console.warn('Garbage collection not available. Run with --expose-gc flag.');
    }
  }

  /**
   * Perform scheduled garbage collection
   */
  private performGarbageCollection(): void {
    if (global.gc) {
      const beforeUsage = this.getMemoryUsage();
      global.gc();
      const afterUsage = this.getMemoryUsage();
      
      this.memoryStats.gcCount++;
      
      this.emit('gc-performed', {
        forced: false,
        before: beforeUsage,
        after: afterUsage,
        freed: beforeUsage.heapUsed - afterUsage.heapUsed
      });
    }
  }

  /**
   * Clear image cache
   */
  clearImageCache(): void {
    const entriesCleared = this.imageCache.size;
    this.imageCache.clear();
    this.memoryStats.cacheEvictions += entriesCleared;
    
    this.emit('cache-cleared', {
      type: 'image-cache',
      entriesCleared
    });
  }

  /**
   * Clear buffer pool
   */
  clearBufferPool(): void {
    const buffersCleared = this.bufferPool.buffers.length;
    this.bufferPool.buffers = [];
    this.bufferPool.currentSize = 0;
    
    this.emit('cache-cleared', {
      type: 'buffer-pool',
      buffersCleared
    });
  }

  /**
   * Evict percentage of image cache
   */
  private evictImageCache(percentage: number): void {
    const entries = Array.from(this.imageCache.entries());
    entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    const entriesToEvict = Math.floor(entries.length * percentage);
    
    for (let i = 0; i < entriesToEvict; i++) {
      this.imageCache.delete(entries[i][0]);
      this.memoryStats.cacheEvictions++;
    }
  }

  /**
   * Evict old cache entries (older than 5 minutes)
   */
  private evictOldCacheEntries(): void {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    let evicted = 0;
    
    for (const [key, entry] of this.imageCache) {
      if (entry.lastAccessed < fiveMinutesAgo) {
        this.imageCache.delete(key);
        evicted++;
      }
    }
    
    this.memoryStats.cacheEvictions += evicted;
    
    if (evicted > 0) {
      this.emit('cache-evicted', {
        type: 'old-entries',
        count: evicted
      });
    }
  }

  /**
   * Evict cache entries to fit new image
   */
  private evictImageCacheToFit(requiredSize: number): void {
    const entries = Array.from(this.imageCache.entries());
    entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    let freedSpace = 0;
    let evicted = 0;
    
    for (const [key, entry] of entries) {
      this.imageCache.delete(key);
      freedSpace += entry.size;
      evicted++;
      
      if (freedSpace >= requiredSize) {
        break;
      }
    }
    
    this.memoryStats.cacheEvictions += evicted;
  }

  /**
   * Clean buffer pool by removing percentage of buffers
   */
  private cleanBufferPool(percentage: number): void {
    const buffersToRemove = Math.floor(this.bufferPool.buffers.length * percentage);
    
    // Remove largest buffers first
    this.bufferPool.buffers.sort((a: Buffer, b: Buffer) => b.length - a.length);
    
    for (let i = 0; i < buffersToRemove && this.bufferPool.buffers.length > 0; i++) {
      const buffer = this.bufferPool.buffers.shift()!;
      this.bufferPool.currentSize -= buffer.length;
    }
  }

  /**
   * Get current image cache size in bytes
   */
  private getCurrentImageCacheSize(): number {
    return Array.from(this.imageCache.values())
      .reduce((total, entry) => total + entry.size, 0);
  }

  /**
   * Get memory usage summary string
   */
  getMemorySummary(): string {
    const stats = this.getMemoryStats();
    const heapMB = (stats.current.heapUsed / 1024 / 1024).toFixed(1);
    const rssMB = (stats.current.rss / 1024 / 1024).toFixed(1);
    const usagePercent = stats.system.usagePercent.toFixed(1);
    
    return [
      `Heap: ${heapMB}MB`,
      `RSS: ${rssMB}MB`,
      `System: ${usagePercent}%`,
      `Cache: ${stats.cache.imageCache.entries} items (${stats.cache.imageCache.sizeMB.toFixed(1)}MB)`,
      `Pool: ${stats.cache.bufferPool.buffers} buffers (${stats.cache.bufferPool.sizeMB.toFixed(1)}MB)`
    ].join(' | ');
  }

  /**
   * Shutdown memory manager
   */
  shutdown(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
    }
    
    this.clearImageCache();
    this.clearBufferPool();
    
    this.emit('shutdown');
  }

  /**
   * Set memory thresholds
   */
  setThresholds(thresholds: Partial<MemoryThresholds>): void {
    this.config.thresholds = { ...this.config.thresholds, ...thresholds };
    this.emit('thresholds-updated', this.config.thresholds);
  }

  /**
   * Check if memory usage is healthy
   */
  isMemoryHealthy(): boolean {
    const usage = this.getMemoryUsage();
    const totalMemory = os.totalmem();
    const usageRatio = usage.rss / totalMemory;
    
    return usageRatio < this.config.thresholds.warning;
  }
}