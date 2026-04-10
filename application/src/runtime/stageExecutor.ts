import { randomUUID } from "node:crypto";

import { AssessmentService } from "../capabilities/assessmentService";
import { DiscoveryService } from "../capabilities/discoveryService";
import { ExtractionService } from "../capabilities/extractionService";
import { ProxyManagerService } from "../capabilities/proxyManagerService";
import { QaValidationService } from "../capabilities/qaValidationService";
import { ScriptingService } from "../capabilities/scriptingService";
import { InMemoryWorldModelPort, WorldModelPort } from "../ports/worldModelPort";
import {
  assertPipelineInput,
  isRecord,
  mapModule2RequestToPipelineInput,
  Module2ExecutionRequest,
  Module3ExecutionOutcome,
  PipelineEvent
} from "../types/contracts";
import { createCapabilityContext } from "./context";

export interface StageExecutorOptions {
  worldModel?: WorldModelPort;
}

function artifactRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function resolveArtifacts(request: Module2ExecutionRequest): Record<string, unknown> {
  return isRecord(request.input_context.artifacts) ? request.input_context.artifacts : {};
}

function resolveTargetUrl(request: Module2ExecutionRequest, artifacts: Record<string, unknown>): string {
  const executionSession = artifactRecord(artifacts.execution_session);
  if (typeof executionSession?.target_url === "string") return executionSession.target_url;

  const extractionPlan = artifactRecord(artifacts.extraction_plan);
  if (typeof extractionPlan?.target_url === "string") return extractionPlan.target_url;

  const candidateTargets = artifactRecord(artifacts.candidate_targets);
  if (typeof candidateTargets?.discovered_url === "string") return candidateTargets.discovered_url;

  return request.input_context.target_url;
}

function unwrapValidatedData(value: unknown): Record<string, unknown> {
  const record = artifactRecord(value);
  if (!record) return {};
  return artifactRecord(record.validatedData) ?? record;
}

function resolveValidatedArtifact(artifacts: Record<string, unknown>): Record<string, unknown> {
  const validated = artifactRecord(artifacts.validated_dataset);
  if (validated) return unwrapValidatedData(validated);

  const finalResult = artifactRecord(artifacts.final_result);
  if (finalResult) return unwrapValidatedData(finalResult);

  return {};
}

export class Module3StageExecutor {
  private readonly worldModel: WorldModelPort;
  private readonly assessment = new AssessmentService();
  private readonly discovery = new DiscoveryService();
  private readonly scripting = new ScriptingService();
  private readonly proxyManager = new ProxyManagerService();
  private readonly extraction = new ExtractionService();
  private readonly qa = new QaValidationService();

  constructor(options: StageExecutorOptions = {}) {
    this.worldModel = options.worldModel ?? new InMemoryWorldModelPort();
  }

  async execute(request: Module2ExecutionRequest): Promise<Module3ExecutionOutcome> {
    const input = mapModule2RequestToPipelineInput(request);
    assertPipelineInput(input);

    const context = createCapabilityContext(input, {
      jobId: request.workflow_id,
      worldModel: this.worldModel
    });

    const artifacts = resolveArtifacts(request);
    const targetUrl = resolveTargetUrl(request, artifacts);
    const event = this.buildEntryEvent(request, input, artifacts, targetUrl);
    const nextEvents = await this.executeSingleStage(request.target_capability, context, event);
    const producedEvent = nextEvents[0] ?? this.failedEvent(request, "No event produced by requested capability.");

    await context.worldModel.writeEvent(producedEvent);
    context.traceBuilder.addFromEvent(producedEvent);

    if (producedEvent.event_name === "extraction_completed") {
      await context.worldModel.saveExtractedData({
        job_id: producedEvent.job_id,
        source_url: typeof producedEvent.payload.source_url === "string" ? producedEvent.payload.source_url : targetUrl,
        content: producedEvent.payload.extracted_data ?? producedEvent.payload,
        confidence: producedEvent.confidence_score ?? 1,
        is_validated: false
      });
    }

    if (producedEvent.event_name === "qa_validated") {
      await context.worldModel.markLatestExtractedDataValidated(producedEvent.job_id);
      context.sharedState.set("validated_data", producedEvent.payload.validated_data);
    }

    if (request.target_capability === "deliver_result") {
      const receipt = {
        workflow_id: request.workflow_id,
        delivered_at: new Date().toISOString(),
        handoff_to: "output_delivery_layer"
      };
      const deliveryEvent: PipelineEvent = {
        event_name: "delivery_handoff_ready",
        job_id: request.workflow_id,
        payload: {
          validated_data: resolveValidatedArtifact(artifacts),
          delivery_receipt: receipt
        },
        confidence_score: 0.97,
        justification: "Validated output delivered directly from Module 3."
      };
      await context.worldModel.writeEvent(deliveryEvent);
      context.traceBuilder.addFromEvent(deliveryEvent);

      return {
        workflow_id: request.workflow_id,
        decision_id: request.decision_id,
        target_capability: request.target_capability,
        status: "final",
        produced_event: deliveryEvent,
        traceability_log: context.traceBuilder.toArray(),
        confidence_score: deliveryEvent.confidence_score ?? 1,
        validated_data: deliveryEvent.payload.validated_data,
        delivery_receipt: receipt
      };
    }

    return {
      workflow_id: request.workflow_id,
      decision_id: request.decision_id,
      target_capability: request.target_capability,
      status: this.mapStatus(request.target_capability, producedEvent),
      produced_event: producedEvent,
      traceability_log: context.traceBuilder.toArray(),
      confidence_score: producedEvent.confidence_score ?? 1,
      validated_data: producedEvent.event_name === "qa_validated" ? producedEvent.payload.validated_data : undefined
    };
  }

