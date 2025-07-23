import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { UnifiedEmailProcessor, UnifiedEmailProcessingResult } from './unifiedEmailProcessor.service';
import { ExtractedData } from '@shared/types/product.types';

export interface BatchProcessingJob {
  id: string;
  emailPaths: string[];
  options: BatchProcessingOptions;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    processed: number;
    total: number;
    currentFile?: string;
    startTime?: Date;
    estimatedCompletion?: Date;
  };
  results: BatchProcessingResult[];
  errors: BatchProcessingError[];
  metadata: {
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    totalProcessingTime?: number;
  };
}

export interface BatchProcessingOptions {
  concurrency: number;
  timeout: number;
  retryAttempts: number;
  skipOnError: boolean;
  outputFormat: 'full' | 'extracted-only' | 'summary';
  enableCache: boolean;
  memoryLimit: number; // MB
}

export interface BatchProcessingResult {
  filePath: string;
  fileName: string;
  success: boolean;
  processingTime: number;
  dataExtracted: number;
  confidence: number;
  extractedData?: ExtractedData[];
  fullResult?: UnifiedEmailProcessingResult;
  summary?: string;
  error?: string;
}

export interface BatchProcessingError {
  filePath: string;
  fileName: string;
  error: string;
  timestamp: Date;
  retryAttempt: number;
}

export interface BatchQueueStats {
  totalJobs: number;
  runningJobs: number;
  queuedJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  totalItemsProcessed: number;
}

export class EmailBatchProcessor extends EventEmitter {
  private processor: UnifiedEmailProcessor;
  private jobQueue: Map<string, BatchProcessingJob> = new Map();
  private activeJobs: Set<string> = new Set();
  private maxConcurrentJobs: number;
  private processingStats = {
    totalJobsProcessed: 0,
    totalProcessingTime: 0,
    totalItemsExtracted: 0
  };

  constructor(maxConcurrentJobs: number = 3, cacheConfig?: any) {
    super();
    this.processor = new UnifiedEmailProcessor(cacheConfig);
    this.maxConcurrentJobs = maxConcurrentJobs;
  }

  /**
   * Add a batch processing job to the queue
   */
  async addBatchJob(
    emailPaths: string[], 
    options?: Partial<BatchProcessingOptions>
  ): Promise<string> {
    const jobId = this.generateJobId();
    const fullOptions: BatchProcessingOptions = {
      concurrency: 2,
      timeout: 300000, // 5 minutes per email
      retryAttempts: 2,
      skipOnError: true,
      outputFormat: 'extracted-only',
      enableCache: true,
      memoryLimit: 512, // 512MB
      ...options
    };

    // Validate email paths
    const validPaths = await this.validateEmailPaths(emailPaths);
    
    const job: BatchProcessingJob = {
      id: jobId,
      emailPaths: validPaths,
      options: fullOptions,
      status: 'pending',
      progress: {
        processed: 0,
        total: validPaths.length
      },
      results: [],
      errors: [],
      metadata: {
        createdAt: new Date()
      }
    };

    this.jobQueue.set(jobId, job);
    
    this.emit('job-queued', { jobId, totalFiles: validPaths.length });
    
    // Start processing if we have capacity
    this.processNextJob();
    
    return jobId;
  }

  /**
   * Start processing the next job in queue
   */
  private async processNextJob(): Promise<void> {
    if (this.activeJobs.size >= this.maxConcurrentJobs) {
      return; // At capacity
    }

    // Find next pending job
    const pendingJob = Array.from(this.jobQueue.values())
      .find(job => job.status === 'pending');

    if (!pendingJob) {
      return; // No jobs to process
    }

    this.activeJobs.add(pendingJob.id);
    pendingJob.status = 'running';
    pendingJob.metadata.startedAt = new Date();
    pendingJob.progress.startTime = new Date();

    this.emit('job-started', { jobId: pendingJob.id });

    try {
      await this.processBatchJob(pendingJob);
      
      pendingJob.status = 'completed';
      pendingJob.metadata.completedAt = new Date();
      pendingJob.metadata.totalProcessingTime = 
        pendingJob.metadata.completedAt.getTime() - 
        (pendingJob.metadata.startedAt?.getTime() || 0);

      this.processingStats.totalJobsProcessed++;
      this.processingStats.totalProcessingTime += pendingJob.metadata.totalProcessingTime;
      
      this.emit('job-completed', { 
        jobId: pendingJob.id, 
        results: pendingJob.results.length,
        errors: pendingJob.errors.length 
      });

    } catch (error) {
      pendingJob.status = 'failed';
      pendingJob.metadata.completedAt = new Date();
      
      this.emit('job-failed', { 
        jobId: pendingJob.id, 
        error: error instanceof Error ? error.message : String(error) 
      });

    } finally {
      this.activeJobs.delete(pendingJob.id);
      
      // Process next job if available
      setImmediate(() => this.processNextJob());
    }
  }

