import { getModelConfig, type ModelConfig } from './model_config.js';

export interface ModelRuntimeValidation {
  valid: boolean;
  config: ModelConfig;
  reason?: string;
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

export function validateModelRuntimeConfig(): ModelRuntimeValidation {
  const config = getModelConfig();

  if (!config.intelligenceAgentEnabled) {
    return {
      valid: false,
      config,
      reason: 'INTELLIGENCE_AGENT_ENABLED is false, so model-led decisioning is disabled.',
    };
  }

  if (!hasText(config.model)) {
    return {
      valid: false,
      config,
      reason: 'MODEL_NAME is not configured.',
    };
  }

  if (!hasText(config.baseUrl)) {
    return {
      valid: false,
      config,
      reason: 'MODEL_BASE_URL is not configured.',
    };
  }

  const localProvider = config.provider === 'local' || config.provider === 'lmstudio';
  if (!localProvider && !hasText(config.apiKey)) {
    return {
      valid: false,
      config,
      reason: 'MODEL_API_KEY is required for non-local providers.',
    };
  }

  return {
    valid: true,
    config,
  };
}
