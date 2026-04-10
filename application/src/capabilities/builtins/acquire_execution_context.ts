import { WorldView, TaskRecord } from '../../world_model/schema';

export const canHandle = async (context: { world: WorldView, task: TaskRecord }): Promise<number> => {
  const hasPlan = context.world.artifacts.some(a => a.kind === 'extraction_plan');
  const hasSession = context.world.artifacts.some(a => a.kind === 'execution_session');
  return (hasPlan && !hasSession) ? 0.9 : 0;
};
