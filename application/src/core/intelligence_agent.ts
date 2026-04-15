import { readFile } from 'node:fs/promises';

import { createLogger } from '../logs/logger.js';
import type { CapabilityModule } from './capability_types.js';
import type { ArtifactRecord, WorkflowEventInput, WorkflowState, WorldView } from '../memory/schema.js';
import { AgentDecision, parseAgentDecision } from './decision_schema.js';
import { DecisionGuard } from './decision_guard.js';
import { ModelClient } from './model_client.js';

const logger = createLogger('intelligence-agent');

interface CapabilityPromptContext {
  id: string;
  version: string;
  description: string;
  inputs: string[];
  outputs: string[];
  executionContract: string;
  tags: string[];
  plannerScore?: number;
  plannerRationale?: string;
  descriptorText?: string;
}

export class IntelligenceAgent {
  private readonly client = new ModelClient();
  private readonly guard = new DecisionGuard();

  constructor(
    private readonly systemPromptUrl: URL,
    private readonly capabilityDescriptorRoot: URL,
  ) {}

  async decide(world: WorldView, capabilities: CapabilityModule[]): Promise<AgentDecision> {
    return this.decideForEvent({
      world,
      capabilities,
      event: {
        event_id: world.task.id,
        event_type: 'INPUT_CONTRACT_VALIDATED',
        timestamp: new Date().toISOString(),
        payload: {
          target: {
            url_or_domain: world.task.input.targetSpec,
            scope: 'inferred_scope',
          },
          search_parameters: {
            origin: world.task.input.searchParameters?.origin,
            destination: world.task.input.searchParameters?.destination,
            departure_date: world.task.input.searchParameters?.departureDate,
          },
          intent_context: world.task.input.intentContext ?? 'Legacy decision path.',
          constraints: {
            max_budget: world.task.input.constraints.budgetUsd,
            max_time_ms: world.task.input.constraints.maxTimeMs,
            requires_js_rendering: world.task.input.constraints.requiresJsRendering,
            human_in_loop_required: world.task.governance.humanReviewRequired,
            proxy_tier: world.task.input.constraints.proxyTier,
            anti_bot_risk: world.task.input.constraints.antiBotRisk,
            authentication_required: world.task.input.constraints.authenticationRequired,
          },
          expected_schema: world.task.input.requestedSchema,
        },
        confidence_score: 1,
        justification: 'Legacy decision path.',
      },
      workflowState: {
        workflowId: world.task.id,
        currentStatus: world.task.status === 'active' ? 'in_progress' : world.task.status,
        completedStages: [],
        pendingStages: [],
        failedStages: [],
        routingHistory: [],
        confidenceHistory: [],
        decisionHistory: [],
        justifications: [],
        retryCount: 0,
        lastUpdatedAt: new Date().toISOString(),
      },
      candidateCapabilityIds: capabilities.map((capability) => capability.descriptor.id),
    });
  }

