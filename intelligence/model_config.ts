import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface EnvMap {
  [key: string]: string;
}

function parseEnvFile(contents: string): EnvMap {
  const parsed: EnvMap = {};
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    parsed[key] = value;
  }
  return parsed;
}

let envCache: EnvMap | null = null;

function loadEnv(): EnvMap {
  if (envCache) {
    return envCache;
  }

  const envPath = resolve(process.cwd(), '.env');
  envCache = existsSync(envPath) ? parseEnvFile(readFileSync(envPath, 'utf8')) : {};
  return envCache;
}

function envValue(key: string, fallback = ''): string {
  return process.env[key] ?? loadEnv()[key] ?? fallback;
}

export interface ModelConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  chatEndpoint: string;
  intelligenceAgentEnabled: boolean;
}

export function getModelConfig(): ModelConfig {
  return {
    apiKey: envValue('OPENAI_API_KEY'),
    model: envValue('OPENAI_MODEL', 'gpt-4.1-mini'),
    baseUrl: envValue('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
    chatEndpoint: envValue('OPENAI_CHAT_ENDPOINT', '/chat/completions'),
    intelligenceAgentEnabled: envValue('INTELLIGENCE_AGENT_ENABLED', 'true').toLowerCase() === 'true',
  };
}
