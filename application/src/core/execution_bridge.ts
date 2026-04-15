import { randomUUID } from 'node:crypto';

import { createLogger } from '../logs/logger.js';
import type {
  ArtifactRecord,
  DownstreamWorkflowEvent,
  RoutingDecision,
  WorkflowEventInput,
  WorldView,
} from '../memory/schema.js';
import type { Module2ExecutionRequest } from '../utils/contracts.js';
import { Module3StageExecutor, createDecisionId } from '../tools/stage_executor.js';

const logger = createLogger('execution-bridge');

type BridgeArtifact = Omit<ArtifactRecord, 'id' | 'taskId' | 'createdAt'>;

export type Module3BridgeOutcome =
  | {
      kind: 'downstream_event';
      event: DownstreamWorkflowEvent;
    }
  | {
      kind: 'terminal';
      status: 'completed' | 'waiting_for_human' | 'failed';
      reason: string;
      artifacts: BridgeArtifact[];
    };

function normalizeTargetUrl(targetSpec: string): string {
  if (targetSpec.startsWith('http://') || targetSpec.startsWith('https://')) {
    return targetSpec;
  }
  return `https://${targetSpec}`;
}

function latestArtifacts(world: WorldView): Record<string, unknown> {
  const artifacts: Record<string, unknown> = {};
  for (const artifact of world.artifacts) {
    artifacts[artifact.kind] = artifact.content;
  }
  return artifacts;
}

function artifact(
  kind: BridgeArtifact['kind'],
  producedBy: string,
  content: Record<string, unknown>,
  confidence?: number,
): BridgeArtifact {
  return {
    kind,
    producedBy,
    content,
    confidence,
  };
}

export class Module3ExecutionBridge {
  private readonly executor = new Module3StageExecutor();
  private readonly lowConfidenceThreshold = 0.75;

  async execute(
    decision: RoutingDecision,
    world: WorldView,
    triggeringEvent: WorkflowEventInput,
  ): Promise<Module3BridgeOutcome> {
    const request = this.buildRequest(decision, world, triggeringEvent);
    
    logger.info('Executing capability via bridge', {
      workflowId: decision.workflow_id,
      targetCapability: request.target_capability,
      targetModule: decision.target_module,
    }, decision.workflow_id);

    const outcome = await this.executor.execute(request);

    logger.info('Bridge execution completed', {
      workflowId: decision.workflow_id,
      producedEvent: outcome.produced_event.event_name,
      confidence: outcome.confidence_score,
    }, decision.workflow_id);

    switch (outcome.produced_event.event_name) {
      case 'assessment_completed':
        return {
          kind: 'downstream_event',
          event: this.createEvent(outcome, 'ASSESSMENT_COMPLETED', [
            artifact('intent_profile', 'module-3.assessment', {
              target_domain: outcome.produced_event.payload.target_domain as string,
              constraints: world.task.input.constraints,
              requested_schema: world.task.input.requestedSchema,
            }, outcome.confidence_score),
          ]),
        };
      case 'assessment_failed':
      case 'execution_failed':
        return {
          kind: 'downstream_event',
          event: this.createEvent(outcome, 'ASSESSMENT_FAILED'),
        };
      case 'url_discovered':
        return {
          kind: 'downstream_event',
          event: this.createEvent(outcome, 'DISCOVERY_COMPLETED', [
            artifact('candidate_targets', 'module-3.discovery', {
              discovered_url: outcome.produced_event.payload.discovered_url as string,
              target_domain: outcome.produced_event.payload.target_domain as string,
              domain_authority: outcome.produced_event.payload.domain_authority as number,
            }, outcome.confidence_score),
          ]),
        };
      case 'discovery_failed':
        return {
          kind: 'downstream_event',
          event: this.createEvent(outcome, 'DISCOVERY_FAILED'),
        };
      case 'script_ready':
        return {
          kind: 'downstream_event',
          event: this.createEvent(outcome, 'EXTRACTION_PLAN_COMPLETED', [
            artifact('extraction_plan', 'module-3.scripting', {
              target_url: outcome.produced_event.payload.target_url as string,
              script_id: outcome.produced_event.payload.script_id as string,
              playwright_script: outcome.produced_event.payload.playwright_script as string,
            }, outcome.confidence_score),
          ]),
        };
      case 'scripting_failed':
        return {
          kind: 'downstream_event',
          event: this.createEvent(outcome, 'EXTRACTION_PLAN_FAILED'),
        };
      case 'proxy_acquired':
        return {
          kind: 'downstream_event',
          event: this.createEvent(outcome, 'EXECUTION_CONTEXT_COMPLETED', [
            artifact('execution_session', 'module-3.proxy_manager', {
              target_url: outcome.produced_event.payload.target_url as string,
              proxy_id: outcome.produced_event.payload.proxy_id as string,
              script_id: outcome.produced_event.payload.script_id as string,
            }, outcome.confidence_score),
          ]),
        };
      case 'proxy_failed':
        return {
          kind: 'downstream_event',
          event: this.createEvent(outcome, 'EXECUTION_CONTEXT_FAILED'),
        };
      case 'extraction_completed':
        if (outcome.confidence_score < this.lowConfidenceThreshold) {
          return {
            kind: 'downstream_event',
            event: this.createEvent(outcome, 'LOW_CONFIDENCE_DETECTED', [
              artifact('raw_dataset', 'module-3.extraction', {
                data: outcome.produced_event.payload.extracted_data as Record<string, unknown>,
                source_url: outcome.produced_event.payload.source_url as string,
              }, outcome.confidence_score),
            ]),
          };
        }
        return {
          kind: 'downstream_event',
          event: this.createEvent(outcome, 'EXTRACTION_COMPLETED', [
            artifact('raw_dataset', 'module-3.extraction', {
              data: outcome.produced_event.payload.extracted_data as Record<string, unknown>,
              source_url: outcome.produced_event.payload.source_url as string,
            }, outcome.confidence_score),
          ]),
        };
      case 'extraction_failed':
        return {
          kind: 'downstream_event',
          event: this.createEvent(outcome, 'EXTRACTION_FAILED'),
        };
      case 'qa_failed':
        return {
          kind: 'downstream_event',
          event: this.createEvent(outcome, 'QA_FAILED'),
        };
      case 'qa_validated':
        return {
          kind: 'terminal',
          status: 'completed',
          reason: outcome.produced_event.justification ?? 'Validation completed with final output.',
          artifacts: [
            artifact('validated_dataset', 'module-3.qa', {
              validatedData: outcome.validated_data as Record<string, unknown>,
            }, outcome.confidence_score),
            artifact('final_result', 'module-3.qa', {
              validatedData: outcome.validated_data as Record<string, unknown>,
              traceabilityLog: outcome.traceability_log,
            }, outcome.confidence_score),
          ],
        };
      case 'delivery_handoff_ready':
        return {
          kind: 'terminal',
          status: 'completed',
          reason: outcome.produced_event.justification ?? 'Delivery completed.',
          artifacts: [
            artifact('final_result', 'module-3.delivery', {
              validatedData: outcome.produced_event.payload.validated_data as Record<string, unknown>,
              traceabilityLog: outcome.traceability_log,
            }, outcome.confidence_score),
            artifact('delivery_receipt', 'module-3.delivery', {
              ...(outcome.delivery_receipt ?? {}),
            }, outcome.confidence_score),
          ],
        };
      case 'hitl_required':
        return {
          kind: 'terminal',
          status: 'waiting_for_human',
          reason: outcome.produced_event.justification ?? 'Module 3 requires human review.',
          artifacts: [
            artifact('human_review_packet', 'module-3.hitl', {
              trigger_event: outcome.produced_event.payload.trigger_event as string,
              reason: outcome.produced_event.payload.reason as string,
              failed_payload: outcome.produced_event.payload.failed_payload as Record<string, unknown> | undefined,
              traceabilityLog: outcome.traceability_log,
            }, outcome.confidence_score),
          ],
        };
      default:
        return {
          kind: 'terminal',
          status: 'failed',
          reason: `Unhandled Module 3 event '${outcome.produced_event.event_name}'.`,
          artifacts: [],
        };
    }
  }

