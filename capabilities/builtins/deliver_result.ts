import type { CapabilityModule } from '../types.js';

const capability: CapabilityModule = {
  descriptor: {
    id: 'deliver_result',
    version: '1.0.0',
    description: 'Delivers validated output using the delivery mode specified in the request contract.',
    inputs: ['validated_dataset'],
    outputs: ['delivery_receipt'],
    executionContract: 'Reads delivery preference from the non-negotiable request contract and writes a delivery receipt.',
    tags: ['delivery', 'output'],
  },
  async canHandle(context) {
    const hasValidated = context.world.artifacts.some((artifact) => artifact.kind === 'validated_dataset');
    const hasReceipt = context.world.artifacts.some((artifact) => artifact.kind === 'delivery_receipt');
    const deliveryRequested = Boolean(context.input.constraints.deliveryMode);
    if (!hasValidated || hasReceipt || !deliveryRequested) {
      return 0;
    }
    return 0.89;
  },
  async execute(context) {
    return {
      status: 'completed',
      reason: 'Validated output delivered through requested interface.',
      artifacts: [
        {
          kind: 'delivery_receipt',
          producedBy: 'deliver_result',
          confidence: 1,
          content: {
            mode: context.input.constraints.deliveryMode,
            deliveredAt: new Date().toISOString(),
          },
        },
      ],
      metrics: [
        {
          source: 'deliver_result',
          name: 'delivery_attempts',
          value: 1,
          unit: 'count',
        },
      ],
    };
  },
};

export default capability;
