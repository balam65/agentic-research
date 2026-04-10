import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryWorldModelPort } from "../src/ports/worldModelPort";
import { PipelineEngine } from "../src/runtime/pipelineEngine";
import type { PipelineInput } from "../src/types/contracts";

function makeInput(targetDomain: string): PipelineInput {
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

test("Pipeline happy path emits delivery_handoff_ready", async () => {
  const worldModel = new InMemoryWorldModelPort();
  const engine = new PipelineEngine({ worldModel });
  const output = await engine.run(makeInput("example.com"));

  assert.equal(output.next_action, "delivery_handoff_ready");
  assert.ok(typeof output.validated_data === "object");
  assert.ok(output.traceability_log.some((entry) => entry.step === "delivery_handoff_ready"));
});

test("Pipeline failure path emits hitl_required", async () => {
  const worldModel = new InMemoryWorldModelPort();
  const engine = new PipelineEngine({ worldModel });
  const output = await engine.run(makeInput("fail.example.com"));

  assert.equal(output.next_action, "hitl_required");
  assert.ok(output.traceability_log.some((entry) => entry.step === "extraction_failed"));
  assert.ok(output.traceability_log.some((entry) => entry.step === "hitl_required"));
});

test("Pipeline low confidence path is intercepted by HITL policy", async () => {
  const worldModel = new InMemoryWorldModelPort();
  const engine = new PipelineEngine({ worldModel });
  const output = await engine.run(makeInput("fallback.example.com"));

  assert.equal(output.next_action, "hitl_required");
  assert.ok(output.traceability_log.some((entry) => entry.step === "extraction_completed"));
  assert.ok(output.traceability_log.some((entry) => entry.step === "hitl_required"));
});
