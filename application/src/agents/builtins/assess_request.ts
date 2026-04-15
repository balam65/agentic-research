import type { WorldView, TaskRecord } from '../../memory/schema.js';

export async function canHandle(context: { world: WorldView; task: TaskRecord }): Promise<number> {
  if (context.task.status === 'submitted' || context.task.status === 'active') {
    return 0.9;
  }
  return 0.1;
}
