"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssessmentCapability = void 0;
const store_1 = require("../../world_model/store");
class AssessmentCapability {
    store;
    constructor() {
        this.store = new store_1.WorldModelStore();
    }
    async parseIntent(inputEvent) {
        console.log(`[CapAssess] Parsing intent for input: ${inputEvent.payload.raw_target}`);
        const extractedSchema = inputEvent.payload.requested_schema || { title: "string", content: "string" };
        const constraints = inputEvent.payload.constraints || { limit: 100 };
        await this.store.publishEvent({
            event_name: 'assessment_completed',
            source_agent_run_id: inputEvent.source_agent_run_id,
            entity_id: inputEvent.entity_id,
            payload: {
                normalized_target: inputEvent.payload.raw_target,
                extracted_schema_definition: extractedSchema,
                budget_or_time_constraints: constraints
            },
            confidence_score: 0.95,
            justification: "Successfully parsed raw input intent into structural target."
        });
    }
}
exports.AssessmentCapability = AssessmentCapability;
//# sourceMappingURL=index.js.map