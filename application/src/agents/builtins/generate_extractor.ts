import type { WorldView, TaskRecord } from '../../memory/schema.js';

export async function canHandle(context: { world: WorldView; task: TaskRecord }): Promise<number> {
  const hasCandidates = context.world.artifacts.some(a => a.kind === 'candidate_targets');
  return hasCandidates ? 0.85 : 0.2;
}
