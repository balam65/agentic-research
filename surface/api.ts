import { buildDashboardSnapshot } from './dashboard.js';
import { AgenticOrchestrator } from '../intelligence/orchestrator.js';
import { NonNegotiableInput, NonNegotiableOutput } from '../world_model/schema.js';

export class SurfaceApi {
  constructor(private readonly orchestrator: AgenticOrchestrator) {}

  async submitRequest(input: NonNegotiableInput): Promise<NonNegotiableOutput> {
    const taskId = await this.orchestrator.submit(input);
    return this.orchestrator.run(taskId);
  }

  getDashboardSnapshot() {
    return buildDashboardSnapshot(this.orchestrator.getStore());
  }
}
