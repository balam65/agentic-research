import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { CapabilityRegistry } from '../capabilities/registry.js';
import { AgenticOrchestrator } from '../intelligence/orchestrator.js';
import { WorldModelStore } from '../world_model/event_store.js';
import { ValidatedInputEvent } from '../world_model/schema.js';

// Redirect all informative console outputs to stderr to avoid corrupting stdout JSON payloads
const originalLog = console.log;
console.log = console.error;
console.info = console.error;
console.debug = console.error;
console.warn = console.error;

async function main(): Promise<void> {
  const store = new WorldModelStore();
  const registry = new CapabilityRegistry(new URL('../context/capability-manifest.json', import.meta.url));
  const orchestrator = new AgenticOrchestrator(store, registry);
  await orchestrator.boot();

  // Read the incoming ValidatedInputEvent piped from the router (via stdin)
  const stdinPayload = readFileSync(0, 'utf8');
  let event: ValidatedInputEvent;
  
  if (!stdinPayload.trim()) {
    throw new Error('No ValidatedInputEvent received via stdin. Are you running this via the router bridge?');
  } else {
    event = JSON.parse(stdinPayload);
  }

  const decision = await orchestrator.handleEvent(event);
  
  // Output solely the final decision JSON to stdout so the router can parse it properly
  process.stdout.write(JSON.stringify(decision));
}

void main();
