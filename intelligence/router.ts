import { CapabilityModule } from '../capabilities/types.js';
import {
  RoutingDecision,
  RoutingEventType,
  WorkflowEventInput,
  WorkflowStatus,
} from '../world_model/schema.js';

function nowIso(): string {
  return new Date().toISOString();
}

function capabilityToRoutingEvent(capability: CapabilityModule): RoutingEventType {
  const tags = new Set(capability.descriptor.tags.map((tag) => tag.toLowerCase()));
  if (tags.has('discovery') || tags.has('targeting')) {
    return 'DISCOVERY_REQUIRED';
  }
  if (tags.has('extraction') || tags.has('capture') || tags.has('runtime')) {
    return 'EXTRACTION_REQUIRED';
  }
  if (tags.has('validation') || tags.has('governance')) {
    return 'QA_REQUIRED';
  }
  return 'CAPABILITY_EXECUTION_REQUIRED';
}

export class DynamicRouter {
  createDecision(params: {
    workflowId: string;
    selectedCapability: CapabilityModule | null;
    reasoning: string;
    confidence: number;
    requiresHumanReview: boolean;
    event: WorkflowEventInput;
    decisionSource?: RoutingDecision['decision_source'];
    status?: WorkflowStatus;
    nextEventOverride?: RoutingEventType;
  }): RoutingDecision {
    const status = params.status ?? (params.requiresHumanReview ? 'waiting_for_human' : 'in_progress');
    const decisionSource = params.decisionSource ?? 'control_policy';

    if (params.nextEventOverride) {
      return {
        workflow_id: params.workflowId,
        next_event: params.nextEventOverride,
        target_module: params.selectedCapability?.descriptor.id ?? null,
        decision_source: decisionSource,
        status,
        reasoning: params.reasoning,
        requires_human_review: params.requiresHumanReview,
        confidence: Math.max(0, Math.min(1, params.confidence)),
        decided_at: nowIso(),
      };
    }

    if (!params.selectedCapability) {
      return {
        workflow_id: params.workflowId,
        next_event: 'WORKFLOW_FAILED',
        target_module: null,
        decision_source: decisionSource,
        status: 'failed',
        reasoning: `${params.reasoning} No valid capability target is currently available.`,
        requires_human_review: false,
        confidence: Math.max(0, Math.min(1, params.confidence)),
        decided_at: nowIso(),
      };
    }

    return {
      workflow_id: params.workflowId,
      next_event: capabilityToRoutingEvent(params.selectedCapability),
      target_module: params.selectedCapability.descriptor.id,
      decision_source: decisionSource,
      status,
      reasoning: params.reasoning,
      requires_human_review: params.requiresHumanReview,
      confidence: Math.max(0, Math.min(1, params.confidence)),
      decided_at: nowIso(),
    };
  }
}
