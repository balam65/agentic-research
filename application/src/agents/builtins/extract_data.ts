import type { WorldView, TaskRecord } from '../../memory/schema.js';

export async function canHandle(context: { world: WorldView; task: TaskRecord }): Promise<number> {
  const hasSession = context.world.artifacts.some(a => a.kind === 'execution_session');
  return hasSession ? 0.9 : 0.1;
}
