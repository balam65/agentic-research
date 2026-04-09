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
    event_id: `req-${randomUUID().slice(0, 8)}`,
    event_type: 'INPUT_CONTRACT_VALIDATED',
    timestamp: new Date().toISOString(),
    payload: {
      target: {
        url_or_domain: 'qatarairways.com',
        scope: 'search_results',
      },
      search_parameters: {
        origin: 'Cochin',
        destination: 'Dubai',
        departure_date: '10.04.2026',
      },
      intent_context:
        'User wants to scrape flight details of Qatar Airways from Cochin to Dubai on 10th April 2026.',
      constraints: {
        max_time_ms: 120000,
        requires_js_rendering: true,
        human_in_loop_required: false,
        proxy_tier: 'residential',
        anti_bot_risk: 'high',
        authentication_required: false,
      },
      expected_schema: {
        flight_number: 'string',
        departure_time: 'string',
        arrival_time: 'string',
        duration: 'string',
        price: 'number',
        availability: 'boolean',
      },
    },
    confidence_score: 1,
    justification: 'Requirement conversationally processed and structured via LLM Intake Gateway.',
  };

  const decision = await orchestrator.handleEvent(event);
  console.log(JSON.stringify(decision, null, 2));
}

void main();
