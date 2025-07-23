/**
 * Type definitions for file processing services
 */

import type { ExtractedData, EmailProcessingSummary } from '@shared/types/product.types';

export type { ExtractedData, EmailProcessingSummary };

export interface ProcessingResult {
  success: boolean;
  data: ExtractedData[];
  fileName: string;
  fileType: string;
  processingTime: number;
  error?: string;
  warnings?: string[];
  openaiResults?: any; // OpenAI enhanced results
  extractionMethod?: 'traditional' | 'openai' | 'hybrid' | 'unified_email';
}