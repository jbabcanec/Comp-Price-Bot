import { ipcMain } from 'electron';
import { ApiKeyService } from '../../services/apiKey.service';

const apiKeyService = new ApiKeyService();

/**
 * IPC handlers for secure API key management
 */
export function setupApiKeyHandlers(): void {
  // Store OpenAI API key
  ipcMain.handle('api-key:store-openai', async (_, apiKey: string) => {
    try {
      await apiKeyService.storeOpenAIKey(apiKey);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to store API key'
      };
    }
  });

  // Get OpenAI API key (for internal use)
  ipcMain.handle('api-key:get-openai', async () => {
    try {
      const apiKey = await apiKeyService.getOpenAIKey();
      return { success: true, apiKey };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve API key'
      };
    }
  });

  // Check if API key exists
  ipcMain.handle('api-key:has-openai', async () => {
    return apiKeyService.hasOpenAIKey();
  });

  // Get API key metadata (safe for UI display)
  ipcMain.handle('api-key:get-metadata', async () => {
    return apiKeyService.getKeyMetadata();
  });

  // Remove API key
  ipcMain.handle('api-key:remove-openai', async () => {
    try {
      apiKeyService.removeOpenAIKey();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove API key'
      };
    }
  });

  // Validate API key
  ipcMain.handle('api-key:validate-openai', async (_, apiKey?: string) => {
    try {
      const result = await apiKeyService.validateOpenAIKey(apiKey);
      return result;
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  });

  // Get API usage stats
  ipcMain.handle('api-key:get-usage', async () => {
    try {
      const usage = await apiKeyService.getApiUsage();
      return { success: true, usage };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get usage'
      };
    }
  });

  // Check if secure storage is available
  ipcMain.handle('api-key:secure-storage-available', async () => {
    return apiKeyService.isSecureStorageAvailable();
  });
}