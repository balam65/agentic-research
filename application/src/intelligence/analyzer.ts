import { WorkflowEventInput } from '../world_model/schema.js';

export interface WorkflowAnalysis {
  workflowId: string;
  confidence: number;
  summary: string;
  requiresHumanReviewNow: boolean;
  hardStops: string[];
}

function clampConfidence(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

export class RequestAnalyzer {
  analyze(event: WorkflowEventInput): WorkflowAnalysis {
    if (event.event_type === 'INPUT_CONTRACT_VALIDATED') {
      const constraints = event.payload.constraints;
      const hardStops: string[] = [];

      if (!event.payload.target.url_or_domain) {
        hardStops.push('Target URL or domain is missing.');
      }
      if (!event.payload.expected_schema || Object.keys(event.payload.expected_schema).length === 0) {
        hardStops.push('Expected schema is missing.');
      }

      return {
        workflowId: event.event_id,
        confidence: clampConfidence(event.confidence_score),
        summary: `Validated input accepted for target '${event.payload.target.url_or_domain}' with scope '${event.payload.target.scope}'.`,
        requiresHumanReviewNow: constraints.human_in_loop_required === true,
        hardStops,
      };
    }

    return {
      workflowId: event.workflow_id,
      confidence: clampConfidence(event.confidence_score),
      summary: `Downstream event '${event.event_type}' received${event.payload.module ? ` from '${event.payload.module}'` : ''}.`,
      requiresHumanReviewNow: event.event_type === 'HITL_REJECTED',
      hardStops: [],
    };
  }
}
