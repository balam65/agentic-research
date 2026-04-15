import { createLogger } from '../logs/logger.js';
import { getModelConfig } from './model_config.js';

const logger = createLogger('model-client');

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

function extractFirstJsonObject(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const fenced = fencedMatch?.[1]?.trim();
  if (fenced && fenced.startsWith('{') && fenced.endsWith('}')) {
    return fenced;
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  throw new Error('Model response did not contain a JSON object.');
}

// --- Retry configuration ---
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const REQUEST_TIMEOUT_MS = 60000;

export class ModelClient {
  async completeJson(messages: ChatMessage[]): Promise<string> {
    const config = getModelConfig();
    if (!config.baseUrl.trim()) {
      throw new Error('MODEL_BASE_URL is not configured.');
    }

    let lastError: Error | undefined;

    // Primary provider with retry
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const result = await this.executeRequest(config.baseUrl, config.model, config.apiKey, messages);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn('LLM request attempt failed', {
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES,
          error: lastError.message,
          model: config.model,
        });

        if (attempt < MAX_RETRIES - 1) {
          const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          logger.debug('Retrying after backoff', { delayMs: delay, attempt: attempt + 1 });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Fallback to OpenRouter if primary exhausted retries
    if (config.fallbackEnabled && config.openRouterApiKey) {
      logger.warn('Primary model exhausted retries. Attempting OpenRouter fallback.', {
        primaryModel: config.model,
        retriesAttempted: MAX_RETRIES,
      });
      try {
        const openRouterBase = "https://openrouter.ai";
        const fallbackModel = "meta-llama/llama-3-70b-instruct";
        return await this.executeRequest(openRouterBase, fallbackModel, config.openRouterApiKey, messages, "/api/v1/chat/completions");
      } catch (fallbackError) {
        logger.error('OpenRouter fallback also failed', fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)));
        throw fallbackError;
      }
    }

    throw lastError ?? new Error('LLM request failed after all retries.');
  }

  private async executeRequest(baseUrl: string, model: string, apiKey: string, messages: ChatMessage[], endpoint?: string): Promise<string> {
    const config = getModelConfig();
    const activeEndpoint = endpoint ?? config.chatEndpoint;
    const url = new URL(activeEndpoint, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey.trim()) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const requestBody = {
      model: model,
      temperature: 0.1,
      messages,
    };

    const requestChars = JSON.stringify(requestBody).length;
    const start = Date.now();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      logger.info('Sending LLM request', {
        model,
        url: url.toString(),
        messageCount: messages.length,
        requestChars,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Model request failed with ${response.status}: ${errorBody}`);
      }

      const data = (await response.json()) as ChatCompletionResponse;
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Model response did not include a JSON message.');
      }

      const durationMs = Date.now() - start;
      logger.llmCall({
        model,
        url: url.toString(),
        requestChars,
        responseChars: content.length,
        durationMs,
        success: true,
      });

      return extractFirstJsonObject(content);
    } catch (error: unknown) {
      const durationMs = Date.now() - start;
      const errMsg = error instanceof Error ? error.message : String(error);

      if (error instanceof Error && error.name === 'AbortError') {
        logger.llmCall({ model, url: url.toString(), requestChars, durationMs, success: false, error: 'timeout' });
        throw new Error(`Model request timed out after ${REQUEST_TIMEOUT_MS / 1000}s at ${url.toString()}`);
      }

      logger.llmCall({ model, url: url.toString(), requestChars, durationMs, success: false, error: errMsg });
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
