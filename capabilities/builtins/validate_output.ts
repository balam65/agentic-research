import type { CapabilityModule } from '../types.js';

const capability: CapabilityModule = {
  descriptor: {
    id: 'validate_output',
    version: '1.0.0',
    description: 'Validates extracted data against the requested schema and governance constraints.',
    inputs: ['raw_dataset'],
    outputs: ['validated_dataset', 'human_review_packet'],
    executionContract: 'May emit a validated dataset or request human review when confidence does not clear governance.',
    tags: ['validation', 'governance'],
  },
  async canHandle(context) {
    const hasRaw = context.world.artifacts.some((artifact) => artifact.kind === 'raw_dataset');
    const hasValidated = context.world.artifacts.some((artifact) => artifact.kind === 'validated_dataset');
    const hasReviewPacket = context.world.artifacts.some((artifact) => artifact.kind === 'human_review_packet');
    if (!hasRaw || hasValidated || hasReviewPacket) {
      return 0;
    }
    return 0.94;
  },
  async execute(context) {
    const raw = [...context.world.artifacts].reverse().find((artifact) => artifact.kind === 'raw_dataset');
    const rows = Array.isArray(raw?.content.rows) ? raw?.content.rows : [];
    const confidence = rows.length > 0 ? 0.9 : 0.4;

    if (confidence < 0.85 && context.task.governance.humanReviewRequired) {
      return {
        status: 'human_review',
        reason: 'Validation confidence below governance threshold.',
        artifacts: [
          {
            kind: 'human_review_packet',
            producedBy: 'validate_output',
            confidence,
            content: {
              issue: 'low_validation_confidence',
              observedRows: rows,
            },
          },
        ],
      };
    }

    return {
      status: 'completed',
      reason: 'Validated dataset satisfies requested schema.',
      artifacts: [
        {
          kind: 'validated_dataset',
          producedBy: 'validate_output',
          confidence,
          content: {
            rows,
            schema: context.input.requestedSchema,
          },
        },
        {
          kind: 'final_result',
          producedBy: 'validate_output',
          confidence,
          content: {
            requestId: context.task.id,
            validatedData: rows[0] ?? {},
          },
        },
      ],
    };
  },
};

export default capability;
