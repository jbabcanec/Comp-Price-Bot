import { safeStorage } from 'electron';
import Store from 'electron-store';

/**
 * Secure API Key Management Service
 * Uses Electron's safeStorage for encryption and secure storage
 */
export class ApiKeyService {
  private store: Store;
  private readonly OPENAI_KEY = 'openai_api_key_encrypted';
  private readonly KEY_TIMESTAMP = 'openai_key_timestamp';

  constructor() {
    this.store = new Store({
      name: 'secure-keys',
      encryptionKey: 'hvac-crosswalk-secure-keys'
    });
  }

  /**
   * Check if safeStorage is available on this platform
   */
  isSecureStorageAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }

  /**
   * Store OpenAI API key securely
   */
  async storeOpenAIKey(apiKey: string): Promise<void> {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('Invalid API key provided');
    }

    // Validate API key format (OpenAI keys start with 'sk-')
    if (!apiKey.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format. Keys should start with "sk-"');
    }

    try {
      if (this.isSecureStorageAvailable()) {
        // Use system encryption
        const encryptedKey = safeStorage.encryptString(apiKey);
        this.store.set(this.OPENAI_KEY, encryptedKey.toString('base64'));
      } else {
        // Fallback to electron-store encryption
        this.store.set(this.OPENAI_KEY, apiKey);
      }

      // Store timestamp for key management
      this.store.set(this.KEY_TIMESTAMP, new Date().toISOString());
      
      console.log('OpenAI API key stored securely');
    } catch (error) {
      console.error('Failed to store API key:', error);
      throw new Error('Failed to store API key securely');
    }
  }

  /**
   * Retrieve OpenAI API key
   */
  async getOpenAIKey(): Promise<string | null> {
    try {
      const storedKey = this.store.get(this.OPENAI_KEY) as string;
      
      if (!storedKey) {
        return null;
      }

      if (this.isSecureStorageAvailable() && Buffer.isBuffer(Buffer.from(storedKey, 'base64'))) {
        // Decrypt using system encryption
        const encryptedBuffer = Buffer.from(storedKey, 'base64');
        return safeStorage.decryptString(encryptedBuffer);
      } else {
        // Return from electron-store
        return storedKey;
      }
    } catch (error) {
      console.error('Failed to retrieve API key:', error);
      return null;
    }
  }

  /**
   * Check if OpenAI API key is configured
   */
  hasOpenAIKey(): boolean {
    return this.store.has(this.OPENAI_KEY);
  }

  /**
   * Remove OpenAI API key
   */
  removeOpenAIKey(): void {
    this.store.delete(this.OPENAI_KEY);
    this.store.delete(this.KEY_TIMESTAMP);
    console.log('OpenAI API key removed');
  }

  /**
   * Get API key metadata (without exposing the key)
   */
  getKeyMetadata(): { hasKey: boolean; timestamp?: string; masked?: string } {
    const hasKey = this.hasOpenAIKey();
    const timestamp = this.store.get(this.KEY_TIMESTAMP) as string;
    
    if (!hasKey) {
      return { hasKey: false };
    }

    // Create masked version for display
    return {
      hasKey: true,
      timestamp,
      masked: 'sk-****...****'
    };
  }

  /**
   * Validate OpenAI API key by making a test request
   */
  async validateOpenAIKey(apiKey?: string): Promise<{ valid: boolean; error?: string }> {
    const keyToTest = apiKey || await this.getOpenAIKey();
    
    if (!keyToTest) {
      return { valid: false, error: 'No API key provided' };
    }

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${keyToTest}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return { valid: true };
      } else if (response.status === 401) {
        return { valid: false, error: 'Invalid API key' };
      } else if (response.status === 429) {
        return { valid: false, error: 'Rate limit exceeded' };
      } else {
        return { valid: false, error: `API error: ${response.status}` };
      }
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  }

  /**
   * Get current API usage statistics (if available)
   */
  async getApiUsage(): Promise<{ requests: number; tokens: number; lastReset: string } | null> {
    // This would connect to OpenAI's usage API if available
    // For now, return mock data or local tracking
    return {
      requests: 0,
      tokens: 0,
      lastReset: new Date().toISOString()
    };
  }

  /**
   * Clear all stored data (for testing/reset)
   */
  clearAll(): void {
    this.store.clear();
    console.log('All API keys cleared');
  }
}