import type { WorldView, TaskRecord } from '../../memory/schema.js';

export async function canHandle(context: { world: WorldView; task: TaskRecord }): Promise<number> {
  const hasRawData = context.world.artifacts.some(a => a.kind === 'raw_dataset');
  return hasRawData ? 0.9 : 0.05;
}
