import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

import { CapabilityRegistry } from '../../../capabilities/registry.js';
import { AgenticOrchestrator } from '../../../intelligence/orchestrator.js';
import { WorldModelStore } from '../../../world_model/event_store.js';

interface LegacyWorldModelEvent {
  source_agent_run_id: string;
  payload: Record<string, unknown>;
}

/**
 * Legacy adapter kept only for compatibility with the older application surface.
 * The actual routing strategy now lives in the root intelligence layer and is
 * selected dynamically from world state plus discovered capabilities.
 */
export class OrchestratorRouter {
  private readonly store = new WorldModelStore();
  private readonly registry = new CapabilityRegistry(
    pathToFileURL(`${process.cwd()}/context/capability-manifest.json`),
  );
  private readonly orchestrator = new AgenticOrchestrator(this.store, this.registry);
  private bootPromise: Promise<void> | null = null;

  async handleEvent(event: LegacyWorldModelEvent) {
    if (!this.bootPromise) {
      this.bootPromise = this.orchestrator.boot();
    }
    await this.bootPromise;

    const taskId = event.source_agent_run_id || randomUUID();
    const targetSpec = String(event.payload?.raw_target ?? event.payload?.targetSpec ?? 'unknown-target');
    const requestedSchema =
      (event.payload?.requested_schema as Record<string, string> | undefined) ?? { output: 'string' };
    await this.orchestrator.submit({
      requestId: taskId,
      targetSpec,
      requestedSchema,
      constraints: event.payload?.constraints ?? { humanReviewAllowed: true },
    });

    return this.orchestrator.run(taskId);
  }
}
