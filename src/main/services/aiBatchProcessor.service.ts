/**
 * AI Batch Processor Service
 * 
 * Implements intelligent batching for OpenAI API calls to:
 * - Reduce API costs through request consolidation
 * - Improve throughput with parallel processing
 * - Implement rate limiting and retry logic
 * - Support progress tracking and cancellation
 */

import { EventEmitter } from 'events';
import { logger } from './logger.service';
import { AICacheService } from './aiCacheService.service';
import { OpenAIProductExtractor } from '@shared/services/openai-extractor';
import { CompetitorProduct, OurProduct, MatchResult } from '@shared/types/matching.types';

export interface BatchJob {
  id: string;
  competitors: CompetitorProduct[];
  ourProducts: OurProduct[];
  priority: 'low' | 'normal' | 'high';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    cached: number;
    failed: number;
  };
  results: MatchResult[];
  errors: Array<{ competitor: CompetitorProduct; error: string }>;
}

export interface BatchConfig {
  maxBatchSize: number;          // Products per batch
  maxConcurrentBatches: number;  // Parallel batches
  rateLimitRpm: number;          // Requests per minute
  retryAttempts: number;         // Retry failed requests
  retryDelayMs: number;          // Delay between retries
  timeoutMs: number;             // Request timeout
}

export interface BatchStats {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalProductsProcessed: number;
  cacheHitRate: number;
  averageProcessingTime: number;
  requestsPerMinute: number;
  estimatedCostSaved: number;
}

export class AIBatchProcessor extends EventEmitter {
  private jobs: Map<string, BatchJob> = new Map();
  private processingQueue: string[] = [];
  private activeJobs: Set<string> = new Set();
  private cacheService: AICacheService;
  private openaiExtractor?: OpenAIProductExtractor;
  private config: BatchConfig;
  private stats: BatchStats;
  private requestTimes: number[] = [];

  constructor(
    cacheService: AICacheService,
    openaiApiKey?: string,
    config: Partial<BatchConfig> = {}
  ) {
    super();
    
    this.cacheService = cacheService;
    this.config = {
      maxBatchSize: 10,              // 10 products per AI call
      maxConcurrentBatches: 3,       // 3 parallel batches
      rateLimitRpm: 50,              // 50 requests per minute
      retryAttempts: 3,              // 3 retry attempts
      retryDelayMs: 1000,            // 1 second delay
      timeoutMs: 30000,              // 30 second timeout
      ...config
    };

    if (openaiApiKey) {
      this.openaiExtractor = new OpenAIProductExtractor(openaiApiKey);
    }

    this.stats = {
      totalJobs: 0,
      activeJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      totalProductsProcessed: 0,
      cacheHitRate: 0,
      averageProcessingTime: 0,
      requestsPerMinute: 0,
      estimatedCostSaved: 0
    };

    // Start processing queue
    this.startQueueProcessor();
  }

  /**
   * Submit a batch job for processing
   */
  async submitBatch(
    competitors: CompetitorProduct[],
    ourProducts: OurProduct[],
    priority: BatchJob['priority'] = 'normal'
  ): Promise<string> {
    const jobId = this.generateJobId();
    
    const job: BatchJob = {
      id: jobId,
      competitors,
      ourProducts,
      priority,
      createdAt: new Date(),
      status: 'pending',
      progress: {
        total: competitors.length,
        completed: 0,
        cached: 0,
        failed: 0
      },
      results: [],
      errors: []
    };

    this.jobs.set(jobId, job);
    this.addToQueue(jobId, priority);
    this.stats.totalJobs++;

    logger.info('batch-processor', 'Batch job submitted', {
      jobId,
      competitorCount: competitors.length,
      priority,
      queuePosition: this.processingQueue.length
    });

    this.emit('jobSubmitted', { jobId, job });
    return jobId;
  }

