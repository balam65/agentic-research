import { randomUUID } from 'node:crypto';

import { createLogger } from '../logs/logger.js';
import { CapabilityRegistry } from './capability_registry_loader.js';
import type { CapabilityModule } from './capability_types.js';
import { WorkflowAwareness } from '../memory/state_view.js';
import { WorldModelStore } from '../memory/world_model_store.js';
import {
  DownstreamWorkflowEvent,
  NonNegotiableInput,
  NonNegotiableOutput,
  RoutingDecision,
  ValidatedInputEvent,
  WorkflowEventInput,
  WorkflowRunResult,
} from '../memory/schema.js';
import { RequestAnalyzer } from './analyzer.js';
import { validateModelRuntimeConfig } from './config_validator.js';
import { assertRoutingDecision, assertWorkflowEventInput } from './event_validator.js';
import { InMemoryEventDispatcher } from './events.js';
import { IntelligenceAgent } from './intelligence_agent.js';
import { Module3ExecutionBridge } from './execution_bridge.js';
import { DynamicPlanner } from './planner.js';
import { GovernancePolicy } from './policy.js';
import { DynamicRouter } from './router.js';

const logger = createLogger('orchestrator');

// ──────────────────────────────────────────────────────────
// Loop Safeguards
// ──────────────────────────────────────────────────────────
const MAX_LOOP_ITERATIONS = 25;
const LOOP_TIMEOUT_MS = 300_000; // 5 minutes
const MAX_CONSECUTIVE_SAME_CAPABILITY = 3;
// ──────────────────────────────────────────────────────────

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
  private readonly module3Bridge = new Module3ExecutionBridge();
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
    logger.info('Booting orchestrator', { registryType: this.registry.constructor.name });
    this.capabilities = await this.registry.load();
    logger.info('Orchestrator booted', { capabilityCount: this.capabilities.length });
    this.booted = true;
  }

  async handleEvent(event: WorkflowEventInput): Promise<RoutingDecision> {
    assertWorkflowEventInput(event);
    await this.boot();
    const workflowId = await this.ensureWorkflow(event);

    logger.info('Handling event', {
      workflowId,
      eventType: event.event_type,
    }, workflowId);

    await this.store.recordWorkflowEvent(workflowId, event);
    await this.dispatcher.publish(event);
    await this.applyEventEffects(workflowId, event);

    const world = await this.store.getWorldView(workflowId);
    const workflowState = await this.store.getWorkflowState(workflowId);

    let selectedCapability: CapabilityModule | null = null;
    let reasoning = '';
    let confidence = 0.5;

    try {
      const analysis = this.analyzer.analyze(event);
      confidence = analysis.confidence;

      if (analysis.hardStops.length > 0) {
        logger.warn('Hard stops detected', { workflowId, hardStops: analysis.hardStops }, workflowId);
        await this.store.updateTaskStatus(workflowId, 'failed', analysis.hardStops.join(' '));
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
        await this.recordDecision(workflowId, decision);
        return decision;
      }

      const policyDecision = this.policy.evaluate(event, workflowState, world);
      if (!policyDecision.allowRouting && policyDecision.forceNextEvent !== 'RETRY_REQUIRED') {
        logger.info('Policy blocked routing', {
          workflowId,
          reason: policyDecision.reason,
          forceEvent: policyDecision.forceNextEvent,
        }, workflowId);
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
        await this.syncTaskStatusFromDecision(workflowId, decision);
        await this.recordDecision(workflowId, decision);
        return decision;
      }

      const plannerAdvisories = await this.planner.scoreCapabilities(world, this.capabilities);
      const candidateIds = this.capabilities.map((capability) => capability.descriptor.id);
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
        await this.syncTaskStatusFromDecision(workflowId, noCandidateDecision);
        await this.recordDecision(workflowId, noCandidateDecision);
        return noCandidateDecision;
      }

      const modelRuntime = validateModelRuntimeConfig();
      const config = modelRuntime.config;
      if (!modelRuntime.valid) {
        logger.warn('Model runtime invalid', {
          workflowId,
          reason: modelRuntime.reason,
        }, workflowId);
        const unavailable = this.router.createDecision({
          workflowId,
          selectedCapability: null,
          reasoning: modelRuntime.reason ?? 'Model configuration is invalid.',
          confidence: analysis.confidence,
          requiresHumanReview: true,
          event,
          decisionSource: 'control_policy',
          status: 'blocked',
          nextEventOverride: 'MODEL_UNAVAILABLE',
        });
        await this.syncTaskStatusFromDecision(workflowId, unavailable);
        await this.recordDecision(workflowId, unavailable);
        return unavailable;
      }

      const aiDecision = await this.intelligenceAgent.decideForEvent({
        world,
        capabilities: this.capabilities,
        event,
        workflowState,
        candidateCapabilityIds: candidateIds,
        plannerAdvisories: Object.fromEntries(
          plannerAdvisories.map((entry) => [
            entry.capability.descriptor.id,
            { score: entry.score, rationale: entry.rationale },
          ]),
        ),
      });

      selectedCapability =
        this.capabilities.find((capability) => capability.descriptor.id === aiDecision.selected_capability_id) ?? null;
      reasoning = aiDecision.reasoning_summary;
      confidence = aiDecision.confidence;

      await this.store.recordIntelligenceDecision(workflowId, {
        model: config.model,
        selectedCapabilityId: aiDecision.selected_capability_id,
        rationale: aiDecision.reasoning_summary,
        confidence: aiDecision.confidence,
        requiresHumanReview: aiDecision.requires_human_review,
        stopExecution: aiDecision.stop_execution,
      });

      if (aiDecision.stop_execution) {
        logger.info('Model requested stop execution', { workflowId }, workflowId);
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
        await this.syncTaskStatusFromDecision(workflowId, stopped);
        await this.recordDecision(workflowId, stopped);
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
        await this.syncTaskStatusFromDecision(workflowId, humanReview);
        await this.recordDecision(workflowId, humanReview);
        return humanReview;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Intelligence layer error - stopping process', error instanceof Error ? error : new Error(errorMessage), {
        workflowId,
      }, workflowId);

      // Create an alert artifact
      await this.store.recordArtifact(workflowId, {
        kind: 'critical_alert',
        producedBy: 'intelligence_agent',
        content: {
          title: 'Intelligence Layer Failure',
          message: errorMessage,
          timestamp: nowIso(),
          severity: 'critical',
          action_required: 'Manual inspection of LLM connectivity or response format.',
        },
      });

      await this.store.recordError(workflowId, {
        source: 'intelligence_agent',
        message: `Intelligence layer terminal failure: ${errorMessage}`,
        retriable: false,
      });

      const failureDecision = this.router.createDecision({
        workflowId,
        selectedCapability: null,
        reasoning: `Terminal intelligence failure: ${errorMessage}`,
        confidence: 1,
        requiresHumanReview: true,
        event,
        decisionSource: 'control_policy',
        status: 'failed',
        nextEventOverride: 'WORKFLOW_FAILED',
      });

      await this.syncTaskStatusFromDecision(workflowId, failureDecision);
      await this.recordDecision(workflowId, failureDecision);
      return failureDecision;
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
      await this.syncTaskStatusFromDecision(workflowId, completed);
      await this.recordDecision(workflowId, completed);
      return completed;
    }

    // ── Planner fallback: if the LLM didn't select a capability, ask the planner ──
    if (!selectedCapability) {
      logger.warn('LLM did not select a capability. Falling back to planner.', {
        workflowId,
        aiReasoning: reasoning,
      }, workflowId);

      const plannerChoice = await this.planner.chooseNext(world, this.capabilities);
      if (plannerChoice) {
        selectedCapability = plannerChoice.capability;
        reasoning = `${reasoning} [Planner fallback selected '${plannerChoice.capability.descriptor.id}': ${plannerChoice.rationale}]`;
        confidence = Math.max(confidence * 0.8, plannerChoice.score * 0.7);
        logger.info('Planner fallback selected capability', {
          workflowId,
          capabilityId: plannerChoice.capability.descriptor.id,
          plannerScore: plannerChoice.score,
          adjustedConfidence: confidence,
        }, workflowId);
      } else {
        logger.warn('Planner also returned no capability. Workflow blocked.', { workflowId }, workflowId);
      }
    }

    const decision = this.router.createDecision({
      workflowId,
      selectedCapability,
      reasoning,
      confidence,
      requiresHumanReview: false,
      event,
      decisionSource: selectedCapability ? 'model' : 'control_policy',
      status: selectedCapability ? 'in_progress' : 'blocked',
      nextEventOverride: selectedCapability ? undefined : 'MODEL_UNAVAILABLE',
    });
    await this.syncTaskStatusFromDecision(workflowId, decision);
    if (selectedCapability) {
      await this.store.recordCapabilitySelection(workflowId, selectedCapability.descriptor.id, reasoning);
    }
    await this.store.updateWorkflowState(workflowId, (state) => {
      const awareness = new WorkflowAwareness(state);
      if (decision.target_module) {
        return awareness.addPendingStage(decision.target_module);
      }
      return state;
    });
    await this.recordDecision(workflowId, decision);
    return decision;
  }

  /**
   * Event loop with robust loop prevention:
   * 1. MAX_LOOP_ITERATIONS — hard cap on iterations
   * 2. LOOP_TIMEOUT_MS — absolute wall-clock timeout
   * 3. Cycle detection — detect consecutive repeated capability selections
   */
  async handleEventLoop(event: WorkflowEventInput): Promise<WorkflowRunResult> {
    let currentEvent: WorkflowEventInput = event;
    let lastDecision: RoutingDecision | null = null;
    const startTime = Date.now();

    // Cycle detection state
    const capabilityHistory: string[] = [];

    for (let iteration = 0; iteration < MAX_LOOP_ITERATIONS; iteration++) {
      // ── Guard: Wall-clock timeout ──
      const elapsed = Date.now() - startTime;
      if (elapsed > LOOP_TIMEOUT_MS) {
        logger.error('Event loop timeout', new Error('Loop timeout'), {
          workflowId: lastDecision?.workflow_id,
          iteration,
          elapsedMs: elapsed,
          timeoutMs: LOOP_TIMEOUT_MS,
        });
        const workflowId = lastDecision?.workflow_id ?? 'unknown';
        return {
          workflow_id: workflowId,
          terminal: true,
          terminal_reason: `Event loop timed out after ${Math.round(elapsed / 1000)}s (limit: ${LOOP_TIMEOUT_MS / 1000}s).`,
          last_decision: lastDecision,
          output: await this.safeToOutput(workflowId),
        };
      }

      logger.debug('Event loop iteration', {
        iteration,
        elapsedMs: elapsed,
        eventType: currentEvent.event_type,
      });

      const decision = await this.handleEvent(currentEvent);
      lastDecision = decision;

      // ── Guard: Cycle detection ──
      if (decision.target_module) {
        capabilityHistory.push(decision.target_module);
        if (this.detectCycle(capabilityHistory)) {
          logger.error('Cycle detected in event loop', new Error('Capability cycle'), {
            workflowId: decision.workflow_id,
            iteration,
            recentCapabilities: capabilityHistory.slice(-MAX_CONSECUTIVE_SAME_CAPABILITY),
          }, decision.workflow_id);

          await this.store.updateTaskStatus(decision.workflow_id, 'failed',
            `Orchestrator detected a capability cycle (${capabilityHistory.slice(-MAX_CONSECUTIVE_SAME_CAPABILITY).join(' → ')}). Breaking loop.`
          );
          return {
            workflow_id: decision.workflow_id,
            terminal: true,
            terminal_reason: `Capability cycle detected: ${capabilityHistory.slice(-MAX_CONSECUTIVE_SAME_CAPABILITY).join(' → ')}. Loop halted.`,
            last_decision: lastDecision,
            output: await this.safeToOutput(decision.workflow_id),
          };
        }
      }

      if (!this.requiresExecution(decision)) {
        logger.info('Event loop terminated (no further execution needed)', {
          workflowId: decision.workflow_id,
          nextEvent: decision.next_event,
          iteration,
          totalElapsedMs: Date.now() - startTime,
        }, decision.workflow_id);

        return {
          workflow_id: decision.workflow_id,
          terminal: true,
          terminal_reason: decision.reasoning,
          last_decision: decision,
          output: await this.toOutput(decision.workflow_id),
        };
      }

      const world = await this.store.getWorldView(decision.workflow_id);
      const executionOutcome = await this.module3Bridge.execute(decision, world, currentEvent);

      if (executionOutcome.kind === 'downstream_event') {
        currentEvent = executionOutcome.event;
        continue;
      }

      await this.persistTerminalExecutionOutcome(decision.workflow_id, decision.target_module, executionOutcome);

      logger.info('Event loop terminated (terminal outcome)', {
        workflowId: decision.workflow_id,
        status: executionOutcome.status,
        iteration,
        totalElapsedMs: Date.now() - startTime,
      }, decision.workflow_id);

      return {
        workflow_id: decision.workflow_id,
        terminal: true,
        terminal_reason: executionOutcome.reason,
        last_decision: lastDecision,
        output: await this.toOutput(decision.workflow_id),
      };
    }

    // ── Guard: Max iterations reached ──
    logger.error('Event loop max iterations reached', new Error('Max iterations'), {
      workflowId: lastDecision?.workflow_id,
      maxIterations: MAX_LOOP_ITERATIONS,
      totalElapsedMs: Date.now() - startTime,
    });

    const workflowId = lastDecision?.workflow_id ?? 'unknown';
    if (workflowId !== 'unknown') {
      await this.store.updateTaskStatus(workflowId, 'failed',
        `Orchestrator halted: exceeded maximum ${MAX_LOOP_ITERATIONS} iterations.`
      );
    }

    return {
      workflow_id: workflowId,
      terminal: true,
      terminal_reason: `Event loop exceeded maximum ${MAX_LOOP_ITERATIONS} iterations without reaching terminal state.`,
      last_decision: lastDecision,
      output: await this.safeToOutput(workflowId),
    };
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
    await this.handleEventLoop(event);
    return input.requestId;
  }

  async run(taskId: string): Promise<NonNegotiableOutput> {
    return this.toOutput(taskId);
  }

  async toOutput(taskId: string): Promise<NonNegotiableOutput> {
    const world = await this.store.getWorldView(taskId);
    const finalResult = [...world.artifacts].reverse().find((artifact) => artifact.kind === 'final_result');
    const deliveryReceipt = [...world.artifacts].reverse().find((artifact) => artifact.kind === 'delivery_receipt');
    const reviewPacket = [...world.artifacts].reverse().find((artifact) => artifact.kind === 'human_review_packet');
    const workflowState = await this.store.getWorkflowState(taskId);

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

  // ──────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────

  /**
   * Detects if the last N capability selections are all identical,
   * indicating a potential infinite cycle.
   */
  private detectCycle(history: string[]): boolean {
    if (history.length < MAX_CONSECUTIVE_SAME_CAPABILITY) return false;

    const recent = history.slice(-MAX_CONSECUTIVE_SAME_CAPABILITY);
    return recent.every(cap => cap === recent[0]);
  }

  /**
   * Safe toOutput that doesn't throw for unknown tasks (used in error paths).
   */
  private async safeToOutput(workflowId: string): Promise<NonNegotiableOutput> {
    try {
      return await this.toOutput(workflowId);
    } catch {
      return {
        requestId: workflowId,
        status: 'failed',
        validatedData: undefined,
        deliveryReceipt: undefined,
        reviewPacketId: undefined,
      };
    }
  }

  private requiresExecution(decision: RoutingDecision): boolean {
    return (
      decision.target_module !== null &&
      !decision.requires_human_review &&
      !['WORKFLOW_COMPLETED', 'WORKFLOW_FAILED', 'HITL_REQUIRED', 'MODEL_UNAVAILABLE', 'NO_ACTION_REQUIRED'].includes(
        decision.next_event,
      )
    );
  }

  private async ensureWorkflow(event: WorkflowEventInput): Promise<string> {
    const taskId = event.event_type === 'INPUT_CONTRACT_VALIDATED' ? event.event_id : event.workflow_id;
    const exists = await this.store.hasTask(taskId);

    if (event.event_type === 'INPUT_CONTRACT_VALIDATED') {
      if (!exists) {
        await this.store.submitTask({
          id: taskId,
          input: {
            requestId: taskId,
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
    } else {
      // For join/resume events, ensure memory is hydrated
      const isInMemory = this.store.listTasks().some((t) => t.id === taskId);
      if (!isInMemory && exists) {
        await this.store.hydrateTask(taskId);
      } else if (!exists) {
        throw new Error(`Orchestrator received event for unknown task '${taskId}'`);
      }
    }

    // Always ensure memory has the state before returning
    await this.store.getWorkflowState(taskId);
    return taskId;
  }

  private async applyEventEffects(workflowId: string, event: WorkflowEventInput): Promise<void> {
    if (event.event_type === 'INPUT_CONTRACT_VALIDATED') {
      await this.store.updateTaskStatus(workflowId, 'active', 'Workflow started from validated input event.');
      return;
    }

    const stage = inferStageFromEvent(event);
    await this.store.updateWorkflowState(workflowId, (state) => {
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
      await this.store.recordArtifact(workflowId, artifact);
    }
    for (const metric of event.payload.metrics ?? []) {
      await this.store.recordMetric(workflowId, metric);
    }

    if (event.event_type.endsWith('_FAILED')) {
      await this.store.recordError(workflowId, {
        source: event.payload.module ?? stage,
        message: event.payload.reason ?? event.justification,
        retriable: true,
      });
      await this.store.updateTaskStatus(workflowId, 'active', `Downstream failure recorded for stage '${stage}'.`);
    }
  }

  private async recordDecision(workflowId: string, decision: RoutingDecision): Promise<void> {
    assertRoutingDecision(decision);
    await this.store.recordRoutingDecision(workflowId, decision);
    void this.dispatcher.publishDecision(decision);
  }

  private async syncTaskStatusFromDecision(workflowId: string, decision: RoutingDecision): Promise<void> {
    if (decision.status === 'waiting_for_human') {
      await this.store.updateTaskStatus(workflowId, 'waiting_for_human', decision.reasoning);
      return;
    }
    if (decision.status === 'completed') {
      await this.store.updateTaskStatus(workflowId, 'completed', decision.reasoning);
      return;
    }
    if (decision.status === 'failed' || decision.status === 'blocked') {
      await this.store.updateTaskStatus(workflowId, 'failed', decision.reasoning);
      return;
    }
    await this.store.updateTaskStatus(workflowId, 'active', decision.reasoning);
  }

  private async persistTerminalExecutionOutcome(
    workflowId: string,
    stage: string | null,
    outcome: Extract<Awaited<ReturnType<Module3ExecutionBridge['execute']>>, { kind: 'terminal' }>,
  ): Promise<void> {
    for (const nextArtifact of outcome.artifacts) {
      await this.store.recordArtifact(workflowId, nextArtifact);
    }

    await this.store.updateWorkflowState(workflowId, (state) => {
      const awareness = new WorkflowAwareness(state);
      const nextState =
        stage && outcome.status === 'completed'
          ? awareness.markStageCompleted(stage)
          : stage && outcome.status === 'failed'
            ? awareness.markStageFailed(stage)
            : state;

      return {
        ...nextState,
        currentStatus:
          outcome.status === 'completed'
            ? 'completed'
            : outcome.status === 'waiting_for_human'
              ? 'waiting_for_human'
              : 'failed',
      };
    });

    if (outcome.status === 'completed') {
      await this.store.updateTaskStatus(workflowId, 'completed', outcome.reason);
      return;
    }
    if (outcome.status === 'waiting_for_human') {
      await this.store.updateTaskStatus(workflowId, 'waiting_for_human', outcome.reason);
      return;
    }
    await this.store.updateTaskStatus(workflowId, 'failed', outcome.reason);
  }
}
