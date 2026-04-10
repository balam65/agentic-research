import { WorldView, TaskRecord } from '../../world_model/schema';

export const canHandle = async (context: { world: WorldView, task: TaskRecord }): Promise<number> => {
  const hasIntent = context.world.artifacts.some(a => a.kind === 'intent_profile');
  // Assess request is the very first step. If no intent profile exists, it's high priority.
  return hasIntent ? 0 : 1.0;
};
