import { createLogger } from '../logs/logger.js';
import type { CapabilityContext } from '../tools/capability_context.js';
import type { CapabilityService, PipelineEvent } from '../utils/contracts.js';
import { isRecord } from '../utils/contracts.js';

const logger = createLogger('scheduling-service');

/**
 * Scheduling capability — assigns queue priority and batch scheduling
 * based on constraint analysis and resource availability.
 */
export class SchedulingService implements CapabilityService {
  name = "scheduling";
  consumes = ["assessment_completed"];
  produces = ["job_scheduled", "scheduling_failed"];

  async execute(_context: CapabilityContext, event: PipelineEvent): Promise<PipelineEvent[]> {
    if (!isRecord(event.payload) || typeof event.payload.target_domain !== "string") {
      return [this.failedEvent(event, "Assessment payload missing target_domain")];
    }

    const constraints = isRecord(event.payload.budget_or_time_constraints)
      ? event.payload.budget_or_time_constraints
      : {};

    // --- Real scheduling logic ---

    // 1. Determine priority based on time/budget constraints
    const maxMinutes = typeof constraints.max_minutes === "number" ? constraints.max_minutes : 120;
    const maxBudget = typeof constraints.max_budget === "number" ? constraints.max_budget : Infinity;

    let priority: number;
    let priorityLabel: string;
    if (maxMinutes <= 10 || maxBudget <= 1) {
      priority = 1;
      priorityLabel = 'critical';
    } else if (maxMinutes <= 30) {
      priority = 2;
      priorityLabel = 'high';
    } else if (maxMinutes <= 120) {
      priority = 3;
      priorityLabel = 'normal';
    } else {
      priority = 4;
      priorityLabel = 'low';
    }

    // 2. Estimate resource allocation
    const estimatedDurationMs = Math.min(maxMinutes * 60 * 1000, 600000); // Cap at 10 minutes
    const concurrencySlot = priority <= 2 ? 'dedicated' : 'shared';

    // 3. Create batch ID with timestamp for traceability
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    logger.info('Job scheduled', {
      targetDomain: event.payload.target_domain,
      priority,
      priorityLabel,
      estimatedDurationMs,
      batchId,
    }, event.job_id);

    return [
      {
        event_name: "job_scheduled",
        job_id: event.job_id,
        payload: {
          job_batch_id: batchId,
          target_domain: event.payload.target_domain,
          priority_level: priority,
          budget_or_time_constraints: constraints,
          extracted_schema_definition: event.payload.extracted_schema_definition,
          scheduling_metadata: {
            priority_label: priorityLabel,
            estimated_duration_ms: estimatedDurationMs,
            concurrency_slot: concurrencySlot,
            scheduled_at: new Date().toISOString(),
          }
        },
        confidence_score: 0.94,
        justification: `Job scheduled at ${priorityLabel} priority (${concurrencySlot} slot) — estimated ${Math.ceil(estimatedDurationMs / 60000)}min execution.`
      }
    ];
  }

  private failedEvent(event: PipelineEvent, message: string): PipelineEvent {
    logger.warn('Scheduling failed', { error: message }, event.job_id);
    return {
      event_name: "scheduling_failed",
      job_id: event.job_id,
      payload: { error: message },
      confidence_score: 0.35,
      justification: message
    };
  }
}