  /**
   * Process a single batch job
   */
  private async processBatchJob(job: BatchProcessingJob): Promise<void> {
    const { emailPaths, options } = job;
    const semaphore = new Semaphore(options.concurrency);

    // Process emails with controlled concurrency
    const processingPromises = emailPaths.map(async (emailPath) => {
      await semaphore.acquire();
      
      try {
        const result = await this.processEmailWithTimeout(emailPath, options);
        job.results.push(result);
        
        job.progress.processed++;
        job.progress.currentFile = path.basename(emailPath);
        
        // Update ETA
        const elapsed = Date.now() - (job.progress.startTime?.getTime() || Date.now());
        const rate = job.progress.processed / elapsed;
        const remaining = job.progress.total - job.progress.processed;
        job.progress.estimatedCompletion = new Date(Date.now() + (remaining / rate));

        this.emit('job-progress', {
          jobId: job.id,
          progress: job.progress.processed / job.progress.total,
          currentFile: job.progress.currentFile,
          eta: job.progress.estimatedCompletion
        });

        // Memory management check
        if (process.memoryUsage().heapUsed > options.memoryLimit * 1024 * 1024) {
          console.warn('Memory limit approaching, triggering garbage collection');
          if (global.gc) {
            global.gc();
          }
        }

      } catch (error) {
        const batchError: BatchProcessingError = {
          filePath: emailPath,
          fileName: path.basename(emailPath),
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
          retryAttempt: 0
        };

        job.errors.push(batchError);
        
        if (!options.skipOnError) {
          throw error;
        }

        this.emit('file-error', { jobId: job.id, filePath: emailPath, error: batchError.error });

      } finally {
        semaphore.release();
      }
    });

    await Promise.all(processingPromises);
  }

