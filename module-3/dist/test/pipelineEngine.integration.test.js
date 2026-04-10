"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const worldModelPort_1 = require("../src/ports/worldModelPort");
const pipelineEngine_1 = require("../src/runtime/pipelineEngine");
function makeInput(targetDomain) {
    return {
        target_domain: targetDomain,
        extracted_schema_definition: {
            title: "string",
            content: "string",
            source_url: "string"
        },
        budget_or_time_constraints: {
            max_minutes: 45
        }
    };
}
(0, node_test_1.default)("Pipeline happy path emits delivery_handoff_ready", async () => {
    const worldModel = new worldModelPort_1.InMemoryWorldModelPort();
    const engine = new pipelineEngine_1.PipelineEngine({ worldModel });
    const output = await engine.run(makeInput("example.com"));
    strict_1.default.equal(output.next_action, "delivery_handoff_ready");
    strict_1.default.ok(typeof output.validated_data === "object");
    strict_1.default.ok(output.traceability_log.some((entry) => entry.step === "delivery_handoff_ready"));
});
(0, node_test_1.default)("Pipeline failure path emits hitl_required", async () => {
    const worldModel = new worldModelPort_1.InMemoryWorldModelPort();
    const engine = new pipelineEngine_1.PipelineEngine({ worldModel });
    const output = await engine.run(makeInput("fail.example.com"));
    strict_1.default.equal(output.next_action, "hitl_required");
    strict_1.default.ok(output.traceability_log.some((entry) => entry.step === "extraction_failed"));
    strict_1.default.ok(output.traceability_log.some((entry) => entry.step === "hitl_required"));
});
(0, node_test_1.default)("Pipeline low confidence path is intercepted by HITL policy", async () => {
    const worldModel = new worldModelPort_1.InMemoryWorldModelPort();
    const engine = new pipelineEngine_1.PipelineEngine({ worldModel });
    const output = await engine.run(makeInput("fallback.example.com"));
    strict_1.default.equal(output.next_action, "hitl_required");
    strict_1.default.ok(output.traceability_log.some((entry) => entry.step === "extraction_completed"));
    strict_1.default.ok(output.traceability_log.some((entry) => entry.step === "hitl_required"));
});
