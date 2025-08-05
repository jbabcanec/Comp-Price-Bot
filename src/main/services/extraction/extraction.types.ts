export interface ExtractedProduct {
  sku: string;
  brand: string;
  price?: number;
  description: string;
  specifications?: Record<string, any>;
  confidence: number;
  model?: string;
  category?: string;
  capacity?: {
    value: number;
    unit: string;
  };
  efficiency?: Array<{
    type: 'SEER' | 'AFUE' | 'HSPF';
    value: number;
  }>;
  refrigerant?: string;
}

export interface ExtractionResult {
  success: boolean;
  products: ExtractedProduct[];
  source: string;
  extractionMethod: 'ai' | 'traditional' | 'hybrid';
  processingTime: number;
  error?: string;
  metadata?: {
    fileName: string;
    fileType: string;
    totalItemsFound: number;
    averageConfidence: number;
  };
}

export interface ExtractionRequest {
  filePath: string;
  content?: string;
  options?: {
    useAI?: boolean;
    confidenceThreshold?: number;
    maxRetries?: number;
  };
}