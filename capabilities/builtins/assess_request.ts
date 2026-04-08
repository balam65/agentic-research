import type { CapabilityModule } from '../types.js';

const capability: CapabilityModule = {
  descriptor: {
    id: 'assess_request',
    version: '1.0.0',
    description: 'Transforms the external request into a reusable intent profile for downstream reasoning.',
    inputs: ['targetSpec', 'requestedSchema', 'constraints'],
    outputs: ['intent_profile'],
    executionContract: 'Reads only the non-negotiable request contract and emits one intent_profile artifact.',
    tags: ['contract', 'assessment'],
  },
  async canHandle(context) {
    const hasIntentProfile = context.world.artifacts.some((artifact) => artifact.kind === 'intent_profile');
    return hasIntentProfile ? 0 : 0.95;
  },
  async execute(context) {
    return {
      status: 'completed',
      reason: 'Request normalized into an intent profile.',
      artifacts: [
        {
          kind: 'intent_profile',
          producedBy: 'assess_request',
          confidence: 0.97,
          content: {
            targetSpec: context.input.targetSpec,
            normalizedGoal: 'validated delivered dataset',
            requestedSchema: context.input.requestedSchema,
            constraints: context.input.constraints,
          },
        },
      ],
    };
  },
};

export default capability;
