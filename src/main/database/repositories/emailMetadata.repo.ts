import { Database } from 'sqlite3';
import { UnifiedEmailProcessingResult } from '../../services/unifiedEmailProcessor.service';
import { ExtractedData } from '@shared/types/product.types';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';

export interface EmailMetadataRecord {
  id?: number;
  file_path: string;
  file_name: string;
  file_hash: string;
  file_size: number;
  processing_method: string;
  processed_at: string;
  processing_time_ms: number;
  total_components: number;
  text_components: number;
  image_components: number;
  attachment_components: number;
  embedded_images: number;
  total_data_extracted: number;
  unique_items_extracted: number;
  average_confidence: number;
  source_breakdown_text_only: number;
  source_breakdown_image_only: number;
  source_breakdown_attachment_only: number;
  source_breakdown_multiple: number;
  cache_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailExtractedDataRecord {
  id?: number;
  email_metadata_id: number;
  sku: string;
  company: string;
  price?: number;
  model?: string;
  description?: string;
  source: string;
  confidence: number;
  extraction_method?: string;
  processing_notes?: string;
  tonnage?: number;
  seer?: number;
  seer2?: number;
  afue?: number;
  hspf?: number;
  refrigerant?: string;
  stage?: string;
  product_type?: string;
  sources?: string; // JSON array
  correlation_support_count: number;
  correlation_notes?: string;
  multi_source_confidence: boolean;
  orphaned: boolean;
  created_at: string;
}

export interface EmailProcessingStatsRecord {
  id?: number;
  date: string;
  total_emails_processed: number;
  total_processing_time_ms: number;
  average_processing_time_ms: number;
  cache_hits: number;
  cache_misses: number;
  cache_hit_rate: number;
  total_data_extracted: number;
  average_confidence: number;
  msg_processed: number;
  eml_processed: number;
  fallback_processed: number;
  total_text_components: number;
  total_image_components: number;
  total_attachment_components: number;
  text_only_items: number;
  image_only_items: number;
  attachment_only_items: number;
  multiple_source_items: number;
  created_at: string;
}

export class EmailMetadataRepository {
  constructor(private db: Database) {}

