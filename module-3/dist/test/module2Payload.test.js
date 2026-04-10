"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const worldModelPort_1 = require("../src/ports/worldModelPort");
const pipelineEngine_1 = require("../src/runtime/pipelineEngine");
const contracts_1 = require("../src/types/contracts");
const module2Payload = {
    workflow_id: "req-1234-abcd",
    decision_id: "dec-001",
    event_type: "CAPABILITY_EXECUTION_REQUEST",
    next_task: "extract_product_data",
    target_capability: "product_extractor_js",
    input_context: {
        target_url: "https://example-store.com",
        scope: "product_pages",
        requires_js_rendering: true,
        max_budget: 50,
        max_time_ms: 300000,
        expected_schema: {
            product_name: "string",
            price: "number",
            in_stock: "boolean"
        }
    },
    constraints: {
        timeout_ms: 300000,
        budget: 50
    },
    reasoning: "Target requires product page extraction and JS rendering is enabled, so selecting JS-based product extractor capability.",
    confidence: 0.95,
    requires_human_review: false,
    metadata: {
        trace_id: "trace-123",
        correlation_id: "corr-456",
        timestamp: "2026-04-09T10:06:00Z",
        source_module: "intelligence_layer"
    }
};
(0, node_test_1.default)("Module 2 payload contract is recognized and mapped", () => {
    strict_1.default.equal((0, contracts_1.isModule2ExecutionRequest)(module2Payload), true);
    const mapped = (0, contracts_1.mapModule2RequestToPipelineInput)(module2Payload);
    strict_1.default.equal(mapped.target_domain, "example-store.com");
    strict_1.default.equal(mapped.budget_or_time_constraints.max_budget, 50);
    strict_1.default.equal(mapped.budget_or_time_constraints.timeout_ms, 300000);
    strict_1.default.equal(mapped.budget_or_time_constraints.max_minutes, 5);
    strict_1.default.equal(mapped.extracted_schema_definition.product_name, "string");
    strict_1.default.equal(mapped.upstream_context?.workflow_id, "req-1234-abcd");
});
(0, node_test_1.default)("PipelineEngine accepts raw Module 2 payload directly", async () => {
    const worldModel = new worldModelPort_1.InMemoryWorldModelPort();
    const engine = new pipelineEngine_1.PipelineEngine({ worldModel });
    const output = await engine.run(module2Payload);
    strict_1.default.equal(output.next_action, "delivery_handoff_ready");
    strict_1.default.ok(output.traceability_log.some((entry) => entry.step === "delivery_handoff_ready"));
    const jobs = worldModel.getJobs();
    strict_1.default.equal(jobs.length, 1);
    strict_1.default.equal(jobs[0].input_params.upstream_context?.workflow_id, "req-1234-abcd");
});
