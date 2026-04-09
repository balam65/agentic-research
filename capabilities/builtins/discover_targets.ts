import type { CapabilityModule } from '../types.js';

const capability: CapabilityModule = {
  descriptor: {
    id: 'discover_targets',
    version: '1.0.0',
    description: 'Discovers candidate source targets from the request and intent profile.',
    inputs: ['intent_profile'],
    outputs: ['candidate_targets'],
    executionContract: 'Requires an intent profile and returns domain-agnostic candidate targets.',
    tags: ['discovery', 'targeting'],
  },
  async canHandle(context) {
    const hasIntent = context.world.artifacts.some((artifact) => artifact.kind === 'intent_profile');
    const hasTargets = context.world.artifacts.some((artifact) => artifact.kind === 'candidate_targets');
    if (!hasIntent || hasTargets) {
      return 0;
    }
    return 0.88;
  },
  async execute(context) {
    return {
      status: 'completed',
      reason: 'Candidate targets discovered from target specification.',
      artifacts: [
        {
          kind: 'candidate_targets',
          producedBy: 'discover_targets',
          confidence: 0.81,
          content: {
            candidates: [
              {
                uri: context.input.targetSpec,
                sourceType: 'web',
                evidence: 'Derived from non-negotiable target specification',
              },
            ],
          },
        },
      ],
    };
  },
};

export default capability;