  /**
   * Store email processing result in database
   */
  async storeEmailProcessingResult(
    filePath: string,
    result: UnifiedEmailProcessingResult
  ): Promise<number> {
    return new Promise(async (resolve, reject) => {
      try {
        // Calculate file hash and size
        const fileBuffer = await fs.readFile(filePath);
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        const stats = await fs.stat(filePath);

        const metadata: Omit<EmailMetadataRecord, 'id' | 'created_at' | 'updated_at'> = {
          file_path: filePath,
          file_name: require('path').basename(filePath),
          file_hash: fileHash,
          file_size: stats.size,
          processing_method: result.originalEmail.processingMethod,
          processed_at: new Date().toISOString(),
          processing_time_ms: result.processingMetadata.totalProcessingTime,
          total_components: result.processingMetadata.componentsProcessed.textComponents +
                           result.processingMetadata.componentsProcessed.imageComponents +
                           result.processingMetadata.componentsProcessed.attachmentComponents,
          text_components: result.processingMetadata.componentsProcessed.textComponents,
          image_components: result.processingMetadata.componentsProcessed.imageComponents,
          attachment_components: result.processingMetadata.componentsProcessed.attachmentComponents,
          embedded_images: result.processingMetadata.componentsProcessed.embeddedImages,
          total_data_extracted: result.processingMetadata.dataExtractionStats.totalItemsExtracted,
          unique_items_extracted: result.processingMetadata.dataExtractionStats.uniqueItemsAfterDeduplication,
          average_confidence: result.processingMetadata.dataExtractionStats.averageConfidence,
          source_breakdown_text_only: result.processingMetadata.sourceBreakdown.textOnly,
          source_breakdown_image_only: result.processingMetadata.sourceBreakdown.imageOnly,
          source_breakdown_attachment_only: result.processingMetadata.sourceBreakdown.attachmentOnly,
          source_breakdown_multiple: result.processingMetadata.sourceBreakdown.multipleSources,
          cache_enabled: true
        };

        const placeholders = Object.keys(metadata).map(() => '?').join(',');
        const columns = Object.keys(metadata).join(',');
        const values = Object.values(metadata);

        const self = this;
        self.db.run(
          `INSERT OR REPLACE INTO email_metadata (${columns}) VALUES (${placeholders})`,
          values,
          function(this: { lastID: number }, err: Error | null) {
            if (err) {
              reject(err);
              return;
            }

            const emailMetadataId = this.lastID;
            
            // Store extracted data
            const storeDataPromises = result.finalResults.map(data => 
              new Promise<void>((resolveData, rejectData) => {
                const extractedDataRecord: Omit<EmailExtractedDataRecord, 'id' | 'created_at'> = {
                  email_metadata_id: emailMetadataId,
                  sku: data.sku,
                  company: data.company,
                  price: data.price,
                  model: data.model,
                  description: data.description,
                  source: data.source || 'Unknown',
                  confidence: data.confidence || 0,
                  extraction_method: data.extractionMethod,
                  processing_notes: data.processingNotes,
                  tonnage: data.tonnage,
                  seer: data.seer,
                  seer2: data.seer2,
                  afue: data.afue,
                  hspf: data.hspf,
                  refrigerant: data.refrigerant,
                  stage: data.stage,
                  product_type: data.type,
                  sources: JSON.stringify(data.sources || []),
                  correlation_support_count: data.correlationData?.supportingEvidence || 0,
                  correlation_notes: data.correlationData?.correlationNotes,
                  multi_source_confidence: data.correlationData?.multiSourceConfidence || false,
                  orphaned: data.correlationData?.orphaned || false
                };

                const dataColumns = Object.keys(extractedDataRecord).join(',');
                const dataPlaceholders = Object.keys(extractedDataRecord).map(() => '?').join(',');
                const dataValues = Object.values(extractedDataRecord);

                self.db.run(
                  `INSERT INTO email_extracted_data (${dataColumns}) VALUES (${dataPlaceholders})`,
                  dataValues,
                  (err: Error | null) => {
                    if (err) rejectData(err);
                    else resolveData();
                  }
                );
              })
            );

            Promise.all(storeDataPromises)
              .then(() => resolve(emailMetadataId))
              .catch(reject);
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get email processing history
   */
  async getProcessingHistory(limit: number = 50, offset: number = 0): Promise<EmailMetadataRecord[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM email_metadata 
         ORDER BY processed_at DESC 
         LIMIT ? OFFSET ?`,
        [limit, offset],
        (err: Error | null, rows: EmailMetadataRecord[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  /**
   * Get extracted data for specific email
   */
  async getExtractedDataForEmail(emailMetadataId: number): Promise<EmailExtractedDataRecord[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM email_extracted_data 
         WHERE email_metadata_id = ? 
         ORDER BY confidence DESC`,
        [emailMetadataId],
        (err: Error | null, rows: EmailExtractedDataRecord[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  /**
   * Check if email has been processed before
   */
  async hasBeenProcessed(filePath: string): Promise<EmailMetadataRecord | null> {
    return new Promise(async (resolve, reject) => {
      try {
        const fileBuffer = await fs.readFile(filePath);
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        this.db.get(
          `SELECT * FROM email_metadata 
           WHERE file_path = ? AND file_hash = ?`,
          [filePath, fileHash],
          (err: Error | null, row: EmailMetadataRecord) => {
            if (err) reject(err);
            else resolve(row || null);
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get processing statistics for date range
   */
  async getProcessingStats(
    startDate: string, 
    endDate: string
  ): Promise<EmailProcessingStatsRecord[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM email_processing_stats 
         WHERE date BETWEEN ? AND ? 
         ORDER BY date DESC`,
        [startDate, endDate],
        (err: Error | null, rows: EmailProcessingStatsRecord[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  /**
   * Get email processing summary view
   */
  async getProcessingSummary(days: number = 30): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      this.db.all(
        `SELECT * FROM email_processing_summary
         WHERE processing_date >= ?
         ORDER BY processing_date DESC`,
        [startDate.toISOString().split('T')[0]],
        (err: Error | null, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  /**
   * Get top performing emails
   */
  async getTopPerformingEmails(limit: number = 20): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM top_performing_emails LIMIT ?`,
        [limit],
        (err: Error | null, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  /**
   * Store processing error
   */
  async storeProcessingError(
    filePath: string,
    errorType: string,
    errorMessage: string,
    processingStage: string,
    errorStack?: string,
    retryAttempt: number = 0
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO email_processing_errors 
         (file_path, file_name, error_type, error_message, error_stack, processing_stage, retry_attempt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          filePath,
          require('path').basename(filePath),
          errorType,
          errorMessage,
          errorStack,
          processingStage,
          retryAttempt
        ],
        (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * Update cache statistics
   */
  async updateCacheStats(hits: number, misses: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const today = new Date().toISOString().split('T')[0];
      
      this.db.run(
        `INSERT OR REPLACE INTO email_processing_stats 
         (date, cache_hits, cache_misses, cache_hit_rate)
         VALUES (?, 
           COALESCE((SELECT cache_hits FROM email_processing_stats WHERE date = ?), 0) + ?,
           COALESCE((SELECT cache_misses FROM email_processing_stats WHERE date = ?), 0) + ?,
           CASE WHEN (COALESCE((SELECT cache_hits FROM email_processing_stats WHERE date = ?), 0) + ? + 
                     COALESCE((SELECT cache_misses FROM email_processing_stats WHERE date = ?), 0) + ?) > 0
                THEN CAST((COALESCE((SELECT cache_hits FROM email_processing_stats WHERE date = ?), 0) + ?) AS REAL) / 
                     (COALESCE((SELECT cache_hits FROM email_processing_stats WHERE date = ?), 0) + ? + 
                      COALESCE((SELECT cache_misses FROM email_processing_stats WHERE date = ?), 0) + ?)
                ELSE 0 END)`,
        [today, today, hits, today, misses, today, hits, today, misses, today, hits, today, hits, today, misses],
        (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * Clean up old processing records
   */
  async cleanupOldRecords(olderThanDays: number = 90): Promise<number> {
    return new Promise((resolve, reject) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      const cutoffString = cutoffDate.toISOString();

      this.db.run(
        `DELETE FROM email_metadata WHERE processed_at < ?`,
        [cutoffString],
        function(this: { changes: number }, err: Error | null) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  /**
   * Get comprehensive analytics
   */
  async getAnalytics(): Promise<{
    totalEmailsProcessed: number;
    totalProcessingTime: number;
    averageProcessingTime: number;
    totalDataExtracted: number;
    averageConfidence: number;
    cacheHitRate: number;
    topErrorTypes: Array<{ error_type: string; count: number; last_occurrence: string }>;
    methodBreakdown: Array<{ method: string; count: number; percentage: number }>;
    recentActivity: EmailMetadataRecord[];
  }> {
    return new Promise((resolve, reject) => {
      // Get basic stats
      this.db.get(
        `SELECT 
           COUNT(*) as totalEmailsProcessed,
           SUM(processing_time_ms) as totalProcessingTime,
           AVG(processing_time_ms) as averageProcessingTime,
           SUM(total_data_extracted) as totalDataExtracted,
           AVG(average_confidence) as averageConfidence
         FROM email_metadata`,
        [],
        (err: Error | null, basicStats: any) => {
          if (err) {
            reject(err);
            return;
          }

          // Get cache stats
          this.db.get(
            `SELECT 
               SUM(cache_hits) as totalHits,
               SUM(cache_misses) as totalMisses
             FROM email_processing_stats`,
            [],
            (err: Error | null, cacheStats: any) => {
              if (err) {
                reject(err);
                return;
              }

              const cacheHitRate = (cacheStats.totalHits + cacheStats.totalMisses) > 0 
                ? cacheStats.totalHits / (cacheStats.totalHits + cacheStats.totalMisses)
                : 0;

              // Get additional analytics in parallel
              Promise.all([
                this.getTopErrors(),
                this.getMethodBreakdown(),
                this.getProcessingHistory(10, 0)
              ]).then(([topErrorTypes, methodBreakdown, recentActivity]) => {
                resolve({
                  totalEmailsProcessed: basicStats.totalEmailsProcessed || 0,
                  totalProcessingTime: basicStats.totalProcessingTime || 0,
                  averageProcessingTime: basicStats.averageProcessingTime || 0,
                  totalDataExtracted: basicStats.totalDataExtracted || 0,
                  averageConfidence: basicStats.averageConfidence || 0,
                  cacheHitRate,
                  topErrorTypes,
                  methodBreakdown,
                  recentActivity
                });
              }).catch(reject);
            }
          );
        }
      );
    });
  }

  private async getTopErrors(): Promise<Array<{ error_type: string; count: number; last_occurrence: string }>> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT error_type, COUNT(*) as count, MAX(occurred_at) as last_occurrence
         FROM email_processing_errors
         GROUP BY error_type
         ORDER BY count DESC
         LIMIT 5`,
        [],
        (err: Error | null, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  private async getMethodBreakdown(): Promise<Array<{ method: string; count: number; percentage: number }>> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT 
           processing_method as method,
           COUNT(*) as count,
           ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM email_metadata), 2) as percentage
         FROM email_metadata
         GROUP BY processing_method
         ORDER BY count DESC`,
        [],
        (err: Error | null, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }
}