import { randomUUID } from 'node:crypto';

import { CapabilityRegistry } from '../capabilities/registry.js';
import { CapabilityModule } from '../capabilities/types.js';
import { WorkflowAwareness } from '../world_model/state_view.js';
import { WorldModelStore } from '../world_model/event_store.js';
import {
  DownstreamWorkflowEvent,
  NonNegotiableInput,
  NonNegotiableOutput,
  RoutingDecision,
  ValidatedInputEvent,
  WorkflowEventInput,
} from '../world_model/schema.js';
import { RequestAnalyzer } from './analyzer.js';
import { InMemoryEventDispatcher } from './events.js';
import { getModelConfig } from './model_config.js';
import { IntelligenceAgent } from './intelligence_agent.js';
import { DynamicPlanner } from './planner.js';
import { GovernancePolicy } from './policy.js';
import { DynamicRouter } from './router.js';

function nowIso(): string {
  return new Date().toISOString();
}

function inferStageFromEvent(event: DownstreamWorkflowEvent): string {
  if (event.payload.stage) {
    return event.payload.stage;
  }
  if (event.payload.module) {
    return event.payload.module;
  }
  return event.event_type.toLowerCase().replace(/_(completed|failed)$/, '');
}

export class AgenticOrchestrator {
  private readonly analyzer = new RequestAnalyzer();
  private readonly planner = new DynamicPlanner();
  private readonly policy = new GovernancePolicy();
  private readonly router = new DynamicRouter();
  private readonly dispatcher = new InMemoryEventDispatcher();
  private readonly intelligenceAgent = new IntelligenceAgent(
    new URL('../context/intelligence-system-prompt.md', import.meta.url),
    new URL('../context/', import.meta.url),
  );
  private capabilities: CapabilityModule[] = [];
  private booted = false;

  constructor(
    private readonly store: WorldModelStore,
    private readonly registry: CapabilityRegistry,
  ) {}

  async boot(): Promise<void> {
    if (this.booted) {
      return;
    }
    this.capabilities = await this.registry.load();
    this.booted = true;
  }

