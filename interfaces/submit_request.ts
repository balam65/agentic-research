import { randomUUID } from 'node:crypto';

import { CapabilityRegistry } from '../capabilities/registry.js';
import { AgenticOrchestrator } from '../intelligence/orchestrator.js';
import { WorldModelStore } from '../world_model/event_store.js';
import { ValidatedInputEvent } from '../world_model/schema.js';

async function main(): Promise<void> {
  const store = new WorldModelStore();
  const registry = new CapabilityRegistry(new URL('../context/capability-manifest.json', import.meta.url));
  const orchestrator = new AgenticOrchestrator(store, registry);
  await orchestrator.boot();

  const event: ValidatedInputEvent = {
    event_id: randomUUID(),
    event_type: 'INPUT_CONTRACT_VALIDATED',
    timestamp: new Date().toISOString(),
    payload: {
      target: {
        url_or_domain: 'https://example.com/hotels',
        scope: 'product_pages',
      },
      constraints: {
        max_budget: 50,
        max_time_ms: 300000,
        requires_js_rendering: true,
        human_in_loop_required: false,
      },
      expected_schema: {
        hotel_name: 'string',
        price: 'string',
      },
    },
    confidence_score: 1,
    justification: 'CLI demo input contract.',
  };

  const decision = await orchestrator.handleEvent(event);
  console.log(JSON.stringify(decision, null, 2));
}

void main();
