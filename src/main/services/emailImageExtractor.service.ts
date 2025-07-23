import { EmailDeconstructionResult, EmbeddedImage } from './emailProcessor.service';
import { ExtractedData } from '@shared/types/product.types';
import { FileProcessorService } from './fileProcessor.service';
import { MemoryManager } from './memoryManager.service';
import { parse as parseHTML } from 'node-html-parser';
import sharp from 'sharp';

export interface ProcessedImage {
  source: 'embedded' | 'attachment' | 'html';
  filename: string;
  content: Buffer;
  contentType: string;
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
  processingNotes?: string;
}

export interface ImageProcessingResult {
  images: ProcessedImage[];
  ocrResults: ExtractedData[];
  processingStats: {
    totalImages: number;
    successfulOcr: number;
    failedOcr: number;
    totalDataExtracted: number;
    averageConfidence: number;
  };
}

export class EmailImageExtractor {
  private fileProcessor: FileProcessorService;
  private memoryManager: MemoryManager;

  constructor(memoryManager?: MemoryManager) {
    this.fileProcessor = new FileProcessorService();
    this.memoryManager = memoryManager || new MemoryManager();
  }

  /**
   * Main entry point - extract and process all images from email
   */
  async extractAndProcessAllImages(email: EmailDeconstructionResult): Promise<ImageProcessingResult> {
    // Extract all images from different sources
    const allImages = await this.extractAllImages(email);
    
    // Process extracted images with OCR and data extraction
    const ocrResults = await this.processExtractedImages(allImages);
    
    // Calculate processing statistics
    const processingStats = this.calculateImageProcessingStats(allImages, ocrResults);

    return {
      images: allImages,
      ocrResults,
      processingStats
    };
  }

  /**
   * Extract all images from email sources
   */
  async extractAllImages(email: EmailDeconstructionResult): Promise<ProcessedImage[]> {
    const images: ProcessedImage[] = [];

    // Extract embedded images (inline content)
    for (const embeddedImage of email.embeddedImages) {
      const processedImage = await this.processEmbeddedImage(embeddedImage);
      if (processedImage) {
        images.push(processedImage);
      }
    }

    // Extract images from HTML content (base64, inline images)
    if (email.htmlContent) {
      const htmlImages = await this.extractImagesFromHTML(email.htmlContent);
      images.push(...htmlImages);
    }

    // Extract image attachments
    const imageAttachments = email.attachments.filter(att => 
      this.isImageFile(att.filename)
    );

    for (const imageAtt of imageAttachments) {
      try {
        const processedImage = await this.processImageAttachment(imageAtt);
        if (processedImage) {
          images.push(processedImage);
        }
      } catch (error) {
        console.warn(`Failed to process image attachment ${imageAtt.filename}:`, error instanceof Error ? error.message : String(error));
      }
    }

    return images;
  }