  private async executeSingleStage(
    targetCapability: string,
    context: ReturnType<typeof createCapabilityContext>,
    event: PipelineEvent
  ): Promise<PipelineEvent[]> {
    switch (targetCapability) {
      case "assess_request":
        return this.assessment.execute(context, event);
      case "discover_targets":
        return this.discovery.execute(context, event);
      case "generate_extractor":
        return this.scripting.execute(context, event);
      case "acquire_execution_context":
        return this.proxyManager.execute(context, event);
      case "extract_data":
        return this.extraction.execute(context, event);
      case "validate_output":
        return this.qa.execute(context, event);
      case "deliver_result":
        return [event];
      default:
        return [this.failedEvent({ workflow_id: context.jobId }, `Unsupported target capability '${targetCapability}'.`)];
    }
  }

  private buildEntryEvent(
    request: Module2ExecutionRequest,
    input: ReturnType<typeof mapModule2RequestToPipelineInput>,
    artifacts: Record<string, unknown>,
    targetUrl: string
  ): PipelineEvent {
    switch (request.target_capability) {
      case "assess_request":
        return {
          event_name: "input_received",
          job_id: request.workflow_id,
          payload: input as unknown as Record<string, unknown>,
          confidence_score: request.confidence ?? 1,
          justification: request.reasoning ?? "Module 2 requested assessment execution."
        };
      case "discover_targets":
        return {
          event_name: "job_scheduled",
          job_id: request.workflow_id,
          payload: {
            job_batch_id: `batch-${Date.now()}`,
            target_domain: input.target_domain,
            extracted_schema_definition: input.extracted_schema_definition,
            budget_or_time_constraints: input.budget_or_time_constraints
          },
          confidence_score: request.confidence ?? 1,
          justification: request.reasoning ?? "Module 2 requested target discovery."
        };
      case "generate_extractor":
        return {
          event_name: "url_discovered",
          job_id: request.workflow_id,
          payload: {
            target_domain: input.target_domain,
            discovered_url: targetUrl,
            domain_authority: 85
          },
          confidence_score: request.confidence ?? 1,
          justification: request.reasoning ?? "Module 2 requested extraction plan generation."
        };
      case "acquire_execution_context":
        return {
          event_name: "script_ready",
          job_id: request.workflow_id,
          payload: {
            target_url: targetUrl,
            script_id: artifactRecord(artifacts.extraction_plan)?.script_id ?? `script-${Date.now()}`,
            playwright_script:
              artifactRecord(artifacts.extraction_plan)?.playwright_script ??
              "const title = await page.textContent('h1'); return { title, content: await page.textContent('body') };"
          },
          confidence_score: request.confidence ?? 1,
          justification: request.reasoning ?? "Module 2 requested runtime context acquisition."
        };
      case "extract_data":
        return {
          event_name: "proxy_acquired",
          job_id: request.workflow_id,
          payload: {
            target_url: targetUrl,
            script_id: artifactRecord(artifacts.execution_session)?.script_id ?? `script-${Date.now()}`,
            proxy_id: artifactRecord(artifacts.execution_session)?.proxy_id ?? "proxy-node-1",
            anti_bot_evasion_enabled: true
          },
          confidence_score: request.confidence ?? 1,
          justification: request.reasoning ?? "Module 2 requested extraction execution."
        };
      case "validate_output":
        return {
          event_name: "extraction_completed",
          job_id: request.workflow_id,
          payload: {
            extracted_data:
              artifactRecord(artifactRecord(artifacts.raw_dataset)?.data) ??
              artifactRecord(artifacts.raw_dataset) ??
              {},
            source_url: targetUrl,
            extractor_type: "module2_bridge"
          },
          confidence_score: request.confidence ?? 1,
          justification: request.reasoning ?? "Module 2 requested output validation."
        };
      case "deliver_result":
        return {
          event_name: "delivery_requested",
          job_id: request.workflow_id,
          payload: {
            validated_data: resolveValidatedArtifact(artifacts)
          },
          confidence_score: request.confidence ?? 1,
          justification: request.reasoning ?? "Module 2 requested final delivery."
        };
      default:
        return this.failedEvent(request, `Unsupported target capability '${request.target_capability}'.`);
    }
  }

  private mapStatus(targetCapability: string, event: PipelineEvent): Module3ExecutionOutcome["status"] {
    if (event.event_name === "hitl_required") return "hitl";
    if (event.event_name.endsWith("_failed") || event.event_name === "execution_failed") return "failed";
    if (targetCapability === "validate_output" && event.event_name === "qa_validated") return "final";
    return "intermediate";
  }

  private failedEvent(request: Pick<Module2ExecutionRequest, "workflow_id">, message: string): PipelineEvent {
    return {
      event_name: "execution_failed",
      job_id: request.workflow_id,
      payload: { error: message },
      confidence_score: 0.2,
      justification: message
    };
  }
}

export function createDecisionId(): string {
  return `dec-${randomUUID()}`;
}
