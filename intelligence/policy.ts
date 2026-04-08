import { WorldView } from '../world_model/schema.js';

export class GovernancePolicy {
  shouldStop(world: WorldView): { stop: boolean; reason: string } {
    if (world.task.status === 'waiting_for_human') {
      return { stop: true, reason: 'Execution paused for human review.' };
    }
    if (world.task.status === 'failed') {
      return { stop: true, reason: 'Execution stopped because the task failed.' };
    }
    return { stop: false, reason: 'Execution may continue.' };
  }
}