  async handleEvent(event: WorkflowEventInput): Promise<RoutingDecision> {
    await this.boot();
    const workflowId = this.ensureWorkflow(event);

    this.store.recordWorkflowEvent(workflowId, event);
    await this.dispatcher.publish(event);
    this.applyEventEffects(workflowId, event);

    const world = this.store.getWorldView(workflowId);
    const workflowState = this.store.getWorkflowState(workflowId);
    const analysis = this.analyzer.analyze(event);

    if (analysis.hardStops.length > 0) {
      this.store.updateTaskStatus(workflowId, 'failed', analysis.hardStops.join(' '));
      const decision = this.router.createDecision({
        workflowId,
        selectedCapability: null,
        reasoning: analysis.hardStops.join(' '),
        confidence: analysis.confidence,
        requiresHumanReview: false,
        event,
        decisionSource: 'control_policy',
        status: 'failed',
        nextEventOverride: 'WORKFLOW_FAILED',
      });
      this.recordDecision(workflowId, decision);
      return decision;
    }

    const policyDecision = this.policy.evaluate(event, workflowState, world);
    if (!policyDecision.allowRouting) {
      const decision = this.router.createDecision({
        workflowId,
        selectedCapability: null,
        reasoning: policyDecision.reason,
        confidence: analysis.confidence,
        requiresHumanReview: policyDecision.requiresHumanReview,
        event,
        decisionSource: 'control_policy',
        status: policyDecision.status,
        nextEventOverride: policyDecision.forceNextEvent,
      });
      this.syncTaskStatusFromDecision(workflowId, decision);
      this.recordDecision(workflowId, decision);
      return decision;
    }

    const candidates = await this.planner.scoreCapabilities(world, this.capabilities);
    const candidateIds = candidates.map((candidate) => candidate.capability.descriptor.id);
    if (candidateIds.length === 0) {
      const noCandidateDecision = this.router.createDecision({
        workflowId,
        selectedCapability: null,
        reasoning: 'No viable capability candidates were found for the current context.',
        confidence: analysis.confidence,
        requiresHumanReview: true,
        event,
        decisionSource: 'control_policy',
        status: 'blocked',
        nextEventOverride: 'WORKFLOW_FAILED',
      });
      this.syncTaskStatusFromDecision(workflowId, noCandidateDecision);
      this.recordDecision(workflowId, noCandidateDecision);
      return noCandidateDecision;
    }

    let selectedCapability: CapabilityModule | null = null;
    let reasoning = '';
    let confidence = analysis.confidence;

    const config = getModelConfig();
    if (!config.intelligenceAgentEnabled) {
      const unavailable = this.router.createDecision({
        workflowId,
        selectedCapability: null,
        reasoning: 'Model-driven routing is disabled by configuration.',
        confidence: analysis.confidence,
        requiresHumanReview: true,
        event,
        decisionSource: 'control_policy',
        status: 'blocked',
        nextEventOverride: 'MODEL_UNAVAILABLE',
      });
      this.syncTaskStatusFromDecision(workflowId, unavailable);
      this.recordDecision(workflowId, unavailable);
      return unavailable;
    }

    const canCallModel =
      config.apiKey.trim().length > 0 || config.provider === 'local' || config.provider === 'lmstudio';
    if (!canCallModel) {
      const unavailable = this.router.createDecision({
        workflowId,
        selectedCapability: null,
        reasoning: 'Model configuration does not allow a request (missing key for non-local provider).',
        confidence: analysis.confidence,
        requiresHumanReview: true,
        event,
        decisionSource: 'control_policy',
        status: 'blocked',
        nextEventOverride: 'MODEL_UNAVAILABLE',
      });
      this.syncTaskStatusFromDecision(workflowId, unavailable);
      this.recordDecision(workflowId, unavailable);
      return unavailable;
    }

    try {
      const aiDecision = await this.intelligenceAgent.decideForEvent({
        world,
        capabilities: this.capabilities,
        event,
        workflowState,
        candidateCapabilityIds: candidateIds,
      });
      selectedCapability = this.capabilities.find(
        (capability) => capability.descriptor.id === aiDecision.selected_capability_id,
      ) ?? null;
      reasoning = aiDecision.reasoning_summary;
      confidence = aiDecision.confidence;

      this.store.recordIntelligenceDecision(workflowId, {
        model: config.model,
        selectedCapabilityId: aiDecision.selected_capability_id,
        rationale: aiDecision.reasoning_summary,
        confidence: aiDecision.confidence,
        requiresHumanReview: aiDecision.requires_human_review,
        stopExecution: aiDecision.stop_execution,
      });

      if (aiDecision.stop_execution) {
        const stopped = this.router.createDecision({
          workflowId,
          selectedCapability: null,
          reasoning: aiDecision.reasoning_summary,
          confidence: aiDecision.confidence,
          requiresHumanReview: false,
          event,
          decisionSource: 'model',
          status: 'completed',
          nextEventOverride: 'WORKFLOW_COMPLETED',
        });
        this.syncTaskStatusFromDecision(workflowId, stopped);
        this.recordDecision(workflowId, stopped);
        return stopped;
      }

      if (aiDecision.requires_human_review) {
        const humanReview = this.router.createDecision({
          workflowId,
          selectedCapability: null,
          reasoning: aiDecision.reasoning_summary,
          confidence: aiDecision.confidence,
          requiresHumanReview: true,
          event,
          decisionSource: 'model',
          status: 'waiting_for_human',
          nextEventOverride: 'HITL_REQUIRED',
        });
        this.syncTaskStatusFromDecision(workflowId, humanReview);
        this.recordDecision(workflowId, humanReview);
        return humanReview;
      }
    } catch (error) {
      this.store.recordError(workflowId, {
        source: 'intelligence_agent',
        message: error instanceof Error ? error.message : 'Unknown intelligence decision error.',
        retriable: true,
      });
      const unavailable = this.router.createDecision({
        workflowId,
        selectedCapability: null,
        reasoning: 'Model call failed or returned invalid output; execution routing is blocked.',
        confidence: analysis.confidence,
        requiresHumanReview: true,
        event,
        decisionSource: 'control_policy',
        status: 'blocked',
        nextEventOverride: 'MODEL_UNAVAILABLE',
      });
      this.syncTaskStatusFromDecision(workflowId, unavailable);
      this.recordDecision(workflowId, unavailable);
      return unavailable;
    }

    const goalsSatisfied = world.task.outputGoal.every((goal) =>
      world.artifacts.some((artifact) => artifact.kind === goal),
    );
    if (goalsSatisfied) {
      const completed = this.router.createDecision({
        workflowId,
        selectedCapability: null,
        reasoning: 'Non-negotiable output goals are already satisfied.',
        confidence: Math.max(confidence, 0.9),
        requiresHumanReview: false,
        event,
        decisionSource: 'control_policy',
        status: 'completed',
        nextEventOverride: 'WORKFLOW_COMPLETED',
      });
      this.syncTaskStatusFromDecision(workflowId, completed);
      this.recordDecision(workflowId, completed);
      return completed;
    }

    const decision = this.router.createDecision({
      workflowId,
      selectedCapability,
      reasoning,
      confidence,
      requiresHumanReview: false,
      event,
      decisionSource: 'model',
      status: selectedCapability ? 'in_progress' : 'blocked',
      nextEventOverride: selectedCapability ? undefined : 'MODEL_UNAVAILABLE',
    });
    this.syncTaskStatusFromDecision(workflowId, decision);
    this.store.updateWorkflowState(workflowId, (state) => {
      const awareness = new WorkflowAwareness(state);
      if (decision.target_module) {
        return awareness.addPendingStage(decision.target_module);
      }
      return state;
    });
    this.recordDecision(workflowId, decision);
    return decision;
  }

