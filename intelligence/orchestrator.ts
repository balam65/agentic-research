import { CapabilityRegistry } from '../capabilities/registry.js';
import { CapabilityModule } from '../capabilities/types.js';
import { WorldModelStore } from '../world_model/event_store.js';
import { NonNegotiableInput, NonNegotiableOutput } from '../world_model/schema.js';
import { getModelConfig } from './model_config.js';
import { IntelligenceAgent } from './intelligence_agent.js';
import { DynamicPlanner } from './planner.js';
import { GovernancePolicy } from './policy.js';

export class AgenticOrchestrator {
  private readonly planner = new DynamicPlanner();
  private readonly policy = new GovernancePolicy();
  private readonly intelligenceAgent = new IntelligenceAgent(
    new URL('../context/intelligence-system-prompt.md', import.meta.url),
    new URL('../context/', import.meta.url),
  );
  private capabilities: CapabilityModule[] = [];

  constructor(
    private readonly store: WorldModelStore,
    private readonly registry: CapabilityRegistry,
  ) {}

  async boot(): Promise<void> {
    this.capabilities = await this.registry.load();
  }

  async submit(input: NonNegotiableInput): Promise<string> {
    const task = this.store.submitTask({
      id: input.requestId,
      input,
      outputGoal: input.constraints.deliveryMode ? ['final_result', 'delivery_receipt'] : ['final_result'],
      status: 'submitted',
      governance: {
        humanReviewRequired: input.constraints.humanReviewAllowed ?? true,
      },
    });
    return task.id;
  }

  async run(taskId: string, maxIterations = 20): Promise<NonNegotiableOutput> {
    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      const world = this.store.getWorldView(taskId);
      const policyDecision = this.policy.shouldStop(world);
      if (policyDecision.stop) {
        return this.toOutput(taskId);
      }

      const goalsSatisfied = world.task.outputGoal.every((goal) =>
        world.artifacts.some((artifact) => artifact.kind === goal),
      );
      if (goalsSatisfied) {
        this.store.updateTaskStatus(taskId, 'completed', 'All non-negotiable outputs satisfied.');
        return this.toOutput(taskId);
      }

      this.store.updateTaskStatus(taskId, 'active', 'Dynamic orchestrator is selecting the next capability.');
      const config = getModelConfig();
      let selectedCapability: CapabilityModule | null = null;
      let selectedRationale = '';

      if (config.intelligenceAgentEnabled && config.apiKey) {
        try {
          const aiDecision = await this.intelligenceAgent.decide(world, this.capabilities);
          this.store.recordIntelligenceDecision(taskId, {
            model: config.model,
            selectedCapabilityId: aiDecision.selected_capability_id,
            rationale: aiDecision.reasoning_summary,
            confidence: aiDecision.confidence,
            requiresHumanReview: aiDecision.requires_human_review,
            stopExecution: aiDecision.stop_execution,
          });

          if (aiDecision.stop_execution) {
            this.store.updateTaskStatus(taskId, 'completed', aiDecision.reasoning_summary);
            return this.toOutput(taskId);
          }

          if (aiDecision.requires_human_review) {
            this.store.recordArtifact(taskId, {
              kind: 'human_review_packet',
              producedBy: 'intelligence_agent',
              confidence: aiDecision.confidence,
              content: {
                rationale: aiDecision.reasoning_summary,
                missingInformation: aiDecision.missing_information,
              },
            });
            this.store.updateTaskStatus(taskId, 'waiting_for_human', aiDecision.reasoning_summary);
            return this.toOutput(taskId);
          }

          selectedCapability =
            this.capabilities.find(
              (capability) => capability.descriptor.id === aiDecision.selected_capability_id,
            ) ?? null;
          selectedRationale = aiDecision.reasoning_summary;
        } catch (error) {
          this.store.recordError(taskId, {
            source: 'intelligence_agent',
            message: error instanceof Error ? error.message : 'Unknown intelligence agent error.',
            retriable: true,
          });
        }
      }

      if (!selectedCapability) {
        const fallback = await this.planner.chooseNext(world, this.capabilities);
        if (!fallback) {
          this.store.recordError(taskId, {
            source: 'orchestrator',
            message: 'No capability could advance the task from the current world state.',
            retriable: false,
          });
          this.store.updateTaskStatus(taskId, 'failed', 'No viable capability was available.');
          return this.toOutput(taskId);
        }

        selectedCapability = fallback.capability;
        selectedRationale = fallback.rationale;
      }

      this.store.recordCapabilitySelection(taskId, selectedCapability.descriptor.id, selectedRationale);
      const result = await selectedCapability.execute({
        store: this.store,
        task: world.task,
        world,
        input: world.task.input,
      });

      for (const artifact of result.artifacts ?? []) {
        this.store.recordArtifact(taskId, artifact);
      }
      for (const metric of result.metrics ?? []) {
        this.store.recordMetric(taskId, metric);
      }

      if (result.status === 'failed') {
        this.store.recordError(taskId, {
          source: selectedCapability.descriptor.id,
          message: result.reason,
          retriable: result.retriable ?? false,
        });
        this.store.updateTaskStatus(taskId, 'failed', result.reason);
        return this.toOutput(taskId);
      }

      if (result.status === 'human_review') {
        this.store.updateTaskStatus(taskId, 'waiting_for_human', result.reason);
        return this.toOutput(taskId);
      }
    }

    this.store.recordError(taskId, {
      source: 'orchestrator',
      message: 'Execution exhausted the iteration budget.',
      retriable: true,
    });
    this.store.updateTaskStatus(taskId, 'failed', 'Iteration budget exhausted.');
    return this.toOutput(taskId);
  }

  toOutput(taskId: string): NonNegotiableOutput {
    const world = this.store.getWorldView(taskId);
    const finalResult = [...world.artifacts].reverse().find((artifact) => artifact.kind === 'final_result');
    const deliveryReceipt = [...world.artifacts].reverse().find((artifact) => artifact.kind === 'delivery_receipt');
    const reviewPacket = [...world.artifacts].reverse().find((artifact) => artifact.kind === 'human_review_packet');

    return {
      requestId: world.task.id,
      status: world.task.status === 'waiting_for_human' ? 'waiting_for_human' : world.task.status === 'completed' ? 'completed' : 'failed',
      validatedData: finalResult?.content.validatedData as Record<string, unknown> | undefined,
      deliveryReceipt: deliveryReceipt?.content,
      reviewPacketId: reviewPacket?.id,
    };
  }

  getStore(): WorldModelStore {
    return this.store;
  }
}
