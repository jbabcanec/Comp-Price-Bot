import { DatabaseConnection } from '../connection';

export interface ProcessingHistoryRecord {
  id: number;
  fileName: string;
  fileHash: string;
  companyName: string;
  totalItems: number;
  matchedItems: number;
  unmatchedItems: number;
  averageConfidence: number;
  processingTimeMs: number;
  processedAt: string;
  exactMatches: number;
  fuzzyMatches: number;
  specMatches: number;
  aiMatches: number;
  reviewRequired: number;
  fileSize: number;
}

export interface AnalyticsData {
  totalProcessedFiles: number;
  totalProcessedItems: number;
  overallMatchRate: number;
  averageConfidence: number;
  averageProcessingTime: number;
  matchMethodBreakdown: {
    exact: number;
    fuzzy: number;
    specs: number;
    ai: number;
  };
  topCompanies: Array<{
    company: string;
    itemCount: number;
    matchRate: number;
  }>;
  recentActivity: ProcessingHistoryRecord[];
  confidenceDistribution: {
    excellent: number; // 95-100%
    good: number;      // 85-94%
    fair: number;      // 70-84%
    poor: number;      // 50-69%
    none: number;      // 0-49%
  };
}

export class HistoryRepository {
  constructor(private db: DatabaseConnection) {}

  async findByFileHash(fileHash: string): Promise<ProcessingHistoryRecord | null> {
    const sql = `
      SELECT 
        id, file_name as fileName, file_hash as fileHash, 
        company_name as companyName, total_items as totalItems,
        matched_items as matchedItems, unmatched_items as unmatchedItems,
        average_confidence as averageConfidence, processing_time_ms as processingTimeMs,
        exact_matches as exactMatches, fuzzy_matches as fuzzyMatches,
        spec_matches as specMatches, ai_matches as aiMatches,
        review_required as reviewRequired, file_size as fileSize,
        processed_at as processedAt
      FROM processing_history 
      WHERE file_hash = ?
      LIMIT 1
    `;

    const result = await this.db.get<ProcessingHistoryRecord>(sql, [fileHash]);
    return result || null;
  }