  async submit(input: NonNegotiableInput): Promise<string> {
    const event: ValidatedInputEvent = {
      event_id: input.requestId,
      event_type: 'INPUT_CONTRACT_VALIDATED',
      timestamp: nowIso(),
      payload: {
        target: {
          url_or_domain: input.targetSpec,
          scope: 'requested_scope',
        },
        search_parameters: {
          ...(input.searchParameters
            ? {
                origin: input.searchParameters.origin,
                destination: input.searchParameters.destination,
                departure_date: input.searchParameters.departureDate,
              }
            : {}),
        },
        intent_context: input.intentContext ?? 'Input submitted through legacy submit interface.',
        constraints: {
          max_budget: input.constraints.budgetUsd,
          max_time_ms: input.constraints.maxTimeMs,
          requires_js_rendering: input.constraints.requiresJsRendering,
          human_in_loop_required: input.constraints.humanReviewAllowed === true,
          proxy_tier: input.constraints.proxyTier,
          anti_bot_risk: input.constraints.antiBotRisk,
          authentication_required: input.constraints.authenticationRequired,
        },
        expected_schema: input.requestedSchema,
      },
      confidence_score: 1,
      justification: 'Input submitted through legacy submit interface.',
    };
    await this.handleEvent(event);
    return input.requestId;
  }

  async run(taskId: string): Promise<NonNegotiableOutput> {
    return this.toOutput(taskId);
  }

  toOutput(taskId: string): NonNegotiableOutput {
    const world = this.store.getWorldView(taskId);
    const finalResult = [...world.artifacts].reverse().find((artifact) => artifact.kind === 'final_result');
    const deliveryReceipt = [...world.artifacts].reverse().find((artifact) => artifact.kind === 'delivery_receipt');
    const reviewPacket = [...world.artifacts].reverse().find((artifact) => artifact.kind === 'human_review_packet');
    const workflowState = this.store.getWorkflowState(taskId);

    return {
      requestId: world.task.id,
      status:
        workflowState.currentStatus === 'waiting_for_human'
          ? 'waiting_for_human'
          : workflowState.currentStatus === 'completed'
            ? 'completed'
            : 'failed',
      validatedData: finalResult?.content.validatedData as Record<string, unknown> | undefined,
      deliveryReceipt: deliveryReceipt?.content,
      reviewPacketId: reviewPacket?.id,
    };
  }