  async decideForEvent(params: {
    world: WorldView;
    capabilities: CapabilityModule[];
    event: WorkflowEventInput;
    workflowState: WorkflowState;
    candidateCapabilityIds: string[];
    plannerAdvisories?: Record<string, { score: number; rationale: string }>;
  }): Promise<AgentDecision> {
    const endTimer = logger.startTimer('LLM decision', {
      taskId: params.world.task.id,
      eventType: params.event.event_type,
    }, params.world.task.id);

    const systemPrompt = await readFile(this.systemPromptUrl, 'utf8');
    const capabilityContext = await Promise.all(
      params.capabilities
        .filter((capability) => params.candidateCapabilityIds.includes(capability.descriptor.id))
        .map(async (capability) => ({
        id: capability.descriptor.id,
        version: capability.descriptor.version,
        description: capability.descriptor.description,
        inputs: capability.descriptor.inputs,
        outputs: capability.descriptor.outputs,
        executionContract: capability.descriptor.executionContract,
        tags: capability.descriptor.tags,
        plannerScore: params.plannerAdvisories?.[capability.descriptor.id]?.score,
        plannerRationale: params.plannerAdvisories?.[capability.descriptor.id]?.rationale,
        descriptorText: await this.tryReadDescriptor(capability.descriptor.id),
      })),
    );

    const worldSummary = {
      task: {
        id: params.world.task.id,
        status: params.world.task.status,
        outputGoal: params.world.task.outputGoal,
        governance: params.world.task.governance,
        input: params.world.task.input,
      },
      workflowState: params.workflowState,
      incomingEvent: params.event,
      artifacts: params.world.artifacts.map((artifact) => this.summarizeArtifact(artifact)),
      errors: params.world.errors,
      metrics: params.world.metrics,
      recentEvents: params.world.events.slice(-12),
    };

    const userPrompt = [
      'Choose the next capability dynamically from the provided registry.',
      'Do not assume a fixed pipeline. Use only current world state, capability contracts, and the non-negotiable output goals.',
      'Use incoming event and workflow state to reason about what should happen next.',
      'Planner scores are advisory hints only. They are not mandatory workflow rules.',
      'Return JSON with keys: selected_capability_id, reasoning_summary, requires_human_review, stop_execution, confidence, missing_information, requested_next_event.',
      '',
      `WORLD_STATE_JSON:\n${JSON.stringify(worldSummary, null, 2)}`,
      '',
      `CAPABILITY_REGISTRY_JSON:\n${JSON.stringify(capabilityContext, null, 2)}`,
    ].join('\n');

    const raw = await this.client.completeJson([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    const decision = parseAgentDecision(raw);
    
    logger.info('LLM decision parsed', {
      selectedCapability: decision.selected_capability_id,
      confidence: decision.confidence,
      stopExecution: decision.stop_execution,
      requiresHumanReview: decision.requires_human_review,
    }, params.world.task.id);

    const guardResult = this.guard.validate(
      decision,
      params.capabilities,
      params.candidateCapabilityIds,
    );
    if (!guardResult.valid) {
      logger.error('Decision guard rejected', new Error(guardResult.reason), {
        selectedCapability: decision.selected_capability_id,
      }, params.world.task.id);
      throw new Error(`Intelligence agent returned an invalid decision: ${guardResult.reason}`);
    }

    if (guardResult.usePlannerFallback) {
      logger.warn('Decision guard recommends planner fallback', {
        reason: guardResult.reason,
        originalSelection: decision.selected_capability_id,
      }, params.world.task.id);
      // Mark the decision so the orchestrator knows to use the planner
      decision.selected_capability_id = null;
      decision.reasoning_summary = `${decision.reasoning_summary} [Planner fallback: ${guardResult.reason}]`;
    }

    endTimer();
    return decision;
  }

  private summarizeArtifact(artifact: ArtifactRecord): object {
    const summary: Record<string, unknown> = {
      kind: artifact.kind,
      producedBy: artifact.producedBy,
      confidence: artifact.confidence ?? null,
    };

    if (artifact.kind === 'raw_dataset' && Array.isArray(artifact.content)) {
      summary.content_summary = `Large dataset with ${artifact.content.length} records. Showing top 2 samples.`;
      summary.content_samples = artifact.content.slice(0, 2);
      return summary;
    }

    if (typeof artifact.content === 'object' && artifact.content !== null) {
      const stringified = JSON.stringify(artifact.content);
      if (stringified.length > 2000) {
        summary.content_summary = `Large object (${stringified.length} chars). Truncated view.`;
        summary.content_keys = Object.keys(artifact.content);
        summary.content_partial = stringified.slice(0, 500) + '... [TRUNCATED]';
        return summary;
      }
    }

    summary.content = artifact.content;
    return summary;
  }

  private async tryReadDescriptor(capabilityId: string): Promise<string | undefined> {
    const descriptorUrl = new URL(`capabilities/${capabilityId}.md`, this.capabilityDescriptorRoot);
    try {
      return await readFile(descriptorUrl, 'utf8');
    } catch {
      return undefined;
    }
  }
}
