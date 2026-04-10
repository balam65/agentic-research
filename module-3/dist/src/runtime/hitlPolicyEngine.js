"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HitlPolicyEngine = void 0;
const DEFAULT_POLICY = {
    minConfidence: 0.8,
    escalateFailureEvents: true
};
class HitlPolicyEngine {
    config;
    constructor(config = {}) {
        this.config = { ...DEFAULT_POLICY, ...config };
    }
    evaluate(event) {
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
    buildHitlEvent(event, reason) {
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
exports.HitlPolicyEngine = HitlPolicyEngine;
