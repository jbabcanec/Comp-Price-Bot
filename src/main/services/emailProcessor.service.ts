import * as fs from 'fs';
import * as path from 'path';
import { simpleParser } from 'mailparser';
// import { parseFromString } from 'eml-parser'; // Not available, using fallback
import { parse as parseHTML } from 'node-html-parser';
import * as mime from 'mime-types';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
  size: number;
  contentId?: string;
}

export interface EmbeddedImage {
  contentId: string;
  data: Buffer;
  contentType: string;
  extension: string;
}

export interface EmailMetadata {
  from?: string;
  to?: string;
  subject?: string;
  date?: Date;
  messageId?: string;
  references?: string[];
}

export interface EmailDeconstructionResult {
  textContent: string;
  htmlContent?: string;
  attachments: EmailAttachment[];
  embeddedImages: EmbeddedImage[];
  metadata: EmailMetadata;
  processingMethod: string;
}

export class AdvancedEmailProcessor {
  
  /**
   * Main entry point for processing email files
   */
  async processEmailFile(filePath: string): Promise<EmailDeconstructionResult> {
    const emailType = this.detectEmailType(filePath);
    
    switch (emailType) {
      case 'MSG':
        return await this.processMSGFile(filePath);
      case 'EML':
        return await this.processEMLFile(filePath);
      default:
        throw new Error(`Unsupported email type: ${emailType}`);
    }
  }

