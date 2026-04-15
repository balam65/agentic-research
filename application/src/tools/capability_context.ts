import { randomUUID } from "node:crypto";

import { ConfidenceScorer } from "../utils/confidence_scorer.js";
import { TraceBuilder } from "../utils/trace_builder.js";
import { InMemoryWorldModelPort, WorldModelPort } from "../memory/world_model_port.js";
import type { PipelineInput } from "../utils/contracts.js";

export interface CapabilityContext {
  jobId: string;
  input: PipelineInput;
  worldModel: WorldModelPort;
  traceBuilder: TraceBuilder;
  confidenceScorer: ConfidenceScorer;
  sharedState: Map<string, unknown>;
}

export interface CapabilityContextOptions {
  jobId?: string;
  worldModel?: WorldModelPort;
}

export function createCapabilityContext(
  input: PipelineInput,
  options: CapabilityContextOptions = {}
): CapabilityContext {
  return {
    jobId: options.jobId ?? randomUUID(),
    input,
    worldModel: options.worldModel ?? new InMemoryWorldModelPort(),
    traceBuilder: new TraceBuilder(),
    confidenceScorer: new ConfidenceScorer(),
    sharedState: new Map<string, unknown>()
  };
}
