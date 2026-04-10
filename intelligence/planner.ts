import { CapabilityModule } from '../capabilities/types.js';
import { SituationalAwareness } from '../world_model/state_view.js';
import { WorldView } from '../world_model/schema.js';

export interface CapabilityDecision {
  capability: CapabilityModule;
  score: number;
  rationale: string;
}

function normalizeAdvisoryScore(rawScore: number, outputsMatchGoal: boolean): number {
  if (Number.isNaN(rawScore) || rawScore < 0) {
    return outputsMatchGoal ? 0.35 : 0.15;
  }
  if (rawScore === 0) {
    return outputsMatchGoal ? 0.4 : 0.2;
  }
  return Math.min(1, Math.max(0.1, rawScore));
}

export class DynamicPlanner {
  async scoreCapabilities(world: WorldView, capabilities: CapabilityModule[]): Promise<CapabilityDecision[]> {
    const awareness = new SituationalAwareness(world);
    const missingGoals = awareness.getMissingGoalArtifacts();

    const scored = await Promise.all(
      capabilities.map(async (capability) => {
        const rawScore = await capability.canHandle({
          store: undefined as never,
          task: world.task,
          world,
          input: world.task.input,
        });
        const outputsMatchGoal = capability.descriptor.outputs.some((output) => missingGoals.includes(output));
        return {
          capability,
          score: normalizeAdvisoryScore(rawScore, outputsMatchGoal),
          outputsMatchGoal,
        };
      }),
    );

    return scored
      .sort((left, right) => right.score - left.score)
      .map((entry) => ({
        capability: entry.capability,
        score: entry.score,
        rationale: `Planner advisory for '${entry.capability.descriptor.id}' is ${entry.score.toFixed(2)} with missing goals: ${missingGoals.join(', ') || 'none'} and output overlap ${entry.outputsMatchGoal ? 'present' : 'absent'}.`,
      }));
  }

  async chooseNext(world: WorldView, capabilities: CapabilityModule[]): Promise<CapabilityDecision | null> {
    const awareness = new SituationalAwareness(world);
    const missingGoals = awareness.getMissingGoalArtifacts();
    const viable = await this.scoreCapabilities(world, capabilities);
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
