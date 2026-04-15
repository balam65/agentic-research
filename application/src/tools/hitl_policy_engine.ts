import type { PipelineEvent } from '../utils/contracts.js';

export interface HitlPolicyConfig {
  minConfidence: number;
  escalateFailureEvents: boolean;
}

const DEFAULT_POLICY: HitlPolicyConfig = {
  minConfidence: 0.8,
  escalateFailureEvents: true
};

export class HitlPolicyEngine {
  private readonly config: HitlPolicyConfig;

  constructor(config: Partial<HitlPolicyConfig> = {}) {
    this.config = { ...DEFAULT_POLICY, ...config };
  }

  evaluate(event: PipelineEvent): PipelineEvent | null {
    if (event.event_name === "hitl_required" || event.event_name === "delivery_handoff_ready") {
      return null;
    }

    if (this.config.escalateFailureEvents && event.event_name.endsWith("_failed")) {
      return this.buildHitlEvent(event, "Failure event requires human review");
    }

    if (typeof event.confidence_score === "number" && event.confidence_score < this.config.minConfidence) {
      return this.buildHitlEvent(event, `Confidence ${event.confidence_score} below threshold ${this.config.minConfidence}`);
    }

    return null;
  }

  private buildHitlEvent(event: PipelineEvent, reason: string): PipelineEvent {
    return {
      event_name: "hitl_required",
      job_id: event.job_id,
      payload: {
        trigger_event: event.event_name,
        trigger_confidence: event.confidence_score ?? null,
        reason,
        failed_payload: event.payload
      },
      confidence_score: event.confidence_score,
      justification: reason
    };
  }
}