  /**
   * Process embedded image with metadata extraction
   */
  private async processEmbeddedImage(embeddedImage: EmbeddedImage): Promise<ProcessedImage | null> {
    try {
      // Generate filename if not provided
      const filename = embeddedImage.contentId ? 
        `embedded_${embeddedImage.contentId}.${embeddedImage.extension}` :
        `embedded_${Date.now()}.${embeddedImage.extension}`;

      // Get image dimensions
      const dimensions = await this.getImageDimensions(embeddedImage.data);

      return {
        source: 'embedded',
        filename,
        content: embeddedImage.data,
        contentType: embeddedImage.contentType,
        size: embeddedImage.data.length,
        dimensions,
        processingNotes: `Embedded image with CID: ${embeddedImage.contentId}`
      };
    } catch (error) {
      console.warn(`Failed to process embedded image ${embeddedImage.contentId}:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Process image attachment with metadata
   */
  private async processImageAttachment(attachment: any): Promise<ProcessedImage | null> {
    try {
      const dimensions = await this.getImageDimensions(attachment.content);

      return {
        source: 'attachment',
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
        size: attachment.size || attachment.content.length,
        dimensions,
        processingNotes: `Image attachment from email`
      };
    } catch (error) {
      console.warn(`Failed to process image attachment ${attachment.filename}:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Extract base64 and other images from HTML content
   */
  private async extractImagesFromHTML(htmlContent: string): Promise<ProcessedImage[]> {
    const images: ProcessedImage[] = [];
    
    try {
      const root = parseHTML(htmlContent);
      const imgTags = root.querySelectorAll('img');

      for (let i = 0; i < imgTags.length; i++) {
        const img = imgTags[i];
        const src = img.getAttribute('src');

        if (src && src.startsWith('data:image/')) {
          const processedImage = await this.processBase64Image(src, i);
          if (processedImage) {
            images.push(processedImage);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to extract images from HTML:', error instanceof Error ? error.message : String(error));
    }

    return images;
  }

  /**
   * Process base64 image data from HTML
   */
  private async processBase64Image(dataUrl: string, index: number): Promise<ProcessedImage | null> {
    try {
      const match = dataUrl.match(/data:image\/([^;]+);base64,(.+)/);
      if (!match) return null;

      const [, extension, base64Data] = match;
      const content = Buffer.from(base64Data, 'base64');
      const dimensions = await this.getImageDimensions(content);

      return {
        source: 'html',
        filename: `html_image_${index}.${extension}`,
        content,
        contentType: `image/${extension}`,
        size: content.length,
        dimensions,
        processingNotes: `Base64 image extracted from HTML content`
      };
    } catch (error) {
      console.warn(`Failed to process base64 image ${index}:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Process all extracted images with OCR and data extraction
   */
  async processExtractedImages(images: ProcessedImage[]): Promise<ExtractedData[]> {
    const results: ExtractedData[] = [];

    for (const image of images) {
      try {
        // Enhanced OCR with preprocessing
        const ocrText = await this.performEnhancedOCR(image);
        
        if (ocrText && ocrText.trim()) {
          // Extract product data from OCR text
          const productData = await this.extractProductsFromOCR(ocrText, image.filename);
          results.push(...productData);
        }
      } catch (error) {
        console.warn(`Failed to process image ${image.filename}:`, error instanceof Error ? error.message : String(error));
      }
    }

    return results;
  }

  /**
   * Perform enhanced OCR with image preprocessing
   */
  private async performEnhancedOCR(image: ProcessedImage): Promise<string> {
    try {
      // Preprocess image for better OCR results
      const preprocessedImage = await this.preprocessImageForOCR(image.content);
      
      // Use the file processor's OCR capabilities
      const sourceName = `Image OCR: ${image.filename}`;
      const ocrResults = await this.fileProcessor.processImage(preprocessedImage, sourceName);
      
      // Combine all OCR text results
      return ocrResults.map(result => result.rawData || '').join('\n');
    } catch (error) {
      console.warn(`OCR failed for ${image.filename}:`, error instanceof Error ? error.message : String(error));
      return '';
    }
  }

  /**
   * Preprocess image for better OCR results with memory management
   */
  private async preprocessImageForOCR(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Check memory before processing
      if (!this.memoryManager.isMemoryHealthy()) {
        console.warn('Memory usage high, skipping image preprocessing');
        return imageBuffer;
      }

      // Generate cache key for preprocessed image
      const crypto = require('crypto');
      const cacheKey = `preprocess_${crypto.createHash('md5').update(imageBuffer).digest('hex')}`;
      
      // Check cache first
      const cachedImage = this.memoryManager.getCachedImage(cacheKey);
      if (cachedImage) {
        return cachedImage;
      }

      // Get processing buffer from pool
      const workingBuffer = this.memoryManager.getProcessingBuffer(imageBuffer.length * 2);
      
      try {
        // Use Sharp for image preprocessing
        const processedImage = await sharp(imageBuffer)
          .grayscale() // Convert to grayscale
          .normalize() // Normalize contrast
          .sharpen() // Sharpen edges
          .png() // Convert to PNG for consistency
          .toBuffer();

        // Cache the result if it's reasonable size (< 5MB)
        if (processedImage.length < 5 * 1024 * 1024) {
          this.memoryManager.cacheImage(cacheKey, processedImage);
        }

        return processedImage;
        
      } finally {
        // Return buffer to pool
        this.memoryManager.returnProcessingBuffer(workingBuffer);
      }
      
    } catch (error) {
      // If preprocessing fails, return original
      console.warn('Image preprocessing failed, using original:', error instanceof Error ? error.message : String(error));
      return imageBuffer;
    }
  }

  /**
   * Extract product data from OCR text using AI
   */
  private async extractProductsFromOCR(ocrText: string, filename: string): Promise<ExtractedData[]> {
    try {
      // Use the file processor to extract structured data from OCR text
      const results = await this.fileProcessor.extractFromText(ocrText, `OCR from ${filename}`);
      
      // Add OCR-specific metadata
      return results.map(result => ({
        ...result,
        extractionMethod: 'ocr',
        confidence: Math.max(0.3, (result.confidence || 0.5) - 0.1), // Lower confidence for OCR
        processingNotes: `Extracted via OCR from ${filename}`
      }));
    } catch (error) {
      console.warn(`Failed to extract products from OCR text (${filename}):`, error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Get image dimensions using Sharp with memory management
   */
  private async getImageDimensions(imageBuffer: Buffer): Promise<{ width: number; height: number } | undefined> {
    try {
      // For small images, process immediately
      if (imageBuffer.length < 1024 * 1024) { // Less than 1MB
        const metadata = await sharp(imageBuffer).metadata();
        
        if (metadata.width && metadata.height) {
          return {
            width: metadata.width,
            height: metadata.height
          };
        }
      } else {
        // For larger images, check memory first
        if (!this.memoryManager.isMemoryHealthy()) {
          console.warn('Memory usage high, skipping dimension analysis for large image');
          return undefined;
        }

        const metadata = await sharp(imageBuffer).metadata();
        
        if (metadata.width && metadata.height) {
          return {
            width: metadata.width,
            height: metadata.height
          };
        }
      }
    } catch (error) {
      console.warn('Failed to get image dimensions:', error instanceof Error ? error.message : String(error));
    }
    
    return undefined;
  }

  /**
   * Check if filename indicates an image file
   */
  private isImageFile(filename: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp'];
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return imageExtensions.includes(extension);
  }

  /**
   * Calculate processing statistics for images
   */
  private calculateImageProcessingStats(
    images: ProcessedImage[], 
    ocrResults: ExtractedData[]
  ): ImageProcessingResult['processingStats'] {
    const totalImages = images.length;
    const successfulOcr = ocrResults.length > 0 ? images.length : 0; // Simplified
    const failedOcr = totalImages - successfulOcr;
    const totalDataExtracted = ocrResults.length;
    
    const averageConfidence = ocrResults.length > 0 ?
      ocrResults.reduce((sum, result) => sum + (result.confidence || 0), 0) / ocrResults.length :
      0;

    return {
      totalImages,
      successfulOcr,
      failedOcr,
      totalDataExtracted,
      averageConfidence
    };
  }

  /**
   * Get processing summary for reporting
   */
  getProcessingSummary(result: ImageProcessingResult): string {
    const { processingStats } = result;
    const memorySummary = this.memoryManager.getMemorySummary();
    
    return [
      `Processed ${processingStats.totalImages} images`,
      `Successful OCR: ${processingStats.successfulOcr}`,
      `Failed OCR: ${processingStats.failedOcr}`,
      `Total data extracted: ${processingStats.totalDataExtracted} items`,
      `Average confidence: ${(processingStats.averageConfidence * 100).toFixed(1)}%`,
      `Memory: ${memorySummary}`
    ].join(' | ');
  }

  /**
   * Get memory manager instance
   */
  getMemoryManager(): MemoryManager {
    return this.memoryManager;
  }

  /**
   * Shutdown and cleanup resources
   */
  shutdown(): void {
    this.memoryManager.shutdown();
  }
}