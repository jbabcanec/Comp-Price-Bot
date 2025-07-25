import { ipcMain, shell } from 'electron';
import { logger } from '../../services/logger.service';

export function registerExternalHandlers(): void {
  // Handle opening external URLs
  ipcMain.handle('external:open-url', async (_, url: string) => {
    logger.info('external', 'Request to open external URL', { url });
    
    try {
      // List of trusted domains
      const trustedDomains = [
        'platform.openai.com',
        'openai.com',
        'github.com',
        'docs.openai.com'
      ];
      
      // Validate URL
      const urlObj = new URL(url);
      
      // Check if the domain is trusted
      const isTrusted = trustedDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
      );
      
      if (!isTrusted) {
        logger.warn('external', 'Blocked untrusted URL', { url });
        return {
          success: false,
          error: 'URL is not from a trusted domain'
        };
      }
      
      // Open the URL in the default browser
      await shell.openExternal(url);
      logger.info('external', 'Successfully opened external URL', { url });
      
      return {
        success: true,
        data: true
      };
    } catch (error) {
      logger.error('external', 'Failed to open external URL', error as Error, { url });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open URL'
      };
    }
  });
}