  /**
   * Get job status and progress
   */
  getJob(jobId: string): BatchJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Cancel a pending or processing job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status === 'pending') {
      // Remove from queue
      const queueIndex = this.processingQueue.indexOf(jobId);
      if (queueIndex > -1) {
        this.processingQueue.splice(queueIndex, 1);
      }
      job.status = 'cancelled';
      job.completedAt = new Date();
      
      logger.info('batch-processor', 'Job cancelled (pending)', { jobId });
      this.emit('jobCancelled', { jobId, job });
      return true;
    }

    if (job.status === 'processing') {
      // Mark for cancellation - will be handled by processing loop
      job.status = 'cancelled';
      logger.info('batch-processor', 'Job marked for cancellation', { jobId });
      this.emit('jobCancelled', { jobId, job });
      return true;
    }

    return false;
  }

  /**
   * Get current processing statistics
   */
  getStats(): BatchStats {
    // Update real-time stats
    this.stats.activeJobs = this.activeJobs.size;
    this.stats.requestsPerMinute = this.calculateRequestsPerMinute();
    this.stats.averageProcessingTime = this.calculateAverageProcessingTime();
    
    return { ...this.stats };
  }

  /**
   * Get all jobs with optional filtering
   */
  getAllJobs(status?: BatchJob['status']): BatchJob[] {
    const jobs = Array.from(this.jobs.values());
    return status ? jobs.filter(job => job.status === status) : jobs;
  }

  /**
   * Clear completed and failed jobs older than specified hours
   */
  async cleanupOldJobs(olderThanHours: number = 24): Promise<number> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - olderThanHours);

    let removedCount = 0;
    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') &&
        job.completedAt &&
        job.completedAt < cutoffTime
      ) {
        this.jobs.delete(jobId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.info('batch-processor', 'Old jobs cleaned up', { removedCount });
    }

    return removedCount;
  }

  // Private implementation methods

  private generateJobId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToQueue(jobId: string, priority: BatchJob['priority']): void {
    // Insert based on priority (high -> normal -> low)
    if (priority === 'high') {
      // Find the last high priority job and insert after it
      let insertIndex = 0;
      for (let i = 0; i < this.processingQueue.length; i++) {
        const queuedJob = this.jobs.get(this.processingQueue[i]);
        if (queuedJob?.priority !== 'high') break;
        insertIndex = i + 1;
      }
      this.processingQueue.splice(insertIndex, 0, jobId);
    } else if (priority === 'normal') {
      // Find the last normal or high priority job and insert after it
      let insertIndex = 0;
      for (let i = 0; i < this.processingQueue.length; i++) {
        const queuedJob = this.jobs.get(this.processingQueue[i]);
        if (queuedJob?.priority === 'low') break;
        insertIndex = i + 1;
      }
      this.processingQueue.splice(insertIndex, 0, jobId);
    } else {
      // Low priority goes to the end
      this.processingQueue.push(jobId);
    }
  }

  private startQueueProcessor(): void {
    setInterval(async () => {
      await this.processQueue();
    }, 1000); // Check queue every second
  }

  private async processQueue(): Promise<void> {
    // Don't exceed concurrent batch limit
    if (this.activeJobs.size >= this.config.maxConcurrentBatches) {
      return;
    }

    // Get next job from queue
    const jobId = this.processingQueue.shift();
    if (!jobId) return;

    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'pending') return;

    // Start processing
    this.activeJobs.add(jobId);
    job.status = 'processing';
    job.startedAt = new Date();

    this.emit('jobStarted', { jobId, job });

    try {
      await this.processJob(job);
    } catch (error) {
      logger.error('batch-processor', 'Job processing failed', error as Error, { jobId });
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  private async processJob(job: BatchJob): Promise<void> {
    const startTime = Date.now();

    try {
      // Process competitors in batches
      const batches = this.createBatches(job.competitors);
      
      for (const batch of batches) {
        // Check for cancellation
        if (job.status === 'cancelled') {
          job.completedAt = new Date();
          this.emit('jobCancelled', { jobId: job.id, job });
          return;
        }

        await this.processBatch(job, batch);
        
        // Emit progress update
        this.emit('jobProgress', { 
          jobId: job.id, 
          progress: job.progress,
          estimatedTimeRemaining: this.estimateTimeRemaining(job, startTime)
        });

        // Rate limiting delay
        await this.rateLimitDelay();
      }

      // Job completed successfully
      job.status = 'completed';
      job.completedAt = new Date();
      this.stats.completedJobs++;
      this.stats.totalProductsProcessed += job.competitors.length;

      const processingTime = Date.now() - startTime;
      this.recordProcessingTime(processingTime);

      logger.info('batch-processor', 'Job completed', {
        jobId: job.id,
        totalProducts: job.competitors.length,
        cached: job.progress.cached,
        processed: job.progress.completed - job.progress.cached,
        failed: job.progress.failed,
        processingTime
      });

      this.emit('jobCompleted', { jobId: job.id, job });

    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      this.stats.failedJobs++;

      logger.error('batch-processor', 'Job failed', error as Error, { jobId: job.id });
      this.emit('jobFailed', { jobId: job.id, job, error });
    }
  }

  private createBatches(competitors: CompetitorProduct[]): CompetitorProduct[][] {
    const batches: CompetitorProduct[][] = [];
    
    for (let i = 0; i < competitors.length; i += this.config.maxBatchSize) {
      batches.push(competitors.slice(i, i + this.config.maxBatchSize));
    }
    
    return batches;
  }

  private async processBatch(job: BatchJob, batch: CompetitorProduct[]): Promise<void> {
    // First, check cache for all items in batch
    const cacheResults: Array<{ competitor: CompetitorProduct; cached?: any }> = [];
    const uncachedCompetitors: CompetitorProduct[] = [];

    for (const competitor of batch) {
      const cacheKey = this.cacheService.generateCacheKey(competitor, job.ourProducts);
      const cached = await this.cacheService.getCachedResponse(cacheKey);
      
      if (cached) {
        cacheResults.push({ competitor, cached });
        job.progress.cached++;
        job.progress.completed++;
      } else {
        uncachedCompetitors.push(competitor);
      }
    }

    // Process uncached items with AI
    if (uncachedCompetitors.length > 0 && this.openaiExtractor) {
      try {
        const batchResult = await this.processWithAI(uncachedCompetitors, job.ourProducts);
        
        // Cache and store results
        for (let i = 0; i < uncachedCompetitors.length; i++) {
          const competitor = uncachedCompetitors[i];
          const result = batchResult[i];
          
          if (result) {
            // Cache the result
            const cacheKey = this.cacheService.generateCacheKey(competitor, job.ourProducts);
            await this.cacheService.setCachedResponse(cacheKey, competitor, result);
            
            job.results.push(result);
            job.progress.completed++;
          } else {
            job.errors.push({ competitor, error: 'AI processing failed' });
            job.progress.failed++;
          }
        }
      } catch (error) {
        // Handle batch failure
        for (const competitor of uncachedCompetitors) {
          job.errors.push({ competitor, error: (error as Error).message });
          job.progress.failed++;
        }
      }
    }

    // Add cached results to job results
    for (const { competitor, cached } of cacheResults) {
      if (cached) {
        job.results.push({
          competitor,
          ourSku: cached.our_sku || '',
          ourProduct: {} as any, // Would need to fetch from database
          confidence: cached.confidence,
          matchMethod: cached.match_method as any,
          reasoning: Array.isArray(cached.reasoning) ? cached.reasoning : JSON.parse(cached.reasoning || '[]')
        });
      }
    }
  }

  private async processWithAI(
    competitors: CompetitorProduct[],
    ourProducts: OurProduct[]
  ): Promise<Array<MatchResult | null>> {
    if (!this.openaiExtractor) {
      throw new Error('OpenAI extractor not configured');
    }

    // Create a consolidated prompt for batch processing
    const batchPrompt = this.createBatchPrompt(competitors, ourProducts);
    
    try {
      const response = await this.openaiExtractor.extractProducts(batchPrompt);
      return this.parseBatchResponse(response, competitors);
    } catch (error) {
      logger.error('batch-processor', 'AI batch processing failed', error as Error);
      throw error;
    }
  }

  private createBatchPrompt(competitors: CompetitorProduct[], ourProducts: OurProduct[]): string {
    let prompt = `Process the following ${competitors.length} competitor products and match them to our catalog:\n\n`;
    
    prompt += `COMPETITOR PRODUCTS:\n`;
    competitors.forEach((comp, i) => {
      prompt += `${i + 1}. SKU: ${comp.sku}, Company: ${comp.company}, Model: ${comp.model || 'N/A'}\n`;
      if (comp.specifications) {
        prompt += `   Specs: ${JSON.stringify(comp.specifications)}\n`;
      }
    });

    prompt += `\nOUR CATALOG (Top ${Math.min(ourProducts.length, 20)} products):\n`;
    ourProducts.slice(0, 20).forEach((prod, i) => {
      prompt += `${i + 1}. SKU: ${prod.sku}, Model: ${prod.model}, Brand: ${prod.brand}\n`;
      prompt += `   Type: ${prod.type}, Tonnage: ${prod.tonnage || 'N/A'}, SEER: ${prod.seer || 'N/A'}\n`;
    });

    prompt += `\nReturn a JSON array with ${competitors.length} objects, one for each competitor product, with match results.`;
    
    return prompt;
  }

  private parseBatchResponse(response: any, competitors: CompetitorProduct[]): Array<MatchResult | null> {
    try {
      // This would parse the AI response and create MatchResult objects
      // Implementation depends on the specific response format from OpenAI
      const results: Array<MatchResult | null> = [];
      
      // Placeholder implementation
      for (let i = 0; i < competitors.length; i++) {
        results.push(null); // Would contain parsed match result
      }
      
      return results;
    } catch (error) {
      logger.error('batch-processor', 'Failed to parse batch response', error as Error);
      return competitors.map(() => null);
    }
  }

  private async rateLimitDelay(): Promise<void> {
    const delayMs = (60 * 1000) / this.config.rateLimitRpm; // Convert RPM to delay
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  private estimateTimeRemaining(job: BatchJob, startTime: number): number {
    const elapsed = Date.now() - startTime;
    const progress = job.progress.completed / job.progress.total;
    
    if (progress === 0) return 0;
    
    return Math.round((elapsed / progress) - elapsed);
  }

  private recordProcessingTime(timeMs: number): void {
    this.requestTimes.push(timeMs);
    
    // Keep only last 100 times for average calculation
    if (this.requestTimes.length > 100) {
      this.requestTimes.shift();
    }
  }

  private calculateRequestsPerMinute(): number {
    // This would track actual request times
    return this.requestTimes.length > 0 ? 60000 / (this.stats.averageProcessingTime || 1000) : 0;
  }

  private calculateAverageProcessingTime(): number {
    if (this.requestTimes.length === 0) return 0;
    return this.requestTimes.reduce((sum, time) => sum + time, 0) / this.requestTimes.length;
  }
}