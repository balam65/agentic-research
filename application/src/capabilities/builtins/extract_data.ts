import { WorldView, TaskRecord } from '../../world_model/schema';

export const canHandle = async (context: { world: WorldView, task: TaskRecord }): Promise<number> => {
  const hasSession = context.world.artifacts.some(a => a.kind === 'execution_session');
  const hasData = context.world.artifacts.some(a => a.kind === 'raw_dataset');
  return (hasSession && !hasData) ? 0.88 : 0;
};
