import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryWorldModelPort } from "../src/ports/worldModelPort";
import { PipelineEngine } from "../src/runtime/pipelineEngine";
import type { PipelineInput } from "../src/types/contracts";

const validInput: PipelineInput = {
  target_domain: "example.com",
  extracted_schema_definition: {
    title: "string",
    content: "string",
    source_url: "string"
  },
  budget_or_time_constraints: {
    max_minutes: 40
  }
};

test("InMemory world model captures research_jobs lifecycle and capability registry", async () => {
  const worldModel = new InMemoryWorldModelPort();
  const engine = new PipelineEngine({ worldModel });

  const output = await engine.run(validInput);
  assert.equal(output.next_action, "delivery_handoff_ready");

  const jobs = worldModel.getJobs();
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].status, "completed");
  assert.ok(typeof jobs[0].final_output_url === "string");

  const capabilities = worldModel.getCapabilities();
  assert.equal(capabilities.length, 7);
});

test("InMemory world model captures extracted_data and validation state", async () => {
  const worldModel = new InMemoryWorldModelPort();
  const engine = new PipelineEngine({ worldModel });

  await engine.run(validInput);
  const rows = worldModel.getExtractedData();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].is_validated, true);
  assert.equal(typeof rows[0].confidence, "number");
});
