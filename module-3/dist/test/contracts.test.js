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
const validInput = {
    target_domain: "example.com",
    extracted_schema_definition: {
        title: "string",
        content: "string",
        source_url: "string"
    },
    budget_or_time_constraints: {
        max_minutes: 60
    }
};
(0, node_test_1.default)("PipelineInput guard validates contract shape", () => {
    strict_1.default.equal((0, contracts_1.isPipelineInput)(validInput), true);
    strict_1.default.equal((0, contracts_1.isPipelineInput)({ target_domain: "example.com" }), false);
});
(0, node_test_1.default)("PipelineOutput guard validates runtime output shape", async () => {
    const worldModel = new worldModelPort_1.InMemoryWorldModelPort();
    const engine = new pipelineEngine_1.PipelineEngine({ worldModel });
    const output = await engine.run(validInput);
    strict_1.default.equal((0, contracts_1.isPipelineOutput)(output), true);
});
(0, node_test_1.default)("Event transitions include required fields in happy path", async () => {
    const worldModel = new worldModelPort_1.InMemoryWorldModelPort();
    const engine = new pipelineEngine_1.PipelineEngine({ worldModel });
    await engine.run(validInput);
    const events = worldModel.getEvents();
    const requiredByEvent = {
        input_received: ["target_domain", "extracted_schema_definition", "budget_or_time_constraints"],
        assessment_completed: ["target_domain", "extracted_schema_definition", "budget_or_time_constraints"],
        job_scheduled: ["job_batch_id", "target_domain", "priority_level"],
        url_discovered: ["discovered_url", "target_domain", "domain_authority"],
        script_ready: ["target_url", "script_id", "playwright_script"],
        proxy_acquired: ["target_url", "proxy_id", "anti_bot_evasion_enabled"],
        extraction_completed: ["extracted_data", "source_url", "extractor_type"],
        qa_validated: ["validated_data"],
        delivery_handoff_ready: ["validated_data", "traceability_log", "confidence_score", "handoff_to"]
    };
    for (const event of events) {
        const requiredFields = requiredByEvent[event.event_name];
        if (!requiredFields)
            continue;
        for (const field of requiredFields) {
            strict_1.default.ok(field in event.payload, `${event.event_name} missing required field: ${field}`);
        }
    }
    const sequence = events.map((event) => event.event_name);
    const expectedSequence = [
        "input_received",
        "assessment_completed",
        "job_scheduled",
        "url_discovered",
        "script_ready",
        "proxy_acquired",
        "extraction_completed",
        "qa_validated",
        "delivery_handoff_ready"
    ];
    let cursor = -1;
    for (const eventName of expectedSequence) {
        const index = sequence.indexOf(eventName);
        strict_1.default.ok(index > cursor, `Event ${eventName} should appear in order`);
        cursor = index;
    }
});
(0, node_test_1.default)("PipelineEvent minimum contract remains stable", () => {
    const event = {
        event_name: "sample_event",
        job_id: "job-123",
        payload: { ok: true },
        confidence_score: 0.9,
        justification: "sample"
    };
    strict_1.default.equal(event.event_name, "sample_event");
    strict_1.default.equal(event.job_id, "job-123");
    strict_1.default.equal(typeof event.payload, "object");
});
