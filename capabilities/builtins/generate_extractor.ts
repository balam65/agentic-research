import type { CapabilityModule } from '../types.js';

const capability: CapabilityModule = {
  descriptor: {
    id: 'generate_extractor',
    version: '1.0.0',
    description: 'Builds an execution plan and extraction contract for whichever target best fits the request.',
    inputs: ['candidate_targets', 'requestedSchema'],
    outputs: ['extraction_plan'],
    executionContract: 'Consumes target candidates and emits an extraction plan artifact, not a fixed stage transition.',
    tags: ['planning', 'extraction'],
  },
  async canHandle(context) {
    const hasTargets = context.world.artifacts.some((artifact) => artifact.kind === 'candidate_targets');
    const hasPlan = context.world.artifacts.some((artifact) => artifact.kind === 'extraction_plan');
    if (!hasTargets || hasPlan) {
      return 0;
    }
    return 0.84;
  },
  async execute(context) {
    const targetArtifact = [...context.world.artifacts].reverse().find((artifact) => artifact.kind === 'candidate_targets');

    return {
      status: 'completed',
      reason: 'Extraction plan synthesized from discovered targets.',
      artifacts: [
        {
          kind: 'extraction_plan',
          producedBy: 'generate_extractor',
          confidence: 0.86,
          content: {
            selectedTarget: targetArtifact?.content ?? {},
            schema: context.input.requestedSchema,
            executionMode: 'adaptive_web_capture',
          },
        },
      ],
    };
  },
};

export default capability;
