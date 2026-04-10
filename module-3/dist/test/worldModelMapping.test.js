"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const worldModelPort_1 = require("../src/ports/worldModelPort");
const pipelineEngine_1 = require("../src/runtime/pipelineEngine");
const validInput = {
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
(0, node_test_1.default)("InMemory world model captures research_jobs lifecycle and capability registry", async () => {
    const worldModel = new worldModelPort_1.InMemoryWorldModelPort();
    const engine = new pipelineEngine_1.PipelineEngine({ worldModel });
    const output = await engine.run(validInput);
    strict_1.default.equal(output.next_action, "delivery_handoff_ready");
    const jobs = worldModel.getJobs();
    strict_1.default.equal(jobs.length, 1);
    strict_1.default.equal(jobs[0].status, "completed");
    strict_1.default.ok(typeof jobs[0].final_output_url === "string");
    const capabilities = worldModel.getCapabilities();
    strict_1.default.equal(capabilities.length, 7);
});
(0, node_test_1.default)("InMemory world model captures extracted_data and validation state", async () => {
    const worldModel = new worldModelPort_1.InMemoryWorldModelPort();
    const engine = new pipelineEngine_1.PipelineEngine({ worldModel });
    await engine.run(validInput);
    const rows = worldModel.getExtractedData();
    strict_1.default.equal(rows.length, 1);
    strict_1.default.equal(rows[0].is_validated, true);
    strict_1.default.equal(typeof rows[0].confidence, "number");
});
