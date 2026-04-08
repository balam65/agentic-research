import { randomUUID } from 'node:crypto';

import { CapabilityRegistry } from '../capabilities/registry.js';
import { AgenticOrchestrator } from '../intelligence/orchestrator.js';
import { WorldModelStore } from '../world_model/event_store.js';

async function main(): Promise<void> {
  const store = new WorldModelStore();
  const registry = new CapabilityRegistry(new URL('../context/capability-manifest.json', import.meta.url));
  const orchestrator = new AgenticOrchestrator(store, registry);
  await orchestrator.boot();

  const taskId = await orchestrator.submit({
    requestId: randomUUID(),
    targetSpec: 'https://example.com/hotels',
    requestedSchema: {
      hotel_name: 'string',
      price: 'string',
    },
    constraints: {
      maxRecords: 10,
      deliveryMode: 'webhook',
      humanReviewAllowed: true,
    },
  });

  const output = await orchestrator.run(taskId);
  console.log(JSON.stringify(output, null, 2));
}

void main();
