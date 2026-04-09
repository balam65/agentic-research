import { getModelConfig } from './model_config.js';

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

export class ModelClient {
  async completeJson(messages: ChatMessage[]): Promise<string> {
    const config = getModelConfig();
    const url = new URL(config.chatEndpoint, config.baseUrl.endsWith('/') ? config.baseUrl : `${config.baseUrl}/`);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.apiKey.trim()) {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }

    const requestBody = {
      model: config.model,
      temperature: 0.1,
      messages,
    };

    console.info(
      `[ModelClient] Sending model request provider=${config.provider} model=${config.model} url=${url.toString()} messages=${messages.length}`,
    );

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
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

    console.info(`[ModelClient] Received model response chars=${content.length}`);
    return extractFirstJsonObject(content);
  }
}
