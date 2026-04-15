import type { WorldView, TaskRecord } from '../../memory/schema.js';

export async function canHandle(context: { world: WorldView; task: TaskRecord }): Promise<number> {
  const hasAssessment = context.world.artifacts.some(a => a.kind === 'intent_profile');
  return hasAssessment ? 0.85 : 0.3;
}
