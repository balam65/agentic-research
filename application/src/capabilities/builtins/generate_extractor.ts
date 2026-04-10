import { WorldView, TaskRecord } from '../../world_model/schema';

export const canHandle = async (context: { world: WorldView, task: TaskRecord }): Promise<number> => {
  const hasTargets = context.world.artifacts.some(a => a.kind === 'candidate_targets');
  const hasPlan = context.world.artifacts.some(a => a.kind === 'extraction_plan');
  return (hasTargets && !hasPlan) ? 0.92 : 0;
};
