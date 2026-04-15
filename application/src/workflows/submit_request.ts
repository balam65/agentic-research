import 'dotenv/config';

import { createLogger } from '../logs/logger.js';
import { WorldModelStore } from '../memory/world_model_store.js';
import { SupabaseDurableStatePort } from '../memory/supabase_durable_port.js';
import { CapabilityRegistry } from '../core/capability_registry_loader.js';
import { AgenticOrchestrator } from '../core/orchestrator.js';
import { assertWorkflowEventInput } from '../core/event_validator.js';

const logger = createLogger('submit-request');

async function main(): Promise<void> {
  const raw = await readStdin();
  const parsed = JSON.parse(raw);
  assertWorkflowEventInput(parsed);

  const useSupabase =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const persistence = useSupabase
    ? new SupabaseDurableStatePort(
        (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL)!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      )
    : undefined;

  const store = new WorldModelStore(persistence);
  const registry = new CapabilityRegistry(
    new URL('../context/capability-manifest.json', import.meta.url),
  );
  const orchestrator = new AgenticOrchestrator(store, registry);

  logger.info('Processing incoming event', { eventType: parsed.event_type });
  const result = await orchestrator.handleEventLoop(parsed);

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  logger.info('Workflow completed', {
    workflowId: result.workflow_id,
    terminal: result.terminal,
  });
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

main().catch((error) => {
  logger.error('Submit request failed', error instanceof Error ? error : new Error(String(error)));
  process.exitCode = 1;
});
