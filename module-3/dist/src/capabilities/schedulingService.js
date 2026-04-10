"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulingService = void 0;
const contracts_1 = require("../types/contracts");
class SchedulingService {
    name = "scheduling";
    consumes = ["assessment_completed"];
    produces = ["job_scheduled", "scheduling_failed"];
    async execute(_context, event) {
        if (!(0, contracts_1.isRecord)(event.payload) || typeof event.payload.target_domain !== "string") {
            return [this.failedEvent(event, "Assessment payload missing target_domain")];
        }
        const constraints = (0, contracts_1.isRecord)(event.payload.budget_or_time_constraints)
            ? event.payload.budget_or_time_constraints
            : {};
        const maxMinutes = typeof constraints.max_minutes === "number" ? constraints.max_minutes : 120;
        const priority = maxMinutes <= 30 ? 1 : maxMinutes <= 120 ? 2 : 3;
        return [
            {
                event_name: "job_scheduled",
                job_id: event.job_id,
                payload: {
                    job_batch_id: `batch-${Date.now()}`,
                    target_domain: event.payload.target_domain,
                    priority_level: priority,
                    budget_or_time_constraints: constraints,
                    extracted_schema_definition: event.payload.extracted_schema_definition
                },
                confidence_score: 0.94,
                justification: "Scheduling assigned queue priority based on budget and time constraints."
            }
        ];
    }
    failedEvent(event, message) {
        return {
            event_name: "scheduling_failed",
            job_id: event.job_id,
            payload: { error: message },
            confidence_score: 0.35,
            justification: message
        };
    }
}
exports.SchedulingService = SchedulingService;
