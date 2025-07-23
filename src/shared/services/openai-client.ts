/**
 * OpenAI Client Wrapper with Rate Limiting and Error Handling
 * Provides a clean abstraction over the OpenAI API with built-in safeguards
 */

export interface OpenAIClientConfig {
  apiKey: string;
  baseURL?: string;
  maxRetries?: number;
  timeout?: number;
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' | 'text' };
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface RateLimitInfo {
  requestsRemaining: number;
  tokensRemaining: number;
  resetTime: Date;
  isLimited: boolean;
}

class RateLimiter {
  private requestQueue: Array<{ timestamp: number; tokens: number }> = [];
  private readonly maxRequestsPerMinute: number;
  private readonly maxTokensPerMinute: number;

  constructor(requestsPerMinute: number = 60, tokensPerMinute: number = 90000) {
    this.maxRequestsPerMinute = requestsPerMinute;
    this.maxTokensPerMinute = tokensPerMinute;
  }

  private cleanOldRequests(): void {
    const oneMinuteAgo = Date.now() - 60000;
    this.requestQueue = this.requestQueue.filter(req => req.timestamp > oneMinuteAgo);
  }

  canMakeRequest(estimatedTokens: number = 1000): RateLimitInfo {
    this.cleanOldRequests();

    const currentRequests = this.requestQueue.length;
    const currentTokens = this.requestQueue.reduce((sum, req) => sum + req.tokens, 0);

    const requestsRemaining = Math.max(0, this.maxRequestsPerMinute - currentRequests);
    const tokensRemaining = Math.max(0, this.maxTokensPerMinute - currentTokens);

    const canMakeRequest = currentRequests < this.maxRequestsPerMinute && 
                          (currentTokens + estimatedTokens) <= this.maxTokensPerMinute;

    return {
      requestsRemaining,
      tokensRemaining,
      resetTime: new Date(Date.now() + 60000),
      isLimited: !canMakeRequest
    };
  }

  recordRequest(tokens: number): void {
    this.requestQueue.push({
      timestamp: Date.now(),
      tokens
    });
  }

  async waitIfNeeded(estimatedTokens: number = 1000): Promise<void> {
    const rateLimitInfo = this.canMakeRequest(estimatedTokens);
    
    if (rateLimitInfo.isLimited) {
      const waitTime = rateLimitInfo.resetTime.getTime() - Date.now();
      console.log(`Rate limit hit, waiting ${Math.ceil(waitTime / 1000)} seconds...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

export class OpenAIClient {
  private config: Required<OpenAIClientConfig>;
  private rateLimiter: RateLimiter;

  constructor(config: OpenAIClientConfig) {
    this.config = {
      baseURL: 'https://api.openai.com/v1',
      maxRetries: 3,
      timeout: 30000,
      rateLimit: {
        requestsPerMinute: 60,
        tokensPerMinute: 90000
      },
      ...config
    };

    this.rateLimiter = new RateLimiter(
      this.config.rateLimit.requestsPerMinute,
      this.config.rateLimit.tokensPerMinute
    );
  }

  /**
   * Get current rate limit status
   */
  getRateLimitInfo(estimatedTokens: number = 1000): RateLimitInfo {
    return this.rateLimiter.canMakeRequest(estimatedTokens);
  }

  /**
   * Create a chat completion with built-in retry and rate limiting
   */
  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const estimatedTokens = this.estimateTokens(request);
    
    // Wait if rate limited
    await this.rateLimiter.waitIfNeeded(estimatedTokens);

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest('/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new OpenAIError(
            response.status,
            errorData.error?.message || `HTTP ${response.status}`,
            errorData.error?.type,
            errorData.error?.code
          );
        }

        const result: ChatCompletionResponse = await response.json();
        
        // Record successful request for rate limiting
        this.rateLimiter.recordRequest(result.usage?.total_tokens || estimatedTokens);
        
        return result;

      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (error instanceof OpenAIError) {
          if (error.status === 401 || error.status === 403) {
            throw error; // Authentication/authorization errors
          }
          if (error.status === 400 && !error.message.includes('rate limit')) {
            throw error; // Bad request (not rate limit)
          }
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.config.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Test the API connection and key validity
   */
  async testConnection(): Promise<{ success: boolean; error?: string; models?: string[] }> {
    try {
      const response = await this.makeRequest('/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || `HTTP ${response.status}`
        };
      }

      const data = await response.json();
      const models = data.data?.map((model: any) => model.id) || [];
      
      return {
        success: true,
        models: models.filter((id: string) => id.includes('gpt'))
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }

  /**
   * Get available models
   */
  async getModels(): Promise<string[]> {
    try {
      const response = await this.makeRequest('/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      return data.data
        ?.map((model: any) => model.id)
        ?.filter((id: string) => id.includes('gpt'))
        ?.sort() || [];

    } catch (error) {
      console.error('Failed to fetch models:', error);
      return ['gpt-4', 'gpt-4-turbo-preview', 'gpt-3.5-turbo']; // Fallback
    }
  }

  /**
   * Make HTTP request with timeout
   */
  private async makeRequest(endpoint: string, options: RequestInit): Promise<Response> {
    const url = `${this.config.baseURL}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Estimate token count for rate limiting
   */
  private estimateTokens(request: ChatCompletionRequest): number {
    // Rough estimation: ~4 characters per token
    const messageContent = request.messages
      .map(msg => msg.content)
      .join(' ');
    
    const estimatedPromptTokens = Math.ceil(messageContent.length / 4);
    const estimatedCompletionTokens = request.max_tokens || 1000;
    
    return estimatedPromptTokens + estimatedCompletionTokens;
  }

  /**
   * Update API key
   */
  updateApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): {
    requestsInLastMinute: number;
    tokensInLastMinute: number;
    rateLimitInfo: RateLimitInfo;
  } {
    const rateLimitInfo = this.rateLimiter.canMakeRequest();
    
    return {
      requestsInLastMinute: this.config.rateLimit.requestsPerMinute - rateLimitInfo.requestsRemaining,
      tokensInLastMinute: this.config.rateLimit.tokensPerMinute - rateLimitInfo.tokensRemaining,
      rateLimitInfo
    };
  }
}

/**
 * Custom error class for OpenAI API errors
 */
export class OpenAIError extends Error {
  constructor(
    public status: number,
    message: string,
    public type?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'OpenAIError';
  }

  get isRateLimit(): boolean {
    return this.status === 429;
  }

  get isAuthentication(): boolean {
    return this.status === 401;
  }

  get isBadRequest(): boolean {
    return this.status === 400;
  }
}

/**
 * Create a default OpenAI client instance
 */
export function createOpenAIClient(apiKey: string, config?: Partial<OpenAIClientConfig>): OpenAIClient {
  return new OpenAIClient({
    apiKey,
    ...config
  });
}