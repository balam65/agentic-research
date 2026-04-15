import type { WorldView, TaskRecord } from '../../memory/schema.js';

export async function canHandle(context: { world: WorldView; task: TaskRecord }): Promise<number> {
  const hasValidated = context.world.artifacts.some(a => a.kind === 'validated_dataset');
  return hasValidated ? 0.95 : 0.05;
}
