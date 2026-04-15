import { buildDashboardSnapshot } from './dashboard.js';
import { AgenticOrchestrator } from '../core/orchestrator.js';
import { RoutingDecision, WorkflowEventInput } from '../memory/schema.js';

export class SurfaceApi {
  constructor(private readonly orchestrator: AgenticOrchestrator) {}

  async submitRequest(event: WorkflowEventInput): Promise<RoutingDecision> {
    return this.orchestrator.handleEvent(event);
  }

  getDashboardSnapshot() {
    return buildDashboardSnapshot(this.orchestrator.getStore());
  }
}
