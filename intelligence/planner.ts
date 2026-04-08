import { CapabilityModule } from '../capabilities/types.js';
import { SituationalAwareness } from '../world_model/state_view.js';
import { WorldView } from '../world_model/schema.js';

export interface CapabilityDecision {
  capability: CapabilityModule;
  score: number;
  rationale: string;
}

export class DynamicPlanner {
  async chooseNext(world: WorldView, capabilities: CapabilityModule[]): Promise<CapabilityDecision | null> {
    const awareness = new SituationalAwareness(world);
    const missingGoals = awareness.getMissingGoalArtifacts();

    const scored = await Promise.all(
      capabilities.map(async (capability) => {
        const score = await capability.canHandle({
          store: undefined as never,
          task: world.task,
          world,
          input: world.task.input,
        });
        return { capability, score };
      }),
    );

    const viable = scored
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score);

    if (viable.length === 0) {
      return null;
    }

    const selected = viable[0];
    return {
      capability: selected.capability,
      score: selected.score,
      rationale: `Fallback planner selected '${selected.capability.descriptor.id}' because it can produce ${selected.capability.descriptor.outputs.join(', ')} while the goal still needs ${missingGoals.join(', ') || 'no additional artifacts'}.`,
    };
  }
}
