import type {
  DownstreamWorkflowEvent,
  RoutingDecision,
  ValidatedInputEvent,
  WorkflowEventInput,
} from '../world_model/schema.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isRecord(value)) return false;
  return Object.values(value).every((item) => typeof item === 'string');
}

function isValidatedInputEvent(value: unknown): value is ValidatedInputEvent {
  if (!isRecord(value)) return false;
  if (value.event_type !== 'INPUT_CONTRACT_VALIDATED') return false;
  if (typeof value.event_id !== 'string' || typeof value.timestamp !== 'string') return false;
  if (typeof value.confidence_score !== 'number' || typeof value.justification !== 'string') return false;
  if (!isRecord(value.payload)) return false;
  if (!isRecord(value.payload.target) || typeof value.payload.target.url_or_domain !== 'string') return false;
  if (typeof value.payload.target.scope !== 'string') return false;
  if (!isRecord(value.payload.constraints)) return false;
  if (!isStringRecord(value.payload.expected_schema)) return false;

  if ('search_parameters' in value.payload && !isRecord(value.payload.search_parameters)) return false;
  if (typeof value.payload.intent_context !== 'string') return false;

  return true;
}

function isDownstreamWorkflowEvent(value: unknown): value is DownstreamWorkflowEvent {
  if (!isRecord(value)) return false;
  if (typeof value.event_id !== 'string') return false;
  if (typeof value.workflow_id !== 'string') return false;
  if (typeof value.event_type !== 'string') return false;
  if (typeof value.timestamp !== 'string') return false;
  if (typeof value.justification !== 'string') return false;
  if (!isRecord(value.payload)) return false;

  if ('module' in value.payload && value.payload.module !== undefined && typeof value.payload.module !== 'string') {
    return false;
  }
  if ('stage' in value.payload && value.payload.stage !== undefined && typeof value.payload.stage !== 'string') {
    return false;
  }
  if ('reason' in value.payload && value.payload.reason !== undefined && typeof value.payload.reason !== 'string') {
    return false;
  }
  if ('artifacts' in value.payload && value.payload.artifacts !== undefined && !Array.isArray(value.payload.artifacts)) {
    return false;
  }
  if ('metrics' in value.payload && value.payload.metrics !== undefined && !Array.isArray(value.payload.metrics)) {
    return false;
  }
  if ('metadata' in value.payload && value.payload.metadata !== undefined && !isRecord(value.payload.metadata)) {
    return false;
  }
  if ('confidence_score' in value && value.confidence_score !== undefined && typeof value.confidence_score !== 'number') {
    return false;
  }

  return true;
}

export function assertWorkflowEventInput(value: unknown): asserts value is WorkflowEventInput {
  if (isValidatedInputEvent(value) || isDownstreamWorkflowEvent(value)) {
    return;
  }
  throw new Error('Invalid WorkflowEventInput payload');
}

export function assertRoutingDecision(value: unknown): asserts value is RoutingDecision {
  if (!isRecord(value)) {
    throw new Error('RoutingDecision must be an object');
  }

  const allowedDecisionSources = new Set(['model', 'control_policy']);
  const allowedStatuses = new Set(['submitted', 'in_progress', 'waiting_for_human', 'completed', 'failed', 'blocked']);

  if (typeof value.workflow_id !== 'string') throw new Error('RoutingDecision.workflow_id is required');
  if (typeof value.next_event !== 'string') throw new Error('RoutingDecision.next_event is required');
  if (!(typeof value.target_module === 'string' || value.target_module === null)) {
    throw new Error('RoutingDecision.target_module must be a string or null');
  }
  if (!allowedDecisionSources.has(String(value.decision_source))) {
    throw new Error('RoutingDecision.decision_source is invalid');
  }
  if (!allowedStatuses.has(String(value.status))) {
    throw new Error('RoutingDecision.status is invalid');
  }
  if (typeof value.reasoning !== 'string') throw new Error('RoutingDecision.reasoning is required');
  if (typeof value.requires_human_review !== 'boolean') {
    throw new Error('RoutingDecision.requires_human_review must be boolean');
  }
  if (typeof value.confidence !== 'number' || Number.isNaN(value.confidence)) {
    throw new Error('RoutingDecision.confidence must be numeric');
  }
  if (typeof value.decided_at !== 'string') throw new Error('RoutingDecision.decided_at is required');
}
