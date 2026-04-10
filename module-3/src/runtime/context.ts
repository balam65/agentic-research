import { randomUUID } from "node:crypto";

import { ConfidenceScorer } from "../helpers/confidenceScorer";
import { TraceBuilder } from "../helpers/traceBuilder";
import { InMemoryWorldModelPort, WorldModelPort } from "../ports/worldModelPort";
import type { PipelineInput } from "../types/contracts";

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