  /**
   * Process single email with timeout and retry logic
   */
  private async processEmailWithTimeout(
    emailPath: string, 
    options: BatchProcessingOptions
  ): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= options.retryAttempts; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Processing timeout')), options.timeout);
        });

        const processingPromise = options.enableCache 
          ? this.processor.processEmail(emailPath)
          : this.processor.processEmail(emailPath, true);

        const result = await Promise.race([processingPromise, timeoutPromise]);
        const processingTime = Date.now() - startTime;

        // Format result based on output format
        const batchResult: BatchProcessingResult = {
          filePath: emailPath,
          fileName: path.basename(emailPath),
          success: true,
          processingTime,
          dataExtracted: result.finalResults.length,
          confidence: result.processingMetadata.dataExtractionStats.averageConfidence
        };

        switch (options.outputFormat) {
          case 'full':
            batchResult.fullResult = result;
            break;
          case 'extracted-only':
            batchResult.extractedData = result.finalResults;
            break;
          case 'summary':
            batchResult.summary = this.processor.getProcessingSummary(result);
            break;
        }

        this.processingStats.totalItemsExtracted += result.finalResults.length;
        return batchResult;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < options.retryAttempts) {
          console.warn(`Retry ${attempt + 1}/${options.retryAttempts} for ${emailPath}: ${lastError.message}`);
          await this.delay(1000 * (attempt + 1)); // Exponential backoff
        }
      }
    }

    // All retries failed
    const processingTime = Date.now() - startTime;
    return {
      filePath: emailPath,
      fileName: path.basename(emailPath),
      success: false,
      processingTime,
      dataExtracted: 0,
      confidence: 0,
      error: lastError?.message || 'Unknown error'
    };
  }

  /**
   * Get job status and progress
   */
  getJobStatus(jobId: string): BatchProcessingJob | null {
    return this.jobQueue.get(jobId) || null;
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobQueue.get(jobId);
    if (!job) return false;

    if (job.status === 'running') {
      job.status = 'cancelled';
      this.emit('job-cancelled', { jobId });
      return true;
    } else if (job.status === 'pending') {
      job.status = 'cancelled';
      this.jobQueue.delete(jobId);
      this.emit('job-cancelled', { jobId });
      return true;
    }

    return false;
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): BatchQueueStats {
    const jobs = Array.from(this.jobQueue.values());
    
    return {
      totalJobs: jobs.length,
      runningJobs: jobs.filter(j => j.status === 'running').length,
      queuedJobs: jobs.filter(j => j.status === 'pending').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      averageProcessingTime: this.processingStats.totalJobsProcessed > 0 
        ? this.processingStats.totalProcessingTime / this.processingStats.totalJobsProcessed 
        : 0,
      totalItemsProcessed: this.processingStats.totalItemsExtracted
    };
  }

  /**
   * Export job results
   */
  async exportJobResults(jobId: string, format: 'json' | 'csv' = 'json'): Promise<string | null> {
    const job = this.jobQueue.get(jobId);
    if (!job || job.status !== 'completed') return null;

    switch (format) {
      case 'json':
        return JSON.stringify({
          jobId,
          metadata: job.metadata,
          results: job.results,
          errors: job.errors,
          stats: {
            totalProcessed: job.results.length,
            successRate: job.results.filter(r => r.success).length / job.results.length,
            totalDataExtracted: job.results.reduce((sum, r) => sum + r.dataExtracted, 0),
            averageConfidence: job.results
              .filter(r => r.success)
              .reduce((sum, r) => sum + r.confidence, 0) / job.results.filter(r => r.success).length
          }
        }, null, 2);
        
      case 'csv':
        const headers = ['fileName', 'success', 'processingTime', 'dataExtracted', 'confidence', 'error'];
        const rows = [headers.join(',')];
        
        for (const result of job.results) {
          const row = [
            result.fileName,
            result.success.toString(),
            result.processingTime.toString(),
            result.dataExtracted.toString(),
            result.confidence.toFixed(3),
            result.error || ''
          ];
          rows.push(row.join(','));
        }
        
        return rows.join('\n');
        
      default:
        return null;
    }
  }

  /**
   * Clean up completed jobs older than specified days
   */
  async cleanupOldJobs(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
    let cleaned = 0;

    for (const [jobId, job] of this.jobQueue) {
      if (job.status === 'completed' && 
          job.metadata.completedAt && 
          job.metadata.completedAt < cutoffDate) {
        this.jobQueue.delete(jobId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.emit('jobs-cleaned', { count: cleaned });
    }

    return cleaned;
  }

  /**
   * Shutdown batch processor
   */
  async shutdown(): Promise<void> {
    // Cancel all pending jobs
    for (const [jobId, job] of this.jobQueue) {
      if (job.status === 'pending') {
        await this.cancelJob(jobId);
      }
    }

    // Wait for active jobs to complete (with timeout)
    const timeout = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.activeJobs.size > 0 && (Date.now() - startTime) < timeout) {
      await this.delay(1000);
    }

    await this.processor.shutdown();
    this.emit('shutdown-complete');
  }

  /**
   * Utility methods
   */
  private generateJobId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async validateEmailPaths(paths: string[]): Promise<string[]> {
    const validPaths: string[] = [];
    
    for (const filePath of paths) {
      try {
        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          if (['.msg', '.eml'].includes(ext)) {
            validPaths.push(filePath);
          }
        }
      } catch (error) {
        console.warn(`Invalid email path: ${filePath}`);
      }
    }
    
    return validPaths;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Simple semaphore for controlling concurrency
 */
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      resolve();
    } else {
      this.permits++;
    }
  }
}