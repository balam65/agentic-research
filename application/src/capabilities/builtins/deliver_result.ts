import { WorldView, TaskRecord } from '../../world_model/schema';

export const canHandle = async (context: { world: WorldView, task: TaskRecord }): Promise<number> => {
  const hasValid = context.world.artifacts.some(a => a.kind === 'validated_dataset');
  const hasReceipt = context.world.artifacts.some(a => a.kind === 'delivery_receipt');
  return (hasValid && !hasReceipt) ? 0.98 : 0;
};