  async createHistoryRecord(record: Omit<ProcessingHistoryRecord, 'id' | 'processedAt'>): Promise<number> {
    const sql = `
      INSERT INTO processing_history (
        file_name, file_hash, company_name, total_items, matched_items, 
        unmatched_items, average_confidence, processing_time_ms,
        exact_matches, fuzzy_matches, spec_matches, ai_matches,
        review_required, file_size
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await this.db.run(sql, [
      record.fileName,
      record.fileHash,
      record.companyName,
      record.totalItems,
      record.matchedItems,
      record.unmatchedItems,
      record.averageConfidence,
      record.processingTimeMs,
      record.exactMatches,
      record.fuzzyMatches,
      record.specMatches,
      record.aiMatches,
      record.reviewRequired,
      record.fileSize
    ]);

    return result.lastID;
  }

  async getAllHistory(limit: number = 100, offset: number = 0): Promise<ProcessingHistoryRecord[]> {
    const sql = `
      SELECT 
        id, file_name as fileName, file_hash as fileHash, 
        company_name as companyName, total_items as totalItems,
        matched_items as matchedItems, unmatched_items as unmatchedItems,
        average_confidence as averageConfidence, processing_time_ms as processingTimeMs,
        exact_matches as exactMatches, fuzzy_matches as fuzzyMatches,
        spec_matches as specMatches, ai_matches as aiMatches,
        review_required as reviewRequired, file_size as fileSize,
        processed_at as processedAt
      FROM processing_history 
      ORDER BY processed_at DESC 
      LIMIT ? OFFSET ?
    `;

    return await this.db.all<ProcessingHistoryRecord>(sql, [limit, offset]);
  }

  async getHistoryByCompany(company: string): Promise<ProcessingHistoryRecord[]> {
    const sql = `
      SELECT 
        id, file_name as fileName, file_hash as fileHash, 
        company_name as companyName, total_items as totalItems,
        matched_items as matchedItems, unmatched_items as unmatchedItems,
        average_confidence as averageConfidence, processing_time_ms as processingTimeMs,
        exact_matches as exactMatches, fuzzy_matches as fuzzyMatches,
        spec_matches as specMatches, ai_matches as aiMatches,
        review_required as reviewRequired, file_size as fileSize,
        processed_at as processedAt
      FROM processing_history 
      WHERE company_name = ?
      ORDER BY processed_at DESC
    `;

    return await this.db.all<ProcessingHistoryRecord>(sql, [company]);
  }

  async getAnalytics(): Promise<AnalyticsData> {
    // Get overall statistics
    const overallStats = await this.db.get<{
      totalFiles: number;
      totalItems: number;
      totalMatched: number;
      avgConfidence: number;
      avgProcessingTime: number;
    }>(`
      SELECT 
        COUNT(*) as totalFiles,
        SUM(total_items) as totalItems,
        SUM(matched_items) as totalMatched,
        AVG(average_confidence) as avgConfidence,
        AVG(processing_time_ms) as avgProcessingTime
      FROM processing_history
    `);

    // Get match method breakdown
    const methodBreakdown = await this.db.get<{
      totalExact: number;
      totalFuzzy: number;
      totalSpecs: number;
      totalAi: number;
    }>(`
      SELECT 
        SUM(exact_matches) as totalExact,
        SUM(fuzzy_matches) as totalFuzzy,
        SUM(spec_matches) as totalSpecs,
        SUM(ai_matches) as totalAi
      FROM processing_history
    `);

    // Get top companies
    const topCompanies = await this.db.all<{
      company: string;
      itemCount: number;
      matchedCount: number;
    }>(`
      SELECT 
        company_name as company,
        SUM(total_items) as itemCount,
        SUM(matched_items) as matchedCount
      FROM processing_history 
      GROUP BY company_name 
      ORDER BY itemCount DESC 
      LIMIT 5
    `);

    // Get recent activity
    const recentActivity = await this.getAllHistory(10);

    // Get confidence distribution from crosswalk_mappings
    const confidenceStats = await this.db.get<{
      excellent: number;
      good: number;
      fair: number;
      poor: number;
      none: number;
    }>(`
      SELECT 
        SUM(CASE WHEN confidence >= 0.95 THEN 1 ELSE 0 END) as excellent,
        SUM(CASE WHEN confidence >= 0.85 AND confidence < 0.95 THEN 1 ELSE 0 END) as good,
        SUM(CASE WHEN confidence >= 0.70 AND confidence < 0.85 THEN 1 ELSE 0 END) as fair,
        SUM(CASE WHEN confidence >= 0.50 AND confidence < 0.70 THEN 1 ELSE 0 END) as poor,
        SUM(CASE WHEN confidence < 0.50 THEN 1 ELSE 0 END) as none
      FROM crosswalk_mappings
    `);

    return {
      totalProcessedFiles: overallStats?.totalFiles || 0,
      totalProcessedItems: overallStats?.totalItems || 0,
      overallMatchRate: overallStats?.totalItems ? 
        (overallStats.totalMatched / overallStats.totalItems) * 100 : 0,
      averageConfidence: overallStats?.avgConfidence || 0,
      averageProcessingTime: overallStats?.avgProcessingTime || 0,
      matchMethodBreakdown: {
        exact: methodBreakdown?.totalExact || 0,
        fuzzy: methodBreakdown?.totalFuzzy || 0,
        specs: methodBreakdown?.totalSpecs || 0,
        ai: methodBreakdown?.totalAi || 0
      },
      topCompanies: topCompanies.map(company => ({
        company: company.company,
        itemCount: company.itemCount,
        matchRate: company.itemCount ? (company.matchedCount / company.itemCount) * 100 : 0
      })),
      recentActivity,
      confidenceDistribution: {
        excellent: confidenceStats?.excellent || 0,
        good: confidenceStats?.good || 0,
        fair: confidenceStats?.fair || 0,
        poor: confidenceStats?.poor || 0,
        none: confidenceStats?.none || 0
      }
    };
  }

  async deleteHistoryRecord(id: number): Promise<void> {
    const sql = 'DELETE FROM processing_history WHERE id = ?';
    await this.db.run(sql, [id]);
  }

  async getHistoryStatsByDateRange(startDate: string, endDate: string): Promise<{
    totalFiles: number;
    totalItems: number;
    matchRate: number;
    avgConfidence: number;
  }> {
    const sql = `
      SELECT 
        COUNT(*) as totalFiles,
        SUM(total_items) as totalItems,
        AVG(CAST(matched_items AS REAL) / total_items * 100) as matchRate,
        AVG(average_confidence) as avgConfidence
      FROM processing_history 
      WHERE DATE(processed_at) BETWEEN ? AND ?
    `;

    const result = await this.db.get(sql, [startDate, endDate]);
    return {
      totalFiles: result?.totalFiles || 0,
      totalItems: result?.totalItems || 0,
      matchRate: result?.matchRate || 0,
      avgConfidence: result?.avgConfidence || 0
    };
  }

  async exportHistoryToCsv(): Promise<string> {
    const history = await this.getAllHistory(10000); // Get all records for export
    
    const headers = [
      'ID', 'File Name', 'Company', 'Total Items', 'Matched Items', 
      'Match Rate %', 'Average Confidence', 'Processing Time (ms)', 
      'Exact Matches', 'Fuzzy Matches', 'Spec Matches', 'AI Matches',
      'Review Required', 'File Size (bytes)', 'Processed At'
    ];

    const csvRows = history.map(record => [
      record.id,
      `"${record.fileName}"`,
      `"${record.companyName}"`,
      record.totalItems,
      record.matchedItems,
      record.totalItems ? ((record.matchedItems / record.totalItems) * 100).toFixed(1) : '0.0',
      (record.averageConfidence * 100).toFixed(1),
      record.processingTimeMs,
      record.exactMatches,
      record.fuzzyMatches,
      record.specMatches,
      record.aiMatches,
      record.reviewRequired,
      record.fileSize,
      `"${record.processedAt}"`
    ]);

    return [headers, ...csvRows].map(row => row.join(',')).join('\n');
  }

  /**
   * Purge all history records from the database
   */
  async purgeAll(): Promise<number> {
    const sql = 'DELETE FROM processing_history';
    const result = await this.db.run(sql, []);
    return result.changes;
  }

  /**
   * Delete history records by company
   */
  async deleteByCompany(company: string): Promise<number> {
    const sql = 'DELETE FROM processing_history WHERE company_name = ?';
    const result = await this.db.run(sql, [company]);
    return result.changes;
  }

  /**
   * Delete history records by multiple companies
   */
  async deleteByCompanies(companies: string[]): Promise<number> {
    if (companies.length === 0) return 0;
    
    const placeholders = companies.map(() => '?').join(',');
    const sql = `DELETE FROM processing_history WHERE company_name IN (${placeholders})`;
    const result = await this.db.run(sql, companies);
    return result.changes;
  }

  /**
   * Get all unique companies from history
   */
  async getCompanies(): Promise<string[]> {
    const sql = 'SELECT DISTINCT company_name FROM processing_history WHERE company_name IS NOT NULL ORDER BY company_name';
    const results = await this.db.all<{ company_name: string }>(sql, []);
    return results.map(r => r.company_name);
  }

  /**
   * Get history count by company
   */
  async getCountsByCompany(): Promise<{ company: string; count: number }[]> {
    const sql = 'SELECT company_name as company, COUNT(*) as count FROM processing_history WHERE company_name IS NOT NULL GROUP BY company_name ORDER BY company_name';
    return this.db.all<{ company: string; count: number }>(sql, []);
  }
}