import { createLogger } from '../logs/logger.js';
import { WorldModelPort, InMemoryWorldModelPort } from '../memory/world_model_port.js';
import type { PipelineInput, PipelineOutput, PipelineEvent, CapabilityService } from '../utils/contracts.js';
import { isPipelineInput } from '../utils/contracts.js';
import { ConfidenceScorer } from '../utils/confidence_scorer.js';
import { TraceBuilder } from '../utils/trace_builder.js';
import { ServiceCapabilityRegistry } from '../tools/capability_registry.js';
import { EventBus } from '../tools/event_bus.js';
import { HitlPolicyEngine } from '../tools/hitl_policy_engine.js';
import { createDefaultCapabilityServices } from '../tools/default_capabilities.js';
import { createCapabilityContext } from '../tools/capability_context.js';

const logger = createLogger('pipeline-engine');

export interface PipelineEngineOptions {
  worldModel?: WorldModelPort;
}

/**
 * Legacy pipeline engine — retained for backwards compatibility.
 * Prefer the orchestrator-based event loop for production use.
 */
export class PipelineEngine {
  private readonly worldModel: WorldModelPort;
  private readonly registry = new ServiceCapabilityRegistry();
  private readonly eventBus = new EventBus();
  private readonly hitlPolicy = new HitlPolicyEngine();

  constructor(options: PipelineEngineOptions = {}) {
    this.worldModel = options.worldModel ?? new InMemoryWorldModelPort();
    for (const service of createDefaultCapabilityServices()) {
      this.registry.register(service);
    }
  }

  async run(input: PipelineInput): Promise<PipelineOutput> {
    if (!isPipelineInput(input)) {
      throw new Error('Invalid pipeline input payload.');
    }

    const endTimer = logger.startTimer('Pipeline execution');

    const jobId = `job-${Date.now()}`;
    const context = createCapabilityContext(input, { jobId, worldModel: this.worldModel });

    await this.worldModel.initJob({
      id: jobId,
      title: `Pipeline job for ${input.target_domain}`,
      status: 'running',
      input_params: input,
      priority: 1,
    });

    await this.worldModel.registerCapabilities(
      this.registry.list().map((service) => ({
        name: service.name,
        consumes: service.consumes,
        produces: service.produces,
      })),
    );

    const startEvent: PipelineEvent = {
      event_name: 'input_received',
      job_id: jobId,
      payload: input as unknown as Record<string, unknown>,
      confidence_score: 1,
      justification: 'Pipeline input received.',
    };
    this.eventBus.publish(startEvent);
    context.traceBuilder.addFromEvent(startEvent);
    await this.worldModel.writeEvent(startEvent);

    let current = startEvent;
    const maxSteps = 20;
    let steps = 0;

    while (steps < maxSteps) {
      steps++;
      const consumers = this.registry.getConsumers(current.event_name);
      if (consumers.length === 0) break;

      const service = consumers[0]!;
      const results = await service.execute(context, current);
      if (results.length === 0) break;

      const nextEvent = results[0]!;
      context.traceBuilder.addFromEvent(nextEvent);
      this.eventBus.publish(nextEvent);
      await this.worldModel.writeEvent(nextEvent);

      const hitlEvent = this.hitlPolicy.evaluate(nextEvent);
      if (hitlEvent) {
        context.traceBuilder.addFromEvent(hitlEvent);
        await this.worldModel.updateJobStatus(jobId, 'hitl_required');
        endTimer();
        return {
          validated_data: nextEvent.payload,
          traceability_log: context.traceBuilder.toArray(),
          confidence_score: context.confidenceScorer.fromEvents([nextEvent]),
          next_action: 'hitl_required',
        };
      }

      if (nextEvent.event_name === 'delivery_handoff_ready' || nextEvent.event_name === 'qa_validated') {
        await this.worldModel.updateJobStatus(jobId, 'completed');
        await this.worldModel.updateJobFinalOutput(jobId, JSON.stringify(nextEvent.payload));
        endTimer();
        return {
          validated_data: nextEvent.payload.validated_data ?? nextEvent.payload,
          traceability_log: context.traceBuilder.toArray(),
          confidence_score: context.confidenceScorer.fromEvents([nextEvent]),
          next_action: 'delivery_handoff_ready',
        };
      }

      current = nextEvent;
    }

    endTimer();
    await this.worldModel.updateJobStatus(jobId, 'completed');
    return {
      validated_data: current.payload,
      traceability_log: context.traceBuilder.toArray(),
      confidence_score: context.confidenceScorer.fromEvents([current]),
      next_action: 'delivery_handoff_ready',
    };
  }
}
