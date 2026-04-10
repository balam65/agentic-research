"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRecord = isRecord;
exports.isPipelineInput = isPipelineInput;
exports.isModule2ExecutionRequest = isModule2ExecutionRequest;
exports.mapModule2RequestToPipelineInput = mapModule2RequestToPipelineInput;
exports.assertPipelineInput = assertPipelineInput;
exports.isPipelineOutput = isPipelineOutput;
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isPipelineInput(value) {
    if (!isRecord(value))
        return false;
    if (typeof value.target_domain !== "string" || value.target_domain.trim().length === 0) {
        return false;
    }
    if (!isRecord(value.extracted_schema_definition))
        return false;
    if (!isRecord(value.budget_or_time_constraints))
        return false;
    return true;
}
function isModule2ExecutionRequest(value) {
    if (!isRecord(value))
        return false;
    if (typeof value.workflow_id !== "string")
        return false;
    if (typeof value.decision_id !== "string")
        return false;
    if (typeof value.event_type !== "string")
        return false;
    if (typeof value.next_task !== "string")
        return false;
    if (typeof value.target_capability !== "string")
        return false;
    if (!isRecord(value.input_context))
        return false;
    if (typeof value.input_context.target_url !== "string")
        return false;
    if (!isRecord(value.input_context.expected_schema))
        return false;
    return true;
}
function extractDomain(targetUrl) {
    try {
        return new URL(targetUrl).hostname || targetUrl;
    }
    catch {
        return targetUrl;
    }
}
function toMinutes(milliseconds) {
    if (typeof milliseconds !== "number" || milliseconds <= 0)
        return undefined;
    return Math.ceil(milliseconds / 60000);
}
function mapModule2RequestToPipelineInput(request) {
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
function assertPipelineInput(value) {
    if (!isPipelineInput(value)) {
        throw new Error("Invalid PipelineInput payload");
    }
}
function isPipelineOutput(value) {
    if (!isRecord(value))
        return false;
    if (!("next_action" in value) || (value.next_action !== "delivery_handoff_ready" && value.next_action !== "hitl_required")) {
        return false;
    }
    if (!Array.isArray(value.traceability_log))
        return false;
    if (typeof value.confidence_score !== "number")
        return false;
    return true;
}
