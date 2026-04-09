import { readFile } from 'node:fs/promises';

import { CapabilityModule } from '../capabilities/types.js';
import { WorkflowEventInput, WorkflowState, WorldView } from '../world_model/schema.js';
import { AgentDecision, parseAgentDecision } from './decision_schema.js';
import { DecisionGuard } from './decision_guard.js';
import { ModelClient } from './model_client.js';

interface CapabilityPromptContext {
  id: string;
  version: string;
  description: string;
  inputs: string[];
  outputs: string[];
  executionContract: string;
  tags: string[];
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
          constraints: {
            max_budget: world.task.input.constraints.budgetUsd,
            max_time_ms: world.task.input.constraints.maxTimeMs,
            requires_js_rendering: world.task.input.constraints.requiresJsRendering,
            human_in_loop_required: world.task.governance.humanReviewRequired,
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
  }): Promise<AgentDecision> {
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
      artifacts: params.world.artifacts.map((artifact) => ({
        kind: artifact.kind,
        producedBy: artifact.producedBy,
        confidence: artifact.confidence ?? null,
        content: artifact.content,
      })),
      errors: params.world.errors,
      metrics: params.world.metrics,
      recentEvents: params.world.events.slice(-12),
    };

    const userPrompt = [
      'Choose the next capability dynamically from the provided registry.',
      'Do not assume a fixed pipeline. Use only current world state, capability contracts, and the non-negotiable output goals.',
      'Use incoming event and workflow state to reason about what should happen next.',
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
    const guardResult = this.guard.validate(
      decision,
      params.capabilities,
      params.candidateCapabilityIds,
    );
    if (!guardResult.valid) {
      throw new Error(`Intelligence agent returned an invalid decision: ${guardResult.reason}`);
    }

    return decision;
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