  private buildRequest(
    decision: RoutingDecision,
    world: WorldView,
    triggeringEvent: WorkflowEventInput,
  ): Module2ExecutionRequest {
    return {
      workflow_id: decision.workflow_id,
      decision_id: createDecisionId(),
      event_type: 'CAPABILITY_EXECUTION_REQUEST',
      next_task: decision.next_event.toLowerCase(),
      target_capability: decision.target_module ?? 'assess_request',
      input_context: {
        target_url: normalizeTargetUrl(world.task.input.targetSpec),
        scope: triggeringEvent.event_type === 'INPUT_CONTRACT_VALIDATED' ? triggeringEvent.payload.target.scope : undefined,
        requires_js_rendering: world.task.input.constraints.requiresJsRendering,
        max_budget: world.task.input.constraints.budgetUsd,
        max_time_ms: world.task.input.constraints.maxTimeMs,
        expected_schema: world.task.input.requestedSchema,
        artifacts: latestArtifacts(world),
      },
      constraints: {
        timeout_ms: world.task.input.constraints.maxTimeMs,
        budget: world.task.input.constraints.budgetUsd,
      },
      reasoning: decision.reasoning,
      confidence: decision.confidence,
      metadata: {
        trace_id: decision.workflow_id,
        correlation_id:
          triggeringEvent.event_type === 'INPUT_CONTRACT_VALIDATED'
            ? triggeringEvent.event_id
            : triggeringEvent.workflow_id,
        source_module: 'module-2-intelligence',
        timestamp: new Date().toISOString(),
      },
    };
  }

  private createEvent(
    outcome: Awaited<ReturnType<Module3StageExecutor['execute']>>,
    eventType: DownstreamWorkflowEvent['event_type'],
    artifacts: BridgeArtifact[] = [],
  ): DownstreamWorkflowEvent {
    return {
      event_id: randomUUID(),
      workflow_id: outcome.workflow_id,
      event_type: eventType,
      timestamp: new Date().toISOString(),
      payload: {
        module: 'module-3',
        stage: outcome.target_capability,
        reason: outcome.produced_event.justification,
        artifacts,
        metadata: {
          module3_event_name: outcome.produced_event.event_name,
          decision_id: outcome.decision_id,
          traceability_log: outcome.traceability_log,
        },
      },
      confidence_score: outcome.confidence_score,
      justification: outcome.produced_event.justification ?? `${outcome.target_capability} executed by Module 3.`,
    };
  }
}
