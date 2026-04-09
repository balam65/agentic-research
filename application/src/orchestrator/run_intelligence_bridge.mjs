import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const baseDir = resolve(import.meta.dirname, '../../..');
const registryModule = await import(pathToFileURL(resolve(baseDir, 'capabilities/registry.ts')).href);
const orchestratorModule = await import(pathToFileURL(resolve(baseDir, 'intelligence/orchestrator.ts')).href);
const eventStoreModule = await import(pathToFileURL(resolve(baseDir, 'world_model/event_store.ts')).href);

const { CapabilityRegistry } = registryModule;
const { AgenticOrchestrator } = orchestratorModule;
const { WorldModelStore } = eventStoreModule;

const stdin = await readFile(process.stdin.fd, 'utf8');
const event = JSON.parse(stdin);

const store = new WorldModelStore();
const registry = new CapabilityRegistry(
  pathToFileURL(resolve(baseDir, 'context/capability-manifest.json')),
);
const orchestrator = new AgenticOrchestrator(store, registry);

await orchestrator.boot();

const decision = await orchestrator.handleEvent(event);
process.stdout.write(JSON.stringify(decision));
