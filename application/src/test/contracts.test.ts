import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryWorldModelPort } from "../src/ports/worldModelPort";
import { PipelineEngine } from "../src/runtime/pipelineEngine";
import {
  isPipelineInput,
  isPipelineOutput,
  PipelineEvent,
  PipelineInput
} from "../src/types/contracts";

const validInput: PipelineInput = {
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

test("PipelineInput guard validates contract shape", () => {
  assert.equal(isPipelineInput(validInput), true);
  assert.equal(isPipelineInput({ target_domain: "example.com" }), false);
});

test("PipelineOutput guard validates runtime output shape", async () => {
  const worldModel = new InMemoryWorldModelPort();
  const engine = new PipelineEngine({ worldModel });
  const output = await engine.run(validInput);
  assert.equal(isPipelineOutput(output), true);
});

test("Event transitions include required fields in happy path", async () => {
  const worldModel = new InMemoryWorldModelPort();
  const engine = new PipelineEngine({ worldModel });
  await engine.run(validInput);

  const events = worldModel.getEvents();
  const requiredByEvent: Record<string, string[]> = {
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
    if (!requiredFields) continue;
    for (const field of requiredFields) {
      assert.ok(field in event.payload, `${event.event_name} missing required field: ${field}`);
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
    assert.ok(index > cursor, `Event ${eventName} should appear in order`);
    cursor = index;
  }
});

test("PipelineEvent minimum contract remains stable", () => {
  const event: PipelineEvent = {
    event_name: "sample_event",
    job_id: "job-123",
    payload: { ok: true },
    confidence_score: 0.9,
    justification: "sample"
  };
  assert.equal(event.event_name, "sample_event");
  assert.equal(event.job_id, "job-123");
  assert.equal(typeof event.payload, "object");
});
