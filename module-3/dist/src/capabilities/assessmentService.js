"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssessmentService = void 0;
const contracts_1 = require("../types/contracts");
class AssessmentService {
    name = "assessment";
    consumes = ["input_received"];
    produces = ["assessment_completed", "assessment_failed"];
    async execute(_context, event) {
        if (!(0, contracts_1.isPipelineInput)(event.payload)) {
            return [this.failedEvent(event, "Input payload does not match PipelineInput contract")];
        }
        const targetDomain = event.payload.target_domain.trim().toLowerCase();
        if (!targetDomain) {
            return [this.failedEvent(event, "target_domain is required")];
        }
        return [
            {
                event_name: "assessment_completed",
                job_id: event.job_id,
                payload: {
                    target_domain: targetDomain,
                    extracted_schema_definition: event.payload.extracted_schema_definition,
                    budget_or_time_constraints: event.payload.budget_or_time_constraints
                },
                confidence_score: 0.96,
                justification: "Assessment normalized target and validated required pipeline input fields."
            }
        ];
    }
    failedEvent(event, message) {
        return {
            event_name: "assessment_failed",
            job_id: event.job_id,
            payload: { error: message },
            confidence_score: 0.2,
            justification: message
        };
    }
}
exports.AssessmentService = AssessmentService;
