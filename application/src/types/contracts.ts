import type { CapabilityContext } from "../runtime/context";

export interface PipelineInput {
  target_domain: string;
  extracted_schema_definition: Record<string, string | object>;
  budget_or_time_constraints: { max_pages?: number; max_minutes?: number; max_budget?: number; timeout_ms?: number };
  upstream_context?: {
    workflow_id?: string;
    decision_id?: string;
    target_capability?: string;
    next_task?: string;
    reasoning?: string;
    confidence?: number;
    trace_id?: string;
    correlation_id?: string;
    source_module?: string;
    requires_js_rendering?: boolean;
    target_url?: string;
  };
}

export interface Module2ExecutionRequest {
  workflow_id: string;
  decision_id: string;
  event_type: string;
  next_task: string;
  target_capability: string;
  input_context: {
    target_url: string;
    scope?: string;
    requires_js_rendering?: boolean;
    max_budget?: number;
    max_time_ms?: number;
    expected_schema: Record<string, string | object>;
  };
  constraints?: {
    timeout_ms?: number;
    budget?: number;
  };
  reasoning?: string;
  confidence?: number;
  requires_human_review?: boolean;
  metadata?: {
    trace_id?: string;
    correlation_id?: string;
    timestamp?: string;
    source_module?: string;
  };
}

export interface TraceabilityEntry {
  step: string;
  source?: string;
  timestamp: string;
  reason: string;
}

export interface PipelineOutput {
  validated_data: unknown;
  traceability_log: TraceabilityEntry[];
  confidence_score: number;
  next_action: "delivery_handoff_ready" | "hitl_required";
}

export interface PipelineEvent {
  event_name: string;
  job_id: string;
  payload: Record<string, unknown>;
  confidence_score?: number;
  justification?: string;
}

export interface CapabilityService {
  name: string;
  consumes: string[];
  produces: string[];
  execute(context: CapabilityContext, event: PipelineEvent): Promise<PipelineEvent[]>;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isPipelineInput(value: unknown): value is PipelineInput {
  if (!isRecord(value)) return false;
  if (typeof value.target_domain !== "string" || value.target_domain.trim().length === 0) {
    return false;
  }
  if (!isRecord(value.extracted_schema_definition)) return false;
  if (!isRecord(value.budget_or_time_constraints)) return false;
  return true;
}

export function isModule2ExecutionRequest(value: unknown): value is Module2ExecutionRequest {
  if (!isRecord(value)) return false;
  if (typeof value.workflow_id !== "string") return false;
  if (typeof value.decision_id !== "string") return false;
  if (typeof value.event_type !== "string") return false;
  if (typeof value.next_task !== "string") return false;
  if (typeof value.target_capability !== "string") return false;
  if (!isRecord(value.input_context)) return false;
  if (typeof value.input_context.target_url !== "string") return false;
  if (!isRecord(value.input_context.expected_schema)) return false;
  return true;
}

function extractDomain(targetUrl: string): string {
  try {
    return new URL(targetUrl).hostname || targetUrl;
  } catch {
    return targetUrl;
  }
}

function toMinutes(milliseconds?: number): number | undefined {
  if (typeof milliseconds !== "number" || milliseconds <= 0) return undefined;
  return Math.ceil(milliseconds / 60000);
}

export function mapModule2RequestToPipelineInput(request: Module2ExecutionRequest): PipelineInput {
  const timeoutMs = request.constraints?.timeout_ms ?? request.input_context.max_time_ms;
  const budget = request.constraints?.budget ?? request.input_context.max_budget;

  return {
    target_domain: extractDomain(request.input_context.target_url),
    extracted_schema_definition: request.input_context.expected_schema,
    budget_or_time_constraints: {
      max_minutes: toMinutes(timeoutMs),
      max_budget: typeof budget === "number" ? budget : undefined,
      timeout_ms: timeoutMs
    },
    upstream_context: {
      workflow_id: request.workflow_id,
      decision_id: request.decision_id,
      target_capability: request.target_capability,
      next_task: request.next_task,
      reasoning: request.reasoning,
      confidence: request.confidence,
      trace_id: request.metadata?.trace_id,
      correlation_id: request.metadata?.correlation_id,
      source_module: request.metadata?.source_module,
      requires_js_rendering: request.input_context.requires_js_rendering,
      target_url: request.input_context.target_url
    }
  };
}

export function assertPipelineInput(value: unknown): asserts value is PipelineInput {
  if (!isPipelineInput(value)) {
    throw new Error("Invalid PipelineInput payload");
  }
}

export function isPipelineOutput(value: unknown): value is PipelineOutput {
  if (!isRecord(value)) return false;
  if (!("next_action" in value) || (value.next_action !== "delivery_handoff_ready" && value.next_action !== "hitl_required")) {
    return false;
  }
  if (!Array.isArray(value.traceability_log)) return false;
  if (typeof value.confidence_score !== "number") return false;
  return true;
}
