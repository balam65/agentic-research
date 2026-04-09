import type { CapabilityModule } from '../types.js';

const capability: CapabilityModule = {
  descriptor: {
    id: 'acquire_execution_context',
    version: '1.0.0',
    description: 'Acquires the minimally required runtime context such as proxy, identity, and budget window.',
    inputs: ['extraction_plan'],
    outputs: ['execution_session'],
    executionContract: 'Creates a reusable execution session artifact without assuming a fixed next step.',
    tags: ['runtime', 'execution'],
  },
  async canHandle(context) {
    const hasPlan = context.world.artifacts.some((artifact) => artifact.kind === 'extraction_plan');
    const hasSession = context.world.artifacts.some((artifact) => artifact.kind === 'execution_session');
    if (!hasPlan || hasSession) {
      return 0;
    }
    return 0.72;
  },
  async execute() {
    return {
      status: 'completed',
      reason: 'Execution context acquired.',
      artifacts: [
        {
          kind: 'execution_session',
          producedBy: 'acquire_execution_context',
          confidence: 1,
          content: {
            sessionType: 'browser_or_http',
            proxyProfile: 'adaptive_pool',
            retryBudget: 3,
          },
        },
      ],
      metrics: [
        {
          source: 'acquire_execution_context',
          name: 'session_allocation_ms',
          value: 12,
          unit: 'ms',
        },
      ],
    };
  },
};

export default capability;
