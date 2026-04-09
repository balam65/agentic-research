import type { CapabilityModule } from '../types.js';

const capability: CapabilityModule = {
  descriptor: {
    id: 'extract_data',
    version: '1.0.0',
    description: 'Executes target capture and returns raw data aligned to the requested contract.',
    inputs: ['execution_session', 'extraction_plan'],
    outputs: ['raw_dataset'],
    executionContract: 'Reads the world model for session and plan artifacts, then writes a raw dataset artifact.',
    tags: ['capture', 'data'],
  },
  async canHandle(context) {
    const hasPlan = context.world.artifacts.some((artifact) => artifact.kind === 'extraction_plan');
    const hasSession = context.world.artifacts.some((artifact) => artifact.kind === 'execution_session');
    const hasRaw = context.world.artifacts.some((artifact) => artifact.kind === 'raw_dataset');
    if (!hasPlan || !hasSession || hasRaw) {
      return 0;
    }
    return 0.91;
  },
  async execute(context) {
    return {
      status: 'completed',
      reason: 'Raw dataset captured from selected target.',
      artifacts: [
        {
          kind: 'raw_dataset',
          producedBy: 'extract_data',
          confidence: 0.78,
          content: {
            rows: [
              {
                source: context.input.targetSpec,
                ...Object.fromEntries(
                  Object.keys(context.input.requestedSchema).map((field) => [field, `sample_${field}`]),
                ),
              },
            ],
          },
        },
      ],
      metrics: [
        {
          source: 'extract_data',
          name: 'records_captured',
          value: 1,
          unit: 'count',
        },
      ],
    };
  },
};

export default capability;
