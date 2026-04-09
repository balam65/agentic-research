import { buildDashboardSnapshot } from './dashboard.js';
import { AgenticOrchestrator } from '../intelligence/orchestrator.js';
import { RoutingDecision, WorkflowEventInput } from '../world_model/schema.js';

export class SurfaceApi {
  constructor(private readonly orchestrator: AgenticOrchestrator) {}

  async submitRequest(event: WorkflowEventInput): Promise<RoutingDecision> {
    return this.orchestrator.handleEvent(event);
  }

  getDashboardSnapshot() {
    return buildDashboardSnapshot(this.orchestrator.getStore());
  }
}
