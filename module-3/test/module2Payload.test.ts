import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryWorldModelPort } from "../src/ports/worldModelPort";
import { PipelineEngine } from "../src/runtime/pipelineEngine";
import {
  isModule2ExecutionRequest,
  mapModule2RequestToPipelineInput,
  Module2ExecutionRequest
} from "../src/types/contracts";

const module2Payload: Module2ExecutionRequest = {
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
  reasoning:
    "Target requires product page extraction and JS rendering is enabled, so selecting JS-based product extractor capability.",
  confidence: 0.95,
  requires_human_review: false,
  metadata: {
    trace_id: "trace-123",
    correlation_id: "corr-456",
    timestamp: "2026-04-09T10:06:00Z",
    source_module: "intelligence_layer"
  }
};

test("Module 2 payload contract is recognized and mapped", () => {
  assert.equal(isModule2ExecutionRequest(module2Payload), true);
  const mapped = mapModule2RequestToPipelineInput(module2Payload);

  assert.equal(mapped.target_domain, "example-store.com");
  assert.equal(mapped.budget_or_time_constraints.max_budget, 50);
  assert.equal(mapped.budget_or_time_constraints.timeout_ms, 300000);
  assert.equal(mapped.budget_or_time_constraints.max_minutes, 5);
  assert.equal(mapped.extracted_schema_definition.product_name, "string");
  assert.equal(mapped.upstream_context?.workflow_id, "req-1234-abcd");
});

test("PipelineEngine accepts raw Module 2 payload directly", async () => {
  const worldModel = new InMemoryWorldModelPort();
  const engine = new PipelineEngine({ worldModel });
  const output = await engine.run(module2Payload);

  assert.equal(output.next_action, "delivery_handoff_ready");
  assert.ok(output.traceability_log.some((entry) => entry.step === "delivery_handoff_ready"));

  const jobs = worldModel.getJobs();
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].input_params.upstream_context?.workflow_id, "req-1234-abcd");
});
