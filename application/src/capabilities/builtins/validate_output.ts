import { WorldView, TaskRecord } from '../../world_model/schema';

export const canHandle = async (context: { world: WorldView, task: TaskRecord }): Promise<number> => {
  const hasData = context.world.artifacts.some(a => a.kind === 'raw_dataset');
  const hasValid = context.world.artifacts.some(a => a.kind === 'validated_dataset');
  return (hasData && !hasValid) ? 0.85 : 0;
};