  /**
   * Detect email file type based on extension
   */
  private detectEmailType(filePath: string): 'MSG' | 'EML' | 'UNKNOWN' {
    const extension = path.extname(filePath).toLowerCase();
    
    switch (extension) {
      case '.msg':
        return 'MSG';
      case '.eml':
        return 'EML';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Process MSG files (Outlook format)
   */
  private async processMSGFile(filePath: string): Promise<EmailDeconstructionResult> {
    try {
      // For now, treat MSG as binary and attempt EML parsing
      // In production, would use a proper MSG parser library
      const fileBuffer = fs.readFileSync(filePath);
      
      // Attempt to parse as EML first
      try {
        const parsed = await simpleParser(fileBuffer);
        return this.convertParsedToResult(parsed, 'MSG_FALLBACK');
      } catch (error) {
        // If EML parsing fails, extract what we can
        return {
          textContent: 'MSG file detected - content extraction requires specialized parser',
          htmlContent: undefined,
          attachments: [],
          embeddedImages: [],
          metadata: {
            subject: path.basename(filePath, '.msg')
          },
          processingMethod: 'MSG_BASIC'
        };
      }
    } catch (error) {
      throw new Error(`Failed to process MSG file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Process EML files (standard email format)
   */
  private async processEMLFile(filePath: string): Promise<EmailDeconstructionResult> {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const parsed = await simpleParser(fileBuffer);
      
      return this.convertParsedToResult(parsed, 'EML_FULL');
    } catch (error) {
      // Fallback to basic parsing
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        // Basic email parsing fallback
        const bodyMatch = fileContent.match(/\n\n([\s\S]*?)$/);
        const bodyText = bodyMatch ? bodyMatch[1] : fileContent;
        
        return {
          textContent: bodyText || '',
          htmlContent: undefined,
          attachments: [],
          embeddedImages: [],
          metadata: {
            subject: path.basename(filePath, '.eml')
          },
          processingMethod: 'EML_FALLBACK'
        };
      } catch (fallbackError) {
        throw new Error(`Failed to process EML file: ${error instanceof Error ? error.message : String(error)}, Fallback error: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
      }
    }
  }

  /**
   * Convert mailparser result to our standard format
   */
  private convertParsedToResult(parsed: any, method: string): EmailDeconstructionResult {
    const attachments: EmailAttachment[] = [];
    const embeddedImages: EmbeddedImage[] = [];

    // Process attachments
    if (parsed.attachments && Array.isArray(parsed.attachments)) {
      for (const attachment of parsed.attachments) {
        const contentType = attachment.contentType || mime.lookup(attachment.filename) || 'application/octet-stream';
        
        // Check if it's an embedded image
        if (attachment.cid && this.isImageContentType(contentType)) {
          embeddedImages.push({
            contentId: attachment.cid,
            data: attachment.content,
            contentType,
            extension: this.getExtensionFromContentType(contentType)
          });
        } else {
          // Regular attachment
          attachments.push({
            filename: attachment.filename || `attachment_${Date.now()}`,
            content: attachment.content,
            contentType,
            size: attachment.size || attachment.content?.length || 0,
            contentId: attachment.cid
          });
        }
      }
    }

    // Extract embedded images from HTML content
    if (parsed.html) {
      const htmlEmbeddedImages = this.extractImagesFromHTML(parsed.html);
      embeddedImages.push(...htmlEmbeddedImages);
    }

    return {
      textContent: parsed.text || '',
      htmlContent: parsed.html || undefined,
      attachments,
      embeddedImages,
      metadata: {
        from: parsed.from?.text || parsed.from?.value?.[0]?.address,
        to: parsed.to?.text || parsed.to?.value?.[0]?.address,
        subject: parsed.subject,
        date: parsed.date,
        messageId: parsed.messageId,
        references: parsed.references
      },
      processingMethod: method
    };
  }

  /**
   * Extract attachments from eml-parser result
   */
  private extractAttachmentsFromEmlParser(parsed: any): EmailAttachment[] {
    const attachments: EmailAttachment[] = [];
    
    if (parsed.attachments && Array.isArray(parsed.attachments)) {
      for (const attachment of parsed.attachments) {
        attachments.push({
          filename: attachment.name || `attachment_${Date.now()}`,
          content: Buffer.from(attachment.data, 'base64'),
          contentType: attachment.mimeType || 'application/octet-stream',
          size: attachment.size || 0
        });
      }
    }
    
    return attachments;
  }

  /**
   * Extract embedded images from eml-parser result
   */
  private extractEmbeddedImagesFromEmlParser(parsed: any): EmbeddedImage[] {
    const embeddedImages: EmbeddedImage[] = [];
    
    // This would need to be implemented based on the actual eml-parser structure
    // For now, return empty array
    return embeddedImages;
  }

  /**
   * Extract base64 and cid images from HTML content
   */
  private extractImagesFromHTML(htmlContent: string): EmbeddedImage[] {
    const embeddedImages: EmbeddedImage[] = [];
    const root = parseHTML(htmlContent);
    
    // Find all img tags
    const images = root.querySelectorAll('img');
    
    for (const img of images) {
      const src = img.getAttribute('src');
      
      if (src) {
        // Handle base64 images
        if (src.startsWith('data:image/')) {
          const match = src.match(/data:image\/([^;]+);base64,(.+)/);
          if (match) {
            const [, extension, base64Data] = match;
            embeddedImages.push({
              contentId: `html_embedded_${Date.now()}_${Math.random()}`,
              data: Buffer.from(base64Data, 'base64'),
              contentType: `image/${extension}`,
              extension
            });
          }
        }
        // Handle cid references (these would be matched with attachments)
        else if (src.startsWith('cid:')) {
          // These will be handled when processing attachments
          continue;
        }
      }
    }
    
    return embeddedImages;
  }

  /**
   * Check if content type is an image
   */
  private isImageContentType(contentType: string): boolean {
    return contentType.startsWith('image/');
  }

  /**
   * Get file extension from content type
   */
  private getExtensionFromContentType(contentType: string): string {
    const extension = mime.extension(contentType);
    return extension || 'bin';
  }

  /**
   * Get statistics about email processing
   */
  getProcessingStats(result: EmailDeconstructionResult): {
    totalComponents: number;
    textComponents: number;
    imageComponents: number;
    attachmentComponents: number;
    hasHtml: boolean;
  } {
    return {
      totalComponents: 1 + result.attachments.length + result.embeddedImages.length + (result.htmlContent ? 1 : 0),
      textComponents: result.textContent ? 1 : 0,
      imageComponents: result.embeddedImages.length,
      attachmentComponents: result.attachments.length,
      hasHtml: !!result.htmlContent
    };
  }
}