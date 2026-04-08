import { getModelConfig } from './model_config.js';

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

export class ModelClient {
  async completeJson(messages: ChatMessage[]): Promise<string> {
    const config = getModelConfig();
    if (!config.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured.');
    }

    const url = new URL(config.chatEndpoint, config.baseUrl.endsWith('/') ? config.baseUrl : `${config.baseUrl}/`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Model request failed with ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
        };
      }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Model response did not include a JSON message.');
    }

    return content;
  }
}
