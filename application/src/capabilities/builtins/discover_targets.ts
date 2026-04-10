import { WorldView, TaskRecord } from '../../world_model/schema';

export const canHandle = async (context: { world: WorldView, task: TaskRecord }): Promise<number> => {
  const hasIntent = context.world.artifacts.some(a => a.kind === 'intent_profile');
  const hasTargets = context.world.artifacts.some(a => a.kind === 'candidate_targets');
  // Only search if we have an intent but no targets
  return (hasIntent && !hasTargets) ? 0.95 : 0;
};
