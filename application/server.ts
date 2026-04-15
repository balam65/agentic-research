import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

import { createLogger } from './src/logs/logger.js';
import { requestLogger } from './src/logs/log_middleware.js';
import { JobRequestSchema } from './src/module_1/schema.js';
import { WorldModelStore } from './src/memory/world_model_store.js';
import { SupabaseDurableStatePort } from './src/memory/supabase_durable_port.js';
import { CapabilityRegistry } from './src/core/capability_registry_loader.js';
import { AgenticOrchestrator } from './src/core/orchestrator.js';
import type { ValidatedInputEvent } from './src/memory/schema.js';

const logger = createLogger('server');

// ── Swagger (optional, load gracefully) ──
let swaggerDocument: object | null = null;
let swaggerUi: typeof import('swagger-ui-express') | null = null;
try {
  const { default: swagger } = await import('swagger-ui-express');
  const { default: doc } = await import('./swagger.json', { with: { type: 'json' } });
  swaggerDocument = doc;
  swaggerUi = swagger;
} catch {
  logger.warn('Swagger UI not available — skipping /docs endpoint');
}

// ── Persistence ──
const useSupabase =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

const persistence = useSupabase
  ? new SupabaseDurableStatePort(
      (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL)!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  : undefined;

// ── Orchestrator — direct ESM import (no child process bridge) ──
const store = new WorldModelStore(persistence);
const registry = new CapabilityRegistry(
  new URL('./src/context/capability-manifest.json', import.meta.url),
);
const orchestrator = new AgenticOrchestrator(store, registry);

// ── System prompt for Module 1 LLM ──
const SYSTEM_PROMPT = `
You are the "Input Contract Module" (Module 1) for an Elite Web Scraping framework. 
Your goal is to parse the user's natural language requests and output STRICT JSON describing the constraints and targets for Module 2.

RULE 1: If the user HAS NOT specified a clear target website/domain to scrape (e.g. "Scrape shoes"), you MUST output ONLY a JSON object asking for clarification:
{
  "clarifying_question": "string (e.g., 'Which website did you want me to scrape these shoes from?')"
}

RULE 2: If the target domain IS clear and sufficient context exists, you MUST output the strict Data Payload matching this exact structure:
{
  "target": {
    "url_or_domain": "string (e.g. airindia.com)",
    "scope": "string (search_results | product_pages | category_pages | entire_site | unknown)"
  },
  "search_parameters": {},
  "intent_context": "string (Plain text summary of their goal)",
  "constraints": {
    "max_time_ms": 120000,
    "requires_js_rendering": true,
    "human_in_loop_required": false,
    "proxy_tier": "string (datacenter | residential | mobile | unknown) based on site difficulty",
    "anti_bot_risk": "string (low | medium | high | unknown) based on site defense",
    "authentication_required": false
  },
  "expected_schema": {
    "column_name": "datatype"
  }
}
DO NOT output conversational text, markdown blocks, or anything outside of the JSON object.
`;

// ── Express App ──
const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Swagger UI docs
if (swaggerUi && swaggerDocument) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

// ── Health check ──
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── The Core Module 1 API Gateway ──
app.post('/api/v1/intake', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "Invalid payload. Needs an array of chat 'messages'." });
    return;
  }

  const baseURL = process.env.MODEL_BASE_URL || 'http://192.168.1.16:1234';
  const endpoint = process.env.MODEL_CHAT_ENDPOINT || '/v1/chat/completions';
  const modelName = process.env.MODEL_NAME || 'qwen2.5-coder-7b-instruct';
  const customApiKey = process.env.MODEL_API_KEY || process.env.OPENROUTER_API_KEY || '';
  const targetUrl = `${baseURL}${endpoint}`;

  try {
    // Step 1: Forward to LLM using native fetch (ESM, no axios CJS dependency)
    const llmResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      }),
    });

    if (!llmResponse.ok) {
      throw new Error(`LLM API returned status ${llmResponse.status}`);
    }

    const data = await llmResponse.json() as { choices?: Array<{ message?: { content?: string } }> };
    const llmContent = data.choices?.[0]?.message?.content;
    if (!llmContent) {
      throw new Error('LLM response missing content');
    }

    logger.info('LLM response received', {
      model: modelName,
      responseLength: llmContent.length,
    });

    // Step 2: Extract JSON
    let parsedPayload: Record<string, unknown>;
    try {
      const startIndex = llmContent.indexOf('{');
      const endIndex = llmContent.lastIndexOf('}');
      if (startIndex === -1 || endIndex === -1) throw new Error('No JSON found');
      const cleanString = llmContent.substring(startIndex, endIndex + 1);
      parsedPayload = JSON.parse(cleanString);
    } catch {
      logger.error('LLM output parsing failed', new Error('Non-JSON output'), { raw: llmContent.slice(0, 200) });
      res.status(500).json({ error: 'LLM returned non-JSON output.', raw: llmContent });
      return;
    }

    // Step 3: Clarifying question check
    if (parsedPayload.clarifying_question) {
      res.status(200).json(parsedPayload);
      return;
    }

    // Step 4: Validate Module 1 payload
    const validatedPayload = JobRequestSchema.parse(parsedPayload);
    const eventId = `req-${uuidv4().substring(0, 8)}`;
    const normalizedConstraints: ValidatedInputEvent['payload']['constraints'] = {
      requires_js_rendering: validatedPayload.constraints.requires_js_rendering,
      human_in_loop_required: validatedPayload.constraints.human_in_loop_required,
      proxy_tier: validatedPayload.constraints.proxy_tier,
      anti_bot_risk: validatedPayload.constraints.anti_bot_risk,
      authentication_required: validatedPayload.constraints.authentication_required,
    };

    if (validatedPayload.constraints.max_time_ms !== undefined) {
      normalizedConstraints.max_time_ms = validatedPayload.constraints.max_time_ms;
    }

    const finalWorldModelEvent: ValidatedInputEvent = {
      event_id: eventId,
      event_type: 'INPUT_CONTRACT_VALIDATED',
      timestamp: new Date().toISOString(),
      payload: {
        target: {
          url_or_domain: validatedPayload.target.url_or_domain,
          scope: validatedPayload.target.scope,
        },
        search_parameters: validatedPayload.search_parameters ?? {},
        intent_context: validatedPayload.intent_context ?? '',
        constraints: normalizedConstraints,
        expected_schema: validatedPayload.expected_schema ?? {},
      },
      confidence_score: 1.0,
      justification: 'Requirement conversationally processed and structured via LLM Server.',
    };

    // Step 5: Direct orchestrator call (no child process bridge!)
    const workflowRun = await orchestrator.handleEventLoop(finalWorldModelEvent);

    res.status(200).json({
      module_1_event: finalWorldModelEvent,
      workflow_result: workflowRun,
      routing_decision: workflowRun.last_decision,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Intake request failed', error);
    res.status(500).json({ error: 'Fatal Internal Error processing LLM Intent.' });
  }
});

// ── Dashboard endpoint ──
app.get('/api/v1/dashboard', async (_req, res) => {
  try {
    const { buildDashboardSnapshot } = await import('./src/surface/dashboard.js');
    const snapshot = await buildDashboardSnapshot(store);
    res.json(snapshot);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Dashboard failed', error);
    res.status(500).json({ error: 'Failed to build dashboard snapshot.' });
  }
});

// ── Start Server ──
app.listen(Number(PORT), '0.0.0.0', () => {
  logger.info('Server started', { port: PORT, mode: useSupabase ? 'supabase' : 'in-memory' });
  console.log(`\n============================================`);
  console.log(`🚀 Agentic Kernel Server Running (ESM)`);
  console.log(`🔗 Local Testing:   http://localhost:${PORT}`);
  console.log(`🔗 Health Check:    http://localhost:${PORT}/api/v1/health`);
  if (swaggerUi && swaggerDocument) {
    console.log(`🔗 Swagger UI Docs: http://localhost:${PORT}/docs`);
  }
  console.log(`🔗 Dashboard:       http://localhost:${PORT}/api/v1/dashboard`);
  console.log(`============================================\n`);
});
