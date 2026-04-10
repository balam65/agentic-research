"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const assessmentService_1 = require("../src/capabilities/assessmentService");
const discoveryService_1 = require("../src/capabilities/discoveryService");
const extractionService_1 = require("../src/capabilities/extractionService");
const proxyManagerService_1 = require("../src/capabilities/proxyManagerService");
const qaValidationService_1 = require("../src/capabilities/qaValidationService");
const schedulingService_1 = require("../src/capabilities/schedulingService");
const scriptingService_1 = require("../src/capabilities/scriptingService");
const context_1 = require("../src/runtime/context");
const baseInput = {
    target_domain: "example.com",
    extracted_schema_definition: {
        title: "string",
        content: "string",
        source_url: "string"
    },
    budget_or_time_constraints: { max_minutes: 45 }
};
function makeEvent(eventName, payload) {
    return {
        event_name: eventName,
        job_id: "job-unit-test",
        payload,
        confidence_score: 1
    };
}
(0, node_test_1.default)("AssessmentService emits assessment_completed for valid input and assessment_failed for invalid input", async () => {
    const service = new assessmentService_1.AssessmentService();
    const context = (0, context_1.createCapabilityContext)(baseInput);
    const success = await service.execute(context, makeEvent("input_received", baseInput));
    strict_1.default.equal(success[0].event_name, "assessment_completed");
    strict_1.default.equal(success[0].payload.target_domain, "example.com");
    const failed = await service.execute(context, makeEvent("input_received", { target_domain: "" }));
    strict_1.default.equal(failed[0].event_name, "assessment_failed");
});
(0, node_test_1.default)("SchedulingService emits job_scheduled and validates payload shape", async () => {
    const service = new schedulingService_1.SchedulingService();
    const context = (0, context_1.createCapabilityContext)(baseInput);
    const success = await service.execute(context, makeEvent("assessment_completed", {
        target_domain: "example.com",
        extracted_schema_definition: baseInput.extracted_schema_definition,
        budget_or_time_constraints: { max_minutes: 15 }
    }));
    strict_1.default.equal(success[0].event_name, "job_scheduled");
    strict_1.default.equal(success[0].payload.priority_level, 1);
    const failed = await service.execute(context, makeEvent("assessment_completed", { foo: "bar" }));
    strict_1.default.equal(failed[0].event_name, "scheduling_failed");
});
(0, node_test_1.default)("DiscoveryService emits url_discovered and validates payload shape", async () => {
    const service = new discoveryService_1.DiscoveryService();
    const context = (0, context_1.createCapabilityContext)(baseInput);
    const success = await service.execute(context, makeEvent("job_scheduled", {
        target_domain: "example.com"
    }));
    strict_1.default.equal(success[0].event_name, "url_discovered");
    strict_1.default.equal(success[0].payload.discovered_url, "https://example.com/research");
    const failed = await service.execute(context, makeEvent("job_scheduled", {}));
    strict_1.default.equal(failed[0].event_name, "discovery_failed");
});
(0, node_test_1.default)("ScriptingService emits script_ready and validates payload shape", async () => {
    const service = new scriptingService_1.ScriptingService();
    const context = (0, context_1.createCapabilityContext)(baseInput);
    const success = await service.execute(context, makeEvent("url_discovered", {
        discovered_url: "https://example.com/research"
    }));
    strict_1.default.equal(success[0].event_name, "script_ready");
    strict_1.default.equal(typeof success[0].payload.playwright_script, "string");
    const failed = await service.execute(context, makeEvent("url_discovered", {}));
    strict_1.default.equal(failed[0].event_name, "scripting_failed");
});
(0, node_test_1.default)("ProxyManagerService emits proxy_acquired and validates payload shape", async () => {
    const service = new proxyManagerService_1.ProxyManagerService();
    const context = (0, context_1.createCapabilityContext)(baseInput);
    const success = await service.execute(context, makeEvent("script_ready", {
        target_url: "https://example.com/research",
        script_id: "script-1"
    }));
    strict_1.default.equal(success[0].event_name, "proxy_acquired");
    strict_1.default.equal(typeof success[0].payload.proxy_id, "string");
    const failed = await service.execute(context, makeEvent("script_ready", {}));
    strict_1.default.equal(failed[0].event_name, "proxy_failed");
});
(0, node_test_1.default)("ExtractionService emits fallback extraction with reduced confidence", async () => {
    const service = new extractionService_1.ExtractionService();
    const context = (0, context_1.createCapabilityContext)(baseInput);
    const fallback = await service.execute(context, makeEvent("proxy_acquired", {
        target_url: "https://fallback.example.com/research"
    }));
    strict_1.default.equal(fallback[0].event_name, "extraction_completed");
    strict_1.default.ok((fallback[0].confidence_score ?? 1) < 0.8);
    const failed = await service.execute(context, makeEvent("proxy_acquired", {
        target_url: "https://fail.example.com/research"
    }));
    strict_1.default.equal(failed[0].event_name, "extraction_failed");
});
(0, node_test_1.default)("QaValidationService emits qa_validated for valid schema and qa_failed for invalid schema", async () => {
    const service = new qaValidationService_1.QaValidationService();
    const context = (0, context_1.createCapabilityContext)(baseInput);
    const success = await service.execute(context, makeEvent("extraction_completed", {
        extracted_data: {
            title: "ok",
            content: "ok",
            source_url: "https://example.com/research"
        }
    }));
    strict_1.default.equal(success[0].event_name, "qa_validated");
    const failed = await service.execute(context, makeEvent("extraction_completed", {
        extracted_data: {
            title: "missing-fields"
        }
    }));
    strict_1.default.equal(failed[0].event_name, "qa_failed");
});
