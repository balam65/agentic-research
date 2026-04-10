import assert from "node:assert/strict";
import test from "node:test";

import { AssessmentService } from "../src/capabilities/assessmentService";
import { DiscoveryService } from "../src/capabilities/discoveryService";
import { ExtractionService } from "../src/capabilities/extractionService";
import { ProxyManagerService } from "../src/capabilities/proxyManagerService";
import { QaValidationService } from "../src/capabilities/qaValidationService";
import { SchedulingService } from "../src/capabilities/schedulingService";
import { ScriptingService } from "../src/capabilities/scriptingService";
import { createCapabilityContext } from "../src/runtime/context";
import type { PipelineEvent, PipelineInput } from "../src/types/contracts";

const baseInput: PipelineInput = {
  target_domain: "example.com",
  extracted_schema_definition: {
    title: "string",
    content: "string",
    source_url: "string"
  },
  budget_or_time_constraints: { max_minutes: 45 }
};

function makeEvent(eventName: string, payload: Record<string, unknown>): PipelineEvent {
  return {
    event_name: eventName,
    job_id: "job-unit-test",
    payload,
    confidence_score: 1
  };
}

test("AssessmentService emits assessment_completed for valid input and assessment_failed for invalid input", async () => {
  const service = new AssessmentService();
  const context = createCapabilityContext(baseInput);

  const success = await service.execute(
    context,
    makeEvent("input_received", baseInput as unknown as Record<string, unknown>)
  );
  assert.equal(success[0].event_name, "assessment_completed");
  assert.equal(success[0].payload.target_domain, "example.com");

  const failed = await service.execute(context, makeEvent("input_received", { target_domain: "" }));
  assert.equal(failed[0].event_name, "assessment_failed");
});

test("SchedulingService emits job_scheduled and validates payload shape", async () => {
  const service = new SchedulingService();
  const context = createCapabilityContext(baseInput);

  const success = await service.execute(
    context,
    makeEvent("assessment_completed", {
      target_domain: "example.com",
      extracted_schema_definition: baseInput.extracted_schema_definition,
      budget_or_time_constraints: { max_minutes: 15 }
    })
  );
  assert.equal(success[0].event_name, "job_scheduled");
  assert.equal(success[0].payload.priority_level, 1);

  const failed = await service.execute(context, makeEvent("assessment_completed", { foo: "bar" }));
  assert.equal(failed[0].event_name, "scheduling_failed");
});

test("DiscoveryService emits url_discovered and validates payload shape", async () => {
  const service = new DiscoveryService();
  const context = createCapabilityContext(baseInput);

  const success = await service.execute(
    context,
    makeEvent("job_scheduled", {
      target_domain: "example.com"
    })
  );
  assert.equal(success[0].event_name, "url_discovered");
  assert.equal(success[0].payload.discovered_url, "https://example.com/research");

  const failed = await service.execute(context, makeEvent("job_scheduled", { }));
  assert.equal(failed[0].event_name, "discovery_failed");
});

test("ScriptingService emits script_ready and validates payload shape", async () => {
  const service = new ScriptingService();
  const context = createCapabilityContext(baseInput);

  const success = await service.execute(
    context,
    makeEvent("url_discovered", {
      discovered_url: "https://example.com/research"
    })
  );
  assert.equal(success[0].event_name, "script_ready");
  assert.equal(typeof success[0].payload.playwright_script, "string");

  const failed = await service.execute(context, makeEvent("url_discovered", {}));
  assert.equal(failed[0].event_name, "scripting_failed");
});

test("ProxyManagerService emits proxy_acquired and validates payload shape", async () => {
  const service = new ProxyManagerService();
  const context = createCapabilityContext(baseInput);

  const success = await service.execute(
    context,
    makeEvent("script_ready", {
      target_url: "https://example.com/research",
      script_id: "script-1"
    })
  );
  assert.equal(success[0].event_name, "proxy_acquired");
  assert.equal(typeof success[0].payload.proxy_id, "string");

  const failed = await service.execute(context, makeEvent("script_ready", {}));
  assert.equal(failed[0].event_name, "proxy_failed");
});

test("ExtractionService emits fallback extraction with reduced confidence", async () => {
  const service = new ExtractionService();
  const context = createCapabilityContext(baseInput);

  const fallback = await service.execute(
    context,
    makeEvent("proxy_acquired", {
      target_url: "https://fallback.example.com/research"
    })
  );
  assert.equal(fallback[0].event_name, "extraction_completed");
  assert.ok((fallback[0].confidence_score ?? 1) < 0.8);

  const failed = await service.execute(
    context,
    makeEvent("proxy_acquired", {
      target_url: "https://fail.example.com/research"
    })
  );
  assert.equal(failed[0].event_name, "extraction_failed");
});

test("QaValidationService emits qa_validated for valid schema and qa_failed for invalid schema", async () => {
  const service = new QaValidationService();
  const context = createCapabilityContext(baseInput);

  const success = await service.execute(
    context,
    makeEvent("extraction_completed", {
      extracted_data: {
        title: "ok",
        content: "ok",
        source_url: "https://example.com/research"
      }
    })
  );
  assert.equal(success[0].event_name, "qa_validated");

  const failed = await service.execute(
    context,
    makeEvent("extraction_completed", {
      extracted_data: {
        title: "missing-fields"
      }
    })
  );
  assert.equal(failed[0].event_name, "qa_failed");
});
