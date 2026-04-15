import type { WorldView, TaskRecord } from '../../memory/schema.js';

export async function canHandle(context: { world: WorldView; task: TaskRecord }): Promise<number> {
  const hasPlan = context.world.artifacts.some(a => a.kind === 'extraction_plan');
  return hasPlan ? 0.85 : 0.15;
}