  getStore(): WorldModelStore {
    return this.store;
  }

  private ensureWorkflow(event: WorkflowEventInput): string {
    if (event.event_type === 'INPUT_CONTRACT_VALIDATED') {
      const exists = this.store.listTasks().some((task) => task.id === event.event_id);
      if (!exists) {
        this.store.submitTask({
          id: event.event_id,
          input: {
            requestId: event.event_id,
            targetSpec: event.payload.target.url_or_domain,
            searchParameters: {
              origin: event.payload.search_parameters.origin,
              destination: event.payload.search_parameters.destination,
              departureDate: event.payload.search_parameters.departure_date,
            },
            intentContext: event.payload.intent_context,
            requestedSchema: event.payload.expected_schema,
            constraints: {
              budgetUsd: event.payload.constraints.max_budget,
              maxTimeMs: event.payload.constraints.max_time_ms,
              requiresJsRendering: event.payload.constraints.requires_js_rendering,
              humanReviewAllowed: event.payload.constraints.human_in_loop_required,
              proxyTier: event.payload.constraints.proxy_tier,
              antiBotRisk: event.payload.constraints.anti_bot_risk,
              authenticationRequired: event.payload.constraints.authentication_required,
            },
          },
          outputGoal: ['final_result'],
          status: 'submitted',
          governance: {
            humanReviewRequired: event.payload.constraints.human_in_loop_required === true,
          },
        });
      }
      return event.event_id;
    }
    this.store.getWorldView(event.workflow_id);
    return event.workflow_id;
  }

  private applyEventEffects(workflowId: string, event: WorkflowEventInput): void {
    if (event.event_type === 'INPUT_CONTRACT_VALIDATED') {
      this.store.updateTaskStatus(workflowId, 'active', 'Workflow started from validated input event.');
      return;
    }

    const stage = inferStageFromEvent(event);
    this.store.updateWorkflowState(workflowId, (state) => {
      const awareness = new WorkflowAwareness(state);
      if (event.event_type.endsWith('_COMPLETED') || event.event_type === 'HITL_APPROVED') {
        return awareness.markStageCompleted(stage);
      }
      if (event.event_type.endsWith('_FAILED') || event.event_type === 'HITL_REJECTED') {
        return awareness.markStageFailed(stage);
      }
      if (event.event_type === 'LOW_CONFIDENCE_DETECTED') {
        return {
          ...state,
          retryCount: state.retryCount + 1,
        };
      }
      return state;
    });

    for (const artifact of event.payload.artifacts ?? []) {
      this.store.recordArtifact(workflowId, artifact);
    }
    for (const metric of event.payload.metrics ?? []) {
      this.store.recordMetric(workflowId, metric);
    }

    if (event.event_type.endsWith('_FAILED')) {
      this.store.recordError(workflowId, {
        source: event.payload.module ?? stage,
        message: event.payload.reason ?? event.justification,
        retriable: true,
      });
      this.store.updateTaskStatus(workflowId, 'active', `Downstream failure recorded for stage '${stage}'.`);
    }
  }

  private recordDecision(workflowId: string, decision: RoutingDecision): void {
    this.store.recordRoutingDecision(workflowId, decision);
    void this.dispatcher.publishDecision(decision);
  }

  private syncTaskStatusFromDecision(workflowId: string, decision: RoutingDecision): void {
    if (decision.status === 'waiting_for_human') {
      this.store.updateTaskStatus(workflowId, 'waiting_for_human', decision.reasoning);
      return;
    }
    if (decision.status === 'completed') {
      this.store.updateTaskStatus(workflowId, 'completed', decision.reasoning);
      return;
    }
    if (decision.status === 'failed' || decision.status === 'blocked') {
      this.store.updateTaskStatus(workflowId, 'failed', decision.reasoning);
      return;
    }
    this.store.updateTaskStatus(workflowId, 'active', decision.reasoning);
  }
}
